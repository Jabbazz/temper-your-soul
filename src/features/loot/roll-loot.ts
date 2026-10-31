import type { Rng } from '../../core/rng';
import type { ItemRoll } from '../items/item';
import type { LootTable } from './loot-table';

/** Tre estrazioni condizionate: drop → gruppo → pezzo. P(pezzo)=P(drop)×P(gruppo|drop)×P(pezzo|gruppo). */
export function rollLoot(table:LootTable,rng:Rng):ItemRoll[] {
  if(rng.next()>=table.dropChance)return [];
  const entries=table.entries.filter(e=>e.weight>0);
  const total=entries.reduce((sum,e)=>sum+e.weight,0);
  if(total<=0)return [];
  const setWeight=entries.filter(e=>e.tier==='set').reduce((n,e)=>n+e.weight,0);
  const tier=rng.next()<setWeight/total?'set':'fallback';
  const pool=entries.filter(e=>e.tier===tier),poolWeight=pool.reduce((n,e)=>n+e.weight,0);
  let threshold=rng.next()*poolWeight;
  for(const entry of pool){
    threshold-=entry.weight;
    if(threshold<0)return [{familyId:entry.familyId,rarity:entry.rarity,level:entry.level}];
  }
  const last=pool[pool.length-1]!;
  return [{familyId:last.familyId,rarity:last.rarity,level:last.level}];
}
