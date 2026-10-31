import type { Item } from '../items/item';
import { el, formatSeconds } from './dom';
import { renderItemCard } from './item-card';

/** Cosa e' cambiato nei record del dungeon dopo la vittoria. */
export interface VictoryRecord {
  readonly firstClear: boolean;
  readonly newBest: boolean;
  readonly seconds: number;
}

/**
 * Pannello del bottino mostrato alla vittoria: gli oggetti ottenuti (con la rarita' in colore) e i record.
 * Restituisce un elemento da mettere nella schermata di fine partita.
 */
export function renderLoot(items: readonly Item[], record: VictoryRecord, saved: boolean): HTMLElement {
  const root = el('div', 'loot-view');
  const notes: string[] = [];
  if (record.firstClear) notes.push('Prima vittoria in questo dungeon!');
  if (record.newBest) notes.push(`Nuovo record: ${formatSeconds(record.seconds)}`);
  if (notes.length > 0) root.append(el('p', 'loot-notes', notes.join(' · ')));

  root.append(el('h4', 'loot-title', items.length === 1 ? 'Bottino: 1 oggetto' : `Bottino: ${items.length} oggetti`));
  const grid = el('div', 'loot-grid');
  for (const item of items) {
    const card = renderItemCard(item, { badge: 'Nuovo' });
    if (card !== null) grid.append(card);
  }
  root.append(grid);
  root.append(
    el(
      'small',
      saved ? 'loot-saved' : 'loot-saved warning',
      saved
        ? 'Salvato in questo browser. Equipaggiali dal menu.'
        : 'Impossibile salvare in questo browser: i progressi andranno persi alla chiusura.',
    ),
  );
  return root;
}
