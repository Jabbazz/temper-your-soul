import type { Camera } from '../../../core/camera';
import { TAU, Vec2 } from '../../../core/vec2';
import type { ArenaDefinition, Pillar } from '../../arena/arena';
import type { ArenaTheme } from './theme';

/**
 * Decorazione della fucina (solo aspetto, coordinate della mappa `forge`). Valori provvisori: pavimento di basalto
 * nero-bruno con crepe di lava che pulsano, bracieri lungo i muri, incudini addossate ai muri, scintille che salgono.
 */
const FORGE_DECOR = {
  /** Lato delle lastre di basalto. */
  tileSize: 64,
  /** Una lastra su cinque circa ha una crepa di lava (soglia sul valore pseudocasuale della lastra). */
  crackThreshold: 0.78,
  /** Una lastra su venti circa emette una scintilla. */
  sparkThreshold: 0.95,
  /** Bracieri lungo i muri lunghi (ogni `spacing`, a `inset` dal muro) e uno al centro di ogni muro corto. */
  braziers: { start: 225, spacing: 450, inset: 95 },
  /** Incudini addossate ai muri (centro). */
  anvils: [new Vec2(560, 125), new Vec2(2950, 125), new Vec2(1430, 2075), new Vec2(3200, 2075), new Vec2(125, 1560)],
};

const COLORS = {
  void: '#0c0908',
  basalt: ['#1b1614', '#211b18', '#27201c'],
  grout: '#0e0b0a',
  fleck: '#2f2824',
  wall: '#2c2622',
  wallEdge: '#4a3f38',
  rivet: '#6b5d52',
  lava: '#ff6a1f',
  lavaCore: '#ffc15a',
  lavaDark: '#7a2a0c',
  iron: '#3a332e',
  ironLight: '#5e544c',
};

/** Valore pseudocasuale in [0, 1) legato alla posizione: il disegno non cambia da un fotogramma all'altro. */
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function drawCrack(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, clock: number): void {
  const size = FORGE_DECOR.tileSize;
  // Una spezzata di tre tratti che parte dal bordo sinistro o alto della lastra e attraversa il centro.
  const points: Array<[number, number]> = [
    [x + (h * 7) % 1 * size * 0.3, y + size * 0.15],
    [x + size * (0.35 + ((h * 13) % 1) * 0.2), y + size * (0.35 + ((h * 29) % 1) * 0.2)],
    [x + size * (0.6 + ((h * 31) % 1) * 0.2), y + size * 0.6],
    [x + size * (0.85 + ((h * 17) % 1) * 0.15), y + size * (0.8 + ((h * 5) % 1) * 0.2)],
  ];
  const pulse = 0.6 + 0.4 * Math.sin(clock * 2 + h * 40);
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(points[0]![0], points[0]![1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]![0], points[i]![1]);
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLORS.lavaDark;
  ctx.lineWidth = 6;
  path();
  ctx.stroke();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = COLORS.lava;
  ctx.lineWidth = 3;
  path();
  ctx.stroke();
  ctx.strokeStyle = COLORS.lavaCore;
  ctx.lineWidth = 1;
  path();
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBrazier(ctx: CanvasRenderingContext2D, x: number, y: number, clock: number): void {
  const flicker = Math.sin(clock * 9 + x * 0.1);
  // Alone sul pavimento.
  ctx.fillStyle = `rgba(255, 106, 31, ${0.1 + 0.03 * flicker})`;
  ctx.beginPath();
  ctx.arc(x, y, 62 + flicker * 4, 0, TAU);
  ctx.fill();
  // Ciotola di ferro su tre piedi.
  ctx.fillStyle = COLORS.iron;
  ctx.fillRect(x - 15, y + 4, 4, 11);
  ctx.fillRect(x + 11, y + 4, 4, 11);
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(x - 17, y - 8, 34, 14);
  ctx.fillStyle = COLORS.ironLight;
  ctx.fillRect(x - 17, y - 8, 34, 3);
  // Brace e fiamme.
  ctx.fillStyle = COLORS.lavaDark;
  ctx.fillRect(x - 13, y - 12, 26, 5);
  ctx.fillStyle = COLORS.lava;
  ctx.fillRect(x - 9, y - 22 + flicker * 2, 18, 12);
  ctx.fillStyle = COLORS.lavaCore;
  ctx.fillRect(x - 5, y - 28 + Math.sin(clock * 11 + x) * 3, 10, 14);
  ctx.fillStyle = '#fff2c0';
  ctx.fillRect(x - 2, y - 24 + Math.sin(clock * 13 + x * 0.3) * 2, 4, 8);
}

function drawAnvil(ctx: CanvasRenderingContext2D, x: number, y: number, clock: number): void {
  ctx.fillStyle = '#0c090880';
  ctx.fillRect(x - 36, y + 10, 76, 12);
  ctx.fillStyle = COLORS.iron;
  ctx.fillRect(x - 24, y + 4, 48, 14);
  ctx.fillRect(x - 12, y - 6, 24, 12);
  // Piano battente con la punta (il "corno") a sinistra.
  ctx.fillStyle = COLORS.ironLight;
  ctx.fillRect(x - 32, y - 18, 64, 12);
  ctx.beginPath();
  ctx.moveTo(x - 32, y - 18);
  ctx.lineTo(x - 50, y - 12);
  ctx.lineTo(x - 32, y - 6);
  ctx.fill();
  // Il piano e' ancora caldo: un velo di lava che pulsa.
  ctx.fillStyle = `rgba(255, 138, 42, ${0.22 + 0.18 * Math.sin(clock * 1.6 + x)})`;
  ctx.fillRect(x - 24, y - 18, 40, 4);
}

function drawFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  const { x: camX, y: camY } = camera.position;
  const { tileSize } = FORGE_DECOR;

  // Il margine copre l'arrotondamento della traslazione e la scossa dello schermo.
  ctx.fillStyle = COLORS.void;
  ctx.fillRect(camX - 4, camY - 4, camera.width + 8, camera.height + 8);

  const x0 = Math.max(0, Math.floor(camX / tileSize) * tileSize);
  const y0 = Math.max(0, Math.floor(camY / tileSize) * tileSize);
  const x1 = Math.min(arena.width, camX + camera.width + tileSize);
  const y1 = Math.min(arena.height, camY + camera.height + tileSize);
  for (let y = y0; y < y1; y += tileSize) {
    for (let x = x0; x < x1; x += tileSize) {
      const h = hash(x, y);
      ctx.fillStyle = COLORS.basalt[Math.floor(h * 3)]!;
      ctx.fillRect(x, y, tileSize, tileSize);
      ctx.fillStyle = COLORS.grout;
      ctx.fillRect(x, y, tileSize, 2);
      ctx.fillRect(x, y, 2, tileSize);
      if (h > 0.5 && h < 0.62) {
        ctx.fillStyle = COLORS.fleck;
        ctx.fillRect(x + 12, y + 14, 14, 3);
        ctx.fillRect(x + 38, y + 40, 3, 10);
      }
      if (h > FORGE_DECOR.crackThreshold) drawCrack(ctx, x, y, h, clock);
    }
  }

  // Scintille: salgono dalle lastre con le crepe piu' calde e si spengono prima di arrivare in cima.
  for (let y = y0; y < y1; y += tileSize) {
    for (let x = x0; x < x1; x += tileSize) {
      const h = hash(x, y);
      if (h <= FORGE_DECOR.sparkThreshold) continue;
      const t = (clock * 0.5 + h * 20) % 1;
      ctx.fillStyle = `rgba(255, 193, 90, ${1 - t})`;
      ctx.fillRect(x + tileSize / 2 + Math.sin(clock * 3 + h * 50) * 8, y + tileSize - t * 90, 3, 3);
    }
  }

  // Il muro perimetrale appartiene al mondo, non allo schermo: si disegna solo il tratto che la vista raggiunge.
  const wall = arena.wallThickness;
  const left = Math.max(0, camX - 4);
  const right = Math.min(arena.width, camX + camera.width + 4);
  const top = Math.max(0, camY - 4);
  const bottom = Math.min(arena.height, camY + camera.height + 4);
  const glow = 0.55 + 0.25 * Math.sin(clock * 1.3);
  ctx.fillStyle = COLORS.wall;
  if (camY < wall) ctx.fillRect(left, 0, right - left, wall);
  if (camY + camera.height > arena.height - wall) ctx.fillRect(left, arena.height - wall, right - left, wall);
  if (camX < wall) ctx.fillRect(0, top, wall, bottom - top);
  if (camX + camera.width > arena.width - wall) ctx.fillRect(arena.width - wall, top, wall, bottom - top);
  // Bordo interno rovente e rivetti.
  ctx.fillStyle = `rgba(255, 106, 31, ${glow})`;
  if (camY < wall + 4) ctx.fillRect(left, wall, right - left, 3);
  if (camY + camera.height > arena.height - wall - 4) ctx.fillRect(left, arena.height - wall - 3, right - left, 3);
  if (camX < wall + 4) ctx.fillRect(wall, top, 3, bottom - top);
  if (camX + camera.width > arena.width - wall - 4) ctx.fillRect(arena.width - wall - 3, top, 3, bottom - top);
  ctx.fillStyle = COLORS.rivet;
  for (let x = Math.ceil(left / 96) * 96; x < right; x += 96) {
    if (camY < wall) ctx.fillRect(x, 12, 6, 6);
    if (camY + camera.height > arena.height - wall) ctx.fillRect(x, arena.height - 18, 6, 6);
  }

  const { braziers, anvils } = FORGE_DECOR;
  for (let x = braziers.start; x < arena.width; x += braziers.spacing) {
    for (const y of [braziers.inset, arena.height - braziers.inset]) {
      if (camera.isVisible(new Vec2(x, y), 90)) drawBrazier(ctx, x, y, clock);
    }
  }
  for (const side of [braziers.inset, arena.width - braziers.inset]) {
    const middle = new Vec2(side, arena.height / 2);
    if (camera.isVisible(middle, 90)) drawBrazier(ctx, middle.x, middle.y, clock);
  }
  for (const anvil of anvils) {
    if (camera.isVisible(anvil, 80)) drawAnvil(ctx, anvil.x, anvil.y, clock);
  }
}

/** Pilastro di ferro: base di basalto, fascia di ferro ribattuta e un nucleo che si scalda e si raffredda. */
function drawPillar(ctx: CanvasRenderingContext2D, pillar: Pillar, camera: Camera, clock: number): void {
  if (!camera.isVisible(pillar.position, pillar.radius + 20)) return;
  const { x, y } = pillar.position;
  const r = pillar.radius;
  ctx.fillStyle = '#0a070680';
  ctx.beginPath();
  ctx.ellipse(x + 5, y + r * 0.5, r * 1.08, r * 0.5, 0, 0, TAU);
  ctx.fill();
  // Fascia di ferro.
  ctx.fillStyle = COLORS.iron;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = COLORS.ironLight;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Rivetti sulla fascia.
  ctx.fillStyle = COLORS.rivet;
  for (let i = 0; i < 10; i++) {
    const a = (i * TAU) / 10;
    ctx.fillRect(x + Math.cos(a) * (r - 7) - 2, y + Math.sin(a) * (r - 7) - 2, 4, 4);
  }
  // Cima di basalto.
  ctx.fillStyle = '#1f1a17';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.68, 0, TAU);
  ctx.fill();
  // Il calore che filtra dalle fessure della cima.
  ctx.strokeStyle = `rgba(255, 106, 31, ${0.45 + 0.3 * Math.sin(clock * 2 + x * 0.01)})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = (i * TAU) / 4 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, a, a + 0.7);
    ctx.stroke();
  }
  ctx.fillStyle = '#3a312c';
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.22, r * 0.2, 0, TAU);
  ctx.fill();
}

export const forgeTheme: ArenaTheme = { drawFloor, drawPillar };
