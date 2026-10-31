// File generato da tools/arte/prepara_boss.py: non modificarlo a mano, rilancia lo script.

import type { SheetLayout } from './boss-sheet';

/** Animated Statue (Calciumtrice), variante grigia. */
export const guardianLayout: SheetLayout = {
  url: new URL('../../../assets/art/boss/guardian.png', import.meta.url).href,
  cell: { width: 50, height: 64 },
  feet: { x: 17, y: 64 },
  clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 5 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 5 }, transform: { row: 4, frames: 4 }, death: { row: 5, frames: 6 } },
};

/** Demon Flower Monster (Rosswet Mobile). */
export const sporeMotherLayout: SheetLayout = {
  url: new URL('../../../assets/art/boss/spore_mother.png', import.meta.url).href,
  cell: { width: 50, height: 43 },
  feet: { x: 29, y: 43 },
  clips: { walk: { row: 0, frames: 4 }, attack: { row: 1, frames: 14 }, rageWalk: { row: 2, frames: 4 }, rageAttack: { row: 3, frames: 14 }, transform: { row: 4, frames: 9 }, death: { row: 5, frames: 8 } },
};

/** Enemy Galore I, golem (Admurin). */
export const forgeColossusLayout: SheetLayout = {
  url: new URL('../../../assets/art/boss/forge_colossus.png', import.meta.url).href,
  cell: { width: 31, height: 32 },
  feet: { x: 14, y: 30 },
  clips: { walk: { row: 0, frames: 4 }, attack: { row: 1, frames: 11 }, rageWalk: { row: 2, frames: 4 }, rageAttack: { row: 3, frames: 12 }, transform: { row: 4, frames: 5 }, death: { row: 5, frames: 9 } },
};

/** EVil Wizard 2 (LuizMelo). */
export const frostWardenLayout: SheetLayout = {
  url: new URL('../../../assets/art/boss/frost_warden.png', import.meta.url).href,
  cell: { width: 164, height: 151 },
  feet: { x: 43, y: 138 },
  clips: { walk: { row: 0, frames: 8 }, attack: { row: 1, frames: 8 }, rageWalk: { row: 2, frames: 8 }, rageAttack: { row: 3, frames: 8 }, death: { row: 4, frames: 7 } },
};
