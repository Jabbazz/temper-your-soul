import type { MinionDefinition } from '../minion-definition';
import { minionShot, minionZone } from './shots';

/*
 * Palude: acqua nera, funghi, radici, fango che respira. Gli schemi della Madre delle spore da insegnare sono NUVOLA DI
 * SPORE, ANELLO DI MELMA, FRUSTA DI RADICI, ACCERCHIAMENTO, PIOGGIA DI SPORE e SLANCIO TOSSICO. Vita della cripta: le
 * stanze della palude la scalano.
 */

/** Funghetti lenti e coriacei che si attaccano al giocatore (evocati anche dal boss in furia). */
export const SPORELING: MinionDefinition = {
  id: 'sporeling',
  name: 'Sporello',
  visual: 'swamp_sporeling',
  behavior: 'chaser',
  maxHealth: 90,
  speed: 72,
  hitRadius: 11,
  contactDamage: 10,
};

/** Vescia: rotola verso il giocatore e scoppia in una nube che resta e ferisce anche i nemici (la NUVOLA DI SPORE). */
export const PUFFBALL: MinionDefinition = {
  id: 'puffball',
  name: 'Vescia',
  visual: 'swamp_puffball',
  behavior: 'kamikaze',
  tier: 'base',
  maxHealth: 30,
  speed: 70,
  hitRadius: 10,
  contactDamage: 6,
  blastRadius: 26,
  onDeath: { kind: 'pool', zone: minionZone(46, 0.5, 7, 'swamp_puff', { hurtsMinions: true }), pulses: 4, interval: 0.75 },
};

/** Zanzara di torbiera: nugoli velocissimi, un colpo le abbatte. */
export const BOG_GNAT: MinionDefinition = {
  id: 'bog_gnat',
  name: 'Zanzara di torbiera',
  visual: 'swamp_gnat',
  behavior: 'flyer',
  maxHealth: 10,
  speed: 175,
  hitRadius: 6,
  contactDamage: 4,
  flying: true,
  weave: 30,
};

/** Rospo di torbiera: segna un cerchio a terra e ci atterra (lo SLANCIO TOSSICO). */
export const BOG_TOAD: MinionDefinition = {
  id: 'bog_toad',
  name: 'Rospo di torbiera',
  visual: 'swamp_toad',
  behavior: 'leaper',
  maxHealth: 60,
  speed: 55,
  hitRadius: 12,
  contactDamage: 6,
  leap: { range: 380, windup: 0.6, flight: 0.55, cooldown: 2.6, zone: minionZone(46, 1.15, 11, 'swamp_toad_landing') },
};

/** Fiore sputaveleno: lancia a parabola zone di spore sul giocatore (la PIOGGIA DI SPORE). */
export const SPITTING_FLOWER: MinionDefinition = {
  id: 'spitting_flower',
  name: 'Fiore sputaveleno',
  visual: 'swamp_flower',
  behavior: 'turret',
  maxHealth: 55,
  speed: 0,
  hitRadius: 11,
  contactDamage: 5,
  lob: { zone: minionZone(42, 1.1, 9, 'swamp_spit'), interval: 3.2, firstDelay: 1.6, range: 560, shape: 'spots', count: 2, scatter: 70 },
};

/** Verme delle radici: sotto il fango non si colpisce; emerge con un segnale e frusta in linea (la FRUSTA DI RADICI). */
export const ROOT_WORM: MinionDefinition = {
  id: 'root_worm',
  name: 'Verme delle radici',
  visual: 'swamp_worm',
  behavior: 'burrower',
  maxHealth: 70,
  speed: 85,
  hitRadius: 12,
  contactDamage: 6,
  burrow: { emergeRange: 230, emergeTime: 0.8, exposed: 2.4, lash: { zone: minionZone(26, 0.6, 9, 'swamp_root'), count: 6, spacing: 44 } },
};

/** Lumaca di muschio: lenta e coriacea, lascia una scia di melma che rallenta (l'ANELLO DI MELMA). */
export const MOSS_SNAIL: MinionDefinition = {
  id: 'moss_snail',
  name: 'Lumaca di muschio',
  visual: 'swamp_snail',
  behavior: 'chaser',
  tier: 'heavy',
  maxHealth: 160,
  speed: 38,
  hitRadius: 15,
  contactDamage: 8,
  trail: { zone: minionZone(26, 0.5, 3, 'swamp_slime', { slowSeconds: 1.2 }), interval: 0.9 },
};

/** Cerchio delle fate: anello di funghi che genera sporelli e stringe attorno al giocatore un anello di spore (l'ACCERCHIAMENTO). */
export const FAIRY_RING: MinionDefinition = {
  id: 'fairy_ring',
  name: 'Cerchio delle fate',
  visual: 'swamp_fairy_ring',
  behavior: 'nest',
  maxHealth: 150,
  speed: 0,
  hitRadius: 16,
  contactDamage: 5,
  nest: { spawn: 'sporeling', interval: 3.8, firstDelay: 1.4, burst: 2, maxChildren: 5 },
  shot: { projectile: minionShot(95, 7, 5, 'swamp_ring_spore', 2.6), interval: 6, firstDelay: 3, windup: 0.8, range: 700, pattern: { kind: 'implode', count: 16, radius: 230, gap: 3 } },
};

export const SWAMP_MINIONS: readonly MinionDefinition[] = [SPORELING, PUFFBALL, BOG_GNAT, BOG_TOAD, SPITTING_FLOWER, ROOT_WORM, MOSS_SNAIL, FAIRY_RING];
