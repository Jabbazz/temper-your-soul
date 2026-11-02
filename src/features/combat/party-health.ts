import type { BossDefinition } from '../boss/boss-definition';
export const PARTY_HEALTH = { perAdditionalMember: 0.5 } as const;
export function partyHealthMultiplier(players: number): number {return 1+PARTY_HEALTH.perAdditionalMember*Math.max(0,players-1);}
/** Dati di ingresso della partita, scalati una volta sola; la replica usa gli HP già autorevoli. */
export function bossForParty(definition: BossDefinition, players: number): BossDefinition {
  const factor=partyHealthMultiplier(players);
  return factor===1?definition:{...definition,stats:{...definition.stats,maxHealth:Math.round(definition.stats.maxHealth*factor)}};
}
