import type {Item} from '../items/item';
import {itemName} from '../items/item';
import {el} from './dom';
import {renderItemSlot} from './item-slot';
import type {CharacterClass} from '../character/character-class';
export function hubOffer(item:Item,options:{label:string;note:string;disabled:boolean;characterClass:CharacterClass|null;action:()=>void}):HTMLElement {
 const row=el('article','hub-offer'),icon=renderItemSlot(item,{characterClass:options.characterClass}),details=el('div','hub-offer-details');
 if(icon)row.append(icon);details.append(el('h3','',itemName(item)),el('p','',options.note));
 const action=el('button','relic-button hub-service-action',options.label);action.type='button';action.disabled=options.disabled;action.onclick=options.action;details.append(action);row.append(details);return row;
}
