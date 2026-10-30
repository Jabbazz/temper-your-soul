import type { ProjectileVisual } from '../combat/projectile';
import type { Team } from '../combat/team';

/** Aspetto di un tipo di proiettile: le regole scelgono l'id (`ProjectileSpec.visual`), qui stanno colore e forma. */
export interface ProjectileLook {
  readonly color: string;
  /** `dart`: freccia (dardo arcano); `diamond`: rombo rotante (gelo); `orb`: sfera (proiettili nemici). */
  readonly shape: 'dart' | 'diamond' | 'orb';
}

export const PROJECTILE_LOOKS: Record<ProjectileVisual, ProjectileLook> = {
  arcane_bolt: { color: '#c1a4ff', shape: 'dart' },
  frost_orb: { color: '#8be9fa', shape: 'diamond' },
  ember_nova: { color: '#ee9867', shape: 'orb' },
  ember_volley: { color: '#f2c56e', shape: 'orb' },
  void_spiral: { color: '#c49af5', shape: 'orb' },
  ember_fan: { color: '#ffcf83', shape: 'orb' },
};

/** Colori delle zone di pericolo: del giocatore (viola) e del nemico (arancio). */
export const ZONE_LOOKS: Record<Team, { readonly ring: string; readonly burst: string; readonly fill: string }> = {
  player: { ring: '#c5a1ff', burst: '#cba5ff', fill: '#9b68ec20' },
  enemy: { ring: '#ff9670', burst: '#ff9c64', fill: '#ec563026' },
};
