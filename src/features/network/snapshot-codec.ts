import { Vec2 } from '../../core/vec2';
import type { Charge } from '../boss/boss';
import type { DangerZoneSpec } from '../combat/danger-zone';
import type { GameEvent } from '../combat/events';
import type { ProjectileSpec } from '../combat/projectile';
import type { MatchStatus } from '../match/match';
import type { BattleSnapshot } from './protocol';

type PlayerState = [number, number, number, number, number, number, number, number, number[]];
type ProjectileBirth = [number, number, number, number, number, number];
type ZoneBirth = [number, number, number, number, number];
/** Servitore: id, tipo (id stabile), x, y, vita. Pochi e sempre in movimento: si inviano interi a ogni frame. */
type MinionState = [number, string, number, number, number];
/** Ordine garantito da WebSocket: definizioni e nascite una volta, poi soltanto rimozioni.
 * Proiettili lineari e countdown sono ricavati dal tempo autorevole, senza simulare collisioni lato client. */
export interface SnapshotFrame {
  type: 'frame'; q: number; t: number; s: MatchStatus;
  start?: [string, string, string[]];
  p: PlayerState[]; b: [number, number, number, 1 | 2, number, Charge | null];
  ps?: ProjectileSpec[]; zs?: DangerZoneSpec[];
  a?: ProjectileBirth[]; r?: number[]; z?: ZoneBirth[]; d?: number[];
  e?: GameEvent[]; result?: Pick<BattleSnapshot, 'report' | 'rewards'>;
  m?: MinionState[];
}

/** Arrotondamento solo della rappresentazione: errore massimo 0,005 unità, mai applicato alla simulazione. */
const compact = (value: number): number => Math.round(value * 100) / 100;

export class SnapshotEncoder {
  private battle = '';
  private sequence = 0;
  private shots = new Set<number>();
  private zones = new Set<number>();
  private projectileTypes = new Map<string, number>();
  private zoneTypes = new Map<string, number>();
  private readonly keys = new WeakMap<object, string>();
  encode(snapshot: BattleSnapshot): SnapshotFrame {
    const initial = snapshot.id !== this.battle;
    if (initial) {
      this.battle = snapshot.id; this.sequence = 0; this.shots.clear(); this.zones.clear();
      this.projectileTypes.clear(); this.zoneTypes.clear();
    }
    const frame: SnapshotFrame = {
      type: 'frame', q: this.sequence++, t: snapshot.time, s: snapshot.status,
      p: snapshot.players.map(p => [compact(p.position.x), compact(p.position.y), compact(p.aim.x), compact(p.aim.y),
        p.health, compact(p.mana), compact(p.invulnerableFor), p.moving ? 1 : 0, p.cooldowns.map(compact)]),
      b: [compact(snapshot.boss.position.x), compact(snapshot.boss.position.y), snapshot.boss.health, snapshot.boss.phase, compact(snapshot.boss.slowFor), snapshot.boss.charge],
    };
    if (initial) frame.start = [snapshot.id, snapshot.dungeonId, snapshot.players.map(p => p.id)];
    const specIndex = <T extends object>(spec: T, registry: Map<string, number>, added: T[]): number => {
      let key = this.keys.get(spec); if (!key) { key = JSON.stringify(spec); this.keys.set(spec, key); }
      let index = registry.get(key);
      if (index === undefined) { index = registry.size; registry.set(key, index); added.push(spec); }
      return index;
    };
    const ps: ProjectileSpec[] = [], zs: DangerZoneSpec[] = [], births: ProjectileBirth[] = [], zones: ZoneBirth[] = [];
    const liveShots = new Set<number>(), liveZones = new Set<number>();
    for (const p of snapshot.projectiles) {
      liveShots.add(p.id);
      if (!this.shots.has(p.id)) births.push([p.id, specIndex(p.spec, this.projectileTypes, ps), p.position.x, p.position.y, p.angle, p.lifetime]);
    }
    for (const z of snapshot.zones) {
      liveZones.add(z.id);
      if (!this.zones.has(z.id)) zones.push([z.id, specIndex(z.spec, this.zoneTypes, zs), z.position.x, z.position.y, z.remaining]);
    }
    const removed = [...this.shots].filter(id => !liveShots.has(id)), detonated = [...this.zones].filter(id => !liveZones.has(id));
    this.shots = liveShots; this.zones = liveZones;
    if (ps.length) frame.ps = ps; if (zs.length) frame.zs = zs;
    if (births.length) frame.a = births; if (zones.length) frame.z = zones;
    if (removed.length) frame.r = removed; if (detonated.length) frame.d = detonated;
    if (snapshot.events.length) frame.e = snapshot.events;
    if (snapshot.minions.length) frame.m = snapshot.minions.map(m => [m.id, m.kind, compact(m.position.x), compact(m.position.y), m.health]);
    if (snapshot.status !== 'playing') frame.result = { report: snapshot.report, rewards: snapshot.rewards };
    return frame;
  }
}

const vector = (p: Vec2): Vec2 => new Vec2(p.x, p.y);
function reviveEvent(event: GameEvent): GameEvent {
  switch (event.type) {
    case 'skill_cast': return { ...event, origin: vector(event.origin), destination: vector(event.destination) };
    case 'boss_teleported': return { ...event, from: vector(event.from), to: vector(event.to) };
    case 'boss_pose': case 'match_ended': return event;
    default: return { ...event, position: vector(event.position) };
  }
}

export class SnapshotDecoder {
  private battle = '';
  private dungeon = '';
  private ids: string[] = [];
  private sequence = -1;
  private readonly projectileTypes: ProjectileSpec[] = [];
  private readonly zoneTypes: DangerZoneSpec[] = [];
  private readonly shots = new Map<number, { state: BattleSnapshot['projectiles'][number]; origin: Vec2; velocity: Vec2; time: number; lifetime: number }>();
  private readonly zones = new Map<number, { state: BattleSnapshot['zones'][number]; time: number; remaining: number }>();
  decode(frame: SnapshotFrame): BattleSnapshot {
    if (frame.start) {
      [this.battle, this.dungeon, this.ids] = frame.start; this.sequence = -1;
      this.projectileTypes.length = 0; this.zoneTypes.length = 0; this.shots.clear(); this.zones.clear();
    }
    if (!this.battle || frame.q !== this.sequence + 1) throw new Error('Sequenza di rete interrotta. Rientra nel party.');
    this.sequence = frame.q;
    this.projectileTypes.push(...(frame.ps ?? [])); this.zoneTypes.push(...(frame.zs ?? []));
    for (const [id, index, x, y, angle, lifetime] of frame.a ?? []) {
      const spec = this.projectileTypes[index]; if (!spec) throw new Error('Proiettile di rete sconosciuto.');
      const origin = new Vec2(x, y), state = { id, spec, position: origin, angle, lifetime };
      this.shots.set(id, { state, origin, velocity: Vec2.fromAngle(angle, spec.speed), time: frame.t, lifetime });
    }
    for (const id of frame.r ?? []) this.shots.delete(id);
    for (const [id, index, x, y, remaining] of frame.z ?? []) {
      const spec = this.zoneTypes[index]; if (!spec) throw new Error('Zona di rete sconosciuta.');
      this.zones.set(id, { state: { id, spec, position: new Vec2(x, y), remaining }, time: frame.t, remaining });
    }
    for (const id of frame.d ?? []) this.zones.delete(id);
    const projectiles: BattleSnapshot['projectiles'] = [], zones: BattleSnapshot['zones'] = [];
    for (const shot of this.shots.values()) {
      const elapsed = frame.t - shot.time;
      shot.state.position = shot.origin.add(shot.velocity.mul(elapsed)); shot.state.lifetime = shot.lifetime - elapsed;
      projectiles.push(shot.state);
    }
    for (const zone of this.zones.values()) { zone.state.remaining = zone.remaining - (frame.t - zone.time); zones.push(zone.state); }
    const [x, y, health, phase, slowFor, charge] = frame.b;
    return {
      id: this.battle, dungeonId: this.dungeon, time: frame.t, status: frame.s,
      players: frame.p.map(([px, py, ax, ay, hp, mana, invulnerableFor, moving, cooldowns], i) => ({ id: this.ids[i],
        position: new Vec2(px, py), aim: new Vec2(ax, ay), health: hp, mana, invulnerableFor, moving: moving === 1, cooldowns })),
      boss: { position: new Vec2(x, y), health, phase, slowFor, charge: charge ? { ...charge, start: vector(charge.start), target: vector(charge.target) } : null },
      projectiles, zones, report: frame.result?.report ?? {}, rewards: frame.result?.rewards ?? {}, events: (frame.e ?? []).map(reviveEvent),
      minions: (frame.m ?? []).map(([id, kind, mx, my, hp]) => ({ id, kind, position: new Vec2(mx, my), health: hp })),
    };
  }
}
