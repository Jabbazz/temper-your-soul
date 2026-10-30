import type { DangerZoneSpec } from '../combat/danger-zone';
import type { ProjectileSpec } from '../combat/projectile';
import type { Vec2 } from '../../core/vec2';

/** Id stabili delle skill: non rinominarli (li usano test, eventi e rappresentazione). */
export type SkillId = 'arcane_bolt' | 'frost_orb' | 'meteor' | 'astral_step';

/** Che cosa fa una skill. Dati di sola lettura: il comportamento sta in `skill-effects.ts`. */
export type SkillEffect =
  /** Un proiettile verso la mira, emesso da `muzzleOffset` rispetto al giocatore. */
  | { kind: 'projectile'; projectile: ProjectileSpec; muzzleOffset: Vec2 }
  /** Una zona che esplode dopo un ritardo nel punto mirato. */
  | { kind: 'ground_blast'; zone: DangerZoneSpec }
  /** Uno spostamento istantaneo verso la mira, con invulnerabilita' temporanea. */
  | { kind: 'dash'; distance: number; invulnerability: number };

export interface SkillDefinition {
  readonly id: SkillId;
  /** Testi visibili al giocatore (in italiano). */
  readonly name: string;
  readonly description: string;
  /** Etichetta del comando mostrata nell'interfaccia (i tasti veri sono nell'Input Map). */
  readonly keyLabel: string;
  /** Tempo di ricarica in secondi. */
  readonly cooldown: number;
  readonly effect: SkillEffect;
}
