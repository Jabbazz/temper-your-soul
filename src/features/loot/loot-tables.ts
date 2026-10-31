import { ITEM_FAMILIES } from '../items/item-families';
import type { Rarity } from '../items/rarity';
import type { LootTable } from './loot-table';

/*
 * Le tabelle di bottino dei quattro dungeon. Valori provvisori (vedi docs/game-design.md): i dungeon piu' pericolosi
 * danno rarita' migliori. Un oggetto in piu' ogni due vittorie circa; uno su tre circa e' un'esclusiva del dungeon.
 */

/** Un oggetto sempre alla vittoria. */
const GUARANTEED_DROPS = 1;
/** Probabilita' di un secondo oggetto. */
const BONUS_DROP_CHANCE = 0.5;
/** Probabilita' che un oggetto sia un'esclusiva del dungeon. */
const EXCLUSIVE_CHANCE = 0.35;

/** Pesi di rarita' (comune, non comune, raro, epico, leggendario) per dungeon: provvisori. */
const WEIGHTS: Readonly<Record<string, readonly [number, number, number, number, number]>> = {
  crypt: [55, 28, 12, 4, 1],
  swamp: [40, 30, 18, 9, 3],
  forge: [30, 30, 22, 13, 5],
  glacier: [20, 28, 27, 17, 8],
};

function buildTable(dungeonId: string, weights: readonly [number, number, number, number, number]): LootTable {
  const [common, uncommon, rare, epic, legendary] = weights;
  const rarityWeights: Record<Rarity, number> = { common, uncommon, rare, epic, legendary };
  return {
    dungeonId,
    guaranteedDrops: GUARANTEED_DROPS,
    bonusDropChance: BONUS_DROP_CHANCE,
    rarityWeights,
    exclusiveChance: EXCLUSIVE_CHANCE,
    exclusiveFamilyIds: ITEM_FAMILIES.filter((family) => family.exclusiveTo === dungeonId).map((family) => family.id),
    genericFamilyIds: ITEM_FAMILIES.filter((family) => family.exclusiveTo === undefined).map((family) => family.id),
  };
}

export const LOOT_TABLES: Readonly<Record<string, LootTable>> = Object.fromEntries(
  Object.entries(WEIGHTS).map(([dungeonId, weights]) => [dungeonId, buildTable(dungeonId, weights)]),
);

/**
 * La tabella del dungeon. Un id senza tabella e' un errore di programmazione (un test controlla che ogni dungeon ne abbia
 * una): lancia un'eccezione invece di assegnare un bottino sbagliato in silenzio.
 */
export function lootTableFor(dungeonId: string): LootTable {
  const table = Object.hasOwn(LOOT_TABLES, dungeonId) ? LOOT_TABLES[dungeonId] : undefined;
  if (table === undefined) throw new Error(`Nessuna tabella di bottino per il dungeon '${dungeonId}'`);
  return table;
}
