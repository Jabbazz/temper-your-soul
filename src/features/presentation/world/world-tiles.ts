import { WORLD_TERRAINS, type WorldTerrain } from '../../world/world-definition';
import { valueNoise } from '../../world/world-noise';
import { WORLD_TILESET_ART, type WorldTileArt } from './world-art-data';

/*
 * Scelta del tile da disegnare. Il terreno è sui vertici: un tile guarda i suoi quattro angoli e, per le pareti, anche
 * i vertici attorno. Solo aspetto: collisioni e regole stanno in features/world.
 */

/** Il tile scelto: indice in `WORLD_TILESET_ART` e ritaglio nel foglio. `exact` è falso se si è ripiegato su un vicino. */
export interface WorldTilePick { readonly set: number; readonly x: number; readonly y: number; readonly exact: boolean }

/**
 * Le varianti di ogni suolo, solo disegno: macchie di un secondo aspetto sparse sul suolo pieno per rompere la
 * monotonia (trifoglio nel bosco, erica nella brughiera, pozzanghere nella palude, ghiaccio sulla neve, braci nella
 * cenere, vene di lava nell'Abisso). Il rumore (`scale` in vertici, `threshold`) decide dove; le regole non le vedono.
 */
export const WORLD_GROUND_VARIANTS = {
  kinds: { grass: 'grass_lush', moor: 'moor_heather', bog: 'bog_puddle', snow: 'snow_ice', ash: 'ash_cinder', abyss: 'abyss_vein' } as Readonly<Partial<Record<WorldTerrain, string>>>,
  scale: 7, threshold: 0.6,
  /** Soglie più alte per suolo: nell'Abisso le vene accese si confonderebbero con la lava vera se fossero tante. */
  thresholdBy: { abyss: 0.72 } as Readonly<Partial<Record<WorldTerrain, number>>>,
} as const;

const isTerrain = (id: string): id is WorldTerrain => (WORLD_TERRAINS as readonly string[]).includes(id);
const VARIANT_IDS = new Set(Object.values(WORLD_GROUND_VARIANTS.kinds));
/** I fogli delle varianti, per suolo: il suolo è il terreno inferiore, la variante quello superiore. */
const VARIANT_SETS = new Map<WorldTerrain, { index: number; tiles: readonly WorldTileArt[] }>();
const SETS = WORLD_TILESET_ART.flatMap((art, index) => {
  if (VARIANT_IDS.has(art.upper) && isTerrain(art.lower)) { VARIANT_SETS.set(art.lower, { index, tiles: art.tiles }); return []; }
  if (!isTerrain(art.lower) || !isTerrain(art.upper)) throw new Error(`Tileset con terreni sconosciuti: ${art.lower}/${art.upper}`);
  return [{ index, lower: art.lower, upper: art.upper, tiles: art.tiles, wall: art.upper === 'wall' }];
});
type TileSet = typeof SETS[number];
const GROUNDS: ReadonlySet<WorldTerrain> = new Set(SETS.filter(set => set.wall).map(set => set.lower));

/** I quattro angoli nello schema 4×4: NO, NE, SO, SE. */
const CORNERS = [5, 6, 9, 10] as const;

function match(set: TileSet, state: (column: number, row: number) => number, exactOnly: boolean): WorldTileArt | undefined {
  let best: WorldTileArt | undefined, bestScore = -1;
  for (const tile of set.tiles) {
    let score = 0, fits = true;
    for (let i = 0; i < 16 && fits; i++) {
      const wanted = tile.pattern[i]!;
      if (wanted === 255 || (!exactOnly && !CORNERS.includes(i as 5))) continue;
      if (wanted !== state(i % 4, i >> 2)) fits = false; else score++;
    }
    if (fits && score > bestScore) { best = tile; bestScore = score; }
  }
  return best;
}

function fullTile(set: TileSet, value: number): WorldTileArt {
  return set.tiles.find(tile => CORNERS.every(i => tile.pattern[i] === value)) ?? set.tiles[0]!;
}

/**
 * Sceglie il tile la cui cella ha l'angolo in alto a sinistra in (0, 0): `at(dx, dy)` dà il terreno del vertice
 * spostato di (dx, dy), con dx da -1 a 2 e dy da -1 a 3.
 */
export function pickWorldTile(at: (dx: number, dy: number) => WorldTerrain): WorldTilePick {
  const corners = [at(0, 0), at(1, 0), at(0, 1), at(1, 1)];
  if (corners.includes('wall')) {
    // Parete alta: un vertice di mura è sommità se sotto c'è ancora muro, facciata se no.
    let ground: WorldTerrain | undefined = corners.find(corner => corner !== 'wall');
    for (let dy = -1; dy <= 2 && ground === undefined; dy++) for (let dx = -1; dx <= 2 && ground === undefined; dx++) if (GROUNDS.has(at(dx, dy))) ground = at(dx, dy);
    const set = SETS.find(candidate => candidate.wall && candidate.lower === ground) ?? SETS.find(candidate => candidate.wall)!;
    const state = (column: number, row: number): number => (at(column - 1, row - 1) !== 'wall' ? 0 : at(column - 1, row) === 'wall' ? 1 : 2);
    const exact = match(set, state, true), tile = exact ?? match(set, state, false) ?? fullTile(set, 1);
    return { set: set.index, x: tile.x, y: tile.y, exact: exact !== undefined };
  }
  let kinds = [...new Set(corners)], exact = true;
  if (kinds.length > 2) {
    // Tre terreni (una strada o la costa sul confine tra due fasce): il suolo meno presente cede all'altro.
    const count = (kind: WorldTerrain): number => corners.filter(corner => corner === kind).length;
    const grounds = kinds.filter(kind => GROUNDS.has(kind)).sort((a, b) => count(b) - count(a));
    for (let i = 0; i < 4; i++) if (corners[i] === grounds[1]) corners[i] = grounds[0]!;
    kinds = [...new Set(corners)]; exact = false;
  }
  const set = SETS.find(candidate => !candidate.wall && kinds.every(kind => kind === candidate.lower || kind === candidate.upper))
    ?? SETS.find(candidate => kinds.includes(candidate.lower) || kinds.includes(candidate.upper));
  if (set === undefined) return { set: 0, x: 0, y: 0, exact: false };
  const tile = match(set, (column, row) => (corners[(row - 1) * 2 + column - 1] === set.upper ? 1 : 0), false);
  return tile === undefined ? { set: set.index, x: set.tiles[0]!.x, y: set.tiles[0]!.y, exact: false } : { set: set.index, x: tile.x, y: tile.y, exact };
}

/**
 * La profondità della parete disegnata nel tile (tx, ty), per ordinarla con personaggi e nemici, o null se il tile
 * non ha vertici di mura. In prospettiva un pixel della parete sta a terra `rise - tile/2` più in basso di dove è
 * disegnato, ma mai oltre la base della sua colonna di mura (`drop` sotto l'ultimo vertice): chi sta più su di questo
 * valore è dietro la parete e viene coperto. Stessi valori dell'appoggio delle collisioni (`WorldDefinition.walls`).
 */
export function wallTileDepth(at: (vx: number, vy: number) => WorldTerrain, tx: number, ty: number, tile: number, walls: { readonly rise: number; readonly drop: number }): number | null {
  let depth: number | null = null;
  for (let corner = 0; corner < 4; corner++) {
    const vx = tx + (corner & 1), top = ty + (corner >> 1);
    if (at(vx, top) !== 'wall') continue;
    let bottom = top;
    while (bottom - top < 64 && at(vx, bottom + 1) === 'wall') bottom++;
    const value = Math.min((ty + 1) * tile + walls.rise - tile / 2, bottom * tile + tile / 2 + walls.drop);
    depth = depth === null ? value : Math.max(depth, value);
  }
  return depth;
}

/** I tileset che servono a disegnare un terreno: per caricarli prima che entri in vista (compresa la sua variante). */
export function tilesetsWith(terrain: WorldTerrain): readonly number[] {
  const variant = VARIANT_SETS.get(terrain);
  return [...SETS.filter(set => set.lower === terrain || set.upper === terrain).map(set => set.index), ...(variant === undefined ? [] : [variant.index])];
}

/**
 * Il tile di un quadrato di suolo pieno `ground` con la variante sui vertici indicati (NO, NE, SO, SE), o null se il
 * suolo non ha variante o nessun angolo la porta.
 */
export function pickGroundVariant(ground: WorldTerrain, corners: readonly boolean[]): WorldTilePick | null {
  const set = VARIANT_SETS.get(ground);
  if (set === undefined || !corners.some(Boolean)) return null;
  const tile = set.tiles.find(candidate => CORNERS.every((i, k) => candidate.pattern[i] === (corners[k] ? 1 : 0)));
  return tile === undefined ? null : { set: set.index, x: tile.x, y: tile.y, exact: true };
}

/**
 * Vero se il vertice porta la variante del suo suolo: il rumore supera la soglia e attorno c'è solo quel suolo, così le
 * macchie non toccano strade, acqua, mura o un'altra fascia (basta il raccordo suolo-variante).
 */
export function variantAt(at: (vx: number, vy: number) => WorldTerrain, vx: number, vy: number, seed: number): boolean {
  const ground = at(vx, vy);
  if (WORLD_GROUND_VARIANTS.kinds[ground] === undefined) return false;
  const threshold = WORLD_GROUND_VARIANTS.thresholdBy[ground] ?? WORLD_GROUND_VARIANTS.threshold;
  if (valueNoise(seed, vx / WORLD_GROUND_VARIANTS.scale, vy / WORLD_GROUND_VARIANTS.scale, VARIANT_SALT) <= threshold) return false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(vx + dx, vy + dy) !== ground) return false;
  return true;
}
const VARIANT_SALT = 41;
