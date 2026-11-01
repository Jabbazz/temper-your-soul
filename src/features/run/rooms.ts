/*
 * Le stanze della discesa: tipi, premi e regole. Dati di sola lettura; i valori sono provvisori (proposte dello studio
 * sulla progressione) e si tarano con la prova manuale.
 */

/** Che stanza c'e' dietro una porta. */
export type RoomKind =
  | 'threshold'
  | 'combat'
  | 'trial'
  | 'reliquary'
  | 'lieutenant'
  | 'sanctuary'
  | 'siege'
  | 'hunt'
  | 'antechamber'
  | 'boss';

/** Il premio mostrato sulla porta. */
export type RewardKind = 'temper' | 'embers' | 'heal' | 'seal';

/** La regola di una Prova: senza farsi colpire, oppure entro un tempo. */
export type TrialRule = 'unscathed' | 'timed';

/** Una porta fra cui scegliere: tipo di stanza, premio e (per le Prove) la regola. */
export interface DoorOption {
  readonly kind: RoomKind;
  readonly reward: RewardKind | null;
  readonly rule?: TrialRule;
  /** Porta piu' dura (teschio sulla porta): Prova, Assedio. */
  readonly hard?: boolean;
}

export const ROOM_LABELS: Readonly<Record<RoomKind, { readonly name: string; readonly summary: string }>> = {
  threshold: { name: 'Soglia', summary: 'Uno scontro facile per entrare.' },
  combat: { name: 'Scontro', summary: 'Ondate di servitori: elimina tutto.' },
  trial: { name: 'Prova', summary: 'Facoltativa, con una regola: premio doppio e un sigillo.' },
  reliquary: { name: 'Reliquiario', summary: 'Nessuna ondata: un forziere, a volte un patto.' },
  lieutenant: { name: 'Luogotenente', summary: 'Un servitore maggiore con gli schemi del boss.' },
  sanctuary: { name: 'Santuario', summary: 'Nessun nemico: scegli fra la fonte e l\'incudine.' },
  siege: { name: 'Assedio', summary: 'Resisti mentre i nidi generano nemici: distruggerli accorcia l\'attesa.' },
  hunt: { name: 'Caccia', summary: 'Abbatti la preda che fugge ed evoca.' },
  antechamber: { name: 'Anticamera', summary: 'Calma prima del boss: un ristoro.' },
  boss: { name: 'Boss', summary: 'Il guardiano della discesa.' },
};

export const REWARD_LABELS: Readonly<Record<RewardKind, { readonly name: string; readonly summary: string }>> = {
  temper: { name: 'Tempra', summary: 'Potenzia una delle tue skill fino alla fine della discesa.' },
  embers: { name: 'Braci', summary: 'Valuta permanente per l\'Altare dell\'anima.' },
  heal: { name: 'Ristoro', summary: 'Recupera vita.' },
  seal: { name: 'Sigillo', summary: 'Alza la probabilità di bottino del boss.' },
};

export const TRIAL_LABELS: Readonly<Record<TrialRule, { readonly name: string; readonly summary: string }>> = {
  unscathed: { name: 'Senza un graffio', summary: 'Libera la stanza senza farti colpire.' },
  timed: { name: 'Contro il tempo', summary: 'Libera la stanza entro il tempo.' },
};

/**
 * Combattimento per tipo di stanza: moltiplicatore del budget del regista e numero di ondate. Le stanze senza
 * combattimento valgono 0. Provvisori.
 */
export const ROOM_COMBAT: Readonly<Record<RoomKind, { readonly budget: number; readonly waves: number }>> = {
  threshold: { budget: 0.6, waves: 2 },
  combat: { budget: 1, waves: 3 },
  trial: { budget: 1.15, waves: 3 },
  reliquary: { budget: 0, waves: 0 },
  lieutenant: { budget: 0, waves: 0 },
  sanctuary: { budget: 0, waves: 0 },
  siege: { budget: 1.3, waves: 6 },
  hunt: { budget: 0.5, waves: 1 },
  antechamber: { budget: 0, waves: 0 },
  boss: { budget: 0, waves: 0 },
};

/** Valori della discesa. Provvisori (vedi lo studio sulla progressione). */
export const DESCENT = {
  /** Budget base del regista: 60 x (1 + 0,15 x tappa) x tipo di stanza. */
  baseBudget: 60,
  budgetPerStage: 0.15,
  /** Vita dei servitori per dungeon (l'equipaggiamento dei dungeon alti e' piu' forte). */
  healthScale: { crypt: 1, swamp: 1.6, forge: 2.4, glacier: 3.2 } as Readonly<Record<string, number>>,
  /** Vivi al massimo insieme: 30 da soli, +5 per ogni giocatore in piu' (45 in quattro). */
  aliveCap: 30,
  aliveCapPerPlayer: 5,
  /** Budget in cooperativa: x(giocatori + 1)/2, cioe' x1 / x1,5 / x2 / x2,5. */
  partyBudget: (players: number): number => (Math.max(1, players) + 1) / 2,
  /** Probabilita' che un'ondata abbia un'elite, per tappa (mai nella Soglia). */
  eliteChance: 0.35,
  /** Secondi del segnale a terra prima di una comparsa. */
  spawnTelegraph: 0.9,
  /** La prossima ondata arriva quando resta vivo meno di questa frazione della precedente, o dopo `waveTimeout`. */
  nextWaveFraction: 0.3,
  waveTimeout: 20,
  /** Secondi di calma all'ingresso prima della prima ondata. */
  introDelay: 1.6,
  /** Secondi in cui tutti i giocatori vivi devono restare sulla porta per attraversarla. */
  doorHold: 0.8,
  /** Ristori. */
  sanctuaryHeal: 0.4,
  antechamberHeal: 0.25,
  rewardHeal: 0.3,
  /** Chi era a terra si rialza alla stanza successiva con questa frazione della vita. */
  reviveFraction: 0.3,
  /** Assedio: durata e secondi tolti da ogni nido distrutto. */
  siegeSeconds: 45,
  siegeNestBonus: 8,
  /** Prova a tempo: secondi a disposizione. */
  trialSeconds: 45,
  /** Braci per premio, prima del moltiplicatore del dungeon. */
  embers: { threshold: 6, door: 22, unscathedRoom: 4, reliquary: 35, siege: 12, boss: 30, lieutenant: 15 },
  /** Moltiplicatore delle braci e dell'esperienza delle stanze, per dungeon. */
  dungeonFactor: { crypt: 1, swamp: 1.4, forge: 1.8, glacier: 2.2 } as Readonly<Record<string, number>>,
  /** Ogni stanza di combattimento liberata vale questa frazione dell'esperienza del boss del dungeon. */
  roomXpShare: 0.05,
  /** Sigilli: +5 punti alla probabilità di bottino del boss, fino a +20. */
  sealBonus: 0.05,
  maxSeals: 4,
  /** Gradi di tempra: +10% budget, +10% braci ogni grado. */
  gradeBudget: 0.1,
  gradeEmbers: 0.1,
  maxGrade: 5,
} as const;
