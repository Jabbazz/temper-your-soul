import type { SkillDefinition } from './skill-definition';
/** Costi e rigenerazione provvisori, condivisi da regole, tooltip e HUD. */
export const MANA = { maximum: 100, regeneration: 6.4, costs: { projectile: 2, ground_blast: 22, dash: 15, melee_arc: 3, buff: 18, summon: 25 } };
const BASE_SPELL_MANA: Readonly<Record<string, number>> = { arcane_bolt:0, frost_orb:16, meteor:22, astral_step:15, hunter_bow:1, storm_scepter:0, guardian_blade:3, forge_hammer:12, frost_lance:8, spirit_talisman:18, spore_fan:20, ember_aegis:22, tomb_shroud:28, forge_plate:30, blizzard_veil:26, wind_boots:10, bog_boots:18 };
const DUNGEON_SPELL_MANA:Readonly<Record<string,number>>={ossuary_lantern:17,grave_boots:18,thorn_bow:3,reed_mantle:24,cinder_orb:19,ember_treads:19,glacier_mirror:23,rime_boots:13};
export const SPELL_MANA:Readonly<Record<string,number>>={...BASE_SPELL_MANA,...DUNGEON_SPELL_MANA};
export function manaCost(skill: SkillDefinition): number { return skill.manaCost ?? SPELL_MANA[skill.id] ?? MANA.costs[skill.effect.kind]; }
/** Riduzione uniforme del 20% rispetto alla prima taratura; include il recupero da rarità. */
export const RARITY_MANA_REGENERATION = 6.4;
export const MANA_REGEN_BONUS = { projectile: 0.16, ground_blast: 0.64, dash: 0.32, melee_arc: 0.08, buff: 0.48, summon: 0.64 };
export function manaBonus(skill: SkillDefinition): number { return skill.manaRegeneration ?? MANA_REGEN_BONUS[skill.effect.kind]; }
