import { requireElement } from './dom';
import { BACKPACK_SPRITE } from '../presentation/item-sprites';
import { renderPixelIcon } from './pixel-icon';

/** Menu iniziale: titolo e le due scelte. Non conosce le regole: espone solo i comandi. */
export class MainMenu {
  constructor(handlers: { readonly onDungeons: () => void; readonly onInventory: () => void }) {
    requireElement('menu-dungeons').addEventListener('click', handlers.onDungeons);
    requireElement('menu-inventory').prepend(renderPixelIcon(BACKPACK_SPRITE));
    requireElement('menu-inventory').addEventListener('click', handlers.onInventory);
  }

  /** Mostra una nota sotto i pulsanti (es. stato del salvataggio). */
  setNote(text: string): void {
    requireElement('menu-note').textContent = text;
  }
}
