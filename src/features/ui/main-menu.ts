import { el, requireElement } from './dom';
import { CURRENT_RELEASE, GAME_VERSION_LABEL, describeBalanceChange } from '../../release-notes';
import { BACKPACK_SPRITE } from '../presentation/item-sprites';
import { renderPixelIcon } from './pixel-icon';

/** Menu iniziale: titolo e le scelte. Non conosce le regole: espone solo i comandi. */
export class MainMenu {
  constructor(handlers: {
    readonly onDungeons: () => void;
    readonly onInventory: () => void;
    readonly onBestiary: () => void;
  }) {
    requireElement('menu-dungeons').addEventListener('click', handlers.onDungeons);
    requireElement('menu-inventory').prepend(renderPixelIcon(BACKPACK_SPRITE));
    requireElement('menu-inventory').addEventListener('click', handlers.onInventory);
    requireElement('menu-bestiary').addEventListener('click', handlers.onBestiary);
    requireElement('menu-version').textContent = GAME_VERSION_LABEL;
    const notes = requireElement('menu-changelog-content');
    notes.append(el('h2', '', `Novità · ${GAME_VERSION_LABEL}`), el('small', '', CURRENT_RELEASE.date.split('-').reverse().join('/')));
    const changes = el('ul');
    for (const text of CURRENT_RELEASE.changes) changes.append(el('li', '', text));
    for (const change of CURRENT_RELEASE.balanceChanges) changes.append(el('li', '', describeBalanceChange(change)));
    notes.append(changes);
    if (CURRENT_RELEASE.balanceChanges.length === 0) notes.append(el('p', 'release-balance-note', 'Nessuna modifica ai valori di combattimento.'));
    requireElement('menu-changelog').addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        requireElement<HTMLDetailsElement>('menu-changelog').open = false;
        requireElement<HTMLElement>('menu-changelog-toggle').focus();
      }
    });
  }

  /** Mostra una nota sotto i pulsanti (es. stato del salvataggio). */
  setNote(text: string): void {
    requireElement('menu-note').textContent = text;
  }
}
