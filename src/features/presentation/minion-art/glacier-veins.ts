import { variant, type MinionArt } from './minion-art';

/*
 * Ghiacciaio, vene B e C. Tana del gelo: pellicce bianche, musi scuri, il lilla dei colpi. Osservatorio: ottone,
 * vetro, il blu notte delle tuniche stellate e la neve.
 */

// --- Tana del gelo ----------------------------------------------------------------------------------------------

const ERMINE_BODY = ['.......aa', 'daaaaaabc', 'dbbbbbbba', '.a.a.a.a.'];

/** Ermellino: bianco, con la punta della coda nera. */
const ERMINE: MinionArt = {
  frames: [ERMINE_BODY, variant(ERMINE_BODY, { 3: 'a.a.a.a..' })],
  scale: 3,
  palette: { a: '#5a6a80', b: '#f0f6ff', c: '#1a1a24', d: '#14141a' },
  color: '#f0f6ff',
  glow: '',
  fps: 12,
};

const LEMMING_BODY = ['.aaaa.', 'abbbca', 'abdbba', 'abbbba', '.a..a.'];

/** Lemming del dirupo: un batuffolo bruno che corre dritto. */
const LEMMING: MinionArt = {
  frames: [LEMMING_BODY, variant(LEMMING_BODY, { 4: 'a....a' })],
  scale: 3,
  palette: { a: '#2a1a10', b: '#a07a50', c: '#1a1410', d: '#e8d8c0' },
  color: '#c8a070',
  glow: '',
  fps: 12,
};

const OWL_BODY = ['...aaa...', '..abbba..', '.abcbcba.', 'aabbdbbaa', 'abbbbbbba', 'abbbbbbba', '.abbbbba.', '..abbba..', '...a.a...'];

/** Gufo delle nevi: piume bianche e occhi d'oro. */
const OWL: MinionArt = {
  frames: [OWL_BODY, variant(OWL_BODY, { 3: 'abbbdbbba', 5: 'aabbbbbaa' })],
  scale: 3,
  palette: { a: '#5a6a80', b: '#f0f6ff', c: '#e8c040', d: '#3a3a40' },
  color: '#e8fbff',
  glow: '',
  fps: 6,
};

const FOX_BODY = ['.a.a......', '.aaaa.....', 'acbbba..dd', '.abbbbbadd', '..abbbbba.', '..a.a.a.a.'];

/** Volpe artica: bianca, la coda folta e gli occhi lilla. */
const FOX: MinionArt = {
  frames: [FOX_BODY, variant(FOX_BODY, { 5: '.a.a.a.a..' })],
  scale: 3,
  palette: { a: '#5a6a80', b: '#f0f6ff', c: '#d6c4ff', d: '#e0e8f0' },
  color: '#d6c4ff',
  glow: '',
  fps: 10,
};

const BEAR_BODY = [
  '..aa......aa..',
  '.abba....abba.',
  '.abbbaaaabbba.',
  '..abbbbbbbba..',
  '..abcbbbbcba..',
  '..abbbddbbba..',
  '.aabbbeebbbaa.',
  'abbbbbbbbbbbba',
  'abbbbbbbbbbbba',
  'abbbbbbbbbbbba',
  '.abbaaaaaabba.',
  '.aaa......aaa.',
];

/** Orso delle nevi: pelliccia bianca, la bocca lilla che si spalanca nel ruggito. */
const BEAR: MinionArt = {
  frames: [BEAR_BODY, variant(BEAR_BODY, { 6: '.aabbeeeebbaa.' })],
  scale: 3,
  palette: { a: '#4a5a70', b: '#e8f0f8', c: '#1a1a24', d: '#3a3a44', e: '#d6c4ff' },
  color: '#d6c4ff',
  glow: '',
  fps: 3,
};

const DEN_BODY = ['....aaaa....', '..aabbbbaa..', '.abbbbbbbba.', '.abccbbbbba.', 'abbccbbbccba', 'abbbbbbbccba', 'abbbbbbbbbba', 'aaaaaaaaaaaa'];

/** Tana sotto la neve: un mucchio bianco a buchi scuri che respira. */
const DEN: MinionArt = {
  frames: [DEN_BODY, variant(DEN_BODY, { 1: '.aabbbbbbaa.' })],
  scale: 3,
  palette: { a: '#6a8aa8', b: '#e8f0f8', c: '#1a2a3a' },
  color: '#e8f0f8',
  glow: '',
  fps: 2,
  bob: false,
};

// --- Osservatorio -----------------------------------------------------------------------------------------------

const HOMUNCULUS_BODY = ['...a..', '..ada.', '.adda.', 'adddda', '.abba.', 'acbcba', '.abba.', '.a..a.'];

/** Omuncolo di brina: cappello a punta blu notte e un corpicino di ghiaccio. */
const HOMUNCULUS: MinionArt = {
  frames: [HOMUNCULUS_BODY, variant(HOMUNCULUS_BODY, { 7: 'a....a' })],
  scale: 3,
  palette: { a: '#2a3a5a', b: '#d8f4ff', c: '#1a1a3a', d: '#5a7ab8' },
  color: '#bfefff',
  glow: '',
  fps: 8,
};

const SNOWBALL_BODY = ['.aaa.', 'abbba', 'abbca', 'abbba', '.aaa.'];

/** Palla di neve: rotola, e la scintilla gira con lei. */
const SNOWBALL: MinionArt = {
  frames: [SNOWBALL_BODY, variant(SNOWBALL_BODY, { 2: 'acbba' })],
  scale: 3,
  palette: { a: '#8aa8c8', b: '#f4fbff', c: '#bfdfff' },
  color: '#f4fbff',
  glow: '',
  fps: 10,
};

const ASTROLABE_BODY = [
  '....aaaa....',
  '..aabbbbaa..',
  '.ab..cc..ba.',
  '.ab.cddc.ba.',
  'ab.c.dd.c.ba',
  'ab.cdeedc.ba',
  'ab.cdeedc.ba',
  'ab.c.dd.c.ba',
  '.ab.cddc.ba.',
  '.ab..cc..ba.',
  '..aabbbbaa..',
  '....aaaa....',
];

/** Astrolabio vivo: anelli d'ottone attorno a una stella che pulsa. */
const ASTROLABE: MinionArt = {
  frames: [ASTROLABE_BODY, variant(ASTROLABE_BODY, { 4: 'ab.cd..dc.ba', 7: 'ab.cd..dc.ba' })],
  scale: 3,
  palette: { a: '#3a2a10', b: '#c8a050', c: '#8a6a30', d: '#eaf8ff', e: '#d6c4ff' },
  color: '#eaf8ff',
  glow: '#bfdfff',
  fps: 4,
  bob: false,
};

const STAR_READER_BODY = ['...aa...', '..abba..', '.abbbba.', '.abcbca.', '..abba..', '.aeeeea.', 'aeefeeea', 'aeeeefea', 'aefeeeea', '.aeeeea.', '.aeeeea.', '..a..a..'];

/** Lettore di stelle: cappuccio e tunica blu notte trapunta di stelle. */
const STAR_READER: MinionArt = {
  frames: [STAR_READER_BODY, variant(STAR_READER_BODY, { 6: 'aeeeefea', 7: 'aefeeeea', 8: 'aeefeeea' })],
  scale: 3,
  palette: { a: '#0e1428', b: '#5a6aa8', c: '#bfefff', e: '#3a4a8a', f: '#eaf8ff' },
  color: '#bfefff',
  glow: '',
  fps: 3,
};

const SNOWMAN_BODY = [
  '.....aaaa.....',
  '....abbbba....',
  '....acbbca....',
  '....abdbba....',
  '...aaabbaaa...',
  '..abbbbbbbba..',
  'e.abbbcbbbba.e',
  '.eabbbbbbbbae.',
  '..aabbcbbbaa..',
  '.abbbbbbbbbba.',
  'abbbbbbbbbbbba',
  'abbbbbcbbbbbba',
  '.abbbbbbbbbba.',
  '..aaaaaaaaaa..',
];

/** Pupazzo colossale: tre palle di neve, gli occhi di carbone e le braccia di rami. */
const SNOWMAN: MinionArt = {
  frames: [SNOWMAN_BODY, variant(SNOWMAN_BODY, { 5: 'e.abbbbbbbba.e', 6: '.eabbbcbbbbae.', 7: '..abbbbbbbba..' })],
  scale: 3,
  palette: { a: '#8aa8c8', b: '#f4fbff', c: '#1a1a24', d: '#e88a3a', e: '#5a3a24' },
  color: '#f4fbff',
  glow: '',
  fps: 3,
};

const ALEMBIC_BODY = ['....aa....', '....ab....', '....ab....', '...abba...', '..abccba..', '.abcddcba.', 'abcdddddca', 'abcddddcba', 'abccddccba', '.abccccba.', '..abbbba..', '.aaaaaaaa.'];

/** Alambicco gelato: vetro e un liquido ciano che bolle. */
const ALEMBIC: MinionArt = {
  frames: [ALEMBIC_BODY, variant(ALEMBIC_BODY, { 5: '.abcdccba.', 6: 'abcddcddca' })],
  scale: 3,
  palette: { a: '#4a6a8a', b: '#bfdfff', c: '#9fe4ff', d: '#eaf8ff' },
  color: '#9fe4ff',
  glow: '#7fd8ff',
  fps: 4,
  bob: false,
};

export const GLACIER_VEIN_ART: Readonly<Record<string, MinionArt>> = {
  glacier_ermine: ERMINE,
  glacier_lemming: LEMMING,
  glacier_owl: OWL,
  glacier_fox: FOX,
  glacier_bear: BEAR,
  glacier_den: DEN,
  glacier_homunculus: HOMUNCULUS,
  glacier_snowball: SNOWBALL,
  glacier_astrolabe: ASTROLABE,
  glacier_star_reader: STAR_READER,
  glacier_snowman: SNOWMAN,
  glacier_alembic: ALEMBIC,
};
