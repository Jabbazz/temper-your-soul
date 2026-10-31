import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { SeededRng } from '../../core/rng';
import { Match } from '../match/match';
import { GLACIER } from '../dungeons/glacier/glacier';
import { CRYPT } from '../dungeons/crypt';
import { Projectile } from '../combat/projectile';
import { DangerZone } from '../combat/danger-zone';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { SnapshotEncoder, SnapshotDecoder, type SnapshotFrame } from './snapshot-codec';
import { applySnapshot, snapshotOf } from './protocol';

const wire = (frame: SnapshotFrame): SnapshotFrame => JSON.parse(JSON.stringify(frame)) as SnapshotFrame;
const create = (): Match => new Match({ rng: new SeededRng(12), dungeon: CRYPT, loadout: MAGE_SKILLS });
const spec = { team: 'enemy' as const, speed: 100, damage: 13, radius: 4, lifetime: 10, visual: 'arcane_bolt' };

describe('trasporto compatto ordinato', () => {
  it('invia un solo tipo per proiettili uguali e non ripete nascite o definizioni', () => {
    const match = create(), encoder = new SnapshotEncoder();
    match.projectiles.push(new Projectile(1, spec, Vec2.ZERO, 0), new Projectile(2, { ...spec }, Vec2.ZERO, 1));
    const first = encoder.encode(snapshotOf(match, 'a', [], {}));
    expect(first.ps).toHaveLength(1); expect(first.a).toHaveLength(2);
    const next = encoder.encode(snapshotOf(match, 'a', [], {}));
    expect(next.start).toBeUndefined(); expect(next.ps).toBeUndefined(); expect(next.a).toBeUndefined();
    expect(next.result).toBeUndefined(); expect(next.e).toBeUndefined();
  });
  it('ricostruisce traiettorie e countdown dal tempo autorevole, poi rimuove gli oggetti', () => {
    const match = create(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
    match.projectiles.push(new Projectile(1, spec, new Vec2(200, 150), .7));
    match.zones.push(new DangerZone(2, { team: 'enemy', radius: 60, delay: 2, damage: 10 }, new Vec2(300, 300)));
    decoder.decode(wire(encoder.encode(snapshotOf(match, 'a', [], {}))));
    match.time = .25; match.projectiles[0].advance(.25); match.zones[0].remaining -= .25;
    const frame = encoder.encode(snapshotOf(match, 'a', [], {})), state = decoder.decode(wire(frame));
    expect(frame.z).toBeUndefined(); expect(state.projectiles[0].position.distanceTo(match.projectiles[0].position)).toBeLessThan(1e-8);
    expect(state.zones[0].remaining).toBeCloseTo(1.75); expect(state.projectiles[0].lifetime).toBeCloseTo(9.75);
    match.projectiles = []; match.zones = [];
    const removed = encoder.encode(snapshotOf(match, 'a', [], {})); expect(removed.r).toEqual([1]); expect(removed.d).toEqual([2]);
    const end = decoder.decode(wire(removed)); expect(end.projectiles).toEqual([]); expect(end.zones).toEqual([]);
  });
  it('ripristina vettori degli eventi e della carica, mantenendo esito, report e premi finali', () => {
    const match = create(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
    match.boss.charge = { start: new Vec2(10, 20), target: new Vec2(100, 200), elapsed: 0, windup: 1, duration: .5 };
    match.status = 'won'; match.report.get('local')!.damageDealt = 1800;
    const frame = encoder.encode(snapshotOf(match, 'a', [{ type: 'boss_teleported', from: Vec2.ZERO, to: new Vec2(20, 20) }], { local: [] }));
    const state = decoder.decode(wire(frame)); expect(state.boss.charge!.start.distanceTo(Vec2.ZERO)).toBeGreaterThan(0);
    const event = state.events[0]; if (event.type !== 'boss_teleported') throw new Error('Evento perso');
    expect(event.to.sub(event.from)).toEqual(new Vec2(20, 20)); expect(state.report.local.damageDealt).toBe(1800);
    expect(state.status).toBe('won'); expect(state.rewards).toEqual({ local: [] });
  });
  it('un incontro nuovo azzera sequenza, tipi e oggetti precedenti; un delta perso fallisce esplicitamente', () => {
    const match = create(), encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
    match.projectiles.push(new Projectile(1, spec, Vec2.ZERO, 0)); decoder.decode(wire(encoder.encode(snapshotOf(match, 'a', [], {}))));
    encoder.encode(snapshotOf(match, 'a', [], {})); expect(() => decoder.decode(wire(encoder.encode(snapshotOf(match, 'a', [], {}))))).toThrow('Sequenza');
    match.projectiles = []; const frame = encoder.encode(snapshotOf(match, 'b', [], {}));
    expect(frame.q).toBe(0); expect(decoder.decode(wire(frame)).projectiles).toEqual([]);
  });
  it('riutilizza gli oggetti client per id e non conserva entità rimosse', () => {
    const match = create(), replica = create(); match.projectiles.push(new Projectile(1, spec, Vec2.ZERO, 0));
    match.zones.push(new DangerZone(2, { team: 'enemy', radius: 60, delay: 2, damage: 10 }, Vec2.ZERO));
    applySnapshot(replica, snapshotOf(match, 'a', [], {})); const shot = replica.projectiles[0], zone = replica.zones[0];
    match.projectiles[0].advance(.1); applySnapshot(replica, snapshotOf(match, 'a', [], {}));
    expect(replica.projectiles[0]).toBe(shot); expect(replica.zones[0]).toBe(zone); expect(shot.position.x).toBe(10);
    match.projectiles = []; match.zones = []; applySnapshot(replica, snapshotOf(match, 'a', [], {}));
    expect(replica.projectiles).toEqual([]); expect(replica.zones).toEqual([]);
  });
  it('40 secondi con 4 giocatori e boss in furia preservano tutte le traiettorie con molto meno traffico', () => {
    const match = new Match({ rng: new SeededRng(10), dungeon: GLACIER, loadout: MAGE_SKILLS,
      members: ['a', 'b', 'c', 'd'].map(id => ({ id, loadout: MAGE_SKILLS })) });
    match.boss.health.current *= .49; for (const p of match.players.values()) p.invulnerableFor = 10000;
    const encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder(); let fullBytes = 0, compactBytes = 0, shots = 0;
    for (let i = 0; i < 2400; i++) {
      match.stepParty(1 / 60, new Map()); if (i % 2 === 0) continue;
      const snapshot = snapshotOf(match, 'stress', [], {}), frame = encoder.encode(snapshot), state = decoder.decode(wire(frame));
      fullBytes += JSON.stringify(snapshot).length; compactBytes += JSON.stringify(frame).length;
      expect(state.projectiles.map(p => p.id)).toEqual(snapshot.projectiles.map(p => p.id));
      for (let j = 0; j < state.projectiles.length; j++) expect(state.projectiles[j].position.distanceTo(snapshot.projectiles[j].position)).toBeLessThan(1e-6);
      for (let j = 0; j < state.zones.length; j++) expect(state.zones[j].remaining).toBeCloseTo(snapshot.zones[j].remaining, 8);
      expect(state.boss.position.distanceTo(snapshot.boss.position)).toBeLessThan(.008); shots += state.projectiles.length;
    }
    expect(shots).toBeGreaterThan(10000); expect(compactBytes).toBeLessThan(fullBytes * .15);
  });
});
