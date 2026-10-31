import type { BodyType } from '../character/appearance';
import type { AtlasRect } from './portrait-layout';
import { PORTRAIT_FRAME, posePoint, type Point, type PortraitPose } from './portrait-rig';

interface ArmorAnchors {
  readonly neck: Point;
  readonly waist: Point;
  readonly shoulders: readonly [Point,Point];
  /** Orlo all'altezza della caviglia per le tuniche, sopra per le corazze corte. */
  readonly hem: number;
}
/** Coordinate reali dell'indumento nell'atlante, distinte per il taglio maschile e femminile. */
export const ARMOR_ANCHORS:Readonly<Record<string,Readonly<Record<BodyType,ArmorAnchors>>>> = {
  meteor_mantle:{male:{neck:[194,58],waist:[202,211],shoulders:[[113,87],[267,99]],hem:1.02},female:{neck:[189,559],waist:[204,696],shoulders:[[117,586],[266,588]],hem:1.02}},
  ember_aegis:{male:{neck:[493,90],waist:[502,218],shoulders:[[420,115],[558,115]],hem:.65},female:{neck:[500,581],waist:[516,715],shoulders:[[428,606],[561,610]],hem:.65}},
  tomb_shroud:{male:{neck:[773,74],waist:[779,214],shoulders:[[690,105],[854,110]],hem:1},female:{neck:[775,574],waist:[775,713],shoulders:[[692,601],[853,611]],hem:1}},
  forge_plate:{male:{neck:[1068,81],waist:[1088,218],shoulders:[[981,121],[1136,125]],hem:.91},female:{neck:[1075,581],waist:[1089,714],shoulders:[[987,614],[1147,616]],hem:.91}},
  blizzard_veil:{male:{neck:[1386,90],waist:[1395,217],shoulders:[[1308,103],[1466,115]],hem:1.02},female:{neck:[1383,582],waist:[1395,714],shoulders:[[1307,614],[1463,620]],hem:1.02}},
};
export interface ArmorSection {
  readonly crop: AtlasRect;
  readonly rect: AtlasRect;
  readonly skew: number;
  readonly mirror: boolean;
}
/** Collo e cintura si allineano al busto; la gonna prosegue fino all'orlo senza spostare il colletto. */
export function fitArmor(crop:AtlasRect, anchors:ArmorAnchors, pose:PortraitPose):readonly ArmorSection[] {
  const neck=posePoint(pose,pose.neck),waist=posePoint(pose,pose.waist);
  const shoulders=pose.shoulders.map(p=>posePoint(pose,p));
  const widthScale=Math.abs(shoulders[1]![0]-shoulders[0]![0])*PORTRAIT_FRAME.width*1.1/Math.abs(anchors.shoulders[1][0]-anchors.shoulders[0][0]);
  const width=crop[2]*widthScale/PORTRAIT_FRAME.width;
  const mirror=pose.mirror??false;
  const sourceX=(x:number)=>mirror?crop[0]+crop[2]-x:x-crop[0];
  const nx=sourceX(anchors.neck[0])*widthScale/PORTRAIT_FRAME.width;
  const wx=sourceX(anchors.waist[0])*widthScale/PORTRAIT_FRAME.width;
  const scaleY=(waist[1]-neck[1])/(anchors.waist[1]-anchors.neck[1]);
  const upperHeight=(anchors.waist[1]-crop[1])*scaleY;
  const top=neck[1]-(anchors.neck[1]-crop[1])*scaleY;
  const shear=((waist[0]-wx)-(neck[0]-nx))/(waist[1]-neck[1]);
  const left=neck[0]-nx+shear*(top-neck[1]);
  const ankleY=Math.min(...pose.feet.map(f=>posePoint(pose,f.ankle)[1]));
  const hem=waist[1]+(ankleY-waist[1])*anchors.hem;
  return [
    {crop:[crop[0],crop[1],crop[2],anchors.waist[1]-crop[1]],rect:[left,top,width,upperHeight],skew:Math.atan(shear*PORTRAIT_FRAME.width/PORTRAIT_FRAME.height),mirror},
    {crop:[crop[0],anchors.waist[1],crop[2],crop[1]+crop[3]-anchors.waist[1]],rect:[waist[0]-wx,waist[1],width,hem-waist[1]],skew:0,mirror},
  ];
}
