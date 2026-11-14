import { describe, expect, it } from 'vitest';
import { footShadowSize, rasterEllipse } from './pixel-shadow';

describe('ombre in pixel art', () => {
  it('l\'ellisse è piena, simmetrica e sta dentro il suo rettangolo', () => {
    const rows: { dx: number; y: number; w: number }[] = [];
    rasterEllipse(24, 8, (dx, y, w) => rows.push({ dx, y, w }));
    expect(rows.length).toBe(8);
    for (const row of rows) {
      expect(row.dx).toBeGreaterThanOrEqual(0);
      expect(row.dx + row.w).toBeLessThanOrEqual(24);
      // Simmetrica attorno al centro.
      expect(row.dx).toBe(24 - (row.dx + row.w));
    }
    // Più larga al centro che sui bordi, come un'ellisse e non come un rettangolo.
    expect(rows[3]!.w).toBe(24);
    expect(rows[0]!.w).toBeLessThan(rows[3]!.w);
    expect(rows[7]!.w).toBe(rows[0]!.w);
  });

  it('l\'ombra dei piedi è schiacciata dalla prospettiva', () => {
    const { width, height } = footShadowSize(10);
    expect(width % 2).toBe(0);
    expect(width).toBeGreaterThan(20);
    expect(height).toBeLessThan(width / 2.5);
  });
});
