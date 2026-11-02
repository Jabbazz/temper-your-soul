import type { BossDefinition, BossStats } from '../../boss/boss-definition';
import { BELLOWS_SPIRAL, EMBER_BARRAGE, FORGE_CROSS, HAMMER_SLAM, IRON_CHARGE, MOLTEN_LINES } from './forge-patterns';
import { FORGE_COLOSSUS_SUMMONS } from '../../minions/minion-catalog';

/**
 * Valori del colosso della fornace: enorme e lento, con pochi colpi pesanti. Provvisori (vedi docs/game-design.md):
 * la vita segue la progressione dei boss (cripta 1800, palude 2400, fucina 3000, ghiacciaio 3600).
 */
export const FORGE_COLOSSUS_STATS: BossStats = {
  maxHealth: 9000,
  phaseTwoThreshold: 0.5,
  speed: 82,
  slowedSpeed: 26,
  orbitDistance: 300,
  orbitSpeedFactor: 0.3,
  firstAttackDelay: 2.6,
  attackInterval: { normal: 3, rage: 2.3 },
  attackPose: 0.7,
  hitRadius: 40,
  contactDistance: 30,
  contactDamage: 28,
  chargeDamage: 38,
  chargeHitDistance: 52,
};

/** Il colosso della fornace, con gli schemi in rotazione: zone e proiettili si alternano. */
export const FORGE_COLOSSUS: BossDefinition = {
  id: 'forge_colossus',
  name: 'COLOSSO DELLA FORNACE',
  art: 'forge_colossus',
  stats: FORGE_COLOSSUS_STATS,
  patterns: [HAMMER_SLAM, EMBER_BARRAGE, MOLTEN_LINES, BELLOWS_SPIRAL, FORGE_CROSS, IRON_CHARGE],
  summons: FORGE_COLOSSUS_SUMMONS,
};
