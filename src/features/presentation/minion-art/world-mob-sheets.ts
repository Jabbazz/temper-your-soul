// GENERATO da tools/arte/prepara-nemici.mjs dalle esportazioni PixelLab: non modificare a mano.
// Per rigenerarlo: node tools/arte/prepara-nemici.mjs <cartella esterna con una sottocartella per nemico>.

/**
 * Il foglio della camminata di un nemico del mondo: fotogrammi quadrati di lato `cell` affiancati, visti di fronte.
 * `feetX`/`feetY` sono il punto dei piedi nella cella, `top` la prima riga della figura.
 */
export interface MobSheet { readonly url: string; readonly cell: number; readonly frames: number; readonly feetX: number; readonly feetY: number; readonly top: number }

export const WORLD_MOB_SHEETS: Readonly<Record<string, MobSheet>> = {
  crypt_cultist: { url: new URL('../../../assets/characters/enemies/crypt_cultist.png', import.meta.url).href, cell: 80, frames: 8, feetX: 40, feetY: 66, top: 15 },
  crypt_ghoul: { url: new URL('../../../assets/characters/enemies/crypt_ghoul.png', import.meta.url).href, cell: 80, frames: 8, feetX: 41, feetY: 66, top: 15 },
  crypt_ruin_skeleton: { url: new URL('../../../assets/characters/enemies/crypt_ruin_skeleton.png', import.meta.url).href, cell: 80, frames: 8, feetX: 41, feetY: 67, top: 14 },
  crypt_zombie: { url: new URL('../../../assets/characters/enemies/crypt_zombie.png', import.meta.url).href, cell: 80, frames: 8, feetX: 40, feetY: 65, top: 15 },
  swamp_goblin: { url: new URL('../../../assets/characters/enemies/swamp_goblin.png', import.meta.url).href, cell: 80, frames: 8, feetX: 40, feetY: 66, top: 16 },
  swamp_goblin_slinger: { url: new URL('../../../assets/characters/enemies/swamp_goblin_slinger.png', import.meta.url).href, cell: 80, frames: 8, feetX: 41, feetY: 65, top: 16 },
  swamp_grey_wolf: { url: new URL('../../../assets/characters/enemies/swamp_grey_wolf.png', import.meta.url).href, cell: 80, frames: 8, feetX: 40, feetY: 66, top: 12 },
  swamp_kobold: { url: new URL('../../../assets/characters/enemies/swamp_kobold.png', import.meta.url).href, cell: 80, frames: 8, feetX: 40, feetY: 66, top: 15 },
  swamp_mushroom_walker: { url: new URL('../../../assets/characters/enemies/swamp_mushroom_walker.png', import.meta.url).href, cell: 80, frames: 8, feetX: 40, feetY: 64, top: 16 },
};
