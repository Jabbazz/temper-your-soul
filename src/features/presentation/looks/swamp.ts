import type { PresentationLooks } from '../visuals';

/** Aspetti della palude: spore gialle e viola, melma e radici (proiettili e zone della Madre delle Spore). */
export const SWAMP_LOOKS: PresentationLooks = {
  projectiles: {
    swamp_spore: { color: '#d9e86a', shape: 'orb' },
    swamp_noose: { color: '#b58cff', shape: 'diamond' },
    swamp_pustule: { color: '#c9a24a', shape: 'orb' },
  },
  zones: {
    swamp_venom: { ring: '#d4e84f', burst: '#e6f56a', fill: '#b9d63a22' },
    swamp_bog: { ring: '#a97cf0', burst: '#bb92ff', fill: '#8b5cd626' },
    swamp_tendril: { ring: '#9cc04a', burst: '#b5d85c', fill: '#5f8f2a30' },
  },
};
