import type { Camera } from '../../../core/camera';
import type { ArenaDefinition, Pillar } from '../../arena/arena';

/**
 * Il disegno di una mappa: pavimento, muro perimetrale, decorazioni e pilastri. Solo aspetto: le collisioni e le
 * dimensioni sono in `ArenaDefinition`. Le funzioni disegnano in coordinate di mondo (il contesto e' gia' traslato
 * dalla camera) e devono limitarsi alla parte visibile (`camera.isVisible`, `camera.position`, `camera.width/height`).
 */
export interface ArenaTheme {
  /** Sfondo, pavimento, muro perimetrale e decorazioni a terra. `clock` e' il tempo reale (anima fiamme, bolle...). */
  drawFloor(ctx: CanvasRenderingContext2D, arena: ArenaDefinition, camera: Camera, clock: number): void;
  /** Un pilastro (se visibile). Disegnato sopra il pavimento e sotto i personaggi. */
  drawPillar(ctx: CanvasRenderingContext2D, pillar: Pillar, camera: Camera, clock: number): void;
}
