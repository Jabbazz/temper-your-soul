import type { Camera } from '../../core/camera';
import type { ArenaDefinition } from '../arena/arena';
import { ARENA_THEMES } from './themes';
import { drawSolidBlock } from './themes/wall';

/**
 * Disegna la mappa (pavimento, muro, decorazioni, pilastri e massicci) con il tema della sua definizione. I ripari, che
 * stanno fra i massicci finche' resistono, si disegnano a parte con pozzi e ponti (`drawHazards`).
 */
export function drawArena(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void {
  const theme = ARENA_THEMES[arena.theme];
  theme.drawFloor(ctx, arena, camera, clock);
  for (const pillar of arena.pillars) theme.drawPillar(ctx, pillar, camera, clock);
  for (const solid of arena.solids ?? []) if (solid.cover === undefined) drawSolidBlock(ctx, solid, camera, theme.block);
}
