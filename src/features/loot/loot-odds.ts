import type { LootEntry,LootTable } from './loot-table';
export interface LootOdds extends LootEntry {readonly chance:number;readonly conditionalChance:number}
/** Stesse voci/pesi dell'estrazione: percentuali per uccisione, incluso il mancato drop. */
export function lootOdds(table:LootTable):readonly LootOdds[] {
  const total=table.entries.reduce((n,e)=>n+Math.max(0,e.weight),0);
  return total>0?table.entries.filter(e=>e.weight>0).map(e=>({...e,chance:table.dropChance*e.weight/total,conditionalChance:e.weight/total})):[];
}
