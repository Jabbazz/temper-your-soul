import type { GameEvent } from '../combat/events';

/** Secondi della sola posa visiva dopo una skill, per tutte le classi. */
export const PLAYER_CAST_POSE = 0.3;
/** Avanzamento della fase di camminata al secondo e quanta fase vale un ciclo intero di passi (valori estetici provvisori). */
export const PLAYER_WALK_RATE = 14;
export const PLAYER_WALK_CYCLE_FRAMES = 12;

/**
 * Avanzamento 0–1 del gesto d'attacco, null se non e' in corso. Le primarie rapide completano il gesto entro la
 * propria cadenza, senza riavviare sempre il caricamento.
 */
export function playerCastProgress(remaining: number, cadence = PLAYER_CAST_POSE): number | null {
  if (remaining <= 0) return null;
  const duration = Math.max(1 / 60, Math.min(PLAYER_CAST_POSE, cadence));
  const age = Math.max(0, PLAYER_CAST_POSE - remaining);
  return age >= duration ? null : age / duration;
}

/**
 * Pose di animazione dei personaggi (camminata, lancio): stato di sola rappresentazione, ricavato dagli eventi
 * e dal movimento. Le regole non lo leggono.
 */
export class ActorPoses {
  /** Fase di camminata: la parte intera sceglie il fotogramma; si azzera da fermi. */
  walkPhase = 0;
  playerCast = 0;
  playerSkillId: string | null = null;
  bossCast = 0;
  /** Durata dell'ultima posa del boss: con `bossCast` da' l'avanzamento dell'animazione di attacco. */
  bossCastTotal = 0;

  reset(): void {
    this.walkPhase = 0;
    this.playerCast = 0;
    this.playerSkillId = null;
    this.bossCast = 0;
    this.bossCastTotal = 0;
  }

  /** Avanzamento 0–1 della posa del boss, null se non ce n'e' una in corso. */
  get bossCastProgress(): number | null {
    return this.bossCast > 0 && this.bossCastTotal > 0 ? 1 - this.bossCast / this.bossCastTotal : null;
  }

  handle(event: GameEvent): void {
    if (event.type === 'skill_cast') {
      this.playerCast = PLAYER_CAST_POSE;
      this.playerSkillId = event.skillId;
    }
    else if (event.type === 'boss_pose') {
      this.bossCast = event.seconds;
      this.bossCastTotal = event.seconds;
    }
  }

  update(dt: number, playerMoving: boolean): void {
    this.playerCast = Math.max(0, this.playerCast - dt);
    this.bossCast = Math.max(0, this.bossCast - dt);
    this.walkPhase = playerMoving ? this.walkPhase + dt * PLAYER_WALK_RATE : 0;
  }
}
