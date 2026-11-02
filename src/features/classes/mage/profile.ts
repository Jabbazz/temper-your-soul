import type { ClassProfile } from '../class-stats';

/** Prima taratura provvisoria: mana e potenza, poca protezione. */
export const MAGE_PROFILE: ClassProfile = {
  base: { maxHealth: 90, armor: 0, maxMana: 150, manaRegeneration: 8, moveSpeed: 177, attackSpeed: 0, abilityPower: 0 },
  equipment: {
    primary_hand: { maxMana: 10, manaRegeneration: 0.4, abilityPower: 0.04 },
    secondary_hand: { maxMana: 15, manaRegeneration: 0.8, abilityPower: 0.03 },
    armor: { maxHealth: 5, armor: 2, maxMana: 20, manaRegeneration: 1.2 },
    boots: { maxMana: 5, manaRegeneration: 0.4, moveSpeed: 2 },
  },
};
