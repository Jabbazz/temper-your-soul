import { CLASS_COMBAT } from '../classes/combat-tuning';
import type { BuffSpec } from '../classes/skill-mechanics';
import type { SkillDefinition } from '../skills/skill-definition';
import type { CharacterClass } from '../character/character-class';
import { resolveCombatStats, damageAfterArmor, type CombatStats } from '../classes/class-stats';
import { manaBonus } from '../skills/mana';
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
  /** Frazione della velocita' da rallentato (melma, gelo dei servitori). */
  slowFactor: 0.6,
} as const;

export class Player {
  mana: number;
  readonly maxMana: number;
  manaRegeneration: number;
  readonly stats: CombatStats;
  position: Vec2;
  /** Punto del mondo verso cui si mira (sempre l'ultimo ricevuto). */
  aim: Vec2;
  readonly health: Health;
  readonly skillBar: SkillBar;
  /** Secondi di invulnerabilita' rimasti. */
  invulnerableFor = 0;
  /** Secondi di rallentamento rimasti (melma, gelo dei servitori). */
  slowFor = 0;
  /** Vero se nell'ultimo passo il giocatore ha cercato di muoversi. */
  moving = false;
  buffs: (BuffSpec & { remaining: number })[] = [];
  channel: { remaining: number; skill: SkillDefinition; aim: Vec2 } | null = null;
  rush: { remaining: number; speed: number; angle: number; damage: number; hit: Set<string> } | null = null;

  buffValue(key: 'armor' | 'regeneration' | 'attackSpeed' | 'lifesteal' | 'abilityPower'): number {
    return this.buffs.reduce((sum, buff) => sum + (buff[key] ?? 0), 0);
  }
  get guarding(): boolean { return this.buffs.some(buff => buff.guard); }
  addBuff(buff: BuffSpec): void {
    this.buffs = this.buffs.filter(active => Boolean(active.guard) !== Boolean(buff.guard));
    this.buffs.push({ ...buff, remaining: buff.duration });
  }


  constructor(
    readonly arena: ArenaDefinition,
    readonly baseLoadout: Loadout,
    maxHealth?: number,
    readonly characterClass: CharacterClass | null = null,
  ) {
    this.position = arena.playerSpawn;
    this.aim = arena.playerSpawn;
    this.stats = resolveCombatStats(characterClass, baseLoadout);
    this.health = new Health(maxHealth ?? this.stats.maxHealth);
    this.maxMana = this.stats.maxMana;
    this.mana = this.maxMana;
    this.manaRegeneration = this.stats.manaRegeneration;
    this.skillBar = new SkillBar(baseLoadout.map((skill, slot) => skill && slot === 0
      ? { ...skill, cooldown: skill.cooldown / (1 + this.stats.attackSpeed) } : skill));
    this.manaRegeneration += baseLoadout.reduce((sum, skill) => sum + (skill ? manaBonus(skill) : 0), 0);
  }

  get isInvulnerable(): boolean {
    return this.invulnerableFor > 0;
  }

  /** Avanza i tempi del giocatore: invulnerabilita', rallentamento e ricariche. */
  tick(dt: number): void {
    this.invulnerableFor = Math.max(0, this.invulnerableFor - dt);
    this.slowFor = Math.max(0, this.slowFor - dt);
    this.skillBar.tick(dt);
    this.mana = Math.min(this.maxMana, this.mana + this.manaRegeneration * dt);
  }

  /** Si muove con la direzione `move` (lunghezza al massimo 1) restando nell'arena e fuori dai pilastri. */
  moveBy(dt: number, move: Vec2): void {
    if (this.rush !== null) { this.moving = true; return; }
    this.moving = move.x !== 0 || move.y !== 0;
    const speed = this.stats.moveSpeed * (this.channel ? CLASS_COMBAT.channelMoveFactor : 1) * (this.slowFor > 0 ? PLAYER_STATS.slowFactor : 1);
    const moved = clampToArena(this.arena, this.position.add(move.mul(speed * dt)), this.arena.playerMargin);
    this.position = pushOutOfPillars(this.arena, moved, BODY_RADIUS.player);
  }

  /**
   * Subisce un colpo. Restituisce false (nessun effetto) se e' invulnerabile; altrimenti toglie vita e avvia
   * l'invulnerabilita' dopo il colpo.
   */
  tryHurt(amount: number, unblockable = false): boolean {
    if (this.guarding) { this.buffs = this.buffs.filter(buff => !buff.guard); return true; }
    if (this.isInvulnerable && !unblockable) return false;
    this.health.takeDamage(damageAfterArmor(amount, this.stats.armor + this.buffValue('armor')));
    this.invulnerableFor = PLAYER_STATS.hitInvulnerability;
    return true;
  }
}
