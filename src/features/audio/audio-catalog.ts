import type { ArenaThemeId } from '../arena/arena';
import type { Team } from '../combat/team';

/*
 * Catalogo dei suoni: dati di sola lettura. Il motore (`audio-player.ts`) li riproduce, la regia (`audio-director.ts`)
 * decide quando. I suoni sono per MATERIALE (arcano, gelo, fuoco, natura, arco, lama, scatto): una skill nuova
 * sceglie il materiale in `SKILL_SOUNDS` e suona subito come le sue simili. Volumi e limiti sono provvisori.
 *
 * Per aggiungere una registrazione: file in `src/assets/audio/...`, credito in `audio-credits.ts`, voce con
 * `asset(new URL('../../assets/audio/<file>', import.meta.url).href, '<credito>')` (vedi la skill `tys-risorse-libere`).
 * L'URL va scritto per intero: Vite riconosce cosi' i file da copiare nella build (e incorpora quelli piccoli).
 */

/** Canali del mixer, ognuno con il proprio volume nelle impostazioni. */
export type AudioChannel = 'music' | 'effects' | 'ambience' | 'interface';

/** Un file audio e gli id dei crediti in `AUDIO_CREDITS` (piu' di uno se unisce piu' registrazioni). */
export interface AudioFile {
  readonly url: string;
  readonly credits: readonly string[];
}

function asset(url: string, ...credits: string[]): AudioFile {
  return { url, credits };
}

const KENNEY = 'kenney-impact-sounds';

/** Tono sintetizzato di riserva: solo per i suoni che il gioco aveva gia', finche' manca una registrazione. */
export interface FallbackTone {
  readonly frequency: number;
  readonly duration: number;
}

/** Un suono breve (effetto o interfaccia). */
export interface SoundDefinition {
  readonly channel: 'effects' | 'interface';
  /** Varianti: a ogni riproduzione se ne sceglie una a caso. Vuoto finche' non c'e' una registrazione. */
  readonly files: readonly AudioFile[];
  /** Volume relativo, 0–1. */
  readonly volume: number;
  /** Riproduzioni simultanee massime dello stesso suono (il dardo a raffica non diventa un muro di suono). */
  readonly maxVoices: number;
  /** Secondi minimi tra due partenze dello stesso suono. */
  readonly minInterval: number;
  /** Variazione casuale della velocita' di riproduzione (±), per non sentire sempre lo stesso campione. */
  readonly rateJitter: number;
  readonly fallback?: FallbackTone;
}

/** Un suono in anello: musica o ambiente. */
export interface LoopDefinition {
  readonly channel: 'music' | 'ambience';
  /** `null` finche' non c'e' una registrazione: il canale resta in silenzio. */
  readonly file: AudioFile | null;
  /** Volume relativo, 0–1. */
  readonly volume: number;
}

function sound(
  channel: SoundDefinition['channel'],
  volume: number,
  options: Partial<Omit<SoundDefinition, 'channel' | 'volume'>> = {},
): SoundDefinition {
  return { channel, files: [], volume, maxVoices: 4, minInterval: 0.03, rateJitter: 0.06, ...options };
}

/**
 * Tutti i suoni brevi del gioco. Gli id sono stabili: li usano la regia e i test. I file sono normalizzati allo stesso
 * picco: il volume relativo si regola qui. Senza registrazione restano i toni di riserva del prototipo o il silenzio.
 */
export const SOUNDS = {
  // Lanci del giocatore, per materiale.
  cast_arcane: sound('effects', 0.35, {
    maxVoices: 3,
    minInterval: 0.05,
    files: [
      asset(new URL('../../assets/audio/effetti/arcano-1.mp3', import.meta.url).href, KENNEY),
      asset(new URL('../../assets/audio/effetti/arcano-2.mp3', import.meta.url).href, KENNEY),
      asset(new URL('../../assets/audio/effetti/arcano-3.mp3', import.meta.url).href, KENNEY),
    ],
  }),
  cast_frost: sound('effects', 0.5, {
    files: [
      asset(new URL('../../assets/audio/effetti/ghiaccio-1.mp3', import.meta.url).href, 'fs-369982'),
      asset(new URL('../../assets/audio/effetti/ghiaccio-2.mp3', import.meta.url).href, 'fs-369982'),
      asset(new URL('../../assets/audio/effetti/ghiaccio-3.mp3', import.meta.url).href, 'fs-369982'),
    ],
  }),
  cast_fire: sound('effects', 0.55, {
    files: [
      asset(new URL('../../assets/audio/effetti/fuoco-1.mp3', import.meta.url).href, 'fs-363092'),
      asset(new URL('../../assets/audio/effetti/fuoco-2.mp3', import.meta.url).href, 'fs-363092'),
      asset(new URL('../../assets/audio/effetti/fuoco-3.mp3', import.meta.url).href, 'fs-363092'),
    ],
  }),
  cast_nature: sound('effects', 0.5, {
    files: [
      asset(new URL('../../assets/audio/effetti/natura-1.mp3', import.meta.url).href, KENNEY),
      asset(new URL('../../assets/audio/effetti/natura-2.mp3', import.meta.url).href, KENNEY),
      asset(new URL('../../assets/audio/effetti/natura-3.mp3', import.meta.url).href, KENNEY),
    ],
  }),
  cast_bow: sound('effects', 0.5, {
    maxVoices: 3,
    minInterval: 0.05,
    rateJitter: 0.1,
    files: [asset(new URL('../../assets/audio/effetti/arco-1.mp3', import.meta.url).href, 'fs-179996')],
  }),
  cast_blade: sound('effects', 0.55, {
    files: [
      asset(new URL('../../assets/audio/effetti/lama-1.mp3', import.meta.url).href, 'fs-568790'),
      asset(new URL('../../assets/audio/effetti/lama-2.mp3', import.meta.url).href, 'fs-568790'),
      asset(new URL('../../assets/audio/effetti/lama-3.mp3', import.meta.url).href, 'fs-568790'),
    ],
  }),
  // Manca ancora un fruscio vero per lo scatto: resta il tono del prototipo (secondo lotto, docs/risorse-libere.md).
  cast_dash: sound('effects', 0.5, { fallback: { frequency: 850, duration: 0.15 } }),
  // Scoppi delle zone (di entrambe le squadre), per materiale: impatti Kenney uniti a registrazioni del materiale.
  blast_arcane: sound('effects', 0.6, {
    maxVoices: 3,
    files: [asset(new URL('../../assets/audio/effetti/scoppio-arcano.mp3', import.meta.url).href, KENNEY)],
  }),
  blast_frost: sound('effects', 0.6, {
    maxVoices: 3,
    files: [asset(new URL('../../assets/audio/effetti/scoppio-ghiaccio.mp3', import.meta.url).href, KENNEY, 'fs-369982')],
  }),
  blast_fire: sound('effects', 0.65, {
    maxVoices: 3,
    files: [asset(new URL('../../assets/audio/effetti/scoppio-fuoco.mp3', import.meta.url).href, KENNEY, 'fs-363092')],
  }),
  blast_nature: sound('effects', 0.6, {
    maxVoices: 3,
    files: [asset(new URL('../../assets/audio/effetti/scoppio-palude.mp3', import.meta.url).href, KENNEY, 'fs-456806')],
  }),
  // Colpi.
  impact: sound('effects', 0.25, {
    maxVoices: 3,
    minInterval: 0.05,
    rateJitter: 0.12,
    files: [
      asset(new URL('../../assets/audio/effetti/impatto-1.mp3', import.meta.url).href, KENNEY),
      asset(new URL('../../assets/audio/effetti/impatto-2.mp3', import.meta.url).href, KENNEY),
    ],
  }),
  boss_hit: sound('effects', 0.35, {
    maxVoices: 2,
    minInterval: 0.08,
    rateJitter: 0.1,
    files: [
      asset(new URL('../../assets/audio/effetti/colpo-boss-1.mp3', import.meta.url).href, KENNEY),
      asset(new URL('../../assets/audio/effetti/colpo-boss-2.mp3', import.meta.url).href, KENNEY),
    ],
  }),
  player_hurt: sound('effects', 0.75, {
    maxVoices: 1,
    minInterval: 0.2,
    files: [
      asset(new URL('../../assets/audio/effetti/colpo-subito-1.mp3', import.meta.url).href, KENNEY),
      asset(new URL('../../assets/audio/effetti/colpo-subito-2.mp3', import.meta.url).href, KENNEY),
    ],
  }),
  // Boss. Manca ancora un suono d'annuncio degli attacchi (secondo lotto): `boss_attack` resta muto.
  boss_attack: sound('effects', 0.45, { maxVoices: 2, minInterval: 0.3 }),
  boss_rage: sound('effects', 0.85, {
    maxVoices: 1,
    minInterval: 1,
    rateJitter: 0,
    files: [asset(new URL('../../assets/audio/effetti/furia-gong.mp3', import.meta.url).href, 'fs-486629')],
  }),
  boss_teleport: sound('effects', 0.6, {
    maxVoices: 1,
    files: [asset(new URL('../../assets/audio/effetti/teletrasporto-ghiaccio.mp3', import.meta.url).href, 'fs-369982')],
  }),
  boss_slam: sound('effects', 0.7, {
    maxVoices: 2,
    files: [
      asset(new URL('../../assets/audio/effetti/schianto-1.mp3', import.meta.url).href, KENNEY),
      asset(new URL('../../assets/audio/effetti/schianto-2.mp3', import.meta.url).href, KENNEY),
    ],
  }),
  boss_defeated: sound('effects', 0.9, {
    maxVoices: 1,
    rateJitter: 0,
    files: [asset(new URL('../../assets/audio/effetti/boss-sconfitto.mp3', import.meta.url).href, KENNEY, 'fs-486629')],
  }),
  // Interfaccia ed esiti.
  ui_click: sound('interface', 0.3, {
    maxVoices: 2,
    minInterval: 0.04,
    rateJitter: 0.03,
    files: [
      asset(new URL('../../assets/audio/interfaccia/clic-1.mp3', import.meta.url).href, 'kenney-ui-audio'),
      asset(new URL('../../assets/audio/interfaccia/clic-2.mp3', import.meta.url).href, 'kenney-ui-audio'),
    ],
  }),
  ui_toggle: sound('interface', 0.45, {
    maxVoices: 1,
    rateJitter: 0,
    files: [asset(new URL('../../assets/audio/interfaccia/interruttore.mp3', import.meta.url).href, 'kenney-ui-audio')],
  }),
  loot: sound('interface', 0.7, {
    maxVoices: 1,
    rateJitter: 0,
    files: [asset(new URL('../../assets/audio/interfaccia/bottino-campana.mp3', import.meta.url).href, KENNEY)],
  }),
  level_up: sound('interface', 0.7, {
    maxVoices: 1,
    rateJitter: 0,
    files: [asset(new URL('../../assets/audio/interfaccia/livello-campana.mp3', import.meta.url).href, KENNEY)],
  }),
  victory: sound('interface', 0.8, {
    maxVoices: 1,
    rateJitter: 0,
    files: [asset(new URL('../../assets/audio/interfaccia/vittoria-fanfara.mp3', import.meta.url).href, 'fs-26198')],
  }),
  defeat: sound('interface', 0.8, {
    maxVoices: 1,
    rateJitter: 0,
    files: [asset(new URL('../../assets/audio/interfaccia/sconfitta-campana.mp3', import.meta.url).href, 'fs-329324')],
  }),
} as const satisfies Readonly<Record<string, SoundDefinition>>;

export type SoundId = keyof typeof SOUNDS;

/** Musiche: una per il menu, una per dungeon e una per la furia dei boss (se manca si resta sul brano del dungeon). */
export type MusicId = 'menu' | ArenaThemeId | 'rage';

export const MUSIC: Readonly<Record<MusicId, LoopDefinition>> = {
  // Bach, Aria delle Goldberg (Kimiko Ishizaka, pianoforte).
  menu: {
    channel: 'music',
    file: asset(new URL('../../assets/audio/musica/menu-bach-aria-goldberg.mp3', import.meta.url).href, 'archive-goldberg-aria'),
    volume: 0.6,
  },
  // Canto gregoriano (monastero vicino a Burgos).
  crypt: {
    channel: 'music',
    file: asset(new URL('../../assets/audio/musica/cripta-canto-gregoriano.mp3', import.meta.url).href, 'fs-320530'),
    volume: 0.6,
  },
  // Nota tenuta di violoncello: un tappeto sotto i suoni della palude.
  swamp: {
    channel: 'music',
    file: asset(new URL('../../assets/audio/musica/palude-violoncello.mp3', import.meta.url).href, 'fs-465558'),
    volume: 0.5,
  },
  // Taiko suonati dal vivo.
  forge: {
    channel: 'music',
    file: asset(new URL('../../assets/audio/musica/fucina-taiko.mp3', import.meta.url).href, 'fs-127337'),
    volume: 0.6,
  },
  // Grieg, La morte di Åse (Czech National Symphony Orchestra).
  glacier: {
    channel: 'music',
    file: asset(new URL('../../assets/audio/musica/ghiacciaio-grieg-morte-di-ase.mp3', import.meta.url).href, 'imslp-246988'),
    volume: 0.7,
  },
  // Grieg, Nell'antro del re della montagna: il finale, in anello, per la furia di ogni boss.
  rage: {
    channel: 'music',
    file: asset(new URL('../../assets/audio/musica/furia-grieg-re-della-montagna.mp3', import.meta.url).href, 'imslp-246990'),
    volume: 0.6,
  },
};

/** Ambiente in anello per tema della mappa: grotta, palude notturna, fango che ribolle, vento. */
export const AMBIENCE: Readonly<Record<ArenaThemeId, LoopDefinition>> = {
  crypt: {
    channel: 'ambience',
    file: asset(new URL('../../assets/audio/ambiente/cripta-grotta.mp3', import.meta.url).href, 'fs-196713'),
    volume: 0.6,
  },
  swamp: {
    channel: 'ambience',
    file: asset(new URL('../../assets/audio/ambiente/palude-notte.mp3', import.meta.url).href, 'fs-181364'),
    volume: 0.7,
  },
  forge: {
    channel: 'ambience',
    file: asset(new URL('../../assets/audio/ambiente/fucina-fango-ribollente.mp3', import.meta.url).href, 'fs-456806'),
    volume: 0.5,
  },
  glacier: {
    channel: 'ambience',
    file: asset(new URL('../../assets/audio/ambiente/ghiacciaio-vento.mp3', import.meta.url).href, 'fs-47704'),
    volume: 0.5,
  },
};

/**
 * Suono di lancio per `SkillDefinition.visual`. Ogni skill degli oggetti deve comparire qui (lo controlla un test):
 * scegliere il materiale e' una decisione, non un ripiego.
 */
export const SKILL_SOUNDS: Readonly<Record<string, SoundId>> = {
  arcane_bolt: 'cast_arcane',
  storm_bolt: 'cast_arcane',
  spirit_wisp: 'cast_arcane',
  ossuary_light: 'cast_arcane',
  shroud_blast: 'cast_arcane',
  frost_orb: 'cast_frost',
  frostlance_shard: 'cast_frost',
  mirror_shard: 'cast_frost',
  veil_blast: 'cast_frost',
  meteor: 'cast_fire',
  hammer_blast: 'cast_fire',
  plate_blast: 'cast_fire',
  aegis_blast: 'cast_fire',
  cinder_fragment: 'cast_fire',
  sporefan_seed: 'cast_nature',
  reed_burst: 'cast_nature',
  hunter_arrow: 'cast_bow',
  thorn_spike: 'cast_bow',
  guardian_sweep: 'cast_blade',
  astral_step: 'cast_dash',
  wind_dash: 'cast_dash',
  bog_dash: 'cast_dash',
  grave_step: 'cast_dash',
  ember_step: 'cast_dash',
  rime_step: 'cast_dash',
};

/** Suono di lancio per le skill senza voce in `SKILL_SOUNDS` (per esempio quelle dei test), per tipo di effetto. */
export const KIND_SOUNDS: Readonly<Record<'projectile' | 'ground_blast' | 'dash' | 'melee_arc', SoundId>> = {
  projectile: 'cast_arcane',
  ground_blast: 'cast_fire',
  dash: 'cast_dash',
  melee_arc: 'cast_blade',
};

/** Scoppio delle zone del giocatore per `DangerZoneSpec.visual`. */
export const ZONE_SOUNDS: Readonly<Record<string, SoundId>> = {
  hammer_blast: 'blast_fire',
  plate_blast: 'blast_fire',
  aegis_blast: 'blast_fire',
  shroud_blast: 'blast_arcane',
  veil_blast: 'blast_frost',
  reed_burst: 'blast_nature',
};

/**
 * Scoppio delle zone dei boss, dal prefisso dell'id visivo (`forge_slam`, `glacier_spike`, ...): i boss nuovi che
 * seguono la convenzione `<tema>_<schema>` suonano senza altre voci.
 */
export const ZONE_PREFIX_SOUNDS: ReadonlyArray<readonly [prefix: string, sound: SoundId]> = [
  ['forge_', 'blast_fire'],
  ['ember_', 'blast_fire'],
  ['glacier_', 'blast_frost'],
  ['frost_', 'blast_frost'],
  ['swamp_', 'blast_nature'],
  ['spore_', 'blast_nature'],
  ['void_', 'blast_arcane'],
];

/** Scoppio di una zona senza aspetto proprio (meteora, fratture del guardiano), per squadra. */
export const TEAM_BLAST_SOUNDS: Readonly<Record<Team, SoundId>> = {
  player: 'blast_fire',
  enemy: 'blast_fire',
};
