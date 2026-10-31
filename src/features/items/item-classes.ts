import type { CharacterClass } from '../character/character-class';

/** Un solo vincolo di classe per famiglia, comune a tutte le rarità e ai pezzi novizio. */
export const ITEM_CLASSES:Readonly<Record<string,CharacterClass>> = {
  arcane_staff:'mage',storm_scepter:'mage',frost_grimoire:'mage',meteor_mantle:'mage',astral_boots:'mage',
  ossuary_lantern:'mage',tomb_shroud:'mage',cinder_orb:'mage',glacier_mirror:'mage',blizzard_veil:'mage',rime_boots:'mage',
  hunter_bow:'archer',thorn_bow:'archer',spore_fan:'archer',reed_mantle:'archer',wind_boots:'archer',
  guardian_blade:'warrior',forge_hammer:'warrior',frost_lance:'warrior',spirit_talisman:'warrior',ember_aegis:'warrior',forge_plate:'warrior',bog_boots:'warrior',grave_boots:'warrior',ember_treads:'warrior',
};
