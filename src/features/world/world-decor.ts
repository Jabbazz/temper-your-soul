import type { WorldTerrain } from './world-definition';
import type { WorldGenerator } from './world-generator';
import { hash01, valueNoise } from './world-noise';
import type { WorldObstacle, WorldObstacleKindId } from './world-obstacles';

const SALT = { fence: 31, fenceGap: 32, statue: 33, statueCorner: 34, cemetery: 35, cemeteryX: 36, cemeteryY: 37, grave: 38, graveKind: 39 } as const;

/**
 * Regole degli arredi del mondo, in vertici della griglia e probabilità. Valori provvisori.
 * - Staccionate: a tratti lungo i due lati delle strade secondarie orizzontali del Bosco Verde, `offset` vertici
 *   fuori dal bordo della strada; un tratto è lungo `step` unità (i pali di due tratti vicini si sovrappongono nel
 *   disegno), il rumore decide dove corrono (`scale`, in tratti, e `threshold`),
 *   qualche tratto manca (`gap`) e attorno agli incroci, per `crossingGap` vertici, non ce ne sono.
 * - Statue: agli incroci del Bosco Verde fra le strade secondarie orizzontali e le altre strade, su un angolo del prato.
 * - Cimiteri: nella Brughiera, al più uno per riquadro di `cell` tile: una statua d'angelo in testa e file di tombe.
 */
export const WORLD_DECOR = {
  fences: { biome: 'greenwood', offset: 0, step: 44, scale: 9, threshold: 0.45, gap: 0.12, crossingGap: 5 },
  statues: { biome: 'greenwood', chance: 0.55, inset: 2 },
  cemeteries: { biome: 'mistmoor', cell: 28, chance: 0.4, columns: 5, rows: 3, spacingX: 2, spacingY: 2, missing: 0.15, margin: 3 },
} as const;

/** Un cimitero: il riquadro dei vertici che occupa (esclusi i bordi liberi attorno). */
interface Cemetery { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }

/**
 * Gli arredi messi da regole: dipendono solo dal seme e dalle coordinate, come il resto della mappa, quindi un blocco
 * li trova da solo e risultano identici su server e client.
 */
export class WorldDecor {
  private readonly cemeteries = new Map<number, Cemetery | null>();

  constructor(private readonly generator: WorldGenerator) {}

  /** Gli arredi con il centro nel rettangolo [x0, x1) × [y0, y1), in unità di mondo. */
  obstaclesIn(x0: number, y0: number, x1: number, y1: number): WorldObstacle[] {
    const tile = this.generator.definition.tile, found: WorldObstacle[] = [];
    const add = (kind: WorldObstacleKindId, x: number, y: number): void => { if (x >= x0 && x < x1 && y >= y0 && y < y1) found.push({ kind, x, y }); };
    const vx0 = Math.floor(x0 / tile) - 4, vy0 = Math.floor(y0 / tile) - 4, vx1 = Math.ceil(x1 / tile) + 4, vy1 = Math.ceil(y1 / tile) + 4;
    this.fences(vx0, vy0, vx1, vy1, add);
    this.statues(vx0, vy0, vx1, vy1, add);
    this.graves(vx0, vy0, vx1, vy1, add);
    return found;
  }

  private landmarkCache: readonly WorldObstacle[] | null = null;

  /** I luoghi notevoli di tutta la mappa, per la mappa del mondo: gli angeli dei cimiteri e le statue degli incroci. */
  landmarks(): readonly WorldObstacle[] {
    if (this.landmarkCache === null) {
      const { tile } = this.generator.definition;
      this.landmarkCache = this.obstaclesIn(0, 0, (this.generator.widthTiles + 1) * tile, (this.generator.heightTiles + 1) * tile)
        .filter(obstacle => obstacle.kind === 'angel_statue' || obstacle.kind === 'knight_statue');
    }
    return this.landmarkCache;
  }

  /** Vero se il vertice sta in un cimitero (o nel suo bordo libero): lì non nascono ostacoli sparsi. */
  reserved(vx: number, vy: number): boolean {
    const size = WORLD_DECOR.cemeteries.cell, cemetery = this.cemetery(Math.floor(vx / size), Math.floor(vy / size));
    return cemetery !== null && vx >= cemetery.left - 1 && vx <= cemetery.right + 1 && vy >= cemetery.top - 1 && vy <= cemetery.bottom + 1;
  }

  private ground(vx: number, vy: number, biome: string): boolean {
    const generator = this.generator, terrain: WorldTerrain = generator.terrainAtVertex(vx, vy);
    const here = generator.biomeAt(vx, vy);
    return here.id === biome && terrain === here.ground;
  }

  private fences(vx0: number, vy0: number, vx1: number, vy1: number, add: (kind: WorldObstacleKindId, x: number, y: number) => void): void {
    const { definition } = this.generator, rules = WORLD_DECOR.fences, tile = definition.tile, seed = definition.seed;
    for (const row of this.generator.roadRows) for (const side of [-1, 1]) {
      const vy = row + side * (definition.roads.halfWidth + 1 + rules.offset);
      if (vy < vy0 || vy > vy1) continue;
      // Gli incroci restano liberi: lì stanno le statue e si gira da una strada all'altra.
      const crossings = [...this.generator.roadColumns.map(column => ({ column, half: definition.roads.halfWidth })), { column: this.generator.mainPathCenter(row), half: definition.mainPath.halfWidth }];
      for (let k = Math.floor((vx0 * tile) / rules.step); k <= Math.ceil((vx1 * tile) / rules.step); k++) {
        const x = k * rules.step + rules.step / 2;
        if (crossings.some(({ column, half }) => Math.abs(x / tile - column) <= half + rules.crossingGap)) continue;
        if (valueNoise(seed, k / rules.scale, vy, SALT.fence) <= rules.threshold || hash01(seed, k, vy, SALT.fenceGap) < rules.gap) continue;
        // Tutto il tratto e la fila oltre stanno sul prato del bosco: niente staccionate sugli incroci o in acqua.
        let clear = true;
        for (let vx = Math.floor((x - rules.step / 2) / tile); vx <= Math.ceil((x + rules.step / 2) / tile) && clear; vx++) {
          for (const dy of [0, side]) if (!this.ground(vx, vy + dy, rules.biome)) clear = false;
        }
        if (clear) add('fence', x, vy * tile);
      }
    }
  }

  private statues(vx0: number, vy0: number, vx1: number, vy1: number, add: (kind: WorldObstacleKindId, x: number, y: number) => void): void {
    const { definition } = this.generator, rules = WORLD_DECOR.statues, tile = definition.tile, seed = definition.seed;
    for (const row of this.generator.roadRows) {
      if (row < vy0 - 8 || row > vy1 + 8) continue;
      const crossings = [...this.generator.roadColumns.map(column => ({ column, half: definition.roads.halfWidth })), { column: this.generator.mainPathCenter(row), half: definition.mainPath.halfWidth }];
      for (const { column, half } of crossings) {
        if (column < vx0 - 8 || column > vx1 + 8 || hash01(seed, column, row, SALT.statue) >= rules.chance) continue;
        const corner = Math.floor(hash01(seed, column, row, SALT.statueCorner) * 4), sx = corner & 1 ? 1 : -1, sy = corner & 2 ? 1 : -1;
        const vx = column + sx * (half + rules.inset), vy = row + sy * (definition.roads.halfWidth + rules.inset);
        let clear = true;
        for (let dy = -1; dy <= 1 && clear; dy++) for (let dx = -1; dx <= 1 && clear; dx++) if (!this.ground(vx + dx, vy + dy, rules.biome)) clear = false;
        if (clear) add('knight_statue', vx * tile, vy * tile);
      }
    }
  }

  private graves(vx0: number, vy0: number, vx1: number, vy1: number, add: (kind: WorldObstacleKindId, x: number, y: number) => void): void {
    const rules = WORLD_DECOR.cemeteries, size = rules.cell, { tile, seed } = this.generator.definition;
    for (let cy = Math.floor(vy0 / size); cy <= Math.floor(vy1 / size); cy++) for (let cx = Math.floor(vx0 / size); cx <= Math.floor(vx1 / size); cx++) {
      const cemetery = this.cemetery(cx, cy);
      if (cemetery === null) continue;
      add('angel_statue', ((cemetery.left + cemetery.right) / 2) * tile, cemetery.top * tile);
      for (let row = 0; row < rules.rows; row++) for (let column = 0; column < rules.columns; column++) {
        const vx = cemetery.left + column * rules.spacingX, vy = cemetery.top + 2 + row * rules.spacingY;
        if (hash01(seed, vx, vy, SALT.grave) < rules.missing) continue;
        add(hash01(seed, vx, vy, SALT.graveKind) < 0.6 ? 'gravestone' : 'grave_cross', vx * tile, vy * tile);
      }
    }
  }

  /** Il cimitero del riquadro, se c'è: posizione dal seme, e solo se tutto il riquadro (con un bordo) è brughiera libera. */
  private cemetery(cx: number, cy: number): Cemetery | null {
    const key = cy * 4096 + cx;
    if (this.cemeteries.has(key)) return this.cemeteries.get(key)!;
    const rules = WORLD_DECOR.cemeteries, size = rules.cell, seed = this.generator.definition.seed;
    const width = (rules.columns - 1) * rules.spacingX, height = 2 + (rules.rows - 1) * rules.spacingY;
    let found: Cemetery | null = null;
    if (cx >= 0 && cy >= 0 && hash01(seed, cx, cy, SALT.cemetery) < rules.chance) {
      const room = size - width - 2 * rules.margin, roomY = size - height - 2 * rules.margin;
      const left = cx * size + rules.margin + Math.floor(hash01(seed, cx, cy, SALT.cemeteryX) * room);
      const top = cy * size + rules.margin + Math.floor(hash01(seed, cx, cy, SALT.cemeteryY) * roomY);
      let clear = true;
      for (let vy = top - 2; vy <= top + height + 2 && clear; vy++) for (let vx = left - 2; vx <= left + width + 2 && clear; vx++) if (!this.ground(vx, vy, rules.biome)) clear = false;
      if (clear) found = { left, top, right: left + width, bottom: top + height };
    }
    if (this.cemeteries.size > 4096) this.cemeteries.clear();
    this.cemeteries.set(key, found);
    return found;
  }
}
