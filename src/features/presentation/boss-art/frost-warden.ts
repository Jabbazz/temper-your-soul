import type { Palette, SpriteFrame } from '../sprites';
import type { BossArt } from './boss-art';

/*
 * Il Custode del ghiaccio: una figura alta e snella con corona di cristallo, grandi spalle sfaccettate e una veste che
 * si spezza in schegge a mezz'aria (silhouette molto diversa dal guardiano, basso e incappucciato). 18 x 20 pixel.
 * Simboli: a contorno, b ghiaccio, c occhi e nucleo, d riflesso, e ombra, f ombra scura, g cristallo viola.
 */

const FROST_WARDEN_IDLE: SpriteFrame = [
  '........aa........',
  '.......adda.......',
  '..a...abddba...a..',
  '..ad.abbddbba.da..',
  '...aabccbbccbaa...',
  '...ababbbbbbaba...',
  '.aagaabbbbbbaagaa.',
  'agggdaebbbbeadggga',
  'agdgdaebbbbeadgdga',
  '.agdaeebccbeeadga.',
  '.afdaeebccbeeadfa.',
  '.afeaeebbbbeeaefa.',
  '.aeeaeebbbbeeaeea.',
  '..a.afebbbbefa.a..',
  '...aafebbbbefaa...',
  '..afeebbbbbbeefa..',
];

/** Cammina cambiando solo le ultime quattro righe (l'orlo della veste, che si frantuma e si ricompone). */
const withHem = (hem: readonly [string, string, string, string]): SpriteFrame => [...FROST_WARDEN_IDLE, ...hem];

const HEM_A: readonly [string, string, string, string] = [
  '.afeebbbbbbbbeefa.',
  'afeeb.bbbbbb.beefa',
  'a.fe..b.ee.b..ef.a',
  '....a..a..a..a....',
];
const HEM_B: readonly [string, string, string, string] = [
  '.afeebbbbbbbbeefa.',
  'afeb.bbbbbbbb.befa',
  'a.fe.b..ee..b.ef.a',
  '....a..a..a..a....',
];

export const FROST_WARDEN_WALK: readonly SpriteFrame[] = [
  withHem(HEM_A),
  withHem(HEM_B),
  withHem(HEM_A),
  withHem(['.afeebbbbbbbbeefa.', 'afeeb.bbbbbb.beefa', 'a.fe.b..ee..b.ef.a', '...a..a....a..a...']),
];

/** Posa di lancio: le braccia si alzano con i cristalli sopra la testa (righe 1-5 diverse). */
export const FROST_WARDEN_CASTING: SpriteFrame = withHem(HEM_A).map((row, i) =>
  i === 1
    ? '......adddda......'
    : i === 2
      ? 'gga...abddba...agg'
      : i === 3
        ? 'gdga.abbddbba.agdg'
        : i === 4
          ? 'agdaabccbbccbaadga'
          : i === 5
            ? 'aaa.ababbbbaba.aaa'
            : row,
);

/** Tavolozza: da rallentato il ghiaccio si spegne e ingrigisce; in furia occhi e nucleo diventano viola acceso. */
export function frostWardenPalette(slowed: boolean, enraged: boolean): Palette {
  return {
    a: '#0a1530',
    b: slowed ? '#a3b3c7' : '#8ec6ee',
    c: enraged ? '#f08bff' : '#7ff4ff',
    d: slowed ? '#e2e8ef' : '#e8f8ff',
    e: slowed ? '#6b7a90' : '#5784b5',
    f: '#2e4a7a',
    g: enraged ? '#d985ff' : '#b79af0',
  };
}

export const FROST_WARDEN_ART: BossArt = {
  walk: FROST_WARDEN_WALK,
  casting: FROST_WARDEN_CASTING,
  scale: 3,
  shadow: { radiusX: 28, radiusY: 9, offsetY: 30 },
  bob: { casting: -4, even: 2, odd: -2 },
  palette: frostWardenPalette,
  drawCastFx(ctx, enraged) {
    ctx.fillStyle = enraged ? '#f6b8ff' : '#c8fbff';
    for (const side of [-1, 1]) {
      ctx.fillRect(side * 31 - 3, -38, 6, 6);
      ctx.fillRect(side * 37 - 1, -47, 3, 3);
      ctx.fillRect(side * 23 - 1, -45, 3, 3);
    }
  },
};
