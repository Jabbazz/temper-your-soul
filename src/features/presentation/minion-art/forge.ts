import { variant, type MinionArt } from './minion-art';

/*
 * Fucina: ferro, scoria, cuoio e metallo fuso. I nemici hanno il contorno scuro per staccarsi dalla lava.
 */

/** Un folletto di scoria incandescente, spigoloso, con occhi accesi. */
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

/** Scintilla: una stella di luce bianca e gialla che gira. */
const SPARK: MinionArt = {
  frames: [
    ['..ab..', '.abca.', 'abcdca', '.abca.', '..ab..', '......'],
    ['.a..a.', '..cc..', '.cddc.', '..cc..', '.a..a.', '......'],
  ],
  scale: 3,
  palette: { a: '#5a3a10', b: '#fff0b0', c: '#ffd04a', d: '#ffffff' },
  color: '#fff0b0',
  glow: '#ffe080',
  fps: 12,
};

const PEBBLE_BODY = ['..aaaa..', '.abbbba.', 'abcbbcba', 'abbbbbba', 'abbddbba', '.abbbba.', '..aaaa..'];

/** Sassolino di scoria: un sasso con una crepa accesa. */
const PEBBLE: MinionArt = {
  frames: [PEBBLE_BODY, variant(PEBBLE_BODY, { 4: 'abddbbba', 3: 'abbbbdba' })],
  scale: 3,
  palette: { a: '#1a1210', b: '#5a4a42', c: '#ffd04a', d: '#ff6a1a' },
  color: '#b89a7a',
  glow: '',
  fps: 6,
};

const BELLOWS_BODY = ['..aaaaaaaa..', '.abbbbbbbba.', 'abbcbbbbcbba', 'abbbbbbbbbba', 'abdbdbdbdbba', 'abbbbbbbbbba', '.abbbbbbbba.', '..aaaeeaaa..', '.....ee.....', '.....aa.....'];

/** Mantice vivo: cuoio a pieghe, occhi accesi, bocchetta di ferro. */
const BELLOWS: MinionArt = {
  frames: [BELLOWS_BODY, variant(BELLOWS_BODY, { 1: '............', 2: '.abbbbbbbba.', 3: 'abbcbbbbcbba', 4: 'adbdbdbdbdba' })],
  scale: 3,
  palette: { a: '#1a1008', b: '#7a4a2a', c: '#ffd04a', d: '#4a2a18', e: '#9a9aa8' },
  color: '#c89060',
  glow: '',
  fps: 3,
  bob: false,
};

const DEVIL_BODY = ['.a......a.', '.ab....ba.', '..abbbba..', '.abcbbcba.', '.abbddbba.', '..abbbba..', '.aabbbbaa.', 'ab.abba.ba', '...abba...', '..ab..ba..', '..a....a..'];

/** Diavoletto della forgia: rosso con le corna, occhi gialli. */
const DEVIL: MinionArt = {
  frames: [DEVIL_BODY, variant(DEVIL_BODY, { 7: '.babbab...', 9: '..ab.ba...', 10: '..a...a...' })],
  scale: 3,
  palette: { a: '#1a0a0a', b: '#b83a2a', c: '#ffe060', d: '#2a0a0a' },
  color: '#e86a4a',
  glow: '',
  fps: 6,
};

const ANVIL_BODY = [
  'aaaaaaaaaaaaaa',
  'abbbbbbbbbbbba',
  'aaabbbbbbbbaaa',
  '...abcbbcba...',
  '...abbddbba...',
  '...abbbbbba...',
  '..abbbbbbbba..',
  '.abbbbbbbbbba.',
  '.aaaaaaaaaaaa.',
  '..aa......aa..',
  '.aaa......aaa.',
];

/** Incudine animata: ferro scuro, occhi e bocca di brace. */
const ANVIL: MinionArt = {
  frames: [ANVIL_BODY, variant(ANVIL_BODY, { 9: '...aa....aa...', 10: '..aaa....aaa..' })],
  scale: 3,
  palette: { a: '#14141a', b: '#4a4a56', c: '#ffd04a', d: '#ff6a1a' },
  color: '#9a9aa8',
  glow: '',
  fps: 3,
};

const SLAG_BODY = ['....aaaa....', '..aabbbbaa..', '.abbccbbbba.', 'abbbbbbccbba', 'abcbbbbbbcba', 'abbbbddbbbba', '.abbbbbbbba.', '..aabbbbaa..', '....aaaa....'];

/** Colata: una pozza di metallo fuso che ribolle. */
const SLAG: MinionArt = {
  frames: [SLAG_BODY, variant(SLAG_BODY, { 2: '.abbbbccbba.', 3: 'abccbbbbbbba', 4: 'abbbbbbbbcba' })],
  scale: 3,
  palette: { a: '#2a0a00', b: '#ff6a1a', c: '#ffd04a', d: '#ffffff' },
  color: '#ff8a3d',
  glow: '#ff5a00',
  fps: 5,
};

/** Goccia fusa: una colata piccola. */
const DROPLET: MinionArt = {
  frames: [
    ['.aaaa.', 'abccba', 'abbbba', 'abdbba', '.aaaa.'],
    ['.aaaa.', 'abbcba', 'abcbba', 'abbdba', '.aaaa.'],
  ],
  scale: 3,
  palette: { a: '#2a0a00', b: '#ff6a1a', c: '#ffd04a', d: '#ffffff' },
  color: '#ff8a3d',
  glow: '',
  fps: 6,
};

const CRUCIBLE_BODY = ['.aaaaaaaaaa.', 'abccccccccba', 'abcddddddcba', 'aabbbbbbbbaa', '.abbbbbbbba.', '.abbebbebba.', '.abbbbbbbba.', '..abbbbbba..', '..abbbbbba..', '...aaaaaa...', '..aa....aa..', '.aa......aa.'];

/** Crogiolo: pentola di ferro piena di metallo fuso. */
const CRUCIBLE: MinionArt = {
  frames: [CRUCIBLE_BODY, variant(CRUCIBLE_BODY, { 1: 'abcdccccdcba', 2: 'abcccddcccba' })],
  scale: 3,
  palette: { a: '#1a1010', b: '#4a4a52', c: '#ff6a1a', d: '#ffd04a', e: '#ffe060' },
  color: '#ff9a4a',
  glow: '#ff6a1a',
  fps: 3,
  bob: false,
};

export const FORGE_MINION_ART: Readonly<Record<string, MinionArt>> = {
  forge_imp: IMP,
  forge_spark: SPARK,
  forge_pebble: PEBBLE,
  forge_bellows: BELLOWS,
  forge_devil: DEVIL,
  forge_anvil: ANVIL,
  forge_slag: SLAG,
  forge_droplet: DROPLET,
  forge_crucible: CRUCIBLE,
};
