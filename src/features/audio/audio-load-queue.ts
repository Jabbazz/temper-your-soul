/** Limita il picco CPU/rete all'attivazione dell'audio: niente decine di decode simultanei. */
export class AudioLoadQueue {
  private readonly pending: (() => Promise<void>)[] = [];
  private active = 0;
  constructor(private readonly concurrency = 2) {}
  add(task: () => Promise<void>): void { this.pending.push(task); this.pump(); }
  private pump(): void {
    while (this.active < this.concurrency && this.pending.length) {
      const task = this.pending.shift()!; this.active++;
      void Promise.resolve().then(task).catch(() => undefined).finally(() => { this.active--; this.pump(); });
    }
  }
}
