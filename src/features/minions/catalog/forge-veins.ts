import type { MinionDefinition } from '../minion-definition';
import { minionShot, minionZone } from './shots';

/*
 * Fucina, vene B e C (fase 7 dello studio sulla grafica). Valori provvisori dalle schede dello studio, da tarare con
 * Jabbaz: la vita e' quella della cripta, le stanze della fucina la scalano. Sulla lava niente arancio: colpi e zone
 * sono bianchi o viola.
 * - Armeria: armi e armature forgiate per il Colosso.
 * - Miniera: le gallerie del minerale del Colosso.
 */

// --- Vena B: Armeria --------------------------------------------------------------------------------------------

/** Lama volante: vola sopra i ripari e ogni tanto si lancia in linea (la CARICA DI FERRO in piccolo). */
export const FLYING_BLADE: MinionDefinition = {
  id: 'flying_blade',
  name: 'Lama volante',
  visual: 'forge_blade',
  behavior: 'chaser',
  maxHealth: 12,
  speed: 120,
  hitRadius: 7,
  contactDamage: 5,
  flying: true,
  charge: { range: 280, windup: 0.4, distance: 240, speed: 600, recover: 0.5, cooldown: 2.2, damage: 6 },
};

/** Paggio di latta: alla morte salta in quattro rivetti a croce (la CROCE in piccolo). */
export const TIN_PAGE: MinionDefinition = {
  id: 'tin_page',
  name: 'Paggio di latta',
  visual: 'forge_page',
  behavior: 'chaser',
  maxHealth: 24,
  speed: 85,
  hitRadius: 8,
  contactDamage: 6,
  onDeath: { kind: 'ring', projectile: minionShot(130, 6, 4, 'forge_rivet'), count: 4 },
};

/** Balestra a ripetizione: tre dardi veloci in fila, ognuno rimirato (lo SBARRAMENTO DI BRACI). */
export const REPEATING_CROSSBOW: MinionDefinition = {
  id: 'repeating_crossbow',
  name: 'Balestra a ripetizione',
  visual: 'forge_crossbow',
  behavior: 'turret',
  maxHealth: 70,
  speed: 0,
  hitRadius: 11,
  contactDamage: 5,
  shot: { projectile: minionShot(330, 7, 4, 'forge_crossbow_bolt'), interval: 3.4, firstDelay: 1.4, windup: 0.6, series: { count: 3, gap: 0.3 } },
};

/** Mazzafrusto: gira attorno al giocatore e semina ferro a spirale (la SPIRALE DEL SOFFIETTO). */
export const FLAIL: MinionDefinition = {
  id: 'flail',
  name: 'Mazzafrusto',
  visual: 'forge_flail',
  behavior: 'orbiter',
  maxHealth: 50,
  speed: 110,
  hitRadius: 10,
  contactDamage: 6,
  orbit: { radius: 210, speed: 1 },
  shot: {
    projectile: minionShot(115, 6, 4, 'forge_flail_link', 3),
    interval: 4.6,
    firstDelay: 2,
    windup: 0.6,
    pattern: { kind: 'ring', count: 2, turn: 0.45 },
    series: { count: 12, gap: 0.1 },
  },
};

/** Armatura vuota: ferma sulla rastrelliera finche' non passi, poi uno scatto lunghissimo e un anello di schegge (la CARICA DI FERRO). */
export const EMPTY_ARMOR: MinionDefinition = {
  id: 'empty_armor',
  name: 'Armatura vuota',
  visual: 'forge_armor',
  behavior: 'charger',
  tier: 'heavy',
  maxHealth: 200,
  speed: 60,
  hitRadius: 15,
  contactDamage: 9,
  dormant: { wakeRadius: 280 },
  charge: {
    range: 420,
    windup: 0.9,
    distance: 420,
    speed: 900,
    recover: 1.1,
    cooldown: 3.6,
    damage: 13,
    arrivalRing: { projectile: minionShot(120, 7, 5, 'forge_armor_shard'), count: 10 },
  },
};

/** Armaiolo: raddrizza le lame e le rimanda fuori (aura di riparazione: i vicini recuperano vita). */
export const ARMORER: MinionDefinition = {
  id: 'armorer',
  name: 'Armaiolo',
  visual: 'forge_armorer',
  behavior: 'support',
  maxHealth: 80,
  speed: 60,
  hitRadius: 9,
  contactDamage: 4,
  preferredDistance: 360,
  aura: { kind: 'repair', radius: 220, amount: 0.15, interval: 5 },
};

/** Rastrelliera: ogni spada che manca e' in volo (le priorita'). */
export const WEAPON_RACK: MinionDefinition = {
  id: 'weapon_rack',
  name: 'Rastrelliera',
  visual: 'forge_rack',
  behavior: 'nest',
  maxHealth: 160,
  speed: 0,
  hitRadius: 16,
  contactDamage: 5,
  nest: { spawn: 'flying_blade', interval: 4.4, firstDelay: 1.4, burst: 2, maxChildren: 4 },
};

// --- Vena C: Miniera --------------------------------------------------------------------------------------------

/** Canarino del grisou: quando scoppia lascia una nube di gas che ferisce anche i servitori (uccidere da lontano). */
export const FIREDAMP_CANARY: MinionDefinition = {
  id: 'firedamp_canary',
  name: 'Canarino del grisou',
  visual: 'forge_canary',
  behavior: 'flyer',
  maxHealth: 10,
  speed: 150,
  hitRadius: 6,
  contactDamage: 4,
  flying: true,
  weave: 30,
  onDeath: { kind: 'pool', zone: minionZone(32, 0.5, 6, 'forge_firedamp', { hurtsMinions: true }), pulses: 3, interval: 0.7 },
};

/** Minatore dannato: lento e coriaceo, scava per un padrone che non paga piu' (non farsi chiudere). */
export const DAMNED_MINER: MinionDefinition = {
  id: 'damned_miner',
  name: 'Minatore dannato',
  visual: 'forge_miner',
  behavior: 'chaser',
  maxHealth: 32,
  speed: 60,
  hitRadius: 9,
  contactDamage: 7,
};

/** Talpa di ferro: sotto terra, emerge con una frusta di sette zone e un anello di schegge (le LINEE DI FUSIONE in piccolo). */
export const IRON_MOLE: MinionDefinition = {
  id: 'iron_mole',
  name: 'Talpa di ferro',
  visual: 'forge_mole',
  behavior: 'burrower',
  maxHealth: 65,
  speed: 85,
  hitRadius: 11,
  contactDamage: 6,
  burrow: {
    emergeRange: 240,
    emergeTime: 0.8,
    exposed: 2.2,
    lash: { zone: minionZone(24, 0.6, 9, 'forge_mole_line'), count: 7, spacing: 42 },
    arrivalRing: { projectile: minionShot(110, 6, 4, 'forge_mole_shard'), count: 8 },
  },
};

/** Fochino: accende e conta fino a tre; quattro bracci di zone a croce, che scoppiano dal centro (la CROCE DELLA FUCINA). */
export const BLASTER: MinionDefinition = {
  id: 'blaster',
  name: 'Fochino',
  visual: 'forge_blaster',
  behavior: 'shooter',
  maxHealth: 50,
  speed: 62,
  hitRadius: 9,
  contactDamage: 5,
  preferredDistance: 340,
  lob: { zone: minionZone(28, 1, 9, 'forge_blast_cross'), interval: 3.8, firstDelay: 1.6, range: 560, shape: 'cross', count: 3, scatter: 0 },
};

/** Carrello impazzito: una corsa lunga che rimbalza due volte sui muri (leggere le linee). */
export const RUNAWAY_CART: MinionDefinition = {
  id: 'runaway_cart',
  name: 'Carrello impazzito',
  visual: 'forge_cart',
  behavior: 'charger',
  maxHealth: 70,
  speed: 70,
  hitRadius: 13,
  contactDamage: 7,
  charge: { range: 500, windup: 0.8, distance: 700, speed: 620, recover: 1, cooldown: 3.4, damage: 11, bounces: 2 },
};

/** Gigante di minerale: salto pesante, e all'arrivo un anello di schegge di ferro (la MARTELLATA). */
export const ORE_GIANT: MinionDefinition = {
  id: 'ore_giant',
  name: 'Gigante di minerale',
  visual: 'forge_ore_giant',
  behavior: 'leaper',
  tier: 'heavy',
  maxHealth: 210,
  speed: 45,
  hitRadius: 17,
  contactDamage: 10,
  leap: {
    range: 440,
    windup: 1,
    flight: 0.6,
    cooldown: 3.6,
    zone: minionZone(90, 1.6, 13, 'forge_ore_slam'),
    arrivalRing: { projectile: minionShot(120, 7, 5, 'forge_ore_shard'), count: 12 },
  },
};

/** Pozzo della miniera: dal fondo risale sempre qualcuno (le priorita'). */
export const MINE_SHAFT: MinionDefinition = {
  id: 'mine_shaft',
  name: 'Pozzo della miniera',
  visual: 'forge_shaft',
  behavior: 'nest',
  maxHealth: 160,
  speed: 0,
  hitRadius: 16,
  contactDamage: 5,
  nest: { spawn: 'damned_miner', interval: 4.6, firstDelay: 1.5, burst: 2, maxChildren: 4 },
};

export const ARMORY_MINIONS: readonly MinionDefinition[] = [FLYING_BLADE, TIN_PAGE, REPEATING_CROSSBOW, FLAIL, EMPTY_ARMOR, ARMORER, WEAPON_RACK];
export const MINE_MINIONS: readonly MinionDefinition[] = [FIREDAMP_CANARY, DAMNED_MINER, IRON_MOLE, BLASTER, RUNAWAY_CART, ORE_GIANT, MINE_SHAFT];
