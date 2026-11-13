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
import { MAGE_SKILLS } from '../skills/mage-skills';
import { worldArena } from './world-arena';
import { WORLD } from './world-definition';
import { WorldMap } from './world-map';
import { WORLD_MOBS, WorldEncounter, worldPack, type WorldPack } from './world-mobs';

const world = new WorldMap();
const arena = worldArena(world);
const BODY = BODY_RADIUS.player;
const ZONE = WORLD_MOBS.zoneTiles * WORLD.tile;
const createMatch = (encounter: Encounter): Match => new Match({
  rng: new SeededRng(11), dungeon: { ...CRYPT, id: arena.id, name: arena.name, arena }, arena, boss: null, encounter, loadout: MAGE_SKILLS,
});

/** Tutti i branchi «sulla carta» della mappa. */
const packs: WorldPack[] = [];
for (let zoneY = 0; zoneY * ZONE < world.height; zoneY++) for (let zoneX = 0; zoneX * ZONE < world.width; zoneX++) {
  const pack = worldPack(world, zoneX, zoneY);
  if (pack !== null) packs.push(pack);
}
/** Un branco del Bosco Verde con uno Sporeling (cammina a terra), lontano dagli altri branchi quanto basta per isolarlo. */
const lonely = packs.find((pack) => pack.biome.id === 'greenwood' && pack.members.some((member) => member.id === 'sporeling')
  && packs.every((other) => other === pack || other.center.distanceTo(pack.center) > 500))!;
/** Un punto libero a circa `distance` a ovest o a est del centro del branco. */
const standAt = (pack: WorldPack, distance: number): Vec2 => world.freePointNear(pack.center.add(new Vec2(pack.center.x > world.width / 2 ? -distance : distance, 0)), BODY);
const ofPack = (match: Match, pack: WorldPack) => match.minions.filter((minion) => minion.position.distanceTo(pack.center) < 120);

describe('mondo aperto: branchi', () => {
  it('ogni fascia ha nemici che esistono, e a sud sono più forti e più pagati', () => {
    for (const biome of WORLD.biomes) {
      expect(biome.mobs.pool.length).toBeGreaterThan(0);
      for (const entry of biome.mobs.pool) expect(MINIONS[entry.minion], `${biome.id}: ${entry.minion}`).toBeDefined();
    }
    const [north, south] = WORLD.biomes;
    expect(south!.mobs.healthScale).toBeGreaterThan(north!.mobs.healthScale);
    expect(south!.mobs.reward.xp).toBeGreaterThan(north!.mobs.reward.xp);
    expect(south!.mobs.packSize[1]).toBeGreaterThanOrEqual(north!.mobs.packSize[1]);
  });

  it('i branchi dipendono solo dal seme, stanno su terreno libero e lasciano tranquilla la partenza', () => {
    expect(packs.length).toBeGreaterThan(200);
    expect(new Set(packs.map((pack) => pack.biome.id))).toEqual(new Set(['greenwood', 'mistmoor']));
    const start = new Vec2(world.width / 2, WORLD.spawn.row * WORLD.tile);
    for (const pack of packs) {
      expect(world.blocked(pack.center, 16), `branco ${pack.zoneX},${pack.zoneY}`).toBe(false);
      expect(pack.center.distanceTo(start)).toBeGreaterThanOrEqual(WORLD_MOBS.safeRadius);
      const [least, most] = pack.biome.mobs.packSize;
      expect(pack.members.length).toBeGreaterThanOrEqual(least);
      expect(pack.members.length).toBeLessThanOrEqual(most);
      for (const member of pack.members) expect(pack.biome.mobs.pool.some((entry) => entry.minion === member.id)).toBe(true);
    }
    const again = worldPack(new WorldMap(), lonely.zoneX, lonely.zoneY)!;
    expect(again.center.equals(lonely.center)).toBe(true);
    expect(again.members.map((member) => member.id)).toEqual(lonely.members.map((member) => member.id));
    expect(worldPack(new WorldMap({ ...WORLD, seed: WORLD.seed + 5 }), lonely.zoneX, lonely.zoneY)?.center.equals(lonely.center) ?? false).toBe(false);
  });

  it('un branco nasce fuori vista quando ci si avvicina e resta fermo finché non si entra nel suo raggio', () => {
    const match = createMatch(new WorldEncounter(world));
    run(match, 1);
    // Attorno alla partenza non nasce nulla a portata di schermo.
    for (const minion of match.minions) expect(minion.position.distanceTo(match.player.position)).toBeGreaterThan(WORLD_MOBS.minSpawnDistance - 80);

    match.player.position = standAt(lonely, 760);
    run(match, 0.5);
    const born = ofPack(match, lonely);
    expect(born.map((minion) => minion.definition.id).sort()).toEqual(lonely.members.map((member) => member.id).sort());
    for (const minion of born) expect(minion.health.max).toBe(Math.round(minion.definition.maxHealth * lonely.biome.mobs.healthScale));
    const before = born.map((minion) => minion.position);
    run(match, 2);
    born.forEach((minion, index) => expect(minion.position.equals(before[index]!), `${minion.definition.id} si è mosso da lontano`).toBe(true));
    expect(match.projectiles.length).toBe(0);

    // Entrati nel raggio, chi cammina viene incontro.
    match.player.position = standAt(lonely, 320);
    const walker = born.find((minion) => minion.definition.id === 'sporeling')!, far = walker.position.distanceTo(match.player.position);
    run(match, 2);
    expect(walker.position.distanceTo(match.player.position)).toBeLessThan(far - 60);
    expect(match.status).toBe('playing');
  });

  it('sparisce quando tutti si allontanano e rinasce intero al ritorno', () => {
    const match = createMatch(new WorldEncounter(world));
    match.player.position = standAt(lonely, 760);
    run(match, 0.5);
    const first = ofPack(match, lonely).map((minion) => minion.id);
    expect(first.length).toBe(lonely.members.length);
    match.player.position = world.freePointNear(lonely.center.add(new Vec2(0, lonely.center.y > world.height / 2 ? -4000 : 4000)), BODY);
    run(match, 0.5);
    expect(match.minions.filter((minion) => first.includes(minion.id))).toEqual([]);
    expect(match.minions.length).toBeLessThanOrEqual(WORLD_MOBS.maxAlive);
    match.player.position = standAt(lonely, 760);
    run(match, 0.5);
    expect(ofPack(match, lonely).length).toBe(lonely.members.length);
    expect(ofPack(match, lonely).some((minion) => first.includes(minion.id))).toBe(false);
  });

  it('un branco sterminato non rinasce prima del suo tempo', () => {
    const encounter = new WorldEncounter(world), match = createMatch(encounter);
    match.player.position = standAt(lonely, 760);
    run(match, 0.5);
    for (const minion of ofPack(match, lonely)) { match.removeMinion(minion); encounter.onMinionKilled(match, minion); }
    run(match, 5);
    expect(ofPack(match, lonely)).toEqual([]);
    run(match, WORLD_MOBS.respawnSeconds - 10);
    expect(ofPack(match, lonely)).toEqual([]);
    run(match, 12);
    expect(ofPack(match, lonely).length).toBe(lonely.members.length);
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
    const grid = new NavGrid(arena, NAV_FIELD.localSize);
    grid.recenter(wall);
    expect(grid.cols * grid.rows).toBe((NAV_FIELD.localSize / NAV_FIELD.cell) ** 2);
    expect(grid.middle.distanceTo(wall)).toBeLessThan(NAV_FIELD.cell);
    expect(grid.contains(wall)).toBe(true);
    expect(grid.contains(new Vec2(wall.x + NAV_FIELD.localSize, wall.y))).toBe(false);
    expect(grid.open[grid.cellOf(wall)]).toBe(0);
    expect(grid.center(grid.cellOf(wall)).distanceTo(wall)).toBeLessThan(NAV_FIELD.cell);
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
