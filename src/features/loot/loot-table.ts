import type { Rarity } from '../items/rarity';

/**
 * Il bottino di un boss, per dungeon. Dati di sola lettura (valori provvisori in `loot-tables.ts`).
 * Per ogni oggetto estratto si sceglie prima il gruppo (esclusivo o generico), poi la famiglia nel gruppo, poi la rarita'.
 */
export interface LootTable {
  readonly dungeonId: string;
  /** Oggetti che cadono sempre alla vittoria. */
  readonly guaranteedDrops: number;
  /** Probabilita' (0..1) di un oggetto in piu'. */
  readonly bonusDropChance: number;
  /** Pesi relativi (non probabilita': non serve che sommino a 100) di ciascuna rarita'. */
  readonly rarityWeights: Readonly<Record<Rarity, number>>;
  /** Probabilita' (0..1) che un oggetto sia scelto tra le famiglie esclusive di questo dungeon. */
  readonly exclusiveChance: number;
  readonly exclusiveFamilyIds: readonly string[];
  readonly genericFamilyIds: readonly string[];
}
