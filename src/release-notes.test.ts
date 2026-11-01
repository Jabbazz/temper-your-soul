import { expect, it } from 'vitest';
import { version } from '../package.json';
import lock from '../package-lock.json';
import { RELEASES, CURRENT_RELEASE, GAME_VERSION_LABEL, describeBalanceChange } from './release-notes';

it('mantiene coerenti versione installata, lockfile e note correnti senza perdere lo storico', () => {
  expect(CURRENT_RELEASE.version).toBe(version);
  expect(lock.version).toBe(version);
  expect(lock.packages[''].version).toBe(version);
  expect(GAME_VERSION_LABEL).toMatch(/^v\d+\.\d{2,}\.\d{2,}$/);
  expect(new Set(RELEASES.map(release => release.version)).size).toBe(RELEASES.length);
  for (const release of RELEASES) {
    expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(release.changes.length).toBeGreaterThan(0);
    expect(release.changes.every(text => text.trim().length > 0)).toBe(true);
    for (const change of release.balanceChanges) {
      expect(Number.isFinite(change.before) && Number.isFinite(change.after)).toBe(true);
      expect(change.before).not.toBe(change.after);
    }
  }
});

it('mostra i valori di bilanciamento prima e dopo con la relativa unità', () => {
  expect(describeBalanceChange({ label: 'Dardo · danno comune', before: 10, after: 12, unit: 'danni' }))
    .toBe('Dardo · danno comune: 10 → 12 danni');
});
