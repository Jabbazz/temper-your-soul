import type { ItemSprite } from '../presentation/item-sprites';

/** Pixel interi senza sfumature, riutilizzati nei pulsanti e negli slot. */
export function renderPixelIcon(sprite: ItemSprite): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('class', 'pixel-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('shape-rendering', 'crispEdges');
  sprite.pixels.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel === '.') return;
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', '1');
    rect.setAttribute('height', '1');
    rect.setAttribute('fill', sprite.palette[pixel]);
    svg.append(rect);
  }));
  return svg;
}
