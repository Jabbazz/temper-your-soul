import { CRYPT } from './crypt';
import type { DungeonDefinition } from './dungeon-definition';
import { FORGE } from './forge/forge';
import { GLACIER } from './glacier/glacier';
import { SWAMP } from './swamp/swamp';

/** I dungeon selezionabili, nell'ordine in cui compaiono nel menu (per pericolo crescente). */
export const DUNGEONS: readonly DungeonDefinition[] = [CRYPT, SWAMP, FORGE, GLACIER];

export function dungeonById(id: string): DungeonDefinition | undefined {
  return DUNGEONS.find((dungeon) => dungeon.id === id);
}
