/*
 * Ombre a terra in pixel art: ellissi piene a pixel interi, un solo tono, senza sfumature. Le usano giocatori,
 * nemici, boss e ostacoli del mondo, così tutte le ombre hanno lo stesso disegno. Solo aspetto.
 */

/** Le righe di un'ellisse piena larga `width` e alta `height` (pixel interi): `row(dx, y, w)` con dx dal bordo sinistro. */
export function rasterEllipse(width: number, height: number, row: (dx: number, y: number, w: number) => void): void {
  for (let y = 0; y < height; y++) {
    const dy = (y + 0.5 - height / 2) / (height / 2), half = Math.round((width / 2) * Math.sqrt(Math.max(0, 1 - dy * dy)));
    if (half > 0) row(Math.round(width / 2) - half, y, half * 2);
  }
}

/** Un'ombra centrata in `cx`, con il bordo inferiore sulla riga `bottom` (esclusa). */
export function drawPixelShadow(ctx: CanvasRenderingContext2D, cx: number, bottom: number, width: number, height: number, color: string): void {
  const left = Math.round(cx - width / 2), top = Math.round(bottom) - height;
  ctx.fillStyle = color;
  rasterEllipse(width, height, (dx, y, w) => ctx.fillRect(left + dx, top + y, w, 1));
}

/** L'ombra sotto i piedi di un corpo di raggio `radius`: schiacciata dalla prospettiva, centrata sui piedi. */
export function footShadowSize(radius: number): { readonly width: number; readonly height: number } {
  return { width: 2 * Math.round(radius * 1.2), height: Math.max(3, Math.round(radius * 0.7)) };
}
