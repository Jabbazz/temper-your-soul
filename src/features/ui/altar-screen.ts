import type { Character } from '../character/character';
import { BLESSINGS, blessingLevel, nextBlessingCost } from '../run/blessings';
import { el, requireElement } from './dom';

/**
 * L'Altare dell'anima: si spendono le braci guadagnate nelle discese in benedizioni permanenti, valide solo nelle
 * discese. Mostra le braci, il livello di ogni benedizione, cosa fa e quanto costa il prossimo livello.
 */
export class AltarScreen {
  private readonly list = requireElement('altar-list');

  constructor(private readonly handlers: { readonly onChange: () => void; readonly onBack: () => void }) {
    requireElement('altar-back').addEventListener('click', handlers.onBack);
  }

  render(character: Character): void {
    const wallet = el('p', 'altar-embers', `Braci dell'anima: ${character.embers}`);
    const cards = el('div', 'altar-cards');
    for (const blessing of BLESSINGS) {
      const level = blessingLevel(character.blessings, blessing.id);
      const max = blessing.costs.length;
      const cost = nextBlessingCost(character.blessings, blessing.id);
      const card = el('article', level > 0 ? 'altar-card owned' : 'altar-card');
      card.append(
        el('strong', '', blessing.name),
        el('span', 'altar-level', `Livello ${level} di ${max}`),
        el('p', '', level > 0 ? blessing.describe(level) : blessing.describe(1)),
      );
      if (cost !== null && level > 0) card.append(el('small', 'altar-next', `Prossimo: ${blessing.describe(level + 1)}`));
      const buy = el('button', 'primary', cost === null ? 'Completa' : `Offri ${cost} braci`);
      buy.type = 'button';
      buy.disabled = cost === null || character.embers < cost;
      buy.addEventListener('click', () => {
        if (character.buyBlessing(blessing.id)) {
          this.handlers.onChange();
          this.render(character);
        }
      });
      card.append(buy);
      cards.append(card);
    }
    this.list.replaceChildren(
      wallet,
      el('p', 'altar-note', 'Le benedizioni valgono nelle discese e nel Pellegrinaggio, non nel Duello, e non cambiano il GS.'),
      cards,
    );
  }
}
