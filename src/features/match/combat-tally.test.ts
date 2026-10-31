import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { Projectile } from '../combat/projectile';
import { createQuietMatch, intent, recordEvents, STEP } from '../../testing';
import { CombatTally, DEFEAT_TIPS } from './combat-tally';

const at = new Vec2(0, 0);

describe('resoconto della battaglia', () => {
  it('conta danni inflitti, colpo piu\' forte, precisione dei proiettili e servitori abbattuti', () => {
    const tally = new CombatTally();
    tally.handle({ type: 'damage_dealt', target: 'boss', amount: 19, position: at, playerId: 'local' });
    tally.handle({ type: 'damage_dealt', target: 'boss', amount: 210, position: at, playerId: 'local' });
    tally.handle({ type: 'damage_dealt', target: 'minion', amount: 40, position: at, playerId: 'local', minionId: 3 });
    tally.handle({ type: 'projectile_hit', position: at, radius: 4, visual: 'arcane_bolt', team: 'player', struck: 'boss', playerId: 'local' });
    tally.handle({ type: 'projectile_hit', position: at, radius: 4, visual: 'arcane_bolt', team: 'player', struck: 'minion', playerId: 'local' });
    tally.handle({ type: 'projectile_hit', position: at, radius: 4, visual: 'arcane_bolt', team: 'player', struck: 'obstacle', playerId: 'local' });
    tally.handle({ type: 'projectile_faded', position: at, visual: 'arcane_bolt', playerId: 'local' });
    tally.handle({ type: 'minion_defeated', position: at, minionId: 3, visual: 'crypt_wisp' });
    tally.handle({ type: 'minion_defeated', position: at, minionId: 4, visual: 'crypt_wisp', exploded: true });
    const summary = tally.summary();
    expect(summary).toMatchObject({ damageDealt: 269, bossDamage: 229, biggestHit: 210, hits: 3, shotsLanded: 2, shotsMissed: 2, minionsDefeated: 1 });
    expect(summary.accuracy).toBe(0.5);
  });

  it('senza proiettili la precisione non si inventa; in cooperativa conta solo il giocatore di questo client', () => {
    const tally = new CombatTally('p1');
    expect(tally.summary().accuracy).toBeNull();
    tally.handle({ type: 'damage_dealt', target: 'boss', amount: 50, position: at, playerId: 'p2' });
    tally.handle({ type: 'projectile_faded', position: at, visual: 'arcane_bolt', playerId: 'p2' });
    expect(tally.summary()).toMatchObject({ damageDealt: 0, shotsMissed: 0 });
    tally.reset('p2');
    tally.handle({ type: 'damage_dealt', target: 'boss', amount: 50, position: at, playerId: 'p2' });
    expect(tally.summary().damageDealt).toBe(50);
  });

  it('i danni subiti si raggruppano per fonte, dalla piu\' dannosa, e ogni tipo ha un consiglio', () => {
    const tally = new CombatTally();
    const hurt = (amount: number, name: string, kind: 'zone' | 'projectile' | 'contact') =>
      tally.handle({ type: 'damage_dealt', target: 'player', amount, position: at, playerId: 'local', source: { kind, name } });
    hurt(12, 'RAFFICA', 'projectile');
    hurt(26, 'FRATTURA', 'zone');
    hurt(26, 'FRATTURA', 'zone');
    hurt(18, 'Contatto con il boss', 'contact');
    const { topSources, damageTaken, hitsTaken } = tally.summary();
    expect([damageTaken, hitsTaken]).toEqual([82, 4]);
    expect(topSources[0]).toEqual({ name: 'FRATTURA', kind: 'zone', hits: 2, damage: 52 });
    expect(topSources.map((s) => s.name)).toEqual(['FRATTURA', 'Contatto con il boss', 'RAFFICA']);
    for (const kind of ['projectile', 'zone', 'charge', 'contact', 'minion'] as const) expect(DEFEAT_TIPS[kind].length).toBeGreaterThan(20);
  });

  it('dagli eventi veri di una partita: un colpo a segno e uno nel vuoto fanno il 50%', () => {
    const match = createQuietMatch(1);
    const tally = new CombatTally();
    match.events.connect((event) => tally.handle(event));
    recordEvents(match);
    const shot = { team: 'player' as const, speed: 0, damage: 25, radius: 4, lifetime: 0.05, visual: 'arcane_bolt' };
    match.boss.position = new Vec2(2400, 600);
    match.projectiles.push(new Projectile(1, shot, match.boss.position, 0));
    match.projectiles.push(new Projectile(2, shot, new Vec2(1600, 1600), 0));
    for (let i = 0; i < 10; i++) match.step(STEP, intent(match));
    expect(tally.summary()).toMatchObject({ shotsLanded: 1, shotsMissed: 1, accuracy: 0.5, bossDamage: 25 });
  });
});
