import { clamp, Vec2 } from '../../core/vec2';

/** Temi grafici delle mappe: ognuno ha il proprio disegno in `presentation/themes/`. */
export type ArenaThemeId = 'crypt' | 'swamp' | 'forge' | 'glacier';

/** Ostacolo cilindrico: blocca il movimento del giocatore e assorbe i proiettili (di entrambe le squadre). Il boss lo ignora. */
export interface Pillar {
  readonly position: Vec2;
  readonly radius: number;
}

/**
 * La mappa di un dungeon: dimensioni, punti di partenza, margini e ostacoli. Dati di sola lettura, provvisori
 * (vedi docs/game-design.md). Le coordinate sono in unita' di mondo; l'origine e' l'angolo alto a sinistra.
 * Vincolo dei dati: i pilastri stanno a distanza dai bordi (almeno `playerMargin` + raggio + corpo del giocatore) e non
 * coprono i punti di partenza.
 */
export interface ArenaDefinition {
  readonly id: string;
  /** Nome della mappa (in italiano). */
  readonly name: string;
  readonly theme: ArenaThemeId;
  readonly width: number;
  readonly height: number;
  /** Spessore del muro perimetrale (solo aspetto: il confine di gioco e' dato dai margini sotto). */
  readonly wallThickness: number;
  readonly playerSpawn: Vec2;
  readonly bossSpawn: Vec2;
  /** Distanza minima dal bordo per il centro del giocatore, dei suoi spostamenti e del bersaglio delle zone del giocatore. */
  readonly playerMargin: number;
  /** Distanza minima dal bordo per il centro del boss e per i suoi bersagli (carica, fratture). */
  readonly bossMargin: number;
  /** Un proiettile che esce da questo margine scompare. */
  readonly projectileMargin: number;
  readonly pillars: readonly Pillar[];
}

/** Limita un punto all'arena, lasciando `margin` unita' dal bordo. */
export function clampToArena(arena: ArenaDefinition, point: Vec2, margin: number): Vec2 {
  return new Vec2(clamp(point.x, margin, arena.width - margin), clamp(point.y, margin, arena.height - margin));
}

/** Vero se il punto e' fuori dall'area in cui un proiettile puo' vivere. */
export function isOutsideProjectileBounds(arena: ArenaDefinition, point: Vec2): boolean {
  const m = arena.projectileMargin;
  return point.x < m || point.x > arena.width - m || point.y < m || point.y > arena.height - m;
}

/** Il pilastro che contiene il punto (con `extra` di margine), se c'e'. */
export function pillarAt(arena: ArenaDefinition, point: Vec2, extra = 0): Pillar | undefined {
  return arena.pillars.find((pillar) => point.distanceTo(pillar.position) < pillar.radius + extra);
}

/** Spinge un corpo circolare di raggio `bodyRadius` fuori dai pilastri (scivola lungo la superficie). */
export function pushOutOfPillars(arena: ArenaDefinition, point: Vec2, bodyRadius: number): Vec2 {
  let result = point;
  // Piu' passate: uscire da un pilastro puo' portare dentro un altro vicino.
  for (let pass = 0; pass < 3; pass++) {
    for (const pillar of arena.pillars) {
      const offset = result.sub(pillar.position);
      const distance = offset.length();
      const minimum = pillar.radius + bodyRadius;
      if (distance >= minimum) continue;
      const direction = distance > 0 ? offset.mul(1 / distance) : new Vec2(1, 0);
      result = pillar.position.add(direction.mul(minimum));
    }
  }
  return result;
}
