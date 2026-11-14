import { describe, expect, it } from 'vitest';
import { readPng, type DecodedPng } from '../../testing-png';

/** Il minimo di `node:fs` che serve ai test (il progetto non include i tipi di Node). */
interface FileSystem { existsSync(path: URL): boolean; readFileSync(path: URL): Uint8Array }
const NODE_FS = 'node:fs';
const fileSystem = async (): Promise<FileSystem> => (await import(/* @vite-ignore */ NODE_FS)) as FileSystem;

const STYLES = ['./forged-hud.css', './forged-buttons.css', './forged-menu.css', './forged-panels.css', './forged-inventory.css'];
const UI = new URL('../../assets/art/ui/', import.meta.url);

/** Margini del canale (sinistra, alto, destra, basso) usati da forged-hud.css e forged-menu.css. */
const BARS = { vita: [8, 9, 8, 9], mana: [10, 9, 10, 10], esp: [4, 4, 5, 4] } as const;

const alphaAt = (png: DecodedPng, x: number, y: number): number => png.pixels[(y * png.width + x) * 4 + 3]!;
const sameAt = (a: DecodedPng, b: DecodedPng, x: number, y: number): boolean => {
  const i = (y * a.width + x) * 4;
  return [0, 1, 2, 3].every((k) => a.pixels[i + k] === b.pixels[i + k]);
};

describe('interfaccia in ferro, lava e rubini', () => {
  it('ogni immagine citata dai fogli di stile esiste', async () => {
    const fs = await fileSystem();
    for (const style of STYLES) {
      const css = new TextDecoder().decode(fs.readFileSync(new URL(style, import.meta.url)));
      const urls = [...css.matchAll(/url\('([^']+)'\)/g)].map((match) => match[1]!);
      expect(urls.length, style).toBeGreaterThan(0);
      for (const url of urls) expect(fs.existsSync(new URL(url, new URL(style, import.meta.url))), `${style}: ${url}`).toBe(true);
    }
  });

  it('barra vuota e piena hanno la stessa misura e coincidono fuori dal canale: il taglio non lascia scalini', async () => {
    for (const [name, [left, top, right, bottom]] of Object.entries(BARS)) {
      const empty = await readPng(new URL(`barra-${name}-vuota.png`, UI)), full = await readPng(new URL(`barra-${name}-piena.png`, UI));
      expect([full.width, full.height], name).toEqual([empty.width, empty.height]);
      let changedInside = 0;
      for (let y = 0; y < empty.height; y++) for (let x = 0; x < empty.width; x++) {
        const inside = x >= left && x < empty.width - right && y >= top && y < empty.height - bottom;
        if (!inside) expect(sameAt(empty, full, x, y), `${name} ${x},${y}`).toBe(true);
        else if (!sameAt(empty, full, x, y)) changedInside++;
      }
      // Il liquido riempie quasi tutto il canale.
      expect(changedInside, name).toBeGreaterThan((empty.width - left - right) * (empty.height - top - bottom) * 0.8);
    }
  });

  it('i tre stati del pulsante hanno la stessa misura e le estremità piene (9-slice a 20 px)', async () => {
    const states = await Promise.all(['pulsante', 'pulsante-sopra', 'pulsante-premuto'].map((name) => readPng(new URL(`${name}.png`, UI))));
    for (const state of states) {
      expect([state.width, state.height]).toEqual([192, 44]);
      expect(alphaAt(state, 20, 22)).toBe(255);
      expect(alphaAt(state, state.width - 21, 22)).toBe(255);
    }
  });

  it('l\'incavo del ritratto è vuoto dentro (lo sprite si vede) e pieno sull\'anello', async () => {
    const frame = await readPng(new URL('cornice-ritratto.png', UI));
    expect([frame.width, frame.height]).toEqual([121, 127]);
    // Finestra rotonda di 92×94 a 14,16 (forged-menu.css): il centro è trasparente, l'anello no.
    expect(alphaAt(frame, 14 + 46, 16 + 47)).toBe(0);
    expect(alphaAt(frame, 4, 63)).toBe(255);
  });
});
