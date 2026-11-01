import { SeededRng } from '../../core/rng';
import type { BossDefinition } from '../boss/boss-definition';
import { LIEUTENANTS } from './lieutenants';
import { VEIN_LIEUTENANTS } from './vein-lieutenants';
import type { VeinId } from '../minions/minion-catalog';
import type { BestiaryEntry } from './room-bestiary';
import { VEIN_BESTIARY, VEIN_LABELS, ROOM_BESTIARY } from './room-bestiary';
import type { RoomKind } from './rooms';

/*
 * Le vene della discesa (fase 7 dello studio sulla grafica, proposta da confermare con Jabbaz). Ogni discesa usa due
 * vene di servitori, una d'ingresso e una profonda, estratte dal seme fra quelle sbloccate: prima del luogotenente
 * la d'ingresso, dal luogotenente in poi la profonda. La tappa prima del luogotenente ospita un tipo della profonda,
 * quella dopo l'Assedio un tipo d'ingresso. A volte uno Scontro e' tutto della terza vena (l'Incursione).
 */

export const VEIN_RULES = {
  /** Probabilita' che uno Scontro dalla terza tappa sia un'Incursione della terza vena. */
  incursionChance: 0.03,
  /** Prima tappa (da 0) in cui puo' capitare un'Incursione. */
  incursionFrom: 2,
  /** Tappa raggiunta (da 1) che apre la vena B: quella del luogotenente. */
  veinBStage: 4,
} as const;

/** Le vene di una discesa: d'ingresso, profonda e la terza (per l'Incursione; null se non ce n'e' una). */
export interface VeinPlan {
  readonly entrance: VeinId;
  readonly deep: VeinId;
  readonly third: VeinId | null;
}

/** La vena di una stanza: la sua, un eventuale tipo ospite di un'altra e se e' un'Incursione. */
export interface RoomVeins {
  readonly vein: VeinId;
  readonly guest?: VeinId;
  readonly incursion?: boolean;
}

const ALL_VEINS: readonly VeinId[] = ['a', 'b', 'c'];

/**
 * Le vene sbloccate in un dungeon dai record della discesa: la A sempre; la B arrivando al luogotenente; la C con la
 * prima vittoria. La prima discesa usa quindi solo la vena di sempre, con le tarature di oggi.
 */
export function unlockedVeins(record: { readonly clears: number; readonly furthestStage: number }): VeinId[] {
  const veins: VeinId[] = ['a'];
  if (record.furthestStage >= VEIN_RULES.veinBStage || record.clears > 0) veins.push('b');
  if (record.clears > 0) veins.push('c');
  return veins;
}

/** Le vene sbloccate per ogni dungeon di una discesa, dai record del personaggio (il capo gruppo, in cooperativa). */
export function veinUnlocks(
  character: { descentFor(dungeonId: string): { readonly clears: number; readonly furthestStage: number } },
  dungeonIds: readonly string[],
): Record<string, VeinId[]> {
  return Object.fromEntries(dungeonIds.map((id) => [id, unlockedVeins(character.descentFor(id))]));
}

/**
 * Le vene di una discesa dal seme. Con una sola vena sbloccata, ingresso e profonda coincidono e non c'e' Incursione.
 * `single` (Pellegrinaggio): una vena per dungeon.
 */
export function planVeins(seed: number, unlocked: readonly VeinId[], single = false): VeinPlan {
  const rng = new SeededRng((seed ^ 0x7e1a5) >>> 0);
  const pool = ALL_VEINS.filter((vein) => unlocked.includes(vein));
  if (pool.length === 0) return { entrance: 'a', deep: 'a', third: null };
  if (single || pool.length === 1) {
    const only = pool[Math.floor(rng.next() * pool.length)]!;
    return { entrance: only, deep: only, third: null };
  }
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  const entrance = shuffled[0]!;
  const deep = shuffled[1]!;
  const third = ALL_VEINS.find((vein) => vein !== entrance && vein !== deep) ?? null;
  return { entrance, deep, third };
}

/** La tappa del luogotenente nel piano (-1 se non c'e'). */
function lieutenantStage(stages: readonly { readonly options: readonly { readonly kind: RoomKind }[] }[]): number {
  return stages.findIndex((stage) => stage.options.some((option) => option.kind === 'lieutenant'));
}

/** La vena della tappa `stage` senza Incursioni (per la mappa e le porte). */
export function stageVein(plan: VeinPlan, stages: readonly { readonly options: readonly { readonly kind: RoomKind }[] }[], stage: number): VeinId {
  const lieutenant = lieutenantStage(stages);
  return lieutenant >= 0 && stage < lieutenant ? plan.entrance : plan.deep;
}

/** La vena di una stanza: la vena della tappa, gli ospiti e l'eventuale Incursione (estratta dal seme della stanza). */
export function roomVeins(
  plan: VeinPlan,
  stages: readonly { readonly options: readonly { readonly kind: RoomKind }[] }[],
  stage: number,
  kind: RoomKind,
  roomSeed: number,
): RoomVeins {
  const rules = VEIN_RULES;
  if (plan.third !== null && kind === 'combat' && stage >= rules.incursionFrom) {
    const roll = new SeededRng((roomSeed ^ 0x1c0ffee) >>> 0).next();
    if (roll < rules.incursionChance) return { vein: plan.third, incursion: true };
  }
  const vein = stageVein(plan, stages, stage);
  if (plan.entrance === plan.deep) return { vein };
  const lieutenant = lieutenantStage(stages);
  if (lieutenant >= 0 && stage === lieutenant - 1 && stage >= 2) return { vein, guest: plan.deep };
  if (lieutenant >= 0 && stage === lieutenant + 2) return { vein, guest: plan.entrance };
  return { vein };
}

/**
 * I servitori di una stanza: quelli della sua vena, piu' un tipo ospite (folla o minaccia, mai pesante o nido) se la
 * tappa ne ha uno. L'ospite si sceglie dal seme della stanza.
 */
export function veinBestiary(dungeonId: string, room: RoomVeins, roomSeed: number): readonly BestiaryEntry[] {
  const veins = VEIN_BESTIARY[dungeonId];
  const base = veins?.[room.vein] ?? ROOM_BESTIARY[dungeonId] ?? [];
  if (room.guest === undefined || veins === undefined) return base;
  const candidates = veins[room.guest].filter((item) => item.role === 'swarm' || item.role === 'threat');
  if (candidates.length === 0) return base;
  const guest = candidates[Math.floor(new SeededRng((roomSeed ^ 0x6e57) >>> 0).next() * candidates.length)]!;
  return base.some((item) => item.minion.id === guest.minion.id) ? base : [...base, guest];
}

/** Vero se la discesa usa vene diverse da quella di sempre (allora porte, pannello e mappa ne dicono il nome). */
export function showsVeins(plan: VeinPlan | undefined): boolean {
  return plan !== undefined && (plan.entrance !== plan.deep || plan.entrance !== 'a');
}

/**
 * Il luogotenente sta sulla cerniera fra le due vene e annuncia la profonda: con la vena A e' quello di sempre, con la
 * B o la C e' il luogotenente di quella vena (che in furia chiama la sua folla).
 */
export function veinLieutenant(dungeonId: string, deep: VeinId): BossDefinition {
  const classic = LIEUTENANTS[dungeonId]!;
  return deep === 'a' ? classic : VEIN_LIEUTENANTS[dungeonId]?.[deep] ?? classic;
}

/** Il nome di una vena del dungeon ("Catacombe"). */
export function veinName(dungeonId: string, vein: VeinId): string {
  return VEIN_LABELS[dungeonId]?.[vein]?.name ?? '';
}
