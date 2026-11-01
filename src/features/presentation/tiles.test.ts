import { afterEach, describe, expect, it, vi } from 'vitest';
import { Camera } from '../../core/camera';
import { Vec2 } from '../../core/vec2';
import type { ArenaThemeId } from '../arena/arena';
import { ART_CREDITS } from './art-credits';
import { ARENA_THEMES } from './themes';
import { TILE_ATLASES, type TileMaterial } from './themes/tile-atlas';
import { pickVariant, TILE_CREDITS, TILE_SIZE, tileColors, tileVariants } from './themes/tiles';
import { drawSolidBlock } from './themes/wall';

/** Il minimo di `node:fs` che serve ai test (il progetto non include i tipi di Node e non li aggiunge per questo). */
interface FileSystem {
  existsSync(path: URL): boolean;
  readFileSync(path: URL): Uint8Array;
}

const NODE_FS = 'node:fs';

async function fileSystem(): Promise<FileSystem> {
  return (await import(/* @vite-ignore */ NODE_FS)) as FileSystem;
}

/** Larghezza e altezza di un PNG, lette dall'intestazione (blocco IHDR, byte 16–23). */
function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const word = (at: number) => ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0;
  expect([...bytes.slice(1, 4)].map((code) => String.fromCharCode(code)).join('')).toBe('PNG');
  return { width: word(16), height: word(20) };
}

const THEMES = Object.keys(TILE_ATLASES) as ArenaThemeId[];
/** I materiali su cui passano i colpi: pavimento, pozzi e ponti. */
const GROUND: readonly TileMaterial[] = ['floor', 'floorWorn', 'floorDark', 'chasm', 'bridgeEW', 'bridgeNS'];

afterEach(() => vi.unstubAllGlobals());

describe('tile dei dungeon (fase 6)', () => {
  it('i fogli esistono, sono leggeri e misurano quanto dice la geometria', async () => {
    const fs = await fileSystem();
    let total = 0;
    for (const theme of THEMES) {
      const atlas = TILE_ATLASES[theme];
      const url = new URL(atlas.url);
      expect(url.protocol, theme).toBe('file:');
      expect(fs.existsSync(url), theme).toBe(true);
      const bytes = fs.readFileSync(url);
      total += bytes.length;
      expect(pngSize(bytes), theme).toEqual({ width: atlas.width, height: atlas.height });
    }
    expect(total).toBeLessThan(40 * 1024);
  });

  it('ogni tile sta dentro il suo foglio e nessuno si sovrappone a un altro', () => {
    for (const theme of THEMES) {
      const atlas = TILE_ATLASES[theme];
      const rects = Object.values(atlas.tiles).flat();
      for (const r of rects) {
        expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= atlas.width && r.y + r.h <= atlas.height, `${theme} ${JSON.stringify(r)}`).toBe(true);
      }
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i]!;
          const b = rects[j]!;
          const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          expect(overlap, `${theme}: ${JSON.stringify(a)} e ${JSON.stringify(b)}`).toBe(false);
        }
      }
    }
  });

  it('ogni tema ha pozzo (3 x 3), ponti nei due versi, un riparo e la cima dei massicci; i tile di terra sono da 16 pixel', () => {
    for (const theme of THEMES) {
      expect(tileVariants(theme, 'chasm').length, theme).toBe(9);
      expect(tileVariants(theme, 'bridgeEW').length, theme).toBeGreaterThan(0);
      expect(tileVariants(theme, 'bridgeNS').length, theme).toBeGreaterThan(0);
      expect(tileVariants(theme, 'cover').length, theme).toBeGreaterThan(0);
      expect(tileVariants(theme, 'cap').length, theme).toBeGreaterThan(0);
      for (const material of [...GROUND, 'cap', 'wall'] as const) {
        for (const tile of tileVariants(theme, material)) expect([tile.w, tile.h], `${theme} ${material}`).toEqual([16, 16]);
      }
    }
    expect(TILE_SIZE).toBe(32);
  });

  it('i colori dei tile su cui passano i colpi sono fra i colori a terra del tema (controllati contro i colpi nemici)', () => {
    for (const theme of THEMES) {
      const ground = new Set(ARENA_THEMES[theme].groundColors);
      for (const material of GROUND) {
        for (const color of tileColors(theme, material)) expect(ground.has(color), `${theme} ${material} ${color}`).toBe(true);
      }
    }
  });

  it('le lastre lisce escono piu\' spesso, ma ogni variante esce', () => {
    const variants = ['liscia', 'liscia 2', 'crepa', 'crepa 2', 'macchia'];
    const counts = new Map<string, number>();
    for (let i = 0; i < 1000; i++) {
      const picked = pickVariant(variants, i / 1000)!;
      counts.set(picked, (counts.get(picked) ?? 0) + 1);
    }
    expect((counts.get('liscia') ?? 0) + (counts.get('liscia 2') ?? 0)).toBeGreaterThan(780);
    for (const variant of variants) expect(counts.get(variant) ?? 0, variant).toBeGreaterThan(0);
    expect(pickVariant([], 0.5)).toBeUndefined();
    expect(pickVariant(['sola'], 0.99)).toBe('sola');
  });

  it('ogni tema ha i crediti dei suoi tile, tutti registrati', () => {
    for (const theme of THEMES) {
      expect(TILE_CREDITS[theme].length, theme).toBeGreaterThan(0);
      for (const credit of TILE_CREDITS[theme]) expect(ART_CREDITS[credit], `${theme}: ${credit}`).toBeDefined();
    }
  });

  it('con il foglio caricato la cima di un massiccio si lastrica con i tile del tema, allineati al mondo', () => {
    class LoadedImage {
      complete = true;
      naturalWidth = 256;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
    }
    vi.stubGlobal('Image', LoadedImage);
    const drawn: { sx: number; sy: number; dx: number; dy: number; dw: number }[] = [];
    const ctx = new Proxy({} as Record<string | symbol, unknown>, {
      get(target, key) {
        if (key === 'drawImage') return (_image: unknown, sx: number, sy: number, _sw: number, _sh: number, dx: number, dy: number, dw: number) => drawn.push({ sx, sy, dx, dy, dw });
        if (key in target) return target[key];
        return () => undefined;
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    const camera = new Camera();
    camera.setViewSize(800, 600);
    camera.position = new Vec2(0, 0);
    const solid = { x: 64, y: 96, width: 128, height: 96 };
    drawSolidBlock(ctx, solid, camera, ARENA_THEMES.crypt.block);
    const caps = tileVariants('crypt', 'cap');
    const capTiles = drawn.filter((call) => caps.some((tile) => tile.x === call.sx && tile.y === call.sy));
    expect(capTiles.length).toBeGreaterThan(0);
    for (const call of capTiles) {
      expect(call.dx % TILE_SIZE).toBe(0);
      expect(call.dy % TILE_SIZE).toBe(0);
      expect(call.dw).toBe(TILE_SIZE);
    }
    // La faccia in basso usa i mattoni del muro della cripta.
    const walls = tileVariants('crypt', 'wall');
    expect(drawn.some((call) => walls.some((tile) => tile.x === call.sx && tile.y === call.sy))).toBe(true);
  });
});
