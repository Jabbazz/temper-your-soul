import type { Camera } from '../../core/camera';

/*
 * Luce finta: aloni radiali in cache, sommati al pavimento ('lighter') sotto le figure, e un velo di buio ai bordi
 * dello schermo. Non e' un buffer di luce vero (quello e' la fase 1 dello studio sulla grafica): da' un punto caldo a
 * torce, bracieri, lava e funghi e porta l'occhio verso il centro, dove sta il giocatore.
 */

/** Valori provvisori. */
export const LIGHT = {
  /** Trasparenza del buio ai bordi dello schermo. */
  vignetteAlpha: 0.35,
  /** Da quale frazione della mezza diagonale dello schermo comincia il buio. */
  vignetteStart: 0.6,
} as const;

const alphaHex = (alpha: number): string => Math.round(alpha * 255).toString(16).padStart(2, '0');

const sprites = new Map<string, HTMLCanvasElement>();

/** Un alone per colore (#rrggbb) e raggio, in cache: si disegna con una sola drawImage. */
function lightSprite(color: string, radius: number): HTMLCanvasElement {
  const key = `${color}|${radius}`;
  let sprite = sprites.get(key);
  if (sprite) return sprite;
  sprite = document.createElement('canvas');
  sprite.width = radius * 2;
  sprite.height = radius * 2;
  const painter = sprite.getContext('2d')!;
  const gradient = painter.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, `${color}66`);
  gradient.addColorStop(0.35, `${color}2e`);
  gradient.addColorStop(1, `${color}00`);
  painter.fillStyle = gradient;
  painter.fillRect(0, 0, radius * 2, radius * 2);
  sprites.set(key, sprite);
  return sprite;
}

/** Senza DOM (i test girano in Node) non si possono creare gli sprite: luce e vignettatura si saltano. */
const canPaint = (): boolean => typeof document !== 'undefined';

/** Un alone di luce in (x, y), in coordinate di mondo. `intensity` va da 0 a 1 (tremolio, pulsazione). */
export function drawLight(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, radius: number, intensity = 1): void {
  if (!canPaint()) return;
  const r = Math.max(4, Math.round(radius));
  const sprite = lightSprite(color, r);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, Math.min(1, intensity));
  ctx.drawImage(sprite, Math.round(x - r), Math.round(y - r));
  ctx.restore();
}

let vignette: { key: string; canvas: HTMLCanvasElement } | null = null;

/** Il buio ai bordi, in coordinate di schermo (sopra la scena, sotto gli indicatori). Mai al centro. */
export function drawVignette(ctx: CanvasRenderingContext2D, camera: Camera, color: string): void {
  if (!canPaint()) return;
  const width = Math.ceil(camera.width);
  const height = Math.ceil(camera.height);
  const key = `${width}x${height}|${color}`;
  if (vignette?.key !== key) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const painter = canvas.getContext('2d')!;
    const reach = Math.hypot(width, height) / 2;
    const gradient = painter.createRadialGradient(width / 2, height / 2, reach * LIGHT.vignetteStart, width / 2, height / 2, reach);
    gradient.addColorStop(0, `${color}00`);
    gradient.addColorStop(1, `${color}${alphaHex(LIGHT.vignetteAlpha)}`);
    painter.fillStyle = gradient;
    painter.fillRect(0, 0, width, height);
    vignette = { key, canvas };
  }
  ctx.drawImage(vignette.canvas, 0, 0);
}
