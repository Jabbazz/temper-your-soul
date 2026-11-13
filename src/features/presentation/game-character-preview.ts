import type { CharacterAppearance } from '../character/appearance';
import { drawHeroSheet, HERO_FEET_OFFSET, HERO_SHEET } from './pixellab-hero';
import { PLAYER_WALK_CYCLE_FRAMES, PLAYER_WALK_SPEED, walkPhaseRate } from './poses';
import { DEFAULT_HEADING, type ScreenHeading } from './sprite-view';

/** Lo stesso corpo PixelLab di drawPlayer, fuori dal combattimento: la direzione di marcia sceglie la vista e l'arma è a riposo. */
export function drawGameCharacter(ctx: CanvasRenderingContext2D, appearance: CharacterAppearance, x: number, y: number, time: number, moving = false, heading: ScreenHeading = DEFAULT_HEADING, speed: number = PLAYER_WALK_SPEED): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  drawHeroSheet(ctx, appearance, moving ? 'walk' : 'idle', heading.x, heading.y, moving ? time * walkPhaseRate(speed) / PLAYER_WALK_CYCLE_FRAMES : time / HERO_SHEET.idleSeconds, HERO_FEET_OFFSET, true);
  ctx.restore();
}
