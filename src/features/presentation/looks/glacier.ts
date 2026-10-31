import type { PresentationLooks } from '../visuals';

/**
 * Aspetti dei proiettili e delle zone del Custode del ghiaccio (vedi PresentationLooks). Tavolozza fredda: ciano e
 * bianchi per cio' che e' ordinario, viola pallido per cio' che richiede attenzione (anello sfasato, salto, carica).
 */
export const GLACIER_LOOKS: PresentationLooks = {
  projectiles: {
    glacier_nova: { color: '#7fe0ff', shape: 'diamond' },
    glacier_nova_late: { color: '#c7b2ff', shape: 'diamond' },
    glacier_flurry_cw: { color: '#eaf8ff', shape: 'orb' },
    glacier_flurry_ccw: { color: '#b8a4f0', shape: 'orb' },
    glacier_shard: { color: '#aef0ff', shape: 'shard' },
    glacier_blink_shot: { color: '#d6c4ff', shape: 'arrow' },
  },
  zones: {
    glacier_spike: { ring: '#bfefff', burst: '#e8fbff', fill: '#7fd8ff26' },
    glacier_blink: { ring: '#c9b3ff', burst: '#e0d2ff', fill: '#a98fe830' },
    glacier_trail: { ring: '#6fe3ff', burst: '#b7f4ff', fill: '#3cc6f02a' },
  },
};
