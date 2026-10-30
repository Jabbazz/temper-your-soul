import { Vec2 } from './vec2';

/** Ingrandimento della vista: il canvas ha risoluzione interna pari alla finestra divisa per questo valore. */
export const ZOOM = 1.5;

/**
 * Camera centrata sul bersaglio, senza limiti ne' smorzamento. La vista e' misurata in unita' di mondo, cioe' in pixel
 * interni del canvas (che il CSS poi ingrandisce con `image-rendering: pixelated`).
 */
export class Camera {
  width = 960;
  height = 540;
  /** Angolo alto a sinistra della vista nel mondo. */
  position: Vec2 = Vec2.ZERO;
  /** Scostamento di disegno per la scossa dello schermo (non influisce sulla mira). */
  shakeOffset: Vec2 = Vec2.ZERO;

  setViewSize(width: number, height: number): void {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
  }

  follow(target: Vec2): void {
    this.position = new Vec2(target.x - this.width / 2, target.y - this.height / 2);
  }

  /** Da posizione normalizzata sul canvas (0..1) a coordinate del mondo. */
  pointerToWorld(pointer: Vec2): Vec2 {
    return new Vec2(this.position.x + pointer.x * this.width, this.position.y + pointer.y * this.height);
  }

  /** Da posizione normalizzata sul canvas allo scostamento dal centro della vista, in unita' di mondo. */
  pointerOffset(pointer: Vec2): Vec2 {
    return new Vec2(pointer.x * this.width - this.width / 2, pointer.y * this.height - this.height / 2);
  }

  /** Vero se un cerchio con centro `point` e raggio `margin` tocca la vista. */
  isVisible(point: Vec2, margin = 0): boolean {
    return (
      point.x > this.position.x - margin &&
      point.x < this.position.x + this.width + margin &&
      point.y > this.position.y - margin &&
      point.y < this.position.y + this.height + margin
    );
  }
}
