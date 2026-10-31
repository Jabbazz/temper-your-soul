import type { Item } from './item';
import type { Rarity } from './rarity';

/** Valori provvisori: venti livelli oggetto, fasce di rarità senza sovrapposizioni, tetto 100 per pezzo. */
export const GEAR_SCORE = { maxItemLevel:20, maximum:100, base:{common:20,uncommon:40,rare:60,epic:80,legendary:100} } as const;
export function cleanItemLevel(value:unknown):number {
  return typeof value==='number' && Number.isSafeInteger(value) ? Math.max(1,Math.min(GEAR_SCORE.maxItemLevel,value)) : 1;
}
export function itemLevel(item:Pick<Item,'level'>):number { return cleanItemLevel(item.level); }
export function gearScore(item:{readonly rarity:Rarity;readonly level?:number}):number {
  return Math.min(GEAR_SCORE.maximum,GEAR_SCORE.base[item.rarity]+itemLevel(item)-1);
}
