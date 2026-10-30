import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { ARENA, clampToArena, isOutsideProjectileBounds } from '../arena/arena';
import { DangerZone } from './danger-zone';
import { Health } from './health';
import { Projectile, type ProjectileSpec } from './projectile';

const SPEC: ProjectileSpec = { team: 'enemy', speed: 100, damage: 5, radius: 4, lifetime: 1, visual: 'ember_nova' };

describe('Health', () => {
  it('la perdita e\' limitata agli HP rimasti e la vita non scende sotto zero', () => {
    const health = new Health(50);
    expect(health.takeDamage(30)).toBe(30);
    expect(health.takeDamage(48)).toBe(20);
    expect(health.current).toBe(0);
    expect(health.isDead).toBe(true);
    expect(health.takeDamage(10)).toBe(0);
    expect(health.current).toBe(0);
  });

  it('un danno negativo non cura', () => {
    const health = new Health(10);
    health.takeDamage(4);
    expect(health.takeDamage(-5)).toBe(0);
    expect(health.current).toBe(6);
  });

  it('fraction e\' la frazione di vita rimasta', () => {
    const health = new Health(200);
    health.takeDamage(50);
    expect(health.fraction).toBe(0.75);
  });
});

describe('Projectile', () => {
  it('avanza alla velocita\' dello spec lungo l\'angolo e consuma la durata', () => {
    const projectile = new Projectile(1, SPEC, new Vec2(10, 20), Math.PI / 2);
    projectile.advance(0.5);
    expect(projectile.position.x).toBeCloseTo(10, 6);
    expect(projectile.position.y).toBeCloseTo(70, 6);
    expect(projectile.lifetime).toBeCloseTo(0.5, 10);
    expect(projectile.isExpired).toBe(false);
    projectile.advance(0.5);
    expect(projectile.isExpired).toBe(true);
  });

  it('expire() lo termina subito', () => {
    const projectile = new Projectile(1, SPEC, Vec2.ZERO, 0);
    projectile.expire();
    expect(projectile.isExpired).toBe(true);
  });

  it('lo spec non viene modificato dall\'uso', () => {
    const before = JSON.stringify(SPEC);
    new Projectile(1, SPEC, Vec2.ZERO, 0).advance(2);
    expect(JSON.stringify(SPEC)).toBe(before);
  });
});

describe('DangerZone', () => {
  it('il conto alla rovescia parte da delay: progress da 0 a 1', () => {
    const zone = new DangerZone(1, { team: 'enemy', radius: 40, delay: 1, damage: 10 }, Vec2.ZERO);
    expect(zone.progress).toBe(0);
    expect(zone.isDue).toBe(false);
    zone.remaining = 0.25;
    expect(zone.progress).toBeCloseTo(0.75, 10);
    zone.remaining = 0;
    expect(zone.isDue).toBe(true);
    expect(zone.progress).toBe(1);
    zone.remaining = -0.2;
    expect(zone.progress).toBe(1);
  });
});

describe('arena', () => {
  it('clampToArena lascia il margine dal bordo', () => {
    expect(clampToArena(new Vec2(-100, 99999), 40)).toEqual(new Vec2(40, ARENA.height - 40));
    expect(clampToArena(new Vec2(500, 500), 40)).toEqual(new Vec2(500, 500));
  });

  it('i proiettili scompaiono oltre il margine di 24', () => {
    expect(isOutsideProjectileBounds(new Vec2(100, 100))).toBe(false);
    expect(isOutsideProjectileBounds(new Vec2(23, 100))).toBe(true);
    expect(isOutsideProjectileBounds(new Vec2(ARENA.width - 23, 100))).toBe(true);
    expect(isOutsideProjectileBounds(new Vec2(100, ARENA.height - 23))).toBe(true);
  });

  it('giocatore e boss partono dentro l\'arena, a distanza di sicurezza', () => {
    expect(ARENA.playerSpawn.distanceTo(ARENA.bossSpawn)).toBeGreaterThan(180);
    expect(clampToArena(ARENA.playerSpawn, ARENA.playerMargin)).toEqual(ARENA.playerSpawn);
    expect(clampToArena(ARENA.bossSpawn, ARENA.bossMargin)).toEqual(ARENA.bossSpawn);
  });
});
