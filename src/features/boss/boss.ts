import { clamp, Vec2 } from '../../core/vec2';
import { moveBody, type ArenaDefinition } from '../arena/arena';
import { Health } from '../combat/health';
import type { BossContext } from './boss-context';
import type { BossDefinition, BossStats, ScheduledAction } from './boss-definition';

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
  position: Vec2;
  readonly health: Health;
  /** Secondi di rallentamento rimasti. */
  slowFor = 0;
  rootFor = 0;
  phase: 1 | 2 = 1;
  charge: Charge | null = null;
  /** Azioni programmate (raffiche, onde, teletrasporti): eseguite quando il loro ritardo arriva a zero. */
  scheduled: ScheduledAction[] = [];
  /** Secondi al prossimo attacco. */
  attackTimer: number;
  /** Quanti attacchi ha lanciato: sceglie il prossimo schema in rotazione. */
  attackCount = 0;

  constructor(
    readonly definition: BossDefinition,
    readonly arena: ArenaDefinition,
  ) {
    this.position = arena.bossSpawn;
    this.health = new Health(definition.stats.maxHealth);
    this.attackTimer = definition.stats.firstAttackDelay;
  }

  get stats(): BossStats {
    return this.definition.stats;
  }

  get isEnraged(): boolean {
    return this.phase === 2;
  }

  get isSlowed(): boolean {
    return this.slowFor > 0;
  }

  /** Avanza i tempi del boss (rallentamento). */
  tick(dt: number): void {
    this.rootFor = Math.max(0, this.rootFor - dt);
    this.slowFor = Math.max(0, this.slowFor - dt);
  }

  /** Un passo di comportamento: fase, movimento, carica, azioni programmate e scelta del prossimo attacco. */
  step(dt: number, ctx: BossContext): void {
    this.updatePhase(ctx);
    if (this.charge === null) this.move(dt, ctx.target);
    this.advanceCharge(dt, ctx);
    this.advanceScheduled(dt, ctx);
    this.position = moveBody(this.arena, this.position, this.position, this.stats.hitRadius, this.arena.bossMargin);
    this.attackTimer -= dt;
    if (this.attackTimer <= 0 && this.charge === null && this.scheduled.length === 0) {
      this.startAttack(ctx);
      this.attackTimer = this.isEnraged ? this.stats.attackInterval.rage : this.stats.attackInterval.normal;
    }
  }

  private updatePhase(ctx: BossContext): void {
    if (this.phase === 1 && this.health.current < this.health.max * this.stats.phaseTwoThreshold) {
      this.phase = 2;
      const { name, rageText, summons } = this.definition;
      ctx.emit({ type: 'boss_phase_changed', position: this.position, phase: 2, text: rageText ?? `${name} SI INFURIA` });
      // Il passaggio in furia apre un capitolo nuovo: arrivano i servitori.
      if (summons !== undefined) ctx.summon?.(summons, summons.onRage, this.position);
    }
  }

  /** Insegue il giocatore e, da vicino, gli gira attorno. */
  private move(dt: number, target: Vec2): void {
    if (this.rootFor > 0) return;
    const angle = this.position.angleTo(target);
    const speed = this.isSlowed ? this.stats.slowedSpeed : this.stats.speed;
    const step =
      this.position.distanceTo(target) > this.stats.orbitDistance
        ? Vec2.fromAngle(angle, speed * dt)
        : Vec2.fromAngle(angle + Math.PI / 2, speed * this.stats.orbitSpeedFactor * dt);
    this.position = moveBody(this.arena, this.position, this.position.add(step), this.stats.hitRadius, this.arena.bossMargin);
  }

  private advanceCharge(dt: number, ctx: BossContext): void {
    const charge = this.charge;
    if (charge === null) return;
    charge.elapsed += dt;
    if (charge.elapsed < charge.windup) return;
    const u = clamp((charge.elapsed - charge.windup) / charge.duration, 0, 1);
    const destination = charge.start.lerp(charge.target, u);
    const before = this.position;
    this.position = moveBody(this.arena, before, destination, this.stats.hitRadius, this.arena.bossMargin);
    if (this.position.distanceTo(destination) > 1) {
      ctx.emit({ type: 'boss_charge_finished', position: this.position });
      this.charge = null;
      return;
    }
    if (ctx.hurtNearbyPlayers) ctx.hurtNearbyPlayers(this.stats.chargeDamage);
    else if (this.position.distanceTo(ctx.target) < this.stats.chargeHitDistance) ctx.hurtPlayer(this.stats.chargeDamage);
    if (u === 1) {
      ctx.emit({ type: 'boss_charge_finished', position: this.position });
      this.charge = null;
    }
  }

  private advanceScheduled(dt: number, ctx: BossContext): void {
    // Istantanea: un'azione eseguita puo' programmarne altre, che partono dal passo successivo.
    const current = this.scheduled;
    this.scheduled = [];
    for (const action of current) {
      action.delay -= dt;
      if (action.delay <= 0) action.run(this, ctx);
      else this.scheduled.push(action);
    }
  }

  private startAttack(ctx: BossContext): void {
    const patterns = this.definition.patterns;
    const pattern = patterns[this.attackCount % patterns.length]!;
    this.attackCount++;
    const { summons } = this.definition;
    if (summons !== undefined && this.isEnraged && this.attackCount % summons.everyAttacks === 0) {
      ctx.summon?.(summons, summons.wave, this.position);
    }
    ctx.emit({ type: 'boss_pose', seconds: this.stats.attackPose });
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
