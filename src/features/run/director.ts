import type { Rng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import type { Match } from '../match/match';
import { GENERIC_ELITES, type EliteId } from '../minions/elites';
import type { BestiaryEntry, BestiaryRole } from './room-bestiary';
import { DESCENT } from './rooms';

/*
 * Il regista delle ondate: compra i servitori con un budget di punti, scegliendo dal bestiario del dungeon, poi li fa
 * comparire a gruppi con un segnale a terra. E' il modello del direttore a crediti di Risk of Rain 2, ridotto a stanze
 * chiuse. Tutte le scelte passano dal generatore della partita: stesso seme, stesse ondate.
 */

/** Un servitore da far comparire: chi, con quanta vita, con quale variante d'elite. */
export interface SpawnOrder {
  readonly entry: BestiaryEntry;
  readonly elite: EliteId | null;
}

export interface WavePlan {
  readonly orders: readonly SpawnOrder[];
}

export interface WaveRequest {
  readonly budget: number;
  readonly waves: number;
  readonly bestiary: readonly BestiaryEntry[];
  /** Tappa della discesa (da 0): sblocca i servitori con `firstStage`. */
  readonly stage: number;
  /** Probabilita' di un'elite per ondata (0 nella Soglia). */
  readonly eliteChance: number;
  /** Quante elite per ondata al massimo. */
  readonly maxElites: number;
  /** Il modificatore a tema del dungeon. */
  readonly themeElite: EliteId;
  /** Servitori gia' visti nella discesa: un tipo nuovo compare la prima volta in poche copie. */
  readonly seen?: ReadonlySet<string>;
}

/** Quote del budget per ondata: l'ultima e' la piu' grossa. */
export function waveShares(waves: number): number[] {
  if (waves <= 1) return [1];
  if (waves === 2) return [0.45, 0.55];
  if (waves === 3) return [0.3, 0.3, 0.4];
  if (waves === 4) return [0.2, 0.25, 0.25, 0.3];
  return Array.from({ length: waves }, () => 1 / waves);
}

const pick = <T>(rng: Rng, items: readonly T[]): T | undefined => (items.length === 0 ? undefined : items[Math.floor(rng.next() * items.length)]);

/** Tetto di servitori in una sola ondata, perche' la stanza resti leggibile. */
const WAVE_CAP = 32;

/**
 * Compone le ondate di una stanza:
 * - al massimo 3 tipi per ondata;
 * - la prima spende soprattutto in folla; dalla seconda c'e' sempre almeno una minaccia;
 * - al massimo un nido o un sostegno e un pesante per ondata;
 * - al massimo `maxElites` elite per ondata (un'elite costa il triplo);
 * - un tipo mai visto nella discesa compare la prima volta in poche copie.
 */
export function planWaves(request: WaveRequest, rng: Rng): WavePlan[] {
  const available = request.bestiary.filter((item) => (item.firstStage ?? 0) <= request.stage);
  const byRole = (role: BestiaryRole): BestiaryEntry[] => available.filter((item) => item.role === role);
  const swarm = byRole('swarm');
  const threats = byRole('threat');
  const heavies = byRole('heavy');
  const priority = [...byRole('nest'), ...byRole('support')];
  const shares = waveShares(request.waves);
  const plans: WavePlan[] = [];
  const seen = new Set(request.seen ?? []);
  shares.forEach((share, wave) => {
    let budget = Math.max(3, Math.round(request.budget * share));
    const orders: SpawnOrder[] = [];
    const types = new Set<string>();
    const buy = (item: BestiaryEntry, elite: EliteId | null = null): boolean => {
      const cost = item.cost * (elite ? 3 : 1);
      if (cost > budget || orders.length >= WAVE_CAP) return false;
      if (!types.has(item.minion.id) && types.size >= 3) return false;
      budget -= cost;
      types.add(item.minion.id);
      orders.push({ entry: item, elite });
      return true;
    };
    // Minaccia: dalla seconda ondata sempre (e dalla prima a partire dalla terza tappa).
    if (threats.length > 0 && (wave > 0 || request.stage >= 2)) {
      const threat = pick(rng, threats)!;
      const fresh = !seen.has(threat.minion.id);
      const count = fresh ? 1 : Math.max(1, Math.round((budget * 0.35) / threat.cost));
      for (let i = 0; i < count; i++) if (!buy(threat)) break;
      seen.add(threat.minion.id);
    }
    // Un pesante nell'ultima ondata, un nido o sostegno in una delle centrali, se il budget lo permette.
    if (wave === shares.length - 1 && heavies.length > 0 && rng.next() < 0.7) {
      const heavy = pick(rng, heavies)!;
      buy(heavy);
      seen.add(heavy.minion.id);
    }
    if (wave > 0 && priority.length > 0 && rng.next() < 0.45) {
      const item = pick(rng, priority)!;
      buy(item);
      seen.add(item.minion.id);
    }
    // Elite: su un servitore non di folla gia' scelto, o su una minaccia aggiunta.
    if (request.maxElites > 0 && rng.next() < request.eliteChance) {
      const candidates = orders.filter((order) => order.entry.role !== 'swarm' && order.elite === null);
      const target = pick(rng, candidates);
      const elite: EliteId = rng.next() < 0.5 ? request.themeElite : pick(rng, GENERIC_ELITES)!;
      if (target !== undefined) {
        const extra = target.entry.cost * 2;
        if (extra <= budget) {
          budget -= extra;
          orders[orders.indexOf(target)] = { entry: target.entry, elite };
        }
      } else if (threats.length > 0) buy(pick(rng, threats)!, elite);
    }
    // Il resto in folla: uno o due tipi.
    const crowd = swarm.length <= 2 ? swarm : [pick(rng, swarm)!, pick(rng, swarm)!];
    let guard = 0;
    while (budget > 0 && crowd.length > 0 && guard++ < 200) {
      const item = crowd[guard % crowd.length]!;
      if (!buy(item)) {
        const cheapest = crowd.reduce((a, b) => (a.cost <= b.cost ? a : b));
        if (!buy(cheapest)) break;
      }
      seen.add(item.minion.id);
    }
    plans.push({ orders: shuffle(orders, rng) });
  });
  return plans;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/** Come il regista mette in campo le ondate. */
export interface DirectorOptions {
  /** Vita dei servitori per il dungeon (x la vita della cripta delle voci). */
  readonly healthScale: number;
  /** Vivi al massimo insieme (quelli in arrivo contano). */
  readonly aliveCap: number;
  /** Punti di comparsa possibili. */
  readonly spawnPoints: readonly Vec2[];
  /** Secondi di calma prima della prima ondata. */
  readonly introDelay?: number;
  /** Le ondate partono a tempo (Assedio) invece che a stanza quasi vuota. */
  readonly timedWaves?: number;
}

/** Gruppi di comparsa: quanti insieme e ogni quanti secondi. */
const BATCH = { size: 6, interval: 0.35 } as const;
/** Distanza minima di una comparsa da ogni giocatore. */
const SPAWN_DISTANCE = 300;

/** Il regista in partita: ondate, segnali a terra, limiti dei vivi. */
export class WaveDirector {
  /** Indice dell'ondata in corso (-1 prima della prima). */
  wave = -1;
  private queue: SpawnOrder[] = [];
  private pending: { order: SpawnOrder; position: Vec2; remaining: number }[] = [];
  private waveTimer = 0;
  private batchTimer = 0;
  private spawnedThisWave = 0;
  private intro: number;

  constructor(
    readonly waves: readonly WavePlan[],
    private readonly options: DirectorOptions,
  ) {
    this.intro = options.introDelay ?? DESCENT.introDelay;
  }

  /** Tutte le ondate sono in campo (o arrivate). */
  get done(): boolean {
    return this.wave >= this.waves.length - 1 && this.queue.length === 0 && this.pending.length === 0;
  }

  get waveCount(): number {
    return this.waves.length;
  }

  /** Servitori ancora da far comparire (in coda o annunciati). */
  get remaining(): number {
    return this.queue.length + this.pending.length + this.waves.slice(this.wave + 1).reduce((sum, plan) => sum + plan.orders.length, 0);
  }

  /** Smette di mandare servitori (fine dell'Assedio, stanza liberata in altro modo). */
  stop(): void {
    this.queue = [];
    this.pending = [];
    this.wave = this.waves.length - 1;
  }

  step(dt: number, match: Match): void {
    if (this.waves.length === 0) return;
    if (this.wave < 0) {
      this.intro -= dt;
      if (this.intro <= 0) this.startWave(0, match);
      return;
    }
    this.landPending(dt, match);
    this.sendBatch(dt, match);
    if (this.wave >= this.waves.length - 1 || this.queue.length > 0 || this.pending.length > 0) return;
    this.waveTimer += dt;
    const timed = this.options.timedWaves;
    const ready = timed !== undefined
      ? this.waveTimer >= timed
      : match.hostileCount() <= Math.ceil(this.spawnedThisWave * DESCENT.nextWaveFraction) || this.waveTimer >= DESCENT.waveTimeout;
    if (ready) this.startWave(this.wave + 1, match);
  }

  private startWave(index: number, match: Match): void {
    this.wave = index;
    this.queue = [...this.waves[index]!.orders];
    this.spawnedThisWave = this.queue.length;
    this.waveTimer = 0;
    this.batchTimer = 0;
    match.events.emit({ type: 'wave_started', wave: index + 1, waves: this.waves.length });
  }

  /** Annuncia un gruppo di comparse, senza superare il tetto dei vivi. */
  private sendBatch(dt: number, match: Match): void {
    if (this.queue.length === 0) return;
    this.batchTimer -= dt;
    if (this.batchTimer > 0) return;
    this.batchTimer = BATCH.interval;
    const room = this.options.aliveCap - match.hostileCount() - this.pending.length;
    const count = Math.min(BATCH.size, room, this.queue.length);
    for (let i = 0; i < count; i++) {
      const order = this.queue.shift()!;
      const position = this.spawnPoint(match);
      this.pending.push({ order, position, remaining: DESCENT.spawnTelegraph });
      match.events.emit({
        type: 'minion_incoming',
        position,
        visual: order.entry.minion.visual,
        delay: DESCENT.spawnTelegraph,
        ...(order.elite ? { elite: order.elite } : {}),
      });
    }
  }

  private landPending(dt: number, match: Match): void {
    const still: typeof this.pending = [];
    for (const item of this.pending) {
      item.remaining -= dt;
      if (item.remaining > 0) {
        still.push(item);
        continue;
      }
      match.spawnMinion(item.order.entry.minion, item.position, {
        maxHealth: Math.round(item.order.entry.health * this.options.healthScale),
        elite: item.order.elite,
      });
    }
    this.pending = still;
  }

  /** Un punto lontano almeno `SPAWN_DISTANCE` da ogni giocatore; se non c'e', il piu' lontano. */
  private spawnPoint(match: Match): Vec2 {
    const players = match.livingPlayers().map((player) => player.position);
    const points = this.options.spawnPoints;
    if (points.length === 0) return new Vec2(match.arena.width / 2, match.arena.height / 3);
    const distance = (point: Vec2): number => Math.min(...players.map((p) => p.distanceTo(point)), Infinity);
    const far = points.filter((point) => distance(point) >= SPAWN_DISTANCE);
    const choice = far.length > 0 ? far[Math.floor(match.rng.next() * far.length)]! : points.reduce((a, b) => (distance(a) >= distance(b) ? a : b));
    const jitter = new Vec2((match.rng.next() - 0.5) * 50, (match.rng.next() - 0.5) * 50);
    return choice.add(jitter);
  }
}
