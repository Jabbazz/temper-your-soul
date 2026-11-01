import { variant, type MinionArt } from './minion-art';

/*
 * Palude: funghi, fango, muschio e veleno; verdi spenti con accenti viola e gialli.
 */

/** Uno sporello: funghetto con il cappello a macchie e due occhietti. */
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

const PUFF_BODY = ['...aaaa...', '..abbbba..', '.abbcbbba.', 'abbbbbcbba', 'abcbbbbbba', 'abbbbbbbba', '.abdbbdba.', '..abbbba..', '...aaaa...'];

/** Vescia: palla di spore che si gonfia e sgonfia. */
const PUFFBALL: MinionArt = {
  frames: [PUFF_BODY, variant(PUFF_BODY, { 0: '..........', 1: '...aaaa...', 2: '.aabbbbaa.', 7: '.aabbbbaa.', 8: '..aaaaaa..' })],
  scale: 3,
  palette: { a: '#2a2414', b: '#c9b07a', c: '#e8dca0', d: '#1a1410' },
  color: '#d8cf8a',
  glow: '',
  fps: 4,
};

/** Zanzara di torbiera: ali traslucide e addome luminoso. */
const GNAT: MinionArt = {
  frames: [
    ['b.....b', 'bb.a.bb', '.babab.', '..aca..', '...a...'],
    ['.......', 'bb.a.bb', 'bbbabbb', '..aca..', '...a...'],
  ],
  scale: 3,
  palette: { a: '#1a2010', b: '#a8d0c0', c: '#d0ff60' },
  color: '#c8f070',
  glow: '#a8e040',
  fps: 12,
};

const TOAD_BODY = ['..aa....aa..', '.abca..acba.', '.abbbaabbba.', 'abbbbbbbbbba', 'abddddddddba', 'abbbbbbbbbba', '.abba..abba.', 'aa.a....a.aa'];

/** Rospo di torbiera: occhi gialli sporgenti, pancia chiara. */
const TOAD: MinionArt = {
  frames: [TOAD_BODY, variant(TOAD_BODY, { 3: 'abbbbbbbbbba', 6: 'abba....abba', 7: 'aaa......aaa' })],
  scale: 3,
  palette: { a: '#1a2410', b: '#5a8a3a', c: '#ffe060', d: '#c8d870' },
  color: '#8ab84a',
  glow: '',
  fps: 3,
};

const FLOWER_BODY = ['...aa.aa...', '..abbabba..', '.abbbcbbba.', '.abbcdcbba.', '..abbcbba..', '...abbba...', '....aea....', '..a.aea.a..', '.aea.e.aea.', '..aaaeaaa..', '....aea....', '...aaaaa...'];

/** Fiore sputaveleno: petali viola e una bocca scura al centro. */
const FLOWER: MinionArt = {
  frames: [FLOWER_BODY, variant(FLOWER_BODY, { 2: '.abbbbbbba.', 3: '.abbcccbba.', 4: '..abbbbba..' })],
  scale: 3,
  palette: { a: '#1a1a10', b: '#b04aa0', c: '#e070d0', d: '#2a0a20', e: '#5a9a3a' },
  color: '#d070c0',
  glow: '',
  fps: 3,
  bob: false,
};

const WORM_BODY = ['..aaaa...', '.abbbba..', 'abcbbcba.', 'abbddbba.', '.abbbba..', '..abba...', '..abbba..', '...abba..', '..abbba..', '.aeeeeea.'];

/** Verme delle radici, quando e' fuori dal fango. */
const WORM: MinionArt = {
  frames: [WORM_BODY, variant(WORM_BODY, { 5: '...abba..', 6: '...abbba.', 7: '..abba...', 8: '..abbba..' })],
  scale: 3,
  palette: { a: '#1a1008', b: '#8a5a3a', c: '#ffe080', d: '#3a1a10', e: '#3a3020' },
  color: '#a87a4a',
  glow: '',
  fps: 5,
};

const SNAIL_BODY = [
  '.....aaaa.....',
  '....abbbba....',
  '...abbcbbba...',
  '..abbcccbbba..',
  '..abbcbcbbba..',
  '..abbbbbbbba..',
  '.aaabbbbbbaaa.',
  'adddaaaaaaddda',
  'adeddddddddeda',
  '.aaaaaaaaaaaa.',
];

/** Lumaca di muschio: guscio coperto di muschio, corpo viscido. */
const SNAIL: MinionArt = {
  frames: [SNAIL_BODY, variant(SNAIL_BODY, { 7: 'adddaaaaaadddd', 8: 'adedddddddddea' })],
  scale: 3,
  palette: { a: '#141a10', b: '#4a6a3a', c: '#8ab05a', d: '#a8a070', e: '#1a1410' },
  color: '#8ab05a',
  glow: '',
  fps: 2,
};

const RING_BODY = ['....ab..ab....', '..abba..abba..', 'ab..aa..aa..ab', 'abba......abba', '.aa........aa.', 'abba......abba', 'ab..ab..ab..ab', '..abba..abba..', '....aa..aa....'];

/** Cerchio delle fate: un anello di funghi luminosi. */
const FAIRY_RING: MinionArt = {
  frames: [RING_BODY, variant(RING_BODY, { 0: '....ac..ac....', 6: 'ac..ac..ac..ac' })],
  scale: 3,
  palette: { a: '#1a1a12', b: '#d080f0', c: '#f0c0ff' },
  color: '#d080f0',
  glow: '#b060e0',
  fps: 2,
  bob: false,
};

export const SWAMP_MINION_ART: Readonly<Record<string, MinionArt>> = {
  swamp_sporeling: SPORELING,
  swamp_puffball: PUFFBALL,
  swamp_gnat: GNAT,
  swamp_toad: TOAD,
  swamp_flower: FLOWER,
  swamp_worm: WORM,
  swamp_snail: SNAIL,
  swamp_fairy_ring: FAIRY_RING,
};
