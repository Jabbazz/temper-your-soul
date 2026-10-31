import type { Camera } from '../../../core/camera';
import { TAU, Vec2 } from '../../../core/vec2';
import type { ArenaDefinition, Pillar } from '../../arena/arena';
import type { ArenaTheme } from './theme';
import { FloorCache } from '../floor-cache';

/** Decorazione della cripta (solo aspetto, coordinate assolute dell'arena della cripta). Valori del prototipo. */
const CRYPT_DECOR = {
  /** Lato delle piastrelle del pavimento. */
  tileSize: 32,
  /** Fasce centrali piu' scure (tappeto): una verticale e una orizzontale, estremi esclusi. */
  carpet: { xMin: 1440, xMax: 1760, yMin: 1040, yMax: 1280 },
  /** Cerchi runici sul pavimento: il primo e' sotto il boss. */
  runeCircles: [new Vec2(1600, 1100), new Vec2(640, 640), new Vec2(2560, 640), new Vec2(640, 1792), new Vec2(2560, 1792)],
  /** Torce su una griglia regolare. */
  torches: { start: 256, spacing: 384 },
};

function drawStaticFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  const { x: camX, y: camY } = camera.position;
  const { tileSize, carpet } = CRYPT_DECOR;

  // Il margine copre l'arrotondamento della traslazione e la scossa dello schermo.
  ctx.fillStyle = '#10151d';
  ctx.fillRect(camX - 4, camY - 4, camera.width + 8, camera.height + 8);

  const x0 = Math.max(0, Math.floor(camX / tileSize) * tileSize);
  const y0 = Math.max(0, Math.floor(camY / tileSize) * tileSize);
  for (let y = y0; y < Math.min(arena.height, camY + camera.height + tileSize); y += tileSize) {
    for (let x = x0; x < Math.min(arena.width, camX + camera.width + tileSize); x += tileSize) {
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
  const wall = arena.wallThickness;
  ctx.fillStyle = '#424652';
  ctx.fillRect(0, 0, arena.width, wall);
  ctx.fillRect(0, arena.height - wall, arena.width, wall);
  ctx.fillRect(0, 0, wall, arena.height);
  ctx.fillRect(arena.width - wall, 0, wall, arena.height);

  for (const circle of CRYPT_DECOR.runeCircles) {
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

}

const floorCache = new FloorCache(drawStaticFloor);

function drawFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  floorCache.draw(ctx, arena, camera);
  const { x: camX, y: camY } = camera.position;
  const { start, spacing } = CRYPT_DECOR.torches;
  for (let x = start; x < arena.width; x += spacing) {
    for (let y = start; y < arena.height; y += spacing) {
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

/** Colonna di pietra (la cripta del prototipo non ne ha: serve se una mappa con tema cripta ne usa). */
function drawPillar(ctx: CanvasRenderingContext2D, pillar: Pillar, camera: Camera): void {
  if (!camera.isVisible(pillar.position, pillar.radius + 20)) return;
  const { x, y } = pillar.position;
  ctx.fillStyle = '#10151e80';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + pillar.radius * 0.5, pillar.radius * 1.05, pillar.radius * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#4a4f5c';
  ctx.beginPath();
  ctx.arc(x, y, pillar.radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#6b7080';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#5c6270';
  ctx.beginPath();
  ctx.arc(x - pillar.radius * 0.25, y - pillar.radius * 0.25, pillar.radius * 0.55, 0, TAU);
  ctx.fill();
}

export const cryptTheme: ArenaTheme = { drawFloor, drawPillar };
