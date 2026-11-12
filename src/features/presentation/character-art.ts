import type { EquipmentSlot } from '../items/equipment-slot';

export interface WearableArt { readonly slot: EquipmentSlot; readonly shape: string; readonly color: string; readonly light: string }
/** Forme e colori degli oggetti indossati nei ritratti illustrati; i corpi in gioco e le icone usano SHADOW_EQUIPMENT. */
export const WEARABLES: Readonly<Record<string, WearableArt>> = {
  ossuary_lantern:{slot:'secondary_hand',shape:'lantern',color:'#778d76',light:'#d5edba'},
  grave_boots:{slot:'boots',shape:'grave',color:'#706e64',light:'#ded7b8'},
  thorn_bow:{slot:'primary_hand',shape:'thorn-bow',color:'#5b7c3d',light:'#cadb83'},
  reed_mantle:{slot:'armor',shape:'reed',color:'#536e42',light:'#c2ce86'},
  cinder_orb:{slot:'secondary_hand',shape:'cinder',color:'#8a4934',light:'#ffb45d'},
  ember_treads:{slot:'boots',shape:'ember',color:'#62483f',light:'#ff9b48'},
  glacier_mirror:{slot:'secondary_hand',shape:'mirror',color:'#6aafc7',light:'#e5faff'},
  rime_boots:{slot:'boots',shape:'rime',color:'#447f9c',light:'#aeeaff'},
  arcane_staff: {slot:'primary_hand',shape:'staff',color:'#9366ce',light:'#e0c6ff'},
  hunter_bow: {slot:'primary_hand',shape:'bow',color:'#8a643b',light:'#aee081'},
  storm_scepter: {slot:'primary_hand',shape:'scepter',color:'#586fb2',light:'#ffe98d'},
  guardian_blade: {slot:'primary_hand',shape:'sword',color:'#8895a5',light:'#f5dba0'},
  forge_hammer: {slot:'primary_hand',shape:'hammer',color:'#69433e',light:'#ffad57'},
  frost_lance: {slot:'primary_hand',shape:'lance',color:'#4ca4c8',light:'#c6faff'},
  frost_grimoire: {slot:'secondary_hand',shape:'book',color:'#395da4',light:'#9ae4ff'},
  spirit_talisman: {slot:'secondary_hand',shape:'talisman',color:'#437f7a',light:'#afffe0'},
  spore_fan: {slot:'secondary_hand',shape:'fan',color:'#647d42',light:'#dfb0f2'},
  meteor_mantle: {slot:'armor',shape:'mantle',color:'#66334c',light:'#ee9d60'},
  ember_aegis: {slot:'armor',shape:'aegis',color:'#874c3a',light:'#ffcf6b'},
  tomb_shroud: {slot:'armor',shape:'shroud',color:'#494359',light:'#b5a9d4'},
  forge_plate: {slot:'armor',shape:'plate',color:'#666777',light:'#ff9351'},
  blizzard_veil: {slot:'armor',shape:'veil',color:'#639fbd',light:'#c0efff'},
  astral_boots: {slot:'boots',shape:'astral',color:'#65488f',light:'#d6b4ff'},
  wind_boots: {slot:'boots',shape:'wind',color:'#4d7a72',light:'#c7f9d8'},
  bog_boots: {slot:'boots',shape:'bog',color:'#646343',light:'#c0d475'},
};
export interface CharacterPixels { readonly width: number; readonly height: number; readonly pixels: readonly (readonly string[])[] }
