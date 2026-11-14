/**
 * Ostacoli sparsi del mondo: alberi, cespugli, rocce. Le mura sono un terreno, non un ostacolo. La posizione di un ostacolo è il centro del suo appoggio a terra; la sagoma
 * qui sotto è solo quell'appoggio (il tronco, non la chioma), così il disegno può sporgere sopra senza bloccare.
 */
export type ObstacleShape =
  | { readonly type: 'circle'; readonly radius: number }
  | { readonly type: 'box'; readonly halfWidth: number; readonly halfHeight: number };

export interface WorldObstacleKind {
  /** Id dell'aspetto: la rappresentazione sceglie il disegno da qui. */
  readonly visual: string;
  readonly shape: ObstacleShape;
}

/**
 * Misure provvisorie, in unità di mondo. Id stabili. I primi cinque sono sparsi a caso (`BiomeObstacles`); gli altri
 * sono arredi messi da regole (`world-decor.ts`): staccionate lungo le strade, statue agli incroci, tombe nei cimiteri.
 * Gli arredi hanno un appoggio rettangolare basso, alla base del disegno, come vuole la prospettiva.
 */
export const WORLD_OBSTACLE_KINDS = {
  oak: { visual: 'oak', shape: { type: 'circle', radius: 13 } },
  bush: { visual: 'bush', shape: { type: 'circle', radius: 9 } },
  boulder: { visual: 'boulder', shape: { type: 'circle', radius: 14 } },
  dead_tree: { visual: 'dead_tree', shape: { type: 'circle', radius: 11 } },
  moor_rock: { visual: 'moor_rock', shape: { type: 'circle', radius: 14 } },
  stump: { visual: 'stump', shape: { type: 'circle', radius: 10 } },
  thorn_bush: { visual: 'thorn_bush', shape: { type: 'circle', radius: 9 } },
  swamp_tree: { visual: 'swamp_tree', shape: { type: 'circle', radius: 12 } },
  reeds: { visual: 'reeds', shape: { type: 'circle', radius: 8 } },
  charred_tree: { visual: 'charred_tree', shape: { type: 'circle', radius: 11 } },
  ash_rock: { visual: 'ash_rock', shape: { type: 'circle', radius: 14 } },
  snow_pine: { visual: 'snow_pine', shape: { type: 'circle', radius: 12 } },
  snow_rock: { visual: 'snow_rock', shape: { type: 'circle', radius: 14 } },
  // Altri alberi e oggetti per fascia, per non ripetere sempre gli stessi (13 novembre).
  birch: { visual: 'birch', shape: { type: 'circle', radius: 11 } },
  fir: { visual: 'fir', shape: { type: 'circle', radius: 12 } },
  maple: { visual: 'maple', shape: { type: 'circle', radius: 13 } },
  berry_bush: { visual: 'berry_bush', shape: { type: 'circle', radius: 9 } },
  mossy_rocks: { visual: 'mossy_rocks', shape: { type: 'circle', radius: 11 } },
  crooked_tree: { visual: 'crooked_tree', shape: { type: 'circle', radius: 11 } },
  yew: { visual: 'yew', shape: { type: 'circle', radius: 12 } },
  thorn_tree: { visual: 'thorn_tree', shape: { type: 'circle', radius: 11 } },
  bone_pile: { visual: 'bone_pile', shape: { type: 'circle', radius: 9 } },
  willow: { visual: 'willow', shape: { type: 'circle', radius: 13 } },
  mangrove: { visual: 'mangrove', shape: { type: 'circle', radius: 13 } },
  rotten_trunk: { visual: 'rotten_trunk', shape: { type: 'circle', radius: 11 } },
  giant_mushrooms: { visual: 'giant_mushrooms', shape: { type: 'circle', radius: 10 } },
  spruce: { visual: 'spruce', shape: { type: 'circle', radius: 11 } },
  frozen_birch: { visual: 'frozen_birch', shape: { type: 'circle', radius: 11 } },
  iced_tree: { visual: 'iced_tree', shape: { type: 'circle', radius: 11 } },
  ice_crystals: { visual: 'ice_crystals', shape: { type: 'circle', radius: 10 } },
  snowy_bush: { visual: 'snowy_bush', shape: { type: 'circle', radius: 9 } },
  split_charred_tree: { visual: 'split_charred_tree', shape: { type: 'circle', radius: 11 } },
  petrified_tree: { visual: 'petrified_tree', shape: { type: 'circle', radius: 12 } },
  ember_tree: { visual: 'ember_tree', shape: { type: 'circle', radius: 11 } },
  obsidian_rocks: { visual: 'obsidian_rocks', shape: { type: 'circle', radius: 11 } },
  obsidian_spire: { visual: 'obsidian_spire', shape: { type: 'circle', radius: 12 } },
  basalt_pillar: { visual: 'basalt_pillar', shape: { type: 'circle', radius: 13 } },
  burning_tree: { visual: 'burning_tree', shape: { type: 'circle', radius: 11 } },
  lava_vent: { visual: 'lava_vent', shape: { type: 'circle', radius: 11 } },
  skull_pile: { visual: 'skull_pile', shape: { type: 'circle', radius: 9 } },
  fence: { visual: 'fence', shape: { type: 'box', halfWidth: 22, halfHeight: 3 } },
  knight_statue: { visual: 'knight_statue', shape: { type: 'box', halfWidth: 14, halfHeight: 7 } },
  gravestone: { visual: 'gravestone', shape: { type: 'box', halfWidth: 9, halfHeight: 4 } },
  grave_cross: { visual: 'grave_cross', shape: { type: 'box', halfWidth: 8, halfHeight: 4 } },
  angel_statue: { visual: 'angel_statue', shape: { type: 'box', halfWidth: 14, halfHeight: 7 } },
} as const satisfies Record<string, WorldObstacleKind>;

/** Decorazioni a terra: solo disegno, nessuna collisione (fiori, erba alta). Id stabili. */
export const WORLD_DECAL_KINDS = {
  flowers: { visual: 'flowers' },
  tall_grass: { visual: 'tall_grass' },
} as const satisfies Record<string, { readonly visual: string }>;

export type WorldDecalKindId = keyof typeof WORLD_DECAL_KINDS;

/** Una decorazione a terra: il punto è il centro della sua base. */
export interface WorldDecal {
  readonly kind: WorldDecalKindId;
  readonly x: number;
  readonly y: number;
}

/** Quanto sotto il centro dell'appoggio arriva la base del disegno (dove il disegno tocca terra). */
export function obstacleFoot(shape: ObstacleShape): number {
  return shape.type === 'circle' ? Math.round(shape.radius * 0.6) : shape.halfHeight;
}

export type WorldObstacleKindId = keyof typeof WORLD_OBSTACLE_KINDS;

export interface WorldObstacle {
  readonly kind: WorldObstacleKindId;
  readonly x: number;
  readonly y: number;
}

const KINDS: Readonly<Record<string, WorldObstacleKind>> = WORLD_OBSTACLE_KINDS;

/** Quanto un appoggio può sporgere dal proprio centro: serve a chi cerca gli ostacoli vicini a un punto. */
export const MAX_OBSTACLE_EXTENT = Math.max(...Object.values(KINDS).map(({ shape }) =>
  shape.type === 'circle' ? shape.radius : Math.max(shape.halfWidth, shape.halfHeight)));

/** Vero se un cerchio (un corpo) tocca l'appoggio dell'ostacolo. */
export function obstacleTouchesCircle(obstacle: WorldObstacle, x: number, y: number, radius: number): boolean {
  const shape = KINDS[obstacle.kind]!.shape;
  if (shape.type === 'circle') return Math.hypot(x - obstacle.x, y - obstacle.y) < radius + shape.radius;
  const dx = Math.max(Math.abs(x - obstacle.x) - shape.halfWidth, 0), dy = Math.max(Math.abs(y - obstacle.y) - shape.halfHeight, 0);
  return dx * dx + dy * dy < radius * radius;
}
