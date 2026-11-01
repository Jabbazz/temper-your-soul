import type { SkillDefinition } from '../../skills/skill-definition';

/** Valori Comuni provvisori. La rarità scala danno, difesa e rigenerazione. */
const sweep = (id: string, name: string, damage: number, range: number, cooldown: number): SkillDefinition => ({
  id, name, description: 'Fendente ad area · Cancella proiettili ordinari · Provoca i nemici vicini per 3 s',
  cooldown, manaCost: 0, visual: 'warrior_sweep',
  effect: { kind: 'melee_arc', range, arc: Math.PI * 1.2, damage, clearsProjectiles: true, taunt: { radius: 300, duration: 3 } },
});
const rush = (id: string, name: string, distance: number, damage: number): SkillDefinition => ({
  id, name, description: 'Scatto fisico con urto · I pilastri fermano la corsa', cooldown: 4, manaCost: 10,
  visual: 'warrior_rush', effect: { kind: 'dash', distance, invulnerability: 0.15, travelSeconds: 0.22, impactDamage: damage },
});
export const WARRIOR_SKILLS: Readonly<Record<string, SkillDefinition>> = {
  guardian_blade: sweep('guardian_blade', 'Fendente provocatorio', 36, 100, 0.45),
  forge_hammer: sweep('forge_hammer', 'Spazzata della fornace', 60, 110, 0.75),
  frost_lance: sweep('frost_lance', 'Falciata del baluardo', 42, 135, 0.55),
  spirit_talisman: {
    id: 'spirit_talisman', name: 'Parata del baluardo', description: 'Per 2 s assorbe completamente il prossimo colpo, incluso quello rosso imparabile',
    cooldown: 8, manaCost: 12, visual: 'warrior_guard', effect: { kind: 'buff', buff: { duration: 2, guard: true } },
  },
  ember_aegis: {
    id: 'ember_aegis', name: 'Secondo fiato', description: 'Per 5 s: +40 difesa e rigenera 5 HP/s',
    cooldown: 12, manaCost: 20, visual: 'warrior_fortify', effect: { kind: 'buff', buff: { duration: 5, armor: 40, regeneration: 5 } },
  },
  forge_plate: {
    id: 'forge_plate', name: 'Fortezza vivente', description: 'Per 6 s: +65 difesa e rigenera 7 HP/s',
    cooldown: 15, manaCost: 25, visual: 'warrior_fortify', effect: { kind: 'buff', buff: { duration: 6, armor: 65, regeneration: 7 } },
  },
  bog_boots: rush('bog_boots', 'Impatto del guardiano', 170, 35),
  grave_boots: rush('grave_boots', 'Carica sepolcrale', 150, 45),
  ember_treads: rush('ember_treads', 'Ariete della fornace', 210, 55),
};
