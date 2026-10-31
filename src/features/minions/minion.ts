import type { Vec2 } from '../../core/vec2';
import { Health } from '../combat/health';
import type { MinionDefinition } from './minion-definition';

/** Un servitore in partita: stato variabile. I dati stanno in `MinionDefinition`. */
export class Minion {
  position: Vec2;
  readonly health: Health;
  /** Secondi al prossimo colpo (solo torrette). */
  shotTimer: number;

  constructor(
    readonly id: number,
    readonly definition: MinionDefinition,
    position: Vec2,
  ) {
    this.position = position;
    this.health = new Health(definition.maxHealth);
    this.shotTimer = definition.shot?.firstDelay ?? 0;
  }

  get isDead(): boolean {
    return this.health.isDead;
  }

  get hitRadius(): number {
    return this.definition.hitRadius;
  }
}
