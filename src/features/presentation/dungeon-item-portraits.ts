import type { BodyType } from '../character/appearance';
import type { Item } from '../items/item';
import { bodyAnchors } from './adventurer-body';
import { WEARABLES, type CharacterPixels } from './character-art';
import { PixelPainter } from './pixel-painter';
import { drawWearable,drawWearableBack } from './wearable-draw';
import { dungeonPortraitSvg } from './dungeon-portrait-svg';

/** Kit disegnati nel codice: nessuna nuova generazione raster e nessuna modifica degli atlanti esistenti. */
export const DUNGEON_PORTRAIT_IDS:readonly string[]=['ossuary_lantern','grave_boots','thorn_bow','reed_mantle','cinder_orb','ember_treads','glacier_mirror','rime_boots'];
const cache=new Map<string,ReturnType<typeof makeArt>>();
function makeArt(item:Item,body:BodyType){
  const art=WEARABLES[item.familyId]!,a=bodyAnchors({state:'idle',frame:0},body);
  const appearance={body,equipment:{[art.slot]:item}};
  const painter=new PixelPainter(64,64,1,12,4);
  if(art.slot==='armor')drawWearableBack(painter,appearance,WEARABLES,a);
  drawWearable(painter,appearance,art.slot,art,a,'back');drawWearable(painter,appearance,art.slot,art,a,'front');
  const hand=art.slot==='primary_hand'?a.primary:a.secondary;
  const {markup,crop,grip}=dungeonPortraitSvg(item.familyId,hand.x+12,hand.y+4);
  const pixels:CharacterPixels={width:64,height:64,pixels:painter.pixels};
  return {texture:{width:64,height:64,url:'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 64 64">${markup}</svg>`)},crop,grip,pixels};
}
export function dungeonItemPortrait(item:Item,body:BodyType):ReturnType<typeof makeArt>|null {
  if(!DUNGEON_PORTRAIT_IDS.includes(item.familyId))return null;
  const key=item.familyId+':'+body+':'+item.rarity;
  let art=cache.get(key);if(!art){art=makeArt(item,body);cache.set(key,art);}return art;
}
