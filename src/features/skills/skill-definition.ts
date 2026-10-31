import type { DangerZoneSpec } from '../combat/danger-zone';
import type { ProjectileSpec } from '../combat/projectile';
import type { Vec2 } from '../../core/vec2';

/** Quante skill ha il personaggio (gli slot corrispondono ai comandi `skill_1`..`skill_4` dell'Input Map). */
export const SKILL_SLOT_COUNT = 4;

/** Che cosa fa una skill. Dati di sola lettura: il comportamento sta in `skill-effects.ts`. */
export type SkillEffect =
  /** Uno o piu' proiettili verso la mira, emessi da `muzzleOffset` rispetto al giocatore; `count` > 1 li apre a ventaglio. */
  | { kind: 'projectile'; projectile: ProjectileSpec; muzzleOffset: Vec2; count?: number; spread?: number }
  /** Una zona che esplode dopo un ritardo: nel punto mirato (`aim`, predefinito) o attorno al lanciatore (`caster`). */
  | { kind: 'ground_blast'; zone: DangerZoneSpec; center?: 'aim' | 'caster' }
  /** Uno spostamento istantaneo verso la mira, con invulnerabilita' temporanea. */
  | { kind: 'dash'; distance: number; invulnerability: number }
  /** Un colpo ravvicinato a settore verso la mira: colpisce il boss se e' nel raggio e nell'arco. */
  | { kind: 'melee_arc'; range: number; arc: number; damage: number };

export interface SkillDefinition {
  /** Id stabile della famiglia di oggetti che la concede (o della skill base): usato da test ed eventi. */
  readonly id: string;
  /** Testi visibili al giocatore (in italiano). */
  readonly name: string;
  readonly description: string;
  /** Ricarica in secondi. */
  readonly cooldown: number;
  readonly manaCost?: number;
  readonly manaRegeneration?: number;
  /** Id dell'aspetto e del suono (chiavi in `presentation/effects.ts` e `audio/audio-player.ts`; sconosciuto = generico per tipo). */
  readonly visual: string;
  readonly effect: SkillEffect;
}

/** Le skill del personaggio per slot; `null` = slot vuoto (nessuna skill). */
export type Loadout = readonly (SkillDefinition | null)[];
