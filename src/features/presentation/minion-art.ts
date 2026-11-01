import { CRYPT_MINION_ART } from './minion-art/crypt';
import { FORGE_MINION_ART } from './minion-art/forge';
import { GLACIER_MINION_ART } from './minion-art/glacier';
import type { MinionArt } from './minion-art/minion-art';
import { SWAMP_MINION_ART } from './minion-art/swamp';

/*
 * Grafica dei servitori: pixel art come matrici di caratteri (vedi `sprites.ts`), due fotogrammi ciascuno, disegnati
 * nel codice (nessun asset esterno), un file per dungeon in `minion-art/`. Solo aspetto: il raggio di colpo sta in
 * `MinionDefinition`.
 */

export type { MinionArt } from './minion-art/minion-art';

export const MINION_ART: Readonly<Record<string, MinionArt>> = {
  ...CRYPT_MINION_ART,
  ...SWAMP_MINION_ART,
  ...FORGE_MINION_ART,
  ...GLACIER_MINION_ART,
};

/** La grafica di un servitore per id d'aspetto; uno sconosciuto usa il fuoco fatuo (un test controlla i dati). */
export function minionArt(visual: string): MinionArt {
  return MINION_ART[visual] ?? MINION_ART.crypt_wisp!;
}
