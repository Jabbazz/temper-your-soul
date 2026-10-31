import { describe, expect, it } from 'vitest';
import { ARMOR_ANCHORS, fitArmor } from './portrait-armor';
import { PORTRAIT_CROPS } from './portrait-layout';
import { CLASS_POSES, PORTRAIT_FRAME, posePoint, type Point } from './portrait-rig';

describe('vestibilità delle armature illustrate',()=>{
  it('allinea collo e cintura alle sei basi, senza giunti aperti fra busto e gonna',()=>{
    for(const poses of Object.values(CLASS_POSES))for(const body of ['male','female'] as const)for(const [family,variants] of Object.entries(ARMOR_ANCHORS)){
      const pose=poses[body],anchors=variants[body],crops=PORTRAIT_CROPS[family]!;
      const crop=body==='female'?crops[1]!:crops[0];
      const [upper,lower]=fitArmor(crop,anchors,pose);
      const pointOnUpper=(p:Point):Point=>{
        const u=(p[0]-upper!.crop[0])/upper!.crop[2];
        const y=(p[1]-upper!.crop[1])/upper!.crop[3]*upper!.rect[3];
        return [upper!.rect[0]+(upper!.mirror?1-u:u)*upper!.rect[2]+Math.tan(upper!.skew)*y*PORTRAIT_FRAME.height/PORTRAIT_FRAME.width,upper!.rect[1]+y];
      };
      for(const [source,target] of [[anchors.neck,pose.neck],[anchors.waist,pose.waist]] as const){
        const actual=pointOnUpper(source),expected=posePoint(pose,target);
        expect(actual[0],family+' '+body).toBeCloseTo(expected[0],10);
        expect(actual[1],family+' '+body).toBeCloseTo(expected[1],10);
      }
      expect(upper!.rect[1]+upper!.rect[3]).toBeCloseTo(lower!.rect[1],10);
      const upperBottomX=upper!.rect[0]+Math.tan(upper!.skew)*upper!.rect[3]*800/640;
      expect(upperBottomX).toBeCloseTo(lower!.rect[0],10);
      expect(lower!.rect[2]).toBe(upper!.rect[2]);
    }
  });
  it('le tuniche lunghe arrivano alle caviglie, le corazze lasciano visibili gli stivali',()=>{
    const pose=CLASS_POSES.mage.male;
    const ankle=Math.min(...pose.feet.map(f=>posePoint(pose,f.ankle)[1]));
    for(const family of ['meteor_mantle','tomb_shroud','blizzard_veil']){
      const lower=fitArmor(PORTRAIT_CROPS[family]![0],ARMOR_ANCHORS[family]!.male,pose)[1]!;
      expect(lower.rect[1]+lower.rect[3]).toBeGreaterThanOrEqual(ankle-1e-10);
    }
    const lower=fitArmor(PORTRAIT_CROPS.ember_aegis![0],ARMOR_ANCHORS.ember_aegis!.male,pose)[1]!;
    expect(lower.rect[1]+lower.rect[3]).toBeLessThan(ankle-.05);
  });
});
