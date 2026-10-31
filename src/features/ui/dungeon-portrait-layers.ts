import type { CharacterAppearance } from '../character/appearance';
import type { PortraitPose,Similarity,Point } from '../presentation/portrait-rig';
import { posePoint,attachAt,fitBoot } from '../presentation/portrait-rig';
import { dungeonItemPortrait } from '../presentation/dungeon-item-portraits';
import type { AtlasRect } from '../presentation/portrait-layout';
import { fitArmor } from '../presentation/portrait-armor';
import { el } from './dom';

export function appendDungeonPortraitLayers(root:HTMLElement,appearance:CharacterAppearance,pose:PortraitPose):void {
  for(const slot of ['armor','boots','secondary_hand','primary_hand'] as const){
    const item=appearance.equipment[slot];if(!item)continue;
    const art=dungeonItemPortrait(item,appearance.body);if(!art)continue;
    const make=(crop:AtlasRect,rect:AtlasRect,className:string)=>{
      const layer=el('div','illustrated-layer '+className);layer.dataset.familyId=item.familyId;
      Object.assign(layer.style,{left:rect[0]*100+'%',top:rect[1]*100+'%',width:rect[2]*100+'%',height:rect[3]*100+'%',backgroundImage:'url("'+art.texture.url+'")',backgroundSize:64/crop[2]*100+'% '+64/crop[3]*100+'%',backgroundPosition:crop[0]/(64-crop[2])*100+'% '+crop[1]/(64-crop[3])*100+'%'});
      return layer;
    };
    const attached=(crop:AtlasRect,fit:Similarity,className:string)=>{
      const layer=make(crop,[fit.left,fit.top,fit.width,fit.height],className);
      layer.style.transformOrigin=fit.origin[0]*100+'% '+fit.origin[1]*100+'%';layer.style.transform='rotate('+fit.rotation+'rad)';return layer;
    };
    if(slot==='armor'){
      const anchors={neck:[32,26] as Point,waist:[32,39] as Point,shoulders:[[24,28],[40,28]] as const,hem:1};
      for(const section of fitArmor([12,24,40,32],anchors,pose)){
        const wrapper=el('div','illustrated-layer illustrated-armor'),[x,y,w,h]=section.rect;
        Object.assign(wrapper.style,{left:x*100+'%',top:y*100+'%',width:w*100+'%',height:h*100+'%',transformOrigin:'0 0',transform:'skewX('+section.skew+'rad)'});
        const inner=make(section.crop,[0,0,1,1],'');if(section.mirror)inner.style.transform='scaleX(-1)';
        wrapper.dataset.familyId=item.familyId;wrapper.append(inner);root.append(wrapper);
      }
    }else if(slot==='boots'){
      for(let i=0;i<2;i++){
        const x=i===0?22:35,crop:AtlasRect=[x,46,13,14],ankle:Point=[((i===0?28:37)-x)/13,4/14],sole:Point=[((i===0?29:38)-x)/13,12/14];
        const foot=pose.feet[i]!,fit=fitBoot(crop,ankle,sole,posePoint(pose,foot.ankle),posePoint(pose,foot.sole),pose.mirror);
        const layer=attached(crop,fit,'illustrated-boots');if(pose.mirror)layer.style.transform+=' scaleX(-1)';root.append(layer);
      }
    }else{
      const height=slot==='primary_hand'?.68:item.familyId==='ossuary_lantern'?.24:.20;
      const layer=attached(art.crop,attachAt(art.crop,art.grip,posePoint(pose,slot==='primary_hand'?pose.primary:pose.secondary),height),'illustrated-'+slot);
      if(slot==='primary_hand'){
        const rear=layer.cloneNode() as HTMLElement;rear.className='illustrated-layer illustrated-rear-weapon';
        rear.style.clipPath='inset('+art.grip[1]*100+'% 0 0 0)';layer.style.clipPath='inset(0 0 '+(1-art.grip[1])*100+'% 0)';root.append(rear);
      }
      root.append(layer);
    }
  }
}
