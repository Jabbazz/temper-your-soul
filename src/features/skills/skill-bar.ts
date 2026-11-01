import type { Loadout, SkillDefinition } from './skill-definition';

/**
 * Stato runtime delle skill di un personaggio: i tempi di ricarica. I dati (`SkillDefinition`) restano di sola lettura.
 * Ogni slot ha la propria ricarica (nessuna ricarica globale); uno slot vuoto non ha skill e non e' mai pronto.
 */
export class SkillBar {
  private readonly remaining: number[];
  private readonly charges: number[];

  constructor(readonly skills: Loadout) {
    this.remaining = skills.map(() => 0);
    this.charges = skills.map(skill => skill?.charges ?? 1);
  }

  skillAt(slot: number): SkillDefinition | null {
    return this.skills[slot] ?? null;
  }

  tick(dt: number): void {
    for (let i = 0; i < this.remaining.length; i++) {
      const skill = this.skills[i];
      if (skill?.charges && this.charges[i] < skill.charges) {
        this.remaining[i] -= dt;
        while (this.remaining[i] <= 0 && this.charges[i] < skill.charges) {
          this.charges[i]++;
          if (this.charges[i] < skill.charges) this.remaining[i] += skill.cooldown;
          else this.remaining[i] = 0;
        }
      } else this.remaining[i] = Math.max(0, this.remaining[i]! - dt);
    }
  }

  isReady(slot: number): boolean {
    return this.skillAt(slot) !== null && (this.skillAt(slot)!.charges ? this.charges[slot] > 0 : this.remaining[slot]! <= 0);
  }

  /** Avvia la ricarica dello slot (non fa nulla se e' vuoto). */
  start(slot: number, speed = 1): void {
    const skill = this.skillAt(slot);
    if (skill === null) return;
    if (skill.charges) {
      if (this.charges[slot] <= 0) return;
      if (this.charges[slot] === skill.charges) this.remaining[slot] = skill.cooldown;
      this.charges[slot]--;
    } else this.remaining[slot] = skill.cooldown / speed;
  }

  /** Frazione di ricarica ancora da attendere, tra 0 (pronta o slot vuoto) e 1 (appena usata). */
  cooldownFraction(slot: number): number {
    const skill = this.skillAt(slot);
    return skill === null || (skill.charges && this.charges[slot] > 0) ? 0 : this.remaining[slot]! / skill.cooldown;
  }

  /** Stato autorevole ricevuto dal server; non esegue skill lato client. */
  restoreCooldowns(seconds: readonly number[], charges?: readonly number[]): void {
    if (charges) charges.forEach((value, index) => { this.charges[index] = value; });
    for (let i = 0; i < this.remaining.length; i++) this.remaining[i] = Math.max(0, seconds[i] ?? 0);
  }

  availableCharges(slot: number): number { return this.charges[slot] ?? 0; }
  chargeCounts(): number[] { return [...this.charges]; }

  cooldowns(): number[] { return [...this.remaining]; }
}
