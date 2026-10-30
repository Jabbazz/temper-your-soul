import type { SkillDefinition } from './skill-definition';

/**
 * Stato runtime delle skill di un personaggio: i tempi di ricarica. I dati (`SkillDefinition`) restano di sola lettura.
 * Ogni slot ha la propria ricarica; non esiste una ricarica globale.
 */
export class SkillBar {
  private readonly remaining: number[];

  constructor(readonly skills: readonly SkillDefinition[]) {
    this.remaining = skills.map(() => 0);
  }

  tick(dt: number): void {
    for (let i = 0; i < this.remaining.length; i++) this.remaining[i] = Math.max(0, this.remaining[i]! - dt);
  }

  isReady(slot: number): boolean {
    return this.remaining[slot]! <= 0;
  }

  /** Avvia la ricarica dello slot. */
  start(slot: number): void {
    this.remaining[slot] = this.skills[slot]!.cooldown;
  }

  /** Frazione di ricarica ancora da attendere, tra 0 (pronta) e 1 (appena usata). */
  cooldownFraction(slot: number): number {
    return this.remaining[slot]! / this.skills[slot]!.cooldown;
  }
}
