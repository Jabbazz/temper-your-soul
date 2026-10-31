import { Vec2 } from '../../core/vec2';
import type { Loadout, SkillDefinition } from './skill-definition';

/*
 * Le quattro skill di base del mago (quelle del prototipo), nell'ordine degli slot. Sono la dotazione iniziale:
 * le famiglie di oggetti "base" (`items/item-families.ts`) le concedono a rarita' Comune.
 * Valori ereditati dal prototipo, provvisori (vedi docs/game-design.md): non definiscono il bilanciamento.
 */

/** I proiettili del giocatore partono leggermente sopra i piedi, all'altezza del bastone. */
export const MUZZLE = new Vec2(0, -7);

export const ARCANE_BOLT: SkillDefinition = {
  id: 'arcane_bolt',
  name: '✦ Dardo arcano',
  description: 'Tieni premuto · Attacco rapido',
  cooldown: 0.2,
  visual: 'arcane_bolt',
  effect: {
    kind: 'projectile',
    muzzleOffset: MUZZLE,
    projectile: { team: 'player', speed: 440, damage: 19, radius: 4, lifetime: 2.5, visual: 'arcane_bolt' },
  },
};

export const FROST_ORB: SkillDefinition = {
  id: 'frost_orb',
  name: '◆ Globo di gelo',
  description: 'Rallenta il boss · Anche con SX premuto',
  cooldown: 2.4,
  visual: 'frost_orb',
  effect: {
    kind: 'projectile',
    muzzleOffset: MUZZLE,
    projectile: { team: 'player', speed: 310, damage: 100, radius: 8, lifetime: 2.5, visual: 'frost_orb', slowSeconds: 2 },
  },
};

export const METEOR: SkillDefinition = {
  id: 'meteor',
  name: '☄ Meteora',
  description: 'Esplode nel punto mirato · Combinabile',
  cooldown: 5,
  visual: 'meteor',
  effect: { kind: 'ground_blast', zone: { team: 'player', radius: 66, delay: 0.65, damage: 210 } },
};

export const ASTRAL_STEP: SkillDefinition = {
  id: 'astral_step',
  name: '✧ Passo astrale',
  description: 'Scatto verso il mouse · Invulnerabilità',
  cooldown: 3.5,
  visual: 'astral_step',
  effect: { kind: 'dash', distance: 125, invulnerability: 0.55 },
};

/** Le skill di base del mago, nell'ordine degli slot. */
export const MAGE_SKILLS = [ARCANE_BOLT, FROST_ORB, METEOR, ASTRAL_STEP] as const satisfies Loadout;
