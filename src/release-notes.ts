import { version } from '../package.json';

export interface BalanceChange {
  readonly label: string;
  readonly before: number;
  readonly after: number;
  readonly unit: string;
}

export interface ReleaseNotes {
  readonly version: string;
  readonly date: string;
  readonly changes: readonly string[];
  readonly balanceChanges: readonly BalanceChange[];
}

/** Prima voce = aggiornamento corrente; conservare le precedenti per lo storico. Vedere docs/versioning.md. */
export const RELEASES: readonly ReleaseNotes[] = [
  {
    version: '0.2.0', date: '2026-11-01',
    changes: [
      'Versione del gioco visibile in basso al centro e testo introduttivo del menu aggiornato.',
      'Changelog consultabile in basso a sinistra, solo nel menu.',
      'Versioning per branch: ultimo numero incrementato a ogni commit del feature; numero centrale incrementato e ultimo azzerato al merge in main. Note con valori prima e dopo per il bilanciamento.',
    ],
    balanceChanges: [],
  },
  {
    version: '0.1.0', date: '2026-11-01',
    changes: [
      'Aggiunto il piano per la futura revisione di ritratti e sprite (PR #6). La revisione grafica resta sospesa.',
    ],
    balanceChanges: [],
  },
];

/** La versione del pacchetto è l’unica fonte del numero mostrato nel gioco. */
export const GAME_VERSION = version;
export const CURRENT_RELEASE = RELEASES[0]!;
export const GAME_VERSION_LABEL = `v${version.split('.').map((part, index) => index === 0 ? part : part.padStart(2, '0')).join('.')}`;

export function describeBalanceChange(change: BalanceChange): string {
  return `${change.label}: ${change.before} → ${change.after}${change.unit ? ` ${change.unit}` : ''}`;
}
