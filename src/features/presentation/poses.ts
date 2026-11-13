import type { GameEvent } from '../combat/events';

/** Secondi della sola posa visiva dopo una skill, per tutte le classi. */
export const PLAYER_CAST_POSE = 0.3;
/**
 * Camminata legata alla strada percorsa: un ciclo intero di passi ogni `PLAYER_WALK_STRIDE` unità di mondo, così i
 * piedi tengono il ritmo della velocità reale (anche da rallentati) invece di scivolare. `PLAYER_WALK_CYCLE_FRAMES` è
 * quanta fase vale un ciclo; `PLAYER_WALK_SPEED` la velocità presa quando nessuno la indica. Valori estetici provvisori.
 */
export const PLAYER_WALK_STRIDE = 72;
export const PLAYER_WALK_CYCLE_FRAMES = 12;
export const PLAYER_WALK_SPEED = 177;

/** Avanzamento della fase di camminata al secondo per chi si muove a `speed` unità al secondo. */
export const walkPhaseRate = (speed: number): number => (Math.max(0, speed) / PLAYER_WALK_STRIDE) * PLAYER_WALK_CYCLE_FRAMES;

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

  /** `speed` è la velocità a piedi del personaggio in unità al secondo: decide il ritmo dei passi. */
  update(dt: number, playerMoving: boolean, speed: number = PLAYER_WALK_SPEED): void {
    this.playerCast = Math.max(0, this.playerCast - dt);
    this.bossCast = Math.max(0, this.bossCast - dt);
    this.walkPhase = playerMoving ? this.walkPhase + dt * walkPhaseRate(speed) : 0;
  }
}
