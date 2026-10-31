import type { GameEvent } from '../combat/events';

/** Suono di un lancio: frequenza e durata. */
interface CastSound {
  readonly frequency: number;
  readonly duration: number;
}

/** Suoni delle skill base, per id di aspetto (valori del prototipo). */
const CAST_SOUNDS: Readonly<Record<string, CastSound>> = {
  arcane_bolt: { frequency: 650, duration: 0.08 },
  frost_orb: { frequency: 320, duration: 0.08 },
  meteor: { frequency: 180, duration: 0.2 },
  astral_step: { frequency: 850, duration: 0.15 },
};

/** Suono generico per tipo di effetto, per le skill senza un suono proprio. */
const DEFAULT_SOUNDS: Readonly<Record<'projectile' | 'ground_blast' | 'dash' | 'melee_arc', CastSound>> = {
  projectile: { frequency: 520, duration: 0.08 },
  ground_blast: { frequency: 200, duration: 0.2 },
  dash: { frequency: 800, duration: 0.15 },
  melee_arc: { frequency: 420, duration: 0.1 },
};

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
      case 'skill_cast': {
        const sound = CAST_SOUNDS[event.visual] ?? DEFAULT_SOUNDS[event.kind];
        this.tone(sound.frequency, sound.duration);
        break;
      }
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
