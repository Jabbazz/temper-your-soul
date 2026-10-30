import { clamp, Vec2 } from '../../core/vec2';

/**
 * L'arena: la cripta del guardiano. Valori ereditati dal prototipo, provvisori (vedi docs/game-design.md).
 * Le coordinate sono in unita' di mondo; l'origine e' l'angolo alto a sinistra.
 */
export const ARENA = {
  width: 3200,
  height: 2400,
  /** Spessore del muro perimetrale (solo aspetto: il confine di gioco e' dato dai margini sotto). */
  wallThickness: 24,
  playerSpawn: new Vec2(1600, 1350),
  bossSpawn: new Vec2(1600, 1100),
  /** Distanza minima dal bordo per il centro del giocatore, dei suoi spostamenti e del bersaglio della meteora. */
  playerMargin: 40,
  /** Distanza minima dal bordo per il centro del boss e per i suoi bersagli (carica, fratture). */
  bossMargin: 60,
  /** Un proiettile che esce da questo margine scompare. */
  projectileMargin: 24,
} as const;

/** Limita un punto all'arena, lasciando `margin` unita' dal bordo. */
export function clampToArena(point: Vec2, margin: number): Vec2 {
  return new Vec2(clamp(point.x, margin, ARENA.width - margin), clamp(point.y, margin, ARENA.height - margin));
}

/** Vero se il punto e' fuori dall'area in cui un proiettile puo' vivere. */
export function isOutsideProjectileBounds(point: Vec2): boolean {
  const m = ARENA.projectileMargin;
  return point.x < m || point.x > ARENA.width - m || point.y < m || point.y > ARENA.height - m;
}
