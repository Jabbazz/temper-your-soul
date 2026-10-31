import type { Rarity } from '../items/rarity';

export interface LootEntry {
  readonly familyId:string;
  readonly rarity:Rarity;
  readonly level:number;
  readonly weight:number;
  readonly tier:'set'|'fallback';
}
/** Un tentativo per vittoria: prima la probabilità di drop, poi una sola voce pesata. */
export interface LootTable {
  readonly dungeonId:string;
  readonly setName:string;
  readonly dropChance:number;
  readonly itemLevel:number;
  readonly entries:readonly LootEntry[];
}
