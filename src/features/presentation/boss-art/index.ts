import type { BossArt } from './boss-art';
import { FORGE_COLOSSUS_ART } from './forge-colossus';
import { FROST_WARDEN_ART } from './frost-warden';
import { GUARDIAN_ART } from './guardian';
import { SPORE_MOTHER_ART } from './spore-mother';

export type { BossArt } from './boss-art';
export type { BossSheet, SheetFrame, SheetState } from './boss-sheet';
export { DEATH_ANIMATION_SHARE, sheetFrame } from './boss-sheet';
export { BOSS_SHEETS, bossSheet } from './boss-sheets';

/** La grafica dei boss, per id (`BossDefinition.art`). */
export const BOSS_ART: Readonly<Record<string, BossArt>> = {
  guardian: GUARDIAN_ART,
  spore_mother: SPORE_MOTHER_ART,
  forge_colossus: FORGE_COLOSSUS_ART,
  frost_warden: FROST_WARDEN_ART,
};

/** La grafica di un boss; se l'id e' sconosciuto usa quella del guardiano (un test controlla che i dati non ne usino). */
export function bossArt(id: string): BossArt {
  return BOSS_ART[id] ?? GUARDIAN_ART;
}
