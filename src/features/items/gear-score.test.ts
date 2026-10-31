import { describe,expect,it } from 'vitest';
import { gearScore,cleanItemLevel } from './gear-score';
import { RARITIES } from './rarity';
import { Character } from '../character/character';
import { deserializeCharacter,serializeCharacter } from '../character/save-format';

describe('gear score e livello oggetto',()=>{
  it('rispetta 20/40/60/80/100 al livello 1 e mantiene fasce crescenti entro 100',()=>{
    expect(RARITIES.map(rarity=>gearScore({rarity,level:1}))).toEqual([20,40,60,80,100]);
    expect(gearScore({rarity:'uncommon',level:5})).toBe(44);
    expect(gearScore({rarity:'epic',level:20})).toBe(99);
    expect(gearScore({rarity:'legendary',level:20})).toBe(100);
    for(const invalid of [null,NaN,Infinity,'5',2.3])expect(cleanItemLevel(invalid)).toBe(1);
    expect(cleanItemLevel(999)).toBe(20);expect(cleanItemLevel(-5)).toBe(1);
  });
  it('salva e valida il livello; equipaggiare e rimuovere aggiornano il totale, senza salvare GS derivati',()=>{
    const character=Character.createStarter(),[bow]=character.addRolls([{familyId:'hunter_bow',rarity:'rare',level:10}]);
    character.equip(bow!.uid);expect(character.gearScore).toBe(129);
    const loaded=deserializeCharacter(serializeCharacter(character))!;
    expect(loaded.equippedItem('primary_hand')?.level).toBe(10);expect(loaded.gearScore).toBe(129);
    loaded.unequip('primary_hand');expect(loaded.gearScore).toBe(60);
    const data=JSON.parse(serializeCharacter(character));data.items.find((i:{uid:string})=>i.uid===bow!.uid).level='invalid';
    expect(deserializeCharacter(JSON.stringify(data))!.equippedItem('primary_hand')?.level??1).toBe(1);
    expect(serializeCharacter(character)).not.toContain('gearScore');
  });
});
