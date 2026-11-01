import { drawClassCombat } from './draw-class-combat';
import type { CharacterAppearance } from '../character/appearance';
import type { Camera } from '../../core/camera';
import type { Match } from '../match/match';
import { drawBoss, drawMinion, drawPlayer } from './draw-actors';
import { drawArena } from './draw-arena';
import { drawChargeTelegraph, drawFallingSpell, drawPendingZone, drawProjectile, drawZoneFlash } from './draw-combat';
import { drawTelegraphs } from './draw-telegraphs';
import { drawBossIndicator, drawCrosshair, drawFloatingTexts, drawGlowEffects, drawParticles, drawScreenEffects } from './draw-effects';
import { FEEDBACK, type Effects } from './effects';
import { drawVignette } from './lights';
import { ARENA_THEMES } from './themes';
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
  /**
   * Stanza della discesa: porte, premi e cartelli. `floor` sotto i personaggi, `above` sopra (cartelli delle porte),
   * in coordinate del mondo; `drawRoomScreen` in coordinate dello schermo (frecce verso i nemici fuori vista).
   */
  readonly drawRoom?: (ctx: CanvasRenderingContext2D, layer: 'floor' | 'above') => void;
  readonly drawRoomScreen?: (ctx: CanvasRenderingContext2D) => void;
  /** La preda della Caccia (in cooperativa i servitori replicati non sanno di esserlo). */
  readonly preyId?: number | null;
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
  scene.drawRoom?.(ctx, 'floor');

  if (boss !== null && boss.charge !== null) drawChargeTelegraph(ctx, boss.charge);
  for (const flash of effects.flashes) drawZoneFlash(ctx, flash);
  for (const zone of match.zones) drawPendingZone(ctx, zone, match.time);
  drawTelegraphs(ctx, effects.telegraphs, match.minions);

  // Le figure si disegnano dall'alto in basso: chi sta piu' in basso e' piu' vicino e copre chi sta dietro.
  const theme = ARENA_THEMES[match.arena.theme];
  const figures: { y: number; draw: () => void }[] = [];
  for (const minion of match.minions) {
    figures.push({ y: minion.position.y, draw: () => drawMinion(ctx, minion, clock, effects.minionFlashes.get(minion.id) ?? 0, minion.prey || minion.id === scene.preyId, theme.silhouette) });
  }
  // Il boss resta visibile durante la sequenza della morte (lampeggia, trema e si frantuma).
  const death = effects.bossDeath;
  if (boss !== null && (!boss.health.isDead || death !== null)) {
    figures.push({
      y: boss.position.y,
      draw: () => drawBoss(ctx, boss, player, poses, match.time, {
        flash: effects.bossFlash / FEEDBACK.hitFlash,
        offset: effects.bossOffset(),
        death: death === null ? null : 1 - death.remaining / death.total,
        transform: effects.bossTransform > 0 ? 1 - effects.bossTransform / FEEDBACK.bossTransform : null,
        clock,
      }),
    });
  }
  figures.push({ y: player.position.y, draw: () => drawPlayer(ctx, player, poses, match.time, !player.isInvulnerable || Math.floor(clock * 20) % 2 === 0, scene.appearance) });
  for (const ally of scene.allies ?? []) {
    figures.push({
      y: ally.player.position.y,
      draw: () => {
        ctx.save();
        ctx.globalAlpha = ally.player.health.isDead ? 0.35 : 1;
        drawPlayer(ctx, ally.player, ally.poses, match.time, true, ally.appearance);
        ctx.restore();
      },
    });
  }
  figures.sort((a, b) => a.y - b.y);
  for (const figure of figures) figure.draw();
  // Nomi e vita degli alleati sopra tutte le figure, cosi' nessuno li copre.
  for (const ally of scene.allies ?? []) {
    ctx.save();
    ctx.globalAlpha = ally.player.health.isDead ? 0.35 : 1;
    ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    const label = ally.name + (ally.player.health.isDead ? ' · KO' : '');
    const width = ctx.measureText(label).width + 10;
    ctx.fillStyle = '#161321dd'; ctx.fillRect(ally.player.position.x - width / 2, ally.player.position.y - 51, width, 13);
    ctx.fillStyle = '#c1dccb'; ctx.fillText(label, ally.player.position.x, ally.player.position.y - 41);
    ctx.fillStyle = '#26202b'; ctx.fillRect(ally.player.position.x - 16, ally.player.position.y - 36, 32, 3);
    ctx.fillStyle = '#83b797'; ctx.fillRect(ally.player.position.x - 16, ally.player.position.y - 36, 32 * ally.player.health.fraction, 3);
    ctx.restore();
  }

  // Prima i colpi dei giocatori, poi le particelle, infine i proiettili nemici: la minaccia resta sempre in vista.
  for (const projectile of match.projectiles) {
    if (projectile.team !== 'enemy') drawProjectile(ctx, projectile, effects.trailOf(projectile), camera, match.time);
  }
  drawParticles(ctx, effects);
  for (const projectile of match.projectiles) {
    if (projectile.team === 'enemy') drawProjectile(ctx, projectile, effects.trailOf(projectile), camera, match.time);
  }
  for (const zone of match.zones) drawFallingSpell(ctx, zone);

  scene.drawRoom?.(ctx, 'above');
  drawClassCombat(ctx, match, clock);
  drawGlowEffects(ctx, effects);
  drawFloatingTexts(ctx, effects);
  drawCrosshair(ctx, player.aim);
  ctx.restore();

  drawVignette(ctx, camera, theme.vignette);
  if (boss !== null && !boss.health.isDead) drawBossIndicator(ctx, camera, player.position, boss.position);
  scene.drawRoomScreen?.(ctx);
  drawScreenEffects(ctx, camera, effects, player.health.fraction, clock);
}
