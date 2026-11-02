import type { SkillDefinition, SkillEffect } from '../../skills/skill-definition';
/** Seconda taratura provvisoria: potenza contro mobilità, senza aumentare la gittata. */
export const MAGE_TUNING = { damageMultiplier: 1.35, projectileSpeedMultiplier: 1.5 } as const;
export function tuneMageSkill(skill: SkillDefinition): SkillDefinition {
  const effect = skill.effect;
  const damage = (value: number): number => value * MAGE_TUNING.damageMultiplier;
  let tuned: SkillEffect = effect;
  if (effect.kind === 'projectile') tuned = { ...effect, projectile: { ...effect.projectile,
    damage: damage(effect.projectile.damage), speed: effect.projectile.speed * MAGE_TUNING.projectileSpeedMultiplier,
    lifetime: effect.projectile.lifetime / MAGE_TUNING.projectileSpeedMultiplier } };
  else if (effect.kind === 'ground_blast') tuned = { ...effect, zone: { ...effect.zone, damage: damage(effect.zone.damage) } };
  else if (effect.kind === 'dash' && effect.explosion) tuned = { ...effect, explosion: { ...effect.explosion, damage: damage(effect.explosion.damage) } };
  return { ...skill, effect: tuned };
}
