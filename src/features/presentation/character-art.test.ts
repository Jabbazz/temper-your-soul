import { describe, expect, it } from 'vitest';
import { WEARABLES } from './character-art';
import { ITEM_FAMILIES } from '../items/item-families';
import { Character } from '../character/character';
import { deserializeCharacter, serializeCharacter } from '../character/save-format';

describe('strati indossabili dei ritratti e corpo scelto', () => {
  it('tutte le famiglie hanno uno strato proprio, nello slot della famiglia', () => {
    expect(Object.keys(WEARABLES)).toHaveLength(ITEM_FAMILIES.length);
    for (const family of ITEM_FAMILIES) expect(WEARABLES[family.id]?.slot, family.id).toBe(family.slot);
  });
  it('la scelta viene salvata e i vecchi dati mantengono inventario e XP', () => {
    const c=Character.createStarter();c.bodyType='female';c.totalXp=270;
    expect(deserializeCharacter(serializeCharacter(c))?.bodyType).toBe('female');
    const old=JSON.parse(serializeCharacter(c));old.version=2;delete old.bodyType;
    const restored=deserializeCharacter(JSON.stringify(old))!;
    expect(restored.bodyType).toBeNull();
    expect(restored.totalXp).toBe(270);expect(restored.inventory).toEqual(c.inventory);
    old.bodyType='invalido';expect(deserializeCharacter(JSON.stringify(old))?.bodyType).toBeNull();
  });
});
