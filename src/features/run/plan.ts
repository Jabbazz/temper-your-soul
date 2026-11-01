import { SeededRng, type Rng } from '../../core/rng';
import type { DoorOption, RewardKind, TrialRule } from './rooms';

/*
 * Il piano della discesa: per ogni tappa le porte fra cui scegliere. Generato dal seme: stesso seme, stessa discesa.
 * Discesa completa (8 tappe): Soglia, 2 porte, 3 porte, Luogotenente, Santuario o Assedio, Scontro o Caccia,
 * Anticamera, Boss. Discesa breve del Pellegrinaggio (5 tappe): Soglia, 2 porte, Luogotenente, Santuario o Assedio, Boss.
 */

export interface StagePlan {
  readonly options: readonly DoorOption[];
}

export interface DescentPlan {
  readonly dungeonId: string;
  readonly seed: number;
  readonly short: boolean;
  readonly stages: readonly StagePlan[];
}

/** Premi delle porte di combattimento. */
const COMBAT_REWARDS: readonly RewardKind[] = ['temper', 'embers', 'heal'];
const TRIAL_RULES: readonly TrialRule[] = ['unscathed', 'timed'];

/** Premi diversi fra loro, presi da `pool` (il primo e' sempre una tempra, se `withTemper`). */
function distinctRewards(rng: Rng, pool: readonly RewardKind[], count: number, withTemper: boolean): RewardKind[] {
  const rest = pool.filter((reward) => !withTemper || reward !== 'temper');
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  const rewards = withTemper ? ['temper' as const, ...rest] : rest;
  return rewards.slice(0, count);
}

const shuffled = <T>(rng: Rng, items: T[]): T[] => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
};

export function planDescent(dungeonId: string, seed: number, options: { readonly short?: boolean } = {}): DescentPlan {
  const rng = new SeededRng(seed ^ 0x5eed);
  const short = options.short === true;
  const stages: StagePlan[] = [];
  stages.push({ options: [{ kind: 'threshold', reward: 'embers' }] });
  // Due porte di combattimento con premi diversi, una delle due con la tempra.
  stages.push({ options: shuffled(rng, distinctRewards(rng, COMBAT_REWARDS, 2, true).map((reward) => ({ kind: 'combat' as const, reward }))) });
  if (!short) {
    // Tre porte: uno Scontro, una Prova (facoltativa, piu' dura) e un Reliquiario.
    const [combatReward, trialReward] = distinctRewards(rng, ['temper', 'embers', 'heal'], 2, rng.next() < 0.5);
    const rule = TRIAL_RULES[Math.floor(rng.next() * TRIAL_RULES.length)]!;
    stages.push({
      options: shuffled(rng, [
        { kind: 'combat', reward: combatReward! },
        { kind: 'trial', reward: trialReward === 'heal' ? 'temper' : trialReward!, rule, hard: true },
        { kind: 'reliquary', reward: 'embers' },
      ]),
    });
  }
  stages.push({ options: [{ kind: 'lieutenant', reward: 'temper' }] });
  // Respiro o rischio: il Santuario, o l'Assedio con il premio pieno.
  stages.push({
    options: shuffled(rng, [
      { kind: 'sanctuary', reward: null },
      { kind: 'siege', reward: rng.next() < 0.5 ? 'temper' : 'embers', hard: true },
    ]),
  });
  if (!short) {
    const reward = distinctRewards(rng, ['temper', 'heal', 'embers'], 1, false)[0]!;
    stages.push({ options: shuffled(rng, [{ kind: 'combat', reward }, { kind: 'hunt', reward: 'seal' }]) });
    stages.push({ options: [{ kind: 'antechamber', reward: 'heal' }] });
  }
  stages.push({ options: [{ kind: 'boss', reward: null }] });
  return { dungeonId, seed, short, stages };
}
