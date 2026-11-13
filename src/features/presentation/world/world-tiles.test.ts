import { describe, expect, it } from 'vitest';
import { WORLD, type WorldTerrain } from '../../world/world-definition';
import { WorldMap } from '../../world/world-map';
import { WORLD_OBSTACLE_KINDS } from '../../world/world-obstacles';
import { WORLD_OBJECT_ART, WORLD_TILESET_ART } from './world-art-data';
import { pickWorldTile, tilesetsWith } from './world-tiles';

const world = new WorldMap();
const pickAt = (tx: number, ty: number) => pickWorldTile((dx, dy) => world.vertexTerrain(tx + dx, ty + dy));
/** Gli angoli (NO, NE, SO, SE) del tile scelto, come stati dello schema: 0 inferiore, 1 superiore, 2 facciata. */
const cornersOf = (pick: { set: number; x: number; y: number }): number[] => {
  const tile = WORLD_TILESET_ART[pick.set]!.tiles.find(candidate => candidate.x === pick.x && candidate.y === pick.y)!;
  return [5, 6, 9, 10].map(i => tile.pattern[i]!);
};
const uniform = (terrain: WorldTerrain) => pickWorldTile(() => terrain);

describe('grafica del mondo: scelta dei tile', () => {
  it('ogni tileset ha tutti i tile e ogni ostacolo ha il suo disegno', () => {
    for (const set of WORLD_TILESET_ART) expect(set.tiles.length, `${set.lower}-${set.upper}`).toBe(set.upper === 'wall' ? 25 : 16);
    for (const kind of Object.values(WORLD_OBSTACLE_KINDS)) expect(WORLD_OBJECT_ART[kind.visual], kind.visual).toBeDefined();
    expect(tilesetsWith('moor').length).toBe(4);
  });

  it('un terreno uniforme prende il tile pieno di un tileset che lo contiene', () => {
    for (const terrain of ['grass', 'moor', 'road', 'water'] as const) {
      const pick = uniform(terrain), art = WORLD_TILESET_ART[pick.set]!;
      expect([art.lower, art.upper]).toContain(terrain);
      expect(new Set(cornersOf(pick))).toEqual(new Set([art.upper === terrain ? 1 : 0]));
      expect(pick.exact).toBe(true);
    }
  });

  it('un bordo tra due terreni prende il tile con gli angoli giusti', () => {
    // Strada a ovest, erba a est.
    const pick = pickWorldTile(dx => (dx <= 0 ? 'road' : 'grass')), art = WORLD_TILESET_ART[pick.set]!;
    expect([art.lower, art.upper]).toEqual(['road', 'grass']);
    expect(cornersOf(pick)).toEqual([0, 1, 0, 1]);
  });

  it('un tratto di mura orizzontale mostra sommità e facciata', () => {
    // Mura sulle righe 0 e 1 (sommità e facciata), erba sopra e sotto.
    const at = (_dx: number, dy: number): WorldTerrain => (dy === 0 || dy === 1 ? 'wall' : 'grass');
    const top = pickWorldTile(at), face = pickWorldTile((dx, dy) => at(dx, dy + 1));
    expect(WORLD_TILESET_ART[top.set]!.upper).toBe('wall');
    expect(cornersOf(top)).toEqual([1, 1, 2, 2]);
    expect(cornersOf(face)).toEqual([2, 2, 0, 0]);
    expect(top.exact && face.exact).toBe(true);
  });

  it('tutti i tile del mondo generato trovano il loro disegno', () => {
    let inexact = 0, walls = 0;
    for (let ty = 0; ty < world.generator.heightTiles; ty += 1) for (let tx = (ty * 7) % 3; tx < world.generator.widthTiles; tx += 3) {
      const pick = pickAt(tx, ty);
      if (WORLD_TILESET_ART[pick.set]!.upper === 'wall') walls++;
      if (pick.exact) continue;
      // Gli unici ripieghi ammessi: tre terreni sul confine tra le fasce.
      expect(Math.abs(ty - 256), `tile ${tx},${ty}`).toBeLessThanOrEqual(WORLD.borderWobble + 1);
      inexact++;
    }
    expect(walls).toBeGreaterThan(1000);
    expect(inexact).toBeLessThan(40);
  });

});
