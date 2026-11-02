import {describe,it,expect,vi} from 'vitest';
import {DescentRun} from './descent';
import {MINIONS} from '../minions/minion-catalog';
import {Vec2} from '../../core/vec2';
import {mobReward} from './mob-rewards';
import {snapshotOf,applySnapshot,replicaMatch} from '../network/protocol';
import {SnapshotEncoder,SnapshotDecoder} from '../network/snapshot-codec';
function run(dungeonId='crypt'){return new DescentRun({mode:'descent',dungeonId,seed:1,members:[{id:'a',characterClass:'mage',loadout:[],totalXp:96},{id:'b',characterClass:'warrior',loadout:[]}]});}
function kill(r:DescentRun,roll:number){vi.spyOn(r.match.rng,'next').mockReturnValue(roll);const m=r.match.spawnMinion(Object.values(MINIONS)[0]!,new Vec2(100,100));r.encounter.onMinionKilled(r.match,m,false);return m;}
describe('ricompense dei mob',()=>{
 it('soglia esatta del 70%: 0,6999 genera oro, 0,7 non lo genera; XP in entrambi i casi',()=>{
  const r=run();kill(r,.6999);expect(r.encounter.pickups).toHaveLength(1);kill(r,.7);expect(r.encounter.pickups).toHaveLength(1);
  r.syncProgress();expect(r.players.get('a')!.xp).toBe(8);expect(r.players.get('b')!.xp).toBe(8);expect(r.players.get('a')!.gold).toBe(0);
 });
 it('raccolta per prossimità, una quota per membro, nessun premio duplicato nelle viste o a fine stanza',()=>{
  const r=run();kill(r,0);r.match.player.position=new Vec2(100,100);r.encounter.step(0,r.match);
  r.syncProgress();expect(r.players.get('a')!.gold).toBe(3);expect(r.players.get('b')!.gold).toBe(0);
  r.encounter.step(0,r.match);r.view();r.view();expect(r.players.get('a')!.gold).toBe(3);
  r.match.players.get('b')!.position=new Vec2(100,100);r.encounter.step(0,r.match);r.match.end(false);r.advance();
  expect(r.players.get('a')!.gold).toBe(3);expect(r.players.get('b')!.gold).toBe(3);expect(r.players.get('a')!.xp).toBe(4);
 });
 it('nessuna raccolta da morto, né premi per despawn o autoesplosione',()=>{
  const r=run(),m=kill(r,0);r.match.player.position=m.position;r.match.player.health.current=0;r.encounter.step(0,r.match);
  r.encounter.onMinionKilled(r.match,m,true);r.syncProgress();expect(r.players.get('a')!.gold).toBe(0);expect(r.players.get('a')!.xp).toBe(4);
 });
 it('XP e quantità oro crescono con il pericolo; il livello aumenta subito senza curare il personaggio',()=>{
  let xp=0,gold=0;for(const dungeon of ['crypt','swamp','forge','glacier']){const reward=mobReward(dungeon);expect(reward.xp).toBeGreaterThan(xp);expect(reward.gold).toBeGreaterThan(gold);xp=reward.xp;gold=reward.gold;}
  const r=run(),p=r.match.player,hp=p.health.max,mp=p.maxMana;p.health.current=50;kill(r,1);expect(p.health.max).toBe(hp+3);expect(p.maxMana).toBe(mp+2);expect(p.health.current).toBe(50);
 });
 it('il codec trasporta un level-up nella stessa stanza, con HP/MP e statistiche della replica coerenti',()=>{
  const r=run(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.decode(encoder.encode(snapshotOf(r.match,'battle',[],{}, {run:r.view(),room:r.roomView()})));
  const replica=replicaMatch(r.dungeon,first.setup,[{id:'a',loadout:[]},{id:'b',loadout:[]}]);applySnapshot(replica,first);
  kill(r,0);const second=decoder.decode(encoder.encode(snapshotOf(r.match,'battle',[],{}, {run:r.view(),room:r.roomView()})));applySnapshot(replica,second);
  expect(replica.player.totalXp).toBe(100);expect(replica.player.health.max).toBe(r.match.player.health.max);expect(replica.player.maxMana).toBe(r.match.player.maxMana);expect(replica.player.stats).toEqual(r.match.player.stats);
 });
});
