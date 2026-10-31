import { itemName, resolveItem, type Item } from '../items/item';
import { gearScore } from '../items/gear-score';
import { RARITY_STATS } from '../items/rarity';
import { ITEM_SPRITES } from '../presentation/item-sprites';
import { el } from './dom';
import { renderItemCard, type ItemCardOptions } from './item-card';
import { renderPixelIcon } from './pixel-icon';
import { CLASS_LABELS } from '../character/character-class';

let tooltip: HTMLElement | null = null;
let owner: HTMLElement | null = null;

export function hideItemTooltip(): void {
  owner?.removeAttribute('aria-describedby');
  tooltip?.remove();
  tooltip = null;
  owner = null;
}

// Un solo tooltip fuori dai pannelli scorrevoli: non viene tagliato dal loro overflow.
function showItemTooltip(button: HTMLElement, item: Item, options: ItemCardOptions): void {
  hideItemTooltip();
  const card = renderItemCard(item, options);
  if (card === null) return;
  tooltip = card;
  owner = button;
  card.id = 'item-tooltip';
  card.classList.add('item-tooltip');
  card.setAttribute('role', 'tooltip');
  button.setAttribute('aria-describedby', card.id);
  document.body.append(card);
  const bounds = button.getBoundingClientRect();
  const size = card.getBoundingClientRect();
  const left = bounds.right + size.width + 12 <= window.innerWidth ? bounds.right + 10 : bounds.left - size.width - 10;
  card.style.left = `${Math.max(8, Math.min(left, window.innerWidth - size.width - 8))}px`;
  card.style.top = `${Math.max(8, Math.min(bounds.top, window.innerHeight - size.height - 8))}px`;
}

/** Slot compatto: sprite per famiglia, bordo per rarità, dettagli su hover e focus da tastiera. */
export function renderItemSlot(item: Item, options: ItemCardOptions = {}): HTMLButtonElement | null {
  const resolved = resolveItem(item);
  if (resolved === undefined) return null;
  const incompatible=options.characterClass!==undefined&&options.characterClass!==null&&options.characterClass!==resolved.family.characterClass;
  const button = el('button', `item-slot ${options.extraClass ?? ''} ${incompatible?'is-incompatible':''}`.trim());
  button.type = 'button';
  button.style.setProperty('--rarity', RARITY_STATS[item.rarity].color);
  button.setAttribute('aria-label', `${itemName(item)} · ${RARITY_STATS[item.rarity].label} · ${gearScore(item)} GS${options.badge ? ` · ${options.badge}` : ''}`);
  if(incompatible)button.setAttribute('aria-label',button.getAttribute('aria-label')+` · Richiede ${CLASS_LABELS[resolved.family.characterClass]} · Non equipaggiabile`);
  const sprite = ITEM_SPRITES[item.familyId];
  if (sprite !== undefined) button.append(renderPixelIcon(sprite));
  else button.append(el('span', '', '?'));
  if (options.badge !== undefined) button.append(el('span', 'slot-badge', options.badge === 'Equipaggiato' ? 'E' : options.badge));
  button.append(el('span','slot-gs',String(gearScore(item))));
  button.addEventListener('pointerenter', () => showItemTooltip(button, item, options));
  button.addEventListener('focus', () => showItemTooltip(button, item, options));
  button.addEventListener('pointerleave', hideItemTooltip);
  button.addEventListener('blur', hideItemTooltip);
  return button;
}

window.addEventListener('scroll', hideItemTooltip, true);
window.addEventListener('resize', hideItemTooltip);
window.addEventListener('blur', hideItemTooltip);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideItemTooltip();
});
