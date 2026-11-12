import { describe, expect, it } from 'vitest';
import { SHADOW_EQUIPMENT } from './shadow-equipment';
import { HERO_TINT, armorContrast, heroTintPixel, heroTintZone, hslToRgb, rgbToHsl, tintHeroSheet, tintWith } from './hero-tint';

// Colori presi dai fogli PixelLab (riposo, di fronte).
const MAGE_ROBE = [45, 77, 130] as const, MAGE_GOLD = [210, 170, 82] as const, MAGE_SKIN = [218, 163, 142] as const;
const WARRIOR_SKIN = [228, 162, 134] as const, STEEL = [160, 157, 155] as const, LEATHER = [82, 46, 27] as const;
const ARCHER_CLOAK = [66, 113, 59] as const;
const veil = SHADOW_EQUIPMENT['blizzard_veil']!, mantle = SHADOW_EQUIPMENT['meteor_mantle']!, plate = SHADOW_EQUIPMENT['forge_plate']!, treads = SHADOW_EQUIPMENT['ember_treads']!;
const hueOf = (hex: string): number => rgbToHsl(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16))[0];
const hueGap = (a: number, b: number): number => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
const hueOfRgb = (color: readonly number[]): number => rgbToHsl(color[0]!, color[1]!, color[2]!)[0];

describe('cambio colore dei corpi PixelLab', () => {
  it('riconosce veste, rifiniture e stivali e lascia stare pelle, capelli e contorni', () => {
    expect(heroTintZone('mage', ...MAGE_ROBE, 50)).toBe('armor');
    expect(heroTintZone('mage', ...MAGE_GOLD, 45)).toBe('accent');
    expect(heroTintZone('mage', ...MAGE_SKIN, 45)).toBeNull();
    expect(heroTintZone('archer', ...ARCHER_CLOAK, 25)).toBe('armor');
    expect(heroTintZone('warrior', ...STEEL, 40)).toBe('armor');
    expect(heroTintZone('warrior', ...WARRIOR_SKIN, 28)).toBeNull();
    // Lo stesso cuoio è capelli in alto e stivali in basso: decide la riga nella cella.
    expect(heroTintZone('warrior', ...LEATHER, 20)).toBeNull();
    expect(heroTintZone('warrior', ...LEATHER, 60)).toBe('boots');
    expect(heroTintZone('archer', ...LEATHER, 40)).toBeNull();
    expect(heroTintZone('archer', ...LEATHER, 60)).toBe('boots');
    for (const kind of ['warrior', 'archer', 'mage'] as const) expect(heroTintZone(kind, 12, 11, 14, 45)).toBeNull();
  });

  it('il cappello del Mago è una zona a parte: accento sopra le spalle, veste sotto', () => {
    expect(heroTintZone('mage', ...MAGE_ROBE, 20)).toBe('accent');
    expect(heroTintZone('mage', ...MAGE_ROBE, 40)).toBe('armor');
    const hat = heroTintPixel('mage', ...MAGE_ROBE, 20, { armor: mantle })!, robe = heroTintPixel('mage', ...MAGE_ROBE, 40, { armor: mantle })!;
    expect(hueGap(hueOfRgb(hat), hueOf(mantle.accent))).toBeLessThan(12);
    expect(hueGap(hueOfRgb(robe), hueOf(mantle.edge))).toBeLessThan(12);
    expect(hat).not.toEqual(robe);
  });

  it('la veste prende la tinta del pezzo; due armature diverse danno due vesti diverse', () => {
    for (const armor of [veil, mantle]) {
      const tinted = heroTintPixel('mage', ...MAGE_ROBE, 40, { armor })!;
      expect(hueGap(hueOfRgb(tinted), hueOf(armor.edge))).toBeLessThan(12);
    }
    expect(heroTintPixel('mage', ...MAGE_ROBE, 40, { armor: veil })).not.toEqual(heroTintPixel('mage', ...MAGE_ROBE, 40, { armor: mantle }));
  });

  it('il metallo stacca luci e ombre più della stoffa', () => {
    expect(armorContrast(plate)).toBe(HERO_TINT.metalContrast);
    expect(armorContrast(veil)).toBe(HERO_TINT.clothContrast);
    const light = (contrast: number, value: number): number => { const [r, g, b] = tintWith('#736c73', value, value, value, contrast); return rgbToHsl(r, g, b)[2]; };
    const spread = (contrast: number): number => light(contrast, 190) - light(contrast, 50);
    expect(spread(HERO_TINT.metalContrast)).toBeGreaterThan(spread(1));
    expect(spread(HERO_TINT.clothContrast)).toBeLessThan(spread(1));
    // A contrasto 1 la luminosità del pixel di partenza resta quella.
    expect(light(1, 120)).toBeCloseTo(rgbToHsl(120, 120, 120)[2], 1);
  });

  it('senza il pezzo la zona resta com’è; gli stivali non toccano la veste e viceversa', () => {
    expect(heroTintPixel('mage', ...MAGE_ROBE, 40, { boots: treads })).toBeNull();
    expect(heroTintPixel('warrior', ...LEATHER, 60, { armor: veil })).toBeNull();
    expect(heroTintPixel('warrior', ...LEATHER, 60, { boots: treads })).not.toBeNull();
    expect(heroTintPixel('mage', ...MAGE_SKIN, 45, { armor: veil, boots: treads })).toBeNull();
  });

  it('l’orlo dell’armatura prende il colore della rarità, solo dove sotto non c’è altra armatura', () => {
    // Una colonna in una cella alta 80: tre pixel di veste (righe 40–42), poi pelle, il resto trasparente.
    const cell = 80, pixels = new Uint8ClampedArray(cell * 4), put = (row: number, color: readonly number[]): void => pixels.set([...color, 255], row * 4);
    for (const row of [40, 41, 42]) put(row, MAGE_ROBE);
    put(43, MAGE_SKIN);
    const at = (data: Uint8ClampedArray, row: number): number[] => [...data.slice(row * 4, row * 4 + 3)];
    const legendary = pixels.slice(), rare = pixels.slice(), plain = pixels.slice();
    tintHeroSheet('mage', legendary, 1, cell, cell, { armor: veil, armorTrim: '#a85150' });
    tintHeroSheet('mage', rare, 1, cell, cell, { armor: veil, armorTrim: '#657b90' });
    tintHeroSheet('mage', plain, 1, cell, cell, { armor: veil });
    // Dentro la veste il colore è quello del pezzo, uguale con qualunque rarità.
    expect(at(legendary, 40)).toEqual(at(plain, 40));
    expect(at(legendary, 41)).toEqual(at(plain, 41));
    // L'ultima riga di veste è l'orlo: cambia con la rarità e ne ha la tinta.
    expect(at(legendary, 42)).not.toEqual(at(plain, 42));
    expect(at(legendary, 42)).not.toEqual(at(rare, 42));
    expect(hueGap(hueOfRgb(at(legendary, 42)), hueOf('#a85150'))).toBeLessThan(8);
    // Pelle e trasparenza non si toccano.
    expect(at(legendary, 43)).toEqual([...MAGE_SKIN]);
    expect(legendary[44 * 4 + 3]).toBe(0);
  });

  it('la conversione di colore torna al punto di partenza', () => {
    for (const color of [MAGE_ROBE, MAGE_GOLD, WARRIOR_SKIN, STEEL, LEATHER, ARCHER_CLOAK]) {
      const [hue, saturation, light] = rgbToHsl(color[0], color[1], color[2]), back = hslToRgb(hue, saturation, light);
      for (let i = 0; i < 3; i++) expect(Math.abs(back[i]! - color[i]!)).toBeLessThanOrEqual(1);
    }
  });
});
