import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { ARENA } from '../arena/arena';
import { STEP } from '../../testing';
import { Player, PLAYER_STATS } from './player';

describe('giocatore', () => {
  it('parte nel punto previsto con tutta la vita e senza invulnerabilita\'', () => {
    const player = new Player();
    expect(player.position).toEqual(ARENA.playerSpawn);
    expect(player.health.current).toBe(100);
    expect(player.isInvulnerable).toBe(false);
  });

  it('si muove a 177 unita\' al secondo', () => {
    const player = new Player();
    for (let i = 0; i < 60; i++) player.moveBy(STEP, new Vec2(1, 0));
    expect(player.position.x - ARENA.playerSpawn.x).toBeCloseTo(PLAYER_STATS.moveSpeed, 6);
    expect(player.position.y).toBe(ARENA.playerSpawn.y);
    expect(PLAYER_STATS.moveSpeed).toBe(177);
  });

  it('lo spostamento non dipende dal frame rate (stesso tempo, passi diversi)', () => {
    const a = new Player();
    const b = new Player();
    for (let i = 0; i < 60; i++) a.moveBy(1 / 60, new Vec2(1, 0));
    for (let i = 0; i < 120; i++) b.moveBy(1 / 120, new Vec2(1, 0));
    expect(b.position.x).toBeCloseTo(a.position.x, 6);
  });

  it('i bordi dell\'arena lo fermano a 40 unita\'', () => {
    const player = new Player();
    for (let i = 0; i < 60 * 20; i++) player.moveBy(STEP, new Vec2(-1, -1).normalized());
    expect(player.position.x).toBe(ARENA.playerMargin);
    expect(player.position.y).toBe(ARENA.playerMargin);
    for (let i = 0; i < 60 * 40; i++) player.moveBy(STEP, new Vec2(1, 1).normalized());
    expect(player.position.x).toBe(ARENA.width - ARENA.playerMargin);
    expect(player.position.y).toBe(ARENA.height - ARENA.playerMargin);
  });

  it('moving riflette se nell\'ultimo passo c\'era un comando di movimento', () => {
    const player = new Player();
    player.moveBy(STEP, new Vec2(0, 1));
    expect(player.moving).toBe(true);
    player.moveBy(STEP, Vec2.ZERO);
    expect(player.moving).toBe(false);
  });

  it('un colpo toglie vita e da\' 0,65 s di invulnerabilita\'; durante quel tempo i colpi sono ignorati', () => {
    const player = new Player();
    expect(player.tryHurt(18)).toBe(true);
    expect(player.health.current).toBe(82);
    expect(player.invulnerableFor).toBeCloseTo(0.65, 10);
    expect(player.tryHurt(18)).toBe(false);
    expect(player.health.current).toBe(82);
    player.tick(0.64);
    expect(player.tryHurt(18)).toBe(false);
    player.tick(0.02);
    expect(player.isInvulnerable).toBe(false);
    expect(player.tryHurt(18)).toBe(true);
    expect(player.health.current).toBe(64);
  });

  it('tick consuma anche le ricariche delle skill', () => {
    const player = new Player();
    player.skillBar.start(0);
    player.tick(0.2);
    expect(player.skillBar.isReady(0)).toBe(true);
  });
});
