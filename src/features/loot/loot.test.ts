import { describe,expect,it } from 'vitest';
import { SeededRng,type Rng } from '../../core/rng';
import { DUNGEONS } from '../dungeons/dungeons';
import { ITEM_FAMILIES,familyById } from '../items/item-families';
import { EQUIPMENT_SLOTS } from '../items/equipment-slot';
import { RARITIES } from '../items/rarity';
import { LOOT_TABLES,lootTableFor } from './loot-tables';
import { rollLoot } from './roll-loot';
import { lootOdds } from './loot-odds';

function scripted(values:readonly number[]):Rng {let i=0;return {next(){if(i>=values.length)throw Error('Estrazione inattesa');return values[i++]!;}};}
describe('pool propri dei boss',()=>{
  it('un set di quattro slot e una alternativa più debole per slot, senza bianco e senza filtro di classe',()=>{
    expect(Object.keys(LOOT_TABLES).sort()).toEqual(DUNGEONS.map(d=>d.id).sort());
    expect(()=>lootTableFor('toString')).toThrow();
    const setIds=new Set<string>(),allIds=new Set<string>();
    for(const table of Object.values(LOOT_TABLES)){
      expect(table.entries).toHaveLength(8);expect(table.dropChance).toBeGreaterThan(0);expect(table.dropChance).toBeLessThan(1);
      expect(new Set(table.entries.map(e=>e.familyId)).size).toBe(8);
      for(const slot of EQUIPMENT_SLOTS){
        const entries=table.entries.filter(e=>familyById(e.familyId)?.slot===slot);
        expect(entries,table.dungeonId+' '+slot).toHaveLength(2);
        const main=entries.find(e=>e.tier==='set')!,fallback=entries.find(e=>e.tier==='fallback')!;
        expect(main).toBeDefined();expect(fallback).toBeDefined();
        expect(RARITIES.indexOf(fallback.rarity)).toBeLessThan(RARITIES.indexOf(main.rarity));
        expect(fallback.level).toBeLessThanOrEqual(main.level);
        expect(setIds.has(main.familyId)).toBe(false);setIds.add(main.familyId);
      }
      for(const entry of table.entries){
        expect(familyById(entry.familyId)).toBeDefined();expect(entry.weight).toBeGreaterThan(0);expect(entry.rarity).not.toBe('common');allIds.add(entry.familyId);
      }
    }
    expect([...allIds].sort()).toEqual(ITEM_FAMILIES.map(f=>f.id).sort());
    expect(lootTableFor('crypt').entries.every(e=>RARITIES.indexOf(e.rarity)<=2)).toBe(true);
  });
  it('il confine di drop è esclusivo e non può assegnare più di un oggetto',()=>{
    const t=lootTableFor('crypt');expect(rollLoot(t,scripted([.25]))).toEqual([]);
    expect(rollLoot(t,scripted([.2499,0,0]))).toEqual([{familyId:'guardian_blade',rarity:'rare',level:1}]);
    expect(rollLoot(t,scripted([0,.99999,.99999]))).toEqual([{familyId:'wind_boots',rarity:'uncommon',level:1}]);
  });
  it('selezione pesata ai confini e pesi zero esclusi',()=>{
    const t=lootTableFor('crypt');
    expect(rollLoot(t,scripted([0,1/3-1e-8,.249999]))[0]!.familyId).toBe('guardian_blade');
    expect(rollLoot(t,scripted([0,0,.25]))[0]!.familyId).toBe('ossuary_lantern');
    expect(rollLoot(t,scripted([0,1/3,0]))[0]!.familyId).toBe('hunter_bow');
    const zero={...t,entries:t.entries.map((e,i)=>({...e,weight:i===0?0:e.weight}))};
    expect(rollLoot(zero,scripted([0,0,0]))[0]!.familyId).toBe('ossuary_lantern');
    expect(rollLoot({...t,entries:[]},scripted([0]))).toEqual([]);
  });
  it('dopo il drop: un terzo set, due terzi verdi, poi quattro pezzi equiprobabili',()=>{
    for(const table of Object.values(LOOT_TABLES)){
      const rows=lootOdds(table);
      expect(rows.reduce((n,e)=>n+e.conditionalChance,0)).toBeCloseTo(1,12);
      for(const tier of ['set','fallback'] as const){
        const group=rows.filter(e=>e.tier===tier),share=tier==='set'?1/3:2/3;
        expect(group.reduce((n,e)=>n+e.conditionalChance,0)).toBeCloseTo(share,12);
        for(const entry of group){
          expect(entry.conditionalChance).toBeCloseTo(share*.25,12);
          expect(entry.chance).toBeCloseTo(.25*share*.25,12);
          if(tier==='fallback')expect(entry.rarity).toBe('uncommon');
        }
      }
    }
  });
  it('ogni boss dà solo le proprie combinazioni, deterministiche a parità di seme',()=>{
    for(const table of Object.values(LOOT_TABLES)){
      const run=(seed:number)=>{const rng=new SeededRng(seed);return Array.from({length:300},()=>rollLoot(table,rng));};
      expect(run(1)).toEqual(run(1));expect(run(1)).not.toEqual(run(2));
      for(const roll of run(3).flat())expect(table.entries.some(e=>e.familyId===roll.familyId&&e.rarity===roll.rarity&&e.level===roll.level)).toBe(true);
    }
    expect(lootTableFor('swamp').entries.filter(e=>e.tier==='set').map(e=>e.familyId)).toEqual(['thorn_bow','spore_fan','reed_mantle','bog_boots']);
  });
  it('probabilità pubblicate e distribuzione simulata coincidono, incluso nessun drop',()=>{
    let previousLevel=0,previousReward=0;
    for(const table of Object.values(LOOT_TABLES)){
      const odds=lootOdds(table),rng=new SeededRng(12345),counts=new Map<string,number>(),trials=12000;let empty=0;
      expect(odds.reduce((n,e)=>n+e.chance,0)).toBeCloseTo(table.dropChance,12);
      const reward=odds.reduce((n,e)=>n+e.chance*(RARITIES.indexOf(e.rarity)*20+e.level),0);
      expect(table.dropChance).toBe(.25);expect(table.itemLevel).toBeGreaterThan(previousLevel);expect(reward).toBeGreaterThan(previousReward);
      previousLevel=table.itemLevel;previousReward=reward;
      for(let i=0;i<trials;i++){const rolls=rollLoot(table,rng);if(!rolls.length)empty++;for(const r of rolls){const key=r.familyId+':'+r.rarity;counts.set(key,(counts.get(key)??0)+1);}}
      expect(Math.abs(empty/trials-(1-table.dropChance))).toBeLessThan(.015);
      for(const row of odds)expect(Math.abs((counts.get(row.familyId+':'+row.rarity)??0)/trials-row.chance)).toBeLessThan(.012);
      expect(counts.size).toBe(8);
    }
  });
  it('non modifica i dati e non usa casualità esterna',()=>{
    const table=lootTableFor('glacier'),before=structuredClone(table),random=Math.random;
    Math.random=()=>{throw Error('Math.random');};try{rollLoot(table,new SeededRng(1));}finally{Math.random=random;}
    expect(table).toEqual(before);
  });
});
