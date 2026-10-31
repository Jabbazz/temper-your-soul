import type { Character } from '../character/character';
import { CLASS_LABELS } from '../character/character-class';
import { levelProgress } from '../character/progression';
import { el } from './dom';

/** Identità consultabile: nessun cambio di sesso, nome o classe dall'inventario. */
export function renderAppearancePicker(character: Character): HTMLElement {
  const root=el('div','character-identity');
  root.append(el('strong','',character.name??'Personaggio da completare'));
  root.append(el('span','',character.characterClass?CLASS_LABELS[character.characterClass]:'Classe da scegliere'));
  root.append(el('small','',`Livello ${levelProgress(character.totalXp).level} · GS ${character.gearScore}/400`));
  return root;
}
