import type { Palette, SpriteFrame } from '../sprites';

/**
 * La grafica di un boss: pixel art come matrici di caratteri (vedi `sprites.ts`), con quattro fotogrammi di
 * camminata e una posa di lancio. Solo aspetto: non influisce sulle regole (il raggio di colpo e' in `BossStats`).
 */
export interface BossArt {
  /** Quattro fotogrammi di camminata (il disegno ne sceglie uno in base al tempo; da rallentato va piu' piano). */
  readonly walk: readonly SpriteFrame[];
  /** Posa di lancio (durante gli attacchi). */
  readonly casting: SpriteFrame;
  /** Lato in unita' di mondo di ogni "pixel" della matrice. */
  readonly scale: number;
  /** Ombra a terra: semiassi e distanza sotto il centro. */
  readonly shadow: { readonly radiusX: number; readonly radiusY: number; readonly offsetY: number };
  /** Spostamento verticale dello sprite: in posa di lancio, e nei fotogrammi di camminata pari e dispari. */
  readonly bob: { readonly casting: number; readonly even: number; readonly odd: number };
  /** Tavolozza: cambia con il gelo (rallentato) e con la furia (seconda fase). */
  palette(slowed: boolean, enraged: boolean): Palette;
  /** Ornamenti disegnati sopra lo sprite in posa di lancio (coordinate dello sprite, gia' traslate e specchiate). */
  drawCastFx?(ctx: CanvasRenderingContext2D, enraged: boolean): void;
}
