/*
 * Livelli ricavati dai fogli di raccordo del mondo, una volta sola al caricamento. Nei fogli PixelLab il suolo
 * inferiore di ogni tile è copiato pixel per pixel dal suo tile pieno: un pixel uguale a quello del tile pieno nello
 * stesso punto è suolo, gli altri sono il terreno superiore, la riva o la parete. Da qui:
 * - il contorno scuro sul bordo del terreno superiore (rive dell'acqua, sagoma delle mura), come nella pixel art con
 *   i bordi marcati;
 * - la sola parete delle mura, senza il suolo attorno, da disegnare davanti a chi le passa dietro.
 * Solo aspetto: le regole e le collisioni non leggono questi pixel.
 */

/** Un'immagine RGBA a 8 bit, riga per riga. */
export interface RgbaImage { readonly width: number; readonly height: number; readonly data: Uint8ClampedArray }

/** Il ritaglio di un tile nel foglio e i suoi quattro angoli (schema 4×4, posizioni 5, 6, 9, 10). */
interface SheetTile { readonly x: number; readonly y: number; readonly pattern: readonly number[] }
interface SheetSet { readonly lower: string; readonly upper: string; readonly size: number; readonly tiles: readonly SheetTile[] }

/** Colore del contorno, quasi nero. */
export const WORLD_OUTLINE_RGB: readonly [number, number, number] = [22, 17, 26];

/** I raccordi con il contorno: le rive dell'acqua e della lava e le mura. Strade e confini fra suoli restano morbidi. */
export const outlinedSet = (set: { readonly lower: string; readonly upper: string }): boolean => set.lower === 'water' || set.lower === 'lava' || set.upper === 'wall';

const CORNERS = [5, 6, 9, 10] as const;

/** Per ogni pixel del foglio: 1 se è suolo inferiore (uguale al tile pieno inferiore), 0 se no o fuori dai tile. */
export function lowerMask(image: RgbaImage, set: SheetSet): Uint8Array {
  const mask = new Uint8Array(image.width * image.height), size = set.size;
  const full = set.tiles.find(tile => CORNERS.every(i => tile.pattern[i] === 0));
  if (full === undefined) return mask;
  const data = image.data, at = (x: number, y: number): number => (y * image.width + x) * 4;
  for (const tile of set.tiles) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const p = at(tile.x + x, tile.y + y), q = at(full.x + x, full.y + y);
    if (data[p] === data[q] && data[p + 1] === data[q + 1] && data[p + 2] === data[q + 2] && data[p + 3] === data[q + 3]) mask[p / 4] = 1;
  }
  return mask;
}

/**
 * Il foglio con il contorno: ogni pixel non di suolo che tocca (sui quattro lati, dentro lo stesso tile) un pixel di
 * suolo prende il colore del contorno. Il bordo cade sempre dentro i tile, perché nei raccordi a vertici il confine
 * fra i terreni passa a metà tile.
 */
export function outlineSheet(image: RgbaImage, set: SheetSet, mask: Uint8Array): RgbaImage {
  const data = new Uint8ClampedArray(image.data), size = set.size, width = image.width;
  for (const tile of set.tiles) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const index = (tile.y + y) * width + tile.x + x;
    if (mask[index] === 1) continue;
    const ground = (x > 0 && mask[index - 1] === 1) || (x < size - 1 && mask[index + 1] === 1)
      || (y > 0 && mask[index - width] === 1) || (y < size - 1 && mask[index + width] === 1);
    if (!ground) continue;
    data[index * 4] = WORLD_OUTLINE_RGB[0]; data[index * 4 + 1] = WORLD_OUTLINE_RGB[1]; data[index * 4 + 2] = WORLD_OUTLINE_RGB[2]; data[index * 4 + 3] = 255;
  }
  return { width, height: image.height, data };
}

/** Lo stesso foglio senza il suolo: resta solo ciò che sta sopra (la parete delle mura). */
export function withoutGround(image: RgbaImage, mask: Uint8Array): RgbaImage {
  const data = new Uint8ClampedArray(image.data);
  for (let i = 0; i < mask.length; i++) if (mask[i] === 1) data[i * 4 + 3] = 0;
  return { width: image.width, height: image.height, data };
}
