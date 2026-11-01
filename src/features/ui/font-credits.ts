/*
 * Caratteri dell'interfaccia (tema Reliquiario), tutti con la SIL Open Font License 1.1: si servono dal gioco stesso
 * (file in `src/assets/fonts/`, incorporati nella build), mai da un sito esterno. La licenza di ciascuno sta accanto ai
 * file e va distribuita con il gioco.
 */

export interface FontCredit {
  /** Nome della famiglia, come si scrive nel CSS e nel canvas. */
  readonly title: string;
  readonly author: string;
  /** Pagina della fonte. */
  readonly source: string;
  readonly license: 'OFL-1.1';
  /** Data di consultazione della pagina e di scaricamento (AAAA-MM-GG). */
  readonly retrieved: string;
  /** Per che cosa si usa nel gioco. */
  readonly use: string;
  /** File in `src/assets/fonts/`: i caratteri (sottoinsieme latino di Google Fonts) e il testo della licenza. */
  readonly files: readonly string[];
  readonly licenseFile: string;
}

/** Nome breve della licenza, per il pannello dei crediti. */
export const FONT_LICENSE_NAME = 'SIL OFL 1.1';

/** Crediti per id, consultati e scaricati il 1 novembre 2026 con il consenso dell'utente. */
export const FONT_CREDITS: Readonly<Record<string, FontCredit>> = {
  'grenze-gotisch': {
    title: 'Grenze Gotisch',
    author: 'Omnibus-Type',
    source: 'https://fonts.google.com/specimen/Grenze+Gotisch',
    license: 'OFL-1.1',
    retrieved: '2026-11-01',
    use: 'titoli, stendardi e intestazioni',
    files: ['grenze-gotisch-latin.woff2'],
    licenseFile: 'OFL-grenze-gotisch.txt',
  },
  silkscreen: {
    title: 'Silkscreen',
    author: 'Jason Kottke',
    source: 'https://fonts.google.com/specimen/Silkscreen',
    license: 'OFL-1.1',
    retrieved: '2026-11-01',
    use: 'numeri e tasti dell\'HUD, etichette piccole, numeri del danno',
    files: ['silkscreen-400-latin.woff2', 'silkscreen-700-latin.woff2'],
    licenseFile: 'OFL-silkscreen.txt',
  },
};
