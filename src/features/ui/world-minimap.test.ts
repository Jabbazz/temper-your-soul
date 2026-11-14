import { describe, expect, it } from 'vitest';
import { WORLD } from '../world/world-definition';
import { WorldMap } from '../world/world-map';
import { WORLD_MAP_VIEW, worldMapPixels } from './world-map-view';
import { MINIMAP_COLORS, WORLD_MINIMAP, minimapPixels, minimapPoints } from './world-minimap';

const world = new WorldMap();
const tiles = WORLD_MINIMAP.tiles;

describe('mappa del mondo intero', () => {
  it('copre tutto il mondo, un pixel ogni qualche tile, con i colori dei terreni', () => {
    const step = WORLD_MAP_VIEW.step, { width, height, pixels } = worldMapPixels(world, step);
    expect(width).toBe(Math.ceil(world.generator.widthTiles / step));
    expect(height).toBe(Math.ceil(world.generator.heightTiles / step));
    // A metà di ogni fascia, lungo il sentiero, il colore è quello di un terreno conosciuto.
    const known = new Set(Object.values(MINIMAP_COLORS).map(color => color.join(',')));
    for (let y = 0; y < height; y += 37) for (let x = 0; x < width; x += 29) {
      const index = (y * width + x) * 4;
      expect(known.has(Array.from(pixels.slice(index, index + 3)).join(','))).toBe(true);
    }
    // In fondo, nell'Abisso, la costa è lava.
    const bottom = ((height - 20) * width + 0) * 4;
    expect(Array.from(pixels.slice(bottom, bottom + 3))).toEqual([...MINIMAP_COLORS.lava]);
  });

  it('ha i cimiteri e le statue di tutto il mondo come luoghi notevoli', () => {
    const landmarks = world.decor.landmarks();
    expect(landmarks.some(item => item.kind === 'angel_statue')).toBe(true);
    expect(landmarks.some(item => item.kind === 'knight_statue')).toBe(true);
    expect(world.decor.landmarks()).toBe(landmarks);
  });
});

describe('minimappa del mondo aperto', () => {
  it('ogni pixel ha il colore del terreno del suo tile, fuori dalla mappa è trasparente', () => {
    const left = Math.round(world.generator.widthTiles / 2) - tiles / 2, top = WORLD.spawn.row - tiles / 2;
    const pixels = minimapPixels(world, left, top, tiles);
    for (const [x, y] of [[tiles / 2, tiles / 2], [3, tiles - 3], [tiles - 5, tiles / 2 + 9]] as const) {
      const index = (y * tiles + x) * 4;
      expect(Array.from(pixels.slice(index, index + 3))).toEqual([...MINIMAP_COLORS[world.vertexTerrain(left + x, top + y)]]);
    }
    // La radura di partenza è strada; sopra la riga 0 non c'è mappa.
    expect(Array.from(pixels.slice(((tiles / 2) * tiles + tiles / 2) * 4, ((tiles / 2) * tiles + tiles / 2) * 4 + 3))).toEqual([...MINIMAP_COLORS.road]);
    expect(pixels[3]).toBe(0);
  });

  it('segna la partenza, i cimiteri e le statue che stanno nella finestra', () => {
    const start = minimapPoints(world, Math.round(world.generator.widthTiles / 2) - tiles / 2, WORLD.spawn.row - tiles / 2, tiles);
    expect(start.some((point) => point.kind === 'spawn')).toBe(true);
    // Scorrendo il mondo si trovano cimiteri nella Brughiera e statue nel Bosco Verde.
    const kinds = new Set<string>();
    for (let top = 0; top < world.generator.heightTiles && !(kinds.has('cemetery') && kinds.has('statue')); top += tiles) for (let left = 0; left < world.generator.widthTiles; left += tiles * 2) {
      for (const point of minimapPoints(world, left, top, tiles)) {
        kinds.add(point.kind);
        expect(point.tx).toBeGreaterThanOrEqual(left);
        expect(point.ty).toBeLessThan(top + tiles);
      }
    }
    expect(kinds.has('cemetery')).toBe(true);
    expect(kinds.has('statue')).toBe(true);
  });
});
