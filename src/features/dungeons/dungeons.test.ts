import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { isOutsideProjectileBounds, pillarAt } from '../arena/arena';
import { Boss } from '../boss/boss';
import { BODY_RADIUS } from '../combat/collision';
import { BOSS_ART } from '../presentation/boss-art';
import { ARENA_THEMES } from '../presentation/themes';
import { createBossHarness, createMatch, intent, STEP } from '../../testing';
import { DUNGEONS, dungeonById } from './dungeons';

/*
 * Controlli validi per OGNI dungeon registrato: servono a far restare coerenti mappe e boss man mano che se ne
 * aggiungono. I nomi dei test contengono l'id del dungeon (`vitest -t "swamp"` esegue solo quelli di un dungeon).
 */

describe('registro dei dungeon', () => {
  it('ci sono quattro dungeon con id diversi, in ordine di pericolo crescente', () => {
    expect(DUNGEONS.map((dungeon) => dungeon.id)).toEqual(['crypt', 'swamp', 'forge', 'glacier']);
    expect(new Set(DUNGEONS.map((dungeon) => dungeon.id)).size).toBe(DUNGEONS.length);
    expect(DUNGEONS.map((dungeon) => dungeon.danger)).toEqual([1, 2, 3, 4]);
    expect(dungeonById('swamp')).toBe(DUNGEONS[1]);
    expect(dungeonById('nope')).toBeUndefined();
  });

  it('ogni dungeon ha un boss e una mappa propri: id, nomi, grafica e tema diversi', () => {
    for (const key of ['id', 'name'] as const) {
      expect(new Set(DUNGEONS.map((dungeon) => dungeon.boss[key])).size, `boss.${key}`).toBe(DUNGEONS.length);
    }
    expect(new Set(DUNGEONS.map((dungeon) => dungeon.boss.art)).size, 'boss.art').toBe(DUNGEONS.length);
    expect(new Set(DUNGEONS.map((dungeon) => dungeon.name)).size, 'name').toBe(DUNGEONS.length);
    expect(new Set(DUNGEONS.map((dungeon) => dungeon.arena.theme)).size, 'arena.theme').toBe(DUNGEONS.length);
    const sizes = DUNGEONS.map((dungeon) => `${dungeon.arena.width}x${dungeon.arena.height}`);
    expect(new Set(sizes).size, 'dimensioni della mappa').toBe(DUNGEONS.length);
  });

  it('ogni boss ha almeno 3 schemi che nessun altro boss usa (boss davvero unici)', () => {
    for (const dungeon of DUNGEONS) {
      const others = new Set(DUNGEONS.filter((other) => other !== dungeon).flatMap((other) => other.boss.patterns.map((p) => p.id)));
      const unique = dungeon.boss.patterns.filter((pattern) => !others.has(pattern.id));
      expect(unique.length, `${dungeon.id}: schemi unici`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe.each(DUNGEONS.map((dungeon) => [dungeon.id, dungeon] as const))('dungeon %s', (id, dungeon) => {
  const { arena, boss } = dungeon;

  it(`${id}: dati coerenti (id, testi, grafica e tema esistenti)`, () => {
    expect(arena.id).toBe(dungeon.id);
    expect(dungeon.name.length).toBeGreaterThan(0);
    expect(dungeon.tagline.length).toBeGreaterThan(0);
    expect(dungeon.description.length).toBeGreaterThan(20);
    expect(boss.name).toBe(boss.name.toUpperCase());
    expect(BOSS_ART[boss.art], `grafica ${boss.art}`).toBeDefined();
    expect(ARENA_THEMES[arena.theme], `tema ${arena.theme}`).toBeDefined();
  });

  it(`${id}: la mappa e' valida (dimensioni, partenze, pilastri raggiungibili)`, () => {
    expect(arena.width).toBeGreaterThanOrEqual(2000);
    expect(arena.width).toBeLessThanOrEqual(4000);
    expect(arena.height).toBeGreaterThanOrEqual(2000);
    expect(arena.height).toBeLessThanOrEqual(4000);
    const inside = (p: Vec2, margin: number) =>
      p.x >= margin && p.x <= arena.width - margin && p.y >= margin && p.y <= arena.height - margin;
    expect(inside(arena.playerSpawn, arena.playerMargin), 'partenza del giocatore').toBe(true);
    expect(inside(arena.bossSpawn, arena.bossMargin), 'partenza del boss').toBe(true);
    expect(arena.playerSpawn.distanceTo(arena.bossSpawn), 'distanza iniziale').toBeGreaterThanOrEqual(boss.stats.orbitDistance);
    expect(pillarAt(arena, arena.playerSpawn, BODY_RADIUS.player + 20), 'giocatore su un pilastro').toBeUndefined();
    expect(pillarAt(arena, arena.bossSpawn, 20), 'boss su un pilastro').toBeUndefined();
    // Spazio per passare tra pilastro e muro e tra pilastri: nessuna fessura piu' stretta del corpo del giocatore.
    const gap = 2 * BODY_RADIUS.player;
    for (const pillar of arena.pillars) {
      const { x, y } = pillar.position;
      const r = pillar.radius;
      expect(r).toBeGreaterThan(0);
      for (const clearance of [x - r, arena.width - (x + r), y - r, arena.height - (y + r)]) {
        expect(clearance, 'pilastro troppo vicino al muro').toBeGreaterThanOrEqual(arena.playerMargin + gap);
      }
    }
    for (let i = 0; i < arena.pillars.length; i++) {
      for (let j = i + 1; j < arena.pillars.length; j++) {
        const a = arena.pillars[i]!;
        const b = arena.pillars[j]!;
        const between = a.position.distanceTo(b.position) - a.radius - b.radius;
        expect(between <= 0 || between >= gap, `fessura di ${between.toFixed(1)} tra due pilastri`).toBe(true);
      }
    }
    expect(isOutsideProjectileBounds(arena, arena.playerSpawn)).toBe(false);
  });

  it(`${id}: valori del boss sensati e nessun colpo singolo che uccide d'un colpo`, () => {
    const s = boss.stats;
    expect(s.maxHealth).toBeGreaterThanOrEqual(1000);
    expect(s.speed).toBeGreaterThan(0);
    expect(s.slowedSpeed).toBeLessThan(s.speed);
    expect(s.attackInterval.rage).toBeLessThanOrEqual(s.attackInterval.normal);
    expect(s.hitRadius).toBeGreaterThan(10);
    expect(s.contactDamage).toBeLessThanOrEqual(30);
    expect(s.chargeDamage).toBeLessThanOrEqual(40);
    expect(boss.patterns.length).toBeGreaterThanOrEqual(4);
    expect(new Set(boss.patterns.map((pattern) => pattern.id)).size).toBe(boss.patterns.length);
    for (const pattern of boss.patterns) {
      expect(pattern.name.length, pattern.id).toBeGreaterThan(0);
      expect(pattern.name, pattern.id).toBe(pattern.name.toUpperCase());
      expect(pattern.labelOffsetY, pattern.id).toBeLessThan(0);
    }
  });

  it(`${id}: ogni schema funziona in entrambe le fasi, ha un effetto e produce dati validi`, () => {
    for (let index = 0; index < boss.patterns.length; index++) {
      for (const enraged of [false, true]) {
        const label = `${boss.patterns[index]!.id} (${enraged ? 'furia' : 'normale'})`;
        const actor = new Boss(boss, arena);
        actor.phase = enraged ? 2 : 1;
        actor.attackCount = index;
        actor.attackTimer = 0;
        const harness = createBossHarness(arena.playerSpawn);
        actor.step(STEP, harness.ctx);
        const immediate =
          harness.projectiles.length + harness.zones.length + actor.scheduled.length + (actor.charge !== null ? 1 : 0);
        expect(immediate, `${label}: nessun effetto`).toBeGreaterThan(0);
        // Nessun altro attacco: si osserva solo cio' che lo schema ha messo in moto fino alla sua fine.
        actor.attackTimer = Number.POSITIVE_INFINITY;
        for (let i = 0; i < 600; i++) actor.step(STEP, harness.ctx);
        for (const shot of harness.projectiles) {
          const spec = shot.spec;
          expect(spec.team, label).toBe('enemy');
          expect(spec.speed, label).toBeGreaterThan(0);
          expect(spec.radius, label).toBeGreaterThan(0);
          expect(spec.lifetime, label).toBeGreaterThan(0);
          expect(spec.damage, label).toBeGreaterThan(0);
          expect(spec.damage, `${label}: danno troppo alto`).toBeLessThanOrEqual(30);
          expect(Number.isFinite(shot.position.x + shot.position.y + shot.angle), label).toBe(true);
        }
        for (const zone of harness.zones) {
          expect(zone.spec.team, label).toBe('enemy');
          expect(zone.spec.radius, label).toBeGreaterThan(0);
          expect(zone.spec.delay, `${label}: le zone devono avvisare`).toBeGreaterThanOrEqual(0.5);
          expect(zone.spec.damage, `${label}: danno troppo alto`).toBeLessThanOrEqual(40);
          expect(Number.isFinite(zone.position.x + zone.position.y), label).toBe(true);
        }
        expect(Number.isFinite(actor.position.x + actor.position.y), `${label}: posizione`).toBe(true);
        // Le azioni programmate finiscono: lo schema non blocca per sempre gli attacchi successivi.
        expect(actor.scheduled.length, `${label}: azioni programmate che non finiscono`).toBe(0);
        expect(actor.charge, `${label}: carica che non finisce`).toBeNull();
      }
    }
  });

  it(`${id}: nei primi 120 secondi gli attacchi partono e il giocatore puo' vincere o perdere senza stati invalidi`, () => {
    for (const seed of [1, 2]) {
      const match = createMatch(seed, { dungeon });
      match.boss!.health.current = Math.floor(match.boss!.health.max * 0.45);
      let invalid = 0;
      for (let i = 0; i < 60 * 120 && match.status === 'playing'; i++) {
        const t = match.time;
        match.player.health.current = 100;
        match.boss!.health.current = Math.max(match.boss!.health.current, 600);
        match.step(
          STEP,
          intent(match, {
            move: new Vec2(Math.cos(t * 0.6 + seed), Math.sin(t * 0.9)),
            aim: match.boss!.position,
            skills: [true, true, Math.floor(t * 2) % 3 === 0, Math.floor(t * 2) % 5 === 0],
          }),
        );
        const { position } = match.player;
        if (!Number.isFinite(position.x + position.y) || !Number.isFinite(match.boss!.position.x + match.boss!.position.y)) invalid++;
        if (pillarAt(arena, position, BODY_RADIUS.player - 0.5) !== undefined) invalid++;
        if (position.x < arena.playerMargin - 0.01 || position.x > arena.width - arena.playerMargin + 0.01) invalid++;
        if (position.y < arena.playerMargin - 0.01 || position.y > arena.height - arena.playerMargin + 0.01) invalid++;
        for (const projectile of match.projectiles) {
          if (!Number.isFinite(projectile.position.x + projectile.position.y)) invalid++;
          if (isOutsideProjectileBounds(arena, projectile.position)) invalid++;
        }
      }
      expect(invalid, `seed ${seed}`).toBe(0);
      expect(match.status).toBe('playing');
      expect(match.boss!.attackCount, `seed ${seed}: attacchi lanciati`).toBeGreaterThan(20);
      expect(match.boss!.phase).toBe(2);
    }
  });
});
