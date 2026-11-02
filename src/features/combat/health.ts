/** Punti vita di un'entita'. La vita non scende mai sotto zero ne' supera il massimo. */
export class Health {
  private value: number;
  private healingRemainder = 0;
  max: number;

  constructor(max: number) {
    this.max = Math.floor(max);
    this.value = this.max;
  }

  get current(): number { return this.value; }
  set current(value: number) { this.value = Math.floor(value); }

  get isDead(): boolean {
    return this.current <= 0;
  }

  /** Frazione di vita rimasta, tra 0 e 1. */
  get fraction(): number {
    return this.current / this.max;
  }

  /** Ultimo passaggio del danno, dopo tutti i modificatori: difetto una sola volta, poi limite agli HP rimasti. */
  takeDamage(amount: number): number {
    const lost = Math.min(Math.floor(Math.max(amount, 0)), this.current);
    this.current -= lost;
    return lost;
  }

  /** Conserva le frazioni delle cure continue senza introdurre HP frazionari o perdere la rigenerazione a 60 Hz. */
  heal(amount: number): number {
    if (this.isDead || this.current >= this.max) { this.healingRemainder = 0; return 0; }
    const available = this.healingRemainder + Math.max(0, amount);
    // Tolleranza solo per l'accumulo delle cure (es. 60 × 1/60), mai per arrotondare i danni verso l'alto.
    const healed = Math.min(Math.floor(available + 1e-9), this.max - this.current);
    this.current += healed;
    this.healingRemainder = this.current === this.max ? 0 : Math.max(0, available - healed);
    return healed;
  }
}
