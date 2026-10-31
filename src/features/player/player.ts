import { MANA, manaBonus } from '../skills/mana';
import { Vec2 } from '../../core/vec2';
import { clampToArena, pushOutOfPillars, type ArenaDefinition } from '../arena/arena';
import { BODY_RADIUS } from '../combat/collision';
import { Health } from '../combat/health';
import { SkillBar } from '../skills/skill-bar';
import type { Loadout } from '../skills/skill-definition';

/** Valori del giocatore. Provvisori, ereditati dal prototipo (vedi docs/game-design.md). */
export const PLAYER_STATS = {
  maxHealth: 100,
  /** Velocita' di movimento in unita' al secondo. */
  moveSpeed: 177,
  /** Secondi di invulnerabilita' dopo aver subito un colpo. */
  hitInvulnerability: 0.65,
} as const;

export class Player {
  mana: number = MANA.maximum;
  readonly maxMana = MANA.maximum;
  manaRegeneration: number = MANA.regeneration;
  position: Vec2;
  /** Punto del mondo verso cui si mira (sempre l'ultimo ricevuto). */
  aim: Vec2;
  readonly health = new Health(PLAYER_STATS.maxHealth);
  readonly skillBar: SkillBar;
  /** Secondi di invulnerabilita' rimasti. */
  invulnerableFor = 0;
  /** Vero se nell'ultimo passo il giocatore ha cercato di muoversi. */
  moving = false;

  constructor(
    readonly arena: ArenaDefinition,
    loadout: Loadout,
  ) {
    this.position = arena.playerSpawn;
    this.aim = arena.playerSpawn;
    this.skillBar = new SkillBar(loadout);
    this.manaRegeneration += loadout.reduce((sum, skill) => sum + (skill ? manaBonus(skill) : 0), 0);
  }

  get isInvulnerable(): boolean {
    return this.invulnerableFor > 0;
  }

  /** Avanza i tempi del giocatore: invulnerabilita' e ricariche. */
  tick(dt: number): void {
    this.invulnerableFor = Math.max(0, this.invulnerableFor - dt);
    this.skillBar.tick(dt);
    this.mana = Math.min(this.maxMana, this.mana + this.manaRegeneration * dt);
  }

  /** Si muove con la direzione `move` (lunghezza al massimo 1) restando nell'arena e fuori dai pilastri. */
  moveBy(dt: number, move: Vec2): void {
    this.moving = move.x !== 0 || move.y !== 0;
    const moved = clampToArena(this.arena, this.position.add(move.mul(PLAYER_STATS.moveSpeed * dt)), this.arena.playerMargin);
    this.position = pushOutOfPillars(this.arena, moved, BODY_RADIUS.player);
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
