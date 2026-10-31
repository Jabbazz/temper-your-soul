import type { Rng } from '../../core/rng';
import type { ItemRoll } from '../items/item';
import { RARITIES, type Rarity } from '../items/rarity';
import type { LootTable } from './loot-table';

/**
 * Estrae il bottino di una vittoria. Deterministico a parita' di sequenza dell'`Rng` (nessuna altra fonte di casualita').
 * Ordine ESATTO delle estrazioni (non cambiarlo: i test e le partite riproducibili dipendono da esso):
 *   1. una per il bonus (`< bonusDropChance` = un oggetto in piu');
 *   2. poi, per ogni oggetto: il gruppo (`< exclusiveChance` = esclusivo, altrimenti generico), la famiglia (uniforme
 *      nel gruppo), la rarita' (per pesi, nell'ordine di `RARITIES`).
 * Se un gruppo e' vuoto si usa l'altro (le estrazioni restano comunque tre per oggetto). Se sono vuoti entrambi, nessun oggetto.
 */
export function rollLoot(table: LootTable, rng: Rng): ItemRoll[] {
  const count = table.guaranteedDrops + (rng.next() < table.bonusDropChance ? 1 : 0);
  const rolls: ItemRoll[] = [];
  for (let i = 0; i < count; i++) {
    const wantsExclusive = rng.next() < table.exclusiveChance;
    const pool = choosePool(table, wantsExclusive);
    const familyDraw = rng.next();
    const rarityDraw = rng.next();
    if (pool.length === 0) continue;
    const familyId = pool[Math.min(pool.length - 1, Math.floor(familyDraw * pool.length))]!;
    rolls.push({ familyId, rarity: pickRarity(table, rarityDraw) });
  }
  return rolls;
}

function choosePool(table: LootTable, wantsExclusive: boolean): readonly string[] {
  const preferred = wantsExclusive ? table.exclusiveFamilyIds : table.genericFamilyIds;
  return preferred.length > 0 ? preferred : wantsExclusive ? table.genericFamilyIds : table.exclusiveFamilyIds;
}

/** Sceglie la rarita' dal valore `draw` in [0, 1) secondo i pesi; le rarita' con peso 0 non escono mai. */
function pickRarity(table: LootTable, draw: number): Rarity {
  const total = RARITIES.reduce((sum, rarity) => sum + Math.max(0, table.rarityWeights[rarity]), 0);
  let threshold = draw * total;
  let last: Rarity = 'common';
  for (const rarity of RARITIES) {
    const weight = Math.max(0, table.rarityWeights[rarity]);
    if (weight === 0) continue;
    last = rarity;
    if (threshold < weight) return rarity;
    threshold -= weight;
  }
  return last;
}
