/**
 * Raggi e distanze di collisione. Valori ereditati dal prototipo, provvisori: sono lievemente incoerenti tra loro
 * (le zone usano un margine di 8 sul giocatore e di 25 sul boss, i proiettili 9 e 26) e vanno unificati con la prova
 * manuale (vedi docs/game-design.md, punti aperti).
 */
export const HIT_RADIUS = {
  player: 9,
  boss: 26,
} as const;

/** Margine aggiunto al raggio di una zona di pericolo per decidere se colpisce il bersaglio. */
export const ZONE_PADDING = {
  vsPlayer: 8,
  vsBoss: 25,
} as const;

/** Sotto questa distanza tra i centri, il boss ferisce il giocatore per contatto. */
export const CONTACT_DISTANCE = 29;

/** Sotto questa distanza dal boss in carica, il giocatore viene colpito dalla carica. */
export const CHARGE_HIT_DISTANCE = 37;
