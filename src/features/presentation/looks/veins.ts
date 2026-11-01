import type { PresentationLooks } from '../visuals';

/**
 * Aspetti dei proiettili e delle zone dei servitori delle vene B e C (fase 7 dello studio sulla grafica). Stesse
 * regole dei servitori di prima: colpi piccoli con il centro chiaro; nella cripta verde freddo, crema e lilla; nella
 * palude viola e rosa, zone lime; nella fucina bianchi o viola, mai arancioni; nel ghiacciaio bianchi, ciano e lilla.
 * Le forme evitano quelle dei colpi dei giocatori dello stesso colore (test sul contrasto).
 */
export const VEIN_LOOKS: PresentationLooks = {
  projectiles: {
    crypt_lantern_flame: { color: '#d8f0c0', shape: 'ember' },
    crypt_tear: { color: '#b8d8ff', shape: 'wisp' },
    crypt_bone_shard: { color: '#e8dfc8', shape: 'shard' },
    crypt_organ_note: { color: '#c9a6ff', shape: 'diamond' },
    crypt_cantor_note: { color: '#f6e6c0', shape: 'mirror' },
    crypt_stall_note: { color: '#f0d0ff', shape: 'diamond' },
    crypt_eagle_feather: { color: '#f0e0b0', shape: 'thorn' },
    swamp_pike_spore: { color: '#c08cff', shape: 'orb' },
    swamp_lily_seed: { color: '#d8a0ff', shape: 'orb' },
    swamp_web: { color: '#f0d8ff', shape: 'diamond' },
    swamp_cicada_song: { color: '#c08cff', shape: 'orb' },
    forge_rivet: { color: '#f0e8ff', shape: 'orb' },
    forge_crossbow_bolt: { color: '#f0e8ff', shape: 'arrow' },
    forge_flail_link: { color: '#c8a0ff', shape: 'diamond' },
    forge_armor_shard: { color: '#d8b0ff', shape: 'shard' },
    forge_mole_shard: { color: '#f0e8ff', shape: 'orb' },
    forge_ore_shard: { color: '#e8e4f0', shape: 'ember' },
    glacier_owl_feather: { color: '#e8fbff', shape: 'thorn' },
    glacier_fox_bite: { color: '#d6c4ff', shape: 'thorn' },
    glacier_bear_roar: { color: '#d6c4ff', shape: 'diamond' },
    glacier_star: { color: '#eaf8ff', shape: 'orb' },
  },
  zones: {
    crypt_skull_landing: { ring: '#d8c8b0', burst: '#f0e8d8', fill: '#c8b8a030' },
    crypt_spade: { ring: '#a8a0c0', burst: '#d8d0f0', fill: '#7a70a02a' },
    crypt_grave_dirt: { ring: '#9fe0b0', burst: '#c8f0d0', fill: '#5fa07a2a' },
    crypt_eagle_landing: { ring: '#f0e0b0', burst: '#fff4d0', fill: '#c8a86a2a' },
    swamp_washer_ring: { ring: '#b98cff', burst: '#dcc0ff', fill: '#8a5ad02a' },
    swamp_moth_dust: { ring: '#cddc58', burst: '#e6f08a', fill: '#a8b83a26' },
    swamp_beetle_spray: { ring: '#e6f56a', burst: '#f4ffa0', fill: '#b8c8402a' },
    swamp_stag_roots: { ring: '#9cc04a', burst: '#c8e070', fill: '#5f8f2a30' },
    forge_firedamp: { ring: '#b89cff', burst: '#dcc8ff', fill: '#8a6ad026' },
    forge_mole_line: { ring: '#e8e4f0', burst: '#ffffff', fill: '#c8c0e02a' },
    forge_blast_cross: { ring: '#e8e4f0', burst: '#ffffff', fill: '#b8a8e02a' },
    forge_ore_slam: { ring: '#d8c8ff', burst: '#f4eeff', fill: '#a090d02e' },
    glacier_star_lance: { ring: '#bfefff', burst: '#ffffff', fill: '#7fd8ff26' },
    glacier_snow_lump: { ring: '#e8f6ff', burst: '#ffffff', fill: '#c0e0f826' },
    glacier_alembic_pool: { ring: '#9fe4ff', burst: '#d8f6ff', fill: '#5fc0e82a' },
  },
};
