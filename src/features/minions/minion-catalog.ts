import { CINDER_WISP, CRYPT_MINIONS } from './catalog/crypt';
import { FORGE_MINIONS, SLAG_IMP } from './catalog/forge';
import { FROST_SENTINEL, GLACIER_MINIONS } from './catalog/glacier';
import { SPORELING, SWAMP_MINIONS } from './catalog/swamp';
import type { BossSummons, MinionDefinition } from './minion-definition';

/*
 * I servitori dei quattro dungeon (i dati stanno in `catalog/`, uno per dungeon) e quelli che i boss evocano in furia.
 * Tutti i valori sono provvisori (proposte in docs/studio-combattimento-e-vittoria.md e nello studio sulla
 * progressione), da tarare con la prova manuale.
 */

export { CINDER_WISP } from './catalog/crypt';
export { SPORELING } from './catalog/swamp';
export { SLAG_IMP } from './catalog/forge';
export { FROST_SENTINEL } from './catalog/glacier';

/** I servitori di ogni dungeon, per id del dungeon. */
export const DUNGEON_MINIONS: Readonly<Record<string, readonly MinionDefinition[]>> = {
  crypt: CRYPT_MINIONS,
  swamp: SWAMP_MINIONS,
  forge: FORGE_MINIONS,
  glacier: GLACIER_MINIONS,
};

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
