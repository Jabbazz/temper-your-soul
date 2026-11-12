import type { EquipmentSlot } from '../items/equipment-slot';
import type { Item } from '../items/item';
import type { CharacterClass } from './character-class';

export type BodyType = 'male' | 'female';
export interface CharacterAppearance {
  readonly characterClass?: CharacterClass;
  readonly body: BodyType;
  readonly equipment: Readonly<Partial<Record<EquipmentSlot, Item>>>;
}
/** Un personaggio senza classe scelta né equipaggiamento. */
export const DEFAULT_APPEARANCE: CharacterAppearance = { body: 'male', equipment: {} };
