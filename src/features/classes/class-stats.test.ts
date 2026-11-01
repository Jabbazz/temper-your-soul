import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { SeededRng } from '../../core/rng';
import { Character } from '../character/character';
import type { CharacterClass } from '../character/character-class';
import { Player } from '../player/player';
import { CRYPT } from '../dungeons/crypt';
import { Projectile } from '../combat/projectile';
import { Match } from '../match/match';
import { tryCastSkill } from '../skills/skill-effects';
import { DescentRun } from '../run/descent';
import { setupOf, snapshotOf, replicaMatch, applySnapshot } from '../network/protocol';
import { SnapshotEncoder, SnapshotDecoder } from '../network/snapshot-codec';
import { NetworkView } from '../presentation/network-view';
import { resolveCombatStats } from './class-stats';
import { describeSkillStats, resolveItemSkill } from '../items/item';
import { familyById } from '../items/item-families';
import { RARITIES } from '../items/rarity';

function member(kind: CharacterClass) {
  const character = Character.createStarter(kind);
  character.completeCreation(kind, 'male', kind);
  return { id: kind, characterClass: kind, loadout: character.loadout() };
}
const player = (kind: CharacterClass) => new Player(CRYPT.arena, member(kind).loadout, undefined, kind);

describe('ruoli di classe: prima taratura', () => {
  it('mantiene statistiche innate distinte anche senza equipaggiamento', () => {
    expect(resolveCombatStats('warrior', []).maxHealth).toBe(150);
    expect(resolveCombatStats('mage', []).maxMana).toBe(150);
    expect(resolveCombatStats('archer', []).moveSpeed).toBe(195);
  });

  it('applica il set Comune: guerriero 200 HP/40 difesa, mago 200 MP, arciere 212 u/s', () => {
    expect(player('warrior').health.max).toBe(200);
    expect(player('warrior').stats.armor).toBe(40);
    expect(player('mage').maxMana).toBe(200);
    expect(player('mage').health.max).toBe(95);
    expect(player('archer').stats.moveSpeed).toBe(212);
    expect(player('archer').stats.attackSpeed).toBeCloseTo(0.2);
    expect(player('mage').manaRegeneration).toBeGreaterThan(player('warrior').manaRegeneration);
  });

  it('la difesa riduce il danno effettivo, senza modificare la durata di invulnerabilità', () => {
    const tank = player('warrior');
    expect(tank.tryHurt(70)).toBe(true);
    expect(tank.health.current).toBeCloseTo(150);
    expect(tank.tryHurt(70)).toBe(false);
    expect(tank.health.current).toBeCloseTo(150);
  });

  it('bonus e tooltip migliorano con la rarità senza mutare la famiglia', () => {
    const family = familyById('forge_plate')!, before = structuredClone(family);
    const values = RARITIES.map(rarity => resolveItemSkill(family, rarity).equipmentStats!.armor!);
    [12, 14.4, 18, 24, 36].forEach((expected, index) => expect(values[index]).toBeCloseTo(expected));
    expect(describeSkillStats(resolveItemSkill(family, 'legendary'))).toContain('Difesa +36');
    expect(family).toEqual(before);
  });

  it('a mana zero guerriero e arciere attaccano; il mago attende il mana, poi lo spende', () => {
    for (const kind of ['warrior', 'archer', 'mage'] as const) {
      const match = new Match({ rng: new SeededRng(1), dungeon: CRYPT, ...member(kind) });
      match.player.mana = 0;
      match.step(0, { move: Vec2.ZERO, aimOffset: new Vec2(200, 0), skills: [true] });
      expect(match.player.skillBar.isReady(0), kind).toBe(kind === 'mage');
      if (kind === 'mage') {
        match.player.mana = 10;
        match.step(0, { move: Vec2.ZERO, aimOffset: new Vec2(200, 0), skills: [true] });
        expect(match.player.mana).toBe(8);
      } else expect(match.player.mana).toBe(0);
    }
  });

  it('la cadenza primaria e il movimento dell’arciere aumentano davvero nella simulazione', () => {
    const archer = player('archer'), base = member('archer').loadout[0]!;
    archer.skillBar.start(0);
    expect(archer.skillBar.cooldowns()[0]).toBeCloseTo(base.cooldown / 1.2);
    archer.moveBy(0.1, new Vec2(1, 0));
    expect(archer.position.x - CRYPT.arena.playerSpawn.x).toBeCloseTo(21.2);
  });

  it('il bonus del mago aumenta il danno generato, senza mutare la skill', () => {
    const mage = player('mage'), base = mage.baseLoadout[0]!;
    let damage = 0;
    expect(tryCastSkill(0, {
      player: mage, spawnProjectile: spec => { damage = spec.damage; },
      spawnZone: () => {}, strikeArc: () => {}, emit: () => {},
    })).toBe(true);
    if (base.effect.kind !== 'projectile') throw new Error('Atteso proiettile');
    expect(damage).toBeCloseTo(base.effect.projectile.damage * 1.07);
    expect(base.effect.projectile.damage).toBe(19);
  });

  it('report e evento registrano il danno ridotto dalla difesa', () => {
    const match = new Match({ rng: new SeededRng(1), dungeon: CRYPT, members: [member('warrior')], loadout: [] });
    let reported = 0;
    match.events.connect(event => { if (event.type === 'damage_dealt' && event.target === 'player') reported = event.amount; });
    match.projectiles.push(new Projectile(999, { team: 'enemy', damage: 70, speed: 0, radius: 5, lifetime: 2, visual: 'arcane_bolt' }, match.player.position, 0));
    match.step(0, { move: Vec2.ZERO, aimOffset: Vec2.ZERO, skills: [] });
    expect(reported).toBeCloseTo(50);
    expect(match.report.get('warrior')!.damageReceived).toBeCloseTo(50);
  });

  it('la discesa parte con HP e MP corretti per tutte le classi', () => {
    const run = new DescentRun({ dungeonId: 'crypt', seed: 1, mode: 'descent', members: [member('warrior'), member('mage'), member('archer')] });
    expect(run.players.get('warrior')!.maxHealth).toBe(200);
    expect(run.match.players.get('mage')!.mana).toBe(200);
    expect(run.match.players.get('archer')!.stats.moveSpeed).toBe(212);
    run.match.players.get('mage')!.mana = 137;
    run.match.players.get('warrior')!.health.current = 123;
    run.match.status = 'won';
    expect(run.advance()).toBe(true);
    expect(run.match.players.get('mage')!.mana).toBe(137);
    expect(run.match.players.get('mage')!.maxMana).toBe(200);
    expect(run.match.players.get('warrior')!.health.current).toBe(123);
    expect(run.match.players.get('warrior')!.health.max).toBe(200);
  });

  it('codec, replica e interpolazione conservano classi, massimi e cadenza senza duplicare i bonus', () => {
    const members = [member('warrior'), member('mage'), member('archer')];
    const match = new Match({ rng: new SeededRng(1), dungeon: CRYPT, members, loadout: [] });
    const snapshot = snapshotOf(match, 'test', [], {});
    const decoded = new SnapshotDecoder().decode(new SnapshotEncoder().encode(snapshot));
    const replica = replicaMatch(CRYPT, setupOf(match), members);
    applySnapshot(replica, decoded);
    const view = new NetworkView(replica);
    view.accept(decoded, 0);
    for (const [id, original] of match.players) {
      expect(replica.players.get(id)!.stats).toEqual(original.stats);
      expect(view.match.players.get(id)!.stats).toEqual(original.stats);
      expect(view.match.players.get(id)!.skillBar.skills).toEqual(original.skillBar.skills);
      expect(view.match.players.get(id)!.maxMana).toBe(original.maxMana);
    }
  });
});
