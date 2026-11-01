import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import { chasmAt, detourAround, pillarAt, pushOutOfPillars, solidAt, solidBetween, sweepSolids, type ArenaDefinition } from '../arena/arena';
import { BODY_RADIUS } from '../combat/collision';
import { DUNGEONS, dungeonById } from '../dungeons/dungeons';
import { Match, type PlayerIntent } from '../match/match';
import { MINIONS } from '../minions/minion-catalog';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { STEP } from '../../testing';
import { ROOM_LAYOUT, roomArena, roomDoors, roomTemplateById, ROOM_TEMPLATES, spawnPoints, type RoomTemplate } from './room-templates';

/*
 * Le stanze con i massicci (fase 3 del compito grafico): collisioni, stanze valide e raggiungibili, servitori che
 * girano attorno ai blocchi invece di restarci incastrati.
 */

const idle: PlayerIntent = { move: Vec2.ZERO, aimOffset: new Vec2(100, 0), skills: [false, false, false, false] };

/** Un'arena di prova 1000 x 800 con un massiccio al centro. */
const block: ArenaDefinition = {
  id: 'prova',
  name: 'Prova',
  theme: 'crypt',
  width: 1000,
  height: 800,
  wallThickness: 24,
  playerSpawn: new Vec2(500, 700),
  bossSpawn: new Vec2(500, 200),
  playerMargin: 40,
  bossMargin: 60,
  projectileMargin: 24,
  pillars: [],
  solids: [{ x: 400, y: 300, width: 200, height: 200 }],
};

describe('massicci: collisioni', () => {
  it('solidAt e solidBetween vedono il blocco e lo spazio attorno', () => {
    expect(solidAt(block, new Vec2(500, 400))).toBeDefined();
    expect(solidAt(block, new Vec2(390, 400))).toBeUndefined();
    expect(solidAt(block, new Vec2(390, 400), 12)).toBeDefined();
    expect(solidBetween(block, new Vec2(500, 100), new Vec2(500, 700))).toBeDefined();
    expect(solidBetween(block, new Vec2(300, 100), new Vec2(300, 700))).toBeUndefined();
    // Un segmento che tocca solo l'angolo in diagonale fuori dal blocco non e' bloccato.
    expect(solidBetween(block, new Vec2(380, 280), new Vec2(200, 100))).toBeUndefined();
  });

  it('un corpo esce dal blocco dal lato piu\' vicino e ci scivola lungo', () => {
    const inside = pushOutOfPillars(block, new Vec2(410, 400), BODY_RADIUS.player);
    expect(inside.x).toBeCloseTo(400 - BODY_RADIUS.player);
    expect(inside.y).toBeCloseTo(400);
    const touching = pushOutOfPillars(block, new Vec2(500, 295), BODY_RADIUS.player);
    expect(touching.y).toBeCloseTo(300 - BODY_RADIUS.player);
    expect(touching.x).toBeCloseTo(500);
  });

  it('lo scatto si ferma davanti al blocco; senza massicci arriva dove mira', () => {
    const stop = sweepSolids(block, new Vec2(500, 100), new Vec2(500, 700), BODY_RADIUS.player);
    expect(stop.y).toBeLessThan(300 - BODY_RADIUS.player + 0.01);
    expect(stop.y).toBeGreaterThan(300 - BODY_RADIUS.player - 9);
    const open = { ...block, solids: [] };
    expect(sweepSolids(open, new Vec2(500, 100), new Vec2(500, 700), BODY_RADIUS.player)).toEqual(new Vec2(500, 700));
  });

  it('la deviazione va dritta se la strada e\' libera, altrimenti verso un angolo da cui la meta si vede', () => {
    const free = new Vec2(300, 700);
    expect(detourAround(block, new Vec2(300, 100), free, 10)).toBe(free);
    const target = new Vec2(500, 700);
    const corner = detourAround(block, new Vec2(500, 280), target, 10);
    expect(corner).not.toBe(target);
    expect(solidBetween(block, new Vec2(500, 280), corner)).toBeUndefined();
    // Dall'angolo in alto la meta sotto il blocco non si vede ancora: dall'angolo dopo, si'.
    const next = detourAround(block, corner, target, 10);
    expect(solidBetween(block, next, target)).toBeUndefined();
  });
});

/**
 * Vero se la cella e' libera per il corpo del giocatore: dentro i margini, fuori da pilastri, massicci e pozzi, e senza
 * rompere nessun riparo (porte e comparse devono restare raggiungibili anche con tutti i ripari in piedi).
 */
function walkable(arena: ArenaDefinition, point: Vec2): boolean {
  const margin = arena.playerMargin;
  if (point.x < margin || point.x > arena.width - margin || point.y < margin || point.y > arena.height - margin) return false;
  const coverAt = (arena.covers ?? []).some((cover) => solidAt({ ...arena, solids: [cover] }, point, BODY_RADIUS.player) !== undefined);
  return pillarAt(arena, point, BODY_RADIUS.player) === undefined && solidAt(arena, point, BODY_RADIUS.player) === undefined
    && chasmAt(arena, point, BODY_RADIUS.player) === undefined && !coverAt;
}

/** Le celle (passo `cell`) raggiungibili a piedi dall'ingresso. */
function reachable(arena: ArenaDefinition, cell: number): Set<string> {
  const key = (x: number, y: number): string => `${x},${y}`;
  const start = [Math.round(arena.playerSpawn.x / cell), Math.round(arena.playerSpawn.y / cell)] as const;
  const seen = new Set([key(...start)]);
  const queue: (readonly [number, number])[] = [start];
  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (seen.has(key(nx, ny)) || !walkable(arena, new Vec2(nx * cell, ny * cell))) continue;
      seen.add(key(nx, ny));
      queue.push([nx, ny]);
    }
  }
  return seen;
}

const shaped = (dungeonId: string): RoomTemplate[] => (ROOM_TEMPLATES[dungeonId] ?? []).filter((room) => (room.solids?.length ?? 0) > 0);

describe('stanze con le forme', () => {
  it('ogni dungeon ha almeno due stanze di scontro con i massicci', () => {
    for (const dungeon of DUNGEONS) {
      const rooms = shaped(dungeon.id);
      expect(rooms.length, dungeon.id).toBeGreaterThanOrEqual(2);
      for (const room of rooms) expect(room.use, room.id).toBe('combat');
    }
  });

  for (const dungeon of DUNGEONS) {
    it(`${dungeon.id}: massicci dentro i muri, varchi larghi, porte e ingresso liberi`, () => {
      const gap = 2 * BODY_RADIUS.player;
      const wall = ROOM_LAYOUT.wallThickness;
      for (const room of shaped(dungeon.id)) {
        const arena = roomArena(room, dungeon.arena.theme);
        const solids = room.solids!;
        for (const solid of solids) {
          expect(solid.width, room.id).toBeGreaterThan(0);
          expect(solid.height, room.id).toBeGreaterThan(0);
          // Ogni lato e' addossato al muro oppure lascia un passaggio comodo: niente sacche dove incastrarsi.
          const sides = [solid.x, room.width - solid.x - solid.width, solid.y, room.height - solid.y - solid.height];
          for (const side of sides) expect(side <= wall || side >= arena.playerMargin + 4 * gap, `${room.id}: lato vicino al muro (${side})`).toBe(true);
          for (const pillar of room.pillars) {
            const nearest = new Vec2(
              Math.min(Math.max(pillar.position.x, solid.x), solid.x + solid.width),
              Math.min(Math.max(pillar.position.y, solid.y), solid.y + solid.height),
            );
            expect(nearest.distanceTo(pillar.position) - pillar.radius, `${room.id}: pilastro attaccato a un massiccio`).toBeGreaterThanOrEqual(4 * gap);
          }
        }
        expect(solidAt(arena, arena.playerSpawn, BODY_RADIUS.player + 120), `${room.id}: ingresso`).toBeUndefined();
        expect(solidAt(arena, arena.bossSpawn, 60), `${room.id}: centro`).toBeUndefined();
        for (const count of [1, 2, 3]) {
          for (const door of roomDoors(room, count)) {
            expect(solidAt(arena, door.position, door.halfWidth + 40), `${room.id}: porta ${door.index + 1}/${count}`).toBeUndefined();
          }
        }
        for (const point of spawnPoints(room)) expect(solidAt(arena, point, ROOM_LAYOUT.spawnFromPillar), room.id).toBeUndefined();
      }
    });
  }

  it('in ogni stanza (con e senza massicci) si arriva a piedi a tutte le porte e a tutti i punti di comparsa', () => {
    const cell = 20;
    for (const dungeon of DUNGEONS) {
      for (const room of ROOM_TEMPLATES[dungeon.id] ?? []) {
        const arena = roomArena(room, dungeon.arena.theme);
        const seen = reachable(arena, cell);
        const near = (point: Vec2): boolean => {
          const x = Math.round(point.x / cell);
          const y = Math.round(point.y / cell);
          for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (seen.has(`${x + dx},${y + dy}`)) return true;
          return false;
        };
        for (const door of roomDoors(room, 3)) expect(near(door.position.add(new Vec2(0, door.depth))), `${room.id}: porta ${door.index + 1}`).toBe(true);
        for (const point of spawnPoints(room)) expect(near(point), `${room.id}: comparsa ${point.x},${point.y}`).toBe(true);
        expect(near(arena.bossSpawn), `${room.id}: centro`).toBe(true);
      }
    }
  });
});

/** Una stanza con le forme vuota (senza regista), con il giocatore fermo in `player`. */
function shapedRoom(templateId: string, player: Vec2): Match {
  const template = roomTemplateById(templateId)!;
  const dungeon = dungeonById(template.dungeonId)!;
  const match = new Match({ rng: new SeededRng(4), dungeon, loadout: MAGE_SKILLS, arena: roomArena(template, dungeon.arena.theme), boss: null });
  match.player.position = player;
  return match;
}

/** Fa avanzare la partita con il giocatore fermo e invulnerabile; `each` dopo ogni passo. */
function run(match: Match, seconds: number, each: () => void = () => {}): void {
  const position = match.player.position;
  for (let i = 0; i < seconds * 60; i++) {
    match.player.health.current = match.player.health.max;
    match.player.invulnerableFor = 1;
    match.player.position = position;
    match.step(STEP, idle);
    each();
  }
}

describe('servitori nelle stanze con le forme', () => {
  it('chi insegue gira attorno al massiccio della strettoia e raggiunge il giocatore', () => {
    // Strettoia della palude: blocco di sinistra da (24, 560) a (760, 820). Servitore sopra, giocatore sotto.
    const match = shapedRoom('swamp_narrows', new Vec2(390, 1000));
    const minion = match.spawnMinion(MINIONS.sporeling!, new Vec2(390, 470));
    let closest = Infinity;
    run(match, 40, () => (closest = Math.min(closest, minion.position.distanceTo(match.player.position))));
    expect(closest).toBeLessThan(minion.hitRadius + 30);
  });

  it('chi tiene la distanza non spara contro il massiccio: gli gira attorno finche\' non vede il bersaglio', () => {
    const match = shapedRoom('glacier_gorge', new Vec2(400, 1050));
    const minion = match.spawnMinion(MINIONS.frost_apprentice!, new Vec2(400, 500));
    const seen = new Set<number>();
    let hiddenShots = 0;
    let sawTarget = false;
    run(match, 30, () => {
      const hidden = solidBetween(match.arena, minion.position, match.player.position) !== undefined;
      if (!hidden) sawTarget = true;
      for (const projectile of match.projectiles) {
        if (projectile.team !== 'enemy' || seen.has(projectile.id)) continue;
        seen.add(projectile.id);
        // Il colpo appena partito dietro il blocco non deve esserci.
        if (hidden && !sawTarget) hiddenShots++;
      }
    });
    expect(sawTarget).toBe(true);
    expect(hiddenShots).toBe(0);
    expect(seen.size).toBeGreaterThan(0);
  });

  it('nelle stanze senza massicci il percorso non cambia (deviazione = meta)', () => {
    const template = ROOM_TEMPLATES.crypt!.find((room) => room.solids === undefined)!;
    const arena = roomArena(template, 'crypt');
    const goal = new Vec2(900, 300);
    expect(detourAround(arena, new Vec2(200, 900), goal, 12)).toBe(goal);
  });
});

describe('massicci: casi trovati dalla revisione', () => {
  it('un corpo dentro un blocco addossato al muro esce verso la stanza, non dentro il muro', () => {
    const arena = roomArena(roomTemplateById('swamp_banks')!, 'swamp');
    const out = pushOutOfPillars(arena, new Vec2(45, 450), BODY_RADIUS.player);
    expect(solidAt(arena, out)).toBeUndefined();
    expect(out.x).toBeGreaterThanOrEqual(arena.playerMargin);
    expect(out.y).toBeGreaterThanOrEqual(arena.playerMargin);
  });

  it('chi insegue fra due nicchie non resta incastrato contro il blocco vicino', () => {
    const match = shapedRoom('glacier_seracs', new Vec2(130, 250));
    const ermine = match.spawnMinion(MINIONS.ermine!, new Vec2(130, 1000));
    let closest = Infinity;
    run(match, 12, () => (closest = Math.min(closest, ermine.position.distanceTo(match.player.position))));
    expect(closest).toBeLessThan(ermine.hitRadius + 30);
  });

  it('lo scatto di traverso contro una faccia scivola lungo il blocco invece di fermarsi', () => {
    const arena = roomArena(roomTemplateById('crypt_elbow')!, 'crypt');
    // Il blocco del gomito parte da (1240, 760): il giocatore e' appoggiato alla sua faccia sinistra.
    const from = new Vec2(1240 - BODY_RADIUS.player, 900);
    for (const direction of [new Vec2(0.995, 0.1), new Vec2(0.894, -0.447)]) {
      const to = from.add(direction.normalized().mul(200));
      const end = sweepSolids(arena, from, to, BODY_RADIUS.player);
      expect(end.distanceTo(from), `${direction.x},${direction.y}`).toBeGreaterThan(15);
      expect(solidAt(arena, end, BODY_RADIUS.player - 0.01)).toBeUndefined();
    }
  });

  it('lo scavatore non emerge dentro un massiccio vicino al muro', () => {
    const match = shapedRoom('swamp_narrows', new Vec2(70, 900));
    const worm = match.spawnMinion(MINIONS.root_worm!, new Vec2(400, 1100));
    let inside = 0;
    run(match, 20, () => {
      if (!worm.isHidden && solidAt(match.arena, worm.position) !== undefined) inside++;
    });
    expect(inside).toBe(0);
  });
});
