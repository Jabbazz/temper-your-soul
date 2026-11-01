import type { Rng } from '../../../core/rng';
import type { HitEffect } from '../../classes/skill-mechanics';
import type { StatusEffectId } from './status-catalog';

export interface ActiveStatus {
  readonly target: string;
  readonly owner: string;
  readonly status: StatusEffectId;
  remaining: number;
  untilTick: number;
  readonly damage: number;
}

/** Un'istanza per stato/bersaglio: rinnova la durata, senza cumulo illimitato. */
export class StatusRuntime {
  readonly active = new Map<string, ActiveStatus>();

  apply(target: string, owner: string, hit: HitEffect, rng: Rng): boolean {
    if (!hit.status || (hit.chance ?? 1) <= 0) return false;
    if ((hit.chance ?? 1) < 1 && rng.next() >= hit.chance!) return false;
    const key = `${target}:${hit.status}`, previous = this.active.get(key);
    this.active.set(key, { target, owner, status: hit.status, remaining: hit.duration ?? 3,
      untilTick: previous?.untilTick ?? 1, damage: hit.damagePerSecond ?? 0 });
    return true;
  }

  has(target: string, status: StatusEffectId): boolean {
    return (this.active.get(`${target}:${status}`)?.remaining ?? 0) > 0;
  }

  step(dt: number, alive: (id: string) => boolean, hurt: (target: string, damage: number, owner: string) => void): void {
    for (const [key, effect] of this.active) {
      if (!alive(effect.target)) { this.active.delete(key); continue; }
      const elapsed = Math.min(dt, effect.remaining);
      effect.remaining = Math.max(0, effect.remaining - dt);
      effect.untilTick -= elapsed;
      while (effect.untilTick <= 1e-9 && effect.damage > 0 && alive(effect.target)) {
        hurt(effect.target, effect.damage, effect.owner);
        effect.untilTick += 1;
      }
      if (effect.remaining <= 0) this.active.delete(key);
    }
  }
}
