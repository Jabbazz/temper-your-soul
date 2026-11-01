import type { PresentationLooks } from '../visuals';

/**
 * Aspetti della fucina. Le zone a terra sono braci e lava (arancio e rosso); i proiettili no, perche' sul pavimento
 * di lava sparirebbero: ferro bianco, braci incandescenti quasi bianche, scossa viola.
 */
export const FORGE_LOOKS: PresentationLooks = {
  projectiles: {
    forge_shrapnel: { color: '#d9d2c8', shape: 'shard' },
    forge_ember: { color: '#fff0c8', shape: 'dart' },
    forge_bellows: { color: '#f3dcff', shape: 'orb' },
    forge_shock: { color: '#c48bff', shape: 'diamond' },
  },
  zones: {
    forge_slam: { ring: '#ffd070', burst: '#ff8a2a', fill: '#ff6a1f2e' },
    forge_lava: { ring: '#ff7a1f', burst: '#ff4b1f', fill: '#ff3b1a30' },
    forge_cross: { ring: '#ffb02e', burst: '#fff2a8', fill: '#ffb02e2a' },
  },
};
