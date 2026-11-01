import { describeSkillStats } from '../items/item';
import { MAX_TEMPER_GRADE, temperById, TEMPER_FAMILIES, type TemperPick } from '../run/tempers';
import type { Loadout } from '../skills/skill-definition';
import { SLOT_NAMES } from './descent-hud';
import { el, requireElement } from './dom';

const ROMAN = ['', 'I', 'II', 'III'];

/**
 * La scelta della tempra: tre (o quattro) carte, una per offerta, con famiglia, nome, grado, slot e cosa cambia; e la
 * domanda del patto del forziere. Il mondo non si ferma (la stanza e' libera): si sceglie con un clic o con i tasti 1-4.
 */
export class TemperChoice {
  private readonly root = requireElement('temper-choice');
  private key = '';
  private choose: ((index: number) => void) | null = null;

  constructor() {
    window.addEventListener('keydown', (event) => {
      if (this.choose === null || this.root.classList.contains('hidden')) return;
      const digit = /^Digit([1-4])$/.exec(event.code);
      if (digit === null) return;
      event.preventDefault();
      this.choose(Number(digit[1]) - 1);
    });
  }

  get visible(): boolean {
    return !this.root.classList.contains('hidden');
  }

  /** Mostra le offerte (se sono le stesse di prima non ridisegna). */
  showOffers(offers: readonly TemperPick[], loadout: Loadout, onChoose: (index: number) => void): void {
    const key = `offers:${JSON.stringify(offers)}`;
    this.choose = (index) => {
      if (index < offers.length) onChoose(index);
    };
    if (key === this.key) return;
    this.key = key;
    const cards = el('div', 'temper-cards');
    offers.forEach((offer, index) => {
      const temper = temperById(offer.temperId);
      const skill = loadout[offer.slot] ?? null;
      if (temper === undefined) return;
      const card = el('button', `temper-card temper-${temper.family}`);
      card.type = 'button';
      card.append(
        el('span', 'temper-key', String(index + 1)),
        el('span', 'temper-family', `${TEMPER_FAMILIES[temper.family].name} · ${TEMPER_FAMILIES[temper.family].gesture}`),
        el('strong', 'temper-name', `${temper.name} ${ROMAN[offer.grade] ?? ''}`),
        el('span', 'temper-slot', `${SLOT_NAMES[offer.slot] ?? ''} · ${skill?.name ?? '—'}`),
        el('p', 'temper-text', temper.describe(offer.grade)),
        el('small', 'temper-grade', offer.grade >= MAX_TEMPER_GRADE ? 'Grado massimo' : `Grado ${offer.grade} di ${MAX_TEMPER_GRADE}`),
      );
      if (skill !== null) card.title = describeSkillStats(skill).join('\n');
      card.addEventListener('click', () => onChoose(index));
      cards.append(card);
    });
    this.root.replaceChildren(el('span', 'eyebrow', 'TEMPRA · SCEGLI UNA'), el('h3', '', 'Il fabbro ti offre'), cards);
    this.root.classList.remove('hidden');
  }

  /** Il patto del forziere: due tempre in cambio di vita massima. */
  showPact(onAnswer: (accept: boolean) => void): void {
    this.choose = (index) => onAnswer(index === 0);
    if (this.key === 'pact') return;
    this.key = 'pact';
    const accept = el('button', 'primary', '1 · Accetto');
    accept.type = 'button';
    accept.addEventListener('click', () => onAnswer(true));
    const refuse = el('button', 'secondary', '2 · Rifiuto');
    refuse.type = 'button';
    refuse.addEventListener('click', () => onAnswer(false));
    const buttons = el('div', 'temper-pact-buttons');
    buttons.append(accept, refuse);
    this.root.replaceChildren(
      el('span', 'eyebrow', 'IL FORZIERE PROPONE UN PATTO'),
      el('h3', '', 'Due tempre, al prezzo di 20 vita massima'),
      el('p', 'temper-text', 'La vita massima resta ridotta fino alla fine della discesa.'),
      buttons,
    );
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.choose = null;
    if (this.key === '') return;
    this.key = '';
    this.root.classList.add('hidden');
    this.root.replaceChildren();
  }
}
