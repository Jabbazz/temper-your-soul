import type { StatusEffectId } from '../combat/status-effects/status-catalog';

export interface HitEffect {
  readonly status?: StatusEffectId;
  readonly chance?: number;
  readonly duration?: number;
  readonly damagePerSecond?: number;
  readonly mark?: boolean;
  /** Ignora questa frazione dello scudo numerico dei servitori. */
  readonly penetration?: number;
}
export interface BuffSpec {
  readonly duration: number;
  readonly armor?: number;
  readonly regeneration?: number;
  readonly attackSpeed?: number;
  readonly lifesteal?: number;
  readonly abilityPower?: number;
  readonly guard?: boolean;
}
export interface PetSpec {
  readonly duration: number;
  readonly damage: number;
  readonly interval: number;
  readonly speed: number;
  readonly leapRange: number;
}
