import type { DangerZoneSpec } from '../../combat/danger-zone';
import type { ProjectileSpec } from '../../combat/projectile';

/** Proiettile nemico di un servitore (durata predefinita 4 secondi). */
export function minionShot(speed: number, damage: number, radius: number, visual: string, lifetime = 4): ProjectileSpec {
  return { team: 'enemy', speed, damage, radius, lifetime, visual };
}

/** Zona nemica di un servitore o di un'insidia. */
export function minionZone(radius: number, delay: number, damage: number, visual: string, extra: Partial<DangerZoneSpec> = {}): DangerZoneSpec {
  return { team: 'enemy', radius, delay, damage, visual, ...extra };
}
