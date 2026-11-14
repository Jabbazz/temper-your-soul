import type { MinionDefinition } from '../minion-definition';
import { minionShot } from './shots';

/*
 * Nemici propri del mondo aperto (sprite PixelLab, visti di fronte con la sola camminata). Per ora mostri semplici,
 * deboli e a terra: nel mondo nessuno vola, così tutti rispettano le collisioni come il giocatore. Valori provvisori;
 * le fasce li scalano con `BiomeMobs.healthScale`. Più avanti verranno mostri più grossi e più forti.
 */

/** Scheletro delle rovine: ossa nude, insegue e colpisce a contatto. Nasce fra le mura in rovina di ogni fascia. */
export const RUIN_SKELETON: MinionDefinition = {
  id: 'ruin_skeleton', name: 'Scheletro delle rovine', visual: 'crypt_ruin_skeleton',
  behavior: 'chaser', maxHealth: 40, speed: 76, hitRadius: 13, contactDamage: 7,
};

// --- Bosco Verde --------------------------------------------------------------------------------------------------

/** Goblin: piccolo e insistente, corre addosso. */
export const GOBLIN: MinionDefinition = {
  id: 'goblin', name: 'Goblin', visual: 'swamp_goblin',
  behavior: 'chaser', maxHealth: 30, speed: 88, hitRadius: 11, contactDamage: 6,
};

/** Goblin fromboliere: resta a distanza e tira sassi annunciati. */
export const GOBLIN_SLINGER: MinionDefinition = {
  id: 'goblin_slinger', name: 'Goblin fromboliere', visual: 'swamp_goblin_slinger',
  behavior: 'shooter', maxHealth: 26, speed: 70, hitRadius: 11, contactDamage: 4, preferredDistance: 240,
  shot: { projectile: minionShot(150, 6, 4, 'forge_ore_shard'), interval: 2.4, firstDelay: 1.2, windup: 0.45 },
};

/** Fungo ambulante: trotterella verso il giocatore e scoppia a contatto. */
export const MUSHROOM_WALKER: MinionDefinition = {
  id: 'mushroom_walker', name: 'Fungo ambulante', visual: 'swamp_mushroom_walker',
  behavior: 'kamikaze', maxHealth: 24, speed: 66, hitRadius: 11, contactDamage: 12, blastRadius: 30,
};

/** Coboldo: il più debole, ma veloce. */
export const KOBOLD: MinionDefinition = {
  id: 'kobold', name: 'Coboldo', visual: 'swamp_kobold',
  behavior: 'chaser', maxHealth: 22, speed: 104, hitRadius: 10, contactDamage: 5,
};

/** Lupo grigio: rapido, morde a contatto. */
export const GREY_WOLF: MinionDefinition = {
  id: 'grey_wolf', name: 'Lupo grigio', visual: 'swamp_grey_wolf',
  behavior: 'chaser', maxHealth: 34, speed: 118, hitRadius: 12, contactDamage: 7,
};

// --- Brughiera delle Nebbie --------------------------------------------------------------------------------------

/** Zombie: lento e coriaceo. */
export const ZOMBIE: MinionDefinition = {
  id: 'zombie', name: 'Zombie', visual: 'crypt_zombie',
  behavior: 'chaser', maxHealth: 70, speed: 52, hitRadius: 13, contactDamage: 9,
};

/** Ghoul: magro e veloce, artigli a contatto. */
export const GHOUL: MinionDefinition = {
  id: 'ghoul', name: 'Ghoul', visual: 'crypt_ghoul',
  behavior: 'chaser', maxHealth: 38, speed: 112, hitRadius: 12, contactDamage: 7,
};

/** Cultista novizio: tiene la distanza e lancia due fiammelle annunciate. */
export const NOVICE_CULTIST: MinionDefinition = {
  id: 'novice_cultist', name: 'Cultista novizio', visual: 'crypt_cultist',
  behavior: 'shooter', maxHealth: 34, speed: 66, hitRadius: 12, contactDamage: 4, preferredDistance: 280,
  shot: { projectile: minionShot(135, 7, 5, 'crypt_lantern_flame'), interval: 2.6, firstDelay: 1.4, windup: 0.5, pattern: { kind: 'aimed', count: 2, spread: 0.2 } },
};

export const WORLD_MINIONS: readonly MinionDefinition[] = [RUIN_SKELETON, GOBLIN, GOBLIN_SLINGER, MUSHROOM_WALKER, KOBOLD, GREY_WOLF, ZOMBIE, GHOUL, NOVICE_CULTIST];
