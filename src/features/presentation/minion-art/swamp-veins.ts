import { variant, type MinionArt } from './minion-art';

/*
 * Palude, vene B e C. Sommersi: pelle livida, alghe, acqua nera, lilla e rosa. Colonia: insetti bruni e verdi con il
 * lime della spora che li possiede.
 */

// --- Sommersi ---------------------------------------------------------------------------------------------------

/** Sanguisuga: corpo a segmenti con la bocca rossa; si allunga strisciando. */
const LEECH: MinionArt = {
  frames: [
    ['.aaaaaa.', 'acbdbdba', 'acbbbbba', '.aaaaaa.'],
    ['........', '.aaaaaaa', 'acbdbdba', '.aaaaaaa'],
  ],
  scale: 3,
  palette: { a: '#1a0e12', b: '#4a2a34', c: '#c04a5a', d: '#6a3a48' },
  color: '#c04a5a',
  glow: '',
  fps: 6,
};

const DROWNED_BODY = ['..aaaa..', '.abbbba.', '.acbbca.', '.abddba.', 'aaebbeaa', 'abbbbbba', 'abebbbba', 'abbbbeba', '.abbbba.', '.ab..ba.', '.aa..aa.'];

/** Annegato: pelle grigio-verde gonfia d'acqua, alghe addosso. */
const DROWNED: MinionArt = {
  frames: [DROWNED_BODY, variant(DROWNED_BODY, { 9: 'ab....ba', 10: 'aa....aa' })],
  scale: 3,
  palette: { a: '#141a12', b: '#7a8a78', c: '#d8e8c0', d: '#2a2a20', e: '#3f6a2a' },
  color: '#9aa890',
  glow: '',
  fps: 3,
};

const PIKE_BODY = ['...aaaaaaa....', '.aabbbbbbbaa.a', 'acbcbbbbbbbbaa', 'addbbbbbbbbbba', '.aaeeeeeeeaa.a', '...aaaaaaa....'];

/** Luccio delle acque nere: muso piatto, denti e un occhio lilla. */
const PIKE: MinionArt = {
  frames: [PIKE_BODY, variant(PIKE_BODY, { 1: '.aabbbbbbbaaa.', 4: '.aaeeeeeeeaaa.' })],
  scale: 3,
  palette: { a: '#0e1410', b: '#2a3a3a', c: '#c08cff', d: '#e8e0d0', e: '#5a6a5a' },
  color: '#c08cff',
  glow: '',
  fps: 6,
};

const LILY_BODY = ['....aaaa....', '...abccba...', '..abcddcba..', '..abcddcba..', 'aaaabccbaaaa', 'aeeeeaaeeeea', 'aeeeeeeeeeea', '.aaaaaaaaaa.'];

/** Ninfea carnivora: la foglia larga e il fiore lilla che si apre come una bocca. */
const LILY: MinionArt = {
  frames: [LILY_BODY, variant(LILY_BODY, { 2: '..abccccba..' })],
  scale: 3,
  palette: { a: '#14100c', b: '#d8a0ff', c: '#a060d0', d: '#2a1030', e: '#2f5a2a' },
  color: '#d8a0ff',
  glow: '#a060d0',
  fps: 3,
  bob: false,
};

const WASHER_BODY = ['...aaa...', '..abbba..', '.abbbbba.', '.abcbcba.', '.abbbbba.', 'aabbbbbaa', 'afbbbbbfa', '.abbbbba.', '.abbbbba.', 'aabbbbbaa', 'addddddda', '.aaaaaaa.'];

/** Lavandaia della notte: velo viola scuro, occhi lilla e il panno bianco da strizzare. */
const WASHER: MinionArt = {
  frames: [WASHER_BODY, variant(WASHER_BODY, { 9: 'aabbbbbad', 10: 'adddddda.' })],
  scale: 3,
  palette: { a: '#100c14', b: '#3a3048', c: '#b98cff', d: '#e8e4f0', f: '#9aa890' },
  color: '#b98cff',
  glow: '',
  fps: 3,
};

const BLOATED_BODY = [
  '....aaaaa....',
  '..aabbbbbaa..',
  '.abbbbbbbbba.',
  '.abcbbbbbcba.',
  'abbbbbbbbbbba',
  'abbbbdddbbbba',
  'abbbbbbbbbbba',
  'abebbbbbbbeba',
  'abbbbbbbbbbba',
  '.abbbbbbbbba.',
  '.aabbbbbbbaa.',
  '..aab...baa..',
  '...aa...aa...',
];

/** Annegato gonfio: un pallone livido a macchie rosse, la bocca che si apre e si chiude. */
const BLOATED: MinionArt = {
  frames: [BLOATED_BODY, variant(BLOATED_BODY, { 5: 'abbbbbdbbbbba' })],
  scale: 3,
  palette: { a: '#1a1020', b: '#7a6a8a', c: '#e8e0f0', d: '#3a1a2a', e: '#c04a5a' },
  color: '#9a8aaa',
  glow: '',
  fps: 3,
};

const SPAWN_BODY = ['...aaaaaa...', '..abbbbbba..', '.abcbbcbbba.', 'abbbbbbcbbba', 'abcbbcbbbcba', 'abbbbbbbbbba', 'abbcbbbcbbba', '.abbbbbbbba.', '..aabbbbaa..', '....aaaa....'];

/** Ovatura: gelatina verde con le uova scure che si muovono dentro. */
const SPAWN: MinionArt = {
  frames: [SPAWN_BODY, variant(SPAWN_BODY, { 2: '.abbcbbcbba.', 4: 'abbcbbcbbcba' })],
  scale: 3,
  palette: { a: '#141a10', b: '#5a6a4a', c: '#1a1a14' },
  color: '#8aa070',
  glow: '#5a8a4a',
  fps: 3,
  bob: false,
};

/** Girino: una testa nera e una coda che frusta. */
const TADPOLE: MinionArt = {
  frames: [
    ['.aaa..', 'abcba.', 'abbbaa', '.aaa.a'],
    ['.aaa..', 'abcbaa', 'abbba.', '.aaa..'],
  ],
  scale: 3,
  palette: { a: '#0e0e0a', b: '#2a2a20', c: '#d8e8c0' },
  color: '#4a4a38',
  glow: '',
  fps: 10,
};

// --- Colonia ----------------------------------------------------------------------------------------------------

const ANT_BODY = ['..dd....', '.adda...', 'abcbaaa.', 'abbbabba', '.aa.abba', 'a.a.a.a.'];

/** Formica infestata: il fungo lime le spunta dal capo. */
const ANT: MinionArt = {
  frames: [ANT_BODY, variant(ANT_BODY, { 5: '.a.a.a.a' })],
  scale: 3,
  palette: { a: '#140e0a', b: '#3a2a20', c: '#e6f56a', d: '#cddc58' },
  color: '#cddc58',
  glow: '',
  fps: 10,
};

/** Falena delle spore: ali chiare a macchie lime che si chiudono e si aprono. */
const MOTH: MinionArt = {
  frames: [
    ['aa.....aa', 'abba.abba', 'abcbabcba', '.abbbbba.', '..aadaa..', '...a.a...'],
    ['.........', 'aaa...aaa', 'abbbabbba', 'abcbbbcba', '.aaadaaa.', '...a.a...'],
  ],
  scale: 3,
  palette: { a: '#2a2418', b: '#c8c0a0', c: '#cddc58', d: '#5a4a30' },
  color: '#cddc58',
  glow: '',
  fps: 10,
};

const BEETLE_BODY = ['..a....a..', '...aaaa...', '..acbbca..', '.aaaaaaaa.', 'addddeddda', 'addddeddda', '.adddedda.', 'a.aa..aa.a'];

/** Scarabeo bombardiere: corazza verde con la riga d'oro, occhi lime. */
const BEETLE: MinionArt = {
  frames: [BEETLE_BODY, variant(BEETLE_BODY, { 7: '.a.aa.aa.a' })],
  scale: 3,
  palette: { a: '#10140a', b: '#2a3a1a', c: '#e6f56a', d: '#5a8a2a', e: '#d8c84a' },
  color: '#e6f56a',
  glow: '',
  fps: 6,
};

const SPIDER_BODY = ['...dd.d...', '..adddda..', 'a.abbbba.a', '.aabbbbaa.', 'aabcbbcbaa', '.aabbbbaa.', 'a.aabbaa.a', '.a..aa..a.', 'a........a'];

/** Ragno tessitore: corpo scuro con i funghi bianchi sul dorso, otto zampe. */
const SPIDER: MinionArt = {
  frames: [SPIDER_BODY, variant(SPIDER_BODY, { 7: 'a...aa...a', 8: '.a......a.' })],
  scale: 3,
  palette: { a: '#100a10', b: '#3a2a3a', c: '#f0d8ff', d: '#e8e4ff' },
  color: '#e8e4ff',
  glow: '',
  fps: 6,
};

const CICADA_BODY = ['dd.....dd', 'ddd.a.ddd', '.ddabadd.', '..abcba..', '..abbba..', '...aba...', '....a....'];

/** Cicala marcia: ali trasparenti e un occhio lilla. */
const CICADA: MinionArt = {
  frames: [CICADA_BODY, variant(CICADA_BODY, { 0: '.........', 1: '.dd.a.dd.', 2: 'dddabaddd' })],
  scale: 3,
  palette: { a: '#1a1408', b: '#5a4a2a', c: '#c08cff', d: '#c8d8e8' },
  color: '#c08cff',
  glow: '',
  fps: 10,
};

const STAG_BODY = [
  'd.d........d.d',
  '.ddd......ddd.',
  '..ddd.aa.ddd..',
  '....aabbaa....',
  '...abcbbcba...',
  '...abbbbbba...',
  '....abeeba....',
  '..aabbbbbbaa..',
  '.abbbbbbbbbba.',
  '.abbbbbbbbbba.',
  '.abbaaaaaabba.',
  '.aba......aba.',
  '.aa........aa.',
];

/** Cervo infestato: corna di funghi lime al posto dei palchi, occhi posseduti. */
const STAG: MinionArt = {
  frames: [STAG_BODY, variant(STAG_BODY, { 11: '..aba....aba..', 12: '..aa......aa..' })],
  scale: 3,
  palette: { a: '#140e08', b: '#6a5a3a', c: '#c08cff', d: '#cddc58', e: '#3a2a1a' },
  color: '#cddc58',
  glow: '',
  fps: 4,
};

const ANTHILL_BODY = ['.....aaaa.....', '....abbbba....', '...abbcbbba...', '..abbbbbbbba..', '..abbcbbbbba..', '.abbbbbbcbbba.', '.abbbbbbbbbba.', 'abbcbbbbbbbbba', 'aaaaaaaaaaaaaa'];

/** Formicaio: un cumulo di terra a buchi, con il fungo lime che spunta in cima. */
const ANTHILL: MinionArt = {
  frames: [ANTHILL_BODY, variant(ANTHILL_BODY, { 0: '.....aada.....' })],
  scale: 3,
  palette: { a: '#1a140c', b: '#5a4a30', c: '#1a1410', d: '#cddc58' },
  color: '#8a7a50',
  glow: '',
  fps: 3,
  bob: false,
};

export const SWAMP_VEIN_ART: Readonly<Record<string, MinionArt>> = {
  swamp_leech: LEECH,
  swamp_drowned: DROWNED,
  swamp_pike: PIKE,
  swamp_lily: LILY,
  swamp_washer: WASHER,
  swamp_bloated: BLOATED,
  swamp_spawn: SPAWN,
  swamp_tadpole: TADPOLE,
  swamp_ant: ANT,
  swamp_moth: MOTH,
  swamp_beetle: BEETLE,
  swamp_spider: SPIDER,
  swamp_cicada: CICADA,
  swamp_stag: STAG,
  swamp_anthill: ANTHILL,
};
