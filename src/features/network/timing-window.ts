/** Campioni limitati: nessuna crescita della memoria nelle misure diagnostiche. */
export class TimingWindow {
  private readonly values: number[] = [];
  private cursor = 0;
  constructor(private readonly capacity = 240) {}
  add(milliseconds: number): void {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) return;
    this.values[this.cursor] = milliseconds; this.cursor = (this.cursor + 1) % this.capacity;
  }
  summary(): { meanMs: number; p95Ms: number; maxMs: number } {
    if (!this.values.length) return { meanMs: 0, p95Ms: 0, maxMs: 0 };
    const sorted = [...this.values].sort((a, b) => a - b), round = (v: number): number => Math.round(v * 1000) / 1000;
    return { meanMs: round(sorted.reduce((n, v) => n + v, 0) / sorted.length),
      p95Ms: round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * .95) - 1)]), maxMs: round(sorted[sorted.length - 1]) };
  }
}
