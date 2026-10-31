import type { CharacterAppearance } from '../character/appearance';
import { characterPixels, DEFAULT_APPEARANCE, type CharacterPixels } from './character-art';
import type { Boss } from '../boss/boss';
import type { Player } from '../player/player';
import { bossArt } from './boss-art';
import type { ActorPoses } from './poses';
import { PLAYER_CAST_POSE } from './poses';
import { drawSprite } from './sprites';

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

/** Disegna il boss con la grafica della sua definizione, rivolto verso il giocatore. */
export function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, player: Player, poses: ActorPoses, time: number): void {
  const art = bossArt(boss.definition.art);
  drawShadow(ctx, boss.position.x, boss.position.y + art.shadow.offsetY, art.shadow.radiusX, art.shadow.radiusY, '#070c1680');
  const frame = Math.floor(time * (boss.isSlowed ? 2 : 5)) % 4;
  const casting = poses.bossCast > 0;
  ctx.save();
  ctx.translate(Math.round(boss.position.x), Math.round(boss.position.y));
  ctx.scale(player.position.x < boss.position.x ? -1 : 1, 1);
  drawSprite(
    ctx,
    casting ? art.casting : art.walk[frame]!,
    0,
    casting ? art.bob.casting : frame % 2 ? art.bob.odd : art.bob.even,
    art.scale,
    art.palette(boss.isSlowed, boss.isEnraged),
  );
  if (casting) art.drawCastFx?.(ctx, boss.isEnraged);
  ctx.restore();
}
