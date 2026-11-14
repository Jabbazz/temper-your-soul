import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { BODY_RADIUS } from '../combat/collision';
import { TERRAIN_PAIRS, TERRAIN_WALKABLE, WORLD, WORLD_TERRAINS, type WorldTerrain } from './world-definition';
import { WORLD_DECOR } from './world-decor';
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
  it('ha sei fasce da 256 righe e blocchi da 32 tile, sempre più dure verso sud fino all\'Abisso', () => {
    expect(WORLD.biomes.map(biome => biome.id)).toEqual(['greenwood', 'mistmoor', 'rotmarsh', 'frostreach', 'ashlands', 'abyss']);
    expect(WORLD.biomes.map(biome => biome.rows)).toEqual([256, 256, 256, 256, 256, 256]);
    expect(world.width).toBe(1024 * 32);
    expect(world.height).toBe(1536 * 32);
    expect([world.chunkColumns, world.chunkRows]).toEqual([32, 48]);
    // Nell'Abisso al posto dell'acqua c'è la lava, che ferma chi cammina come l'acqua.
    const abyss = WORLD.biomes[5]!;
    expect(abyss.liquid).toBe('lava');
    expect(world.terrainAt(32, (5 * 256 + 128) * 32)).toBe('lava');
    WORLD.biomes.forEach((biome, index) => {
      expect(biome.tier).toBe(index);
      if (index > 0) expect(biome.mobs.healthScale).toBeGreaterThan(WORLD.biomes[index - 1]!.mobs.healthScale);
    });
    expect(new Set(WORLD.biomes.map(biome => biome.ground)).size).toBe(WORLD.biomes.length);
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
    const nearBorder = (ty: number): boolean => {
      const border = Math.round(ty / 256) * 256;
      return border > 0 && border < world.generator.heightTiles && ty >= border - WORLD.borderWobble - 1 && ty <= border + WORLD.borderWobble;
    };
    let triples = 0;
    for (const chunk of sampled) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const corners = new Set([terrainOf(chunk, i, j), terrainOf(chunk, i + 1, j), terrainOf(chunk, i, j + 1), terrainOf(chunk, i + 1, j + 1)]);
      const list = [...corners];
      for (const a of list) for (const b of list) if (a !== b) expect(pairAllowed(a, b), `${a}/${b} nel tile ${chunk.cx * N + i},${chunk.cy * N + j}`).toBe(true);
      if (corners.size > 2) {
        // Tre terreni si incontrano solo dove una strada o la costa attraversano il confine tra le fasce.
        const ty = chunk.cy * N + j;
        expect(nearBorder(ty), `tre terreni nel tile ${chunk.cx * N + i},${ty}`).toBe(true);
        triples++;
      }
    }
    expect(triples).toBeLessThan(40 * (WORLD.biomes.length - 1));
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

  it('le strade sono dritte, di larghezza costante e girano solo a gomito', () => {
    const { generator } = world, { mainPath, roads, spawn } = WORLD;
    // Il sentiero principale: centro intero e fisso dentro ogni tratto, larghezza piena su ogni riga.
    let changes = 0;
    for (let vy = spawn.row + 1; vy < generator.heightTiles; vy++) {
      const center = generator.mainPathCenter(vy);
      expect(Number.isInteger(center)).toBe(true);
      if (center !== generator.mainPathCenter(vy - 1)) {
        changes++;
        expect((vy - spawn.row) % mainPath.stretch, `il sentiero cambia colonna fuori da un gomito, riga ${vy}`).toBe(0);
      }
      for (let dx = -mainPath.halfWidth; dx <= mainPath.halfWidth; dx++) expect(generator.isRoad(center + dx, vy)).toBe(true);
    }
    expect(changes).toBeGreaterThan(2);
    // Le strade secondarie: ogni colonna è strada per tutta l'altezza con la stessa larghezza.
    const column = Math.round(roads.columns[0]! * generator.widthTiles);
    for (let vy = 0; vy <= generator.heightTiles; vy += 7) {
      for (let dx = -roads.halfWidth; dx <= roads.halfWidth; dx++) expect(generator.isRoad(column + dx, vy)).toBe(true);
    }
  });
});

describe('mondo aperto: ostacoli', () => {
  it('nascono solo sul terreno della propria fascia, mai su strade o acqua', () => {
    expect(allObstacles.length).toBeGreaterThan(1000);
    const kinds = new Set(allObstacles.map(obstacle => obstacle.kind));
    expect(kinds).toEqual(new Set(Object.keys(WORLD_OBSTACLE_KINDS)));
    const decorBiome: Readonly<Record<string, string>> = {
      fence: WORLD_DECOR.fences.biome, knight_statue: WORLD_DECOR.statues.biome,
      gravestone: WORLD_DECOR.cemeteries.biome, grave_cross: WORLD_DECOR.cemeteries.biome, angel_statue: WORLD_DECOR.cemeteries.biome,
    };
    for (const obstacle of allObstacles) {
      const terrain = world.terrainAt(obstacle.x, obstacle.y);
      const biome = world.generator.biomeAt(Math.round(obstacle.x / 32), Math.round(obstacle.y / 32));
      expect(WORLD.biomes.some(other => other.ground === terrain), `${obstacle.kind} su ${terrain}`).toBe(true);
      // Gli sparsi sono quelli della fascia; gli arredi stanno nella fascia delle loro regole.
      const allowed = biome.obstacles.kinds.some(entry => entry.kind === obstacle.kind) || decorBiome[obstacle.kind] === biome.id;
      expect(allowed, `${obstacle.kind} in ${biome.id}`).toBe(true);
    }
  });

  it('due ostacoli lasciano sempre passare un personaggio (tranne i tratti di una stessa staccionata)', () => {
    /** Distanza fra i due appoggi: cerchi e rettangoli. */
    const gapBetween = (a: WorldObstacle, b: WorldObstacle): number => {
      const box = (o: WorldObstacle): { hw: number; hh: number } => {
        const shape = WORLD_OBSTACLE_KINDS[o.kind].shape;
        return shape.type === 'circle' ? { hw: shape.radius, hh: shape.radius } : { hw: shape.halfWidth, hh: shape.halfHeight };
      };
      const sa = box(a), sb = box(b);
      const dx = Math.max(0, Math.abs(a.x - b.x) - sa.hw - sb.hw), dy = Math.max(0, Math.abs(a.y - b.y) - sa.hh - sb.hh);
      return Math.hypot(dx, dy);
    };
    for (const chunk of sampled) {
      const all = chunk.obstacles;
      for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
        const first = all[a]!, second = all[b]!;
        if (first.kind === 'fence' && second.kind === 'fence') continue;
        expect(gapBetween(first, second), `${first.kind} e ${second.kind} troppo vicini`).toBeGreaterThan(RADIUS * 2);
      }
    }
  });

  it('le decorazioni a terra stanno sul suolo pieno della loro fascia e non bloccano', () => {
    const decals = sampled.flatMap(chunk => chunk.decals);
    expect(decals.length).toBeGreaterThan(500);
    for (const decal of decals) {
      const vx = Math.round(decal.x / 32), vy = Math.round(decal.y / 32), biome = world.generator.biomeAt(vx, vy);
      expect(world.vertexTerrain(vx, vy)).toBe(biome.ground);
      expect(biome.obstacles.decals.kinds.some(entry => entry.kind === decal.kind), `${decal.kind} in ${biome.id}`).toBe(true);
    }
    // Una decorazione non ferma nessuno: il suo punto è libero quanto il prato attorno.
    const free = decals.find(decal => !world.blocked(new Vec2(decal.x, decal.y + 40), RADIUS) && !world.blocked(new Vec2(decal.x, decal.y), RADIUS));
    expect(free).toBeDefined();
  });

  it('gli arredi seguono le loro regole: staccionate lungo le strade, statue agli incroci, cimiteri in file', () => {
    const decor = allObstacles.filter(obstacle => !['oak', 'bush', 'boulder', 'dead_tree', 'moor_rock'].includes(obstacle.kind));
    const count = (kind: string): number => decor.filter(obstacle => obstacle.kind === kind).length;
    expect(count('fence')).toBeGreaterThan(20);
    expect(count('knight_statue')).toBeGreaterThan(0);
    expect(count('angel_statue')).toBeGreaterThan(0);
    expect(count('gravestone') + count('grave_cross')).toBeGreaterThan(count('angel_statue') * 5);
    for (const fence of decor.filter(obstacle => obstacle.kind === 'fence')) {
      // Accanto a una strada secondaria orizzontale, sul prato.
      const vy = fence.y / 32;
      expect(world.generator.roadRows.some(row => Math.abs(vy - row) === WORLD.roads.halfWidth + 1 + WORLD_DECOR.fences.offset)).toBe(true);
    }
    // Le tombe di un cimitero stanno su file e colonne regolari.
    for (const grave of decor.filter(obstacle => obstacle.kind === 'gravestone' || obstacle.kind === 'grave_cross')) {
      expect((grave.x / 32) % 1).toBe(0);
      expect(world.decor.reserved(grave.x / 32, grave.y / 32)).toBe(true);
    }
    // Riproducibili dal seme.
    const again = new WorldMap().chunk(sampled[0]!.cx, sampled[0]!.cy).obstacles;
    expect(again).toEqual(sampled[0]!.obstacles);
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

    // Un tratto orizzontale pieno, spesso due vertici (sommità e facciata), con erba sopra e sotto.
    const wall = horizontal.find(({ vx, vy }) => !isWall(vx, vy - 1) && isWall(vx, vy + 1) && !isWall(vx, vy + 2)
      && [-1, 1].every(dx => isWall(vx + dx, vy) && isWall(vx + dx, vy + 1) && !isWall(vx + dx, vy - 1) && !isWall(vx + dx, vy + 2)))!;
    expect(wall).toBeDefined();
    const x = wall.vx * 32, crest = wall.vy * 32;
    // L'appoggio in prospettiva: sotto la sommità disegnata, fino alla base della facciata.
    const top = crest - 16 + WORLD.walls.rise, bottom = crest + 32 + 16 + WORLD.walls.drop;
    expect(world.blocked(new Vec2(x, (top + bottom) / 2), 1)).toBe(true);
    expect(world.blocked(new Vec2(x, crest), RADIUS)).toBe(false);
    expect(world.obstaclesIn(x - 1, top - 1, x + 1, bottom + 1).solids.some(solid => solid.y === top && solid.y + solid.height === bottom && solid.x <= x && solid.x + solid.width >= x)).toBe(true);
    // Da nord si passa dietro la sommità e ci si ferma contro l'appoggio.
    const north = new Vec2(x, crest - 16 - RADIUS - 2);
    expect(world.blocked(north, RADIUS)).toBe(false);
    const behind = world.moveBody(north, new Vec2(0, 80), RADIUS).y;
    expect(behind).toBeGreaterThan(crest);
    expect(behind).toBeLessThanOrEqual(top - RADIUS);
    // Da sud ci si ferma contro la base della facciata.
    const front = world.moveBody(new Vec2(x, bottom + RADIUS + 30), new Vec2(0, -80), RADIUS).y;
    expect(front).toBeGreaterThanOrEqual(bottom + RADIUS);
    expect(front).toBeLessThan(bottom + RADIUS + 6);
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
