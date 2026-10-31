import { MUZZLE } from '../skills/mage-skills';
import type { SkillDefinition } from '../skills/skill-definition';

/*
 * Le skill concesse dalle famiglie di oggetti oltre alle quattro di base (`skills/mage-skills.ts`).
 * Valori a rarita' Comune, provvisori (vedi docs/game-design.md): non definiscono il bilanciamento.
 * Riferimenti degli ordini di grandezza per slot: dardo 19 (ricarica 0,2 s), globo 100 (2,4 s), meteora 210 (5 s),
 * passo astrale 125 di distanza e 0,55 s di invulnerabilita' (3,5 s). Un test controlla che nessuna skill generica
 * superi il doppio del riferimento del proprio slot nemmeno a rarita' Leggendaria.
 * Ogni skill ha un `visual` proprio (chiave in `presentation/looks/items.ts`).
 */

// --- Mano primaria ------------------------------------------------------------------------------------------------

/** Freccia veloce e a lunga gittata (~1440), danno medio-basso, ricarica breve. */
export const HUNTER_ARROW: SkillDefinition = {
  id: 'hunter_bow',
  name: '➳ Freccia del cacciatore',
  description: 'Tieni premuto · Freccia veloce a lunga gittata',
  cooldown: 0.16,
  visual: 'hunter_arrow',
  effect: {
    kind: 'projectile',
    muzzleOffset: MUZZLE,
    projectile: { team: 'player', speed: 720, damage: 14, radius: 3, lifetime: 2, visual: 'hunter_arrow' },
  },
};

/** Proiettile lento, grosso e piu' pesante del dardo: facile da centrare, ricarica media. */
export const STORM_BOLT: SkillDefinition = {
  id: 'storm_scepter',
  name: '⚡ Fulmine tempestoso',
  description: 'Tieni premuto · Sfera lenta e pesante',
  cooldown: 0.4,
  visual: 'storm_bolt',
  effect: {
    kind: 'projectile',
    muzzleOffset: MUZZLE,
    projectile: { team: 'player', speed: 250, damage: 23, radius: 9, lifetime: 3, visual: 'storm_bolt' },
  },
};

/** ESCLUSIVA della cripta: colpo ravvicinato a settore largo e pesante. */
export const GUARDIAN_SWEEP: SkillDefinition = {
  id: 'guardian_blade',
  name: '⚔ Fendente del guardiano',
  description: 'Tieni premuto · Colpo ravvicinato ad ampio arco',
  cooldown: 0.7,
  visual: 'guardian_sweep',
  effect: { kind: 'melee_arc', range: 95, arc: 2.1, damage: 55 },
};

/** ESCLUSIVA della fornace: zona piccola ma devastante sul mirino, a scoppio quasi immediato. */
export const FORGE_SLAM: SkillDefinition = {
  id: 'forge_hammer',
  name: '⚒ Colpo di martello',
  description: 'Tieni premuto · Zona piccola e devastante sul mirino',
  cooldown: 1.4,
  visual: 'hammer_blast',
  effect: { kind: 'ground_blast', zone: { team: 'player', radius: 52, delay: 0.35, damage: 160, visual: 'hammer_blast' } },
};

/** ESCLUSIVA della ghiacciaia: scheggia veloce e pesante che rallenta il boss. */
export const FROST_SHARD: SkillDefinition = {
  id: 'frost_lance',
  name: '❄ Scheggia di ghiaccio',
  description: 'Tieni premuto · Scheggia veloce che rallenta il boss',
  cooldown: 1.1,
  visual: 'frostlance_shard',
  effect: {
    kind: 'projectile',
    muzzleOffset: MUZZLE,
    projectile: { team: 'player', speed: 620, damage: 70, radius: 5, lifetime: 1.8, visual: 'frostlance_shard', slowSeconds: 1.5 },
  },
};

// --- Mano secondaria ----------------------------------------------------------------------------------------------

/** Ventaglio di 3 proiettili, ciascuno piu' debole del globo ma da colpire in piu'. */
export const SPIRIT_WISPS: SkillDefinition = {
  id: 'spirit_talisman',
  name: '❂ Spiriti erranti',
  description: 'Tre fuochi fatui a ventaglio',
  cooldown: 2,
  visual: 'spirit_wisp',
  effect: {
    kind: 'projectile',
    muzzleOffset: MUZZLE,
    count: 3,
    spread: 0.22,
    projectile: { team: 'player', speed: 340, damage: 42, radius: 6, lifetime: 2.2, visual: 'spirit_wisp' },
  },
};

/** ESCLUSIVA della palude: ventaglio fitto di 5 semi. */
export const SPORE_BURST: SkillDefinition = {
  id: 'spore_fan',
  name: '✺ Raffica di spore',
  description: 'Cinque semi di spora a ventaglio',
  cooldown: 2.6,
  visual: 'sporefan_seed',
  effect: {
    kind: 'projectile',
    muzzleOffset: MUZZLE,
    count: 5,
    spread: 0.18,
    projectile: { team: 'player', speed: 280, damage: 38, radius: 6, lifetime: 2.4, visual: 'sporefan_seed' },
  },
};

// --- Armatura -----------------------------------------------------------------------------------------------------

/** Esplosione ritardata attorno al lanciatore (raggio ~110): difesa a corto raggio. */
export const EMBER_RING: SkillDefinition = {
  id: 'ember_aegis',
  name: '✹ Anello di brace',
  description: 'Esplode attorno a te dopo un attimo',
  cooldown: 4.5,
  visual: 'aegis_blast',
  effect: { kind: 'ground_blast', center: 'caster', zone: { team: 'player', radius: 110, delay: 0.5, damage: 130, visual: 'aegis_blast' } },
};

/** ESCLUSIVA della cripta: grande esplosione attorno al lanciatore che rallenta il boss, ricarica lunga. */
export const TOMB_PULSE: SkillDefinition = {
  id: 'tomb_shroud',
  name: '☠ Pulsazione sepolcrale',
  description: 'Grande esplosione attorno a te · Rallenta il boss',
  cooldown: 9,
  visual: 'shroud_blast',
  effect: {
    kind: 'ground_blast',
    center: 'caster',
    zone: { team: 'player', radius: 170, delay: 0.9, damage: 170, visual: 'shroud_blast', slowSeconds: 2.5 },
  },
};

/** ESCLUSIVA della fornace: zona enorme e ritardata sul mirino, danno molto alto. */
export const FORGE_ERUPTION: SkillDefinition = {
  id: 'forge_plate',
  name: '♨ Eruzione della fornace',
  description: 'Enorme zona ritardata nel punto mirato · Danno altissimo',
  cooldown: 7,
  visual: 'plate_blast',
  effect: { kind: 'ground_blast', zone: { team: 'player', radius: 150, delay: 1.1, damage: 360, visual: 'plate_blast' } },
};

/** ESCLUSIVA della ghiacciaia: esplosione attorno al lanciatore che rallenta il boss a lungo. */
export const BLIZZARD_BURST: SkillDefinition = {
  id: 'blizzard_veil',
  name: '❆ Bufera',
  description: 'Esplode attorno a te · Rallenta il boss a lungo',
  cooldown: 8,
  visual: 'veil_blast',
  effect: {
    kind: 'ground_blast',
    center: 'caster',
    zone: { team: 'player', radius: 130, delay: 0.7, damage: 110, visual: 'veil_blast', slowSeconds: 3 },
  },
};

// --- Stivali ------------------------------------------------------------------------------------------------------

/** Scatto lungo (~200) con invulnerabilita' breve e ricarica corta: per cambiare posizione, non per resistere. */
export const WIND_DASH: SkillDefinition = {
  id: 'wind_boots',
  name: '≋ Scatto del vento',
  description: 'Scatto lungo verso il mouse · Ricarica corta',
  cooldown: 2.4,
  visual: 'wind_dash',
  effect: { kind: 'dash', distance: 200, invulnerability: 0.3 },
};

/** ESCLUSIVA della palude: scatto corto con invulnerabilita' lunga (~0,8 s), per attraversare gli attacchi. */
export const BOG_STEP: SkillDefinition = {
  id: 'bog_boots',
  name: '❦ Passo del pantano',
  description: 'Scatto corto · Invulnerabilità prolungata',
  cooldown: 4.5,
  visual: 'bog_dash',
  effect: { kind: 'dash', distance: 90, invulnerability: 0.8 },
};
