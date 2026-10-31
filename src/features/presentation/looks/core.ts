import type { PresentationLooks } from '../visuals';

/** Aspetti dei proiettili e delle zone del prototipo (skill base del mago e guardiano della cripta). */
export const CORE_LOOKS: PresentationLooks = {
  projectiles: {
    arcane_bolt: { color: '#c1a4ff', shape: 'dart' },
    frost_orb: { color: '#8be9fa', shape: 'diamond' },
    ember_nova: { color: '#ee9867', shape: 'orb' },
    ember_volley: { color: '#f2c56e', shape: 'orb' },
    void_spiral: { color: '#c49af5', shape: 'orb' },
    ember_fan: { color: '#ffcf83', shape: 'orb' },
  },
  zones: {
    player: { ring: '#c5a1ff', burst: '#cba5ff', fill: '#9b68ec20' },
    enemy: { ring: '#ff9670', burst: '#ff9c64', fill: '#ec563026' },
  },
};
