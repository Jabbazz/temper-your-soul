import { variant, type MinionArt } from './minion-art';

/*
 * Ghiacciaio: cristallo, neve, allievi del Custode in azzurro; i nemici hanno il contorno scuro sul ghiaccio chiaro.
 */

/** Una sentinella di cristallo piantata a terra, con un occhio azzurro. */
const SENTINEL: MinionArt = {
  frames: [
    ['...ab...', '..abba..', '.abccba.', '.abdcba.', 'abcccbba', '.abccba.', '.aabbaa.', 'aaa..aaa'],
    ['...ab...', '..abba..', '.abccba.', '.abcdba.', 'abcccbba', '.abccba.', '.aabbaa.', 'aaa..aaa'],
  ],
  scale: 3,
  palette: { a: '#1d3a52', b: '#7fd8ff', c: '#d8f6ff', d: '#2a6cff' },
  color: '#aef0ff',
  glow: '#6fd8ff',
};

/** Fiocco tagliente: un cristallo che ruota. */
const FLAKE: MinionArt = {
  frames: [
    ['...a...', '.a.b.a.', '..bcb..', 'abcdcba', '..bcb..', '.a.b.a.', '...a...'],
    ['a.....a', '.ab.ba.', '..bcb..', '.bcdcb.', '..bcb..', '.ab.ba.', 'a.....a'],
  ],
  scale: 3,
  palette: { a: '#1d4a6a', b: '#aef0ff', c: '#e8fbff', d: '#ffffff' },
  color: '#d8f6ff',
  glow: '#9fe4ff',
  fps: 10,
};

const WOLF_BODY = ['.........aa..', '........abba.', 'a.......abcba', 'abaaaaaabbbba', '.abbbbbbbbba.', '.abbbbbbbba..', '.ab.ab..ab.a.', '.a..a...a....'];

/** Lupo delle nevi: pelo bianco, occhio di ghiaccio. */
const WOLF: MinionArt = {
  frames: [WOLF_BODY, variant(WOLF_BODY, { 6: '..ab.ab.ab.a.', 7: '..a..a..a....' })],
  scale: 3,
  palette: { a: '#2a3442', b: '#e8f0f8', c: '#5ad0ff' },
  color: '#e8f0f8',
  glow: '',
  fps: 8,
};

const APPRENTICE_BODY = ['....a....', '...aba...', '..abbba..', '.aaaaaaa.', '..acdca..', '..abbba..', '.abbbbba.', 'abbebbbba', '.abbbbba.', '.abbbbba.', '..abbba..', '..aa.aa..'];

/** Apprendista del gelo: cappello a punta e tunica azzurra. */
const APPRENTICE: MinionArt = {
  frames: [APPRENTICE_BODY, variant(APPRENTICE_BODY, { 7: 'abbbbebba', 11: '..a...a..' })],
  scale: 3,
  palette: { a: '#1a2438', b: '#4a7ac8', c: '#e8d8c8', d: '#2a4a8a', e: '#aef0ff' },
  color: '#8ab8ff',
  glow: '',
  fps: 4,
};

/** Spirito della bufera: un fuoco fatuo di neve. */
const SPIRIT: MinionArt = {
  frames: [
    ['...aaa...', '..abbba..', '.abcbcba.', '.abbbbba.', '..abbba..', '...aba...', '..ab.ba..', '.a.....a.'],
    ['...aaa...', '..abbba..', '.abcbcba.', '.abbbbba.', '..abbba..', '...aba...', '...a.a...', '..a...a..'],
  ],
  scale: 3,
  palette: { a: '#5a9ac8', b: '#d8f6ff', c: '#2a6cff' },
  color: '#d8f6ff',
  glow: '#8fd8ff',
  fps: 8,
};

const BLOCK_BODY = ['aaaaaaaaaaaa', 'abbbbbbbbcba', 'abcbbbbbbbba', 'abbddbbddbba', 'abbddbbddbba', 'abbbbbbbbbba', 'abbbeeeebbba', 'abbbbbbbbbba', 'abcbbbbbbcba', 'aaaaaaaaaaaa', '.aa......aa.'];

/** Blocco vivo: un cubo di ghiaccio con una faccia scura. */
const ICE_BLOCK: MinionArt = {
  frames: [BLOCK_BODY, variant(BLOCK_BODY, { 10: '..aa....aa..' })],
  scale: 3,
  palette: { a: '#1d3a52', b: '#9fe4ff', c: '#e8fbff', d: '#1a2a5a', e: '#2a4a8a' },
  color: '#bfefff',
  glow: '',
  fps: 3,
};

const CRYSTAL_BODY = ['....a....', '...aba...', '..abcba..', '..abcba..', '.abccdba.', '.abcddba.', '.abccbba.', '..abcba..', '..abbba..', '...aba...', '..aa.aa..', '.aaaaaaa.'];

/** Cristallo eco: un cristallo alto che pulsa di luce. */
const CRYSTAL: MinionArt = {
  frames: [CRYSTAL_BODY, variant(CRYSTAL_BODY, { 4: '.abcdcba.', 5: '.abddcba.' })],
  scale: 3,
  palette: { a: '#1d3a52', b: '#7fd8ff', c: '#e8fbff', d: '#c9b3ff' },
  color: '#c9b3ff',
  glow: '#a890ff',
  fps: 3,
};

const RAM_BODY = ['.aa.......aa.', 'abba.....abba', 'abbaaaaaaabba', '.abbbbbbbbba.', 'abbcbbbbbcbba', '.abbbbbbbbba.', '..abbddbbba..', '..abbbbbbba..', '.ab.ab.ab.ba.', '.a..a...a..a.'];

/** Ariete di ghiaccio: corna ricurve e vello bianco. */
const RAM: MinionArt = {
  frames: [RAM_BODY, variant(RAM_BODY, { 8: '..ab.ab.ab.a.', 9: '..a..a..a..a.' })],
  scale: 3,
  palette: { a: '#2a3442', b: '#d8e8f4', c: '#5ad0ff', d: '#3a4a5a' },
  color: '#d8e8f4',
  glow: '',
  fps: 5,
};

export const GLACIER_MINION_ART: Readonly<Record<string, MinionArt>> = {
  glacier_sentinel: SENTINEL,
  glacier_flake: FLAKE,
  glacier_wolf: WOLF,
  glacier_apprentice: APPRENTICE,
  glacier_spirit: SPIRIT,
  glacier_ice_block: ICE_BLOCK,
  glacier_crystal: CRYSTAL,
  glacier_ram: RAM,
};
