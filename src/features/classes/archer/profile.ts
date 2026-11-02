import type { ClassProfile } from '../class-stats';

/** Prima taratura provvisoria: movimento e frequenza degli attacchi. */
export const ARCHER_PROFILE: ClassProfile = {
  base: { maxHealth: 110, armor: 5, maxMana: 80, manaRegeneration: 4.8, moveSpeed: 195, attackSpeed: 0.1, abilityPower: 0 },
  equipment: {
    primary_hand: { attackSpeed: 0.06 },
    secondary_hand: { attackSpeed: 0.04, moveSpeed: 2 },
    armor: { maxHealth: 10, armor: 4, moveSpeed: 3 },
    boots: { armor: 1, moveSpeed: 12 },
  },
};
