import {describe,it,expect} from 'vitest';
import {Vec2} from '../../core/vec2';
import {HubState,HUB_STATIONS,HUB_OBSTACLES,HUB_MAP,hubBlocked} from './hub-state';
describe('piazza e collisioni del rifugio',()=>{
 it('blocca il centro di ogni NPC, struttura, casa e cassa',()=>{
  for(const o of HUB_OBSTACLES)expect(hubBlocked(new Vec2(o.x+o.width/2,o.y+o.height/2))).toBe(true);
  expect(hubBlocked(new Vec2(-1,200))).toBe(true);expect(hubBlocked(new Vec2(480,426))).toBe(false);
 });
 it('ferma il personaggio davanti al mercante, anche con un passo lungo, e consente E senza calpestarlo',()=>{
  const state=new HubState();state.position=new Vec2(270,540);state.step(2,new Vec2(0,-1));
  expect(hubBlocked(state.position)).toBe(false);expect(state.position.y).toBeGreaterThanOrEqual(486);expect(state.nearest()!.id).toBe('merchant');
  state.step(1,new Vec2(-1,0));state.step(1,new Vec2(0,-1));expect(state.position.y).toBeLessThan(462);
 });
 it('tutti i punti di interazione sono raggiungibili dalla partenza senza attraversare ostacoli',()=>{
  const reached=new Set<string>(),visited=new Set<string>(),queue=[new Vec2(480,424)];
  for(let i=0;i<queue.length;i++){
   const p=queue[i]!,key=p.x+','+p.y;if(visited.has(key)||hubBlocked(p))continue;visited.add(key);
   for(const s of HUB_STATIONS)if(p.distanceTo(new Vec2(s.x,s.y))<HUB_MAP.interactionRadius)reached.add(s.id);
   for(const d of [new Vec2(8,0),new Vec2(-8,0),new Vec2(0,8),new Vec2(0,-8)]){const q=p.add(d);if(!visited.has(q.x+','+q.y))queue.push(q);}
  }
  expect([...reached].sort()).toEqual(HUB_STATIONS.map(s=>s.id).sort());
 });
 it('il moto a 60 Hz scorre lungo le case senza penetrare e aggiorna la direzione dello sprite',()=>{
  const state=new HubState();state.position=new Vec2(170,260);
  for(let i=0;i<120;i++){state.step(1/60,new Vec2(-1,.5));expect(hubBlocked(state.position)).toBe(false);}
  expect(state.facing).toBe(-1);expect(state.position.y).toBeGreaterThan(260);state.step(1/60,Vec2.ZERO);expect(state.moving).toBe(false);
 });
});
