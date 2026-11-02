import { between } from '../../../core/rng';
import { clamp, TAU, Vec2 } from '../../../core/vec2';
import { isOutsideProjectileBounds, type ArenaDefinition } from '../../arena/arena';
import type { Boss } from '../../boss/boss';
import type { BossContext } from '../../boss/boss-context';
import { pick, type BossDefinition, type BossPattern, type BossStats, type ByPhase } from '../../boss/boss-definition';
import { enemyShot, pointAround, schedule, spawnRing, startCharge } from '../../boss/pattern-kit';
import type { DangerZoneSpec } from '../../combat/danger-zone';
import { SPORE_MOTHER_SUMMONS } from '../../minions/minion-catalog';

/*
 * La Madre delle Spore: il boss della palude. Lenta e ingombrante, non punta a colpire il giocatore ma a togliergli
 * spazio: anelli lenti con varchi che ruotano, cerchi di melma da cui uscire (o in cui restare), file di radici che
 * avanzano, nodi di spore che si stringono, pioggia di spore e una carica lunga da preparare.
 * Tutti i valori sono provvisori (vedi docs/game-design.md). Gli id degli schemi sono stabili: non rinominarli.
 */

export const SPORE_MOTHER_STATS: BossStats = {
  maxHealth: 7200,
  phaseTwoThreshold: 0.5,
  // Molto piu' lenta del guardiano (100): il giocatore corre a 177.
  speed: 70,
  slowedSpeed: 24,
  orbitDistance: 240,
  orbitSpeedFactor: 0.45,
  firstAttackDelay: 2.4,
  attackInterval: { normal: 2.6, rage: 2.0 },
  attackPose: 0.6,
  hitRadius: 34,
  contactDistance: 30,
  contactDamage: 20,
  chargeDamage: 28,
  chargeHitDistance: 40,
};

// --- Nuvola di spore: anelli grandi e lenti con un varco che ruota ----------------------------------------------

export const SPORE_CLOUD = {
  rings: { normal: 3, rage: 4 } satisfies ByPhase<number>,
  /** Secondi tra un anello e il successivo (il primo parte subito). */
  ringInterval: { normal: 0.9, rage: 0.75 } satisfies ByPhase<number>,
  shotsPerRing: 22,
  /** Posti consecutivi lasciati vuoti: il varco e' largo circa questi posti piu' uno. */
  gapShots: 3,
  /** Di quanto ruota il varco da un anello al successivo (radianti): il primo e' puntato verso il giocatore. */
  gapTwist: 0.8,
  speed: { normal: 68, rage: 82 } satisfies ByPhase<number>,
  damage: 11,
  radius: 9,
  lifetime: 9,
  /** Secondi di posa di lancio a ogni anello dopo il primo. */
  firePose: 0.2,
};

/**
 * Angoli dei proiettili di un anello con un varco: `count` posti equidistanti, di cui `gapShots` consecutivi vuoti e
 * centrati su `gapAngle`.
 */
export function ringAngles(count: number, gapShots: number, gapAngle: number): number[] {
  const step = TAU / count;
  const angles: number[] = [];
  for (let slot = gapShots; slot < count; slot++) angles.push(gapAngle + (slot - (gapShots - 1) / 2) * step);
  return angles;
}

function fireSporeRing(gapAngle: number): (boss: Boss, ctx: BossContext) => void {
  return (boss, ctx) => {
    // La velocita' dipende dalla fase nel momento dello sparo.
    const spec = enemyShot(pick(SPORE_CLOUD.speed, boss), SPORE_CLOUD.damage, SPORE_CLOUD.radius, 'swamp_spore', SPORE_CLOUD.lifetime);
    for (const angle of ringAngles(SPORE_CLOUD.shotsPerRing, SPORE_CLOUD.gapShots, gapAngle)) {
      ctx.spawnProjectile(spec, boss.position, angle);
    }
  };
}

const SPORE_CLOUD_PATTERN: BossPattern = {
  id: 'spore_cloud',
  name: 'NUVOLA DI SPORE',
  labelColor: '#d9e86a',
  labelOffsetY: -52,
  execute(boss, ctx) {
    const toPlayer = boss.position.angleTo(ctx.target);
    fireSporeRing(toPlayer)(boss, ctx);
    const interval = pick(SPORE_CLOUD.ringInterval, boss);
    for (let i = 1; i < pick(SPORE_CLOUD.rings, boss); i++) {
      const gapAngle = toPlayer + i * SPORE_CLOUD.gapTwist;
      const fire = fireSporeRing(gapAngle);
      schedule(
        boss,
        i * interval,
        'spore_ring',
        (b, c) => {
          fire(b, c);
          c.emit({ type: 'boss_pose', seconds: SPORE_CLOUD.firePose });
        },
        gapAngle,
      );
    }
  },
};

// --- Anello di melma: un cerchio di zone chiuso attorno al giocatore, con il centro sicuro --------------------------

export const BOG_RING = {
  /** Distanza dal centro (dove si trovava il giocatore) e numero di zone: abbastanza fitte da chiudere il cerchio. */
  ring: { normal: { radius: 150, zones: 9 }, rage: { radius: 180, zones: 11 } } satisfies ByPhase<{ radius: number; zones: number }>,
  /** Solo in furia: secondo cerchio piu' largo, che compare poco dopo e toglie la via di fuga. */
  outerRing: { radius: 300, zones: 18, delay: 0.4 },
  zone: { team: 'enemy', radius: 50, delay: 1.3, damage: 26, visual: 'swamp_bog' } satisfies DangerZoneSpec,
};

/** Vero se il punto sta dentro la zona in cui il boss puo' creare bersagli. */
function insideBossBounds(arena: ArenaDefinition, point: Vec2): boolean {
  const m = arena.bossMargin;
  return point.x >= m && point.x <= arena.width - m && point.y >= m && point.y <= arena.height - m;
}

/** Cerchio di zone attorno a `center`; quelle che cadrebbero oltre il bordo mancano (il muro fa da chiusura). */
function spawnBogRing(ctx: BossContext, arena: ArenaDefinition, center: Vec2, radius: number, zones: number, startAngle: number): void {
  for (let i = 0; i < zones; i++) {
    const point = center.add(Vec2.fromAngle(startAngle + (i * TAU) / zones, radius));
    if (insideBossBounds(arena, point)) ctx.spawnZone(BOG_RING.zone, point);
  }
}

const BOG_RING_PATTERN: BossPattern = {
  id: 'bog_ring',
  name: 'ANELLO DI MELMA',
  labelColor: '#b98cff',
  labelOffsetY: -52,
  execute(boss, ctx) {
    const center = ctx.target;
    const ring = pick(BOG_RING.ring, boss);
    spawnBogRing(ctx, boss.arena, center, ring.radius, ring.zones, 0);
    if (boss.isEnraged) {
      const outer = BOG_RING.outerRing;
      schedule(boss, outer.delay, 'bog_outer', (b, c) => spawnBogRing(c, b.arena, center, outer.radius, outer.zones, Math.PI / outer.zones));
    }
  },
};

// --- Frusta di radici: una fila di zone che avanza dal boss verso il giocatore -----------------------------------

export const TENDRIL_LASH = {
  /** Distanza tra una zona e la successiva lungo la fila, e distanza della prima dal boss. */
  spacing: 70,
  /** Secondi tra la comparsa di una zona e la successiva: la fila "avanza". */
  interval: 0.1,
  minZones: 5,
  maxZones: 14,
  /** La fila si estende oltre il giocatore di questa distanza. */
  overshoot: 160,
  lines: { normal: 1, rage: 3 } satisfies ByPhase<number>,
  /** Angolo tra una fila e la vicina, in furia. */
  lineSpread: 0.38,
  zone: { team: 'enemy', radius: 36, delay: 0.95, damage: 22, visual: 'swamp_tendril' } satisfies DangerZoneSpec,
};

/** Quante zone servono a una fila per arrivare oltre un bersaglio a `distance` dal boss. */
export function lashLength(distance: number): number {
  return clamp(Math.ceil((distance + TENDRIL_LASH.overshoot) / TENDRIL_LASH.spacing), TENDRIL_LASH.minZones, TENDRIL_LASH.maxZones);
}

const TENDRIL_LASH_PATTERN: BossPattern = {
  id: 'tendril_lash',
  name: 'FRUSTA DI RADICI',
  labelColor: '#a8cc55',
  labelOffsetY: -52,
  execute(boss, ctx) {
    const origin = boss.position;
    const baseAngle = origin.angleTo(ctx.target);
    const zones = lashLength(origin.distanceTo(ctx.target));
    const lines = pick(TENDRIL_LASH.lines, boss);
    for (let line = 0; line < lines; line++) {
      const angle = baseAngle + (line - (lines - 1) / 2) * TENDRIL_LASH.lineSpread;
      for (let i = 0; i < zones; i++) {
        const point = origin.add(Vec2.fromAngle(angle, (i + 1) * TENDRIL_LASH.spacing));
        if (!insideBossBounds(boss.arena, point)) break;
        schedule(boss, i * TENDRIL_LASH.interval, 'lash', (_b, c) => c.spawnZone(TENDRIL_LASH.zone, point), angle);
      }
    }
  },
};

// --- Accerchiamento: un anello di proiettili lenti creato attorno al giocatore, che si stringe -------------------

export const ENCIRCLE = {
  rings: { normal: 1, rage: 2 } satisfies ByPhase<number>,
  /** Secondi tra un anello e il successivo (il primo parte subito). */
  ringInterval: 1.0,
  /** Distanza dal giocatore a cui nascono i proiettili del primo anello e incremento per i successivi. */
  radius: 280,
  radiusStep: 60,
  shotsPerRing: { normal: 18, rage: 22 } satisfies ByPhase<number>,
  gapShots: 2,
  /** Rotazione del varco del secondo anello rispetto al primo (il primo e' a caso, con `ctx.rng`). */
  gapTwist: 2.2,
  speed: { normal: 85, rage: 95 } satisfies ByPhase<number>,
  damage: 12,
  radiusShot: 7,
  /** Vita oltre il tempo necessario ad arrivare al centro, in secondi. */
  extraLifetime: 1.5,
};

/** Anello di proiettili alla distanza `radius` da `center`, diretti verso il centro; i posti fuori dall'arena mancano. */
function fireNoose(radius: number, gapAngle: number): (boss: Boss, ctx: BossContext) => void {
  return (boss, ctx) => {
    const center = ctx.target;
    const speed = pick(ENCIRCLE.speed, boss);
    const spec = enemyShot(speed, ENCIRCLE.damage, ENCIRCLE.radiusShot, 'swamp_noose', radius / speed + ENCIRCLE.extraLifetime);
    for (const angle of ringAngles(pick(ENCIRCLE.shotsPerRing, boss), ENCIRCLE.gapShots, gapAngle)) {
      const point = center.add(Vec2.fromAngle(angle, radius));
      if (!isOutsideProjectileBounds(boss.arena, point)) ctx.spawnProjectile(spec, point, angle + Math.PI);
    }
  };
}

const ENCIRCLE_PATTERN: BossPattern = {
  id: 'encircle',
  name: 'ACCERCHIAMENTO',
  labelColor: '#c9a6ff',
  labelOffsetY: -52,
  execute(boss, ctx) {
    const firstGap = ctx.rng.next() * TAU;
    fireNoose(ENCIRCLE.radius, firstGap)(boss, ctx);
    for (let i = 1; i < pick(ENCIRCLE.rings, boss); i++) {
      const gapAngle = firstGap + i * ENCIRCLE.gapTwist;
      schedule(boss, i * ENCIRCLE.ringInterval, 'noose', fireNoose(ENCIRCLE.radius + i * ENCIRCLE.radiusStep, gapAngle), gapAngle);
    }
  },
};

// --- Pioggia di spore: tante zone piccole in punti casuali attorno al giocatore ------------------------------------

export const SPORE_RAIN = {
  zones: { normal: 11, rage: 17 } satisfies ByPhase<number>,
  /** Secondi tra la comparsa di una zona e la successiva. */
  interval: 0.11,
  /** Le zone cadono in una corona attorno al giocatore (posizione al momento della comparsa). */
  minDistance: 50,
  maxDistance: 430,
  zone: { team: 'enemy', radius: 34, delay: 0.9, damage: 16, visual: 'swamp_venom' } satisfies DangerZoneSpec,
};

function dropSpore(boss: Boss, ctx: BossContext): void {
  // L'ordine delle estrazioni (angolo poi distanza) e' parte del comportamento riproducibile con il seme.
  const angle = ctx.rng.next() * TAU;
  // Si interpola tra i quadrati dei raggi: la densita' resta uniforme sulla corona.
  const distance = Math.sqrt(between(ctx.rng, SPORE_RAIN.minDistance ** 2, SPORE_RAIN.maxDistance ** 2));
  ctx.spawnZone(SPORE_RAIN.zone, pointAround(boss, ctx.target, angle, distance));
}

const SPORE_RAIN_PATTERN: BossPattern = {
  id: 'spore_rain',
  name: 'PIOGGIA DI SPORE',
  labelColor: '#e6f56a',
  labelOffsetY: -52,
  execute(boss) {
    for (let i = 0; i < pick(SPORE_RAIN.zones, boss); i++) schedule(boss, i * SPORE_RAIN.interval, 'spore_drop', dropSpore);
  },
};

// --- Slancio tossico: carica lenta con lunga preparazione, che scoppia in spore all'arrivo -----------------------

export const TOXIC_LUNGE = {
  windup: 1.6,
  duration: 0.8,
  /** Scarto di sicurezza: lo scoppio parte dopo la fine della carica, mai prima. */
  landingDelay: 0.05,
  burst: {
    shots: { normal: 8, rage: 14 } satisfies ByPhase<number>,
    speed: 90,
    damage: 12,
    radius: 7,
    lifetime: 4,
  },
};

function burstSpores(boss: Boss, ctx: BossContext): void {
  const burst = TOXIC_LUNGE.burst;
  const spec = enemyShot(burst.speed, burst.damage, burst.radius, 'swamp_pustule', burst.lifetime);
  spawnRing(ctx, boss.position, spec, pick(burst.shots, boss), 0);
}

const TOXIC_LUNGE_PATTERN: BossPattern = {
  id: 'toxic_lunge',
  name: 'SLANCIO TOSSICO · SPOSTATI!',
  labelColor: '#d9e86a',
  labelOffsetY: -55,
  execute(boss, ctx) {
    startCharge(boss, ctx, TOXIC_LUNGE.windup, TOXIC_LUNGE.duration);
    schedule(boss, TOXIC_LUNGE.windup + TOXIC_LUNGE.duration + TOXIC_LUNGE.landingDelay, 'lunge_burst', burstSpores);
  },
};

/** La Madre delle Spore, con gli schemi in rotazione: alterna proiettili, zone e carica. */
export const SPORE_MOTHER: BossDefinition = {
  id: 'spore_mother',
  name: 'MADRE DELLE SPORE',
  art: 'spore_mother',
  stats: SPORE_MOTHER_STATS,
  summons: SPORE_MOTHER_SUMMONS,
  patterns: [
    SPORE_CLOUD_PATTERN,
    TENDRIL_LASH_PATTERN,
    ENCIRCLE_PATTERN,
    BOG_RING_PATTERN,
    SPORE_RAIN_PATTERN,
    TOXIC_LUNGE_PATTERN,
  ],
};
