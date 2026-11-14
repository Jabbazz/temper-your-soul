import { Vec2 } from '../../core/vec2';
import type { ArenaObstacles, ArenaTerrain, Pillar, Solid } from '../arena/arena';
import { TERRAIN_WALKABLE, WORLD, WORLD_TERRAINS, type WorldDefinition, type WorldTerrain } from './world-definition';
import { WorldDecor } from './world-decor';
import { WorldGenerator } from './world-generator';
import { hash01, valueNoise } from './world-noise';
import { MAX_OBSTACLE_EXTENT, WORLD_OBSTACLE_KINDS, obstacleTouchesCircle, type WorldDecal, type WorldObstacle, type WorldObstacleKindId } from './world-obstacles';

const SALT = { grove: 11, place: 12, jitterX: 13, jitterY: 14, kind: 15, decal: 16, decalX: 17, decalY: 18, decalKind: 19 } as const;
/** Distanza minima, in unità di mondo, fra un ostacolo sparso e un arredo (più la mezza larghezza di una staccionata in orizzontale). */
const DECOR_CLEARANCE = 40;

/** Un blocco generato della mappa: terreno sui vertici e ostacoli, già divisi in celle per trovarli in fretta. */
export interface WorldChunk {
  readonly cx: number;
  readonly cy: number;
  /** Indici in `WORLD_TERRAINS` dei (lato + 1)² vertici del blocco, riga per riga; i bordi sono condivisi coi vicini. */
  readonly vertices: Uint8Array;
  readonly obstacles: readonly WorldObstacle[];
  /** Gli stessi ostacoli per cella di dispersione (riga per riga), in base al centro dell'appoggio. */
  readonly cells: readonly (readonly WorldObstacle[])[];
  /** Decorazioni a terra senza collisione. */
  readonly decals: readonly WorldDecal[];
}

/**
 * La mappa del mondo aperto, senza DOM né rete: genera i blocchi a richiesta, li tiene in memoria fino a un limite e
 * risponde alle domande di collisione guardando solo le celle vicine, così il costo non dipende dalla grandezza
 * della mappa né dal numero totale di ostacoli.
 */
export class WorldMap implements ArenaTerrain {
  readonly generator: WorldGenerator;
  /** Gli arredi messi da regole: staccionate, statue, cimiteri. */
  readonly decor: WorldDecor;
  /** Dimensioni in unità di mondo. */
  readonly width: number;
  readonly height: number;
  private readonly chunks = new Map<number, WorldChunk>();
  private readonly pillars = new WeakMap<WorldObstacle, Pillar>();
  private readonly chunkSize: number;
  private readonly cellSize: number;
  private readonly cellsPerChunk: number;
  /** Risultato dell'ultima `blockingSpan`. */
  private spanTerrain: WorldTerrain = 'water';
  private spanTop = 0;
  private spanBottom = 0;

  constructor(readonly definition: WorldDefinition = WORLD) {
    if (definition.chunkTiles % definition.scatter.cellTiles !== 0) throw new Error('Il blocco deve contenere un numero intero di celle di dispersione');
    this.generator = new WorldGenerator(definition);
    this.decor = new WorldDecor(this.generator);
    this.width = this.generator.widthTiles * definition.tile;
    this.height = this.generator.heightTiles * definition.tile;
    this.chunkSize = definition.chunkTiles * definition.tile;
    this.cellSize = definition.scatter.cellTiles * definition.tile;
    this.cellsPerChunk = definition.chunkTiles / definition.scatter.cellTiles;
  }

  get chunkColumns(): number { return Math.ceil(this.generator.widthTiles / this.definition.chunkTiles); }
  get chunkRows(): number { return Math.ceil(this.generator.heightTiles / this.definition.chunkTiles); }
  get cachedChunks(): number { return this.chunks.size; }

  /** Il blocco alle coordinate di blocco date, generato alla prima richiesta. */
  chunk(cx: number, cy: number): WorldChunk {
    const key = cy * 65536 + cx;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = this.generate(cx, cy);
      if (this.chunks.size >= this.definition.chunkCacheLimit) this.chunks.delete(this.chunks.keys().next().value!);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  /** Terreno sotto un punto: quello del vertice più vicino, come lo mostrano i tile di raccordo. */
  terrainAt(x: number, y: number): WorldTerrain {
    return this.vertexTerrain(Math.round(x / this.definition.tile), Math.round(y / this.definition.tile));
  }

  /** Vero se un corpo circolare in quel punto esce dalla mappa, tocca acqua, mura o l'appoggio di un ostacolo. */
  blocked(position: Vec2, radius: number): boolean {
    const { x, y } = position, tile = this.definition.tile;
    if (x < radius || y < radius || x > this.width - radius || y > this.height - radius) return true;
    // Il quadrato di un vertice di mura può scendere di `drop` sotto il suo bordo: si guarda una riga in più sopra.
    for (let vy = Math.round((y - radius - this.definition.walls.drop) / tile); vy <= Math.round((y + radius) / tile); vy++) {
      for (let vx = Math.round((x - radius) / tile); vx <= Math.round((x + radius) / tile); vx++) {
        if (!this.blockingSpan(vx, vy)) continue;
        const dx = Math.max(Math.abs(x - vx * tile) - tile / 2, 0), dy = Math.max(this.spanTop - y, y - this.spanBottom, 0);
        if (dx * dx + dy * dy < radius * radius) return true;
      }
    }
    const reach = radius + MAX_OBSTACLE_EXTENT;
    for (let gy = Math.floor((y - reach) / this.cellSize); gy <= Math.floor((y + reach) / this.cellSize); gy++) {
      for (let gx = Math.floor((x - reach) / this.cellSize); gx <= Math.floor((x + reach) / this.cellSize); gx++) {
        for (const obstacle of this.cellObstacles(gx, gy)) if (obstacleTouchesCircle(obstacle, x, y, radius)) return true;
      }
    }
    return false;
  }

  /**
   * Gli ostacoli di una zona nella lingua delle arene, così la partita dei dungeon vale anche qui: gli ostacoli sparsi
   * sono pilastri (fermano corpi e colpi), le mura massicci (fermano anche la vista), l'acqua pozzi (ferma solo chi
   * cammina). Mura e acqua escono come strisce orizzontali di celle attorno ai vertici; le mura con l'appoggio in
   * prospettiva di `blockingSpan`.
   */
  obstaclesIn(minX: number, minY: number, maxX: number, maxY: number): ArenaObstacles {
    const tile = this.definition.tile, half = tile / 2, pillars: Pillar[] = [], solids: Solid[] = [], chasms: Solid[] = [];
    const reach = MAX_OBSTACLE_EXTENT;
    for (let gy = Math.floor((minY - reach) / this.cellSize); gy <= Math.floor((maxY + reach) / this.cellSize); gy++) {
      for (let gx = Math.floor((minX - reach) / this.cellSize); gx <= Math.floor((maxX + reach) / this.cellSize); gx++) {
        for (const obstacle of this.cellObstacles(gx, gy)) {
          // Gli ostacoli tondi sono pilastri; gli arredi rettangolari (staccionate, statue, tombe) massicci.
          const shape = WORLD_OBSTACLE_KINDS[obstacle.kind].shape;
          if (shape.type === 'circle') pillars.push(this.pillarOf(obstacle, shape.radius));
          else solids.push({ x: obstacle.x - shape.halfWidth, y: obstacle.y - shape.halfHeight, width: shape.halfWidth * 2, height: shape.halfHeight * 2 });
        }
      }
    }
    const firstX = Math.max(0, Math.ceil((minX - half) / tile)), lastX = Math.min(this.generator.widthTiles, Math.floor((maxX + half) / tile));
    const firstY = Math.max(0, Math.ceil((minY - half - this.definition.walls.drop) / tile)), lastY = Math.min(this.generator.heightTiles, Math.floor((maxY + half) / tile));
    for (let vy = firstY; vy <= lastY; vy++) {
      // Una striscia unisce i vertici vicini dello stesso tipo con la stessa fascia bloccata.
      let run: WorldTerrain | null = null, top = 0, bottom = 0, start = firstX;
      for (let vx = firstX; vx <= lastX + 1; vx++) {
        const blocking = vx <= lastX && this.blockingSpan(vx, vy) ? this.spanTerrain : null;
        if (blocking === run && (blocking === null || (this.spanTop === top && this.spanBottom === bottom))) continue;
        if (run !== null) (run === 'wall' ? solids : chasms).push({ x: start * tile - half, y: top, width: (vx - start) * tile, height: bottom - top });
        run = blocking; top = this.spanTop; bottom = this.spanBottom; start = vx;
      }
    }
    return { pillars, solids, chasms };
  }

  /**
   * Vero se il vertice ferma chi cammina; in quel caso `spanTop`/`spanBottom` sono i bordi in alto e in basso della
   * fascia bloccata (in x il quadrato del vertice) e `spanTerrain` il terreno. L'acqua blocca tutto il quadrato del
   * vertice; le mura il loro appoggio in prospettiva (`WorldDefinition.walls`), che può anche mancare del tutto in cima
   * alla colonna. Risultati nei campi, senza allocare: la domanda si ripete a ogni passo di ogni corpo.
   */
  private blockingSpan(vx: number, vy: number): boolean {
    const terrain = this.vertexTerrain(vx, vy);
    if (TERRAIN_WALKABLE[terrain]) return false;
    const { tile, walls } = this.definition, half = tile / 2;
    this.spanTerrain = terrain; this.spanTop = vy * tile - half; this.spanBottom = vy * tile + half;
    if (terrain !== 'wall') return true;
    for (let k = 1; k <= Math.ceil(walls.rise / tile); k++) {
      if (this.vertexTerrain(vx, vy - k) === 'wall') continue;
      this.spanTop = Math.max(this.spanTop, (vy - k + 1) * tile - half + walls.rise);
      break;
    }
    if (this.vertexTerrain(vx, vy + 1) !== 'wall') this.spanBottom += walls.drop;
    return this.spanTop < this.spanBottom;
  }

  /** Sposta un corpo di `delta` a piccoli passi, scorrendo lungo ciò che blocca; restituisce la nuova posizione. */
  moveBody(position: Vec2, delta: Vec2, radius: number): Vec2 {
    const steps = Math.max(1, Math.ceil(delta.length() / (radius / 2))), step = delta.mul(1 / steps);
    let current = position;
    for (let i = 0; i < steps; i++) {
      const alongX = new Vec2(current.x + step.x, current.y);
      if (step.x !== 0 && !this.blocked(alongX, radius)) current = alongX;
      const alongY = new Vec2(current.x, current.y + step.y);
      if (step.y !== 0 && !this.blocked(alongY, radius)) current = alongY;
    }
    return current;
  }

  /** Il punto libero più vicino a quello chiesto, cercato ad anelli di mezzo tile (comparsa, viaggi di prova). */
  freePointNear(target: Vec2, radius: number): Vec2 {
    const step = this.definition.tile / 2;
    for (let ring = 0; ring <= 40; ring++) for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
      const point = new Vec2(target.x + dx * step, target.y + dy * step);
      if (!this.blocked(point, radius)) return point;
    }
    return this.spawnPoint(0, radius);
  }

  /** Punti di comparsa liberi nella radura di partenza; l'indice distribuisce chi arriva insieme. */
  spawnPoint(index: number, radius: number): Vec2 {
    const { tile, spawn } = this.definition, center = new Vec2(this.width / 2, spawn.row * tile);
    const candidates = [0, 1, -1, 2, -2].flatMap(row => [0, 1, -1, 2, -2, 3, -3].map(column => center.add(new Vec2(column * 30, row * 30))))
      .filter(point => !this.blocked(point, radius));
    return candidates[Math.max(0, index) % Math.max(1, candidates.length)] ?? center;
  }

  /** Terreno di un vertice della griglia, letto dal blocco in memoria (fuori mappa vale il bordo). */
  vertexTerrain(vx: number, vy: number): WorldTerrain {
    const n = this.definition.chunkTiles, x = Math.min(Math.max(vx, 0), this.generator.widthTiles), y = Math.min(Math.max(vy, 0), this.generator.heightTiles);
    const cx = Math.min(Math.floor(x / n), this.chunkColumns - 1), cy = Math.min(Math.floor(y / n), this.chunkRows - 1);
    return WORLD_TERRAINS[this.chunk(cx, cy).vertices[(y - cy * n) * (n + 1) + (x - cx * n)]!]!;
  }

  private pillarOf(obstacle: WorldObstacle, radius: number): Pillar {
    let pillar = this.pillars.get(obstacle);
    if (pillar === undefined) {
      pillar = { position: new Vec2(obstacle.x, obstacle.y), radius };
      this.pillars.set(obstacle, pillar);
    }
    return pillar;
  }

  private cellObstacles(gx: number, gy: number): readonly WorldObstacle[] {
    const per = this.cellsPerChunk, cx = Math.floor(gx / per), cy = Math.floor(gy / per);
    if (cx < 0 || cy < 0 || cx >= this.chunkColumns || cy >= this.chunkRows) return [];
    return this.chunk(cx, cy).cells[(gy - cy * per) * per + (gx - cx * per)]!;
  }

  private generate(cx: number, cy: number): WorldChunk {
    const { chunkTiles: n, tile, seed, scatter } = this.definition, generator = this.generator, per = this.cellsPerChunk;
    const vertices = new Uint8Array((n + 1) * (n + 1));
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      vertices[j * (n + 1) + i] = WORLD_TERRAINS.indexOf(generator.terrainAtVertex(cx * n + i, cy * n + j));
    }
    const cells: WorldObstacle[][] = Array.from({ length: per * per }, () => []);
    const obstacles: WorldObstacle[] = [];
    const add = (obstacle: WorldObstacle): void => {
      obstacles.push(obstacle);
      const column = Math.min(per - 1, Math.floor((obstacle.x - cx * this.chunkSize) / this.cellSize)), row = Math.min(per - 1, Math.floor((obstacle.y - cy * this.chunkSize) / this.cellSize));
      cells[row * per + column]!.push(obstacle);
    };

    // Prima gli arredi messi da regole; gli ostacoli sparsi non nascono nei cimiteri né addosso a un arredo.
    const decor = this.decor.obstaclesIn(cx * this.chunkSize, cy * this.chunkSize, (cx + 1) * this.chunkSize, (cy + 1) * this.chunkSize);
    for (const obstacle of decor) add(obstacle);
    const nearDecor = (x: number, y: number): boolean => decor.some(other => Math.abs(other.x - x) < DECOR_CLEARANCE + 30 && Math.abs(other.y - y) < DECOR_CLEARANCE);
    for (let j = 0; j < per; j++) for (let i = 0; i < per; i++) {
      const gx = cx * per + i, gy = cy * per + j;
      const x = (gx + 0.5) * this.cellSize + (hash01(seed, gx, gy, SALT.jitterX) - 0.5) * 2 * scatter.jitter;
      const y = (gy + 0.5) * this.cellSize + (hash01(seed, gx, gy, SALT.jitterY) - 0.5) * 2 * scatter.jitter;
      const vx = Math.round(x / tile), vy = Math.round(y / tile);
      if (vx >= generator.widthTiles || vy >= generator.heightTiles) continue;
      const biome = generator.biomeAt(vx, vy), rules = biome.obstacles;
      const dense = valueNoise(seed, gx / scatter.groveScale, gy / scatter.groveScale, SALT.grove) > rules.groveThreshold;
      if (hash01(seed, gx, gy, SALT.place) >= (dense ? rules.groveDensity : rules.density)) continue;
      if (!this.clearGround(vx, vy, biome.ground) || this.decor.reserved(vx, vy) || nearDecor(x, y)) continue;
      add({ kind: this.pickKind(rules.kinds, hash01(seed, gx, gy, SALT.kind)), x: Math.round(x), y: Math.round(y) });
    }
    return { cx, cy, vertices, obstacles, cells, decals: this.generateDecals(cx, cy) };
  }

  /** Una decorazione al più per quadrato di due tile, spostata a caso dal centro, sul suolo pieno della sua fascia. */
  private generateDecals(cx: number, cy: number): WorldDecal[] {
    const { chunkTiles: n, tile, seed } = this.definition, generator = this.generator, decals: WorldDecal[] = [];
    for (let j = 0; j < n / 2; j++) for (let i = 0; i < n / 2; i++) {
      const gx = cx * (n / 2) + i, gy = cy * (n / 2) + j;
      const x = (gx * 2 + 1) * tile + (hash01(seed, gx, gy, SALT.decalX) - 0.5) * tile * 1.6;
      const y = (gy * 2 + 1) * tile + (hash01(seed, gx, gy, SALT.decalY) - 0.5) * tile * 1.6;
      const vx = Math.round(x / tile), vy = Math.round(y / tile);
      if (vx >= generator.widthTiles || vy >= generator.heightTiles) continue;
      const biome = generator.biomeAt(vx, vy), rules = biome.obstacles.decals;
      if (rules.kinds.length === 0 || hash01(seed, gx, gy, SALT.decal) >= rules.density) continue;
      if (!this.clearGround(vx, vy, biome.ground) || this.decor.reserved(vx, vy)) continue;
      let left = hash01(seed, gx, gy, SALT.decalKind) * rules.kinds.reduce((sum, entry) => sum + entry.weight, 0);
      const kind = rules.kinds.find(entry => (left -= entry.weight) < 0)?.kind ?? rules.kinds[0]!.kind;
      decals.push({ kind, x: Math.round(x), y: Math.round(y) });
    }
    return decals;
  }

  /** Un ostacolo sparso nasce solo su suolo pieno della sua fascia, lontano da strade, acqua e mura. */
  private clearGround(vx: number, vy: number, ground: WorldTerrain): boolean {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (this.generator.terrainAtVertex(vx + dx, vy + dy) !== ground) return false;
    }
    return true;
  }

  private pickKind(kinds: readonly { readonly kind: WorldObstacleKindId; readonly weight: number }[], roll: number): WorldObstacleKindId {
    let left = roll * kinds.reduce((sum, entry) => sum + entry.weight, 0);
    for (const entry of kinds) if ((left -= entry.weight) < 0) return entry.kind;
    return kinds[kinds.length - 1]!.kind;
  }
}
