import { tuneMageSkill } from './tuning';
import { ARCANE_BOLT, FROST_ORB, METEOR, ASTRAL_STEP } from '../../skills/mage-skills';
import { STORM_BOLT, BLIZZARD_BURST } from '../../items/item-skills';
import { DUNGEON_ITEM_SKILLS } from '../../items/dungeon-item-skills';
import type { SkillDefinition } from '../../skills/skill-definition';
import type { HitEffect } from '../skill-mechanics';

/** Nessun tiro casuale nei dati: ogni proc viene risolto dal Rng della partita al colpo. */
export const ELEMENT_HITS = {
  fire: { status: 'burning', duration: 4, damagePerSecond: 8 },
  water: { status: 'soaked', duration: 3 },
  earth: { status: 'rooted', duration: 1.2 },
  wind: { status: 'exposed', duration: 4 },
} as const satisfies Readonly<Record<string, HitEffect>>;
const elemental = (skill: SkillDefinition, hit: HitEffect, name: string, chance = 1): SkillDefinition => {
  const effect = skill.effect;
  const visual = hit.status === 'burning' ? (skill.id === 'cinder_orb' ? 'mage_fire_cinder' : 'mage_fire_bolt')
    : hit.status === 'soaked' ? (skill.id === 'glacier_mirror' ? 'mage_water_mirror' : 'mage_water_orb')
    : hit.status === 'rooted' ? 'mage_earth_light' : 'mage_wind_bolt';
  return { ...skill, name, onHit: { ...hit, chance },
    ...(effect.kind === 'projectile' ? { visual, effect: { ...effect, projectile: { ...effect.projectile, visual } } } : {}),
    description: `${name} · ${chance < 1 ? '15% per colpo' : 'Applica lo stato al colpo'}`,
  };
};
const blink = (skill: SkillDefinition): SkillDefinition => {
  if (skill.effect.kind !== 'dash') throw new Error('Attesi stivali da teletrasporto');
  return { ...skill, name: 'Traslazione esplosiva', description: 'Teletrasporto · Esplosione immediata all’arrivo',
    effect: { ...skill.effect, explosion: { team: 'player', radius: 85, delay: 0, damage: 65, visual: 'mage_blink_burst', onHit: ELEMENT_HITS.wind } } };
};
const BASE_MAGE_CLASS_SKILLS: Readonly<Record<string, SkillDefinition>> = {
  arcane_staff: elemental(ARCANE_BOLT, ELEMENT_HITS.fire, 'Dardo di fuoco', 0.15),
  storm_scepter: elemental(STORM_BOLT, ELEMENT_HITS.wind, 'Dardo del vento', 0.15),
  frost_grimoire: elemental(FROST_ORB, ELEMENT_HITS.water, 'Globo d’acqua'),
  ossuary_lantern: elemental(DUNGEON_ITEM_SKILLS.ossuary_lantern, ELEMENT_HITS.earth, 'Luci della terra'),
  cinder_orb: elemental(DUNGEON_ITEM_SKILLS.cinder_orb, ELEMENT_HITS.fire, 'Tridente di fuoco'),
  glacier_mirror: elemental(DUNGEON_ITEM_SKILLS.glacier_mirror, ELEMENT_HITS.water, 'Schegge d’acqua'),
  meteor_mantle: { ...elemental(METEOR, ELEMENT_HITS.fire, 'Meteora di fuoco'), channelSeconds: 0.7,
    description: 'Canalizza per 0,7 s rallentando · Meteora e bruciatura al cursore' },
  tomb_shroud: { id: 'tomb_shroud', name: 'Patto della terra', description: 'Per 6 s: +20 difesa e +25% danno abilità',
    cooldown: 12, manaCost: 25, visual: 'mage_earth_buff', effect: { kind: 'buff', buff: { duration: 6, armor: 20, abilityPower: 0.25 } } },
  blizzard_veil: { ...elemental(BLIZZARD_BURST, ELEMENT_HITS.water, 'Marea gelida'), channelSeconds: 0.5,
    description: 'Canalizza per 0,5 s · Esplosione d’acqua attorno a te' },
  astral_boots: blink(ASTRAL_STEP),
  rime_boots: blink(DUNGEON_ITEM_SKILLS.rime_boots),
};

export const MAGE_CLASS_SKILLS: Readonly<Record<string, SkillDefinition>> = Object.fromEntries(
  Object.entries(BASE_MAGE_CLASS_SKILLS).map(([id, skill]) => [id, tuneMageSkill(skill)]),
);
