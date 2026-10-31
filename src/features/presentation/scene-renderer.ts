import type { CharacterAppearance } from '../character/appearance';
import type { Camera } from '../../core/camera';
import type { Match } from '../match/match';
import { drawBoss, drawMinion, drawPlayer } from './draw-actors';
import { drawArena } from './draw-arena';
import { drawChargeTelegraph, drawFallingSpell, drawPendingZone, drawProjectile, drawZoneFlash } from './draw-combat';
import { drawBossIndicator, drawCrosshair, drawFloatingTexts, drawGlowEffects, drawScreenEffects } from './draw-effects';
import { FEEDBACK, type Effects } from './effects';
import type { ActorPoses } from './poses';
import type { Player } from '../player/player';

/** Tutto cio' che serve per disegnare un fotogramma. Il renderer legge e non modifica nulla. */
export interface Scene {
  readonly allies?: readonly { player: Player; poses: ActorPoses; name: string; appearance: CharacterAppearance }[];
  readonly appearance?: CharacterAppearance;
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
  drawArena(ctx, match.arena, camera, clock);

  if (boss.charge !== null) drawChargeTelegraph(ctx, boss.charge);
  for (const flash of effects.flashes) drawZoneFlash(ctx, flash);
  for (const zone of match.zones) drawPendingZone(ctx, zone, match.time);

  for (const minion of match.minions) drawMinion(ctx, minion, clock, effects.minionFlashes.get(minion.id) ?? 0);
  // Il boss resta visibile durante la sequenza della morte (lampeggia, trema e si frantuma).
  const death = effects.bossDeath;
  if (!boss.health.isDead || death !== null) {
    drawBoss(ctx, boss, player, poses, match.time, {
      flash: effects.bossFlash / FEEDBACK.hitFlash,
      offset: effects.bossOffset(),
      death: death === null ? null : 1 - death.remaining / death.total,
      clock,
    });
  }
  drawPlayer(ctx, player, poses, match.time, !player.isInvulnerable || Math.floor(clock * 20) % 2 === 0, scene.appearance);
  for (const ally of scene.allies ?? []) {
    ctx.save();
    ctx.globalAlpha = ally.player.health.isDead ? 0.35 : 1;
    drawPlayer(ctx, ally.player, ally.poses, match.time, true, ally.appearance);
    ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    const label = ally.name + (ally.player.health.isDead ? ' · KO' : '');
    const width = ctx.measureText(label).width + 10;
    ctx.fillStyle = '#161321dd'; ctx.fillRect(ally.player.position.x - width / 2, ally.player.position.y - 51, width, 13);
    ctx.fillStyle = '#c1dccb'; ctx.fillText(label, ally.player.position.x, ally.player.position.y - 41);
    ctx.fillStyle = '#26202b'; ctx.fillRect(ally.player.position.x - 16, ally.player.position.y - 36, 32, 3);
    ctx.fillStyle = '#83b797'; ctx.fillRect(ally.player.position.x - 16, ally.player.position.y - 36, 32 * ally.player.health.fraction, 3);
    ctx.restore();
  }

  for (const projectile of match.projectiles) drawProjectile(ctx, projectile, effects.trailOf(projectile), camera, match.time);
  for (const zone of match.zones) drawFallingSpell(ctx, zone);

  drawGlowEffects(ctx, effects);
  drawFloatingTexts(ctx, effects);
  drawCrosshair(ctx, player.aim);
  ctx.restore();

  if (!boss.health.isDead) drawBossIndicator(ctx, camera, player.position, boss.position);
  drawScreenEffects(ctx, camera, effects, player.health.fraction, clock);
}
