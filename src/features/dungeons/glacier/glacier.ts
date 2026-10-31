import { Vec2 } from '../../../core/vec2';
import type { ArenaDefinition, Pillar } from '../../arena/arena';
import type { DungeonDefinition } from '../dungeon-definition';
import { FROST_WARDEN } from './frost-warden';

/**
 * Colonne di cristallo del ghiacciaio: 7, sparse con intenzione e non simmetriche. Una grande al centro (il riparo
 * principale, ma il boss si teletrasporta e non ha bisogno di girarci attorno), due coppie ai lati che formano
 * corridoi dove i proiettili si accumulano, e una colonna isolata a nord-ovest per rompere la linea di tiro iniziale.
 * Provvisorie come ogni valore di gioco (vedi docs/game-design.md).
 */
export const GLACIER_PILLARS: readonly Pillar[] = [
  { position: new Vec2(1500, 1500), radius: 115 },
  { position: new Vec2(1180, 1020), radius: 80 },
  { position: new Vec2(1880, 980), radius: 75 },
  { position: new Vec2(780, 1620), radius: 70 },
  { position: new Vec2(2180, 1540), radius: 70 },
  { position: new Vec2(1130, 2080), radius: 85 },
  { position: new Vec2(1940, 2060), radius: 90 },
];

/** La mappa: un campo di ghiaccio quadrato, il piu' grande dei dungeon; il giocatore parte a sud, il boss a nord. */
export const GLACIER_ARENA: ArenaDefinition = {
  id: 'glacier',
  name: 'Il ghiacciaio eterno',
  theme: 'glacier',
  width: 3000,
  height: 3000,
  wallThickness: 28,
  playerSpawn: new Vec2(1500, 2420),
  bossSpawn: new Vec2(1500, 640),
  playerMargin: 40,
  bossMargin: 60,
  projectileMargin: 24,
  pillars: GLACIER_PILLARS,
};

export const GLACIER: DungeonDefinition = {
  id: 'glacier',
  name: 'Il ghiacciaio eterno',
  tagline: 'Il gelo non perdona, il suo custode ancora meno.',
  description:
    "Un fiume di ghiaccio antico come le montagne, attraversato da colonne di cristallo che spezzano il vento. " +
    'Il Custode del ghiaccio non insegue: sparisce e riappare. Cerca riparo dietro i cristalli, leggi i segnali a terra e non fermarti mai.',
  danger: 4,
  arena: GLACIER_ARENA,
  boss: FROST_WARDEN,
};
