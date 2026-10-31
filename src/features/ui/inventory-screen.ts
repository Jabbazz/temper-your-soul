import type { Character } from '../character/character';
import { EQUIPMENT_SLOTS, SLOT_LABELS, type EquipmentSlot } from '../items/equipment-slot';
import { familyById } from '../items/item-families';
import type { Item } from '../items/item';
import { countBySlot, visibleInventory, type InventoryFilter } from './inventory-view';
import { el, requireElement } from './dom';
import { renderItemCard } from './item-card';

/** Etichette dei comandi per slot (i tasti veri sono nell'Input Map). */
const SLOT_KEYS: Record<EquipmentSlot, string> = {
  primary_hand: 'MOUSE SX',
  secondary_hand: 'MOUSE DX',
  armor: 'Q',
  boots: 'E',
};

/**
 * Schermata dell'equipaggiamento: i 4 slot (uno per skill) e l'inventario. Cambiare un oggetto cambia la skill dello
 * slot. Non salva e non conosce le regole: ogni modifica passa da `Character` e avvisa con `onChange`.
 */
export class InventoryScreen {
  private filter: InventoryFilter = 'all';
  /** Oggetto di cui si e' chiesto di scartare e che attende la conferma (secondo clic). */
  private pendingDiscard: string | null = null;
  private character: Character | null = null;

  constructor(private readonly handlers: { readonly onChange: () => void; readonly onBack: () => void }) {
    requireElement('inventory-back').addEventListener('click', handlers.onBack);
  }

  render(character: Character): void {
    this.character = character;
    this.renderSlots(character);
    this.renderFilters(character);
    this.renderList(character);
  }

  private changed(): void {
    this.pendingDiscard = null;
    this.handlers.onChange();
    if (this.character !== null) this.render(this.character);
  }

  private renderSlots(character: Character): void {
    const root = requireElement('equipment-slots');
    root.replaceChildren();
    for (const slot of EQUIPMENT_SLOTS) {
      const panel = el('div', 'slot-panel');
      panel.append(el('div', 'slot-title', `${SLOT_LABELS[slot]} · ${SLOT_KEYS[slot]}`));
      const equipped = character.equippedItem(slot);
      const card = equipped === null ? null : renderItemCard(equipped);
      if (card === null) {
        panel.append(el('div', 'slot-empty', 'Vuoto: nessuna skill'));
      } else {
        panel.append(card);
        const remove = el('button', 'small-button', 'Rimuovi');
        remove.type = 'button';
        remove.addEventListener('click', () => {
          character.unequip(slot);
          this.changed();
        });
        panel.append(remove);
      }
      root.append(panel);
    }
  }

  private renderFilters(character: Character): void {
    const root = requireElement('inventory-filters');
    root.replaceChildren();
    const counts = countBySlot(character.inventory);
    const options: Array<[InventoryFilter, string]> = [
      ['all', `Tutti (${character.inventory.length})`],
      ...EQUIPMENT_SLOTS.map((slot): [InventoryFilter, string] => [slot, `${SLOT_LABELS[slot]} (${counts[slot]})`]),
    ];
    for (const [value, label] of options) {
      const button = el('button', value === this.filter ? 'chip active' : 'chip', label);
      button.type = 'button';
      button.addEventListener('click', () => {
        this.filter = value;
        this.pendingDiscard = null;
        this.render(character);
      });
      root.append(button);
    }
  }

  private renderList(character: Character): void {
    const root = requireElement('inventory-list');
    root.replaceChildren();
    const items = visibleInventory(character.inventory, this.filter);
    if (items.length === 0) {
      root.append(el('p', 'inventory-empty', 'Nessun oggetto qui. Sconfiggi i boss per ottenerne di nuovi.'));
      return;
    }
    for (const item of items) {
      const entry = this.renderEntry(character, item);
      if (entry !== null) root.append(entry);
    }
  }

  private renderEntry(character: Character, item: Item): HTMLElement | null {
    const family = familyById(item.familyId);
    if (family === undefined) return null;
    const equippedHere = character.equipped[family.slot] === item.uid;
    const card = renderItemCard(item, equippedHere ? { badge: 'Equipaggiato', extraClass: 'is-equipped' } : {});
    if (card === null) return null;

    const actions = el('div', 'item-actions');
    const equip = el('button', 'small-button primary', equippedHere ? 'Equipaggiato' : 'Equipaggia');
    equip.type = 'button';
    equip.disabled = equippedHere;
    equip.addEventListener('click', () => {
      if (character.equip(item.uid)) this.changed();
    });
    actions.append(equip);

    if (!equippedHere) {
      const confirming = this.pendingDiscard === item.uid;
      const discard = el('button', confirming ? 'small-button danger' : 'small-button', confirming ? 'Conferma: scarta' : 'Scarta');
      discard.type = 'button';
      discard.addEventListener('click', () => {
        if (!confirming) {
          this.pendingDiscard = item.uid;
          this.render(character);
          return;
        }
        if (character.discard(item.uid)) this.changed();
      });
      actions.append(discard);
    }
    card.append(actions);
    return card;
  }
}
