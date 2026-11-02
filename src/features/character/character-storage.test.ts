import {describe,it,expect} from 'vitest';
import {Character} from './character';
import {depositItem,withdrawItem,moveStorageItem,storageSlots,STORAGE_CAPACITY} from './character-storage';
import {serializeCharacter,deserializeCharacter} from './save-format';
import {CharacterRoster,serializeRoster,deserializeRoster} from './character-roster';
function hero(){const c=Character.createStarter();c.completeCreation('Custode','female','mage');return c;}
function item(c:Character){return c.addRolls([{familyId:'arcane_staff',rarity:'uncommon'}])[0]!;}
describe('deposito con venti caselle persistenti',()=>{
 it('salva la casella scelta senza compattarla e conserva identità e migliorie',()=>{
  const c=hero(),a=item(c),b=item(c);c.inventory[c.inventory.indexOf(a)]={...a,upgrade:3};
  expect(depositItem(c,a.uid,11)).toBe(true);expect(depositItem(c,b.uid,0)).toBe(true);expect(storageSlots(c)).toHaveLength(20);
  const loaded=deserializeCharacter(serializeCharacter(c))!;expect(storageSlots(loaded)[11]).toEqual({...a,upgrade:3});expect(storageSlots(loaded)[0]!.uid).toBe(b.uid);
  expect(storageSlots(loaded)[10]).toBeNull();expect(loaded.storagePositions).toEqual(c.storagePositions);
 });
 it('il ventunesimo oggetto resta nello zaino, senza perdita né rimpiazzo',()=>{
  const c=hero();for(let i=0;i<STORAGE_CAPACITY;i++)expect(depositItem(c,item(c).uid,i)).toBe(true);
  const extra=item(c),before=serializeCharacter(c);expect(depositItem(c,extra.uid)).toBe(false);expect(serializeCharacter(c)).toBe(before);
  expect(c.itemByUid(extra.uid)).toBe(extra);expect(c.storage).toHaveLength(20);
 });
 it('rifiuta caselle occupate/invalidi e oggetti indossati, ma accetta lo spostamento in una casella libera',()=>{
  const c=hero(),a=item(c),b=item(c);expect(depositItem(c,a.uid,2)).toBe(true);
  for(const index of [2,-1,20,1.5])expect(depositItem(c,b.uid,index)).toBe(false);
  expect(depositItem(c,c.equipped.primary_hand!,5)).toBe(false);
  expect(moveStorageItem(c,a.uid,12)).toBe(true);expect(storageSlots(c)[2]).toBeNull();expect(storageSlots(c)[12]!.uid).toBe(a.uid);
  expect(moveStorageItem(c,'inesistente',1)).toBe(false);
 });
 it('ritirare e ridepositare non duplica oggetti e libera la posizione precedente',()=>{
  const c=hero(),a=item(c);depositItem(c,a.uid,19);expect(withdrawItem(c,a.uid)).toBe(true);expect(withdrawItem(c,a.uid)).toBe(false);
  expect(storageSlots(c)[19]).toBeNull();expect(c.inventory.filter(i=>i.uid===a.uid)).toHaveLength(1);
  expect(depositItem(c,a.uid,3)).toBe(true);expect(storageSlots(c)[3]!.uid).toBe(a.uid);
 });
 it('migra v8 preservando oro, profili e oggetti del deposito; ripara posizioni duplicate senza perdere pezzi',()=>{
  const c=hero(),a=item(c),b=item(c);depositItem(c,a.uid);depositItem(c,b.uid);const roster=new CharacterRoster();roster.add(c);roster.gold=777;
  const raw=JSON.parse(serializeRoster(roster));raw.version=8;raw.characters[0].character.version=8;delete raw.characters[0].character.storagePositions;
  const loaded=deserializeRoster(JSON.stringify(raw))!;expect(loaded.gold).toBe(777);expect(loaded.active!.character.storage).toEqual(c.storage);expect(storageSlots(loaded.active!.character).filter(Boolean)).toHaveLength(2);
  const bad=JSON.parse(serializeCharacter(c));bad.storagePositions={[a.uid]:5,[b.uid]:5,inesistente:8};const fixed=deserializeCharacter(JSON.stringify(bad))!;
  expect(fixed.storage).toEqual(c.storage);expect(storageSlots(fixed).filter(Boolean)).toHaveLength(2);expect(new Set(Object.values(fixed.storagePositions)).size).toBe(2);
 });
 it('un vecchio deposito oltre capienza conserva gli oggetti eccedenti, ancora ritirabili',()=>{
  const c=hero();for(let i=0;i<22;i++){const added=item(c);c.discard(added.uid);c.storage.push(added);}
  const loaded=deserializeCharacter(serializeCharacter(c))!;expect(loaded.storage).toHaveLength(22);expect(storageSlots(loaded).filter(Boolean)).toHaveLength(20);
  expect(withdrawItem(loaded,loaded.storage[21]!.uid)).toBe(true);expect(loaded.storage).toHaveLength(21);
 });
});
