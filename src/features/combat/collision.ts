/**
 * Raggi e distanze di collisione del giocatore. Valori ereditati dal prototipo, provvisori: sono lievemente incoerenti
 * tra loro (le zone usano un margine di 1 in meno del raggio di colpo) e vanno unificati con la prova manuale
 * (vedi docs/game-design.md, punti aperti). Quelli del boss stanno nei suoi dati (`BossStats`).
 */
export const HIT_RADIUS = {
  player: 9,
} as const;

/** Raggio del corpo del giocatore contro i pilastri (provvisorio, nuovo con le mappe a ostacoli). */
export const BODY_RADIUS = {
  player: 10,
} as const;

/** Le zone di pericolo colpiscono entro raggio + raggio di colpo del bersaglio - questo valore (come nel prototipo). */
export const ZONE_EDGE_FORGIVENESS = 1;
