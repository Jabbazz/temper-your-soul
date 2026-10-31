import { describe, expect, it } from 'vitest';
import { ITEM_FAMILIES } from '../items/item-families';
import { BACKPACK_SPRITE, ITEM_SPRITES } from './item-sprites';

describe('sprite degli oggetti', () => {
  it('ogni famiglia equipaggiabile e ogni drop ha un disegno distinto', () => {
    expect(Object.keys(ITEM_SPRITES).sort()).toEqual(ITEM_FAMILIES.map((family) => family.id).sort());
    const drawings = ITEM_FAMILIES.map((family) => JSON.stringify(ITEM_SPRITES[family.id].pixels));
    expect(new Set(drawings).size).toBe(ITEM_FAMILIES.length);
  });
  it('zaino e oggetti hanno matrici 16×16 valide e tavolozze complete', () => {
    for (const sprite of [BACKPACK_SPRITE, ...Object.values(ITEM_SPRITES)]) {
      expect(sprite.pixels).toHaveLength(16);
      for (const row of sprite.pixels) {
        expect(row).toHaveLength(16);
        for (const pixel of row) {
          if (pixel !== '.') expect(sprite.palette[pixel]).toMatch(/^#[0-9a-f]{6}$/i);
        }
      }
    }
  });
});
