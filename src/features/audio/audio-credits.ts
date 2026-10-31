/*
 * Crediti delle registrazioni usate dal gioco. Regole (docs/prompt-di-progetto.md, sezione 5): solo registrazioni vere
 * (strumenti, voci, ambienti, foley), mai audio generato da IA; licenze CC0, pubblico dominio o CC BY. NC e ND non sono
 * ammesse: il tipo `AudioLicense` non le prevede e i test del catalogo rifiutano file senza credito.
 */

/** Licenze ammesse per l'audio. */
export type AudioLicense = 'CC0-1.0' | 'PD' | 'CC-BY-3.0' | 'CC-BY-4.0';

export interface LicenseInfo {
  /** Nome breve da mostrare nei crediti. */
  readonly name: string;
  readonly url: string;
  /** Vero se la licenza obbliga a citare autore e fonte (crediti visibili nel gioco). */
  readonly requiresAttribution: boolean;
}

export const AUDIO_LICENSES: Readonly<Record<AudioLicense, LicenseInfo>> = {
  'CC0-1.0': { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/', requiresAttribution: false },
  PD: { name: 'Pubblico dominio', url: 'https://creativecommons.org/publicdomain/mark/1.0/', requiresAttribution: false },
  'CC-BY-3.0': { name: 'CC BY 3.0', url: 'https://creativecommons.org/licenses/by/3.0/', requiresAttribution: true },
  'CC-BY-4.0': { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', requiresAttribution: true },
};

/** Da dove viene una registrazione e a quali condizioni si usa. */
export interface AudioCredit {
  /** Titolo dell'opera o del suono, come sulla pagina della fonte. */
  readonly title: string;
  /** Autore, esecutore o registrista. */
  readonly author: string;
  /** Pagina della fonte (non il link diretto al file). */
  readonly source: string;
  readonly license: AudioLicense;
  /** Data di consultazione della pagina (AAAA-MM-GG). */
  readonly retrieved: string;
  /** Che cosa si sente: deve essere una registrazione vera. */
  readonly description: string;
  /** Modifiche fatte al file (taglio, conversione, volume): le licenze CC BY chiedono di indicarle. */
  readonly changes?: string;
}

/** Modifica comune a tutti gli effetti: taglio di un singolo colpo, mono, volume normalizzato, mp3. */
const SHORT_EDIT = 'tagliati singoli colpi di meno di un secondo, convertiti in mp3 mono a 96 kbps con volume normalizzato';
/** Modifica comune alle musiche e agli ambienti in anello. */
const LOOP_EDIT = 'tagliato un tratto chiuso ad anello con dissolvenza incrociata, convertito in mp3 a bassa velocita\' con volume normalizzato';

/**
 * Crediti per id (`<fonte>-<numero>`). Si aggiungono insieme ai file (skill `tys-risorse-libere`); gli id non si
 * riusano per opere diverse. Le pagine sono state consultate il 31 ottobre 2026 e la licenza letta sulla pagina.
 */
export const AUDIO_CREDITS: Readonly<Record<string, AudioCredit>> = {
  'archive-goldberg-aria': {
    title: 'Bach, Variazioni Goldberg BWV 988: Aria (The Open Goldberg Variations)',
    author: 'Kimiko Ishizaka',
    source: 'https://archive.org/details/The_Open_Goldberg_Variations-11823',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Pianoforte Bösendorfer 290 Imperial registrato al Teldex Studio di Berlino',
    changes: 'prima meta\' dell\'Aria con dissolvenze, ricodificata in mp3 a 96 kbps',
  },
  'fs-320530': {
    title: 'Binaural catholic gregorian chant mass liturgy',
    author: 'Suso_Ramallo',
    source: 'https://freesound.org/s/320530/',
    license: 'CC-BY-4.0',
    retrieved: '2026-10-31',
    description: 'Canto gregoriano di una messa, registrazione binaurale in un monastero vicino a Burgos',
    changes: LOOP_EDIT,
  },
  'fs-465558': {
    title: 'cello drone.wav',
    author: 'carrieedick',
    source: 'https://freesound.org/s/465558/',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Nota tenuta di violoncello',
    changes: LOOP_EDIT,
  },
  'fs-127337': {
    title: 'taikoset1_ste58.wav',
    author: 'whatsanickname4u (esecuzione di Dave Thayer)',
    source: 'https://freesound.org/s/127337/',
    license: 'CC-BY-3.0',
    retrieved: '2026-10-31',
    description: 'Quattro tamburi taiko suonati dal vivo',
    changes: LOOP_EDIT,
  },
  'imslp-246988': {
    title: 'Grieg, Peer Gynt, Suite n. 1 op. 46: II. La morte di Åse',
    author: 'Czech National Symphony Orchestra (Musopen, 2012)',
    source: 'https://imslp.org/wiki/Peer_Gynt_Suite_No.1,_Op.46_(Grieg,_Edvard)',
    license: 'CC-BY-3.0',
    retrieved: '2026-10-31',
    description: 'Orchestra d\'archi, registrazione Musopen',
    changes: 'brano intero senza i silenzi ai bordi, con dissolvenze, ricodificato in mp3 a 96 kbps con volume normalizzato',
  },
  'imslp-246990': {
    title: 'Grieg, Peer Gynt, Suite n. 1 op. 46: IV. Nell\'antro del re della montagna',
    author: 'Czech National Symphony Orchestra (Musopen, 2012)',
    source: 'https://imslp.org/wiki/Peer_Gynt_Suite_No.1,_Op.46_(Grieg,_Edvard)',
    license: 'CC-BY-3.0',
    retrieved: '2026-10-31',
    description: 'Orchestra, registrazione Musopen',
    changes: 'tratto finale (da 1:36 a 2:26) chiuso ad anello con dissolvenza incrociata, mp3 a 96 kbps con volume normalizzato',
  },
  'fs-196713': {
    title: 'Sea Cave',
    author: 'Andy_Gardner',
    source: 'https://freesound.org/s/196713/',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Ambiente di una grotta marina',
    changes: LOOP_EDIT,
  },
  'fs-181364': {
    title: 'WILDTRACK Swamp at night in Minnesota USA',
    author: 'chris_dagorne',
    source: 'https://freesound.org/s/181364/',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Palude di notte nel Minnesota',
    changes: LOOP_EDIT,
  },
  'fs-456806': {
    title: 'Hot Bubbling Mud',
    author: 'Breviceps',
    source: 'https://freesound.org/s/456806/',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Fango bollente che ribolle',
    changes: `${LOOP_EDIT}; un secondo usato anche nello scoppio della palude`,
  },
  'fs-47704': {
    title: '0203wind.wav',
    author: 'moxobna',
    source: 'https://freesound.org/s/47704/',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Vento',
    changes: LOOP_EDIT,
  },
  'fs-26198': {
    title: 'Medieval Fanfare.aiff',
    author: 'tobyk (trombe: Jo Wright)',
    source: 'https://freesound.org/s/26198/',
    license: 'CC-BY-3.0',
    retrieved: '2026-10-31',
    description: 'Fanfara per due trombe',
    changes: 'tagliati i primi 4,6 s, mono, mp3 a 96 kbps con volume normalizzato',
  },
  'fs-329324': {
    title: 'funeral bell-cloche funèbre.wav',
    author: 'aoristos',
    source: 'https://freesound.org/s/329324/',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Campana funebre',
    changes: 'primi 10 s con dissolvenza, mono, mp3 a 96 kbps',
  },
  'fs-486629': {
    title: 'Gong Brilliant Paiste 32"',
    author: 'JensZygar',
    source: 'https://freesound.org/s/486629/',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Gong Paiste da 32 pollici',
    changes: 'primi 8 s con dissolvenza, mono; l\'attacco e\' anche nel suono della sconfitta del boss',
  },
  'fs-568790': {
    title: 'sword against sword.wav',
    author: 'Fenodyrie',
    source: 'https://freesound.org/s/568790/',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Scontri di spade',
    changes: SHORT_EDIT,
  },
  'fs-179996': {
    title: 'Arrow Release and Hit.wav',
    author: 'calvarychurchatlanta',
    source: 'https://freesound.org/s/179996/',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Rilascio di una freccia e impatto',
    changes: 'solo il rilascio (0,42 s), senza l\'impatto; mono, mp3 a 96 kbps',
  },
  'fs-363092': {
    title: 'Fire Crackle and Flames 002',
    author: 'TheWoodlandNomad',
    source: 'https://freesound.org/s/363092/',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Fuoco che scoppietta',
    changes: `${SHORT_EDIT}; uno unito a un impatto di Kenney per lo scoppio di fuoco`,
  },
  'fs-369982': {
    title: 'Ice cracking_northern87',
    author: 'northern87',
    source: 'https://freesound.org/s/369982/',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Ghiaccio che si crepa',
    changes: `${SHORT_EDIT}; uno unito a un impatto di Kenney per lo scoppio di ghiaccio`,
  },
  'kenney-impact-sounds': {
    title: 'Impact Sounds (1.0)',
    author: 'Kenney (kenney.nl)',
    source: 'https://kenney.nl/assets/impact-sounds',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Impatti, passi e campane registrati (foley)',
    changes: 'scelti singoli file, alcuni uniti a registrazioni Freesound; mono, mp3 a 96 kbps con volume normalizzato',
  },
  'kenney-ui-audio': {
    title: 'UI Audio',
    author: 'Kenney (kenney.nl)',
    source: 'https://kenney.nl/assets/ui-audio',
    license: 'CC0-1.0',
    retrieved: '2026-10-31',
    description: 'Clic e interruttori dell\'interfaccia (suoni dichiarati organici)',
    changes: 'scelti tre file; mono, mp3 a 96 kbps con volume normalizzato',
  },
};
