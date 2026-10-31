import type { AudioChannel } from './audio-catalog';

/** Chiave delle impostazioni audio, separata dal salvataggio del personaggio (che non cambia formato). */
export const AUDIO_SETTINGS_KEY = 'temper-your-soul:audio';

/** I cursori del mixer: il volume generale e uno per canale. */
export type VolumeControl = 'master' | AudioChannel;

export const VOLUME_CONTROLS: readonly VolumeControl[] = ['master', 'music', 'effects', 'ambience', 'interface'];

export interface AudioSettings {
  /** Audio acceso o spento (tasto M). */
  readonly enabled: boolean;
  /** Volumi da 0 a 1. */
  readonly volumes: Readonly<Record<VolumeControl, number>>;
}

/**
 * Valori iniziali, provvisori. Con le registrazioni vere l'audio e' acceso per impostazione (nel prototipo era spento
 * perche' c'erano solo toni sintetizzati); il browser lo avvia comunque solo dopo il primo clic o tasto, e M lo spegne.
 */
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  enabled: true,
  volumes: { master: 0.8, music: 0.6, effects: 0.8, ambience: 0.5, interface: 0.6 },
};

/** Guadagno effettivo di un canale: generale per canale, zero ad audio spento. */
export function channelGain(settings: AudioSettings, channel: AudioChannel): number {
  return settings.enabled ? settings.volumes.master * settings.volumes[channel] : 0;
}

export function withVolume(settings: AudioSettings, control: VolumeControl, value: number): AudioSettings {
  return { ...settings, volumes: { ...settings.volumes, [control]: cleanVolume(value, settings.volumes[control]) } };
}

export function withEnabled(settings: AudioSettings, enabled: boolean): AudioSettings {
  return { ...settings, enabled };
}

export function serializeAudioSettings(settings: AudioSettings): string {
  return JSON.stringify({ version: 1, enabled: settings.enabled, volumes: settings.volumes });
}

/**
 * Legge le impostazioni salvate. Dati assenti, illeggibili o non validi non bloccano mai il gioco: ogni campo non valido
 * torna al valore iniziale, i volumi si limitano a 0–1.
 */
export function deserializeAudioSettings(text: string | null): AudioSettings {
  if (text === null) return DEFAULT_AUDIO_SETTINGS;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return DEFAULT_AUDIO_SETTINGS;
  const { enabled, volumes } = data as Record<string, unknown>;
  const raw = typeof volumes === 'object' && volumes !== null && !Array.isArray(volumes) ? (volumes as Record<string, unknown>) : {};
  const clean = Object.fromEntries(
    VOLUME_CONTROLS.map((control) => [control, cleanVolume(raw[control], DEFAULT_AUDIO_SETTINGS.volumes[control])]),
  ) as Record<VolumeControl, number>;
  return { enabled: typeof enabled === 'boolean' ? enabled : DEFAULT_AUDIO_SETTINGS.enabled, volumes: clean };
}

function cleanVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}
