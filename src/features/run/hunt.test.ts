import { expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { Character } from '../character/character';
import { dungeonById } from '../dungeons/dungeons';
import { Match } from '../match/match';
import { Minion } from '../minions/minion';
import { ROOT_WORM } from '../minions/catalog/swamp';
import { GARGOYLE } from '../minions/catalog/crypt';
import { RoomEncounter } from './encounter';
import { ROOM_TEMPLATES, roomArena } from './room-templates';

it('le prede iniziano esposte, anche se il tipo ordinario nasce sottoterra o addormentato', () => {
  for (const definition of [ROOT_WORM, GARGOYLE]) {
    const prey = new Minion(1, definition, new Vec2(500, 500), { prey: true });
    expect(prey.state, definition.id).toBe('idle');
    expect(prey.isHidden, definition.id).toBe(false);
  }
  expect(new Minion(2, ROOT_WORM, new Vec2(500, 500)).state).toBe('burrowed');
  expect(new Minion(3, GARGOYLE, new Vec2(500, 500)).state).toBe('dormant');
});

it('la Caccia della palude evoca i due funghetti ma la preda resta colpibile e il Guerriero può abbatterla', () => {
  const character = Character.createStarter('warrior'); character.completeCreation('Cacciatore', 'male', 'warrior');
  const loadout = character.loadout(), dungeon = dungeonById('swamp')!;
  const template = ROOM_TEMPLATES.swamp!.find(entry => entry.use === 'combat')!;
  const encounter = new RoomEncounter({ dungeonId: 'swamp', option: { kind: 'hunt', reward: null }, stage: 5,
    template, exits: 2, members: new Map([['local', { loadout, tempers: [], offers: 0, secondLife: false }]]), grade: 0, seen: new Set() });
  const match = new Match({ dungeon, loadout, characterClass: 'warrior', rng: { next: () => 0.99 },
    arena: { ...roomArena(template, dungeon.arena.theme), pillars: [] }, boss: null, encounter });
  const prey = encounter.prey!;
  expect(prey.definition.id).toBe('root_worm');
  expect(prey.isHidden).toBe(false);
  // La preda conserva evocazione e fuga, ma non il ciclo sotterraneo del verme ordinario.
  for (let i = 0; i < 80; i++) {
    match.player.invulnerableFor = 2;
    match.step(1 / 60, { move: Vec2.ZERO, aimOffset: Vec2.ZERO, skills: [] });
  }
  const children = match.minions.filter(minion => minion.parentId === prey.id);
  expect(children).toHaveLength(2);
  expect(children.every(minion => minion.definition.id === 'sporeling')).toBe(true);
  expect(prey.isHidden).toBe(false);
  match.player.position = prey.position.add(new Vec2(25, 0));
  const initialHealth = prey.health.current;
  match.step(1 / 60, { move: Vec2.ZERO, aimOffset: prey.position.sub(match.player.position), skills: [true] });
  expect(prey.health.current).toBeLessThan(initialHealth);
  // Inseguimento con movimento e primaria reali: niente azzeramento diretto degli HP della preda.
  for (let i = 0; i < 120 * 60 && !encounter.cleared; i++) {
    match.player.invulnerableFor = 2;
    const offset = prey.position.sub(match.player.position);
    match.step(1 / 60, { move: offset.length() > 60 ? offset.normalized() : Vec2.ZERO, aimOffset: offset, skills: [true] });
  }
  expect(prey.health.isDead, JSON.stringify({ health: prey.health.current, max: prey.health.max, state: prey.state, status: match.status, prey: prey.position, player: match.player.position, time: match.time })).toBe(true);
  expect(encounter.cleared).toBe(true);
  expect(match.minions).toHaveLength(0);
});
