import type { MinionDefinition } from '../minion-definition';
import { minionShot, minionZone } from './shots';

/*
 * Palude, vene B e C (fase 7 dello studio sulla grafica). Valori provvisori dalle schede dello studio, da tarare con
 * Jabbaz: la vita e' quella della cripta, le stanze della palude la scalano.
 * - Sommersi: acqua nera, annegati, lucci, lavandaie della notte. Colpi viola e rosa.
 * - Colonia: insetti posseduti dalla spora. Colpi lilla, zone lime.
 */

// --- Vena B: Sommersi -------------------------------------------------------------------------------------------

/** Sanguisuga: si attacca e rallenta (non farsi trattenere). */
export const LEECH: MinionDefinition = {
  id: 'leech',
  name: 'Sanguisuga',
  visual: 'swamp_leech',
  behavior: 'chaser',
  maxHealth: 12,
  speed: 105,
  hitRadius: 6,
  contactDamage: 4,
  slowOnHit: 1,
};

/** Annegato: sembra un tronco nell'acqua finche' non ci passi accanto. */
export const DROWNED: MinionDefinition = {
  id: 'drowned',
  name: 'Annegato',
  visual: 'swamp_drowned',
  behavior: 'chaser',
  maxHealth: 24,
  speed: 50,
  hitRadius: 10,
  contactDamage: 7,
  dormant: { wakeRadius: 220 },
};

/** Luccio delle acque nere: fermo a lungo, poi un solo scatto e un anello di spore lente (lo SLANCIO TOSSICO). */
export const BLACK_PIKE: MinionDefinition = {
  id: 'black_pike',
  name: 'Luccio delle acque nere',
  visual: 'swamp_pike',
  behavior: 'charger',
  maxHealth: 60,
  speed: 70,
  hitRadius: 12,
  contactDamage: 6,
  charge: {
    range: 380,
    windup: 1.2,
    distance: 340,
    speed: 560,
    recover: 0.9,
    cooldown: 3,
    damage: 10,
    arrivalRing: { projectile: minionShot(80, 6, 5, 'swamp_pike_spore'), count: 8 },
  },
};

/** Ninfea carnivora: un anello di semi lenti che durano a lungo, con un varco che ruota (la NUVOLA DI SPORE). */
export const CARNIVOROUS_LILY: MinionDefinition = {
  id: 'carnivorous_lily',
  name: 'Ninfea carnivora',
  visual: 'swamp_lily',
  behavior: 'turret',
  maxHealth: 55,
  speed: 0,
  hitRadius: 11,
  contactDamage: 5,
  shot: { projectile: minionShot(60, 6, 5, 'swamp_lily_seed', 7), interval: 4.5, firstDelay: 1.8, windup: 0.7, pattern: { kind: 'ring', count: 18, gap: 3, turn: 0.5 } },
};

/** Lavandaia della notte: getta un cerchio di melma attorno al giocatore; il centro e' l'unico posto asciutto (l'ANELLO DI MELMA). */
export const NIGHT_WASHER: MinionDefinition = {
  id: 'night_washer',
  name: 'Lavandaia della notte',
  visual: 'swamp_washer',
  behavior: 'shooter',
  maxHealth: 50,
  speed: 62,
  hitRadius: 9,
  contactDamage: 5,
  preferredDistance: 340,
  lob: { zone: minionZone(30, 1.1, 9, 'swamp_washer_ring'), interval: 3.6, firstDelay: 1.6, range: 560, shape: 'ring', count: 9, scatter: 110 },
};

/** Annegato gonfio: lento, scoppia vicino al giocatore e libera quattro sanguisughe (tenere la distanza). */
export const BLOATED_DROWNED: MinionDefinition = {
  id: 'bloated_drowned',
  name: 'Annegato gonfio',
  visual: 'swamp_bloated',
  behavior: 'kamikaze',
  tier: 'heavy',
  maxHealth: 170,
  speed: 42,
  hitRadius: 16,
  contactDamage: 14,
  blastRadius: 70,
  onDeath: { kind: 'split', into: 'leech', count: 4 },
};

/** Girino: esce dall'Ovatura, piccolissimo e velocissimo. */
export const TADPOLE: MinionDefinition = {
  id: 'tadpole',
  name: 'Girino',
  visual: 'swamp_tadpole',
  behavior: 'chaser',
  maxHealth: 8,
  speed: 145,
  hitRadius: 6,
  contactDamage: 3,
};

/** Ovatura: mille uova, mille bocche (le priorita'). */
export const SPAWN_CLUSTER: MinionDefinition = {
  id: 'spawn_cluster',
  name: 'Ovatura',
  visual: 'swamp_spawn',
  behavior: 'nest',
  maxHealth: 140,
  speed: 0,
  hitRadius: 15,
  contactDamage: 5,
  nest: { spawn: 'tadpole', interval: 3.8, firstDelay: 1.2, burst: 3, maxChildren: 6 },
};

// --- Vena C: Colonia --------------------------------------------------------------------------------------------

/** Formica infestata: il fungo le dice dove andare (non farsi chiudere). */
export const INFESTED_ANT: MinionDefinition = {
  id: 'infested_ant',
  name: 'Formica infestata',
  visual: 'swamp_ant',
  behavior: 'chaser',
  maxHealth: 12,
  speed: 120,
  hitRadius: 7,
  contactDamage: 4,
};

/** Falena delle spore: vola e semina piccole nubi (la PIOGGIA DI SPORE in piccolo). */
export const SPORE_MOTH: MinionDefinition = {
  id: 'spore_moth',
  name: 'Falena delle spore',
  visual: 'swamp_moth',
  behavior: 'flyer',
  maxHealth: 10,
  speed: 140,
  hitRadius: 7,
  contactDamage: 4,
  flying: true,
  weave: 36,
  trail: { zone: minionZone(18, 0.6, 4, 'swamp_moth_dust'), interval: 1.3 },
};

/** Scarabeo bombardiere: mira peggio della Madre, ma piu' spesso (la PIOGGIA DI SPORE). */
export const BOMBARDIER_BEETLE: MinionDefinition = {
  id: 'bombardier_beetle',
  name: 'Scarabeo bombardiere',
  visual: 'swamp_beetle',
  behavior: 'shooter',
  maxHealth: 60,
  speed: 60,
  hitRadius: 10,
  contactDamage: 5,
  preferredDistance: 300,
  lob: { zone: minionZone(32, 1, 8, 'swamp_beetle_spray'), interval: 3.4, firstDelay: 1.5, range: 560, shape: 'spots', count: 5, scatter: 120 },
};

/** Ragno tessitore: tesse in cerchio attorno al giocatore e il cerchio si chiude, rallentando (l'ACCERCHIAMENTO). */
export const WEAVER_SPIDER: MinionDefinition = {
  id: 'weaver_spider',
  name: 'Ragno tessitore',
  visual: 'swamp_spider',
  behavior: 'shooter',
  maxHealth: 50,
  speed: 70,
  hitRadius: 10,
  contactDamage: 5,
  preferredDistance: 300,
  slowOnHit: 1,
  shot: { projectile: minionShot(90, 6, 4, 'swamp_web', 2.6), interval: 4.6, firstDelay: 2, windup: 0.7, range: 600, pattern: { kind: 'implode', count: 12, radius: 180, gap: 3 } },
};

/** Cicala marcia: gira attorno e canta in cerchi lenti, con un buco solo (la NUVOLA in piccolo). */
export const ROTTEN_CICADA: MinionDefinition = {
  id: 'rotten_cicada',
  name: 'Cicala marcia',
  visual: 'swamp_cicada',
  behavior: 'orbiter',
  maxHealth: 40,
  speed: 120,
  hitRadius: 8,
  contactDamage: 4,
  flying: true,
  orbit: { radius: 210, speed: 0.9 },
  shot: { projectile: minionShot(75, 6, 5, 'swamp_cicada_song', 4.5), interval: 3.8, firstDelay: 1.8, windup: 0.6, pattern: { kind: 'ring', count: 10, gap: 2 } },
};

/** Cervo infestato: carica pesante che lascia radici alle spalle, poi un lungo respiro (la FRUSTA DI RADICI). */
export const INFESTED_STAG: MinionDefinition = {
  id: 'infested_stag',
  name: 'Cervo infestato',
  visual: 'swamp_stag',
  behavior: 'charger',
  tier: 'heavy',
  maxHealth: 190,
  speed: 60,
  hitRadius: 16,
  contactDamage: 9,
  charge: {
    range: 400,
    windup: 0.9,
    distance: 380,
    speed: 500,
    recover: 1.6,
    cooldown: 3.4,
    damage: 12,
    trail: minionZone(24, 0.6, 7, 'swamp_stag_roots'),
    trailSpacing: 50,
  },
};

/** Formicaio: la colonia non dorme (le priorita'). */
export const ANTHILL: MinionDefinition = {
  id: 'anthill',
  name: 'Formicaio',
  visual: 'swamp_anthill',
  behavior: 'nest',
  maxHealth: 150,
  speed: 0,
  hitRadius: 16,
  contactDamage: 5,
  nest: { spawn: 'infested_ant', interval: 3.8, firstDelay: 1.3, burst: 3, maxChildren: 6 },
};

export const SUNKEN_MINIONS: readonly MinionDefinition[] = [LEECH, DROWNED, BLACK_PIKE, CARNIVOROUS_LILY, NIGHT_WASHER, BLOATED_DROWNED, SPAWN_CLUSTER, TADPOLE];
export const COLONY_MINIONS: readonly MinionDefinition[] = [INFESTED_ANT, SPORE_MOTH, BOMBARDIER_BEETLE, WEAVER_SPIDER, ROTTEN_CICADA, INFESTED_STAG, ANTHILL];
