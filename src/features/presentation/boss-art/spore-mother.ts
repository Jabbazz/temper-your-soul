import type { Palette, SpriteFrame } from '../sprites';
import type { BossArt } from './boss-art';

/*
 * La Madre delle Spore: un fungo gigante con un grosso cappello a macchie, un tronco con due occhi e radici al posto
 * delle gambe. Silhouette larga in alto e a punta in basso, opposta a quella del guardiano. Pixel art 20 x 19.
 */

/** Cappello (righe 0-8) e tronco (righe 9-14): uguali in tutti i fotogrammi tranne la posa di lancio. */
const BODY: readonly string[] = [
  '.......aaaaaa.......',
  '.....aabbbbbbaa.....',
  '...aabbbcbbbbcbbaa..',
  '..abbbbbbbbbbbbbbba.',
  '.abbcccbbbbbbbbccbba',
  'abbbcccbbbbbbbbbcbba',
  'abbbbbbbbbbbbbbbbbba',
  'aaggggggggggggggggaa',
  '.aaaeeeeeeeeeeeeeaaa',
  '.....adddddddda.....',
  '.....adffddffda.....',
  '.....adeeeeeeda.....',
  '.....adddddddda.....',
  '....aaddddddddaa....',
  '...aaeddddddddeaa...',
];

/** Radici (righe 15-18): si alternano per far "camminare" il boss. */
const ROOTS = {
  idle: ['..ahhaeedddddeehha..', '.ahha.aeeeeeea.ahha.', 'ahha..aaaaaaa..ahha.', 'hha..............ahh'],
  stepA: ['..ahhaeedddddeehha..', '.ahha.aeeeeeea..ahha', 'ahha..aaaaaaa.ahha..', 'hha.............ahh.'],
  stepB: ['..ahhaeedddddeehha..', '.ahha..aeeeeeea.ahha', '.ahha..aaaaaaa.ahha.', '..ahh...........hha.'],
} as const;

const withRoots = (roots: readonly string[]): SpriteFrame => [...BODY, ...roots];

const IDLE = withRoots(ROOTS.idle);

export const SPORE_MOTHER_WALK: readonly SpriteFrame[] = [IDLE, withRoots(ROOTS.stepA), IDLE, withRoots(ROOTS.stepB)];

/** Posa di lancio: il cappello si apre (branchie accese), gli occhi si spalancano e la bocca si apre; spore sopra. */
export const SPORE_MOTHER_CASTING: SpriteFrame = [
  ...BODY.map((row, i) =>
    i === 0
      ? '....f..aaaaaa..f....'
      : i === 7
        ? 'aaffffffffffffffffaa'
        : i === 10
          ? '.....adffffffda.....'
          : i === 11
            ? '.....adeffffeda.....'
            : row,
  ),
  ...ROOTS.idle,
];

/** Tavolozza: cambia con il gelo (colori spenti e azzurrini) e con la furia (macchie e occhi viola, brillanti). */
export function sporeMotherPalette(slowed: boolean, enraged: boolean): Palette {
  return {
    a: '#0f1510',
    b: slowed ? '#566f77' : enraged ? '#4d5a2a' : '#46662b',
    c: enraged ? '#c27cff' : '#cfdc5c',
    d: slowed ? '#7d8a86' : '#8c7a3a',
    e: slowed ? '#52605f' : '#5b4d25',
    f: enraged ? '#ff6fd8' : '#eaff7e',
    g: slowed ? '#2f4046' : '#2b3d1a',
    h: slowed ? '#44606a' : '#395a28',
  };
}

export const SPORE_MOTHER_ART: BossArt = {
  walk: SPORE_MOTHER_WALK,
  casting: SPORE_MOTHER_CASTING,
  scale: 3,
  shadow: { radiusX: 36, radiusY: 12, offsetY: 28 },
  // Si muove piano: il dondolo e' lieve.
  bob: { casting: -3, even: 1, odd: 0 },
  palette: sporeMotherPalette,
  drawCastFx(ctx, enraged) {
    // Spore che salgono dal cappello.
    ctx.fillStyle = enraged ? '#ff6fd8' : '#eaff7e';
    for (const side of [-1, 1]) {
      ctx.fillRect(side * 22 - 2, -34, 5, 5);
      ctx.fillRect(side * 30 - 1, -42, 3, 3);
      ctx.fillRect(side * 14, -46, 3, 3);
    }
  },
};
