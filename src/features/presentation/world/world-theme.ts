import { WorldMap } from '../../world/world-map';
import { contrastingDangerColor } from '../draw-combat';
import type { ArenaTheme } from '../themes/theme';
import { WORLD_FALLBACK_COLORS, drawWorldFloor, worldFigures } from './world-renderer';

/**
 * Il tema del mondo aperto nella scena dei dungeon: terreno a tile al posto del pavimento dipinto, ostacoli ordinati
 * in profondità con le figure, luce piena di giorno (nessuna mappa di luce). Colori di contorno provvisori.
 */
export const worldTheme: ArenaTheme = {
  drawFloor: (ctx, arena, camera) => { if (arena.terrain instanceof WorldMap) drawWorldFloor(ctx, arena.terrain, camera); },
  drawPillar: () => undefined,
  figures: (ctx, arena, camera, _clock, focus) => (arena.terrain instanceof WorldMap ? worldFigures(ctx, arena.terrain, camera, focus) : []),
  dangerColor: (arena, position) => (arena.terrain instanceof WorldMap ? contrastingDangerColor(WORLD_FALLBACK_COLORS[arena.terrain.terrainAt(position.x, position.y)]) : undefined),
  daylight: true,
  // Non usato in piena luce; resta il grigio medio, neutro per la luce morbida.
  ambient: '#808080',
  block: { cap: '#aab0bc', edge: '#c8ccd4', face: { face: '#3a3d4a', dark: '#23252e', light: '#5a5e6c', pattern: 'bricks' } },
  silhouette: '#10141a66',
  vignette: '#0b1014',
  groundColors: Object.values(WORLD_FALLBACK_COLORS),
};
