import { TAU, Vec2 } from '../../core/vec2';
import { clampToArena } from '../arena/arena';
import type { ProjectileSpec } from '../combat/projectile';
import type { Boss } from './boss';
import type { BossContext } from './boss-context';

/*
 * Attrezzi comuni per scrivere gli schemi dei boss: creano proiettili in anelli e ventagli, programmano azioni
 * ritardate e avviano una carica. Gli schemi restano dati (tabelle di valori) piu' poche righe di comportamento.
 */

/** Proiettile nemico con durata predefinita di 5 secondi. */
export function enemyShot(speed: number, damage: number, radius: number, visual: string, lifetime = 5): ProjectileSpec {
  return { team: 'enemy', speed, damage, radius, lifetime, visual };
}

/** `count` proiettili equidistanti in cerchio attorno a `origin`, il primo verso `startAngle`. */
export function spawnRing(ctx: BossContext, origin: Vec2, spec: ProjectileSpec, count: number, startAngle = 0): void {
  for (let i = 0; i < count; i++) ctx.spawnProjectile(spec, origin, startAngle + (i * TAU) / count);
}

/** Ventaglio di `2 * half + 1` proiettili centrato su `angle`, distanziati di `spread` radianti. */
export function spawnFan(ctx: BossContext, origin: Vec2, spec: ProjectileSpec, angle: number, half: number, spread: number): void {
  for (let i = -half; i <= half; i++) ctx.spawnProjectile(spec, origin, angle + i * spread);
}

/** Programma `run` fra `delay` secondi: il boss non lancia altri attacchi finche' non e' stata eseguita. */
export function schedule(
  boss: Boss,
  delay: number,
  tag: string,
  run: (boss: Boss, ctx: BossContext) => void,
  angle?: number,
): void {
  boss.scheduled.push(angle === undefined ? { delay, tag, run } : { delay, tag, angle, run });
}

/** Avvia una carica verso la posizione attuale del giocatore (portata dentro l'arena) e annuncia la posa. */
export function startCharge(boss: Boss, ctx: BossContext, windup: number, duration: number): void {
  boss.charge = {
    start: boss.position,
    target: clampToArena(boss.arena, ctx.target, boss.arena.bossMargin),
    elapsed: 0,
    windup,
    duration,
  };
  ctx.emit({ type: 'boss_pose', seconds: windup });
}

/** Un punto a `distance` da `center` nella direzione `angle`, portato dentro l'arena (margine del boss). */
export function pointAround(boss: Boss, center: Vec2, angle: number, distance: number): Vec2 {
  return clampToArena(boss.arena, center.add(Vec2.fromAngle(angle, distance)), boss.arena.bossMargin);
}
