import { Vec2 } from '../../core/vec2';
import { ARENA, clampToArena } from '../arena/arena';
import type { DangerZoneSpec } from '../combat/danger-zone';
import type { GameEvent } from '../combat/events';
import type { ProjectileSpec } from '../combat/projectile';
import type { Player } from '../player/player';
import type { SkillDefinition } from './skill-definition';

/** Che cosa la simulazione mette a disposizione di una skill che viene lanciata. */
export interface SkillContext {
  readonly player: Player;
  spawnProjectile(spec: ProjectileSpec, position: Vec2, angle: number): void;
  spawnZone(spec: DangerZoneSpec, position: Vec2): void;
  emit(event: GameEvent): void;
}

/**
 * Lancia la skill nello slot indicato, se e' pronta. Avvia la ricarica prima dell'effetto.
 * Restituisce true se la skill e' stata lanciata.
 */
export function tryCastSkill(slot: number, ctx: SkillContext): boolean {
  const { player } = ctx;
  if (!player.skillBar.isReady(slot)) return false;
  const skill = player.skillBar.skills[slot]!;
  player.skillBar.start(slot);
  executeSkill(skill, ctx);
  return true;
}

/** Comportamento delle skill: legge i dati di `SkillDefinition.effect` e agisce sulla simulazione. */
function executeSkill(skill: SkillDefinition, ctx: SkillContext): void {
  const { player } = ctx;
  const origin = player.position;
  const angle = origin.angleTo(player.aim);
  const effect = skill.effect;
  switch (effect.kind) {
    case 'projectile': {
      const muzzle = origin.add(effect.muzzleOffset);
      ctx.spawnProjectile(effect.projectile, muzzle, angle);
      ctx.emit({ type: 'skill_cast', skillId: skill.id, origin: muzzle, destination: muzzle, angle });
      break;
    }
    case 'ground_blast': {
      const target = clampToArena(player.aim, ARENA.playerMargin);
      ctx.spawnZone(effect.zone, target);
      ctx.emit({ type: 'skill_cast', skillId: skill.id, origin, destination: target, angle });
      break;
    }
    case 'dash': {
      const destination = clampToArena(origin.add(Vec2.fromAngle(angle, effect.distance)), ARENA.playerMargin);
      player.position = destination;
      player.invulnerableFor = effect.invulnerability;
      ctx.emit({ type: 'skill_cast', skillId: skill.id, origin, destination, angle });
      break;
    }
  }
}
