import { centered } from '../../core/rng';
import { TAU, Vec2 } from '../../core/vec2';
import { clampToArena, pushOutOfPillars } from '../arena/arena';
import { pick, type BossDefinition, type BossPattern, type BossStats, type ByPhase } from '../boss/boss-definition';
import type { DangerZoneSpec } from '../combat/danger-zone';
import { enemyShot, pointAround, schedule, spawnFan, spawnRing, startCharge } from '../boss/pattern-kit';
import { CHOIR_GHOST, CRYPT_RAT } from '../minions/catalog/crypt-veins';
import { DAMNED_MINER, FLYING_BLADE } from '../minions/catalog/forge-veins';
import { ERMINE, FROST_HOMUNCULUS } from '../minions/catalog/glacier-veins';
import { INFESTED_ANT, LEECH } from '../minions/catalog/swamp-veins';
import type { VeinId } from '../minions/minion-catalog';

/*
 * I luogotenenti delle vene B e C (fase 8 dello studio sulla grafica, facoltativa): uno per vena, con due schemi del boss
 * che la vena porta in versione fedele e un terzo suo. Prendono il posto del luogotenente di sempre quando la vena
 * profonda della discesa e' la loro; in furia chiamano la folla della loro vena. Valori provvisori, sulla scala dei
 * luogotenenti di sempre dello stesso dungeon.
 */

const baseStats = (overrides: Partial<BossStats> & Pick<BossStats, 'maxHealth' | 'speed' | 'hitRadius'>): BossStats => ({
  phaseTwoThreshold: 0.5,
  slowedSpeed: overrides.speed * 0.35,
  orbitDistance: 170,
  orbitSpeedFactor: 0.4,
  firstAttackDelay: 1.6,
  attackInterval: { normal: 2.1, rage: 1.65 },
  attackPose: 0.5,
  contactDistance: overrides.hitRadius + 4,
  contactDamage: 14,
  chargeDamage: 20,
  chargeHitDistance: overrides.hitRadius + 10,
  ...overrides,
});

const zone = (radius: number, delay: number, damage: number, visual: string, extra: Partial<DangerZoneSpec> = {}): DangerZoneSpec => ({ team: 'enemy', radius, delay, damage, visual, ...extra });

/** Una fila di zone dal luogotenente verso il bersaglio, che scoppiano una dopo l'altra (la FRATTURA, le LANCE). */
function zoneLine(boss: Parameters<BossPattern['execute']>[0], ctx: Parameters<BossPattern['execute']>[1], spec: DangerZoneSpec, count: number, spacing: number, width = 1): void {
  const direction = Vec2.fromAngle(boss.position.angleTo(ctx.target));
  const across = new Vec2(-direction.y, direction.x);
  for (let i = 1; i <= count; i++) {
    for (let row = 0; row < width; row++) {
      const offset = (row - (width - 1) / 2) * spec.radius * 1.8 * (0.6 + (0.4 * i) / count);
      const point = boss.position.add(direction.mul(spacing * i)).add(across.mul(offset));
      ctx.spawnZone({ ...spec, delay: spec.delay + i * 0.08 }, clampToArena(boss.arena, point, boss.arena.bossMargin));
    }
  }
}

// --- Cripta, Catacombe: il Gran Becchino ------------------------------------------------------------------------

const GRAVE_FRACTURE: BossPattern = {
  id: 'grave_fracture',
  name: 'FRATTURA',
  labelColor: '#c8f0d0',
  labelOffsetY: -44,
  execute(boss, ctx) {
    zoneLine(boss, ctx, zone(34, 0.8, 16, 'crypt_spade'), boss.isEnraged ? 9 : 7, 58);
  },
};

const GRAVE_RUSH: BossPattern = {
  id: 'grave_rush',
  name: 'CARICA · SPOSTATI!',
  labelColor: '#ffb177',
  labelOffsetY: -44,
  execute(boss, ctx) {
    startCharge(boss, ctx, 0.9, 0.45);
  },
};

const BURIAL_SOIL = { zones: { normal: 3, rage: 5 } satisfies ByPhase<number>, spread: 220 };

const BURIAL_SOIL_PATTERN: BossPattern = {
  id: 'burial_soil',
  name: 'TERRA DI SEPOLTURA',
  labelColor: '#9fe0b0',
  labelOffsetY: -44,
  execute(boss, ctx) {
    for (let i = 0; i < pick(BURIAL_SOIL.zones, boss); i++) {
      const offset = i === 0 ? Vec2.ZERO : new Vec2(centered(ctx.rng) * BURIAL_SOIL.spread, centered(ctx.rng) * BURIAL_SOIL.spread);
      ctx.spawnZone(zone(46, 1.1, 16, 'crypt_grave_dirt'), clampToArena(boss.arena, ctx.target.add(offset), boss.arena.bossMargin));
    }
  },
};

export const GRAND_GRAVEDIGGER: BossDefinition = {
  id: 'grand_gravedigger',
  name: 'GRAN BECCHINO',
  art: 'grand_gravedigger',
  rageText: 'IL GRAN BECCHINO SCAVA PIÙ A FONDO',
  stats: baseStats({ maxHealth: 820, speed: 85, hitRadius: 24, contactDamage: 14, chargeDamage: 20 }),
  patterns: [GRAVE_FRACTURE, BURIAL_SOIL_PATTERN, GRAVE_RUSH],
  summons: { minion: CRYPT_RAT, onRage: 5, everyAttacks: 4, wave: 3, maxAlive: 8, ringRadius: 70 },
};

// --- Cripta, Cantoria: il Maestro dell'organo -------------------------------------------------------------------

const ORGAN_SPIRAL: BossPattern = {
  id: 'organ_spiral',
  name: 'SPIRALE DEL VUOTO',
  labelColor: '#c9a6ff',
  labelOffsetY: -46,
  execute(boss, ctx) {
    const bursts = boss.isEnraged ? 14 : 10;
    const start = ctx.time;
    for (let i = 0; i < bursts; i++) {
      schedule(boss, i * 0.12, 'organ_note', (actor, c) => spawnRing(c, actor.position, enemyShot(125, 11, 5, 'crypt_organ_note', 3.5), 4, start + i * 0.3));
    }
  },
};

const CHOIR_FANS: BossPattern = {
  id: 'choir_fans',
  name: 'TRIPLICE VENTAGLIO',
  labelColor: '#f6e6c0',
  labelOffsetY: -46,
  execute(boss, _ctx) {
    for (let verse = 0; verse < 3; verse++) {
      schedule(boss, verse * 0.32, 'verse', (actor, c) => {
        spawnFan(c, actor.position, enemyShot(150, 11, 5, 'crypt_cantor_note'), actor.position.angleTo(c.target) + (verse - 1) * 0.12, 2, 0.2);
      });
    }
  },
};

const CHORD: BossPattern = {
  id: 'chord',
  name: 'ACCORDO',
  labelColor: '#f0d0ff',
  labelOffsetY: -46,
  execute(boss, ctx) {
    // Un anello con un varco verso il bersaglio: chi lo vede ci entra.
    const aim = boss.position.angleTo(ctx.target);
    const count = boss.isEnraged ? 20 : 16;
    for (let i = 0; i < count; i++) {
      if (Math.min(i, count - i) < 2) continue;
      ctx.spawnProjectile(enemyShot(110, 11, 5, 'crypt_stall_note', 4), boss.position, aim + (i * TAU) / count);
    }
  },
};

export const ORGAN_MASTER: BossDefinition = {
  id: 'organ_master',
  name: "MAESTRO DELL'ORGANO",
  art: 'organ_master',
  rageText: "IL MAESTRO DELL'ORGANO APRE TUTTI I REGISTRI",
  stats: baseStats({ maxHealth: 780, speed: 70, hitRadius: 22, contactDamage: 14, chargeDamage: 20, orbitDistance: 220 }),
  patterns: [CHOIR_FANS, ORGAN_SPIRAL, CHORD],
  summons: { minion: CHOIR_GHOST, onRage: 4, everyAttacks: 4, wave: 3, maxAlive: 6, ringRadius: 70 },
};

// --- Palude, Sommersi: la Lavandaia maggiore --------------------------------------------------------------------

const MUD_RING: BossPattern = {
  id: 'mud_ring',
  name: 'ANELLO DI MELMA',
  labelColor: '#dcc0ff',
  labelOffsetY: -46,
  execute(boss, ctx) {
    const count = boss.isEnraged ? 14 : 12;
    const phase = ctx.rng.next() * TAU;
    for (let i = 0; i < count; i++) {
      const point = clampToArena(boss.arena, ctx.target.add(Vec2.fromAngle(phase + (i * TAU) / count, 130)), boss.arena.bossMargin);
      ctx.spawnZone(zone(34, 1.1, 16, 'swamp_washer_ring', { slowSeconds: 1 }), point);
    }
  },
};

const SPORE_CLOUD: BossPattern = {
  id: 'spore_cloud',
  name: 'NUVOLA DI SPORE',
  labelColor: '#d8a0ff',
  labelOffsetY: -46,
  execute(boss, ctx) {
    const aim = boss.position.angleTo(ctx.target);
    const count = 20;
    for (let i = 0; i < count; i++) {
      if (Math.min(i, count - i) < 2) continue;
      ctx.spawnProjectile(enemyShot(boss.isEnraged ? 85 : 70, 11, 6, 'swamp_lily_seed', 6), boss.position, aim + (i * TAU) / count + ctx.time * 0.3);
    }
  },
};

const BLACK_WATER: BossPattern = {
  id: 'black_water',
  name: 'ACQUA NERA',
  labelColor: '#b8d8ff',
  labelOffsetY: -46,
  execute(boss, ctx) {
    spawnFan(ctx, boss.position, enemyShot(95, 12, 8, 'crypt_tear', 5), boss.position.angleTo(ctx.target), boss.isEnraged ? 2 : 1, 0.28);
  },
};

export const ELDER_WASHER: BossDefinition = {
  id: 'elder_washer',
  name: 'LAVANDAIA MAGGIORE',
  art: 'elder_washer',
  rageText: 'LA LAVANDAIA MAGGIORE STRIZZA LA PALUDE',
  stats: baseStats({ maxHealth: 980, speed: 75, hitRadius: 24, contactDamage: 15, chargeDamage: 20, orbitDistance: 230 }),
  patterns: [BLACK_WATER, MUD_RING, SPORE_CLOUD],
  summons: { minion: LEECH, onRage: 5, everyAttacks: 4, wave: 3, maxAlive: 8, ringRadius: 80 },
};

// --- Palude, Colonia: la Regina della colonia -------------------------------------------------------------------

const SPORE_RAIN = { zones: { normal: 5, rage: 7 } satisfies ByPhase<number>, spread: 300 };

const COLONY_RAIN: BossPattern = {
  id: 'colony_rain',
  name: 'PIOGGIA DI SPORE',
  labelColor: '#e6f56a',
  labelOffsetY: -44,
  execute(boss, ctx) {
    for (let i = 0; i < pick(SPORE_RAIN.zones, boss); i++) {
      const offset = i === 0 ? Vec2.ZERO : new Vec2(centered(ctx.rng) * SPORE_RAIN.spread, centered(ctx.rng) * SPORE_RAIN.spread);
      ctx.spawnZone(zone(42, 1.2, 16, 'swamp_beetle_spray'), clampToArena(boss.arena, ctx.target.add(offset), boss.arena.bossMargin));
    }
  },
};

const COLONY_SIEGE: BossPattern = {
  id: 'colony_siege',
  name: 'ACCERCHIAMENTO',
  labelColor: '#f0d8ff',
  labelOffsetY: -44,
  execute(boss, ctx) {
    // Colpi su un cerchio attorno al bersaglio che si stringono, con un varco a caso.
    const count = boss.isEnraged ? 20 : 16;
    const phase = ctx.rng.next() * TAU;
    const gapAt = Math.floor(ctx.rng.next() * count);
    for (let i = 0; i < count; i++) {
      if (Math.min(Math.abs(i - gapAt), count - Math.abs(i - gapAt)) < 2) continue;
      const point = clampToArena(boss.arena, ctx.target.add(Vec2.fromAngle(phase + (i * TAU) / count, 230)), boss.arena.projectileMargin + 4);
      ctx.spawnProjectile(enemyShot(95, 11, 5, 'swamp_web', 2.6), point, point.angleTo(ctx.target));
    }
  },
};

const SWARM_LUNGE: BossPattern = {
  id: 'swarm_lunge',
  name: 'SCIAME · SPOSTATI!',
  labelColor: '#cddc58',
  labelOffsetY: -44,
  execute(boss, ctx) {
    startCharge(boss, ctx, 0.85, 0.45);
  },
};

export const COLONY_QUEEN: BossDefinition = {
  id: 'colony_queen',
  name: 'REGINA DELLA COLONIA',
  art: 'colony_queen',
  rageText: 'LA REGINA DELLA COLONIA CHIAMA LO SCIAME',
  stats: baseStats({ maxHealth: 1020, speed: 72, hitRadius: 28, contactDamage: 16, chargeDamage: 22 }),
  patterns: [COLONY_RAIN, COLONY_SIEGE, SWARM_LUNGE],
  summons: { minion: INFESTED_ANT, onRage: 5, everyAttacks: 4, wave: 3, maxAlive: 8, ringRadius: 80 },
};

// --- Fucina, Armeria: il Campione vuoto -------------------------------------------------------------------------

const IRON_CHARGE: BossPattern = {
  id: 'iron_charge',
  name: 'CARICA DI FERRO · SPOSTATI!',
  labelColor: '#c8a0ff',
  labelOffsetY: -48,
  execute(boss, ctx) {
    const windup = 0.8;
    const duration = 0.55;
    startCharge(boss, ctx, windup, duration);
    // A fine corsa l'armatura si scuote: un anello di schegge.
    schedule(boss, windup + duration, 'armor_shards', (actor, c) => spawnRing(c, actor.position, enemyShot(130, 11, 5, 'forge_armor_shard', 2.6), actor.isEnraged ? 14 : 10, c.time));
  },
};

const BOLT_BARRAGE: BossPattern = {
  id: 'bolt_barrage',
  name: 'SBARRAMENTO DI BRACI',
  labelColor: '#f0e8ff',
  labelOffsetY: -48,
  execute(boss, _ctx) {
    const volleys = boss.isEnraged ? 4 : 3;
    for (let v = 0; v < volleys; v++) {
      schedule(boss, v * 0.25, 'bolts', (actor, c) => spawnFan(c, actor.position, enemyShot(280, 11, 4, 'forge_crossbow_bolt'), actor.position.angleTo(c.target), 2, 0.14));
    }
  },
};

const BLADE_WHEEL: BossPattern = {
  id: 'blade_wheel',
  name: 'RUOTA DI LAME',
  labelColor: '#d8d8e8',
  labelOffsetY: -48,
  execute(boss, ctx) {
    spawnRing(ctx, boss.position, enemyShot(140, 11, 5, 'forge_flail_link', 3), boss.isEnraged ? 12 : 8, ctx.time);
  },
};

export const HOLLOW_CHAMPION: BossDefinition = {
  id: 'hollow_champion',
  name: 'CAMPIONE VUOTO',
  art: 'hollow_champion',
  rageText: 'IL CAMPIONE VUOTO ALZA LO SPADONE',
  stats: baseStats({ maxHealth: 1120, speed: 80, hitRadius: 28, contactDamage: 18, chargeDamage: 24 }),
  patterns: [BOLT_BARRAGE, IRON_CHARGE, BLADE_WHEEL],
  summons: { minion: FLYING_BLADE, onRage: 4, everyAttacks: 4, wave: 3, maxAlive: 6, ringRadius: 90 },
};

// --- Fucina, Miniera: il Caposquadra di ferro -------------------------------------------------------------------

const ORE_HAMMER: BossPattern = {
  id: 'ore_hammer',
  name: 'MARTELLATA',
  labelColor: '#e8e4f0',
  labelOffsetY: -48,
  execute(boss, ctx) {
    const point = clampToArena(boss.arena, ctx.target, boss.arena.bossMargin);
    const slam = zone(70, 1, 20, 'forge_ore_slam');
    ctx.spawnZone(slam, point);
    schedule(boss, slam.delay, 'ore_shards', (_actor, c) => spawnRing(c, point, enemyShot(150, 10, 5, 'forge_ore_shard', 2.4), 12, c.time));
  },
};

const BLAST_CROSS: BossPattern = {
  id: 'blast_cross',
  name: 'CROCE DELLA FUCINA',
  labelColor: '#e8e4f0',
  labelOffsetY: -48,
  execute(boss, ctx) {
    const arms = boss.isEnraged ? 4 : 3;
    const spec = zone(30, 0.9, 16, 'forge_blast_cross');
    const base = boss.position.angleTo(ctx.target);
    ctx.spawnZone(spec, clampToArena(boss.arena, ctx.target, boss.arena.bossMargin));
    for (let arm = 0; arm < 4; arm++) {
      const direction = Vec2.fromAngle(base + (arm * Math.PI) / 2);
      for (let i = 1; i <= arms; i++) {
        ctx.spawnZone({ ...spec, delay: spec.delay + i * 0.15 }, clampToArena(boss.arena, ctx.target.add(direction.mul(spec.radius * 1.7 * i)), boss.arena.bossMargin));
      }
    }
  },
};

const MINE_LINE: BossPattern = {
  id: 'mine_line',
  name: 'MINA',
  labelColor: '#f0e8ff',
  labelOffsetY: -48,
  execute(boss, ctx) {
    zoneLine(boss, ctx, zone(30, 0.9, 16, 'forge_mole_line'), boss.isEnraged ? 8 : 6, 60);
  },
};

export const IRON_FOREMAN: BossDefinition = {
  id: 'iron_foreman',
  name: 'CAPOSQUADRA DI FERRO',
  art: 'iron_foreman',
  rageText: 'IL CAPOSQUADRA DI FERRO ACCENDE TUTTE LE MICCE',
  stats: baseStats({ maxHealth: 1150, speed: 65, hitRadius: 30, contactDamage: 18, chargeDamage: 24 }),
  patterns: [ORE_HAMMER, BLAST_CROSS, MINE_LINE],
  summons: { minion: DAMNED_MINER, onRage: 4, everyAttacks: 4, wave: 2, maxAlive: 6, ringRadius: 90 },
};

// --- Ghiacciaio, Tana del gelo: l'Orsa madre --------------------------------------------------------------------

const BEAR_NOVA: BossPattern = {
  id: 'bear_nova',
  name: 'NOVA GELIDA',
  labelColor: '#d6c4ff',
  labelOffsetY: -42,
  execute(boss, ctx) {
    spawnRing(ctx, boss.position, enemyShot(120, 11, 5, 'glacier_bear_roar', 3), 14, ctx.time);
    schedule(boss, 0.4, 'second_roar', (actor, c) => spawnRing(c, actor.position, enemyShot(150, 11, 5, 'glacier_bear_roar', 3), 14, c.time + Math.PI / 14));
  },
};

const FEATHER_SHARDS: BossPattern = {
  id: 'feather_shards',
  name: 'SCHEGGE',
  labelColor: '#e8fbff',
  labelOffsetY: -42,
  execute(boss, ctx) {
    spawnFan(ctx, boss.position, enemyShot(boss.isEnraged ? 210 : 185, 12, 4, 'glacier_owl_feather', 3), boss.position.angleTo(ctx.target), 3, 0.11);
  },
};

const DEN_RUSH: BossPattern = {
  id: 'den_rush',
  name: 'ASSALTO · SPOSTATI!',
  labelColor: '#ffb177',
  labelOffsetY: -42,
  execute(boss, ctx) {
    startCharge(boss, ctx, 0.9, 0.5);
  },
};

export const MOTHER_BEAR: BossDefinition = {
  id: 'mother_bear',
  name: 'ORSA MADRE',
  art: 'mother_bear',
  rageText: "L'ORSA MADRE DIFENDE LA TANA",
  stats: baseStats({ maxHealth: 1200, speed: 85, hitRadius: 30, contactDamage: 18, chargeDamage: 24 }),
  patterns: [FEATHER_SHARDS, BEAR_NOVA, DEN_RUSH],
  summons: { minion: ERMINE, onRage: 5, everyAttacks: 4, wave: 3, maxAlive: 8, ringRadius: 80 },
};

// --- Ghiacciaio, Osservatorio: l'Astronomo ----------------------------------------------------------------------

const STAR_BLIZZARD: BossPattern = {
  id: 'star_blizzard',
  name: 'BUFERA',
  labelColor: '#eaf8ff',
  labelOffsetY: -42,
  execute(boss, ctx) {
    // Due bracci di stelle che girano in versi opposti.
    const bursts = boss.isEnraged ? 14 : 10;
    const start = ctx.time;
    for (let i = 0; i < bursts; i++) {
      schedule(boss, i * 0.12, 'stars', (actor, c) => {
        for (const sign of [1, -1]) spawnRing(c, actor.position, enemyShot(115, 10, 4, 'glacier_star', 3.2), 3, start + sign * i * 0.35);
      });
    }
  },
};

const STAR_LANCES: BossPattern = {
  id: 'star_lances',
  name: 'LANCE DI GHIACCIO',
  labelColor: '#bfefff',
  labelOffsetY: -42,
  execute(boss, ctx) {
    zoneLine(boss, ctx, zone(28, 0.9, 16, 'glacier_star_lance'), boss.isEnraged ? 6 : 5, 70, 3);
  },
};

const STAR_STEP: BossPattern = {
  id: 'star_step',
  name: 'PASSO TRA LE STELLE',
  labelColor: '#d6c4ff',
  labelOffsetY: -42,
  execute(boss, ctx) {
    const raw = pointAround(boss, ctx.target, ctx.rng.next() * TAU, 320);
    const to = pushOutOfPillars(boss.arena, raw, boss.stats.hitRadius);
    const from = boss.position;
    boss.position = to;
    ctx.emit({ type: 'boss_teleported', from, to });
    schedule(boss, 0.35, 'star_fan', (actor, c) => spawnFan(c, actor.position, enemyShot(165, 11, 5, 'glacier_fox_bite'), actor.position.angleTo(c.target), 2, 0.16));
  },
};

export const ASTRONOMER: BossDefinition = {
  id: 'astronomer',
  name: 'ASTRONOMO',
  art: 'astronomer',
  rageText: "L'ASTRONOMO RUOTA LA VOLTA CELESTE",
  stats: baseStats({ maxHealth: 1150, speed: 110, hitRadius: 22, contactDamage: 14, chargeDamage: 20, orbitDistance: 230 }),
  patterns: [STAR_LANCES, STAR_STEP, STAR_BLIZZARD],
  summons: { minion: FROST_HOMUNCULUS, onRage: 5, everyAttacks: 4, wave: 3, maxAlive: 8, ringRadius: 80 },
};

/** Il luogotenente di ogni vena nuova, per dungeon. */
export const VEIN_LIEUTENANTS: Readonly<Record<string, Readonly<Record<Exclude<VeinId, 'a'>, BossDefinition>>>> = {
  crypt: { b: GRAND_GRAVEDIGGER, c: ORGAN_MASTER },
  swamp: { b: ELDER_WASHER, c: COLONY_QUEEN },
  forge: { b: HOLLOW_CHAMPION, c: IRON_FOREMAN },
  glacier: { b: MOTHER_BEAR, c: ASTRONOMER },
};
