import type { ItemSprite } from './item-sprites';
/** Icone originali pixel art: registro obbligatorio per ogni nuova skill. */
const PATTERNS = {"bolt":["......xx",".....xxx","....xxx","...xxxxxx","......xx",".....xx","....xx"],"orb":[".....xxxx","...xxxxxxxx","..xxxxxxxxxx","..xxxxxxxxxx","...xxxxxxxx",".....xxxx"],"meteor":[".........xx",".......xxx",".....xxxx","...xxxxxx","..xxxxxxx","..xxxxxx","...xxxx"],"blade":["..........xx",".........xx","........xx",".......xx","......xx","...x.xx","....xx","...x..x"],"wave":["...x....x","..xxx..xxx",".xxxxxxxxxx","..xxxxxxxx","...xxxxxx","....xxxx"],"dash":["..xx....xx","....xx....xx","......xx....xx","....xx....xx","..xx....xx"]};
const DEFINITIONS: Record<string, readonly [keyof typeof PATTERNS, string]> = {"arcane_bolt":["bolt","#b889ff"],"frost_orb":["orb","#72dcff"],"meteor":["meteor","#ff784d"],"astral_step":["dash","#c29aff"],"hunter_bow":["blade","#9cdf80"],"storm_scepter":["bolt","#ffe570"],"guardian_blade":["blade","#ffe1a0"],"forge_hammer":["meteor","#ffb451"],"frost_lance":["blade","#9ef7ff"],"spirit_talisman":["wave","#9df6d3"],"spore_fan":["wave","#b3e478"],"ember_aegis":["orb","#ff873d"],"tomb_shroud":["wave","#b797e8"],"forge_plate":["wave","#ff674d"],"blizzard_veil":["wave","#85cfff"],"wind_boots":["dash","#c2f8e5"],"bog_boots":["dash","#a6c76c"]};
const DUNGEON_ICONS:typeof DEFINITIONS={ossuary_lantern:['orb','#c3e4be'],grave_boots:['dash','#c8c9b1'],thorn_bow:['blade','#97c15b'],reed_mantle:['wave','#bad17d'],cinder_orb:['meteor','#ff9841'],ember_treads:['dash','#ff9b57'],glacier_mirror:['wave','#c5f3ff'],rime_boots:['dash','#90d9fb']};
export const SKILL_ICONS: Readonly<Record<string, ItemSprite>> = Object.fromEntries(Object.entries({...DEFINITIONS,...DUNGEON_ICONS}).map(([id, [shape, color]]) => {
 const pixels = Array.from({length:16}, (_, y) => Array.from({length:16}, (_, x) => {
 const row = PATTERNS[shape][y-3];
 return row?.[x-1] === 'x' ? ((x+y)%4 === 0 ? 'h' : 'm') : (x===0||y===0||x===15||y===15 ? 'b' : '.');
 }).join(''));
 return [id, {pixels, palette:{m:color,h:'#fff7dc',b:'#786449'}}];
}));
