import type { EquipmentSlot } from '../items/equipment-slot';
import type { Item } from '../items/item';
import type { CharacterClass } from './character-class';

export type BodyType = 'male' | 'female';
export interface CharacterAppearance {
  readonly characterClass?: CharacterClass;
  readonly body: BodyType;
  readonly equipment: Readonly<Partial<Record<EquipmentSlot, Item>>>;
}
