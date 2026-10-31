import { EQUIPMENT_SLOTS, slotIndex, type EquipmentSlot } from '../items/equipment-slot';
import { familyById } from '../items/item-families';
import type { Item } from '../items/item';
import { RARITIES } from '../items/rarity';

/** Filtro dell'inventario: tutti gli oggetti o solo quelli di uno slot. */
export type InventoryFilter = 'all' | EquipmentSlot;

/**
 * Gli oggetti da mostrare, in ordine stabile: prima i piu' rari, poi per slot, poi per nome e infine per id.
 * Gli oggetti di una famiglia sconosciuta (dati vecchi) non si mostrano.
 */
export function visibleInventory(items: readonly Item[], filter: InventoryFilter): Item[] {
  const known = items.flatMap((item) => {
    const family = familyById(item.familyId);
    return family === undefined ? [] : [{ item, family }];
  });
  return known
    .filter(({ family }) => filter === 'all' || family.slot === filter)
    .sort(
      (a, b) =>
        RARITIES.indexOf(b.item.rarity) - RARITIES.indexOf(a.item.rarity) ||
        slotIndex(a.family.slot) - slotIndex(b.family.slot) ||
        a.family.name.localeCompare(b.family.name, 'it') ||
        a.item.uid.localeCompare(b.item.uid, 'it', { numeric: true }),
    )
    .map(({ item }) => item);
}

/** Quanti oggetti ci sono per ogni slot (per mostrare i conteggi nei filtri). */
export function countBySlot(items: readonly Item[]): Record<EquipmentSlot, number> {
  const counts = Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, 0])) as Record<EquipmentSlot, number>;
  for (const item of items) {
    const family = familyById(item.familyId);
    if (family !== undefined) counts[family.slot]++;
  }
  return counts;
}
