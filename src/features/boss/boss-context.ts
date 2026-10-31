import type { Vec2 } from '../../core/vec2';
import type { Rng } from '../../core/rng';
import type { DangerZoneSpec } from '../combat/danger-zone';
import type { GameEvent } from '../combat/events';
import type { ProjectileSpec } from '../combat/projectile';
import type { BossSummons } from '../minions/minion-definition';

/** Che cosa la simulazione mette a disposizione del boss mentre agisce. */
export interface BossContext {
  /** Posizione del giocatore. */
  readonly target: Vec2;
  /** Tempo di gioco trascorso nella partita, in secondi. */
  readonly time: number;
  /** Casualita' della simulazione (riproducibile con un seme). */
  readonly rng: Rng;
  spawnProjectile(spec: ProjectileSpec, position: Vec2, angle: number): void;
  spawnZone(spec: DangerZoneSpec, position: Vec2): void;
  hurtPlayer(amount: number): void;
  /** Cooperativa: controlla tutti i corpi vicini, anche se il bersaglio della carica si è allontanato. */
  hurtNearbyPlayers?(amount: number): void;
  /** Evoca fino a `count` servitori attorno a `center`, senza superare `summons.maxAlive` vivi. Facoltativo nei test. */
  summon?(summons: BossSummons, count: number, center: Vec2): void;
  emit(event: GameEvent): void;
}
