import { variant, type MinionArt } from './minion-art';

/*
 * Fucina, vene B e C. Armeria: acciaio, latta, legno delle rastrelliere, visiere lilla. Miniera: roccia scura, vene di
 * ferro, legno dei castelletti, la lampada dei minatori. Niente arancio vivo: sulla lava si perderebbe.
 */

// --- Armeria ----------------------------------------------------------------------------------------------------

const BLADE_BODY = ['ac.aaaaa.', 'acbbbbbbd', 'ac.aaaaa.'];

/** Lama volante: una spada senza mano, l'elsa d'ottone e il filo che luccica. */
const BLADE: MinionArt = {
  frames: [BLADE_BODY, variant(BLADE_BODY, { 1: 'acbdbbbbd' })],
  scale: 3,
  palette: { a: '#2a2a34', b: '#8a8a9a', c: '#c8a060', d: '#e8e4f0' },
  color: '#e8e4f0',
  glow: '',
  fps: 8,
};

const PAGE_BODY = ['..aaaa..', '.abbbba.', '.abccba.', '.abbbba.', 'aabddbaa', 'abbbbbba', 'adbbbbda', '.abbbba.', '.ab..ba.', '.aa..aa.'];

/** Paggio di latta: un'armatura piccola, la visiera scura e i rivetti chiari. */
const PAGE: MinionArt = {
  frames: [PAGE_BODY, variant(PAGE_BODY, { 8: 'ab....ba', 9: 'aa....aa' })],
  scale: 3,
  palette: { a: '#1a1a24', b: '#8a8a9a', c: '#1a1a24', d: '#f0e8ff' },
  color: '#c8c8d8',
  glow: '',
  fps: 6,
};

const CROSSBOW_BODY = ['.....a.....', '....aba....', 'bbbbacabbbb', '....aca....', '....aca....', '...adcda...', '..a..a..a..', '.a...a...a.'];

/** Balestra a ripetizione: archi d'acciaio su un treppiede, il dardo bianco pronto. */
const CROSSBOW: MinionArt = {
  frames: [CROSSBOW_BODY, variant(CROSSBOW_BODY, { 1: 'b...aba...b', 2: '.bbbacabbb.' })],
  scale: 3,
  palette: { a: '#1a1a20', b: '#8a8a9a', c: '#6a4a2a', d: '#f0e8ff' },
  color: '#f0e8ff',
  glow: '',
  fps: 4,
  bob: false,
};

const FLAIL_BODY = ['....aa....', '.a.abba.a.', '..abbbba..', 'aabcbbbbaa', '.abbbbcba.', 'aabbbbbbaa', '..abcbba..', '.a.abba.a.', '....dd....', '....d.....'];

/** Mazzafrusto: la palla chiodata che gira, con i riflessi viola. */
const FLAIL: MinionArt = {
  frames: [FLAIL_BODY, variant(FLAIL_BODY, { 1: '..aabbaa..', 3: '.abcbbbba.', 5: '.abbbbbba.', 7: '..aabbaa..' })],
  scale: 3,
  palette: { a: '#14141c', b: '#6a6a7a', c: '#c8a0ff', d: '#8a8a9a' },
  color: '#c8a0ff',
  glow: '',
  fps: 8,
};

const ARMOR_BODY = [
  '....aaaa....',
  '...abbbba...',
  '...abccba...',
  '...abbbba...',
  '.aaaabbaaaa.',
  'abbbabbabbba',
  'abbbbbbbbbba',
  'abdbbbbbbdba',
  '.abbbbbbbba.',
  '.aabbddbbaa.',
  '..abbbbbba..',
  '..abb..bba..',
  '..abb..bba..',
  '.aaaa..aaaa.',
];

/** Armatura vuota: acciaio scuro, la visiera accesa di viola e nessuno dentro. */
const ARMOR: MinionArt = {
  frames: [ARMOR_BODY, variant(ARMOR_BODY, { 2: '...acbbca...' })],
  scale: 3,
  palette: { a: '#14141c', b: '#7a7a8a', c: '#c8a0ff', d: '#e8e4f0' },
  color: '#c8a0ff',
  glow: '',
  fps: 3,
};

const ARMORER_BODY = ['...aaa...', '..abbba..', '..acbca..', '..abbba..', '.aeeeeea.', 'aeeffeeea', 'aeeffeeeg', 'aeeeeeeg.', '.aeeeeg..', '.aeeeea..', '.aeeeea..', '..aa.aa..'];

/** Armaiolo: grembiule di cuoio e le tenaglie che si aprono e si chiudono. */
const ARMORER: MinionArt = {
  frames: [ARMORER_BODY, variant(ARMORER_BODY, { 6: 'aeeffeeea', 7: 'aeeeeeeag', 8: '.aeeeeagg' })],
  scale: 3,
  palette: { a: '#14100c', b: '#c8a080', c: '#1a1410', e: '#5a3a2a', f: '#8a6a4a', g: '#9a9aa8' },
  color: '#9fe8ff',
  glow: '',
  fps: 3,
};

const RACK_BODY = ['..d....d....d.', '.ada..ada..ada', '.ada..ada..ada', '.ada..ada..ada', '.aca..aca..aca', 'aaaaaaaaaaaaaa', 'abbbbbbbbbbbba', 'aaaaaaaaaaaaaa', 'ab..........ba', 'aa..........aa'];

/** Rastrelliera: tre spade appese; quando una manca, e' in volo. */
const RACK: MinionArt = {
  frames: [
    RACK_BODY,
    variant(RACK_BODY, { 0: '..d....d......', 1: '.ada..ada.....', 2: '.ada..ada.....', 3: '.ada..ada.....', 4: '.aca..aca.....' }),
  ],
  scale: 3,
  palette: { a: '#1a140c', b: '#6a4a2a', c: '#c8a060', d: '#d8d8e8' },
  color: '#d8d8e8',
  glow: '',
  fps: 2,
  bob: false,
};

// --- Miniera ----------------------------------------------------------------------------------------------------

const CANARY_BODY = ['..aa..', '.abca.', 'abbbda', 'abbba.', '.aba..', '..a...'];

/** Canarino del grisou: piccolo e giallo, l'unica cosa allegra della miniera. */
const CANARY: MinionArt = {
  frames: [CANARY_BODY, variant(CANARY_BODY, { 3: 'aabbaa', 4: '.abba.' })],
  scale: 3,
  palette: { a: '#2a2010', b: '#f0d040', c: '#1a1410', d: '#d8c8a0' },
  color: '#f0d040',
  glow: '',
  fps: 10,
};

const MINER_BODY = ['...dd...', '..adda..', '.aaaaaa.', '.abbbba.', '.acbcba.', '.abbbba.', 'aaeeeeaa', 'aeeffeea', 'aeeeeeea', '.ae..ea.', '.aa..aa.'];

/** Minatore dannato: elmetto con la lampada accesa, la tuta sporca. */
const MINER: MinionArt = {
  frames: [MINER_BODY, variant(MINER_BODY, { 9: 'ae....ea', 10: 'aa....aa' })],
  scale: 3,
  palette: { a: '#141418', b: '#a08a70', c: '#1a1410', d: '#fff0b0', e: '#4a4a5a', f: '#8a8a9a' },
  color: '#fff0b0',
  glow: '#e8d890',
  fps: 4,
};

const MOLE_BODY = ['...aaaa...', '..abbbba..', '.abcbbbba.', 'ddabbbbbba', 'dddabbbbba', 'ddabbbbbba', '.abbbbbba.', '..aa..aa..'];

/** Talpa di ferro: un corpo corazzato con il naso a trivella che gira. */
const MOLE: MinionArt = {
  frames: [MOLE_BODY, variant(MOLE_BODY, { 3: '.dabbbbbba', 5: '.dabbbbbba' })],
  scale: 3,
  palette: { a: '#14141c', b: '#5a5a6a', c: '#f0e8ff', d: '#c8c8d8' },
  color: '#c8c8d8',
  glow: '',
  fps: 10,
};

const BLASTER_BODY = ['...aaa...', '..abbba..', '..acbca..', '..abbba..', '.aeeeeea.', 'aeeffeeea', 'aeeffeeea', '.aeeeeea.', '.aeeeeea.', '.ae...ea.', '.aa...aa.'];

/** Fochino: giacca scura con i candelotti rossi; la miccia sfavilla. */
const BLASTER: MinionArt = {
  frames: [BLASTER_BODY, variant(BLASTER_BODY, { 4: '.aeeeeeag' })],
  scale: 3,
  palette: { a: '#141418', b: '#c8a080', c: '#1a1410', e: '#3a3a4a', f: '#d84a5a', g: '#e8e4f0' },
  color: '#e8e4f0',
  glow: '',
  fps: 4,
};

const CART_BODY = ['..dddddddd..', '.ddcddddcdd.', 'aaaaaaaaaaaa', 'abbbbbbbbbba', 'abbbbbbbbbba', 'abbbbbbbbbba', 'aaaaaaaaaaaa', '.aea....aea.', '..a......a..'];

/** Carrello impazzito: il minerale con due occhi, sopra un carrello senza binari. */
const CART: MinionArt = {
  frames: [CART_BODY, variant(CART_BODY, { 7: '.aaa....aaa.', 8: '..e......e..' })],
  scale: 3,
  palette: { a: '#14100c', b: '#5a3a24', c: '#f0e8ff', d: '#6a6a7a', e: '#9a9aa8' },
  color: '#9a9aa8',
  glow: '',
  fps: 8,
};

const ORE_GIANT_BODY = [
  '....aaaaaa....',
  '...abbbbbba...',
  '...abcbbcba...',
  '...abbbbbba...',
  '.aaaabbbbaaaa.',
  'abbbadbbdabbba',
  'abdbbbdbbbbdba',
  'abbbbbbbdbbbba',
  'aaabbdbbbbbaaa',
  '..abbbbdbbba..',
  '..abbbbbbbba..',
  '..abbba.abbba.',
  '..abba..abba..',
  '.aaaa....aaaa.',
];

/** Gigante di minerale: roccia scura attraversata da vene di ferro chiaro. */
const ORE_GIANT: MinionArt = {
  frames: [ORE_GIANT_BODY, variant(ORE_GIANT_BODY, { 11: '.abbba..abbba.', 12: '.abba....abba.', 13: 'aaaa......aaaa' })],
  scale: 3,
  palette: { a: '#14141a', b: '#4a4a54', c: '#e8e4f0', d: '#9a9aa8' },
  color: '#e8e4f0',
  glow: '',
  fps: 3,
};

const SHAFT_BODY = ['....aaaa....', '...ac..ca...', '...a.cc.a...', '..a.a..a.a..', '..a..aa..a..', '.a..a..a..a.', '.a.a....a.a.', 'aaaaaaaaaaaa', 'abbbbbbbbbba', 'abddddddddba', 'abddddddddba', 'aaaaaaaaaaaa'];

/** Pozzo della miniera: il castelletto di legno con la ruota che gira sopra il buio. */
const SHAFT: MinionArt = {
  frames: [SHAFT_BODY, variant(SHAFT_BODY, { 1: '...a.cc.a...', 2: '...ac..ca...' })],
  scale: 3,
  palette: { a: '#3a2a1a', b: '#5a5a64', c: '#9a9aa8', d: '#0a0810' },
  color: '#9a9aa8',
  glow: '',
  fps: 3,
  bob: false,
};

export const FORGE_VEIN_ART: Readonly<Record<string, MinionArt>> = {
  forge_blade: BLADE,
  forge_page: PAGE,
  forge_crossbow: CROSSBOW,
  forge_flail: FLAIL,
  forge_armor: ARMOR,
  forge_armorer: ARMORER,
  forge_rack: RACK,
  forge_canary: CANARY,
  forge_miner: MINER,
  forge_mole: MOLE,
  forge_blaster: BLASTER,
  forge_cart: CART,
  forge_ore_giant: ORE_GIANT,
  forge_shaft: SHAFT,
};
