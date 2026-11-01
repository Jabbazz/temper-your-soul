import type { CharacterClass } from '../character/character-class';
import type { EquipmentSlot } from '../items/equipment-slot';
import { RARITY_STATS, type Rarity } from '../items/rarity';
import { CLASS_PROFILES, type EquipmentStats, type CombatStats } from './class-stats';

/** Stessa progressione di potenza della rarità; livello oggetto ancora limitato al GS. */
export function equipmentStats(characterClass: CharacterClass, slot: EquipmentSlot, rarity: Rarity): EquipmentStats {
  const result: EquipmentStats = {};
  for (const [key, value] of Object.entries(CLASS_PROFILES[characterClass].equipment[slot])) {
    Object.assign(result, { [key as keyof CombatStats]: value * RARITY_STATS[rarity].powerMultiplier });
  }
  return result;
}

const LABELS: Record<keyof CombatStats, string> = {
  maxHealth: 'Vita massima', armor: 'Difesa', maxMana: 'Mana massimo',
  manaRegeneration: 'Rigenerazione mana', moveSpeed: 'Movimento',
  attackSpeed: 'Velocità attacco primario', abilityPower: 'Danno abilità',
};

export function describeEquipmentStats(stats: EquipmentStats): string[] {
  return (Object.entries(stats) as [keyof CombatStats, number][]).map(([key, value]) => {
    const percent = key === 'attackSpeed' || key === 'abilityPower';
    const unit = percent ? '%' : key === 'moveSpeed' ? ' u/s' : key === 'manaRegeneration' ? '/s' : '';
    const number = Number((value * (percent ? 100 : 1)).toFixed(2)).toString().replace('.', ',');
    return `${LABELS[key]} +${number}${unit}`;
  });
}
