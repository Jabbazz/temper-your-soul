import type { CharacterAppearance } from '../character/appearance';
import type { CharacterClass } from '../character/character-class';
import { ITEM_CLASSES } from '../items/item-classes';
import { sheetImage } from './boss-art/sheet-images';
import { PixelPainter } from './pixel-painter';
import { SHADOW_EQUIPMENT, SHADOW_GRIP, drawShadowHeld, shadowTrim } from './shadow-equipment';
import type { Item } from '../items/item';
import { tintHeroSheet } from './hero-tint';
import manifest from '../../assets/characters/hero-pixellab-64/manifest.json';
// In linea (data URL): il cambio colore legge i pixel, cosa che il browser vieta alle immagini aperte da file://.
import warriorSheet from '../../assets/characters/hero-pixellab-64/warrior.png?inline';
import archerSheet from '../../assets/characters/hero-pixellab-64/archer.png?inline';
import mageSheet from '../../assets/characters/hero-pixellab-64/mage.png?inline';

/*
 * Corpi PixelLab 64×64 dei tre personaggi giocabili: quattro direzioni scelte dalla mira, tre animazioni
 * (riposo, camminata, attacco) generate da un solo movimento a scheletro per tutte le direzioni.
 * Il corpo è a mani vuote: armi ed equipaggiamento saranno livelli separati. Solo aspetto.
 */

export const HERO_DIRECTIONS = ['south', 'east', 'north', 'west'] as const;
export type HeroDirection = (typeof HERO_DIRECTIONS)[number];
export const HERO_CLIPS = ['idle', 'walk', 'attack'] as const;
export type HeroClip = (typeof HERO_CLIPS)[number];

interface ClipRow { readonly row: number; readonly frames: number; readonly hands: readonly (readonly number[])[] }
type HeroClips = Readonly<Record<HeroClip, Readonly<Record<HeroDirection, ClipRow>>>>;

/** Cella del foglio, appoggio dei piedi nella cella e durata provvisoria del ciclo di riposo (regolabile). */
export const HERO_SHEET = { cell: manifest.cell, feetX: manifest.pivot[0]!, feetY: manifest.pivot[1]!, idleSeconds: 1.2 } as const;

const CLIPS: Readonly<Record<CharacterClass, HeroClips>> = {
  warrior: manifest.heroes.warrior.clips, archer: manifest.heroes.archer.clips, mage: manifest.heroes.mage.clips,
};
const URLS: Readonly<Record<CharacterClass, string>> = { warrior: warriorSheet, archer: archerSheet, mage: mageSheet };

/** La classe che decide il corpo: quella del personaggio, altrimenti quella dell'equipaggiamento. */
export function heroClassOf(appearance: CharacterAppearance): CharacterClass {
  return appearance.characterClass ?? ITEM_CLASSES[appearance.equipment.primary_hand?.familyId ?? '']
    ?? ITEM_CLASSES[appearance.equipment.armor?.familyId ?? ''] ?? 'warrior';
}

/** La direzione del corpo per una mira sullo schermo (x a destra, y in basso): prevale l'asse più lungo. */
export function heroDirectionFromAim(dx: number, dy: number): HeroDirection {
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'west' : 'east';
  return dy < 0 ? 'north' : 'south';
}

/** Il ritaglio del foglio per un'animazione: `phase` è l'avanzamento 0–1 del ciclo (si avvolge). */
export function heroSheetFrame(kind: CharacterClass, clip: HeroClip, direction: HeroDirection, phase: number): { readonly sx: number; readonly sy: number; readonly size: number } {
  const { row } = CLIPS[kind][clip][direction];
  return { sx: frameIndex(kind, clip, direction, phase) * HERO_SHEET.cell, sy: row * HERO_SHEET.cell, size: HERO_SHEET.cell };
}

function frameIndex(kind: CharacterClass, clip: HeroClip, direction: HeroDirection, phase: number): number {
  const { frames } = CLIPS[kind][clip][direction];
  return Math.min(frames - 1, Math.floor((((phase % 1) + 1) % 1) * frames));
}

/**
 * La mano che impugna l'arma in quel fotogramma, in pixel dai piedi (x a destra, y in basso): misurata sui fogli,
 * così l'arma segue il gesto generato. Destra per il Guerriero, sinistra per Arciere e Mago, come nelle mosse.
 */
export function heroHandAnchor(kind: CharacterClass, clip: HeroClip, direction: HeroDirection, phase: number): { readonly x: number; readonly y: number } {
  const hand = CLIPS[kind][clip][direction].hands[frameIndex(kind, clip, direction, phase)]!;
  return { x: hand[0]! - HERO_SHEET.feetX, y: hand[1]! - HERO_SHEET.feetY };
}

/** Indirizzo e misure del foglio di una classe, per le figure dei menu. */
export function heroSheetSource(kind: CharacterClass): { readonly url: string; readonly width: number; readonly height: number } {
  return { url: URLS[kind], width: manifest.sheet[0]!, height: manifest.sheet[1]! };
}

/*
 * Arma primaria: livello separato, impugnato nella mano del fotogramma, che ruota a 360° verso la mira. In attesa dei
 * nuovi sprite delle armi usa i disegni esistenti (punta in alto, presa in SHADOW_GRIP). Valori estetici provvisori.
 */
export const HERO_WEAPON = {
  /** Mezzo arco del fendente e fase dell'attacco in cui la corda è tesa. */
  slashArc: 1.25, bowDraw: [0.15, 0.7],
} as const;
const BOW_SHAPES: ReadonlySet<string> = new Set(['bow', 'thorn-bow']);
const SWING_SHAPES: ReadonlySet<string> = new Set(['sword', 'hammer']);
const WEAPON_CANVAS = 48;
const weaponRasters = new Map<string, HTMLCanvasElement>();

function weaponRaster(item: Item, pulled: boolean): HTMLCanvasElement | null {
  const art = SHADOW_EQUIPMENT[item.familyId];
  if (art === undefined || typeof document === 'undefined') return null;
  const key = `${item.familyId}:${item.rarity}:${pulled}`;
  let raster = weaponRasters.get(key);
  if (raster === undefined) {
    const painter = new PixelPainter(WEAPON_CANVAS, WEAPON_CANVAS);
    drawShadowHeld(painter, art, shadowTrim(item), pulled);
    raster = document.createElement('canvas'); raster.width = WEAPON_CANVAS; raster.height = WEAPON_CANVAS;
    const c = raster.getContext('2d')!;
    painter.pixels.forEach((row, y) => row.forEach((color, x) => { if (color) { c.fillStyle = color; c.fillRect(x, y, 1, 1); } }));
    weaponRasters.set(key, raster);
  }
  return raster;
}

/** Rotazione dell'arma attorno alla presa: `aim` è l'angolo della mira sullo schermo, `attack` l'avanzamento 0–1 del colpo (null fuori dall'attacco). */
export function heroWeaponPose(shape: string, aim: number, attack: number | null): { readonly rotation: number; readonly pulled: boolean } {
  if (BOW_SHAPES.has(shape)) {
    // L'arco è disegnato con il ventre verso destra: basta l'angolo della mira.
    return { rotation: aim, pulled: attack !== null && attack >= HERO_WEAPON.bowDraw[0] && attack < HERO_WEAPON.bowDraw[1] };
  }
  const upright = aim + Math.PI / 2;
  if (attack === null || !SWING_SHAPES.has(shape)) return { rotation: upright, pulled: false };
  return { rotation: upright + (Math.min(1, Math.max(0, attack)) * 2 - 1) * HERO_WEAPON.slashArc, pulled: false };
}

/**
 * Fuori dal combattimento l'arma è portata a riposo: dritta come è disegnata, senza rotazioni (che deformano la
 * pixel art sulle diagonali), specchiata quando la mano che la regge sta a sinistra così il ventre dell'arco e il
 * filo della lama guardano in fuori.
 */
export function heroWeaponRestMirror(direction: HeroDirection, handX: number): 1 | -1 {
  if (direction === 'east') return 1;
  if (direction === 'west') return -1;
  return handX < 0 ? -1 : 1;
}

function drawHeroWeapon(ctx: CanvasRenderingContext2D, item: Item, hand: { readonly x: number; readonly y: number }, aim: number | null, direction: HeroDirection, attack: number | null, feetOffsetY: number): void {
  const art = SHADOW_EQUIPMENT[item.familyId];
  if (art === undefined) return;
  const pose = aim === null ? null : heroWeaponPose(art.shape, aim, attack), raster = weaponRaster(item, pose?.pulled ?? false);
  if (raster === null) return;
  ctx.save();
  ctx.translate(hand.x, feetOffsetY + hand.y);
  if (pose === null) ctx.scale(heroWeaponRestMirror(direction, hand.x), 1);
  else ctx.rotate(pose.rotation);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(raster, -SHADOW_GRIP.x, -SHADOW_GRIP.y);
  ctx.restore();
}

/** Fogli ricolorati per coppia armatura/stivali: pochi alla volta (il proprio personaggio e gli alleati). */
const TINT_CACHE_LIMIT = 12;
const tintedSheets = new Map<string, HTMLCanvasElement>();

/**
 * Il foglio della classe con veste/armatura e stivali nei colori dei pezzi indossati; l'immagine originale se non
 * c'è nulla da ricolorare o se i pixel non si possono leggere.
 */
export function heroTintedSheet(kind: CharacterClass, image: HTMLImageElement, appearance: CharacterAppearance): CanvasImageSource {
  const armorItem = appearance.equipment.armor, bootsItem = appearance.equipment.boots;
  const armor = armorItem === undefined ? undefined : SHADOW_EQUIPMENT[armorItem.familyId];
  const boots = bootsItem === undefined ? undefined : SHADOW_EQUIPMENT[bootsItem.familyId];
  if ((armor === undefined && boots === undefined) || typeof document === 'undefined') return image;
  const key = `${kind}:${armorItem?.familyId ?? ''}:${armorItem?.rarity ?? ''}:${bootsItem?.familyId ?? ''}`;
  const cached = tintedSheets.get(key);
  if (cached !== undefined) return cached;
  const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const c = canvas.getContext('2d', { willReadFrequently: true });
  if (c === null) return image;
  c.drawImage(image, 0, 0);
  try {
    const data = c.getImageData(0, 0, canvas.width, canvas.height);
    tintHeroSheet(kind, data.data, canvas.width, canvas.height, HERO_SHEET.cell, { armor, armorTrim: armorItem === undefined ? undefined : shadowTrim(armorItem), boots });
    c.putImageData(data, 0, 0);
  } catch { return image; }
  if (tintedSheets.size >= TINT_CACHE_LIMIT) tintedSheets.delete(tintedSheets.keys().next().value!);
  tintedSheets.set(key, canvas);
  return canvas;
}

/**
 * Disegna corpo e arma primaria con i piedi sull'origine del contesto: l'arma sta dietro al corpo quando si mira
 * verso l'alto, davanti altrimenti. Con `weaponAtRest` (rifugio e anteprime, dove non si mira) l'arma non ruota.
 * Restituisce false se il foglio non è ancora pronto (o senza DOM): il chiamante usa allora la grafica precedente.
 */
export function drawHeroSheet(ctx: CanvasRenderingContext2D, appearance: CharacterAppearance, clip: HeroClip, aimX: number, aimY: number, phase: number, feetOffsetY = 0, weaponAtRest = false): boolean {
  const kind = heroClassOf(appearance), image = sheetImage(URLS[kind]);
  if (image === null) return false;
  const direction = heroDirectionFromAim(aimX, aimY), aim = weaponAtRest ? null : Math.atan2(aimY, aimX), weapon = appearance.equipment.primary_hand;
  const attack = clip === 'attack' ? ((phase % 1) + 1) % 1 : null;
  const hand = heroHandAnchor(kind, clip, direction, phase);
  if (weapon !== undefined && direction === 'north') drawHeroWeapon(ctx, weapon, hand, aim, direction, attack, feetOffsetY);
  const { sx, sy, size } = heroSheetFrame(kind, clip, direction, phase);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(heroTintedSheet(kind, image, appearance), sx, sy, size, size, -HERO_SHEET.feetX, feetOffsetY - HERO_SHEET.feetY, size, size);
  if (weapon !== undefined && direction !== 'north') drawHeroWeapon(ctx, weapon, hand, aim, direction, attack, feetOffsetY);
  return true;
}
