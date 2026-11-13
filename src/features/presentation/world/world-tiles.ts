import { WORLD_TERRAINS, type WorldTerrain } from '../../world/world-definition';
import { WORLD_TILESET_ART, type WorldTileArt } from './world-art-data';

/*
 * Scelta del tile da disegnare. Il terreno è sui vertici: un tile guarda i suoi quattro angoli e, per le pareti, anche
 * i vertici attorno. Solo aspetto: collisioni e regole stanno in features/world.
 */

/** Il tile scelto: indice in `WORLD_TILESET_ART` e ritaglio nel foglio. `exact` è falso se si è ripiegato su un vicino. */
export interface WorldTilePick { readonly set: number; readonly x: number; readonly y: number; readonly exact: boolean }

const isTerrain = (id: string): id is WorldTerrain => (WORLD_TERRAINS as readonly string[]).includes(id);
const SETS = WORLD_TILESET_ART.map((art, index) => {
  if (!isTerrain(art.lower) || !isTerrain(art.upper)) throw new Error(`Tileset con terreni sconosciuti: ${art.lower}/${art.upper}`);
  return { index, lower: art.lower, upper: art.upper, tiles: art.tiles, wall: art.upper === 'wall' };
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

/** I tileset che servono a disegnare un terreno: per caricarli prima che entri in vista. */
export function tilesetsWith(terrain: WorldTerrain): readonly number[] {
  return SETS.filter(set => set.lower === terrain || set.upper === terrain).map(set => set.index);
}
