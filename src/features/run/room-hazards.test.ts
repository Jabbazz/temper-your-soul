import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import { chasmAt, pillarAt, pushOutOfPillars, sightBlocked, solidAt, solidBetween, sweepSolids, type ArenaDefinition, type Solid } from '../arena/arena';
import { NavField } from '../arena/nav-field';
import { BODY_RADIUS } from '../combat/collision';
import type { GameEvent } from '../combat/events';
import { Projectile, type ProjectileSpec } from '../combat/projectile';
import { CRYPT } from '../dungeons/crypt';
import { DUNGEONS, dungeonById } from '../dungeons/dungeons';
import { Character } from '../character/character';
import type { CharacterClass } from '../character/character-class';
import { COVER_RULES, Match, type MatchMember, type PlayerIntent } from '../match/match';
import { MINIONS } from '../minions/minion-catalog';
import { parseWire, replicaMatch, setupOf, snapshotOf } from '../network/protocol';
import { SnapshotDecoder, SnapshotEncoder, type SnapshotFrame } from '../network/snapshot-codec';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { STEP } from '../../testing';
import { ROOM_LAYOUT, roomArena, roomDoors, roomTemplateById, ROOM_TEMPLATES, spawnPoints } from './room-templates';

/*
 * Fase 5 dello studio grafico (proposta per Jabbaz): pozzi che fermano chi cammina ma non i colpi, ponti, ripari che si
 * rompono, campo di flusso per i servitori a terra, vita dei ripari in cooperativa.
 */

const still: PlayerIntent = { move: Vec2.ZERO, aimOffset: new Vec2(100, 0), skills: [false, false, false, false] };
const walk = (move: Vec2): PlayerIntent => ({ ...still, move });

/** Un fiume da muro a muro alto 128, con un ponte largo 120 al centro. */
const river: ArenaDefinition = {
  id: 'prova-fiume',
  name: 'Prova',
  theme: 'crypt',
  width: 1000,
  height: 900,
  wallThickness: 24,
  playerSpawn: new Vec2(500, 800),
  bossSpawn: new Vec2(500, 200),
  playerMargin: 40,
  bossMargin: 60,
  projectileMargin: 24,
  pillars: [],
  chasms: [{ x: 24, y: 400, width: 416, height: 128 }, { x: 560, y: 400, width: 416, height: 128 }],
  bridges: [{ x: 440, y: 400, width: 120, height: 128, along: 'ns' }],
};

/** Una stanza aperta con un riparo largo al centro. */
const sheltered: ArenaDefinition = { ...river, id: 'prova-riparo', chasms: [], bridges: [], covers: [{ x: 300, y: 400, width: 400, height: 40 }] };

const bolt = (team: 'player' | 'enemy', damage: number): ProjectileSpec => ({ team, speed: 400, damage, radius: 5, lifetime: 3, visual: 'arcane_bolt' });

function emptyRoom(arena: ArenaDefinition): Match {
  return new Match({ rng: new SeededRng(7), dungeon: CRYPT, loadout: MAGE_SKILLS, arena, boss: null });
}

function overlapping(a: Solid, b: Solid): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function nearestDistance(rect: Solid, point: Vec2): number {
  return new Vec2(Math.min(Math.max(point.x, rect.x), rect.x + rect.width), Math.min(Math.max(point.y, rect.y), rect.y + rect.height)).distanceTo(point);
}

describe('stanze con pozzi, ponti e ripari', () => {
  it('ogni dungeon ha due stanze di scontro con pozzi o ripari; le stanze di calma non ne hanno', () => {
    for (const dungeon of DUNGEONS) {
      const rooms = ROOM_TEMPLATES[dungeon.id] ?? [];
      const hazardous = rooms.filter((room) => (room.chasms?.length ?? 0) + (room.covers?.length ?? 0) > 0);
      expect(hazardous.length, dungeon.id).toBeGreaterThanOrEqual(2);
      for (const room of hazardous) expect(room.use, room.id).toBe('combat');
    }
  });

  for (const dungeon of DUNGEONS) {
    it(`${dungeon.id}: pozzi e ripari dentro i muri, lontani da ingresso e porte; ogni ponte unisce due tratti di pozzo`, () => {
      const wall = ROOM_LAYOUT.wallThickness;
      for (const room of ROOM_TEMPLATES[dungeon.id] ?? []) {
        const arena = roomArena(room, dungeon.arena.theme);
        const doors = [1, 2, 3].flatMap((count) => roomDoors(room, count));
        for (const rect of [...(room.chasms ?? []), ...(room.covers ?? [])]) {
          expect(rect.x >= wall && rect.y >= wall && rect.x + rect.width <= room.width - wall && rect.y + rect.height <= room.height - wall, `${room.id}: dentro i muri`).toBe(true);
          expect(nearestDistance(rect, arena.playerSpawn), `${room.id}: lontano dall'ingresso`).toBeGreaterThanOrEqual(ROOM_LAYOUT.spawnFromEntrance);
          for (const door of doors) expect(nearestDistance(rect, door.position), `${room.id}: porta`).toBeGreaterThan(door.halfWidth + door.depth);
          for (const pillar of room.pillars) expect(nearestDistance(rect, pillar.position) - pillar.radius, `${room.id}: pilastro attaccato`).toBeGreaterThan(2 * BODY_RADIUS.player);
          for (const solid of room.solids ?? []) expect(overlapping(rect, solid), `${room.id}: sopra un massiccio`).toBe(false);
        }
        for (const chasm of room.chasms ?? []) {
          expect(Math.min(chasm.width, chasm.height), `${room.id}: pozzo largo almeno due tile`).toBeGreaterThanOrEqual(64);
          for (const cover of room.covers ?? []) expect(overlapping(chasm, cover), `${room.id}: riparo sopra un pozzo`).toBe(false);
        }
        expect(chasmAt(arena, arena.bossSpawn, 40), `${room.id}: centro`).toBeUndefined();
        for (const bridge of room.bridges ?? []) {
          const chasms = room.chasms ?? [];
          for (const chasm of chasms) expect(overlapping(bridge, chasm), `${room.id}: ponte sopra un pozzo`).toBe(false);
          // 'ns': si attraversa dall'alto in basso, quindi ai lati ci sono due tratti di pozzo della stessa profondita'.
          const side = (x: number): boolean => chasms.some((chasm) => (chasm.x === x || chasm.x + chasm.width === x) && chasm.y === bridge.y && chasm.height === bridge.height);
          if (bridge.along === 'ns') {
            expect(side(bridge.x) && side(bridge.x + bridge.width), `${room.id}: ponte fra due rive`).toBe(true);
            expect(bridge.width, `${room.id}: ponte largo`).toBeGreaterThanOrEqual(120);
          }
        }
        for (const point of spawnPoints(room)) {
          expect(chasmAt(arena, point, ROOM_LAYOUT.spawnFromPillar), `${room.id}: comparsa nel pozzo`).toBeUndefined();
          for (const cover of room.covers ?? []) expect(nearestDistance(cover, point), `${room.id}: comparsa sul riparo`).toBeGreaterThanOrEqual(ROOM_LAYOUT.spawnFromPillar);
        }
      }
    });
  }
});

describe('pozzi', () => {
  it('chi cammina si ferma sul bordo del pozzo; sul ponte passa', () => {
    const match = emptyRoom(river);
    match.player.position = new Vec2(200, 300);
    for (let i = 0; i < 120; i++) match.step(STEP, walk(new Vec2(0, 1)));
    expect(match.player.position.y).toBeLessThanOrEqual(400 - BODY_RADIUS.player + 0.01);
    match.player.position = new Vec2(500, 300);
    for (let i = 0; i < 180; i++) match.step(STEP, walk(new Vec2(0, 1)));
    expect(match.player.position.y).toBeGreaterThan(528 + BODY_RADIUS.player);
  });

  it('un corpo dentro un pozzo ne esce dal lato piu\' vicino', () => {
    const out = pushOutOfPillars(river, new Vec2(200, 410), BODY_RADIUS.player);
    expect(out.y).toBeCloseTo(400 - BODY_RADIUS.player);
    expect(chasmAt(river, out, BODY_RADIUS.player - 0.01)).toBeUndefined();
  });

  it('colpi e chi vola passano sopra il pozzo; il pozzo non sbarra la vista', () => {
    const match = emptyRoom(river);
    match.player.position = new Vec2(800, 800);
    const shot = new Projectile(900, bolt('player', 10), new Vec2(200, 300), Math.PI / 2);
    match.projectiles.push(shot);
    for (let i = 0; i < 60; i++) match.step(STEP, still);
    expect(shot.isExpired).toBe(false);
    expect(shot.position.y).toBeGreaterThan(600);
    expect(sightBlocked(river, new Vec2(200, 300), new Vec2(200, 700))).toBe(false);
    const flyer = Object.values(MINIONS).find((definition) => definition.flying && !definition.dormant && !definition.blink)!;
    const minion = match.spawnMinion(flyer, new Vec2(200, 250), { maxHealth: 1000 });
    match.player.position = new Vec2(200, 780);
    let crossed = false;
    for (let i = 0; i < 600 && !crossed; i++) {
      match.player.invulnerableFor = 1;
      match.player.health.current = match.player.health.max;
      match.step(STEP, still);
      crossed = minion.position.y > 528;
    }
    expect(crossed).toBe(true);
  });

  it('lo scatto supera il pozzo se atterra sul pavimento, altrimenti resta sulla riva da cui parte', () => {
    const across = sweepSolids(river, new Vec2(200, 350), new Vec2(200, 560), BODY_RADIUS.player);
    expect(across).toEqual(new Vec2(200, 560));
    const short = sweepSolids(river, new Vec2(200, 350), new Vec2(200, 450), BODY_RADIUS.player);
    expect(short.y).toBeLessThan(400);
    expect(short.y).toBeGreaterThanOrEqual(350);
  });

  it('un servitore a terra dall\'altra parte del fiume arriva al giocatore passando dal ponte', () => {
    const chaser = Object.values(MINIONS).find((d) => d.behavior === 'chaser' && !d.flying && !d.charge && !d.leap && !d.burrow && !d.blink && !d.ambush && !d.dormant && !d.shot && !d.lob && !d.nest && d.speed > 60)!;
    const match = emptyRoom(river);
    const player = new Vec2(200, 760);
    match.player.position = player;
    const minion = match.spawnMinion(chaser, new Vec2(200, 250), { maxHealth: 100000 });
    let reached = false;
    let usedBridge = false;
    for (let i = 0; i < 60 * 20 && !reached; i++) {
      match.player.position = player;
      match.player.invulnerableFor = 1;
      match.player.health.current = match.player.health.max;
      match.step(STEP, still);
      expect(chasmAt(river, minion.position), `${minion.position.x},${minion.position.y}`).toBeUndefined();
      if (minion.position.y > 400 && minion.position.y < 528) usedBridge ||= minion.position.x > 440 && minion.position.x < 560;
      reached = minion.position.distanceTo(player) < minion.hitRadius + BODY_RADIUS.player + 30;
    }
    expect(usedBridge).toBe(true);
    expect(reached).toBe(true);
  });

  it('il campo di flusso gira attorno al pozzo: la strada dall\'altra riva passa dal ponte', () => {
    const field = new NavField(river);
    field.update([new Vec2(200, 760)]);
    let at = new Vec2(200, 250);
    const start = field.distanceAt(field.cellOf(at));
    expect(Number.isFinite(start)).toBe(true);
    // Piu' lunga della linea retta: deve arrivare al ponte e tornare indietro.
    expect(start * 40).toBeGreaterThan(at.distanceTo(new Vec2(200, 760)) + 200);
    let bridge = false;
    for (let i = 0; i < 100; i++) {
      const next = field.next(at);
      if (next === null) break;
      expect(chasmAt(river, next)).toBeUndefined();
      if (next.y > 400 && next.y < 528) bridge ||= next.x > 440 && next.x < 560;
      at = next;
    }
    expect(bridge).toBe(true);
    expect(at.distanceTo(new Vec2(200, 760))).toBeLessThan(60);
  });
});

describe('ripari distruttibili', () => {
  it('un riparo ferma i colpi di entrambe le squadre e perde vita a ogni colpo; a zero si rompe una volta sola', () => {
    const match = emptyRoom(sheltered);
    const events: GameEvent[] = [];
    match.events.connect((event) => events.push(event));
    match.player.position = new Vec2(500, 800);
    expect(match.covers.length).toBe(1);
    expect(match.covers[0]!.health).toBe(COVER_RULES.health);
    const enemy = new Projectile(900, bolt('enemy', 60), new Vec2(500, 300), Math.PI / 2);
    match.projectiles.push(enemy);
    for (let i = 0; i < 30; i++) match.step(STEP, still);
    expect(enemy.isExpired).toBe(true);
    expect(match.covers[0]!.health).toBe(COVER_RULES.health - 60);
    expect(events.some((event) => event.type === 'cover_hit')).toBe(true);
    const mine = new Projectile(901, bolt('player', COVER_RULES.health), new Vec2(500, 600), -Math.PI / 2);
    match.projectiles.push(mine);
    for (let i = 0; i < 40; i++) match.step(STEP, still);
    expect(mine.isExpired).toBe(true);
    expect(match.covers[0]!.health).toBe(0);
    expect(events.filter((event) => event.type === 'cover_broken').length).toBe(1);
    expect(solidAt(match.arena, new Vec2(500, 420))).toBeUndefined();
    // Rotto: i colpi passano.
    const after = new Projectile(902, bolt('enemy', 60), new Vec2(450, 300), Math.PI / 2);
    match.projectiles.push(after);
    for (let i = 0; i < 30; i++) match.step(STEP, still);
    expect(after.position.y).toBeGreaterThan(460);
  });

  it('il riparo ferma chi cammina finche\' resiste, ma non la vista', () => {
    const match = emptyRoom(sheltered);
    match.player.position = new Vec2(500, 300);
    for (let i = 0; i < 120; i++) match.step(STEP, walk(new Vec2(0, 1)));
    expect(match.player.position.y).toBeLessThanOrEqual(400 - BODY_RADIUS.player + 0.01);
    expect(solidAt(match.arena, new Vec2(500, 420))).toBeDefined();
    expect(solidBetween(match.arena, new Vec2(500, 300), new Vec2(500, 700))).toBeUndefined();
    expect(sightBlocked(match.arena, new Vec2(500, 300), new Vec2(500, 700))).toBe(false);
    match.breakCover(0, true);
    for (let i = 0; i < 120; i++) match.step(STEP, walk(new Vec2(0, 1)));
    expect(match.player.position.y).toBeGreaterThan(440 + BODY_RADIUS.player);
  });

  it('ogni partita ha la sua copia dei ripari: la stanza modello non cambia', () => {
    const template = roomTemplateById('crypt_pews')!;
    const dungeon = dungeonById('crypt')!;
    const first = new Match({ rng: new SeededRng(1), dungeon, loadout: MAGE_SKILLS, arena: roomArena(template, 'crypt'), boss: null });
    const second = new Match({ rng: new SeededRng(1), dungeon, loadout: MAGE_SKILLS, arena: roomArena(template, 'crypt'), boss: null });
    const solidsBefore = second.arena.solids!.length;
    first.breakCover(3, true);
    expect(first.arena.solids!.length).toBe(solidsBefore - 1);
    expect(second.arena.solids!.length).toBe(solidsBefore);
    expect(template.solids).toBeUndefined();
    expect(template.covers!.length).toBe(solidsBefore);
  });

  it('la copia di disegno della cooperativa vede gli stessi ripari, e i rotti spariscono anche li\'', () => {
    const match = emptyRoom(sheltered);
    const view = new Match({ rng: new SeededRng(1), dungeon: CRYPT, loadout: MAGE_SKILLS, arena: match.arena, boss: null });
    expect(view.arena).toBe(match.arena);
    expect(view.covers.length).toBe(1);
    match.breakCover(0, true);
    expect(solidAt(view.arena, new Vec2(500, 420))).toBeUndefined();
    view.breakCover(0, false);
    expect(view.covers[0]!.health).toBe(0);
  });
});

describe('ripari in cooperativa', () => {
  it('la vita dei ripari viaggia nelle istantanee solo quando cambia; rotto sul server, rotto anche sul client', () => {
    const template = roomTemplateById('crypt_pews')!;
    const dungeon = dungeonById('crypt')!;
    const members = [{ id: 'a', loadout: MAGE_SKILLS }];
    const server = new Match({ rng: new SeededRng(3), dungeon, loadout: MAGE_SKILLS, members, arena: roomArena(template, 'crypt'), boss: null });
    const client = replicaMatch(dungeon, setupOf(server), members);
    const clientEvents: GameEvent[] = [];
    client.events.connect((event) => clientEvents.push(event));
    const encoder = new SnapshotEncoder();
    const decoder = new SnapshotDecoder();
    const send = (): SnapshotFrame => {
      const frame = encoder.encode(snapshotOf(server, 'stanza', [], {}));
      const wire = parseWire(JSON.stringify(frame)) as SnapshotFrame;
      const decoded = decoder.decode(wire);
      // Come sul client: la vita dei ripari si applica alla replica.
      (decoded.covers ?? []).forEach((health, index) => {
        if (health <= 0) client.breakCover(index, false);
        else client.covers[index]!.health = health;
      });
      return frame;
    };
    expect(send().cv).toHaveLength(template.covers!.length);
    expect(send().cv).toBeUndefined();
    server.covers[2]!.health = 40;
    expect(send().cv).toBeDefined();
    expect(client.covers[2]!.health).toBe(40);
    server.breakCover(5, true);
    send();
    expect(client.covers[5]!.health).toBe(0);
    const pew = template.covers![5]!;
    expect(solidAt(client.arena, new Vec2(pew.x + pew.width / 2, pew.y + pew.height / 2))).toBeUndefined();
    expect(clientEvents.some((event) => event.type === 'cover_broken')).toBe(false);
    expect(pillarAt(client.arena, new Vec2(0, 0))).toBeUndefined();
  });
});

/** Un giocatore della classe data, come nelle prove delle classi. */
function member(kind: CharacterClass): MatchMember {
  const character = Character.createStarter(kind);
  character.completeCreation(kind, 'male', kind);
  return { id: kind, characterClass: kind, loadout: character.loadout() };
}

/** Tiene fermi e invulnerabili i giocatori nelle posizioni date, per `seconds` secondi; `each` dopo ogni passo. */
function hold(match: Match, places: ReadonlyMap<string, Vec2>, seconds: number, each: () => boolean | void = () => {}): void {
  for (let i = 0; i < seconds * 60; i++) {
    for (const [id, place] of places) {
      const player = match.players.get(id)!;
      player.position = place;
      player.invulnerableFor = 1;
      player.health.current = player.health.max;
    }
    match.stepParty(STEP, new Map());
    if (each() === true) return;
  }
}

describe('pozzi e ripari: casi trovati dalla revisione', () => {
  it('nella navata dei banchi un ratto non resta incastrato all\'angolo di una panca', () => {
    const template = roomTemplateById('crypt_pews')!;
    const match = new Match({ rng: new SeededRng(5), dungeon: dungeonById('crypt')!, loadout: MAGE_SKILLS, arena: roomArena(template, 'crypt'), boss: null });
    const player = new Vec2(1024, 1224);
    const rat = match.spawnMinion(MINIONS.crypt_rat!, new Vec2(110, 110), { maxHealth: 100000 });
    let reached = false;
    hold(match, new Map([[match.viewPlayerId, player]]), 24, () => (reached = rat.position.distanceTo(player) < rat.hitRadius + BODY_RADIUS.player + 30));
    expect(reached, `${rat.position.x},${rat.position.y}`).toBe(true);
  });

  it('il campo di flusso segue il bersaglio del servitore: provocato dal Guerriero, va da lui e non dall\'Arciere', () => {
    const match = new Match({ rng: new SeededRng(5), dungeon: CRYPT, loadout: [], members: [member('warrior'), member('archer')], arena: river, boss: null });
    const chaser = Object.values(MINIONS).find((d) => d.behavior === 'chaser' && !d.flying && !d.charge && !d.leap && !d.burrow && !d.blink && !d.ambush && !d.dormant && !d.shot && !d.lob && !d.nest && d.speed > 60)!;
    const minion = match.spawnMinion(chaser, new Vec2(200, 300), { maxHealth: 100000 });
    const warrior = new Vec2(200, 600);
    match.classCombat.taunt('warrior', 2000, 60);
    let reached = false;
    // L'Arciere sta dalla stessa parte del servitore ed e' il piu' vicino: senza provocazione andrebbe da lui.
    hold(match, new Map([['warrior', warrior], ['archer', new Vec2(350, 250)]]), 15, () => (reached = minion.position.distanceTo(warrior) < minion.hitRadius + BODY_RADIUS.player + 30));
    expect(reached, `${minion.position.x},${minion.position.y}`).toBe(true);
  });

  it('il lupo dell\'Arciere compare, aspetta e salta sempre sul pavimento', () => {
    const match = new Match({ rng: new SeededRng(5), dungeon: CRYPT, loadout: [], members: [member('archer')], arena: river, boss: null });
    const archer = new Vec2(200, 385);
    match.players.get('archer')!.position = archer;
    const effect = member('archer').loadout[2]!.effect;
    if (effect.kind !== 'summon') throw new Error('Atteso compagno');
    match.classCombat.summon('archer', effect.pet);
    const pet = match.classCombat.pets.get('archer')!;
    expect(chasmAt(river, pet.position, 7.9), `comparsa ${pet.position.x},${pet.position.y}`).toBeUndefined();
    // Senza bersagli il lupo resta vicino al padrone, anche se il suo posto accanto a lui cade nel pozzo.
    pet.position = new Vec2(300, 300);
    hold(match, new Map([['archer', archer]]), 3, () => {
      expect(chasmAt(river, pet.position, 7.9)).toBeUndefined();
    });
    expect(pet.position.distanceTo(archer)).toBeLessThan(100);
    // Dopo un'uccisione non salta su un pipistrello che vola sopra il pozzo.
    const walker = Object.values(MINIONS).find((d) => !d.flying && !d.dormant && !d.burrow)!;
    const first = match.spawnMinion(walker, new Vec2(300, 370), { maxHealth: 10 });
    const bat = match.spawnMinion(MINIONS.belfry_bat!, new Vec2(330, 460), { maxHealth: 1000 });
    bat.position = new Vec2(330, 460);
    pet.position = first.position;
    match.classCombat.applyHit(`minion:${first.id}`, 'archer', { mark: true });
    match.classCombat.step(0);
    expect(first.health.isDead).toBe(true);
    expect(chasmAt(river, pet.position, 7.9), `salto ${pet.position.x},${pet.position.y}`).toBeUndefined();
  });

  it('la copia di disegno vede i ripari rotti anche quando sono gia\' rotti tutti', () => {
    const match = emptyRoom(sheltered);
    match.breakCover(0, true);
    const view = new Match({ rng: new SeededRng(1), dungeon: CRYPT, loadout: MAGE_SKILLS, arena: match.arena, boss: null });
    expect(view.covers[0]!.health).toBe(0);
    expect(solidAt(view.arena, new Vec2(500, 420))).toBeUndefined();
  });

  it('le corse a terra si fermano sul bordo del pozzo; solo il balzo lo supera', () => {
    const run = sweepSolids(river, new Vec2(200, 350), new Vec2(200, 560), BODY_RADIUS.player, false);
    expect(run.y).toBeLessThan(400);
    expect(sweepSolids(river, new Vec2(200, 350), new Vec2(200, 560), BODY_RADIUS.player)).toEqual(new Vec2(200, 560));
  });
});
