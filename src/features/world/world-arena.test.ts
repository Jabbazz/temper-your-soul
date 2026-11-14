import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import { STEP, holding, intent, run } from '../../testing';
import { chasmAt, pillarAt, pushOutOfPillars, sightBlocked, solidAt, sweepSolids } from '../arena/arena';
import { BODY_RADIUS } from '../combat/collision';
import { CRYPT } from '../dungeons/crypt';
import { Match } from '../match/match';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { WORLD_ARENA, worldArena } from './world-arena';
import type { Encounter } from '../match/encounter';
import { TERRAIN_WALKABLE, WORLD } from './world-definition';
import { WorldMap } from './world-map';
import { WORLD_OBSTACLE_KINDS, type WorldObstacle } from './world-obstacles';

const world = new WorldMap();
const arena = worldArena(world);
const BODY = BODY_RADIUS.player;
/** Un incontro senza traguardo e senza nemici: qui si provano solo mappa e collisioni. */
const QUIET: Encounter = { attach: () => undefined, step: () => undefined, onBossDefeated: () => undefined };
const createWorldMatch = (): Match => new Match({
  rng: new SeededRng(7), dungeon: { ...CRYPT, id: arena.id, name: arena.name, arena }, arena, boss: null,
  encounter: QUIET, loadout: MAGE_SKILLS,
});

/** Il primo ostacolo sparso di quel tipo con spazio libero a ovest, cercato nei blocchi attorno alla partenza. */
function findObstacle(kind: 'oak' | 'bush' | 'boulder' | 'dead_tree' | 'moor_rock', gap: number): WorldObstacle {
  for (let cy = 0; cy < 6; cy++) for (let cx = 12; cx < 20; cx++) for (const obstacle of world.chunk(cx, cy).obstacles) {
    if (obstacle.kind !== kind) continue;
    let free = true;
    for (let d = WORLD_OBSTACLE_KINDS[kind].shape.radius + BODY + 2; d <= gap && free; d += 4) free = !world.blocked(new Vec2(obstacle.x - d, obstacle.y), BODY);
    if (free) return obstacle;
  }
  throw new Error(`nessun ${kind} adatto`);
}

/**
 * Un tratto di mura orizzontali con prato libero subito a nord: il punto sul bordo nord del suo appoggio in
 * prospettiva, appena dentro. La sommità disegnata sta più su e lì si passa.
 */
function findWallTop(): Vec2 {
  const isWall = (vx: number, vy: number): boolean => world.generator.terrainAtVertex(vx, vy) === 'wall';
  for (let vy = 24; vy < 200; vy += WORLD.ruins.grid) for (let vx = 690; vx < 1000; vx++) {
    if (isWall(vx, vy) && isWall(vx - 1, vy) && isWall(vx + 1, vy) && !isWall(vx, vy - 1) && !world.blocked(new Vec2(vx * 32, vy * 32 - 60), BODY)) {
      return new Vec2(vx * 32, vy * 32 - 16 + WORLD.walls.rise + 1);
    }
  }
  throw new Error('nessun tratto di mura adatto');
}

describe('mondo aperto come mappa di una partita', () => {
  it('gli ostacoli del mondo parlano la lingua delle arene', () => {
    const oak = findObstacle('oak', 40), oakAt = new Vec2(oak.x, oak.y);
    expect(pillarAt(arena, oakAt)?.radius).toBe(WORLD_OBSTACLE_KINDS.oak.shape.radius);
    expect(pushOutOfPillars(arena, new Vec2(oak.x - 3, oak.y), BODY).distanceTo(oakAt)).toBeCloseTo(WORLD_OBSTACLE_KINDS.oak.shape.radius + BODY, 5);

    const wall = findWallTop();
    expect(solidAt(arena, wall)).toBeDefined();
    expect(chasmAt(arena, wall)).toBeUndefined();
    // Le mura fermano la vista e lo scatto; un punto libero accanto non è toccato.
    expect(sightBlocked(arena, new Vec2(wall.x, wall.y - 60), new Vec2(wall.x, wall.y + 120))).toBe(true);
    expect(sweepSolids(arena, new Vec2(wall.x, wall.y - 60), new Vec2(wall.x, wall.y + 120), BODY).y).toBeLessThanOrEqual(wall.y - 1 - BODY + 0.01);
    expect(solidAt(arena, new Vec2(wall.x, wall.y - 60))).toBeUndefined();

    // L'acqua è un pozzo: ferma chi cammina, non la vista né i colpi.
    const water = new Vec2(32, 100 * 32);
    expect(world.terrainAt(water.x, water.y)).toBe('water');
    expect(chasmAt(arena, water)).toBeDefined();
    expect(solidAt(arena, water)).toBeUndefined();
    expect(sightBlocked(arena, water, new Vec2(water.x + 64, water.y))).toBe(false);
  });

  it('la partita dei dungeon gira sul mondo: si cammina, non finisce da sola', () => {
    const match = createWorldMatch();
    expect(match.boss).toBeNull();
    expect(match.player.position.equals(arena.playerSpawn)).toBe(true);
    const start = match.player.position;
    run(match, 2, (m) => intent(m, { move: new Vec2(0, 1) }));
    expect(match.player.position.y - start.y).toBeGreaterThan(200);
    run(match, 10);
    expect(match.status).toBe('playing');
    // Verso nord si arriva al bordo della mappa senza uscirne.
    run(match, 8, (m) => intent(m, { move: new Vec2(0, -1) }));
    expect(match.player.position.y).toBeGreaterThanOrEqual(WORLD_ARENA.playerMargin);
    expect(world.blocked(match.player.position, BODY - 0.5)).toBe(false);
  });

  it('mura e acqua fermano il giocatore della partita', () => {
    const match = createWorldMatch(), wall = findWallTop();
    match.player.position = new Vec2(wall.x, wall.y - 60);
    run(match, 2, (m) => intent(m, { move: new Vec2(0, 1) }));
    expect(match.player.position.y).toBeLessThanOrEqual(wall.y - 1 - BODY + 0.01);
    expect(match.player.position.y).toBeGreaterThan(wall.y - 1 - BODY - 6);

    let firstLand = 0;
    while (!TERRAIN_WALKABLE[world.terrainAt(firstLand * 32, 100 * 32)]) firstLand++;
    match.player.position = new Vec2(firstLand * 32 + 14, 100 * 32);
    run(match, 2, (m) => intent(m, { move: new Vec2(-1, 0) }));
    expect(TERRAIN_WALKABLE[world.terrainAt(match.player.position.x, match.player.position.y)]).toBe(true);
    expect(match.player.position.x).toBeGreaterThanOrEqual(firstLand * 32 - 16 + BODY - 0.01);
  });

  it('un albero ferma i colpi del giocatore', () => {
    const match = createWorldMatch(), oak = findObstacle('oak', 120);
    match.player.position = new Vec2(oak.x - 120, oak.y);
    const aim = new Vec2(oak.x + 400, oak.y);
    let fired = 0, passed = 0;
    for (let i = 0; i < 180; i++) {
      match.step(STEP, holding(match, [0], { aim }));
      fired = Math.max(fired, match.projectiles.filter((projectile) => projectile.team !== 'enemy').length);
      passed += match.projectiles.filter((projectile) => projectile.team !== 'enemy' && projectile.position.x > oak.x + WORLD_OBSTACLE_KINDS.oak.shape.radius + 12).length;
    }
    expect(fired).toBeGreaterThan(0);
    expect(passed).toBe(0);
  });
});
