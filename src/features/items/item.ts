import { equipmentStats, describeEquipmentStats } from '../classes/equipment-stats';
import { STATUS_EFFECTS } from '../combat/status-effects/status-catalog';
import { manaCost, manaBonus } from '../skills/mana';
import type { SkillDefinition } from '../skills/skill-definition';
import { familyById } from './item-families';
import type { ItemFamily } from './item-family';
import type { Rarity } from './rarity';
import { scaleSkill } from './scaling';
import { NOVICE_NAMES } from '../character/creation';

/**
 * Un oggetto posseduto: istanza di una famiglia a una rarita'. L'`uid` e' unico e stabile (lo coniano `Character.addRolls`
 * e il salvataggio lo conserva); famiglia, rarita' e livello sono i dati: skill e GS si derivano, non si salvano.
 */
export interface Item {
  readonly uid: string;
  readonly familyId: string;
  readonly rarity: Rarity;
  /** Livello oggetto, indipendente dal livello del personaggio. Assente nei salvataggi storici = 1. */
  readonly level?: number;
}

/** Il risultato di un'estrazione del bottino: ancora senza `uid` (lo assegna il personaggio quando lo riceve). */
export interface ItemRoll {
  readonly familyId: string;
  readonly rarity: Rarity;
  readonly level?: number;
}

/** La skill che l'oggetto concede: quella della famiglia con i valori della rarita'. */
export function resolveItemSkill(family: ItemFamily, rarity: Rarity): SkillDefinition {
  const skill = scaleSkill(family.skill, rarity);
  return { ...skill, equipmentStats: equipmentStats(family.characterClass, family.slot, rarity),
    ...(family.slot === 'primary_hand' && family.characterClass !== 'mage' ? { manaCost: 0 } : {}) };
}

/** Oggetto, famiglia e skill risolta; `undefined` se la famiglia non esiste nel catalogo (dati vecchi o corrotti). */
export function resolveItem(item: Item): { item: Item; family: ItemFamily; skill: SkillDefinition } | undefined {
  const family = familyById(item.familyId);
  if (family === undefined) return undefined;
  return { item, family, skill: resolveItemSkill(family, item.rarity) };
}

/** Nome da mostrare: quello della famiglia (la rarita' si mostra a parte, con colore ed etichetta). */
export function itemName(item: Item): string {
  if(item.rarity==='common' && NOVICE_NAMES[item.familyId])return NOVICE_NAMES[item.familyId]!;
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
  const lines: string[] = describeEquipmentStats(skill.equipmentStats ?? {});
  const effect = skill.effect;
  if (skill.charges) lines.push(`Cariche ${skill.charges}`);
  if (skill.channelSeconds) lines.push(`Canalizzazione ${formatNumber(skill.channelSeconds)} s · movimento al 35%`);
  if (skill.onHit?.status) lines.push(`Stato: ${STATUS_EFFECTS[skill.onHit.status].name} · ${formatNumber((skill.onHit.chance ?? 1) * 100)}%`);
  switch (effect.kind) {
    case 'buff':
      lines.push(`Durata ${formatNumber(effect.buff.duration)} s`);
      if (effect.buff.guard) lines.push('Assorbe il prossimo colpo, incluso quello rosso');
      if (effect.buff.armor) lines.push(`Difesa temporanea +${formatNumber(effect.buff.armor)}`);
      if (effect.buff.regeneration) lines.push(`Rigenerazione vita ${formatNumber(effect.buff.regeneration)} HP/s`);
      if (effect.buff.attackSpeed) lines.push(`Frequenza primaria +${formatNumber(effect.buff.attackSpeed * 100)}%`);
      if (effect.buff.lifesteal) lines.push(`Furto vita ${formatNumber(effect.buff.lifesteal * 100)}%`);
      if (effect.buff.abilityPower) lines.push(`Danno abilità +${formatNumber(effect.buff.abilityPower * 100)}%`);
      break;
    case 'summon':
      lines.push(`Durata compagno ${formatNumber(effect.pet.duration)} s`);
      lines.push(`Danno morso ${formatNumber(effect.pet.damage)}`);
      lines.push(`Intervallo morsi ${formatNumber(effect.pet.interval)} s`);
      lines.push('Sanguinamento: 20% per morso');
      break;
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
      lines.push(effect.travelSeconds ? 'Scatto fisico' : 'Teletrasporto');
      if (effect.impactDamage) lines.push(`Danno urto ${formatNumber(effect.impactDamage)}`);
      if (effect.explosion) lines.push(`Danno esplosione all’arrivo ${formatNumber(effect.explosion.damage)}`);
      lines.push(`Distanza ${formatNumber(Math.round(effect.distance))}`);
      lines.push(`Invulnerabile ${formatNumber(effect.invulnerability)} s`);
      break;
    case 'melee_arc':
      if (effect.clearsProjectiles) lines.push('Cancella i proiettili ordinari nel fendente');
      if (effect.taunt) lines.push(`Provocazione ${formatNumber(effect.taunt.duration)} s · raggio ${formatNumber(effect.taunt.radius)}`);
      lines.push(`Danno ${formatNumber(effect.damage)}`);
      lines.push(`Gittata ${formatNumber(effect.range)}`);
      lines.push(`Arco ${formatNumber(Math.round((effect.arc * 180) / Math.PI))}°`);
      break;
  }

  lines.push(`Mana ${formatNumber(manaCost(skill))}`);
  lines.push(`Rigenerazione mana +${formatNumber(manaBonus(skill))}/s`);
  lines.push(`Ricarica ${formatNumber(skill.cooldown)} s`);
  return lines;
}
