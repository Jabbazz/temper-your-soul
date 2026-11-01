import { SeededRng, type Rng } from '../../core/rng';
import { PROGRESSION } from '../character/progression';
import type { ItemRoll } from '../items/item';
import { rollLoot } from '../loot/roll-loot';
import { dungeonById } from '../dungeons/dungeons';
import type { DungeonDefinition } from '../dungeons/dungeon-definition';
import { lootTableFor } from '../loot/loot-tables';
import type { LootTable } from '../loot/loot-table';
import { Match, spreadPlayers, type MatchMember } from '../match/match';
import { PLAYER_STATS } from '../player/player';
import type { Loadout } from '../skills/skill-definition';
import { blessingEffects, type BlessingLevels } from './blessings';
import { RoomEncounter, type RoomMember, type RoomView } from './encounter';
import { LIEUTENANTS, scaledLieutenant } from './lieutenants';
import { planDescent, type DescentPlan } from './plan';
import { roomArena, ROOM_TEMPLATES, type RoomTemplate } from './room-templates';
import { DESCENT, ROOM_COMBAT, type DoorOption, type RoomKind } from './rooms';
import { addTemper, applyTempers, type TemperPick } from './tempers';

/*
 * La discesa: una sequenza di stanze che finisce con il boss del dungeon (o con i quattro boss di fila, nel
 * Pellegrinaggio). Tiene cio' che passa da una stanza all'altra: vita, mana, tempre, braci, sigilli, esperienza.
 * Costruisce la partita di ogni stanza; chi la usa (gioco in singolo, server cooperativo) la fa avanzare quando il
 * gruppo esce da una porta. Nessun DOM: la stessa discesa gira nel browser e sul server.
 */

export type RunMode = 'descent' | 'pilgrimage';

/** Un giocatore all'inizio della discesa: skill dell'equipaggiamento e benedizioni dell'Altare. */
export interface RunMemberSetup {
  readonly id: string;
  readonly loadout: Loadout;
  readonly blessings?: BlessingLevels;
}

/** Cio' che un giocatore porta da una stanza all'altra. */
export interface RunPlayerState {
  health: number;
  maxHealth: number;
  mana: number;
  tempers: TemperPick[];
  secondLife: boolean;
  /** Patti accettati: ognuno toglie vita massima per il resto della discesa. */
  pacts: number;
  /** Braci ed esperienza guadagnate nella discesa (si tengono anche alla sconfitta). */
  embers: number;
  xp: number;
  /** Servitori abbattuti per tipo (bestiario). */
  kills: Record<string, number>;
  /** Benedizione Prima scintilla: una tempra all'uscita dalla Soglia. */
  startingTemper: boolean;
  readonly offers: number;
  readonly baseLoadout: Loadout;
}

/** Esito di un boss sconfitto nella discesa (per il bottino e i record). */
export interface BossVictory {
  readonly dungeonId: string;
  /** Secondi di tutta la discesa fino a quel boss. */
  readonly seconds: number;
  readonly seals: number;
}

export interface RunOptions {
  readonly mode: RunMode;
  /** Il dungeon della discesa; il Pellegrinaggio li fa tutti, in ordine. */
  readonly dungeonId: string;
  readonly members: readonly RunMemberSetup[];
  readonly seed: number;
  /** Grado di tempra (difficolta' facoltativa, 0-5). */
  readonly grade?: number;
}

/** La discesa vista dai client: interfaccia, rete. Dati semplici. */
export interface RunView {
  readonly mode: RunMode;
  readonly dungeonId: string;
  readonly dungeons: readonly string[];
  readonly dungeonIndex: number;
  readonly stage: number;
  readonly stages: number;
  readonly grade: number;
  /** Le scelte di ogni tappa e quella fatta (per la mappa della discesa). */
  readonly plan: readonly { readonly options: readonly DoorOption[]; readonly chosen: number | null }[];
  readonly seals: number;
  readonly players: Readonly<Record<string, {
    readonly tempers: readonly TemperPick[];
    readonly embers: number;
    readonly xp: number;
    readonly maxHealth: number;
    readonly secondLife: boolean;
    readonly kills: Readonly<Record<string, number>>;
  }>>;
  /** Boss sconfitti (per i record). */
  readonly victories: readonly BossVictory[];
  /** Bottino dei boss per giocatore, accumulato (il Pellegrinaggio ne ha piu' d'uno). */
  readonly rewards: Readonly<Record<string, readonly ItemRoll[]>>;
  readonly roomsCleared: number;
  readonly seconds: number;
  readonly status: 'playing' | 'won' | 'lost';
}

export class DescentRun {
  readonly mode: RunMode;
  readonly dungeons: readonly DungeonDefinition[];
  readonly grade: number;
  readonly players = new Map<string, RunPlayerState>();
  dungeonIndex = 0;
  plan: DescentPlan;
  stage = 0;
  /** Scelta fatta a ogni tappa (indice della porta), per la mappa. */
  chosen: (number | null)[] = [];
  seals = 0;
  status: 'playing' | 'won' | 'lost' = 'playing';
  /** Secondi giocati in tutta la discesa (somma delle stanze). */
  seconds = 0;
  /** Boss sconfitti, in ordine. */
  readonly victories: BossVictory[] = [];
  /** Stanze di combattimento liberate. */
  roomsCleared = 0;
  /** Bottino dei boss per giocatore (vedi `rollBossLoot`). */
  readonly rewards = new Map<string, ItemRoll[]>();
  match!: Match;
  encounter!: RoomEncounter;
  private readonly seen = new Set<string>();
  private readonly seed: number;
  private roomIndex = 0;

  constructor(options: RunOptions) {
    this.mode = options.mode;
    this.seed = options.seed >>> 0;
    this.grade = Math.max(0, Math.min(DESCENT.maxGrade, Math.floor(options.grade ?? 0)));
    const start = dungeonById(options.dungeonId);
    if (start === undefined) throw new Error(`Dungeon sconosciuto: ${options.dungeonId}`);
    this.dungeons = options.mode === 'pilgrimage' ? ['crypt', 'swamp', 'forge', 'glacier'].map((id) => dungeonById(id)!) : [start];
    let seals = 0;
    for (const member of options.members) {
      const effects = blessingEffects(member.blessings ?? {});
      const maxHealth = PLAYER_STATS.maxHealth + effects.bonusHealth;
      seals = Math.max(seals, effects.seals);
      this.players.set(member.id, {
        health: maxHealth,
        maxHealth,
        mana: 100,
        tempers: [],
        secondLife: effects.secondLife,
        pacts: 0,
        embers: 0,
        xp: 0,
        kills: {},
        startingTemper: effects.startingTemper,
        offers: effects.offers,
        baseLoadout: member.loadout,
      });
    }
    this.seals = Math.min(DESCENT.maxSeals, seals);
    this.plan = this.planFor(0);
    this.chosen = this.plan.stages.map(() => null);
    this.chosen[0] = 0;
    this.enter(this.plan.stages[0]!.options[0]!);
  }

  get dungeon(): DungeonDefinition {
    return this.dungeons[this.dungeonIndex]!;
  }

  /** La stanza attuale e' quella del boss. */
  get atBoss(): boolean {
    return this.option.kind === 'boss';
  }

  get option(): DoorOption {
    return this.plan.stages[this.stage]!.options[this.chosen[this.stage] ?? 0]!;
  }

  /** Le porte della tappa successiva (vuoto nella stanza del boss). */
  get nextOptions(): readonly DoorOption[] {
    return this.plan.stages[this.stage + 1]?.options ?? [];
  }

  /** Un id diverso per ogni stanza (la rete riparte da capo a ogni stanza). */
  get roomKey(): number {
    return this.roomIndex;
  }

  private planFor(index: number): DescentPlan {
    return planDescent(this.dungeons[index]!.id, (this.seed + index * 7919) >>> 0, { short: this.mode === 'pilgrimage' });
  }

  /** Costruisce la partita della stanza dietro la porta scelta. */
  private enter(option: DoorOption): void {
    this.roomIndex++;
    const dungeon = this.dungeon;
    const template = this.pickTemplate(option.kind);
    const members = new Map<string, RoomMember>();
    const matchMembers: MatchMember[] = [];
    for (const [id, state] of this.players) {
      members.set(id, {
        loadout: state.baseLoadout,
        tempers: state.tempers,
        offers: state.offers,
        secondLife: state.secondLife,
        ...(state.startingTemper && this.stage === 0 ? { extraOffers: 1 } : {}),
      });
      matchMembers.push({ id, loadout: applyTempers(state.baseLoadout, state.tempers), health: state.health, maxHealth: state.maxHealth, mana: state.mana });
    }
    const encounter = new RoomEncounter({
      dungeonId: dungeon.id,
      option,
      stage: this.stage,
      template: template ?? ROOM_TEMPLATES[dungeon.id]![0]!,
      exits: option.kind === 'boss' ? 0 : this.nextOptions.length,
      members,
      grade: this.grade,
      seen: this.seen,
    });
    const boss = option.kind === 'boss'
      ? dungeon.boss
      : option.kind === 'lieutenant'
        ? scaledLieutenant(LIEUTENANTS[dungeon.id]!, this.players.size)
        : null;
    const rng = new SeededRng((this.seed ^ Math.imul(this.roomIndex, 0x9e3779b1)) >>> 0);
    this.encounter = encounter;
    this.match = new Match({
      rng,
      dungeon,
      loadout: matchMembers[0]!.loadout,
      members: matchMembers,
      ...(option.kind === 'boss' ? {} : { arena: roomArena(template!, dungeon.arena.theme) }),
      boss,
      encounter,
    });
    if (this.players.size > 1) spreadPlayers(this.match);
    for (const plan of encounter.waves) for (const order of plan.orders) this.seen.add(order.entry.minion.id);
  }

  /** Una stanza modello adatta, diversa dalla precedente; la stanza del boss usa l'arena del dungeon. */
  private pickTemplate(kind: RoomKind): RoomTemplate | null {
    if (kind === 'boss') return null;
    const calm = ['lieutenant', 'sanctuary', 'reliquary', 'antechamber'].includes(kind);
    const pool = (ROOM_TEMPLATES[this.dungeon.id] ?? []).filter((room) => room.use === (calm ? 'calm' : 'combat'));
    const previous = this.match?.arena.id;
    const choices = pool.filter((room) => room.id !== previous);
    const list = choices.length > 0 ? choices : pool;
    const rng = new SeededRng((this.seed + this.roomIndex * 104729) >>> 0);
    return list[Math.floor(rng.next() * list.length)] ?? null;
  }

  /**
   * La stanza e' finita (il gruppo ha attraversato una porta, il boss e' caduto, oppure tutti sono a terra).
   * Raccoglie premi e stato dei giocatori e prepara la stanza successiva. Restituisce vero se c'e' una nuova stanza.
   */
  advance(): boolean {
    if (this.status !== 'playing') return false;
    const match = this.match;
    const encounter = this.encounter;
    this.seconds += match.time;
    this.collect(match, encounter);
    if (match.status === 'lost') {
      this.status = 'lost';
      return false;
    }
    if (match.status !== 'won') return false;
    if (this.option.kind === 'boss') {
      this.victories.push({ dungeonId: this.dungeon.id, seconds: this.seconds, seals: this.seals });
      for (const state of this.players.values()) state.xp += PROGRESSION.rewards[this.dungeon.id as keyof typeof PROGRESSION.rewards] ?? 100;
      for (const state of this.players.values()) state.embers += Math.round(DESCENT.embers.boss * this.emberFactor());
      if (this.dungeonIndex + 1 >= this.dungeons.length) {
        this.status = 'won';
        return false;
      }
      // Pellegrinaggio: il dungeon successivo, i sigilli ripartono da quelli dell'Altare.
      this.dungeonIndex++;
      this.plan = this.planFor(this.dungeonIndex);
      this.chosen = this.plan.stages.map(() => null);
      this.stage = 0;
      this.chosen[0] = 0;
      this.seals = 0;
      this.restAll(0.5);
      this.enter(this.plan.stages[0]!.options[0]!);
      return true;
    }
    const door = encounter.exit ?? 0;
    this.stage++;
    this.chosen[this.stage] = Math.min(door, this.plan.stages[this.stage]!.options.length - 1);
    this.enter(this.option);
    return true;
  }

  /** Premi, tempre e stato dei giocatori all'uscita da una stanza. */
  private collect(match: Match, encounter: RoomEncounter): void {
    const grants = encounter.grants;
    const factor = this.dungeonXpShare();
    const combat = ROOM_COMBAT[this.option.kind].waves > 0 || this.option.kind === 'lieutenant';
    if (grants.cleared && combat && this.option.kind !== 'boss') this.roomsCleared++;
    this.seals = Math.min(DESCENT.maxSeals, this.seals + grants.seals);
    for (const [id, state] of this.players) {
      const player = match.players.get(id);
      state.embers += grants.embers.get(id) ?? 0;
      if (grants.cleared && combat && this.option.kind !== 'boss') state.xp += factor;
      for (const pick of grants.tempers.get(id) ?? []) state.tempers = addTemper(state.tempers, pick.temperId, pick.slot);
      if (grants.pacts.has(id)) {
        state.pacts++;
        state.maxHealth = Math.max(40, state.maxHealth - 20);
      }
      if (grants.usedSecondLife.has(id)) state.secondLife = false;
      for (const [minion, count] of grants.kills) state.kills[minion] = (state.kills[minion] ?? 0) + count;
      if (player === undefined) continue;
      // Chi e' a terra si rialza nella stanza successiva con un po' di vita.
      state.health = player.health.isDead ? Math.round(state.maxHealth * DESCENT.reviveFraction) : Math.min(state.maxHealth, player.health.current);
      state.mana = player.mana;
    }
    // Prima scintilla: la tempra iniziale si sceglie all'uscita dalla Soglia (alla prossima stanza parte l'offerta).
    if (this.stage === 0) {
      for (const state of this.players.values()) if (state.startingTemper) state.startingTemper = false;
    }
  }

  /** Esperienza di una stanza di combattimento: una quota di quella del boss del dungeon. */
  private dungeonXpShare(): number {
    const boss = PROGRESSION.rewards[this.dungeon.id as keyof typeof PROGRESSION.rewards] ?? 100;
    return Math.round(boss * DESCENT.roomXpShare);
  }

  private emberFactor(): number {
    return (DESCENT.dungeonFactor[this.dungeon.id] ?? 1) * (1 + DESCENT.gradeEmbers * this.grade);
  }

  /** Riposo fra un dungeon e l'altro del Pellegrinaggio. */
  private restAll(fraction: number): void {
    for (const state of this.players.values()) state.health = Math.min(state.maxHealth, Math.max(state.health, Math.round(state.maxHealth * fraction)));
  }

  /**
   * Un giocatore lascia la discesa (disconnessione): resta a terra nella stanza corrente e non entra nelle prossime.
   * Senza nessuno in piedi la stanza e' persa.
   */
  removePlayer(id: string): void {
    this.players.delete(id);
    const player = this.match.players.get(id);
    if (player !== undefined && this.match.status === 'playing') {
      player.health.current = 0;
      if (this.match.livingPlayers().length === 0) this.match.end(false);
    }
  }

  /** La tabella di bottino del boss con i sigilli: +5 punti ciascuno. */
  lootTable(dungeonId: string, seals: number): LootTable {
    const table = lootTableFor(dungeonId);
    return { ...table, dropChance: Math.min(1, table.dropChance + DESCENT.sealBonus * Math.min(seals, DESCENT.maxSeals)) };
  }

  view(): RunView {
    return {
      mode: this.mode,
      dungeonId: this.dungeon.id,
      dungeons: this.dungeons.map((dungeon) => dungeon.id),
      dungeonIndex: this.dungeonIndex,
      stage: this.stage,
      stages: this.plan.stages.length,
      grade: this.grade,
      plan: this.plan.stages.map((stage, index) => ({ options: stage.options, chosen: this.chosen[index] ?? null })),
      seals: this.seals,
      players: Object.fromEntries(
        [...this.players].map(([id, state]) => [
          id,
          { tempers: [...state.tempers], embers: state.embers, xp: state.xp, maxHealth: state.maxHealth, secondLife: state.secondLife, kills: { ...state.kills } },
        ]),
      ),
      victories: [...this.victories],
      rewards: Object.fromEntries([...this.rewards].map(([id, rolls]) => [id, [...rolls]])),
      roomsCleared: this.roomsCleared,
      seconds: this.seconds,
      status: this.status,
    };
  }

  /**
   * Il bottino del boss appena caduto: un tiro per giocatore, con i sigilli della discesa. Si chiama prima di
   * `advance()`, quando la stanza del boss e' vinta; i premi restano in `rewards`.
   */
  rollBossLoot(rng: Rng): Map<string, ItemRoll[]> {
    const table = this.lootTable(this.dungeon.id, this.seals);
    const rolled = new Map<string, ItemRoll[]>();
    for (const id of this.players.keys()) {
      const rolls = rollLoot(table, rng);
      rolled.set(id, rolls);
      this.rewards.set(id, [...(this.rewards.get(id) ?? []), ...rolls]);
    }
    return rolled;
  }

  /** La stanza attuale per i client. */
  roomView(): RoomView {
    return this.encounter.view();
  }

  /** La tempra iniziale della benedizione Prima scintilla: chi ce l'ha la sceglie all'ingresso. */
  get pendingStartingTempers(): string[] {
    return [...this.players].filter(([, state]) => state.startingTemper).map(([id]) => id);
  }
}
