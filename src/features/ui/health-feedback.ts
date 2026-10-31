/*
 * Logica pura delle barre "con memoria" dell'HUD: la scheggia che mostra i danni appena subiti e il contatore dei danni
 * degli ultimi istanti. Il tempo e' passato dall'esterno (secondi), cosi' si prova senza browser. Valori provvisori.
 */

/** Quanto resta ferma la scheggia dopo l'ultimo colpo, e a che velocita' (frazione di barra al secondo) poi si consuma. */
export const CHIP = { hold: 0.45, drain: 0.9 } as const;
/** Finestra del contatore dei danni recenti, in secondi. */
export const DAMAGE_WINDOW = 1.6;

/**
 * Scheggia di una barra di vita: dopo un colpo resta al valore di prima per `hold` secondi, poi scende fino alla vita
 * attuale. Se la vita sale (cura, nuova partita) la segue subito.
 */
export class ChipBar {
  private chip: number;
  private last: number;
  private holdUntil = 0;
  private lastTime: number | null = null;

  constructor(initial = 1) {
    this.chip = initial;
    this.last = initial;
  }

  /** Aggiorna con la frazione di vita attuale all'istante `now`; restituisce la frazione della scheggia. */
  update(fraction: number, now: number): number {
    const dt = this.lastTime === null ? 0 : Math.max(0, now - this.lastTime);
    this.lastTime = now;
    if (fraction < this.last) this.holdUntil = now + CHIP.hold;
    this.last = fraction;
    if (fraction >= this.chip) this.chip = fraction;
    else if (now >= this.holdUntil) this.chip = Math.max(fraction, this.chip - CHIP.drain * dt);
    return this.chip;
  }

  reset(fraction = 1): void {
    this.chip = fraction;
    this.last = fraction;
    this.holdUntil = 0;
    this.lastTime = null;
  }
}

/** Somma dei danni inflitti negli ultimi `DAMAGE_WINDOW` secondi (contatore accanto alla barra del boss). */
export class DamageMeter {
  private hits: { readonly time: number; readonly amount: number }[] = [];

  add(amount: number, now: number): void {
    this.hits.push({ time: now, amount });
  }

  /** Il totale recente; 0 quando non si colpisce da un po'. */
  total(now: number): number {
    this.hits = this.hits.filter((hit) => now - hit.time <= DAMAGE_WINDOW);
    return this.hits.reduce((sum, hit) => sum + hit.amount, 0);
  }

  clear(): void {
    this.hits = [];
  }
}
