/** Segnale tipizzato: `connect` restituisce la funzione che annulla il collegamento. */
export class Signal<Args extends unknown[] = []> {
  private listeners: Array<(...args: Args) => void> = [];

  connect(listener: (...args: Args) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((existing) => existing !== listener);
    };
  }

  emit(...args: Args): void {
    // Copia: un ascoltatore puo' collegarsi o scollegarsi durante l'emissione.
    for (const listener of [...this.listeners]) listener(...args);
  }
}
