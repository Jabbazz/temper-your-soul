import type { CharacterClass } from './character-class';

export const CHARACTER_NAME = {minimum:3,maximum:20} as const;
export function cleanCharacterName(value:unknown):string|null {
  if(typeof value!=='string')return null;
  const name=value.trim().replace(/\s+/gu,' ');
  return name.length>=CHARACTER_NAME.minimum && name.length<=CHARACTER_NAME.maximum && /^[\p{L}\p{N}][\p{L}\p{N} '\-]*$/u.test(name) ? name : null;
}
/** Set bianchi di creazione. Stesse famiglie/abilità esistenti, nessun nuovo asset o schema di combattimento. */
export const STARTER_SETS:Readonly<Record<CharacterClass,readonly string[]>> = {
  warrior:['guardian_blade','spirit_talisman','ember_aegis','bog_boots'],
  archer:['hunter_bow','spore_fan','reed_mantle','wind_boots'],
  mage:['arcane_staff','frost_grimoire','meteor_mantle','astral_boots'],
};
export const NOVICE_NAMES:Readonly<Record<string,string>> = {
  reed_mantle:'Corpetto novizio',
  arcane_staff:'Bastone novizio',hunter_bow:'Arco novizio',storm_scepter:'Scettro novizio',guardian_blade:'Spada novizio',forge_hammer:'Martello novizio',frost_lance:'Lancia novizio',
  frost_grimoire:'Tomo novizio',spirit_talisman:'Talismano novizio',spore_fan:'Ventaglio novizio',meteor_mantle:'Tunica novizio',ember_aegis:'Armatura novizio',tomb_shroud:'Mantello novizio',forge_plate:'Corazza novizio',blizzard_veil:'Veste novizio',astral_boots:'Calzari novizio',wind_boots:'Stivali novizio',bog_boots:'Schinieri novizio',
};
