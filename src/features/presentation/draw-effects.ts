import type { Camera } from '../../core/camera';
import { clamp, TAU, type Vec2 } from '../../core/vec2';
import type { Effects } from './effects';

export function drawText(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  color = '#d8d0c8',
  size = 12,
  align: CanvasTextAlign = 'left',
): void {
  ctx.fillStyle = color;
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

/** Onde e particelle, a luce additiva. */
export function drawGlowEffects(ctx: CanvasRenderingContext2D, effects: Effects): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const w of effects.waves) {
    const u = 1 - w.remaining / w.total;
    ctx.globalAlpha = (1 - u) * 0.85;
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 1 + (1 - u) * 5;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.radius * Math.sqrt(u), 0, TAU);
    ctx.stroke();
  }
  for (const f of effects.particles) {
    const alpha = clamp(f.remaining / f.total, 0, 1);
    const size = Math.max(1, f.size * Math.sqrt(alpha));
    ctx.fillStyle = f.color;
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillRect(f.x - size, f.y - size, size * 3, size * 3);
    ctx.globalAlpha = alpha;
    ctx.fillRect(Math.round(f.x), Math.round(f.y), size, size);
  }
  ctx.restore();
}

export function drawFloatingTexts(ctx: CanvasRenderingContext2D, effects: Effects): void {
  for (const t of effects.texts) drawText(ctx, t.text, t.x, t.y, t.color, 13, 'center');
}

/** Mirino nel punto del mondo mirato. */
export function drawCrosshair(ctx: CanvasRenderingContext2D, aim: Vec2): void {
  ctx.strokeStyle = '#d0bbef';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(aim.x, aim.y, 7, 0, 7);
  ctx.moveTo(aim.x - 11, aim.y);
  ctx.lineTo(aim.x + 11, aim.y);
  ctx.moveTo(aim.x, aim.y - 11);
  ctx.lineTo(aim.x, aim.y + 11);
  ctx.stroke();
}

/**
 * Freccia ai bordi della vista che indica dov'e' il boss quando e' fuori schermo. In coordinate di vista (non di mondo).
 * I margini lasciano libere le zone coperte dall'interfaccia (barre in alto, skill in basso).
 */
export function drawBossIndicator(ctx: CanvasRenderingContext2D, camera: Camera, player: Vec2, boss: Vec2): void {
  const { width: w, height: h } = camera;
  const bx = boss.x - camera.position.x;
  const by = boss.y - camera.position.y;
  if (!(bx < 30 || bx > w - 30 || by < 85 || by > h - 80)) return;
  const a = Math.atan2(boss.y - player.y, boss.x - player.x);
  const r = Math.min(
    (w / 2 - 40) / Math.max(0.001, Math.abs(Math.cos(a))),
    (h / 2 - 95) / Math.max(0.001, Math.abs(Math.sin(a))),
  );
  const x = w / 2 + Math.cos(a) * Math.max(30, r);
  const y = h / 2 + Math.sin(a) * Math.max(30, r);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = '#f0b380';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-7, -7);
  ctx.lineTo(-7, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawText(ctx, 'BOSS', x, y + 22, '#f0b380', 10, 'center');
}
