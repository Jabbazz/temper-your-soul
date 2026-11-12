import { renderIllustratedPortrait } from './illustrated-portrait';
import type { Character } from '../character/character';
import { levelProgress } from '../character/progression';
import type { CharacterPixels } from '../presentation/character-art';
import { el } from './dom';
import type { CharacterAppearance } from '../character/appearance';
import { HERO_SHEET, heroClassOf, heroSheetFrame, heroSheetSource, heroTintedSheet } from '../presentation/pixellab-hero';

/** La figura dei menu: il corpo PixelLab 64×64 a riposo, di fronte, nei colori dell'equipaggiamento indossato. */
export function heroFigureSvg(appearance: CharacterAppearance): SVGSVGElement {
  const ns='http://www.w3.org/2000/svg',kind=heroClassOf(appearance),source=heroSheetSource(kind);
  const frame=heroSheetFrame(kind,'idle','south',0),margin=(HERO_SHEET.cell-64)/2;
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox',`${frame.sx+margin} ${frame.sy+margin+1} 64 64`);
  svg.setAttribute('aria-hidden','true');
  const image=document.createElementNS(ns,'image');
  image.setAttribute('href',source.url);image.setAttribute('width',String(source.width));image.setAttribute('height',String(source.height));
  image.style.imageRendering='pixelated';
  svg.append(image);
  // Appena il foglio è caricato la figura passa alla versione ricolorata, se l'equipaggiamento ne ha una.
  const sheet=new Image();
  sheet.onload=()=>{
    const tinted=heroTintedSheet(kind,sheet,appearance);
    if(tinted instanceof HTMLCanvasElement)image.setAttribute('href',tinted.toDataURL());
  };
  sheet.src=source.url;
  return svg;
}


export function pixelSvg(art: CharacterPixels): SVGSVGElement {
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox', '0 0 '+art.width+' '+art.height);
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('shape-rendering','crispEdges');
  art.pixels.forEach((row,y)=>row.forEach((color,x)=>{
    if(!color) return;
    const r=document.createElementNS(ns,'rect');
    r.setAttribute('x',String(x));r.setAttribute('y',String(y));
    r.setAttribute('width','1');r.setAttribute('height','1');r.setAttribute('fill',color);svg.append(r);
  }));
  return svg;
}
export function renderCharacterPortrait(character: Character): HTMLElement {
  const root=el('div','character-portrait');
  root.setAttribute('role','group');root.setAttribute('aria-label','Ritratto illustrato del personaggio con equipaggiamento attuale');
  root.append(renderIllustratedPortrait(character.appearance()));
  root.append(el('div','portrait-level','Livello '+levelProgress(character.totalXp).level));
  const zoom=el('button','small-button portrait-zoom','Zoom');zoom.type='button';
  zoom.addEventListener('click',()=>{
    const dialog=document.createElement('dialog');dialog.className='portrait-dialog';
    dialog.setAttribute('aria-label','Ritratto del personaggio ingrandito');
    const close=el('button','secondary','Chiudi');close.type='button';close.addEventListener('click',()=>dialog.close());
    dialog.append(close,renderIllustratedPortrait(character.appearance()));
    dialog.addEventListener('keydown',event=>{ if(event.code==='Escape')event.stopPropagation(); });
    dialog.addEventListener('close',()=>dialog.remove());
    document.body.append(dialog);dialog.showModal();
  });
  root.append(zoom);return root;
}
