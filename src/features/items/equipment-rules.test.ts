import { describe,expect,it } from 'vitest';
import { Character } from '../character/character';
import { CHARACTER_CLASSES } from '../character/character-class';
import { deserializeCharacter,serializeCharacter } from '../character/save-format';
import { ITEM_FAMILIES } from './item-families';
import { ITEM_CLASSES } from './item-classes';
import { EQUIPMENT_SLOTS } from './equipment-slot';
import { equipInSlot } from '../ui/equipment-actions';
import { gearScore } from './gear-score';
import { LOOT_TABLES } from '../loot/loot-tables';

describe('vincoli di classe',()=>{
  it('ogni famiglia ha una classe unica e tutti i set iniziali sono compatibili',()=>{
    expect(Object.keys(ITEM_CLASSES).sort()).toEqual(ITEM_FAMILIES.map(f=>f.id).sort());
    for(const kind of CHARACTER_CLASSES){
      const c=Character.createStarter();expect(c.completeCreation('Anima','male',kind)).toBe(true);
      expect(c.gearScore).toBe(80);expect(c.loadout().every(Boolean)).toBe(true);
      for(const slot of EQUIPMENT_SLOTS)expect(ITEM_CLASSES[c.equippedItem(slot)!.familyId]).toBe(kind);
    }
    expect(ITEM_CLASSES.hunter_bow).toBe('archer');expect(ITEM_CLASSES.thorn_bow).toBe('archer');
    expect(ITEM_CLASSES.forge_hammer).toBe('warrior');expect(ITEM_CLASSES.guardian_blade).toBe('warrior');
    expect(ITEM_CLASSES.arcane_staff).toBe('mage');expect(ITEM_CLASSES.cinder_orb).toBe('mage');
  });
  it('tutti gli slot e tutte le classi: equip e drag rifiutano gli oggetti incompatibili senza mutazioni',()=>{
    for(const kind of CHARACTER_CLASSES)for(const family of ITEM_FAMILIES){
      const c=Character.createStarter();c.completeCreation('Anima','female',kind);
      const [item]=c.addRolls([{familyId:family.id,rarity:'rare'}]),before=JSON.stringify(c.equipped);
      const allowed=family.characterClass===kind;
      expect(c.canEquip(item!.uid)).toBe(allowed);expect(c.equip(item!.uid)).toBe(allowed);
      expect(equipInSlot(c,item!.uid,family.slot)).toBe(allowed);
      if(!allowed)expect(JSON.stringify(c.equipped)).toBe(before);
      expect(c.inventory.some(i=>i.uid===item!.uid)).toBe(true);
    }
  });
  it('salvataggi storici: rimuove gli oggetti di altre classi dagli slot, li conserva nello zaino',()=>{
    const c=Character.createStarter();c.completeCreation('Anima','female','mage');
    const [bow]=c.addRolls([{familyId:'hunter_bow',rarity:'legendary',level:20}]);
    const data=JSON.parse(serializeCharacter(c));data.equipped.primary_hand=bow!.uid;
    const loaded=deserializeCharacter(JSON.stringify(data))!;
    expect(loaded.equipped.primary_hand).toBeNull();expect(loaded.inventory).toEqual(c.inventory);
    expect(loaded.loadout()[0]).toBeNull();expect(loaded.gearScore).toBe(60);
    c.equipped.primary_hand=bow!.uid;expect(c.gearScore).toBe(60);expect(c.loadout()[0]).toBeNull();
  });
  it('nessuna classe resta bloccata nel grind: GS 100 ottenibile prima di T3 e 200 prima di T4',()=>{
    for(const kind of CHARACTER_CLASSES){
      const c=Character.createStarter();c.completeCreation('Anima','male',kind);
      const best=(dungeons:readonly string[])=>EQUIPMENT_SLOTS.reduce((sum,slot)=>{
        const scores=[gearScore(c.equippedItem(slot)!)];
        for(const id of dungeons)for(const e of LOOT_TABLES[id]!.entries){
          const family=ITEM_FAMILIES.find(f=>f.id===e.familyId)!;
          if(family.slot===slot&&family.characterClass===kind)scores.push(gearScore(e));
        }
        return sum+Math.max(...scores);
      },0);
      expect(best(['crypt','swamp']),kind).toBeGreaterThanOrEqual(100);
      expect(best(['crypt','swamp','forge']),kind).toBeGreaterThanOrEqual(200);
    }
  });
});
