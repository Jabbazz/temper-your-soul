import { SLOT_LABELS } from '../items/equipment-slot';
import { describeSkillStats, itemName, resolveItem, type Item } from '../items/item';
import { gearScore, itemLevel } from '../items/gear-score';
import { RARITY_STATS } from '../items/rarity';
import { el } from './dom';
import { CLASS_LABELS,type CharacterClass } from '../character/character-class';

export interface ItemCardOptions {
  /** Etichetta in evidenza (es. "Equipaggiato", "Nuovo"). */
  readonly badge?: string;
  /** Classi aggiuntive. */
  readonly extraClass?: string;
  readonly characterClass?:CharacterClass|null;
}

/**
 * Scheda di un oggetto: nome, rarita' (colore), slot, abilita' e statistiche. Restituisce null se la famiglia
 * dell'oggetto non esiste (dati vecchi): il chiamante la salta.
 */
export function renderItemCard(item: Item, options: ItemCardOptions = {}): HTMLElement | null {
  const resolved = resolveItem(item);
  if (resolved === undefined) return null;
  const { family, skill } = resolved;
  const rarity = RARITY_STATS[item.rarity];

  const card = el('div', `item-card rarity-${item.rarity} ${options.extraClass ?? ''}`.trim());
  card.style.setProperty('--rarity', rarity.color);

  const head = el('div', 'item-head');
  head.append(el('b', 'item-name', itemName(item)), el('span', 'item-rarity', rarity.label));
  const meta = el('div', 'item-meta');
  meta.append(el('span', '', SLOT_LABELS[family.slot]));
  meta.append(el('span','item-class',`Classe: ${CLASS_LABELS[family.characterClass]}`));
  if(options.characterClass && options.characterClass!==family.characterClass)meta.append(el('span','item-requirement','Non equipaggiabile da questa classe'));
  meta.append(el('span','item-gs',`${gearScore(item)} GS · Livello oggetto ${itemLevel(item)}`));
  if(item.rarity==='common')meta.append(el('span','','Equipaggiamento novizio · non droppabile'));
  if (family.exclusiveTo !== undefined) meta.append(el('span', 'item-unique', 'Oggetto di set'));
  if (options.badge !== undefined) meta.append(el('span', 'item-badge', options.badge));
  card.append(head, meta, el('div', 'item-skill', skill.name), el('small', 'item-desc', skill.description));

  const stats = el('ul', 'item-stats');
  for (const line of describeSkillStats(skill)) stats.append(el('li', '', line));
  card.append(stats);
  return card;
}
