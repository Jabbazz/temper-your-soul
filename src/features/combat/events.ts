import type { Vec2 } from '../../core/vec2';
import type { SkillId } from '../skills/skill-definition';
import type { ProjectileVisual } from './projectile';
import type { Team } from './team';

/**
 * Eventi che la simulazione emette e che rappresentazione (particelle, numeri, pose) e audio ascoltano.
 * Sono dati semplici: la simulazione non sa chi li ascolta e non dipende dal disegno.
 */
export type GameEvent =
  /** Il giocatore ha usato una skill. `origin` e' il punto di emissione, `destination` dove e' finito (scatto: punto d'arrivo). */
  | { type: 'skill_cast'; skillId: SkillId; origin: Vec2; destination: Vec2; angle: number }
  /** Danno inflitto (`amount` e' il danno del colpo, anche se supera gli HP rimasti). */
  | { type: 'damage_dealt'; target: 'player' | 'boss'; amount: number; position: Vec2 }
  /** Un proiettile ha colpito il bersaglio (anche se questo era invulnerabile). */
  | { type: 'projectile_hit'; position: Vec2; radius: number; visual: ProjectileVisual; team: Team }
  | { type: 'zone_detonated'; position: Vec2; radius: number; team: Team }
  | { type: 'boss_phase_changed'; position: Vec2; phase: number }
  /** Il boss annuncia un attacco: testo sopra la testa. */
  | { type: 'boss_attack'; patternId: string; position: Vec2; name: string; color: string; labelOffsetY: number }
  /** Il boss assume la posa di lancio per `seconds` secondi. */
  | { type: 'boss_pose'; seconds: number }
  | { type: 'boss_charge_finished'; position: Vec2 }
  | { type: 'boss_defeated'; position: Vec2 }
  | { type: 'match_ended'; won: boolean };
