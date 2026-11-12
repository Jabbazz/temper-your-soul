import type { CharacterClass } from '../character/character-class';
import type { ShadowMaterial } from './shadow-equipment';

/*
 * Cambio colore dei corpi PixelLab secondo l'equipaggiamento: i pixel della veste o dell'armatura, delle rifiniture
 * e degli stivali prendono tinta e saturazione del pezzo indossato e conservano la propria luminosità, così ombre e
 * pieghe generate restano identiche. In più: l'orlo dell'armatura ha il colore della rarità, il cappello del Mago
 * ha il colore d'accento, il metallo ha più contrasto della stoffa. La forma non cambia. Solo aspetto; nessun DOM.
 */

export type TintZone = 'armor' | 'accent' | 'boots';

interface ZoneRule {
  readonly zone: TintZone;
  /** Intervallo di tinta in gradi (min ≤ max), oppure 'grey' per i pixel poco saturi (acciaio). */
  readonly hue: readonly [number, number] | 'grey';
  /** Intervallo di luminosità 0–1 e di riga nella cella (i piedi stanno in basso). */
  readonly light: readonly [number, number];
  readonly rows: readonly [number, number];
  readonly minSaturation?: number;
}

/** Cosa indossa il personaggio, per il cambio colore: materiali dei pezzi e colore della rarità dell'armatura. */
export interface HeroTintLook {
  readonly armor?: ShadowMaterial;
  readonly armorTrim?: string;
  readonly boots?: ShadowMaterial;
}

/** Valori estetici provvisori e regolabili. */
export const HERO_TINT = {
  /** Sotto questa saturazione un pixel conta come grigio; sotto questa luminosità è contorno e non si tocca. */
  greySaturation: 0.14, inkLight: 0.1,
  saturationBoost: 1.5, maxSaturation: 0.7,
  /** Contrasto attorno alla luminosità media della veste: il metallo stacca luci e ombre, la stoffa le ammorbidisce. */
  contrastPivot: 0.32, metalContrast: 1.3, clothContrast: 0.85,
  /** L'orlo colorato per rarità: luminosità minima e saturazione, perché si legga anche sui pezzi scuri. */
  trimLight: 0.5, trimSaturation: 0.55,
} as const;

/** Le forme d'armatura in metallo; le altre sono stoffa. */
const METAL_SHAPES: ReadonlySet<string> = new Set(['plate', 'aegis']);

/** Zone misurate sugli istogrammi dei tre fogli (tinta per fascia del corpo). La prima regola che combacia vince. */
export const HERO_TINT_ZONES: Readonly<Record<CharacterClass, readonly ZoneRule[]>> = {
  // Acciaio grigio dal collo in giù, tunica rosso scuro, stivali di cuoio (i capelli castani stanno più in alto).
  warrior: [
    { zone: 'boots', hue: [5, 45], light: [0.1, 0.5], rows: [56, 80] },
    { zone: 'armor', hue: 'grey', light: [0.1, 1], rows: [30, 80] },
    { zone: 'accent', hue: [300, 360], light: [0.1, 0.6], rows: [30, 80] },
  ],
  // Mantello e calzoni verdi; la giubba di cuoio resta com'è.
  archer: [
    { zone: 'boots', hue: [0, 45], light: [0.1, 0.5], rows: [56, 80] },
    { zone: 'armor', hue: [80, 165], light: [0.1, 1], rows: [0, 80] },
  ],
  // Cappello (sopra le spalle) nel colore d'accento, veste blu, bordi dorati (più saturi e meno rossi della pelle), scarpe scure.
  mage: [
    { zone: 'boots', hue: [0, 30], light: [0.1, 0.5], rows: [57, 80] },
    { zone: 'boots', hue: [340, 360], light: [0.1, 0.5], rows: [57, 80] },
    { zone: 'accent', hue: [190, 265], light: [0.1, 1], rows: [0, 34] },
    { zone: 'armor', hue: [190, 265], light: [0.1, 1], rows: [34, 80] },
    { zone: 'accent', hue: [30, 60], light: [0.3, 1], rows: [0, 80], minSaturation: 0.3 },
  ],
};

type Rgb = readonly [number, number, number];

/** Tinta (gradi), saturazione e luminosità (0–1) di un colore RGB 0–255. */
export function rgbToHsl(r: number, g: number, b: number): Rgb {
  const R = r / 255, G = g / 255, B = b / 255, max = Math.max(R, G, B), min = Math.min(R, G, B), light = (max + min) / 2, delta = max - min;
  if (delta === 0) return [0, 0, light];
  const saturation = delta / (1 - Math.abs(2 * light - 1));
  const sector = max === R ? ((G - B) / delta) % 6 : max === G ? (B - R) / delta + 2 : (R - G) / delta + 4;
  return [(sector * 60 + 360) % 360, saturation, light];
}

export function hslToRgb(hue: number, saturation: number, light: number): Rgb {
  const chroma = (1 - Math.abs(2 * light - 1)) * saturation, sector = hue / 60, second = chroma * (1 - Math.abs((sector % 2) - 1)), base = light - chroma / 2;
  const [r, g, b] = sector < 1 ? [chroma, second, 0] : sector < 2 ? [second, chroma, 0] : sector < 3 ? [0, chroma, second]
    : sector < 4 ? [0, second, chroma] : sector < 5 ? [second, 0, chroma] : [chroma, 0, second];
  return [Math.round((r + base) * 255), Math.round((g + base) * 255), Math.round((b + base) * 255)];
}

/** La zona di un pixel del foglio (`cellRow` è la riga dentro la cella), o null se non si ricolora. */
export function heroTintZone(kind: CharacterClass, r: number, g: number, b: number, cellRow: number): TintZone | null {
  const [hue, saturation, light] = rgbToHsl(r, g, b);
  if (light < HERO_TINT.inkLight) return null;
  for (const rule of HERO_TINT_ZONES[kind]) {
    if (cellRow < rule.rows[0] || cellRow >= rule.rows[1] || light < rule.light[0] || light > rule.light[1]) continue;
    if (rule.hue === 'grey') { if (saturation < HERO_TINT.greySaturation) return rule.zone; continue; }
    if (saturation < (rule.minSaturation ?? HERO_TINT.greySaturation) || hue < rule.hue[0] || hue > rule.hue[1]) continue;
    return rule.zone;
  }
  return null;
}

function hexHsl(hex: string): Rgb {
  const value = parseInt(hex.slice(1, 7), 16);
  return rgbToHsl((value >> 16) & 255, (value >> 8) & 255, value & 255);
}

/** Il colore di un pixel con tinta e saturazione del materiale (`source`) e la sua luminosità, col contrasto dato. */
export function tintWith(source: string, r: number, g: number, b: number, contrast = 1): Rgb {
  const [hue, saturation] = hexHsl(source), light = rgbToHsl(r, g, b)[2];
  const shaped = Math.min(0.95, Math.max(0.04, HERO_TINT.contrastPivot + (light - HERO_TINT.contrastPivot) * contrast));
  return hslToRgb(hue, Math.min(HERO_TINT.maxSaturation, saturation * HERO_TINT.saturationBoost), shaped);
}

/** Il contrasto del materiale dell'armatura: metallo o stoffa. */
export function armorContrast(armor: ShadowMaterial): number {
  return METAL_SHAPES.has(armor.shape) ? HERO_TINT.metalContrast : HERO_TINT.clothContrast;
}

/** Il colore dell'orlo: la tinta della rarità, chiaro e saturo quanto basta a leggersi. */
export function trimColor(trim: string, r: number, g: number, b: number): Rgb {
  const hue = hexHsl(trim)[0], light = rgbToHsl(r, g, b)[2];
  return hslToRgb(hue, HERO_TINT.trimSaturation, Math.max(HERO_TINT.trimLight, light));
}

/**
 * Il colore ricolorato di un pixel, o null se resta com'è: l'armatura tinge la sua zona con il bordo chiaro del
 * materiale e le rifiniture (cappello, bordi, tunica) con l'accento; gli stivali tingono i piedi.
 */
export function heroTintPixel(kind: CharacterClass, r: number, g: number, b: number, cellRow: number, look: HeroTintLook): Rgb | null {
  const zone = heroTintZone(kind, r, g, b, cellRow);
  if (zone === null) return null;
  if (zone === 'boots') return look.boots === undefined ? null : tintWith(look.boots.edge, r, g, b);
  if (look.armor === undefined) return null;
  return zone === 'armor' ? tintWith(look.armor.edge, r, g, b, armorContrast(look.armor)) : tintWith(look.armor.accent, r, g, b);
}

const ZONE_CODES: Readonly<Record<TintZone, number>> = { armor: 1, accent: 2, boots: 3 };

/**
 * Ricolora sul posto i pixel RGBA di un foglio a celle quadrate. L'orlo: i pixel d'armatura che non hanno altra
 * armatura sotto di sé (fondo della veste, bordo inferiore delle piastre) prendono il colore della rarità.
 */
export function tintHeroSheet(kind: CharacterClass, pixels: Uint8ClampedArray, width: number, height: number, cell: number, look: HeroTintLook): void {
  const zones = new Uint8Array(width * height), known = new Map<number, number>();
  for (let y = 0; y < height; y++) {
    const cellRow = y % cell;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (pixels[i + 3] === 0) continue;
      // Stesso colore sulla stessa riga della cella = stessa zona: i fogli hanno poche decine di colori.
      const id = ((pixels[i]! << 16) | (pixels[i + 1]! << 8) | pixels[i + 2]!) * 128 + cellRow;
      let code = known.get(id);
      if (code === undefined) { const zone = heroTintZone(kind, pixels[i]!, pixels[i + 1]!, pixels[i + 2]!, cellRow); code = zone === null ? 0 : ZONE_CODES[zone]; known.set(id, code); }
      zones[y * width + x] = code;
    }
  }
  const armorCode = ZONE_CODES.armor;
  for (let y = 0; y < height; y++) {
    const cellRow = y % cell, lastRow = cellRow === cell - 1;
    for (let x = 0; x < width; x++) {
      const at = y * width + x, code = zones[at]!;
      if (code === 0) continue;
      const i = at * 4, r = pixels[i]!, g = pixels[i + 1]!, b = pixels[i + 2]!;
      const hem = code === armorCode && look.armor !== undefined && look.armorTrim !== undefined && (lastRow || zones[at + width] !== armorCode);
      const tint = hem ? trimColor(look.armorTrim!, r, g, b) : heroTintPixel(kind, r, g, b, cellRow, look);
      if (tint !== null) { pixels[i] = tint[0]; pixels[i + 1] = tint[1]; pixels[i + 2] = tint[2]; }
    }
  }
}
