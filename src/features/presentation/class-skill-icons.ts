import type { ItemSprite } from './item-sprites';

/** Icone locali disegnate nel codice: sagome differenti per i ruoli, nessuna generazione di immagini. */
const SHAPES = {
  sword: ['..........xx','.........xxx','........xxx.','.......xxx..','......xxx...','.....xxx....','..x.xxx.....','...xxx......','..xxxxx.....','.xx...x.....','xx..........'],
  shield: ['..xxxxxxxx..','..xxxxxxxx..','..xxx..xxx..','..xxx..xxx..','..xxxxxxxx..','...xxxxxx...','...xxxxxx...','....xxxx....','.....xx.....'],
  heart: ['..xxx..xxx..','.xxxxxxxxxx.','.xxxxxxxxxx.','..xxxxxxxx..','...xxxxxx...','....xxxx....','.....xx.....'],
  arrow: ['.........x..','.........xx.','xxxxxxxxxxxx','.........xx.','.........x..','....xx......','...xx.......','..xx........'],
  wolf: ['..xx....xx..','..xxx..xxx..','..xxxxxxxx..','..xx.xx.xx..','...xxxxxx...','....xxxx....','.....xx.....','...xxxxxx...','..xxxxxxxx..'],
  run: ['.....xx.....','.....xx.....','...xxxxx....','..xx.xx.xx..','.....xx.....','....xxxx....','...xx.xx....','..xx...xx...','.xx.....xx..'],
  fire: ['.....x......','....xxx.....','....xxxx....','..x.xxxx....','..xxxxxxx...','.xxxxxxxxx..','.xxxxxxxxx..','..xxxxxxx...','...xxxxx....'],
  water: ['.....x......','....xxx.....','....xxx.....','...xxxxx....','..xxxxxxx...','..xxxxxxx...','..xxxxxxx...','...xxxxx....'],
  earth: ['....xxxx....','...xxxxxx...','..xxxxxxxx..','.xxxxxxxxxx.','..xxxxxxxx..','...xxxxxx...','....xxxx....'],
  wind: ['..xxxxxxx...','.........xx.','..xxxxxxxx..','xx..........','.xxxxxxxxxx.','..........xx','..xxxxxxxx..'],
  blink: ['x..........x','.x........x.','..x......x..','....xxxx....','...xxxxxx...','...xxxxxx...','....xxxx....','..x......x..','.x........x.','x..........x'],
} as const;

function icon(shape: keyof typeof SHAPES, color: string): ItemSprite {
  const rows = SHAPES[shape];
  return { pixels: Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => {
    if (x === 0 || y === 0 || x === 15 || y === 15) return 'b';
    return rows[y - 3]?.[x - 2] === 'x' ? ((x + y) % 4 === 0 ? 'h' : 'm') : '.';
  }).join('')), palette: { m: color, h: '#fff1cf', b: '#786449' } };
}
export const CLASS_SKILL_ICONS: Readonly<Record<string, ItemSprite>> = {
  guardian_blade: icon('sword', '#efc36c'), forge_hammer: icon('sword', '#ff9958'), frost_lance: icon('sword', '#b2d3db'),
  spirit_talisman: icon('shield', '#e4c68a'), ember_aegis: icon('heart', '#e5b16a'), forge_plate: icon('shield', '#ee9466'),
  bog_boots: icon('run', '#b5c58a'), grave_boots: icon('run', '#d2ccaa'), ember_treads: icon('run', '#ffad73'),
  hunter_bow: icon('arrow', '#a8db90'), thorn_bow: icon('arrow', '#c7d383'), spore_fan: icon('heart', '#d36e79'),
  reed_mantle: icon('wolf', '#c8d7ba'), wind_boots: icon('run', '#a4e7c9'),
  arcane_bolt: icon('fire', '#ff9662'), storm_scepter: icon('wind', '#b5edd7'), frost_orb: icon('water', '#7dd4f5'),
  ossuary_lantern: icon('earth', '#d4b381'), cinder_orb: icon('fire', '#ffba75'), glacier_mirror: icon('water', '#b1eaff'),
  meteor: icon('fire', '#f48063'), tomb_shroud: icon('earth', '#c2ae84'), blizzard_veil: icon('water', '#91c8ec'),
  astral_step: icon('blink', '#d7b8f0'), rime_boots: icon('blink', '#a5dfea'),
};
