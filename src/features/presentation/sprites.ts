/**
 * Pixel art definita come matrici di caratteri: ogni carattere e' un colore della tavolozza, il punto e' trasparente.
 * Usata dai boss e dai servitori disegnati a matrici.
 */
export type SpriteFrame = readonly string[];
export type Palette = Readonly<Record<string, string>>;

// --- Disegno ------------------------------------------------------------------------------------------------------

/** Disegna una matrice di caratteri centrata su (x, y), con pixel quadrati di lato `scale`. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame,
  x: number,
  y: number,
  scale: number,
  palette: Palette,
): void {
  frame.forEach((row, j) => {
    [...row].forEach((symbol, i) => {
      const color = palette[symbol];
      if (color === undefined) return;
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.round(x + (i - row.length / 2) * scale),
        Math.round(y + (j - frame.length / 2) * scale),
        scale,
        scale,
      );
    });
  });
}
