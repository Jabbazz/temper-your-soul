import type { Rng } from '../../core/rng';
import { TAU, Vec2 } from '../../core/vec2';
import { clampToArena, moveBody, pushOutOfPillars, solidBetween, type ArenaDefinition } from '../arena/arena';
import { HIT_RADIUS } from '../combat/collision';
import type { DangerZoneSpec } from '../combat/danger-zone';
import type { GameEvent } from '../combat/events';
import type { ProjectileSpec } from '../combat/projectile';
import type { Player } from '../player/player';
import type { Minion } from './minion';
import { minionTier, type MinionArrivalRing, type MinionCharge, type ShotPattern } from './minion-definition';

/*
 * Comportamento dei servitori: movimento, attacchi annunciati, abilita'. Funzioni senza stato proprio: leggono e
 * modificano il servitore e chiedono alla partita (`MinionContext`) di creare proiettili, zone e altri servitori.
 */

/** Secondi in cui un servitore appena comparso non spara. */
export const MINION_GRACE = 0.6;

/** Che cosa la partita mette a disposizione dei servitori. */
export interface MinionContext {
  readonly arena: ArenaDefinition;
  readonly rng: Rng;
  readonly minions: readonly Minion[];
  nearestPlayer(point: Vec2): Player | undefined;
  /**
   * Dove dirigersi a piedi per arrivare a `to` girando attorno a massicci, ripari e pozzi (il punto stesso se la strada
   * e' libera): l'angolo dell'ostacolo, o nelle stanze con i pozzi la cella successiva del campo di flusso.
   */
  route(from: Vec2, to: Vec2, bodyRadius: number): Vec2;
  /** Crea un proiettile nemico del servitore; false se il limite dei proiettili dei servitori e' raggiunto. */
  spawnProjectile(spec: ProjectileSpec, position: Vec2, angle: number, minion: Minion): boolean;
  spawnZone(spec: DangerZoneSpec, position: Vec2, minion: Minion): void;
  /** Genera un servitore (nidi). */
  spawnChild(definitionId: string, position: Vec2, parent: Minion): void;
  hurtPlayer(amount: number, player: Player, minion: Minion): void;
  /** Il kamikaze scoppia: ferisce chi e' vicino e muore. */
  explode(minion: Minion): void;
  /** Un gettone d'attacco del gruppo: chi non lo ottiene aspetta il turno. */
  takeToken(minion: Minion): boolean;
  releaseToken(minion: Minion): void;
  emit(event: GameEvent): void;
}

/** Un passo di comportamento di un servitore vivo. */
export function stepMinion(minion: Minion, ctx: MinionContext, dt: number): void {
  minion.age += dt;
  minion.rootFor = Math.max(0, minion.rootFor - dt);
  minion.slowFor = Math.max(0, minion.slowFor - dt);
  minion.shield = Math.max(0, minion.shield - dt * 2);
  minion.hasteFor = Math.max(0, minion.hasteFor - dt);
  if (minion.state === 'reviving') {
    minion.stateTimer -= dt;
    if (minion.stateTimer <= 0) revive(minion, ctx);
    return;
  }
  const target = ctx.nearestPlayer(minion.position);
  if (target === undefined) return;
  const { definition } = minion;
  if (minion.state === 'dormant') {
    if (minion.position.distanceTo(target.position) > (definition.dormant?.wakeRadius ?? 0)) return;
    wake(minion, ctx);
  }
  layTrail(minion, ctx, dt);
  if (minion.prey) {
    flee(minion, target, ctx, dt);
    tickNest(minion, ctx, dt);
    touch(minion, target, ctx);
    return;
  }
  switch (definition.behavior) {
    case 'chaser':
    case 'kamikaze':
      if (definition.charge) stepCharger(minion, target, ctx, dt);
      else if (minion.pending === 'ambush') stepWindup(minion, target, ctx, dt);
      else moveToward(minion, target.position, minion.speed, dt, ctx);
      break;
    case 'turret':
      break;
    case 'shooter':
      if (minion.state === 'windup') stepWindup(minion, target, ctx, dt);
      else keepDistance(minion, target, ctx, dt, minion.pending === 'shot' ? 0.3 : 1);
      break;
    case 'charger':
      stepCharger(minion, target, ctx, dt);
      break;
    case 'flyer':
      weave(minion, target, ctx, dt);
      break;
    case 'leaper':
      stepLeaper(minion, target, ctx, dt);
      break;
    case 'burrower':
      stepBurrower(minion, target, ctx, dt);
      break;
    case 'nest':
      tickNest(minion, ctx, dt);
      break;
    case 'support':
      keepDistance(minion, target, ctx, dt, 1);
      tickAura(minion, ctx, dt);
      break;
    case 'orbiter':
      orbitAround(minion, target, ctx, dt);
      break;
    case 'fleer':
      flee(minion, target, ctx, dt);
      tickNest(minion, ctx, dt);
      break;
  }
  if (definition.behavior !== 'nest' && definition.behavior !== 'fleer' && definition.nest) tickNest(minion, ctx, dt);
  if (definition.blink) tickBlink(minion, target, ctx, dt);
  if (definition.ambush) tickAmbush(minion, target, ctx, dt);
  if (definition.lob) tickLob(minion, target, ctx, dt);
  if (definition.shot) tickShot(minion, target, ctx, dt);
  touch(minion, target, ctx);
}

// --- Movimento --------------------------------------------------------------------------------------------------

/**
 * Porta il servitore verso `point`: chi vola ignora i pilastri, gli altri ci scivolano attorno e girano attorno ai
 * massicci delle stanze che li hanno (`straight` per le cariche, che vanno dritte e si fermano contro il blocco).
 */
function moveToward(minion: Minion, point: Vec2, speed: number, dt: number, ctx: MinionContext, straight = false): void {
  const goal = minion.definition.flying || straight ? point : ctx.route(minion.position, point, minion.hitRadius);
  const distance = minion.position.distanceTo(goal);
  if (distance < 0.5) return;
  const step = Math.min(distance, speed * dt);
  step2(minion, minion.position.add(goal.sub(minion.position).mul(step / distance)), ctx);
}

/** Sposta il servitore al punto `to`, nell'arena e (se non vola) fuori dai pilastri. */
function step2(minion: Minion, to: Vec2, ctx: MinionContext): void {
  if (minion.rootFor > 0) return;
  const margin = ctx.arena.playerMargin;
  minion.position = minion.definition.flying
    ? clampToArena(ctx.arena, to, margin)
    : moveBody(ctx.arena, minion.position, to, minion.hitRadius, margin);
}

/** Resta a `preferredDistance` dal bersaglio: si avvicina, si allontana o gli gira attorno. */
function keepDistance(minion: Minion, target: Player, ctx: MinionContext, dt: number, factor: number): void {
  const preferred = minion.definition.preferredDistance ?? 280;
  const distance = minion.position.distanceTo(target.position);
  const speed = minion.speed * factor;
  // Dietro un massiccio non si vede il bersaglio: chi tiene la distanza gli gira attorno (o ci vola sopra) finche' non lo vede.
  const hidden = solidBetween(ctx.arena, minion.position, target.position) !== undefined;
  if (distance > preferred + 40 || hidden) moveToward(minion, target.position, speed, dt, ctx);
  else if (distance < preferred - 40) {
    const away = minion.position.add(minion.position.sub(target.position).normalized().mul(speed * dt));
    step2(minion, away, ctx);
  } else {
    // Di lato: il verso cambia ogni qualche secondo, diverso per ogni servitore.
    minion.heading += dt * 0.7;
    const side = Math.sin(minion.heading) >= 0 ? 1 : -1;
    const angle = target.position.angleTo(minion.position) + (side * speed * dt) / Math.max(distance, 1);
    step2(minion, target.position.add(Vec2.fromAngle(angle, distance)), ctx);
  }
}

/** Volo ondulato verso il bersaglio. */
function weave(minion: Minion, target: Player, ctx: MinionContext, dt: number): void {
  minion.heading += dt * 4;
  const direction = target.position.sub(minion.position).normalized();
  const side = new Vec2(-direction.y, direction.x).mul(Math.sin(minion.heading) * ((minion.definition.weave ?? 30) / 30));
  const velocity = direction.add(side).normalized().mul(minion.speed * dt);
  step2(minion, minion.position.add(velocity), ctx);
}

/** Gira attorno al bersaglio al raggio dei dati. */
function orbitAround(minion: Minion, target: Player, ctx: MinionContext, dt: number): void {
  const orbit = minion.definition.orbit ?? { radius: 200, speed: 1 };
  minion.heading += orbit.speed * dt * (minion.slowFor > 0 ? 0.5 : 1);
  moveToward(minion, target.position.add(Vec2.fromAngle(minion.heading, orbit.radius)), minion.speed, dt, ctx);
}

/** La preda fugge dal giocatore piu' vicino; contro un muro scivola di lato. */
function flee(minion: Minion, target: Player, ctx: MinionContext, dt: number): void {
  const away = minion.position.sub(target.position).normalized();
  const side = new Vec2(-away.y, away.x).mul(Math.sin(minion.age * 0.8 + minion.id) * 0.6);
  const before = minion.position;
  step2(minion, minion.position.add(away.add(side).normalized().mul(minion.speed * dt)), ctx);
  // Bloccata in un angolo: cambia direzione verso il centro della stanza.
  if (before.distanceTo(minion.position) < minion.speed * dt * 0.3) {
    const center = new Vec2(ctx.arena.width / 2, ctx.arena.height / 2);
    moveToward(minion, center, minion.speed, dt, ctx);
  }
}

// --- Contatto e scie --------------------------------------------------------------------------------------------

/** Contatto con il bersaglio: il kamikaze scoppia, gli altri feriscono (piu' forte durante la carica). */
function touch(minion: Minion, target: Player, ctx: MinionContext): void {
  const state = minion.state;
  if (state === 'dormant' || state === 'burrowed' || state === 'airborne' || minion.isDead) return;
  if (minion.position.distanceTo(target.position) >= minion.hitRadius + HIT_RADIUS.player) return;
  if (minion.definition.behavior === 'kamikaze') ctx.explode(minion);
  else ctx.hurtPlayer(state === 'dash' ? minion.definition.charge?.damage ?? minion.definition.contactDamage : minion.definition.contactDamage, target, minion);
}

function layTrail(minion: Minion, ctx: MinionContext, dt: number): void {
  const trail = minion.definition.trail ?? minion.elite?.trail;
  if (trail === undefined || minion.isHidden) return;
  minion.trailTimer -= dt;
  if (minion.trailTimer > 0) return;
  minion.trailTimer = trail.interval;
  ctx.spawnZone(trail.zone, minion.position, minion);
}

function wake(minion: Minion, ctx: MinionContext): void {
  minion.state = 'idle';
  minion.abilityTimer = Math.min(minion.abilityTimer, 0.4);
  ctx.emit({ type: 'minion_woke', position: minion.position, minionId: minion.id, visual: minion.definition.visual });
}

/** Un servitore colpito mentre dorme si sveglia. */
export function wakeIfDormant(minion: Minion, ctx: Pick<MinionContext, 'emit'>): void {
  if (minion.state !== 'dormant') return;
  minion.state = 'idle';
  minion.abilityTimer = Math.min(minion.abilityTimer, 0.4);
  ctx.emit({ type: 'minion_woke', position: minion.position, minionId: minion.id, visual: minion.definition.visual });
}

function revive(minion: Minion, ctx: MinionContext): void {
  const death = minion.definition.onDeath;
  const fraction = death?.kind === 'revive' ? death.fraction : 0.5;
  minion.health.current = Math.max(1, Math.round(minion.health.max * fraction));
  minion.state = 'idle';
  minion.age = 0;
  ctx.emit({ type: 'minion_revived', position: minion.position, minionId: minion.id, visual: minion.definition.visual });
}

// --- Carica, salto, scavo, teletrasporto -------------------------------------------------------------------------

function stepCharger(minion: Minion, target: Player, ctx: MinionContext, dt: number): void {
  const charge = minion.definition.charge!;
  switch (minion.state) {
    case 'windup':
      if (minion.pending === 'charge') {
        minion.stateTimer -= dt;
        if (minion.stateTimer <= 0) {
          minion.state = 'dash';
          minion.chargeTrail = 0;
          minion.bouncesLeft = charge.bounces ?? 0;
          minion.stateTimer = charge.distance / charge.speed + 0.1;
        }
      } else stepWindup(minion, target, ctx, dt);
      return;
    case 'dash': {
      const destination = minion.target ?? minion.position;
      const before = minion.position;
      moveToward(minion, destination, charge.speed, dt, ctx, true);
      const moved = before.distanceTo(minion.position);
      if (charge.trail) {
        minion.chargeTrail += moved;
        if (minion.chargeTrail >= (charge.trailSpacing ?? 60)) {
          minion.chargeTrail = 0;
          ctx.spawnZone(charge.trail, minion.position, minion);
        }
      }
      minion.stateTimer -= dt;
      const stopped = minion.position.distanceTo(destination) < 2 || moved < charge.speed * dt * 0.25;
      if (minion.stateTimer <= 0 || stopped) {
        // Contro un muro della stanza, con rimbalzi rimasti: riparte di sponda con la distanza che resta.
        if (stopped && minion.stateTimer > 0 && minion.bouncesLeft > 0 && bounce(minion, charge, ctx)) return;
        minion.state = 'recover';
        minion.stateTimer = charge.recover;
        if (charge.arrivalRing) arrivalRing(minion, charge.arrivalRing, ctx);
      }
      return;
    }
    case 'recover':
      minion.stateTimer -= dt;
      if (minion.stateTimer <= 0) {
        minion.state = 'idle';
        minion.abilityTimer = charge.cooldown * minion.cadence;
      }
      return;
    default: {
      minion.abilityTimer -= dt;
      const distance = minion.position.distanceTo(target.position);
      if (minion.abilityTimer <= 0 && distance <= charge.range && minion.age >= MINION_GRACE) {
        const direction = target.position.sub(minion.position).normalized();
        minion.origin = minion.position;
        minion.target = clampToArena(ctx.arena, minion.position.add(direction.mul(charge.distance)), ctx.arena.playerMargin);
        minion.state = 'windup';
        minion.pending = 'charge';
        minion.stateTimer = charge.windup;
        ctx.emit({ type: 'minion_telegraph', action: 'charge', minionId: minion.id, position: minion.position, to: minion.target, seconds: charge.windup });
        return;
      }
      if (minion.definition.orbit && distance < minion.definition.orbit.radius * 1.4) orbitAround(minion, target, ctx, dt);
      else moveToward(minion, target.position, minion.speed, dt, ctx);
    }
  }
}

function stepLeaper(minion: Minion, target: Player, ctx: MinionContext, dt: number): void {
  const leap = minion.definition.leap!;
  if (minion.state === 'windup') {
    minion.stateTimer -= dt;
    if (minion.stateTimer <= 0) {
      minion.state = 'airborne';
      minion.stateTimer = leap.flight;
    }
    return;
  }
  if (minion.state === 'airborne') {
    minion.stateTimer -= dt;
    const u = 1 - Math.max(0, minion.stateTimer) / leap.flight;
    const from = minion.origin ?? minion.position;
    const to = minion.target ?? minion.position;
    minion.position = from.lerp(to, u);
    if (minion.stateTimer <= 0) {
      minion.position = pushOutOfPillars(ctx.arena, to, minion.hitRadius);
      minion.state = 'idle';
      minion.abilityTimer = leap.cooldown * minion.cadence;
      if (leap.arrivalRing) arrivalRing(minion, leap.arrivalRing, ctx);
    }
    return;
  }
  minion.abilityTimer -= dt;
  if (minion.abilityTimer <= 0 && minion.position.distanceTo(target.position) <= leap.range && minion.age >= MINION_GRACE) {
    minion.origin = minion.position;
    minion.target = clampToArena(ctx.arena, target.position, ctx.arena.playerMargin);
    minion.state = 'windup';
    minion.pending = 'leap';
    minion.stateTimer = leap.windup;
    // La zona d'atterraggio e' il segnale: esplode quando il servitore tocca terra.
    ctx.spawnZone({ ...leap.zone, delay: leap.windup + leap.flight }, minion.target, minion);
    return;
  }
  moveToward(minion, target.position, minion.speed, dt, ctx);
}

function stepBurrower(minion: Minion, target: Player, ctx: MinionContext, dt: number): void {
  const burrow = minion.definition.burrow!;
  switch (minion.state) {
    case 'burrowed': {
      const margin = ctx.arena.playerMargin;
      const distance = minion.position.distanceTo(target.position);
      if (distance > burrow.emergeRange) {
        const step = Math.min(distance - burrow.emergeRange * 0.5, minion.speed * dt);
        minion.position = clampToArena(ctx.arena, minion.position.add(target.position.sub(minion.position).normalized().mul(step)), margin);
        return;
      }
      minion.position = pushOutOfPillars(ctx.arena, minion.position, minion.hitRadius);
      minion.state = 'emerging';
      minion.stateTimer = burrow.emergeTime;
      ctx.emit({ type: 'minion_telegraph', action: 'emerge', minionId: minion.id, position: minion.position, seconds: burrow.emergeTime });
      return;
    }
    case 'emerging':
      minion.stateTimer -= dt;
      if (minion.stateTimer > 0) return;
      minion.state = 'exposed';
      minion.stateTimer = burrow.exposed;
      lash(minion, target, ctx);
      if (burrow.arrivalRing) arrivalRing(minion, burrow.arrivalRing, ctx);
      return;
    case 'exposed':
      minion.stateTimer -= dt;
      if (minion.stateTimer <= 0) minion.state = 'burrowed';
      return;
    default:
      minion.state = 'burrowed';
  }
}

/** La frusta dello scavatore: una fila di zone verso il bersaglio. */
function lash(minion: Minion, target: Player, ctx: MinionContext): void {
  const { lash } = minion.definition.burrow!;
  const direction = Vec2.fromAngle(minion.position.angleTo(target.position));
  for (let i = 1; i <= lash.count; i++) {
    const point = clampToArena(ctx.arena, minion.position.add(direction.mul(lash.spacing * i)), ctx.arena.playerMargin);
    ctx.spawnZone({ ...lash.zone, delay: lash.zone.delay + i * 0.04 }, point, minion);
  }
}

/**
 * La carica ha toccato un muro della stanza: riparte riflessa (sul lato toccato) per la distanza che le resta. Falso se
 * non e' contro un muro (pilastro, massiccio) o se resta troppo poco.
 */
function bounce(minion: Minion, charge: MinionCharge, ctx: MinionContext): boolean {
  const margin = ctx.arena.playerMargin;
  const position = minion.position;
  const from = minion.origin ?? position;
  const travel = position.sub(from);
  if (travel.length() < 1) return false;
  const hitX = position.x <= margin + 1 || position.x >= ctx.arena.width - margin - 1;
  const hitY = position.y <= margin + 1 || position.y >= ctx.arena.height - margin - 1;
  if (!hitX && !hitY) return false;
  const direction = travel.normalized();
  const reflected = new Vec2(hitX ? -direction.x : direction.x, hitY ? -direction.y : direction.y);
  const remaining = minion.stateTimer * charge.speed;
  if (remaining < 40) return false;
  minion.origin = position;
  minion.target = clampToArena(ctx.arena, position.add(reflected.mul(remaining)), margin);
  minion.bouncesLeft--;
  ctx.emit({ type: 'minion_telegraph', action: 'charge', minionId: minion.id, position, to: minion.target, seconds: 0.2 });
  return true;
}

/** Anello di colpi attorno al servitore (fine della carica, atterraggio, emersione). */
function arrivalRing(minion: Minion, ring: MinionArrivalRing, ctx: MinionContext): void {
  for (let i = 0; i < ring.count; i++) ctx.spawnProjectile(ring.projectile, minion.position, minion.heading + (i * TAU) / ring.count, minion);
  minion.heading += 0.7;
}

/** Agguato: segna un punto dietro il bersaglio, sulla sua via di fuga; alla fine della posa ci ricompare e morde. */
function tickAmbush(minion: Minion, target: Player, ctx: MinionContext, dt: number): void {
  const ambush = minion.definition.ambush!;
  // Solo gli inseguitori tendono agguati: la loro posa si chiude nel loro passo (un test sul catalogo lo controlla).
  if (minion.definition.behavior !== 'chaser' || minion.definition.charge !== undefined) return;
  if (minion.state !== 'idle' || minion.pending !== null) return;
  minion.ambushTimer -= dt;
  if (minion.ambushTimer > 0 || minion.age < MINION_GRACE) return;
  if (minion.position.distanceTo(target.position) > ambush.trigger) return;
  const direction = target.position.sub(minion.position).normalized();
  const raw = clampToArena(ctx.arena, target.position.add(direction.mul(ambush.behind)), ctx.arena.playerMargin + 10);
  minion.target = pushOutOfPillars(ctx.arena, raw, minion.hitRadius);
  minion.state = 'windup';
  minion.pending = 'ambush';
  minion.stateTimer = ambush.windup;
  minion.ambushTimer = ambush.cooldown * minion.cadence;
  ctx.emit({ type: 'minion_telegraph', action: 'blink', minionId: minion.id, position: minion.position, to: minion.target, seconds: ambush.windup });
}

function tickBlink(minion: Minion, target: Player, ctx: MinionContext, dt: number): void {
  const blink = minion.definition.blink!;
  if (minion.state === 'windup') return;
  minion.abilityTimer -= dt;
  if (minion.abilityTimer > 0 || minion.position.distanceTo(target.position) > blink.trigger) return;
  // Il punto piu' lontano dal bersaglio fra alcune prove: ricompare dall'altra parte della stanza.
  let best = minion.position;
  let bestDistance = -1;
  for (let i = 0; i < 6; i++) {
    const angle = target.position.angleTo(minion.position) + (ctx.rng.next() - 0.5) * 2.4;
    const raw = clampToArena(ctx.arena, minion.position.add(Vec2.fromAngle(angle, blink.range)), ctx.arena.playerMargin + 20);
    const point = pushOutOfPillars(ctx.arena, raw, minion.hitRadius);
    const distance = point.distanceTo(target.position);
    if (distance > bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  minion.target = best;
  minion.state = 'windup';
  minion.pending = 'blink';
  minion.stateTimer = blink.windup;
  minion.abilityTimer = blink.cooldown;
  ctx.emit({ type: 'minion_telegraph', action: 'blink', minionId: minion.id, position: minion.position, to: best, seconds: blink.windup });
}

/** Annuncio di un teletrasporto, di un agguato o di una raffica dei tiratori in posa. */
function stepWindup(minion: Minion, target: Player, ctx: MinionContext, dt: number): void {
  minion.stateTimer -= dt;
  if (minion.stateTimer > 0) return;
  minion.state = 'idle';
  if ((minion.pending === 'blink' || minion.pending === 'ambush') && minion.target !== null) {
    const from = minion.position;
    minion.position = minion.target;
    ctx.emit({ type: 'minion_blinked', position: minion.position, from, minionId: minion.id, visual: minion.definition.visual });
    const ambush = minion.definition.ambush;
    if (minion.pending === 'ambush' && ambush !== undefined) {
      fire(minion, target, ambush.projectile, { kind: 'aimed', count: ambush.count, spread: ambush.spread }, ctx);
    }
  }
  minion.pending = null;
}

// --- Nidi, sostegni, lanci, raffiche -----------------------------------------------------------------------------

function tickNest(minion: Minion, ctx: MinionContext, dt: number): void {
  const nest = minion.definition.nest;
  if (nest === undefined) return;
  minion.abilityTimer -= dt;
  if (minion.abilityTimer > 0) return;
  minion.abilityTimer = nest.interval * minion.cadence;
  const children = ctx.minions.filter((other) => other.parentId === minion.id && !other.isDead).length;
  const count = Math.min(nest.burst, nest.maxChildren - children);
  for (let i = 0; i < count; i++) {
    const angle = minion.heading + (i * TAU) / Math.max(count, 1);
    ctx.spawnChild(nest.spawn, minion.position.add(Vec2.fromAngle(angle, minion.hitRadius + 18)), minion);
  }
  minion.heading += 1.1;
}

function tickAura(minion: Minion, ctx: MinionContext, dt: number): void {
  const aura = minion.definition.aura!;
  minion.abilityTimer -= dt;
  if (minion.abilityTimer > 0) return;
  minion.abilityTimer = aura.interval * minion.cadence;
  let covered = 0;
  for (const other of ctx.minions) {
    if (other === minion || other.isDead || other.position.distanceTo(minion.position) > aura.radius) continue;
    if (aura.kind !== 'shield' && other.isHidden) continue;
    switch (aura.kind) {
      case 'shield':
        other.shield = Math.max(other.shield, aura.amount);
        break;
      case 'haste':
        other.hasteFor = Math.max(other.hasteFor, aura.duration ?? 3);
        other.hasteFactor = aura.amount;
        break;
      case 'repair': {
        if (other.health.current >= other.health.max) continue;
        other.health.current = Math.min(other.health.max, other.health.current + Math.ceil(other.health.max * aura.amount));
        break;
      }
    }
    covered++;
  }
  if (covered > 0) ctx.emit({ type: 'minion_aura', position: minion.position, radius: aura.radius, minionId: minion.id, aura: aura.kind });
}

function tickLob(minion: Minion, target: Player, ctx: MinionContext, dt: number): void {
  const lob = minion.definition.lob!;
  if (minion.state !== 'idle' && minion.state !== 'exposed') return;
  minion.abilityTimer -= dt;
  if (minion.abilityTimer > 0 || minion.age < MINION_GRACE) return;
  if (minion.position.distanceTo(target.position) > lob.range) {
    minion.abilityTimer = 0.3;
    return;
  }
  minion.abilityTimer = lob.interval * minion.cadence;
  const margin = ctx.arena.playerMargin;
  const at = (point: Vec2, delay: number): void => ctx.spawnZone({ ...lob.zone, delay: lob.zone.delay + delay }, clampToArena(ctx.arena, point, margin), minion);
  if (lob.shape === 'ring') {
    // Un cerchio di zone attorno al bersaglio: il centro e' il posto sicuro.
    const phase = ctx.rng.next() * TAU;
    for (let i = 0; i < lob.count; i++) at(target.position.add(Vec2.fromAngle(phase + (i * TAU) / lob.count, lob.scatter)), 0);
    return;
  }
  if (lob.shape === 'cross') {
    // Una zona sul bersaglio e quattro bracci che scoppiano dal centro verso fuori.
    const spacing = lob.zone.radius * 1.7;
    const base = minion.position.angleTo(target.position);
    at(target.position, 0);
    for (let arm = 0; arm < 4; arm++) {
      const direction = Vec2.fromAngle(base + (arm * Math.PI) / 2);
      for (let i = 1; i <= lob.count; i++) at(target.position.add(direction.mul(spacing * i)), i * 0.15);
    }
    return;
  }
  if (lob.shape === 'cone') {
    // Ondate di zone dal servitore verso il bersaglio, sempre piu' larghe, una dopo l'altra.
    const rows = lob.rows ?? 3;
    const direction = Vec2.fromAngle(minion.position.angleTo(target.position));
    const across = new Vec2(-direction.y, direction.x);
    const reach = Math.min(lob.range, minion.position.distanceTo(target.position) + lob.scatter);
    for (let wave = 1; wave <= lob.count; wave++) {
      const center = minion.position.add(direction.mul((reach * wave) / lob.count));
      const width = lob.zone.radius * 1.8 * (0.6 + (0.4 * wave) / lob.count);
      for (let row = 0; row < rows; row++) at(center.add(across.mul((row - (rows - 1) / 2) * width)), wave * 0.18);
    }
    return;
  }
  if (lob.shape === 'spots') {
    for (let i = 0; i < lob.count; i++) {
      const offset = i === 0 ? Vec2.ZERO : Vec2.fromAngle(ctx.rng.next() * TAU, lob.scatter * (0.4 + ctx.rng.next() * 0.6));
      ctx.spawnZone(lob.zone, clampToArena(ctx.arena, target.position.add(offset), margin), minion);
    }
    return;
  }
  // Muro di traverso sul percorso del bersaglio, con un varco in una posizione a caso.
  const across = Vec2.fromAngle(minion.position.angleTo(target.position) + Math.PI / 2);
  const spacing = lob.zone.radius * 1.75;
  const gap = Math.floor(ctx.rng.next() * lob.count);
  for (let i = 0; i < lob.count; i++) {
    if (i === gap) continue;
    const point = target.position.add(across.mul((i - (lob.count - 1) / 2) * spacing));
    ctx.spawnZone({ ...lob.zone, delay: lob.zone.delay + Math.abs(i - gap) * 0.03 }, clampToArena(ctx.arena, point, margin), minion);
  }
}

function tickShot(minion: Minion, target: Player, ctx: MinionContext, dt: number): void {
  const shot = minion.definition.shot!;
  const state = minion.state;
  if (state !== 'idle' && state !== 'exposed' && !(state === 'windup' && minion.pending === 'shot')) return;
  if (minion.seriesLeft > 0 && shot.series !== undefined) {
    // Raffica in serie: le raffiche dopo la prima, senza nuova posa, ognuna mirata di nuovo e ruotata.
    minion.seriesTimer -= dt;
    if (minion.seriesTimer <= 0) {
      fire(minion, target, shot.projectile, shot.pattern ?? { kind: 'aimed', count: 1, spread: 0 }, ctx, minion.seriesIndex * (shot.series.turn ?? 0));
      minion.seriesIndex++;
      minion.seriesLeft--;
      minion.seriesTimer = shot.series.gap;
      minion.volleys++;
    }
  }
  minion.shotTimer -= dt;
  const windup = shot.windup ?? 0;
  if (minion.pending !== 'shot') {
    if (minion.shotTimer > windup) return;
    // Non si spara contro un massiccio: si aspetta di vedere il bersaglio.
    const inRange = (shot.range === undefined || minion.position.distanceTo(target.position) <= shot.range) && solidBetween(ctx.arena, minion.position, target.position) === undefined;
    const tokened = minionTier(minion.definition) !== 'swarm';
    if (!inRange || minion.age < MINION_GRACE - windup || (tokened && !ctx.takeToken(minion))) {
      minion.shotTimer = windup + 0.25;
      return;
    }
    minion.pending = 'shot';
    if (windup > 0) {
      ctx.emit({ type: 'minion_telegraph', action: 'shot', minionId: minion.id, position: minion.position, seconds: windup });
    }
  }
  if (minion.shotTimer > 0) return;
  fire(minion, target, shot.projectile, shot.pattern ?? { kind: 'aimed', count: 1, spread: 0 }, ctx);
  ctx.releaseToken(minion);
  minion.pending = null;
  minion.volleys++;
  minion.shotTimer = shot.interval * minion.cadence;
  if (shot.series !== undefined && shot.series.count > 1) {
    minion.seriesLeft = shot.series.count - 1;
    minion.seriesIndex = 1;
    minion.seriesTimer = shot.series.gap;
  }
}

/** Spara una raffica secondo la disposizione dei dati; `turn` ruota la raffica (le raffiche in serie). */
function fire(minion: Minion, target: Player, spec: ProjectileSpec, pattern: ShotPattern, ctx: MinionContext, turn = 0): void {
  const origin = minion.position;
  const aim = origin.angleTo(target.position) + turn;
  switch (pattern.kind) {
    case 'aimed':
      for (let i = 0; i < pattern.count; i++) ctx.spawnProjectile(spec, origin, aim + (i - (pattern.count - 1) / 2) * pattern.spread, minion);
      return;
    case 'ring': {
      const spin = (pattern.turn ?? 0) * minion.volleys;
      const gap = pattern.gap ?? 0;
      // La spirale doppia: il secondo anello gira al contrario (non alla prima raffica, quando coinciderebbe col primo).
      const mirrored = pattern.mirror === true && Math.abs(Math.sin(spin)) > 1e-6;
      for (const base of mirrored ? [aim + spin, aim - spin] : [aim + spin]) {
        for (let i = 0; i < pattern.count; i++) {
          if (gap > 0 && Math.min(i, pattern.count - i) < gap / 2) continue;
          ctx.spawnProjectile(spec, origin, base + (i * TAU) / pattern.count, minion);
        }
      }
      return;
    }
    case 'cross': {
      const base = aim + (pattern.diagonal ? Math.PI / 4 : 0);
      for (let i = 0; i < 4; i++) ctx.spawnProjectile(spec, origin, base + (i * Math.PI) / 2, minion);
      return;
    }
    case 'pair':
      ctx.spawnProjectile(spec, origin, aim + Math.PI / 2, minion);
      ctx.spawnProjectile(spec, origin, aim - Math.PI / 2, minion);
      return;
    case 'implode': {
      const center = target.position;
      const phase = ctx.rng.next() * TAU;
      const gapAt = Math.floor(ctx.rng.next() * pattern.count);
      for (let i = 0; i < pattern.count; i++) {
        const offset = Math.min(Math.abs(i - gapAt), pattern.count - Math.abs(i - gapAt));
        if (offset < pattern.gap / 2) continue;
        const angle = phase + (i * TAU) / pattern.count;
        const point = clampToArena(ctx.arena, center.add(Vec2.fromAngle(angle, pattern.radius)), ctx.arena.projectileMargin + 4);
        ctx.spawnProjectile(spec, point, point.angleTo(center), minion);
      }
    }
  }
}
