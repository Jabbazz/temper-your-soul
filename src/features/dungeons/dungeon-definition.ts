import type { ArenaDefinition } from '../arena/arena';
import type { BossDefinition } from '../boss/boss-definition';

/**
 * Un dungeon: una mappa e un boss. Dati di sola lettura. L'id e' stabile (lo usano salvataggi, tabelle di bottino
 * e test): non rinominarlo. I testi sono in italiano e provvisori (vedi docs/game-design.md).
 */
export interface DungeonDefinition {
  readonly id: string;
  readonly name: string;
  /** Frase breve sotto il nome. */
  readonly tagline: string;
  readonly description: string;
  /** Pericolo indicativo da 1 a 4, solo per mostrarlo nel menu (non cambia le regole). */
  readonly danger: 1 | 2 | 3 | 4;
  readonly arena: ArenaDefinition;
  readonly boss: BossDefinition;
}
