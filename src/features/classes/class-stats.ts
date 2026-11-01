import type { CharacterClass } from '../character/character-class';
import type { EquipmentSlot } from '../items/equipment-slot';
import type { Loadout } from '../skills/skill-definition';
import { WARRIOR_PROFILE } from './warrior/profile';
import { MAGE_PROFILE } from './mage/profile';
import { ARCHER_PROFILE } from './archer/profile';

export interface CombatStats {
  readonly maxHealth: number;
  readonly armor: number;
  readonly maxMana: number;
  readonly manaRegeneration: number;
  readonly moveSpeed: number;
  /** Bonus frazionario alla frequenza degli attacchi primari. */
  readonly attackSpeed: number;
  /** Bonus frazionario al danno delle abilità. */
  readonly abilityPower: number;
}
export type EquipmentStats = Partial<CombatStats>;
export interface ClassProfile {
  readonly base: CombatStats;
  readonly equipment: Readonly<Record<EquipmentSlot, EquipmentStats>>;
}

export const CLASS_PROFILES: Readonly<Record<CharacterClass, ClassProfile>> = {
  warrior: WARRIOR_PROFILE, mage: MAGE_PROFILE, archer: ARCHER_PROFILE,
};

/** Compatibilità per fixture prive di identità; il gioco passa sempre la classe esplicita. */
export const NEUTRAL_STATS: CombatStats = {
  maxHealth: 100, armor: 0, maxMana: 100, manaRegeneration: 8,
  moveSpeed: 177, attackSpeed: 0, abilityPower: 0,
};

/** Nessuna statistica viene salvata: si ricalcola da classe e oggetti equipaggiati. */
export function resolveCombatStats(characterClass: CharacterClass | null, loadout: Loadout): CombatStats {
  const stats = { ...(characterClass ? CLASS_PROFILES[characterClass].base : NEUTRAL_STATS) };
  for (const skill of loadout) {
    if (!skill?.equipmentStats) continue;
    for (const key of Object.keys(skill.equipmentStats) as (keyof CombatStats)[]) {
      stats[key] += skill.equipmentStats[key] ?? 0;
    }
  }
  return stats;
}

/** Difesa a rendimenti decrescenti: 100 difesa dimezza il danno. Valore provvisorio. */
export const ARMOR_CONSTANT = 100;
export function damageAfterArmor(damage: number, armor: number): number {
  return Math.max(0, damage) * ARMOR_CONSTANT / (ARMOR_CONSTANT + Math.max(0, armor));
}
