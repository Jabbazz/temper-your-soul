import type { GameEvent } from '../combat/events';

/** Secondi di posa di lancio del mago dopo una skill. */
const PLAYER_CAST_POSE = 0.16;
/** Velocita' dell'animazione di camminata, in fotogrammi al secondo. */
const WALK_RATE = 9;

/**
 * Pose di animazione dei personaggi (camminata, lancio): stato di sola rappresentazione, ricavato dagli eventi
 * e dal movimento. Le regole non lo leggono.
 */
export class ActorPoses {
  /** Fase di camminata: la parte intera sceglie il fotogramma; si azzera da fermi. */
  walkPhase = 0;
  playerCast = 0;
  bossCast = 0;

  reset(): void {
    this.walkPhase = 0;
    this.playerCast = 0;
    this.bossCast = 0;
  }

  handle(event: GameEvent): void {
    if (event.type === 'skill_cast') this.playerCast = PLAYER_CAST_POSE;
    else if (event.type === 'boss_pose') this.bossCast = event.seconds;
  }

  update(dt: number, playerMoving: boolean): void {
    this.playerCast = Math.max(0, this.playerCast - dt);
    this.bossCast = Math.max(0, this.bossCast - dt);
    this.walkPhase = playerMoving ? this.walkPhase + dt * WALK_RATE : 0;
  }
}
