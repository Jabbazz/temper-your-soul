import { TAU, Vec2 } from '../../core/vec2';
import type { DangerZoneSpec } from '../combat/danger-zone';
import type { Match } from '../match/match';
import { minionZone } from '../minions/catalog/shots';

/*
 * Insidie delle stanze: elementi dell'ambiente che si attivano a tempo e non si distruggono. Ognuna anticipa le zone
 * del boss del suo dungeon. Tutte annunciate (la zona ha il conto alla rovescia). Valori provvisori.
 */

export interface HazardDefinition {
  readonly id: string;
  /** Nome della fonte dei danni (schermata di sconfitta). */
  readonly name: string;
  readonly interval: number;
  readonly firstDelay: number;
  /**
   * `near`: `count` zone attorno a un giocatore a caso (entro `spread`); `line`: una fila di zone di traverso che passa
   * su un giocatore; `fixed`: `count` bocchette fra quelle della stanza.
   */
  readonly shape: 'near' | 'line' | 'fixed';
  readonly count: number;
  readonly spread: number;
  readonly zone: DangerZoneSpec;
}

export const HAZARDS: Readonly<Record<string, HazardDefinition>> = {
  crypt: {
    id: 'stained_glass',
    name: 'Vetrata',
    interval: 5.5,
    firstDelay: 4,
    shape: 'line',
    count: 7,
    spread: 0,
    zone: minionZone(30, 1, 8, 'crypt_glass'),
  },
  swamp: {
    id: 'gas_bubbles',
    name: 'Bolle di gas',
    interval: 4.5,
    firstDelay: 3.5,
    shape: 'near',
    count: 3,
    spread: 170,
    zone: minionZone(40, 1.2, 8, 'swamp_gas'),
  },
  forge: {
    id: 'lava_vents',
    name: 'Bocchetta di lava',
    interval: 3.6,
    firstDelay: 3,
    shape: 'fixed',
    count: 2,
    spread: 0,
    zone: minionZone(50, 1.2, 10, 'forge_vent'),
  },
  glacier: {
    id: 'icicles',
    name: 'Stalattite',
    interval: 4,
    firstDelay: 3.5,
    shape: 'near',
    count: 3,
    spread: 150,
    zone: minionZone(34, 1.1, 9, 'glacier_icicle'),
  },
};

/** Quante bocchette fisse ha una stanza con insidie `fixed`. */
const VENT_COUNT = 5;

/** Le insidie di una stanza in corso. */
export class HazardRunner {
  private timer: number;
  /** Bocchette fisse (scelte all'ingresso fra i punti della stanza). */
  readonly vents: readonly Vec2[];

  constructor(
    readonly hazard: HazardDefinition,
    points: readonly Vec2[],
    match: Match,
  ) {
    this.timer = hazard.firstDelay;
    const pool = [...points];
    const vents: Vec2[] = [];
    while (hazard.shape === 'fixed' && vents.length < VENT_COUNT && pool.length > 0) {
      vents.push(pool.splice(Math.floor(match.rng.next() * pool.length), 1)[0]!);
    }
    this.vents = vents;
  }

  step(dt: number, match: Match): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.hazard.interval;
    const players = match.livingPlayers();
    if (players.length === 0) return;
    const target = players[Math.floor(match.rng.next() * players.length)]!.position;
    const { hazard } = this;
    const source = { kind: 'zone' as const, name: hazard.name };
    switch (hazard.shape) {
      case 'near':
        for (let i = 0; i < hazard.count; i++) {
          const offset = i === 0 ? Vec2.ZERO : Vec2.fromAngle(match.rng.next() * TAU, hazard.spread * (0.4 + match.rng.next() * 0.6));
          match.spawnHazardZone(hazard.zone, target.add(offset), source);
        }
        return;
      case 'line': {
        // Un fascio di luce: orizzontale o verticale, passa sul giocatore.
        const horizontal = match.rng.next() < 0.5;
        const step = hazard.zone.radius * 1.8;
        for (let i = 0; i < hazard.count; i++) {
          const along = (i - (hazard.count - 1) / 2) * step;
          match.spawnHazardZone({ ...hazard.zone, delay: hazard.zone.delay + i * 0.05 }, target.add(horizontal ? new Vec2(along, 0) : new Vec2(0, along)), source);
        }
        return;
      }
      case 'fixed': {
        const pool = [...this.vents];
        for (let i = 0; i < hazard.count && pool.length > 0; i++) {
          // La bocchetta piu' vicina al bersaglio erutta sempre, le altre a caso.
          const index = i === 0 ? nearestIndex(pool, target) : Math.floor(match.rng.next() * pool.length);
          match.spawnHazardZone(hazard.zone, pool.splice(index, 1)[0]!, source);
        }
      }
    }
  }
}

function nearestIndex(points: readonly Vec2[], target: Vec2): number {
  let best = 0;
  for (let i = 1; i < points.length; i++) if (points[i]!.distanceTo(target) < points[best]!.distanceTo(target)) best = i;
  return best;
}
