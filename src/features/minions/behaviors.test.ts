import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import { isOutsideProjectileBounds, pillarAt } from '../arena/arena';
import { Boss } from '../boss/boss';
import { DangerZone } from '../combat/danger-zone';
import { Projectile } from '../combat/projectile';
import { DUNGEONS, dungeonById } from '../dungeons/dungeons';
import { Match, MINION_LIMITS, type PlayerIntent } from '../match/match';
import { LIEUTENANTS } from '../run/lieutenants';
import { roomArena, ROOM_TEMPLATES } from '../run/room-templates';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { createBossHarness, eventsOfType, recordEvents, STEP } from '../../testing';
import { ELITES } from './elites';
import type { Minion } from './minion';
import { DUNGEON_MINIONS, MINIONS } from './minion-catalog';
import { minionTier } from './minion-definition';

const idle: PlayerIntent = { move: Vec2.ZERO, aimOffset: new Vec2(100, 0), skills: [false, false, false, false] };

/** Una stanza vuota del dungeon (senza regista): i servitori si mettono a mano. */
function emptyRoom(dungeonId = 'crypt', seed = 1): Match {
  const dungeon = dungeonById(dungeonId)!;
  const template = ROOM_TEMPLATES[dungeonId]!.find((room) => room.use === 'calm')!;
  return new Match({ rng: new SeededRng(seed), dungeon, loadout: MAGE_SKILLS, arena: roomArena(template, dungeon.arena.theme), boss: null });
}

const shot = (team: 'player' | 'enemy', damage: number, extra: object = {}) => ({ team, speed: 0, damage, radius: 4, lifetime: 1, visual: 'arcane_bolt', ...extra });

/** Colpisce il servitore con un proiettile del giocatore. */
function shoot(match: Match, minion: Minion, damage: number, extra: object = {}): void {
  match.projectiles.push(new Projectile(800_000 + match.projectiles.length + Math.round(match.time * 1000), shot('player', damage, extra), minion.position, 0));
  match.step(STEP, idle);
}

/** Colpisce il servitore con una zona del giocatore. */
function blast(match: Match, minion: Minion, damage: number): void {
  match.zones.push(new DangerZone(900_000 + Math.round(match.time * 1000), { team: 'player', damage, radius: 30, delay: 0 }, minion.position));
  match.step(STEP, idle);
}

function hold(match: Match, seconds: number): void {
  for (let i = 0; i < seconds * 60; i++) {
    for (const player of match.players.values()) {
      player.health.current = player.health.max;
      player.invulnerableFor = 1;
    }
    match.step(STEP, idle);
  }
}

describe('catalogo dei servitori', () => {
  it('trentadue servitori in quattro dungeon, id unici, prefisso del tema nell\'aspetto', () => {
    const all = Object.values(DUNGEON_MINIONS).flat();
    expect(all.length).toBe(33);
    expect(new Set(all.map((m) => m.id)).size).toBe(all.length);
    for (const [dungeon, list] of Object.entries(DUNGEON_MINIONS)) {
      for (const minion of list) expect(minion.visual.startsWith(`${dungeon}_`), minion.id).toBe(true);
    }
  });

  it('i riferimenti fra servitori esistono (nidi, divisioni) e le zone avvisano', () => {
    for (const minion of Object.values(MINIONS)) {
      if (minion.nest) expect(MINIONS[minion.nest.spawn], minion.id).toBeDefined();
      if (minion.onDeath?.kind === 'split') expect(MINIONS[minion.onDeath.into], minion.id).toBeDefined();
      for (const zone of [minion.lob?.zone, minion.burrow?.lash.zone, minion.trail?.zone, minion.charge?.trail, minion.onDeath?.kind === 'pool' ? minion.onDeath.zone : undefined]) {
        if (zone === undefined) continue;
        expect(zone.team, minion.id).toBe('enemy');
        expect(zone.delay, `${minion.id}: avviso`).toBeGreaterThanOrEqual(0.5);
        expect(zone.damage, minion.id).toBeLessThanOrEqual(15);
      }
      if (minion.leap) expect(minion.leap.windup + minion.leap.flight, minion.id).toBeGreaterThanOrEqual(0.5);
      if (minion.shot && minion.shot.windup !== undefined) expect(minion.shot.windup, minion.id).toBeGreaterThanOrEqual(0.4);
      if (minion.charge) expect(minion.charge.windup, minion.id).toBeGreaterThanOrEqual(0.4);
      if (minion.blink) expect(minion.blink.windup, minion.id).toBeGreaterThanOrEqual(0.4);
      expect(minion.contactDamage).toBeLessThanOrEqual(20);
    }
  });

  for (const dungeon of DUNGEONS) {
    it(`${dungeon.id}: ogni servitore vive 20 secondi senza stati invalidi, dentro la stanza e fuori dai pilastri`, () => {
      for (const definition of DUNGEON_MINIONS[dungeon.id]!) {
        const match = emptyRoom(dungeon.id, 3);
        match.player.position = new Vec2(match.arena.width / 2, match.arena.height - 200);
        match.spawnMinion(definition, new Vec2(match.arena.width / 2, 300));
        match.spawnMinion(definition, new Vec2(300, match.arena.height / 2), { elite: 'swift' });
        let invalid = 0;
        for (let i = 0; i < 60 * 20; i++) {
          match.player.health.current = 100;
          match.player.invulnerableFor = 1;
          match.player.position = new Vec2(match.arena.width / 2 + Math.sin(i / 50) * 300, match.arena.height - 220);
          match.step(STEP, idle);
          for (const minion of match.minions) {
            const { x, y } = minion.position;
            if (!Number.isFinite(x + y)) invalid++;
            if (x < match.arena.playerMargin - 0.5 || x > match.arena.width - match.arena.playerMargin + 0.5) invalid++;
            if (!minion.definition.flying && minion.state !== 'airborne' && !minion.isHidden && pillarAt(match.arena, minion.position, minion.hitRadius - 1) !== undefined) invalid++;
          }
          for (const projectile of match.projectiles) {
            if (!Number.isFinite(projectile.position.x + projectile.position.y)) invalid++;
            if (projectile.team === 'enemy' && projectile.damage > 15) invalid++;
          }
          for (const zone of match.zones) if (isOutsideProjectileBounds(match.arena, zone.position)) invalid++;
        }
        expect(invalid, definition.id).toBe(0);
        // Solo i kamikaze spariscono da soli (scoppiano sul giocatore).
        if (definition.behavior !== 'kamikaze') expect(match.minions.length, `${definition.id}: muore da solo?`).toBeGreaterThan(0);
      }
    });
  }
});

describe('comportamenti', () => {
  it('chi spara annuncia la raffica e rispetta i gettoni d\'attacco del gruppo', () => {
    const match = emptyRoom('crypt');
    const events = recordEvents(match);
    match.player.position = new Vec2(850, 1000);
    for (let i = 0; i < 10; i++) match.spawnMinion(MINIONS.censer_acolyte!, new Vec2(400 + i * 90, 400));
    let maxTokens = 0;
    for (let i = 0; i < 60 * 8; i++) {
      match.player.invulnerableFor = 1;
      match.player.health.current = 100;
      match.step(STEP, idle);
      maxTokens = Math.max(maxTokens, match.minions.filter((m) => m.hasToken).length);
    }
    expect(maxTokens).toBe(MINION_LIMITS.tokens + 1);
    const telegraphs = eventsOfType(events, 'minion_telegraph').filter((e) => e.action === 'shot');
    expect(telegraphs.length).toBeGreaterThan(3);
    expect(match.projectiles.some((p) => p.team === 'enemy')).toBe(true);
  });

  it('i proiettili dei servitori hanno un tetto', () => {
    const match = emptyRoom('crypt');
    match.player.position = new Vec2(850, 1100);
    for (let i = 0; i < 30; i++) match.spawnMinion(MINIONS.wax_candle!, new Vec2(200 + (i % 10) * 130, 300 + Math.floor(i / 10) * 150));
    let most = 0;
    for (let i = 0; i < 60 * 10; i++) {
      match.player.invulnerableFor = 1;
      match.player.health.current = 100;
      match.step(STEP, idle);
      most = Math.max(most, match.projectiles.filter((p) => p.team === 'enemy').length);
    }
    expect(most).toBeLessThanOrEqual(MINION_LIMITS.projectiles);
    expect(most).toBeGreaterThan(40);
  });

  it('la carica e\' annunciata con la linea, poi lo scatto ferisce di piu\' del contatto', () => {
    const match = emptyRoom('glacier');
    const events = recordEvents(match);
    match.player.position = new Vec2(900, 900);
    const ram = match.spawnMinion(MINIONS.ice_ram!, new Vec2(900, 600));
    for (let i = 0; i < 60 * 4 && ram.state !== 'dash'; i++) match.step(STEP, idle);
    const line = eventsOfType(events, 'minion_telegraph').find((e) => e.action === 'charge');
    expect(line?.to).toBeDefined();
    expect(line!.seconds).toBeGreaterThanOrEqual(0.4);
    expect(ram.state).toBe('dash');
    for (let i = 0; i < 60 && !eventsOfType(events, 'damage_dealt').some((e) => e.target === 'player'); i++) match.step(STEP, idle);
    const hit = eventsOfType(events, 'damage_dealt').find((e) => e.target === 'player');
    expect(hit?.amount).toBe(MINIONS.ice_ram!.charge!.damage);
  });

  it('lo scheletro abbattuto da un proiettile si rialza una volta; una zona lo finisce', () => {
    const match = emptyRoom('crypt');
    const events = recordEvents(match);
    match.player.position = new Vec2(200, 1100);
    const skeleton = match.spawnMinion(MINIONS.ossuary_skeleton!, new Vec2(900, 500), { maxHealth: 20 });
    shoot(match, skeleton, 50);
    expect(skeleton.state).toBe('reviving');
    expect(match.minions).toContain(skeleton);
    expect(eventsOfType(events, 'minion_defeated')[0]).toMatchObject({ revives: true });
    hold(match, 2);
    expect(skeleton.state).toBe('idle');
    expect(skeleton.health.current).toBe(10);
    shoot(match, skeleton, 50);
    hold(match, 0.1);
    expect(match.minions).not.toContain(skeleton);

    const other = match.spawnMinion(MINIONS.ossuary_skeleton!, new Vec2(900, 500), { maxHealth: 20 });
    blast(match, other, 50);
    hold(match, 0.1);
    expect(match.minions).not.toContain(other);
  });

  it('la colata si divide in gocce, ma non se e\' rallentata dal gelo', () => {
    const match = emptyRoom('forge');
    match.player.position = new Vec2(200, 1100);
    const slag = match.spawnMinion(MINIONS.molten_slag!, new Vec2(900, 500), { maxHealth: 10 });
    blast(match, slag, 50);
    expect(match.minions.filter((m) => m.definition.id === 'molten_droplet')).toHaveLength(3);
    const cold = emptyRoom('forge');
    cold.player.position = new Vec2(200, 1100);
    const frozen = cold.spawnMinion(MINIONS.molten_slag!, new Vec2(900, 500), { maxHealth: 10 });
    frozen.slowFor = 2;
    blast(cold, frozen, 50);
    expect(cold.minions.filter((m) => m.definition.id === 'molten_droplet')).toHaveLength(0);
  });

  it('lo scavatore sotto terra non si colpisce; emerge annunciato e frusta in linea', () => {
    const match = emptyRoom('swamp');
    const events = recordEvents(match);
    match.player.position = new Vec2(900, 1000);
    const worm = match.spawnMinion(MINIONS.root_worm!, new Vec2(900, 400));
    expect(worm.state).toBe('burrowed');
    shoot(match, worm, 30);
    expect(worm.health.current).toBe(worm.health.max);
    for (let i = 0; i < 60 * 8 && worm.state !== 'exposed'; i++) {
      match.player.invulnerableFor = 1;
      match.step(STEP, idle);
    }
    expect(eventsOfType(events, 'minion_telegraph').some((e) => e.action === 'emerge')).toBe(true);
    expect(worm.state).toBe('exposed');
    expect(match.zones.filter((z) => z.spec.visual === 'swamp_root')).toHaveLength(MINIONS.root_worm!.burrow!.lash.count);
  });

  it('il doccione dorme finche\' non ci si avvicina o non lo si colpisce', () => {
    const match = emptyRoom('crypt');
    const events = recordEvents(match);
    match.player.position = new Vec2(200, 1100);
    const gargoyle = match.spawnMinion(MINIONS.gargoyle!, new Vec2(1300, 400));
    hold(match, 1);
    expect(gargoyle.state).toBe('dormant');
    expect(gargoyle.position).toEqual(new Vec2(1300, 400));
    shoot(match, gargoyle, 1);
    expect(gargoyle.state).not.toBe('dormant');
    expect(eventsOfType(events, 'minion_woke')).toHaveLength(1);
  });

  it('il nido genera servitori fino al massimo; il sostegno copre i vicini di scudi', () => {
    const match = emptyRoom('crypt');
    match.player.position = new Vec2(200, 1100);
    const nest = match.spawnMinion(MINIONS.bone_reliquary!, new Vec2(900, 400));
    hold(match, 20);
    const children = match.minions.filter((m) => m.parentId === nest.id);
    expect(children.length).toBeGreaterThan(0);
    expect(children.length).toBeLessThanOrEqual(MINIONS.bone_reliquary!.nest!.maxChildren);

    const ice = emptyRoom('glacier');
    ice.player.position = new Vec2(200, 1100);
    const crystal = ice.spawnMinion(MINIONS.echo_crystal!, new Vec2(900, 400));
    const block = ice.spawnMinion(MINIONS.living_ice!, new Vec2(960, 420));
    hold(ice, 4);
    expect(block.shield).toBeGreaterThan(0);
    const before = block.health.current;
    shoot(ice, block, 10);
    expect(block.health.current).toBe(before);
    expect(crystal.isDead).toBe(false);
  });

  it('l\'elite Schermato ferma i proiettili finche\' una zona non rompe lo scudo', () => {
    const match = emptyRoom('crypt');
    match.player.position = new Vec2(200, 1100);
    const acolyte = match.spawnMinion(MINIONS.censer_acolyte!, new Vec2(900, 400), { elite: 'shielded', maxHealth: 40 });
    expect(acolyte.health.max).toBe(100);
    shoot(match, acolyte, 30);
    expect(acolyte.health.current).toBe(100);
    blast(match, acolyte, 30);
    expect(acolyte.warded).toBe(false);
    expect(acolyte.health.current).toBe(70);
    shoot(match, acolyte, 30);
    expect(acolyte.health.current).toBe(40);
  });

  it('elite: Gemello rinasce una volta, Marcio lascia la nube, Gelido rallenta', () => {
    expect(ELITES.robust.healthMultiplier).toBe(4);
    const match = emptyRoom('swamp');
    match.player.position = new Vec2(200, 1100);
    const twin = match.spawnMinion(MINIONS.bog_toad!, new Vec2(900, 400), { elite: 'twin', maxHealth: 10 });
    blast(match, twin, 999);
    expect(match.minions.filter((m) => m.definition.id === 'bog_toad' && m.elite === null)).toHaveLength(1);
    const rotten = match.spawnMinion(MINIONS.bog_toad!, new Vec2(1200, 400), { elite: 'rotten', maxHealth: 10 });
    blast(match, rotten, 999);
    expect(match.zones.some((z) => z.spec.visual === 'swamp_puff')).toBe(true);

    const ice = emptyRoom('glacier');
    ice.player.position = new Vec2(900, 1000);
    const wolf = ice.spawnMinion(MINIONS.snow_wolf!, new Vec2(900, 990), { elite: 'frozen' });
    wolf.age = 5;
    ice.step(STEP, idle);
    expect(ice.player.slowFor).toBeGreaterThan(0);
  });

  it('la melma della lumaca rallenta il giocatore; le nubi delle vesce feriscono anche i servitori', () => {
    const match = emptyRoom('swamp');
    match.player.position = new Vec2(900, 900);
    match.zones.push(new DangerZone(1, { team: 'enemy', radius: 30, delay: 0, damage: 3, slowSeconds: 1.2 }, match.player.position));
    match.step(STEP, idle);
    expect(match.player.slowFor).toBeGreaterThan(1);
    const sporeling = match.spawnMinion(MINIONS.sporeling!, new Vec2(400, 400), { maxHealth: 20 });
    match.zones.push(new DangerZone(2, { team: 'enemy', radius: 30, delay: 0, damage: 7, hurtsMinions: true }, sporeling.position));
    match.step(STEP, idle);
    expect(sporeling.health.current).toBe(13);
    expect(match.report.get('local')!.damageDealt).toBe(0);
  });

  it('i servitori non si ammucchiano in un punto', () => {
    const match = emptyRoom('crypt');
    match.player.position = new Vec2(900, 1100);
    for (let i = 0; i < 12; i++) match.spawnMinion(MINIONS.ossuary_skeleton!, new Vec2(900 + (i % 3), 400 + (i % 2)));
    hold(match, 3);
    const positions = match.minions.map((m) => m.position);
    let overlapping = 0;
    for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) if (positions[i]!.distanceTo(positions[j]!) < 6) overlapping++;
    expect(overlapping).toBe(0);
  });

  it('ogni servitore ha un ruolo per il regista', () => {
    for (const minion of Object.values(MINIONS)) expect(['swarm', 'base', 'heavy', 'nest', 'support']).toContain(minionTier(minion));
  });
});

describe.each(Object.entries(LIEUTENANTS))('luogotenente %s', (dungeonId, lieutenant) => {
  const dungeon = dungeonById(dungeonId)!;
  const template = ROOM_TEMPLATES[dungeonId]!.find((room) => room.use === 'calm')!;
  const arena = roomArena(template, dungeon.arena.theme);

  it(`${dungeonId}: valori sensati, meno della meta' della vita del boss, schemi annunciati`, () => {
    expect(lieutenant.stats.maxHealth).toBeLessThan(dungeon.boss.stats.maxHealth / 2);
    expect(lieutenant.name).toBe(lieutenant.name.toUpperCase());
    expect(lieutenant.patterns.length).toBeGreaterThanOrEqual(3);
    expect(lieutenant.summons?.minion.id).toBeDefined();
    expect(lieutenant.stats.contactDamage).toBeLessThanOrEqual(30);
    expect(lieutenant.stats.chargeDamage).toBeLessThanOrEqual(40);
  });

  it(`${dungeonId}: ogni schema funziona nelle due fasi e produce dati validi`, () => {
    for (let index = 0; index < lieutenant.patterns.length; index++) {
      for (const enraged of [false, true]) {
        const actor = new Boss(lieutenant, arena);
        actor.phase = enraged ? 2 : 1;
        actor.attackCount = index;
        actor.attackTimer = 0;
        const harness = createBossHarness(arena.playerSpawn);
        actor.step(STEP, harness.ctx);
        const immediate = harness.projectiles.length + harness.zones.length + actor.scheduled.length + (actor.charge !== null ? 1 : 0);
        expect(immediate, `${lieutenant.patterns[index]!.id}: effetto`).toBeGreaterThan(0);
        actor.attackTimer = Number.POSITIVE_INFINITY;
        for (let i = 0; i < 600; i++) actor.step(STEP, harness.ctx);
        for (const projectile of harness.projectiles) expect(projectile.spec.damage).toBeLessThanOrEqual(30);
        for (const zone of harness.zones) {
          expect(zone.spec.delay).toBeGreaterThanOrEqual(0.5);
          expect(zone.spec.damage).toBeLessThanOrEqual(40);
        }
        expect(actor.scheduled).toHaveLength(0);
        expect(actor.charge).toBeNull();
      }
    }
  });
});
