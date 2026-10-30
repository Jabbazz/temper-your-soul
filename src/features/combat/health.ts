/** Punti vita di un'entita'. La vita non scende mai sotto zero ne' supera il massimo. */
export class Health {
  current: number;

  constructor(readonly max: number) {
    this.current = max;
  }

  get isDead(): boolean {
    return this.current <= 0;
  }

  /** Frazione di vita rimasta, tra 0 e 1. */
  get fraction(): number {
    return this.current / this.max;
  }

  /** Sottrae `amount` e restituisce la perdita effettiva (limitata agli HP rimasti). */
  takeDamage(amount: number): number {
    const lost = Math.min(Math.max(amount, 0), this.current);
    this.current -= lost;
    return lost;
  }
}
