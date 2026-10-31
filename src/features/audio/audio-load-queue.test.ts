import { expect, it, vi } from 'vitest';
import { AudioLoadQueue } from './audio-load-queue';

it('decodifica al massimo due effetti insieme e prosegue dopo un errore', async () => {
  const queue = new AudioLoadQueue(2), running: number[] = [], release: (() => void)[] = [];
  for (let i = 0; i < 5; i++) queue.add(async () => {
    running.push(i);
    await new Promise<void>((resolve, reject) => release.push(i === 1 ? () => reject(new Error('File non leggibile')) : resolve));
  });
  await vi.waitFor(() => expect(running).toEqual([0, 1]));
  release[0](); await vi.waitFor(() => expect(running).toEqual([0, 1, 2]));
  release[1](); await vi.waitFor(() => expect(running).toEqual([0, 1, 2, 3]));
  release[2](); await vi.waitFor(() => expect(running).toEqual([0, 1, 2, 3, 4]));
  release[3](); release[4]();
});
