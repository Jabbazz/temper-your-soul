import { describe, expect, it } from 'vitest';
import { Character } from '../character/character';
import { equipInSlot } from './equipment-actions';

describe('equipaggiamento rapido e trascinamento', () => {
  it('equipaggia nello slot compatibile mantenendo il vecchio oggetto nello zaino', () => {
    const character = Character.createStarter();
    const old = character.equipped.primary_hand;
    const item = character.addRolls([{familyId:'hunter_bow',rarity:'rare'}])[0]!;
    expect(equipInSlot(character, item.uid, 'primary_hand')).toBe(true);
    expect(character.equippedItem('primary_hand')?.uid).toBe(item.uid);
    expect(character.itemByUid(old!)).toBeDefined();
    expect(character.loadout()[0]?.id).toBe('hunter_bow');
  });
  it('rifiuta uno slot incompatibile e uid estranei senza modificare equipaggiamento', () => {
    const character = Character.createStarter();
    const before = {...character.equipped};
    expect(equipInSlot(character, character.inventory[0]!.uid, 'boots')).toBe(false);
    expect(equipInSlot(character, 'uid-esterno', 'armor')).toBe(false);
    expect(character.equipped).toEqual(before);
  });
});
