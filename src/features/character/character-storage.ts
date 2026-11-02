import type { Character } from './character';
import type { Item } from '../items/item';
export const STORAGE_CAPACITY=20;
/** Posizioni stabili; i vecchi oggetti senza posizione occupano la prima casella libera. */
export function storageSlots(character:Character):readonly (Item|null)[] {
 const slots:(Item|null)[]=Array.from({length:STORAGE_CAPACITY},()=>null),pending:Item[]=[];
 for(const item of character.storage){const index=character.storagePositions[item.uid];
  if(index!==undefined&&Number.isInteger(index)&&index>=0&&index<STORAGE_CAPACITY&&slots[index]===null)slots[index]=item;
  else pending.push(item);
 }
 for(const item of pending){const index=slots.indexOf(null);if(index>=0)slots[index]=item;}
 return slots;
}
export function normalizeStoragePositions(character:Character):void {
 character.storagePositions=Object.fromEntries(storageSlots(character).flatMap((item,index)=>item?[[item.uid,index]]:[]));
}
export function depositItem(character:Character,uid:string,target?:number):boolean {
 const item=character.itemByUid(uid),slots=storageSlots(character),index=target??slots.indexOf(null);
 if(!item||character.storage.length>=STORAGE_CAPACITY||!Number.isInteger(index)||index<0||index>=STORAGE_CAPACITY||slots[index]!==null)return false;
 if(Object.values(character.equipped).includes(uid))return false;
 normalizeStoragePositions(character);
 if(!character.discard(uid))return false;
 character.storage.push(item);character.storagePositions[uid]=index;return true;
}
export function withdrawItem(character:Character,uid:string):boolean {
 const index=character.storage.findIndex(item=>item.uid===uid);if(index<0||character.itemByUid(uid))return false;
 character.inventory.push(character.storage.splice(index,1)[0]!);delete character.storagePositions[uid];return true;
}
export function moveStorageItem(character:Character,uid:string,target:number):boolean {
 const slots=storageSlots(character);
 if(!character.storage.some(item=>item.uid===uid)||!Number.isInteger(target)||target<0||target>=STORAGE_CAPACITY||slots[target]!==null)return false;
 normalizeStoragePositions(character);character.storagePositions[uid]=target;return true;
}
