import type { Camera } from '../../../core/camera';
import { TAU } from '../../../core/vec2';
import type { ArenaDefinition, Pillar } from '../../arena/arena';
import { drawLight } from '../lights';
import type { ArenaTheme } from './theme';

/*
 * La palude spenta: acque nere con isolotti di fango, canne, funghi che brillano, nebbia che deriva e alberi morti.
 * Solo aspetto. Il rumore e' deterministico (funzione di posizione), cosi' la mappa e' sempre uguale; `clock` anima
 * increspature, bagliori e nebbia. Si disegna solo cio' che e' nella vista.
 */

const SWAMP_DECOR = {
  /** Lato delle celle di acqua e fango. */
  cell: 48,
  /** Celle raggruppate a blocchi di questo lato: sopra la soglia sono fango, sotto acqua. */
  patchCells: 4,
  mudThreshold: 0.64,
  /** Passo della griglia dei funghi luminosi e della nebbia. */
  mushroomGrid: 170,
  fogGrid: 420,
  water: ['#0b1512', '#0e1a16', '#112019'],
  mud: ['#2a2b1b', '#25261a', '#30301e'],
  wall: { base: '#1b2216', roots: '#2d3a20', moss: '#3f5428' },
  /** Funghi luminosi: cappelli e luce (anche il fungo a mensola sugli alberi). */
  mushroom: { cap: '#5fe0c8', glow: '#2fd0b8', paleCap: '#a8f0ff', paleGlow: '#6fd8ff' },
};

/** Numero pseudo-casuale in [0, 1) che dipende solo dalla posizione. */
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function drawGround(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  const { cell, patchCells, mudThreshold, water, mud } = SWAMP_DECOR;
  const { x: camX, y: camY } = camera.position;
  const x0 = Math.max(0, Math.floor(camX / cell));
  const y0 = Math.max(0, Math.floor(camY / cell));
  const x1 = Math.min(Math.ceil(arena.width / cell), Math.ceil((camX + camera.width) / cell) + 1);
  const y1 = Math.min(Math.ceil(arena.height / cell), Math.ceil((camY + camera.height) / cell) + 1);
  for (let cy = y0; cy < y1; cy++) {
    for (let cx = x0; cx < x1; cx++) {
      const n = hash(cx, cy);
      const isMud = hash(Math.floor(cx / patchCells), Math.floor(cy / patchCells)) > mudThreshold;
      const palette = isMud ? mud : water;
      ctx.fillStyle = palette[n > 0.75 ? 2 : n > 0.35 ? 1 : 0]!;
      ctx.fillRect(cx * cell, cy * cell, cell, cell);
      const px = cx * cell;
      const py = cy * cell;
      if (!isMud && n > 0.7) {
        // Increspatura che oscilla sull'acqua.
        ctx.fillStyle = '#27493b66';
        ctx.fillRect(px + 8, py + 20 + Math.sin(clock * 1.4 + cx * 0.7 + cy) * 3, 20, 2);
      } else if (isMud && n > 0.82) {
        // Ciuffo di canne che ondeggia piano.
        ctx.fillStyle = '#566a2e';
        for (let i = 0; i < 3; i++) {
          const sway = Math.sin(clock * 0.9 + cx + i) * 1.5;
          ctx.fillRect(px + 12 + i * 8 + sway, py + 10 - i * 2, 2, 22);
        }
      } else if (isMud && n < 0.1) {
        ctx.fillStyle = '#1c1d12';
        ctx.fillRect(px + 10, py + 24, 14, 5);
      }
    }
  }
}

function drawWall(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera): void {
  const { wall } = SWAMP_DECOR;
  const t = arena.wallThickness;
  ctx.fillStyle = wall.base;
  ctx.fillRect(0, 0, arena.width, t);
  ctx.fillRect(0, arena.height - t, arena.width, t);
  ctx.fillRect(0, 0, t, arena.height);
  ctx.fillRect(arena.width - t, 0, t, arena.height);
  // Un groviglio di radici e muschio sul lato interno, solo nel tratto visibile.
  const { x: camX, y: camY } = camera.position;
  const step = 36;
  const xa = Math.max(0, Math.floor(camX / step));
  const xb = Math.min(Math.ceil(arena.width / step), Math.ceil((camX + camera.width) / step));
  for (let i = xa; i < xb; i++) {
    const h = hash(i, 3);
    ctx.fillStyle = h > 0.5 ? wall.roots : wall.moss;
    const len = 8 + h * 14;
    if (camY < t + 24) ctx.fillRect(i * step, t, 10 + h * 10, len);
    if (camY + camera.height > arena.height - t - 24) ctx.fillRect(i * step, arena.height - t - len, 10 + h * 10, len);
  }
  const ya = Math.max(0, Math.floor(camY / step));
  const yb = Math.min(Math.ceil(arena.height / step), Math.ceil((camY + camera.height) / step));
  for (let j = ya; j < yb; j++) {
    const h = hash(7, j);
    ctx.fillStyle = h > 0.5 ? wall.roots : wall.moss;
    const len = 8 + h * 14;
    if (camX < t + 24) ctx.fillRect(t, j * step, len, 10 + h * 10);
    if (camX + camera.width > arena.width - t - 24) ctx.fillRect(arena.width - t - len, j * step, len, 10 + h * 10);
  }
}

/**
 * Funghi luminosi sparsi, con un alone che pulsa. Ciano e acquamarina: il giallo e il viola sono dei proiettili e
 * delle zone della Madre delle spore, e un fungo dello stesso colore li nasconderebbe.
 */
function drawMushrooms(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  const grid = SWAMP_DECOR.mushroomGrid;
  const { x: camX, y: camY } = camera.position;
  const gx0 = Math.floor((camX - 40) / grid);
  const gx1 = Math.ceil((camX + camera.width + 40) / grid);
  const gy0 = Math.floor((camY - 40) / grid);
  const gy1 = Math.ceil((camY + camera.height + 40) / grid);
  for (let gy = gy0; gy < gy1; gy++) {
    for (let gx = gx0; gx < gx1; gx++) {
      const h = hash(gx * 3.1, gy * 1.7);
      if (h < 0.5) continue;
      const x = gx * grid + hash(gx, gy + 9) * (grid - 40) + 20;
      const y = gy * grid + hash(gx + 5, gy) * (grid - 40) + 20;
      const margin = arena.wallThickness + 30;
      if (x < margin || x > arena.width - margin || y < margin || y > arena.height - margin) continue;
      const pale = h > 0.78;
      const cap = pale ? SWAMP_DECOR.mushroom.paleCap : SWAMP_DECOR.mushroom.cap;
      const glow = pale ? SWAMP_DECOR.mushroom.paleGlow : SWAMP_DECOR.mushroom.glow;
      const pulse = 0.6 + 0.4 * Math.sin(clock * 2 + h * 20);
      drawLight(ctx, x, y - 4, glow, 58, 0.5 + 0.4 * pulse);
      ctx.fillStyle = '#7a7254';
      ctx.fillRect(x - 2, y - 2, 4, 9);
      ctx.fillStyle = cap;
      ctx.fillRect(x - 8, y - 8, 16, 6);
      ctx.fillRect(x - 5, y - 11, 10, 3);
      // Un secondo fungo, piu' piccolo, accanto al primo.
      ctx.fillRect(x + 11, y - 1, 8, 4);
      ctx.fillStyle = '#7a7254';
      ctx.fillRect(x + 14, y + 3, 2, 5);
    }
  }
}

/** Nebbia: grandi macchie traslucide che derivano lentamente (sopra il pavimento, sotto i personaggi). */
function drawFog(ctx: CanvasRenderingContext2D, camera: Camera, clock: number): void {
  const grid = SWAMP_DECOR.fogGrid;
  const { x: camX, y: camY } = camera.position;
  const gx0 = Math.floor((camX - 300) / grid);
  const gx1 = Math.ceil((camX + camera.width + 300) / grid);
  const gy0 = Math.floor((camY - 200) / grid);
  const gy1 = Math.ceil((camY + camera.height + 200) / grid);
  ctx.save();
  ctx.fillStyle = '#a7bda0';
  for (let gy = gy0; gy < gy1; gy++) {
    for (let gx = gx0; gx < gx1; gx++) {
      const h = hash(gx * 2.3, gy * 4.1);
      if (h < 0.4) continue;
      const x = gx * grid + h * grid + Math.sin(clock * 0.15 + h * 9) * 90;
      const y = gy * grid + hash(gx, gy) * grid + Math.cos(clock * 0.12 + h * 7) * 40;
      for (const scale of [1, 0.66, 0.36]) {
        ctx.globalAlpha = 0.035;
        ctx.beginPath();
        ctx.ellipse(x, y, 260 * scale, 110 * scale, 0, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  const { x: camX, y: camY } = camera.position;
  // Il margine copre l'arrotondamento della traslazione e la scossa dello schermo.
  ctx.fillStyle = '#070d0b';
  ctx.fillRect(camX - 4, camY - 4, camera.width + 8, camera.height + 8);
  drawGround(ctx, arena, camera, clock);
  drawWall(ctx, arena, camera);
  drawMushrooms(ctx, arena, camera, clock);
  drawFog(ctx, camera, clock);
}

/** Albero morto: radici contorte attorno al tronco, rami spogli piegati dal vento e un fungo a mensola che brilla. */
function drawPillar(ctx: CanvasRenderingContext2D, pillar: Pillar, camera: Camera, clock: number): void {
  const { x, y } = pillar.position;
  const r = pillar.radius;
  if (!camera.isVisible(pillar.position, r * 2.2)) return;
  const seed = hash(x, y);
  ctx.save();

  ctx.fillStyle = '#04090780';
  ctx.beginPath();
  ctx.ellipse(x + 5, y + r * 0.55, r * 1.25, r * 0.55, 0, 0, TAU);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2b2218';
  for (let i = 0; i < 7; i++) {
    const a = seed * TAU + (i * TAU) / 7 + hash(i, seed) * 0.4;
    const length = r * (1.25 + hash(seed, i) * 0.45);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
    ctx.lineTo(x + Math.cos(a + 0.15) * length, y + Math.sin(a + 0.15) * length);
    ctx.stroke();
  }

  ctx.fillStyle = '#3a2d1f';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#21180f';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#4b3b28';
  ctx.beginPath();
  ctx.arc(x - r * 0.22, y - r * 0.22, r * 0.62, 0, TAU);
  ctx.fill();
  // Cerchi del legno e una cavita' scura.
  ctx.strokeStyle = '#2f2418';
  ctx.lineWidth = 2;
  for (const f of [0.28, 0.46]) {
    ctx.beginPath();
    ctx.arc(x - r * 0.22, y - r * 0.22, r * f, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = '#17110b';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.3, y + r * 0.1, r * 0.16, r * 0.26, 0.4, 0, TAU);
  ctx.fill();
  // Muschio sul lato in ombra.
  ctx.fillStyle = '#46602a';
  ctx.beginPath();
  ctx.arc(x + r * 0.55, y + r * 0.45, r * 0.3, 0, TAU);
  ctx.fill();

  // Rami spogli, con una biforcazione, che ondeggiano appena.
  ctx.strokeStyle = '#2a2018';
  for (let i = 0; i < 6; i++) {
    const a = seed * TAU + (i * TAU) / 6 + Math.sin(clock * 0.5 + i + seed * 9) * 0.04;
    const length = r * (1.3 + hash(i, seed * 7) * 0.7);
    const bx = x + Math.cos(a) * r * 0.5;
    const by = y + Math.sin(a) * r * 0.5;
    const ex = x + Math.cos(a) * length;
    const ey = y + Math.sin(a) * length;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    const mx = bx + (ex - bx) * 0.6;
    const my = by + (ey - by) * 0.6;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + Math.cos(a + 0.7) * r * 0.5, my + Math.sin(a + 0.7) * r * 0.5);
    ctx.stroke();
  }

  // Fungo a mensola luminoso sul tronco.
  const pulse = 0.6 + 0.4 * Math.sin(clock * 2 + seed * 20);
  drawLight(ctx, x - r * 0.62, y + r * 0.1, SWAMP_DECOR.mushroom.glow, r * 0.9, 0.4 + 0.4 * pulse);
  ctx.fillStyle = SWAMP_DECOR.mushroom.cap;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.62, y + r * 0.1, r * 0.2, r * 0.1, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export const swampTheme: ArenaTheme = {
  drawFloor,
  drawPillar,
  silhouette: '#e6f2cc66',
  vignette: '#020504',
  groundColors: [
    ...SWAMP_DECOR.water,
    ...SWAMP_DECOR.mud,
    SWAMP_DECOR.mushroom.cap,
    SWAMP_DECOR.mushroom.glow,
    SWAMP_DECOR.mushroom.paleCap,
    SWAMP_DECOR.mushroom.paleGlow,
  ],
};
