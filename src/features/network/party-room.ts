import { SeededRng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import { moveBody } from '../arena/arena';
import { deserializeCharacter, serializeCharacter } from '../character/save-format';
import type { Character } from '../character/character';
import type { GameEvent } from '../combat/events';
import { dungeonById } from '../dungeons/dungeons';
import { canEnterDungeon, minimumDungeonGearScore } from '../dungeons/dungeon-access';
import { lootTableFor } from '../loot/loot-tables';
import { rollLoot } from '../loot/roll-loot';
import type { ItemRoll } from '../items/item';
import { Match, type PlayerIntent } from '../match/match';
import { NETWORK, snapshotOf, type PartyState, type BattleSnapshot } from './protocol';

/** Regole della lobby testabili senza socket. Il server assegna identità e orologio. */
export class PartyRoom {
  readonly characters = new Map<string, Character>();
  readonly ready = new Set<string>();
  readonly inputs = new Map<string, { intent: PlayerIntent; receivedAt: number }>();
  leaderId = '';
  dungeonId = 'crypt';
  match: Match | null = null;
  battleId = '';
  private events: GameEvent[] = [];
  private rewards: Record<string, ItemRoll[]> = {};
  private rewarded = false;
  constructor(readonly code: string) {}

  get playing(): boolean { return this.match?.status === 'playing'; }
  enter(id: string, raw: string): void {
    if (this.playing) throw new Error('Il party è già in dungeon. Attendi la fine della partita.');
    if (this.characters.size >= NETWORK.capacity) throw new Error('Il party è completo.');
    const character = deserializeCharacter(raw);
    if (!character?.created) throw new Error('Crea prima un personaggio.');
    this.characters.set(id, character);
    if (!this.leaderId) this.leaderId = id;
  }
  leave(id: string): void {
    this.characters.delete(id); this.ready.delete(id); this.inputs.delete(id);
    const player = this.match?.players.get(id);
    if (player && this.playing) player.health.current = 0;
    if (this.leaderId === id) this.leaderId = this.characters.keys().next().value ?? '';
  }
  choose(id: string, dungeonId: string): void {
    this.requireLeader(id);
    if (this.playing) throw new Error('La partita è già iniziata.');
    if (!dungeonById(dungeonId)) throw new Error('Dungeon non valido.');
    this.dungeonId = dungeonId; this.ready.clear();
  }
  start(id: string, battleId: string, seed: number): void {
    this.requireLeader(id);
    if (this.playing) throw new Error('La partita è già iniziata.');
    if ([...this.characters.keys()].some(key => !this.ready.has(key))) throw new Error('Tutti i membri devono essere pronti.');
    const dungeon = dungeonById(this.dungeonId)!;
    for (const character of this.characters.values()) {
      if (!canEnterDungeon(dungeon, character.gearScore)) throw new Error(`${character.name}: servono ${minimumDungeonGearScore(dungeon)} GS.`);
    }
    const members = [...this.characters].map(([key, character]) => ({ id: key, loadout: character.loadout() }));
    this.match = new Match({ rng: new SeededRng(seed), dungeon, loadout: members[0].loadout, members });
    let index = 0;
    for (const player of this.match.players.values()) {
      const offset = new Vec2((index % 2) * 48 - 24, Math.floor(index / 2) * 48);
      player.position = moveBody(dungeon.arena, player.position, player.position.add(offset), 10, dungeon.arena.playerMargin);
      player.aim = player.position; index++;
    }
    this.battleId = battleId; this.events = []; this.rewards = {}; this.rewarded = false; this.inputs.clear();
    this.match.events.connect(event => this.events.push(event));
  }
  tick(now: number): void {
    if (!this.match || !this.playing) return;
    const intents = new Map<string, PlayerIntent>();
    for (const [id, input] of this.inputs) if (now - input.receivedAt <= NETWORK.staleInputMs) intents.set(id, input.intent);
    this.match.stepParty(NETWORK.step, intents);
    if (!this.playing && !this.rewarded) {
      this.rewarded = true; this.ready.clear();
      if (this.match.status === 'won') for (const id of this.characters.keys()) this.rewards[id] = rollLoot(lootTableFor(this.dungeonId), this.match.rng);
    }
  }
  snapshot(): BattleSnapshot | null {
    if (!this.match) return null;
    const state = snapshotOf(this.match, this.battleId, this.events, this.rewards); this.events = []; return state;
  }
  state(): PartyState {
    return { code: this.code, leaderId: this.leaderId, dungeonId: this.dungeonId, playing: this.playing,
      members: [...this.characters].map(([id, c]) => ({ id, character: serializeCharacter(c), name: c.name!, appearance: c.appearance(), gearScore: c.gearScore, ready: this.ready.has(id) })) };
  }
  private requireLeader(id: string): void { if (id !== this.leaderId) throw new Error('Solo il leader può scegliere e avviare il dungeon.'); }
}
