import type { Vec2 } from '../../core/vec2';
import type { Team } from './team';

/** Dati di una zona a scoppio ritardato: un'area segnalata che esplode dopo `delay` secondi. */
export interface DangerZoneSpec {
  /** Squadra di chi la crea: colpisce la squadra avversaria. */
  readonly team: Team;
  readonly radius: number;
  /** Secondi tra la comparsa del segnale e lo scoppio. */
  readonly delay: number;
  readonly damage: number;
  /** Aspetto della zona (chiave in `presentation/visuals.ts`); se manca vale quello della squadra. */
  readonly visual?: string;
  /**
   * Se maggiore di zero: una zona del giocatore rallenta il boss e i servitori colpiti per questi secondi; una zona
   * nemica rallenta i giocatori colpiti (melma, gelo).
   */
  readonly slowSeconds?: number;
  /** Solo zone nemiche: feriscono anche i servitori (nubi di spore, cera che brucia). */
  readonly hurtsMinions?: boolean;
}

export class DangerZone {
  /** Secondi rimasti allo scoppio. */
  remaining: number;

  constructor(
    readonly id: number,
    readonly spec: DangerZoneSpec,
    readonly position: Vec2,
  ) {
    this.remaining = spec.delay;
  }

  get team(): Team {
    return this.spec.team;
  }

  get radius(): number {
    return this.spec.radius;
  }

  /** Avanzamento del conto alla rovescia, da 0 (appena creata) a 1 (sta per esplodere). */
  get progress(): number {
    return Math.min(Math.max(1 - this.remaining / this.spec.delay, 0), 1);
  }

  get isDue(): boolean {
    return this.remaining <= 0;
  }
}
