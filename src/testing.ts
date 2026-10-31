import { SeededRng, type Rng } from './core/rng';
import { Vec2 } from './core/vec2';
import { Boss } from './features/boss/boss';
import type { BossContext } from './features/boss/boss-context';
import type { BossDefinition } from './features/boss/boss-definition';
import { GUARDIAN } from './features/boss/guardian';
import type { DangerZoneSpec } from './features/combat/danger-zone';
import type { GameEvent } from './features/combat/events';
import type { ProjectileSpec } from './features/combat/projectile';
import { CRYPT, CRYPT_ARENA } from './features/dungeons/crypt';
import type { DungeonDefinition } from './features/dungeons/dungeon-definition';
import { Match, type PlayerIntent } from './features/match/match';
import { MAGE_SKILLS } from './features/skills/mage-skills';
import type { Loadout } from './features/skills/skill-definition';

/** Passo fisso della simulazione, come in `game.ts`. */
export const STEP = 1 / 60;

/** Partita di prova: per impostazione la cripta con le skill base del mago, come nel prototipo. */
export function createMatch(
  seed = 1,
  options: { dungeon?: DungeonDefinition; loadout?: Loadout } = {},
): Match {
  return new Match({ rng: new SeededRng(seed), dungeon: options.dungeon ?? CRYPT, loadout: options.loadout ?? MAGE_SKILLS });
}

/** Un boss della cripta (il guardiano) o quello indicato, nell'arena della cripta. */
export function createBoss(definition: BossDefinition = GUARDIAN): Boss {
  return new Boss(definition, CRYPT_ARENA);
}

/** Partita con il boss "spento": non lancia attacchi (si muove comunque). */
export function createQuietMatch(seed = 1, options: { dungeon?: DungeonDefinition; loadout?: Loadout } = {}): Match {
  const match = createMatch(seed, options);
  match.boss.attackTimer = Number.POSITIVE_INFINITY;
  return match;
}

/** Come `PlayerIntent`, ma la mira si puo' dare come punto del mondo (`aim`): viene convertita in offset dal giocatore. */
export type IntentOverrides = Partial<PlayerIntent> & { aim?: Vec2 };

/** Intenzione del giocatore: ferma, mira a destra di se', nessuna skill. `overrides` cambia cio' che serve. */
export function intent(match: Match, overrides: IntentOverrides = {}): PlayerIntent {
  const { aim, ...rest } = overrides;
  const target = aim ?? match.player.position.add(new Vec2(100, 0));
  return {
    move: Vec2.ZERO,
    aimOffset: target.sub(match.player.position),
    skills: [false, false, false, false],
    ...rest,
  };
}

/** Intenzione con le skill indicate (per indice di slot) tenute premute. */
export function holding(match: Match, slots: readonly number[], overrides: IntentOverrides = {}): PlayerIntent {
  return intent(match, { skills: [0, 1, 2, 3].map((slot) => slots.includes(slot)), ...overrides });
}

/** Fa avanzare la partita di `seconds` secondi a passo fisso, con l'intenzione prodotta da `make` a ogni passo. */
export function run(match: Match, seconds: number, make: (match: Match) => PlayerIntent = (m) => intent(m)): void {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) match.step(STEP, make(match));
}

/** Registra tutti gli eventi che la partita emette da questo momento. */
export function recordEvents(match: Match): GameEvent[] {
  const events: GameEvent[] = [];
  match.events.connect((event) => events.push(event));
  return events;
}

/** Filtra gli eventi per tipo, con il tipo restringimento giusto. */
export function eventsOfType<T extends GameEvent['type']>(events: readonly GameEvent[], type: T): Array<Extract<GameEvent, { type: T }>> {
  return events.filter((event): event is Extract<GameEvent, { type: T }> => event.type === type);
}

export interface SpawnedProjectile {
  spec: ProjectileSpec;
  position: Vec2;
  angle: number;
}

export interface SpawnedZone {
  spec: DangerZoneSpec;
  position: Vec2;
}

/** Contesto del boss che registra cio' che il boss fa, per provarlo senza una partita intera. */
export function createBossHarness(target: Vec2 = CRYPT_ARENA.playerSpawn, rng: Rng = new SeededRng(1)) {
  const projectiles: SpawnedProjectile[] = [];
  const zones: SpawnedZone[] = [];
  const events: GameEvent[] = [];
  const hurts: number[] = [];
  const ctx = {
    target,
    time: 0,
    rng,
    spawnProjectile: (spec: ProjectileSpec, position: Vec2, angle: number) => projectiles.push({ spec, position, angle }),
    spawnZone: (spec: DangerZoneSpec, position: Vec2) => zones.push({ spec, position }),
    hurtPlayer: (amount: number) => hurts.push(amount),
    emit: (event: GameEvent) => events.push(event),
  } satisfies BossContext;
  return { ctx, projectiles, zones, events, hurts };
}
