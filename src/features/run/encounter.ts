import { Vec2 } from '../../core/vec2';
import { pushOutOfPillars } from '../arena/arena';
import type { Encounter } from '../match/encounter';
import type { Match } from '../match/match';
import { THEME_ELITES } from '../minions/elites';
import type { Minion } from '../minions/minion';
import type { MinionDefinition } from '../minions/minion-definition';
import type { Loadout } from '../skills/skill-definition';
import { planWaves, WaveDirector, type WavePlan } from './director';
import { HazardRunner, HAZARDS } from './hazards';
import { bestiaryEntry, ROOM_BESTIARY, type BestiaryEntry } from './room-bestiary';
import { onDoor, roomDoors, spawnPoints, type RoomDoor, type RoomTemplate } from './room-templates';
import { DESCENT, ROOM_COMBAT, type DoorOption } from './rooms';
import { addTemper, applyTempers, offerTempers, type TemperPick } from './tempers';

/*
 * Una stanza della discesa: il suo obiettivo (ondate, Assedio, Caccia, luogotenente, calma), le insidie, i premi da
 * raccogliere, le offerte di tempra e le porte. E' guidata dalla partita (`Encounter`): tutto passa dal suo
 * generatore, quindi in cooperativa il server la esegue e i client ne ricevono la vista (`RoomView`).
 */

/** Che cosa c'e' a terra da raccogliere. */
export type PickupKind = 'temper' | 'embers' | 'heal' | 'seal' | 'fountain' | 'anvil' | 'chest';

export interface RoomPickup {
  readonly id: number;
  readonly kind: PickupKind;
  readonly position: Vec2;
  /** Braci o frazione di vita. */
  readonly amount: number;
  /** Chi l'ha gia' preso (ogni giocatore ha il suo premio; il sigillo e' di tutti). */
  readonly takenBy: string[];
  readonly shared: boolean;
  /** Premi alternativi (fonte o incudine del santuario): prenderne uno toglie gli altri dello stesso gruppo. */
  readonly group?: string;
}

/** Un giocatore nella stanza: le skill dell'equipaggiamento, le tempre gia' scelte, quante offerte vede. */
export interface RoomMember {
  readonly loadout: Loadout;
  readonly tempers: readonly TemperPick[];
  readonly offers: number;
  readonly secondLife: boolean;
  /** Scelte di tempra in piu' da proporre quando la stanza e' libera (benedizione Prima scintilla). */
  readonly extraOffers?: number;
}

export interface RoomSetup {
  readonly dungeonId: string;
  readonly option: DoorOption;
  /** Tappa della discesa (da 0). */
  readonly stage: number;
  readonly template: RoomTemplate;
  /** Porte d'uscita (le scelte della tappa successiva); 0 nella stanza del boss. */
  readonly exits: number;
  readonly members: ReadonlyMap<string, RoomMember>;
  /** Grado di tempra della discesa (difficolta' facoltativa). */
  readonly grade: number;
  /** Servitori gia' visti nella discesa. */
  readonly seen: ReadonlySet<string>;
}

/** Cio' che la stanza ha dato: la discesa lo raccoglie quando il gruppo attraversa una porta. */
export interface RoomGrants {
  readonly embers: Map<string, number>;
  seals: number;
  readonly tempers: Map<string, TemperPick[]>;
  readonly pacts: Set<string>;
  readonly usedSecondLife: Set<string>;
  /** Servitori abbattuti per tipo (per il bestiario). */
  readonly kills: Map<string, number>;
  cleared: boolean;
  /** Esito della Prova (null fuori dalle Prove). */
  trial: boolean | null;
}

/** La stanza vista dai client: rappresentazione, interfaccia, rete. Dati semplici. */
export interface RoomView {
  readonly kind: DoorOption['kind'];
  readonly reward: DoorOption['reward'];
  readonly rule?: DoorOption['rule'];
  readonly cleared: boolean;
  readonly wave: number;
  readonly waves: number;
  /** Secondi rimasti (Assedio, Prova a tempo), se contano. */
  readonly countdown: number | null;
  readonly trialFailed: boolean;
  readonly doors: readonly { readonly x: number; readonly y: number; readonly progress: number }[];
  readonly doorsOpen: boolean;
  readonly pickups: readonly { readonly id: number; readonly kind: PickupKind; readonly x: number; readonly y: number; readonly takenBy: readonly string[] }[];
  /** Offerte di tempra in attesa, per giocatore. */
  readonly offers: Readonly<Record<string, readonly TemperPick[]>>;
  /** Giocatori a cui il forziere propone un patto. */
  readonly pacts: readonly string[];
  /** Nome della preda della Caccia, se c'e'. */
  readonly preyId: number | null;
}

/** Raggio entro cui un giocatore raccoglie un premio. */
const PICKUP_RADIUS = 36;

export class RoomEncounter implements Encounter {
  readonly grants: RoomGrants = {
    embers: new Map(),
    seals: 0,
    tempers: new Map(),
    pacts: new Set(),
    usedSecondLife: new Set(),
    kills: new Map(),
    cleared: false,
    trial: null,
  };
  readonly doors: RoomDoor[];
  readonly pickups: RoomPickup[] = [];
  /** Offerte di tempra in attesa di scelta, per giocatore. */
  readonly offers = new Map<string, TemperPick[]>();
  /** Offerte ancora da proporre dopo quella in corso (Prova, patto). */
  private readonly offerQueue = new Map<string, number>();
  /** Giocatori a cui il forziere propone un patto. */
  readonly pendingPacts = new Set<string>();
  readonly doorProgress: number[];
  director: WaveDirector | null = null;
  /** Le ondate pianificate (per sapere quali servitori compaiono). */
  waves: readonly WavePlan[] = [];
  private hazard: HazardRunner | null = null;
  private nextPickupId = 1;
  private trialFailed = false;
  private trialTimer = 0;
  private siegeRemaining = 0;
  private readonly siegeNests = new Set<number>();
  prey: Minion | null = null;
  private lastEnemyAnnounced = false;
  /** Porta attraversata (indice), quando il gruppo esce. */
  exit: number | null = null;
  private readonly healthScale: number;
  private readonly secondLives: Set<string>;

  constructor(readonly setup: RoomSetup) {
    this.doors = roomDoors(setup.template, setup.exits);
    this.doorProgress = this.doors.map(() => 0);
    this.healthScale = (DESCENT.healthScale[setup.dungeonId] ?? 1) * (1 + 0.05 * setup.grade);
    this.secondLives = new Set([...setup.members].filter(([, member]) => member.secondLife).map(([id]) => id));
  }

  get kind(): DoorOption['kind'] {
    return this.setup.option.kind;
  }

  get cleared(): boolean {
    return this.grants.cleared;
  }

  attach(match: Match): void {
    const { option, dungeonId } = this.setup;
    const bestiary = ROOM_BESTIARY[dungeonId] ?? [];
    const combat = ROOM_COMBAT[option.kind];
    if (combat.waves > 0 && combat.budget > 0) {
      const players = this.setup.members.size;
      const budget =
        DESCENT.baseBudget * (1 + DESCENT.budgetPerStage * this.setup.stage) * combat.budget * DESCENT.partyBudget(players) * (1 + DESCENT.gradeBudget * this.setup.grade);
      this.waves = planWaves(
        {
          budget,
          waves: combat.waves,
          bestiary: option.kind === 'hunt' ? bestiary.filter((item) => item.role === 'swarm') : bestiary,
          stage: this.setup.stage,
          eliteChance: option.kind === 'threshold' ? 0 : Math.min(0.9, DESCENT.eliteChance + 0.05 * this.setup.stage + 0.05 * this.setup.grade),
          maxElites: option.kind === 'threshold' ? 0 : players >= 3 ? 2 : 1,
          themeElite: THEME_ELITES[dungeonId] ?? 'robust',
          seen: this.setup.seen,
        },
        match.rng,
      );
      this.director = new WaveDirector(this.waves, {
        healthScale: this.healthScale,
        aliveCap: DESCENT.aliveCap + DESCENT.aliveCapPerPlayer * Math.max(0, players - 1),
        spawnPoints: spawnPoints(this.setup.template),
        ...(option.kind === 'siege' ? { timedWaves: DESCENT.siegeSeconds / combat.waves } : {}),
      });
    }
    const hazard = HAZARDS[dungeonId];
    if (hazard !== undefined && this.setup.stage >= 2 && ['combat', 'trial', 'siege', 'hunt'].includes(option.kind)) {
      this.hazard = new HazardRunner(hazard, spawnPoints(this.setup.template), match);
    }
    if (option.kind === 'trial') this.grants.trial = null;
    if (option.kind === 'siege') this.startSiege(match, bestiary);
    if (option.kind === 'hunt') this.startHunt(match, bestiary);
    if (option.kind === 'sanctuary' || option.kind === 'reliquary' || option.kind === 'antechamber') this.clear(match, false);
  }

  /** Assedio: due nidi (o pesanti) e un conto alla rovescia; ogni nido distrutto lo accorcia. */
  private startSiege(match: Match, bestiary: readonly BestiaryEntry[]): void {
    this.siegeRemaining = DESCENT.siegeSeconds;
    const anchors = bestiary.filter((item) => item.role === 'nest' || item.role === 'support');
    const pool = anchors.length > 0 ? anchors : bestiary.filter((item) => item.role === 'heavy');
    const center = new Vec2(match.arena.width / 2, match.arena.height * 0.4);
    pool.slice(0, 1).forEach((item) => {
      for (const side of [-1, 1]) {
        const nest = match.spawnMinion(item.minion, center.add(new Vec2(side * match.arena.width * 0.28, 0)), {
          maxHealth: Math.round(item.health * this.healthScale),
        });
        this.siegeNests.add(nest.id);
      }
    });
  }

  /** Caccia: la preda (una minaccia del dungeon, molto robusta) fugge e chiama la folla. */
  private startHunt(match: Match, bestiary: readonly BestiaryEntry[]): void {
    const threats = bestiary.filter((item) => item.role === 'threat' && item.minion.behavior !== 'turret');
    const swarm = bestiary.find((item) => item.role === 'swarm');
    const quarry = threats[Math.floor(match.rng.next() * threats.length)] ?? bestiary[0];
    if (quarry === undefined) return;
    const definition: MinionDefinition = {
      ...quarry.minion,
      speed: Math.max(quarry.minion.speed, 90),
      ...(swarm ? { nest: { spawn: swarm.minion.id, interval: 3.4, firstDelay: 1.2, burst: 2, maxChildren: 6 } } : {}),
    };
    this.prey = match.spawnMinion(definition, new Vec2(match.arena.width / 2, match.arena.height * 0.3), {
      maxHealth: Math.round(quarry.health * this.healthScale * 7),
      prey: true,
      elite: 'robust',
    });
  }

  step(dt: number, match: Match): void {
    if (!this.grants.cleared) {
      this.director?.step(dt, match);
      this.hazard?.step(dt, match);
      this.checkTrial(dt, match);
      if (this.kind === 'siege') {
        this.siegeRemaining -= dt;
        if (this.siegeRemaining <= 0) this.clear(match, true);
      } else if (this.kind === 'hunt') {
        if (this.prey === null || this.prey.isDead) this.clear(match, true);
      } else if (this.director !== null && this.director.done) {
        const hostile = match.hostileCount();
        if (hostile === 1 && !this.lastEnemyAnnounced) {
          this.lastEnemyAnnounced = true;
          const last = match.minions.find((minion) => !minion.isDead && minion.hostile);
          if (last) match.events.emit({ type: 'last_enemy', position: last.position });
        }
        if (hostile === 0) this.clear(match, true);
      }
      return;
    }
    this.collect(match);
    this.walkDoors(dt, match);
  }

  /** Prova: senza un graffio (nessun danno subito) o contro il tempo. */
  private checkTrial(dt: number, match: Match): void {
    const rule = this.setup.option.rule;
    if (this.kind !== 'trial' || this.trialFailed || rule === undefined) return;
    this.trialTimer += dt;
    const hurt = [...match.report.values()].some((stats) => stats.damageReceived > 0);
    if ((rule === 'unscathed' && hurt) || (rule === 'timed' && this.trialTimer > DESCENT.trialSeconds)) this.trialFailed = true;
  }

  onBossDefeated(match: Match): void {
    // Nella stanza del boss la discesa finisce; il luogotenente libera la stanza.
    if (this.kind === 'boss') {
      match.end(true);
      return;
    }
    // Il luogotenente apre la sua pagina del bestiario come un servitore.
    if (match.boss !== null) this.grants.kills.set(match.boss.definition.id, (this.grants.kills.get(match.boss.definition.id) ?? 0) + 1);
    this.clear(match, true, match.boss?.position);
  }

  onMinionKilled(match: Match, minion: Minion, exploded: boolean): void {
    if (!exploded) this.grants.kills.set(minion.definition.id, (this.grants.kills.get(minion.definition.id) ?? 0) + 1);
    if (this.siegeNests.delete(minion.id)) this.siegeRemaining -= DESCENT.siegeNestBonus;
    if (minion === this.prey && !this.grants.cleared) this.clear(match, true);
  }

  minionHealth(definition: MinionDefinition): number {
    const entry = bestiaryEntry(this.setup.dungeonId, definition.id);
    return Math.max(1, Math.round((entry?.health ?? definition.maxHealth) * this.healthScale));
  }

  onPlayerDown(match: Match, playerId: string): boolean {
    if (!this.secondLives.has(playerId)) return false;
    this.secondLives.delete(playerId);
    this.grants.usedSecondLife.add(playerId);
    const player = match.players.get(playerId)!;
    player.health.current = Math.max(1, Math.round(player.health.max * DESCENT.reviveFraction));
    player.invulnerableFor = 1.5;
    match.events.emit({ type: 'reward_taken', position: player.position, reward: 'second_life', playerId });
    return true;
  }

  // --- Stanza liberata: premi e porte --------------------------------------------------------------------------

  /** La stanza e' libera: niente piu' nemici e insidie, compaiono i premi, si aprono le porte. */
  private clear(match: Match, announce: boolean, at?: Vec2): void {
    if (this.grants.cleared) return;
    this.grants.cleared = true;
    this.director?.stop();
    this.hazard = null;
    match.dismissMinions();
    const center = new Vec2(match.arena.width / 2, match.arena.height * 0.5);
    if (announce) match.events.emit({ type: 'room_cleared', position: at ?? center });
    const ids = [...this.setup.members.keys()];
    const factor = this.emberFactor();
    if (announce && this.isCombat()) {
      for (const id of ids) {
        if ((match.report.get(id)?.damageReceived ?? 0) === 0) this.addEmbers(id, Math.round(DESCENT.embers.unscathedRoom * factor));
      }
    }
    for (const [id, member] of this.setup.members) if ((member.extraOffers ?? 0) > 0) this.queueOffers(match, id, member.extraOffers!);
    const option = this.setup.option;
    // I premi stanno dove il giocatore puo' arrivare: mai dentro un pilastro.
    const free = (point: Vec2): Vec2 => pushOutOfPillars(match.arena, point, PICKUP_RADIUS);
    const spot = free(at === undefined ? center : new Vec2(Math.min(Math.max(at.x, 160), match.arena.width - 160), Math.min(Math.max(at.y, 220), match.arena.height - 220)));
    switch (option.kind) {
      case 'sanctuary':
        this.place('fountain', free(center.add(new Vec2(-130, 0))), DESCENT.sanctuaryHeal, false, 'sanctuary');
        this.place('anvil', free(center.add(new Vec2(130, 0))), 0, false, 'sanctuary');
        return;
      case 'reliquary':
        this.place('chest', free(center), Math.round(DESCENT.embers.reliquary * factor), false);
        return;
      case 'antechamber':
        for (const id of ids) match.heal(id, (match.players.get(id)?.health.max ?? 100) * DESCENT.antechamberHeal);
        return;
      case 'threshold':
        for (const id of ids) this.addEmbers(id, Math.round(DESCENT.embers.threshold * factor));
        return;
      case 'trial':
        this.grants.trial = !this.trialFailed;
        if (this.trialFailed) return;
        this.grants.seals += 1;
        break;
      case 'siege':
        for (const id of ids) this.addEmbers(id, Math.round(DESCENT.embers.siege * factor));
        break;
      case 'lieutenant':
        for (const id of ids) this.addEmbers(id, Math.round(DESCENT.embers.lieutenant * factor));
        break;
      default:
        break;
    }
    const reward = option.reward;
    if (reward === null) return;
    const double = option.kind === 'trial';
    if (reward === 'seal') {
      this.place('seal', spot, 1, true);
    } else if (reward === 'embers') {
      this.place('embers', spot, Math.round(DESCENT.embers.door * factor * (double ? 2 : 1)), false);
    } else if (reward === 'heal') {
      this.place('heal', spot, DESCENT.rewardHeal * (double ? 2 : 1), false);
    } else {
      this.place('temper', spot, double ? 2 : 1, false);
    }
  }

  private isCombat(): boolean {
    return ['threshold', 'combat', 'trial', 'siege', 'hunt', 'lieutenant'].includes(this.kind);
  }

  private emberFactor(): number {
    return (DESCENT.dungeonFactor[this.setup.dungeonId] ?? 1) * (1 + DESCENT.gradeEmbers * this.setup.grade);
  }

  private place(kind: PickupKind, position: Vec2, amount: number, shared: boolean, group?: string): void {
    this.pickups.push({ id: this.nextPickupId++, kind, position, amount, takenBy: [], shared, ...(group ? { group } : {}) });
  }

  private addEmbers(playerId: string, amount: number): void {
    if (amount <= 0) return;
    this.grants.embers.set(playerId, (this.grants.embers.get(playerId) ?? 0) + amount);
  }

  /** Chi passa su un premio lo prende (una volta per giocatore; il sigillo una volta per tutti). */
  private collect(match: Match): void {
    for (const [id, player] of match.players) {
      if (player.health.isDead) continue;
      for (const pickup of this.pickups) {
        if (pickup.takenBy.includes(id) || (pickup.shared && pickup.takenBy.length > 0)) continue;
        if (player.position.distanceTo(pickup.position) > PICKUP_RADIUS) continue;
        if (pickup.group !== undefined && this.pickups.some((other) => other.group === pickup.group && other.takenBy.includes(id))) continue;
        this.take(match, id, pickup);
      }
    }
  }

  private take(match: Match, playerId: string, pickup: RoomPickup): void {
    pickup.takenBy.push(playerId);
    const player = match.players.get(playerId)!;
    let amount: number | undefined;
    switch (pickup.kind) {
      case 'embers':
        this.addEmbers(playerId, pickup.amount);
        amount = pickup.amount;
        break;
      case 'heal':
      case 'fountain':
        amount = Math.round(match.heal(playerId, player.health.max * pickup.amount));
        break;
      case 'seal':
        this.grants.seals += pickup.amount;
        break;
      case 'temper':
        this.queueOffers(match, playerId, pickup.amount);
        break;
      case 'anvil':
        this.queueOffers(match, playerId, 1);
        break;
      case 'chest':
        this.addEmbers(playerId, pickup.amount);
        amount = pickup.amount;
        this.pendingPacts.add(playerId);
        break;
    }
    match.events.emit({ type: 'reward_taken', position: pickup.position, reward: pickup.kind, playerId, ...(amount !== undefined ? { amount } : {}) });
  }

  /** Propone `count` scelte di tempra di fila al giocatore. */
  private queueOffers(match: Match, playerId: string, count: number): void {
    this.offerQueue.set(playerId, (this.offerQueue.get(playerId) ?? 0) + count);
    if (!this.offers.has(playerId)) this.nextOffer(match, playerId);
  }

  private nextOffer(match: Match, playerId: string): void {
    const queued = this.offerQueue.get(playerId) ?? 0;
    const member = this.setup.members.get(playerId);
    if (queued <= 0 || member === undefined) {
      this.offers.delete(playerId);
      return;
    }
    this.offerQueue.set(playerId, queued - 1);
    const picks = this.currentTempers(playerId);
    const offers = offerTempers(match.rng, member.loadout, picks, member.offers);
    if (offers.length === 0) {
      // Nessuna tempra possibile (tutto al massimo): braci al posto della scelta.
      this.addEmbers(playerId, Math.round(DESCENT.embers.door * this.emberFactor()));
      this.nextOffer(match, playerId);
      return;
    }
    this.offers.set(playerId, offers);
  }

  /** Le tempre del giocatore: quelle della discesa piu' quelle scelte in questa stanza. */
  currentTempers(playerId: string): TemperPick[] {
    let picks = [...(this.setup.members.get(playerId)?.tempers ?? [])];
    for (const pick of this.grants.tempers.get(playerId) ?? []) picks = addTemper(picks, pick.temperId, pick.slot);
    return picks;
  }

  /** Le skill del giocatore con le tempre di adesso (per l'interfaccia). */
  temperedLoadout(playerId: string): Loadout {
    const member = this.setup.members.get(playerId);
    return member === undefined ? [] : applyTempers(member.loadout, this.currentTempers(playerId));
  }

  /** Il giocatore sceglie l'offerta `index`. Restituisce false se non c'era. */
  chooseOffer(match: Match, playerId: string, index: number): boolean {
    const offers = this.offers.get(playerId);
    const choice = offers?.[index];
    if (choice === undefined) return false;
    const chosen = this.grants.tempers.get(playerId) ?? [];
    chosen.push({ temperId: choice.temperId, slot: choice.slot, grade: 1 });
    this.grants.tempers.set(playerId, chosen);
    this.offers.delete(playerId);
    match.events.emit({ type: 'temper_chosen', temperId: choice.temperId, slot: choice.slot, grade: choice.grade, playerId });
    this.nextOffer(match, playerId);
    return true;
  }

  /** Il patto del forziere: due tempre in cambio di vita massima per il resto della discesa. */
  answerPact(match: Match, playerId: string, accept: boolean): boolean {
    if (!this.pendingPacts.delete(playerId)) return false;
    if (accept) {
      this.grants.pacts.add(playerId);
      this.queueOffers(match, playerId, 2);
    }
    return true;
  }

  /** Il gruppo esce da una porta: tutti i vivi sulla stessa soglia per un attimo, nessuna scelta in sospeso. */
  private walkDoors(dt: number, match: Match): void {
    if (this.doors.length === 0 || this.exit !== null) return;
    const living = match.livingPlayers();
    const ids = [...match.players].filter(([, player]) => !player.health.isDead).map(([id]) => id);
    const busy = ids.some((id) => this.offers.has(id) || this.pendingPacts.has(id));
    for (const door of this.doors) {
      const everyone = !busy && living.length > 0 && living.every((player) => onDoor(door, player.position));
      const progress = this.doorProgress[door.index]!;
      this.doorProgress[door.index] = everyone ? Math.min(1, progress + dt / DESCENT.doorHold) : Math.max(0, progress - dt * 2);
      if (this.doorProgress[door.index]! >= 1) {
        this.exit = door.index;
        match.events.emit({ type: 'room_exited', door: door.index });
        match.end(true);
        return;
      }
    }
  }

  /** La stanza per i client: rappresentazione, interfaccia e rete. */
  view(): RoomView {
    const countdown = this.kind === 'siege' && !this.grants.cleared
      ? Math.max(0, this.siegeRemaining)
      : this.kind === 'trial' && this.setup.option.rule === 'timed' && !this.grants.cleared
        ? Math.max(0, DESCENT.trialSeconds - this.trialTimer)
        : null;
    return {
      kind: this.kind,
      reward: this.setup.option.reward,
      ...(this.setup.option.rule ? { rule: this.setup.option.rule } : {}),
      cleared: this.grants.cleared,
      wave: this.director === null ? 0 : this.director.wave + 1,
      waves: this.director?.waveCount ?? 0,
      countdown,
      trialFailed: this.trialFailed,
      doors: this.doors.map((door) => ({ x: door.position.x, y: door.position.y, progress: this.doorProgress[door.index]! })),
      doorsOpen: this.grants.cleared,
      pickups: this.pickups.map((pickup) => ({ id: pickup.id, kind: pickup.kind, x: pickup.position.x, y: pickup.position.y, takenBy: [...pickup.takenBy] })),
      offers: Object.fromEntries(this.offers),
      pacts: [...this.pendingPacts],
      preyId: this.prey !== null && !this.prey.isDead ? this.prey.id : null,
    };
  }
}
