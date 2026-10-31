import { describe,expect,it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { CRYPT_ARENA } from '../dungeons/crypt';
import { Player } from '../player/player';
import { tryCastSkill,type SkillContext } from '../skills/skill-effects';
import { manaCost } from '../skills/mana';
import { DUNGEON_ITEM_SKILLS } from './dungeon-item-skills';
import { familyById } from './item-families';
import type { ProjectileSpec } from '../combat/projectile';
import type { DangerZoneSpec } from '../combat/danger-zone';
import { DUNGEON_PORTRAIT_IDS,dungeonItemPortrait } from '../presentation/dungeon-item-portraits';
import { ITEM_SPRITES } from '../presentation/item-sprites';
import { SKILL_ICONS } from '../presentation/skill-icons';
import { characterPixels } from '../presentation/character-art';
import { PROJECTILE_LOOKS } from '../presentation/visuals';

function harness(id:string){
  const player=new Player({...CRYPT_ARENA,pillars:[]},[familyById(id)!.skill,null,null,null]);
  player.position=new Vec2(500,500);player.aim=new Vec2(800,500);
  const projectiles:ProjectileSpec[]=[],angles:number[]=[],zones:DangerZoneSpec[]=[];
  const ctx:SkillContext={player,spawnProjectile:(spec,_p,angle)=>{projectiles.push(spec);angles.push(angle);},spawnZone:(spec)=>zones.push(spec),strikeArc:()=>{},emit:()=>{}};
  return {player,ctx,projectiles,angles,zones};
}
describe('otto nuovi kit dungeon',()=>{
  it('proiettili con conteggi, ventagli e forme proprie, consumo mana e ricarica',()=>{
    const shapes=new Set<string>();
    for(const [id,count] of [['ossuary_lantern',2],['thorn_bow',2],['cinder_orb',3],['glacier_mirror',5]] as const){
      const h=harness(id),before=h.player.mana;
      expect(tryCastSkill(0,h.ctx)).toBe(true);expect(h.projectiles).toHaveLength(count);
      expect(new Set(h.angles).size).toBe(count);
      expect(h.player.mana).toBeCloseTo(before-manaCost(familyById(id)!.skill));
      expect(tryCastSkill(0,h.ctx)).toBe(false);
      expect(h.projectiles.every(p=>p.damage>0&&p.visual===familyById(id)!.skill.visual)).toBe(true);
      shapes.add(PROJECTILE_LOOKS[h.projectiles[0]!.visual]!.shape);
    }
    expect(shapes.size).toBe(4);
  });
  it('mantello di canne: zona sul giocatore con avviso e rallentamento',()=>{
    const h=harness('reed_mantle');expect(tryCastSkill(0,h.ctx)).toBe(true);
    expect(h.zones).toEqual([expect.objectContaining({radius:145,delay:.7,damage:145,slowSeconds:1.1,visual:'reed_burst'})]);
  });
  it('tre passi distinti, con distanza e protezione proprie',()=>{
    for(const [id,distance,invulnerability] of [['grave_boots',110,.85],['ember_treads',230,.25],['rime_boots',165,.4]] as const){
      const h=harness(id),start=h.player.position;expect(tryCastSkill(0,h.ctx)).toBe(true);
      expect(h.player.position.distanceTo(start)).toBeCloseTo(distance,8);expect(h.player.invulnerableFor).toBe(invulnerability);
    }
  });
  it('kit completo nelle due versioni di corpo: icona, spell, strato indossato e ritratto dedicato',()=>{
    expect(DUNGEON_PORTRAIT_IDS.length).toBe(Object.keys(DUNGEON_ITEM_SKILLS).length);
    for(const body of ['male','female'] as const){
      const signatures=new Set<string>();
      for(const id of DUNGEON_PORTRAIT_IDS){
        const family=familyById(id)!,item={uid:'test',familyId:id,rarity:'rare' as const};
        expect(ITEM_SPRITES[id]).toBeDefined();expect(SKILL_ICONS[id]).toBeDefined();
        const art=dungeonItemPortrait(item,body)!;expect(art).not.toBeNull();
        expect(art.crop[2]).toBeGreaterThan(0);expect(art.crop[3]).toBeGreaterThan(0);
        signatures.add(art.texture.url);
        const base=characterPixels({body,equipment:{}},'game');
        expect(characterPixels({body,equipment:{[family.slot]:item}},'game').pixels).not.toEqual(base.pixels);
      }
      expect(signatures.size).toBe(8);
    }
  });
});
