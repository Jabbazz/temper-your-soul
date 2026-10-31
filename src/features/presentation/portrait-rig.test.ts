import { describe, expect, it } from 'vitest';
import { CHARACTER_CLASSES } from '../character/character-class';
import { CLASS_POSES, poseAtlas, posePlacement, posePoint, attachAt, fitBoot, WEAPON_GRIPS, WEAPON_HEIGHTS, BOOT_PARTS, PORTRAIT_FRAME } from './portrait-rig';
import { PORTRAIT_CROPS } from './portrait-layout';
import { Character } from '../character/character';
import { deserializeCharacter, serializeCharacter } from '../character/save-format';

describe('pose di classe e agganci anatomici',()=>{
  it('tre pose distinte per ciascun sesso, con mani e piedi dentro al fotogramma',()=>{
    for(const body of ['male','female'] as const){
      const hands=new Set<string>();
      for(const kind of CHARACTER_CLASSES){
        const pose=CLASS_POSES[kind][body],box=posePlacement(pose);
        expect(pose.crop[0]+pose.crop[2]).toBeLessThanOrEqual(poseAtlas(pose).width);
        expect(pose.crop[1]+pose.crop[3]).toBeLessThanOrEqual(poseAtlas(pose).height);
        expect(box[0]>=0&&box[0]+box[2]<=1).toBe(true);
        for(const point of [pose.primary,pose.secondary,pose.neck,pose.waist,...pose.feet.flatMap(f=>[f.ankle,f.sole])]){
          const [x,y]=posePoint(pose,point);expect(x>=0&&x<=1&&y>=0&&y<=1,kind+' '+body).toBe(true);
        }
        hands.add(JSON.stringify([posePoint(pose,pose.primary),posePoint(pose,pose.secondary)]));
      }
      expect(hands.size).toBe(3);
    }
  });
  it('ogni arma e secondaria conserva la presa esattamente sulla mano, su tutte le sei pose',()=>{
    for(const kind of CHARACTER_CLASSES)for(const body of ['male','female'] as const){
      const pose=CLASS_POSES[kind][body];
      for(const [id,grip] of Object.entries(WEAPON_GRIPS)){
        const secondary=['frost_grimoire','spirit_talisman','spore_fan'].includes(id);
        const target=posePoint(pose,secondary?pose.secondary:pose.primary);
        const fit=attachAt(PORTRAIT_CROPS[id]![0],grip,target,WEAPON_HEIGHTS[id]!);
        expect(fit.left+grip[0]*fit.width).toBeCloseTo(target[0],12);
        expect(fit.top+grip[1]*fit.height).toBeCloseTo(target[1],12);
      }
    }
  });
  it('caviglia e suola di ciascuno stivale coincidono con quelle della propria gamba, anche in posa specchiata',()=>{
    for(const kind of CHARACTER_CLASSES)for(const body of ['male','female'] as const)for(const parts of Object.values(BOOT_PARTS)){
      const pose=CLASS_POSES[kind][body];
      parts.forEach((part,index)=>{
        const foot=pose.feet[index]!,a=posePoint(pose,foot.ankle),b=posePoint(pose,foot.sole);
        const fit=fitBoot(part.crop,part.ankle,part.sole,a,b,pose.mirror);
        expect(fit.left+part.ankle[0]*fit.width).toBeCloseTo(a[0],12);
        expect(fit.top+part.ankle[1]*fit.height).toBeCloseTo(a[1],12);
        const scale=fit.width*PORTRAIT_FRAME.width/part.crop[2];
        const sx=(part.sole[0]-part.ankle[0])*part.crop[2]*(pose.mirror?-1:1);
        const sy=(part.sole[1]-part.ankle[1])*part.crop[3];
        const x=a[0]*640+(sx*Math.cos(fit.rotation)-sy*Math.sin(fit.rotation))*scale;
        const y=a[1]*800+(sx*Math.sin(fit.rotation)+sy*Math.cos(fit.rotation))*scale;
        expect(x).toBeCloseTo(b[0]*640,8);expect(y).toBeCloseTo(b[1]*800,8);
      });
    }
  });
  it('la classe viene scelta una volta e salvata senza modificare equipaggiamento o progressi',()=>{
    const character=Character.createStarter();character.totalXp=270;
    const before=JSON.stringify(character.inventory);
    expect(character.chooseClass('warrior')).toBe(true);
    expect(character.chooseClass('mage')).toBe(false);
    const loaded=deserializeCharacter(serializeCharacter(character))!;
    expect(loaded.characterClass).toBe('warrior');expect(loaded.totalXp).toBe(270);
    expect(JSON.stringify(loaded.inventory)).toBe(before);
    expect(loaded.appearance().characterClass).toBe('warrior');
  });
  it('migra i vecchi salvataggi chiedendo la classe e preservando gli oggetti',()=>{
    const old=Character.createStarter();old.bodyType='female';old.totalXp=450;
    const data=JSON.parse(serializeCharacter(old));data.version=3;delete data.characterClass;
    const migrated=deserializeCharacter(JSON.stringify(data))!;
    expect(migrated.characterClass).toBeNull();expect(migrated.bodyType).toBe('female');
    expect(migrated.inventory).toEqual(old.inventory);expect(migrated.totalXp).toBe(450);
    data.characterClass='inesistente';expect(deserializeCharacter(JSON.stringify(data))?.characterClass).toBeNull();
  });
});
