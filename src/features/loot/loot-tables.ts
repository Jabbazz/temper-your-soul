import type { Rarity } from '../items/rarity';
import type { LootEntry,LootTable } from './loot-table';
export const BOSS_DROP_CHANCE=.25;
/** Pesi per pezzo: 4×1 contro 4×2 → un terzo set e due terzi verdi, poi 25% per slot. */
export const LOOT_GROUP_WEIGHTS={set:1,fallback:2} as const;

/** Pool espliciti: quattro pezzi di set e una sola alternativa di rarità inferiore per slot. Valori provvisori. */
function table(dungeonId:string,setName:string,dropChance:number,level:number,set:readonly string[],setRarity:Rarity,fallback:readonly string[]):LootTable {
  const entries:LootEntry[]=[
    ...set.map(familyId=>({familyId,rarity:setRarity,level,weight:LOOT_GROUP_WEIGHTS.set,tier:'set' as const})),
    ...fallback.map(familyId=>({familyId,rarity:'uncommon' as const,level:Math.max(1,level-4),weight:LOOT_GROUP_WEIGHTS.fallback,tier:'fallback' as const})),
  ];
  return {dungeonId,setName,dropChance,itemLevel:level,entries};
}
export const LOOT_TABLES:Readonly<Record<string,LootTable>> = {
  crypt:table('crypt','Reliquie dell’ossario',BOSS_DROP_CHANCE,1,['guardian_blade','ossuary_lantern','tomb_shroud','grave_boots'],'rare',['hunter_bow','frost_grimoire','ember_aegis','wind_boots']),
  swamp:table('swamp','Custode dei rovi',BOSS_DROP_CHANCE,5,['thorn_bow','spore_fan','reed_mantle','bog_boots'],'epic',['arcane_staff','spirit_talisman','meteor_mantle','astral_boots']),
  forge:table('forge','Anima della fornace',BOSS_DROP_CHANCE,10,['forge_hammer','cinder_orb','forge_plate','ember_treads'],'legendary',['storm_scepter','spore_fan','reed_mantle','bog_boots']),
  glacier:table('glacier','Cuore del ghiacciaio',BOSS_DROP_CHANCE,15,['frost_lance','glacier_mirror','blizzard_veil','rime_boots'],'legendary',['forge_hammer','cinder_orb','forge_plate','ember_treads']),
};
export function lootTableFor(dungeonId:string):LootTable {
  const result=Object.hasOwn(LOOT_TABLES,dungeonId)?LOOT_TABLES[dungeonId]:undefined;
  if(!result)throw Error(`Nessuna tabella di bottino per il dungeon '${dungeonId}'`);
  return result;
}
