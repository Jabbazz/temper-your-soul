import type { Rng } from '../../core/rng';
import { Signal } from '../../core/signal';
import { angleDifference, TAU, Vec2 } from '../../core/vec2';
import { clampToArena, isOutsideProjectileBounds, moveBody, pillarAt, pillarBetween, pushOutOfPillars, type ArenaDefinition } from '../arena/arena';
import { Boss } from '../boss/boss';
import type { BossContext } from '../boss/boss-context';
import { HIT_RADIUS, ZONE_EDGE_FORGIVENESS } from '../combat/collision';
import { DangerZone, type DangerZoneSpec } from '../combat/danger-zone';
import type { DamageSource, GameEvent } from '../combat/events';
import { Projectile, type ProjectileSpec } from '../combat/projectile';
import type { DungeonDefinition } from '../dungeons/dungeon-definition';
import { Minion } from '../minions/minion';
import type { BossSummons } from '../minions/minion-definition';
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

/** Fonte dei danni di contatto con il boss. */
const CONTACT_SOURCE: DamageSource = { kind: 'contact', name: 'Contatto con il boss' };

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
  /** Da quale schema del boss viene ogni proiettile o zona nemica (per la fonte dei danni subiti). */
  private readonly sources = new Map<number, DamageSource>();
  /** Nome dell'ultimo schema annunciato dal boss: le sue azioni programmate gli appartengono. */
  private currentPattern = '';
  private actingId = 'local';
  readonly boss: Boss;
  projectiles: Projectile[] = [];
  zones: DangerZone[] = [];
  /** Servitori vivi (evocati dal boss in furia). */
  minions: Minion[] = [];
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
    const target = this.nearestPlayer(this.boss.position);
    if (!target) { this.end(false); return; }
    this.boss.step(dt, this.bossContext(target));
    for (const player of this.players.values()) {
      if (player.position.distanceTo(this.boss.position) < this.boss.stats.contactDistance) this.hurtPlayer(this.boss.stats.contactDamage, player, CONTACT_SOURCE);
    }

    this.stepMinions(dt);
    this.stepProjectiles(dt);
    this.stepZones(dt);
    this.minions = this.minions.filter((minion) => !minion.isDead);
  }

  /** Il giocatore vivo piu' vicino a un punto. */
  private nearestPlayer(point: Vec2): Player | undefined {
    let target: Player | undefined;
    let nearest = Infinity;
    for (const p of this.players.values()) {
      if (p.health.isDead) continue;
      const distance = p.position.distanceTo(point);
      if (distance < nearest) { nearest = distance; target = p; }
    }
    return target;
  }

  private bossContext(target: Player): BossContext {
    const chargeSource = (): DamageSource => ({ kind: 'charge', name: this.currentPattern || 'Carica' });
    return {
      target: target.position,
      time: this.time,
      rng: this.rng,
      spawnProjectile: (spec, position, angle) => {
        this.spawnProjectile(spec, position, angle);
        this.sources.set(this.nextId - 1, { kind: 'projectile', name: this.currentPattern });
      },
      spawnZone: (spec, position) => {
        this.spawnZone(spec, position);
        this.sources.set(this.nextId - 1, { kind: 'zone', name: this.currentPattern });
      },
      hurtPlayer: amount => {
        this.hurtPlayer(amount, target, chargeSource());
      },
      hurtNearbyPlayers: amount => {
        for (const player of this.players.values()) {
          if (player.position.distanceTo(this.boss.position) < this.boss.stats.chargeHitDistance) this.hurtPlayer(amount, player, chargeSource());
        }
      },
      summon: (summons, count, center) => this.summon(summons, count, center),
      emit: (event) => {
        if (event.type === 'boss_attack') this.currentPattern = event.name;
        this.events.emit(event);
      },
    };
  }

  private spawnProjectile(spec: ProjectileSpec, position: Vec2, angle: number): void {
    this.projectiles.push(new Projectile(this.nextId++, spec, position, angle));
  }

  private spawnZone(spec: DangerZoneSpec, position: Vec2): void {
    this.zones.push(new DangerZone(this.nextId++, spec, position));
  }

  /**
   * Evoca fino a `count` servitori in cerchio attorno a `center` (fuori dai pilastri, dentro l'arena), senza superare i
   * vivi ammessi. Posizioni fisse, senza casualita': la partita resta riproducibile.
   */
  private summon(summons: BossSummons, count: number, center: Vec2): void {
    const alive = this.minions.filter((minion) => minion.definition.id === summons.minion.id).length;
    const n = Math.max(0, Math.min(count, summons.maxAlive - alive));
    const start = center.angleTo(this.nearestPlayer(center)?.position ?? center);
    for (let i = 0; i < n; i++) {
      const angle = start + Math.PI / 4 + (i * TAU) / Math.max(n, 1);
      const raw = clampToArena(this.arena, center.add(Vec2.fromAngle(angle, summons.ringRadius)), this.arena.playerMargin);
      const position = pushOutOfPillars(this.arena, raw, summons.minion.hitRadius);
      const minion = new Minion(this.nextId++, summons.minion, position);
      this.minions.push(minion);
      this.events.emit({ type: 'minion_spawned', position, minionId: minion.id, visual: summons.minion.visual });
    }
  }

  /** Comportamento dei servitori: inseguire, esplodere a contatto o sparare da fermi. */
  private stepMinions(dt: number): void {
    for (const minion of this.minions) {
      if (minion.isDead || this.status !== 'playing') continue;
      const target = this.nearestPlayer(minion.position);
      if (!target) continue;
      const { definition } = minion;
      const source: DamageSource = { kind: 'minion', name: definition.name };
      if (definition.behavior === 'turret') {
        minion.shotTimer -= dt;
        if (definition.shot !== undefined && minion.shotTimer <= 0) {
          minion.shotTimer = definition.shot.interval;
          this.spawnProjectile(definition.shot.projectile, minion.position, minion.position.angleTo(target.position));
          this.sources.set(this.nextId - 1, source);
        }
      } else {
        const step = minion.position.add(Vec2.fromAngle(minion.position.angleTo(target.position), definition.speed * dt));
        minion.position = moveBody(this.arena, minion.position, step, definition.hitRadius, this.arena.playerMargin);
      }
      const touching = minion.position.distanceTo(target.position) < definition.hitRadius + HIT_RADIUS.player;
      if (!touching) continue;
      if (definition.behavior === 'kamikaze') {
        const reach = definition.blastRadius ?? definition.hitRadius;
        for (const player of this.players.values()) {
          if (player.position.distanceTo(minion.position) < reach + HIT_RADIUS.player) this.hurtPlayer(definition.contactDamage, player, source);
        }
        this.killMinion(minion, true);
      } else {
        this.hurtPlayer(definition.contactDamage, target, source);
      }
    }
    this.minions = this.minions.filter((minion) => !minion.isDead);
  }

  /** Il primo servitore vivo che il punto tocca (entro `extra` dal suo raggio di colpo). */
  private minionAt(point: Vec2, extra: number): Minion | undefined {
    return this.minions.find((minion) => !minion.isDead && point.distanceTo(minion.position) < minion.hitRadius + extra);
  }

  /**
   * Colpo ravvicinato del giocatore: ferisce il boss e i servitori entro `range` dal loro bordo, nell'arco attorno ad
   * `angle` e se nessun pilastro si mette in mezzo (come per i proiettili, che i pilastri assorbono).
   */
  private strikeArc(origin: Vec2, angle: number, range: number, arc: number, damage: number): void {
    for (const minion of [...this.minions]) {
      if (this.inArc(origin, angle, range, arc, minion.position, minion.hitRadius)) this.hitMinion(minion, damage);
    }
    if (this.inArc(origin, angle, range, arc, this.boss.position, this.boss.stats.hitRadius)) this.hitBoss(damage);
  }

  private inArc(origin: Vec2, angle: number, range: number, arc: number, target: Vec2, hitRadius: number): boolean {
    const offset = target.sub(origin);
    const distance = offset.length();
    if (distance > range + hitRadius) return false;
    // Il bersaglio addosso al giocatore (centri sovrapposti) viene colpito a prescindere dalla direzione.
    if (distance > 0 && Math.abs(angleDifference(angle, offset.angle())) > arc / 2) return false;
    // La linea di vista arriva al bordo del bersaglio piu' vicino: un boss che vola sopra un pilastro piu' piccolo di
    // lui resta colpibile dove sporge.
    if (distance > hitRadius) {
      const nearestEdge = origin.add(offset.mul((distance - hitRadius) / distance));
      if (pillarBetween(this.arena, origin, nearestEdge) !== undefined) return false;
    }
    return true;
  }

  /**
   * Muove i proiettili, risolve i colpi e rimuove quelli finiti. Un colpo a segno o un ostacolo consumano il
   * proiettile (i pilastri fermano i proiettili di entrambe le squadre). I servitori fanno da scudo al boss.
   * Un proiettile del giocatore che finisce nel vuoto e' un colpo mancato (`projectile_faded`).
   */
  private stepProjectiles(dt: number): void {
    for (const projectile of this.projectiles) {
      projectile.advance(dt);
      if (pillarAt(this.arena, projectile.position) !== undefined) {
        this.emitProjectileHit(projectile, 'obstacle');
        projectile.expire();
        continue;
      }
      if (projectile.team === 'enemy') {
        let victim: Player | undefined;
        for (const p of this.players.values()) {
          if (!p.health.isDead && projectile.position.distanceTo(p.position) < projectile.radius + HIT_RADIUS.player) { victim = p; break; }
        }
        if (victim) {
          this.hurtPlayer(projectile.damage, victim, this.sources.get(projectile.id));
          this.emitProjectileHit(projectile, 'player');
          projectile.expire();
        }
      } else {
        const owner = this.owners.get(projectile.id);
        const minion = this.minionAt(projectile.position, projectile.radius);
        if (minion !== undefined) {
          this.hitMinion(minion, projectile.damage, owner);
          this.emitProjectileHit(projectile, 'minion');
          projectile.expire();
        } else if (projectile.position.distanceTo(this.boss.position) < projectile.radius + this.boss.stats.hitRadius) {
          this.hitBoss(projectile.damage, owner);
          if (projectile.spec.slowSeconds !== undefined) this.boss.slowFor = projectile.spec.slowSeconds;
          this.emitProjectileHit(projectile, 'boss');
          projectile.expire();
        } else if (projectile.isExpired || isOutsideProjectileBounds(this.arena, projectile.position)) {
          this.events.emit({ type: 'projectile_faded', position: projectile.position, visual: projectile.spec.visual, ...(owner ? { playerId: owner } : {}) });
        }
      }
      if (isOutsideProjectileBounds(this.arena, projectile.position)) projectile.expire();
    }
    this.projectiles = this.projectiles.filter(projectile => {
      if (projectile.isExpired) {
        this.owners.delete(projectile.id);
        this.sources.delete(projectile.id);
      }
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
        const owner = this.owners.get(zone.id);
        for (const minion of [...this.minions]) {
          if (zone.position.distanceTo(minion.position) < zone.radius + minion.hitRadius - ZONE_EDGE_FORGIVENESS) this.hitMinion(minion, zone.spec.damage, owner);
        }
        const reach = zone.radius + this.boss.stats.hitRadius - ZONE_EDGE_FORGIVENESS;
        if (zone.position.distanceTo(this.boss.position) < reach) {
          this.hitBoss(zone.spec.damage, owner);
          if (zone.spec.slowSeconds !== undefined) this.boss.slowFor = zone.spec.slowSeconds;
        }
      } else {
        for (const player of this.players.values()) {
          if (zone.position.distanceTo(player.position) < zone.radius + HIT_RADIUS.player - ZONE_EDGE_FORGIVENESS) this.hurtPlayer(zone.spec.damage, player, this.sources.get(zone.id));
        }
      }
      this.owners.delete(zone.id);
      this.sources.delete(zone.id);
    }
    this.zones = pending;
  }

  private emitProjectileHit(projectile: Projectile, struck: 'boss' | 'player' | 'minion' | 'obstacle'): void {
    const owner = this.owners.get(projectile.id);
    this.events.emit({
      type: 'projectile_hit',
      position: projectile.position,
      radius: projectile.radius,
      visual: projectile.spec.visual,
      team: projectile.team,
      struck,
      ...(owner ? { playerId: owner } : {}),
    });
  }

  /** Danno al giocatore: ignorato se e' invulnerabile o la partita e' finita. `source` dice da dove viene. */
  private hurtPlayer(amount: number, player: Player = this.player, source?: DamageSource): void {
    if (this.status !== 'playing' || player.health.isDead) return;
    const actual = Math.min(player.health.current, amount);
    if (!player.tryHurt(amount)) return;
    const id = [...this.players].find(([, p]) => p === player)![0];
    this.report.get(id)!.damageReceived += actual;
    this.events.emit({ type: 'damage_dealt', target: 'player', amount, position: player.position, playerId: id, ...(source && source.name ? { source } : {}) });
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
      // Con il boss cadono anche i suoi servitori.
      for (const minion of [...this.minions]) this.killMinion(minion, false);
      this.minions = [];
      this.end(true);
    }
  }

  private hitMinion(minion: Minion, amount: number, owner = this.actingId): void {
    if (this.status !== 'playing' || minion.isDead) return;
    const actual = minion.health.takeDamage(amount);
    const stats = this.report.get(owner);
    if (stats) stats.damageDealt += actual;
    this.events.emit({ type: 'damage_dealt', target: 'minion', amount, position: minion.position, minionId: minion.id, playerId: owner });
    if (minion.isDead) this.killMinion(minion, false);
  }

  /** Toglie un servitore (morto, esploso o caduto con il boss) e lo racconta. */
  private killMinion(minion: Minion, exploded: boolean): void {
    if (!minion.isDead) minion.health.takeDamage(minion.health.current);
    const { visual } = minion.definition;
    this.events.emit({ type: 'minion_defeated', position: minion.position, minionId: minion.id, visual, ...(exploded ? { exploded } : {}) });
  }

  private end(won: boolean): void {
    this.status = won ? 'won' : 'lost';
    this.events.emit({ type: 'match_ended', won });
  }
}
