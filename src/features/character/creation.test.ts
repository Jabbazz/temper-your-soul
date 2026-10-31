import { describe,expect,it } from 'vitest';
import { Character } from './character';
import { cleanCharacterName,STARTER_SETS } from './creation';
import { CHARACTER_CLASSES } from './character-class';
import { deserializeCharacter,serializeCharacter } from './save-format';
import { gearScore } from '../items/gear-score';
import { itemName } from '../items/item';

describe('creazione del personaggio',()=>{
  it('valida il nome e normalizza gli spazi senza accettare markup o stringhe enormi',()=>{
    expect(cleanCharacterName('  Eléna   d\'Oro  ')).toBe("Eléna d'Oro");
    for(const value of ['',null,'ab','a'.repeat(21),'<img src=x>','😀😀😀'])expect(cleanCharacterName(value)).toBeNull();
  });
  it('ogni classe parte con quattro pezzi bianchi, 20 GS ciascuno, e nessun progresso',()=>{
    for(const kind of CHARACTER_CLASSES){
      const character=Character.createStarter();expect(character.created).toBe(false);
      expect(character.completeCreation('Nuova anima','female',kind)).toBe(true);
      expect(character.created).toBe(true);expect(character.gearScore).toBe(80);
      expect(character.inventory.map(i=>i.familyId)).toEqual(STARTER_SETS[kind]);
      expect(character.inventory).toHaveLength(4);
      expect(character.inventory.every(i=>i.rarity==='common'&&gearScore(i)===20&&itemName(i).includes('novizio'))).toBe(true);
      expect(character.loadout().every(Boolean)).toBe(true);
      expect(character.totalXp).toBe(0);expect(character.records).toEqual({});
    }
  });
  it('la conferma è atomica, poi nome/sesso/classe restano fissi anche ricaricando',()=>{
    const character=Character.createStarter(),before=serializeCharacter(character);
    expect(character.completeCreation('<script>','male','mage')).toBe(false);expect(serializeCharacter(character)).toBe(before);
    expect(character.completeCreation('Luna','female','archer')).toBe(true);
    const text=serializeCharacter(character),loaded=deserializeCharacter(text)!;
    expect(loaded.completeCreation('Altro','male','warrior')).toBe(false);
    expect(loaded.chooseBody('male')).toBe(false);expect(loaded.chooseClass('mage')).toBe(false);
    expect(serializeCharacter(loaded)).toBe(text);
  });
  it('migra v4 senza cambiare oggetti, XP, classe o sesso già scelti; chiede solo il nome',()=>{
    const old=Character.createStarter();old.bodyType='female';old.characterClass='mage';old.totalXp=500;old.recordVictory('crypt',90);
    const data=JSON.parse(serializeCharacter(old));data.version=4;delete data.name;delete data.starterPending;
    const migrated=deserializeCharacter(JSON.stringify(data))!,before=JSON.stringify(migrated.inventory);
    expect(migrated.completeCreation('Elena','male','mage')).toBe(false);
    expect(migrated.completeCreation('Elena','female','warrior')).toBe(false);
    expect(migrated.completeCreation('Elena','female','mage')).toBe(true);
    expect(JSON.stringify(migrated.inventory)).toBe(before);expect(migrated.totalXp).toBe(500);expect(migrated.recordFor('crypt').clears).toBe(1);
  });
});
