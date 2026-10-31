import type { DamageSource, GameEvent } from '../combat/events';

/** Cosa ha colpito di piu' un giocatore: nome della fonte, tipo, colpi e danni. */
export interface SourceTally {
  readonly name: string;
  readonly kind: DamageSource['kind'];
  readonly hits: number;
  readonly damage: number;
}

/** Il resoconto di un incontro dal punto di vista di un giocatore, per le schermate di vittoria e sconfitta. */
export interface CombatSummary {
  /** Danni dei colpi a boss e servitori (valore del colpo, come i numeri a schermo). */
  readonly damageDealt: number;
  readonly bossDamage: number;
  readonly biggestHit: number;
  /** Colpi andati a segno (proiettili, zone, colpi ravvicinati). */
  readonly hits: number;
  /** Proiettili a segno e mancati (persi nel vuoto o fermati da un pilastro). */
  readonly shotsLanded: number;
  readonly shotsMissed: number;
  /** Frazione dei proiettili a segno, `null` se non ne sono stati tirati. */
  readonly accuracy: number | null;
  readonly damageTaken: number;
  readonly hitsTaken: number;
  /** Servitori abbattuti (da chiunque). */
  readonly minionsDefeated: number;
  /** Fonti dei danni subiti, dalla piu' dannosa. */
  readonly topSources: readonly SourceTally[];
}

/**
 * Conta, dagli eventi della simulazione, le statistiche di un giocatore (`localPlayerId`; in partita singola 'local').
 * Solo lettura degli eventi: non tocca le regole e funziona anche con gli eventi ricevuti in cooperativa.
 */
export class CombatTally {
  private damageDealt = 0;
  private bossDamage = 0;
  private biggestHit = 0;
  private hits = 0;
  private shotsLanded = 0;
  private shotsMissed = 0;
  private damageTaken = 0;
  private hitsTaken = 0;
  private minionsDefeated = 0;
  private readonly sources = new Map<string, { kind: DamageSource['kind']; hits: number; damage: number }>();

  constructor(private localPlayerId = 'local') {}

  /** Riparte da zero, eventualmente per un altro giocatore. */
  reset(localPlayerId = this.localPlayerId): void {
    this.localPlayerId = localPlayerId;
    this.damageDealt = 0;
    this.bossDamage = 0;
    this.biggestHit = 0;
    this.hits = 0;
    this.shotsLanded = 0;
    this.shotsMissed = 0;
    this.damageTaken = 0;
    this.hitsTaken = 0;
    this.minionsDefeated = 0;
    this.sources.clear();
  }

  handle(event: GameEvent): void {
    const mine = event.playerId === undefined || event.playerId === this.localPlayerId;
    switch (event.type) {
      case 'damage_dealt':
        if (!mine) return;
        if (event.target === 'player') {
          this.damageTaken += event.amount;
          this.hitsTaken++;
          const name = event.source?.name ?? 'Colpo';
          const entry = this.sources.get(name) ?? { kind: event.source?.kind ?? 'projectile', hits: 0, damage: 0 };
          entry.hits++;
          entry.damage += event.amount;
          this.sources.set(name, entry);
        } else {
          this.damageDealt += event.amount;
          if (event.target === 'boss') this.bossDamage += event.amount;
          this.biggestHit = Math.max(this.biggestHit, event.amount);
          this.hits++;
        }
        break;
      case 'projectile_hit':
        if (!mine || event.team !== 'player') return;
        if (event.struck === 'boss' || event.struck === 'minion') this.shotsLanded++;
        else if (event.struck === 'obstacle') this.shotsMissed++;
        break;
      case 'projectile_faded':
        if (mine) this.shotsMissed++;
        break;
      case 'minion_defeated':
        if (!event.exploded) this.minionsDefeated++;
        break;
      default:
        break;
    }
  }

  summary(): CombatSummary {
    const shots = this.shotsLanded + this.shotsMissed;
    return {
      damageDealt: this.damageDealt,
      bossDamage: this.bossDamage,
      biggestHit: this.biggestHit,
      hits: this.hits,
      shotsLanded: this.shotsLanded,
      shotsMissed: this.shotsMissed,
      accuracy: shots === 0 ? null : this.shotsLanded / shots,
      damageTaken: this.damageTaken,
      hitsTaken: this.hitsTaken,
      minionsDefeated: this.minionsDefeated,
      topSources: [...this.sources]
        .map(([name, entry]) => ({ name, ...entry }))
        .sort((a, b) => b.damage - a.damage || b.hits - a.hits),
    };
  }
}

/** Un consiglio per tipo di colpo subito, per la schermata di sconfitta. */
export const DEFEAT_TIPS: Readonly<Record<DamageSource['kind'], string>> = {
  projectile: 'Muoviti di lato rispetto alle raffiche e usa i pilastri come riparo: fermano i proiettili.',
  zone: 'Esci dai cerchi segnati prima che si chiudano: il bordo che si riempie è il conto alla rovescia.',
  charge: 'Quando a terra compare la fascia della carica, spostati di lato, non all\'indietro.',
  contact: 'Non restare addosso al boss: il contatto ferisce. Tieni la distanza e colpisci da lontano.',
  minion: 'Abbatti i servitori appena compaiono: sono fragili, ma insieme ti tolgono spazio.',
};
