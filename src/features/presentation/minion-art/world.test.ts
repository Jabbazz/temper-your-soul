import { describe, expect, it } from 'vitest';
import { readPng } from '../../../testing-png';
import { WORLD_MINIONS } from '../../minions/catalog/world';
import { MINION_ART } from '../minion-art';
import { WORLD_MOB_SHEETS } from './world-mob-sheets';

describe('nemici del mondo aperto: fogli PixelLab', () => {
  it('ogni nemico del mondo si disegna da un foglio, a terra e senza volare', () => {
    for (const minion of WORLD_MINIONS) {
      const art = MINION_ART[minion.visual];
      expect(art?.sheet, minion.id).toBeDefined();
      expect(art!.faces, minion.id).toBe(true);
      expect(minion.flying ?? false, minion.id).toBe(false);
    }
  });

  it('ogni foglio è una striscia di celle quadrate con la figura dentro e i piedi in basso', async () => {
    for (const [visual, sheet] of Object.entries(WORLD_MOB_SHEETS)) {
      const png = await readPng(new URL(sheet.url));
      expect(png.width, visual).toBe(sheet.cell * sheet.frames);
      expect(png.height, visual).toBe(sheet.cell);
      expect(sheet.frames, visual).toBeGreaterThanOrEqual(4);
      expect(sheet.top).toBeGreaterThanOrEqual(0);
      expect(sheet.feetY).toBeGreaterThan(sheet.top + sheet.cell / 3);
      expect(sheet.feetY).toBeLessThanOrEqual(sheet.cell);
      expect(Math.abs(sheet.feetX - sheet.cell / 2), visual).toBeLessThan(sheet.cell / 6);
      // Sotto i piedi la cella è vuota in ogni fotogramma.
      for (let x = 0; x < png.width; x++) for (let y = sheet.feetY; y < sheet.cell; y++) expect(png.pixels[(y * png.width + x) * 4 + 3]!, visual).toBeLessThanOrEqual(40);
    }
  });
});
