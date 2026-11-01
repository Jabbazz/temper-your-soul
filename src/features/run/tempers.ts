import type { Rng } from '../../core/rng';
import { manaCost } from '../skills/mana';
import type { Loadout, SkillDefinition, SkillEffect } from '../skills/skill-definition';

/*
 * Le tempre: potenziamenti delle skill equipaggiate che durano una sola discesa. Il lavoro del fabbro ha tre gesti e
 * ogni tempra ne segue uno: il fuoco scalda (il danno), il martello da' forma (la forma del colpo), l'acqua raffredda
 * (il ritmo e la difesa). Ogni tempra si lega a uno slot e sale fino al terzo grado. Valori provvisori.
 */

export type TemperFamily = 'fire' | 'hammer' | 'water';

export const TEMPER_FAMILIES: Readonly<Record<TemperFamily, { readonly name: string; readonly gesture: string }>> = {
  fire: { name: 'Fuoco', gesture: 'Scaldare' },
  hammer: { name: 'Martello', gesture: 'Dare forma' },
  water: { name: 'Acqua', gesture: 'Raffreddare' },
};

export const MAX_TEMPER_GRADE = 3;

export interface TemperDefinition {
  /** Id stabile (rete, salvataggi della partita in corso, test). */
  readonly id: string;
  readonly family: TemperFamily;
  readonly name: string;
  /** Che cosa fa al grado indicato (1-3), in italiano. */
  describe(grade: number): string;
  /** Vale per questa skill? */
  applies(skill: SkillDefinition): boolean;
  /** La skill temprata al grado indicato (una copia: i dati restano di sola lettura). */
  apply(skill: SkillDefinition, grade: number): SkillDefinition;
}

/** Una tempra scelta: su quale slot e a che grado. */
export interface TemperPick {
  readonly temperId: string;
  readonly slot: number;
  readonly grade: number;
}

const percent = (value: number): string => `${Math.round(value * 100)}%`;

const hasDamage = (skill: SkillDefinition): boolean => skill.effect.kind !== 'dash';

/** La stessa skill con il danno moltiplicato per `factor`. */
function scaleDamage(effect: SkillEffect, factor: number): SkillEffect {
  switch (effect.kind) {
    case 'projectile':
      return { ...effect, projectile: { ...effect.projectile, damage: Math.round(effect.projectile.damage * factor) } };
    case 'ground_blast':
      return { ...effect, zone: { ...effect.zone, damage: Math.round(effect.zone.damage * factor) } };
    case 'melee_arc':
      return { ...effect, damage: Math.round(effect.damage * factor) };
    case 'dash':
      return effect;
  }
}

export const TEMPERS: readonly TemperDefinition[] = [
  {
    id: 'live_ember',
    family: 'fire',
    name: 'Brace viva',
    describe: (grade) => `+${percent(0.2 * grade)} di danno.`,
    applies: hasDamage,
    apply: (skill, grade) => ({ ...skill, effect: scaleDamage(skill.effect, 1 + 0.2 * grade) }),
  },
  {
    id: 'focused_flame',
    family: 'fire',
    name: 'Fiamma concentrata',
    describe: (grade) => `+${percent(0.35 * grade)} di danno, ricarica +${percent(0.1 * grade)}.`,
    applies: hasDamage,
    apply: (skill, grade) => ({ ...skill, cooldown: skill.cooldown * (1 + 0.1 * grade), effect: scaleDamage(skill.effect, 1 + 0.35 * grade) }),
  },
  {
    id: 'twin_strike',
    family: 'hammer',
    name: 'Colpo doppio',
    describe: (grade) => `+${grade} ${grade === 1 ? 'proiettile' : 'proiettili'} a ventaglio.`,
    applies: (skill) => skill.effect.kind === 'projectile',
    apply: (skill, grade) => {
      const effect = skill.effect;
      if (effect.kind !== 'projectile') return skill;
      return { ...skill, effect: { ...effect, count: (effect.count ?? 1) + grade, spread: Math.max(effect.spread ?? 0, 0.14) } };
    },
  },
  {
    id: 'wide_wave',
    family: 'hammer',
    name: 'Onda larga',
    describe: (grade) => `Area e portata +${percent(0.2 * grade)}.`,
    applies: (skill) => skill.effect.kind === 'ground_blast' || skill.effect.kind === 'melee_arc',
    apply: (skill, grade) => {
      const effect = skill.effect;
      const factor = 1 + 0.2 * grade;
      if (effect.kind === 'ground_blast') return { ...skill, effect: { ...effect, zone: { ...effect.zone, radius: Math.round(effect.zone.radius * factor) } } };
      if (effect.kind === 'melee_arc') return { ...skill, effect: { ...effect, range: Math.round(effect.range * factor), arc: Math.min(Math.PI * 1.6, effect.arc * factor) } };
      return skill;
    },
  },
  {
    id: 'heavy_tip',
    family: 'hammer',
    name: 'Punta pesante',
    describe: (grade) => `Proiettili più grossi (+${2 * grade}) e +${percent(0.1 * grade)} di danno.`,
    applies: (skill) => skill.effect.kind === 'projectile',
    apply: (skill, grade) => {
      const effect = skill.effect;
      if (effect.kind !== 'projectile') return skill;
      const projectile = effect.projectile;
      return { ...skill, effect: { ...effect, projectile: { ...projectile, radius: projectile.radius + 2 * grade, damage: Math.round(projectile.damage * (1 + 0.1 * grade)) } } };
    },
  },
  {
    id: 'quick_hand',
    family: 'water',
    name: 'Mano svelta',
    describe: (grade) => `Ricarica −${percent(0.12 * grade)}.`,
    applies: () => true,
    apply: (skill, grade) => ({ ...skill, cooldown: skill.cooldown * (1 - 0.12 * grade) }),
  },
  {
    id: 'thrift',
    family: 'water',
    name: 'Risparmio',
    describe: (grade) => `Mana −${percent(0.25 * grade)}.`,
    applies: (skill) => manaCost(skill) > 0,
    apply: (skill, grade) => ({ ...skill, manaCost: Math.max(0, Math.round(manaCost(skill) * (1 - 0.25 * grade))) }),
  },
  {
    id: 'long_stride',
    family: 'water',
    name: 'Passo lungo',
    describe: (grade) => `Scatto +${percent(0.2 * grade)}, invulnerabile +${(0.1 * grade).toFixed(1).replace('.', ',')} s.`,
    applies: (skill) => skill.effect.kind === 'dash',
    apply: (skill, grade) => {
      const effect = skill.effect;
      if (effect.kind !== 'dash') return skill;
      return { ...skill, effect: { ...effect, distance: Math.round(effect.distance * (1 + 0.2 * grade)), invulnerability: effect.invulnerability + 0.1 * grade } };
    },
  },
  {
    id: 'quench',
    family: 'water',
    name: 'Tempra d\'acqua',
    describe: (grade) => `Rallenta chi colpisci per ${(0.8 * grade).toFixed(1).replace('.', ',')} s.`,
    applies: (skill) => skill.effect.kind === 'projectile' || skill.effect.kind === 'ground_blast',
    apply: (skill, grade) => {
      const effect = skill.effect;
      const seconds = 0.8 * grade;
      if (effect.kind === 'projectile') {
        const slow = Math.max(effect.projectile.slowSeconds ?? 0, seconds);
        return { ...skill, effect: { ...effect, projectile: { ...effect.projectile, slowSeconds: slow } } };
      }
      if (effect.kind === 'ground_blast') {
        const slow = Math.max(effect.zone.slowSeconds ?? 0, seconds);
        return { ...skill, effect: { ...effect, zone: { ...effect.zone, slowSeconds: slow } } };
      }
      return skill;
    },
  },
];

export function temperById(id: string): TemperDefinition | undefined {
  return TEMPERS.find((temper) => temper.id === id);
}

/** Il grado attuale di una tempra su uno slot (0 se non c'e'). */
export function temperGrade(picks: readonly TemperPick[], temperId: string, slot: number): number {
  return picks.find((pick) => pick.temperId === temperId && pick.slot === slot)?.grade ?? 0;
}

/** Aggiunge una tempra (o ne alza il grado) e restituisce la nuova lista. */
export function addTemper(picks: readonly TemperPick[], temperId: string, slot: number): TemperPick[] {
  const grade = Math.min(MAX_TEMPER_GRADE, temperGrade(picks, temperId, slot) + 1);
  const rest = picks.filter((pick) => !(pick.temperId === temperId && pick.slot === slot));
  return [...rest, { temperId, slot, grade }];
}

/** Le skill con le tempre applicate, slot per slot. */
export function applyTempers(loadout: Loadout, picks: readonly TemperPick[]): Loadout {
  return loadout.map((skill, slot) => {
    if (skill === null) return null;
    let tempered = skill;
    for (const pick of picks) {
      if (pick.slot !== slot) continue;
      const temper = temperById(pick.temperId);
      if (temper !== undefined && temper.applies(skill)) tempered = temper.apply(tempered, pick.grade);
    }
    return tempered;
  });
}

/**
 * Offerte di tempra: `count` coppie (tempra, slot) diverse, applicabili e non al massimo, con famiglie e slot il piu'
 * possibile vari. Il grado e' quello che si otterrebbe scegliendola.
 */
export function offerTempers(rng: Rng, loadout: Loadout, picks: readonly TemperPick[], count: number): TemperPick[] {
  const candidates: TemperPick[] = [];
  loadout.forEach((skill, slot) => {
    if (skill === null) return;
    for (const temper of TEMPERS) {
      const grade = temperGrade(picks, temper.id, slot);
      if (grade < MAX_TEMPER_GRADE && temper.applies(skill)) candidates.push({ temperId: temper.id, slot, grade: grade + 1 });
    }
  });
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
  }
  const chosen: TemperPick[] = [];
  const families = new Set<TemperFamily>();
  const slots = new Set<number>();
  // Primo giro: famiglie e slot nuovi; poi chi resta.
  for (const strict of [true, false]) {
    for (const candidate of candidates) {
      if (chosen.length >= count) break;
      if (chosen.includes(candidate)) continue;
      const family = temperById(candidate.temperId)!.family;
      if (strict && (families.has(family) || slots.has(candidate.slot))) continue;
      chosen.push(candidate);
      families.add(family);
      slots.add(candidate.slot);
    }
  }
  return chosen;
}
