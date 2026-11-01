import type { DangerZoneSpec } from '../combat/danger-zone';

/*
 * Varianti d'elite: un servitore normale con piu' vita, un alone del colore del modificatore e una barra della vita.
 * Quattro modificatori valgono ovunque, uno per dungeon e' a tema. Valori provvisori (vedi lo studio sulla progressione).
 */

export type EliteId = 'robust' | 'swift' | 'twin' | 'shielded' | 'ardent' | 'rotten' | 'incandescent' | 'frozen';

export interface EliteModifier {
  readonly id: EliteId;
  /** Nome mostrato sopra la barra della vita. */
  readonly name: string;
  readonly healthMultiplier: number;
  readonly speedMultiplier: number;
  /** Moltiplicatore degli intervalli fra gli attacchi (sotto 1 = piu' frequenti). */
  readonly cadence: number;
  /** Uno scudo che ferma i proiettili e cade solo con una zona o un colpo ravvicinato. */
  readonly warded?: boolean;
  /** Morendo ne genera uno normale dello stesso tipo. */
  readonly twin?: boolean;
  /** Morendo lascia una pozza. */
  readonly deathPool?: { readonly zone: DangerZoneSpec; readonly pulses: number; readonly interval: number };
  /** Lascia zone camminando. */
  readonly trail?: { readonly zone: DangerZoneSpec; readonly interval: number };
  /** I suoi colpi rallentano il giocatore. */
  readonly slowOnHit?: number;
}

export const ELITES: Readonly<Record<EliteId, EliteModifier>> = {
  robust: { id: 'robust', name: 'Robusto', healthMultiplier: 4, speedMultiplier: 0.9, cadence: 1 },
  swift: { id: 'swift', name: 'Rapido', healthMultiplier: 2.5, speedMultiplier: 1.4, cadence: 0.7 },
  twin: { id: 'twin', name: 'Gemello', healthMultiplier: 2.5, speedMultiplier: 1, cadence: 1, twin: true },
  shielded: { id: 'shielded', name: 'Schermato', healthMultiplier: 2.5, speedMultiplier: 1, cadence: 1, warded: true },
  ardent: {
    id: 'ardent',
    name: 'Ardente',
    healthMultiplier: 2.5,
    speedMultiplier: 1,
    cadence: 1,
    trail: { zone: { team: 'enemy', radius: 24, delay: 0.8, damage: 6, visual: 'crypt_wax_pool' }, interval: 1.4 },
  },
  rotten: {
    id: 'rotten',
    name: 'Marcio',
    healthMultiplier: 2.5,
    speedMultiplier: 1,
    cadence: 1,
    deathPool: { zone: { team: 'enemy', radius: 56, delay: 0.6, damage: 8, visual: 'swamp_puff', hurtsMinions: true }, pulses: 4, interval: 0.7 },
  },
  incandescent: {
    id: 'incandescent',
    name: 'Incandescente',
    healthMultiplier: 2.5,
    speedMultiplier: 1.1,
    cadence: 1,
    trail: { zone: { team: 'enemy', radius: 22, delay: 0.7, damage: 6, visual: 'forge_ember_trail' }, interval: 0.9 },
  },
  frozen: { id: 'frozen', name: 'Gelido', healthMultiplier: 2.5, speedMultiplier: 1, cadence: 1, slowOnHit: 1 },
};

/** I modificatori validi in ogni dungeon. */
export const GENERIC_ELITES: readonly EliteId[] = ['robust', 'swift', 'twin', 'shielded'];

/** Il modificatore a tema di ogni dungeon. */
export const THEME_ELITES: Readonly<Record<string, EliteId>> = {
  crypt: 'ardent',
  swamp: 'rotten',
  forge: 'incandescent',
  glacier: 'frozen',
};

export function isEliteId(value: unknown): value is EliteId {
  return typeof value === 'string' && Object.hasOwn(ELITES, value);
}
