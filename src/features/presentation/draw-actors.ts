import type { Boss } from '../boss/boss';
import type { Player } from '../player/player';
import type { ActorPoses } from './poses';
import {
  drawSprite,
  GUARDIAN_CASTING,
  GUARDIAN_WALK,
  guardianPalette,
  MAGE_CASTING,
  MAGE_PALETTE,
  MAGE_WALK,
} from './sprites';

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, radiusX: number, radiusY: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, 7);
  ctx.fill();
}

/**
 * Disegna il mago, rivolto verso la mira. L'ombra c'e' sempre; il corpo solo se `visible` (lampeggia durante
 * l'invulnerabilita', deciso dal chiamante).
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  poses: ActorPoses,
  time: number,
  visible: boolean,
): void {
  drawShadow(ctx, player.position.x, player.position.y + 14, 14, 5, '#080b1480');
  if (!visible) return;
  const frame = Math.floor(poses.walkPhase) % 4;
  const facing = player.aim.x < player.position.x ? -1 : 1;
  ctx.save();
  ctx.translate(Math.round(player.position.x), Math.round(player.position.y));
  ctx.scale(facing, 1);
  drawSprite(
    ctx,
    poses.playerCast > 0 ? MAGE_CASTING : MAGE_WALK[frame]!,
    0,
    player.moving && frame % 2 ? -1 : 0,
    2,
    MAGE_PALETTE,
  );
  if (poses.playerCast > 0) {
    ctx.fillStyle = Math.floor(time * 35) % 2 ? '#f0dcff' : '#b39cff';
    ctx.fillRect(9, -13, 5, 5);
  }
  ctx.restore();
}

/** Disegna il guardiano, rivolto verso il giocatore. */
export function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, player: Player, poses: ActorPoses, time: number): void {
  drawShadow(ctx, boss.position.x, boss.position.y + 25, 30, 10, '#070c1680');
  const frame = Math.floor(time * (boss.isSlowed ? 2 : 5)) % 4;
  const casting = poses.bossCast > 0;
  ctx.save();
  ctx.translate(Math.round(boss.position.x), Math.round(boss.position.y));
  ctx.scale(player.position.x < boss.position.x ? -1 : 1, 1);
  drawSprite(
    ctx,
    casting ? GUARDIAN_CASTING : GUARDIAN_WALK[frame]!,
    0,
    casting ? -3 : frame % 2 ? -1 : 1,
    3,
    guardianPalette(boss.isSlowed, boss.isEnraged),
  );
  if (casting) {
    ctx.fillStyle = boss.isEnraged ? '#ff795a' : '#ffd38b';
    for (const side of [-1, 1]) {
      ctx.fillRect(side * 25 - 3, -13, 6, 6);
      ctx.fillRect(side * 29 - 1, -20, 3, 3);
    }
  }
  ctx.restore();
}
