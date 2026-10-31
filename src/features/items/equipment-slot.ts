/** Gli slot di equipaggiamento: ciascuno corrisponde a uno slot di skill del personaggio. */
export type EquipmentSlot = 'primary_hand' | 'secondary_hand' | 'armor' | 'boots';

/**
 * Gli slot nell'ordine degli slot di skill (0..3): mano primaria = skill 1 (clic sinistro, tenuto premuto),
 * mano secondaria = skill 2 (clic destro), armatura = skill 3 (Q), stivali = skill 4 (E).
 */
export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = ['primary_hand', 'secondary_hand', 'armor', 'boots'];

/** Nomi visibili al giocatore (italiano). */
export const SLOT_LABELS: Readonly<Record<EquipmentSlot, string>> = {
  primary_hand: 'Mano primaria',
  secondary_hand: 'Mano secondaria',
  armor: 'Armatura',
  boots: 'Stivali',
};

/** Indice dello slot di skill (0..3) che lo slot di equipaggiamento alimenta. */
export function slotIndex(slot: EquipmentSlot): number {
  return EQUIPMENT_SLOTS.indexOf(slot);
}

export function isEquipmentSlot(value: unknown): value is EquipmentSlot {
  return typeof value === 'string' && (EQUIPMENT_SLOTS as readonly string[]).includes(value);
}
