import type { Camera } from '../../../core/camera';
import type { Vec2 } from '../../../core/vec2';
import type { WorldTerrain } from '../../world/world-definition';
import type { WorldMap } from '../../world/world-map';
import { WORLD_DECAL_KINDS, WORLD_OBSTACLE_KINDS, obstacleFoot, type WorldDecal, type WorldObstacle } from '../../world/world-obstacles';
import { sheetImage } from '../boss-art/sheet-images';
import { drawPixelShadow } from '../pixel-shadow';
import { WORLD_OBJECT_ART, WORLD_TILESET_ART } from './world-art-data';
import { lowerMask, outlineSheet, outlinedSet, withoutGround, type RgbaImage } from './world-sheet-layers';
import { pickGroundVariant, pickWorldTile, tilesetsWith, variantAt, wallTileDepth, type WorldTilePick } from './world-tiles';

/*
 * Disegno del mondo aperto dentro la scena dei dungeon: solo i tile e gli ostacoli in vista, a ogni fotogramma. I fogli
 * si caricano la prima volta che servono, quindi la grafica di una fascia arriva quando ci si avvicina. Le pareti delle
 * mura si ridisegnano come figure, ordinate in profondità con personaggi e nemici: chi passa dietro un muro o un albero
 * resta coperto, ma attorno al giocatore l'oggetto davanti si fa in parte trasparente. Solo aspetto.
 */

/** Colori piatti usati finché il foglio di un terreno non è arrivato. */
export const WORLD_FALLBACK_COLORS: Readonly<Record<WorldTerrain, string>> = {
  grass: '#6a9e5c', moor: '#5c7480', road: '#a8957a', water: '#264e5c', wall: '#aab0bc', bog: '#4e4a32', ash: '#3e3c40', snow: '#d4dce4',
  abyss: '#2c2224', lava: '#e25c1e',
};
/**
 * La finestra sugli oggetti davanti al giocatore: centro `lift` sopra i piedi (a metà del corpo), raggio `radius` e
 * quanto dell'oggetto resta al centro (`keep`, da 0 invisibile a 1 pieno). Valori provvisori, da provare giocando.
 */
export const SEE_THROUGH = { lift: 22, radius: 36, keep: 0.4 } as const;
/**
 * Ombre a terra degli ostacoli, in pixel art (ellisse a pixel interi, un solo tono): larghe una frazione della
 * larghezza disegnata (`WorldObjectArt.spread`), schiacciate dalla prospettiva. Gli alberi spogli fanno meno ombra.
 * Valori provvisori.
 */
export interface ShadowShape { readonly width: number; readonly flat: number; readonly below: number }
const BASE_SHADOW: ShadowShape = { width: 1.15, flat: 0.22, below: 1 };
export const WORLD_SHADOWS = {
  color: '#0c1a1250',
  /**
   * Colore per suolo: sui suoli scuri (fango, cenere, roccia lavica) l'ombra di prato e brughiera sparirebbe, quindi è
   * nera e più coprente; sulla neve è blu-grigia. Gli altri suoli usano `color`.
   */
  byGround: { bog: '#00000068', ash: '#00000080', abyss: '#00000098', snow: '#2c3c5a50' } as Readonly<Partial<Record<WorldTerrain, string>>>,
  /** Alberi e sassi: ombra sotto la chioma o la pietra, che finisce appena sotto la base. */
  standard: { width: 0.8, flat: 0.3, below: 2 } as ShadowShape,
  /**
   * Per aspetto: l'albero spoglio fa meno ombra; gli arredi con una base piatta (piedistalli, tombe, staccionate) hanno
   * un'ombra più larga della base e bassa, che si vede ai lati e non sotto: così poggiano invece di sembrare sospesi.
   */
  byVisual: {
    dead_tree: { width: 0.55, flat: 0.3, below: 2 },
    knight_statue: BASE_SHADOW, angel_statue: BASE_SHADOW, gravestone: BASE_SHADOW, grave_cross: BASE_SHADOW,
    fence: { width: 1, flat: 0.16, below: 1 },
  } as Readonly<Record<string, ShadowShape>>,
} as const;

const shadowShape = (visual: string): ShadowShape => WORLD_SHADOWS.byVisual[visual] ?? WORLD_SHADOWS.standard;
/** Quanti tile oltre la vista si guardano per caricare in anticipo la grafica della fascia vicina. */
const PRELOAD_TILES = 48;
/** Margine attorno alla vista entro cui si disegnano gli ostacoli (le chiome sporgono dal loro appoggio). */
const OBJECT_MARGIN = 100;
/** Margine del pavimento attorno alla vista: copre la scossa dello schermo. */
const FLOOR_MARGIN = 32;
const PICK_CACHE_LIMIT = 20000;

interface TileTraits { readonly pick: WorldTilePick; readonly wallDepth: number | null }
const traitCaches = new WeakMap<WorldMap, Map<number, TileTraits>>();

function traitsAt(map: WorldMap, tx: number, ty: number): TileTraits {
  let traits = traitCaches.get(map);
  if (traits === undefined) { traits = new Map(); traitCaches.set(map, traits); }
  const key = (ty + 4096) * 65536 + tx + 4096;
  let found = traits.get(key);
  if (found === undefined) {
    const vertex = (vx: number, vy: number): WorldTerrain => map.vertexTerrain(vx, vy);
    let pick = pickWorldTile((dx, dy) => vertex(tx + dx, ty + dy));
    // Suolo pieno: forse una macchia della sua variante (solo aspetto).
    const ground = vertex(tx, ty);
    if (vertex(tx + 1, ty) === ground && vertex(tx, ty + 1) === ground && vertex(tx + 1, ty + 1) === ground) {
      const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dy]) => variantAt(vertex, tx + dx!, ty + dy!, map.definition.seed));
      pick = pickGroundVariant(ground, corners) ?? pick;
    }
    found = { pick, wallDepth: wallTileDepth(vertex, tx, ty, map.definition.tile, map.definition.walls) };
    if (traits.size >= PICK_CACHE_LIMIT) traits.clear();
    traits.set(key, found);
  }
  return found;
}

/** Il foglio pronto da disegnare (con il contorno, se il raccordo lo vuole) e la sola parete delle mura. */
interface SheetLayers { readonly floor: CanvasImageSource; readonly wall: CanvasImageSource | null }
const layerCache = new Map<number, SheetLayers>();

function toCanvas(image: RgbaImage): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  canvas.getContext('2d')!.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  return canvas;
}

/** I livelli di un tileset, ricavati una volta sola quando il foglio è arrivato; null finché non c'è. */
function sheetLayers(set: number): SheetLayers | null {
  const cached = layerCache.get(set);
  if (cached !== undefined) return cached;
  const art = WORLD_TILESET_ART[set]!, image = sheetImage(art.url);
  if (image === null) return null;
  let layers: SheetLayers = { floor: image, wall: null };
  if (outlinedSet(art)) {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const source: RgbaImage = { width: pixels.width, height: pixels.height, data: pixels.data };
    const mask = lowerMask(source, art), outlined = outlineSheet(source, art, mask);
    layers = { floor: toCanvas(outlined), wall: art.upper === 'wall' ? toCanvas(withoutGround(outlined, mask)) : null };
  }
  layerCache.set(set, layers);
  return layers;
}

/** Il terreno in vista. Oltre i bordi della mappa prosegue il terreno del bordo (l'acqua della costa ai lati). */
export function drawWorldFloor(ctx: CanvasRenderingContext2D, map: WorldMap, camera: Camera): void {
  const tile = map.definition.tile, origin = camera.pixelOrigin;
  const lastX = Math.floor((origin.x + camera.width + FLOOR_MARGIN) / tile), lastY = Math.floor((origin.y + camera.height + FLOOR_MARGIN) / tile);
  ctx.imageSmoothingEnabled = false;
  for (let ty = Math.floor((origin.y - FLOOR_MARGIN) / tile); ty <= lastY; ty++) for (let tx = Math.floor((origin.x - FLOOR_MARGIN) / tile); tx <= lastX; tx++) {
    const pick = traitsAt(map, tx, ty).pick, layers = sheetLayers(pick.set);
    if (layers !== null) ctx.drawImage(layers.floor, pick.x, pick.y, tile, tile, tx * tile, ty * tile, tile, tile);
    else { ctx.fillStyle = WORLD_FALLBACK_COLORS[map.terrainAt((tx + 0.5) * tile, (ty + 0.5) * tile)]; ctx.fillRect(tx * tile, ty * tile, tile, tile); }
  }
  forDecalsInView(map, camera, (decal) => drawDecal(ctx, decal));
  forObstaclesInView(map, camera, (obstacle) => drawShadow(ctx, map, obstacle));
  preload(map, origin.y, origin.y + camera.height);
}

/** Una decorazione a terra: la base del disegno sul suo punto. Sta sotto ombre e figure. */
function drawDecal(ctx: CanvasRenderingContext2D, decal: WorldDecal): void {
  const art = WORLD_OBJECT_ART[WORLD_DECAL_KINDS[decal.kind].visual];
  if (art === undefined) return;
  const image = sheetImage(art.url);
  if (image !== null) ctx.drawImage(image, Math.round(decal.x - art.anchorX), Math.round(decal.y - art.bottom));
}

function forDecalsInView(map: WorldMap, camera: Camera, visit: (decal: WorldDecal) => void): void {
  const size = map.definition.chunkTiles * map.definition.tile, margin = 40;
  const left = camera.position.x - margin, top = camera.position.y - margin, right = camera.position.x + camera.width + margin, bottom = camera.position.y + camera.height + margin;
  const toX = Math.min(map.chunkColumns - 1, Math.floor(right / size)), toY = Math.min(map.chunkRows - 1, Math.floor(bottom / size));
  for (let cy = Math.max(0, Math.floor(top / size)); cy <= toY; cy++) for (let cx = Math.max(0, Math.floor(left / size)); cx <= toX; cx++) {
    for (const decal of map.chunk(cx, cy).decals) if (decal.x >= left && decal.x <= right && decal.y >= top && decal.y <= bottom) visit(decal);
  }
}

/** Le misure dell'ombra di un disegno largo `spread`: pari in larghezza, così resta centrata sul tronco. */
export function shadowSize(visual: string, spread: number): { readonly width: number; readonly height: number } {
  const shape = shadowShape(visual), width = Math.max(6, 2 * Math.round((spread * shape.width) / 2));
  return { width, height: Math.max(3, Math.round(width * shape.flat)) };
}

/**
 * L'ombra di un ostacolo: il bordo inferiore appena sotto la base del disegno (`WORLD_SHADOWS.below` pixel), il resto
 * sotto il tronco o il sasso. Così l'oggetto poggia sulla sua ombra invece di sembrare sospeso sopra.
 */
function drawShadow(ctx: CanvasRenderingContext2D, map: WorldMap, obstacle: WorldObstacle): void {
  const kind = WORLD_OBSTACLE_KINDS[obstacle.kind], art = WORLD_OBJECT_ART[kind.visual];
  if (art === undefined) return;
  const { width, height } = shadowSize(kind.visual, art.spread);
  // La base del disegno, come in drawObstacle.
  const base = obstacle.y + obstacleFoot(kind.shape);
  drawPixelShadow(ctx, obstacle.x, base + shadowShape(kind.visual).below, width, height, shadowColor(map.terrainAt(obstacle.x, base)));
}

/** Il colore dell'ombra sul suolo dato. */
export const shadowColor = (ground: WorldTerrain): string => WORLD_SHADOWS.byGround[ground] ?? WORLD_SHADOWS.color;

/** Gli ostacoli entro `OBJECT_MARGIN` dalla vista, blocco per blocco. */
function forObstaclesInView(map: WorldMap, camera: Camera, visit: (obstacle: WorldObstacle) => void): void {
  const size = map.definition.chunkTiles * map.definition.tile, left = camera.position.x - OBJECT_MARGIN, top = camera.position.y - OBJECT_MARGIN;
  const right = camera.position.x + camera.width + OBJECT_MARGIN, bottom = camera.position.y + camera.height + OBJECT_MARGIN;
  const toX = Math.min(map.chunkColumns - 1, Math.floor(right / size)), toY = Math.min(map.chunkRows - 1, Math.floor(bottom / size));
  for (let cy = Math.max(0, Math.floor(top / size)); cy <= toY; cy++) for (let cx = Math.max(0, Math.floor(left / size)); cx <= toX; cx++) {
    for (const obstacle of map.chunk(cx, cy).obstacles) {
      if (obstacle.x >= left && obstacle.x <= right && obstacle.y >= top && obstacle.y <= bottom) visit(obstacle);
    }
  }
}

let scratch: CanvasRenderingContext2D | null = null;

/** Vero se la finestra attorno al giocatore tocca il rettangolo e il giocatore sta dietro (più a nord di `depth`). */
function seesThrough(focus: Vec2, depth: number, x: number, y: number, width: number, height: number): boolean {
  if (focus.y >= depth) return false;
  const cx = focus.x, cy = focus.y - SEE_THROUGH.lift, r = SEE_THROUGH.radius;
  return cx + r > x && cx - r < x + width && cy + r > y && cy - r < y + height;
}

/** Disegna un ritaglio con la finestra attorno al giocatore: al centro resta `keep` dell'oggetto, sfumando verso il pieno. */
function drawSeeThrough(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sx: number, sy: number, width: number, height: number, dx: number, dy: number, focus: Vec2): void {
  if (scratch === null) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    scratch = canvas.getContext('2d')!;
    scratch.imageSmoothingEnabled = false;
  }
  const s = scratch;
  s.globalCompositeOperation = 'source-over';
  s.clearRect(0, 0, width, height);
  s.drawImage(source, sx, sy, width, height, 0, 0, width, height);
  s.globalCompositeOperation = 'destination-out';
  const cx = focus.x - dx, cy = focus.y - SEE_THROUGH.lift - dy, gone = `rgba(0,0,0,${1 - SEE_THROUGH.keep})`;
  const gradient = s.createRadialGradient(cx, cy, 0, cx, cy, SEE_THROUGH.radius);
  gradient.addColorStop(0, gone); gradient.addColorStop(0.55, gone); gradient.addColorStop(1, 'rgba(0,0,0,0)');
  s.fillStyle = gradient;
  s.fillRect(0, 0, width, height);
  s.globalCompositeOperation = 'source-over';
  ctx.drawImage(s.canvas, 0, 0, width, height, dx, dy, width, height);
}

function drawObstacle(ctx: CanvasRenderingContext2D, obstacle: WorldObstacle, focus: Vec2): void {
  const kind = WORLD_OBSTACLE_KINDS[obstacle.kind], art = WORLD_OBJECT_ART[kind.visual];
  if (art === undefined) return;
  const image = sheetImage(art.url);
  if (image === null) return;
  // Il disegno appoggia poco sotto il centro dell'appoggio a terra, così il tronco copre la propria sagoma.
  const foot = obstacleFoot(kind.shape);
  const x = Math.round(obstacle.x - art.anchorX), y = Math.round(obstacle.y + foot - art.bottom);
  if (seesThrough(focus, obstacle.y, x, y, art.width, art.height)) drawSeeThrough(ctx, image, 0, 0, art.width, art.height, x, y, focus);
  else ctx.drawImage(image, x, y);
}

/** Gli ostacoli e le pareti delle mura in vista, come figure da ordinare in profondità con personaggi e nemici. */
export function worldFigures(ctx: CanvasRenderingContext2D, map: WorldMap, camera: Camera, focus: Vec2): { readonly y: number; readonly draw: () => void }[] {
  const figures: { y: number; draw: () => void }[] = [];
  forObstaclesInView(map, camera, (obstacle) => figures.push({ y: obstacle.y, draw: () => drawObstacle(ctx, obstacle, focus) }));
  // Le pareti delle mura: il pavimento le ha già disegnate sotto tutto, qui tornano sopra chi sta loro dietro.
  const tile = map.definition.tile, origin = camera.pixelOrigin;
  const lastX = Math.floor((origin.x + camera.width + FLOOR_MARGIN) / tile), lastY = Math.floor((origin.y + camera.height + FLOOR_MARGIN) / tile);
  for (let ty = Math.floor((origin.y - FLOOR_MARGIN) / tile); ty <= lastY; ty++) for (let tx = Math.floor((origin.x - FLOOR_MARGIN) / tile); tx <= lastX; tx++) {
    const { pick, wallDepth } = traitsAt(map, tx, ty);
    if (wallDepth === null) continue;
    const wall = sheetLayers(pick.set)?.wall;
    if (wall === null || wall === undefined) continue;
    const x = tx * tile, y = ty * tile;
    figures.push({
      y: wallDepth,
      draw: () => {
        if (seesThrough(focus, wallDepth, x, y, tile, tile)) drawSeeThrough(ctx, wall, pick.x, pick.y, tile, tile, x, y, focus);
        else ctx.drawImage(wall, pick.x, pick.y, tile, tile, x, y, tile, tile);
      },
    });
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
