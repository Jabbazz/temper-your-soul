import type { CharacterAppearance } from '../character/appearance';
import { PORTRAIT_LAYERS } from '../presentation/portrait-atlas';
import { PORTRAIT_ATLASES, PORTRAIT_CROPS, type AtlasRect } from '../presentation/portrait-layout';
import { ARMOR_ANCHORS, ARMOR_LOWER_FRONT, fitArmor } from '../presentation/portrait-armor';
import { CLASS_POSES, cropPolygon, cuffClipPath, gripSliceRearPolygon, weaponRearCut, poseAtlas, posePlacement, posePoint, attachAt, fitBoot, WEAPON_GRIPS, WEAPON_HEIGHTS, WEAPON_ROTATIONS, WEAPON_FRONT_OUTLINES, WEAPON_GRIP_SLICES, BOOT_PARTS, type Similarity, type PortraitPose, type Point } from '../presentation/portrait-rig';
import { el } from './dom';
import { DUNGEON_PORTRAIT_IDS } from '../presentation/dungeon-item-portraits';
import { appendDungeonPortraitLayers } from './dungeon-portrait-layers';
import './illustrated-portrait.css';

function cropLayer(texture:{url:string;width:number;height:number},crop:AtlasRect,rect:AtlasRect,name:string):HTMLElement {
 const layer=el('div','illustrated-layer '+name);
 layer.style.left=rect[0]*100+'%';layer.style.top=rect[1]*100+'%';layer.style.width=rect[2]*100+'%';layer.style.height=rect[3]*100+'%';
 layer.style.backgroundImage='url("'+texture.url+'")';layer.style.backgroundSize=texture.width/crop[2]*100+'% '+texture.height/crop[3]*100+'%';
 layer.style.backgroundPosition=crop[0]/(texture.width-crop[2])*100+'% '+crop[1]/(texture.height-crop[3])*100+'%';return layer;
}
function attachLayer(atlas:'equipment'|'armor',crop:AtlasRect,fit:Similarity,name:string):HTMLElement {
 const layer=cropLayer(PORTRAIT_ATLASES[atlas],crop,[fit.left,fit.top,fit.width,fit.height],name);
 layer.style.transformOrigin=fit.origin[0]*100+'% '+fit.origin[1]*100+'%';layer.style.transform='rotate('+fit.rotation+'rad)';return layer;
}
function gripFingers(root:HTMLElement,pose:PortraitPose,outline:readonly Point[]):void {
 const [, ,w,h]=posePlacement(pose),xs=outline.map(p=>p[0]),ys=outline.map(p=>p[1]);
 const crop:AtlasRect=[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];
 const fw=crop[2]/pose.crop[2]*w,fh=crop[3]/pose.crop[3]*h,corner=posePoint(pose,[crop[0],crop[1]]);
 const layer=cropLayer(poseAtlas(pose),crop,[corner[0]-(pose.mirror?fw:0),corner[1],fw,fh],'illustrated-fingers');
 if(pose.mirror)layer.style.transform='scaleX(-1)';
 layer.style.clipPath=cropPolygon(outline,crop);
 root.append(layer);
}
function fingers(root:HTMLElement,pose:PortraitPose,point:Point):void {
 if(point===pose.primary&&pose.primaryFingers){gripFingers(root,pose,pose.primaryFingers);return;}
 const [, ,w,h]=posePlacement(pose),target=posePoint(pose,point);
 const scale=pose.detailScale??1;
 const crop:AtlasRect=[point[0]-11*scale,point[1]-8*scale,22*scale,18*scale];
 const fw=crop[2]/pose.crop[2]*w,fh=crop[3]/pose.crop[3]*h;
 const layer=cropLayer(poseAtlas(pose),crop,[target[0]-fw/2,target[1]-fh*8/18,fw,fh],'illustrated-fingers');
 if(pose.mirror)layer.style.transform='scaleX(-1)';
 layer.style.clipPath='ellipse(48% 48% at 50% 50%)';root.append(layer);
}
function head(root:HTMLElement,pose:PortraitPose,female:boolean):void {
 const [,y,w,h]=posePlacement(pose);
 const half=(female?82:60)*(pose.detailScale??1);
 const crop:AtlasRect=[pose.neck[0]-half,pose.crop[1],half*2,pose.neck[1]-pose.crop[1]+3];
 const hw=crop[2]/pose.crop[2]*w,hh=crop[3]/pose.crop[3]*h;
 const left=posePoint(pose,[crop[0],crop[1]])[0]-(pose.mirror?hw:0);
 const layer=cropLayer(poseAtlas(pose),crop,[left,y,hw,hh],'illustrated-head');
 if(pose.mirror)layer.style.transform='scaleX(-1)';
 root.append(layer);
}

/** Posa di classe con punti anatomici: ogni presa e ogni caviglia sono registrate, non posizionate a occhio. */
export function renderIllustratedPortrait(appearance:CharacterAppearance):HTMLElement {
 const root=el('div','illustrated-character');root.setAttribute('aria-hidden','true');
 const kind=appearance.characterClass??'mage',pose=CLASS_POSES[kind][appearance.body];root.dataset.characterClass=kind;
 const base=cropLayer(poseAtlas(pose),pose.crop,posePlacement(pose),'illustrated-base');
 if(pose.mirror)base.style.transform='scaleX(-1)';
 const boots=appearance.equipment.boots;
 const cuffs=cuffClipPath(pose);
 if(boots && (BOOT_PARTS[boots.familyId]||DUNGEON_PORTRAIT_IDS.includes(boots.familyId))){
  const cut=(Math.min(...pose.feet.map(foot=>foot.ankle[1]))-pose.crop[1]+3)/pose.crop[3]*100;
  base.style.clipPath=cuffs??'inset(0 0 '+(100-cut)+'% 0)';
 }
 root.append(base);
 const armor=appearance.equipment.armor;
 if(armor){
  const crops=PORTRAIT_CROPS[armor.familyId];
  const anchors=ARMOR_ANCHORS[armor.familyId]?.[appearance.body];
  if(crops && anchors){
   const crop=appearance.body==='female'?(crops[1]??crops[0]):crops[0];
   const lowerFront=ARMOR_LOWER_FRONT[armor.familyId];
   fitArmor(crop,anchors,pose).forEach((section,index)=>{
    const add=(className:string,clip?:string)=>{
     const layer=el('div','illustrated-layer '+className);
     const [x,y,w,h]=section.rect;
     Object.assign(layer.style,{left:x*100+'%',top:y*100+'%',width:w*100+'%',height:h*100+'%',transformOrigin:'0 0',transform:'skewX('+section.skew+'rad)'});
     const texture=cropLayer(PORTRAIT_ATLASES.armor,section.crop,[0,0,1,1],'');
     if(section.mirror)texture.style.transform='scaleX(-1)';
     if(clip)texture.style.clipPath=clip;
     layer.dataset.familyId=armor.familyId;layer.append(texture);root.append(layer);
    };
    if(index===1&&lowerFront){
     add('illustrated-armor-rear');
     add('illustrated-armor','polygon('+lowerFront.map(p=>p[0]*100+'% '+p[1]*100+'%').join(',')+')');
    }else add('illustrated-armor');
   });
  }
 }
 if(boots){
  const parts=BOOT_PARTS[boots.familyId];
  if(parts)parts.forEach((part,index)=>{
   const foot=pose.feet[index]!;
   const layer=attachLayer('equipment',part.crop,fitBoot(part.crop,part.ankle,part.sole,posePoint(pose,foot.ankle),posePoint(pose,foot.sole),pose.mirror),cuffs?'illustrated-boots-under':'illustrated-boots');
   if(pose.mirror)layer.style.transform+=' scaleX(-1)';
   layer.dataset.familyId=boots.familyId;layer.dataset.foot=String(index);root.append(layer);
   if(cuffs)for(const outline of part.overPants??[]){
    const over=layer.cloneNode() as HTMLElement;over.className='illustrated-layer illustrated-boots';
    over.style.clipPath=cropPolygon(outline,part.crop);root.append(over);
   }
  });
 }
 appendDungeonPortraitLayers(root,appearance,pose);
 head(root,pose,appearance.body==='female');
 for(const slot of ['secondary_hand','primary_hand'] as const){
  const item=appearance.equipment[slot];if(!item)continue;
  if(DUNGEON_PORTRAIT_IDS.includes(item.familyId)){fingers(root,pose,slot==='primary_hand'?pose.primary:pose.secondary);continue;}
  const art=PORTRAIT_LAYERS[item.familyId],crops=PORTRAIT_CROPS[item.familyId],grip=WEAPON_GRIPS[item.familyId];
  if(!art || art.slot!==slot || !crops || !grip)continue;
  const point=slot==='primary_hand'?pose.primary:pose.secondary,target=posePoint(pose,point);
  const height=(WEAPON_HEIGHTS[item.familyId]??.4)*(appearance.body==='female'?.94:1);
  const layer=attachLayer('equipment',crops[0],attachAt(crops[0],grip,target,height,WEAPON_ROTATIONS[item.familyId]??0),'illustrated-'+slot);
  if(item.familyId==='hunter_bow')layer.style.clipPath='polygon(0 0,100% 0,100% 88%,60% 88%,60% 100%,0 100%)';
  if(slot==='primary_hand' && item.familyId!=='guardian_blade'){
   const rear=layer.cloneNode() as HTMLElement;rear.className='illustrated-layer illustrated-rear-weapon';
   const cut=(pose.primaryFingers?weaponRearCut(grip[1],height):grip[1])*100;
   rear.style.clipPath=item.familyId==='hunter_bow'?'polygon(0 '+cut+'%,100% '+cut+'%,100% 88%,60% 88%,60% 100%,0 100%)':'inset('+cut+'% 0 0 0)';
   layer.style.clipPath='inset(0 0 '+(100-cut)+'% 0)';
   const front=WEAPON_FRONT_OUTLINES[item.familyId],slice=WEAPON_GRIP_SLICES[item.familyId];
   if(front)layer.style.clipPath='polygon('+front.map(p=>p[0]*100+'% '+p[1]*100+'%').join(',')+')';
   if(slice){
    rear.style.clipPath=gripSliceRearPolygon(slice);
    const narrow=layer.cloneNode() as HTMLElement,dx=(slice.axis-grip[0])*100+'%';
    narrow.style.clipPath='polygon('+[[slice.left,slice.top],[1,slice.top],[1,slice.bottom],[slice.left,slice.bottom]].map(p=>p[0]!*100+'% '+p[1]!*100+'%').join(',')+')';
    narrow.style.transform+=' translateX('+dx+') scaleX('+slice.scale+') translateX(-'+dx+')';
    root.append(narrow);
   }
   root.append(rear);
  }
  layer.dataset.familyId=item.familyId;root.append(layer);fingers(root,pose,point);
 }
 return root;
}
