import { TAU, Vec2 } from '../../core/vec2';
import type { Rng } from '../../core/rng';
import type { Encounter } from '../match/encounter';
import type { Match } from '../match/match';
import type { Minion } from '../minions/minion';
import { MINIONS } from '../minions/minion-catalog';
import type { MinionDefinition } from '../minions/minion-definition';
import type { WorldBiome } from './world-definition';
import type { WorldMap } from './world-map';

/**
 * Popolazione dei nemici del mondo aperto, sul modello dei mondi persistenti (Realm of the Mad God): la mappa è divisa
 * in regioni quadrate e ognuna tiene in vita un certo numero di nemici, in gruppi sparsi a caso, che girano attorno al
 * punto dove sono nati; chi cade viene rimpiazzato col tempo. Valori provvisori, in unità di mondo e secondi.
 * - Una regione si popola quando un giocatore arriva entro `activateRadius` dal suo centro; i gruppi nascono in punti
 *   liberi a caso della regione, mai a meno di `minSpawnDistance` da un giocatore (fuori dallo schermo).
 * - Ogni `refillSeconds` una regione sotto la sua quota fa nascere un nuovo gruppo.
 * - Quando tutti i giocatori sono oltre `despawnRadius` la regione si svuota e si dimentica: al ritorno si ripopola.
 * - I nemici si accorgono di un giocatore entro `aggroRadius`; oltre girano attorno alla loro casa (`roamRadius`).
 * - Vicino alle mura (entro `ruinsReach` tile) nascono i nemici delle rovine. Attorno alla partenza, entro
 *   `safeRadius`, non nasce nulla. Mai più di `maxAlive` nemici in campo.
 * Tutto ciò che è casuale viene dall'`Rng` della partita: la stessa partita col seme si ripete uguale.
 */
export const WORLD_MOBS = {
  regionTiles: 16, activateRadius: 1000, minSpawnDistance: 620, despawnRadius: 1600, aggroRadius: 420,
  refillSeconds: 25, safeRadius: 700, checkSteps: 15, maxAlive: 90, groupSpread: 54, roamRadius: 150, ruinsReach: 4, spawnTries: 10,
} as const;

/** Un gruppo appena deciso: dove nasce, in che fascia, e chi lo compone. */
export interface WorldGroup {
  readonly center: Vec2;
  readonly biome: WorldBiome;
  readonly ruins: boolean;
  readonly members: readonly MinionDefinition[];
}

interface RegionState {
  /** I servitori vivi della regione. */
  readonly alive: Set<number>;
  /** Quanti nemici la regione tiene in vita. */
  readonly quota: number;
  /** Tempo di partita dal quale può nascere il prossimo gruppo. */
  nextRefill: number;
}

const regionKey = (regionX: number, regionY: number): number => regionY * 4096 + regionX;

/** Un'estrazione pesata da un elenco `{ weight }`. */
function pick<T extends { readonly weight: number }>(entries: readonly T[], rng: Rng): T {
  let left = rng.next() * entries.reduce((sum, entry) => sum + entry.weight, 0);
  for (const entry of entries) if ((left -= entry.weight) < 0) return entry;
  return entries[entries.length - 1]!;
}

/** Vero se entro `reach` tile dal punto c'è un vertice di mura: lì si è fra le rovine. */
function nearRuins(map: WorldMap, point: Vec2, reach: number): boolean {
  const tile = map.definition.tile, vx = Math.round(point.x / tile), vy = Math.round(point.y / tile);
  for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) if (map.vertexTerrain(vx + dx, vy + dy) === 'wall') return true;
  return false;
}

/**
 * Compone un gruppo nel punto dato: quanti dai pesi della fascia, chi dal suo elenco (o da quello delle rovine). Il
 * primo è estratto a caso; ognuno degli altri gli somiglia una volta su due, così i gruppi sono vari ma non a caso puro.
 */
export function composeGroup(map: WorldMap, center: Vec2, rng: Rng): WorldGroup {
  const tile = map.definition.tile, biome = map.generator.biomeAt(Math.round(center.x / tile), Math.round(center.y / tile));
  const ruins = nearRuins(map, center, WORLD_MOBS.ruinsReach), rules = biome.mobs, pool = ruins && rules.ruins.length > 0 ? rules.ruins : rules.pool;
  const size = 1 + pick(rules.groupSizes.map((weight, index) => ({ weight, index })), rng).index;
  const members: MinionDefinition[] = [];
  const leader = MINIONS[pick(pool, rng).minion];
  for (let i = 0; i < size && leader !== undefined; i++) {
    const member = i === 0 || rng.next() < 0.5 ? leader : MINIONS[pick(pool, rng).minion];
    if (member !== undefined) members.push(member);
  }
  return { center, biome, ruins, members };
}

/**
 * L'incontro del mondo aperto: la partita non ha un traguardo, e le regioni attorno ai giocatori si popolano, si
 * ripopolano e si svuotano. Il costo dipende dai giocatori e non dalla grandezza della mappa. Casse e boss all'aperto
 * si aggiungeranno qui.
 */
export class WorldEncounter implements Encounter {
  readonly aggroRadius = WORLD_MOBS.aggroRadius;
  private readonly regions = new Map<number, RegionState>();
  /** A quale regione appartiene ogni servitore in campo. */
  private readonly owners = new Map<number, number>();
  private countdown = 0;

  constructor(private readonly map: WorldMap) {}

  attach(): void {}

  onBossDefeated(): void {}

  step(_dt: number, match: Match): void {
    if (this.countdown-- > 0) return;
    this.countdown = WORLD_MOBS.checkSteps;
    const players = match.livingPlayers().map((player) => player.position);
    this.forgetFar(match, players);
    if (players.length > 0) this.populateNear(match, players);
  }

  onMinionKilled(match: Match, minion: Minion): void {
    const key = this.owners.get(minion.id);
    if (key === undefined) return;
    this.owners.delete(minion.id);
    const region = this.regions.get(key);
    if (region === undefined) return;
    region.alive.delete(minion.id);
    // Chi cade viene rimpiazzato col tempo, non subito.
    region.nextRefill = Math.max(region.nextRefill, match.time + WORLD_MOBS.refillSeconds);
  }

  private get regionSize(): number {
    return WORLD_MOBS.regionTiles * this.map.definition.tile;
  }

  private centerOf(key: number): Vec2 {
    const size = this.regionSize;
    return new Vec2(((key % 4096) + 0.5) * size, (Math.floor(key / 4096) + 0.5) * size);
  }

  /** Le regioni rimaste lontane da tutti si svuotano e si dimenticano: al ritorno si ripopolano da capo. */
  private forgetFar(match: Match, players: readonly Vec2[]): void {
    for (const [key, region] of this.regions) {
      const center = this.centerOf(key);
      if (players.some((player) => player.distanceTo(center) < WORLD_MOBS.despawnRadius)) continue;
      for (const minion of [...match.minions]) if (region.alive.has(minion.id)) { match.removeMinion(minion); this.owners.delete(minion.id); }
      this.regions.delete(key);
    }
  }

  private populateNear(match: Match, players: readonly Vec2[]): void {
    const size = this.regionSize, reach = WORLD_MOBS.activateRadius, seen = new Set<number>();
    for (const player of players) {
      for (let regionY = Math.floor((player.y - reach) / size); regionY <= Math.floor((player.y + reach) / size); regionY++) {
        for (let regionX = Math.floor((player.x - reach) / size); regionX <= Math.floor((player.x + reach) / size); regionX++) {
          const key = regionKey(regionX, regionY);
          if (regionX < 0 || regionY < 0 || regionX * size >= this.map.width || regionY * size >= this.map.height || seen.has(key)) continue;
          seen.add(key);
          if (this.centerOf(key).distanceTo(player) > reach + size / 2) continue;
          let region = this.regions.get(key);
          if (region === undefined) {
            region = this.openRegion(match, key);
            // Alla prima apertura la regione si riempie subito; poi un gruppo per volta.
            for (let tries = 0; tries < 4 && region.alive.size < region.quota; tries++) this.spawnGroup(match, key, region, players);
            region.nextRefill = match.time + WORLD_MOBS.refillSeconds;
            continue;
          }
          if (region.alive.size >= region.quota || match.time < region.nextRefill) continue;
          if (this.spawnGroup(match, key, region, players)) region.nextRefill = match.time + WORLD_MOBS.refillSeconds;
        }
      }
    }
  }

  /** La quota di una regione: quella della sua fascia, arrotondata a caso; nessuno attorno alla partenza. */
  private openRegion(match: Match, key: number): RegionState {
    const center = this.centerOf(key), tile = this.map.definition.tile;
    const biome = this.map.generator.biomeAt(Math.round(center.x / tile), Math.round(center.y / tile));
    const start = new Vec2(this.map.width / 2, this.map.definition.spawn.row * tile);
    const quota = center.distanceTo(start) < WORLD_MOBS.safeRadius ? 0 : Math.floor(biome.mobs.perRegion + match.rng.next());
    const region: RegionState = { alive: new Set(), quota, nextRefill: 0 };
    this.regions.set(key, region);
    return region;
  }

  /** Un gruppo in un punto libero a caso della regione, lontano dai giocatori e dalla partenza; false se non c'è posto. */
  private spawnGroup(match: Match, key: number, region: RegionState, players: readonly Vec2[]): boolean {
    const size = this.regionSize, rng = match.rng, origin = this.centerOf(key).sub(new Vec2(size / 2, size / 2));
    const start = new Vec2(this.map.width / 2, this.map.definition.spawn.row * this.map.definition.tile);
    for (let attempt = 0; attempt < WORLD_MOBS.spawnTries; attempt++) {
      const wanted = origin.add(new Vec2(rng.next() * size, rng.next() * size));
      if (wanted.x < 0 || wanted.y < 0 || wanted.x > this.map.width || wanted.y > this.map.height) continue;
      const center = this.map.freePointNear(wanted, 16);
      if (center.distanceTo(wanted) > 96 || center.distanceTo(start) < WORLD_MOBS.safeRadius) continue;
      if (players.some((player) => player.distanceTo(center) < WORLD_MOBS.minSpawnDistance)) continue;
      const group = composeGroup(this.map, center, rng);
      const count = Math.min(group.members.length, region.quota - region.alive.size, WORLD_MOBS.maxAlive - match.minions.length);
      if (count <= 0) return false;
      for (let i = 0; i < count; i++) {
        const definition = group.members[i]!;
        const offset = i === 0 ? Vec2.ZERO : Vec2.fromAngle(rng.next() * TAU, WORLD_MOBS.groupSpread * (0.4 + 0.6 * rng.next()));
        const position = this.map.freePointNear(center.add(offset), definition.hitRadius);
        const minion = match.spawnMinion(definition, position, { maxHealth: Math.round(definition.maxHealth * group.biome.mobs.healthScale), roam: { radius: WORLD_MOBS.roamRadius } });
        region.alive.add(minion.id);
        this.owners.set(minion.id, key);
      }
      return true;
    }
    return false;
  }
}
