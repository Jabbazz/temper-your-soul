import { describe, expect, it } from 'vitest';
import { pixelPerfectView } from './camera';
import { RenderInterpolation } from './render-interpolation';
import { Vec2 } from './vec2';

describe('disegno fluido sugli schermi veloci', () => {
  it('mostra i corpi fra la posizione precedente e quella attuale, poi rimette quelle vere', () => {
    const body = { position: new Vec2(0, 0) }, still = { position: new Vec2(5, 5) }, fresh = { position: new Vec2(9, 9) };
    const interpolation = new RenderInterpolation();
    interpolation.remember([body, still]);
    body.position = new Vec2(10, 0);
    interpolation.apply([body, still, fresh], 0.25, 64);
    expect(body.position.x).toBeCloseTo(2.5);
    expect(still.position.equals(new Vec2(5, 5))).toBe(true);
    expect(fresh.position.equals(new Vec2(9, 9))).toBe(true);
    interpolation.restore();
    expect(body.position.equals(new Vec2(10, 0))).toBe(true);
  });

  it('un salto lungo (scatto, viaggio) non si interpola', () => {
    const body = { position: new Vec2(0, 0) }, interpolation = new RenderInterpolation();
    interpolation.remember([body]);
    body.position = new Vec2(500, 0);
    interpolation.apply([body], 0.5, 64);
    expect(body.position.x).toBe(500);
  });

  it('la scala del canvas è sempre un numero intero di pixel del dispositivo', () => {
    for (const [width, height, dpr] of [[1920, 1080, 1], [2560, 1440, 1], [2560, 1440, 1.25], [1366, 768, 1.5], [3840, 2160, 2]] as const) {
      const view = pixelPerfectView(width, height, dpr);
      expect(Number.isInteger(view.scale)).toBe(true);
      // La misura CSS per i pixel del dispositivo è esattamente la risoluzione interna per la scala.
      expect(view.cssWidth * dpr).toBeCloseTo(view.width * view.scale, 6);
      expect(view.cssHeight * dpr).toBeCloseTo(view.height * view.scale, 6);
      expect(view.cssWidth).toBeLessThanOrEqual(width);
      expect(width - view.cssWidth).toBeLessThan(view.scale / dpr + 1e-9);
    }
    // Con il ridimensionamento di Windows al 100% il gioco usa 2 pixel per pixel di mondo.
    expect(pixelPerfectView(1920, 1080, 1).scale).toBe(2);
  });
});
