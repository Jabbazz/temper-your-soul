import type { Rng } from '../../core/rng';
import { Signal } from '../../core/signal';
import { angleDifference, type Vec2 } from '../../core/vec2';
import { isOutsideProjectileBounds, pillarAt, type ArenaDefinition } from '../arena/arena';
import { Boss } from '../boss/boss';
import type { BossContext } from '../boss/boss-context';
import { HIT_RADIUS, ZONE_EDGE_FORGIVENESS } from '../combat/collision';
import { DangerZone, type DangerZoneSpec } from '../combat/danger-zone';
import type { GameEvent } from '../combat/events';
import { Projectile, type ProjectileSpec } from '../combat/projectile';
import type { DungeonDefinition } from '../dungeons/dungeon-definition';
import { Player } from '../player/player';
import type { Loadout } from '../skills/skill-definition';
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

export interface MatchOptions {
  /** Casualita' della simulazione: con lo stesso seme e gli stessi comandi la partita e' identica. */
  readonly rng: Rng;
  readonly dungeon: DungeonDefinition;
  /** Le skill del giocatore per slot (derivano dall'equipaggiamento). */
  readonly loadout: Loadout;
  readonly members?: readonly { id: string; loadout: Loadout }[];
}

/**
 * Una partita: il giocatore contro il boss di un dungeon. E' la simulazione completa, senza DOM ne' disegno:
 * avanza a passo fisso con `step()` e racconta cio' che accade con gli eventi (`events`).
 */
export class Match {
  /** Eventi della simulazione, per rappresentazione e audio. */
  readonly events = new Signal<[GameEvent]>();
  readonly dungeon: DungeonDefinition;
  readonly arena: ArenaDefinition;
  readonly rng: Rng;
  readonly players = new Map<string, Player>();
  readonly report = new Map<string, { damageDealt: number; damageReceived: number; healing: number }>();
  viewPlayerId = 'local';
  get player(): Player { return this.players.get(this.viewPlayerId) ?? this.players.values().next().value!; }
  private readonly owners = new Map<number, string>();
  private actingId = 'local';
  readonly boss: Boss;
  projectiles: Projectile[] = [];
  zones: DangerZone[] = [];
  status: MatchStatus = 'playing';
  /** Secondi di partita trascorsi (si fermano alla fine). */
  time = 0;

  private nextId = 1;


  constructor(options: MatchOptions) {
    this.dungeon = options.dungeon;
    this.arena = options.dungeon.arena;
    this.rng = options.rng;
    const members = options.members ?? [{ id: 'local', loadout: options.loadout }];
    this.viewPlayerId = members[0].id;
    for (const member of members) {
      this.players.set(member.id, new Player(this.arena, member.loadout));
      this.report.set(member.id, { damageDealt: 0, damageReceived: 0, healing: 0 });
    }
    this.boss = new Boss(options.dungeon.boss, this.arena);
  }

  private context(id: string, player: Player): SkillContext {
    return {
      player,
      spawnProjectile: (spec, position, angle) => { this.spawnProjectile(spec, position, angle); this.owners.set(this.nextId - 1, id); },
      spawnZone: (spec, position) => { this.spawnZone(spec, position); this.owners.set(this.nextId - 1, id); },
      strikeArc: (origin, angle, range, arc, damage) => this.strikeArc(origin, angle, range, arc, damage),
      emit: event => this.events.emit({ ...event, playerId: id }),
    };
  }

  /** Un passo di simulazione di `dt` secondi. Dopo la fine della partita non fa nulla. */
  step(dt: number, intent: PlayerIntent): void {
    this.stepParty(dt, new Map([[this.viewPlayerId, intent]]));
  }

  /** Simulazione cooperativa autorevole: tutti agiscono prima dell'unico passo del boss. */
  stepParty(dt: number, intents: ReadonlyMap<string, PlayerIntent>): void {
    if (this.status !== 'playing') return;
    this.time += dt;

    this.boss.tick(dt);
    for (const [id, player] of this.players) {
      if (player.health.isDead) continue;
      player.tick(dt);
      const intent = intents.get(id);
      player.moving = false;
      if (!intent) continue;
      this.actingId = id;
      player.moveBy(dt, intent.move);
      const syncAim = (): void => { player.aim = player.position.add(intent.aimOffset); };
      syncAim();
      for (let slot = 0; slot < intent.skills.length && this.status === 'playing'; slot++) {
        if (!intent.skills[slot]) continue;
        syncAim();
        tryCastSkill(slot, this.context(id, player));
      }
      syncAim();
    }
    if (this.status !== 'playing') return;
    let target: Player | undefined;
    let nearest = Infinity;
    for (const p of this.players.values()) {
      if (p.health.isDead) continue;
      const distance = p.position.distanceTo(this.boss.position);
      if (distance < nearest) { nearest = distance; target = p; }
    }
    if (!target) { this.end(false); return; }
    this.boss.step(dt, this.bossContext(target));
    for (const player of this.players.values()) {
      if (player.position.distanceTo(this.boss.position) < this.boss.stats.contactDistance) this.hurtPlayer(this.boss.stats.contactDamage, player);
    }

    this.stepProjectiles(dt);
    this.stepZones(dt);
  }

  private bossContext(target: Player): BossContext {
    return {
      target: target.position,
      time: this.time,
      rng: this.rng,
      spawnProjectile: (spec, position, angle) => this.spawnProjectile(spec, position, angle),
      spawnZone: (spec, position) => this.spawnZone(spec, position),
      hurtPlayer: amount => {
        this.hurtPlayer(amount, target);
      },
      hurtNearbyPlayers: amount => {
        for (const player of this.players.values()) {
          if (player.position.distanceTo(this.boss.position) < this.boss.stats.chargeHitDistance) this.hurtPlayer(amount, player);
        }
      },
      emit: (event) => this.events.emit(event),
    };
  }

  private spawnProjectile(spec: ProjectileSpec, position: Vec2, angle: number): void {
    this.projectiles.push(new Projectile(this.nextId++, spec, position, angle));
  }

  private spawnZone(spec: DangerZoneSpec, position: Vec2): void {
    this.zones.push(new DangerZone(this.nextId++, spec, position));
  }

  /** Colpo ravvicinato del giocatore: ferisce il boss se e' entro `range` dal suo bordo e nell'arco attorno a `angle`. */
  private strikeArc(origin: Vec2, angle: number, range: number, arc: number, damage: number): void {
    const offset = this.boss.position.sub(origin);
    const distance = offset.length();
    if (distance > range + this.boss.stats.hitRadius) return;
    // Il boss addosso al giocatore (centri sovrapposti) viene colpito a prescindere dalla direzione.
    if (distance > 0 && Math.abs(angleDifference(angle, offset.angle())) > arc / 2) return;
    this.hitBoss(damage);
  }

  /**
   * Muove i proiettili, risolve i colpi e rimuove quelli finiti. Un colpo a segno o un ostacolo consumano il
   * proiettile (i pilastri fermano i proiettili di entrambe le squadre).
   */
  private stepProjectiles(dt: number): void {
    for (const projectile of this.projectiles) {
      projectile.advance(dt);
      if (pillarAt(this.arena, projectile.position) !== undefined) {
        this.emitProjectileHit(projectile);
        projectile.expire();
        continue;
      }
      if (projectile.team === 'enemy') {
        let victim: Player | undefined;
        for (const p of this.players.values()) {
          if (!p.health.isDead && projectile.position.distanceTo(p.position) < projectile.radius + HIT_RADIUS.player) { victim = p; break; }
        }
        if (victim) {
          this.hurtPlayer(projectile.damage, victim);
          this.emitProjectileHit(projectile);
          projectile.expire();
        }
      } else if (projectile.position.distanceTo(this.boss.position) < projectile.radius + this.boss.stats.hitRadius) {
        this.hitBoss(projectile.damage, this.owners.get(projectile.id));
        if (projectile.spec.slowSeconds !== undefined) this.boss.slowFor = projectile.spec.slowSeconds;
        this.emitProjectileHit(projectile);
        projectile.expire();
      }
      if (isOutsideProjectileBounds(this.arena, projectile.position)) projectile.expire();
    }
    this.projectiles = this.projectiles.filter(projectile => {
      if (projectile.isExpired) this.owners.delete(projectile.id);
      return !projectile.isExpired;
    });
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
      this.events.emit({
        type: 'zone_detonated',
        position: zone.position,
        radius: zone.radius,
        team: zone.team,
        ...(zone.spec.visual !== undefined ? { visual: zone.spec.visual } : {}),
      });
      if (zone.team === 'player') {
        const reach = zone.radius + this.boss.stats.hitRadius - ZONE_EDGE_FORGIVENESS;
        if (zone.position.distanceTo(this.boss.position) < reach) {
          this.hitBoss(zone.spec.damage, this.owners.get(zone.id));
          if (zone.spec.slowSeconds !== undefined) this.boss.slowFor = zone.spec.slowSeconds;
        }
      } else {
        for (const player of this.players.values()) {
          if (zone.position.distanceTo(player.position) < zone.radius + HIT_RADIUS.player - ZONE_EDGE_FORGIVENESS) this.hurtPlayer(zone.spec.damage, player);
        }
      }
      this.owners.delete(zone.id);
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
  private hurtPlayer(amount: number, player: Player = this.player): void {
    if (this.status !== 'playing' || player.health.isDead) return;
    const actual = Math.min(player.health.current, amount);
    if (!player.tryHurt(amount)) return;
    const id = [...this.players].find(([, p]) => p === player)![0];
    this.report.get(id)!.damageReceived += actual;
    this.events.emit({ type: 'damage_dealt', target: 'player', amount, position: player.position, playerId: id });
    if ([...this.players.values()].every(p => p.health.isDead)) this.end(false);
  }

  private hitBoss(amount: number, owner = this.actingId): void {
    if (this.status !== 'playing' || this.boss.health.isDead) return;
    const actual = this.boss.health.takeDamage(amount);
    const stats = this.report.get(owner);
    if (stats) stats.damageDealt += actual;
    this.events.emit({ type: 'damage_dealt', target: 'boss', amount, position: this.boss.position, playerId: owner });
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
