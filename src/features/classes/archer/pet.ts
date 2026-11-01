import type { Vec2 } from '../../../core/vec2';
import type { PetSpec } from '../skill-mechanics';

/** Stato del compagno: nessun DOM, identità del proprietario stabile nel party. */
export interface CombatPet {
  readonly owner: string;
  position: Vec2;
  remaining: number;
  attackIn: number;
  target: string | null;
  readonly spec: PetSpec;
}

/** Frazione HP massimi al secondo, provvisoria: evita il medesimo danno percentuale sui boss. */
export const BLEEDING = { boss: 0.0015, lieutenant: 0.003, minion: 0.025, duration: 4, chance: 0.2 } as const;
