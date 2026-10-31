import type { Palette, SpriteFrame } from '../sprites';
import type { BossArt } from './boss-art';

/*
 * Il colosso della fornace: 22 x 20 "pixel", il doppio piu' largo del guardiano: elmo con due camini, spalle a incudine,
 * fornace accesa nel petto e pugni a forma di incudine. I simboli sono: a contorno, b ferro, c ferro lucido, d ferro
 * scuro, e/f/g lava (alone, nucleo, brace), h ottone.
 */

const COLOSSUS_IDLE: SpriteFrame = [
  '......aa......aa......',
  '......ada....ada......',
  '.....abbbbbbbbbba.....',
  '....abbbbcbbcbbbba....',
  '....abbeeffffeebba....',
  '....abbbbbbbbbbbba....',
  '.....adddddddddda.....',
  '.aaaabbbbbbbbbbbbaaaa.',
  'aabbbbcbbbbbbbbcbbbbaa',
  'abccbbbbbddddbbbbbccba',
  'abcbbbaegfeefgeabbbcba',
  'abbbbbafffggfffabbbbba',
  '.abbbbaegfeefgeabbbba.',
  'aaaabbaaddddddaabbaaaa',
  'abccabbbhhhhhhbbbaccba',
  'abbbabbbbb..bbbbbabbba',
  '.aaaabccbb..bbccbaaaa.',
  '....abbbbd..dbbbba....',
  '....aabbba..abbbaa....',
  '....aaaaaa..aaaaaa....',
];

/** Passo con la gamba sinistra sollevata e i pugni che oscillano in controfase. */
const COLOSSUS_STEP_LEFT: SpriteFrame = [
  '......aa......aa......',
  '......ada....ada......',
  '.....abbbbbbbbbba.....',
  '....abbbbcbbcbbbba....',
  '....abbeeffffeebba....',
  '....abbbbbbbbbbbba....',
  '.....adddddddddda.....',
  '.aaaabbbbbbbbbbbbaaaa.',
  'aabbbbcbbbbbbbbcbbbbaa',
  'abccbbbbbddddbbbbbccba',
  'abcbbbaegfeefgeabbbcba',
  'abbbbbafffggfffabbbbba',
  '.abbbbaegfeefgeabbbbaa',
  '.aaabbaaddddddaabbaaba',
  'aaaaabbbhhhhhhbbbabbba',
  'abccabbbbb..bbbbbaaaa.',
  'abbbabccbb..bbccba....',
  '.aaaaabbba..dbbbba....',
  '....aaaaaa..abbbaa....',
  '............aaaaaa....',
];

/** Passo con la gamba destra sollevata. */
const COLOSSUS_STEP_RIGHT: SpriteFrame = [
  '......aa......aa......',
  '......ada....ada......',
  '.....abbbbbbbbbba.....',
  '....abbbbcbbcbbbba....',
  '....abbeeffffeebba....',
  '....abbbbbbbbbbbba....',
  '.....adddddddddda.....',
  '.aaaabbbbbbbbbbbbaaaa.',
  'aabbbbcbbbbbbbbcbbbbaa',
  'abccbbbbbddddbbbbbccba',
  'abcbbbaegfeefgeabbbcba',
  'abbbbbafffggfffabbbbba',
  'aabbbbaegfeefgeabbbba.',
  'abaabbaaddddddaabbaaa.',
  'abbbabbbhhhhhhbbbaaaaa',
  '.aaaabbbbb..bbbbbaccba',
  '....abccbb..bbccbabbba',
  '....abbbbd..abbbaaaaa.',
  '....aabbba..aaaaaa....',
  '....aaaaaa............',
];

export const FORGE_COLOSSUS_WALK: readonly SpriteFrame[] = [COLOSSUS_IDLE, COLOSSUS_STEP_LEFT, COLOSSUS_IDLE, COLOSSUS_STEP_RIGHT];

/** Posa di lancio: i due pugni alzati sopra la testa, pronti a calare. */
export const FORGE_COLOSSUS_CASTING: SpriteFrame = [
  '......aa......aa......',
  '......ada....ada......',
  '.abbaabbbbbbbbbbaabba.',
  '.abbabbbbcbbcbbbbabba.',
  'aaaaabbeeffffeebbaaaaa',
  'abccabbbbbbbbbbbbaccba',
  'abbbbaddddddddddabbbba',
  '.aaaabbbbbbbbbbbbaaaa.',
  'aabbbbcbbbbbbbbcbbbbaa',
  'abccbbbbbddddbbbbbccba',
  'abcbbbaegfeefgeabbbcba',
  'abbbbbafffggfffabbbbba',
  '.abbbbaegfeefgeabbbba.',
  '..aabbaaddddddaabbaa..',
  '....abbbhhhhhhbbba....',
  '....abbbbb..bbbbba....',
  '....abccbb..bbccba....',
  '....abbbbd..dbbbba....',
  '....aabbba..abbbaa....',
  '....aaaaaa..aaaaaa....',
];

/**
 * Tavolozza: con il gelo il ferro diventa grigio-azzurro e la lava si spegne in brace opaca; in furia la fornace
 * passa dall'arancio al giallo-bianco.
 */
export function forgeColossusPalette(slowed: boolean, enraged: boolean): Palette {
  const lava = enraged
    ? { e: '#ffb02e', f: '#fff2a8', g: '#ff4b1f' }
    : { e: '#ff7a1f', f: '#ffd070', g: '#c83e16' };
  const cooled = enraged
    ? { e: '#c9743a', f: '#e8c9a0', g: '#a03a22' }
    : { e: '#8f4a3a', f: '#c9a091', g: '#5e2a22' };
  return {
    a: '#0d0a09',
    b: slowed ? '#5d6770' : '#57504a',
    c: slowed ? '#8fa0ab' : '#8a8179',
    d: slowed ? '#2f363b' : '#2e2926',
    h: slowed ? '#7d7f7c' : '#b08a4a',
    ...(slowed ? cooled : lava),
  };
}

export const FORGE_COLOSSUS_ART: BossArt = {
  walk: FORGE_COLOSSUS_WALK,
  casting: FORGE_COLOSSUS_CASTING,
  scale: 3,
  shadow: { radiusX: 46, radiusY: 13, offsetY: 28 },
  // Boss pesante: oscilla poco da fermo e si solleva quando alza i pugni.
  bob: { casting: -4, even: 2, odd: 0 },
  palette: forgeColossusPalette,
  drawCastFx(ctx, enraged) {
    // Scintille attorno ai pugni sollevati (coordinate dello sprite).
    ctx.fillStyle = enraged ? '#fff2a8' : '#ffb347';
    for (const side of [-1, 1]) {
      ctx.fillRect(side * 40 - 3, -38, 6, 6);
      ctx.fillRect(side * 47, -30, 3, 3);
      ctx.fillRect(side * 33, -46, 3, 3);
    }
  },
};
