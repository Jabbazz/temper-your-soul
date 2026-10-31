import type { LootTable } from '../loot/loot-table';
import { lootOdds } from '../loot/loot-odds';
import { familyById } from '../items/item-families';
import { RARITY_STATS } from '../items/rarity';
import { gearScore } from '../items/gear-score';
import { el } from './dom';
import { CLASS_LABELS } from '../character/character-class';

let tooltip:HTMLElement|null=null,owner:HTMLElement|null=null;
export function hideLootTooltip():void {owner?.removeAttribute('aria-describedby');tooltip?.remove();tooltip=null;owner=null;}
const percent=(value:number)=>new Intl.NumberFormat('it-IT',{maximumFractionDigits:2}).format(value*100)+'%';
function move(x:number,y:number):void {
  if(!tooltip)return;const box=tooltip.getBoundingClientRect();
  const left=x+18+box.width>window.innerWidth?x-box.width-14:x+18;
  const top=y+18+box.height>window.innerHeight?window.innerHeight-box.height-10:y+18;
  tooltip.style.left=Math.max(8,Math.min(left,window.innerWidth-box.width-8))+'px';tooltip.style.top=Math.max(8,top)+'px';
}
export function renderLootRate(table:LootTable):HTMLButtonElement {
  const trigger=el('button','loot-rate-trigger','Loot rate %');trigger.type='button';
  const show=(x:number,y:number)=>{
    hideLootTooltip();owner=trigger;tooltip=el('div','loot-rate-tooltip');tooltip.id='loot-rate-tooltip';tooltip.setAttribute('role','tooltip');
    trigger.setAttribute('aria-describedby',tooltip.id);
    tooltip.append(el('strong','',`Drop ${percent(table.dropChance)} · Nessun oggetto ${percent(1-table.dropChance)}`),el('small','','A destra: ripartizione dopo il drop (totale 100%). Ogni gruppo ha quattro pezzi al 25% ciascuno.'));
    const odds=lootOdds(table);
    for(const tier of ['set','fallback'] as const){
      const group=odds.filter(e=>e.tier===tier),groupChance=group.reduce((n,e)=>n+e.conditionalChance,0);
      tooltip.append(el('h4','drop-tier-title',`${tier==='set'?table.setName:'Non comuni (verdi)'} · ${percent(groupChance)}`));
      for(const entry of odds.filter(e=>e.tier===tier)){
        const family=familyById(entry.familyId)!;
        const row=el('div','loot-tooltip-row'),meta=el('small','',`${RARITY_STATS[entry.rarity].label} · ${CLASS_LABELS[family.characterClass]} · ${gearScore(entry)} GS · Lv. ${entry.level} · ${percent(entry.chance)} per uccisione`);
        meta.style.color=RARITY_STATS[entry.rarity].color;
        row.append(el('span','',family.name),el('b','',percent(entry.conditionalChance)),meta);tooltip.append(row);
      }
    }
    document.body.append(tooltip);move(x,y);
  };
  trigger.addEventListener('pointerenter',e=>show(e.clientX,e.clientY));
  trigger.addEventListener('pointermove',e=>{if(owner===trigger)move(e.clientX,e.clientY);});
  trigger.addEventListener('pointerleave',()=>{if(!trigger.matches(':focus-visible'))hideLootTooltip();});
  trigger.addEventListener('focus',()=>{const box=trigger.getBoundingClientRect();show(box.left,box.bottom);});
  trigger.addEventListener('blur',hideLootTooltip);
  trigger.addEventListener('click',()=>{if(owner!==trigger){const box=trigger.getBoundingClientRect();show(box.left,box.bottom);}});
  trigger.addEventListener('keydown',e=>{if(e.code==='Escape'){hideLootTooltip();e.stopPropagation();}});
  return trigger;
}
window.addEventListener('resize',hideLootTooltip);window.addEventListener('scroll',hideLootTooltip,true);
document.addEventListener('pointerdown',e=>{if(owner&&!owner.contains(e.target as Node))hideLootTooltip();});
