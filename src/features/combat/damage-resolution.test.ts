import { expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { SeededRng } from '../../core/rng';
import { Character } from '../character/character';
import { CRYPT } from '../dungeons/crypt';
import { Match } from '../match/match';
import { MINIONS } from '../minions/minion-catalog';
import { Effects } from '../presentation/effects';
import type { GameEvent } from './events';
import { Health } from './health';
import { Projectile } from './projectile';

function fixture(kind: 'mage' | 'warrior', rare = false): Match {
  const character = Character.createStarter(kind); character.completeCreation('Prova danno', 'male', kind);
  if (rare) character.inventory.forEach(item => { Object.assign(item, { rarity: 'rare' }); });
  const match = new Match({ dungeon: CRYPT, characterClass: kind, loadout: character.loadout(), rng: new SeededRng(12),
    arena: { ...CRYPT.arena, pillars: [] },
    boss: { ...CRYPT.boss, stats: { ...CRYPT.boss.stats, maxHealth: 10000, speed: 0, orbitSpeedFactor: 0, contactDistance: 0 } },
  });
  match.boss!.attackTimer = 999;
  return match;
}
const idle = { move: Vec2.ZERO, aimOffset: new Vec2(200, 0), skills: [] };

it('arrotonda solo il danno finale per difetto, anche sotto 1, senza modificare la sorgente', () => {
  const health = new Health(100);
  expect(health.takeDamage(19.999)).toBe(19); expect(health.current).toBe(81);
  expect(health.takeDamage(0.999)).toBe(0); expect(health.current).toBe(81);
  expect(health.takeDamage(-5.5)).toBe(0);
});

it('rarità, potenza e vulnerabilità vengono calcolate prima di arrotondare; HP, evento, testo e report coincidono', () => {
  const match = fixture('mage', true), events: GameEvent[] = [], effects = new Effects(new SeededRng(1));
  match.classCombat.applyHit('boss', 'local', { status: 'exposed', duration: 4 });
  match.events.connect(event => { events.push(event); effects.handle(event); });
  const skill = match.player.baseLoadout[0]!;
  expect(skill.effect.kind).toBe('projectile');
  if (skill.effect.kind !== 'projectile') throw new Error('Atteso proiettile');
  expect(skill.effect.projectile.damage).toBe(28.5);
  const damage = skill.effect.projectile.damage * (1 + match.player.stats.abilityPower);
  expect(damage).toBeCloseTo(31.4925);
  match.projectiles.push(new Projectile(1000, { ...skill.effect.projectile, speed: 0, damage }, match.boss!.position, 0));
  match.step(0, idle);
  // floor(19 × 1,5 × 1,105 × 1,2) = 37. Arrotondare prima produrrebbe un risultato diverso.
  expect(match.boss!.health.current).toBe(9963);
  expect(events.find(event => event.type === 'damage_dealt')).toMatchObject({ target: 'boss', amount: 37 });
  expect(match.report.get('local')!.damageDealt).toBe(37);
  expect(effects.texts.some(text => text.text === '37')).toBe(true);
});

it('il danno subito viene arrotondato dopo la difesa, usando lo stesso intero per HP e report', () => {
  const match = fixture('warrior'), events: GameEvent[] = [];
  match.events.connect(event => events.push(event));
  match.projectiles.push(new Projectile(1000, { team: 'enemy', speed: 0, damage: 100, radius: 4,
    lifetime: 2, visual: 'boss_unstoppable', unblockable: true }, match.player.position, 0));
  match.step(0, idle);
  expect(match.player.health.current).toBe(129); // floor(100 × 100 / 140) = 71
  expect(events.find(event => event.type === 'damage_dealt')).toMatchObject({ target: 'player', amount: 71 });
  expect(match.report.get('local')!.damageReceived).toBe(71);
});

it('sottrae scudo e penetrazione prima del difetto, e arrotonda anche i tick periodici', () => {
  const match = fixture('mage'), definition = Object.values(MINIONS).find(minion => !minion.dormant && !minion.burrow)!;
  const minion = match.spawnMinion(definition, match.player.position.add(new Vec2(80, 0)), { maxHealth: 100 });
  minion.shield = 8;
  match.projectiles.push(new Projectile(1000, { team: 'player', speed: 0, damage: 10.5, radius: 4, lifetime: 2,
    visual: 'hunter_arrow', onHit: { penetration: 0.35 } }, minion.position, 0));
  match.step(0, idle);
  expect(minion.health.current).toBe(97); // floor(10,5 - min(8, 10,5 × 0,65)) = 3
  expect(match.report.get('local')!.damageDealt).toBe(3);
  match.classCombat.applyHit('boss', 'local', { status: 'bleeding', duration: 2, damagePerSecond: 2.9 });
  match.classCombat.step(1);
  expect(match.boss!.health.current).toBe(9998);
  expect(match.report.get('local')!.damageDealt).toBe(5);
});

it('limita il colpo finale alla vita intera rimasta senza overkill nei numeri e nel report', () => {
  const match = fixture('mage'), events: GameEvent[] = []; match.boss!.health.current = 3;
  match.events.connect(event => events.push(event));
  match.projectiles.push(new Projectile(1000, { team: 'player', speed: 0, damage: 20.9, radius: 4, lifetime: 2,
    visual: 'arcane_bolt' }, match.boss!.position, 0));
  match.step(0, idle);
  expect(match.boss!.health.current).toBe(0); expect(match.report.get('local')!.damageDealt).toBe(3);
  expect(events.find(event => event.type === 'damage_dealt')).toMatchObject({ amount: 3 });
});

it('le piccole cure si accumulano senza HP frazionari, conservando il recupero a 60 Hz e senza riserva a vita piena', () => {
  const health = new Health(100.5); expect(health.max).toBe(100);
  health.current = 50; let healed = 0;
  for (let i = 0; i < 60; i++) { healed += health.heal(5 / 60); expect(Number.isInteger(health.current)).toBe(true); }
  expect(healed).toBe(5); expect(health.current).toBe(55);
  health.heal(100); expect(health.current).toBe(100);
  health.heal(0.9); health.takeDamage(10);
  expect(health.heal(0.2)).toBe(0); expect(health.current).toBe(90);
});
