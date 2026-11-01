import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import type { RunView } from '../run/descent';
import type { RoomView } from '../run/encounter';
import { planDescent } from '../run/plan';
import { descentMapNodes } from './descent-map';
import { densityCells, minimapLayout, minimapStatus, MINIMAP } from './room-minimap';

const room = (overrides: Partial<RoomView>): RoomView => ({
  kind: 'combat', reward: 'embers', cleared: false, wave: 1, waves: 3, countdown: null, trialFailed: false,
  doors: [], doorsOpen: false, pickups: [], offers: {}, pacts: [], preyId: null, ...overrides,
});

const minion = (x: number, y: number, extra: Record<string, unknown> = {}) => ({
  id: 1, position: new Vec2(x, y), isDead: false, isHidden: false, hostile: true,
  definition: { behavior: 'chaser' }, health: { fraction: 0.5 }, elite: null, ...extra,
});

describe('minimappa della stanza', () => {
  it('la stanza entra intera nel riquadro, centrata, con il margine', () => {
    const layout = minimapLayout({ width: 2400, height: 1500 }, 240, 150);
    expect(layout.scale).toBeCloseTo(Math.min(232 / 2400, 142 / 1500));
    expect(layout.offsetX + 2400 * layout.scale).toBeLessThanOrEqual(240 - 3.9);
    expect(layout.offsetY).toBeGreaterThanOrEqual(3.9);
    const small = minimapLayout({ width: 1600, height: 1000 }, 120, 76);
    expect(small.offsetX).toBeGreaterThanOrEqual(3.9);
    expect(small.offsetY + 1000 * small.scale).toBeLessThanOrEqual(76 - 3.9);
  });

  it('i servitori vivi e visibili si contano per cella; morti, nascosti e alleati no', () => {
    const layout = minimapLayout({ width: 1600, height: 1000 }, 240, 150);
    const cells = densityCells([
      minion(100, 100), minion(110, 105), minion(900, 500),
      minion(100, 100, { isDead: true }), minion(100, 100, { isHidden: true }), minion(100, 100, { hostile: false }),
    ] as never, layout, MINIMAP.cell);
    expect([...cells.values()].sort()).toEqual([1, 2]);
  });

  it('la riga di stato dice la stanza e a che punto e\'', () => {
    const quiet = { boss: null, minions: [] } as never;
    expect(minimapStatus(room({ waves: 3, wave: 2 }), { boss: null, minions: [minion(1, 1), minion(2, 2)] } as never)).toBe('Scontro · ondata 2/3 · nemici 2');
    expect(minimapStatus(room({ cleared: true, doors: [{ x: 1, y: 1, progress: 0 }] }), quiet)).toBe('Scontro · libera, scegli una porta');
    expect(minimapStatus(room({ kind: 'siege', countdown: 41.5 }), { boss: null, minions: [minion(1, 1, { definition: { behavior: 'nest' } })] } as never)).toBe('Assedio · 0:41 · nidi 1');
    expect(minimapStatus(room({ kind: 'hunt', preyId: 1 }), { boss: null, minions: [minion(1, 1)] } as never)).toBe('Caccia · preda 50%');
    expect(minimapStatus(null, { boss: { health: { isDead: false, fraction: 0.62 } }, minions: [] } as never)).toBe('Boss · 62%');
    expect(minimapStatus(null, quiet)).toBe('');
  });
});

describe('mappa della discesa', () => {
  const plan = planDescent('crypt', 7);
  const runAt = (stage: number, chosen: (number | null)[]): Pick<RunView, 'plan' | 'stage'> => ({
    stage,
    plan: plan.stages.map((s, i) => ({ options: s.options, chosen: chosen[i] ?? null })),
  });

  it('all\'inizio: la Soglia e\' la stanza di adesso, la tappa dopo si vede, il resto e\' da scoprire tranne le tappe fisse', () => {
    const nodes = descentMapNodes(runAt(0, [0]));
    expect(nodes.filter((n) => n.stage === 0).map((n) => n.state)).toEqual(['current']);
    expect(nodes.filter((n) => n.stage === 1).every((n) => n.state === 'next' && n.option !== null)).toBe(true);
    const later = nodes.filter((n) => n.stage > 1);
    for (const node of later) {
      if (node.count === 1) expect(node.state).toBe('fixed');
      else expect([node.state, node.option]).toEqual(['unknown', null]);
    }
    expect(later.some((n) => n.option?.kind === 'boss')).toBe(true);
  });

  it('a meta\' discesa: il percorso fatto e\' pieno, le porte scartate restano visibili', () => {
    const nodes = descentMapNodes(runAt(2, [0, 1, 0]));
    const stage1 = nodes.filter((n) => n.stage === 1);
    expect(stage1.map((n) => n.state)).toEqual(['discarded', 'chosen']);
    expect(stage1.every((n) => n.option !== null)).toBe(true);
    expect(nodes.find((n) => n.stage === 2 && n.index === 0)!.state).toBe('current');
    expect(nodes.filter((n) => n.stage === 2 && n.index > 0).every((n) => n.state === 'discarded')).toBe(true);
    expect(nodes.filter((n) => n.stage === 3).every((n) => n.state === 'next')).toBe(true);
  });
});
