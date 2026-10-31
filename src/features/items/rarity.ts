/** Rarita' di un oggetto, in ordine crescente. La rarita' migliora i valori della skill senza cambiarne l'identita'. */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Tutte le rarita' in ordine crescente: l'ordine conta (estrazione dei pesi, confronti, interfaccia). */
export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export interface RarityStats {
  /** Nome visibile al giocatore (italiano). */
  readonly label: string;
  /** Colore esadecimale per l'interfaccia (bordi, nomi). */
  readonly color: string;
  /** Moltiplicatore del danno (e, a meta' effetto, di distanza e invulnerabilita' dello scatto). */
  readonly powerMultiplier: number;
  /** Moltiplicatore della ricarica: minore di 1 = ricarica piu' breve. */
  readonly cooldownMultiplier: number;
}

/** Statistiche per rarita'. Valori provvisori (vedi docs/game-design.md): non definiscono il bilanciamento. */
export const RARITY_STATS: Readonly<Record<Rarity, RarityStats>> = {
  common: { label: 'Comune', color: '#b9b9c2', powerMultiplier: 1, cooldownMultiplier: 1 },
  uncommon: { label: 'Non comune', color: '#5fd068', powerMultiplier: 1.12, cooldownMultiplier: 0.95 },
  rare: { label: 'Raro', color: '#4aa3ff', powerMultiplier: 1.25, cooldownMultiplier: 0.9 },
  epic: { label: 'Epico', color: '#b06bff', powerMultiplier: 1.4, cooldownMultiplier: 0.85 },
  legendary: { label: 'Leggendario', color: '#ffa73b', powerMultiplier: 1.6, cooldownMultiplier: 0.8 },
};

/** Vero se `value` e' una rarita' valida (per leggere dati esterni, come i salvataggi). */
export function isRarity(value: unknown): value is Rarity {
  return typeof value === 'string' && (RARITIES as readonly string[]).includes(value);
}
