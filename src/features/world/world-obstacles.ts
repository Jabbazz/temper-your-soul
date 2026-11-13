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

/** Misure provvisorie, in unità di mondo. Id stabili. */
export const WORLD_OBSTACLE_KINDS = {
  oak: { visual: 'oak', shape: { type: 'circle', radius: 10 } },
  bush: { visual: 'bush', shape: { type: 'circle', radius: 9 } },
  boulder: { visual: 'boulder', shape: { type: 'circle', radius: 14 } },
  dead_tree: { visual: 'dead_tree', shape: { type: 'circle', radius: 9 } },
  moor_rock: { visual: 'moor_rock', shape: { type: 'circle', radius: 14 } },
} as const satisfies Record<string, WorldObstacleKind>;

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
