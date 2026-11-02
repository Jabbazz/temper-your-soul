import { SKILL_BINDING_ACTIONS, type InputBindings, type SkillAction } from '../../core/input-bindings';
import { el } from '../ui/dom';
const LABELS = ['Attacco base · Mano primaria','Abilità · Mano secondaria','Abilità · Armatura','Scatto / Teletrasporto · Stivali'];
export class ControlsView {
  private capturing: SkillAction | null = null;
  private ignoreClick = false;
  private readonly message = el('p','controls-message');
  constructor(private readonly root: HTMLElement, private readonly bindings: InputBindings) {
    this.message.setAttribute('role','status');this.render();
    window.addEventListener('keydown',event=>{
      if(!this.capturing || event.ctrlKey || event.metaKey || event.altKey)return;
      event.preventDefault();event.stopImmediatePropagation();
      if(event.code==='Escape'){this.cancel();return;}
      if(!event.repeat)this.capture(event.code);
    },true);
    window.addEventListener('mousedown',event=>{
      if(!this.capturing){this.ignoreClick=false;return;}
      if(event.target instanceof Element && event.target.closest('[data-settings-navigation]')){this.cancel();return;}
      event.preventDefault();event.stopImmediatePropagation();
      if(event.button===0 || event.button===2){this.ignoreClick=event.button===0;this.capture(`Mouse${event.button}`);}
    },true);
    window.addEventListener('click',event=>{if(this.ignoreClick){this.ignoreClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
    root.addEventListener('contextmenu',event=>event.preventDefault());
  }
  cancel(): void {this.capturing=null;this.ignoreClick=false;this.message.textContent='Scegli una spell e premi un tasto o un pulsante del mouse. ESC annulla.';this.updateButtons();}
  private capture(code: string): void {
    const action=this.capturing;if(!action)return;
    try {this.bindings.bind(action,code);this.capturing=null;this.message.textContent='Associazione aggiornata. Un tasto già usato da una spell scambia le due associazioni.';this.updateButtons();}
    catch(error){this.message.textContent=error instanceof Error ? error.message : 'Associazione non valida.';}
  }
  private updateButtons(): void {
    for(const button of Array.from(this.root.querySelectorAll<HTMLButtonElement>('[data-binding]'))){
      const action=button.dataset.binding as SkillAction,slot=SKILL_BINDING_ACTIONS.indexOf(action);
      button.textContent=this.capturing===action?'Premi un tasto…':this.bindings.labelForSlot(slot);
      button.classList.toggle('capturing',this.capturing===action);
    }
  }
  private render(): void {
    const rows=el('div','control-bindings');
    SKILL_BINDING_ACTIONS.forEach((action,slot)=>{
      const row=el('div','control-binding'),button=el('button','binding-button');button.type='button';button.dataset.binding=action;
      button.setAttribute('aria-label',`Cambia tasto: ${LABELS[slot]}`);
      button.addEventListener('click',()=>{this.capturing=action;this.message.textContent='Premi il nuovo tasto o clicca con il pulsante del mouse. ESC annulla.';this.updateButtons();});
      row.append(el('span','',LABELS[slot]),button);rows.append(row);
    });
    const reset=el('button','controls-reset','Ripristina associazioni');reset.type='button';reset.dataset.settingsNavigation='';
    reset.addEventListener('click',()=>{this.bindings.reset();this.cancel();});
    this.root.replaceChildren(el('p','', 'Le associazioni valgono per tutte le classi e si salvano in questo browser. In cooperativa la partita continua.'),rows,this.message,reset,
      el('p','controls-fixed','Comandi fissi: WASD movimento · ESC pausa · R ricomincia · M audio · F schermo intero · F2 prestazioni · TAB mappa · N minimappa.'));
    this.cancel();
  }
}
