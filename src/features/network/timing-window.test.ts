import { expect, it } from 'vitest';
import { TimingWindow } from './timing-window';

it('mantiene solo la finestra più recente e ignora campioni non validi', () => {
  const timings = new TimingWindow(3);
  expect(timings.summary()).toEqual({ meanMs: 0, p95Ms: 0, maxMs: 0 });
  for (const ms of [100, 1, 2, 3, NaN, Infinity, -1]) timings.add(ms);
  expect(timings.summary()).toEqual({ meanMs: 2, p95Ms: 3, maxMs: 3 });
});
it('il percentile identifica le code lente senza confonderle con la media', () => {
  const timings = new TimingWindow(100);
  for (let i = 0; i < 95; i++) timings.add(1);
  for (let i = 0; i < 5; i++) timings.add(10);
  expect(timings.summary()).toEqual({ meanMs: 1.45, p95Ms: 1, maxMs: 10 });
});
