import type { Loadout, SkillDefinition } from './skill-definition';

/**
 * Stato runtime delle skill di un personaggio: i tempi di ricarica. I dati (`SkillDefinition`) restano di sola lettura.
 * Ogni slot ha la propria ricarica (nessuna ricarica globale); uno slot vuoto non ha skill e non e' mai pronto.
 */
export class SkillBar {
  private readonly remaining: number[];

  constructor(readonly skills: Loadout) {
    this.remaining = skills.map(() => 0);
  }

  skillAt(slot: number): SkillDefinition | null {
    return this.skills[slot] ?? null;
  }

  tick(dt: number): void {
    for (let i = 0; i < this.remaining.length; i++) this.remaining[i] = Math.max(0, this.remaining[i]! - dt);
  }

  isReady(slot: number): boolean {
    return this.skillAt(slot) !== null && this.remaining[slot]! <= 0;
  }

  /** Avvia la ricarica dello slot (non fa nulla se e' vuoto). */
  start(slot: number): void {
    const skill = this.skillAt(slot);
    if (skill !== null) this.remaining[slot] = skill.cooldown;
  }

  /** Frazione di ricarica ancora da attendere, tra 0 (pronta o slot vuoto) e 1 (appena usata). */
  cooldownFraction(slot: number): number {
    const skill = this.skillAt(slot);
    return skill === null ? 0 : this.remaining[slot]! / skill.cooldown;
  }
}
