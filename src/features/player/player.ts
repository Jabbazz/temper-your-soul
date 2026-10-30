import { Vec2 } from '../../core/vec2';
import { ARENA, clampToArena } from '../arena/arena';
import { Health } from '../combat/health';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { SkillBar } from '../skills/skill-bar';

/** Valori del giocatore. Provvisori, ereditati dal prototipo (vedi docs/game-design.md). */
export const PLAYER_STATS = {
  maxHealth: 100,
  /** Velocita' di movimento in unita' al secondo. */
  moveSpeed: 177,
  /** Secondi di invulnerabilita' dopo aver subito un colpo. */
  hitInvulnerability: 0.65,
} as const;

export class Player {
  position: Vec2 = ARENA.playerSpawn;
  /** Punto del mondo verso cui si mira (sempre l'ultimo ricevuto). */
  aim: Vec2 = ARENA.playerSpawn;
  readonly health = new Health(PLAYER_STATS.maxHealth);
  readonly skillBar = new SkillBar(MAGE_SKILLS);
  /** Secondi di invulnerabilita' rimasti. */
  invulnerableFor = 0;
  /** Vero se nell'ultimo passo il giocatore ha cercato di muoversi. */
  moving = false;

  get isInvulnerable(): boolean {
    return this.invulnerableFor > 0;
  }

  /** Avanza i tempi del giocatore: invulnerabilita' e ricariche. */
  tick(dt: number): void {
    this.invulnerableFor = Math.max(0, this.invulnerableFor - dt);
    this.skillBar.tick(dt);
  }

  /** Si muove con la direzione `move` (lunghezza al massimo 1) restando nell'arena. */
  moveBy(dt: number, move: Vec2): void {
    this.moving = move.x !== 0 || move.y !== 0;
    this.position = clampToArena(this.position.add(move.mul(PLAYER_STATS.moveSpeed * dt)), ARENA.playerMargin);
  }

  /**
   * Subisce un colpo. Restituisce false (nessun effetto) se e' invulnerabile; altrimenti toglie vita e avvia
   * l'invulnerabilita' dopo il colpo.
   */
  tryHurt(amount: number): boolean {
    if (this.isInvulnerable) return false;
    this.health.takeDamage(amount);
    this.invulnerableFor = PLAYER_STATS.hitInvulnerability;
    return true;
  }
}
