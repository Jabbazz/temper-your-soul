import { describe, expect, it } from 'vitest';
import { Camera } from '../../../core/camera';
import { SeededRng } from '../../../core/rng';
import { angleDifference, TAU, Vec2 } from '../../../core/vec2';
import { createBossHarness, createMatch, eventsOfType, intent, recordEvents, run, STEP } from '../../../testing';
import { Boss } from '../../boss/boss';
import { GUARDIAN } from '../../boss/guardian';
import { HIT_RADIUS, ZONE_EDGE_FORGIVENESS } from '../../combat/collision';
import { GUARDIAN_ART } from '../../presentation/boss-art/guardian';
import { BOSS_ART } from '../../presentation/boss-art';
import { SPORE_MOTHER_ART, sporeMotherPalette } from '../../presentation/boss-art/spore-mother';
import { cryptTheme } from '../../presentation/themes/crypt';
import { ARENA_THEMES } from '../../presentation/themes';
import { swampTheme } from '../../presentation/themes/swamp';
import { PROJECTILE_LOOKS, ZONE_LOOKS } from '../../presentation/visuals';
import { SWAMP, SWAMP_ARENA, SWAMP_PILLARS } from './swamp';
import {
  BOG_RING,
  ENCIRCLE,
  lashLength,
  ringAngles,
  SPORE_CLOUD,
  SPORE_MOTHER,
  SPORE_MOTHER_STATS,
  SPORE_RAIN,
  TENDRIL_LASH,
  TOXIC_LUNGE,
} from './spore-mother';

const ORDER = ['spore_cloud', 'tendril_lash', 'encircle', 'bog_ring', 'spore_rain', 'toxic_lunge'];

/** Fa partire lo schema `id` (nella fase indicata) e restituisce il boss e il contesto che registra cio' che fa. */
function cast(id: string, options: { enraged?: boolean; target?: Vec2; seed?: number; bossAt?: Vec2 } = {}) {
  const index = SPORE_MOTHER.patterns.findIndex((pattern) => pattern.id === id);
  expect(index, id).toBeGreaterThanOrEqual(0);
  const actor = new Boss(SPORE_MOTHER, SWAMP_ARENA);
  actor.phase = options.enraged ? 2 : 1;
  actor.attackCount = index;
  actor.attackTimer = 0;
  if (options.bossAt) actor.position = options.bossAt;
  const rng = new SeededRng(options.seed ?? 1);
  const harness = createBossHarness(options.target ?? SWAMP_ARENA.playerSpawn, rng);
  actor.step(STEP, harness.ctx);
  // Da qui in poi nessun altro attacco: si osserva solo cio' che lo schema ha messo in moto.
  actor.attackTimer = Number.POSITIVE_INFINITY;
  return { actor, harness, rng };
}

/** Fa avanzare il boss di `seconds` secondi (a passo fisso). */
function advance(actor: Boss, harness: ReturnType<typeof createBossHarness>, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) actor.step(STEP, harness.ctx);
}

/** Centro del varco piu' largo in un insieme di angoli disposti su un cerchio. */
function gapCenter(angles: readonly number[]): number {
  const sorted = angles.map((a) => ((a % TAU) + TAU) % TAU).sort((a, b) => a - b);
  let widest = -1;
  let center = 0;
  sorted.forEach((a, i) => {
    const next = i + 1 < sorted.length ? sorted[i + 1]! : sorted[0]! + TAU;
    if (next - a > widest) {
      widest = next - a;
      center = (a + next) / 2;
    }
  });
  return center;
}

describe('swamp: mappa', () => {
  it('swamp: e\' una palude quadrata 2800x2800 con 8 alberi morti e partenze ai lati opposti', () => {
    expect(SWAMP.arena).toBe(SWAMP_ARENA);
    expect(SWAMP.boss).toBe(SPORE_MOTHER);
    expect(SWAMP_ARENA.width).toBe(2800);
    expect(SWAMP_ARENA.height).toBe(2800);
    expect(SWAMP_ARENA.theme).toBe('swamp');
    expect(SWAMP_PILLARS.length).toBe(8);
    expect(SWAMP_ARENA.pillars).toBe(SWAMP_PILLARS);
    expect(SWAMP_ARENA.bossSpawn.y).toBeLessThan(SWAMP_ARENA.playerSpawn.y);
  });

  it('swamp: un albero morto sta tra le due partenze e due alberi lasciano un passaggio stretto ma percorribile', () => {
    const { playerSpawn: a, bossSpawn: b } = SWAMP_ARENA;
    const between = SWAMP_PILLARS.filter((pillar) => {
      // Distanza del centro dal segmento tra le partenze.
      const ab = b.sub(a);
      const u = Math.min(Math.max(pillar.position.sub(a).x * ab.x + pillar.position.sub(a).y * ab.y, 0) / ab.lengthSquared(), 1);
      return pillar.position.distanceTo(a.add(ab.mul(u))) < pillar.radius;
    });
    expect(between.length).toBe(1);
    const [p1, p2] = [SWAMP_PILLARS[0]!, SWAMP_PILLARS[1]!];
    const gap = p1.position.distanceTo(p2.position) - p1.radius - p2.radius;
    expect(gap).toBeGreaterThanOrEqual(20);
    expect(gap).toBeLessThan(40);
  });

  it('swamp: i pilastri hanno raggi diversi e stanno tutti nell\'arena', () => {
    expect(new Set(SWAMP_PILLARS.map((pillar) => pillar.radius)).size).toBeGreaterThanOrEqual(6);
    for (const pillar of SWAMP_PILLARS) {
      expect(pillar.position.x).toBeGreaterThan(0);
      expect(pillar.position.x).toBeLessThan(SWAMP_ARENA.width);
      expect(pillar.position.y).toBeGreaterThan(0);
      expect(pillar.position.y).toBeLessThan(SWAMP_ARENA.height);
    }
  });
});

describe('swamp: boss e testi', () => {
  it('swamp: la Madre delle Spore ha i valori previsti e i sei schemi in rotazione', () => {
    expect(SPORE_MOTHER.id).toBe('spore_mother');
    expect(SPORE_MOTHER.name).toBe('MADRE DELLE SPORE');
    expect(SPORE_MOTHER.art).toBe('spore_mother');
    expect(SPORE_MOTHER.stats).toBe(SPORE_MOTHER_STATS);
    expect(SPORE_MOTHER_STATS.maxHealth).toBe(2400);
    expect(SPORE_MOTHER_STATS.speed).toBeLessThan(GUARDIAN.stats.speed);
    expect(SPORE_MOTHER.patterns.map((pattern) => pattern.id)).toEqual(ORDER);
    expect(SPORE_MOTHER_STATS.attackInterval.rage).toBeLessThan(SPORE_MOTHER_STATS.attackInterval.normal);
  });

  it('swamp: nessuno degli schemi e\' condiviso con il guardiano della cripta', () => {
    const guardianIds = new Set(GUARDIAN.patterns.map((pattern) => pattern.id));
    expect(SPORE_MOTHER.patterns.filter((pattern) => guardianIds.has(pattern.id))).toEqual([]);
  });

  it('swamp: testi in italiano, dungeon di pericolo 2', () => {
    expect(SWAMP.name).toBe('La palude spenta');
    expect(SWAMP.danger).toBe(2);
    expect(SWAMP.tagline).not.toMatch(/segnaposto/i);
    expect(SWAMP.description).not.toMatch(/segnaposto/i);
    expect(SWAMP.description.length).toBeGreaterThan(80);
  });
});

describe('swamp: grafica', () => {
  const palettes = [false, true].flatMap((slowed) => [false, true].map((enraged) => sporeMotherPalette(slowed, enraged)));

  it('swamp: il boss ha 4 fotogrammi di camminata e una posa, tutti rettangolari e con simboli in tavolozza', () => {
    expect(BOSS_ART.spore_mother).toBe(SPORE_MOTHER_ART);
    expect(SPORE_MOTHER_ART.walk.length).toBe(4);
    expect(SPORE_MOTHER_ART.scale).toBe(3);
    const frames = [...SPORE_MOTHER_ART.walk, SPORE_MOTHER_ART.casting];
    const columns = SPORE_MOTHER_ART.walk[0]![0]!.length;
    expect(columns).toBeGreaterThanOrEqual(16);
    expect(columns).toBeLessThanOrEqual(22);
    for (const frame of frames) {
      expect(frame.length).toBe(frames[0]!.length);
      expect(frame.length).toBeGreaterThanOrEqual(17);
      expect(frame.length).toBeLessThanOrEqual(22);
      for (const row of frame) {
        expect(row.length, row).toBe(columns);
        for (const symbol of row) if (symbol !== '.') for (const palette of palettes) expect(palette[symbol], symbol).toBeDefined();
      }
    }
  });

  it('swamp: la posa di lancio e la camminata cambiano e la silhouette non e\' quella del guardiano', () => {
    const [idle, stepA, again, stepB] = SPORE_MOTHER_ART.walk;
    expect(stepA).not.toEqual(idle);
    expect(stepB).not.toEqual(idle);
    expect(stepA).not.toEqual(stepB);
    expect(again).toEqual(idle);
    expect(SPORE_MOTHER_ART.casting).not.toEqual(idle);
    const mask = (frame: readonly string[]) => frame.map((row) => row.replace(/[^.]/g, '#')).join('\n');
    expect(mask(idle!)).not.toBe(mask(GUARDIAN_ART.walk[0]!));
    expect(idle!.length).not.toBe(GUARDIAN_ART.walk[0]!.length);
  });

  it('swamp: la tavolozza cambia con il rallentamento e con la furia', () => {
    const normal = sporeMotherPalette(false, false);
    expect(sporeMotherPalette(true, false)).not.toEqual(normal);
    expect(sporeMotherPalette(false, true)).not.toEqual(normal);
    expect(sporeMotherPalette(false, true).f).not.toBe(normal.f);
    expect(sporeMotherPalette(true, false).b).not.toBe(normal.b);
  });

  it('swamp: ogni aspetto usato dagli schemi esiste (proiettili ed eventuali zone proprie)', () => {
    const seen = new Set<string>();
    for (const id of ORDER) {
      for (const enraged of [false, true]) {
        const { actor, harness } = cast(id, { enraged });
        advance(actor, harness, 10);
        for (const shot of harness.projectiles) {
          seen.add(`p:${shot.spec.visual}`);
          expect(PROJECTILE_LOOKS[shot.spec.visual], `${id}: ${shot.spec.visual}`).toBeDefined();
          expect(shot.spec.visual).toMatch(/^swamp_/);
        }
        for (const zone of harness.zones) {
          seen.add(`z:${zone.spec.visual}`);
          expect(zone.spec.visual, id).toMatch(/^swamp_/);
          expect(ZONE_LOOKS[zone.spec.visual!], `${id}: ${zone.spec.visual}`).toBeDefined();
        }
      }
    }
    // Tre aspetti di proiettile e tre di zona, tutti usati.
    expect(seen.size).toBe(6);
  });

  it('swamp: il tema e\' proprio, registrato e disegna solo la parte visibile', () => {
    expect(ARENA_THEMES.swamp).toBe(swampTheme);
    expect(swampTheme).not.toBe(cryptTheme);
    const counter = { calls: 0 };
    const ctx = new Proxy({} as Record<string | symbol, unknown>, {
      get: (target, prop) => (prop in target ? target[prop] : () => void counter.calls++),
      set: (target, prop, value) => {
        target[prop] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    const camera = new Camera();
    camera.follow(new Vec2(1400, 1400));
    swampTheme.drawFloor(ctx, SWAMP_ARENA, camera, 3.2);
    const visible = counter.calls;
    expect(visible).toBeGreaterThan(200);
    // La vista e' 960x540: un disegno dell'intera mappa (2800x2800, celle da 48) ne richiederebbe molte piu'.
    expect(visible).toBeLessThan(4000);
    counter.calls = 0;
    swampTheme.drawPillar(ctx, SWAMP_PILLARS[3]!, camera, 3.2);
    expect(counter.calls).toBeGreaterThan(10);
    counter.calls = 0;
    camera.follow(new Vec2(200, 2600));
    swampTheme.drawPillar(ctx, SWAMP_PILLARS[3]!, camera, 3.2);
    expect(counter.calls).toBe(0);
  });
});

describe('swamp: ringAngles', () => {
  it('lascia un varco centrato sull\'angolo dato e tiene gli altri posti equidistanti', () => {
    const angles = ringAngles(20, 3, 1);
    expect(angles.length).toBe(17);
    expect(angleDifference(gapCenter(angles), 1)).toBeCloseTo(0, 9);
    const step = TAU / 20;
    for (let i = 1; i < angles.length; i++) expect(angles[i]! - angles[i - 1]!).toBeCloseTo(step, 9);
    // Il varco e' largo 4 passi (3 posti vuoti piu' uno).
    expect(TAU - (angles[angles.length - 1]! - angles[0]!)).toBeCloseTo(4 * step, 9);
  });
});

describe('swamp: nuvola di spore (spore_cloud)', () => {
  it('swamp: il primo anello parte subito con il varco verso il giocatore, gli altri a intervalli e ruotati', () => {
    const { actor, harness } = cast('spore_cloud');
    const origin = actor.position;
    const toPlayer = origin.angleTo(SWAMP_ARENA.playerSpawn);
    const perRing = SPORE_CLOUD.shotsPerRing - SPORE_CLOUD.gapShots;
    expect(harness.projectiles.length).toBe(perRing);
    expect(actor.scheduled.map((a) => a.delay)).toEqual([SPORE_CLOUD.ringInterval.normal, 2 * SPORE_CLOUD.ringInterval.normal]);
    for (const shot of harness.projectiles) {
      expect(shot.position).toBe(origin);
      expect(shot.spec.speed).toBe(SPORE_CLOUD.speed.normal);
      // Nessun proiettile verso il giocatore: il varco e' li'.
      const step = TAU / SPORE_CLOUD.shotsPerRing;
      expect(Math.abs(angleDifference(shot.angle, toPlayer))).toBeGreaterThanOrEqual(2 * step - 1e-9);
    }
    advance(actor, harness, 3);
    expect(harness.projectiles.length).toBe(3 * perRing);
    const ring = (n: number) => harness.projectiles.slice(n * perRing, (n + 1) * perRing).map((shot) => shot.angle);
    for (const n of [0, 1, 2]) {
      expect(angleDifference(gapCenter(ring(n)), toPlayer + n * 0.8)).toBeCloseTo(0, 6);
    }
  });

  it('swamp: in furia gli anelli sono 4, piu\' veloci e piu\' ravvicinati', () => {
    const { actor, harness } = cast('spore_cloud', { enraged: true });
    const perRing = SPORE_CLOUD.shotsPerRing - SPORE_CLOUD.gapShots;
    advance(actor, harness, 0.7);
    expect(harness.projectiles.length).toBe(perRing);
    advance(actor, harness, 0.15);
    expect(harness.projectiles.length).toBe(2 * perRing);
    advance(actor, harness, 3);
    expect(harness.projectiles.length).toBe(SPORE_CLOUD.rings.rage * perRing);
    expect(new Set(harness.projectiles.map((shot) => shot.spec.speed))).toEqual(new Set([SPORE_CLOUD.speed.rage]));
    expect(actor.scheduled.length).toBe(0);
  });
});

describe('swamp: anello di melma (bog_ring)', () => {
  const target = SWAMP_ARENA.playerSpawn;

  it('swamp: un cerchio chiuso di 9 zone attorno al giocatore, con il centro sicuro', () => {
    const { actor, harness } = cast('bog_ring', { target });
    const { radius, zones } = BOG_RING.ring.normal;
    expect(harness.zones.length).toBe(zones);
    expect(actor.scheduled.length).toBe(0);
    const reach = BOG_RING.zone.radius + HIT_RADIUS.player - ZONE_EDGE_FORGIVENESS;
    for (const zone of harness.zones) {
      expect(zone.position.distanceTo(target)).toBeCloseTo(radius, 6);
      // Il centro del cerchio non viene mai raggiunto dallo scoppio.
      expect(zone.position.distanceTo(target)).toBeGreaterThan(reach + 30);
      expect(zone.spec).toBe(BOG_RING.zone);
    }
    // Il cerchio e' chiuso: zone vicine si sovrappongono (non si passa in mezzo).
    for (let i = 0; i < zones; i++) {
      const next = harness.zones[(i + 1) % zones]!;
      expect(harness.zones[i]!.position.distanceTo(next.position)).toBeLessThan(2 * reach);
    }
  });

  it('swamp: in furia il cerchio e\' piu\' largo e dopo 0,4 s ne compare un secondo, ancora attorno allo stesso punto', () => {
    const { actor, harness } = cast('bog_ring', { target, enraged: true });
    expect(harness.zones.length).toBe(BOG_RING.ring.rage.zones);
    expect(harness.zones[0]!.position.distanceTo(target)).toBeCloseTo(BOG_RING.ring.rage.radius, 6);
    expect(actor.scheduled.length).toBe(1);
    advance(actor, harness, BOG_RING.outerRing.delay - 0.1);
    expect(harness.zones.length).toBe(BOG_RING.ring.rage.zones);
    advance(actor, harness, 0.2);
    expect(harness.zones.length).toBe(BOG_RING.ring.rage.zones + BOG_RING.outerRing.zones);
    const outer = harness.zones.slice(BOG_RING.ring.rage.zones);
    for (const zone of outer) expect(zone.position.distanceTo(target)).toBeCloseTo(BOG_RING.outerRing.radius, 6);
    expect(actor.scheduled.length).toBe(0);
  });

  it('swamp: contro il bordo mancano le zone che cadrebbero fuori (il muro chiude il cerchio)', () => {
    const { harness } = cast('bog_ring', { target: new Vec2(SWAMP_ARENA.playerMargin + 5, 1400) });
    expect(harness.zones.length).toBeGreaterThan(0);
    expect(harness.zones.length).toBeLessThan(BOG_RING.ring.normal.zones);
    for (const zone of harness.zones) expect(zone.position.x).toBeGreaterThanOrEqual(SWAMP_ARENA.bossMargin);
  });
});

describe('swamp: frusta di radici (tendril_lash)', () => {
  const target = new Vec2(1400, 1250);
  const bossAt = new Vec2(1400, 850);

  it('swamp: la fila avanza dal boss verso il giocatore con ritardi crescenti e lo supera', () => {
    const { actor, harness } = cast('tendril_lash', { target, bossAt });
    const origin = actor.position;
    const zones = lashLength(origin.distanceTo(target));
    expect(zones).toBeGreaterThan(5);
    expect(zones).toBeLessThan(TENDRIL_LASH.maxZones);
    expect(actor.scheduled.length).toBe(zones);
    expect(actor.scheduled.map((a) => a.delay)).toEqual(Array.from({ length: zones }, (_, i) => i * TENDRIL_LASH.interval));
    expect(harness.zones.length).toBe(0);
    // Dopo 0,35 s sono comparse solo le prime quattro (0, 0,1, 0,2 e 0,3 s).
    advance(actor, harness, 0.35);
    expect(harness.zones.length).toBe(4);
    advance(actor, harness, 1);
    expect(harness.zones.length).toBe(zones);
    expect(actor.scheduled.length).toBe(0);
    const direction = origin.angleTo(target);
    harness.zones.forEach((zone, i) => {
      // Sulla retta boss-giocatore, a distanze crescenti di `spacing`.
      expect(zone.position.distanceTo(origin)).toBeCloseTo((i + 1) * TENDRIL_LASH.spacing, 6);
      expect(angleDifference(origin.angleTo(zone.position), direction)).toBeCloseTo(0, 9);
      expect(zone.spec).toBe(TENDRIL_LASH.zone);
    });
    expect(harness.zones[zones - 1]!.position.distanceTo(origin)).toBeGreaterThan(origin.distanceTo(target));
  });

  it('swamp: la lunghezza della fila e\' limitata', () => {
    expect(lashLength(0)).toBe(TENDRIL_LASH.minZones);
    expect(lashLength(5000)).toBe(TENDRIL_LASH.maxZones);
  });

  it('swamp: in furia le file sono tre, aperte a ventaglio attorno alla direzione del giocatore', () => {
    const { actor, harness } = cast('tendril_lash', { target, bossAt, enraged: true });
    const origin = actor.position;
    const zones = lashLength(origin.distanceTo(target));
    advance(actor, harness, 2);
    expect(harness.zones.length).toBe(3 * zones);
    const direction = origin.angleTo(target);
    // Le zone nascono a ondate: le prime tre sono le prime di ciascuna fila.
    const angles = [0, 1, 2].map((line) => origin.angleTo(harness.zones[line]!.position));
    expect(angleDifference(direction, angles[0]!)).toBeCloseTo(-TENDRIL_LASH.lineSpread, 6);
    expect(angleDifference(direction, angles[1]!)).toBeCloseTo(0, 6);
    expect(angleDifference(direction, angles[2]!)).toBeCloseTo(TENDRIL_LASH.lineSpread, 6);
  });

  it('swamp: la fila si ferma al bordo dell\'arena', () => {
    const { actor, harness } = cast('tendril_lash', { target: new Vec2(SWAMP_ARENA.playerMargin, 1400), bossAt: new Vec2(220, 1400) });
    advance(actor, harness, 3);
    expect(harness.zones.length).toBeGreaterThan(0);
    expect(harness.zones.length).toBeLessThan(lashLength(200));
    for (const zone of harness.zones) expect(zone.position.x).toBeGreaterThanOrEqual(SWAMP_ARENA.bossMargin);
    expect(actor.scheduled.length).toBe(0);
  });
});

describe('swamp: accerchiamento (encircle)', () => {
  const target = SWAMP_ARENA.playerSpawn;

  it('swamp: un anello di proiettili attorno al giocatore, diretti verso di lui, con il varco scelto da ctx.rng', () => {
    const { actor, harness } = cast('encircle', { target, seed: 1 });
    const perRing = ENCIRCLE.shotsPerRing.normal - ENCIRCLE.gapShots;
    expect(harness.projectiles.length).toBe(perRing);
    expect(actor.scheduled.length).toBe(0);
    for (const shot of harness.projectiles) {
      expect(shot.position.distanceTo(target)).toBeCloseTo(ENCIRCLE.radius, 6);
      expect(angleDifference(shot.position.angleTo(target), shot.angle)).toBeCloseTo(0, 9);
      expect(shot.spec.speed).toBe(ENCIRCLE.speed.normal);
      // Vive il tempo di arrivare al centro e un po' oltre.
      expect(shot.spec.lifetime).toBeGreaterThan(ENCIRCLE.radius / ENCIRCLE.speed.normal);
    }
    const expectedGap = new SeededRng(1).next() * TAU;
    const gap = gapCenter(harness.projectiles.map((shot) => target.angleTo(shot.position)));
    expect(angleDifference(gap, expectedGap)).toBeCloseTo(0, 6);
  });

  it('swamp: a parita\' di seme lo stesso varco, con semi diversi varchi diversi', () => {
    const gapFor = (seed: number) => {
      const { harness } = cast('encircle', { target, seed });
      return gapCenter(harness.projectiles.map((shot) => target.angleTo(shot.position)));
    };
    expect(gapFor(3)).toBeCloseTo(gapFor(3), 12);
    expect(Math.abs(angleDifference(gapFor(3), gapFor(4)))).toBeGreaterThan(0.05);
  });

  it('swamp: in furia il secondo anello e\' piu\' largo, ruotato e compare dopo un secondo', () => {
    const { actor, harness } = cast('encircle', { target, enraged: true });
    const perRing = ENCIRCLE.shotsPerRing.rage - ENCIRCLE.gapShots;
    expect(harness.projectiles.length).toBe(perRing);
    advance(actor, harness, ENCIRCLE.ringInterval - 0.1);
    expect(harness.projectiles.length).toBe(perRing);
    advance(actor, harness, 0.2);
    expect(harness.projectiles.length).toBe(2 * perRing);
    const [first, second] = [harness.projectiles.slice(0, perRing), harness.projectiles.slice(perRing)];
    for (const shot of second) expect(shot.position.distanceTo(target)).toBeCloseTo(ENCIRCLE.radius + ENCIRCLE.radiusStep, 6);
    const gapOf = (shots: typeof first) => gapCenter(shots.map((shot) => target.angleTo(shot.position)));
    expect(angleDifference(gapOf(second), gapOf(first) + ENCIRCLE.gapTwist)).toBeCloseTo(0, 6);
    expect(actor.scheduled.length).toBe(0);
  });

  it('swamp: i proiettili che nascerebbero fuori dall\'arena mancano', () => {
    const { harness } = cast('encircle', { target: new Vec2(SWAMP_ARENA.playerMargin + 20, 1400) });
    expect(harness.projectiles.length).toBeGreaterThan(0);
    expect(harness.projectiles.length).toBeLessThan(ENCIRCLE.shotsPerRing.normal - ENCIRCLE.gapShots);
    for (const shot of harness.projectiles) expect(shot.position.x).toBeGreaterThanOrEqual(SWAMP_ARENA.projectileMargin);
  });
});

describe('swamp: pioggia di spore (spore_rain)', () => {
  const target = SWAMP_ARENA.playerSpawn;

  it('swamp: 11 zone piccole in una corona attorno al giocatore, comparse a intervalli e con 2 estrazioni ciascuna', () => {
    const { actor, harness, rng } = cast('spore_rain', { target });
    expect(harness.zones.length).toBe(0);
    expect(actor.scheduled.length).toBe(SPORE_RAIN.zones.normal);
    advance(actor, harness, 0.5);
    // Compaiono a 0, 0,11, 0,22, 0,33 e 0,44 s.
    expect(harness.zones.length).toBe(5);
    advance(actor, harness, 1.5);
    expect(harness.zones.length).toBe(SPORE_RAIN.zones.normal);
    for (const zone of harness.zones) {
      const distance = zone.position.distanceTo(target);
      expect(distance).toBeGreaterThanOrEqual(SPORE_RAIN.minDistance - 1e-6);
      expect(distance).toBeLessThanOrEqual(SPORE_RAIN.maxDistance + 1e-6);
      expect(zone.spec).toBe(SPORE_RAIN.zone);
    }
    // Due numeri casuali per zona, non uno di piu': l'ordine delle estrazioni e' parte del comportamento.
    const reference = new SeededRng(1);
    for (let i = 0; i < 2 * SPORE_RAIN.zones.normal; i++) reference.next();
    expect(rng.next()).toBe(reference.next());
    // Sparse in tutte le direzioni, non su una linea.
    const xs = harness.zones.map((zone) => zone.position.x);
    const ys = harness.zones.map((zone) => zone.position.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(200);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(200);
  });

  it('swamp: stesso seme stesse zone, semi diversi zone diverse; in furia sono 17', () => {
    const positions = (seed: number, enraged = false) => {
      const { actor, harness } = cast('spore_rain', { target, seed, enraged });
      advance(actor, harness, 3);
      return harness.zones.map((zone) => `${zone.position.x.toFixed(3)},${zone.position.y.toFixed(3)}`);
    };
    expect(positions(5)).toEqual(positions(5));
    expect(positions(5)).not.toEqual(positions(6));
    expect(positions(5, true).length).toBe(SPORE_RAIN.zones.rage);
  });

  it('swamp: le zone cadono attorno al giocatore nel momento in cui compaiono (lo seguono)', () => {
    const { actor, harness } = cast('spore_rain', { target });
    const moved = new Vec2(900, 1900);
    const ctx = { ...harness.ctx, target: moved };
    for (let i = 0; i < 200; i++) actor.step(STEP, ctx);
    const late = harness.zones.slice(-3);
    expect(late.length).toBe(3);
    for (const zone of late) expect(zone.position.distanceTo(moved)).toBeLessThanOrEqual(SPORE_RAIN.maxDistance + 1e-6);
  });
});

describe('swamp: slancio tossico (toxic_lunge)', () => {
  it('swamp: preparazione lunga, carica lenta e, solo all\'arrivo, un anello di spore', () => {
    const target = new Vec2(1400, 1500);
    const { actor, harness } = cast('toxic_lunge', { target, bossAt: new Vec2(1400, 900) });
    const charge = actor.charge!;
    expect(charge).not.toBeNull();
    expect(charge.windup).toBe(TOXIC_LUNGE.windup);
    expect(charge.duration).toBe(TOXIC_LUNGE.duration);
    expect(charge.target.distanceTo(target)).toBeLessThan(1e-9);
    expect(actor.scheduled.length).toBe(1);
    expect(harness.events.some((event) => event.type === 'boss_pose' && event.seconds === TOXIC_LUNGE.windup)).toBe(true);
    // Durante la preparazione il boss resta fermo e non spara.
    advance(actor, harness, TOXIC_LUNGE.windup - 0.1);
    expect(actor.position.distanceTo(charge.start)).toBeLessThan(1e-9);
    expect(harness.projectiles.length).toBe(0);
    // Durante lo scatto si sposta, ma non spara ancora.
    advance(actor, harness, TOXIC_LUNGE.duration / 2);
    expect(actor.charge).not.toBeNull();
    expect(actor.position.distanceTo(charge.start)).toBeGreaterThan(100);
    expect(harness.projectiles.length).toBe(0);
    // All'arrivo la carica finisce e le spore partono dal punto di arrivo.
    advance(actor, harness, TOXIC_LUNGE.duration / 2 + TOXIC_LUNGE.landingDelay + 0.2);
    expect(actor.charge).toBeNull();
    expect(harness.projectiles.length).toBe(TOXIC_LUNGE.burst.shots.normal);
    for (const shot of harness.projectiles) {
      expect(shot.position.distanceTo(target)).toBeGreaterThan(100); // Albero centrale: niente attraversamento.
      expect(shot.spec.visual).toBe('swamp_pustule');
    }
    expect(actor.scheduled.length).toBe(0);
    expect(harness.events.some((event) => event.type === 'boss_charge_finished')).toBe(true);
  });

  it('swamp: in furia le spore sono 14 e il boss e\' ancora fermo a preparare finche\' la carica non parte', () => {
    const { actor, harness } = cast('toxic_lunge', { enraged: true, target: new Vec2(1400, 1500) });
    advance(actor, harness, 4);
    expect(harness.projectiles.length).toBe(TOXIC_LUNGE.burst.shots.rage);
  });

  it('swamp: l\'intero schema dura meno di 3 secondi (poi il boss puo\' attaccare di nuovo)', () => {
    const { actor, harness } = cast('toxic_lunge');
    advance(actor, harness, TOXIC_LUNGE.windup + TOXIC_LUNGE.duration + TOXIC_LUNGE.landingDelay + 0.1);
    expect(actor.charge).toBeNull();
    expect(actor.scheduled.length).toBe(0);
  });
});

describe('swamp: partita completa', () => {
  const play = (seed: number) => {
    const match = createMatch(seed, { dungeon: SWAMP });
    const events = recordEvents(match);
    const trace: string[] = [];
    run(match, 40, (m) => {
      m.player.health.current = 100;
      const t = m.time;
      if (Math.round(t * 60) % 60 === 0) {
        trace.push(
          [m.projectiles.length, m.zones.length, m.boss.position.x.toFixed(2), m.boss.position.y.toFixed(2), m.boss.attackCount].join(','),
        );
      }
      return intent(m, { move: new Vec2(Math.cos(t), Math.sin(t * 1.3)), aim: m.boss.position });
    });
    return { trace, events, match };
  };

  it('swamp: gli schemi partono nell\'ordine previsto, il primo dopo 2,4 secondi', () => {
    const { events } = play(1);
    const attacks = eventsOfType(events, 'boss_attack');
    expect(attacks.slice(0, 6).map((attack) => attack.patternId)).toEqual(ORDER);
    expect(attacks.slice(0, 6).map((attack) => attack.name)).toEqual(SPORE_MOTHER.patterns.map((pattern) => pattern.name));
  });

  it('swamp: a parita\' di seme la partita e\' identica, con semi diversi no', () => {
    const a = play(7).trace;
    expect(a.length).toBeGreaterThan(30);
    expect(play(7).trace).toEqual(a);
    expect(play(8).trace).not.toEqual(a);
  });

  it('swamp: la partita parte con il boss a nord, il giocatore a sud e nessun attacco prima di 2,4 s', () => {
    const match = createMatch(1, { dungeon: SWAMP });
    const events = recordEvents(match);
    expect(match.boss.definition).toBe(SPORE_MOTHER);
    expect(match.player.position).toBe(SWAMP_ARENA.playerSpawn);
    run(match, 2.3);
    expect(eventsOfType(events, 'boss_attack').length).toBe(0);
    run(match, 0.3);
    expect(eventsOfType(events, 'boss_attack').map((attack) => attack.patternId)).toEqual(['spore_cloud']);
  });
});
