/*
 * L'Altare dell'anima: benedizioni permanenti comprate con le braci. Valgono solo nelle discese (e nel Pellegrinaggio),
 * mai nel Duello, e non toccano GS ne' oggetti: le soglie dei dungeon restano quelle del bottino. Valori provvisori.
 */

export type BlessingId = 'vigor' | 'first_spark' | 'second_life' | 'smith_eye' | 'fortune';

export interface BlessingDefinition {
  readonly id: BlessingId;
  readonly name: string;
  /** Che cosa fa al livello indicato (1..maxLevel), in italiano. */
  describe(level: number): string;
  /** Costo in braci di ogni livello, in ordine. */
  readonly costs: readonly number[];
}

export const BLESSINGS: readonly BlessingDefinition[] = [
  { id: 'vigor', name: 'Vigore', describe: (level) => `+${10 * level} vita massima nelle discese.`, costs: [60, 120, 200] },
  { id: 'first_spark', name: 'Prima scintilla', describe: () => 'Ogni discesa comincia con una tempra a scelta.', costs: [150] },
  { id: 'second_life', name: 'Seconda vita', describe: () => 'Una volta per discesa, a terra ti rialzi con il 30% della vita.', costs: [300] },
  { id: 'smith_eye', name: 'Occhio del fabbro', describe: () => 'Quattro offerte di tempra invece di tre.', costs: [200] },
  { id: 'fortune', name: 'Fortuna', describe: (level) => `${level === 1 ? 'Un sigillo' : `${level} sigilli`} all'inizio della discesa.`, costs: [120, 240] },
];

/** Livelli delle benedizioni di un personaggio (0 = non comprata). */
export type BlessingLevels = Readonly<Partial<Record<BlessingId, number>>>;

export function blessingById(id: string): BlessingDefinition | undefined {
  return BLESSINGS.find((blessing) => blessing.id === id);
}

export function blessingLevel(levels: BlessingLevels, id: BlessingId): number {
  return Math.max(0, Math.min(blessingById(id)?.costs.length ?? 0, Math.floor(levels[id] ?? 0)));
}

/** Il costo del prossimo livello, o null se e' al massimo. */
export function nextBlessingCost(levels: BlessingLevels, id: BlessingId): number | null {
  const blessing = blessingById(id);
  if (blessing === undefined) return null;
  return blessing.costs[blessingLevel(levels, id)] ?? null;
}

/** Gli effetti delle benedizioni all'inizio di una discesa. */
export interface BlessingEffects {
  readonly bonusHealth: number;
  readonly startingTemper: boolean;
  readonly secondLife: boolean;
  readonly offers: number;
  readonly seals: number;
}

export function blessingEffects(levels: BlessingLevels): BlessingEffects {
  return {
    bonusHealth: 10 * blessingLevel(levels, 'vigor'),
    startingTemper: blessingLevel(levels, 'first_spark') > 0,
    secondLife: blessingLevel(levels, 'second_life') > 0,
    offers: blessingLevel(levels, 'smith_eye') > 0 ? 4 : 3,
    seals: blessingLevel(levels, 'fortune'),
  };
}

/** Pulisce livelli letti da un salvataggio o dalla rete: solo benedizioni note, livelli interi nei limiti. */
export function cleanBlessings(raw: unknown): Partial<Record<BlessingId, number>> {
  const levels: Partial<Record<BlessingId, number>> = {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return levels;
  for (const blessing of BLESSINGS) {
    const value = (raw as Record<string, unknown>)[blessing.id];
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) levels[blessing.id] = Math.min(value, blessing.costs.length);
  }
  return levels;
}
