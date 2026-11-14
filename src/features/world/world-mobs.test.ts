import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import { run } from '../../testing';
import { NAV_FIELD, NavGrid } from '../arena/nav-field';
import { BODY_RADIUS } from '../combat/collision';
import { CRYPT } from '../dungeons/crypt';
import type { Encounter } from '../match/encounter';
import { Match } from '../match/match';
import { MINIONS, SPORELING } from '../minions/minion-catalog';
import { MINION_ROAM } from '../minions/minion-ai';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { worldArena } from './world-arena';
import { WORLD } from './world-definition';
import { WorldMap } from './world-map';
import { WORLD_MOBS, WorldEncounter, composeGroup } from './world-mobs';

const world = new WorldMap();
const arena = worldArena(world);
const BODY = BODY_RADIUS.player;
const createMatch = (encounter: Encounter, seed = 11): Match => new Match({
  rng: new SeededRng(seed), dungeon: { ...CRYPT, id: arena.id, name: arena.name, arena }, arena, boss: null, encounter, loadout: MAGE_SKILLS,
});
/** Un punto del Bosco Verde lontano dalla partenza e dalle rovine. */
const MEADOW = world.freePointNear(new Vec2(300 * WORLD.tile, 120 * WORLD.tile), BODY);
/** Un punto lontanissimo da MEADOW, dove nessuna regione di MEADOW resta attiva. */
const ELSEWHERE = world.freePointNear(new Vec2(300 * WORLD.tile, 420 * WORLD.tile), BODY);

describe('mondo aperto: nemici', () => {
  it('ogni fascia ha nemici che esistono, a sud più forti, più fitti e più pagati', () => {
    for (const biome of WORLD.biomes) {
      for (const entry of [...biome.mobs.pool, ...biome.mobs.ruins]) {
        expect(MINIONS[entry.minion], `${biome.id}: ${entry.minion}`).toBeDefined();
        // Nel mondo nessuno vola: tutti rispettano le collisioni come il giocatore.
        expect(MINIONS[entry.minion]!.flying ?? false, `${entry.minion} vola`).toBe(false);
      }
      // Il gruppo più frequente è di tre.
      expect(biome.mobs.groupSizes.indexOf(Math.max(...biome.mobs.groupSizes))).toBe(2);
    }
    const [north, south] = WORLD.biomes;
    expect(south!.mobs.healthScale).toBeGreaterThan(north!.mobs.healthScale);
    expect(south!.mobs.reward.xp).toBeGreaterThan(north!.mobs.reward.xp);
    expect(south!.mobs.perRegion).toBeGreaterThanOrEqual(north!.mobs.perRegion);
  });

  it('i gruppi sono vari: di solito tre, a volte da soli o in tanti, misti ma non a caso puro', () => {
    const rng = new SeededRng(3), sizes = new Map<number, number>(), kinds = new Set<string>();
    let mixed = 0;
    for (let i = 0; i < 400; i++) {
      const group = composeGroup(world, MEADOW, rng);
      expect(group.biome.id).toBe('greenwood');
      expect(group.ruins).toBe(false);
      sizes.set(group.members.length, (sizes.get(group.members.length) ?? 0) + 1);
      for (const member of group.members) {
        expect(group.biome.mobs.pool.some((entry) => entry.minion === member.id)).toBe(true);
        kinds.add(member.id);
      }
      if (new Set(group.members.map((member) => member.id)).size > 1) mixed++;
    }
    expect([...sizes.keys()].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(Math.max(...sizes.values())).toBe(sizes.get(3));
    expect(kinds.size).toBe(WORLD.biomes[0]!.mobs.pool.length);
    expect(mixed).toBeGreaterThan(80);
    expect(mixed).toBeLessThan(330);
    // Stesso seme, stessi gruppi.
    const a = new SeededRng(9), b = new SeededRng(9);
    for (let i = 0; i < 20; i++) expect(composeGroup(world, MEADOW, a).members.map((m) => m.id)).toEqual(composeGroup(world, MEADOW, b).members.map((m) => m.id));
  });

  it('fra le rovine nascono i nemici delle rovine', () => {
    const isWall = (vx: number, vy: number): boolean => world.vertexTerrain(vx, vy) === 'wall';
    let ruin: Vec2 | null = null;
    for (let vy = 24; vy < 200 && ruin === null; vy++) for (let vx = 690; vx < 1000 && ruin === null; vx++) if (isWall(vx, vy) && !isWall(vx, vy + 3)) ruin = world.freePointNear(new Vec2(vx * 32, (vy + 3) * 32), 16);
    const group = composeGroup(world, ruin!, new SeededRng(1));
    expect(group.ruins).toBe(true);
    for (const member of group.members) expect(group.biome.mobs.ruins.some((entry) => entry.minion === member.id)).toBe(true);
  });

  it('le regioni attorno al giocatore si popolano fuori vista, mai attorno alla partenza', () => {
    const match = createMatch(new WorldEncounter(world));
    run(match, 1);
    const start = new Vec2(world.width / 2, WORLD.spawn.row * WORLD.tile);
    for (const minion of match.minions) expect(minion.position.distanceTo(start)).toBeGreaterThan(WORLD_MOBS.safeRadius - WORLD_MOBS.groupSpread - 40);

    match.player.position = MEADOW;
    run(match, 0.5);
    const born = match.minions.filter((minion) => minion.position.distanceTo(MEADOW) < WORLD_MOBS.activateRadius + 300);
    // Più regioni, ognuna con qualche gruppo: ben più di un branco da tre.
    expect(born.length).toBeGreaterThan(12);
    expect(match.minions.length).toBeLessThanOrEqual(WORLD_MOBS.maxAlive);
    for (const minion of born) {
      expect(minion.position.distanceTo(MEADOW)).toBeGreaterThan(WORLD_MOBS.minSpawnDistance - WORLD_MOBS.groupSpread - 20);
      expect(minion.health.max).toBe(Math.round(minion.definition.maxHealth * WORLD.biomes[0]!.mobs.healthScale));
      expect(world.blocked(minion.position, minion.hitRadius - 1), `${minion.definition.id} nato dentro un ostacolo`).toBe(false);
    }
    expect(new Set(born.map((minion) => minion.definition.id)).size).toBeGreaterThan(1);
  });

  it('lontano dai giocatori i nemici girano attorno a casa, senza allontanarsi e senza sparare', () => {
    const match = createMatch(new WorldEncounter(world));
    match.player.position = MEADOW;
    run(match, 0.5);
    const walkers = match.minions.filter((minion) => minion.roam !== null && minion.speed > 0 && minion.position.distanceTo(MEADOW) > WORLD_MOBS.aggroRadius + 150);
    expect(walkers.length).toBeGreaterThan(3);
    const before = walkers.map((minion) => minion.position);
    run(match, 8);
    expect(walkers.filter((minion, index) => !minion.position.equals(before[index]!)).length).toBeGreaterThan(walkers.length / 2);
    for (const minion of walkers) {
      expect(minion.position.distanceTo(minion.roam!.home)).toBeLessThan(WORLD_MOBS.roamRadius + minion.speed * MINION_ROAM.speed + 2);
      expect(world.blocked(minion.position, minion.hitRadius - 1)).toBe(false);
    }
    expect(match.projectiles.length).toBe(0);
  });

  it('chi entra nel raggio di un nemico a terra se lo vede venire incontro', () => {
    const match = createMatch(new WorldEncounter(world));
    match.player.position = MEADOW;
    run(match, 0.5);
    const walker = match.minions.find((minion) => minion.definition.behavior === 'chaser')!;
    expect(walker).toBeDefined();
    match.player.position = world.freePointNear(walker.position.add(new Vec2(WORLD_MOBS.aggroRadius - 120, 0)), BODY);
    const far = walker.position.distanceTo(match.player.position);
    run(match, 2);
    expect(walker.position.distanceTo(match.player.position)).toBeLessThan(far - 60);
    expect(match.status).toBe('playing');
  });

  it('le regioni lontane si svuotano e al ritorno si ripopolano con nemici nuovi', () => {
    const match = createMatch(new WorldEncounter(world));
    match.player.position = MEADOW;
    run(match, 0.5);
    const first = new Set(match.minions.map((minion) => minion.id));
    expect(first.size).toBeGreaterThan(0);
    match.player.position = ELSEWHERE;
    run(match, 0.5);
    expect(match.minions.filter((minion) => first.has(minion.id))).toEqual([]);
    match.player.position = MEADOW;
    run(match, 0.5);
    const near = match.minions.filter((minion) => minion.position.distanceTo(MEADOW) < WORLD_MOBS.activateRadius);
    expect(near.length).toBeGreaterThan(0);
    expect(near.some((minion) => first.has(minion.id))).toBe(false);
  });

  it('chi cade viene rimpiazzato col tempo, non subito', () => {
    const encounter = new WorldEncounter(world), match = createMatch(encounter);
    match.player.position = MEADOW;
    run(match, 0.5);
    const count = match.minions.length;
    for (const minion of [...match.minions]) { match.removeMinion(minion); encounter.onMinionKilled(match, minion); }
    run(match, 5);
    expect(match.minions.length).toBe(0);
    run(match, WORLD_MOBS.refillSeconds);
    expect(match.minions.length).toBeGreaterThan(0);
    expect(match.minions.length).toBeLessThan(count);
  });

  it('con lo stesso seme la stessa partita si ripete uguale', () => {
    const play = (): string[] => {
      const match = createMatch(new WorldEncounter(world), 21);
      match.player.position = MEADOW;
      run(match, 4);
      return match.minions.map((minion) => `${minion.definition.id}@${minion.position.x.toFixed(2)},${minion.position.y.toFixed(2)}`);
    };
    const first = play();
    expect(first.length).toBeGreaterThan(0);
    expect(play()).toEqual(first);
  });
});

describe('mondo aperto: i nemici aggirano gli ostacoli', () => {
  /** Un tratto di mura orizzontali con terreno libero a nord e a sud. */
  function findWall(): Vec2 {
    const isWall = (vx: number, vy: number): boolean => world.generator.terrainAtVertex(vx, vy) === 'wall';
    for (let vy = 24; vy < 200; vy += WORLD.ruins.grid) for (let vx = 690; vx < 1000; vx++) {
      if (!isWall(vx, vy) || !isWall(vx - 1, vy) || !isWall(vx + 1, vy) || isWall(vx, vy - 1)) continue;
      if (!world.blocked(new Vec2(vx * 32, vy * 32 - 70), 14) && !world.blocked(new Vec2(vx * 32, vy * 32 + 110), 14)) return new Vec2(vx * 32, vy * 32);
    }
    throw new Error('nessun tratto di mura adatto');
  }
  const wall = findWall();
  /** Senza branchi: in campo solo il servitore della prova. */
  const QUIET: Encounter = { attach: () => undefined, step: () => undefined, onBossDefeated: () => undefined };

  it('la griglia di navigazione copre una finestra attorno a un punto', () => {
    // Il centro dell'appoggio in prospettiva del tratto (sommità e facciata): da lì in su si passa dietro le mura.
    const inside = new Vec2(wall.x, wall.y + (WORLD.walls.rise + 32 + WORLD.walls.drop) / 2);
    const grid = new NavGrid(arena, NAV_FIELD.localSize);
    grid.recenter(inside);
    expect(grid.cols * grid.rows).toBe((NAV_FIELD.localSize / NAV_FIELD.cell) ** 2);
    expect(grid.middle.distanceTo(inside)).toBeLessThan(NAV_FIELD.cell);
    expect(grid.contains(inside)).toBe(true);
    expect(grid.contains(new Vec2(inside.x + NAV_FIELD.localSize, inside.y))).toBe(false);
    expect(grid.open[grid.cellOf(inside)]).toBe(0);
    expect(grid.center(grid.cellOf(inside)).distanceTo(inside)).toBeLessThan(NAV_FIELD.cell);
    expect(Array.from(grid.open).filter((cell) => cell === 1).length).toBeGreaterThan(grid.open.length / 2);
  });

  it('un nemico a terra gira attorno alle mura per raggiungere il giocatore', () => {
    const match = createMatch(QUIET);
    match.player.position = new Vec2(wall.x, wall.y + 110);
    const chaser = match.spawnMinion(SPORELING, new Vec2(wall.x, wall.y - 70));
    let nearest = Infinity;
    for (let second = 0; second < 60 && nearest > 45; second++) {
      run(match, 1);
      nearest = Math.min(nearest, chaser.position.distanceTo(match.player.position));
    }
    expect(nearest).toBeLessThanOrEqual(45);
  });
});
