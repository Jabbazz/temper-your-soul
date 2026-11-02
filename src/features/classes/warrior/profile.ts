import type { ClassProfile } from '../class-stats';

/** Prima taratura provvisoria: resistenza e protezione, mobilità contenuta. */
export const WARRIOR_PROFILE: ClassProfile = {
  base: { maxHealth: 150, armor: 15, maxMana: 60, manaRegeneration: 4, moveSpeed: 170, attackSpeed: 0, abilityPower: 0 },
  equipment: {
    primary_hand: { maxHealth: 5, armor: 2 },
    secondary_hand: { maxHealth: 10, armor: 8 },
    armor: { maxHealth: 25, armor: 12 },
    boots: { maxHealth: 10, armor: 3, moveSpeed: 3 },
  },
};
