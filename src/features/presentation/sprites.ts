/**
 * Pixel art definita come matrici di caratteri: ogni carattere e' un colore della tavolozza, il punto e' trasparente.
 * Disegni ereditati dal prototipo.
 */
export type SpriteFrame = readonly string[];
export type Palette = Readonly<Record<string, string>>;

// --- Mago ---------------------------------------------------------------------------------------------------------

const MAGE_IDLE: SpriteFrame = [
  '....aa......',
  '...abba.....',
  '..abbbba....',
  '.abbbbba....',
  'aaaaaaa.....',
  '..cssc..d...',
  '..cssc..de..',
  '...ff...d...',
  '..fggf..d...',
  '.ffggff.d...',
  '.fggggf.d...',
  '..gggg..d...',
  '..g..g......',
  '.cc..cc.....',
];

/** Camminata: piedi, tunica, maniche e bastone si alternano su quattro fotogrammi. */
export const MAGE_WALK: readonly SpriteFrame[] = [
  MAGE_IDLE,
  [
    '....aa......',
    '...abba.....',
    '..abbbba....',
    '.abbbbba....',
    'aaaaaaa.....',
    '..cssc...d..',
    '..cssc...de.',
    '...ff....d..',
    '..fggff..d..',
    '.ffgggf..d..',
    '..ggggf..d..',
    '..gggg...d..',
    '.gg..g......',
    '.cc...cc....',
  ],
  MAGE_IDLE,
  [
    '....aa......',
    '...abba.....',
    '..abbbba....',
    '.abbbbba....',
    'aaaaaaa.....',
    '..cssc.d....',
    '..cssc.de...',
    '...ff..d....',
    '.ffggf.d....',
    '.fgggffd....',
    '.fgggg.d....',
    '..gggg.d....',
    '..g..gg.....',
    '..cc..cc....',
  ],
];

export const MAGE_CASTING: SpriteFrame = [
  '....aa......',
  '...abba.....',
  '..abbbba....',
  '.abbbbba..e.',
  'aaaaaaa..dd.',
  '..cssc...d..',
  '..cssc.ffd..',
  '...ffff..d..',
  '..fggf...d..',
  '.ffggf......',
  '.fggggf.....',
  '..gggg......',
  '..g..g......',
  '.cc..cc.....',
];

export const MAGE_PALETTE: Palette = {
  a: '#302646',
  b: '#a485dc',
  c: '#262638',
  s: '#efcba9',
  d: '#a38256',
  e: '#a2e8ef',
  f: '#694795',
  g: '#8d65be',
};

// --- Guardiano ----------------------------------------------------------------------------------------------------

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

// --- Disegno ------------------------------------------------------------------------------------------------------

/** Disegna una matrice di caratteri centrata su (x, y), con pixel quadrati di lato `scale`. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame,
  x: number,
  y: number,
  scale: number,
  palette: Palette,
): void {
  frame.forEach((row, j) => {
    [...row].forEach((symbol, i) => {
      const color = palette[symbol];
      if (color === undefined) return;
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.round(x + (i - row.length / 2) * scale),
        Math.round(y + (j - frame.length / 2) * scale),
        scale,
        scale,
      );
    });
  });
}
