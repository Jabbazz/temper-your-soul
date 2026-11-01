import { TAU } from '../../core/vec2';
import type { Minion } from '../minions/minion';
import type { Telegraph } from './effects';
import { minionArt } from './minion-art';

/*
 * Segnali a terra dei servitori: dove sta per comparire un nemico, la linea di una carica, il cerchio di un'uscita da
 * sotto terra o di un teletrasporto, il bagliore di una raffica in arrivo. Ogni segnale si riempie col tempo: quando
 * il bordo e' pieno, l'azione parte.
 */

const ELITE_RING = '#ffd889';

/** Colore dell'onda delle aure: scudo azzurro, fervore oro, riparazione ciano. */
const AURA_COLORS = { shield: '#bfefff', haste: '#ffd27a', repair: '#9fe8ff' } as const;

/** Disegna i segnali sotto i personaggi. `minions` serve a far seguire al bagliore della raffica chi la prepara. */
export function drawTelegraphs(ctx: CanvasRenderingContext2D, telegraphs: readonly Telegraph[], minions: readonly Minion[]): void {
  for (const telegraph of telegraphs) {
    const u = 1 - Math.max(0, telegraph.remaining) / telegraph.total;
    switch (telegraph.kind) {
      case 'incoming':
        drawIncoming(ctx, telegraph, u);
        break;
      case 'charge':
        drawChargeLine(ctx, telegraph, u);
        break;
      case 'emerge':
      case 'blink':
        drawCircleMark(ctx, telegraph, u);
        break;
      case 'shot': {
        const minion = minions.find((m) => m.id === telegraph.minionId);
        if (minion !== undefined) drawShotGlow(ctx, minion, u);
        break;
      }
      case 'aura':
        drawAura(ctx, telegraph, u);
        break;
    }
  }
}

/** Comparsa: un cerchio del colore del servitore che si chiude, con il bordo che si riempie. */
function drawIncoming(ctx: CanvasRenderingContext2D, telegraph: Telegraph, u: number): void {
  const color = telegraph.visual ? minionArt(telegraph.visual).color : '#d8c8b0';
  const { x, y } = telegraph.position;
  const radius = 18 + (1 - u) * 14;
  ctx.save();
  ctx.globalAlpha = 0.18 + u * 0.3;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y + 6, radius, radius * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = telegraph.elite ? ELITE_RING : color;
  ctx.lineWidth = telegraph.elite ? 3 : 2;
  ctx.beginPath();
  ctx.ellipse(x, y + 6, radius, radius * 0.5, 0, -Math.PI / 2, -Math.PI / 2 + u * TAU);
  ctx.stroke();
  ctx.restore();
}

/** Carica: la fascia del percorso e il punto d'arrivo, come la carica del boss ma piu' stretta. */
function drawChargeLine(ctx: CanvasRenderingContext2D, telegraph: Telegraph, u: number): void {
  const to = telegraph.to;
  if (to === undefined) return;
  const from = telegraph.position;
  ctx.save();
  ctx.strokeStyle = `rgba(255, 173, 112, ${0.18 + u * 0.25})`;
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.strokeStyle = '#ffbc81';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(to.x, to.y, 14, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/** Uscita da sotto terra o arrivo di un teletrasporto: un cerchio che si riempie. */
function drawCircleMark(ctx: CanvasRenderingContext2D, telegraph: Telegraph, u: number): void {
  const point = telegraph.kind === 'blink' && telegraph.to !== undefined ? telegraph.to : telegraph.position;
  const color = telegraph.kind === 'blink' ? '#cfefff' : '#a6c97a';
  ctx.save();
  ctx.globalAlpha = 0.25 + u * 0.35;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 22, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 26, -Math.PI / 2, -Math.PI / 2 + u * TAU);
  ctx.stroke();
  ctx.restore();
}

/** Raffica in arrivo: un bagliore che cresce sul servitore che la prepara. */
function drawShotGlow(ctx: CanvasRenderingContext2D, minion: Minion, u: number): void {
  const color = minionArt(minion.definition.visual).color;
  const { x, y } = minion.position;
  const radius = minion.hitRadius * (1.2 + u * 0.9);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gradient = ctx.createRadialGradient(x, y, 1, x, y, radius);
  gradient.addColorStop(0, `${color}${u > 0.7 ? 'cc' : '88'}`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}

/** Scudo dei sostegni: un anello azzurro che si allarga. */
function drawAura(ctx: CanvasRenderingContext2D, telegraph: Telegraph, u: number): void {
  const radius = (telegraph.radius ?? 150) * (0.4 + u * 0.6);
  ctx.save();
  ctx.globalAlpha = 1 - u;
  ctx.strokeStyle = AURA_COLORS[telegraph.aura ?? 'shield'];
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(telegraph.position.x, telegraph.position.y, radius, 0, TAU);
  ctx.stroke();
  ctx.restore();
}
