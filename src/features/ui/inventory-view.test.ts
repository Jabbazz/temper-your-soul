import { describe, expect, it } from 'vitest';
import type { Item } from '../items/item';
import { countBySlot, visibleInventory } from './inventory-view';

const item = (uid: string, familyId: string, rarity: Item['rarity']): Item => ({ uid, familyId, rarity });

describe('vista dell\'inventario', () => {
  const items = [
    item('i1', 'arcane_staff', 'common'),
    item('i2', 'hunter_bow', 'epic'),
    item('i3', 'frost_grimoire', 'rare'),
    item('i10', 'hunter_bow', 'common'),
    item('i4', 'astral_boots', 'epic'),
    item('i5', 'famiglia_che_non_esiste', 'legendary'),
  ];

  it("ordina dal più raro, poi per slot e per nome (a pari nome, per id numerico); scarta le famiglie sconosciute", () => {
    expect(visibleInventory(items, 'all').map((entry) => entry.uid)).toEqual(['i2', 'i4', 'i3', 'i10', 'i1']);
  });

  it('il filtro per slot mostra solo quello slot', () => {
    expect(visibleInventory(items, 'primary_hand').map((entry) => entry.uid)).toEqual(['i2', 'i10', 'i1']);
    expect(visibleInventory(items, 'armor')).toEqual([]);
  });

  it('non modifica l\'elenco ricevuto', () => {
    const copy = [...items];
    visibleInventory(items, 'all');
    expect(items).toEqual(copy);
  });

  it('conta gli oggetti per slot ignorando le famiglie sconosciute', () => {
    expect(countBySlot(items)).toEqual({ primary_hand: 3, secondary_hand: 1, armor: 0, boots: 1 });
  });
});
