import { Vec2 } from '../../core/vec2';
import type { CharacterAppearance } from '../character/appearance';
import type { GameEvent } from '../combat/events';
import { Projectile, type ProjectileSpec } from '../combat/projectile';
import { DangerZone, type DangerZoneSpec } from '../combat/danger-zone';
import type { Charge } from '../boss/boss';
import type { ItemRoll } from '../items/item';
import type { Match, MatchStatus, PlayerIntent } from '../match/match';
import type { SnapshotFrame } from './snapshot-codec';

/** Valori di rete provvisori: simulazione 60 Hz, snapshot e input 30 Hz. */
export const NETWORK = { protocolVersion: 2, capacity: 4, step: 1 / 60, snapshotSteps: 2, inputMs: 1000 / 30, staleInputMs: 350, maxBufferedBytes: 512_000 } as const;
export interface PartyMember { id: string; name: string; character: string; appearance: CharacterAppearance; gearScore: number; ready: boolean }
export interface PartyState { code: string; leaderId: string; dungeonId: string; members: PartyMember[]; playing: boolean }
export interface CombatStats { damageDealt: number; damageReceived: number; healing: number }
export interface BattleSnapshot {
  id: string; dungeonId: string; time: number; status: MatchStatus;
  players: { id: string; position: Vec2; aim: Vec2; health: number; mana: number; invulnerableFor: number; moving: boolean; cooldowns: number[] }[];
  boss: { position: Vec2; health: number; phase: 1 | 2; slowFor: number; charge: Charge | null };
  projectiles: { id: number; spec: ProjectileSpec; position: Vec2; angle: number; lifetime: number }[];
  zones: { id: number; spec: DangerZoneSpec; position: Vec2; remaining: number }[];
  report: Record<string, CombatStats>; rewards: Record<string, ItemRoll[]>; events: GameEvent[];
}
export type ClientMessage =
  | { type: 'enter'; code?: string; character: string; protocol: number }
  | { type: 'character'; character: string }
  | { type: 'choose'; dungeonId: string }
  | { type: 'ready'; ready: boolean }
  | { type: 'start' }
  | { type: 'input'; intent: PlayerIntent }
  | { type: 'ping'; sent: number };
export type ServerMessage =
  | { type: 'party'; playerId: string; state: PartyState; inviteBase?: string }
  | { type: 'snapshot'; snapshot: BattleSnapshot }
  | SnapshotFrame
  | { type: 'error'; message: string }
  | { type: 'pong'; sent: number };

/** JSON conserva i vettori come coordinate; qui si ripristinano soltanto i metodi geometrici. */
export function parseWire(text: string): unknown {
  return JSON.parse(text, (_key: string, value: unknown) => {
    if (value && typeof value === 'object' && 'x' in value && 'y' in value && Object.keys(value).length === 2) {
      const point = value as { x: unknown; y: unknown };
      if (typeof point.x === 'number' && typeof point.y === 'number') return new Vec2(point.x, point.y);
    }
    return value;
  });
}

export function snapshotOf(match: Match, id: string, events: GameEvent[], rewards: Record<string, ItemRoll[]>): BattleSnapshot {
  return {
    id, dungeonId: match.dungeon.id, time: match.time, status: match.status,
    players: [...match.players].map(([playerId, p]) => ({ id: playerId, position: p.position, aim: p.aim, health: p.health.current,
      mana: p.mana, invulnerableFor: p.invulnerableFor, moving: p.moving, cooldowns: p.skillBar.cooldowns() })),
    boss: { position: match.boss.position, health: match.boss.health.current, phase: match.boss.phase, slowFor: match.boss.slowFor, charge: match.boss.charge },
    projectiles: match.projectiles.map(p => ({ id: p.id, spec: p.spec, position: p.position, angle: p.velocity.angle(), lifetime: p.lifetime })),
    zones: match.zones.map(z => ({ id: z.id, spec: z.spec, position: z.position, remaining: z.remaining })),
    report: Object.fromEntries(match.report), rewards, events,
  };
}

interface ReplicaObjects {
  projectiles: Map<number, Projectile>; zones: Map<number, DangerZone>; live: Set<number>;
}
const replicas = new WeakMap<Match, ReplicaObjects>();

/** Riutilizza gli oggetti per id: gli snapshot non ricreano tutti i proiettili e le zone a ogni arrivo. */
export function applySnapshot(match: Match, snapshot: BattleSnapshot): void {
  let objects = replicas.get(match);
  if (!objects) { objects = { projectiles: new Map(), zones: new Map(), live: new Set() }; replicas.set(match, objects); }
  match.time = snapshot.time; match.status = snapshot.status;
  for (const state of snapshot.players) {
    const p = match.players.get(state.id); if (!p) continue;
    p.position = state.position; p.aim = state.aim; p.health.current = state.health; p.mana = state.mana;
    p.invulnerableFor = state.invulnerableFor; p.moving = state.moving; p.skillBar.restoreCooldowns(state.cooldowns);
  }
  Object.assign(match.boss, { position: snapshot.boss.position, phase: snapshot.boss.phase, slowFor: snapshot.boss.slowFor, charge: snapshot.boss.charge });
  match.boss.health.current = snapshot.boss.health;
  objects.live.clear(); match.projectiles.length = 0;
  for (const p of snapshot.projectiles) {
    let shot = objects.projectiles.get(p.id);
    if (!shot) { shot = new Projectile(p.id, p.spec, p.position, p.angle); objects.projectiles.set(p.id, shot); }
    shot.position = p.position; shot.lifetime = p.lifetime; objects.live.add(p.id); match.projectiles.push(shot);
  }
  for (const id of objects.projectiles.keys()) if (!objects.live.has(id)) objects.projectiles.delete(id);
  objects.live.clear(); match.zones.length = 0;
  for (const z of snapshot.zones) {
    let zone = objects.zones.get(z.id);
    if (!zone) { zone = new DangerZone(z.id, z.spec, z.position); objects.zones.set(z.id, zone); }
    zone.remaining = z.remaining; objects.live.add(z.id); match.zones.push(zone);
  }
  for (const id of objects.zones.keys()) if (!objects.live.has(id)) objects.zones.delete(id);
}

/** Input non fidato: nessuna posizione, statistica o skill arbitraria accettata dalla rete. */
export function cleanIntent(raw: unknown): PlayerIntent | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const vector = (v: unknown): Vec2 | null => {
    if (!v || typeof v !== 'object') return null;
    const p = v as Record<string, unknown>;
    return typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y)
      ? new Vec2(Math.max(-6000, Math.min(6000, p.x)), Math.max(-6000, Math.min(6000, p.y))) : null;
  };
  const move = vector(value.move), aimOffset = vector(value.aimOffset);
  if (!move || !aimOffset || !Array.isArray(value.skills) || value.skills.length !== 4 || value.skills.some(v => typeof v !== 'boolean')) return null;
  return { move: move.length() > 1 ? move.normalized() : move, aimOffset, skills: value.skills };
}
