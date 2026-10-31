import { cosmeticRng, type Rng } from '../../core/rng';
import { Signal } from '../../core/signal';
import { clamp, Vec2 } from '../../core/vec2';
import type { KeyValueStore } from '../character/save-store';
import type { GameEvent } from '../combat/events';
import {
  AMBIENCE,
  MUSIC,
  SOUNDS,
  type AudioFile,
  type FallbackTone,
  type LoopDefinition,
  type SoundDefinition,
  type SoundId,
} from './audio-catalog';
import { ambienceFor, cuesForEvent, musicFor, spatialize, VoiceLimiter, type AudioScene } from './audio-director';
import {
  AUDIO_SETTINGS_KEY,
  channelGain,
  deserializeAudioSettings,
  serializeAudioSettings,
  withEnabled,
  withVolume,
  type AudioSettings,
  type VolumeControl,
} from './audio-settings';

/** Secondi della dissolvenza incrociata tra due brani o due ambienti. */
const CROSSFADE_SECONDS = 1.5;
/** Durata presunta di un effetto non ancora decodificato, per il limite delle voci. */
const UNKNOWN_DURATION = 0.6;
/** Volume dei toni di riserva, come nel prototipo, per un suono di volume relativo 0,5. */
const FALLBACK_TONE_GAIN = 0.035 / 0.5;

/** Una pista in anello (musica o ambiente). Usa un elemento <audio>, che funziona anche aprendo il gioco da file://. */
interface LoopTrack {
  readonly key: string;
  readonly element: HTMLAudioElement;
  readonly definition: LoopDefinition;
  /** Livello della dissolvenza, 0–1. */
  level: number;
  /** 1 per la pista voluta, 0 per quelle in uscita. */
  target: number;
  /** Guadagno scelto dalla regia (per esempio la musica abbassata in pausa). */
  gain: number;
  /** Vero mentre `play()` e' in attesa: non si richiama a ogni fotogramma. */
  starting: boolean;
}

/** Piste in anello di un canale, con dissolvenza incrociata: la pista gia' in corso non riparte da capo. */
class LoopDeck {
  private tracks: LoopTrack[] = [];

  select(key: string | null, definition: LoopDefinition | null, gain: number): void {
    for (const track of this.tracks) {
      track.target = track.key === key ? 1 : 0;
      if (track.key === key) track.gain = gain;
    }
    const file = definition?.file;
    if (key === null || definition === null || file === null || file === undefined) return;
    if (this.tracks.some((track) => track.key === key)) return;
    const element = new Audio(file.url);
    element.loop = true;
    element.preload = 'auto';
    element.volume = 0;
    this.tracks.push({ key, element, definition, level: 0, target: 1, gain, starting: false });
  }

  update(dt: number, channelVolume: number, allowed: boolean): void {
    const step = dt / CROSSFADE_SECONDS;
    for (const track of this.tracks) {
      track.level = track.target > track.level ? Math.min(track.target, track.level + step) : Math.max(track.target, track.level - step);
      track.element.volume = clamp(track.level * track.gain * track.definition.volume * channelVolume, 0, 1);
      if (!allowed) {
        if (!track.element.paused) track.element.pause();
      } else if (track.target > 0 && track.element.paused && !track.starting) {
        track.starting = true;
        track.element.play().then(
          () => (track.starting = false),
          () => (track.starting = false),
        );
      }
    }
    this.tracks = this.tracks.filter((track) => {
      if (track.target > 0 || track.level > 0) return true;
      track.element.pause();
      track.element.removeAttribute('src');
      track.element.load();
      return false;
    });
  }
}

/**
 * Motore audio: esegue cio' che decide la regia (`audio-director.ts`) con i dati del catalogo. Effetti con Web Audio
 * (stereo, variazioni, limiti di voci) quando i file si possono leggere, altrimenti (da file://) con elementi <audio>;
 * musica e ambiente sempre con elementi <audio>. Senza registrazioni usa i toni di riserva del catalogo.
 * Il browser permette di avviare l'audio solo dopo un gesto dell'utente: `unlock()` va chiamato al primo clic o tasto.
 */
export class AudioPlayer {
  /** Emesso quando cambiano le impostazioni (acceso/spento, volumi). */
  readonly changed = new Signal<[AudioSettings]>();

  private settings: AudioSettings;
  private context: AudioContext | null = null;
  private readonly channelNodes = new Map<SoundDefinition['channel'], GainNode>();
  /** Effetti decodificati per URL; `unavailable` = non leggibili con fetch (file://): si usano elementi <audio>. */
  private readonly buffers = new Map<string, AudioBuffer | 'loading' | 'unavailable'>();
  private readonly pools = new Map<string, HTMLAudioElement[]>();
  private readonly limiter = new VoiceLimiter();
  private readonly music = new LoopDeck();
  private readonly ambience = new LoopDeck();
  private unlocked = false;
  private hidden = false;
  private listener = Vec2.ZERO;
  private halfWidth = 0;

  constructor(
    private readonly store: KeyValueStore | null,
    private readonly rng: Rng = cosmeticRng,
  ) {
    this.settings = this.readSettings();
  }

  get enabled(): boolean {
    return this.settings.enabled;
  }

  get currentSettings(): AudioSettings {
    return this.settings;
  }

  /** Accende o spegne l'audio (tasto M); restituisce il nuovo stato. */
  toggle(): boolean {
    this.setEnabled(!this.settings.enabled);
    return this.settings.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.apply(withEnabled(this.settings, enabled));
    if (enabled) {
      this.unlock();
      this.play('ui_toggle');
    }
  }

  setVolume(control: VolumeControl, value: number): void {
    this.apply(withVolume(this.settings, control, value));
  }

  /** Da chiamare a ogni gesto dell'utente: al primo crea il contesto audio e carica gli effetti. */
  unlock(): void {
    this.unlocked = true;
    if (!this.settings.enabled) return;
    const context = this.ensureContext();
    if (context !== null && context.state === 'suspended' && !this.hidden) void context.resume().catch(() => undefined);
  }

  /** Scheda nascosta: tutto in silenzio finche' non torna visibile. */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    if (this.context === null) return;
    const change = hidden ? this.context.suspend() : this.context.resume();
    void change.catch(() => undefined);
  }

  /** Posizione dell'ascoltatore (il giocatore) e meta' larghezza della vista, per stereo e distanza. */
  setListener(position: Vec2, halfWidth: number): void {
    this.listener = position;
    this.halfWidth = halfWidth;
  }

  /** La situazione corrente: la regia sceglie musica e ambiente. */
  setScene(scene: AudioScene): void {
    const music = musicFor(scene);
    this.music.select(music.id, music.id === null ? null : MUSIC[music.id], music.gain);
    const ambience = ambienceFor(scene);
    this.ambience.select(ambience.id, ambience.id === null ? null : AMBIENCE[ambience.id], ambience.gain);
  }

  /** A ogni fotogramma: dissolvenze e volumi delle piste in anello. */
  update(dt: number): void {
    const allowed = this.unlocked && this.settings.enabled && !this.hidden;
    this.music.update(dt, channelGain(this.settings, 'music'), allowed);
    this.ambience.update(dt, channelGain(this.settings, 'ambience'), allowed);
  }

  /** Ascolta gli eventi della simulazione; in cooperativa `localPlayerId` e' il giocatore di questo client. */
  handle(event: GameEvent, localPlayerId?: string): void {
    for (const cue of cuesForEvent(event, localPlayerId)) this.play(cue.sound, cue.position);
  }

  /** Fa partire un suono del catalogo, eventualmente posizionato nel mondo. */
  play(id: SoundId, position?: Vec2): void {
    if (!this.settings.enabled || this.hidden) return;
    const definition: SoundDefinition = SOUNDS[id];
    const file = this.pickFile(definition);
    const buffer = file === undefined ? undefined : this.buffers.get(file.url);
    const duration = buffer instanceof AudioBuffer ? buffer.duration : (definition.fallback?.duration ?? UNKNOWN_DURATION);
    if (!this.limiter.tryStart(id, performance.now() / 1000, definition, duration)) return;
    const { pan, gain } = spatialize(position, this.listener, this.halfWidth);
    const volume = definition.volume * gain;
    const rate = 1 + (this.rng.next() * 2 - 1) * definition.rateJitter;
    if (file === undefined) {
      if (definition.fallback !== undefined) this.tone(definition.fallback, definition.channel, volume);
      return;
    }
    const context = this.ensureContextIfUnlocked();
    if (buffer instanceof AudioBuffer && context !== null) {
      this.playBuffer(context, buffer, definition.channel, volume, pan, rate);
      return;
    }
    if (buffer === undefined && context !== null) this.load(context, file.url);
    this.playElement(file.url, definition, volume, rate);
  }

  // --- Interni --------------------------------------------------------------------------------------------------

  private apply(settings: AudioSettings): void {
    this.settings = settings;
    try {
      this.store?.setItem(AUDIO_SETTINGS_KEY, serializeAudioSettings(settings));
    } catch {
      // Le impostazioni valgono comunque per questa sessione.
    }
    for (const [channel, node] of this.channelNodes) node.gain.value = channelGain(settings, channel);
    this.changed.emit(settings);
  }

  private readSettings(): AudioSettings {
    try {
      return deserializeAudioSettings(this.store?.getItem(AUDIO_SETTINGS_KEY) ?? null);
    } catch {
      return deserializeAudioSettings(null);
    }
  }

  private pickFile(definition: SoundDefinition): AudioFile | undefined {
    if (definition.files.length === 0) return undefined;
    return definition.files[Math.min(definition.files.length - 1, Math.floor(this.rng.next() * definition.files.length))];
  }

  private ensureContextIfUnlocked(): AudioContext | null {
    return this.unlocked ? this.ensureContext() : null;
  }

  private ensureContext(): AudioContext | null {
    if (this.context !== null) return this.context;
    try {
      const context = new AudioContext();
      for (const channel of ['effects', 'interface'] as const) {
        const node = context.createGain();
        node.gain.value = channelGain(this.settings, channel);
        node.connect(context.destination);
        this.channelNodes.set(channel, node);
      }
      this.context = context;
      for (const definition of Object.values(SOUNDS) as SoundDefinition[]) {
        for (const file of definition.files) this.load(context, file.url);
      }
      return context;
    } catch {
      return null;
    }
  }

  /** Decodifica un effetto. Da file:// `fetch` fallisce: il file resta suonabile con un elemento <audio>. */
  private load(context: AudioContext, url: string): void {
    if (this.buffers.has(url)) return;
    this.buffers.set(url, 'loading');
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .then(
        (buffer) => this.buffers.set(url, buffer),
        () => this.buffers.set(url, 'unavailable'),
      );
  }

  private playBuffer(
    context: AudioContext,
    buffer: AudioBuffer,
    channel: SoundDefinition['channel'],
    volume: number,
    pan: number,
    rate: number,
  ): void {
    const output = this.channelNodes.get(channel);
    if (output === undefined) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = context.createGain();
    gain.gain.value = volume;
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    source.connect(gain).connect(panner).connect(output);
    source.start();
  }

  /** Ripiego senza Web Audio: un piccolo gruppo di elementi <audio> per file (niente stereo). */
  private playElement(url: string, definition: SoundDefinition, volume: number, rate: number): void {
    const pool = this.pools.get(url) ?? [];
    this.pools.set(url, pool);
    let element = pool.find((candidate) => candidate.paused || candidate.ended);
    if (element === undefined) {
      if (pool.length >= definition.maxVoices) return;
      element = new Audio(url);
      element.preload = 'auto';
      pool.push(element);
    }
    element.volume = clamp(volume * channelGain(this.settings, definition.channel), 0, 1);
    element.preservesPitch = false;
    element.playbackRate = rate;
    element.currentTime = 0;
    void element.play().catch(() => undefined);
  }

  /** Tono sintetizzato di riserva (solo finche' manca la registrazione del suono). */
  private tone(tone: FallbackTone, channel: SoundDefinition['channel'], volume: number): void {
    const context = this.ensureContextIfUnlocked();
    const output = this.channelNodes.get(channel);
    if (context === null || output === undefined) return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(tone.frequency, context.currentTime);
      gain.gain.setValueAtTime(FALLBACK_TONE_GAIN * volume, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + tone.duration);
      oscillator.connect(gain).connect(output);
      oscillator.start();
      oscillator.stop(context.currentTime + tone.duration);
    } catch {
      // L'audio non e' essenziale: se il browser lo rifiuta il gioco prosegue senza suoni.
    }
  }
}
