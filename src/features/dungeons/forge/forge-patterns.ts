import { clamp, TAU, Vec2 } from '../../../core/vec2';
import { centered } from '../../../core/rng';
import { clampToArena } from '../../arena/arena';
import type { DangerZoneSpec } from '../../combat/danger-zone';
import type { Boss } from '../../boss/boss';
import type { BossContext } from '../../boss/boss-context';
import { pick, type BossPattern, type ByPhase } from '../../boss/boss-definition';
import { enemyShot, schedule, spawnFan, spawnRing, startCharge } from '../../boss/pattern-kit';

/*
 * Gli schemi del colosso della fornace: pochi colpi, pesanti e molto segnalati. Le zone sono grandi e avvisano a
 * lungo, i proiettili sono pochi ma duri. Tutti i valori sono provvisori (vedi docs/game-design.md) e, dove cambiano
 * in furia (seconda fase), sono `{ normal, rage }`. Gli id degli schemi sono stabili: non rinominarli.
 */

const LABEL_COLOR = '#ff9a4a';
const LABEL_OFFSET_Y = -58;

// --- Martellata: una zona enorme sul giocatore e, allo scoppio, un anello di schegge -----------------------------

export const SLAM = {
  slams: { normal: 1, rage: 2 } satisfies ByPhase<number>,
  /** Secondi tra una martellata e la successiva (in furia): la seconda segue il giocatore dov'e' in quel momento. */
  slamInterval: 1.1,
  zone: { team: 'enemy', radius: 125, delay: 1.5, damage: 34, visual: 'forge_slam' } satisfies DangerZoneSpec,
  shrapnel: {
    count: { normal: 12, rage: 16 } satisfies ByPhase<number>,
    speed: { normal: 150, rage: 175 } satisfies ByPhase<number>,
    damage: 14,
    radius: 7,
    /** Rotazione dell'anello in radianti per secondo di partita, per cambiare la posizione dei varchi. */
    spinPerSecond: 0.3,
  },
};

/** Una martellata su `position`: la zona subito, l'anello di schegge quando la zona scoppia. */
function slamAt(boss: Boss, ctx: BossContext, position: Vec2): void {
  ctx.spawnZone(SLAM.zone, position);
  schedule(boss, SLAM.zone.delay, 'slam_ring', (actor, context) => {
    const { shrapnel } = SLAM;
    const spec = enemyShot(pick(shrapnel.speed, actor), shrapnel.damage, shrapnel.radius, 'forge_shrapnel');
    spawnRing(context, position, spec, pick(shrapnel.count, actor), context.time * shrapnel.spinPerSecond);
  });
}

export const HAMMER_SLAM: BossPattern = {
  id: 'hammer_slam',
  name: 'MARTELLATA',
  labelColor: LABEL_COLOR,
  labelOffsetY: LABEL_OFFSET_Y,
  execute(boss, ctx) {
    slamAt(boss, ctx, ctx.target);
    for (let i = 1; i < pick(SLAM.slams, boss); i++) {
      schedule(boss, i * SLAM.slamInterval, 'slam', (actor, context) => slamAt(actor, context, context.target));
    }
  },
};

// --- Linee di fusione: colonne parallele di zone che attraversano la mappa, ciascuna con un varco ----------------

export const LINES = {
  columns: { normal: 3, rage: 4 } satisfies ByPhase<number>,
  /** Distanza tra una colonna e la successiva: lascia una corsia libera tra l'una e l'altra. */
  columnSpacing: 360,
  /** Distanza tra i centri delle zone di una colonna e dai bordi della mappa. */
  zoneSpacing: 160,
  edgeOffset: 110,
  /** Quante zone mancano nel varco di ogni colonna: in furia il passaggio e' piu' stretto. */
  gapZones: { normal: 2, rage: 1 } satisfies ByPhase<number>,
  /** Ampiezza dello scostamento casuale del varco rispetto all'altezza del giocatore (raggiungibile entro il tempo di avviso). */
  gapSpread: 500,
  /** Avviso della colonna piu' vicina al boss e distanza di tempo tra una colonna e la successiva. */
  firstDelay: 1.5,
  columnDelayStep: { normal: 0.45, rage: 0.38 } satisfies ByPhase<number>,
  zone: { team: 'enemy', radius: 90, delay: 1.5, damage: 30, visual: 'forge_lava' } satisfies DangerZoneSpec,
};

/** Altezze delle zone di una colonna, dall'alto: dipendono solo dalla mappa. */
export function lineRows(arenaHeight: number): number[] {
  const rows: number[] = [];
  for (let y = LINES.edgeOffset; y <= arenaHeight - LINES.edgeOffset; y += LINES.zoneSpacing) rows.push(y);
  return rows;
}

export const MOLTEN_LINES: BossPattern = {
  id: 'molten_lines',
  name: 'LINEE DI FUSIONE',
  labelColor: LABEL_COLOR,
  labelOffsetY: LABEL_OFFSET_Y,
  execute(boss, ctx) {
    const arena = boss.arena;
    const rows = lineRows(arena.height);
    const columns = pick(LINES.columns, boss);
    const gapZones = pick(LINES.gapZones, boss);
    const step = pick(LINES.columnDelayStep, boss);
    // Colonne centrate sul giocatore, ordinate dalla piu' vicina al boss: la prima a scoppiare e' quella che ha davanti.
    const xs: number[] = [];
    for (let k = 0; k < columns; k++) xs.push(ctx.target.x + (k - (columns - 1) / 2) * LINES.columnSpacing);
    xs.sort((a, b) => Math.abs(a - boss.position.x) - Math.abs(b - boss.position.x));
    xs.forEach((x, order) => {
      // L'estrazione e' una per colonna, anche per quelle fuori mappa: l'ordine resta riproducibile con il seme.
      const gapY = ctx.target.y + centered(ctx.rng) * LINES.gapSpread;
      if (x < 0 || x > arena.width) return;
      // Il varco non tocca mai le zone dei bordi: resta sempre una fila piena sopra e sotto.
      const first = clamp(Math.round((gapY - LINES.edgeOffset) / LINES.zoneSpacing - (gapZones - 1) / 2), 1, rows.length - 1 - gapZones);
      const spec: DangerZoneSpec = { ...LINES.zone, delay: LINES.firstDelay + order * step };
      rows.forEach((y, row) => {
        if (row >= first && row < first + gapZones) return;
        ctx.spawnZone(spec, new Vec2(x, y));
      });
    });
  },
};

// --- Sbarramento di braci: raffiche veloci e mirate, una dopo l'altra ----------------------------------------------

export const BARRAGE = {
  bursts: { normal: 3, rage: 4 } satisfies ByPhase<number>,
  firstDelay: 0.7,
  burstInterval: 0.42,
  /** Un ventaglio stretto di 2 * half + 1 proiettili. */
  half: 1,
  spread: 0.1,
  speed: { normal: 330, rage: 380 } satisfies ByPhase<number>,
  damage: 13,
  radius: 6,
  /** Secondi di posa di lancio a ogni raffica. */
  firePose: 0.2,
};

function fireBurst(boss: Boss, ctx: BossContext): void {
  // Mira dove si trova il giocatore nel momento dello sparo (non dove si trovava all'inizio dell'attacco).
  const angle = boss.position.angleTo(ctx.target);
  const spec = enemyShot(pick(BARRAGE.speed, boss), BARRAGE.damage, BARRAGE.radius, 'forge_ember');
  spawnFan(ctx, boss.position, spec, angle, BARRAGE.half, BARRAGE.spread);
  ctx.emit({ type: 'boss_pose', seconds: BARRAGE.firePose });
}

export const EMBER_BARRAGE: BossPattern = {
  id: 'ember_barrage',
  name: 'SBARRAMENTO DI BRACI',
  labelColor: LABEL_COLOR,
  labelOffsetY: LABEL_OFFSET_Y,
  execute(boss) {
    for (let i = 0; i < pick(BARRAGE.bursts, boss); i++) {
      schedule(boss, BARRAGE.firstDelay + i * BARRAGE.burstInterval, 'barrage', fireBurst);
    }
  },
};

// --- Croce della fucina: bracci di zone che si allargano dal boss con un ritardo crescente -------------------------

export const CROSS = {
  arms: { normal: 4, rage: 8 } satisfies ByPhase<number>,
  zonesPerArm: 6,
  /** Distanza dal boss della prima zona di ogni braccio e tra una zona e la successiva. */
  firstDistance: 140,
  zoneSpacing: 150,
  /** Avviso della zona piu' vicina e aumento per ogni zona piu' lontana (l'onda si allarga dal boss). */
  firstDelay: 1.1,
  delayStep: { normal: 0.28, rage: 0.22 } satisfies ByPhase<number>,
  zone: { team: 'enemy', radius: 80, delay: 1.1, damage: 28, visual: 'forge_cross' } satisfies DangerZoneSpec,
};

export const FORGE_CROSS: BossPattern = {
  id: 'forge_cross',
  name: 'CROCE DELLA FUCINA',
  labelColor: LABEL_COLOR,
  labelOffsetY: LABEL_OFFSET_Y,
  execute(boss, ctx) {
    const arms = pick(CROSS.arms, boss);
    const step = pick(CROSS.delayStep, boss);
    const arena = boss.arena;
    // I bracci sono equidistanti; la croce intera ruota di un angolo a caso, cosi' non e' sempre allineata agli assi.
    const base = ctx.rng.next() * (TAU / arms);
    for (let arm = 0; arm < arms; arm++) {
      const angle = base + (arm * TAU) / arms;
      for (let i = 0; i < CROSS.zonesPerArm; i++) {
        const position = boss.position.add(Vec2.fromAngle(angle, CROSS.firstDistance + i * CROSS.zoneSpacing));
        // Le zone fuori dalla mappa non servono: il braccio si ferma al muro.
        if (position.x < 0 || position.x > arena.width || position.y < 0 || position.y > arena.height) continue;
        ctx.spawnZone({ ...CROSS.zone, delay: CROSS.firstDelay + i * step }, position);
      }
    }
  },
};

// --- Spirale del soffietto: bracci rotanti che respirano (la velocita' dei proiettili pulsa) ----------------------

export const BELLOWS = {
  arms: { normal: 2, rage: 3 } satisfies ByPhase<number>,
  volleys: { normal: 24, rage: 30 } satisfies ByPhase<number>,
  volleyInterval: { normal: 0.12, rage: 0.1 } satisfies ByPhase<number>,
  /** Rotazione tra una raffica e la successiva. */
  angleStep: 0.26,
  baseSpeed: 150,
  /** Il soffietto gonfia e sgonfia: la velocita' oscilla di questo valore attorno a quella base, con questo periodo (in raffiche). */
  pulseAmplitude: 55,
  pulsePeriod: 6,
  /** In furia la spirale inverte il senso di rotazione a meta'. */
  reverseAtHalf: { normal: false, rage: true } satisfies ByPhase<boolean>,
  damage: 11,
  radius: 5,
};

/** Quanti passi di rotazione ha fatto la spirale alla raffica `index` (con l'inversione, torna indietro dopo la meta'). */
export function bellowsTurns(index: number, volleys: number, reverse: boolean): number {
  const half = volleys / 2;
  return reverse && index > half ? 2 * half - index : index;
}

export function bellowsSpeed(index: number): number {
  return BELLOWS.baseSpeed + BELLOWS.pulseAmplitude * Math.sin((index * TAU) / BELLOWS.pulsePeriod);
}

function fireBellowsVolley(index: number, start: number, arms: number, volleys: number, reverse: boolean) {
  return (boss: Boss, ctx: BossContext): void => {
    const spec = enemyShot(bellowsSpeed(index), BELLOWS.damage, BELLOWS.radius, 'forge_bellows');
    spawnRing(ctx, boss.position, spec, arms, start + bellowsTurns(index, volleys, reverse) * BELLOWS.angleStep);
  };
}

export const BELLOWS_SPIRAL: BossPattern = {
  id: 'bellows_spiral',
  name: 'SPIRALE DEL SOFFIETTO',
  labelColor: LABEL_COLOR,
  labelOffsetY: LABEL_OFFSET_Y,
  execute(boss, ctx) {
    const start = boss.position.angleTo(ctx.target);
    const arms = pick(BELLOWS.arms, boss);
    const volleys = pick(BELLOWS.volleys, boss);
    const interval = pick(BELLOWS.volleyInterval, boss);
    const reverse = pick(BELLOWS.reverseAtHalf, boss);
    for (let i = 0; i < volleys; i++) {
      schedule(boss, i * interval, 'bellows', fireBellowsVolley(i, start, arms, volleys, reverse), start);
    }
  },
};

// --- Carica di ferro: lunga preparazione, scatto rapidissimo e onda d'urto all'arrivo ------------------------------

export const IRON_CHARGE_DATA = {
  windup: { normal: 1.5, rage: 1.25 } satisfies ByPhase<number>,
  /** Velocita' dello scatto in unita' al secondo: la durata dipende dalla distanza, entro questi limiti. */
  dashSpeed: 1500,
  minDuration: 0.3,
  maxDuration: 0.7,
  /** Secondi tra la fine della carica e l'onda d'urto (la carica e' certamente finita). */
  shockDelay: 0.05,
  shock: {
    count: { normal: 10, rage: 14 } satisfies ByPhase<number>,
    speed: 210,
    damage: 15,
    radius: 7,
  },
};

export const IRON_CHARGE: BossPattern = {
  id: 'iron_charge',
  name: 'CARICA DI FERRO · SPOSTATI!',
  labelColor: '#ffb177',
  labelOffsetY: LABEL_OFFSET_Y,
  execute(boss, ctx) {
    const data = IRON_CHARGE_DATA;
    const windup = pick(data.windup, boss);
    const distance = boss.position.distanceTo(clampToArena(boss.arena, ctx.target, boss.arena.bossMargin));
    const duration = clamp(distance / data.dashSpeed, data.minDuration, data.maxDuration);
    startCharge(boss, ctx, windup, duration);
    schedule(boss, windup + duration + data.shockDelay, 'charge_shock', (actor, context) => {
      const spec = enemyShot(data.shock.speed, data.shock.damage, data.shock.radius, 'forge_shock');
      spawnRing(context, actor.position, spec, pick(data.shock.count, actor), 0);
    });
  },
};
