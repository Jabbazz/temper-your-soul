/** Solo compatibilità dei salvataggi v7: nessun acquisto o effetto di gioco. */
export type BlessingId = 'vigor' | 'first_spark' | 'second_life' | 'smith_eye' | 'fortune';
export type BlessingLevels = Readonly<Partial<Record<BlessingId, number>>>;
const LEGACY_LEVELS: Readonly<Record<BlessingId, number>> = { vigor: 3, first_spark: 1, second_life: 1, smith_eye: 1, fortune: 2 };
export function cleanBlessings(raw: unknown): Partial<Record<BlessingId, number>> {
  const levels: Partial<Record<BlessingId, number>> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return levels;
  for (const id of Object.keys(LEGACY_LEVELS) as BlessingId[]) {
    const value = (raw as Record<string, unknown>)[id];
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) levels[id] = Math.min(value, LEGACY_LEVELS[id]);
  }
  return levels;
}
