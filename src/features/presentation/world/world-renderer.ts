import type { Camera } from '../../../core/camera';
import type { WorldTerrain } from '../../world/world-definition';
import type { WorldMap } from '../../world/world-map';
import { WORLD_OBSTACLE_KINDS, type WorldObstacle } from '../../world/world-obstacles';
import { sheetImage } from '../boss-art/sheet-images';
import { WORLD_OBJECT_ART, WORLD_TILESET_ART } from './world-art-data';
import { pickWorldTile, tilesetsWith, type WorldTilePick } from './world-tiles';

/*
 * Disegno del mondo aperto dentro la scena dei dungeon: solo i tile e gli ostacoli in vista, a ogni fotogramma. I fogli
 * si caricano la prima volta che servono, quindi la grafica di una fascia arriva quando ci si avvicina. Solo aspetto.
 */

/** Colori piatti usati finché il foglio di un terreno non è arrivato. */
export const WORLD_FALLBACK_COLORS: Readonly<Record<WorldTerrain, string>> = { grass: '#6a9e5c', moor: '#5c7480', road: '#86582c', water: '#264e5c', wall: '#aab0bc' };
/** Quanti tile oltre la vista si guardano per caricare in anticipo la grafica della fascia vicina. */
const PRELOAD_TILES = 48;
/** Margine attorno alla vista entro cui si disegnano gli ostacoli (le chiome sporgono dal loro appoggio). */
const OBJECT_MARGIN = 100;
/** Margine del pavimento attorno alla vista: copre la scossa dello schermo. */
const FLOOR_MARGIN = 32;
const PICK_CACHE_LIMIT = 20000;

const pickCaches = new WeakMap<WorldMap, Map<number, WorldTilePick>>();

function pickAt(map: WorldMap, tx: number, ty: number): WorldTilePick {
  let picks = pickCaches.get(map);
  if (picks === undefined) { picks = new Map(); pickCaches.set(map, picks); }
  const key = (ty + 4096) * 65536 + tx + 4096;
  let pick = picks.get(key);
  if (pick === undefined) {
    pick = pickWorldTile((dx, dy) => map.vertexTerrain(tx + dx, ty + dy));
    if (picks.size >= PICK_CACHE_LIMIT) picks.clear();
    picks.set(key, pick);
  }
  return pick;
}

/** Il terreno in vista. Oltre i bordi della mappa prosegue il terreno del bordo (l'acqua della costa ai lati). */
export function drawWorldFloor(ctx: CanvasRenderingContext2D, map: WorldMap, camera: Camera): void {
  const tile = map.definition.tile, origin = camera.pixelOrigin;
  const lastX = Math.floor((origin.x + camera.width + FLOOR_MARGIN) / tile), lastY = Math.floor((origin.y + camera.height + FLOOR_MARGIN) / tile);
  ctx.imageSmoothingEnabled = false;
  for (let ty = Math.floor((origin.y - FLOOR_MARGIN) / tile); ty <= lastY; ty++) for (let tx = Math.floor((origin.x - FLOOR_MARGIN) / tile); tx <= lastX; tx++) {
    const pick = pickAt(map, tx, ty), image = sheetImage(WORLD_TILESET_ART[pick.set]!.url);
    if (image !== null) ctx.drawImage(image, pick.x, pick.y, tile, tile, tx * tile, ty * tile, tile, tile);
    else { ctx.fillStyle = WORLD_FALLBACK_COLORS[map.terrainAt((tx + 0.5) * tile, (ty + 0.5) * tile)]; ctx.fillRect(tx * tile, ty * tile, tile, tile); }
  }
  preload(map, origin.y, origin.y + camera.height);
}

function drawObstacle(ctx: CanvasRenderingContext2D, obstacle: WorldObstacle): void {
  const kind = WORLD_OBSTACLE_KINDS[obstacle.kind], art = WORLD_OBJECT_ART[kind.visual];
  if (art === undefined) return;
  const image = sheetImage(art.url);
  if (image === null) return;
  // Il disegno appoggia poco sotto il centro dell'appoggio a terra, così il tronco copre la propria sagoma.
  const foot = Math.round(kind.shape.radius * 0.6);
  ctx.drawImage(image, Math.round(obstacle.x - art.anchorX), Math.round(obstacle.y + foot - art.bottom));
}

/** Gli ostacoli in vista come figure da ordinare in profondità con personaggi e nemici. */
export function worldFigures(ctx: CanvasRenderingContext2D, map: WorldMap, camera: Camera): { readonly y: number; readonly draw: () => void }[] {
  const figures: { y: number; draw: () => void }[] = [];
  const size = map.definition.chunkTiles * map.definition.tile, left = camera.position.x - OBJECT_MARGIN, top = camera.position.y - OBJECT_MARGIN;
  const right = camera.position.x + camera.width + OBJECT_MARGIN, bottom = camera.position.y + camera.height + OBJECT_MARGIN;
  const toX = Math.min(map.chunkColumns - 1, Math.floor(right / size)), toY = Math.min(map.chunkRows - 1, Math.floor(bottom / size));
  for (let cy = Math.max(0, Math.floor(top / size)); cy <= toY; cy++) for (let cx = Math.max(0, Math.floor(left / size)); cx <= toX; cx++) {
    for (const obstacle of map.chunk(cx, cy).obstacles) {
      if (obstacle.x < left || obstacle.x > right || obstacle.y < top || obstacle.y > bottom) continue;
      figures.push({ y: obstacle.y, draw: () => drawObstacle(ctx, obstacle) });
    }
  }
  return figures;
}

/** Chiede in anticipo i fogli delle fasce entro `PRELOAD_TILES` dalla vista, così non compaiono a scatti. */
function preload(map: WorldMap, top: number, bottom: number): void {
  const { generator, definition } = map, column = Math.round(generator.widthTiles / 2);
  const first = generator.biomeIndexAt(column, Math.max(0, Math.floor(top / definition.tile) - PRELOAD_TILES));
  const last = generator.biomeIndexAt(column, Math.min(generator.heightTiles, Math.ceil(bottom / definition.tile) + PRELOAD_TILES));
  for (let i = first; i <= last; i++) {
    const biome = definition.biomes[i]!;
    for (const set of tilesetsWith(biome.ground)) sheetImage(WORLD_TILESET_ART[set]!.url);
    for (const entry of biome.obstacles.kinds) { const art = WORLD_OBJECT_ART[WORLD_OBSTACLE_KINDS[entry.kind].visual]; if (art !== undefined) sheetImage(art.url); }
  }
}
