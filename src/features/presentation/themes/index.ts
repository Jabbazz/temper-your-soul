import type { ArenaDefinition, ArenaThemeId } from '../../arena/arena';
import { worldTheme } from '../world/world-theme';
import { cryptTheme } from './crypt';
import { forgeTheme } from './forge';
import { glacierTheme } from './glacier';
import { swampTheme } from './swamp';
import type { ArenaTheme } from './theme';

/** I temi grafici delle mappe, per id (`ArenaDefinition.theme`). */
export const ARENA_THEMES: Record<ArenaThemeId, ArenaTheme> = {
  crypt: cryptTheme,
  swamp: swampTheme,
  forge: forgeTheme,
  glacier: glacierTheme,
};

/** Il tema con cui si disegna una mappa: quello del mondo aperto se la mappa ha un terreno, altrimenti quello del suo id. */
export function arenaTheme(arena: ArenaDefinition): ArenaTheme {
  return arena.terrain !== undefined ? worldTheme : ARENA_THEMES[arena.theme];
}
