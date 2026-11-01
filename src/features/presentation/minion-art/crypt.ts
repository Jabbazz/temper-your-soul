import { variant, type MinionArt } from './minion-art';

/*
 * Cripta: cera, ossa, pietra e bronzo; gli occhi accesi del colore della brace dell'Ordine.
 */

/** Un fuoco fatuo di brace con un nucleo bianco e una coda di fiamma. */
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

const CANDLE_BODY = ['...cd...', '..cddc..', '...dd...', '..aeea..', '.aeeeea.', '.aeffea.', '.aeeeea.', '.aeeeea.', '.aegeea.', '.aeeeea.', 'aaeeeeaa', 'abbbbbba'];

/** Cero vivo: una candela con due occhi e la fiamma che guizza. */
const CANDLE: MinionArt = {
  frames: [CANDLE_BODY, variant(CANDLE_BODY, { 0: '..dc....', 1: '..cddc..', 2: '..dd....' })],
  scale: 3,
  palette: { a: '#2a1f1a', b: '#a8823c', c: '#ffd27a', d: '#fff3c4', e: '#efe2c6', f: '#3a2420', g: '#d8c8a8' },
  color: '#ffe0a0',
  glow: '#ffcf6a',
  fps: 8,
  bob: false,
};

/** Pipistrello del campanile: ali su e giu', occhi rossi. */
const BAT: MinionArt = {
  frames: [
    ['b.........b', 'bb.......bb', '.bb.aaa.bb.', '..bbacabb..', '...abbba...', '....a.a....'],
    ['...........', '....aaa....', '.bbbacabbb.', 'bbbbbbbbbbb', 'b..abbba..b', '....a.a....'],
  ],
  scale: 3,
  palette: { a: '#1a1420', b: '#4a3a5c', c: '#ff6a5a' },
  color: '#8a6aa8',
  glow: '',
  fps: 10,
};

const SKELETON_BODY = ['..aaaa..', '.abbbba.', '.abcbca.', '.abbbba.', '..abba..', '.aabbaa.', 'ab.bb.ba', 'a.abba.a', '..abba..', '..a..a..', '.aa..aa.'];

/** Ossario: uno scheletro con gli occhi di brace. */
const SKELETON: MinionArt = {
  frames: [SKELETON_BODY, variant(SKELETON_BODY, { 6: '.abbbba.', 7: '.aabbaa.', 9: '.a...a..', 10: 'aa....a.' })],
  scale: 3,
  palette: { a: '#2a2620', b: '#e8dfc8', c: '#ff8a4c' },
  color: '#e8dfc8',
  glow: '',
};

const GARGOYLE_BODY = [
  '.a........a.',
  'aba.aaaa.aba',
  'abbabbbbabba',
  '.abbbcbcbba.',
  '..abbbbbba..',
  '.abbbddbbba.',
  'abbabbbbabba',
  'ab..abba..ba',
  '....a..a....',
  '...aa..aa...',
];

/** Doccione: piccolo gargoyle di pietra; da sveglio gli occhi si accendono. */
const GARGOYLE: MinionArt = {
  frames: [GARGOYLE_BODY, variant(GARGOYLE_BODY, { 0: 'a..........a', 1: 'ba..aaaa..ab', 6: '.abbbbbbbba.', 7: '..a.abba.a..' })],
  scale: 3,
  palette: { a: '#1c1c24', b: '#7a7884', c: '#ffb36b', d: '#3a3440' },
  color: '#b8b4c0',
  glow: '',
  fps: 8,
};

const ACOLYTE_BODY = [
  '...aaa....',
  '..abbba...',
  '.abbbbba..',
  '.abcdcba..',
  '.abdddba..',
  '..abbba.a.',
  '.abbbbbaa.',
  'abbebbbba.',
  'abbbbbbbf.',
  'abbbbbba.f',
  '.abbbbba..',
  '..aa.aa...',
];

/** Accolito turiferario: tonaca prugna, incensiere acceso che oscilla. */
const ACOLYTE: MinionArt = {
  frames: [ACOLYTE_BODY, variant(ACOLYTE_BODY, { 7: 'abbebbbbae', 8: 'abbbbbbbf.', 9: 'abbbbbbaf.' })],
  scale: 3,
  palette: { a: '#1c1420', b: '#5a2e3c', c: '#ffcf8a', d: '#2a1820', e: '#a8823c', f: '#ffb05c' },
  color: '#c88a9a',
  glow: '',
  fps: 4,
};

const BELL_BODY = [
  '....aaaa....',
  '...abbbba...',
  '..abbcbbba..',
  '..abbbbbba..',
  '.abbbbbbbba.',
  '.abbcbbcbba.',
  '.abbbbbbbba.',
  'abbbbbbbbbba',
  'abbbbbbbbbba',
  'aaaaaaaaaaaa',
  '....adda....',
  '.....aa.....',
];

/** Campana del vespro: bronzo con il batacchio che dondola. */
const BELL: MinionArt = {
  frames: [BELL_BODY, variant(BELL_BODY, { 10: '...adda.....', 11: '...aa.......' })],
  scale: 3,
  palette: { a: '#2a1c10', b: '#b8863c', c: '#e8c070', d: '#5a3a18' },
  color: '#e8c070',
  glow: '',
  fps: 3,
  bob: false,
};

const RELIQUARY_BODY = [
  'aaaaaaaaaaaa',
  'abbbbbbbbbba',
  'abcccbbcccba',
  'abcdcbbcdcba',
  'abbbbbbbbbba',
  'aeeeeeeeeeea',
  'abffbffbffba',
  'abbbbbbbbbba',
  'abbbbbbbbbba',
  'aaaaaaaaaaaa',
];

/** Reliquiario: cassa d'ossa con le fessure accese. */
const RELIQUARY: MinionArt = {
  frames: [RELIQUARY_BODY, variant(RELIQUARY_BODY, { 6: 'abggbggbggba' })],
  scale: 3,
  palette: { a: '#1a1410', b: '#d8ccb0', c: '#efe6d0', d: '#2a1a10', e: '#a8823c', f: '#ff8a4c', g: '#ffd27a' },
  color: '#ffcf8a',
  glow: '#ff8a3c',
  fps: 3,
  bob: false,
};

export const CRYPT_MINION_ART: Readonly<Record<string, MinionArt>> = {
  crypt_wisp: WISP,
  crypt_candle: CANDLE,
  crypt_bat: BAT,
  crypt_skeleton: SKELETON,
  crypt_gargoyle: GARGOYLE,
  crypt_acolyte: ACOLYTE,
  crypt_bell: BELL,
  crypt_reliquary: RELIQUARY,
};
