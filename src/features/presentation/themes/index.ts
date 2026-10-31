import type { ArenaThemeId } from '../../arena/arena';
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
