import type { WorldObstacleKindId } from './world-obstacles';

/** Terreni del mondo. Id stabili: li usano generazione, collisioni, rappresentazione e test. */
export const WORLD_TERRAINS = ['grass', 'moor', 'road', 'water', 'wall'] as const;
export type WorldTerrain = typeof WORLD_TERRAINS[number];

export const TERRAIN_WALKABLE: Readonly<Record<WorldTerrain, boolean>> = { grass: true, moor: true, road: true, water: false, wall: false };

/**
 * Coppie di terreni che possono stare nello stesso tile: per ognuna esiste (o va prodotto) un tileset di raccordo.
 * La generazione non deve mai accostare due terreni fuori da questo elenco.
 */
export const TERRAIN_PAIRS: readonly (readonly [WorldTerrain, WorldTerrain])[] = [
  ['road', 'grass'], ['water', 'grass'], ['grass', 'moor'], ['road', 'moor'], ['water', 'moor'],
  ['grass', 'wall'], ['moor', 'wall'],
];

export interface BiomeObstacles {
  /** Probabilità che una cella di terreno aperto contenga un ostacolo. */
  readonly density: number;
  /** Probabilità dentro una macchia fitta (bosco, pietraia). */
  readonly groveDensity: number;
  /** Soglia del rumore oltre la quale la cella è in una macchia fitta. */
  readonly groveThreshold: number;
  readonly kinds: readonly { readonly kind: WorldObstacleKindId; readonly weight: number }[];
}

/**
 * I nemici di una fascia. I servitori sono quelli dei dungeon, per id (`MINIONS`): in attesa di nemici propri del
 * mondo, le fasce a nord usano i più semplici e quelle a sud i più complessi.
 */
export interface BiomeMobs {
  /** Probabilità che una zona della fascia abbia un branco. */
  readonly packChance: number;
  /** Quanti nemici in un branco: minimo e massimo. */
  readonly packSize: readonly [number, number];
  /** Moltiplicatore della vita dei servitori rispetto ai loro dati. */
  readonly healthScale: number;
  readonly pool: readonly { readonly minion: string; readonly weight: number }[];
  /** Premio per ogni nemico abbattuto. */
  readonly reward: { readonly xp: number; readonly gold: number };
}

/** Una fascia orizzontale della mappa: più si scende, più sale il grado e più i nemici sono forti e complessi. */
export interface WorldBiome {
  readonly id: string;
  readonly name: string;
  /** Grado di difficoltà della fascia, da 0 (nord). Livelli e bottino per grado sono ancora da decidere. */
  readonly tier: number;
  /** Altezza della fascia in tile. */
  readonly rows: number;
  readonly ground: WorldTerrain;
  readonly obstacles: BiomeObstacles;
  readonly mobs: BiomeMobs;
}

export interface WorldDefinition {
  readonly seed: number;
  /** Lato di un tile in unità di mondo (un pixel per unità). */
  readonly tile: number;
  /** Lato di un blocco in tile: l'unità con cui la mappa si genera, si tiene in memoria e si disegnerà. */
  readonly chunkTiles: number;
  /** Quanti blocchi generati restano in memoria. */
  readonly chunkCacheLimit: number;
  readonly widthTiles: number;
  /** Fasce da nord a sud; l'altezza del mondo è la somma delle loro righe. */
  readonly biomes: readonly WorldBiome[];
  /** Oscillazione del confine tra due fasce, in tile. */
  readonly borderWobble: number;
  /** Acqua ai lati della mappa: larghezza minima e oscillazione, in tile. */
  readonly coast: { readonly min: number; readonly wobble: number };
  /** Radura di partenza a nord: riga del centro e mezza larghezza, in tile. */
  readonly spawn: { readonly row: number; readonly half: number };
  /** Sentiero principale da nord a sud. */
  readonly mainPath: { readonly halfWidth: number; readonly amplitude: number; readonly wavelength: number };
  /** Strade secondarie: righe ogni `rowSpacing` a partire da `rowOffset`, colonne a frazioni della larghezza. */
  readonly roads: { readonly halfWidth: number; readonly rowSpacing: number; readonly rowOffset: number; readonly columns: readonly number[]; readonly edgeGap: number };
  /** Stagni: scala e soglia del rumore, distanza minima da strade e confini di fascia. */
  readonly ponds: { readonly scale: number; readonly threshold: number; readonly roadGap: number; readonly borderGap: number };
  /**
   * Rovine: mura lungo una griglia di passo `grid`, a est di `fromColumn` (frazione della larghezza). Ogni tratto di
   * `segment` tile (numero pari) resta in piedi con probabilità `fill`; `edgeGap` le tiene lontane dai bordi.
   */
  readonly ruins: { readonly fromColumn: number; readonly scale: number; readonly threshold: number; readonly grid: number; readonly segment: number; readonly fill: number; readonly edgeGap: number };
  /** Ostacoli sparsi: una cella di `cellTiles` tile ne contiene al più uno, spostato dal centro al più di `jitter`. */
  readonly scatter: { readonly cellTiles: number; readonly jitter: number; readonly groveScale: number };
}

/**
 * Il mondo aperto. Valori tutti provvisori. Per ora due fasce: le successive si aggiungono in coda a `biomes`
 * e la mappa si allunga verso sud senza cambiare ciò che sta a nord.
 */
export const WORLD: WorldDefinition = {
  seed: 20261112,
  tile: 32,
  chunkTiles: 32,
  chunkCacheLimit: 512,
  widthTiles: 1024,
  biomes: [
    {
      id: 'greenwood', name: 'Bosco Verde', tier: 0, rows: 256, ground: 'grass',
      obstacles: { density: 0.22, groveDensity: 0.85, groveThreshold: 0.55, kinds: [{ kind: 'oak', weight: 6 }, { kind: 'bush', weight: 3 }, { kind: 'boulder', weight: 1 }] },
      // Nemici semplici: inseguono, volano addosso o scoppiano.
      mobs: { packChance: 0.55, packSize: [2, 4], healthScale: 1, reward: { xp: 4, gold: 3 },
        pool: [{ minion: 'sporeling', weight: 5 }, { minion: 'bog_gnat', weight: 3 }, { minion: 'puffball', weight: 2 }] },
    },
    {
      id: 'mistmoor', name: 'Brughiera delle Nebbie', tier: 1, rows: 256, ground: 'moor',
      obstacles: { density: 0.14, groveDensity: 0.6, groveThreshold: 0.6, kinds: [{ kind: 'dead_tree', weight: 5 }, { kind: 'moor_rock', weight: 4 }] },
      // Nemici con più mosse: tiratori, cariche annunciate, scheletri che si rialzano.
      mobs: { packChance: 0.65, packSize: [3, 5], healthScale: 1.5, reward: { xp: 8, gold: 6 },
        pool: [{ minion: 'ossuary_skeleton', weight: 4 }, { minion: 'censer_acolyte', weight: 3 }, { minion: 'gargoyle', weight: 2 }, { minion: 'belfry_bat', weight: 2 }] },
    },
  ],
  borderWobble: 3,
  coast: { min: 6, wobble: 6 },
  spawn: { row: 14, half: 5 },
  mainPath: { halfWidth: 2, amplitude: 30, wavelength: 520 },
  roads: { halfWidth: 1, rowSpacing: 128, rowOffset: 64, columns: [0.19, 0.81], edgeGap: 18 },
  ponds: { scale: 26, threshold: 0.74, roadGap: 5, borderGap: 5 },
  ruins: { fromColumn: 0.66, scale: 40, threshold: 0.55, grid: 8, segment: 4, fill: 0.55, edgeGap: 4 },
  scatter: { cellTiles: 4, jitter: 36, groveScale: 5 },
};

export const worldHeightTiles = (definition: WorldDefinition): number => definition.biomes.reduce((rows, biome) => rows + biome.rows, 0);
