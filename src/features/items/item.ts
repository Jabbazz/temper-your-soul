import type { SkillDefinition } from '../skills/skill-definition';
import { familyById } from './item-families';
import type { ItemFamily } from './item-family';
import type { Rarity } from './rarity';
import { scaleSkill } from './scaling';

/**
 * Un oggetto posseduto: istanza di una famiglia a una rarita'. L'`uid` e' unico e stabile (lo coniano `Character.addRolls`
 * e il salvataggio lo conserva); `familyId` e `rarity` sono gli unici dati: tutto il resto si deriva dal catalogo.
 */
export interface Item {
  readonly uid: string;
  readonly familyId: string;
  readonly rarity: Rarity;
}

/** Il risultato di un'estrazione del bottino: ancora senza `uid` (lo assegna il personaggio quando lo riceve). */
export interface ItemRoll {
  readonly familyId: string;
  readonly rarity: Rarity;
}

/** La skill che l'oggetto concede: quella della famiglia con i valori della rarita'. */
export function resolveItemSkill(family: ItemFamily, rarity: Rarity): SkillDefinition {
  return scaleSkill(family.skill, rarity);
}

/** Oggetto, famiglia e skill risolta; `undefined` se la famiglia non esiste nel catalogo (dati vecchi o corrotti). */
export function resolveItem(item: Item): { item: Item; family: ItemFamily; skill: SkillDefinition } | undefined {
  const family = familyById(item.familyId);
  if (family === undefined) return undefined;
  return { item, family, skill: resolveItemSkill(family, item.rarity) };
}

/** Nome da mostrare: quello della famiglia (la rarita' si mostra a parte, con colore ed etichetta). */
export function itemName(item: Item): string {
  return familyById(item.familyId)?.name ?? item.familyId;
}

/** Numero in notazione italiana (virgola decimale), al massimo due decimali: 0.55 -> "0,55", 19 -> "19". */
export function formatNumber(value: number): string {
  return String(Number(value.toFixed(2))).replace('.', ',');
}

/**
 * Righe di statistiche per l'interfaccia, in italiano, in base al tipo di effetto. La prima riga e' il danno o la
 * distanza; l'ultima e' sempre la ricarica.
 */
export function describeSkillStats(skill: SkillDefinition): string[] {
  const lines: string[] = [];
  const effect = skill.effect;
  switch (effect.kind) {
    case 'projectile': {
      const { projectile, count } = effect;
      lines.push(`Danno ${formatNumber(projectile.damage)}`);
      if (count !== undefined && count > 1) lines.push(`Colpi: ${count}`);
      lines.push(`Gittata ${formatNumber(Math.round(projectile.speed * projectile.lifetime))}`);
      lines.push(`Velocità ${formatNumber(projectile.speed)} u/s`);
      lines.push(`Raggio proiettile ${formatNumber(projectile.radius)}`);
      lines.push(`Durata ${formatNumber(projectile.lifetime)} s`);
      if (effect.spread !== undefined && (count ?? 1) > 1) {
        lines.push(`Apertura ${formatNumber((effect.spread * ((count ?? 1) - 1) * 180) / Math.PI)}°`);
      }
      if (projectile.slowSeconds !== undefined && projectile.slowSeconds > 0) {
        lines.push(`Rallenta il boss ${formatNumber(projectile.slowSeconds)} s`);
      }
      break;
    }
    case 'ground_blast': {
      const { zone, center } = effect;
      lines.push(`Danno ${formatNumber(zone.damage)}`);
      lines.push(`Raggio ${formatNumber(zone.radius)}`);
      lines.push(`Scoppio dopo ${formatNumber(zone.delay)} s`);
      lines.push(center === 'caster' ? 'Attorno a te' : 'Nel punto mirato');
      if (zone.slowSeconds !== undefined && zone.slowSeconds > 0) {
        lines.push(`Rallenta il boss ${formatNumber(zone.slowSeconds)} s`);
      }
      break;
    }
    case 'dash':
      lines.push(`Distanza ${formatNumber(Math.round(effect.distance))}`);
      lines.push(`Invulnerabile ${formatNumber(effect.invulnerability)} s`);
      break;
    case 'melee_arc':
      lines.push(`Danno ${formatNumber(effect.damage)}`);
      lines.push(`Gittata ${formatNumber(effect.range)}`);
      lines.push(`Arco ${formatNumber(Math.round((effect.arc * 180) / Math.PI))}°`);
      break;
  }
  lines.push(`Ricarica ${formatNumber(skill.cooldown)} s`);
  return lines;
}
