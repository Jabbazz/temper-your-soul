import { CINDER_WISP, CRYPT_MINIONS } from './catalog/crypt';
import { CANTORIA_MINIONS, CATACOMBS_MINIONS } from './catalog/crypt-veins';
import { FORGE_MINIONS, SLAG_IMP } from './catalog/forge';
import { ARMORY_MINIONS, MINE_MINIONS } from './catalog/forge-veins';
import { FROST_SENTINEL, GLACIER_MINIONS } from './catalog/glacier';
import { DEN_MINIONS, OBSERVATORY_MINIONS } from './catalog/glacier-veins';
import { SPORELING, SWAMP_MINIONS } from './catalog/swamp';
import { COLONY_MINIONS, SUNKEN_MINIONS } from './catalog/swamp-veins';
import type { BossSummons, MinionDefinition } from './minion-definition';

/*
 * I servitori dei quattro dungeon (i dati stanno in `catalog/`, uno per dungeon e uno per le sue vene B e C) e quelli
 * che i boss evocano in furia. Tutti i valori sono provvisori (proposte in docs/studio-combattimento-e-vittoria.md,
 * nello studio sulla progressione e nelle schede dello studio sulla grafica), da tarare con la prova manuale.
 */

export { CINDER_WISP } from './catalog/crypt';
export { SPORELING } from './catalog/swamp';
export { SLAG_IMP } from './catalog/forge';
export { FROST_SENTINEL } from './catalog/glacier';

/** Le tre vene di servitori di un dungeon: A (quella di sempre), B e C. */
export type VeinId = 'a' | 'b' | 'c';

/** I servitori di ogni vena, per id del dungeon. */
export const VEIN_MINIONS: Readonly<Record<string, Readonly<Record<VeinId, readonly MinionDefinition[]>>>> = {
  crypt: { a: CRYPT_MINIONS, b: CATACOMBS_MINIONS, c: CANTORIA_MINIONS },
  swamp: { a: SWAMP_MINIONS, b: SUNKEN_MINIONS, c: COLONY_MINIONS },
  forge: { a: FORGE_MINIONS, b: ARMORY_MINIONS, c: MINE_MINIONS },
  glacier: { a: GLACIER_MINIONS, b: DEN_MINIONS, c: OBSERVATORY_MINIONS },
};

/** I servitori di ogni dungeon (tutte le vene), per id del dungeon. */
export const DUNGEON_MINIONS: Readonly<Record<string, readonly MinionDefinition[]>> = Object.fromEntries(
  Object.entries(VEIN_MINIONS).map(([dungeon, veins]) => [dungeon, [...veins.a, ...veins.b, ...veins.c]]),
);

/** Tutti i servitori, per id (la rete li ritrova cosi'). */
export const MINIONS: Readonly<Record<string, MinionDefinition>> = Object.fromEntries(
  Object.values(DUNGEON_MINIONS)
    .flat()
    .map((minion) => [minion.id, minion]),
);

export const GUARDIAN_SUMMONS: BossSummons = { minion: CINDER_WISP, onRage: 3, everyAttacks: 4, wave: 2, maxAlive: 4, ringRadius: 70 };
export const SPORE_MOTHER_SUMMONS: BossSummons = { minion: SPORELING, onRage: 4, everyAttacks: 4, wave: 2, maxAlive: 6, ringRadius: 80 };
export const FORGE_COLOSSUS_SUMMONS: BossSummons = { minion: SLAG_IMP, onRage: 3, everyAttacks: 4, wave: 2, maxAlive: 4, ringRadius: 90 };
export const FROST_WARDEN_SUMMONS: BossSummons = { minion: FROST_SENTINEL, onRage: 2, everyAttacks: 5, wave: 1, maxAlive: 3, ringRadius: 160 };
