import type { MinionDefinition } from '../minion-definition';
import { minionShot, minionZone } from './shots';

/*
 * Fucina: metallo fuso, braci, mantici, incudini. Gli schemi del Colosso da insegnare sono MARTELLATA, LINEE DI
 * FUSIONE, SBARRAMENTO DI BRACI, CROCE DELLA FUCINA, SPIRALE DEL SOFFIETTO e CARICA DI FERRO. Sul pavimento caldo i
 * proiettili dei servitori sono bianchi o viola, mai arancioni: si leggono meglio. Vita della cripta: le stanze la scalano.
 */

/** Folletti di scoria veloci e fragili che si lanciano contro il giocatore (evocati anche dal boss in furia). */
export const SLAG_IMP: MinionDefinition = {
  id: 'slag_imp',
  name: 'Folletto di scoria',
  visual: 'forge_imp',
  behavior: 'kamikaze',
  maxHealth: 50,
  speed: 165,
  hitRadius: 9,
  contactDamage: 16,
  blastRadius: 38,
};

/** Scintilla: erratica e velocissima, muore al primo colpo. */
export const FORGE_SPARK: MinionDefinition = {
  id: 'forge_spark',
  name: 'Scintilla',
  visual: 'forge_spark',
  behavior: 'flyer',
  maxHealth: 10,
  speed: 200,
  hitRadius: 6,
  contactDamage: 5,
  flying: true,
  weave: 55,
};

/** Sassolino di scoria: rotola in gruppo verso il giocatore. */
export const SLAG_PEBBLE: MinionDefinition = {
  id: 'slag_pebble',
  name: 'Sassolino di scoria',
  visual: 'forge_pebble',
  behavior: 'chaser',
  maxHealth: 22,
  speed: 95,
  hitRadius: 8,
  contactDamage: 6,
};

/** Mantice vivo: soffia un cono di scintille (lo SBARRAMENTO DI BRACI). */
export const LIVING_BELLOWS: MinionDefinition = {
  id: 'living_bellows',
  name: 'Mantice vivo',
  visual: 'forge_bellows',
  behavior: 'turret',
  maxHealth: 80,
  speed: 0,
  hitRadius: 13,
  contactDamage: 5,
  shot: { projectile: minionShot(150, 8, 5, 'forge_bellows_spark', 3), interval: 3, firstDelay: 1.6, windup: 0.6, pattern: { kind: 'aimed', count: 5, spread: 0.14 } },
};

/** Diavoletto della forgia: tiene la distanza e lancia quattro dardi a croce (la CROCE DELLA FUCINA). */
export const FORGE_DEVIL: MinionDefinition = {
  id: 'forge_devil',
  name: 'Diavoletto della forgia',
  visual: 'forge_devil',
  behavior: 'shooter',
  maxHealth: 45,
  speed: 95,
  hitRadius: 9,
  contactDamage: 5,
  preferredDistance: 280,
  shot: { projectile: minionShot(155, 8, 5, 'forge_cross_bolt'), interval: 2.4, firstDelay: 1.4, windup: 0.45, pattern: { kind: 'cross' } },
};

/** Incudine animata: lenta; da vicino batte a terra e libera un anello di schegge (la MARTELLATA). */
export const ANVIL_GOLEM: MinionDefinition = {
  id: 'anvil_golem',
  name: 'Incudine animata',
  visual: 'forge_anvil',
  behavior: 'chaser',
  tier: 'heavy',
  maxHealth: 190,
  speed: 45,
  hitRadius: 16,
  contactDamage: 9,
  shot: { projectile: minionShot(150, 8, 5, 'forge_anvil_shard', 2.4), interval: 3.2, firstDelay: 1.8, windup: 0.8, range: 210, pattern: { kind: 'ring', count: 10 } },
};

/** Goccia di metallo fuso: nasce dalla colata che si divide. */
export const MOLTEN_DROPLET: MinionDefinition = {
  id: 'molten_droplet',
  name: 'Goccia fusa',
  visual: 'forge_droplet',
  behavior: 'chaser',
  maxHealth: 18,
  speed: 95,
  hitRadius: 7,
  contactDamage: 5,
};

/** Colata: metallo fuso che si divide in gocce; se e' rallentata dal gelo, si fredda e non si divide. */
export const MOLTEN_SLAG: MinionDefinition = {
  id: 'molten_slag',
  name: 'Colata',
  visual: 'forge_slag',
  behavior: 'chaser',
  tier: 'base',
  maxHealth: 60,
  speed: 55,
  hitRadius: 13,
  contactDamage: 7,
  onDeath: { kind: 'split', into: 'molten_droplet', count: 3 },
  inertWhenSlowed: true,
};

/** Crogiolo: rovescia di traverso una fila di lava con un varco (le LINEE DI FUSIONE). */
export const CRUCIBLE: MinionDefinition = {
  id: 'crucible',
  name: 'Crogiolo',
  visual: 'forge_crucible',
  behavior: 'turret',
  tier: 'heavy',
  maxHealth: 170,
  speed: 0,
  hitRadius: 15,
  contactDamage: 6,
  lob: { zone: minionZone(30, 1.1, 10, 'forge_lava_line'), interval: 4.4, firstDelay: 2, range: 620, shape: 'wall', count: 7, scatter: 0 },
};

export const FORGE_MINIONS: readonly MinionDefinition[] = [
  SLAG_IMP,
  FORGE_SPARK,
  SLAG_PEBBLE,
  LIVING_BELLOWS,
  FORGE_DEVIL,
  ANVIL_GOLEM,
  MOLTEN_SLAG,
  MOLTEN_DROPLET,
  CRUCIBLE,
];
