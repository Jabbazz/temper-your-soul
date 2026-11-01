import { describe, expect, it } from 'vitest';
import { CHARACTER_CLASSES } from '../character/character-class';
import { CLASS_POSES, cropPolygon, cuffClipPath, gripSliceRearPolygon, poseAtlas, posePlacement, posePoint, attachAt, fitBoot, WEAPON_GRIPS, WEAPON_HEIGHTS, WEAPON_FRONT_OUTLINES, WEAPON_GRIP_SLICES, BOOT_PARTS, PORTRAIT_FRAME } from './portrait-rig';
import { dungeonPortraitSvg } from './dungeon-portrait-svg';
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
  it('arciere: la gamba ricade sullo stivale, tagliata lungo gli orli sotto le mani e sopra le suole',()=>{
    for(const body of ['male','female'] as const){
      const pose=CLASS_POSES.archer[body],clip=cuffClipPath(pose)!;
      expect(clip.startsWith('polygon(0% 0%,100% 0%,')).toBe(true);
      for(const foot of pose.feet){
        for(const point of foot.cuff!){
          expect(point[1],body).toBeGreaterThan(Math.max(pose.primary[1],pose.secondary[1]));
          expect(point[1],body).toBeLessThan(foot.sole[1]);
          expect(point[0]>=pose.crop[0]&&point[0]<=pose.crop[0]+pose.crop[2],body).toBe(true);
        }
      }
      const [left,right]=[pose.feet[0].cuff!,pose.feet[1].cuff!];
      expect(left[0][0]).toBeLessThan(left[1][0]);expect(left[1][0]).toBeLessThan(right[1][0]);expect(right[1][0]).toBeLessThan(right[0][0]);
    }
    expect(cuffClipPath(CLASS_POSES.warrior.male)).toBeNull();
    expect(cuffClipPath(CLASS_POSES.mage.female)).toBeNull();
  });
  it('arciere: le dita chiudono la presa dal lato del corpo e il palmo resta scoperto per l\'arco',()=>{
    for(const body of ['male','female'] as const){
      const pose=CLASS_POSES.archer[body],outline=pose.primaryFingers!,xs=outline.map(p=>p[0]);
      for(const [x,y] of outline)expect(x>=pose.crop[0]&&x<=pose.crop[0]+pose.crop[2]&&y>=pose.crop[1]&&y<=pose.crop[1]+pose.crop[3],body).toBe(true);
      expect(Math.min(...xs),body).toBeLessThan(pose.primary[0]);
      // Le dita arrivano appena oltre la presa: a destra comincia il palmo, che l'arco deve coprire.
      expect(Math.max(...xs)-pose.primary[0],body).toBeLessThanOrEqual(6);
    }
  });
  it('l\'impugnatura assottigliata contiene la presa e continua la parte anteriore dell\'arco',()=>{
    const front=WEAPON_FRONT_OUTLINES.hunter_bow!,grip=WEAPON_GRIPS.hunter_bow!,slice=WEAPON_GRIP_SLICES.hunter_bow!;
    for(const [x,y] of front)expect(x>=0&&x<=1&&y>=0&&y<=1).toBe(true);
    expect(Math.max(...front.map(p=>p[1]))).toBe(slice.top);
    expect(slice.top).toBeLessThan(grip[1]);expect(slice.bottom).toBeGreaterThan(grip[1]);
    expect(slice.scale).toBeGreaterThan(.7);expect(slice.scale).toBeLessThan(1);
    expect(slice.axis).toBeGreaterThan(slice.left);
    expect(gripSliceRearPolygon(slice).startsWith('polygon(0% 0%,100% 0%,')).toBe(true);
  });
  it('le parti sopra i pantaloni stanno dentro il ritaglio del proprio stivale',()=>{
    for(const part of BOOT_PARTS.wind_boots!){
      expect(part.overPants!.length).toBe(2);
      for(const outline of part.overPants!)for(const [x,y] of outline){
        expect(x>=part.crop[0]&&x<=part.crop[0]+part.crop[2]).toBe(true);
        expect(y>=part.crop[1]&&y<=part.crop[1]+part.crop[3]).toBe(true);
      }
    }
    expect(cropPolygon([[10,20],[30,40]],[10,20,20,40])).toBe('polygon(0% 0%,100% 50%)');
  });
  it('arciere: il gambale dello stivale frontale resta sotto l\'orlo dei pantaloni',()=>{
    for(const body of ['male','female'] as const){
      const foot=CLASS_POSES.archer[body].feet[0],[outer,inner]=foot.cuff!;
      expect(foot.ankle[0],body).toBeGreaterThan(outer[0]);
      expect(foot.ankle[0],body).toBeLessThan(inner[0]);
    }
  });
  it('i due stivali del vento hanno ritagli separati, senza la piuma dello stivale vicino',()=>{
    const [left,right]=BOOT_PARTS.wind_boots!;
    expect(left.crop[0]+left.crop[2]).toBeLessThanOrEqual(right.crop[0]);
  });
  it('il mantello delle canne separa la parte dietro il corpo dai lembi anteriori',()=>{
    const reed=dungeonPortraitSvg('reed_mantle',0,0);
    expect(reed.rearMarkup).toBeTruthy();
    expect(reed.markup).not.toBe(reed.rearMarkup);
    // Davanti arriva al massimo alla cintura (y=39 sulla griglia): gambe e bacino restano scoperti.
    const ys=[...reed.markup.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(match=>Number(match[2]));
    expect(Math.max(...ys)).toBeLessThanOrEqual(39);
    expect(dungeonPortraitSvg('thorn_bow',30,30).rearMarkup).toBeUndefined();
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
