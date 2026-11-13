import { TAU, Vec2 } from '../../core/vec2';
import type { Encounter } from '../match/encounter';
import type { Match } from '../match/match';
import type { Minion } from '../minions/minion';
import { MINIONS } from '../minions/minion-catalog';
import type { MinionDefinition } from '../minions/minion-definition';
import type { WorldBiome } from './world-definition';
import type { WorldMap } from './world-map';
import { hash01 } from './world-noise';

/**
 * Regole dei branchi del mondo aperto. Valori provvisori, in unità di mondo e secondi.
 * - La mappa è divisa in zone quadrate di `zoneTiles` tile: ognuna ha al più un branco, deciso dal seme.
 * - Un branco nasce quando un giocatore arriva entro `activateRadius` dal suo centro, ma non a meno di
 *   `minSpawnDistance` da un giocatore (fuori dallo schermo), e sparisce quando tutti sono oltre `despawnRadius`.
 * - I nemici si accorgono di un giocatore entro `aggroRadius`; oltre restano fermi.
 * - Un branco sterminato rinasce dopo `respawnSeconds`. Attorno alla partenza, entro `safeRadius`, non nasce nulla.
 */
export const WORLD_MOBS = {
  zoneTiles: 20, activateRadius: 900, minSpawnDistance: 620, despawnRadius: 1500, aggroRadius: 460,
  respawnSeconds: 90, safeRadius: 700, checkSteps: 15, maxAlive: 60, packRing: 44,
} as const;

const SALT = { exists: 21, x: 22, y: 23, size: 24, member: 25 } as const;

/** Un branco come lo decide il seme: dove sta e chi lo compone. */
export interface WorldPack {
  readonly zoneX: number;
  readonly zoneY: number;
  readonly center: Vec2;
  readonly biome: WorldBiome;
  readonly members: readonly MinionDefinition[];
}

interface ZoneState {
  /** I servitori vivi del branco in campo; vuoto se il branco non è in campo. */
  readonly alive: Set<number>;
  /** Quando il branco è stato sterminato (tempo di partita), se lo è stato. */
  clearedAt: number | null;
}

const zoneKey = (zoneX: number, zoneY: number): number => zoneY * 4096 + zoneX;

/** Il branco di una zona, o null se la zona è vuota: dipende solo dal seme e dalla zona. */
export function worldPack(map: WorldMap, zoneX: number, zoneY: number): WorldPack | null {
  const { definition, generator } = map, tile = definition.tile, size = WORLD_MOBS.zoneTiles * tile, seed = definition.seed;
  if (zoneX < 0 || zoneY < 0 || zoneX * size >= map.width || zoneY * size >= map.height) return null;
  const wanted = new Vec2((zoneX + 0.2 + 0.6 * hash01(seed, zoneX, zoneY, SALT.x)) * size, (zoneY + 0.2 + 0.6 * hash01(seed, zoneX, zoneY, SALT.y)) * size);
  const biome = generator.biomeAt(Math.round(wanted.x / tile), Math.round(wanted.y / tile)), rules = biome.mobs;
  if (hash01(seed, zoneX, zoneY, SALT.exists) >= rules.packChance) return null;
  // Il branco sta nel punto libero più vicino a quello voluto; se cadrebbe in mezzo a un lago, la zona resta vuota.
  const center = map.freePointNear(wanted, 16), start = new Vec2(map.width / 2, definition.spawn.row * tile);
  if (center.distanceTo(wanted) > size / 2 || center.distanceTo(start) < WORLD_MOBS.safeRadius) return null;
  const [least, most] = rules.packSize, count = least + Math.floor(hash01(seed, zoneX, zoneY, SALT.size) * (most - least + 1));
  const total = rules.pool.reduce((sum, entry) => sum + entry.weight, 0), members: MinionDefinition[] = [];
  for (let i = 0; i < count; i++) {
    let left = hash01(seed, zoneX * 64 + i, zoneY, SALT.member) * total;
    const entry = rules.pool.find((candidate) => (left -= candidate.weight) < 0) ?? rules.pool[rules.pool.length - 1]!;
    const minion = MINIONS[entry.minion];
    if (minion !== undefined) members.push(minion);
  }
  return members.length === 0 ? null : { zoneX, zoneY, center, biome, members };
}

/**
 * L'incontro del mondo aperto: la partita non ha un traguardo, e i branchi nascono e spariscono attorno ai giocatori.
 * Tiene in campo solo ciò che sta vicino a qualcuno, così il costo dipende dai giocatori e non dalla grandezza della
 * mappa. Casse e boss all'aperto si aggiungeranno qui.
 */
export class WorldEncounter implements Encounter {
  readonly aggroRadius = WORLD_MOBS.aggroRadius;
  private readonly zones = new Map<number, ZoneState>();
  /** A quale zona appartiene ogni servitore in campo. */
  private readonly owners = new Map<number, number>();
  private countdown = 0;

  constructor(private readonly map: WorldMap) {}

  attach(): void {}

  onBossDefeated(): void {}

  step(_dt: number, match: Match): void {
    if (this.countdown-- > 0) return;
    this.countdown = WORLD_MOBS.checkSteps;
    const players = match.livingPlayers().map((player) => player.position);
    this.despawnFar(match, players);
    if (players.length > 0) this.spawnNear(match, players);
  }

  onMinionKilled(match: Match, minion: Minion): void {
    const key = this.owners.get(minion.id);
    if (key === undefined) return;
    this.owners.delete(minion.id);
    const zone = this.zones.get(key);
    if (zone === undefined) return;
    zone.alive.delete(minion.id);
    if (zone.alive.size === 0) zone.clearedAt = match.time;
  }

  /** Vita di un servitore in una fascia: quella dei dati per il moltiplicatore della fascia. */
  private healthIn(biome: WorldBiome, definition: MinionDefinition): number {
    return Math.round(definition.maxHealth * biome.mobs.healthScale);
  }

  private centerOf(key: number): Vec2 {
    const size = WORLD_MOBS.zoneTiles * this.map.definition.tile;
    return new Vec2(((key % 4096) + 0.5) * size, (Math.floor(key / 4096) + 0.5) * size);
  }

  /** I branchi rimasti lontani da tutti tornano «sulla carta»: rinasceranno interi quando qualcuno si riavvicina. */
  private despawnFar(match: Match, players: readonly Vec2[]): void {
    for (const [key, zone] of this.zones) {
      if (zone.alive.size === 0) continue;
      const center = this.centerOf(key);
      if (players.some((player) => player.distanceTo(center) < WORLD_MOBS.despawnRadius)) continue;
      for (const minion of match.minions) if (zone.alive.has(minion.id)) { match.removeMinion(minion); this.owners.delete(minion.id); }
      zone.alive.clear();
    }
  }

  private spawnNear(match: Match, players: readonly Vec2[]): void {
    const size = WORLD_MOBS.zoneTiles * this.map.definition.tile, reach = WORLD_MOBS.activateRadius, seen = new Set<number>();
    for (const player of players) {
      for (let zoneY = Math.floor((player.y - reach) / size); zoneY <= Math.floor((player.y + reach) / size); zoneY++) {
        for (let zoneX = Math.floor((player.x - reach) / size); zoneX <= Math.floor((player.x + reach) / size); zoneX++) {
          const key = zoneKey(zoneX, zoneY);
          if (zoneX < 0 || zoneY < 0 || seen.has(key)) continue;
          seen.add(key);
          const zone = this.zones.get(key);
          if (zone !== undefined && (zone.alive.size > 0 || (zone.clearedAt !== null && match.time - zone.clearedAt < WORLD_MOBS.respawnSeconds))) continue;
          const pack = worldPack(this.map, zoneX, zoneY);
          if (pack === null || match.minions.length + pack.members.length > WORLD_MOBS.maxAlive) continue;
          let nearest = Infinity;
          for (const other of players) nearest = Math.min(nearest, other.distanceTo(pack.center));
          if (nearest > reach || nearest < WORLD_MOBS.minSpawnDistance) continue;
          this.spawn(match, key, pack);
        }
      }
    }
  }

  private spawn(match: Match, key: number, pack: WorldPack): void {
    let zone = this.zones.get(key);
    if (zone === undefined) { zone = { alive: new Set(), clearedAt: null }; this.zones.set(key, zone); }
    zone.clearedAt = null;
    pack.members.forEach((definition, index) => {
      const offset = pack.members.length === 1 ? Vec2.ZERO : Vec2.fromAngle((index * TAU) / pack.members.length, WORLD_MOBS.packRing);
      const minion = match.spawnMinion(definition, pack.center.add(offset), { maxHealth: this.healthIn(pack.biome, definition) });
      zone.alive.add(minion.id);
      this.owners.set(minion.id, key);
    });
  }
}
