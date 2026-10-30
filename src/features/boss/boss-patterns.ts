import { TAU, Vec2 } from '../../core/vec2';
import { centered } from '../../core/rng';
import { ARENA, clampToArena } from '../arena/arena';
import type { DangerZoneSpec } from '../combat/danger-zone';
import type { ProjectileSpec } from '../combat/projectile';
import type { Boss } from './boss';
import type { BossContext } from './boss-context';

/*
 * I sei schemi di attacco del guardiano, in rotazione. Valori ereditati dal prototipo, provvisori
 * (vedi docs/game-design.md). In furia (seconda fase) alcuni schemi diventano piu' fitti o piu' veloci:
 * i valori per fase sono `{ normal, rage }`.
 */

interface ByPhase<T> {
  readonly normal: T;
  readonly rage: T;
}

const pick = <T>(values: ByPhase<T>, boss: Boss): T => (boss.isEnraged ? values.rage : values.normal);

/** Una raffica programmata: spara quando `delay` arriva a zero. */
export interface Volley {
  delay: number;
  angle: number;
  kind: 'spiral' | 'fan';
}

export interface BossPattern {
  readonly id: string;
  /** Testo mostrato sopra il boss quando lo schema parte (in italiano). */
  readonly name: string;
  readonly labelColor: string;
  /** Scostamento verticale del testo rispetto al boss (negativo = sopra). */
  readonly labelOffsetY: number;
  execute(boss: Boss, ctx: BossContext): void;
}

const enemyShot = (speed: number, damage: number, radius: number, visual: ProjectileSpec['visual']): ProjectileSpec => ({
  team: 'enemy',
  speed,
  damage,
  radius,
  lifetime: 5,
  visual,
});

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
      for (let i = 0; i < NOVA.shotsPerRing; i++) {
        const angle = (i * TAU) / NOVA.shotsPerRing + ctx.time * NOVA.spinPerSecond + ring * NOVA.ringTwist;
        ctx.spawnProjectile(spec, boss.position, angle);
      }
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
    for (let i = -BURST.half; i <= BURST.half; i++) ctx.spawnProjectile(spec, boss.position, angle + i * BURST.spread);
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
      ctx.spawnZone(FRACTURE.zone, clampToArena(new Vec2(ctx.target.x + dx, ctx.target.y + dy), ARENA.bossMargin));
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
    boss.charge = {
      start: boss.position,
      target: clampToArena(ctx.target, ARENA.bossMargin),
      elapsed: 0,
      windup: CHARGE.windup,
      duration: CHARGE.duration,
    };
    ctx.emit({ type: 'boss_pose', seconds: CHARGE.windup });
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

const VOID_SPIRAL: BossPattern = {
  id: 'void_spiral',
  name: 'SPIRALE DEL VUOTO',
  labelColor: '#c9a6ff',
  labelOffsetY: -45,
  execute(boss, ctx) {
    const angle = boss.position.angleTo(ctx.target);
    for (let i = 0; i < pick(SPIRAL.volleys, boss); i++) {
      boss.volleys.push({ delay: i * SPIRAL.volleyInterval, angle: angle + i * SPIRAL.angleStep, kind: 'spiral' });
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
  /** Secondi di posa di lancio a ogni ventaglio sparato (quella d'inizio e' `BOSS_STATS.attackPose`). */
  firePose: 0.18,
};

const TRIPLE_FAN: BossPattern = {
  id: 'triple_fan',
  name: 'TRIPLICE VENTAGLIO',
  labelColor: '#ffc97e',
  labelOffsetY: -45,
  execute(boss, ctx) {
    const angle = boss.position.angleTo(ctx.target);
    for (let i = 0; i < FAN.fans; i++) {
      boss.volleys.push({
        delay: FAN.firstDelay + i * FAN.fanInterval,
        angle: angle + (i - 1) * FAN.fanTwist,
        kind: 'fan',
      });
    }
  },
};

/** Gli schemi nell'ordine di rotazione: dopo l'ultimo si riparte dal primo. */
export const BOSS_PATTERNS: readonly BossPattern[] = [
  EMBER_NOVA,
  EMBER_BURST,
  FRACTURE_PATTERN,
  CHARGE_PATTERN,
  VOID_SPIRAL,
  TRIPLE_FAN,
];

/** Spara una raffica programmata dal punto in cui si trova il boss. */
export function fireVolley(volley: Volley, boss: Boss, ctx: BossContext): void {
  if (volley.kind === 'spiral') {
    const spec = enemyShot(pick(SPIRAL.speed, boss), SPIRAL.damage, SPIRAL.radius, 'void_spiral');
    for (let k = 0; k < SPIRAL.shotsPerVolley; k++) {
      ctx.spawnProjectile(spec, boss.position, volley.angle + (k * TAU) / SPIRAL.shotsPerVolley);
    }
    return;
  }
  const spec = enemyShot(FAN.speed, FAN.damage, FAN.radius, 'ember_fan');
  for (let k = -FAN.half; k <= FAN.half; k++) ctx.spawnProjectile(spec, boss.position, volley.angle + k * FAN.spread);
  ctx.emit({ type: 'boss_pose', seconds: FAN.firePose });
}
