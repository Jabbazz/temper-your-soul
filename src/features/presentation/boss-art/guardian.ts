import type { Palette, SpriteFrame } from '../sprites';
import type { BossArt } from './boss-art';

const GUARDIAN_IDLE: SpriteFrame = [
  '....aa....aa....',
  '...abba..abba...',
  '...abbbbbbbba...',
  '..abbbbbbbbbba..',
  '.abccbbbbcccbba.',
  '.abbcbbbbbcbbba.',
  '..abbbddbbbba...',
  '...abddddbba....',
  '..aabbbbbbaa....',
  '.aeeebbbbeeea...',
  'aeeeebbbbeeeea..',
  'aeeefbbbbfeeea..',
  '.aafbbddbbfaa...',
  '...fbbddbbf.....',
  '..ffbbbbbbff....',
  '..ff......ff....',
  '.aaa......aaa...',
];

/** Cammina cambiando solo le ultime tre righe (i piedi). */
const withFeet = (feet: readonly [string, string, string]): SpriteFrame =>
  GUARDIAN_IDLE.map((row, i) => (i >= 14 ? feet[i - 14]! : row));

export const GUARDIAN_WALK: readonly SpriteFrame[] = [
  GUARDIAN_IDLE,
  withFeet(['..fffbbbbff.....', '...ff....fff....', '..aaa...aaa.....']),
  GUARDIAN_IDLE,
  withFeet(['...ffbbbbfff....', '..fff....ff.....', '.aaa......aaa...']),
];

/** Posa di lancio: braccia sollevate (righe 7-10 diverse). */
export const GUARDIAN_CASTING: SpriteFrame = GUARDIAN_IDLE.map((row, i) =>
  i === 7
    ? 'aeeabddddbbaeea.'
    : i === 8
      ? 'aeeabbbbbbaaeea.'
      : i === 9
        ? '.aeeebbbbeeea...'
        : i === 10
          ? '..aeebbbbeea....'
          : row,
);

/** Tavolozza del guardiano: cambia con il gelo (corpo) e con la furia (occhi e rune). */
export function guardianPalette(slowed: boolean, enraged: boolean): Palette {
  return {
    a: '#141823',
    b: slowed ? '#658999' : '#777783',
    c: enraged ? '#ff755d' : '#ffd38b',
    d: '#dca375',
    e: '#555461',
    f: '#424753',
  };
}

export const GUARDIAN_ART: BossArt = {
  walk: GUARDIAN_WALK,
  casting: GUARDIAN_CASTING,
  scale: 3,
  shadow: { radiusX: 30, radiusY: 10, offsetY: 25 },
  bob: { casting: -3, even: 1, odd: -1 },
  palette: guardianPalette,
  drawCastFx(ctx, enraged) {
    ctx.fillStyle = enraged ? '#ff795a' : '#ffd38b';
    for (const side of [-1, 1]) {
      ctx.fillRect(side * 25 - 3, -13, 6, 6);
      ctx.fillRect(side * 29 - 1, -20, 3, 3);
    }
  },
};
