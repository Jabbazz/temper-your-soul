import { expect, it } from 'vitest';
import { Character } from '../character/character';
import { Player } from '../player/player';
import { CRYPT } from '../dungeons/crypt';
import { RARITIES, RARITY_STATS } from '../items/rarity';
import { manaCost } from './mana';
it('riduce del 20% la rigenerazione totale a ogni rarità, conservando riserve e costi',()=>{
  const before={warrior:{base:5,equipment:0,skills:1.7,maxMana:60},archer:{base:6,equipment:0,skills:2,maxMana:80},mage:{base:10,equipment:3.5,skills:1.6,maxMana:150}};
  for(const kind of ['warrior','archer','mage'] as const){
    for(const rarity of RARITIES){
      const character=Character.createStarter(kind);character.inventory.forEach(item=>Object.assign(item,{rarity}));
      const loadout=character.loadout(),player=new Player(CRYPT.arena,loadout,undefined,kind),r=RARITY_STATS[rarity],old=before[kind];
      const previous=old.base+old.equipment*r.powerMultiplier+old.skills+4*(1/r.cooldownMultiplier-1)*8;
      expect(player.manaRegeneration,`${kind}/${rarity}`).toBeCloseTo(previous*0.8,10);
      expect(player.maxMana).toBe(old.maxMana+(kind==='mage'?50*r.powerMultiplier:0));
      expect(manaCost(loadout[0]!)).toBe(0);
    }
  }
});
it('recupera gli MP realmente al nuovo ritmo nel tempo senza dipendere dal frame rate',()=>{
  const loadout=Character.createStarter('mage').loadout(),a=new Player(CRYPT.arena,loadout,undefined,'mage'),b=new Player(CRYPT.arena,loadout,undefined,'mage');
  a.mana=0;b.mana=0;for(let i=0;i<60;i++)a.tick(1/60);for(let i=0;i<120;i++)b.tick(1/120);
  expect(a.manaRegeneration).toBeCloseTo(12.08);expect(a.mana).toBeCloseTo(12.08);expect(b.mana).toBeCloseTo(a.mana,10);
  expect(loadout.slice(1).map(skill=>manaCost(skill!))).toEqual([16,22,15]);
});
