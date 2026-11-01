import type { ArenaThemeId } from '../../arena/arena';
import { preloadSheets, sheetImage } from '../boss-art/sheet-images';
import { TILE_ATLASES, type TileMaterial, type TileRect } from './tile-atlas';

/*
 * Tile di terzi ricolorati (fase 6 dello studio grafico): un foglio per tema preparato da `tools/arte/prepara_tile.py`,
 * crediti in `art-credits.ts`. Solo aspetto. Finche' il foglio non e' caricato (o senza DOM, nei test) i temi
 * disegnano come prima, nel codice: nessuna regola dipende dai tile.
 */

/** Crediti (`art-credits.ts`) dei tile di ogni tema. */
export const TILE_CREDITS: Readonly<Record<ArenaThemeId, readonly string[]>> = {
  crypt: ['itch-0x72-dungeontileset-ii', 'oga-eman-quest-tiles', 'itch-kmh-dungeon'],
  swamp: ['itch-0x72-dungeontileset-ii', 'oga-eman-quest-tiles'],
  forge: ['itch-0x72-dungeontileset-ii', 'oga-eman-quest-tiles'],
  glacier: ['itch-0x72-dungeontileset-ii', 'oga-eman-quest-tiles', 'itch-kmh-tundra'],
};

/** Un pixel d'arte vale 2 unita' del mondo: un tile da 16 pixel copre 32 unita', come le lastre della cripta. */
export const TILE_SCALE = 2;
export const TILE_SIZE = 16 * TILE_SCALE;

/** Comincia a caricare i fogli dei tile (all'avvio, cosi' la prima stanza ha gia' i suoi). */
export function preloadTiles(): void {
  preloadSheets(Object.values(TILE_ATLASES).map((atlas) => atlas.url));
}

/** Il foglio dei tile del tema se e' pronto, altrimenti null. */
export function tileSheet(theme: ArenaThemeId): HTMLImageElement | null {
  return sheetImage(TILE_ATLASES[theme].url);
}

/** Le varianti di un materiale del tema (vuoto se il tema non lo ha). */
export function tileVariants(theme: ArenaThemeId, material: TileMaterial): readonly TileRect[] {
  return TILE_ATLASES[theme].tiles[material] ?? [];
}

/** I colori con cui sono stati ricolorati i tile di un materiale (per il confronto con i colpi nemici). */
export function tileColors(theme: ArenaThemeId, material: TileMaterial): readonly string[] {
  return TILE_ATLASES[theme].colors[material] ?? [];
}

/** Quota delle prime due varianti (le lastre lisce) fra quelle scelte. Provvisoria, solo aspetto. */
const PLAIN_SHARE = 0.82;

/**
 * Una variante scelta da un valore stabile `h` in [0, 1): le prime varianti (le lastre lisce) escono piu' spesso, cosi'
 * crepe e macchie restano punti di riferimento e non rumore.
 */
export function pickVariant<T>(variants: readonly T[], h: number): T | undefined {
  if (variants.length === 0) return undefined;
  const plain = Math.min(2, variants.length);
  if (h < PLAIN_SHARE || plain === variants.length) return variants[Math.min(plain - 1, Math.floor((h / PLAIN_SHARE) * plain))];
  return variants[Math.min(variants.length - 1, plain + Math.floor(((h - PLAIN_SHARE) / (1 - PLAIN_SHARE)) * (variants.length - plain)))];
}

/** Disegna un tile del foglio con l'angolo alto a sinistra in (`x`, `y`), alla scala dei tile, senza sfumare i pixel. */
export function drawTile(ctx: CanvasRenderingContext2D, sheet: HTMLImageElement, tile: TileRect, x: number, y: number, scale = TILE_SCALE): void {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, tile.x, tile.y, tile.w, tile.h, x, y, tile.w * scale, tile.h * scale);
}
