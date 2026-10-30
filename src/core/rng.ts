/** Sorgente di numeri casuali in [0, 1). La simulazione ne riceve una, cosi' i test possono renderla riproducibile. */
export interface Rng {
  next(): number;
}

/** Generatore con seme (mulberry32): stessa sequenza a parita' di seme. Per la simulazione e per i test. */
export class SeededRng implements Rng {
  private state: number;

  constructor(readonly seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

/** Casualita' non riproducibile, per cio' che e' solo estetico (particelle, scostamenti dei numeri). */
export const cosmeticRng: Rng = { next: () => Math.random() };

/** Numero casuale in [-0.5, 0.5): il "centrato" usato per gli scostamenti simmetrici. */
export const centered = (rng: Rng): number => rng.next() - 0.5;

/** Numero casuale in [min, max). */
export const between = (rng: Rng, min: number, max: number): number => min + rng.next() * (max - min);
