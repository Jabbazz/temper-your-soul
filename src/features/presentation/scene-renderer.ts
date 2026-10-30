import type { Camera } from '../../core/camera';
import type { Match } from '../match/match';
import { drawBoss, drawPlayer } from './draw-actors';
import { drawArena } from './draw-arena';
import { drawChargeTelegraph, drawFallingSpell, drawPendingZone, drawProjectile, drawZoneFlash } from './draw-combat';
import { drawBossIndicator, drawCrosshair, drawFloatingTexts, drawGlowEffects } from './draw-effects';
import type { Effects } from './effects';
import type { ActorPoses } from './poses';

/** Tutto cio' che serve per disegnare un fotogramma. Il renderer legge e non modifica nulla. */
export interface Scene {
  readonly match: Match;
  readonly effects: Effects;
  readonly poses: ActorPoses;
  readonly camera: Camera;
  /** Tempo reale trascorso, sempre in avanzamento (anche in pausa): anima le torce e il lampeggio. */
  readonly clock: number;
}

/** Disegna un fotogramma della partita sul canvas. */
export function renderScene(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { match, effects, poses, camera, clock } = scene;
  const { player, boss } = match;

  ctx.clearRect(0, 0, camera.width, camera.height);
  ctx.save();
  // La traslazione e' arrotondata al pixel: la pixel art resta nitida anche con la camera in movimento.
  ctx.translate(-Math.round(camera.position.x + camera.shakeOffset.x), -Math.round(camera.position.y + camera.shakeOffset.y));
  drawArena(ctx, camera, clock);

  if (boss.charge !== null) drawChargeTelegraph(ctx, boss.charge);
  for (const flash of effects.flashes) drawZoneFlash(ctx, flash);
  for (const zone of match.zones) drawPendingZone(ctx, zone, match.time);

  if (!boss.health.isDead) drawBoss(ctx, boss, player, poses, match.time);
  drawPlayer(ctx, player, poses, match.time, !player.isInvulnerable || Math.floor(clock * 20) % 2 === 0);

  for (const projectile of match.projectiles) drawProjectile(ctx, projectile, effects.trailOf(projectile), camera, match.time);
  for (const zone of match.zones) drawFallingSpell(ctx, zone);

  drawGlowEffects(ctx, effects);
  drawFloatingTexts(ctx, effects);
  drawCrosshair(ctx, player.aim);
  ctx.restore();

  if (!boss.health.isDead) drawBossIndicator(ctx, camera, player.position, boss.position);
}
