import type { PresentationLooks } from '../visuals';

/**
 * Aspetti dei proiettili e delle zone del Custode del ghiaccio (vedi PresentationLooks). Tavolozza fredda: bianchi per
 * cio' che e' ordinario, viola e magenta per cio' che richiede attenzione (anello sfasato, salto, carica). Niente
 * azzurro nei proiettili: e' il colore dei colpi di gelo dei giocatori.
 */
export const GLACIER_LOOKS: PresentationLooks = {
  projectiles: {
    glacier_nova: { color: '#f4fdff', shape: 'diamond' },
    glacier_nova_late: { color: '#c7b2ff', shape: 'diamond' },
    glacier_flurry_cw: { color: '#eaf8ff', shape: 'orb' },
    glacier_flurry_ccw: { color: '#e090ff', shape: 'orb' },
    glacier_shard: { color: '#f0a8ff', shape: 'shard' },
    glacier_blink_shot: { color: '#d6c4ff', shape: 'arrow' },
  },
  zones: {
    glacier_spike: { ring: '#bfefff', burst: '#e8fbff', fill: '#7fd8ff26' },
    glacier_blink: { ring: '#c9b3ff', burst: '#e0d2ff', fill: '#a98fe830' },
    glacier_trail: { ring: '#6fe3ff', burst: '#b7f4ff', fill: '#3cc6f02a' },
  },
};
