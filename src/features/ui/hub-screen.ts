import { HubState } from '../character/hub-state';
import { Vec2 } from '../../core/vec2';
import { el } from './dom';
import type { Character } from '../character/character';
import type { CharacterRoster } from '../character/character-roster';
import { acquireBasic, upgradeItem, HUB_PRICES } from '../character/hub-services';
import { hubOffer } from './hub-offer';
import { storageWindow } from './storage-window';
import { BACKPACK_SPRITE } from '../presentation/item-sprites';
import { renderPixelIcon } from './pixel-icon';
import { STARTER_SETS } from '../character/creation';
import { HubRenderer } from '../presentation/hub-renderer';
import { hideItemTooltip } from './item-slot';
import { playerProfile } from './player-profile';
export class HubScreen {
  readonly root=el('section','hub-screen hidden');
  private readonly canvas=el('canvas','hub-world');
  private readonly renderer:HubRenderer;
  private time=0;
  private readonly prompt=el('p','hub-prompt');
  private readonly state=new HubState();
  private panel:HTMLElement|null=null;
  private character!:Character;
  private roster!:CharacterRoster;
  private readonly wallet=el('p','hub-wallet');
  get dialogOpen():boolean{return this.panel!==null;}
  constructor(private readonly handlers:{portal:()=>void;save:()=>void;inventory:()=>void;menu:()=>void}) {
    this.canvas.setAttribute('aria-label','Piazza del rifugio: WASD per muoverti, E vicino a NPC e strutture');
    this.canvas.tabIndex=0;this.renderer=new HubRenderer(this.canvas);
    this.prompt.className='hub-interaction-tooltip hidden';this.prompt.setAttribute('role','status');
    const controls=el('footer','hub-controls');
    const button=(label:string,action:()=>void)=>{const b=el('button','relic-button secondary',label);b.type='button';b.onclick=action;return b;};
    const backpack=button('',()=>this.openProfile());backpack.classList.add('backpack-button','hub-character-button');backpack.setAttribute('aria-label','Personaggio e zaino');backpack.title='Personaggio e zaino';backpack.append(renderPixelIcon(BACKPACK_SPRITE));
    controls.append(backpack,button('Menu principale',handlers.menu));
    this.root.append(this.canvas,this.prompt,controls,this.wallet);document.body.append(this.root);
  }
  show(character:Character,roster:CharacterRoster):void {
    this.closeDialog();this.character=character;this.roster=roster;
    this.root.classList.remove('hidden');this.refresh();this.step(0,Vec2.ZERO);this.canvas.focus();
  }
  hide():void{this.closeDialog();this.root.classList.add('hidden');}
  private refresh():void{this.wallet.textContent=`Oro dell’account · ${this.roster.gold}`;}
  step(dt:number,move:Vec2):void {
    if(!this.dialogOpen)this.state.step(dt,move);
    this.time+=dt;this.renderer.draw(this.state,this.character.appearance(),this.time);
    const target=this.nearest();this.prompt.classList.toggle('hidden',!target||this.dialogOpen);
    if(target){
      const point=this.renderer.screenPoint(target.x+target.width/2,target.y-28);
      this.prompt.textContent=`E · ${target.name}`;
      this.prompt.style.left=Math.max(8,Math.min(window.innerWidth-210,point.x+12))+'px';
      this.prompt.style.top=Math.max(12,Math.min(window.innerHeight-80,point.y))+'px';
    }
  }
  private nearest(){return this.state.nearest();}
  interact():void{if(this.dialogOpen)return;const target=this.nearest();if(!target)return;if(target.id==='portal'){this.handlers.portal();return;}this.openService(target.id,target.name);}
  closeDialog():boolean{if(!this.panel)return false;hideItemTooltip();this.panel.remove();this.panel=null;return true;}
  private dialog(title:string):HTMLElement {
    this.closeDialog();const veil=el('div','hub-dialog'),card=el('div','hub-dialog-card menu-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label',title);const close=el('button','relic-button secondary','Chiudi · ESC');close.onclick=()=>this.closeDialog();const header=el('header','hub-dialog-head');header.append(el('h2','',title),close);card.append(header);veil.append(card);this.root.append(veil);this.panel=veil;close.focus();return card;
  }
  openProfile():void{this.dialog('Personaggio e zaino').append(playerProfile(this.character,this.roster.gold,{onEquipmentChange:()=>{this.handlers.save();this.openProfile();}}));}
  private openService(id:string,name:string):void {
    const card=this.dialog(name),character=this.character;
    if(id==='storage'){
      card.classList.add('hub-storage-dialog');card.append(storageWindow(character,this.roster.gold,()=>{this.handlers.save();this.refresh();}));return;
    }
    card.append(el('p','hub-service-wallet',`Oro disponibile · ${this.roster.gold}`));
    const list=el('div','hub-offer-list');
    const changed=(run:()=>boolean)=>{if(run()){hideItemTooltip();this.handlers.save();this.refresh();this.openService(id,name);}};
    if(id==='smith'){
      card.append(el('p','hub-service-note','Ogni miglioria: +5% alle statistiche passive dell’oggetto e +2% attacco. Massimo +5.'));
      for(const item of character.inventory){const next=(item.upgrade??0)+1,cost=HUB_PRICES.upgrade*next,max=next>HUB_PRICES.maxUpgrade;
        list.append(hubOffer(item,{characterClass:character.characterClass,note:max?'Miglioria massima raggiunta.':`Miglioria +${item.upgrade??0} → +${next}`,
          label:max?'Massimo +5':`Migliora · ${cost} oro`,disabled:max||this.roster.gold<cost,action:()=>changed(()=>upgradeItem(this.roster,character,item.uid))}));
      }
      if(!character.inventory.length)list.append(el('p','','Nessun oggetto da migliorare nello zaino.'));
    }else{
      const craft=id==='forge',cost=craft?HUB_PRICES.craft:HUB_PRICES.buy;
      card.append(el('p','hub-service-note',craft?'Crea equipaggiamento Non comune di classe. Costo in oro.':'Equipaggiamento Comune di base della tua classe.'));
      STARTER_SETS[character.characterClass??'mage'].forEach((familyId,slot)=>list.append(hubOffer({uid:`preview-${slot}`,familyId,rarity:craft?'uncommon':'common'},
        {characterClass:character.characterClass,note:craft?'Non comune · Livello oggetto 1':'Comune · Livello oggetto 1',label:`${craft?'Crea':'Acquista'} · ${cost} oro`,disabled:this.roster.gold<cost,action:()=>changed(()=>acquireBasic(this.roster,character,slot,craft))})));
    }
    card.append(list);
  }
}
