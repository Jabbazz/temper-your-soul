import { expect, it } from 'vitest';
import { familyById } from '../../items/item-families';
import { resolveItemSkill } from '../../items/item';
import { manaCost } from '../../skills/mana';
import { RARITIES } from '../../items/rarity';
import { ARCANE_BOLT, FROST_ORB } from '../../skills/mage-skills';
import { HUNTER_ARROW } from '../../items/item-skills';
import { tuneMageSkill } from './tuning';
it('il danno cresce senza arrotondare prima dei modificatori e la gittata resta invariata',()=>{
  for(const source of [ARCANE_BOLT,FROST_ORB]){
    const before=structuredClone(source),tuned=tuneMageSkill(source);
    if(tuned.effect.kind!=='projectile' || source.effect.kind!=='projectile')throw new Error('Atteso proiettile');
    expect(tuned.effect.projectile.damage).toBeCloseTo(source.effect.projectile.damage*1.35);
    expect(tuned.effect.projectile.speed).toBe(source.effect.projectile.speed*1.5);
    expect(tuned.effect.projectile.speed*tuned.effect.projectile.lifetime).toBeCloseTo(source.effect.projectile.speed*source.effect.projectile.lifetime);
    expect(source).toEqual(before);
  }
});
it('le staffe sono gratuite a tutte le rarità, i tomi mantengono il consumo di mana',()=>{
  for(const rarity of RARITIES){
    for(const id of ['arcane_staff','storm_scepter']) expect(manaCost(resolveItemSkill(familyById(id)!,rarity))).toBe(0);
    expect(manaCost(resolveItemSkill(familyById('frost_grimoire')!,rarity))).toBeGreaterThan(0);
  }
});
it('la freccia rallenta del 15% mantenendo danno e mobilità',()=>{
  const skill=familyById('hunter_bow')!.skill;
  expect(skill.cooldown).toBeCloseTo(HUNTER_ARROW.cooldown*1.15);
  expect(skill.effect).toEqual(HUNTER_ARROW.effect);
});
