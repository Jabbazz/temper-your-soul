import type { WorldDecalKindId, WorldObstacleKindId } from './world-obstacles';

/** Terreni del mondo. Id stabili: li usano generazione, collisioni, rappresentazione e test. */
export const WORLD_TERRAINS = ['grass', 'moor', 'road', 'water', 'wall', 'bog', 'ash', 'snow', 'abyss', 'lava'] as const;
export type WorldTerrain = typeof WORLD_TERRAINS[number];

export const TERRAIN_WALKABLE: Readonly<Record<WorldTerrain, boolean>> = {
  grass: true, moor: true, road: true, water: false, wall: false, bog: true, ash: true, snow: true, abyss: true, lava: false,
};

/**
 * Coppie di terreni che possono stare nello stesso tile: per ognuna esiste (o va prodotto) un tileset di raccordo.
 * La generazione non deve mai accostare due terreni fuori da questo elenco.
 */
export const TERRAIN_PAIRS: readonly (readonly [WorldTerrain, WorldTerrain])[] = [
  ['road', 'grass'], ['water', 'grass'], ['grass', 'moor'], ['road', 'moor'], ['water', 'moor'],
  ['grass', 'wall'], ['moor', 'wall'],
  // Ogni fascia nuova: strada, acqua e mura sul suo suolo, più il confine con il suolo della fascia a nord.
  ['moor', 'bog'], ['road', 'bog'], ['water', 'bog'], ['bog', 'wall'],
  ['bog', 'snow'], ['road', 'snow'], ['water', 'snow'], ['snow', 'wall'],
  ['snow', 'ash'], ['road', 'ash'], ['water', 'ash'], ['ash', 'wall'],
  // L'Abisso: al posto dell'acqua la lava; la costa che scende da nord passa dall'acqua alla lava.
  ['ash', 'abyss'], ['road', 'abyss'], ['lava', 'abyss'], ['abyss', 'wall'], ['water', 'lava'],
  // Sul confine ondulato la costa d'acqua delle Lande tocca la roccia dell'Abisso, e quella di lava la cenere.
  ['water', 'abyss'], ['lava', 'ash'],
];

export interface BiomeObstacles {
  /** Probabilità che una cella di terreno aperto contenga un ostacolo. */
  readonly density: number;
  /** Probabilità dentro una macchia fitta (bosco, pietraia). */
  readonly groveDensity: number;
  /** Soglia del rumore oltre la quale la cella è in una macchia fitta. */
  readonly groveThreshold: number;
  readonly kinds: readonly { readonly kind: WorldObstacleKindId; readonly weight: number }[];
  /**
   * Decorazioni a terra senza collisione: ogni quadrato di due tile ne ha una con probabilità `density`, sul suolo
   * pieno della fascia.
   */
  readonly decals: { readonly density: number; readonly kinds: readonly { readonly kind: WorldDecalKindId; readonly weight: number }[] };
}

/**
 * I nemici di una fascia, per id (`MINIONS`): le fasce a nord usano i più semplici e quelle a sud i più complessi.
 * Nessuno vola: nel mondo tutti rispettano le collisioni come il giocatore. In attesa dei nemici propri del mondo
 * (sprite PixelLab) restano alcuni servitori dei dungeon che camminano. Come nascono: `world-mobs.ts`.
 */
export interface BiomeMobs {
  /** Quanti nemici tiene in vita, in media, una regione della fascia (`WORLD_MOBS.regionTiles` di lato). */
  readonly perRegion: number;
  /** Pesi delle dimensioni di un gruppo: l'indice 0 è un nemico da solo, l'1 una coppia e così via. */
  readonly groupSizes: readonly number[];
  /** Moltiplicatore della vita dei servitori rispetto ai loro dati. */
  readonly healthScale: number;
  readonly pool: readonly { readonly minion: string; readonly weight: number }[];
  /** I nemici dei gruppi che nascono fra le rovine (vicino alle mura) al posto di `pool`. */
  readonly ruins: readonly { readonly minion: string; readonly weight: number }[];
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
  /** Il liquido di stagni e costa nella fascia (predefinito l'acqua; nell'Abisso la lava). */
  readonly liquid?: WorldTerrain;
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
  /**
   * Sentiero principale da nord a sud: tratti dritti di `stretch` righe, ognuno spostato a lato di al più `shift`
   * tile rispetto al centro della mappa, uniti da gomiti.
   */
  readonly mainPath: { readonly halfWidth: number; readonly stretch: number; readonly shift: number };
  /** Strade secondarie, dritte: righe ogni `rowSpacing` a partire da `rowOffset`, colonne a frazioni della larghezza. */
  readonly roads: { readonly halfWidth: number; readonly rowSpacing: number; readonly rowOffset: number; readonly columns: readonly number[]; readonly edgeGap: number };
  /** Stagni: scala e soglia del rumore, distanza minima da strade e confini di fascia. */
  readonly ponds: { readonly scale: number; readonly threshold: number; readonly roadGap: number; readonly borderGap: number };
  /**
   * Rovine: mura lungo una griglia di passo `grid`, a est di `fromColumn` (frazione della larghezza). Ogni tratto di
   * `segment` tile (numero pari) resta in piedi con probabilità `fill`; `edgeGap` le tiene lontane dai bordi.
   */
  readonly ruins: { readonly fromColumn: number; readonly scale: number; readonly threshold: number; readonly grid: number; readonly segment: number; readonly fill: number; readonly edgeGap: number };
  /**
   * Mura in prospettiva, in unità di mondo. Il disegno di un tratto di mura sale verso l'alto quanto è alta la parete,
   * quindi il suo appoggio a terra sta più in basso: comincia `rise` sotto il bordo superiore del quadrato del vertice
   * più alto della colonna e finisce `drop` sotto il bordo inferiore di quello più basso. Così si cammina dietro la
   * sommità disegnata e ci si ferma contro la base della facciata. Valori legati al disegno delle mura.
   */
  readonly walls: { readonly rise: number; readonly drop: number };
  /** Ostacoli sparsi: una cella di `cellTiles` tile ne contiene al più uno, spostato dal centro al più di `jitter`. */
  readonly scatter: { readonly cellTiles: number; readonly jitter: number; readonly groveScale: number };
}

/**
 * Il mondo aperto. Valori tutti provvisori. Cinque fasce, dal Bosco Verde alle Distese Gelate: le successive si
 * aggiungono in coda a `biomes` e la mappa si allunga verso sud senza cambiare ciò che sta a nord.
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
      obstacles: { density: 0.22, groveDensity: 0.85, groveThreshold: 0.55,
        kinds: [{ kind: 'oak', weight: 3 }, { kind: 'birch', weight: 2 }, { kind: 'fir', weight: 2 }, { kind: 'maple', weight: 1 }, { kind: 'bush', weight: 2 }, { kind: 'berry_bush', weight: 1 }, { kind: 'boulder', weight: 1 }, { kind: 'mossy_rocks', weight: 1 }, { kind: 'stump', weight: 1 }],
        decals: { density: 0.18, kinds: [{ kind: 'tall_grass', weight: 3 }, { kind: 'flowers', weight: 2 }] } },
      // Nemici semplici: inseguono o scoppiano.
      mobs: { perRegion: 4, groupSizes: [1, 3, 6, 3, 1], healthScale: 1, reward: { xp: 4, gold: 3 },
        pool: [{ minion: 'goblin', weight: 4 }, { minion: 'kobold', weight: 3 }, { minion: 'goblin_slinger', weight: 2 }, { minion: 'mushroom_walker', weight: 2 }, { minion: 'grey_wolf', weight: 2 }],
        ruins: [{ minion: 'ruin_skeleton', weight: 1 }] },
    },
    {
      id: 'mistmoor', name: 'Brughiera delle Nebbie', tier: 1, rows: 256, ground: 'moor',
      // Niente erba verde sulla brughiera: i rovi secchi la riempiono senza stonare.
      obstacles: { density: 0.16, groveDensity: 0.6, groveThreshold: 0.6,
        kinds: [{ kind: 'dead_tree', weight: 2 }, { kind: 'crooked_tree', weight: 2 }, { kind: 'yew', weight: 2 }, { kind: 'thorn_tree', weight: 1 }, { kind: 'moor_rock', weight: 2 }, { kind: 'thorn_bush', weight: 2 }, { kind: 'bone_pile', weight: 1 }],
        decals: { density: 0, kinds: [] } },
      // Nemici con più mosse: tiratori, cariche annunciate, scheletri che si rialzano.
      mobs: { perRegion: 5, groupSizes: [1, 2, 5, 4, 2], healthScale: 1.5, reward: { xp: 8, gold: 6 },
        pool: [{ minion: 'zombie', weight: 3 }, { minion: 'ghoul', weight: 3 }, { minion: 'ruin_skeleton', weight: 2 }, { minion: 'novice_cultist', weight: 2 }, { minion: 'grey_wolf', weight: 1 }],
        ruins: [{ minion: 'ruin_skeleton', weight: 1 }] },
    },
    // Le fasce successive usano per ora i servitori a terra del dungeon con lo stesso tema, in attesa dei loro sprite.
    {
      id: 'rotmarsh', name: 'Palude Marcia', tier: 2, rows: 256, ground: 'bog',
      obstacles: { density: 0.18, groveDensity: 0.7, groveThreshold: 0.58,
        kinds: [{ kind: 'swamp_tree', weight: 2 }, { kind: 'willow', weight: 2 }, { kind: 'mangrove', weight: 2 }, { kind: 'rotten_trunk', weight: 1 }, { kind: 'reeds', weight: 3 }, { kind: 'giant_mushrooms', weight: 2 }, { kind: 'stump', weight: 1 }],
        decals: { density: 0, kinds: [] } },
      mobs: { perRegion: 5, groupSizes: [1, 2, 5, 4, 2], healthScale: 2, reward: { xp: 12, gold: 9 },
        pool: [{ minion: 'sporeling', weight: 3 }, { minion: 'bog_toad', weight: 2 }, { minion: 'leech', weight: 2 }, { minion: 'night_washer', weight: 2 }, { minion: 'black_pike', weight: 1 }, { minion: 'bombardier_beetle', weight: 1 }, { minion: 'weaver_spider', weight: 1 }],
        ruins: [{ minion: 'ruin_skeleton', weight: 1 }] },
    },
    {
      id: 'frostreach', name: 'Distese Gelate', tier: 3, rows: 256, ground: 'snow',
      obstacles: { density: 0.18, groveDensity: 0.75, groveThreshold: 0.55,
        kinds: [{ kind: 'snow_pine', weight: 2 }, { kind: 'spruce', weight: 2 }, { kind: 'frozen_birch', weight: 2 }, { kind: 'iced_tree', weight: 1 }, { kind: 'snow_rock', weight: 2 }, { kind: 'ice_crystals', weight: 2 }, { kind: 'snowy_bush', weight: 2 }],
        decals: { density: 0, kinds: [] } },
      mobs: { perRegion: 5, groupSizes: [1, 2, 5, 4, 2], healthScale: 2.6, reward: { xp: 16, gold: 12 },
        pool: [{ minion: 'snow_wolf', weight: 3 }, { minion: 'arctic_fox', weight: 3 }, { minion: 'frost_apprentice', weight: 2 }, { minion: 'ermine', weight: 2 }, { minion: 'ice_ram', weight: 1 }, { minion: 'star_reader', weight: 1 }],
        ruins: [{ minion: 'ruin_skeleton', weight: 1 }] },
    },
    // Le Lande di Cenere preparano l'Abisso: terra bruciata, braci, i primi servitori della Fucina.
    {
      id: 'ashlands', name: 'Lande di Cenere', tier: 4, rows: 256, ground: 'ash',
      obstacles: { density: 0.14, groveDensity: 0.55, groveThreshold: 0.6,
        kinds: [{ kind: 'charred_tree', weight: 2 }, { kind: 'split_charred_tree', weight: 2 }, { kind: 'petrified_tree', weight: 2 }, { kind: 'ember_tree', weight: 1 }, { kind: 'ash_rock', weight: 2 }, { kind: 'obsidian_rocks', weight: 3 }],
        decals: { density: 0, kinds: [] } },
      mobs: { perRegion: 6, groupSizes: [1, 2, 5, 4, 2], healthScale: 3.2, reward: { xp: 20, gold: 15 },
        pool: [{ minion: 'damned_miner', weight: 3 }, { minion: 'slag_imp', weight: 2 }, { minion: 'slag_pebble', weight: 2 }, { minion: 'forge_devil', weight: 2 }, { minion: 'molten_slag', weight: 2 }, { minion: 'blaster', weight: 1 }, { minion: 'runaway_cart', weight: 1 }],
        ruins: [{ minion: 'ruin_skeleton', weight: 1 }] },
    },
    // L'ultima fascia: roccia lavica, lava al posto dell'acqua, fuoco; i mostri più forti del mondo.
    {
      id: 'abyss', name: 'Abisso', tier: 5, rows: 256, ground: 'abyss', liquid: 'lava',
      obstacles: { density: 0.13, groveDensity: 0.5, groveThreshold: 0.6,
        kinds: [{ kind: 'obsidian_spire', weight: 2 }, { kind: 'basalt_pillar', weight: 2 }, { kind: 'burning_tree', weight: 2 }, { kind: 'lava_vent', weight: 2 }, { kind: 'skull_pile', weight: 1 }, { kind: 'obsidian_rocks', weight: 2 }],
        decals: { density: 0, kinds: [] } },
      mobs: { perRegion: 6, groupSizes: [1, 1, 4, 4, 3], healthScale: 4.5, reward: { xp: 30, gold: 22 },
        pool: [{ minion: 'anvil_golem', weight: 2 }, { minion: 'ore_giant', weight: 1 }, { minion: 'molten_slag', weight: 3 }, { minion: 'slag_imp', weight: 3 }, { minion: 'forge_devil', weight: 2 }, { minion: 'blaster', weight: 2 }],
        ruins: [{ minion: 'ruin_skeleton', weight: 1 }] },
    },
  ],
  borderWobble: 3,
  coast: { min: 6, wobble: 6 },
  spawn: { row: 14, half: 5 },
  mainPath: { halfWidth: 2, stretch: 96, shift: 24 },
  roads: { halfWidth: 1, rowSpacing: 128, rowOffset: 64, columns: [0.19, 0.81], edgeGap: 18 },
  ponds: { scale: 26, threshold: 0.74, roadGap: 5, borderGap: 5 },
  ruins: { fromColumn: 0.66, scale: 40, threshold: 0.55, grid: 8, segment: 4, fill: 0.55, edgeGap: 4 },
  walls: { rise: 55, drop: 8 },
  scatter: { cellTiles: 4, jitter: 36, groveScale: 5 },
};

export const worldHeightTiles = (definition: WorldDefinition): number => definition.biomes.reduce((rows, biome) => rows + biome.rows, 0);
