import { Vec2 } from '../../core/vec2';
import type { SkillDefinition } from './skill-definition';

/*
 * Le quattro skill del mago, nell'ordine degli slot (`skill_1`..`skill_4` nell'Input Map).
 * Valori ereditati dal prototipo, provvisori (vedi docs/game-design.md): non definiscono il bilanciamento.
 */

/** I proiettili del giocatore partono leggermente sopra i piedi, all'altezza del bastone. */
const MUZZLE = new Vec2(0, -7);

export const ARCANE_BOLT: SkillDefinition = {
  id: 'arcane_bolt',
  name: '✦ Dardo arcano',
  description: 'Tieni premuto · Attacco rapido',
  keyLabel: 'MOUSE SX',
  cooldown: 0.2,
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
  keyLabel: 'MOUSE DX',
  cooldown: 2.4,
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
  keyLabel: 'Q',
  cooldown: 5,
  effect: { kind: 'ground_blast', zone: { team: 'player', radius: 66, delay: 0.65, damage: 210 } },
};

export const ASTRAL_STEP: SkillDefinition = {
  id: 'astral_step',
  name: '✧ Passo astrale',
  description: 'Scatto verso il mouse · Invulnerabilità',
  keyLabel: 'E',
  cooldown: 3.5,
  effect: { kind: 'dash', distance: 125, invulnerability: 0.55 },
};

/** Le skill del mago, nell'ordine degli slot. */
export const MAGE_SKILLS: readonly SkillDefinition[] = [ARCANE_BOLT, FROST_ORB, METEOR, ASTRAL_STEP];
