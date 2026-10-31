/** Fixture sintetica: 40 secondi, quattro giocatori invulnerabili e boss in furia. Nessun salvataggio modificato. */
import { performance } from 'node:perf_hooks';
import { SeededRng } from '../src/core/rng';
import { Match } from '../src/features/match/match';
import { GLACIER } from '../src/features/dungeons/glacier/glacier';
import { MAGE_SKILLS } from '../src/features/skills/mage-skills';
import { snapshotOf, parseWire, applySnapshot, type BattleSnapshot } from '../src/features/network/protocol';
import { SnapshotEncoder, SnapshotDecoder } from '../src/features/network/snapshot-codec';
const options={rng:new SeededRng(10),dungeon:GLACIER,loadout:MAGE_SKILLS,members:['a','b','c','d'].map(id=>({id,loadout:MAGE_SKILLS}))};
const match=new Match(options),replica=new Match(options);match.boss.health.current=match.boss.health.max*.49;
for(const p of match.players.values())p.invulnerableFor=10000;
const snapshots:BattleSnapshot[]=[];for(let i=0;i<2400;i++){match.stepParty(1/60,new Map());if(i%2===1)snapshots.push(snapshotOf(match,'stress',[],{}));}
const full=snapshots.map(s=>JSON.stringify({type:'snapshot',snapshot:s}));
const encoder=new SnapshotEncoder();const compact=snapshots.map(s=>JSON.stringify(encoder.encode(s)));
let start=performance.now();for(const text of full){const m=parseWire(text) as {snapshot:BattleSnapshot};applySnapshot(replica,m.snapshot);}const legacyMs=performance.now()-start;
const decoder=new SnapshotDecoder();start=performance.now();for(const text of compact)applySnapshot(replica,decoder.decode(JSON.parse(text)));const compactMs=performance.now()-start;
const bytes=(texts:string[])=>texts.reduce((n,s)=>n+Buffer.byteLength(s),0);
const result={snapshots:snapshots.length,maxProjectiles:Math.max(...snapshots.map(s=>s.projectiles.length)),fullBytes:bytes(full),compactBytes:bytes(compact),reductionPercent:(1-bytes(compact)/bytes(full))*100,legacyDecodeApplyMs:legacyMs,compactDecodeApplyMs:compactMs};
console.log(JSON.stringify(result, null, 2));
