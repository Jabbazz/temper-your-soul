import type { Rng } from '../../core/rng';
import { Signal } from '../../core/signal';
import type { Vec2 } from '../../core/vec2';
import { isOutsideProjectileBounds } from '../arena/arena';
import { Boss, BOSS_STATS } from '../boss/boss';
import type { BossContext } from '../boss/boss-context';
import { CONTACT_DISTANCE, HIT_RADIUS, ZONE_PADDING } from '../combat/collision';
import { DangerZone, type DangerZoneSpec } from '../combat/danger-zone';
import type { GameEvent } from '../combat/events';
import { Projectile, type ProjectileSpec } from '../combat/projectile';
import { Player } from '../player/player';
import { tryCastSkill, type SkillContext } from '../skills/skill-effects';

/** Che cosa vuole fare il giocatore in questo passo. Lo produce l'input (o un test). */
export interface PlayerIntent {
  /** Direzione di movimento, lunghezza al massimo 1. */
  readonly move: Vec2;
  /**
   * Dove punta il mouse, relativo al giocatore (la camera e' centrata su di lui, quindi il puntatore a schermo
   * corrisponde a un offset fisso dal giocatore). La mira in coordinate del mondo si ricava DOPO il movimento e prima
   * di ogni skill: cosi' mirino e lanci seguono il mouse anche mentre ci si muove o dopo uno scatto.
   */
  readonly aimOffset: Vec2;
  /** Per ogni slot di skill: vero se e' tenuto premuto o e' stato premuto dall'ultimo passo. */
  readonly skills: readonly boolean[];
}

export type MatchStatus = 'playing' | 'won' | 'lost';

/**
 * Una partita: il giocatore contro il guardiano nell'arena. E' la simulazione completa, senza DOM ne' disegno:
 * avanza a passo fisso con `step()` e racconta cio' che accade con gli eventi (`events`).
 */
export class Match {
  /** Eventi della simulazione, per rappresentazione e audio. */
  readonly events = new Signal<[GameEvent]>();
  readonly player = new Player();
  readonly boss = new Boss();
  projectiles: Projectile[] = [];
  zones: DangerZone[] = [];
  status: MatchStatus = 'playing';
  /** Secondi di partita trascorsi (si fermano alla fine). */
  time = 0;

  private nextId = 1;

  private readonly skillContext: SkillContext = {
    player: this.player,
    spawnProjectile: (spec, position, angle) => this.spawnProjectile(spec, position, angle),
    spawnZone: (spec, position) => this.spawnZone(spec, position),
    emit: (event) => this.events.emit(event),
  };

  constructor(readonly rng: Rng) {}

  /** Un passo di simulazione di `dt` secondi. Dopo la fine della partita non fa nulla. */
  step(dt: number, intent: PlayerIntent): void {
    if (this.status !== 'playing') return;
    this.time += dt;

    this.player.tick(dt);
    this.boss.tick(dt);

    this.player.moveBy(dt, intent.move);
    const syncAim = (): void => {
      this.player.aim = this.player.position.add(intent.aimOffset);
    };
    syncAim();
    for (let slot = 0; slot < intent.skills.length; slot++) {
      if (!intent.skills[slot]) continue;
      // Ridondante con le skill attuali (lo scatto e' l'ultimo slot), ma una skill che sposta il giocatore prima di
      // un'altra deve far mirare la successiva dalla nuova posizione, come `syncAim()` in `cast()` del prototipo.
      syncAim();
      tryCastSkill(slot, this.skillContext);
    }
    syncAim();

    this.boss.step(dt, this.bossContext());
    if (this.player.position.distanceTo(this.boss.position) < CONTACT_DISTANCE) this.hurtPlayer(BOSS_STATS.contactDamage);

    this.stepProjectiles(dt);
    this.stepZones(dt);
  }

  private bossContext(): BossContext {
    return {
      target: this.player.position,
      time: this.time,
      rng: this.rng,
      spawnProjectile: (spec, position, angle) => this.spawnProjectile(spec, position, angle),
      spawnZone: (spec, position) => this.spawnZone(spec, position),
      hurtPlayer: (amount) => this.hurtPlayer(amount),
      emit: (event) => this.events.emit(event),
    };
  }

  private spawnProjectile(spec: ProjectileSpec, position: Vec2, angle: number): void {
    this.projectiles.push(new Projectile(this.nextId++, spec, position, angle));
  }

  private spawnZone(spec: DangerZoneSpec, position: Vec2): void {
    this.zones.push(new DangerZone(this.nextId++, spec, position));
  }

  /** Muove i proiettili, risolve i colpi e rimuove quelli finiti. Un colpo a segno consuma il proiettile. */
  private stepProjectiles(dt: number): void {
    for (const projectile of this.projectiles) {
      projectile.advance(dt);
      if (projectile.team === 'enemy') {
        if (projectile.position.distanceTo(this.player.position) < projectile.radius + HIT_RADIUS.player) {
          this.hurtPlayer(projectile.damage);
          this.emitProjectileHit(projectile);
          projectile.expire();
        }
      } else if (projectile.position.distanceTo(this.boss.position) < projectile.radius + HIT_RADIUS.boss) {
        this.hitBoss(projectile.damage);
        if (projectile.spec.slowSeconds !== undefined) this.boss.slowFor = projectile.spec.slowSeconds;
        this.emitProjectileHit(projectile);
        projectile.expire();
      }
      if (isOutsideProjectileBounds(projectile.position)) projectile.expire();
    }
    this.projectiles = this.projectiles.filter((projectile) => !projectile.isExpired);
  }

  /** Fa scoppiare le zone arrivate a fine conto alla rovescia e le rimuove. */
  private stepZones(dt: number): void {
    const pending: DangerZone[] = [];
    for (const zone of this.zones) {
      zone.remaining -= dt;
      if (!zone.isDue) {
        pending.push(zone);
        continue;
      }
      this.events.emit({ type: 'zone_detonated', position: zone.position, radius: zone.radius, team: zone.team });
      if (zone.team === 'player') {
        if (zone.position.distanceTo(this.boss.position) < zone.radius + ZONE_PADDING.vsBoss) this.hitBoss(zone.spec.damage);
      } else if (zone.position.distanceTo(this.player.position) < zone.radius + ZONE_PADDING.vsPlayer) {
        this.hurtPlayer(zone.spec.damage);
      }
    }
    this.zones = pending;
  }

  private emitProjectileHit(projectile: Projectile): void {
    this.events.emit({
      type: 'projectile_hit',
      position: projectile.position,
      radius: projectile.radius,
      visual: projectile.spec.visual,
      team: projectile.team,
    });
  }

  /** Danno al giocatore: ignorato se e' invulnerabile o la partita e' finita. */
  private hurtPlayer(amount: number): void {
    if (this.status !== 'playing') return;
    if (!this.player.tryHurt(amount)) return;
    this.events.emit({ type: 'damage_dealt', target: 'player', amount, position: this.player.position });
    if (this.player.health.isDead) this.end(false);
  }

  /** Danno al boss. L'evento porta il danno del colpo anche se supera gli HP rimasti. */
  private hitBoss(amount: number): void {
    if (this.status !== 'playing' || this.boss.health.isDead) return;
    this.boss.health.takeDamage(amount);
    this.events.emit({ type: 'damage_dealt', target: 'boss', amount, position: this.boss.position });
    if (this.boss.health.isDead) {
      this.events.emit({ type: 'boss_defeated', position: this.boss.position });
      this.end(true);
    }
  }

  private end(won: boolean): void {
    this.status = won ? 'won' : 'lost';
    this.events.emit({ type: 'match_ended', won });
  }
}
