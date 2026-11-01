import type { PresentationLooks } from '../visuals';

/**
 * Aspetti dei proiettili e delle zone dei servitori, dei luogotenenti e delle insidie della discesa. I proiettili dei
 * servitori sono piccoli, con il centro chiaro; nella fucina sono bianchi o viola, mai arancioni, per staccarsi dalla
 * lava; nella cripta rosa e lilla, non ambra come le candele. Le zone hanno il colore del loro materiale (cera, spore,
 * lava, brina).
 */
export const DESCENT_LOOKS: PresentationLooks = {
  projectiles: {
    crypt_wax: { color: '#f6e6c0', shape: 'orb' },
    crypt_censer: { color: '#ff9ad0', shape: 'ember' },
    crypt_bell_note: { color: '#f2b8ff', shape: 'diamond' },
    crypt_stone: { color: '#cfc8bc', shape: 'shard' },
    swamp_ring_spore: { color: '#c08cff', shape: 'orb' },
    forge_bellows_spark: { color: '#f0e8ff', shape: 'orb' },
    forge_cross_bolt: { color: '#e0f2ff', shape: 'dart' },
    forge_anvil_shard: { color: '#e6a8ff', shape: 'shard' },
    glacier_apprentice_shard: { color: '#d9a6ff', shape: 'shard' },
    glacier_flurry_small: { color: '#eaf8ff', shape: 'orb' },
  },
  zones: {
    crypt_wax_pool: { ring: '#ffcf6a', burst: '#ffe0a0', fill: '#ffb05c26' },
    crypt_glass: { ring: '#c9a0ff', burst: '#ffd8ff', fill: '#b080ff22' },
    swamp_puff: { ring: '#d8cf8a', burst: '#eee6a8', fill: '#c9b07a30' },
    swamp_spit: { ring: '#d070c0', burst: '#f0a0e0', fill: '#b04aa02a' },
    swamp_root: { ring: '#9cc04a', burst: '#b5d85c', fill: '#5f8f2a30' },
    swamp_slime: { ring: '#8ab05a', burst: '#b8d880', fill: '#5a8a3a30' },
    swamp_toad_landing: { ring: '#c8e060', burst: '#e0f080', fill: '#8ab04a2a' },
    swamp_gas: { ring: '#b8d060', burst: '#e0f090', fill: '#9ab04a26' },
    forge_lava_line: { ring: '#ff7a1f', burst: '#ffb05c', fill: '#ff3b1a2e' },
    forge_vent: { ring: '#ff5a1a', burst: '#ffd04a', fill: '#ff3b1a30' },
    forge_ember_trail: { ring: '#ff9a3d', burst: '#ffd04a', fill: '#ff6a1a26' },
    forge_anvil_slam: { ring: '#ffd070', burst: '#fff0b0', fill: '#ff6a1f2e' },
    glacier_ram_trail: { ring: '#6fe3ff', burst: '#b7f4ff', fill: '#3cc6f02a' },
    glacier_icicle: { ring: '#bfefff', burst: '#ffffff', fill: '#7fd8ff26' },
  },
};
