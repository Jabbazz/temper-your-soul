import type { Palette, SpriteFrame } from '../sprites';
import type { BossArt } from './boss-art';

/*
 * Grafica dei luogotenenti delle vene B e C: pixel art nel codice, come gli altri luogotenenti. Ognuno riprende i
 * colori dei servitori della sua vena; rallentato si vela di brina, in furia gli occhi cambiano colore.
 */

/** Una copia del fotogramma con alcune righe cambiate. */
const variant = (frame: SpriteFrame, rows: Readonly<Record<number, string>>): SpriteFrame => frame.map((row, index) => rows[index] ?? row);

/** La camminata a quattro tempi: fermo, passo, fermo, passo. */
const walk = (idle: SpriteFrame, step: SpriteFrame): readonly SpriteFrame[] => [idle, step, idle, step];

// --- Gran Becchino (cripta, Catacombe) --------------------------------------------------------------------------

const GRAVEDIGGER_IDLE: SpriteFrame = [
  '.....aaaaa......',
  '....abbbbba.....',
  '...abbbbbbba....',
  '...abcbbbcba..e.',
  '...abbbbbbba..e.',
  '....abbbbba...e.',
  '..aaddddddaa..e.',
  '.addddddddddaae.',
  'addddddddddddae.',
  'adddfddddfdddae.',
  'addddddddddddaff',
  '.adddddddddda.ff',
  '..adda..adda..ff',
  '..adda..adda....',
  '.aaaa....aaaa...',
];

export const GRAND_GRAVEDIGGER_ART: BossArt = {
  walk: walk(GRAVEDIGGER_IDLE, variant(GRAVEDIGGER_IDLE, { 12: '..adda...adda.ff', 13: '...adda.adda....', 14: '..aaaa..aaaa....' })),
  casting: variant(GRAVEDIGGER_IDLE, {
    1: '....abbbbba..ff.',
    2: '...abbbbbbba.ff.',
    3: '...abcbbbcba.e..',
    4: '...abbbbbbbae...',
    10: 'addddddddddddaa.',
    11: '.adddddddddda...',
  }),
  scale: 3,
  shadow: { radiusX: 26, radiusY: 8, offsetY: 26 },
  bob: { casting: -2, even: 0, odd: -2 },
  palette: (slowed: boolean, enraged: boolean): Palette => ({
    a: '#14101a',
    b: slowed ? '#5a7a8a' : '#4a3e54',
    c: enraged ? '#ff6a5a' : '#9fe0b0',
    d: slowed ? '#5a6a80' : '#5a4e64',
    e: '#8a7a60',
    f: '#a8a0b0',
  }),
};

// --- Maestro dell'organo (cripta, Cantoria) ---------------------------------------------------------------------

const ORGAN_IDLE: SpriteFrame = [
  '..e..........e..',
  '..e...aaaa...e..',
  '.eee.affffa.eee.',
  '.eee.afcfca.eee.',
  '.eee.affffa.eee.',
  '.eeeaabbbbaaeee.',
  '.aabbbbggbbbbaa.',
  'abbbbbbggbbbbbba',
  'abbbbbbbbbbbbbba',
  'abbhbbbbbbbbhbba',
  'aiiiiiiiiiiiiiia',
  '.abbbbbbbbbbbba.',
  '.abbbbbbbbbbbba.',
  '..abbba..abbba..',
  '..aaaa....aaaa..',
];

export const ORGAN_MASTER_ART: BossArt = {
  walk: walk(ORGAN_IDLE, variant(ORGAN_IDLE, { 13: '...abbba.abbba..', 14: '...aaaa..aaaa...' })),
  casting: variant(ORGAN_IDLE, { 0: '..g..........g..', 1: '..g...aaaa...g..' }),
  scale: 3,
  shadow: { radiusX: 26, radiusY: 8, offsetY: 24 },
  bob: { casting: -2, even: 0, odd: -1 },
  palette: (slowed: boolean, enraged: boolean): Palette => ({
    a: '#14101a',
    b: slowed ? '#4a5a70' : '#2a2030',
    c: enraged ? '#ff5a6a' : '#1a1420',
    e: slowed ? '#9fd0e0' : '#c8c8d8',
    f: '#e8c8a8',
    g: '#c9a6ff',
    h: '#e8c8a8',
    i: '#f0e8d0',
  }),
};

// --- Lavandaia maggiore (palude, Sommersi) ----------------------------------------------------------------------

const WASHER_IDLE: SpriteFrame = [
  '......aaaa......',
  '.....abbbba.....',
  '....abbbbbba....',
  '....abcbbcba....',
  '....abbbbbba....',
  '...aabbbbbbaa...',
  '..abbbbbbbbbba..',
  '.abbbbbbbbbbbba.',
  'afbbbbbbbbbbbbfa',
  'adddddddddddddda',
  'adeeeeeeeeeeeeda',
  '.adddddddddddda.',
  '..abbbbbbbbbba..',
  '..abbbbbbbbbba..',
  '...abbba.abbba..',
  '...aaaa...aaaa..',
];

export const ELDER_WASHER_ART: BossArt = {
  walk: walk(WASHER_IDLE, variant(WASHER_IDLE, { 14: '..abbba..abbba..', 15: '..aaaa....aaaa..' })),
  casting: variant(WASHER_IDLE, { 9: 'adeeeeeeeeeeeeda', 8: 'afeeeeeeeeeeeefa' }),
  scale: 3,
  shadow: { radiusX: 26, radiusY: 8, offsetY: 27 },
  bob: { casting: -2, even: 0, odd: -1 },
  palette: (slowed: boolean, enraged: boolean): Palette => ({
    a: '#100c14',
    b: slowed ? '#5a7a9a' : '#3a3048',
    c: enraged ? '#ff6ab0' : '#b98cff',
    d: '#6a5a4a',
    e: '#b98cff',
    f: '#9aa890',
  }),
};

// --- Regina della colonia (palude, Colonia) ---------------------------------------------------------------------

const QUEEN_IDLE: SpriteFrame = [
  '.....d.dd.d.....',
  '.....dddddd.....',
  '....aaaaaaaa....',
  'a..abbcbbcbba..a',
  '.a.abbbbbbbba.a.',
  '..aaabbbbbbaaa..',
  '.a..aeeeeeea..a.',
  'a..aeeeeeeeea..a',
  '..aeeffeeffeea..',
  '.aeeeeeeeeeeeea.',
  'aeeffeeeeeffeeea',
  '.aeeeeeeeeeeeea.',
  '..aaaaaaaaaaaa..',
];

export const COLONY_QUEEN_ART: BossArt = {
  walk: walk(QUEEN_IDLE, variant(QUEEN_IDLE, { 3: '.a.abbcbbcbba.a.', 4: 'a..abbbbbbbba..a', 6: 'a...aeeeeeea...a', 7: '.a.aeeeeeeeea.a.' })),
  casting: variant(QUEEN_IDLE, { 0: '....dd.dd.dd....', 1: '....dddddddd....' }),
  scale: 3,
  shadow: { radiusX: 30, radiusY: 9, offsetY: 20 },
  bob: { casting: -2, even: 0, odd: -1 },
  palette: (slowed: boolean, enraged: boolean): Palette => ({
    a: '#140e0a',
    b: slowed ? '#4a6a7a' : '#3a2a20',
    c: enraged ? '#ff6a5a' : '#e6f56a',
    d: '#cddc58',
    e: slowed ? '#5a7080' : '#5a4a30',
    f: '#cddc58',
  }),
};

// --- Campione vuoto (fucina, Armeria) ---------------------------------------------------------------------------

const CHAMPION_IDLE: SpriteFrame = [
  '......aaaa......',
  '.....abbbba.....',
  '.....abccba.....',
  '.....abbbba.....',
  '..aaaabbbbaaaa..',
  '.abbbbbbbbbbbba.',
  'abbbabbbbbbabbba',
  'abbaabbddbbaabba',
  'abba.abbbba.abfa',
  '.aa..abbbba..afa',
  '.....abddba..afa',
  '.....abbbba..afa',
  '....abba.abba.fa',
  '....abba.abba.f.',
  '....abba.abba...',
  '...aaaa...aaaa..',
];

export const HOLLOW_CHAMPION_ART: BossArt = {
  walk: walk(CHAMPION_IDLE, variant(CHAMPION_IDLE, { 12: '...abba..abba.fa', 13: '...abba..abba.f.', 14: '...abba..abba...', 15: '..aaaa....aaaa..' })),
  casting: variant(CHAMPION_IDLE, {
    0: '......aaaa...f..',
    1: '.....abbbba..f..',
    2: '.....abccba..f..',
    3: '.....abbbba.afa.',
    8: 'abba.abbbba.abba',
    9: '.aa..abbbba..aa.',
    10: '.....abddba.....',
    11: '.....abbbba.....',
    12: '....abba.abba...',
    13: '....abba.abba...',
  }),
  scale: 3,
  shadow: { radiusX: 28, radiusY: 9, offsetY: 27 },
  bob: { casting: -3, even: 0, odd: -1 },
  palette: (slowed: boolean, enraged: boolean): Palette => ({
    a: '#14141c',
    b: slowed ? '#8ab0c0' : '#7a7a8a',
    c: enraged ? '#ff5a7a' : '#c8a0ff',
    d: '#e8e4f0',
    f: '#d8d8e8',
  }),
};

// --- Caposquadra di ferro (fucina, Miniera) ---------------------------------------------------------------------

const FOREMAN_IDLE: SpriteFrame = [
  '......dd........',
  '.....adda.......',
  '....aaaaaa......',
  '...abbbbbba.....',
  '...abcbbcba..gg.',
  '...abbbbbba..gg.',
  '..aaeeeeeeaa.f..',
  '.aeeeeeeeeeeaf..',
  'aeeeheeeeheeeaf.',
  'aeeeeeeeeeeeeaf.',
  '.aeeeeeeeeeea.f.',
  '..aeeeeeeeea....',
  '..aeea..aeea....',
  '..aeea..aeea....',
  '.aaaa....aaaa...',
];

export const IRON_FOREMAN_ART: BossArt = {
  walk: walk(FOREMAN_IDLE, variant(FOREMAN_IDLE, { 12: '..aeea...aeea...', 13: '...aeea.aeea....', 14: '..aaaa..aaaa....' })),
  casting: variant(FOREMAN_IDLE, {
    4: '...abcbbcba.....',
    5: '...abbbbbba.....',
    6: '..aaeeeeeeaagg..',
    7: '.aeeeeeeeeeeagg.',
  }),
  scale: 3,
  shadow: { radiusX: 28, radiusY: 9, offsetY: 25 },
  bob: { casting: -2, even: 0, odd: -1 },
  palette: (slowed: boolean, enraged: boolean): Palette => ({
    a: '#141418',
    b: slowed ? '#8ab0c0' : '#a08a70',
    c: enraged ? '#ff5a3c' : '#1a1410',
    d: '#fff0b0',
    e: slowed ? '#5a7080' : '#4a4a5a',
    f: '#6a4a2a',
    g: '#9a9aa8',
    h: '#c8c8d8',
  }),
};

// --- Orsa madre (ghiacciaio, Tana del gelo) ---------------------------------------------------------------------

const BEAR_IDLE: SpriteFrame = [
  '..aa........aa..',
  '.abba......abba.',
  '.abbbaaaaaabbba.',
  '..abbbbbbbbbba..',
  '..abcbbbbbbcba..',
  '..abbbbddbbbba..',
  '.aabbbbeebbbbaa.',
  'abbbbbbbbbbbbbba',
  'abbbbbbbbbbbbbba',
  'abbfbbbbbbbbfbba',
  'abbbbbbbbbbbbbba',
  '.abbbaaaaaabbba.',
  '.aaaa......aaaa.',
];

export const MOTHER_BEAR_ART: BossArt = {
  walk: walk(BEAR_IDLE, variant(BEAR_IDLE, { 11: 'abbba......abbba', 12: 'aaaa........aaaa' })),
  casting: variant(BEAR_IDLE, { 6: '.aabbbeeeebbbaa.' }),
  scale: 3,
  shadow: { radiusX: 30, radiusY: 9, offsetY: 21 },
  bob: { casting: -2, even: 0, odd: -2 },
  palette: (slowed: boolean, enraged: boolean): Palette => ({
    a: '#4a5a70',
    b: slowed ? '#bfe0f0' : '#e8f0f8',
    c: enraged ? '#ff5a6a' : '#1a1a24',
    d: '#3a3a44',
    e: '#d6c4ff',
    f: '#3a3a44',
  }),
};

// --- Astronomo (ghiacciaio, Osservatorio) -----------------------------------------------------------------------

const ASTRONOMER_IDLE: SpriteFrame = [
  '......f.......',
  '.....fff......',
  '......f.......',
  '....aaaaa.....',
  '...abbbbba....',
  '...abcbcba..gg',
  '...abbbbba.gg.',
  '..aeeeeeeeagg.',
  '.aeefeeefeeag.',
  '.aeeeeeeeeea..',
  '.aeeefeeeeea..',
  '.aeeeeeeefea..',
  '..aeeeeeeea...',
  '..aeeeeeeea...',
  '..aa.....aa...',
];

export const ASTRONOMER_ART: BossArt = {
  walk: walk(ASTRONOMER_IDLE, variant(ASTRONOMER_IDLE, { 14: '...aa...aa....' })),
  casting: variant(ASTRONOMER_IDLE, { 0: '.....f.f......', 1: '....fffff.....', 2: '.....f.f......' }),
  scale: 3,
  shadow: { radiusX: 22, radiusY: 7, offsetY: 24 },
  bob: { casting: -3, even: 0, odd: -2 },
  palette: (slowed: boolean, enraged: boolean): Palette => ({
    a: '#0e1428',
    b: slowed ? '#8ab0d0' : '#5a6aa8',
    c: enraged ? '#ff8ad0' : '#bfefff',
    e: slowed ? '#6a8ab0' : '#3a4a8a',
    f: '#eaf8ff',
    g: '#c8a050',
  }),
};
