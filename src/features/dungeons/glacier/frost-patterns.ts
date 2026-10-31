import { between } from '../../../core/rng';
import { TAU, Vec2 } from '../../../core/vec2';
import { clampToArena } from '../../arena/arena';
import type { Boss, Charge } from '../../boss/boss';
import type { BossContext } from '../../boss/boss-context';
import { pick, type BossPattern, type ByPhase } from '../../boss/boss-definition';
import { enemyShot, pointAround, schedule, spawnFan, spawnRing, startCharge } from '../../boss/pattern-kit';
import type { DangerZoneSpec } from '../../combat/danger-zone';

/*
 * Gli schemi del Custode del ghiaccio. Valori provvisori (vedi docs/game-design.md). Sei meccaniche diverse:
 * lance di ghiaccio (zone a ondate in un cono), bufera (due spirali opposte), nova gelida (due anelli sfasati),
 * salto gelido (segnale a terra, teletrasporto, ventaglio), schegge (ventagli stretti e veloci) e carica glaciale
 * (zone lungo il percorso). In furia hanno piu' elementi o sono piu' rapidi (valori `{ normal, rage }`).
 */

const LABEL_COLOR = '#9fe8ff';
const LABEL_OFFSET_Y = -48;

// --- Lance di ghiaccio: ondate di zone in un cono davanti al boss, ognuna piu' lontana della precedente ------------

export const SPIKES = {
  waves: { normal: 5, rage: 7 } satisfies ByPhase<number>,
  /** Raggi del cono (dispari: quello centrale punta al giocatore). */
  rays: { normal: 3, rage: 5 } satisfies ByPhase<number>,
  /** Angolo tra raggi vicini: la distanza laterale cresce con quella dal boss, e il cono si allarga. */
  coneStep: 0.2,
  firstDistance: 110,
  distanceStep: 100,
  /** Secondi tra un'ondata e la successiva (le lance sbucano in sequenza, verso l'esterno). */
  waveInterval: 0.2,
  zone: { team: 'enemy', radius: 40, delay: 0.65, damage: 22, visual: 'glacier_spike' } satisfies DangerZoneSpec,
};

/** I centri di un'ondata del cono (non limitati all'arena): `rays` punti a distanza crescente con l'ondata. */
export function spikeWavePoints(
  origin: Vec2,
  angle: number,
  wave: number,
  rays: number,
  coneStep: number = SPIKES.coneStep,
  firstDistance: number = SPIKES.firstDistance,
  distanceStep: number = SPIKES.distanceStep,
): Vec2[] {
  const half = (rays - 1) / 2;
  const distance = firstDistance + wave * distanceStep;
  const points: Vec2[] = [];
  for (let ray = 0; ray < rays; ray++) points.push(origin.add(Vec2.fromAngle(angle + (ray - half) * coneStep, distance)));
  return points;
}

function eruptWave(origin: Vec2, angle: number, wave: number, rays: number) {
  return (boss: Boss, ctx: BossContext): void => {
    for (const point of spikeWavePoints(origin, angle, wave, rays)) {
      ctx.spawnZone(SPIKES.zone, clampToArena(boss.arena, point, boss.arena.bossMargin));
    }
  };
}

export const ICE_SPIKES: BossPattern = {
  id: 'ice_spikes',
  name: 'LANCE DI GHIACCIO',
  labelColor: LABEL_COLOR,
  labelOffsetY: LABEL_OFFSET_Y,
  execute(boss, ctx) {
    // Il cono parte da dove il boss si trova ora e punta dove il giocatore si trova ora: poi resta fermo.
    const origin = boss.position;
    const angle = origin.angleTo(ctx.target);
    const rays = pick(SPIKES.rays, boss);
    for (let wave = 0; wave < pick(SPIKES.waves, boss); wave++) {
      schedule(boss, wave * SPIKES.waveInterval, 'spikes', eruptWave(origin, angle, wave, rays), angle);
    }
  },
};

// --- Bufera: due spirali che girano in versi opposti, contemporaneamente ------------------------------------------

export const BLIZZARD_DATA = {
  volleys: { normal: 18, rage: 24 } satisfies ByPhase<number>,
  volleyInterval: 0.1,
  /** Rotazione per raffica, in radianti (una spirale la somma, l'altra la sottrae). */
  angleStep: 0.24,
  /** Bracci di ogni spirale. */
  arms: { normal: 2, rage: 3 } satisfies ByPhase<number>,
  speed: { normal: 115, rage: 140 } satisfies ByPhase<number>,
  damage: 9,
  radius: 4,
};

function fireBlizzardVolley(index: number, baseAngle: number) {
  return (boss: Boss, ctx: BossContext): void => {
    const arms = pick(BLIZZARD_DATA.arms, boss);
    const speed = pick(BLIZZARD_DATA.speed, boss);
    const clockwise = enemyShot(speed, BLIZZARD_DATA.damage, BLIZZARD_DATA.radius, 'glacier_flurry_cw');
    const counter = enemyShot(speed, BLIZZARD_DATA.damage, BLIZZARD_DATA.radius, 'glacier_flurry_ccw');
    const twist = index * BLIZZARD_DATA.angleStep;
    // La spirale antioraria e' sfasata di mezzo braccio, cosi' i due insiemi di bracci non si sovrappongono.
    spawnRing(ctx, boss.position, clockwise, arms, baseAngle + twist);
    spawnRing(ctx, boss.position, counter, arms, baseAngle - twist + TAU / arms / 2);
  };
}

export const BLIZZARD: BossPattern = {
  id: 'blizzard',
  name: 'BUFERA',
  labelColor: '#e2f6ff',
  labelOffsetY: LABEL_OFFSET_Y,
  execute(boss, ctx) {
    const baseAngle = boss.position.angleTo(ctx.target);
    for (let i = 0; i < pick(BLIZZARD_DATA.volleys, boss); i++) {
      schedule(boss, i * BLIZZARD_DATA.volleyInterval, 'blizzard', fireBlizzardVolley(i, baseAngle), baseAngle + i * BLIZZARD_DATA.angleStep);
    }
  },
};

// --- Nova gelida: un anello fitto e, poco dopo, altri sfasati di mezzo passo ---------------------------------------

export const NOVA = {
  rings: { normal: 2, rage: 3 } satisfies ByPhase<number>,
  shotsPerRing: { normal: 20, rage: 26 } satisfies ByPhase<number>,
  /** Secondi tra un anello e il successivo. */
  ringInterval: 0.6,
  speed: { normal: 120, rage: 140 } satisfies ByPhase<number>,
  damage: 11,
  radius: 5,
};

/** Aspetto dell'anello: i pari sono ciano, i dispari viola, cosi' si vede quale e' sfasato. */
const novaVisual = (ring: number): string => (ring % 2 === 0 ? 'glacier_nova' : 'glacier_nova_late');

function fireNovaRing(ring: number, startAngle: number, shots: number) {
  return (boss: Boss, ctx: BossContext): void => {
    const spec = enemyShot(pick(NOVA.speed, boss), NOVA.damage, NOVA.radius, novaVisual(ring));
    // Gli anelli dispari sono ruotati di mezzo passo: i loro proiettili coprono i varchi di quelli pari.
    spawnRing(ctx, boss.position, spec, shots, startAngle + (ring % 2 === 1 ? TAU / shots / 2 : 0));
  };
}

export const FROST_NOVA: BossPattern = {
  id: 'frost_nova',
  name: 'NOVA GELIDA',
  labelColor: LABEL_COLOR,
  labelOffsetY: LABEL_OFFSET_Y,
  execute(boss, ctx) {
    const shots = pick(NOVA.shotsPerRing, boss);
    // L'angolo di partenza e' casuale (dal seme della partita): i varchi cambiano a ogni nova.
    const startAngle = ctx.rng.next() * TAU;
    for (let ring = 0; ring < pick(NOVA.rings, boss); ring++) {
      const fire = fireNovaRing(ring, startAngle, shots);
      if (ring === 0) fire(boss, ctx);
      else schedule(boss, ring * NOVA.ringInterval, 'nova_ring', fire);
    }
  },
};

// --- Salto gelido: segnale a terra vicino al giocatore, il boss ci si teletrasporta e spara un ventaglio ------------

export const BLINK = {
  blinks: { normal: 1, rage: 2 } satisfies ByPhase<number>,
  /** Distanza del punto d'arrivo dal giocatore: mai addosso (il contatto ferisce). */
  distance: { min: 150, max: 230 },
  /** Secondi tra l'inizio di un salto e quello del successivo. */
  blinkInterval: 1.0,
  /** Il segnale a terra scoppia (e il boss arriva) dopo `delay` secondi: vale anche come avviso. */
  zone: { team: 'enemy', radius: 58, delay: 0.85, damage: 20, visual: 'glacier_blink' } satisfies DangerZoneSpec,
  fan: {
    half: { normal: 3, rage: 4 } satisfies ByPhase<number>,
    spread: 0.12,
    speed: 200,
    damage: 13,
    radius: 5,
  },
  /** Secondi di posa di lancio all'arrivo. */
  arrivalPose: 0.25,
};

/**
 * Il punto d'arrivo di un salto: a `distance` dal bersaglio nella direzione `angle`. Se il margine dell'arena lo
 * schiaccerebbe contro il giocatore, si prova il lato opposto.
 */
export function blinkLanding(boss: Boss, target: Vec2, angle: number, distance: number): Vec2 {
  const landing = pointAround(boss, target, angle, distance);
  if (landing.distanceTo(target) >= distance * 0.6) return landing;
  return pointAround(boss, target, angle + Math.PI, distance);
}

function land(landing: Vec2) {
  return (boss: Boss, ctx: BossContext): void => {
    const from = boss.position;
    boss.position = landing;
    ctx.emit({ type: 'boss_teleported', from, to: landing });
    const spec = enemyShot(BLINK.fan.speed, BLINK.fan.damage, BLINK.fan.radius, 'glacier_blink_shot');
    spawnFan(ctx, landing, spec, landing.angleTo(ctx.target), pick(BLINK.fan.half, boss), BLINK.fan.spread);
    ctx.emit({ type: 'boss_pose', seconds: BLINK.arrivalPose });
  };
}

/** Sceglie il punto d'arrivo, lo segnala a terra e programma il teletrasporto per quando la zona scoppia. */
function signalBlink(boss: Boss, ctx: BossContext): void {
  // L'ordine delle estrazioni (angolo poi distanza) e' parte del comportamento riproducibile con il seme.
  const angle = ctx.rng.next() * TAU;
  const distance = between(ctx.rng, BLINK.distance.min, BLINK.distance.max);
  const landing = blinkLanding(boss, ctx.target, angle, distance);
  ctx.spawnZone(BLINK.zone, landing);
  schedule(boss, BLINK.zone.delay, 'blink_land', land(landing), angle);
}

export const BLINK_STRIKE: BossPattern = {
  id: 'blink_strike',
  name: 'SALTO GELIDO',
  labelColor: '#d6c4ff',
  labelOffsetY: LABEL_OFFSET_Y,
  execute(boss, ctx) {
    signalBlink(boss, ctx);
    for (let i = 1; i < pick(BLINK.blinks, boss); i++) schedule(boss, i * BLINK.blinkInterval, 'blink_signal', signalBlink);
  },
};

// --- Schegge: ventagli stretti e veloci, ognuno mirato al giocatore nel momento dello sparo -----------------------

export const SHARDS = {
  volleys: { normal: 2, rage: 3 } satisfies ByPhase<number>,
  firstDelay: 0.35,
  volleyInterval: 0.3,
  half: 2,
  spread: 0.07,
  speed: { normal: 320, rage: 380 } satisfies ByPhase<number>,
  damage: 13,
  radius: 4,
  lifetime: 3.5,
  /** Secondi di posa di lancio a ogni ventaglio. */
  firePose: 0.15,
};

function fireShards(boss: Boss, ctx: BossContext): void {
  const spec = enemyShot(pick(SHARDS.speed, boss), SHARDS.damage, SHARDS.radius, 'glacier_shard', SHARDS.lifetime);
  spawnFan(ctx, boss.position, spec, boss.position.angleTo(ctx.target), SHARDS.half, SHARDS.spread);
  ctx.emit({ type: 'boss_pose', seconds: SHARDS.firePose });
}

export const SHARD_VOLLEY: BossPattern = {
  id: 'shard_volley',
  name: 'SCHEGGE',
  labelColor: '#bff3ff',
  labelOffsetY: LABEL_OFFSET_Y,
  execute(boss) {
    for (let i = 0; i < pick(SHARDS.volleys, boss); i++) {
      schedule(boss, SHARDS.firstDelay + i * SHARDS.volleyInterval, 'shards', fireShards);
    }
  },
};

// --- Carica glaciale: il percorso della carica e' segnato a terra e scoppia subito dopo il passaggio ---------------

export const GLACIAL = {
  windup: 0.8,
  duration: 0.5,
  /** Lunghezza massima della carica, in unita' di mondo. */
  maxDistance: 650,
  /** Zone lungo il percorso, dal punto di partenza (escluso) a quello d'arrivo (incluso). */
  trailZones: { normal: 6, rage: 9 } satisfies ByPhase<number>,
  /** Ogni zona scoppia questi secondi dopo il passaggio del boss. */
  trailLag: 0.3,
  zone: { team: 'enemy', radius: 42, damage: 20, visual: 'glacier_trail' } as const,
};

/** I punti del percorso da `start` a `target`, equidistanti, escluso `start` e incluso `target`. */
export function trailPoints(start: Vec2, target: Vec2, count: number): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 1; i <= count; i++) points.push(start.lerp(target, i / count));
  return points;
}

export const GLACIAL_CHARGE: BossPattern = {
  id: 'glacial_charge',
  name: 'CARICA GLACIALE',
  labelColor: '#c9b8ff',
  labelOffsetY: LABEL_OFFSET_Y,
  execute(boss, ctx) {
    startCharge(boss, ctx, GLACIAL.windup, GLACIAL.duration);
    const planned = boss.charge;
    if (planned === null) return;
    // Da lontano la carica si ferma a `maxDistance`: la durata e' fissa, quindi senza limite la velocita' crescerebbe.
    const reach = planned.target.sub(planned.start);
    const target = reach.length() > GLACIAL.maxDistance ? planned.start.add(reach.normalized().mul(GLACIAL.maxDistance)) : planned.target;
    const charge: Charge = { ...planned, target };
    boss.charge = charge;
    const count = pick(GLACIAL.trailZones, boss);
    trailPoints(charge.start, charge.target, count).forEach((point, index) => {
      // Il segnale compare subito (avviso lungo come la preparazione) e scoppia dopo il passaggio del boss.
      const passesAt = GLACIAL.windup + (GLACIAL.duration * (index + 1)) / count;
      ctx.spawnZone({ ...GLACIAL.zone, delay: passesAt + GLACIAL.trailLag }, point);
    });
  },
};
