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
  readonly feet: readonly [FootAnchors,FootAnchors];
  /** Contorno delle dita che chiudono l'impugnatura: restano davanti all'arma, che copre il palmo. */
  readonly primaryFingers?: readonly Point[];
}
export interface FootAnchors {
  readonly ankle: Point;
  readonly sole: Point;
  /** Orlo dei pantaloni, dal lato esterno a quello interno: se presente, lo stivale passa sotto la gamba. */
  readonly cuff?: readonly [Point,Point];
}
/** Punti anatomici misurati sull'immagine della posa, in pixel dell'atlante originale. */
export const CLASS_POSES: Readonly<Record<CharacterClass,Readonly<Record<BodyType,PortraitPose>>>> = {
  warrior:{
    male:{crop:[150,5,310,505],primary:[419,291],secondary:[180,264],neck:[322,116],waist:[322,225],shoulders:[[254,142],[367,140]],feet:[{ankle:[199,449],sole:[183,499]},{ankle:[390,449],sole:[419,496]}]},
    female:{crop:[155,515,300,490],primary:[409,797],secondary:[189,758],neck:[316,636],waist:[316,724],shoulders:[[262,648],[352,651]],feet:[{ankle:[208,941],sole:[195,991]},{ankle:[387,943],sole:[416,989]}]},
  },
  archer:{
    male:{atlas:'archer-rest',detailScale:2.1,crop:[90,100,590,1070],primary:[584,729],secondary:[217,702],neck:[396,344],waist:[402,567],shoulders:[[260,387],[498,394]],feet:[{ankle:[183,1024],sole:[145,1145],cuff:[[153,1011],[214,1030]]},{ankle:[536,1030],sole:[608,1138],cuff:[[560,1024],[496,1029]]}],primaryFingers:[[546,727],[551,718],[557,713],[565,712],[575,716],[581,726],[586,738],[589,754],[578,758],[568,752],[556,747],[548,737]]},
    female:{atlas:'archer-rest',detailScale:2.1,crop:[700,145,520,1025],primary:[1113,752],secondary:[789,731],neck:[951,399],waist:[976,584],shoulders:[[848,432],[1029,443]],feet:[{ankle:[790,1034],sole:[752,1146],cuff:[[762,1015],[815,1027]]},{ankle:[1080,1033],sole:[1153,1139],cuff:[[1110,1028],[1055,1031]]}],primaryFingers:[[1092,747],[1095,742],[1099,735],[1108,735],[1114,745],[1116,760],[1117,783],[1109,785],[1099,782],[1093,778],[1087,769],[1087,759]]},
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
/** Taglia i piedi nudi della base lungo gli orli dei pantaloni: resta la gamba, che ricade sopra lo stivale. */
export function cuffClipPath(pose: PortraitPose): string|null {
  const [left,right]=[pose.feet[0].cuff,pose.feet[1].cuff];
  if(!left||!right) return null;
  const at=(x:number,y:number)=>((x-pose.crop[0])/pose.crop[2]*100)+'% '+((y-pose.crop[1])/pose.crop[3]*100)+'%';
  const line=(p:Point)=>at(p[0],p[1]);
  return 'polygon(0% 0%,100% 0%,'+at(pose.crop[0]+pose.crop[2],right[0][1])+','+line(right[0])+','+line(right[1])+','+line(left[1])+','+line(left[0])+','+at(pose.crop[0],left[0][1])+')';
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
/** Inclinazione attorno alla presa: la corda dell'arco resta fuori dal busto. Valore provvisorio. */
export const WEAPON_ROTATIONS:Readonly<Record<string,number>> = { hunter_bow:.2 };
/** Parte dell'arma davanti al corpo, sopra l'impugnatura: la corda ne resta fuori e passa dietro. Frazioni del ritaglio. */
export const WEAPON_FRONT_OUTLINES:Readonly<Record<string,readonly Point[]>> = { hunter_bow:[[.56,0],[1,0],[1,.545],[.55,.545],[.573,.148]] };
/** Tratto dell'impugnatura, fra due anelli, assottigliato attorno all'asse del legno e tenuto davanti al palmo. Frazioni del ritaglio; scala provvisoria. */
export interface WeaponGripSlice { readonly top:number; readonly bottom:number; readonly left:number; readonly axis:number; readonly scale:number }
export const WEAPON_GRIP_SLICES:Readonly<Record<string,WeaponGripSlice>> = { hunter_bow:{top:.545,bottom:.705,left:.50,axis:.605,scale:.85} };
/** Dietro al corpo passa tutto il resto dell'arma, corda compresa, senza il tratto assottigliato che lascerebbe sporgere i bordi. */
export function gripSliceRearPolygon(slice:WeaponGripSlice):string {
  const p=(x:number,y:number)=>x*100+'% '+y*100+'%';
  return 'polygon('+[p(0,0),p(1,0),p(1,slice.top),p(slice.left-.03,slice.top),p(slice.left-.03,slice.bottom),p(1,slice.bottom),p(1,.88),p(.6,.88),p(.6,1),p(0,1)].join(',')+')';
}
/** Poligono CSS di un contorno in pixel dell'atlante, relativo al ritaglio che lo contiene. */
export function cropPolygon(outline:readonly Point[],crop:AtlasRect):string {
  return 'polygon('+outline.map(p=>(p[0]-crop[0])/crop[2]*100+'% '+(p[1]-crop[1])/crop[3]*100+'%').join(',')+')';
}
/** `overPants`: contorni in pixel dell'atlante delle parti che restano sopra i pantaloni quando lo stivale passa sotto la gamba. */
export interface BootPart { readonly crop:AtlasRect; readonly ankle:Point; readonly sole:Point; readonly overPants?:readonly (readonly Point[])[] }
export const BOOT_PARTS:Readonly<Record<string,readonly [BootPart,BootPart]>> = {
  astral_boots:[{crop:[440,837,125,205],ankle:[.432,.556],sole:[.408,.98]},{crop:[565,837,145,205],ankle:[.30,.55],sole:[.614,.893]}],
  // Il ritaglio si ferma a x=912: oltre comincia la piuma dello stivale vicino.
  wind_boots:[
    {crop:[780,837,132,205],ankle:[.6024,.50],sole:[.5379,.975],overPants:[
      // Fronte del gambale sotto il bordo a V: interno e bordo posteriore restano nascosti.
      [[845,875],[866,892],[895,870],[893,905],[905,960],[905,990],[830,990],[838,960],[846,905]],
      [[798,851],[808,861],[828,877],[841,886],[846,902],[848,917],[843,927],[832,925],[817,920],[816,913],[820,911],[807,896],[805,887],[810,884],[801,872],[797,860]],
    ]},
    {crop:[912,837,160,205],ankle:[.3719,.50],sole:[.6316,.936],overPants:[
      [[950,876],[984,894],[1006,866],[1004,900],[1020,950],[1020,990],[930,990],[930,950],[950,905]],
      [[916,849],[927,859],[942,874],[956,886],[962,901],[963,917],[950,918],[938,911],[931,903],[934,898],[922,890],[921,881],[925,878],[918,868],[916,857]],
    ]},
  ],
  bog_boots:[{crop:[1120,837,150,205],ankle:[.533,.50],sole:[.467,.975]},{crop:[1270,837,160,205],ankle:[.331,.50],sole:[.669,.94]}],
};
