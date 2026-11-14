import { describe, expect, it } from 'vitest';
import { WORLD_OUTLINE_RGB, lowerMask, outlineSheet, outlinedSet, withoutGround, type RgbaImage } from './world-sheet-layers';

/** Un foglio di due tile 4×4: a sinistra il suolo pieno (A), a destra metà suolo e metà terreno superiore (B). */
const A = [40, 120, 60, 255], B = [150, 150, 160, 255];
function sheet(): RgbaImage {
  const data = new Uint8ClampedArray(8 * 4 * 4);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) data.set(x >= 6 ? B : A, (y * 8 + x) * 4);
  return { width: 8, height: 4, data };
}
const SET = {
  lower: 'grass', upper: 'wall', size: 4,
  tiles: [
    { x: 0, y: 0, pattern: [255, 255, 255, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 255, 255, 255] },
    { x: 4, y: 0, pattern: [255, 255, 255, 255, 255, 0, 1, 255, 255, 0, 1, 255, 255, 255, 255, 255] },
  ],
};
const pixel = (image: RgbaImage, x: number, y: number): number[] => Array.from(image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4));

describe('grafica del mondo: livelli dei fogli di raccordo', () => {
  it('il suolo è ciò che coincide con il tile pieno inferiore', () => {
    const mask = lowerMask(sheet(), SET);
    expect([0, 1, 2, 3].map(x => mask[8 + x])).toEqual([1, 1, 1, 1]);
    expect([4, 5, 6, 7].map(x => mask[8 + x])).toEqual([1, 1, 0, 0]);
  });

  it('il contorno scuro segue il bordo del terreno superiore, dal suo lato', () => {
    const image = sheet(), mask = lowerMask(image, SET), outlined = outlineSheet(image, SET, mask);
    for (let y = 0; y < 4; y++) {
      expect(pixel(outlined, 6, y)).toEqual([...WORLD_OUTLINE_RGB, 255]);
      expect(pixel(outlined, 7, y)).toEqual(B);
      expect(pixel(outlined, 5, y)).toEqual(A);
    }
    // Il foglio di partenza non cambia.
    expect(pixel(image, 6, 0)).toEqual(B);
  });

  it('la parete senza suolo resta solo dove non c\'è suolo', () => {
    const image = sheet(), wall = withoutGround(image, lowerMask(image, SET));
    expect(pixel(wall, 5, 2)[3]).toBe(0);
    expect(pixel(wall, 6, 2)).toEqual(B);
  });

  it('hanno il contorno le rive e le mura, non strade e prati', () => {
    expect(outlinedSet({ lower: 'water', upper: 'grass' })).toBe(true);
    expect(outlinedSet({ lower: 'moor', upper: 'wall' })).toBe(true);
    expect(outlinedSet({ lower: 'road', upper: 'grass' })).toBe(false);
    expect(outlinedSet({ lower: 'grass', upper: 'moor' })).toBe(false);
  });
});
