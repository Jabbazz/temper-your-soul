import { describe, expect, it } from 'vitest';
import { Camera } from '../../../core/camera';
import { SeededRng, type Rng } from '../../../core/rng';
import { angleDifference, TAU, Vec2 } from '../../../core/vec2';
import { pillarAt } from '../../arena/arena';
import { Boss } from '../../boss/boss';
import type { BossContext } from '../../boss/boss-context';
import type { DangerZoneSpec } from '../../combat/danger-zone';
import type { GameEvent } from '../../combat/events';
import { BODY_RADIUS } from '../../combat/collision';
import type { ProjectileSpec } from '../../combat/projectile';
import { glacierTheme } from '../../presentation/themes/glacier';
import { cryptTheme } from '../../presentation/themes/crypt';
import { PROJECTILE_LOOKS, ZONE_LOOKS } from '../../presentation/visuals';
import { createMatch, eventsOfType, recordEvents, run, STEP } from '../../../testing';
import { FROST_WARDEN } from './frost-warden';
import { BLINK, BLIZZARD_DATA, GLACIAL, NOVA, SHARDS, SPIKES, spikeWavePoints, trailPoints } from './frost-patterns';
import { GLACIER, GLACIER_ARENA } from './glacier';

/*
 * Prove del dungeon del ghiacciaio: la mappa e le meccaniche specifiche dei sei schemi del Custode. I controlli
 * generici (valori sensati, avvisi delle zone, simulazione lunga) stanno in dungeons.test.ts.
 */

interface Timed<T> {
  /** Secondi dall'inizio dello schema (inizio del passo in cui e' successo). */
  t: number;
  value: T;
}

interface Simulation {
  boss: Boss;
  /** Posizione del boss subito dopo il primo passo (quello in cui parte lo schema). */
  origin: Vec2;
  projectiles: Array<Timed<{ spec: ProjectileSpec; position: Vec2; angle: number }>>;
  zones: Array<Timed<{ spec: DangerZoneSpec; position: Vec2 }>>;
  events: Array<Timed<GameEvent>>;
  /** Posizione del boss all'inizio di ogni passo. */
  path: Vec2[];
}

interface SimulationOptions {
  enraged?: boolean;
  target?: Vec2;
  seconds?: number;
  rng?: Rng;
  /** Permette di spostare il bersaglio durante lo schema (per provare la mira al momento dello sparo). */
  retarget?: (time: number) => Vec2;
}

const indexOf = (id: string): number => FROST_WARDEN.patterns.findIndex((pattern) => pattern.id === id);

/** Fa partire lo schema `id` al primo passo e lo osserva per `seconds` secondi (senza altri attacchi). */
function simulate(id: string, options: SimulationOptions = {}): Simulation {
  const { enraged = false, seconds = 4, rng = new SeededRng(1) } = options;
  const boss = new Boss(FROST_WARDEN, GLACIER_ARENA);
  boss.phase = enraged ? 2 : 1;
  boss.attackCount = indexOf(id);
  boss.attackTimer = 0;
  let time = 0;
  let target = options.target ?? new Vec2(1500, 1700);
  const result: Simulation = { boss, origin: boss.position, projectiles: [], zones: [], events: [], path: [] };
  const ctx: BossContext = {
    get target() {
      return target;
    },
    get time() {
      return time;
    },
    rng,
    spawnProjectile: (spec, position, angle) => result.projectiles.push({ t: time, value: { spec, position, angle } }),
    spawnZone: (spec, position) => result.zones.push({ t: time, value: { spec, position } }),
    hurtPlayer: () => undefined,
    emit: (event) => result.events.push({ t: time, value: event }),
  };
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    time = i * STEP;
    if (options.retarget) target = options.retarget(time);
    result.path.push(boss.position);
    boss.step(STEP, ctx);
    if (i === 0) result.origin = boss.position;
    // Dopo il primo passo si impedisce un secondo attacco: si osserva solo lo schema scelto.
    boss.attackTimer = Number.POSITIVE_INFINITY;
  }
  return result;
}

const TWO_STEPS = 2 * STEP;

describe('ghiacciaio: la mappa', () => {
  it('e quadrata 3000x3000, ha sette colonne e le partenze ai due capi, a nord il boss e a sud il giocatore', () => {
    expect(GLACIER_ARENA.id).toBe('glacier');
    expect(GLACIER_ARENA.theme).toBe('glacier');
    expect(GLACIER_ARENA.width).toBe(3000);
    expect(GLACIER_ARENA.height).toBe(3000);
    expect(GLACIER_ARENA.pillars).toHaveLength(7);
    expect(GLACIER_ARENA.bossSpawn.y).toBeLessThan(GLACIER_ARENA.height / 4);
    expect(GLACIER_ARENA.playerSpawn.y).toBeGreaterThan((GLACIER_ARENA.height * 3) / 4);
    expect(GLACIER.arena).toBe(GLACIER_ARENA);
    expect(GLACIER.boss).toBe(FROST_WARDEN);
    expect(GLACIER.danger).toBe(4);
  });

  it('la colonna centrale taglia la linea di tiro tra le due partenze: i proiettili del boss vi si fermano', () => {
    const { bossSpawn, playerSpawn, pillars } = GLACIER_ARENA;
    const line = playerSpawn.sub(bossSpawn);
    const blocking = pillars.filter((pillar) => {
      const offset = pillar.position.sub(bossSpawn);
      const t = Math.max(0, Math.min(1, (offset.x * line.x + offset.y * line.y) / line.lengthSquared()));
      return bossSpawn.add(line.mul(t)).distanceTo(pillar.position) < pillar.radius;
    });
    expect(blocking.length).toBeGreaterThanOrEqual(1);

    // Prova in partita: le schegge (schema d'apertura) mirate al giocatore fermo finiscono contro la colonna.
    const match = createMatch(1, { dungeon: GLACIER });
    const events = recordEvents(match);
    match.boss!.attackTimer = 0;
    run(match, 4);
    const absorbed = eventsOfType(events, 'projectile_hit').filter((hit) => hit.visual === 'glacier_shard');
    expect(absorbed.length).toBeGreaterThanOrEqual(3);
    for (const hit of absorbed) {
      expect(pillarAt(GLACIER_ARENA, hit.position, 8), 'la scheggia si ferma sul bordo di una colonna').toBeDefined();
    }
    expect(match.player.health.current).toBe(match.player.health.max);
  });

  it('dal punto di partenza del giocatore si raggiungono tutti gli angoli e il boss, passando tra le colonne', () => {
    const cell = 25;
    const cols = Math.ceil(GLACIER_ARENA.width / cell);
    const rows = Math.ceil(GLACIER_ARENA.height / cell);
    const margin = GLACIER_ARENA.playerMargin;
    const free = (x: number, y: number): boolean => {
      const p = new Vec2(x * cell, y * cell);
      return (
        p.x >= margin && p.x <= GLACIER_ARENA.width - margin && p.y >= margin && p.y <= GLACIER_ARENA.height - margin &&
        pillarAt(GLACIER_ARENA, p, BODY_RADIUS.player) === undefined
      );
    };
    const start: [number, number] = [Math.round(GLACIER_ARENA.playerSpawn.x / cell), Math.round(GLACIER_ARENA.playerSpawn.y / cell)];
    const seen = new Set<number>([start[1] * cols + start[0]]);
    const queue: Array<[number, number]> = [start];
    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || !free(nx, ny) || seen.has(ny * cols + nx)) continue;
        seen.add(ny * cols + nx);
        queue.push([nx, ny]);
      }
    }
    const reached = (point: Vec2): boolean => seen.has(Math.round(point.y / cell) * cols + Math.round(point.x / cell));
    for (const corner of [new Vec2(margin, margin), new Vec2(3000 - margin, margin), new Vec2(margin, 3000 - margin), new Vec2(3000 - margin, 3000 - margin)]) {
      // Il margine e' un multiplo di 5 ma non di 25: si guarda la cella piu' vicina.
      expect(reached(corner) || reached(corner.add(new Vec2(cell, cell).mul(corner.x < 1500 ? 1 : -1))), `angolo ${corner.x},${corner.y}`).toBe(true);
    }
    expect(reached(GLACIER_ARENA.bossSpawn)).toBe(true);
    expect(reached(new Vec2(1500, 1300)), 'il corridoio sopra la colonna centrale').toBe(true);
  });
});

describe('ghiacciaio: il Custode', () => {
  it('ha sei schemi con id stabili nell\'ordine di rotazione e valori da boss agile e piu\' robusto', () => {
    expect(FROST_WARDEN.id).toBe('frost_warden');
    expect(FROST_WARDEN.name).toBe('CUSTODE DEL GHIACCIO');
    expect(FROST_WARDEN.art).toBe('frost_warden');
    expect(FROST_WARDEN.patterns.map((pattern) => pattern.id)).toEqual([
      'shard_volley', 'ice_spikes', 'blink_strike', 'blizzard', 'frost_nova', 'glacial_charge',
    ]);
    expect(FROST_WARDEN.stats.maxHealth).toBe(10800);
    // Agile: piu' veloce del guardiano (100) e quasi quanto il giocatore, attacchi piu' ravvicinati.
    expect(FROST_WARDEN.stats.speed).toBeGreaterThan(100);
    expect(FROST_WARDEN.stats.attackInterval.normal).toBeLessThan(2.15);
  });

  it('ogni proiettile e ogni zona del Custode ha un aspetto proprio, tutti con il prefisso glacier_', () => {
    const visuals = new Set<string>();
    const zoneVisuals = new Set<string>();
    for (const pattern of FROST_WARDEN.patterns) {
      for (const enraged of [false, true]) {
        const sim = simulate(pattern.id, { enraged, seconds: 4 });
        for (const shot of sim.projectiles) visuals.add(shot.value.spec.visual);
        for (const zone of sim.zones) zoneVisuals.add(zone.value.spec.visual ?? 'enemy');
      }
    }
    expect([...visuals].sort()).toEqual([
      'glacier_blink_shot', 'glacier_flurry_ccw', 'glacier_flurry_cw', 'glacier_nova', 'glacier_nova_late', 'glacier_shard',
    ]);
    expect([...zoneVisuals].sort()).toEqual(['glacier_blink', 'glacier_spike', 'glacier_trail']);
    for (const visual of visuals) expect(PROJECTILE_LOOKS[visual], visual).toBeDefined();
    for (const visual of zoneVisuals) expect(ZONE_LOOKS[visual], visual).toBeDefined();
  });
});

describe('ghiacciaio: lance di ghiaccio (ice_spikes)', () => {
  it('cinque ondate da tre zone, ogni 0,2 s e sempre piu\' lontane, con avviso', () => {
    const sim = simulate('ice_spikes', { target: new Vec2(1500, 2400) });
    expect(sim.zones).toHaveLength(15);
    expect(sim.projectiles).toHaveLength(0);
    for (let wave = 0; wave < 5; wave++) {
      const inWave = sim.zones.slice(wave * 3, wave * 3 + 3);
      for (const zone of inWave) {
        expect(zone.t).toBeGreaterThanOrEqual(wave * SPIKES.waveInterval - TWO_STEPS);
        expect(zone.t).toBeLessThanOrEqual(wave * SPIKES.waveInterval + TWO_STEPS);
        expect(zone.value.position.distanceTo(sim.origin)).toBeCloseTo(SPIKES.firstDistance + wave * SPIKES.distanceStep, 3);
        expect(zone.value.spec.delay).toBeGreaterThanOrEqual(0.5);
        expect(zone.value.spec.visual).toBe('glacier_spike');
      }
    }
    expect(sim.boss.scheduled).toHaveLength(0);
  });

  it('e un cono: si allarga con la distanza ed e centrato sul giocatore, che e a sud', () => {
    const sim = simulate('ice_spikes', { target: new Vec2(1500, 2400) });
    const width = (wave: number) => {
      const xs = sim.zones.slice(wave * 3, wave * 3 + 3).map((zone) => zone.value.position.x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(width(4)).toBeGreaterThan(width(0) * 3);
    for (let wave = 0; wave < 5; wave++) {
      const centre = sim.zones.slice(wave * 3 + 1, wave * 3 + 2)[0]!.value.position;
      expect(centre.x).toBeCloseTo(sim.origin.x, 3);
      expect(centre.y).toBeGreaterThan(sim.origin.y);
    }
  });

  it('il cono resta dove il giocatore era all\'inizio, anche se poi si sposta', () => {
    const sim = simulate('ice_spikes', { target: new Vec2(1500, 2400), retarget: (t) => (t === 0 ? new Vec2(1500, 2400) : new Vec2(2800, 300)) });
    for (const zone of sim.zones) expect(zone.value.position.x).toBeGreaterThan(1300);
    expect(sim.zones.at(-1)!.value.position.y).toBeGreaterThan(sim.origin.y + 400);
  });

  it('in furia sono sette ondate da cinque zone', () => {
    const sim = simulate('ice_spikes', { enraged: true, target: new Vec2(1500, 2400) });
    expect(sim.zones).toHaveLength(35);
  });

  it('i punti di un\'ondata sono simmetrici rispetto all\'asse del cono', () => {
    const points = spikeWavePoints(Vec2.ZERO, 0, 1, 5);
    expect(points).toHaveLength(5);
    expect(points[2]!.y).toBeCloseTo(0, 6);
    expect(points[0]!.y).toBeCloseTo(-points[4]!.y, 6);
    expect(points[1]!.y).toBeCloseTo(-points[3]!.y, 6);
  });
});

describe('ghiacciaio: bufera (blizzard)', () => {
  it('due spirali in versi opposti: 18 raffiche da 2+2 proiettili, una ogni 0,1 s', () => {
    const sim = simulate('blizzard', { target: new Vec2(1500, 1700) });
    expect(sim.projectiles).toHaveLength(18 * 4);
    const cw = sim.projectiles.filter((shot) => shot.value.spec.visual === 'glacier_flurry_cw');
    const ccw = sim.projectiles.filter((shot) => shot.value.spec.visual === 'glacier_flurry_ccw');
    expect(cw).toHaveLength(36);
    expect(ccw).toHaveLength(36);
    // Raffica i: tempo i * 0,1 s.
    for (let i = 0; i < 18; i++) {
      expect(cw[i * 2]!.t).toBeGreaterThanOrEqual(i * BLIZZARD_DATA.volleyInterval - TWO_STEPS);
      expect(cw[i * 2]!.t).toBeLessThanOrEqual(i * BLIZZARD_DATA.volleyInterval + TWO_STEPS);
    }
    // Il primo braccio di ogni raffica: l'angolo della spirale oraria cresce, quello antioraria cala, di 0,24 per raffica.
    for (let i = 1; i < 18; i++) {
      expect(angleDifference(cw[(i - 1) * 2]!.value.angle, cw[i * 2]!.value.angle)).toBeCloseTo(BLIZZARD_DATA.angleStep, 6);
      expect(angleDifference(ccw[(i - 1) * 2]!.value.angle, ccw[i * 2]!.value.angle)).toBeCloseTo(-BLIZZARD_DATA.angleStep, 6);
    }
    // I bracci di una spirale sono equidistanti (due bracci: opposti).
    expect(Math.abs(angleDifference(cw[0]!.value.angle, cw[1]!.value.angle))).toBeCloseTo(Math.PI, 6);
  });

  it('in furia tre bracci per spirale, 24 raffiche e proiettili piu\' veloci', () => {
    const sim = simulate('blizzard', { enraged: true });
    expect(sim.projectiles).toHaveLength(24 * 3 * 2);
    expect(sim.projectiles[0]!.value.spec.speed).toBe(BLIZZARD_DATA.speed.rage);
    expect(simulate('blizzard').projectiles[0]!.value.spec.speed).toBe(BLIZZARD_DATA.speed.normal);
    expect(sim.boss.scheduled).toHaveLength(0);
  });
});

describe('ghiacciaio: nova gelida (frost_nova)', () => {
  /** Gli angoli dei proiettili sparati attorno a un istante. */
  const ring = (sim: Simulation, seconds: number): number[] =>
    sim.projectiles.filter((shot) => Math.abs(shot.t - seconds) <= TWO_STEPS).map((shot) => shot.value.angle);

  it('un anello da 20 subito e un secondo da 20 dopo 0,6 s, di colore diverso', () => {
    const sim = simulate('frost_nova');
    expect(sim.projectiles).toHaveLength(40);
    expect(ring(sim, 0)).toHaveLength(20);
    expect(ring(sim, NOVA.ringInterval)).toHaveLength(20);
    expect(sim.projectiles.filter((shot) => shot.t < 0.3).every((shot) => shot.value.spec.visual === 'glacier_nova')).toBe(true);
    expect(sim.projectiles.filter((shot) => shot.t > 0.3).every((shot) => shot.value.spec.visual === 'glacier_nova_late')).toBe(true);
    expect(sim.boss.scheduled).toHaveLength(0);
  });

  it('il secondo anello e sfasato di mezzo passo: i suoi proiettili stanno nei varchi del primo', () => {
    const sim = simulate('frost_nova');
    const first = ring(sim, 0);
    const second = ring(sim, NOVA.ringInterval);
    const step = TAU / 20;
    for (const angle of second) {
      const nearest = Math.min(...first.map((other) => Math.abs(angleDifference(other, angle))));
      expect(nearest).toBeCloseTo(step / 2, 6);
    }
    // All'interno di un anello i proiettili sono equidistanti.
    expect(angleDifference(first[0]!, first[1]!)).toBeCloseTo(step, 6);
  });

  it('in furia tre anelli da 26: il terzo torna in fase con il primo', () => {
    const sim = simulate('frost_nova', { enraged: true, seconds: 3 });
    expect(sim.projectiles).toHaveLength(78);
    const first = ring(sim, 0);
    const second = ring(sim, NOVA.ringInterval);
    const third = ring(sim, 2 * NOVA.ringInterval);
    expect(third).toHaveLength(26);
    expect(Math.abs(angleDifference(first[0]!, third[0]!))).toBeCloseTo(0, 6);
    expect(Math.abs(angleDifference(first[0]!, second[0]!))).toBeCloseTo(TAU / 26 / 2, 6);
  });

  it('l\'angolo di partenza dipende dal seme: uguale con lo stesso seme, diverso con un altro', () => {
    const a = simulate('frost_nova', { rng: new SeededRng(7) }).projectiles.map((shot) => shot.value.angle);
    const b = simulate('frost_nova', { rng: new SeededRng(7) }).projectiles.map((shot) => shot.value.angle);
    const c = simulate('frost_nova', { rng: new SeededRng(8) }).projectiles.map((shot) => shot.value.angle);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe('ghiacciaio: salto gelido (blink_strike)', () => {
  const target = new Vec2(1500, 1700);

  it('segnala subito il punto d\'arrivo a 150-230 dal giocatore, poi il boss ci si teletrasporta e spara un ventaglio da sette', () => {
    const sim = simulate('blink_strike', { target });
    expect(sim.zones).toHaveLength(1);
    const zone = sim.zones[0]!;
    expect(zone.t).toBe(0);
    expect(zone.value.spec.delay).toBeGreaterThanOrEqual(0.5);
    expect(zone.value.spec.visual).toBe('glacier_blink');
    const distance = zone.value.position.distanceTo(target);
    expect(distance).toBeGreaterThanOrEqual(BLINK.distance.min - 0.001);
    expect(distance).toBeLessThanOrEqual(BLINK.distance.max + 0.001);

    const teleports = sim.events.filter((entry) => entry.value.type === 'boss_teleported');
    expect(teleports).toHaveLength(1);
    const teleport = teleports[0]!;
    expect(Math.abs(teleport.t - BLINK.zone.delay)).toBeLessThanOrEqual(TWO_STEPS);
    const event = teleport.value;
    if (event.type !== 'boss_teleported') throw new Error('evento inatteso');
    expect(event.to).toEqual(zone.value.position);
    // Parte da dove il boss si trovava un attimo prima.
    const step = Math.round(teleport.t / STEP);
    expect(event.from.distanceTo(sim.path[step]!)).toBeLessThan(5);
    // Dal passo dopo il teletrasporto il boss e nel punto d'arrivo.
    expect(sim.path[step + 1]!.x).toBeCloseTo(event.to.x, 6);
    expect(sim.path[step + 1]!.y).toBeCloseTo(event.to.y, 6);

    // Il ventaglio parte dal punto d'arrivo, al momento dell'arrivo, verso il giocatore.
    expect(sim.projectiles).toHaveLength(7);
    const aim = event.to.angleTo(target);
    sim.projectiles.forEach((shot, index) => {
      expect(shot.t).toBeCloseTo(teleport.t, 6);
      expect(shot.value.position).toEqual(event.to);
      expect(angleDifference(aim, shot.value.angle)).toBeCloseTo((index - 3) * BLINK.fan.spread, 6);
    });
    expect(sim.boss.scheduled).toHaveLength(0);
  });

  it('in furia due salti a un secondo di distanza, ognuno con il proprio segnale e ventaglio da nove', () => {
    const sim = simulate('blink_strike', { enraged: true, target, seconds: 4 });
    expect(sim.zones).toHaveLength(2);
    expect(sim.zones[1]!.t).toBeGreaterThanOrEqual(BLINK.blinkInterval - TWO_STEPS);
    expect(sim.zones[1]!.t).toBeLessThanOrEqual(BLINK.blinkInterval + TWO_STEPS);
    const teleports = sim.events.filter((entry) => entry.value.type === 'boss_teleported');
    expect(teleports).toHaveLength(2);
    expect(teleports[1]!.t - teleports[0]!.t).toBeCloseTo(BLINK.blinkInterval, 1);
    expect(sim.projectiles).toHaveLength(18);
    expect(sim.boss.scheduled).toHaveLength(0);
  });

  it('non atterra mai addosso al giocatore, nemmeno quando e contro il muro, e resta nell\'arena', () => {
    const arena = GLACIER_ARENA;
    const corners = [new Vec2(40, 40), new Vec2(2960, 40), new Vec2(40, 2960), new Vec2(2960, 2960), new Vec2(1500, 40)];
    for (const corner of corners) {
      for (let seed = 1; seed <= 60; seed++) {
        const sim = simulate('blink_strike', { target: corner, rng: new SeededRng(seed), seconds: 1.2 });
        const landing = sim.zones[0]!.value.position;
        expect(landing.distanceTo(corner), `angolo ${corner.x},${corner.y} seme ${seed}`).toBeGreaterThan(BLINK.distance.min * 0.6 - 0.001);
        expect(landing.x).toBeGreaterThanOrEqual(arena.bossMargin);
        expect(landing.x).toBeLessThanOrEqual(arena.width - arena.bossMargin);
        expect(landing.y).toBeGreaterThanOrEqual(arena.bossMargin);
        expect(landing.y).toBeLessThanOrEqual(arena.height - arena.bossMargin);
      }
    }
  });

  it('il punto d\'arrivo e riproducibile con il seme e cambia con un altro seme', () => {
    const at = (seed: number) => simulate('blink_strike', { target, rng: new SeededRng(seed), seconds: 1.2 }).zones[0]!.value.position;
    expect(at(3)).toEqual(at(3));
    expect(at(3)).not.toEqual(at(4));
  });

  it('in partita il boss emette boss_teleported e atterra entro 0,9 s dall\'inizio dello schema', () => {
    const match = createMatch(1, { dungeon: GLACIER });
    const events = recordEvents(match);
    match.boss!.attackCount = indexOf('blink_strike');
    match.boss!.attackTimer = 0;
    run(match, 1.2);
    const teleports = eventsOfType(events, 'boss_teleported');
    expect(teleports).toHaveLength(1);
    const distance = teleports[0]!.to.distanceTo(match.player.position);
    expect(distance).toBeGreaterThanOrEqual(BLINK.distance.min - 0.001);
    expect(distance).toBeLessThanOrEqual(BLINK.distance.max + 0.001);
    expect(eventsOfType(events, 'zone_detonated').some((zone) => zone.visual === 'glacier_blink')).toBe(true);
  });
});

describe('ghiacciaio: schegge (shard_volley)', () => {
  it('due ventagli stretti da cinque a 0,35 s e 0,65 s, molto veloci', () => {
    const sim = simulate('shard_volley');
    expect(sim.projectiles).toHaveLength(10);
    expect(sim.projectiles.slice(0, 5).every((shot) => Math.abs(shot.t - SHARDS.firstDelay) <= TWO_STEPS)).toBe(true);
    expect(sim.projectiles.slice(5).every((shot) => Math.abs(shot.t - (SHARDS.firstDelay + SHARDS.volleyInterval)) <= TWO_STEPS)).toBe(true);
    for (const shot of sim.projectiles) {
      expect(shot.value.spec.speed).toBe(SHARDS.speed.normal);
      expect(shot.value.spec.visual).toBe('glacier_shard');
    }
    const fan = sim.projectiles.slice(0, 5).map((shot) => shot.value.angle);
    expect(fan[4]! - fan[0]!).toBeCloseTo(4 * SHARDS.spread, 6);
    expect(sim.boss.scheduled).toHaveLength(0);
  });

  it('ogni ventaglio e mirato dove il giocatore si trova al momento dello sparo', () => {
    // A 0,5 s il giocatore passa da sud a est: il primo ventaglio (0,35 s) punta a sud, il secondo (0,65 s) a est.
    const sim = simulate('shard_volley', {
      target: new Vec2(1500, 2400),
      retarget: (t) => (t < 0.5 ? new Vec2(1500, 2400) : new Vec2(2600, 700)),
    });
    const aimAt = (shot: Simulation['projectiles'][number], point: Vec2) => shot.value.position.angleTo(point);
    const firstCentre = sim.projectiles[2]!;
    const secondCentre = sim.projectiles[7]!;
    expect(angleDifference(firstCentre.value.angle, aimAt(firstCentre, new Vec2(1500, 2400)))).toBeCloseTo(0, 2);
    expect(Math.abs(angleDifference(secondCentre.value.angle, aimAt(secondCentre, new Vec2(1500, 2400))))).toBeGreaterThan(0.5);
    expect(angleDifference(secondCentre.value.angle, aimAt(secondCentre, new Vec2(2600, 700)))).toBeCloseTo(0, 1);
  });

  it('in furia tre ventagli e schegge piu\' veloci', () => {
    const sim = simulate('shard_volley', { enraged: true });
    expect(sim.projectiles).toHaveLength(15);
    expect(sim.projectiles[0]!.value.spec.speed).toBe(SHARDS.speed.rage);
  });
});

describe('ghiacciaio: carica glaciale (glacial_charge)', () => {
  it('avvia la carica con la preparazione di 0,8 s e segna il percorso con sei zone equidistanti', () => {
    const target = new Vec2(1500, 1200);
    const sim = simulate('glacial_charge', { target, seconds: 0.01 });
    expect(sim.zones).toHaveLength(6);
    expect(sim.events.some((entry) => entry.value.type === 'boss_pose')).toBe(true);
    const charge = sim.boss.charge;
    expect(charge).not.toBeNull();
    expect(charge!.windup).toBe(GLACIAL.windup);
    expect(charge!.duration).toBe(GLACIAL.duration);
    const expected = trailPoints(charge!.start, charge!.target, 6);
    sim.zones.forEach((zone, index) => {
      expect(zone.t).toBe(0);
      expect(zone.value.position.x).toBeCloseTo(expected[index]!.x, 6);
      expect(zone.value.position.y).toBeCloseTo(expected[index]!.y, 6);
      expect(zone.value.spec.visual).toBe('glacier_trail');
      expect(zone.value.spec.delay).toBeGreaterThanOrEqual(0.5);
    });
    // L'ultima zona e sul bersaglio della carica; le distanze tra zone vicine sono uguali.
    expect(sim.zones[5]!.value.position.distanceTo(charge!.target)).toBeLessThan(0.001);
    const gap = sim.zones[1]!.value.position.distanceTo(sim.zones[0]!.value.position);
    expect(sim.zones[3]!.value.position.distanceTo(sim.zones[2]!.value.position)).toBeCloseTo(gap, 6);
  });

  it('ogni zona scoppia dopo che il boss e passato (tra 0,3 e 0,4 s dopo)', () => {
    const sim = simulate('glacial_charge', { target: new Vec2(1500, 1200), seconds: 3 });
    const charge = sim.boss.charge;
    expect(charge, 'la carica e finita').toBeNull();
    // Il boss, allo scoppio di ogni zona, ha gia superato il suo punto del percorso.
    const start = sim.origin;
    sim.zones.forEach((zone, index) => {
      const detonatesAt = zone.value.spec.delay;
      const passesAt = GLACIAL.windup + (GLACIAL.duration * (index + 1)) / 6;
      expect(detonatesAt - passesAt).toBeCloseTo(GLACIAL.trailLag, 6);
      const bossThen = sim.path[Math.min(sim.path.length - 1, Math.round(detonatesAt / STEP))]!;
      expect(bossThen.distanceTo(start) + 12, `zona ${index}`).toBeGreaterThanOrEqual(zone.value.position.distanceTo(start));
    });
    expect(sim.boss.scheduled).toHaveLength(0);
  });

  it('da lontano la carica si ferma a 650 unita e le zone seguono quel tratto', () => {
    const sim = simulate('glacial_charge', { target: new Vec2(1500, 2800), seconds: 0.01 });
    const charge = sim.boss.charge!;
    expect(charge.target.distanceTo(charge.start)).toBeCloseTo(GLACIAL.maxDistance, 6);
    expect(sim.zones[5]!.value.position.distanceTo(charge.start)).toBeCloseTo(GLACIAL.maxDistance, 6);
    // Direzione: verso il giocatore (a sud).
    expect(charge.target.x).toBeCloseTo(charge.start.x, 6);
    expect(charge.target.y).toBeGreaterThan(charge.start.y);
  });

  it('in furia nove zone', () => {
    expect(simulate('glacial_charge', { enraged: true, seconds: 0.01 }).zones).toHaveLength(9);
  });

  it('in partita le zone del percorso scoppiano tutte e la carica finisce', () => {
    const match = createMatch(1, { dungeon: GLACIER });
    const events = recordEvents(match);
    match.boss!.attackCount = indexOf('glacial_charge');
    match.boss!.attackTimer = 0;
    run(match, 3);
    expect(eventsOfType(events, 'zone_detonated').filter((zone) => zone.visual === 'glacier_trail')).toHaveLength(6);
    expect(eventsOfType(events, 'boss_charge_finished')).toHaveLength(1);
    expect(match.boss!.charge).toBeNull();
  });
});

describe('ghiacciaio: grafica', () => {
  /** Un contesto 2D che registra solo le chiamate (e accetta qualunque assegnazione di proprieta). */
  function recordingContext(): { ctx: CanvasRenderingContext2D; calls: string[] } {
    const calls: string[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_target, name) => (..._args: unknown[]) => {
          calls.push(String(name));
        },
        set: () => true,
      },
    ) as unknown as CanvasRenderingContext2D;
    return { ctx, calls };
  }

  function cameraOver(width: number, height: number, centre: Vec2): Camera {
    const camera = new Camera();
    camera.setViewSize(width, height);
    camera.follow(centre);
    return camera;
  }

  it('il tema del pavimento disegna solo la parte visibile: una vista piccola costa molto meno di tutta l\'arena', () => {
    const small = recordingContext();
    glacierTheme.drawFloor(small.ctx, GLACIER_ARENA, cameraOver(960, 540, new Vec2(1500, 1500)), 3.2);
    const large = recordingContext();
    glacierTheme.drawFloor(large.ctx, GLACIER_ARENA, cameraOver(3000, 3000, new Vec2(1500, 1500)), 3.2);
    expect(small.calls.length).toBeGreaterThan(200);
    expect(small.calls.length * 5).toBeLessThan(large.calls.length);
    expect(small.calls.length).toBeLessThan(6000);
  });

  it('le colonne fuori vista non vengono disegnate, quelle in vista si', () => {
    const pillar = GLACIER_ARENA.pillars[0]!;
    const hidden = recordingContext();
    glacierTheme.drawPillar(hidden.ctx, pillar, cameraOver(960, 540, new Vec2(300, 300)), 1);
    expect(hidden.calls).toHaveLength(0);
    const shown = recordingContext();
    glacierTheme.drawPillar(shown.ctx, pillar, cameraOver(960, 540, pillar.position), 1);
    expect(shown.calls.length).toBeGreaterThan(10);
  });

  it('e un tema proprio, diverso da quello della cripta', () => {
    expect(glacierTheme).not.toBe(cryptTheme);
    expect(glacierTheme.drawFloor).not.toBe(cryptTheme.drawFloor);
  });
});
