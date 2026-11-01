import { Vec2 } from '../../core/vec2';
import type { ArenaDefinition, ArenaThemeId, Pillar } from '../arena/arena';

/*
 * Stanze modello della discesa, fatte a mano: forma, ripari e uso. Il seme della discesa sceglie quali usare; il
 * regista le riempie di servitori. Coordinate in unita' del mondo, origine in alto a sinistra; l'ingresso e' in basso
 * al centro, le porte d'uscita sul muro in alto. Valori provvisori.
 */

/** A che cosa serve una stanza: combattimento (ripari sparsi) o calma (luogotenente, santuario, anticamera, forziere). */
export type RoomUse = 'combat' | 'calm';

export interface RoomTemplate {
  /** Id stabile (rete, test). */
  readonly id: string;
  readonly dungeonId: string;
  /** Nome della stanza (in italiano). */
  readonly name: string;
  readonly use: RoomUse;
  readonly width: number;
  readonly height: number;
  readonly pillars: readonly Pillar[];
}

/** Una porta d'uscita sul muro in alto: il gruppo ci si ferma sopra per attraversarla. */
export interface RoomDoor {
  readonly index: number;
  /** Centro della soglia, appena dentro il muro. */
  readonly position: Vec2;
  readonly halfWidth: number;
  readonly depth: number;
}

/** Misure comuni delle stanze. Provvisorie. */
export const ROOM_LAYOUT = {
  wallThickness: 24,
  playerMargin: 40,
  bossMargin: 60,
  projectileMargin: 24,
  /** Distanza dell'ingresso dal muro in basso. */
  entranceInset: 120,
  doorHalfWidth: 58,
  doorDepth: 86,
  /** Griglia dei punti di comparsa e distanze da rispettare. */
  spawnStep: 150,
  spawnInset: 110,
  spawnFromEntrance: 260,
  spawnFromPillar: 40,
  spawnFromDoors: 190,
} as const;

const pillar = (x: number, y: number, radius: number): Pillar => ({ position: new Vec2(x, y), radius });

const template = (
  dungeonId: string,
  id: string,
  name: string,
  use: RoomUse,
  width: number,
  height: number,
  pillars: readonly Pillar[],
): RoomTemplate => ({ id: `${dungeonId}_${id}`, dungeonId, name, use, width, height, pillars });

const ring = (cx: number, cy: number, radius: number, count: number, size: number): Pillar[] =>
  Array.from({ length: count }, (_, i) => pillar(Math.round(cx + Math.cos((i * Math.PI * 2) / count) * radius), Math.round(cy + Math.sin((i * Math.PI * 2) / count) * radius), size));

export const ROOM_TEMPLATES: Readonly<Record<string, readonly RoomTemplate[]>> = {
  crypt: [
    template('crypt', 'nave', 'Navata', 'combat', 2000, 1300, [520, 840, 1160, 1480].flatMap((x) => [pillar(x, 440, 34), pillar(x, 860, 34)])),
    template('crypt', 'chapel', 'Cappella laterale', 'combat', 1700, 1150, [pillar(560, 420, 44), pillar(1140, 420, 44), pillar(560, 760, 44), pillar(1140, 760, 44)]),
    template('crypt', 'ossuary', 'Ossario', 'combat', 2200, 1400, [
      pillar(400, 350, 30), pillar(900, 500, 30), pillar(1500, 380, 30), pillar(1850, 620, 30), pillar(700, 950, 30), pillar(1500, 900, 30),
    ]),
    template('crypt', 'cloister', 'Chiostro', 'combat', 1900, 1300, ring(950, 620, 300, 8, 30)),
    template('crypt', 'undercroft', 'Cripta bassa', 'combat', 2300, 1100, [pillar(650, 520, 60), pillar(1150, 520, 60), pillar(1650, 520, 60)]),
    template('crypt', 'altar', 'Altare', 'calm', 1700, 1300, [pillar(350, 350, 40), pillar(1350, 350, 40), pillar(350, 950, 40), pillar(1350, 950, 40)]),
  ],
  swamp: [
    template('swamp', 'mire', 'Acquitrino', 'combat', 2000, 1400, [pillar(500, 450, 60), pillar(1450, 420, 52), pillar(980, 700, 70), pillar(560, 1000, 48), pillar(1500, 1000, 58)]),
    template('swamp', 'roots', 'Radici', 'combat', 2200, 1300, [pillar(420, 620, 56), pillar(900, 380, 64), pillar(1300, 760, 72), pillar(1800, 460, 50), pillar(1750, 1000, 46)]),
    template('swamp', 'pool', 'Pozza nera', 'combat', 1800, 1200, [pillar(900, 560, 90), pillar(380, 330, 40), pillar(1420, 330, 40)]),
    template('swamp', 'hollow', 'Conca', 'combat', 2300, 1450, [
      pillar(380, 380, 44), pillar(820, 620, 52), pillar(1250, 380, 60), pillar(1700, 700, 48), pillar(2000, 360, 40), pillar(560, 1050, 54), pillar(1700, 1120, 46),
    ]),
    template('swamp', 'bank', 'Argine', 'combat', 1700, 1300, [pillar(450, 500, 50), pillar(1250, 500, 50)]),
    template('swamp', 'glade', 'Radura', 'calm', 1800, 1300, [pillar(420, 420, 40), pillar(1380, 420, 40), pillar(900, 300, 40)]),
  ],
  forge: [
    template('forge', 'foundry', 'Fonderia', 'combat', 2200, 1300, [
      pillar(550, 450, 44), pillar(1100, 450, 44), pillar(1650, 450, 44), pillar(820, 850, 44), pillar(1380, 850, 44),
    ]),
    template('forge', 'anvils', 'Sala delle incudini', 'combat', 1900, 1200, [pillar(620, 600, 52), pillar(1280, 600, 52)]),
    template('forge', 'channels', 'Canali di colata', 'combat', 2300, 1200, [
      pillar(460, 380, 36), pillar(460, 820, 36), pillar(1150, 600, 48), pillar(1840, 380, 36), pillar(1840, 820, 36),
    ]),
    template('forge', 'bellows', 'Mantici', 'combat', 2000, 1400, [pillar(500, 500, 40), pillar(1500, 500, 40), pillar(1000, 800, 56)]),
    template('forge', 'cinders', 'Cenere', 'combat', 1700, 1100, [pillar(450, 450, 40), pillar(1250, 450, 40)]),
    template('forge', 'crucible', 'Sala del crogiolo', 'calm', 1800, 1300, [pillar(380, 360, 40), pillar(1420, 360, 40), pillar(380, 950, 40), pillar(1420, 950, 40)]),
  ],
  glacier: [
    template('glacier', 'hall', 'Sala di cristallo', 'combat', 2000, 1300, [
      pillar(500, 420, 40), pillar(1000, 380, 46), pillar(1500, 420, 40), pillar(700, 860, 36), pillar(1300, 860, 36),
    ]),
    template('glacier', 'crevasse', 'Crepaccio', 'combat', 2300, 1200, [pillar(700, 600, 50), pillar(1150, 420, 40), pillar(1600, 600, 50)]),
    template('glacier', 'circle', 'Cerchio di colonne', 'combat', 1900, 1400, ring(950, 650, 320, 6, 32)),
    template('glacier', 'drift', 'Cumuli', 'combat', 2200, 1400, [pillar(400, 400, 34), pillar(850, 700, 42), pillar(1350, 400, 34), pillar(1800, 750, 42), pillar(1500, 1050, 34)]),
    template('glacier', 'cave', 'Grotta azzurra', 'combat', 1700, 1150, [pillar(480, 400, 42), pillar(1220, 400, 42)]),
    template('glacier', 'throne', 'Aula del maestro', 'calm', 1800, 1300, [pillar(420, 380, 36), pillar(1380, 380, 36), pillar(420, 920, 36), pillar(1380, 920, 36)]),
  ],
};

/** Una stanza modello per id. */
export function roomTemplateById(id: string): RoomTemplate | undefined {
  for (const list of Object.values(ROOM_TEMPLATES)) {
    const found = list.find((room) => room.id === id);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** La mappa giocabile di una stanza: stesse regole delle arene dei boss, con il tema del dungeon. */
export function roomArena(room: RoomTemplate, theme: ArenaThemeId): ArenaDefinition {
  return {
    id: room.id,
    name: room.name,
    theme,
    width: room.width,
    height: room.height,
    wallThickness: ROOM_LAYOUT.wallThickness,
    playerSpawn: new Vec2(Math.round(room.width / 2), room.height - ROOM_LAYOUT.entranceInset),
    bossSpawn: new Vec2(Math.round(room.width / 2), Math.round(room.height * 0.36)),
    playerMargin: ROOM_LAYOUT.playerMargin,
    bossMargin: ROOM_LAYOUT.bossMargin,
    projectileMargin: ROOM_LAYOUT.projectileMargin,
    pillars: room.pillars,
  };
}

/** Le porte d'uscita: `count` soglie distribuite sul muro in alto. */
export function roomDoors(room: { readonly width: number }, count: number): RoomDoor[] {
  const y = ROOM_LAYOUT.wallThickness + ROOM_LAYOUT.doorDepth / 2;
  return Array.from({ length: count }, (_, index) => ({
    index,
    position: new Vec2(Math.round((room.width * (index + 1)) / (count + 1)), y),
    halfWidth: ROOM_LAYOUT.doorHalfWidth,
    depth: ROOM_LAYOUT.doorDepth,
  }));
}

/** Vero se il punto sta sulla soglia della porta. */
export function onDoor(door: RoomDoor, point: Vec2): boolean {
  return Math.abs(point.x - door.position.x) <= door.halfWidth && Math.abs(point.y - door.position.y) <= door.depth / 2 + ROOM_LAYOUT.playerMargin;
}

/**
 * Punti di comparsa dei servitori: una griglia sulla stanza, lontano dall'ingresso, dai pilastri e dalle porte. Il
 * regista poi sceglie quelli lontani dai giocatori.
 */
export function spawnPoints(room: RoomTemplate): Vec2[] {
  const layout = ROOM_LAYOUT;
  const arena = roomArena(room, 'crypt');
  const doors = roomDoors(room, 3);
  const points: Vec2[] = [];
  for (let y = layout.spawnInset; y <= room.height - layout.spawnInset; y += layout.spawnStep) {
    for (let x = layout.spawnInset; x <= room.width - layout.spawnInset; x += layout.spawnStep) {
      const point = new Vec2(x, y);
      if (point.distanceTo(arena.playerSpawn) < layout.spawnFromEntrance) continue;
      if (room.pillars.some((p) => point.distanceTo(p.position) < p.radius + layout.spawnFromPillar)) continue;
      if (doors.some((door) => point.distanceTo(door.position) < layout.spawnFromDoors)) continue;
      points.push(point);
    }
  }
  return points;
}
