export type AtlasRect = readonly [number,number,number,number];
export const PORTRAIT_ATLASES = {
  armor:{url:new URL('../../assets/portraits/armor-a.png',import.meta.url).href,width:1536,height:1024},
  equipment:{url:new URL('../../assets/portraits/equipment-a.png',import.meta.url).href,width:1448,height:1086},
};
/** Ritagli registrati dopo l'ispezione dell'atlante: non dipendono da una griglia generata perfetta. */
export const PORTRAIT_CROPS: Readonly<Record<string,readonly [AtlasRect,AtlasRect?]>> = {
  arcane_staff:[[166,0,160,425]],hunter_bow:[[495,0,190,438]],storm_scepter:[[825,85,200,320]],guardian_blade:[[1210,80,210,320]],
  forge_hammer:[[130,420,260,385]],frost_lance:[[505,392,185,438]],frost_grimoire:[[808,540,280,235]],spirit_talisman:[[1180,475,240,330]],
  spore_fan:[[0,802,330,278]],astral_boots:[[440,837,270,205]],wind_boots:[[780,837,290,205]],bog_boots:[[1120,837,310,205]],
  meteor_mantle:[[0,15,357,495],[0,531,355,480]],ember_aegis:[[355,45,255,420],[370,540,220,430]],
  tomb_shroud:[[610,35,300,470],[615,540,285,475]],forge_plate:[[914,30,280,475],[921,535,270,470]],
  blizzard_veil:[[1200,30,336,475],[1207,540,329,480]],
};
