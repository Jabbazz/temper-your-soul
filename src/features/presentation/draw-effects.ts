import type { Camera } from '../../core/camera';
import { clamp, TAU, type Vec2 } from '../../core/vec2';
import { FEEDBACK, type Effects } from './effects';

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

/** Onde, fendenti e scintille d'impatto, a luce additiva. */
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
  for (const slash of effects.slashes) {
    const u = 1 - slash.remaining / slash.total;
    ctx.globalAlpha = (1 - u) * 0.9;
    ctx.strokeStyle = slash.color;
    ctx.lineWidth = 3 + (1 - u) * 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(slash.position.x, slash.position.y, slash.range * (0.75 + u * 0.25), slash.angle - slash.arc / 2, slash.angle + slash.arc / 2);
    ctx.stroke();
  }
  for (const spark of effects.sparks) {
    // Scintilla d'impatto: una stella a quattro punte che si allarga e svanisce in un lampo.
    const u = 1 - spark.remaining / spark.total;
    const r = spark.size * (0.6 + u * 0.6);
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = spark.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = spark.angle + (i * Math.PI) / 2;
      ctx.moveTo(spark.x, spark.y);
      ctx.lineTo(spark.x + Math.cos(a) * r, spark.y + Math.sin(a) * r);
    }
    ctx.stroke();
    ctx.fillStyle = spark.color;
    ctx.fillRect(spark.x - 2, spark.y - 2, 4, 4);
  }
  ctx.restore();
}

/** Particelle (scie, scoppi), a luce additiva. Si disegnano sotto i proiettili nemici, che non devono sbiadire. */
export function drawParticles(ctx: CanvasRenderingContext2D, effects: Effects): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
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

/** Durata del "pop" iniziale dei testi (si ingrandiscono e tornano alla misura normale). */
const TEXT_POP = 0.12;

/**
 * Numeri del danno e nomi degli attacchi: grassetto con contorno scuro (leggibili su ogni pavimento), un piccolo "pop"
 * all'apparizione e dissolvenza nell'ultimo terzo della vita.
 */
export function drawFloatingTexts(ctx: CanvasRenderingContext2D, effects: Effects): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (const t of effects.texts) {
    const age = t.total - t.remaining;
    const pop = age < TEXT_POP ? 1 + 0.45 * (1 - age / TEXT_POP) : 1;
    ctx.globalAlpha = clamp(t.remaining / (t.total / 3), 0, 1);
    ctx.font = `bold ${Math.round(t.size * pop)}px monospace`;
    if (t.outline) {
      ctx.strokeStyle = '#120d16';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
    }
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}

/**
 * Effetti a tutto schermo, in coordinate di vista: vignetta rossa per i colpi subiti e il battito a vita bassa, lampo
 * rosso del passaggio in furia, lampo bianco del colpo finale.
 */
export function drawScreenEffects(ctx: CanvasRenderingContext2D, camera: Camera, effects: Effects, healthFraction: number, clock: number): void {
  const { width: w, height: h } = camera;
  // Sotto il 30% di vita la vignetta pulsa come un battito, piu' forte quanto meno vita resta.
  const low = healthFraction > 0 && healthFraction < LOW_HEALTH ? (1 - healthFraction / LOW_HEALTH) * (0.18 + 0.12 * Math.sin(clock * 7)) : 0;
  const red = Math.min(0.75, effects.hurtFlash / FEEDBACK.hurtFlash * 0.55 + low);
  if (red > 0.01) {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7);
    gradient.addColorStop(0, '#b0141000');
    gradient.addColorStop(1, `rgba(176, 20, 16, ${red.toFixed(3)})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
  if (effects.rageFlash > 0) {
    ctx.fillStyle = `rgba(255, 70, 40, ${(effects.rageFlash / FEEDBACK.rageFlash * 0.28).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (effects.screenFlash > 0) {
    ctx.fillStyle = `rgba(255, 246, 220, ${(effects.screenFlash / FEEDBACK.screenFlash * 0.7).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Sotto questa frazione di vita la vignetta rossa pulsa. Provvisorio. */
export const LOW_HEALTH = 0.3;

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
export function drawBossIndicator(ctx: CanvasRenderingContext2D, camera: Camera, player: Vec2, boss: Vec2, label = 'BOSS', color = '#f0b380'): void {
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
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-7, -7);
  ctx.lineTo(-7, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawText(ctx, label, x, y + 22, color, 10, 'center');
}
