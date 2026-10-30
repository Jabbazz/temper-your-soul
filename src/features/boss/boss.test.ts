import { describe, expect, it } from 'vitest';
import type { Rng } from '../../core/rng';
import { TAU, Vec2 } from '../../core/vec2';
import { ARENA } from '../arena/arena';
import { createBossHarness, eventsOfType, STEP } from '../../testing';
import { Boss, BOSS_STATS } from './boss';
import { BOSS_PATTERNS } from './boss-patterns';

const MIDDLE: Rng = { next: () => 0.5 };

/** Fa partire subito lo schema numero `index` e restituisce il boss (gia' un passo avanti). */
function startPattern(index: number, options: { enraged?: boolean; target?: Vec2; rng?: Rng } = {}) {
  const boss = new Boss();
  const harness = createBossHarness(options.target, options.rng);
  if (options.enraged) boss.phase = 2;
  boss.attackCount = index;
  boss.attackTimer = 0;
  boss.step(STEP, harness.ctx);
  return { boss, ...harness };
}

describe('movimento del boss', () => {
  it('lontano dal giocatore lo insegue a 100 unita\' al secondo', () => {
    const boss = new Boss();
    boss.attackTimer = Infinity;
    const { ctx } = createBossHarness(new Vec2(1600, 1500));
    boss.step(1, ctx);
    expect(boss.position.x).toBeCloseTo(1600, 6);
    expect(boss.position.y).toBeCloseTo(1100 + BOSS_STATS.speed, 6);
  });

  it('con il gelo la velocita\' e\' 30', () => {
    const boss = new Boss();
    boss.attackTimer = Infinity;
    boss.slowFor = 1;
    const { ctx } = createBossHarness(new Vec2(1600, 1500));
    boss.step(1, ctx);
    expect(boss.position.y).toBeCloseTo(1100 + BOSS_STATS.slowedSpeed, 6);
  });

  it('entro 180 unita\' smette di avvicinarsi e gira attorno al giocatore a 0,38 della velocita\'', () => {
    const boss = new Boss();
    boss.attackTimer = Infinity;
    const { ctx } = createBossHarness(new Vec2(1600, 1200));
    boss.step(1, ctx);
    // Il giocatore e' sotto di lui: la tangente e' orizzontale.
    expect(boss.position.x).toBeCloseTo(1600 - BOSS_STATS.speed * BOSS_STATS.orbitSpeedFactor, 6);
    expect(boss.position.y).toBeCloseTo(1100, 6);
  });

  it('la soglia tra inseguire e girare attorno e\' 180: a 150 gira, a 200 insegue', () => {
    const orbiting = new Boss();
    orbiting.attackTimer = Infinity;
    orbiting.step(1, createBossHarness(new Vec2(1600, 1250)).ctx);
    expect(orbiting.position.y).toBeCloseTo(1100, 6);
    expect(orbiting.position.x).not.toBe(1600);

    const chasing = new Boss();
    chasing.attackTimer = Infinity;
    chasing.step(1, createBossHarness(new Vec2(1600, 1300)).ctx);
    expect(chasing.position.y).toBeCloseTo(1200, 6);
    expect(chasing.position.x).toBeCloseTo(1600, 6);
  });

  it('non esce dall\'arena (margine 60)', () => {
    const boss = new Boss();
    boss.attackTimer = Infinity;
    boss.position = new Vec2(60.5, 60.5);
    const { ctx } = createBossHarness(new Vec2(-1000, -1000));
    boss.step(1, ctx);
    expect(boss.position).toEqual(new Vec2(ARENA.bossMargin, ARENA.bossMargin));
  });

  it('tick consuma il rallentamento senza scendere sotto zero', () => {
    const boss = new Boss();
    boss.slowFor = 2;
    boss.tick(1.5);
    expect(boss.isSlowed).toBe(true);
    boss.tick(1);
    expect(boss.slowFor).toBe(0);
    expect(boss.isSlowed).toBe(false);
  });
});

describe('fasi', () => {
  it('sotto la meta\' della vita entra in furia, una sola volta e non a meta\' esatta', () => {
    const boss = new Boss();
    boss.attackTimer = Infinity;
    const { ctx, events } = createBossHarness();
    boss.health.current = 900;
    boss.step(STEP, ctx);
    expect(boss.phase).toBe(1);
    boss.health.current = 899;
    boss.step(STEP, ctx);
    boss.step(STEP, ctx);
    expect(boss.phase).toBe(2);
    expect(boss.isEnraged).toBe(true);
    expect(eventsOfType(events, 'boss_phase_changed')).toHaveLength(1);
  });

  it('la fase non torna indietro', () => {
    const boss = new Boss();
    boss.attackTimer = Infinity;
    boss.health.current = 100;
    const { ctx } = createBossHarness();
    boss.step(STEP, ctx);
    boss.health.current = 1800;
    boss.step(STEP, ctx);
    expect(boss.phase).toBe(2);
  });
});

describe('cadenza degli attacchi', () => {
  it('il primo attacco parte dopo circa 1,8 secondi', () => {
    const boss = new Boss();
    const { ctx } = createBossHarness();
    let steps = 0;
    while (boss.attackCount === 0 && steps < 600) {
      boss.step(STEP, ctx);
      steps++;
    }
    expect(steps * STEP).toBeGreaterThan(1.75);
    expect(steps * STEP).toBeLessThan(1.85);
  });

  it('dopo un attacco il successivo e\' tra 2,15 s (normale) o 1,65 s (furia)', () => {
    expect(startPattern(0).boss.attackTimer).toBe(2.15);
    expect(startPattern(0, { enraged: true }).boss.attackTimer).toBe(1.65);
  });

  it('gli schemi girano in ordine e, dopo l\'ultimo, ricominciano dal primo', () => {
    const boss = new Boss();
    const { ctx, events } = createBossHarness();
    for (let i = 0; i < 12; i++) {
      boss.charge = null;
      boss.volleys = [];
      boss.attackTimer = 0;
      boss.step(STEP, ctx);
    }
    const ids = eventsOfType(events, 'boss_attack').map((event) => event.patternId);
    const order = ['ember_nova', 'ember_burst', 'fracture', 'charge', 'void_spiral', 'triple_fan'];
    expect(ids).toEqual([...order, ...order]);
    const names = eventsOfType(events, 'boss_attack').map((event) => event.name);
    expect(names).toEqual([
      'NOVA DI BRACE',
      'RAFFICA',
      'FRATTURA',
      'CARICA · SPOSTATI!',
      'SPIRALE DEL VUOTO',
      'TRIPLICE VENTAGLIO',
      'NOVA DI BRACE',
      'RAFFICA',
      'FRATTURA',
      'CARICA · SPOSTATI!',
      'SPIRALE DEL VUOTO',
      'TRIPLICE VENTAGLIO',
    ]);
    expect(boss.attackCount).toBe(12);
  });

  it('ogni attacco annuncia il nome e la posa di lancio di 0,5 s', () => {
    const { events } = startPattern(1);
    expect(eventsOfType(events, 'boss_attack')).toHaveLength(1);
    expect(eventsOfType(events, 'boss_pose')[0]).toEqual({ type: 'boss_pose', seconds: 0.5 });
  });

  it('gli schemi sono sei, con id diversi e testi non vuoti', () => {
    expect(BOSS_PATTERNS).toHaveLength(6);
    expect(new Set(BOSS_PATTERNS.map((pattern) => pattern.id)).size).toBe(6);
    for (const pattern of BOSS_PATTERNS) {
      expect(pattern.name.length).toBeGreaterThan(0);
      expect(pattern.labelOffsetY).toBeLessThan(0);
    }
  });
});

describe('nova di brace', () => {
  it('spara 16 proiettili uniformi in tutte le direzioni; in furia due anelli (32), il secondo piu\' veloce e sfasato', () => {
    const normal = startPattern(0);
    expect(normal.projectiles).toHaveLength(16);
    normal.projectiles.forEach((shot, i) => {
      expect(shot.angle).toBeCloseTo((i * TAU) / 16, 10);
      expect(shot.spec).toMatchObject({ team: 'enemy', speed: 105, damage: 12, radius: 5, lifetime: 5, visual: 'ember_nova' });
    });
    const rage = startPattern(0, { enraged: true });
    expect(rage.projectiles).toHaveLength(32);
    expect(rage.projectiles[16]!.spec.speed).toBe(145);
    expect(rage.projectiles[16]!.angle).toBeCloseTo(0.12, 10);
  });

  it('la rotazione dipende dal tempo di partita, cosi\' i varchi cambiano', () => {
    const boss = new Boss();
    const harness = createBossHarness();
    harness.ctx.time = 10;
    boss.attackTimer = 0;
    boss.step(STEP, harness.ctx);
    expect(harness.projectiles[0]!.angle).toBeCloseTo(10 * 0.2, 10);
  });

  it('parte dalla posizione del boss', () => {
    const { projectiles, boss } = startPattern(0);
    for (const shot of projectiles) expect(shot.position).toEqual(boss.position);
  });
});

describe('raffica', () => {
  it('sette proiettili a ventaglio di 0,15 rad verso il giocatore; in furia piu\' veloci', () => {
    const { projectiles, boss } = startPattern(1);
    expect(projectiles).toHaveLength(7);
    const toTarget = boss.position.angleTo(ARENA.playerSpawn);
    projectiles.forEach((shot, i) => {
      expect(shot.angle).toBeCloseTo(toTarget + (i - 3) * 0.15, 10);
      expect(shot.spec).toMatchObject({ speed: 165, damage: 15, radius: 6, visual: 'ember_volley' });
    });
    expect(startPattern(1, { enraged: true }).projectiles[0]!.spec.speed).toBe(205);
  });
});

describe('frattura', () => {
  it('3 zone (5 in furia): la prima esattamente sul giocatore, le altre attorno', () => {
    const normal = startPattern(2, { rng: MIDDLE });
    expect(normal.zones).toHaveLength(3);
    expect(normal.zones[0]!.position).toEqual(ARENA.playerSpawn);
    expect(normal.zones[0]!.spec).toEqual({ team: 'enemy', radius: 42, delay: 1.15, damage: 24 });
    expect(startPattern(2, { enraged: true, rng: MIDDLE }).zones).toHaveLength(5);
  });

  it('le altre zone cadono entro +-225 in x e +-175 in y dal giocatore, riproducibili con il seme', () => {
    const { zones } = startPattern(2, { enraged: true });
    for (const zone of zones.slice(1)) {
      expect(Math.abs(zone.position.x - ARENA.playerSpawn.x)).toBeLessThanOrEqual(225);
      expect(Math.abs(zone.position.y - ARENA.playerSpawn.y)).toBeLessThanOrEqual(175);
    }
    const again = startPattern(2, { enraged: true });
    expect(again.zones.map((z) => z.position)).toEqual(zones.map((z) => z.position));
  });

  it('agli estremi della casualita\' le altre zone cadono a -225/-175 e appena sotto +225/+175', () => {
    const low = startPattern(2, { rng: { next: () => 0 } });
    expect(low.zones[1]!.position).toEqual(new Vec2(ARENA.playerSpawn.x - 225, ARENA.playerSpawn.y - 175));
    const high = startPattern(2, { rng: { next: () => 0.999999 } });
    expect(high.zones[1]!.position.x).toBeCloseTo(ARENA.playerSpawn.x + 225, 2);
    expect(high.zones[1]!.position.x).toBeLessThan(ARENA.playerSpawn.x + 225);
    expect(high.zones[1]!.position.y).toBeCloseTo(ARENA.playerSpawn.y + 175, 2);
  });

  it('le zone restano dentro l\'arena (margine 60)', () => {
    const { zones } = startPattern(2, { target: new Vec2(5, 5), rng: MIDDLE });
    for (const zone of zones) expect(zone.position).toEqual(new Vec2(ARENA.bossMargin, ARENA.bossMargin));
  });
});

describe('carica', () => {
  it('fissa il punto d\'arrivo sul giocatore e annuncia la posa lunga', () => {
    const { boss, events } = startPattern(3);
    expect(boss.charge).not.toBeNull();
    expect(boss.charge!.target).toEqual(ARENA.playerSpawn);
    expect(boss.charge!.windup).toBe(0.95);
    expect(boss.charge!.duration).toBe(0.48);
    expect(eventsOfType(events, 'boss_pose').map((event) => event.seconds)).toEqual([0.5, 0.95]);
  });

  it('durante la preparazione resta fermo, poi scatta in linea retta e arriva in 0,48 s', () => {
    const { boss, ctx, events, hurts } = startPattern(3);
    const start = boss.charge!.start;
    let elapsed = 0;
    while (elapsed < 0.9) {
      boss.step(STEP, ctx);
      elapsed += STEP;
      expect(boss.position).toEqual(start);
    }
    expect(hurts).toHaveLength(0);
    let steps = 0;
    while (boss.charge !== null && steps < 200) {
      boss.step(STEP, ctx);
      steps++;
    }
    expect(boss.charge).toBeNull();
    expect(boss.position.x).toBeCloseTo(ARENA.playerSpawn.x, 6);
    expect(boss.position.y).toBeCloseTo(ARENA.playerSpawn.y, 6);
    expect(eventsOfType(events, 'boss_charge_finished')).toHaveLength(1);
    expect(hurts.length).toBeGreaterThan(0);
    for (const amount of hurts) expect(amount).toBe(25);
  });

  it('la carica ferisce il giocatore sotto 37 di distanza dal punto d\'arrivo e non a 38', () => {
    for (const [distance, hurt] of [[36, true], [38, false]] as const) {
      const boss = new Boss();
      boss.attackTimer = Infinity;
      // Percorso verticale lungo x = 1000, fino a y = 1100; il giocatore e' di lato, a `distance` dal punto d'arrivo.
      boss.position = new Vec2(1000, 1000);
      boss.charge = { start: new Vec2(1000, 1000), target: new Vec2(1000, 1100), elapsed: 0.95, windup: 0.95, duration: 0.48 };
      const { ctx, hurts } = createBossHarness(new Vec2(1000 + distance, 1100));
      let steps = 0;
      while (boss.charge !== null && steps < 200) {
        boss.step(STEP, ctx);
        steps++;
      }
      expect(hurts.length > 0, `distanza ${distance}`).toBe(hurt);
    }
  });

  it('durante la carica non parte nessun altro attacco', () => {
    const { boss, ctx } = startPattern(3);
    boss.attackTimer = -5;
    for (let i = 0; i < 30; i++) boss.step(STEP, ctx);
    expect(boss.attackCount).toBe(4);
  });
});

describe('spirale del vuoto', () => {
  it('programma 16 raffiche (22 in furia) ogni 0,085 s, ciascuna ruotata di 0,29 rad, senza sparare subito', () => {
    const { boss, projectiles } = startPattern(4);
    expect(projectiles).toHaveLength(0);
    expect(boss.volleys).toHaveLength(16);
    boss.volleys.forEach((volley, i) => {
      expect(volley.delay).toBeCloseTo(i * 0.085, 10);
      expect(volley.kind).toBe('spiral');
    });
    expect(boss.volleys[1]!.angle - boss.volleys[0]!.angle).toBeCloseTo(0.29, 10);
    expect(startPattern(4, { enraged: true }).boss.volleys).toHaveLength(22);
  });

  it('ogni raffica spara tre proiettili a 120 gradi; in totale 48 (66 in furia), piu\' veloci in furia', () => {
    const normal = startPattern(4);
    for (let i = 0; i < 120; i++) normal.boss.step(STEP, normal.ctx);
    expect(normal.projectiles).toHaveLength(48);
    expect(normal.projectiles[0]!.spec).toMatchObject({ speed: 125, damage: 10, radius: 4, visual: 'void_spiral' });
    expect(normal.projectiles[1]!.angle - normal.projectiles[0]!.angle).toBeCloseTo(TAU / 3, 10);

    const rage = startPattern(4, { enraged: true });
    for (let i = 0; i < 120; i++) rage.boss.step(STEP, rage.ctx);
    expect(rage.projectiles).toHaveLength(66);
    expect(rage.projectiles[0]!.spec.speed).toBe(155);
  });

  it('finche\' ci sono raffiche in attesa non parte un nuovo attacco, anche con il tempo scaduto; finite, riparte', () => {
    const { boss, ctx, projectiles } = startPattern(4);
    let steps = 0;
    while (boss.attackCount === 5 && steps < 400) {
      boss.attackTimer = 0;
      boss.step(STEP, ctx);
      steps++;
    }
    expect(boss.attackCount).toBe(6);
    // Il nuovo attacco e' partito solo dopo che tutte le raffiche (l'ultima a 1,275 s) hanno sparato.
    expect(steps * STEP).toBeGreaterThan(1.2);
    expect(projectiles.filter((shot) => shot.spec.visual === 'void_spiral')).toHaveLength(48);
  });
});

describe('triplice ventaglio', () => {
  it('programma tre ventagli a 0,5 / 0,88 / 1,26 s, ruotati di 0,25 rad', () => {
    const { boss, projectiles } = startPattern(5);
    expect(projectiles).toHaveLength(0);
    expect(boss.volleys.map((volley) => volley.delay)).toEqual([0.5, 0.88, 1.26].map((d) => expect.closeTo(d, 10)));
    expect(boss.volleys[1]!.angle - boss.volleys[0]!.angle).toBeCloseTo(0.25, 10);
    expect(boss.volleys.every((volley) => volley.kind === 'fan')).toBe(true);
  });

  it('ogni ventaglio spara cinque proiettili a 0,13 rad; in tutto quindici, con una posa breve a ogni sparo', () => {
    const { boss, ctx, projectiles, events } = startPattern(5);
    for (let i = 0; i < 100; i++) boss.step(STEP, ctx);
    expect(projectiles).toHaveLength(15);
    expect(projectiles[0]!.spec).toMatchObject({ speed: 185, damage: 14, radius: 5, visual: 'ember_fan' });
    expect(projectiles[1]!.angle - projectiles[0]!.angle).toBeCloseTo(0.13, 10);
    expect(eventsOfType(events, 'boss_pose').filter((event) => event.seconds === 0.18)).toHaveLength(3);
  });
});
