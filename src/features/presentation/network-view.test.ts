import { expect, it } from 'vitest';
import { SeededRng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import { CRYPT } from '../dungeons/crypt';
import { Match } from '../match/match';
import { Projectile } from '../combat/projectile';
import { Minion } from '../minions/minion';
import { CINDER_WISP } from '../minions/minion-catalog';
import { snapshotOf } from '../network/protocol';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { NetworkView, NETWORK_VIEW } from './network-view';
import { DescentRun } from '../run/descent';
import { LIEUTENANTS, scaledLieutenant } from '../run/lieutenants';

function fixture(): { match: Match; view: NetworkView } {
  const match = new Match({ dungeon: CRYPT, rng: new SeededRng(2), loadout: MAGE_SKILLS,
    members: ['a', 'b'].map(id => ({ id, loadout: MAGE_SKILLS })) });
  return { match, view: new NetworkView(match) };
}
const packet = (match: Match) => snapshotOf(match, 'battle', [], {});

it('mantiene mappa, salute e assenza del boss nelle stanze, interpolando senza modificare il loro stato', () => {
  const run = new DescentRun({ mode: 'descent', dungeonId: 'crypt', seed: 4, members: [{ id: 'a', loadout: MAGE_SKILLS }] });
  const match = run.match, view = new NetworkView(match), start = match.player.position;
  expect(view.match.arena).toBe(match.arena);
  expect(view.match.boss).toBeNull();
  view.accept(packet(match), 0);
  match.player.position = start.add(new Vec2(6, 0)); match.player.health.current = 42;
  view.accept(packet(match), 40); view.sample(40 + NETWORK_VIEW.blendMs / 2);
  expect(view.match.player.position.x).toBeCloseTo(start.x + 3);
  expect(view.match.player.health.current).toBe(42);
  expect(match.player.position).toEqual(start.add(new Vec2(6, 0)));
  expect(run.stage).toBe(0); expect(run.players.get('a')!.xp).toBe(0);
});

it('mantiene il luogotenente e la sua vita scalata per il gruppo nella copia visuale', () => {
  const boss = scaledLieutenant(LIEUTENANTS.crypt!, 4);
  const match = new Match({ dungeon: CRYPT, rng: new SeededRng(7), boss, loadout: MAGE_SKILLS });
  const view = new NetworkView(match);
  view.accept(packet(match), 0);
  expect(view.match.boss!.definition.id).toBe(boss.id);
  expect(view.match.boss!.health.max).toBe(boss.stats.maxHealth);
  expect(view.match.boss!.health.current).toBe(match.boss!.health.current);
});

it('produce più posizioni disegnabili fra due pacchetti senza alterare la partita autorevole', () => {
  const { match, view } = fixture(), start = match.player.position;
  view.accept(packet(match), 0); match.player.position = start.add(new Vec2(6, 0)); view.accept(packet(match), 40);
  const drawn: number[] = [];
  for (const offset of [0, 6, 12, 18, 24, 30]) { view.sample(40 + offset); drawn.push(view.match.player.position.x); }
  expect(new Set(drawn).size).toBe(6); expect(drawn[0]).toBe(start.x);
  expect(drawn.every((x, i) => i === 0 || x > drawn[i - 1])).toBe(true);
  expect(match.player.position.x).toBe(start.x + 6);
  view.sample(40 + NETWORK_VIEW.blendMs); expect(view.match.player.position).toEqual(match.player.position);
});

it('interpola alleati, boss, proiettili e servitori e mantiene subito HP e mana confermati', () => {
  const { match, view } = fixture();
  match.projectiles.push(new Projectile(1, { team: 'player', speed: 200, damage: 10, radius: 4, lifetime: 2, visual: 'arcane_bolt' }, new Vec2(100, 100), 0));
  match.minions.push(new Minion(2, CINDER_WISP, new Vec2(300, 300)));
  view.accept(packet(match), 0);
  const ally = match.players.get('b')!, start = ally.position, boss = match.boss!.position;
  ally.position = start.add(new Vec2(8, 0)); ally.health.current = 45; ally.mana = 30;
  match.boss!.position = boss.add(new Vec2(10, 0)); match.projectiles[0].position = new Vec2(120, 100); match.minions[0].position = new Vec2(306, 300);
  view.accept(packet(match), 40); view.sample(40 + NETWORK_VIEW.blendMs / 2);
  expect(view.match.players.get('b')!.position.x).toBeCloseTo(start.x + 4);
  expect(view.match.boss!.position.x).toBeCloseTo(boss.x + 5);
  expect(view.match.projectiles[0].position.x).toBeCloseTo(110);
  expect(view.match.minions[0].position.x).toBeCloseTo(303);
  expect(view.match.players.get('b')!.health.current).toBe(45); expect(view.match.players.get('b')!.mana).toBe(30);
});

it('un pacchetto anticipato riparte dalla posizione disegnata senza scatti all’indietro', () => {
  const { match, view } = fixture(), x = match.player.position.x;
  view.accept(packet(match), 0); match.player.position = new Vec2(x + 6, match.player.position.y); view.accept(packet(match), 40);
  view.sample(40 + NETWORK_VIEW.blendMs / 2); const before = view.match.player.position.x;
  match.player.position = new Vec2(x + 12, match.player.position.y); view.accept(packet(match), 40 + NETWORK_VIEW.blendMs / 2);
  expect(view.match.player.position.x).toBeCloseTo(before);
});

it('scatti, teletrasporti e ripresa dopo interruzione non trascinano il personaggio attraverso la mappa', () => {
  const { match, view } = fixture(); view.accept(packet(match), 0);
  match.player.position = match.player.position.add(new Vec2(125, 0)); match.boss!.position = match.boss!.position.add(new Vec2(300, 0));
  view.accept(packet(match), 40); expect(view.match.player.position).toEqual(match.player.position); expect(view.match.boss!.position).toEqual(match.boss!.position);
  match.player.position = match.player.position.add(new Vec2(6, 0));
  view.accept(packet(match), 40 + NETWORK_VIEW.staleMs + 1); expect(view.match.player.position).toEqual(match.player.position);
});

it('senza nuovi pacchetti si ferma all’ultimo stato noto senza inventare movimento o colpi', () => {
  const { match, view } = fixture(); view.accept(packet(match), 0);
  match.player.position = match.player.position.add(new Vec2(6, 0)); view.accept(packet(match), 40);
  view.sample(10_000); expect(view.match.player.position).toEqual(match.player.position);
  expect(view.match.boss!.health.current).toBe(match.boss!.health.current); expect(match.time).toBe(0);
});

it('fine partita e rimozioni si applicano subito e il disegno non ripete i premi', () => {
  const { match, view } = fixture();
  match.minions.push(new Minion(2, CINDER_WISP, new Vec2(300, 300))); view.accept(packet(match), 0);
  match.minions = []; match.player.position = match.player.position.add(new Vec2(6, 0)); match.status = 'won';
  const final = packet(match); view.accept(final, 40);
  expect(view.match.status).toBe('won'); expect(view.match.minions).toHaveLength(0); expect(view.match.player.position).toEqual(match.player.position);
  view.sample(500); expect(view.match.time).toBe(final.time); expect(match.status).toBe('won');
});
