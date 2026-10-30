import { Vec2 } from '../../core/vec2';

/**
 * Disposizione decorativa della cripta: solo aspetto, nessuna regola di gioco (le collisioni sono in `arena.ts`).
 * Valori ereditati dal prototipo.
 */
export const ARENA_LAYOUT = {
  /** Lato delle piastrelle del pavimento. */
  tileSize: 32,
  /** Fasce centrali piu' scure (tappeto): una verticale e una orizzontale, estremi esclusi. */
  carpet: { xMin: 1440, xMax: 1760, yMin: 1040, yMax: 1280 },
  /** Cerchi runici sul pavimento: il primo e' sotto il boss. */
  runeCircles: [new Vec2(1600, 1100), new Vec2(640, 640), new Vec2(2560, 640), new Vec2(640, 1792), new Vec2(2560, 1792)],
  /** Torce su una griglia regolare. */
  torches: { start: 256, spacing: 384 },
} as const;
