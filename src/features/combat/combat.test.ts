import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { clampToArena, isOutsideProjectileBounds, pillarAt, pushOutOfPillars } from '../arena/arena';
import { Player } from '../player/player';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { CRYPT_ARENA } from '../dungeons/crypt';
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
    expect(clampToArena(CRYPT_ARENA, new Vec2(-100, 99999), 40)).toEqual(new Vec2(40, CRYPT_ARENA.height - 40));
    expect(clampToArena(CRYPT_ARENA, new Vec2(500, 500), 40)).toEqual(new Vec2(500, 500));
  });

  it('i proiettili scompaiono oltre il margine di 24', () => {
    expect(isOutsideProjectileBounds(CRYPT_ARENA, new Vec2(100, 100))).toBe(false);
    expect(isOutsideProjectileBounds(CRYPT_ARENA, new Vec2(23, 100))).toBe(true);
    expect(isOutsideProjectileBounds(CRYPT_ARENA, new Vec2(CRYPT_ARENA.width - 23, 100))).toBe(true);
    expect(isOutsideProjectileBounds(CRYPT_ARENA, new Vec2(100, CRYPT_ARENA.height - 23))).toBe(true);
  });

  it('giocatore e boss partono dentro l\'arena, a distanza di sicurezza', () => {
    expect(CRYPT_ARENA.playerSpawn.distanceTo(CRYPT_ARENA.bossSpawn)).toBeGreaterThan(180);
    expect(clampToArena(CRYPT_ARENA, CRYPT_ARENA.playerSpawn, CRYPT_ARENA.playerMargin)).toEqual(CRYPT_ARENA.playerSpawn);
    expect(clampToArena(CRYPT_ARENA, CRYPT_ARENA.bossSpawn, CRYPT_ARENA.bossMargin)).toEqual(CRYPT_ARENA.bossSpawn);
  });
});

describe('pilastri', () => {
  const pillar = { position: new Vec2(1000, 1000), radius: 50 };
  const arena = { ...CRYPT_ARENA, pillars: [pillar] };

  it('pillarAt trova il pilastro che contiene il punto (con margine)', () => {
    expect(pillarAt(arena, new Vec2(1000, 1000))).toBe(pillar);
    expect(pillarAt(arena, new Vec2(1049, 1000))).toBe(pillar);
    expect(pillarAt(arena, new Vec2(1051, 1000))).toBeUndefined();
    expect(pillarAt(arena, new Vec2(1055, 1000), 10)).toBe(pillar);
    expect(pillarAt(CRYPT_ARENA, new Vec2(1000, 1000))).toBeUndefined();
  });

  it('pushOutOfPillars porta il corpo a raggio + corpo dal centro, lungo la direzione da cui viene', () => {
    const out = pushOutOfPillars(arena, new Vec2(1020, 1000), 10);
    expect(out.x).toBeCloseTo(1060, 6);
    expect(out.y).toBeCloseTo(1000, 6);
    expect(pushOutOfPillars(arena, new Vec2(1200, 1000), 10)).toEqual(new Vec2(1200, 1000));
  });

  it('un punto esattamente al centro viene spinto senza produrre valori non numerici', () => {
    const out = pushOutOfPillars(arena, new Vec2(1000, 1000), 10);
    expect(Number.isFinite(out.x + out.y)).toBe(true);
    expect(out.distanceTo(pillar.position)).toBeCloseTo(60, 6);
  });

  it('con piu\' pilastri vicini il corpo esce da tutti (tra i bordi resta spazio per passare)', () => {
    const two = { ...CRYPT_ARENA, pillars: [pillar, { position: new Vec2(1125, 1000), radius: 50 }] };
    const out = pushOutOfPillars(two, new Vec2(1040, 1000), 10);
    for (const p of two.pillars) expect(out.distanceTo(p.position)).toBeGreaterThanOrEqual(60 - 1e-6);
  });

  it('il giocatore che cammina contro un pilastro non ci entra e scivola lungo il bordo', () => {
    const player = new Player(arena, MAGE_SKILLS);
    player.position = new Vec2(1000, 1100);
    for (let i = 0; i < 120; i++) player.moveBy(1 / 60, new Vec2(0, -1));
    expect(player.position.distanceTo(pillar.position)).toBeGreaterThanOrEqual(60 - 1e-6);
    const before = player.position.x;
    for (let i = 0; i < 30; i++) player.moveBy(1 / 60, new Vec2(1, -1).normalized());
    expect(player.position.x).toBeGreaterThan(before);
    expect(player.position.distanceTo(pillar.position)).toBeGreaterThanOrEqual(60 - 1e-6);
  });
});
