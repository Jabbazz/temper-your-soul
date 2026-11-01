import { BELFRY_BAT, BONE_RELIQUARY, CENSER_ACOLYTE, CINDER_WISP, GARGOYLE, OSSUARY_SKELETON, VESPER_BELL, WAX_CANDLE } from '../minions/catalog/crypt';
import { ANVIL_GOLEM, CRUCIBLE, FORGE_DEVIL, FORGE_SPARK, LIVING_BELLOWS, MOLTEN_SLAG, SLAG_IMP, SLAG_PEBBLE } from '../minions/catalog/forge';
import { BLIZZARD_SPIRIT, ECHO_CRYSTAL, FROST_APPRENTICE, FROST_SENTINEL, ICE_RAM, LIVING_ICE, RAZOR_FLAKE, SNOW_WOLF } from '../minions/catalog/glacier';
import { BOG_GNAT, BOG_TOAD, FAIRY_RING, MOSS_SNAIL, PUFFBALL, ROOT_WORM, SPITTING_FLOWER, SPORELING } from '../minions/catalog/swamp';
import type { MinionDefinition } from '../minions/minion-definition';

/**
 * Ruolo di un servitore per il regista:
 * - `swarm`: la folla che cade in uno o due colpi;
 * - `threat`: la minaccia annunciata (tiratori, caricatori, torrette, saltatori);
 * - `heavy`: pesanti, uno per ondata al massimo;
 * - `nest` / `support`: priorita' da abbattere, uno per ondata al massimo.
 */
export type BestiaryRole = 'swarm' | 'threat' | 'heavy' | 'nest' | 'support';

/** Un servitore che il regista puo' comprare: vita nella cripta (le stanze la scalano), costo e prima tappa utile. */
export interface BestiaryEntry {
  readonly minion: MinionDefinition;
  readonly role: BestiaryRole;
  readonly health: number;
  readonly cost: number;
  /** Prima tappa (da 0) in cui puo' comparire. */
  readonly firstStage?: number;
}

const entry = (minion: MinionDefinition, role: BestiaryRole, health: number, cost: number, firstStage = 0): BestiaryEntry => ({
  minion,
  role,
  health,
  cost,
  ...(firstStage > 0 ? { firstStage } : {}),
});

/** I servitori delle stanze per dungeon. Valori provvisori: la vita e' quella della cripta, il costo e' in punti. */
export const ROOM_BESTIARY: Readonly<Record<string, readonly BestiaryEntry[]>> = {
  crypt: [
    entry(WAX_CANDLE, 'swarm', 22, 1),
    entry(BELFRY_BAT, 'swarm', 14, 1),
    entry(OSSUARY_SKELETON, 'swarm', 22, 1),
    entry(CINDER_WISP, 'swarm', 40, 2),
    entry(CENSER_ACOLYTE, 'threat', 45, 3),
    entry(GARGOYLE, 'threat', 70, 3, 1),
    entry(VESPER_BELL, 'heavy', 150, 6, 2),
    entry(BONE_RELIQUARY, 'nest', 160, 8, 2),
  ],
  swamp: [
    entry(SPORELING, 'swarm', 20, 1),
    entry(BOG_GNAT, 'swarm', 10, 1),
    entry(PUFFBALL, 'swarm', 30, 2),
    entry(BOG_TOAD, 'threat', 60, 3),
    entry(SPITTING_FLOWER, 'threat', 55, 3),
    entry(ROOT_WORM, 'threat', 70, 3, 1),
    entry(MOSS_SNAIL, 'heavy', 160, 6, 1),
    entry(FAIRY_RING, 'nest', 150, 8, 2),
  ],
  forge: [
    entry(SLAG_PEBBLE, 'swarm', 22, 1),
    entry(FORGE_SPARK, 'swarm', 10, 1),
    entry(SLAG_IMP, 'swarm', 35, 2),
    entry(LIVING_BELLOWS, 'threat', 80, 3),
    entry(FORGE_DEVIL, 'threat', 45, 3),
    entry(MOLTEN_SLAG, 'threat', 60, 3, 1),
    entry(ANVIL_GOLEM, 'heavy', 190, 6, 1),
    entry(CRUCIBLE, 'heavy', 170, 6, 2),
  ],
  glacier: [
    entry(RAZOR_FLAKE, 'swarm', 12, 1),
    entry(SNOW_WOLF, 'swarm', 30, 2),
    entry(FROST_SENTINEL, 'threat', 60, 3),
    entry(FROST_APPRENTICE, 'threat', 50, 3),
    entry(BLIZZARD_SPIRIT, 'threat', 40, 3),
    entry(ICE_RAM, 'threat', 80, 3, 1),
    entry(LIVING_ICE, 'heavy', 170, 6, 1),
    entry(ECHO_CRYSTAL, 'support', 70, 8, 2),
  ],
};

/** La voce di un servitore nel bestiario delle stanze del dungeon, se c'e'. */
export function bestiaryEntry(dungeonId: string, minionId: string): BestiaryEntry | undefined {
  return ROOM_BESTIARY[dungeonId]?.find((item) => item.minion.id === minionId);
}
