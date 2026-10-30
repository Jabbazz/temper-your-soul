import { clamp, Vec2 } from '../../core/vec2';
import { ARENA, clampToArena } from '../arena/arena';
import { CHARGE_HIT_DISTANCE } from '../combat/collision';
import { Health } from '../combat/health';
import type { BossContext } from './boss-context';
import { BOSS_PATTERNS, fireVolley, type Volley } from './boss-patterns';

/** Valori del guardiano. Provvisori, ereditati dal prototipo (vedi docs/game-design.md). */
export const BOSS_STATS = {
  maxHealth: 1800,
  /** Sotto questa frazione di vita il boss entra nella seconda fase (furia). */
  phaseTwoThreshold: 0.5,
  /** Velocita' di inseguimento, normale e con il gelo, in unita' al secondo. */
  speed: 100,
  slowedSpeed: 30,
  /** Entro questa distanza dal giocatore smette di avvicinarsi e gli gira attorno. */
  orbitDistance: 180,
  /** Velocita' di rotazione attorno al giocatore, come frazione della velocita' di inseguimento. */
  orbitSpeedFactor: 0.38,
  /** Secondi prima del primo attacco. */
  firstAttackDelay: 1.8,
  /** Secondi tra la partenza di un attacco e quella del successivo, per fase. */
  attackInterval: { normal: 2.15, rage: 1.65 },
  /** Secondi di posa di lancio all'inizio di ogni attacco (alcuni schemi la prolungano o la ripetono). */
  attackPose: 0.5,
  /** Danno per contatto e danno della carica. */
  contactDamage: 18,
  chargeDamage: 25,
} as const;

/** Carica in corso: una breve preparazione (segnalata a terra), poi uno scatto lineare verso il punto fissato. */
export interface Charge {
  readonly start: Vec2;
  readonly target: Vec2;
  /** Secondi trascorsi dall'inizio della carica. */
  elapsed: number;
  readonly windup: number;
  readonly duration: number;
}

export class Boss {
  position: Vec2 = ARENA.bossSpawn;
  readonly health = new Health(BOSS_STATS.maxHealth);
  /** Secondi di rallentamento rimasti. */
  slowFor = 0;
  phase: 1 | 2 = 1;
  charge: Charge | null = null;
  /** Raffiche programmate: sparano quando il loro ritardo arriva a zero. */
  volleys: Volley[] = [];
  /** Secondi al prossimo attacco. */
  attackTimer: number = BOSS_STATS.firstAttackDelay;
  /** Quanti attacchi ha lanciato: sceglie il prossimo schema in rotazione. */
  attackCount = 0;

  get isEnraged(): boolean {
    return this.phase === 2;
  }

  get isSlowed(): boolean {
    return this.slowFor > 0;
  }

  /** Avanza i tempi del boss (rallentamento). */
  tick(dt: number): void {
    this.slowFor = Math.max(0, this.slowFor - dt);
  }

  /** Un passo di comportamento: fase, movimento, carica, raffiche e scelta del prossimo attacco. */
  step(dt: number, ctx: BossContext): void {
    this.updatePhase(ctx);
    if (this.charge === null) this.move(dt, ctx.target);
    this.advanceCharge(dt, ctx);
    this.advanceVolleys(dt, ctx);
    this.attackTimer -= dt;
    if (this.attackTimer <= 0 && this.charge === null && this.volleys.length === 0) {
      this.startAttack(ctx);
      this.attackTimer = this.isEnraged ? BOSS_STATS.attackInterval.rage : BOSS_STATS.attackInterval.normal;
    }
  }

  private updatePhase(ctx: BossContext): void {
    if (this.phase === 1 && this.health.current < this.health.max * BOSS_STATS.phaseTwoThreshold) {
      this.phase = 2;
      ctx.emit({ type: 'boss_phase_changed', position: this.position, phase: 2 });
    }
  }

  /** Insegue il giocatore e, da vicino, gli gira attorno. */
  private move(dt: number, target: Vec2): void {
    const angle = this.position.angleTo(target);
    const speed = this.isSlowed ? BOSS_STATS.slowedSpeed : BOSS_STATS.speed;
    const step =
      this.position.distanceTo(target) > BOSS_STATS.orbitDistance
        ? Vec2.fromAngle(angle, speed * dt)
        : Vec2.fromAngle(angle + Math.PI / 2, speed * BOSS_STATS.orbitSpeedFactor * dt);
    this.position = clampToArena(this.position.add(step), ARENA.bossMargin);
  }

  private advanceCharge(dt: number, ctx: BossContext): void {
    const charge = this.charge;
    if (charge === null) return;
    charge.elapsed += dt;
    if (charge.elapsed < charge.windup) return;
    const u = clamp((charge.elapsed - charge.windup) / charge.duration, 0, 1);
    this.position = charge.start.lerp(charge.target, u);
    if (this.position.distanceTo(ctx.target) < CHARGE_HIT_DISTANCE) ctx.hurtPlayer(BOSS_STATS.chargeDamage);
    if (u === 1) {
      ctx.emit({ type: 'boss_charge_finished', position: this.position });
      this.charge = null;
    }
  }

  private advanceVolleys(dt: number, ctx: BossContext): void {
    const pending: Volley[] = [];
    for (const volley of this.volleys) {
      volley.delay -= dt;
      if (volley.delay <= 0) fireVolley(volley, this, ctx);
      else pending.push(volley);
    }
    this.volleys = pending;
  }

  private startAttack(ctx: BossContext): void {
    const pattern = BOSS_PATTERNS[this.attackCount % BOSS_PATTERNS.length]!;
    this.attackCount++;
    ctx.emit({ type: 'boss_pose', seconds: BOSS_STATS.attackPose });
    ctx.emit({
      type: 'boss_attack',
      patternId: pattern.id,
      position: this.position,
      name: pattern.name,
      color: pattern.labelColor,
      labelOffsetY: pattern.labelOffsetY,
    });
    pattern.execute(this, ctx);
  }
}
