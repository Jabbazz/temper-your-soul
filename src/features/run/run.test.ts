import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import { isOutsideProjectileBounds, pillarAt } from '../arena/arena';
import { BODY_RADIUS } from '../combat/collision';
import { DangerZone } from '../combat/danger-zone';
import { DUNGEONS, dungeonById } from '../dungeons/dungeons';
import { Match, type PlayerIntent } from '../match/match';
import type { Minion } from '../minions/minion';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { eventsOfType, recordEvents, STEP } from '../../testing';
import { blessingEffects, cleanBlessings, nextBlessingCost } from './blessings';
import { DescentRun } from './descent';
import { planWaves, waveShares } from './director';
import { RoomEncounter, type RoomMember } from './encounter';
import { HAZARDS } from './hazards';
import { planDescent } from './plan';
import { ROOM_BESTIARY } from './room-bestiary';
import { ROOM_LAYOUT, roomArena, roomDoors, ROOM_TEMPLATES, spawnPoints } from './room-templates';
import { DESCENT, type DoorOption, type RoomKind } from './rooms';
import { addTemper, applyTempers, MAX_TEMPER_GRADE, offerTempers, TEMPERS } from './tempers';

const idle = (_match: Match): PlayerIntent => ({ move: Vec2.ZERO, aimOffset: new Vec2(100, 0), skills: [false, false, false, false] });

function member(): RoomMember {
  return { loadout: MAGE_SKILLS, tempers: [], offers: 3, secondLife: false };
}

/** Una stanza di prova del dungeon, con un solo giocatore e il mago di base. */
function room(dungeonId: string, option: DoorOption, seed = 3, stage = 2) {
  const template = ROOM_TEMPLATES[dungeonId]!.find((t) => t.use === (['lieutenant', 'sanctuary', 'reliquary', 'antechamber'].includes(option.kind) ? 'calm' : 'combat'))!;
  const encounter = new RoomEncounter({ dungeonId, option, stage, template, exits: 2, members: new Map([['local', member()]]), grade: 0, seen: new Set() });
  const dungeon = dungeonById(dungeonId)!;
  const match = new Match({ rng: new SeededRng(seed), dungeon, loadout: MAGE_SKILLS, arena: roomArena(template, dungeon.arena.theme), boss: null, encounter });
  return { match, encounter, template };
}

/** Fa avanzare la stanza tenendo il giocatore vivo e abbattendo i servitori appena compaiono. */
function clearRoom(match: Match, encounter: RoomEncounter, maxSeconds = 240): void {
  for (let i = 0; i < maxSeconds * 60 && !encounter.cleared && match.status === 'playing'; i++) {
    for (const player of match.players.values()) {
      player.health.current = player.health.max;
      player.invulnerableFor = 1;
    }
    for (const minion of match.minions) if (!minion.isHidden) minion.health.current = 0;
    if (match.boss !== null && !match.boss.health.isDead && i > 30) {
      // Un colpo al boss per farlo cadere: una zona del giocatore sul suo corpo.
      match.boss.health.current = 1;
      match.zones.push(new DangerZone(900_000 + i, { team: 'player', damage: 10, radius: 80, delay: 0 }, match.boss.position));
    }
    match.stepParty(STEP, new Map([...match.players.keys()].map((id) => [id, idle(match)])));
  }
}

/** Colpisce un servitore come farebbe una zona del giocatore. */
function strike(match: Match, minion: Minion, amount: number): void {
  (match as unknown as { hitMinion(m: Minion, a: number, o: string, v: string): void }).hitMinion(minion, amount, 'local', 'zone');
}

/** Raccoglie i premi, sceglie le tempre e attraversa la prima porta. */
function exitRoom(match: Match, encounter: RoomEncounter, door = 0): void {
  for (let i = 0; i < 60 * 30 && match.status === 'playing'; i++) {
    const view = encounter.view();
    for (const [id, player] of match.players) {
      if (player.health.isDead) continue;
      const offers = encounter.offers.get(id);
      if (offers) encounter.chooseOffer(match, id, 0);
      if (encounter.pendingPacts.has(id)) encounter.answerPact(match, id, false);
      const pickup = view.pickups.find((p) => !p.takenBy.includes(id) && !(p.kind === 'anvil' && view.pickups.some((q) => q.kind === 'fountain' && q.takenBy.includes(id))));
      const target = pickup !== undefined && i < 60 * 10 ? new Vec2(pickup.x, pickup.y) : encounter.doors[door]!.position;
      player.position = target;
    }
    match.stepParty(STEP, new Map([...match.players.keys()].map((id) => [id, idle(match)])));
  }
}

describe('stanze modello', () => {
  for (const dungeon of DUNGEONS) {
    it(`${dungeon.id}: stanze valide (misure, ripari, ingresso, porte e punti di comparsa)`, () => {
      const rooms = ROOM_TEMPLATES[dungeon.id]!;
      expect(rooms.filter((r) => r.use === 'combat').length).toBeGreaterThanOrEqual(5);
      expect(rooms.filter((r) => r.use === 'calm').length).toBeGreaterThanOrEqual(1);
      expect(new Set(rooms.map((r) => r.id)).size).toBe(rooms.length);
      const gap = 2 * BODY_RADIUS.player;
      for (const room of rooms) {
        expect(room.dungeonId).toBe(dungeon.id);
        expect(room.width).toBeGreaterThanOrEqual(1600);
        expect(room.width).toBeLessThanOrEqual(2400);
        expect(room.height).toBeGreaterThanOrEqual(1000);
        expect(room.height).toBeLessThanOrEqual(1500);
        const arena = roomArena(room, dungeon.arena.theme);
        expect(pillarAt(arena, arena.playerSpawn, BODY_RADIUS.player + 40), `${room.id}: ingresso`).toBeUndefined();
        // Nelle stanze di calma il luogotenente parte dal centro.
        if (room.use === 'calm') expect(pillarAt(arena, arena.bossSpawn, 40), `${room.id}: centro`).toBeUndefined();
        for (const pillar of room.pillars) {
          const { x, y } = pillar.position;
          for (const clearance of [x - pillar.radius, room.width - x - pillar.radius, y - pillar.radius, room.height - y - pillar.radius]) {
            expect(clearance, `${room.id}: pilastro vicino al muro`).toBeGreaterThanOrEqual(arena.playerMargin + gap);
          }
        }
        for (let i = 0; i < room.pillars.length; i++) {
          for (let j = i + 1; j < room.pillars.length; j++) {
            const a = room.pillars[i]!, b = room.pillars[j]!;
            const between = a.position.distanceTo(b.position) - a.radius - b.radius;
            expect(between <= 0 || between >= gap, `${room.id}: fessura`).toBe(true);
          }
        }
        for (const door of roomDoors(room, 3)) {
          expect(pillarAt(arena, door.position, door.halfWidth), `${room.id}: porta`).toBeUndefined();
        }
        const points = spawnPoints(room);
        expect(points.length, `${room.id}: punti di comparsa`).toBeGreaterThanOrEqual(12);
        for (const point of points) {
          expect(pillarAt(arena, point, 20)).toBeUndefined();
          expect(point.distanceTo(arena.playerSpawn)).toBeGreaterThanOrEqual(ROOM_LAYOUT.spawnFromEntrance);
        }
      }
    });
  }
});

describe('piano della discesa', () => {
  it('stesso seme, stesso piano; semi diversi, piani diversi', () => {
    expect(planDescent('crypt', 42)).toEqual(planDescent('crypt', 42));
    const variants = new Set(Array.from({ length: 12 }, (_, seed) => JSON.stringify(planDescent('crypt', seed).stages)));
    expect(variants.size).toBeGreaterThan(3);
  });

  it('la discesa completa ha otto tappe nell\'ordine dello studio', () => {
    for (let seed = 0; seed < 20; seed++) {
      const plan = planDescent('swamp', seed);
      const kinds = plan.stages.map((stage) => stage.options.map((option) => option.kind).sort().join('|'));
      expect(kinds).toEqual([
        'threshold',
        'combat|combat',
        'combat|reliquary|trial',
        'lieutenant',
        'sanctuary|siege',
        'combat|hunt',
        'antechamber',
        'boss',
      ]);
      // Le porte della stessa tappa di combattimento hanno premi diversi, e una delle due e' una tempra.
      const second = plan.stages[1]!.options.map((option) => option.reward);
      expect(new Set(second).size).toBe(2);
      expect(second).toContain('temper');
      const trial = plan.stages[2]!.options.find((option) => option.kind === 'trial')!;
      expect(trial.hard).toBe(true);
      expect(['unscathed', 'timed']).toContain(trial.rule);
    }
  });

  it('la discesa breve del Pellegrinaggio ha cinque tappe', () => {
    const plan = planDescent('forge', 9, { short: true });
    expect(plan.stages.map((stage) => stage.options[0]!.kind)).toEqual(['threshold', 'combat', 'lieutenant', expect.any(String), 'boss']);
    expect(plan.stages.length).toBe(5);
  });
});

describe('regista delle ondate', () => {
  it('quote del budget: l\'ultima ondata e\' la piu\' grossa', () => {
    for (const waves of [2, 3, 4]) {
      const shares = waveShares(waves);
      expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
      expect(shares.at(-1)).toBe(Math.max(...shares));
    }
  });

  for (const dungeon of DUNGEONS) {
    it(`${dungeon.id}: le ondate rispettano budget, tipi, minacce ed elite`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const budget = 60 + seed * 4;
        const plans = planWaves(
          { budget, waves: 3, bestiary: ROOM_BESTIARY[dungeon.id]!, stage: 4, eliteChance: 0.5, maxElites: 1, themeElite: 'robust' },
          new SeededRng(seed),
        );
        expect(plans).toHaveLength(3);
        let spent = 0;
        plans.forEach((plan, wave) => {
          const types = new Set(plan.orders.map((order) => order.entry.minion.id));
          expect(types.size, `seme ${seed}, ondata ${wave}: tipi`).toBeLessThanOrEqual(3);
          expect(plan.orders.length).toBeGreaterThan(0);
          expect(plan.orders.length).toBeLessThanOrEqual(32);
          expect(plan.orders.filter((o) => o.elite !== null).length).toBeLessThanOrEqual(1);
          expect(plan.orders.filter((o) => o.entry.role === 'nest' || o.entry.role === 'support').length).toBeLessThanOrEqual(1);
          if (wave > 0) expect(plan.orders.some((o) => o.entry.role === 'threat'), `ondata ${wave}: minaccia`).toBe(true);
          spent += plan.orders.reduce((sum, o) => sum + o.entry.cost * (o.elite ? 3 : 1), 0);
        });
        expect(spent).toBeLessThanOrEqual(Math.round(budget) + 3 * 3);
      }
    });
  }

  it('nella Soglia niente elite e niente servitori delle tappe avanzate', () => {
    const plans = planWaves({ budget: 41, waves: 2, bestiary: ROOM_BESTIARY.crypt!, stage: 0, eliteChance: 0, maxElites: 0, themeElite: 'ardent' }, new SeededRng(5));
    for (const plan of plans) {
      for (const order of plan.orders) {
        expect(order.elite).toBeNull();
        expect(order.entry.firstStage ?? 0).toBe(0);
      }
    }
  });

  it('ogni comparsa e\' annunciata a terra, lontano dal giocatore, senza superare il tetto dei vivi', () => {
    const { match } = room('crypt', { kind: 'combat', reward: 'temper' }, 11, 6);
    const events = recordEvents(match);
    let maxAlive = 0;
    for (let i = 0; i < 60 * 40; i++) {
      match.player.health.current = 100;
      match.player.invulnerableFor = 1;
      match.step(STEP, idle(match));
      maxAlive = Math.max(maxAlive, match.hostileCount());
    }
    const incoming = eventsOfType(events, 'minion_incoming');
    const spawned = eventsOfType(events, 'minion_spawned').filter((e) => incoming.some((i) => i.position.equals(e.position)));
    expect(incoming.length).toBeGreaterThan(10);
    expect(spawned.length).toBeGreaterThan(0);
    expect(maxAlive).toBeLessThanOrEqual(DESCENT.aliveCap);
    for (const event of incoming) expect(event.delay).toBeGreaterThanOrEqual(0.8);
    expect(eventsOfType(events, 'wave_started')[0]).toMatchObject({ wave: 1, waves: 3 });
  });
});

describe('stanze della discesa', () => {
  for (const dungeon of DUNGEONS) {
    it(`${dungeon.id}: uno scontro si libera, lascia il premio, propone le tempre e si esce da una porta`, () => {
      const { match, encounter } = room(dungeon.id, { kind: 'combat', reward: 'temper' }, 5, 3);
      const events = recordEvents(match);
      clearRoom(match, encounter);
      expect(encounter.cleared).toBe(true);
      expect(eventsOfType(events, 'room_cleared')).toHaveLength(1);
      expect(encounter.view().pickups.map((p) => p.kind)).toEqual(['temper']);
      exitRoom(match, encounter, 1);
      expect(match.status).toBe('won');
      expect(encounter.exit).toBe(1);
      expect(encounter.grants.tempers.get('local')?.length).toBe(1);
      expect(eventsOfType(events, 'temper_chosen')).toHaveLength(1);
      expect(eventsOfType(events, 'room_exited')[0]).toMatchObject({ door: 1 });
    });
  }

  it('le porte si aprono solo con la stanza libera e con tutti i vivi sulla stessa soglia', () => {
    const { match, encounter } = room('crypt', { kind: 'combat', reward: 'embers' }, 2, 1);
    match.player.position = encounter.doors[0]!.position;
    for (let i = 0; i < 120; i++) match.step(STEP, idle(match));
    expect(match.status).toBe('playing');
    expect(encounter.doorProgress[0]).toBe(0);
  });

  it('il santuario offre fonte o incudine: prenderne una toglie l\'altra', () => {
    const { match, encounter } = room('swamp', { kind: 'sanctuary', reward: null });
    match.step(STEP, idle(match));
    expect(encounter.cleared).toBe(true);
    match.player.health.current = 40;
    const fountain = encounter.pickups.find((p) => p.kind === 'fountain')!;
    match.player.position = fountain.position;
    match.step(STEP, idle(match));
    expect(match.player.health.current).toBe(80);
    const anvil = encounter.pickups.find((p) => p.kind === 'anvil')!;
    match.player.position = anvil.position;
    match.step(STEP, idle(match));
    expect(anvil.takenBy).toHaveLength(0);
    expect(encounter.offers.has('local')).toBe(false);
  });

  it('il forziere da\' braci e propone un patto: accettarlo porta due tempre e toglie vita massima', () => {
    const { match, encounter } = room('crypt', { kind: 'reliquary', reward: 'embers' });
    match.step(STEP, idle(match));
    match.player.position = encounter.pickups[0]!.position;
    match.step(STEP, idle(match));
    expect(encounter.grants.embers.get('local')).toBeGreaterThan(0);
    expect(encounter.pendingPacts.has('local')).toBe(true);
    expect(encounter.answerPact(match, 'local', true)).toBe(true);
    expect(encounter.offers.get('local')).toHaveLength(3);
    encounter.chooseOffer(match, 'local', 0);
    expect(encounter.offers.get('local')).toHaveLength(3);
    encounter.chooseOffer(match, 'local', 1);
    expect(encounter.offers.has('local')).toBe(false);
    expect(encounter.grants.pacts.has('local')).toBe(true);
  });

  it('la Prova senza un graffio fallisce al primo colpo: niente premio ne\' sigillo', () => {
    const { match, encounter } = room('crypt', { kind: 'trial', reward: 'temper', rule: 'unscathed', hard: true }, 4, 2);
    match.report.get('local')!.damageReceived = 5;
    clearRoom(match, encounter);
    expect(encounter.grants.trial).toBe(false);
    expect(encounter.grants.seals).toBe(0);
    expect(encounter.pickups).toHaveLength(0);
  });

  it('la Prova riuscita vale doppio e un sigillo', () => {
    const { match, encounter } = room('forge', { kind: 'trial', reward: 'embers', rule: 'timed', hard: true }, 4, 2);
    clearRoom(match, encounter);
    expect(encounter.grants.trial).toBe(true);
    expect(encounter.grants.seals).toBe(1);
    expect(encounter.pickups[0]!.amount).toBe(Math.round(DESCENT.embers.door * DESCENT.dungeonFactor.forge! * 2));
  });

  it('l\'Assedio finisce a tempo, e ogni nido distrutto lo accorcia', () => {
    const { match, encounter } = room('crypt', { kind: 'siege', reward: 'embers', hard: true }, 6, 4);
    match.step(STEP, idle(match));
    const nests = match.minions.filter((m) => m.definition.behavior === 'nest');
    expect(nests).toHaveLength(2);
    let seconds = 0;
    while (!encounter.cleared && seconds < 80) {
      match.player.health.current = 100;
      match.player.invulnerableFor = 1;
      if (seconds > 2 && seconds < 2.02) for (const nest of nests) strike(match, nest, 99_999);
      match.step(STEP, idle(match));
      seconds += STEP;
    }
    expect(encounter.cleared).toBe(true);
    expect(seconds).toBeGreaterThan(DESCENT.siegeSeconds - 2 * DESCENT.siegeNestBonus - 3);
    expect(match.minions).toHaveLength(0);
  });

  it('la Caccia finisce quando cade la preda, che fugge dal giocatore', () => {
    const { match, encounter } = room('glacier', { kind: 'hunt', reward: 'seal' }, 8, 5);
    match.step(STEP, idle(match));
    const prey = encounter.prey!;
    expect(prey).not.toBeNull();
    expect(prey.elite?.id).toBe('robust');
    const before = prey.position.distanceTo(match.player.position);
    match.player.position = prey.position.add(new Vec2(80, 0));
    for (let i = 0; i < 60; i++) {
      match.player.invulnerableFor = 1;
      match.step(STEP, idle(match));
    }
    expect(prey.position.distanceTo(match.player.position)).toBeGreaterThan(80);
    expect(before).toBeGreaterThan(0);
    prey.health.current = 1;
    strike(match, prey, 5);
    expect(encounter.cleared).toBe(true);
    expect(encounter.pickups[0]!.kind).toBe('seal');
  });

  it('le insidie arrivano solo dalla terza tappa e avvisano', () => {
    for (const dungeon of DUNGEONS) {
      const hazard = HAZARDS[dungeon.id]!;
      expect(hazard.zone.delay).toBeGreaterThanOrEqual(0.5);
      expect(hazard.zone.damage).toBeLessThanOrEqual(12);
      const early = room(dungeon.id, { kind: 'combat', reward: 'temper' }, 1, 1);
      const late = room(dungeon.id, { kind: 'combat', reward: 'temper' }, 1, 3);
      for (const r of [early, late]) {
        for (let i = 0; i < 60 * (hazard.firstDelay + 0.5); i++) {
          r.match.player.invulnerableFor = 1;
          r.match.step(STEP, idle(r.match));
        }
      }
      const hazardZones = (m: Match) => m.zones.filter((z) => z.spec.visual === hazard.zone.visual);
      expect(hazardZones(early.match)).toHaveLength(0);
      expect(hazardZones(late.match).length).toBeGreaterThan(0);
      for (const zone of hazardZones(late.match)) expect(isOutsideProjectileBounds(late.match.arena, zone.position)).toBe(false);
    }
  });
});

describe('tempre', () => {
  it('ogni tempra cambia la skill a cui si applica, e i gradi crescono fino al terzo', () => {
    for (const temper of TEMPERS) {
      const slot = MAGE_SKILLS.findIndex((skill) => skill !== null && temper.applies(skill));
      expect(slot, temper.id).toBeGreaterThanOrEqual(0);
      const base = MAGE_SKILLS[slot]!;
      const one = applyTempers(MAGE_SKILLS, [{ temperId: temper.id, slot, grade: 1 }])[slot]!;
      const three = applyTempers(MAGE_SKILLS, [{ temperId: temper.id, slot, grade: 3 }])[slot]!;
      expect(JSON.stringify(one), temper.id).not.toBe(JSON.stringify(base));
      expect(JSON.stringify(three), temper.id).not.toBe(JSON.stringify(one));
      expect(temper.describe(1).length).toBeGreaterThan(5);
      expect(base.effect).toBe(MAGE_SKILLS[slot]!.effect);
    }
    let picks = addTemper([], 'live_ember', 0);
    for (let i = 0; i < 5; i++) picks = addTemper(picks, 'live_ember', 0);
    expect(picks).toEqual([{ temperId: 'live_ember', slot: 0, grade: MAX_TEMPER_GRADE }]);
  });

  it('le offerte sono diverse, applicabili, non al massimo e varie per famiglia', () => {
    for (let seed = 0; seed < 30; seed++) {
      const offers = offerTempers(new SeededRng(seed), MAGE_SKILLS, [], 3);
      expect(offers).toHaveLength(3);
      expect(new Set(offers.map((o) => `${o.temperId}:${o.slot}`)).size).toBe(3);
      const families = new Set(offers.map((o) => TEMPERS.find((t) => t.id === o.temperId)!.family));
      expect(families.size).toBe(3);
    }
    const maxed = TEMPERS.flatMap((t) => [0, 1, 2, 3].map((slot) => ({ temperId: t.id, slot, grade: 3 })));
    expect(offerTempers(new SeededRng(1), MAGE_SKILLS, maxed, 3)).toEqual([]);
  });
});

describe('Altare dell\'anima', () => {
  it('benedizioni: costi, effetti e pulizia dei dati', () => {
    expect(nextBlessingCost({}, 'vigor')).toBe(60);
    expect(nextBlessingCost({ vigor: 3 }, 'vigor')).toBeNull();
    expect(blessingEffects({ vigor: 2, fortune: 1, smith_eye: 1, second_life: 1 })).toEqual({ bonusHealth: 20, startingTemper: false, secondLife: true, offers: 4, seals: 1 });
    expect(cleanBlessings({ vigor: 9, nope: 2, fortune: -1, smith_eye: 1.5 })).toEqual({ vigor: 3 });
  });
});

/** Gioca una discesa intera abbattendo tutto e prendendo sempre la prima porta. */
function playDescent(run: DescentRun): RoomKind[] {
  const visited: RoomKind[] = [];
  for (let room = 0; room < 40 && run.status === 'playing'; room++) {
    visited.push(run.option.kind);
    clearRoom(run.match, run.encounter);
    if (run.match.status === 'playing') exitRoom(run.match, run.encounter, 0);
    run.advance();
  }
  return visited;
}

describe('discesa completa', () => {
  it('dalla Soglia al boss: otto stanze, tempre portate avanti, braci, esperienza e vittoria', () => {
    const run = new DescentRun({ mode: 'descent', dungeonId: 'crypt', members: [{ id: 'local', loadout: MAGE_SKILLS }], seed: 77 });
    const visited = playDescent(run);
    expect(visited, visited.join(', ')).toHaveLength(8);
    expect(visited[0]).toBe('threshold');
    expect(visited.at(-1)).toBe('boss');
    expect(run.status).toBe('won');
    expect(run.victories).toHaveLength(1);
    const state = run.players.get('local')!;
    expect(state.tempers.length).toBeGreaterThan(0);
    expect(state.embers).toBeGreaterThan(0);
    expect(state.xp).toBeGreaterThan(100);
    // Il luogotenente apre la sua pagina del bestiario.
    expect(state.kills.belfry_gargoyle).toBe(1);
    expect(run.seals).toBeLessThanOrEqual(DESCENT.maxSeals);
    expect(run.lootTable('crypt', 4).dropChance).toBeCloseTo(0.45);
  });

  it('le tempre scelte cambiano le skill della stanza dopo; vita e mana passano da una stanza all\'altra', () => {
    const run = new DescentRun({ mode: 'descent', dungeonId: 'swamp', members: [{ id: 'local', loadout: MAGE_SKILLS }], seed: 5 });
    clearRoom(run.match, run.encounter);
    exitRoom(run.match, run.encounter, 0);
    run.match.player.health.current = 57;
    run.advance();
    expect(run.match.player.health.current).toBeLessThanOrEqual(100);
    run.encounter.offers.set('local', [{ temperId: 'quick_hand', slot: 0, grade: 1 }]);
    run.encounter.chooseOffer(run.match, 'local', 0);
    clearRoom(run.match, run.encounter);
    exitRoom(run.match, run.encounter, 0);
    run.advance();
    expect(run.players.get('local')!.tempers).toContainEqual({ temperId: 'quick_hand', slot: 0, grade: 1 });
    expect(run.match.player.skillBar.skillAt(0)!.cooldown).toBeCloseTo(MAGE_SKILLS[0]!.cooldown * 0.88);
  });

  it('a terra in una stanza: la discesa e\' persa ma braci ed esperienza restano', () => {
    const run = new DescentRun({ mode: 'descent', dungeonId: 'crypt', members: [{ id: 'local', loadout: MAGE_SKILLS }], seed: 9 });
    clearRoom(run.match, run.encounter);
    exitRoom(run.match, run.encounter, 0);
    run.advance();
    const embers = run.players.get('local')!.embers;
    run.match.player.health.current = 1;
    (run.match as unknown as { hurtPlayer(a: number): void }).hurtPlayer(50);
    expect(run.match.status).toBe('lost');
    run.advance();
    expect(run.status).toBe('lost');
    expect(run.players.get('local')!.embers).toBe(embers);
  });

  it('Seconda vita: a terra una volta ci si rialza', () => {
    const run = new DescentRun({ mode: 'descent', dungeonId: 'crypt', members: [{ id: 'local', loadout: MAGE_SKILLS, blessings: { second_life: 1, vigor: 1 } }], seed: 9 });
    expect(run.match.player.health.max).toBe(110);
    (run.match as unknown as { hurtPlayer(a: number): void }).hurtPlayer(500);
    expect(run.match.status).toBe('playing');
    expect(run.match.player.health.current).toBe(33);
    run.match.player.invulnerableFor = 0;
    (run.match as unknown as { hurtPlayer(a: number): void }).hurtPlayer(500);
    expect(run.match.status).toBe('lost');
  });

  it('cooperativa: piu\' nemici, luogotenente piu\' robusto, chi e\' a terra si rialza nella stanza dopo', () => {
    const members = ['a', 'b', 'c'].map((id) => ({ id, loadout: MAGE_SKILLS }));
    const run = new DescentRun({ mode: 'descent', dungeonId: 'crypt', members, seed: 21 });
    expect(run.match.players.size).toBe(3);
    run.match.players.get('b')!.health.current = 0;
    clearRoom(run.match, run.encounter);
    run.match.players.get('b')!.health.current = 0;
    exitRoom(run.match, run.encounter, 0);
    run.advance();
    expect(run.match.players.get('b')!.health.current).toBe(Math.round(100 * DESCENT.reviveFraction));
  });

  it('Pellegrinaggio: le quattro discese brevi di fila, un boss per dungeon', () => {
    const run = new DescentRun({ mode: 'pilgrimage', dungeonId: 'crypt', members: [{ id: 'local', loadout: MAGE_SKILLS }], seed: 3 });
    const visited = playDescent(run);
    expect(visited.filter((kind) => kind === 'boss')).toHaveLength(4);
    expect(visited).toHaveLength(20);
    expect(run.victories.map((victory) => victory.dungeonId)).toEqual(['crypt', 'swamp', 'forge', 'glacier']);
    expect(run.status).toBe('won');
  });
});
