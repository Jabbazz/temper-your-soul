import type { CharacterAppearance } from '../character/appearance';
import { characterPixels, DEFAULT_APPEARANCE, type CharacterPixels } from './character-art';
import { Vec2 } from '../../core/vec2';
import type { Boss } from '../boss/boss';
import type { Minion } from '../minions/minion';
import { bossFx } from './boss-fx';
import { minionArt } from './minion-art';
import type { Player } from '../player/player';
import { bossArt, bossSheet, sheetFrame, type BossSheet } from './boss-art';
import { sheetImage, sheetVariant } from './boss-art/sheet-images';
import type { ActorPoses } from './poses';
import { PLAYER_CAST_POSE } from './poses';
import { drawSprite, type Palette } from './sprites';

/** Un raster per fotogramma/equipaggiamento, liberato insieme all'art dalla cache.
 * Evita migliaia di cambi di colore/fillRect per ogni giocatore e fotogramma. */
const rasterFrames = new WeakMap<CharacterPixels, HTMLCanvasElement>();
function rasterOf(art: CharacterPixels): HTMLCanvasElement {
  let raster = rasterFrames.get(art); if (raster) return raster;
  raster = document.createElement('canvas'); raster.width = art.width; raster.height = art.height;
  const ctx = raster.getContext('2d')!;
  for (let y = 0; y < art.height; y++) for (let x = 0; x < art.width; x++) {
    const color = art.pixels[y]![x]; if (!color) continue;
    ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1);
  }
  rasterFrames.set(art, raster); return raster;
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, radiusX: number, radiusY: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 7);
  ctx.fill();
}

/**
 * Disegna corpo e strati equipaggiati, rivolti verso la mira. L'ombra c'e' sempre; il corpo solo se `visible` (lampeggia durante
 * l'invulnerabilita', deciso dal chiamante).
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  poses: ActorPoses,
  time: number,
  visible: boolean,
  appearance: CharacterAppearance = DEFAULT_APPEARANCE,
): void {
  drawShadow(ctx, player.position.x, player.position.y + 14, 14, 5, '#080b1480');
  if (!visible) return;
  const slots = ['primary_hand','secondary_hand','armor','boots'] as const;
  const attackSlot=slots[player.skillBar.skills.findIndex(skill=>skill?.id===poses.playerSkillId)] ?? 'primary_hand';
  const motion = poses.playerCast > 0
    ? {state: 'cast' as const, attackSlot, frame: Math.min(7,Math.floor((1-poses.playerCast/PLAYER_CAST_POSE)*8))}
    : player.moving ? {state:'walk' as const,frame:Math.floor(poses.walkPhase)%8}
    : {state:'idle' as const,frame:Math.floor(time*4)%8};
  const facing = player.aim.x < player.position.x ? -1 : 1;
  ctx.save();
  ctx.translate(Math.round(player.position.x), Math.round(player.position.y));
  ctx.scale(facing, 1);
  const art=characterPixels(appearance,'game',0,false,motion);
  ctx.drawImage(rasterOf(art), -art.width / 2, -art.height + 15);
  ctx.restore();
}

/** Stato della rappresentazione del boss in questo fotogramma (dagli effetti). */
export interface BossLook {
  /** Lampo bianco del colpo, 0–1. */
  readonly flash: number;
  /** Sobbalzo o tremito, in unita' del mondo. */
  readonly offset: Vec2;
  /** Avanzamento della morte, 0–1 (null se vivo). */
  readonly death: number | null;
  /** Avanzamento della trasformazione in furia, 0–1 (null se non e' in corso). */
  readonly transform?: number | null;
  /** Tempo reale, per la pulsazione dell'aura. */
  readonly clock: number;
}

const NO_LOOK: BossLook = { flash: 0, offset: Vec2.ZERO, death: null, clock: 0 };

/** Lampo bianco all'inizio della morte (quota della sequenza) e dissolvenza finale, per i boss con foglio di sprite. */
const SHEET_DEATH = { flash: 0.15, fadeFrom: 0.85 } as const;

/**
 * Disegna il boss dal suo foglio di sprite: animazioni di camminata, attacco, trasformazione e morte, specchiato
 * verso il giocatore attorno ai piedi. Lampo bianco e velo di brina sono copie colorate del foglio.
 */
function drawSheetBoss(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  sheet: BossSheet,
  image: HTMLImageElement,
  facingLeft: boolean,
  x: number,
  y: number,
  cast: number | null,
  time: number,
  look: BossLook,
): void {
  const { layout, scale } = sheet;
  const frame = sheetFrame(sheet, {
    enraged: boss.isEnraged,
    slowed: boss.isSlowed,
    time,
    cast,
    transform: look.transform ?? null,
    death: look.death,
  });
  const { width, height } = layout.cell;
  const sx = frame.column * width;
  const sy = frame.row * height;
  const dx = -layout.feet.x * scale;
  const dy = sheet.feetY - layout.feet.y * scale;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y);
  ctx.scale(facingLeft !== sheet.facesLeft ? -1 : 1, 1);
  const death = look.death;
  if (death !== null && death > SHEET_DEATH.fadeFrom) ctx.globalAlpha = (1 - death) / (1 - SHEET_DEATH.fadeFrom);
  const source = boss.isSlowed && death === null ? sheetVariant(layout.url, image, 'frost') : image;
  ctx.drawImage(source, sx, sy, width, height, dx, dy, width * scale, height * scale);
  // Lampo bianco: il colpo subito o il colpo finale, poi l'animazione di morte si vede pulita.
  const flash = death !== null ? Math.max(0, 1 - death / SHEET_DEATH.flash) : look.flash;
  if (flash > 0) {
    ctx.globalAlpha = Math.min(1, flash) * 0.85;
    ctx.drawImage(sheetVariant(layout.url, image, 'white'), sx, sy, width, height, dx, dy, width * scale, height * scale);
  }
  ctx.restore();
}

/** La stessa tavolozza, tutta bianca: per il lampo del colpo. */
const whiteCache = new WeakMap<Palette, Palette>();
function whitePalette(palette: Palette): Palette {
  let white = whiteCache.get(palette);
  if (!white) {
    white = Object.fromEntries(Object.keys(palette).map((key) => [key, '#fff8ec']));
    whiteCache.set(palette, white);
  }
  return white;
}

/**
 * Disegna il boss con la grafica della sua definizione, rivolto verso il giocatore: il foglio di sprite se c'e' ed e'
 * caricato, altrimenti la grafica a matrici. In furia ha un alone pulsante del suo colore; quando e' colpito lampeggia
 * di bianco e sobbalza; morendo trema e si frantuma.
 */
export function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, player: Player, poses: ActorPoses, time: number, look: BossLook = NO_LOOK): void {
  const art = bossArt(boss.definition.art);
  const sheet = bossSheet(boss.definition.art);
  const image = sheet === null ? null : sheetImage(sheet.layout.url);
  const x = Math.round(boss.position.x + look.offset.x);
  const y = Math.round(boss.position.y + look.offset.y);
  drawShadow(ctx, boss.position.x, boss.position.y + art.shadow.offsetY, art.shadow.radiusX, art.shadow.radiusY, '#070c1680');
  if (boss.isEnraged || look.death !== null) {
    // Alone della furia (e della morte): un bagliore del colore del boss che pulsa sotto lo sprite.
    const glow = bossFx(boss.definition.art).rage.glow;
    const pulse = 0.5 + 0.5 * Math.sin(look.clock * 6);
    const radius = art.shadow.radiusX * (1.6 + 0.25 * pulse);
    const gradient = ctx.createRadialGradient(x, y, 4, x, y, radius);
    gradient.addColorStop(0, `${glow}${look.death !== null ? 'aa' : '66'}`);
    gradient.addColorStop(1, `${glow}00`);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const facingLeft = player.position.x < boss.position.x;
  if (sheet !== null && image !== null) {
    drawSheetBoss(ctx, boss, sheet, image, facingLeft, x, y, look.death === null ? poses.bossCastProgress : null, time, look);
    return;
  }
  const frame = Math.floor(time * (boss.isSlowed ? 2 : 5)) % 4;
  const casting = poses.bossCast > 0 && look.death === null;
  const sprite = casting ? art.casting : art.walk[frame]!;
  const bob = casting ? art.bob.casting : frame % 2 ? art.bob.odd : art.bob.even;
  const palette = art.palette(boss.isSlowed, boss.isEnraged);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facingLeft ? -1 : 1, 1);
  if (look.death !== null) ctx.globalAlpha = 1 - look.death * 0.85;
  drawSprite(ctx, sprite, 0, bob, art.scale, palette);
  if (casting) art.drawCastFx?.(ctx, boss.isEnraged);
  const flash = look.death !== null ? 0.35 + look.death * 0.65 : look.flash;
  if (flash > 0) {
    ctx.globalAlpha = Math.min(1, flash) * (look.death !== null ? 1 - look.death * 0.5 : 0.85);
    drawSprite(ctx, sprite, 0, bob, art.scale, whitePalette(palette));
  }
  ctx.restore();
}

/** Disegna un servitore: ombra, alone se ne ha uno, sprite a due fotogrammi, lampo se colpito e vita se ferito. */
export function drawMinion(ctx: CanvasRenderingContext2D, minion: Minion, time: number, flash: number): void {
  const art = minionArt(minion.definition.visual);
  const { x, y } = minion.position;
  const half = (art.frames[0].length * art.scale) / 2;
  drawShadow(ctx, x, y + half - 2, minion.hitRadius, 3, '#070c1670');
  if (art.glow !== '') {
    const gradient = ctx.createRadialGradient(x, y, 2, x, y, minion.hitRadius * 2.2);
    gradient.addColorStop(0, `${art.glow}55`);
    gradient.addColorStop(1, `${art.glow}00`);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = gradient;
    ctx.fillRect(x - minion.hitRadius * 2.2, y - minion.hitRadius * 2.2, minion.hitRadius * 4.4, minion.hitRadius * 4.4);
    ctx.restore();
  }
  const sprite = art.frames[Math.floor(time * 6 + minion.id) % 2]!;
  const bob = Math.sin(time * 8 + minion.id) * 1.5;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  drawSprite(ctx, sprite, 0, bob, art.scale, art.palette);
  if (flash > 0) {
    ctx.globalAlpha = 0.85;
    drawSprite(ctx, sprite, 0, bob, art.scale, whitePalette(art.palette));
  }
  ctx.restore();
  const fraction = minion.health.fraction;
  if (fraction < 1) {
    ctx.fillStyle = '#1a1220d0';
    ctx.fillRect(Math.round(x - 11), Math.round(y - half - 7), 22, 4);
    ctx.fillStyle = '#e8b06a';
    ctx.fillRect(Math.round(x - 10), Math.round(y - half - 6), Math.max(1, Math.round(20 * fraction)), 2);
  }
}
