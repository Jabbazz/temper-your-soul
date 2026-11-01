import { Vec2 } from '../../../core/vec2';
import type { ArenaDefinition } from '../../arena/arena';

/*
 * Dove stanno i decori in rilievo (torce, bracieri, incudini) in una mappa di qualunque misura: lungo i muri, in
 * posizioni relative alla mappa, mai sull'ingresso ne' davanti alle porte che una stanza puo' avere. Solo aspetto:
 * i decori non bloccano nulla, quindi non devono stare dove il giocatore deve passare o leggere un cartello.
 */

/** Frazioni della larghezza dove cadono le porte di una stanza (da una a tre porte sul muro in alto). */
const DOOR_FRACTIONS = [1 / 2, 1 / 3, 2 / 3, 1 / 4, 3 / 4] as const;

/** Spazi da lasciare liberi attorno all'ingresso e davanti alle porte (con i loro cartelli). Provvisori. */
export const DECOR_CLEARANCE = { entrance: 200, doorHalfWidth: 130, doorDepth: 240 } as const;

/** Vero se un decoro di raggio `radius` in (x, y) lascia liberi ingresso e porte e non si appoggia a un pilastro. */
export function isClearSpot(arena: ArenaDefinition, x: number, y: number, radius = 0): boolean {
  const clear = DECOR_CLEARANCE;
  if (Math.hypot(x - arena.playerSpawn.x, y - arena.playerSpawn.y) < clear.entrance + radius) return false;
  if (arena.pillars.some((pillar) => Math.hypot(x - pillar.position.x, y - pillar.position.y) < pillar.radius + radius + 10)) return false;
  if (y - radius < arena.wallThickness + clear.doorDepth) {
    for (const fraction of DOOR_FRACTIONS) if (Math.abs(x - arena.width * fraction) < clear.doorHalfWidth + radius) return false;
  }
  return true;
}

/** `count` posizioni distribuite e centrate su un tratto lungo `length`, lasciando `inset` a ogni estremo. */
function along(length: number, inset: number, spacing: number): number[] {
  const count = Math.max(1, Math.floor((length - 2 * inset) / spacing) + 1);
  const first = (length - (count - 1) * spacing) / 2;
  return Array.from({ length: count }, (_, i) => first + i * spacing);
}

const wallSpotCache = new WeakMap<ArenaDefinition, Map<string, readonly Vec2[]>>();

/**
 * Punti lungo i quattro muri, a `inset` dal bordo e ogni `spacing`, esclusi quelli che coprirebbero ingresso o porte.
 * In cache per mappa: le stanze della discesa hanno misure diverse.
 */
export function wallSpots(arena: ArenaDefinition, inset: number, spacing: number, radius: number): readonly Vec2[] {
  let byArena = wallSpotCache.get(arena);
  if (!byArena) {
    byArena = new Map();
    wallSpotCache.set(arena, byArena);
  }
  const key = `${inset}|${spacing}|${radius}`;
  const cached = byArena.get(key);
  if (cached) return cached;
  const spots: Vec2[] = [];
  for (const x of along(arena.width, inset, spacing)) spots.push(new Vec2(x, inset), new Vec2(x, arena.height - inset));
  // Sui muri laterali si saltano gli estremi, gia' coperti da quelli in alto e in basso.
  for (const y of along(arena.height, inset + spacing, spacing)) spots.push(new Vec2(inset, y), new Vec2(arena.width - inset, y));
  const clear = spots.filter((spot) => isClearSpot(arena, spot.x, spot.y, radius));
  byArena.set(key, clear);
  return clear;
}
