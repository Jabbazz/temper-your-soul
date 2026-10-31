import type { Palette, SpriteFrame } from './sprites';

/*
 * Grafica dei servitori: pixel art come matrici di caratteri (vedi `sprites.ts`), due fotogrammi ciascuno, disegnati
 * nel codice (nessun asset esterno). Solo aspetto: il raggio di colpo sta in `MinionDefinition`.
 */

export interface MinionArt {
  readonly frames: readonly [SpriteFrame, SpriteFrame];
  readonly scale: number;
  readonly palette: Palette;
  /** Colore delle particelle (comparsa, colpo, morte). */
  readonly color: string;
  /** Alone luminoso sotto lo sprite (vuoto = nessuno). */
  readonly glow: string;
}

/** Cripta: un fuoco fatuo di brace con un nucleo bianco e una coda di fiamma. */
const WISP: MinionArt = {
  frames: [
    ['...aa...', '..abba..', '.abccba.', '.bcddcb.', '.bcddcb.', '..bccb..', '...bb...', '..b..b..'],
    ['...aa...', '..abba..', '.abccba.', '.bcddcb.', '.bcddcb.', '..bccb..', '..b.bb..', '...b..b.'],
  ],
  scale: 3,
  palette: { a: '#ffd8a0', b: '#ff8a3c', c: '#ffc46a', d: '#fff6e0' },
  color: '#ffb05c',
  glow: '#ff8a3c',
};

/** Palude: un funghetto con il cappello a macchie e due occhietti. */
const SPORELING: MinionArt = {
  frames: [
    ['..aaaa..', '.abcbba.', 'abbbbcba', 'aaaaaaaa', '..deed..', '..dffd..', '..d..d..', '.dd..dd.'],
    ['..aaaa..', '.abbcba.', 'abcbbbba', 'aaaaaaaa', '..deed..', '..dffd..', '...dd...', '..d..d..'],
  ],
  scale: 3,
  palette: { a: '#1a2414', b: '#7aa046', c: '#d9e86a', d: '#c9b58a', e: '#1a1410', f: '#e8dcc0' },
  color: '#b5d35a',
  glow: '',
};

/** Fucina: un folletto di scoria incandescente, spigoloso, con occhi accesi. */
const IMP: MinionArt = {
  frames: [
    ['.a....a.', '.ab..ba.', '.abbbba.', 'abcbbcba', 'abbddbba', '.abbbba.', '.ab..ba.', '.a....a.'],
    ['a......a', '.ab..ba.', '.abbbba.', 'abcbbcba', 'abbddbba', '.abbbba.', 'ab....ba', '........'],
  ],
  scale: 3,
  palette: { a: '#2a1a14', b: '#7a3a1e', c: '#ffd04a', d: '#ff6a1a' },
  color: '#ff8a3d',
  glow: '#ff5a00',
};

/** Ghiacciaio: una sentinella di cristallo piantata a terra, con un occhio azzurro. */
const SENTINEL: MinionArt = {
  frames: [
    ['...ab...', '..abba..', '.abccba.', '.abdcba.', 'abcccbba', '.abccba.', '.aabbaa.', 'aaa..aaa'],
    ['...ab...', '..abba..', '.abccba.', '.abcdba.', 'abcccbba', '.abccba.', '.aabbaa.', 'aaa..aaa'],
  ],
  scale: 3,
  palette: { a: '#1d3a52', b: '#7fd8ff', c: '#d8f6ff', d: '#2a6cff' },
  color: '#aef0ff',
  glow: '#6fd8ff',
};

export const MINION_ART: Readonly<Record<string, MinionArt>> = {
  crypt_wisp: WISP,
  swamp_sporeling: SPORELING,
  forge_imp: IMP,
  glacier_sentinel: SENTINEL,
};

/** La grafica di un servitore per id d'aspetto; uno sconosciuto usa il fuoco fatuo (un test controlla i dati). */
export function minionArt(visual: string): MinionArt {
  return MINION_ART[visual] ?? WISP;
}
