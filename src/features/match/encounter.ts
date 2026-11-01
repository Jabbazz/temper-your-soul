import type { MinionDefinition } from '../minions/minion-definition';
import type { Minion } from '../minions/minion';
import type { Match } from './match';

/**
 * L'obiettivo di una stanza della discesa, guidato dalla partita: ondate, insidie, porte e premi. Una partita senza
 * incontro e' il duello di sempre (si vince quando cade il boss). Con un incontro, la caduta del boss (il luogotenente)
 * libera la stanza e la partita prosegue finche' il gruppo non attraversa una porta.
 */
export interface Encounter {
  /** Chiamato una volta, quando la partita e' pronta. */
  attach(match: Match): void;
  /** Un passo dell'incontro, dopo i giocatori e il boss e prima di servitori, proiettili e zone. */
  step(dt: number, match: Match): void;
  /** Il boss della stanza (il luogotenente) e' caduto. */
  onBossDefeated(match: Match): void;
  /** Un servitore e' morto in combattimento (`exploded`: e' scoppiato a contatto, non l'hanno abbattuto). */
  onMinionKilled?(match: Match, minion: Minion, exploded: boolean): void;
  /** Vita di un servitore generato in questa stanza (nidi, divisioni); senza, quella dei dati. */
  minionHealth?(definition: MinionDefinition): number;
  /** Un giocatore e' andato a terra: vero se l'incontro lo rialza subito (Seconda vita). */
  onPlayerDown?(match: Match, playerId: string): boolean;
}
