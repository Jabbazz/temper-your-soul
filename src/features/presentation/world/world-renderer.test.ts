import { describe, expect, it } from 'vitest';
import { WORLD_OBSTACLE_KINDS } from '../../world/world-obstacles';
import { WORLD_OBJECT_ART } from './world-art-data';
import { DANGER_COLORS, contrastingDangerColor } from '../draw-combat';
import { WORLD } from '../../world/world-definition';
import { WORLD_FALLBACK_COLORS, WORLD_SHADOWS, shadowColor, shadowSize } from './world-renderer';

describe('grafica del mondo: attacchi ad area leggibili', () => {
  it('su ogni terreno il colore delle zone nemiche si stacca dal suolo', () => {
    const rgb = (hex: string): number[] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    for (const [terrain, ground] of Object.entries(WORLD_FALLBACK_COLORS)) {
      const danger = contrastingDangerColor(ground), [a, b] = [rgb(danger), rgb(ground)];
      expect(DANGER_COLORS).toContain(danger);
      expect(Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!), terrain).toBeGreaterThan(180);
    }
    // Sulla neve non viene mai un colore chiaro.
    expect(contrastingDangerColor(WORLD_FALLBACK_COLORS.snow)).not.toBe('#2fd8ff');
  });
});

describe('grafica del mondo: ombre visibili su ogni suolo', () => {
  it('ogni suolo di una fascia ha un\'ombra più scura di sé, e sui suoli scuri è più coprente', () => {
    const rgba = (hex: string): number[] => [1, 3, 5, 7].map(i => parseInt(hex.slice(i, i + 2), 16));
    const luminance = (rgb: number[]): number => 0.3 * rgb[0]! + 0.59 * rgb[1]! + 0.11 * rgb[2]!;
    for (const biome of WORLD.biomes) {
      const ground = rgba(WORLD_FALLBACK_COLORS[biome.ground] + 'ff'), shadow = rgba(shadowColor(biome.ground));
      // Il colore che risulta dall'ombra sopra il suolo è almeno un po' più scuro del suolo.
      const alpha = shadow[3]! / 255, mixed = [0, 1, 2].map(i => shadow[i]! * alpha + ground[i]! * (1 - alpha));
      expect(luminance(ground) - luminance(mixed), biome.id).toBeGreaterThan(12);
    }
    expect(rgba(shadowColor('abyss'))[3]).toBeGreaterThan(rgba(shadowColor('grass'))[3]!);
  });
});

describe('grafica del mondo: ombre degli ostacoli', () => {
  it('ogni ostacolo ha un\'ombra larga quanto il suo disegno, schiacciata e centrata', () => {
    for (const kind of Object.values(WORLD_OBSTACLE_KINDS)) {
      const art = WORLD_OBJECT_ART[kind.visual]!, shadow = shadowSize(kind.visual, art.spread);
      expect(shadow.width % 2, kind.visual).toBe(0);
      expect(shadow.width).toBeLessThanOrEqual(art.spread * 1.2 + 2);
      expect(shadow.width).toBeGreaterThanOrEqual(art.spread * 0.5);
      expect(shadow.height).toBeLessThan(shadow.width / 2);
      // Gli arredi a base piatta hanno l'ombra più larga della base e quasi tutta sopra la base (non sembrano sospesi).
      const shape = WORLD_SHADOWS.byVisual[kind.visual];
      if (kind.shape.type === 'box') {
        expect(shape, kind.visual).toBeDefined();
        expect(shape!.below).toBeLessThanOrEqual(1);
        expect(shadow.width).toBeGreaterThanOrEqual(art.spread * 0.95);
      }
    }
    // La chioma della quercia fa più ombra di un cespuglio; l'albero spoglio meno della sua larghezza piena.
    const oak = shadowSize('oak', WORLD_OBJECT_ART.oak!.spread), bush = shadowSize('bush', WORLD_OBJECT_ART.bush!.spread);
    expect(oak.width).toBeGreaterThan(bush.width * 2);
    expect(shadowSize('dead_tree', 60).width).toBeLessThan(shadowSize('oak', 60).width);
  });
});
