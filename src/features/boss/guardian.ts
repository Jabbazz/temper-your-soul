import { Vec2 } from '../../core/vec2';
import { centered } from '../../core/rng';
import { clampToArena } from '../arena/arena';
import type { DangerZoneSpec } from '../combat/danger-zone';
import type { Boss } from './boss';
import type { BossContext } from './boss-context';
import { pick, type BossDefinition, type BossPattern, type BossStats, type ByPhase } from './boss-definition';
import { enemyShot, schedule, spawnFan, spawnRing, startCharge } from './pattern-kit';

/*
 * Il guardiano della cripta: il boss del prototipo e dei suoi sei schemi di attacco in rotazione.
 * Valori ereditati dal prototipo, provvisori (vedi docs/game-design.md). In furia (seconda fase) alcuni schemi
 * diventano piu' fitti o piu' veloci: i valori per fase sono `{ normal, rage }`.
 */

export const GUARDIAN_STATS: BossStats = {
  maxHealth: 1800,
  phaseTwoThreshold: 0.5,
  speed: 100,
  slowedSpeed: 30,
  orbitDistance: 180,
  orbitSpeedFactor: 0.38,
  firstAttackDelay: 1.8,
  attackInterval: { normal: 2.15, rage: 1.65 },
  attackPose: 0.5,
  hitRadius: 26,
  contactDistance: 29,
  contactDamage: 18,
  chargeDamage: 25,
  chargeHitDistance: 37,
};

// --- Nova di brace: anelli di proiettili in tutte le direzioni ----------------------------------------------------

const NOVA = {
  rings: { normal: 1, rage: 2 } satisfies ByPhase<number>,
  shotsPerRing: 16,
  /** Rotazione dell'anello in radianti per secondo di partita: cosi' ogni nova ha i varchi in posti diversi. */
  spinPerSecond: 0.2,
  /** Sfasamento angolare tra un anello e il successivo. */
  ringTwist: 0.12,
  firstRingSpeed: 105,
  speedStepPerRing: 40,
  damage: 12,
  radius: 5,
};

const EMBER_NOVA: BossPattern = {
  id: 'ember_nova',
  name: 'NOVA DI BRACE',
  labelColor: '#eeb184',
  labelOffsetY: -42,
  execute(boss, ctx) {
    for (let ring = 0; ring < pick(NOVA.rings, boss); ring++) {
      const spec = enemyShot(NOVA.firstRingSpeed + ring * NOVA.speedStepPerRing, NOVA.damage, NOVA.radius, 'ember_nova');
      spawnRing(ctx, boss.position, spec, NOVA.shotsPerRing, ctx.time * NOVA.spinPerSecond + ring * NOVA.ringTwist);
    }
  },
};

// --- Raffica: ventaglio di sette proiettili verso il giocatore -----------------------------------------------------

const BURST = {
  half: 3,
  spread: 0.15,
  speed: { normal: 165, rage: 205 } satisfies ByPhase<number>,
  damage: 15,
  radius: 6,
};

const EMBER_BURST: BossPattern = {
  id: 'ember_burst',
  name: 'RAFFICA',
  labelColor: '#eeb184',
  labelOffsetY: -42,
  execute(boss, ctx) {
    const angle = boss.position.angleTo(ctx.target);
    const spec = enemyShot(pick(BURST.speed, boss), BURST.damage, BURST.radius, 'ember_volley');
    spawnFan(ctx, boss.position, spec, angle, BURST.half, BURST.spread);
  },
};

// --- Frattura: zone che esplodono sotto e attorno al giocatore ----------------------------------------------------

const FRACTURE = {
  zones: { normal: 3, rage: 5 } satisfies ByPhase<number>,
  /** Ampiezza dello scostamento casuale delle zone oltre la prima (che e' sul giocatore). */
  spreadX: 450,
  spreadY: 350,
  zone: { team: 'enemy', radius: 42, delay: 1.15, damage: 24 } satisfies DangerZoneSpec,
};

const FRACTURE_PATTERN: BossPattern = {
  id: 'fracture',
  name: 'FRATTURA',
  labelColor: '#eeb184',
  labelOffsetY: -42,
  execute(boss, ctx) {
    for (let i = 0; i < pick(FRACTURE.zones, boss); i++) {
      // L'ordine delle estrazioni (x poi y) e' parte del comportamento riproducibile con il seme.
      const dx = i ? centered(ctx.rng) * FRACTURE.spreadX : 0;
      const dy = i ? centered(ctx.rng) * FRACTURE.spreadY : 0;
      ctx.spawnZone(
        FRACTURE.zone,
        clampToArena(boss.arena, new Vec2(ctx.target.x + dx, ctx.target.y + dy), boss.arena.bossMargin),
      );
    }
  },
};

// --- Carica: preparazione segnalata a terra, poi scatto verso il punto in cui si trovava il giocatore --------------

const CHARGE = { windup: 0.95, duration: 0.48 };

const CHARGE_PATTERN: BossPattern = {
  id: 'charge',
  name: 'CARICA · SPOSTATI!',
  labelColor: '#ffb177',
  labelOffsetY: -45,
  execute(boss, ctx) {
    startCharge(boss, ctx, CHARGE.windup, CHARGE.duration);
  },
};

// --- Spirale del vuoto: tante raffiche ravvicinate, ciascuna ruotata, da tre proiettili ---------------------------

const SPIRAL = {
  volleys: { normal: 16, rage: 22 } satisfies ByPhase<number>,
  volleyInterval: 0.085,
  angleStep: 0.29,
  shotsPerVolley: 3,
  speed: { normal: 125, rage: 155 } satisfies ByPhase<number>,
  damage: 10,
  radius: 4,
};

function fireSpiralVolley(angle: number): (boss: Boss, ctx: BossContext) => void {
  return (boss, ctx) => {
    // La velocita' dipende dalla fase nel momento dello sparo, come nel prototipo.
    const spec = enemyShot(pick(SPIRAL.speed, boss), SPIRAL.damage, SPIRAL.radius, 'void_spiral');
    spawnRing(ctx, boss.position, spec, SPIRAL.shotsPerVolley, angle);
  };
}

const VOID_SPIRAL: BossPattern = {
  id: 'void_spiral',
  name: 'SPIRALE DEL VUOTO',
  labelColor: '#c9a6ff',
  labelOffsetY: -45,
  execute(boss, ctx) {
    const angle = boss.position.angleTo(ctx.target);
    for (let i = 0; i < pick(SPIRAL.volleys, boss); i++) {
      const volleyAngle = angle + i * SPIRAL.angleStep;
      schedule(boss, i * SPIRAL.volleyInterval, 'spiral', fireSpiralVolley(volleyAngle), volleyAngle);
    }
  },
};

// --- Triplice ventaglio: tre ventagli da cinque proiettili, uno dopo l'altro --------------------------------------

const FAN = {
  fans: 3,
  firstDelay: 0.5,
  fanInterval: 0.38,
  /** Rotazione tra un ventaglio e il successivo. */
  fanTwist: 0.25,
  half: 2,
  spread: 0.13,
  speed: 185,
  damage: 14,
  radius: 5,
  /** Secondi di posa di lancio a ogni ventaglio sparato (quella d'inizio e' `attackPose`). */
  firePose: 0.18,
};

function fireFan(angle: number): (boss: Boss, ctx: BossContext) => void {
  return (boss, ctx) => {
    const spec = enemyShot(FAN.speed, FAN.damage, FAN.radius, 'ember_fan');
    spawnFan(ctx, boss.position, spec, angle, FAN.half, FAN.spread);
    ctx.emit({ type: 'boss_pose', seconds: FAN.firePose });
  };
}

const TRIPLE_FAN: BossPattern = {
  id: 'triple_fan',
  name: 'TRIPLICE VENTAGLIO',
  labelColor: '#ffc97e',
  labelOffsetY: -45,
  execute(boss, ctx) {
    const angle = boss.position.angleTo(ctx.target);
    for (let i = 0; i < FAN.fans; i++) {
      const fanAngle = angle + (i - 1) * FAN.fanTwist;
      schedule(boss, FAN.firstDelay + i * FAN.fanInterval, 'fan', fireFan(fanAngle), fanAngle);
    }
  },
};

/** Il guardiano della cripta, con gli schemi nell'ordine di rotazione. */
export const GUARDIAN: BossDefinition = {
  id: 'guardian',
  name: 'GUARDIANO DELLA CRIPTA',
  art: 'guardian',
  rageText: 'IL GUARDIANO SI INFURIA',
  stats: GUARDIAN_STATS,
  patterns: [EMBER_NOVA, EMBER_BURST, FRACTURE_PATTERN, CHARGE_PATTERN, VOID_SPIRAL, TRIPLE_FAN],
};
