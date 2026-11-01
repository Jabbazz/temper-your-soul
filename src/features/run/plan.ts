import { SeededRng, type Rng } from '../../core/rng';
import type { DoorOption, TrialRule } from './rooms';

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

const TRIAL_RULES: readonly TrialRule[] = ['unscathed', 'timed'];

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
  stages.push({ options: [{ kind: 'threshold', reward: null }] });
  // Due direzioni di combattimento, senza ricompense intermedie.
  stages.push({ options: [{ kind: 'combat', reward: null }, { kind: 'combat', reward: null }] });
  if (!short) {
    // Tre porte: uno Scontro, una Prova (facoltativa, piu' dura) e un Reliquiario.
    const rule = TRIAL_RULES[Math.floor(rng.next() * TRIAL_RULES.length)]!;
    stages.push({
      options: shuffled(rng, [
        { kind: 'combat', reward: null },
        { kind: 'trial', reward: null, rule, hard: true },
        { kind: 'reliquary', reward: null },
      ]),
    });
  }
  stages.push({ options: [{ kind: 'lieutenant', reward: null }] });
  // Stanza tranquilla oppure Assedio: la progressione fra stanze verrà definita in seguito.
  stages.push({
    options: shuffled(rng, [
      { kind: 'sanctuary', reward: null },
      { kind: 'siege', reward: null, hard: true },
    ]),
  });
  if (!short) {
    stages.push({ options: shuffled(rng, [{ kind: 'combat', reward: null }, { kind: 'hunt', reward: null }]) });
    stages.push({ options: [{ kind: 'antechamber', reward: null }] });
  }
  stages.push({ options: [{ kind: 'boss', reward: null }] });
  return { dungeonId, seed, short, stages };
}
