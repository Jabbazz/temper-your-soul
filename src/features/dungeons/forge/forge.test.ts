import { describe, expect, it } from 'vitest';
import { Camera } from '../../../core/camera';
import { SeededRng } from '../../../core/rng';
import { angleDifference, TAU, Vec2 } from '../../../core/vec2';
import { pillarAt } from '../../arena/arena';
import { Boss } from '../../boss/boss';
import type { BossContext } from '../../boss/boss-context';
import { GUARDIAN } from '../../boss/guardian';
import { BODY_RADIUS, HIT_RADIUS, ZONE_EDGE_FORGIVENESS } from '../../combat/collision';
import { BOSS_ART } from '../../presentation/boss-art';
import { FORGE_COLOSSUS_ART } from '../../presentation/boss-art/forge-colossus';
import { FORGE_LOOKS } from '../../presentation/looks/forge';
import { forgeTheme } from '../../presentation/themes/forge';
import { PROJECTILE_LOOKS, ZONE_LOOKS } from '../../presentation/visuals';
import { createBossHarness, createMatch, eventsOfType, intent, recordEvents, run, STEP, type SpawnedProjectile } from '../../../testing';
import { FORGE, FORGE_ARENA } from './forge';
import { FORGE_COLOSSUS, FORGE_COLOSSUS_STATS } from './forge-colossus';
import {
  BARRAGE,
  BELLOWS,
  BELLOWS_SPIRAL,
  bellowsSpeed,
  CROSS,
  EMBER_BARRAGE,
  FORGE_CROSS,
  HAMMER_SLAM,
  IRON_CHARGE,
  IRON_CHARGE_DATA,
  lineRows,
  LINES,
  MOLTEN_LINES,
  SLAM,
} from './forge-patterns';

const arena = FORGE_ARENA;
const SPAWN = arena.playerSpawn;

interface Scene {
  readonly boss: Boss;
  readonly ctx: BossContext;
  readonly harness: ReturnType<typeof createBossHarness>;
  /** Cambia il punto in cui si trova il giocatore dal passo successivo. */
  moveTarget(point: Vec2): void;
}

/** Un colosso nell'arena della fucina che non lancia attacchi da solo; la mira del giocatore si puo' spostare. */
function scene(options: { enraged?: boolean; target?: Vec2; seed?: number; bossAt?: Vec2 } = {}): Scene {
  const boss = new Boss(FORGE_COLOSSUS, arena);
  boss.phase = options.enraged ? 2 : 1;
  boss.attackTimer = Number.POSITIVE_INFINITY;
  if (options.bossAt) boss.position = options.bossAt;
  let target = options.target ?? SPAWN;
  const harness = createBossHarness(target, new SeededRng(options.seed ?? 1));
  const ctx: BossContext = {
    ...harness.ctx,
    get target() {
      return target;
    },
  };
  return { boss, ctx, harness, moveTarget: (point) => void (target = point) };
}

/** Fa avanzare il boss di `seconds` secondi. */
function advance(s: Scene, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) s.boss.step(STEP, s.ctx);
}

/** I proiettili comparsi a ogni passo (un gruppo per passo in cui ne e' comparso almeno uno), con il tempo del passo. */
function recordBatches(s: Scene, seconds: number): Array<{ time: number; shots: SpawnedProjectile[] }> {
  const batches: Array<{ time: number; shots: SpawnedProjectile[] }> = [];
  for (let i = 1; i <= Math.round(seconds / STEP); i++) {
    const before = s.harness.projectiles.length;
    s.boss.step(STEP, s.ctx);
    if (s.harness.projectiles.length > before) batches.push({ time: i * STEP, shots: s.harness.projectiles.slice(before) });
  }
  return batches;
}

/** Larghezza libera tra due zone sovrapposte in verticale, per il centro del giocatore. */
const freeWidth = (distance: number, radius: number): number => distance - 2 * (radius + HIT_RADIUS.player - ZONE_EDGE_FORGIVENESS);

const near = (a: number, b: number, tolerance: number): boolean => Math.abs(a - b) <= tolerance;

describe('forge: mappa', () => {
  it('e larga e bassa, con 4-8 pilastri e partenze libere', () => {
    expect(arena.width).toBe(3600);
    expect(arena.height).toBe(2200);
    expect(arena.width / arena.height).toBeGreaterThan(1.5);
    expect(arena.pillars.length).toBeGreaterThanOrEqual(4);
    expect(arena.pillars.length).toBeLessThanOrEqual(8);
    expect(arena.theme).toBe('forge');
    expect(pillarAt(arena, arena.playerSpawn, 60)).toBeUndefined();
    expect(pillarAt(arena, arena.bossSpawn, 60)).toBeUndefined();
  });

  it('ogni punto in cui il giocatore puo stare e raggiungibile dalla partenza (nessuna tasca chiusa dai pilastri)', () => {
    const cell = 20;
    const cols = Math.floor(arena.width / cell);
    const rows = Math.floor(arena.height / cell);
    const walkable = (c: number, r: number): boolean => {
      const p = new Vec2(c * cell + cell / 2, r * cell + cell / 2);
      const m = arena.playerMargin;
      if (p.x < m || p.x > arena.width - m || p.y < m || p.y > arena.height - m) return false;
      return pillarAt(arena, p, BODY_RADIUS.player) === undefined;
    };
    const seen = new Set<number>();
    const queue: Array<[number, number]> = [[Math.floor(SPAWN.x / cell), Math.floor(SPAWN.y / cell)]];
    seen.add(queue[0]![1] * cols + queue[0]![0]);
    for (let head = 0; head < queue.length; head++) {
      const [c, r] = queue[head]!;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || !walkable(nc, nr) || seen.has(nr * cols + nc)) continue;
        seen.add(nr * cols + nc);
        queue.push([nc, nr]);
      }
    }
    let total = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (walkable(c, r)) total++;
    expect(seen.size).toBe(total);
    expect(seen.has(Math.floor(arena.bossSpawn.y / cell) * cols + Math.floor(arena.bossSpawn.x / cell))).toBe(true);
  });

  it('un pilastro spezza la linea di tiro tra le due partenze (riparo contro i proiettili del boss)', () => {
    const from = arena.bossSpawn;
    const to = arena.playerSpawn;
    let blocked = false;
    for (let t = 0; t <= 1; t += 0.002) {
      if (pillarAt(arena, from.lerp(to, t)) !== undefined) blocked = true;
    }
    expect(blocked).toBe(true);
  });
});

describe('forge: il boss', () => {
  it('ha valori pesanti ma sensati e sei schemi in un ordine fisso che alterna zone e proiettili', () => {
    expect(FORGE_COLOSSUS.stats).toBe(FORGE_COLOSSUS_STATS);
    expect(FORGE_COLOSSUS_STATS.maxHealth).toBe(9000);
    expect(FORGE_COLOSSUS_STATS.hitRadius).toBeGreaterThanOrEqual(40);
    expect(FORGE_COLOSSUS_STATS.speed).toBeLessThan(GUARDIAN.stats.speed);
    expect(FORGE_COLOSSUS_STATS.contactDistance).toBeLessThanOrEqual(30);
    expect(FORGE_COLOSSUS.patterns.map((p) => p.id)).toEqual([
      'hammer_slam',
      'ember_barrage',
      'molten_lines',
      'bellows_spiral',
      'forge_cross',
      'iron_charge',
    ]);
    const guardianIds = new Set(GUARDIAN.patterns.map((p) => p.id));
    expect(FORGE_COLOSSUS.patterns.filter((p) => guardianIds.has(p.id))).toHaveLength(0);
    expect(FORGE.boss).toBe(FORGE_COLOSSUS);
    expect(FORGE.arena).toBe(FORGE_ARENA);
    expect(FORGE.danger).toBe(3);
  });

  it('i testi sono in italiano, il nome del boss e in maiuscolo', () => {
    expect(FORGE_COLOSSUS.name).toBe('COLOSSO DELLA FORNACE');
    expect(FORGE.tagline.length).toBeGreaterThan(10);
    expect(FORGE.description).toContain('Colosso');
  });
});

describe('forge: hammer_slam', () => {
  it('apre una zona enorme sul giocatore e solo allo scoppio libera un anello di schegge', () => {
    const s = scene({ target: new Vec2(1400, 900) });
    HAMMER_SLAM.execute(s.boss, s.ctx);
    expect(s.harness.zones).toHaveLength(1);
    const zone = s.harness.zones[0]!;
    expect(zone.position.equals(new Vec2(1400, 900))).toBe(true);
    expect(zone.spec).toMatchObject({ radius: 125, delay: 1.5, damage: 34, visual: 'forge_slam', team: 'enemy' });
    expect(s.harness.projectiles).toHaveLength(0);
    expect(s.boss.scheduled.map((a) => a.tag)).toEqual(['slam_ring']);

    let steps = 0;
    while (s.harness.projectiles.length === 0 && steps < 300) {
      s.boss.step(STEP, s.ctx);
      steps++;
    }
    // L'anello parte quando la zona scoppia, non prima.
    expect(steps * STEP).toBeGreaterThan(SLAM.zone.delay - 0.05);
    expect(steps * STEP).toBeLessThan(SLAM.zone.delay + 0.1);
    const ring = s.harness.projectiles;
    expect(ring).toHaveLength(12);
    for (const shot of ring) {
      expect(shot.position.equals(zone.position)).toBe(true);
      expect(shot.spec).toMatchObject({ speed: 150, damage: 14, visual: 'forge_shrapnel', team: 'enemy' });
    }
    const angles = ring.map((shot) => shot.angle);
    for (let i = 1; i < angles.length; i++) expect(angleDifference(angles[i - 1]!, angles[i]!)).toBeCloseTo(TAU / 12, 9);
    expect(s.boss.scheduled).toHaveLength(0);
  });

  it('in furia batte due volte: la seconda martellata cade dove il giocatore e in quel momento', () => {
    const a = new Vec2(1400, 900);
    const b = new Vec2(1500, 1500);
    const s = scene({ enraged: true, target: a });
    HAMMER_SLAM.execute(s.boss, s.ctx);
    advance(s, 0.5);
    s.moveTarget(b);
    advance(s, 0.7);
    expect(s.harness.zones).toHaveLength(2);
    expect(s.harness.zones[0]!.position.equals(a)).toBe(true);
    expect(s.harness.zones[1]!.position.equals(b)).toBe(true);
    advance(s, 3);
    expect(s.harness.projectiles).toHaveLength(32);
    const fromA = s.harness.projectiles.filter((shot) => shot.position.equals(a));
    const fromB = s.harness.projectiles.filter((shot) => shot.position.equals(b));
    expect(fromA).toHaveLength(16);
    expect(fromB).toHaveLength(16);
    expect(fromA[0]!.spec.speed).toBe(175);
    expect(s.boss.scheduled).toHaveLength(0);
  });

  it('il tempo di avviso basta a uscire dalla zona alla velocita del giocatore', () => {
    const reach = SLAM.zone.radius + HIT_RADIUS.player - ZONE_EDGE_FORGIVENESS;
    const dodgeSpeed = 177;
    expect(dodgeSpeed * SLAM.zone.delay).toBeGreaterThan(reach + 40);
  });
});

describe('forge: molten_lines', () => {
  const columnsOf = (zones: Array<{ position: Vec2; spec: { delay: number } }>) => {
    const map = new Map<number, Array<{ y: number; delay: number }>>();
    for (const zone of zones) {
      const list = map.get(zone.position.x) ?? [];
      list.push({ y: zone.position.y, delay: zone.spec.delay });
      map.set(zone.position.x, list);
    }
    return map;
  };

  it('copre la mappa con 3 colonne parallele centrate sul giocatore, ognuna con un varco di 2 zone', () => {
    const target = new Vec2(1100, 1100);
    const s = scene({ target });
    MOLTEN_LINES.execute(s.boss, s.ctx);
    const rows = lineRows(arena.height);
    expect(rows).toHaveLength(13);
    const columns = columnsOf(s.harness.zones);
    expect([...columns.keys()].sort((p, q) => p - q)).toEqual([740, 1100, 1460]);
    for (const [x, zones] of columns) {
      expect(zones, `colonna ${x}`).toHaveLength(rows.length - 2);
      const ys = zones.map((z) => z.y).sort((p, q) => p - q);
      expect(ys.every((y) => rows.includes(y))).toBe(true);
      const missing = rows.filter((y) => !ys.includes(y));
      expect(missing).toHaveLength(2);
      // Il varco e contiguo, non tocca la prima ne l'ultima fila e sta vicino al giocatore.
      expect(missing[1]! - missing[0]!).toBe(LINES.zoneSpacing);
      expect(missing[0]!).toBeGreaterThan(rows[0]!);
      expect(missing[1]!).toBeLessThan(rows[rows.length - 1]!);
      const center = (missing[0]! + missing[1]!) / 2;
      expect(Math.abs(center - target.y)).toBeLessThanOrEqual(LINES.gapSpread / 2 + LINES.zoneSpacing);
      // Il varco e percorribile con ampio margine.
      const above = ys.filter((y) => y < missing[0]!).pop()!;
      const below = ys.find((y) => y > missing[1]!)!;
      expect(freeWidth(below - above, LINES.zone.radius)).toBeGreaterThan(5 * HIT_RADIUS.player);
    }
    for (const zone of s.harness.zones) {
      expect(zone.spec).toMatchObject({ radius: 90, damage: 30, visual: 'forge_lava', team: 'enemy' });
    }
  });

  it('la colonna piu vicina al boss scoppia per prima, le altre a intervalli regolari', () => {
    const s = scene({ target: new Vec2(1100, 1100) });
    MOLTEN_LINES.execute(s.boss, s.ctx);
    const columns = columnsOf(s.harness.zones);
    const delayOf = (x: number) => new Set(columns.get(x)!.map((z) => z.delay));
    // Il boss e a destra (x = 2400): la colonna a 1460 e la prima.
    expect([...delayOf(1460)]).toEqual([1.5]);
    expect([...delayOf(1100)][0]).toBeCloseTo(1.95, 9);
    expect([...delayOf(740)][0]).toBeCloseTo(2.4, 9);
    expect(delayOf(1100).size).toBe(1);
  });

  it('in furia ha 4 colonne con un varco di una sola zona, ancora percorribile', () => {
    const s = scene({ target: new Vec2(1100, 1100), enraged: true });
    MOLTEN_LINES.execute(s.boss, s.ctx);
    const columns = columnsOf(s.harness.zones);
    expect([...columns.keys()].sort((p, q) => p - q)).toEqual([560, 920, 1280, 1640]);
    const rows = lineRows(arena.height);
    for (const zones of columns.values()) {
      expect(zones).toHaveLength(rows.length - 1);
      const ys = zones.map((z) => z.y).sort((p, q) => p - q);
      const gap = Math.max(...ys.slice(1).map((y, i) => y - ys[i]!));
      expect(gap).toBe(2 * LINES.zoneSpacing);
      expect(freeWidth(gap, LINES.zone.radius)).toBeGreaterThan(5 * HIT_RADIUS.player);
    }
    // Le corsie tra una colonna e l'altra sono percorribili.
    expect(freeWidth(LINES.columnSpacing, LINES.zone.radius)).toBeGreaterThan(5 * HIT_RADIUS.player);
  });

  it('e riproducibile con il seme e il varco cambia da un seme all\'altro', () => {
    const gapsFor = (seed: number): string => {
      const s = scene({ seed });
      MOLTEN_LINES.execute(s.boss, s.ctx);
      return s.harness.zones.map((z) => `${z.position.x},${z.position.y}`).join(';');
    };
    expect(gapsFor(7)).toBe(gapsFor(7));
    expect(new Set([1, 2, 3, 4, 5, 6].map(gapsFor)).size).toBeGreaterThan(2);
  });

  it('le colonne fuori mappa non si creano, ma le estrazioni casuali restano le stesse (riproducibilita)', () => {
    const edge = scene({ target: new Vec2(100, 1100), seed: 9 });
    MOLTEN_LINES.execute(edge.boss, edge.ctx);
    const center = scene({ target: new Vec2(1100, 1100), seed: 9 });
    MOLTEN_LINES.execute(center.boss, center.ctx);
    expect(edge.harness.zones.length).toBeLessThan(center.harness.zones.length);
    for (const zone of edge.harness.zones) {
      expect(zone.position.x).toBeGreaterThanOrEqual(0);
      expect(zone.position.x).toBeLessThanOrEqual(arena.width);
    }
    expect(edge.ctx.rng.next()).toBe(center.ctx.rng.next());
  });
});

describe('forge: ember_barrage', () => {
  it('spara tre raffiche strette a intervalli di 0,42 s, ognuna mirata dove sta il giocatore in quel momento', () => {
    const s = scene({ target: new Vec2(1100, 1100) });
    EMBER_BARRAGE.execute(s.boss, s.ctx);
    expect(s.harness.projectiles).toHaveLength(0);
    // Dopo la prima raffica il giocatore si sposta: la seconda deve seguirlo.
    const batches: Array<{ time: number; shots: SpawnedProjectile[]; target: Vec2 }> = [];
    for (let i = 1; i <= Math.round(2.5 / STEP); i++) {
      const before = s.harness.projectiles.length;
      const target = i * STEP > 0.9 ? new Vec2(1100, 1700) : new Vec2(1100, 1100);
      s.moveTarget(target);
      s.boss.step(STEP, s.ctx);
      if (s.harness.projectiles.length > before) batches.push({ time: i * STEP, shots: s.harness.projectiles.slice(before), target });
    }
    expect(batches).toHaveLength(3);
    expect(batches.map((b) => b.shots.length)).toEqual([3, 3, 3]);
    batches.forEach((batch, i) => {
      expect(near(batch.time, BARRAGE.firstDelay + i * BARRAGE.burstInterval, 0.05), `raffica ${i}: ${batch.time}`).toBe(true);
      const [left, mid, right] = batch.shots;
      const aim = mid!.position.angleTo(batch.target);
      expect(angleDifference(aim, mid!.angle)).toBeCloseTo(0, 9);
      expect(angleDifference(left!.angle, mid!.angle)).toBeCloseTo(BARRAGE.spread, 9);
      expect(angleDifference(mid!.angle, right!.angle)).toBeCloseTo(BARRAGE.spread, 9);
      for (const shot of batch.shots) expect(shot.spec).toMatchObject({ speed: 330, damage: 13, radius: 6, visual: 'forge_ember' });
    });
    // La prima raffica e mirata al giocatore fermo, l'ultima a quello spostato: gli angoli differiscono.
    expect(Math.abs(angleDifference(batches[0]!.shots[1]!.angle, batches[2]!.shots[1]!.angle))).toBeGreaterThan(0.1);
    expect(eventsOfTypePose(s.harness.events)).toBe(3);
    expect(s.boss.scheduled).toHaveLength(0);
  });

  it('in furia le raffiche sono quattro e piu veloci', () => {
    const s = scene({ enraged: true });
    EMBER_BARRAGE.execute(s.boss, s.ctx);
    const batches = recordBatches(s, 3);
    expect(batches).toHaveLength(4);
    for (const batch of batches) for (const shot of batch.shots) expect(shot.spec.speed).toBe(380);
  });
});

function eventsOfTypePose(events: ReturnType<typeof createBossHarness>['events']): number {
  return events.filter((event) => event.type === 'boss_pose').length;
}

describe('forge: forge_cross', () => {
  const anglesOf = (s: Scene) => s.harness.zones.map((z) => s.boss.position.angleTo(z.position));
  const distanceOf = (s: Scene, z: { position: Vec2 }) => s.boss.position.distanceTo(z.position);

  it('apre quattro bracci perpendicolari di sei zone che si accendono dal boss verso l\'esterno', () => {
    const s = scene({ bossAt: arena.bossSpawn });
    FORGE_CROSS.execute(s.boss, s.ctx);
    expect(s.harness.zones).toHaveLength(4 * CROSS.zonesPerArm);
    const distances = new Set(s.harness.zones.map((z) => Math.round(distanceOf(s, z))));
    expect([...distances].sort((p, q) => p - q)).toEqual([140, 290, 440, 590, 740, 890]);
    // Quattro direzioni distinte a 90 gradi una dall'altra.
    const directions = new Set(anglesOf(s).map((a) => (Math.round((((a % TAU) + TAU) % TAU) * 1000) / 1000).toFixed(3)));
    expect(directions.size).toBe(4);
    const sorted = [...directions].map(Number).sort((p, q) => p - q);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]! - sorted[i - 1]!).toBeCloseTo(Math.PI / 2, 2);
    // Piu e lontana la zona, piu tardi scoppia (delay = 1,1 + 0,28 * indice).
    for (const zone of s.harness.zones) {
      const index = Math.round((distanceOf(s, zone) - CROSS.firstDistance) / CROSS.zoneSpacing);
      expect(zone.spec.delay).toBeCloseTo(CROSS.firstDelay + index * 0.28, 9);
      expect(zone.spec).toMatchObject({ radius: 80, damage: 28, visual: 'forge_cross' });
    }
  });

  it('in furia i bracci sono otto, a 45 gradi, con onda piu rapida', () => {
    const s = scene({ bossAt: arena.bossSpawn, enraged: true });
    FORGE_CROSS.execute(s.boss, s.ctx);
    expect(s.harness.zones).toHaveLength(8 * CROSS.zonesPerArm);
    const directions = new Set(anglesOf(s).map((a) => (Math.round((((a % TAU) + TAU) % TAU) * 1000) / 1000).toFixed(3)));
    expect(directions.size).toBe(8);
    const farthest = s.harness.zones.find((z) => Math.round(distanceOf(s, z)) === 890)!;
    expect(farthest.spec.delay).toBeCloseTo(1.1 + 5 * 0.22, 9);
  });

  it('la croce ruota con il seme e vicino ai muri i bracci si fermano (nessuna zona fuori mappa)', () => {
    const baseFor = (seed: number) => {
      const s = scene({ seed, bossAt: arena.bossSpawn });
      FORGE_CROSS.execute(s.boss, s.ctx);
      return s.boss.position.angleTo(s.harness.zones[0]!.position);
    };
    expect(baseFor(3)).toBe(baseFor(3));
    expect(new Set([1, 2, 3, 4].map(baseFor)).size).toBeGreaterThan(1);

    const corner = scene({ bossAt: new Vec2(120, 120) });
    FORGE_CROSS.execute(corner.boss, corner.ctx);
    expect(corner.harness.zones.length).toBeGreaterThan(0);
    expect(corner.harness.zones.length).toBeLessThan(4 * CROSS.zonesPerArm);
    for (const zone of corner.harness.zones) {
      expect(zone.position.x).toBeGreaterThanOrEqual(0);
      expect(zone.position.y).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('forge: bellows_spiral', () => {
  it('lancia 24 raffiche ogni 0,12 s da due bracci opposti che ruotano di 0,26 rad e la cui velocita pulsa', () => {
    const s = scene();
    BELLOWS_SPIRAL.execute(s.boss, s.ctx);
    const batches = recordBatches(s, 5);
    expect(batches).toHaveLength(24);
    batches.forEach((batch, i) => {
      expect(batch.shots, `raffica ${i}`).toHaveLength(2);
      expect(near(batch.time, i * 0.12, 0.05), `tempo ${i}: ${batch.time}`).toBe(true);
      const [a, b] = batch.shots;
      expect(Math.abs(angleDifference(a!.angle, b!.angle))).toBeCloseTo(Math.PI, 9);
      expect(a!.spec.speed).toBeCloseTo(bellowsSpeed(i), 9);
      expect(a!.spec).toMatchObject({ damage: 11, radius: 5, visual: 'forge_bellows' });
      if (i > 0) expect(angleDifference(batches[i - 1]!.shots[0]!.angle, a!.angle)).toBeCloseTo(BELLOWS.angleStep, 9);
    });
    const speeds = batches.map((b) => b.shots[0]!.spec.speed);
    expect(Math.max(...speeds) - Math.min(...speeds)).toBeGreaterThan(BELLOWS.pulseAmplitude * 1.5);
    expect(s.boss.scheduled).toHaveLength(0);
  });

  it('la prima raffica e mirata al giocatore', () => {
    const s = scene({ target: new Vec2(1100, 1500) });
    const from = s.boss.position;
    BELLOWS_SPIRAL.execute(s.boss, s.ctx);
    const first = recordBatches(s, 0.5)[0]!;
    expect(angleDifference(from.angleTo(new Vec2(1100, 1500)), first.shots[0]!.angle)).toBeCloseTo(0, 9);
  });

  it('in furia: tre bracci, trenta raffiche e il senso di rotazione si inverte a meta', () => {
    const s = scene({ enraged: true });
    BELLOWS_SPIRAL.execute(s.boss, s.ctx);
    const batches = recordBatches(s, 5);
    expect(batches).toHaveLength(30);
    for (const batch of batches) expect(batch.shots).toHaveLength(3);
    const turn = (i: number) => angleDifference(batches[i - 1]!.shots[0]!.angle, batches[i]!.shots[0]!.angle);
    for (let i = 1; i <= 15; i++) expect(turn(i), `raffica ${i}`).toBeCloseTo(BELLOWS.angleStep, 9);
    for (let i = 16; i < 30; i++) expect(turn(i), `raffica ${i}`).toBeCloseTo(-BELLOWS.angleStep, 9);
    expect(near(batches[29]!.time, 29 * 0.1, 0.05)).toBe(true);
  });
});

describe('forge: iron_charge', () => {
  it('prepara a lungo e senza muoversi, poi scatta fino al giocatore e libera un\'onda d\'urto di 10 schegge', () => {
    const target = new Vec2(1100, 1100);
    const s = scene({ target, bossAt: arena.bossSpawn });
    const start = s.boss.position;
    IRON_CHARGE.execute(s.boss, s.ctx);
    expect(s.boss.charge).not.toBeNull();
    expect(s.boss.charge).toMatchObject({ windup: 1.5 });
    expect(s.boss.charge!.target.equals(target)).toBe(true);
    // Distanza 1300: la durata e al massimo consentito.
    expect(s.boss.charge!.duration).toBeCloseTo(IRON_CHARGE_DATA.maxDuration, 9);
    advance(s, 1.4);
    expect(s.boss.position.equals(start)).toBe(true);
    expect(s.harness.hurts).toHaveLength(0);
    advance(s, 0.2);
    expect(s.boss.position.x).toBeLessThan(start.x);
    advance(s, 1);
    expect(s.boss.charge).toBeNull();
    expect(s.harness.hurts).toHaveLength(0); // Il pilastro centrale arresta la carica.
    expect(s.harness.hurts.every((amount) => amount === FORGE_COLOSSUS_STATS.chargeDamage)).toBe(true);
    const shock = s.harness.projectiles;
    expect(shock).toHaveLength(10);
    for (const shot of shock) {
      expect(shot.position.distanceTo(target)).toBeGreaterThan(100); // Onda dal punto di collisione.
      expect(shot.spec).toMatchObject({ speed: 210, damage: 15, visual: 'forge_shock' });
    }
    expect(s.boss.scheduled).toHaveLength(0);
  });

  it('lo scatto dura meno su distanze brevi (minimo 0,3 s) e in furia la preparazione e piu corta', () => {
    const short = scene({ target: new Vec2(2000, 1100), bossAt: arena.bossSpawn });
    IRON_CHARGE.execute(short.boss, short.ctx);
    expect(short.boss.charge!.duration).toBeCloseTo(IRON_CHARGE_DATA.minDuration, 9);
    const rage = scene({ target: new Vec2(1100, 1100), bossAt: arena.bossSpawn, enraged: true });
    IRON_CHARGE.execute(rage.boss, rage.ctx);
    expect(rage.boss.charge!.windup).toBe(1.25);
    advance(rage, 4);
    expect(rage.harness.projectiles).toHaveLength(14);
  });
});

describe('forge: tutti gli schemi', () => {
  it('non lasciano nulla di pendente e ogni zona avvisa per almeno un secondo', () => {
    for (const pattern of FORGE_COLOSSUS.patterns) {
      for (const enraged of [false, true]) {
        const s = scene({ enraged, bossAt: arena.bossSpawn });
        pattern.execute(s.boss, s.ctx);
        advance(s, 8);
        expect(s.boss.scheduled, pattern.id).toHaveLength(0);
        expect(s.boss.charge, pattern.id).toBeNull();
        for (const zone of s.harness.zones) expect(zone.spec.delay, pattern.id).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('i proiettili e le zone hanno un aspetto esclusivo della fucina, definito nei looks', () => {
    const visuals = new Set<string>();
    const zoneVisuals = new Set<string>();
    for (const pattern of FORGE_COLOSSUS.patterns) {
      for (const enraged of [false, true]) {
        const s = scene({ enraged, bossAt: arena.bossSpawn });
        pattern.execute(s.boss, s.ctx);
        advance(s, 8);
        for (const shot of s.harness.projectiles) visuals.add(shot.spec.visual);
        for (const zone of s.harness.zones) zoneVisuals.add(zone.spec.visual ?? 'enemy');
      }
    }
    expect([...visuals].sort()).toEqual(['forge_bellows', 'forge_ember', 'forge_shock', 'forge_shrapnel']);
    expect([...zoneVisuals].sort()).toEqual(['forge_cross', 'forge_lava', 'forge_slam']);
    for (const id of visuals) expect(PROJECTILE_LOOKS[id], id).toBe(FORGE_LOOKS.projectiles[id]);
    for (const id of zoneVisuals) expect(ZONE_LOOKS[id], id).toBe(FORGE_LOOKS.zones[id]);
    for (const id of [...Object.keys(FORGE_LOOKS.projectiles), ...Object.keys(FORGE_LOOKS.zones)]) expect(id.startsWith('forge_')).toBe(true);
  });
});

describe('forge: partita intera', () => {
  const play = (seed: number) => {
    const match = createMatch(seed, { dungeon: FORGE });
    const events = recordEvents(match);
    run(match, 30, (m) => {
      m.player.health.current = 100;
      const t = m.time;
      return intent(m, { move: new Vec2(Math.cos(t * 0.7), Math.sin(t * 1.1)), aim: m.boss!.position, skills: [true, false, false, false] });
    });
    return { match, events };
  };

  it('gli attacchi partono nell\'ordine dei sei schemi e la partita e riproducibile con il seme', () => {
    const a = play(4);
    const b = play(4);
    const ids = eventsOfType(a.events, 'boss_attack').map((e) => e.patternId);
    expect(ids.slice(0, 6)).toEqual(FORGE_COLOSSUS.patterns.map((p) => p.id));
    expect(eventsOfType(b.events, 'boss_attack').map((e) => e.patternId)).toEqual(ids);
    expect(b.match.boss!.position.equals(a.match.boss!.position)).toBe(true);
    expect(b.match.player.position.equals(a.match.player.position)).toBe(true);
    expect(b.match.projectiles.length).toBe(a.match.projectiles.length);
    expect(b.match.zones.length).toBe(a.match.zones.length);
    expect(a.match.status).toBe('playing');
  });
});

describe('forge: grafica', () => {
  it('il boss ha una grafica propria, piu grande e con silhouette diversa da quella del guardiano', () => {
    expect(BOSS_ART[FORGE_COLOSSUS.art]).toBe(FORGE_COLOSSUS_ART);
    const guardian = BOSS_ART.guardian!;
    expect(FORGE_COLOSSUS_ART.walk[0]!.length).toBe(20);
    expect(FORGE_COLOSSUS_ART.walk[0]![0]!.length).toBe(22);
    expect(FORGE_COLOSSUS_ART.walk[0]).not.toEqual(guardian.walk[0]);
    expect(FORGE_COLOSSUS_ART.walk[0]![0]!.length).toBeGreaterThan(guardian.walk[0]![0]!.length);
    expect(FORGE_COLOSSUS_ART.walk[1]).not.toEqual(FORGE_COLOSSUS_ART.walk[3]);
    expect(FORGE_COLOSSUS_ART.walk[0]).toBe(FORGE_COLOSSUS_ART.walk[2]);
    expect(FORGE_COLOSSUS_ART.casting).not.toEqual(FORGE_COLOSSUS_ART.walk[0]);
  });

  it('la tavolozza cambia con il rallentamento (ferro freddo, lava spenta) e con la furia (lava piu calda)', () => {
    const normal = FORGE_COLOSSUS_ART.palette(false, false);
    const slowed = FORGE_COLOSSUS_ART.palette(true, false);
    const enraged = FORGE_COLOSSUS_ART.palette(false, true);
    expect(slowed.b).not.toBe(normal.b);
    expect(slowed.e).not.toBe(normal.e);
    expect(enraged.e).not.toBe(normal.e);
    expect(enraged.b).toBe(normal.b);
  });

  it('ogni simbolo usato dalla grafica e nella tavolozza (compreso il boss rallentato e in furia)', () => {
    const symbols = new Set([...FORGE_COLOSSUS_ART.walk, FORGE_COLOSSUS_ART.casting].flatMap((frame) => frame.flatMap((row) => [...row])));
    for (const [slowed, enraged] of [[false, false], [true, false], [false, true], [true, true]] as const) {
      const palette = FORGE_COLOSSUS_ART.palette(slowed, enraged);
      for (const symbol of symbols) if (symbol !== '.') expect(palette[symbol], symbol).toBeDefined();
    }
  });
});

describe('forge: tema della mappa', () => {
  /** Un contesto 2D finto che registra solo cio che viene disegnato (nessun DOM). */
  function recorder() {
    const store: Record<string, unknown> = {};
    const calls: string[] = [];
    const ctx = new Proxy(store, {
      get: (target, prop: string) => (prop in target ? target[prop] : (..._args: unknown[]) => void calls.push(prop)),
      set: (target, prop: string, value: unknown) => {
        target[prop] = value;
        if (prop === 'fillStyle' || prop === 'strokeStyle') calls.push(`${prop}:${String(value)}`);
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    return { ctx, calls };
  }
  const cameraAt = (center: Vec2, width = 960, height = 540): Camera => {
    const camera = new Camera();
    camera.setViewSize(width, height);
    camera.follow(center);
    return camera;
  };
  const rects = (calls: string[]) => calls.filter((c) => c === 'fillRect').length;

  it('disegna solo la parte visibile: una vista piccola costa una frazione di quella dell\'intera mappa', () => {
    const small = recorder();
    forgeTheme.drawFloor(small.ctx, arena, cameraAt(new Vec2(1800, 1100)), 0);
    const whole = recorder();
    forgeTheme.drawFloor(whole.ctx, arena, cameraAt(new Vec2(1800, 1100), arena.width, arena.height), 0);
    expect(rects(small.calls)).toBeGreaterThan(100);
    expect(rects(small.calls)).toBeLessThan(rects(whole.calls) * 0.2);
  });

  it('le crepe, i bracieri e le scintille si animano con il tempo', () => {
    const at = (clock: number): string => {
      const r = recorder();
      forgeTheme.drawFloor(r.ctx, arena, cameraAt(new Vec2(1800, 1100)), clock);
      return r.calls.join('|');
    };
    expect(at(0)).not.toBe(at(0.7));
    expect(at(1.3)).toBe(at(1.3));
  });

  it('un pilastro fuori vista non disegna nulla, uno in vista si', () => {
    const pillar = arena.pillars[0]!;
    const far = recorder();
    forgeTheme.drawPillar(far.ctx, pillar, cameraAt(new Vec2(3000, 1800)), 0);
    expect(far.calls).toHaveLength(0);
    const visible = recorder();
    forgeTheme.drawPillar(visible.ctx, pillar, cameraAt(pillar.position), 0);
    expect(visible.calls.length).toBeGreaterThan(5);
  });
});
