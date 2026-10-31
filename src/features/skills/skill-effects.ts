import { manaCost } from './mana';
import { Vec2 } from '../../core/vec2';
import { clampToArena, pushOutOfPillars } from '../arena/arena';
import { BODY_RADIUS } from '../combat/collision';
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
  /** Colpo ravvicinato: ferisce il boss se e' entro `range` (dal bordo del boss) e nell'arco `arc` attorno a `angle`. */
  strikeArc(origin: Vec2, angle: number, range: number, arc: number, damage: number): void;
  emit(event: GameEvent): void;
}

/**
 * Lancia la skill nello slot indicato, se c'e' ed e' pronta. Avvia la ricarica prima dell'effetto.
 * Restituisce true se la skill e' stata lanciata.
 */
export function tryCastSkill(slot: number, ctx: SkillContext): boolean {
  const { player } = ctx;
  const skill = player.skillBar.skillAt(slot);
  if (skill === null || !player.skillBar.isReady(slot)) return false;
  const cost = manaCost(skill);
  if (player.mana < cost) return false;
  player.mana -= cost;
  player.skillBar.start(slot);
  executeSkill(skill, ctx);
  return true;
}

/** Comportamento delle skill: legge i dati di `SkillDefinition.effect` e agisce sulla simulazione. */
function executeSkill(skill: SkillDefinition, ctx: SkillContext): void {
  const { player } = ctx;
  const arena = player.arena;
  const origin = player.position;
  const angle = origin.angleTo(player.aim);
  const effect = skill.effect;
  const base = { type: 'skill_cast' as const, skillId: skill.id, visual: skill.visual, kind: effect.kind, angle };
  switch (effect.kind) {
    case 'projectile': {
      const muzzle = origin.add(effect.muzzleOffset);
      const count = effect.count ?? 1;
      const spread = effect.spread ?? 0;
      for (let i = 0; i < count; i++) {
        ctx.spawnProjectile(effect.projectile, muzzle, angle + (i - (count - 1) / 2) * spread);
      }
      ctx.emit({ ...base, origin: muzzle, destination: muzzle });
      break;
    }
    case 'ground_blast': {
      const target = effect.center === 'caster' ? origin : clampToArena(arena, player.aim, arena.playerMargin);
      ctx.spawnZone(effect.zone, target);
      ctx.emit({ ...base, origin, destination: target });
      break;
    }
    case 'dash': {
      const raw = clampToArena(arena, origin.add(Vec2.fromAngle(angle, effect.distance)), arena.playerMargin);
      const destination = pushOutOfPillars(arena, raw, BODY_RADIUS.player);
      player.position = destination;
      // Lo scatto non accorcia l'invulnerabilita' gia' in corso (per esempio quella dopo un colpo).
      player.invulnerableFor = Math.max(player.invulnerableFor, effect.invulnerability);
      ctx.emit({ ...base, origin, destination });
      break;
    }
    case 'melee_arc': {
      ctx.strikeArc(origin, angle, effect.range, effect.arc, effect.damage);
      ctx.emit({ ...base, origin, destination: origin, range: effect.range, arc: effect.arc });
      break;
    }
  }
}
