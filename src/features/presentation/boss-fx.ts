/*
 * Identita' visiva dei boss oltre lo sprite: particelle d'ambiente sempre attive, aura e particelle della furia.
 * Solo aspetto, per id della grafica (`BossDefinition.art`). Valori provvisori.
 */

export interface BossFx {
  /** Particelle sempre attive attorno al boss (braci, spore, scorie, neve). `rise` negativo = salgono. */
  readonly ambient: { readonly colors: readonly string[]; readonly rate: number; readonly rise: number; readonly spread: number };
  /** In furia: particelle piu' fitte e un alone pulsante sotto il boss. */
  readonly rage: { readonly colors: readonly string[]; readonly rate: number; readonly glow: string };
}

export const BOSS_FX: Readonly<Record<string, BossFx>> = {
  guardian: {
    ambient: { colors: ['#ffb36b', '#ff8a4c', '#ffd8a0'], rate: 6, rise: -40, spread: 26 },
    rage: { colors: ['#ff5a3c', '#ffd27a', '#ff7b4a'], rate: 28, glow: '#ff4a2a' },
  },
  spore_mother: {
    ambient: { colors: ['#d9e86a', '#a9c95a', '#eef7b0'], rate: 8, rise: -14, spread: 36 },
    rage: { colors: ['#c08cff', '#e2ff7a', '#9f6bff'], rate: 26, glow: '#9c5cff' },
  },
  forge_colossus: {
    ambient: { colors: ['#ff9a3d', '#ffcf6a', '#6a5850'], rate: 10, rise: -50, spread: 44 },
    rage: { colors: ['#ff6a1a', '#ffd04a', '#ff3d12'], rate: 32, glow: '#ff5a00' },
  },
  frost_warden: {
    ambient: { colors: ['#e6f7ff', '#9fe4ff', '#ffffff'], rate: 7, rise: 12, spread: 30 },
    rage: { colors: ['#8fe6ff', '#c9b3ff', '#f2fbff'], rate: 26, glow: '#6fd8ff' },
  },
};

const FALLBACK_FX = BOSS_FX.guardian!;

export function bossFx(art: string): BossFx {
  return BOSS_FX[art] ?? FALLBACK_FX;
}
