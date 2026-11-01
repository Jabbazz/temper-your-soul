import type { MinionDefinition } from '../minion-definition';
import { minionShot, minionZone } from './shots';

/*
 * Ghiacciaio: il Custode e' un mago e il ghiacciaio e' la sua scuola, con allievi, cristalli e bestie del gelo. Gli
 * schemi da insegnare sono LANCE DI GHIACCIO, BUFERA, NOVA GELIDA, SALTO GELIDO, SCHEGGE e CARICA GLACIALE. Vita della
 * cripta: le stanze del ghiacciaio la scalano.
 */

/** Sentinelle di brina immobili che tirano schegge lente (evocate anche dal boss in furia). */
export const FROST_SENTINEL: MinionDefinition = {
  id: 'frost_sentinel',
  name: 'Sentinella di brina',
  visual: 'glacier_sentinel',
  behavior: 'turret',
  maxHealth: 110,
  speed: 0,
  hitRadius: 12,
  contactDamage: 8,
  shot: {
    projectile: minionShot(170, 8, 6, 'glacier_shard'),
    interval: 1.9,
    firstDelay: 1.2,
    windup: 0.45,
  },
};

/** Fiocco tagliente: cristalli che ruotano e piombano sul giocatore. */
export const RAZOR_FLAKE: MinionDefinition = {
  id: 'razor_flake',
  name: 'Fiocco tagliente',
  visual: 'glacier_flake',
  behavior: 'flyer',
  maxHealth: 12,
  speed: 170,
  hitRadius: 6,
  contactDamage: 5,
  flying: true,
  weave: 45,
};

/** Lupo delle nevi: caccia in branco, gira attorno al giocatore e si lancia da lati diversi. */
export const SNOW_WOLF: MinionDefinition = {
  id: 'snow_wolf',
  name: 'Lupo delle nevi',
  visual: 'glacier_wolf',
  behavior: 'charger',
  tier: 'swarm',
  maxHealth: 30,
  speed: 140,
  hitRadius: 9,
  contactDamage: 6,
  orbit: { radius: 150, speed: 1.4 },
  charge: { range: 230, windup: 0.45, distance: 240, speed: 480, recover: 0.5, cooldown: 2.4, damage: 8 },
};

/** Apprendista del gelo: schegge a ventaglio; se ci si avvicina si teletrasporta lontano (SALTO GELIDO e SCHEGGE). */
export const FROST_APPRENTICE: MinionDefinition = {
  id: 'frost_apprentice',
  name: 'Apprendista del gelo',
  visual: 'glacier_apprentice',
  behavior: 'shooter',
  maxHealth: 50,
  speed: 80,
  hitRadius: 9,
  contactDamage: 5,
  preferredDistance: 320,
  shot: { projectile: minionShot(150, 8, 5, 'glacier_apprentice_shard'), interval: 2.6, firstDelay: 1.5, windup: 0.5, pattern: { kind: 'aimed', count: 5, spread: 0.18 } },
  blink: { trigger: 170, range: 320, windup: 0.5, cooldown: 4 },
};

/** Spirito della bufera: gira attorno al giocatore e spara coppie di schegge in versi opposti (la BUFERA). */
export const BLIZZARD_SPIRIT: MinionDefinition = {
  id: 'blizzard_spirit',
  name: 'Spirito della bufera',
  visual: 'glacier_spirit',
  behavior: 'orbiter',
  maxHealth: 40,
  speed: 125,
  hitRadius: 9,
  contactDamage: 5,
  flying: true,
  orbit: { radius: 230, speed: 0.9 },
  shot: { projectile: minionShot(130, 7, 4, 'glacier_flurry_small', 3.5), interval: 1.5, firstDelay: 1.2, windup: 0.4, pattern: { kind: 'pair' } },
};

/** Blocco vivo: lento e coriaceo; morendo si frantuma in un anello di schegge (la NOVA GELIDA). */
export const LIVING_ICE: MinionDefinition = {
  id: 'living_ice',
  name: 'Blocco vivo',
  visual: 'glacier_ice_block',
  behavior: 'chaser',
  tier: 'heavy',
  maxHealth: 170,
  speed: 42,
  hitRadius: 15,
  contactDamage: 8,
  onDeath: { kind: 'ring', projectile: minionShot(150, 8, 5, 'glacier_shard', 2.4), count: 10 },
};

/** Cristallo eco: resta lontano e copre i vicini con uno scudo di ghiaccio. */
export const ECHO_CRYSTAL: MinionDefinition = {
  id: 'echo_crystal',
  name: 'Cristallo eco',
  visual: 'glacier_crystal',
  behavior: 'support',
  maxHealth: 70,
  speed: 50,
  hitRadius: 11,
  contactDamage: 4,
  preferredDistance: 380,
  aura: { kind: 'shield', radius: 190, amount: 30, interval: 5 },
};

/** Ariete di ghiaccio: scivola in carica e lascia zone sul percorso (la CARICA GLACIALE). */
export const ICE_RAM: MinionDefinition = {
  id: 'ice_ram',
  name: 'Ariete di ghiaccio',
  visual: 'glacier_ram',
  behavior: 'charger',
  maxHealth: 80,
  speed: 70,
  hitRadius: 13,
  contactDamage: 7,
  charge: {
    range: 380,
    windup: 0.75,
    distance: 360,
    speed: 500,
    recover: 1,
    cooldown: 3,
    damage: 11,
    trail: minionZone(28, 0.9, 8, 'glacier_ram_trail'),
    trailSpacing: 60,
  },
};

export const GLACIER_MINIONS: readonly MinionDefinition[] = [
  FROST_SENTINEL,
  RAZOR_FLAKE,
  SNOW_WOLF,
  FROST_APPRENTICE,
  BLIZZARD_SPIRIT,
  LIVING_ICE,
  ECHO_CRYSTAL,
  ICE_RAM,
];
