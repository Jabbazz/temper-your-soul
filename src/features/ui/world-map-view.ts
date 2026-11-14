import type { Vec2 } from '../../core/vec2';
import type { WorldMap } from '../world/world-map';
import { canvasFont } from '../presentation/fonts';
import { el } from './dom';
import { MINIMAP_COLORS } from './world-minimap';

/*
 * La mappa del mondo intero, tenendo premuto il tasto della mappa: un pixel ogni `step` tile, i nomi delle fasce, i
 * luoghi notevoli (partenza, cimiteri, statue) e la posizione del giocatore. Il disegno del terreno si fa una volta
 * sola per mappa. Legge la mappa del mondo, non la cambia.
 */

/** Ogni quanti tile un pixel della mappa e ingrandimento a schermo. Provvisori. */
export const WORLD_MAP_VIEW = { step: 4, scale: 2 } as const;

/** I colori del mondo intero, un pixel ogni `step` tile, RGBA riga per riga. */
export function worldMapPixels(map: WorldMap, step: number): { readonly width: number; readonly height: number; readonly pixels: Uint8ClampedArray } {
  const { generator } = map, width = Math.ceil(generator.widthTiles / step), height = Math.ceil(generator.heightTiles / step);
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    // Dal generatore, senza creare i blocchi: la mappa intera non va tenuta in memoria. Le strade sono strette (tre
    // vertici): se il centro non ci cade, si guarda anche ai lati, così nessuna strada sparisce dalla mappa.
    const cx = x * step + step / 2, cy = y * step + step / 2;
    let terrain = generator.terrainAtVertex(cx, cy);
    if (terrain !== 'road' && [[cx, cy - 1], [cx, cy + 1], [cx - 1, cy], [cx + 1, cy]].some(([vx, vy]) => generator.terrainAtVertex(vx!, vy!) === 'road')) terrain = 'road';
    const [r, g, b] = MINIMAP_COLORS[terrain], index = (y * width + x) * 4;
    pixels[index] = r; pixels[index + 1] = g; pixels[index + 2] = b; pixels[index + 3] = 255;
  }
  return { width, height, pixels };
}

export class WorldMapView {
  private readonly root = el('div', 'world-map-view hidden');
  private readonly canvas = document.createElement('canvas');
  private readonly marker = el('div', 'world-map-player');
  private readonly frame = el('div', 'world-map-frame');
  private drawnFor: WorldMap | null = null;

  constructor() {
    this.root.setAttribute('aria-hidden', 'true');
    this.canvas.className = 'world-map-canvas';
    this.frame.append(this.canvas, this.marker);
    this.root.append(el('p', 'world-map-title', 'Mappa del mondo'), this.frame);
    document.body.append(this.root);
  }

  show(map: WorldMap, position: Vec2): void {
    if (this.drawnFor !== map) this.draw(map);
    const { step, scale } = WORLD_MAP_VIEW, tile = map.definition.tile;
    // Il segno (8 px più il bordo di 2) centrato sul giocatore, dentro la cornice con 4 px di margine.
    this.marker.style.left = `${Math.round((position.x / tile / step) * scale) + 4 - 6}px`;
    this.marker.style.top = `${Math.round((position.y / tile / step) * scale) + 4 - 6}px`;
    this.root.classList.remove('hidden');
  }

  hide(): void { this.root.classList.add('hidden'); }

  private draw(map: WorldMap): void {
    this.drawnFor = map;
    const { step, scale } = WORLD_MAP_VIEW, { width, height, pixels } = worldMapPixels(map, step);
    this.canvas.width = width * scale; this.canvas.height = height * scale;
    this.canvas.style.width = `${width * scale}px`; this.canvas.style.height = `${height * scale}px`;
    const raw = document.createElement('canvas');
    raw.width = width; raw.height = height;
    raw.getContext('2d')!.putImageData(new ImageData(pixels, width, height), 0, 0);
    const ctx = this.canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(raw, 0, 0, width * scale, height * scale);
    const tile = map.definition.tile, at = (x: number, y: number): [number, number] => [Math.round((x / tile / step) * scale), Math.round((y / tile / step) * scale)];
    // Luoghi notevoli: quadratini con il bordo scuro.
    const mark = (x: number, y: number, color: string, size: number): void => {
      const [px, py] = at(x, y);
      ctx.fillStyle = '#120e16'; ctx.fillRect(px - size - 1, py - size - 1, size * 2 + 2, size * 2 + 2);
      ctx.fillStyle = color; ctx.fillRect(px - size, py - size, size * 2, size * 2);
    };
    for (const landmark of map.decor.landmarks()) mark(landmark.x, landmark.y, landmark.kind === 'angel_statue' ? '#e8e2f2' : '#d8d0bc', 2);
    mark(map.width / 2, map.definition.spawn.row * tile, '#f2d27a', 3);
    // I nomi delle fasce, a metà di ognuna, con il grado.
    ctx.font = canvasFont(16, 'pixel');
    ctx.textAlign = 'center';
    let top = 0;
    map.definition.biomes.forEach((biome) => {
      const [, y] = at(0, (top + biome.rows / 2) * tile), text = `${biome.name} · grado ${biome.tier + 1}`;
      ctx.lineWidth = 4; ctx.strokeStyle = '#120e16'; ctx.strokeText(text, (width * scale) / 2, y);
      ctx.fillStyle = '#f3e6cc'; ctx.fillText(text, (width * scale) / 2, y);
      top += biome.rows;
    });
  }
}
