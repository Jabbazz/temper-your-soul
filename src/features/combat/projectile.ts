import { Vec2 } from '../../core/vec2';
import type { HitEffect } from '../classes/skill-mechanics';
import type { Team } from './team';

/**
 * Identificatore dell'aspetto di un proiettile. I dati scelgono l'aspetto per id; colori e forme stanno nella
 * rappresentazione (`presentation/visuals.ts`), cosi' le regole non dipendono dal disegno. E' una stringa libera
 * (ogni dungeon ne aggiunge); un test controlla che ogni id usato dai dati abbia un aspetto.
 */
export type ProjectileVisual = string;

/** Dati di un tipo di proiettile. Di sola lettura: lo stato variabile vive in `Projectile`. */
export interface ProjectileSpec {
  readonly onHit?: HitEffect;
  readonly unblockable?: boolean;
  readonly team: Team;
  /** Velocita' in unita' al secondo. */
  readonly speed: number;
  readonly damage: number;
  readonly radius: number;
  /** Durata massima in secondi. */
  readonly lifetime: number;
  readonly visual: ProjectileVisual;
  /** Se maggiore di zero, colpire il boss lo rallenta per questi secondi. */
  readonly slowSeconds?: number;
}

export class Projectile {
  /** Secondi di vita rimasti: a zero il proiettile scompare. */
  lifetime: number;
  position: Vec2;
  readonly velocity: Vec2;

  constructor(
    readonly id: number,
    readonly spec: ProjectileSpec,
    position: Vec2,
    angle: number,
  ) {
    this.position = position;
    this.velocity = Vec2.fromAngle(angle, spec.speed);
    this.lifetime = spec.lifetime;
  }

  get team(): Team {
    return this.spec.team;
  }

  get radius(): number {
    return this.spec.radius;
  }

  get damage(): number {
    return this.spec.damage;
  }

  get isExpired(): boolean {
    return this.lifetime <= 0;
  }

  advance(dt: number): void {
    this.position = this.position.add(this.velocity.mul(dt));
    this.lifetime -= dt;
  }

  /** Termina il proiettile (colpo a segno, ostacolo o uscita dall'arena). */
  expire(): void {
    this.lifetime = 0;
  }
}
