import type { PresentationLooks } from '../visuals';

/** Aspetti dei proiettili e delle zone delle skill concesse dagli oggetti (vedi `items/item-skills.ts`). Colori provvisori. */
export const ITEM_LOOKS: PresentationLooks = {
  projectiles: {
    hunter_arrow: { color: '#b4e68a', shape: 'arrow' },
    storm_bolt: { color: '#8fb8ff', shape: 'orb' },
    spirit_wisp: { color: '#9ff0d8', shape: 'orb' },
    sporefan_seed: { color: '#c9e46b', shape: 'diamond' },
    frostlance_shard: { color: '#bfeaff', shape: 'shard' },
  },
  zones: {
    hammer_blast: { ring: '#ff7a45', burst: '#ff8f5c', fill: '#f0602a26' },
    aegis_blast: { ring: '#ffb067', burst: '#ffc27d', fill: '#f0873a22' },
    shroud_blast: { ring: '#b7a6d9', burst: '#c6b7e6', fill: '#8a72c022' },
    plate_blast: { ring: '#ff9a3c', burst: '#ffb15f', fill: '#f07a1a2a' },
    veil_blast: { ring: '#9ad7ff', burst: '#b5e3ff', fill: '#5fb4f024' },
  },
};
