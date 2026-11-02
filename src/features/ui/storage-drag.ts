import {hideItemTooltip} from './item-slot';
/** Trascinamento con Pointer Events: mouse e tocco seguono lo stesso percorso. */
export function storageDrag(button:HTMLButtonElement,root:HTMLElement,onDrop:(target:HTMLElement)=>void):void {
 let start:{x:number;y:number;id:number}|null=null,ghost:HTMLElement|null=null,moved=false,suppressClick=false;
 const clear=()=>{ghost?.remove();ghost=null;root.querySelectorAll('.storage-drop-active').forEach(node=>node.classList.remove('storage-drop-active'));};
 const targetAt=(x:number,y:number):HTMLElement|null=>{
  const target=document.elementFromPoint(x,y)?.closest<HTMLElement>('[data-drop-area]');return target&&root.contains(target)?target:null;
 };
 button.draggable=false;button.classList.add('storage-draggable');
 button.addEventListener('pointerdown',event=>{if(event.button!==0)return;start={x:event.clientX,y:event.clientY,id:event.pointerId};moved=false;button.setPointerCapture(event.pointerId);});
 button.addEventListener('pointermove',event=>{
  if(!start||event.pointerId!==start.id)return;
  if(!moved&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<6)return;
  moved=true;event.preventDefault();hideItemTooltip();
  if(!ghost){ghost=button.cloneNode(true) as HTMLElement;ghost.removeAttribute('aria-describedby');ghost.classList.add('storage-drag-ghost');ghost.setAttribute('aria-hidden','true');document.body.append(ghost);}
  ghost.style.left=event.clientX+10+'px';ghost.style.top=event.clientY+10+'px';
  root.querySelectorAll('.storage-drop-active').forEach(node=>node.classList.remove('storage-drop-active'));targetAt(event.clientX,event.clientY)?.classList.add('storage-drop-active');
 });
 button.addEventListener('pointerup',event=>{
  if(!start||event.pointerId!==start.id)return;const dragged=moved,target=dragged?targetAt(event.clientX,event.clientY):null;
  start=null;clear();if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);
  if(dragged){suppressClick=true;event.preventDefault();if(target)onDrop(target);}
 });
 button.addEventListener('pointercancel',()=>{start=null;clear();});
 button.addEventListener('lostpointercapture',()=>{start=null;clear();});
 button.addEventListener('click',event=>{if(suppressClick){suppressClick=false;event.preventDefault();event.stopImmediatePropagation();}},true);
}
