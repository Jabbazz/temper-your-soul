import type { GameEvent } from '../combat/events';

/**
 * Suoni sintetizzati con Web Audio: nessun file audio. Spento all'avvio (il browser richiede un gesto dell'utente
 * prima di far partire l'audio, e si attiva con M). Ascolta gli eventi della simulazione.
 */
export class AudioPlayer {
  enabled = false;
  private context: AudioContext | null = null;

  /** Accende o spegne l'audio; restituisce il nuovo stato. */
  toggle(): boolean {
    this.enabled = !this.enabled;
    this.tone(500);
    return this.enabled;
  }

  handle(event: GameEvent): void {
    switch (event.type) {
      case 'skill_cast':
        switch (event.skillId) {
          case 'arcane_bolt':
            this.tone(650);
            break;
          case 'frost_orb':
            this.tone(320);
            break;
          case 'meteor':
            this.tone(180, 0.2);
            break;
          case 'astral_step':
            this.tone(850, 0.15);
            break;
        }
        break;
      case 'damage_dealt':
        if (event.target === 'player') this.tone(100, 0.15);
        break;
      default:
        break;
    }
  }

  tone(frequency: number, duration = 0.08): void {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      const ctx = this.context;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // L'audio non e' essenziale: se il browser lo rifiuta il gioco prosegue senza suoni.
    }
  }
}
