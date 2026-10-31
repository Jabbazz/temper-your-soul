import type { Camera } from '../../core/camera';
import type { ArenaDefinition } from '../arena/arena';
import { ARENA_THEMES } from './themes';

/** Disegna la mappa (pavimento, muro, decorazioni e pilastri) con il tema della sua definizione. */
export function drawArena(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  const theme = ARENA_THEMES[arena.theme];
  theme.drawFloor(ctx, arena, camera, clock);
  for (const pillar of arena.pillars) theme.drawPillar(ctx, pillar, camera, clock);
}
