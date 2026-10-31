import type { Character } from '../character/character';
import type { EquipmentSlot } from '../items/equipment-slot';
import { familyById } from '../items/item-families';

/** Il drop accetta solo oggetti posseduti e compatibili: nessuna modifica in caso di rifiuto. */
export function equipInSlot(character: Character, uid: string, slot: EquipmentSlot): boolean {
  const item = character.itemByUid(uid);
  if (!item || familyById(item.familyId)?.slot !== slot) return false;
  return character.equip(uid);
}
