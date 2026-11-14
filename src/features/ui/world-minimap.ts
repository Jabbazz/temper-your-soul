import type { Vec2 } from '../../core/vec2';
import type { WorldTerrain } from '../world/world-definition';
import type { WorldMap } from '../world/world-map';
import { el } from './dom';

/*
 * La minimappa del mondo aperto, in basso a destra: una vista dall'alto attorno al giocatore, un pixel per tile, con i
 * punti d'interesse (partenza, cimiteri, statue degli incroci). Legge la mappa del mondo, non la cambia.
 */

/** Lato della vista in tile, ingrandimento in pixel per tile e ogni quanti tile di spostamento si ridisegna. Provvisori. */
export const WORLD_MINIMAP = { tiles: 112, scale: 2, refreshTiles: 2 } as const;

/** Colori dei terreni sulla minimappa (RGB). */
export const MINIMAP_COLORS: Readonly<Record<WorldTerrain, readonly [number, number, number]>> = {
  grass: [86, 128, 72], moor: [78, 98, 108], road: [176, 160, 132], water: [36, 76, 90], wall: [150, 150, 158],
  bog: [78, 74, 50], ash: [64, 62, 66], snow: [212, 220, 228], abyss: [44, 34, 36], lava: [226, 92, 30],
};

export type MinimapPointKind = 'spawn' | 'cemetery' | 'statue';
export interface MinimapPoint { readonly kind: MinimapPointKind; readonly tx: number; readonly ty: number }

/** I colori della finestra di `tiles` × `tiles` tile con l'angolo in alto a sinistra in (left, top), RGBA riga per riga. */
export function minimapPixels(map: WorldMap, left: number, top: number, tiles: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(tiles * tiles * 4);
  for (let y = 0; y < tiles; y++) for (let x = 0; x < tiles; x++) {
    const vx = left + x, vy = top + y, index = (y * tiles + x) * 4;
    if (vx < 0 || vy < 0 || vx > map.generator.widthTiles || vy > map.generator.heightTiles) { pixels[index + 3] = 0; continue; }
    const [r, g, b] = MINIMAP_COLORS[map.vertexTerrain(vx, vy)];
    pixels[index] = r; pixels[index + 1] = g; pixels[index + 2] = b; pixels[index + 3] = 255;
  }
  return pixels;
}

/** I punti d'interesse nella finestra: la partenza e gli arredi che segnano un luogo (angeli dei cimiteri, statue). */
export function minimapPoints(map: WorldMap, left: number, top: number, tiles: number): MinimapPoint[] {
  const { tile, chunkTiles, spawn } = map.definition, points: MinimapPoint[] = [];
  const inside = (tx: number, ty: number): boolean => tx >= left && ty >= top && tx < left + tiles && ty < top + tiles;
  const start = { tx: Math.round(map.generator.widthTiles / 2), ty: spawn.row };
  if (inside(start.tx, start.ty)) points.push({ kind: 'spawn', ...start });
  const firstX = Math.max(0, Math.floor(left / chunkTiles)), lastX = Math.min(map.chunkColumns - 1, Math.floor((left + tiles) / chunkTiles));
  const firstY = Math.max(0, Math.floor(top / chunkTiles)), lastY = Math.min(map.chunkRows - 1, Math.floor((top + tiles) / chunkTiles));
  for (let cy = firstY; cy <= lastY; cy++) for (let cx = firstX; cx <= lastX; cx++) {
    for (const obstacle of map.chunk(cx, cy).obstacles) {
      const kind: MinimapPointKind | null = obstacle.kind === 'angel_statue' ? 'cemetery' : obstacle.kind === 'knight_statue' ? 'statue' : null;
      const tx = Math.round(obstacle.x / tile), ty = Math.round(obstacle.y / tile);
      if (kind !== null && inside(tx, ty)) points.push({ kind, tx, ty });
    }
  }
  return points;
}

/** Piccoli simboli in pixel: chiave del simbolo, colore e celle accese (x, y) attorno al centro. */
const ICONS: Readonly<Record<MinimapPointKind, { readonly color: string; readonly cells: readonly (readonly [number, number])[] }>> = {
  // Una casetta.
  spawn: { color: '#f2d27a', cells: [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [1, 1], [-1, 2], [0, 2], [1, 2]] },
  // Una croce.
  cemetery: { color: '#e8e2f2', cells: [[0, -2], [-1, -1], [0, -1], [1, -1], [0, 0], [0, 1], [0, 2]] },
  // Un rombo.
  statue: { color: '#d8d0bc', cells: [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]] },
};

export class WorldMinimap {
  readonly element = el('div', 'world-minimap');
  private readonly canvas = document.createElement('canvas');
  private readonly context: CanvasRenderingContext2D;
  private lastX = Number.NaN;
  private lastY = Number.NaN;
  private lastMap: WorldMap | null = null;

  constructor() {
    const size = WORLD_MINIMAP.tiles * WORLD_MINIMAP.scale;
    this.canvas.width = size; this.canvas.height = size;
    this.canvas.className = 'world-minimap-canvas';
    this.canvas.setAttribute('aria-label', 'Minimappa del mondo');
    this.context = this.canvas.getContext('2d')!;
    this.element.append(this.canvas);
  }

  toggle(): void { this.element.classList.toggle('collapsed'); }

  /** Ridisegna quando il giocatore ha fatto qualche tile; il giocatore sta sempre al centro. */
  update(map: WorldMap, position: Vec2): void {
    const tile = map.definition.tile, tx = Math.round(position.x / tile), ty = Math.round(position.y / tile);
    if (map === this.lastMap && Math.abs(tx - this.lastX) < WORLD_MINIMAP.refreshTiles && Math.abs(ty - this.lastY) < WORLD_MINIMAP.refreshTiles) return;
    this.lastMap = map; this.lastX = tx; this.lastY = ty;
    const { tiles, scale } = WORLD_MINIMAP, left = tx - tiles / 2, top = ty - tiles / 2, ctx = this.context;
    const pixels = minimapPixels(map, left, top, tiles), raw = document.createElement('canvas');
    raw.width = tiles; raw.height = tiles;
    raw.getContext('2d')!.putImageData(new ImageData(pixels, tiles, tiles), 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, tiles * scale, tiles * scale);
    ctx.drawImage(raw, 0, 0, tiles * scale, tiles * scale);
    const dot = (x: number, y: number, color: string, cells: readonly (readonly [number, number])[]): void => {
      // Contorno scuro di un pixel attorno al simbolo, poi il simbolo.
      ctx.fillStyle = '#120e16';
      for (const [cx, cy] of cells) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.fillRect(x + (cx + ox!) * scale, y + (cy + oy!) * scale, scale, scale);
      ctx.fillStyle = color;
      for (const [cx, cy] of cells) ctx.fillRect(x + cx * scale, y + cy * scale, scale, scale);
    };
    for (const point of minimapPoints(map, left, top, tiles)) {
      const icon = ICONS[point.kind];
      dot((point.tx - left) * scale, (point.ty - top) * scale, icon.color, icon.cells);
    }
    // Il giocatore al centro.
    dot((tiles / 2) * scale, (tiles / 2) * scale, '#ffffff', [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]);
  }
}
