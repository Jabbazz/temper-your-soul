import { variant, type MinionArt } from './minion-art';

/*
 * Cripta, vene B e C. Catacombe: ossa, lumini verde freddo, terra di sepoltura. Cantoria: cotte bianche, tonache
 * rosse, stagno, bronzo e legno del coro, con il lilla delle note.
 */

// --- Catacombe ---------------------------------------------------------------------------------------------------

const SKULL_BODY = ['.aaaaa.', 'abbbbba', 'abcbcba', 'abbbbba', '.abdba.', '.ababa.', '..aaa..'];

/** Teschio saltellante: occhi verde freddo; nel secondo fotogramma e' schiacciato a terra. */
const SKULL: MinionArt = {
  frames: [SKULL_BODY, ['.......', '.aaaaa.', 'abbbbba', 'abcbcba', 'abbbbba', '.abdba.', '.aaaaa.']],
  scale: 3,
  palette: { a: '#2a2620', b: '#e8dfc8', c: '#9fe0b0', d: '#5a5040' },
  color: '#e8dfc8',
  glow: '',
  fps: 6,
};

const RAT_BODY = ['......aa.', '.aaaaabca', 'abbbbbbba', 'aabbbbaa.', 'd.a..a...'];

/** Ratto dei loculi: pelo grigio-viola, occhi rossi, coda lunga. */
const RAT: MinionArt = {
  frames: [RAT_BODY, variant(RAT_BODY, { 4: '.da.a....' })],
  scale: 3,
  palette: { a: '#1a1620', b: '#5a5260', c: '#ff6a5a', d: '#8a7a80' },
  color: '#8a7a90',
  glow: '',
  fps: 10,
};

const GRAVEDIGGER_BODY = [
  '...aaa....',
  '..abbba...',
  '.abbbbba..',
  '.abcbcba.e',
  '..abbba..e',
  '.aadddaa.e',
  'adddddddae',
  'addddddda.',
  '.addddda.e',
  '..ad.da.ff',
  '..aa.aa.ff',
];

/** Becchino: cappuccio, cappotto liso e la vanga che sale e scende. */
const GRAVEDIGGER: MinionArt = {
  frames: [GRAVEDIGGER_BODY, variant(GRAVEDIGGER_BODY, { 3: '.abcbcba.f', 4: '..abbba.ff', 8: '.addddda.e', 9: '..ad.da..e', 10: '..aa.aa..e' })],
  scale: 3,
  palette: { a: '#14101a', b: '#3a3040', c: '#9fe0b0', d: '#4a4050', e: '#8a7a60', f: '#a8a0b0' },
  color: '#8a7a60',
  glow: '',
  fps: 4,
};

const LANTERN_BODY = ['..aa..', '.a..a.', 'aaaaaa', 'abccba', 'acddca', 'acddca', 'abccba', 'aaaaaa', '..ee..', '.eeee.'];

/** Lanterna cimiteriale: vetri verdi e una fiammella che guizza; spenta sembra un palo. */
const LANTERN: MinionArt = {
  frames: [LANTERN_BODY, variant(LANTERN_BODY, { 4: 'acdcca', 5: 'accdca' })],
  scale: 3,
  palette: { a: '#1a1814', b: '#3a3428', c: '#9fe0b0', d: '#f0fff0', e: '#2a2620' },
  color: '#d8f0c0',
  glow: '#9fe0b0',
  fps: 8,
  bob: false,
};

const MOURNER_BODY = [
  '...aaa...',
  '..abbba..',
  '.abbbbba.',
  '.abcbcba.',
  '.abdbdba.',
  '.abbbbba.',
  'abbbbbbba',
  'abbbbbbba',
  'abbbbbbba',
  'abbbbbbba',
  '.abbbbba.',
  '..aa.aa..',
];

/** Prefica velata: velo lilla scuro, lacrime azzurre che scendono. */
const MOURNER: MinionArt = {
  frames: [MOURNER_BODY, variant(MOURNER_BODY, { 4: '.abbbbba.', 5: '.abdbdba.' })],
  scale: 3,
  palette: { a: '#14101a', b: '#4a4458', c: '#e8e4f0', d: '#b8d8ff' },
  color: '#b8d8ff',
  glow: '',
  fps: 3,
};

const BONE_COLOSSUS_BODY = [
  '....aaaa....',
  '...abbbba...',
  '...acbbca...',
  '.aaaabbaaaa.',
  'abbbaddabbba',
  'acbcaddacbca',
  'abbbddddbbba',
  'adddbddbddda',
  'addbddddbdda',
  'adddddddddda',
  '.addaaaadda.',
  '.aa......aa.',
];

/** Colosso d'ossa: un cumulo di ossa con tre teschi, uno in cima e due sulle spalle. */
const BONE_COLOSSUS: MinionArt = {
  frames: [BONE_COLOSSUS_BODY, variant(BONE_COLOSSUS_BODY, { 10: '.adda..adda.', 11: 'aa........aa' })],
  scale: 3,
  palette: { a: '#2a2620', b: '#e8dfc8', c: '#9fe0b0', d: '#a89c84' },
  color: '#e8dfc8',
  glow: '',
  fps: 4,
};

const MASS_GRAVE_BODY = [
  'aaaaaaaaaaaaaa',
  'abbbbbbbabbbba',
  'abcbbbbacabbba',
  'abbbbbabcccaba',
  'abbbbacddcbaba',
  'abbbbacddcbbba',
  'abbbbbacccabba',
  'abbbbbbaaabbba',
  'abbbbbbbbbbbba',
  'aaaaaaaaaaaaaa',
];

/** Fossa comune: una lastra spaccata, con il bagliore verde che sale dalla crepa. */
const MASS_GRAVE: MinionArt = {
  frames: [MASS_GRAVE_BODY, variant(MASS_GRAVE_BODY, { 4: 'abbbbacdecbaba', 5: 'abbbbacedcbbba' })],
  scale: 3,
  palette: { a: '#14121a', b: '#5a5462', c: '#1a1620', d: '#9fe0b0', e: '#d8f0c0' },
  color: '#9fe0b0',
  glow: '#5fa07a',
  fps: 3,
  bob: false,
};

// --- Cantoria ---------------------------------------------------------------------------------------------------

const CHOIR_GHOST_BODY = ['..aaa..', '.abbba.', '.acbca.', '.abdba.', 'aebbbea', 'aeeeeea', 'aeeeeea', '.aeeea.', '..a.a..'];

/** Corista spettrale: cotta bianca, bocca aperta sul canto. */
const CHOIR_GHOST: MinionArt = {
  frames: [CHOIR_GHOST_BODY, variant(CHOIR_GHOST_BODY, { 3: '.abcba.', 8: '.a...a.' })],
  scale: 3,
  palette: { a: '#5a5470', b: '#c8c4d8', c: '#2a2438', d: '#2a2438', e: '#e8e4f0' },
  color: '#e8e4f0',
  glow: '#b0a8d0',
  fps: 4,
};

/** Salterio volante: un libro che sbatte le pagine, con il nastrino rosso come una lingua. */
const PSALTER: MinionArt = {
  frames: [
    ['a.......a', 'aba...aba', 'abba.abba', 'abbcacbba', '.abbabba.', '..aaaaa..'],
    ['.........', '.........', 'aaaa.aaaa', 'abbcacbba', 'abbbabbba', '.aaaaaaa.'],
  ],
  scale: 3,
  palette: { a: '#3a2a30', b: '#e8dcc0', c: '#c84a5a' },
  color: '#e8dcc0',
  glow: '',
  fps: 10,
};

const ORGAN_PIPE_BODY = ['.aaaa.', 'abccba', 'abccba', 'abccba', 'abccba', 'abccba', 'abddba', 'adeeda', 'abddba', 'abccba', 'abccba', 'abccba', 'aaaaaa', '.affa.'];

/** Canna d'organo: stagno, la bocca che si illumina di lilla mentre suona. */
const ORGAN_PIPE: MinionArt = {
  frames: [ORGAN_PIPE_BODY, variant(ORGAN_PIPE_BODY, { 6: 'adeeda', 8: 'adeeda' })],
  scale: 3,
  palette: { a: '#1c1a24', b: '#7a7a88', c: '#c8c8d8', d: '#1a1420', e: '#c9a6ff', f: '#5a4a3a' },
  color: '#c9a6ff',
  glow: '#9a7ad8',
  fps: 6,
  bob: false,
};

const CANTOR_BODY = [
  '...aaa...',
  '..abbba..',
  '..acbca..',
  '..abdba..',
  '.aeeeeea.',
  'aeeffeeea',
  'aeeffeeea',
  'aeeeeeeea',
  '.aeeeeea.',
  '.aeeeeea.',
  '.aeeeeea.',
  '..aa.aa..',
];

/** Cantore del vespro: tonaca rossa e il libro dei canti aperto davanti. */
const CANTOR: MinionArt = {
  frames: [CANTOR_BODY, variant(CANTOR_BODY, { 3: '..abcba..' })],
  scale: 3,
  palette: { a: '#1a1014', b: '#e8c8a8', c: '#1a1420', d: '#5a1a20', e: '#a82a3a', f: '#f6e6c0' },
  color: '#f6e6c0',
  glow: '',
  fps: 4,
};

const CHAPEL_MASTER_BODY = [
  '........f',
  '...aaa.f.',
  '..abbbf..',
  '..acbca..',
  '..abbba..',
  '.aeeeeea.',
  'aeeggeeea',
  'aeeggeeea',
  'aeeeeeeea',
  '.aeeeeea.',
  '.aeeeeea.',
  '..aa.aa..',
];

/** Maestro di cappella: tonaca nera con il collare d'oro, la bacchetta che batte il tempo. */
const CHAPEL_MASTER: MinionArt = {
  frames: [CHAPEL_MASTER_BODY, variant(CHAPEL_MASTER_BODY, { 0: '.........', 1: '...aaa..f', 2: '..abbba.f', 3: '..acbca.f' })],
  scale: 3,
  palette: { a: '#14101a', b: '#e8c8a8', c: '#1a1420', e: '#2a2030', f: '#f0e8d0', g: '#d8b060' },
  color: '#d8b060',
  glow: '',
  fps: 3,
};

const EAGLE_BODY = [
  '......aa......',
  '.....abba.....',
  '.....acbd.....',
  'aa...abba...aa',
  'abaa.abba.aaba',
  'abbbaabbaabbba',
  '.abbbbbbbbbba.',
  '..aabbbbbbaa..',
  '....abbbba....',
  '....abeeba....',
  '...aabeebaa...',
  '...aaaaaaaa...',
];

/** Aquila del leggio: bronzo ad ali aperte sul leggio. */
const EAGLE: MinionArt = {
  frames: [EAGLE_BODY, variant(EAGLE_BODY, { 3: 'a....abba....a', 4: 'ba...abba...ab', 5: 'bba..abba..abb' })],
  scale: 3,
  palette: { a: '#2a1c10', b: '#b8863c', c: '#1a1410', d: '#e8c070', e: '#e8c070' },
  color: '#e8c070',
  glow: '',
  fps: 4,
};

const CHOIR_STALL_BODY = [
  '.aa..aaaa..aa.',
  'abba.abba.abba',
  'abbaaabbaaabba',
  'abbbbbbbbbbbba',
  'abcccbcccbccca',
  'abcdcbcdcbcdca',
  'abcccbcccbccca',
  'aeeeeeeeeeeeea',
  'abbbbbbbbbbbba',
  'aa.aa....aa.aa',
];

/** Stallo del coro: tre posti di legno scuro, con un bagliore lilla dove sedeva qualcuno. */
const CHOIR_STALL: MinionArt = {
  frames: [CHOIR_STALL_BODY, variant(CHOIR_STALL_BODY, { 5: 'abcccbcdcbccca' })],
  scale: 3,
  palette: { a: '#14100c', b: '#5a3a24', c: '#1a1014', d: '#f0d0ff', e: '#8a5a34' },
  color: '#c8a0d8',
  glow: '#a080c0',
  fps: 3,
  bob: false,
};

export const CRYPT_VEIN_ART: Readonly<Record<string, MinionArt>> = {
  crypt_skull: SKULL,
  crypt_rat: RAT,
  crypt_gravedigger: GRAVEDIGGER,
  crypt_lantern: LANTERN,
  crypt_mourner: MOURNER,
  crypt_bone_colossus: BONE_COLOSSUS,
  crypt_mass_grave: MASS_GRAVE,
  crypt_choir_ghost: CHOIR_GHOST,
  crypt_psalter: PSALTER,
  crypt_organ_pipe: ORGAN_PIPE,
  crypt_cantor: CANTOR,
  crypt_chapel_master: CHAPEL_MASTER,
  crypt_eagle: EAGLE,
  crypt_choir_stall: CHOIR_STALL,
};
