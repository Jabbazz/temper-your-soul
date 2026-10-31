import type { BossDefinition, BossStats } from '../../boss/boss-definition';
import { FROST_WARDEN_SUMMONS } from '../../minions/minion-catalog';
import {
  BLINK_STRIKE,
  BLIZZARD,
  FROST_NOVA,
  GLACIAL_CHARGE,
  ICE_SPIKES,
  SHARD_VOLLEY,
} from './frost-patterns';

/**
 * Il Custode del ghiaccio: agile ed evasivo. Piu' veloce del guardiano (quasi quanto il giocatore), tiene le distanze,
 * attacca spesso e si teletrasporta. Ha la vita piu' alta dei dungeon.
 * Valori provvisori (vedi docs/game-design.md): non definiscono il bilanciamento.
 */
export const FROST_WARDEN_STATS: BossStats = {
  maxHealth: 3600,
  phaseTwoThreshold: 0.5,
  speed: 165,
  slowedSpeed: 55,
  orbitDistance: 260,
  orbitSpeedFactor: 0.55,
  firstAttackDelay: 1.5,
  attackInterval: { normal: 1.9, rage: 1.4 },
  attackPose: 0.4,
  hitRadius: 24,
  contactDistance: 28,
  contactDamage: 16,
  chargeDamage: 28,
  chargeHitDistance: 36,
};

/** Gli schemi in rotazione: apre con le schegge, alterna attacchi a distanza e a zone, chiude con la carica. */
export const FROST_WARDEN: BossDefinition = {
  id: 'frost_warden',
  name: 'CUSTODE DEL GHIACCIO',
  art: 'frost_warden',
  stats: FROST_WARDEN_STATS,
  patterns: [SHARD_VOLLEY, ICE_SPIKES, BLINK_STRIKE, BLIZZARD, FROST_NOVA, GLACIAL_CHARGE],
  summons: FROST_WARDEN_SUMMONS,
};
