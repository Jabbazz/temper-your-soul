import type { MinionDefinition } from '../minion-definition';
import { minionShot, minionZone } from './shots';

/*
 * Ghiacciaio, vene B e C (fase 7 dello studio sulla grafica). Valori provvisori dalle schede dello studio, da tarare
 * con Jabbaz: la vita e' quella della cripta, le stanze del ghiacciaio la scalano. Colpi bianchi, ciano e lilla sulle
 * lastre blu scure.
 * - Tana del gelo: le bestie nutrite dal Custode.
 * - Osservatorio: la torre dove il Custode studia le stelle fredde.
 */

// --- Vena B: Tana del gelo --------------------------------------------------------------------------------------

/** Ermellino: velocissimo, a branchi; esce dalla Tana (non farsi chiudere). */
export const ERMINE: MinionDefinition = {
  id: 'ermine',
  name: 'Ermellino',
  visual: 'glacier_ermine',
  behavior: 'chaser',
  maxHealth: 12,
  speed: 150,
  hitRadius: 6,
  contactDamage: 4,
};

/** Lemming del dirupo: corre dritto e scoppia (tenere la distanza). */
export const CLIFF_LEMMING: MinionDefinition = {
  id: 'cliff_lemming',
  name: 'Lemming del dirupo',
  visual: 'glacier_lemming',
  behavior: 'kamikaze',
  maxHealth: 18,
  speed: 135,
  hitRadius: 7,
  contactDamage: 8,
  blastRadius: 30,
};

/** Gufo delle nevi: gira senza un suono, poi tre piume di ghiaccio strette e veloci (le SCHEGGE). */
export const SNOWY_OWL: MinionDefinition = {
  id: 'snowy_owl',
  name: 'Gufo delle nevi',
  visual: 'glacier_owl',
  behavior: 'orbiter',
  maxHealth: 45,
  speed: 130,
  hitRadius: 9,
  contactDamage: 5,
  flying: true,
  orbit: { radius: 260, speed: 0.8 },
  shot: { projectile: minionShot(220, 6, 4, 'glacier_owl_feather'), interval: 2.8, firstDelay: 1.5, windup: 0.5, pattern: { kind: 'aimed', count: 3, spread: 0.08 } },
};

/** Volpe artica: segna un punto dietro il giocatore, ricompare li' e morde con tre colpi (il SALTO GELIDO). */
export const ARCTIC_FOX: MinionDefinition = {
  id: 'arctic_fox',
  name: 'Volpe artica',
  visual: 'glacier_fox',
  behavior: 'chaser',
  tier: 'base',
  maxHealth: 50,
  speed: 95,
  hitRadius: 9,
  contactDamage: 6,
  ambush: { trigger: 260, behind: 90, windup: 0.6, cooldown: 3.2, projectile: minionShot(160, 7, 4, 'glacier_fox_bite', 1.2), count: 3, spread: 0.3 },
};

/** Orso delle nevi: ruggisce due volte, due anelli sfasati da vicino (la NOVA GELIDA). */
export const SNOW_BEAR: MinionDefinition = {
  id: 'snow_bear',
  name: 'Orso delle nevi',
  visual: 'glacier_bear',
  behavior: 'chaser',
  tier: 'heavy',
  maxHealth: 200,
  speed: 55,
  hitRadius: 16,
  contactDamage: 10,
  shot: {
    projectile: minionShot(120, 7, 5, 'glacier_bear_roar', 2.2),
    interval: 3.8,
    firstDelay: 1.6,
    windup: 0.8,
    range: 240,
    pattern: { kind: 'ring', count: 14 },
    series: { count: 2, gap: 0.35, turn: Math.PI / 14 },
  },
};

/** Tana sotto la neve: il mucchio di neve respira, e ne escono ermellini (le priorita'). */
export const SNOW_DEN: MinionDefinition = {
  id: 'snow_den',
  name: 'Tana sotto la neve',
  visual: 'glacier_den',
  behavior: 'nest',
  maxHealth: 140,
  speed: 0,
  hitRadius: 15,
  contactDamage: 5,
  dormant: { wakeRadius: 260 },
  nest: { spawn: 'ermine', interval: 3.8, firstDelay: 1.2, burst: 3, maxChildren: 6 },
};

// --- Vena C: Osservatorio ---------------------------------------------------------------------------------------

/** Omuncolo di brina: si attacca e rallenta; il Custode li fa in serie (non farsi trattenere). */
export const FROST_HOMUNCULUS: MinionDefinition = {
  id: 'frost_homunculus',
  name: 'Omuncolo di brina',
  visual: 'glacier_homunculus',
  behavior: 'chaser',
  maxHealth: 12,
  speed: 110,
  hitRadius: 6,
  contactDamage: 4,
  slowOnHit: 1,
};

/** Palla di neve: rotola giu' da chi l'ha fatta (le aree). */
export const SNOWBALL: MinionDefinition = {
  id: 'snowball',
  name: 'Palla di neve',
  visual: 'glacier_snowball',
  behavior: 'chaser',
  maxHealth: 8,
  speed: 160,
  hitRadius: 6,
  contactDamage: 3,
};

/** Astrolabio vivo: due bracci che girano in versi opposti, una spirale doppia in serie (la BUFERA). */
export const LIVING_ASTROLABE: MinionDefinition = {
  id: 'living_astrolabe',
  name: 'Astrolabio vivo',
  visual: 'glacier_astrolabe',
  behavior: 'turret',
  maxHealth: 70,
  speed: 0,
  hitRadius: 12,
  contactDamage: 5,
  shot: {
    projectile: minionShot(110, 6, 4, 'glacier_star', 3.2),
    interval: 5,
    firstDelay: 1.8,
    windup: 0.8,
    pattern: { kind: 'ring', count: 2, turn: 0.4, mirror: true },
    series: { count: 16, gap: 0.1 },
  },
};

/** Lettore di stelle: legge il futuro e lo getta a terra, ondate di zone verso il giocatore (le LANCE DI GHIACCIO). */
export const STAR_READER: MinionDefinition = {
  id: 'star_reader',
  name: 'Lettore di stelle',
  visual: 'glacier_star_reader',
  behavior: 'shooter',
  maxHealth: 55,
  speed: 60,
  hitRadius: 9,
  contactDamage: 5,
  preferredDistance: 380,
  lob: { zone: minionZone(26, 1, 9, 'glacier_star_lance'), interval: 4, firstDelay: 1.8, range: 600, shape: 'cone', count: 5, scatter: 60, rows: 3 },
};

/** Pupazzo colossale: lento, getta neve; quando cade rotolano via tre palle di neve (le aree, non restare fermi). */
export const COLOSSAL_SNOWMAN: MinionDefinition = {
  id: 'colossal_snowman',
  name: 'Pupazzo colossale',
  visual: 'glacier_snowman',
  behavior: 'chaser',
  tier: 'heavy',
  maxHealth: 210,
  speed: 36,
  hitRadius: 17,
  contactDamage: 10,
  lob: { zone: minionZone(40, 1.1, 10, 'glacier_snow_lump'), interval: 3.4, firstDelay: 1.8, range: 480, shape: 'spots', count: 2, scatter: 60 },
  onDeath: { kind: 'split', into: 'snowball', count: 3 },
};

/** Alambicco gelato: distilla brina e omuncoli; rotto, lascia una pozza che rallenta (le priorita'). */
export const FROZEN_ALEMBIC: MinionDefinition = {
  id: 'frozen_alembic',
  name: 'Alambicco gelato',
  visual: 'glacier_alembic',
  behavior: 'nest',
  maxHealth: 140,
  speed: 0,
  hitRadius: 14,
  contactDamage: 5,
  nest: { spawn: 'frost_homunculus', interval: 4.2, firstDelay: 1.3, burst: 2, maxChildren: 5 },
  onDeath: { kind: 'pool', zone: minionZone(40, 0.5, 4, 'glacier_alembic_pool', { slowSeconds: 1.5 }), pulses: 3, interval: 0.8 },
};

export const DEN_MINIONS: readonly MinionDefinition[] = [ERMINE, CLIFF_LEMMING, SNOWY_OWL, ARCTIC_FOX, SNOW_BEAR, SNOW_DEN];
export const OBSERVATORY_MINIONS: readonly MinionDefinition[] = [FROST_HOMUNCULUS, SNOWBALL, LIVING_ASTROLABE, STAR_READER, COLOSSAL_SNOWMAN, FROZEN_ALEMBIC];
