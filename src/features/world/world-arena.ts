import type { ArenaDefinition } from '../arena/arena';
import type { WorldMap } from './world-map';

/** Margini del mondo aperto, in unità di mondo. Provvisori. */
export const WORLD_ARENA = { playerMargin: 10, bossMargin: 60, projectileMargin: 0 } as const;

/**
 * Il mondo aperto come mappa di una partita: stesse regole dei dungeon (movimento, skill, proiettili, zone), con gli
 * ostacoli forniti dalla mappa del mondo zona per zona. Il tema serve solo a ciò che resta legato ai dungeon (audio,
 * tabelle di aspetto): il disegno del terreno è quello del mondo.
 */
export function worldArena(map: WorldMap): ArenaDefinition {
  const spawn = map.spawnPoint(0, WORLD_ARENA.playerMargin);
  return {
    id: 'open-world', name: 'Mondo aperto', theme: 'swamp',
    width: map.width, height: map.height, wallThickness: 0,
    playerSpawn: spawn, bossSpawn: spawn,
    ...WORLD_ARENA,
    pillars: [],
    terrain: map,
  };
}
