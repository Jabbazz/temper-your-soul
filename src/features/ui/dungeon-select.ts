import type { Character } from '../character/character';
import type { DungeonDefinition } from '../dungeons/dungeon-definition';
import { DUNGEONS } from '../dungeons/dungeons';
import { el, formatSeconds, requireElement } from './dom';

/** Scelta del dungeon: una scheda per ognuno, con boss, pericolo e record del personaggio. */
export class DungeonSelect {
  private readonly list = requireElement('dungeon-list');

  constructor(
    private readonly handlers: {
      readonly onChoose: (dungeon: DungeonDefinition) => void;
      /** Passando sopra una scheda lo sfondo mostra la mappa di quel dungeon. */
      readonly onPreview: (dungeon: DungeonDefinition) => void;
      readonly onBack: () => void;
    },
  ) {
    requireElement('dungeons-back').addEventListener('click', handlers.onBack);
  }

  render(character: Character): void {
    this.list.replaceChildren();
    for (const dungeon of DUNGEONS) {
      const record = character.recordFor(dungeon.id);
      const card = el('button', 'dungeon-card');
      card.type = 'button';
      card.dataset.dungeon = dungeon.id;
      card.append(
        el('span', 'dungeon-danger', `Pericolo ${'●'.repeat(dungeon.danger)}${'○'.repeat(4 - dungeon.danger)}`),
        el('b', 'dungeon-name', dungeon.name),
        el('small', 'dungeon-tagline', dungeon.tagline),
        el('p', 'dungeon-desc', dungeon.description),
        el('span', 'dungeon-boss', `Boss: ${dungeon.boss.name}`),
        el(
          'span',
          record.clears > 0 ? 'dungeon-record done' : 'dungeon-record',
          record.clears > 0
            ? `Vittorie: ${record.clears}${record.bestTimeSeconds !== null ? ` · Miglior tempo: ${formatSeconds(record.bestTimeSeconds)}` : ''}`
            : 'Non ancora completato',
        ),
      );
      card.addEventListener('click', () => this.handlers.onChoose(dungeon));
      card.addEventListener('mouseenter', () => this.handlers.onPreview(dungeon));
      card.addEventListener('focus', () => this.handlers.onPreview(dungeon));
      this.list.append(card);
    }
  }
}
