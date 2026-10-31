import type { BodyType } from '../character/appearance';
import type { CharacterClass } from '../character/character-class';
import type { AtlasRect } from './portrait-layout';

// TODO(art): revisione manuale di sprite, vestibilità e pose sospesa su richiesta dell'utente.
// Non rigenerare asset per gli incrementi di gioco: difetti residui e criteri in docs/roadmap.md.

export type Point = readonly [number,number];
export const PORTRAIT_FRAME = {width:640,height:800} as const;
export const CLASS_POSE_ATLAS = {url:new URL('../../assets/portraits/class-bases-a.png',import.meta.url).href,width:1536,height:1024};
export const ARCHER_REST_ATLAS = {url:new URL('../../assets/portraits/archer-rest-a.png',import.meta.url).href,width:1254,height:1254};
export interface PortraitPose {
  readonly crop: AtlasRect;
  readonly atlas?: 'archer-rest';
  readonly detailScale?: number;
  readonly mirror?: boolean;
  readonly primary: Point;
  readonly secondary: Point;
  readonly neck: Point;
  readonly waist: Point;
  readonly shoulders: readonly [Point,Point];
  readonly feet: readonly [{readonly ankle:Point;readonly sole:Point},{readonly ankle:Point;readonly sole:Point}];
}
/** Punti anatomici misurati sull'immagine della posa, in pixel dell'atlante originale. */
export const CLASS_POSES: Readonly<Record<CharacterClass,Readonly<Record<BodyType,PortraitPose>>>> = {
  warrior:{
    male:{crop:[150,5,310,505],primary:[419,291],secondary:[180,264],neck:[322,116],waist:[322,225],shoulders:[[254,142],[367,140]],feet:[{ankle:[199,449],sole:[183,499]},{ankle:[390,449],sole:[419,496]}]},
    female:{crop:[155,515,300,490],primary:[409,797],secondary:[189,758],neck:[316,636],waist:[316,724],shoulders:[[262,648],[352,651]],feet:[{ankle:[208,941],sole:[195,991]},{ankle:[387,943],sole:[416,989]}]},
  },
  archer:{
    male:{atlas:'archer-rest',detailScale:2.1,crop:[90,100,590,1070],primary:[584,729],secondary:[217,702],neck:[396,344],waist:[402,567],shoulders:[[260,387],[498,394]],feet:[{ankle:[171,1024],sole:[145,1145]},{ankle:[536,1030],sole:[608,1138]}]},
    female:{atlas:'archer-rest',detailScale:2.1,crop:[700,145,520,1025],primary:[1113,752],secondary:[789,731],neck:[951,399],waist:[976,584],shoulders:[[848,432],[1029,443]],feet:[{ankle:[779,1034],sole:[752,1146]},{ankle:[1080,1033],sole:[1153,1139]}]},
  },
  mage:{
    male:{crop:[1050,5,325,505],mirror:true,primary:[1094,286],secondary:[1332,206],neck:[1203,116],waist:[1194,225],shoulders:[[1126,139],[1255,140]],feet:[{ankle:[1089,450],sole:[1077,500]},{ankle:[1280,450],sole:[1310,496]}]},
    female:{crop:[1070,515,310,490],mirror:true,primary:[1124,797],secondary:[1334,719],neck:[1207,638],waist:[1200,729],shoulders:[[1150,647],[1253,648]],feet:[{ankle:[1117,941],sole:[1103,991]},{ankle:[1290,942],sole:[1322,988]}]},
  },
};
export function poseAtlas(pose:PortraitPose):typeof CLASS_POSE_ATLAS {
  return pose.atlas==='archer-rest'?ARCHER_REST_ATLAS:CLASS_POSE_ATLAS;
}
export function posePlacement(pose: PortraitPose): AtlasRect {
  const h=.84,w=pose.crop[2]/pose.crop[3]*h*PORTRAIT_FRAME.height/PORTRAIT_FRAME.width;
  return [(1-w)/2,.12,w,h];
}
export function posePoint(pose: PortraitPose, point: Point): Point {
  const [x,y,w,h]=posePlacement(pose);
  const u=(point[0]-pose.crop[0])/pose.crop[2],v=(point[1]-pose.crop[1])/pose.crop[3];
  return [x+(pose.mirror?1-u:u)*w,y+v*h];
}
export interface Similarity { readonly left:number;readonly top:number;readonly width:number;readonly height:number;readonly rotation:number;readonly origin:Point }
/** Allinea impugnatura o caviglia, preservando le proporzioni. Origine e destinazione condividono lo stesso perno. */
export function attachAt(crop:AtlasRect, grip:Point, target:Point, height:number, rotation=0):Similarity {
  const width=height*crop[2]/crop[3]*PORTRAIT_FRAME.height/PORTRAIT_FRAME.width;
  return {left:target[0]-grip[0]*width,top:target[1]-grip[1]*height,width,height,rotation,origin:grip};
}
/** Due ancoraggi: la tomaia rimane attorno alla caviglia e la suola segue il piede della posa. */
export function fitBoot(crop:AtlasRect, ankle:Point, sole:Point, targetAnkle:Point,targetSole:Point, mirror=false):Similarity {
  const sx=(sole[0]-ankle[0])*crop[2]*(mirror?-1:1),sy=(sole[1]-ankle[1])*crop[3];
  const dx=(targetSole[0]-targetAnkle[0])*PORTRAIT_FRAME.width,dy=(targetSole[1]-targetAnkle[1])*PORTRAIT_FRAME.height;
  const scale=Math.hypot(dx,dy)/Math.hypot(sx,sy);
  const h=crop[3]*scale/PORTRAIT_FRAME.height;
  return attachAt(crop,ankle,targetAnkle,h,Math.atan2(dy,dx)-Math.atan2(sy,sx));
}
export const WEAPON_GRIPS:Readonly<Record<string,Point>> = {
  arcane_staff:[.363,.659],hunter_bow:[.58,.62],storm_scepter:[.375,.641],guardian_blade:[.357,.738],
  forge_hammer:[.346,.610],frost_lance:[.378,.623],frost_grimoire:[.432,.83],spirit_talisman:[.50,.23],spore_fan:[.52,.61],
};
export const WEAPON_HEIGHTS:Readonly<Record<string,number>> = {
  arcane_staff:.68,hunter_bow:.68,storm_scepter:.37,guardian_blade:.34,forge_hammer:.43,frost_lance:.76,
  frost_grimoire:.16,spirit_talisman:.15,spore_fan:.18,
};
export const BOOT_PARTS:Readonly<Record<string,readonly [{crop:AtlasRect;ankle:Point;sole:Point},{crop:AtlasRect;ankle:Point;sole:Point}]>> = {
  astral_boots:[{crop:[440,837,125,205],ankle:[.432,.556],sole:[.408,.98]},{crop:[565,837,145,205],ankle:[.30,.55],sole:[.614,.893]}],
  wind_boots:[{crop:[780,837,142,205],ankle:[.56,.50],sole:[.50,.975]},{crop:[922,837,150,205],ankle:[.33,.50],sole:[.607,.936]}],
  bog_boots:[{crop:[1120,837,150,205],ankle:[.533,.50],sole:[.467,.975]},{crop:[1270,837,160,205],ankle:[.331,.50],sole:[.669,.94]}],
};
