import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { BODY_RADIUS } from '../combat/collision';
import { TERRAIN_PAIRS, TERRAIN_WALKABLE, WORLD, WORLD_TERRAINS, type WorldTerrain } from './world-definition';
import { WorldMap, type WorldChunk } from './world-map';
import { WORLD_OBSTACLE_KINDS, obstacleTouchesCircle, type WorldObstacle } from './world-obstacles';

const RADIUS = BODY_RADIUS.player;
const N = WORLD.chunkTiles;
const world = new WorldMap();
/** Un blocco ogni tre per colonna e per riga, più tutta la striscia del confine fra le due fasce. */
const sampled: WorldChunk[] = [];
for (let cy = 0; cy < world.chunkRows; cy++) for (let cx = 0; cx < world.chunkColumns; cx++) {
  if ((cx % 3 === 0 && cy % 3 === 0) || cy === 7 || cy === 8) sampled.push(world.chunk(cx, cy));
}
const allObstacles = sampled.flatMap(chunk => chunk.obstacles);
const terrainOf = (chunk: WorldChunk, i: number, j: number): WorldTerrain => WORLD_TERRAINS[chunk.vertices[j * (N + 1) + i]!]!;
const pairAllowed = (a: WorldTerrain, b: WorldTerrain): boolean => TERRAIN_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

describe('mondo aperto: generazione', () => {
  it('ha due fasce da 256 righe e blocchi da 32 tile', () => {
    expect(world.width).toBe(1024 * 32);
    expect(world.height).toBe(512 * 32);
    expect([world.chunkColumns, world.chunkRows]).toEqual([32, 16]);
  });

  it('è riproducibile dal seme, in qualunque ordine si generino i blocchi', () => {
    const other = new WorldMap();
    other.chunk(20, 9);
    const again = other.chunk(5, 3), first = world.chunk(5, 3);
    expect(Array.from(again.vertices)).toEqual(Array.from(first.vertices));
    expect(again.obstacles).toEqual(first.obstacles);
    const different = new WorldMap({ ...WORLD, seed: WORLD.seed + 1 }).chunk(5, 3);
    expect(different.obstacles).not.toEqual(first.obstacles);
  });

  it('i blocchi vicini condividono gli stessi vertici di bordo', () => {
    const left = world.chunk(15, 3), right = world.chunk(16, 3), below = world.chunk(15, 4);
    for (let k = 0; k <= N; k++) {
      expect(terrainOf(left, N, k)).toBe(terrainOf(right, 0, k));
      expect(terrainOf(left, k, N)).toBe(terrainOf(below, k, 0));
    }
  });

  it('a nord c\'è il prato, a sud la brughiera, ai lati l\'acqua', () => {
    const seen = new Set(sampled.flatMap(chunk => Array.from(chunk.vertices)).map(index => WORLD_TERRAINS[index]));
    expect(seen).toEqual(new Set(WORLD_TERRAINS));
    expect(world.generator.biomeAt(300, 40).id).toBe('greenwood');
    expect(world.generator.biomeAt(300, 400).id).toBe('mistmoor');
    expect(world.terrainAt(32, 200 * 32)).toBe('water');
    expect(world.terrainAt(world.width - 32, 300 * 32)).toBe('water');
  });

  it('ogni tile accosta solo terreni che hanno un tileset di raccordo', () => {
    const borderRows = { from: 256 - WORLD.borderWobble - 1, to: 256 + WORLD.borderWobble };
    let triples = 0;
    for (const chunk of sampled) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const corners = new Set([terrainOf(chunk, i, j), terrainOf(chunk, i + 1, j), terrainOf(chunk, i, j + 1), terrainOf(chunk, i + 1, j + 1)]);
      const list = [...corners];
      for (const a of list) for (const b of list) if (a !== b) expect(pairAllowed(a, b), `${a}/${b} nel tile ${chunk.cx * N + i},${chunk.cy * N + j}`).toBe(true);
      if (corners.size > 2) {
        // Tre terreni si incontrano solo dove una strada o la costa attraversano il confine tra le fasce.
        const ty = chunk.cy * N + j;
        expect(ty >= borderRows.from && ty <= borderRows.to, `tre terreni nel tile ${chunk.cx * N + i},${ty}`).toBe(true);
        triples++;
      }
    }
    expect(triples).toBeLessThan(40);
  });

  it('il sentiero principale è percorribile dalla radura di partenza fino a sud', () => {
    expect(world.blocked(world.spawnPoint(0, RADIUS), RADIUS)).toBe(false);
    expect(world.spawnPoint(0, RADIUS).equals(world.spawnPoint(1, RADIUS))).toBe(false);
    for (let vy = WORLD.spawn.row; vy < world.generator.heightTiles; vy++) {
      const point = new Vec2(Math.round(world.generator.mainPathCenter(vy)) * 32, vy * 32);
      expect(world.terrainAt(point.x, point.y)).toBe('road');
      expect(world.blocked(point, RADIUS), `sentiero bloccato alla riga ${vy}`).toBe(false);
    }
  });
});

describe('mondo aperto: ostacoli', () => {
  it('nascono solo sul terreno della propria fascia, mai su strade o acqua', () => {
    expect(allObstacles.length).toBeGreaterThan(1000);
    const kinds = new Set(allObstacles.map(obstacle => obstacle.kind));
    expect(kinds).toEqual(new Set(Object.keys(WORLD_OBSTACLE_KINDS)));
    for (const obstacle of allObstacles) {
      const terrain = world.terrainAt(obstacle.x, obstacle.y);
      expect(terrain === 'grass' || terrain === 'moor', `${obstacle.kind} su ${terrain}`).toBe(true);
      const biome = world.generator.biomeAt(Math.round(obstacle.x / 32), Math.round(obstacle.y / 32));
      expect(biome.obstacles.kinds.some(entry => entry.kind === obstacle.kind), `${obstacle.kind} in ${biome.id}`).toBe(true);
    }
  });

  it('due ostacoli sparsi lasciano sempre passare un personaggio', () => {
    for (const chunk of sampled) {
      const scattered = chunk.obstacles;
      for (let a = 0; a < scattered.length; a++) for (let b = a + 1; b < scattered.length; b++) {
        const first = scattered[a]!, second = scattered[b]!, gap = Math.hypot(first.x - second.x, first.y - second.y) - 28;
        expect(gap, `${first.kind} e ${second.kind} troppo vicini`).toBeGreaterThan(RADIUS * 2);
      }
    }
  });

  it('un blocco resta leggero e la memoria dei blocchi ha un tetto', () => {
    for (const chunk of sampled) expect(chunk.obstacles.length).toBeLessThan(400);
    const small = new WorldMap({ ...WORLD, chunkCacheLimit: 4 });
    for (let cx = 0; cx < 10; cx++) small.chunk(cx, 2);
    expect(small.cachedChunks).toBe(4);
  });
});

describe('mondo aperto: collisioni', () => {
  const find = (kind: WorldObstacle['kind']): WorldObstacle => allObstacles.find(obstacle => obstacle.kind === kind)!;

  it('un albero ferma il corpo sul tronco e lo lascia scorrere di lato', () => {
    const oak = find('oak'), reach = WORLD_OBSTACLE_KINDS.oak.shape.radius + RADIUS;
    const start = new Vec2(oak.x - 40, oak.y);
    expect(world.blocked(start, RADIUS)).toBe(false);
    const stopped = world.moveBody(start, new Vec2(80, 0), RADIUS);
    expect(stopped.x).toBeLessThanOrEqual(oak.x - reach);
    expect(stopped.x).toBeGreaterThan(start.x);
    expect(obstacleTouchesCircle(oak, stopped.x, stopped.y, RADIUS)).toBe(false);
    const sliding = world.moveBody(new Vec2(oak.x - reach - 1, oak.y - 6), new Vec2(30, -30), RADIUS);
    expect(sliding.y).toBeLessThan(oak.y - 20);
    expect(obstacleTouchesCircle(oak, sliding.x, sliding.y, RADIUS)).toBe(false);
  });

  it('le mura sono tratti che bloccano, corrono nei due sensi e si incrociano', () => {
    const walls: { vx: number; vy: number }[] = [];
    for (const chunk of sampled) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      if (terrainOf(chunk, i, j) === 'wall') walls.push({ vx: chunk.cx * N + i, vy: chunk.cy * N + j });
    }
    expect(walls.length).toBeGreaterThan(500);
    const isWall = (vx: number, vy: number): boolean => world.generator.terrainAtVertex(vx, vy) === 'wall';
    const horizontal = walls.filter(({ vx, vy }) => isWall(vx - 1, vy) || isWall(vx + 1, vy));
    const vertical = walls.filter(({ vx, vy }) => isWall(vx, vy - 1) || isWall(vx, vy + 1));
    expect(horizontal.length).toBeGreaterThan(100);
    expect(vertical.length).toBeGreaterThan(100);
    expect(walls.some(({ vx, vy }) => (isWall(vx - 1, vy) || isWall(vx + 1, vy)) && (isWall(vx, vy - 1) || isWall(vx, vy + 1)))).toBe(true);
    for (const { vx, vy } of walls) {
      // Il tileset a parete alta vuole un altro vertice di mura sopra o sotto, e nessun contatto solo in diagonale.
      expect(isWall(vx, vy - 1) || isWall(vx, vy + 1), `mura senza facciata in ${vx},${vy}`).toBe(true);
      for (const dx of [-1, 1]) if (isWall(vx + dx, vy + 1)) expect(isWall(vx + dx, vy) || isWall(vx, vy + 1), `mura in diagonale in ${vx},${vy}`).toBe(true);
    }

    const wall = horizontal.find(({ vx, vy }) => !isWall(vx, vy - 1) && !isWall(vx, vy - 2))!;
    const center = new Vec2(wall.vx * 32, wall.vy * 32);
    expect(world.blocked(center, RADIUS)).toBe(true);
    expect(world.blocked(new Vec2(center.x + 15, center.y - 15), 1)).toBe(true);
    const start = new Vec2(center.x, center.y - 16 - RADIUS - 2);
    expect(world.blocked(start, RADIUS)).toBe(false);
    expect(world.moveBody(start, new Vec2(0, 40), RADIUS).y).toBeLessThanOrEqual(center.y - 16 - RADIUS);
  });

  it('l\'acqua e i bordi della mappa non si attraversano', () => {
    const row = 100 * 32;
    let firstLand = 0;
    while (!TERRAIN_WALKABLE[world.terrainAt(firstLand * 32, row)]) firstLand++;
    expect(firstLand).toBeGreaterThanOrEqual(WORLD.coast.min);
    // Si parte sulla riva, dove non nascono ostacoli, e si cammina verso il largo.
    const start = new Vec2(firstLand * 32 + 14, row);
    expect(world.blocked(start, RADIUS)).toBe(false);
    const shore = world.moveBody(start, new Vec2(-200, 0), RADIUS);
    expect(TERRAIN_WALKABLE[world.terrainAt(shore.x, shore.y)]).toBe(true);
    expect(shore.x).toBeLessThan(start.x);
    expect(shore.x).toBeGreaterThanOrEqual(firstLand * 32 - 16 + RADIUS);
    expect(world.blocked(new Vec2(world.width / 2, RADIUS - 1), RADIUS)).toBe(true);
    const top = world.moveBody(world.spawnPoint(0, RADIUS), new Vec2(0, -2000), RADIUS);
    expect(top.y).toBeGreaterThanOrEqual(RADIUS);
    expect(world.blocked(top, RADIUS)).toBe(false);
  });

  it('una domanda di collisione guarda poche celle, non tutta la mappa', () => {
    const probe = new WorldMap();
    probe.blocked(new Vec2(500 * 32 + 7, 300 * 32 + 9), RADIUS);
    expect(probe.cachedChunks).toBeLessThanOrEqual(4);
  });
});
