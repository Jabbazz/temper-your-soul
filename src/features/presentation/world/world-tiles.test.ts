import { describe, expect, it } from 'vitest';
import { TERRAIN_PAIRS, WORLD, type WorldTerrain } from '../../world/world-definition';
import { WorldMap } from '../../world/world-map';
import { WORLD_OBSTACLE_KINDS } from '../../world/world-obstacles';
import { WORLD_OBJECT_ART, WORLD_TILESET_ART } from './world-art-data';
import { WORLD_GROUND_VARIANTS, pickGroundVariant, pickWorldTile, tilesetsWith, variantAt, wallTileDepth } from './world-tiles';

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
    // Brughiera: strada, acqua, mura, i confini con il Bosco Verde e con la Palude Marcia, e la sua variante.
    expect(tilesetsWith('moor').length).toBe(6);
    for (const [a, b] of TERRAIN_PAIRS) expect(WORLD_TILESET_ART.some(set => (set.lower === a && set.upper === b) || (set.lower === b && set.upper === a)), `${a}-${b}`).toBe(true);
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

  it('la parete delle mura copre chi si ferma dietro e non chi sta davanti', () => {
    // Tratto orizzontale: sommità sulla riga 0, facciata sulla riga 1, erba sopra e sotto.
    const at = (_vx: number, vy: number): WorldTerrain => (vy === 0 || vy === 1 ? 'wall' : 'grass');
    const { tile, walls } = WORLD, body = 10;
    const depths = [-1, 0, 1].map(ty => wallTileDepth(at, 4, ty, tile, walls)!);
    expect(wallTileDepth(at, 4, -3, tile, walls)).toBeNull();
    // Le stesse misure dell'appoggio delle collisioni (vedi WorldMap): bordo nord e base della facciata.
    const footTop = -tile / 2 + walls.rise, footBottom = tile + tile / 2 + walls.drop;
    for (const depth of depths) {
      expect(depth).toBeGreaterThan(footTop - body);
      expect(depth).toBeLessThanOrEqual(footBottom + body);
    }
    // Un tratto verticale: le righe più in basso stanno davanti a chi ha i piedi più su.
    const column = (vx: number, vy: number): WorldTerrain => (vx === 0 && vy >= 0 && vy <= 6 ? 'wall' : 'grass');
    const rows = [0, 1, 2, 3, 4].map(ty => wallTileDepth(column, 0, ty, tile, walls)!);
    for (let i = 1; i < rows.length; i++) expect(rows[i]!).toBeGreaterThanOrEqual(rows[i - 1]!);
    expect(rows[rows.length - 1]).toBeLessThanOrEqual(6 * tile + tile / 2 + walls.drop);
  });

  it('ogni suolo ha la sua variante a macchie, lontana da strade, acqua e mura', () => {
    for (const biome of WORLD.biomes) {
      expect(WORLD_GROUND_VARIANTS.kinds[biome.ground], biome.id).toBeDefined();
      // Il tile con la variante su un solo angolo esiste e ha quell'angolo superiore.
      const pick = pickGroundVariant(biome.ground, [false, false, false, true])!;
      expect(pick, biome.id).not.toBeNull();
      const art = WORLD_TILESET_ART[pick.set]!;
      expect([art.lower, art.upper]).toEqual([biome.ground, WORLD_GROUND_VARIANTS.kinds[biome.ground]]);
      expect(cornersOf(pick)).toEqual([0, 0, 0, 1]);
      expect(pickGroundVariant(biome.ground, [false, false, false, false])).toBeNull();
    }
    // Nel Bosco Verde una parte del suolo, non tutto né niente, porta la variante; mai accanto a un terreno diverso.
    const at = (vx: number, vy: number) => world.vertexTerrain(vx, vy);
    let variant = 0, ground = 0;
    for (let vy = 40; vy < 230; vy += 3) for (let vx = 40; vx < 980; vx += 3) {
      if (at(vx, vy) !== 'grass') continue;
      ground++;
      if (!variantAt(at, vx, vy, WORLD.seed)) continue;
      variant++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) expect(at(vx + dx, vy + dy)).toBe('grass');
    }
    expect(variant / ground).toBeGreaterThan(0.05);
    expect(variant / ground).toBeLessThan(0.45);
  });

  it('tutti i tile del mondo generato trovano il loro disegno', () => {
    let inexact = 0, walls = 0;
    for (let ty = 0; ty < world.generator.heightTiles; ty += 1) for (let tx = (ty * 7) % 3; tx < world.generator.widthTiles; tx += 3) {
      const pick = pickAt(tx, ty);
      if (WORLD_TILESET_ART[pick.set]!.upper === 'wall') walls++;
      if (pick.exact) continue;
      // Gli unici ripieghi ammessi: tre terreni sul confine tra le fasce.
      const border = Math.round(ty / 256) * 256;
      expect(border > 0 && border < world.generator.heightTiles && Math.abs(ty - border) <= WORLD.borderWobble + 1, `tile ${tx},${ty}`).toBe(true);
      inexact++;
    }
    expect(walls).toBeGreaterThan(1000);
    expect(inexact).toBeLessThan(40);
  });

});
