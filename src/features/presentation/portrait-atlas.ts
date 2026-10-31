import type { EquipmentSlot } from '../items/equipment-slot';

/** Registrazione normalizzata degli atlanti illustrati: ogni cella rappresenta l'intero personaggio. */
export interface PortraitLayer { readonly atlas: 'equipment' | 'armor'; readonly column: number; readonly row: number; readonly slot: EquipmentSlot }
export const PORTRAIT_LAYERS: Readonly<Record<string,PortraitLayer>> = {
  arcane_staff:{atlas:'equipment',column:0,row:0,slot:'primary_hand'},
  hunter_bow:{atlas:'equipment',column:1,row:0,slot:'primary_hand'},
  storm_scepter:{atlas:'equipment',column:2,row:0,slot:'primary_hand'},
  guardian_blade:{atlas:'equipment',column:3,row:0,slot:'primary_hand'},
  forge_hammer:{atlas:'equipment',column:0,row:1,slot:'primary_hand'},
  frost_lance:{atlas:'equipment',column:1,row:1,slot:'primary_hand'},
  frost_grimoire:{atlas:'equipment',column:2,row:1,slot:'secondary_hand'},
  spirit_talisman:{atlas:'equipment',column:3,row:1,slot:'secondary_hand'},
  spore_fan:{atlas:'equipment',column:0,row:2,slot:'secondary_hand'},
  astral_boots:{atlas:'equipment',column:1,row:2,slot:'boots'},
  wind_boots:{atlas:'equipment',column:2,row:2,slot:'boots'},
  bog_boots:{atlas:'equipment',column:3,row:2,slot:'boots'},
  meteor_mantle:{atlas:'armor',column:0,row:0,slot:'armor'},
  ember_aegis:{atlas:'armor',column:1,row:0,slot:'armor'},
  tomb_shroud:{atlas:'armor',column:2,row:0,slot:'armor'},
  forge_plate:{atlas:'armor',column:3,row:0,slot:'armor'},
  blizzard_veil:{atlas:'armor',column:4,row:0,slot:'armor'},
};
