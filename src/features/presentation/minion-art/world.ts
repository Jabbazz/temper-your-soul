import type { MinionArt } from './minion-art';
import { WORLD_MOB_SHEETS } from './world-mob-sheets';

/*
 * Nemici del mondo aperto: sprite PixelLab 80×80 (stessa tela degli eroi), visti sempre di fronte con la sola
 * camminata, specchiati per andare a destra e a sinistra. Il foglio sta in `world-mob-sheets.ts` (generato); qui
 * colore delle particelle, alone e ritmo. `frames` è un segnaposto vuoto: il disegno viene dal foglio.
 */

const EMPTY = [['.']];

/** Un nemico a foglio: colore delle particelle e ritmo della camminata (fotogrammi al secondo). */
const mob = (visual: string, color: string, fps: number): MinionArt => ({
  frames: EMPTY, scale: 1, palette: {}, color, glow: '', fps, bob: false, walks: true, faces: true, sheet: WORLD_MOB_SHEETS[visual]!,
});

export const WORLD_MINION_ART: Readonly<Record<string, MinionArt>> = {
  crypt_ruin_skeleton: mob('crypt_ruin_skeleton', '#e4dcc0', 9),
  swamp_goblin: mob('swamp_goblin', '#7fc25a', 11),
  swamp_goblin_slinger: mob('swamp_goblin_slinger', '#8a9a52', 9),
  swamp_mushroom_walker: mob('swamp_mushroom_walker', '#c8584a', 8),
  swamp_kobold: mob('swamp_kobold', '#d8703c', 12),
  swamp_grey_wolf: mob('swamp_grey_wolf', '#a8a8a4', 12),
  crypt_zombie: mob('crypt_zombie', '#8c9a74', 6),
  crypt_ghoul: mob('crypt_ghoul', '#7c94a8', 12),
  crypt_cultist: mob('crypt_cultist', '#8a5aa4', 9),
};
