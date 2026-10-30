import type { Camera } from '../../core/camera';
import { TAU } from '../../core/vec2';
import { ARENA } from '../arena/arena';
import { ARENA_LAYOUT } from '../arena/arena-layout';

/** Disegna il pavimento, il muro perimetrale, i cerchi runici e le torce, solo per la parte visibile. */
export function drawArena(ctx: CanvasRenderingContext2D, camera: Camera, clock: number): void {
  const { x: camX, y: camY } = camera.position;
  const { tileSize, carpet } = ARENA_LAYOUT;

  // Il margine copre l'arrotondamento della traslazione e la scossa dello schermo.
  ctx.fillStyle = '#10151d';
  ctx.fillRect(camX - 4, camY - 4, camera.width + 8, camera.height + 8);

  const x0 = Math.max(0, Math.floor(camX / tileSize) * tileSize);
  const y0 = Math.max(0, Math.floor(camY / tileSize) * tileSize);
  for (let y = y0; y < Math.min(ARENA.height, camY + camera.height + tileSize); y += tileSize) {
    for (let x = x0; x < Math.min(ARENA.width, camX + camera.width + tileSize); x += tileSize) {
      const n = Math.sin(x * 17 + y * 31) * 0.5 + 0.5;
      ctx.fillStyle = n > 0.8 ? '#292f39' : n > 0.4 ? '#252b34' : '#222831';
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = '#1a2029';
      ctx.fillRect(x, y, tileSize, 1);
      ctx.fillRect(x, y, 1, tileSize);
      if (n > 0.85) {
        ctx.fillStyle = '#363b45';
        ctx.fillRect(x + 6, y + 7, 9, 2);
        ctx.fillStyle = '#1b2129';
        ctx.fillRect(x + 19, y + 18, 2, 8);
      }
      if ((x > carpet.xMin && x < carpet.xMax) || (y > carpet.yMin && y < carpet.yMax)) {
        ctx.fillStyle = '#38313c50';
        ctx.fillRect(x + 2, y + 2, 28, 28);
      }
    }
  }

  // Il muro perimetrale appartiene al mondo, non allo schermo.
  const wall = ARENA.wallThickness;
  ctx.fillStyle = '#424652';
  ctx.fillRect(0, 0, ARENA.width, wall);
  ctx.fillRect(0, ARENA.height - wall, ARENA.width, wall);
  ctx.fillRect(0, 0, wall, ARENA.height);
  ctx.fillRect(ARENA.width - wall, 0, wall, ARENA.height);

  for (const circle of ARENA_LAYOUT.runeCircles) {
    if (!camera.isVisible(circle, 140)) continue;
    ctx.strokeStyle = '#575064';
    ctx.lineWidth = 2;
    for (const r of [90, 108]) {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, r, 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.save();
      ctx.translate(circle.x + Math.cos(a) * 99, circle.y + Math.sin(a) * 99);
      ctx.rotate(a);
      ctx.fillStyle = '#8b6b94';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
  }

  const { start, spacing } = ARENA_LAYOUT.torches;
  for (let x = start; x < ARENA.width; x += spacing) {
    for (let y = start; y < ARENA.height; y += spacing) {
      if (x < camX - 30 || x > camX + camera.width + 30 || y < camY - 30 || y > camY + camera.height + 30) continue;
      ctx.fillStyle = '#10151e70';
      ctx.fillRect(x - 12, y, 28, 13);
      ctx.fillStyle = '#504b58';
      ctx.fillRect(x - 7, y - 8, 14, 15);
      ctx.fillStyle = '#e7a76c';
      ctx.fillRect(x - 4, y - 17, 8, 10);
      ctx.fillStyle = '#ffe4a0';
      ctx.fillRect(x - 2, y - 19 + Math.sin(clock * 8 + x) * 2, 4, 7);
    }
  }
}
