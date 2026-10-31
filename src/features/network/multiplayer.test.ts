import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { SeededRng } from '../../core/rng';
import { Character } from '../character/character';
import { serializeCharacter } from '../character/save-format';
import { DangerZone } from '../combat/danger-zone';
import { Projectile } from '../combat/projectile';
import { CRYPT } from '../dungeons/crypt';
import { Match, type PlayerIntent } from '../match/match';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { PartyRoom } from './party-room';
import { applySnapshot, cleanIntent, NETWORK, parseWire, snapshotOf } from './protocol';

function character(name = 'Alice'): string {
  const c = Character.createStarter(); c.completeCreation(name, 'female', 'mage'); return serializeCharacter(c);
}
function room(): PartyRoom { const r = new PartyRoom('test'); r.enter('a', character()); r.enter('b', character('Bruno')); return r; }
function match(): Match {
  const m = new Match({ rng: new SeededRng(7), dungeon: CRYPT, loadout: MAGE_SKILLS, members: ['a', 'b'].map(id => ({ id, loadout: MAGE_SKILLS })) });
  m.boss.attackTimer = 1e6; return m;
}
const idle: PlayerIntent = { move: Vec2.ZERO, aimOffset: new Vec2(100, 0), skills: [false, false, false, false] };

describe('lobby autorevole', () => {
  it('il creatore è leader; i membri non possono scegliere o avviare', () => {
    const r = room(); expect(r.leaderId).toBe('a');
    expect(() => r.choose('b', 'swamp')).toThrow('Solo il leader'); expect(() => r.start('b', 'id', 1)).toThrow('Solo il leader');
  });
  it('richiede tutti pronti e il GS di ciascun membro, senza cambiare il mondo su rifiuto', () => {
    const r = room(); expect(() => r.start('a', 'id', 1)).toThrow('pronti'); r.choose('a', 'forge'); r.ready.add('a'); r.ready.add('b');
    expect(() => r.start('a', 'id', 1)).toThrow('100 GS'); expect(r.match).toBeNull();
    r.choose('a', 'glacier'); r.ready.add('a'); r.ready.add('b'); expect(() => r.start('a', 'id', 1)).toThrow('200 GS');
  });
  it('cambiare destinazione azzera le conferme e avvia un unico boss condiviso', () => {
    const r = room(); r.ready.add('a'); r.choose('a', 'swamp'); expect(r.ready.size).toBe(0);
    r.ready.add('a'); r.ready.add('b'); r.start('a', 'battle', 2);
    expect(r.match?.players.size).toBe(2); expect(r.match?.dungeon.id).toBe('swamp');
    expect(() => r.enter('c', character('Carlo'))).toThrow('già in dungeon'); expect(() => r.choose('a', 'crypt')).toThrow('già iniziata');
  });
  it('capienza e dati non fidati vengono validati; uscita del leader passa il comando', () => {
    const r = room(); expect(() => r.enter('c', '{}')).toThrow('personaggio');
    r.enter('c', character('Carlo')); r.enter('d', character('Diego')); expect(() => r.enter('e', character('Elena'))).toThrow('completo');
    r.leave('a'); expect(r.leaderId).toBe('b');
  });
  it('un input scaduto ferma movimento e attacchi', () => {
    const r = room(); r.ready.add('a'); r.ready.add('b'); r.start('a', 'battle', 1);
    const p = r.match!.players.get('a')!; const before = p.position;
    r.inputs.set('a', { intent: { ...idle, move: new Vec2(1, 0) }, receivedAt: 0 }); r.tick(NETWORK.staleInputMs + 1);
    expect(p.position).toEqual(before); r.tick(1); expect(p.position.x).toBeGreaterThan(before.x);
  });
  it('la disconnessione mette KO il membro, senza lasciare attacchi premuti', () => {
    const r = room(); r.ready.add('a'); r.ready.add('b'); r.start('a', 'battle', 1); r.leave('a');
    expect(r.match!.players.get('a')!.health.isDead).toBe(true); expect(r.playing).toBe(true); expect(r.leaderId).toBe('b');
  });
  it('i premi sono estratti una volta per membro e restano identici negli snapshot successivi', () => {
    const r = room(); r.ready.add('a'); r.ready.add('b'); r.start('a', 'battle', 7);
    r.match!.boss.health.current = 1;
    r.match!.zones.push(new DangerZone(999, { team: 'player', damage: 10, radius: 100, delay: 0 }, r.match!.boss.position));
    r.tick(0); const first = r.snapshot()!;
    expect(first.status).toBe('won'); expect(Object.keys(first.rewards)).toEqual(['a', 'b']);
    expect(first.rewards.a.length).toBeLessThanOrEqual(1); expect(first.rewards.b.length).toBeLessThanOrEqual(1);
    r.tick(1000); const next = r.snapshot()!;
    expect(next.rewards).toEqual(first.rewards); expect(next.time).toBe(first.time); expect(next.events).toEqual([]);
  });
});

describe('combattimento cooperativo', () => {
  it('proiettili e zone alleate non feriscono gli alleati; le zone del boss colpiscono entrambi', () => {
    const m = match(), position = m.player.position;
    m.projectiles.push(new Projectile(99, { team: 'player', speed: 0, damage: 50, radius: 20, lifetime: 2, visual: 'arcane_bolt' }, position, 0));
    m.zones.push(new DangerZone(100, { team: 'player', damage: 50, radius: 50, delay: 0 }, position)); m.stepParty(NETWORK.step, new Map());
    for (const p of m.players.values()) expect(p.health.current).toBe(100);
    m.zones.push(new DangerZone(101, { team: 'enemy', damage: 23, radius: 50, delay: 0 }, position)); m.stepParty(NETWORK.step, new Map());
    for (const [id, p] of m.players) { expect(p.health.current).toBe(77); expect(m.report.get(id)!.damageReceived).toBe(23); }
  });
  it('i proiettili nemici colpiscono anche il secondo giocatore', () => {
    const m = match(); m.players.get('b')!.position = m.player.position.add(new Vec2(100, 0));
    m.projectiles.push(new Projectile(1, { team: 'enemy', speed: 0, damage: 14, radius: 5, lifetime: 2, visual: 'arcane_bolt' }, m.players.get('b')!.position, 0));
    m.stepParty(NETWORK.step, new Map()); expect(m.players.get('b')!.health.current).toBe(86); expect(m.player.health.current).toBe(100);
  });
  it('un KO non ferma gli altri; sconfitta solo quando tutti sono KO', () => {
    const m = match(); m.player.health.current = 0; m.stepParty(NETWORK.step, new Map()); expect(m.status).toBe('playing');
    m.players.get('b')!.health.current = 0; m.stepParty(NETWORK.step, new Map()); expect(m.status).toBe('lost');
  });
  it('carica e contatto possono danneggiare un alleato diverso dal bersaglio', () => {
    const m = match(), b = m.players.get('b')!; b.position = m.boss.position; m.player.position = m.boss.position.add(new Vec2(120, 0));
    m.boss.charge = { start: m.boss.position, target: m.boss.position.add(new Vec2(300, 0)), elapsed: 1, windup: 0, duration: 1000 };
    m.stepParty(NETWORK.step, new Map()); expect(b.health.current).toBeLessThan(100); expect(m.player.health.current).toBe(100);
  });
  it('attribuisce il danno di skill al proprietario e limita il report agli HP effettivi', () => {
    const m = match(); const b = m.players.get('b')!; b.position = m.boss.position.sub(new Vec2(80, 0)); m.boss.health.current = 1;
    for (let i = 0; i < 60 && m.status === 'playing'; i++) m.stepParty(NETWORK.step, new Map([['b', { ...idle, aimOffset: m.boss.position.sub(b.position), skills: [true, false, false, false] }]]));
    expect(m.status).toBe('won'); expect(m.report.get('b')!.damageDealt).toBe(1); expect(m.report.get('a')!.damageDealt).toBe(0);
    expect(m.report.get('b')!.healing).toBe(0);
  });
  it('snapshot dopo JSON ripristina vettori, vita, mana, ricariche e boss identici', () => {
    const m = match(); m.stepParty(NETWORK.step, new Map([['b', { ...idle, move: new Vec2(1, 0), skills: [true, false, false, false] }]]));
    const snapshot = snapshotOf(m, 'id', [], {}); const decoded = parseWire(JSON.stringify(snapshot)) as typeof snapshot;
    const replica = match(); replica.viewPlayerId = 'b'; applySnapshot(replica, decoded);
    expect(replica.player.position).toEqual(m.players.get('b')!.position); expect(replica.player.position.distanceTo(Vec2.ZERO)).toBeGreaterThan(0);
    expect(replica.player.mana).toBe(m.players.get('b')!.mana); expect(replica.player.skillBar.cooldowns()).toEqual(m.players.get('b')!.skillBar.cooldowns());
    expect(replica.boss.position).toEqual(m.boss.position); expect(replica.projectiles).toHaveLength(m.projectiles.length);
  });
  it('rifiuta input non finiti e skill arbitrarie; normalizza movimento e limita la mira', () => {
    expect(cleanIntent({ ...idle, move: { x: Infinity, y: 0 } })).toBeNull(); expect(cleanIntent({ ...idle, skills: ['hack'] })).toBeNull();
    const clean = cleanIntent({ ...idle, move: { x: 100, y: 100 }, aimOffset: { x: 1e9, y: -1e9 } })!;
    expect(clean.move.length()).toBeCloseTo(1); expect(clean.aimOffset.x).toBe(6000);
  });
});
