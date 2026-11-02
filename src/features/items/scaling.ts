import { manaCost, manaBonus, RARITY_MANA_REGENERATION } from '../skills/mana';
import type { SkillDefinition, SkillEffect } from '../skills/skill-definition';
import { RARITY_STATS, type Rarity } from './rarity';

/*
 * Regola provvisoria di come la rarita' migliora una skill (vedi docs/game-design.md):
 *  - il danno (di proiettile, zona o colpo ravvicinato) cresce di `powerMultiplier` e conserva i decimali fino all’applicazione del danno;
 *  - distanza dello scatto e invulnerabilita' crescono della meta' dell'aumento: x (1 + (powerMultiplier - 1) * DASH_SHARE);
 *  - la ricarica si moltiplica per `cooldownMultiplier`;
 *  - tutto il resto (id, nome, descrizione, aspetto, forma, raggio, ritardo, rallentamento, numero di colpi) resta uguale:
 *    la rarita' migliora i valori, non cambia l'identita' della skill.
 */

/** Quota dell'aumento di potenza che si applica a distanza e invulnerabilita' dello scatto. */
export const DASH_POWER_SHARE = 0.5;

/** Restituisce una NUOVA skill con i valori della rarita' indicata; l'originale non viene mai modificato. */
export function scaleSkill(skill: SkillDefinition, rarity: Rarity): SkillDefinition {
  if (rarity === 'common') return skill;
  const { powerMultiplier, cooldownMultiplier } = RARITY_STATS[rarity];
  const damage = (value: number): number => value * powerMultiplier;
  const dashFactor = 1 + (powerMultiplier - 1) * DASH_POWER_SHARE;
  return { ...skill, manaCost: manaCost(skill) * cooldownMultiplier, manaRegeneration: (1 / cooldownMultiplier - 1) * RARITY_MANA_REGENERATION + manaBonus(skill), cooldown: skill.cooldown * cooldownMultiplier, onHit: skill.onHit ? { ...skill.onHit, ...(skill.onHit.damagePerSecond ? { damagePerSecond: damage(skill.onHit.damagePerSecond) } : {}) } : undefined, effect: scaleEffect(skill.effect, damage, dashFactor) };
}

function scaleEffect(effect: SkillEffect, damage: (value: number) => number, dashFactor: number): SkillEffect {
  switch (effect.kind) {
    case 'buff':
      return { ...effect, buff: { ...effect.buff,
        ...(effect.buff.armor ? { armor: Math.round(damage(effect.buff.armor)) } : {}),
        ...(effect.buff.regeneration ? { regeneration: Math.round(damage(effect.buff.regeneration)) } : {}),
      } };
    case 'summon':
      return { ...effect, pet: { ...effect.pet, damage: damage(effect.pet.damage) } };
    case 'projectile':
      return { ...effect, projectile: { ...effect.projectile, damage: damage(effect.projectile.damage) } };
    case 'ground_blast':
      return { ...effect, zone: { ...effect.zone, damage: damage(effect.zone.damage) } };
    case 'dash':
      return { ...effect, distance: effect.distance * dashFactor, invulnerability: effect.invulnerability * dashFactor,
        ...(effect.impactDamage ? { impactDamage: damage(effect.impactDamage) } : {}),
        ...(effect.explosion ? { explosion: { ...effect.explosion, damage: damage(effect.explosion.damage) } } : {}) };
    case 'melee_arc':
      return { ...effect, damage: damage(effect.damage) };
  }
}
