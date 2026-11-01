import type { Palette, SpriteFrame } from './sprites';

export interface ItemSprite {
  readonly pixels: SpriteFrame;
  readonly palette: Palette;
}

// Disegni originali a 16×16: stessa identità a ogni rarità, senza asset remoti.
function art(rows: readonly string[], main: string, light: string, accent: string): ItemSprite {
  return {
    pixels: [...rows.map((row) => row.padEnd(16, '.')), ...Array<string>(16 - rows.length).fill('.'.repeat(16))],
    palette: { o: '#171521', s: '#554352', m: main, h: light, a: accent, g: '#e5bc73', w: '#f3eee1' },
  };
}

export const BACKPACK_SPRITE = art([
  '......oooo', '.....oggggo', '....og....go', '....oooooooo', '...oommmmmmoo',
  '..osmhmmmmhmso', '..osmhgggghmso', '..osmmgoogmmso', '..osmmgoogmmso',
  '..osmmmmmmmmso', '..osmoooooomso', '..osmoggggomso', '..osmommmmomso',
  '...osmmmmmmso', '....oooooooo',
], '#93623e', '#ce9860', '#88bbb0');

export const ITEM_SPRITES: Readonly<Record<string, ItemSprite>> = {
  ossuary_lantern:art(['......ggg','.....g...g','.....ggggg','....ogggggo','....omwwmmo','....omwwmmo','....omwwmmo','....ogggggo','.....ohmho','......ooo'], '#6b7765','#d6dec2','#9be5b2'),
  grave_boots:art(['...oooo..oooo','...ohho..ohho','...ommo..ommo','...ohho..ohho','...osso..osso','...ommoo.ommoo','..ohmmmoohmmmo','..oggggooggggo','...oooo..oooo'], '#7a7772','#e2dbc0','#a9bba5'),
  thorn_bow:art(['.........gg','........gm','...a....mg','....a..gm','.....a.mg','......gg','.....gmg','....mg.a','...gm...a','..gm.....a','...gg'], '#54753c','#ceda89','#a07551'),
  reed_mantle:art(['.....g..g','....mg..gm','...ommmmmmo','..ommaammmo','..omaammaamo','...ommmmmmo','...ommmmmmo','..gmgmgmgmg','..gmgmgmgmg','...g.g.g.g'], '#557146','#c1ca83','#9cac52'),
  cinder_orb:art(['......aaa','....aawwaa','...agmmmmga','...gmmwwmmg','..agmmwwmmga','...gmmmmmmg','...agmmmmga','....gggggg','.....oggo','......oo'], '#773a31','#ffc268','#ec7334'),
  ember_treads:art(['...oooo..oooo','...ommo..ommo','...oaao..oaao','...owwo..owwo','...oaao..oaao','...ommoo.ommoo','..omwaaoomwaao','..oggggooggggo','...oooo..oooo'], '#68433b','#ffd287','#ff823b'),
  glacier_mirror:art(['.....aaaaa','....ahhhha','...ahwwwhha','...ahwmwwha','...ahwwmwha','...ahwwwhha','....ahhhha','.....aaaa','......gg','......gg','......oo'], '#5186a7','#d8f8ff','#8bc8ed'),
  rime_boots:art(['....a....a','...aha..aha','...ommo..ommo','..ahmmo.ahmmo','...ommo..ommo','...ommoo.ommoo','..ohmmmoohmmmo','..oaaooooaaoo','...oooo..oooo'], '#547e9c','#e2faff','#9cd6ef'),
  arcane_staff: art(['.........aa', '........ahwa', '........aaao', '.........go', '........ogo', '.......ogo', '......ogo', '.....ogo', '....ogo', '...ogo', '..ogo', '..oo'], '#8d61b9', '#cfb1f7', '#b984f4'),
  hunter_bow: art(['....og', '.....ogh', '.....og.h', '......og.h', '......og..h', '..aaaaagggwa', '......og..h', '......og.h', '.....og.h', '.....ogh', '....og'], '#98704c', '#e6c493', '#93b87b'),
  storm_scepter: art(['.......a', '......awa', '.....ahmha', '......ama', '.....oggo', '......go', '......go', '......go', '.....ogo', '.....go', '.....go', '....ogo'], '#438d9d', '#b4ecdf', '#64d9f3'),
  frost_grimoire: art(['...ooooooooo', '..ohhhhhhhho', '..ohmmmmmmmo', '..ohmmaammmo', '..ohmawwammo', '..ohmmaammmo', '..ohmmmaammo', '..ohmmmmmmmo', '..oggggggggo', '..owwwwwwwo', '...ooooooo'], '#3b73ac', '#8cceed', '#b9f0ff'),
  spirit_talisman: art(['..gggggggg','..gmmmmmmg','..gmmhhmmg','..gmmhhmmg','..gmmmmmmg','...gmmmmg','....gmmg','.....gg'], '#79756a', '#ead5a4', '#c3a974'),
  meteor_mantle: art(['.....oo..oo', '....omhoohmo', '...ommhmmhmmo', '..ommmhmmhmmmo', '..ommmmaammmmo', '..ommmaggammmo', '...ommmaammmo', '...ommmmmmmo', '..ommmmmmmmmo', '..ommmmmmmmmo', '.ommmmoommmmmo', '..oooo..ooooo'], '#63458c', '#af83ce', '#f5a25d'),
  ember_aegis: art(['...ooooooooo', '..ogggggggggo', '..ogmmmmmmmgo', '..ogmmmaammgo', '..ogmmawammgo', '...ogmawamgo', '...ogmawamgo', '....ogaaago', '.....ogmgo', '......ogo', '.......o'], '#813b39', '#df9260', '#ffb84f'),
  astral_boots: art(['...oooo..oooo', '...ohmo..ohmo', '...ommo..ommo', '...oaao..oaao', '...ommo..ommo', '...ommoo.ommoo', '..ohmmmoohmmmo', '..ommmmoommmmo', '..oggggooggggo', '...oooo..oooo'], '#7359a0', '#d3b9f3', '#90e1ff'),
  wind_boots: art(['....ooo...ooo', '...ohmo..ohmo', '...ommo..ommo', '.whommo.whommo', '..whamo..whamo', '...wamo...wamo', '...ommoo..ommoo', '..ohmmmo.ohmmmo', '..oooooo.oooooo'], '#418a86', '#a2ddd1', '#d5ebc7'),
  guardian_blade: art(['..........ow', '.........ohwo', '........ohmo', '.......ohmo', '......ohmo', '.....ohmo', '....ohmo', '..gohmo', '...ggg', '...ogg', '..ogo.g', '.ogo', '..o'], '#82999d', '#d5e3d6', '#94cfc7'),
  tomb_shroud: art(['......oooo', '.....ohhhho', '....ohmmmhho', '...ohmooommho', '...omooaoommo', '...ommooommmo', '....ommmmmmo', '...ommmmmmmmo', '..ommmssmmmmmo', '..ommmssmmmmmo', '.ommmsoosmmmmmo', '..omoo..oommoo', '...o......oo'], '#718b86', '#bacdb4', '#9ce9cc'),
  spore_fan: art(['...aaa..aaa', '..ahhhaaahhha', '.ahmmhaahmmhha', '.ahmmmhhmmmmha', '..ammmmmmmma', '...ammmmmma', '....ammmma', '.....agga', '......gg', '......go', '......o'], '#7b477f', '#d5a9c1', '#b3d780'),
  bog_boots: art(['...oooo..oooo', '...ommo..ommo', '..aommo.aommo', '...oamo..oamo', '...omao..omao', '..aommoo.ommoo', '..ohmmmoohmmmo', '..omaaaoomaaao', '..ossssoosssso', '...oooo..oooo'], '#596e3f', '#a8b76d', '#a2cf4d'),
  forge_hammer: art(['......ooooooo', '.....oghhhhgo', '.....ogmaamgo', '.....ogmaamgo', '......oggggo', '.......ogo', '......ogo', '.....ogo', '....ogo', '...ogo', '..ogo', '...o'], '#8b5140', '#c0a18a', '#ff9c3d'),
  forge_plate: art(['...ooo..ooo', '..ohmhoogmho', '.ohmmgggmmhho', '.ommmgggmmmmo', '..ommawammo', '...omaaammo', '...ommaammo', '...ommmmmmo', '..oggggggggo', '..ommmmmmmmo', '...ooo..ooo'], '#724d43', '#c5a58a', '#ff974a'),
  frost_lance: art(['...........w', '..........awa', '.........ahwa', '.........amo', '........ogo', '.......ogo', '......ogo', '.....ogo', '....ogo', '...ogo', '..ogo', '.ogo', '..o'], '#5091bc', '#b5ecf5', '#77d5f5'),
  blizzard_veil: art(['.....aa..aa', '....ahhaahha', '...ahmmhhmmha', '..ahmmhmmhmmha', '..ammwhmmhwmma', '...ammwhwmmma', '...ammmwmmmma', '...ammwhwmmma', '..ammwhmmhwmma', '..ammmmmmmmmma', '...aamammamaa', '.....a.aa.a'], '#477298', '#a0d9e9', '#d8f6fa'),
};
