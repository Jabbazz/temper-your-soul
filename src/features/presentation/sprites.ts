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
