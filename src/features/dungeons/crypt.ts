import { Vec2 } from '../../core/vec2';
import type { ArenaDefinition } from '../arena/arena';
import { GUARDIAN } from '../boss/guardian';
import type { DungeonDefinition } from './dungeon-definition';

/** La cripta del prototipo: arena grande e libera, senza ostacoli. */
export const CRYPT_ARENA: ArenaDefinition = {
  id: 'crypt',
  name: 'La cripta',
  theme: 'crypt',
  width: 3200,
  height: 2400,
  wallThickness: 24,
  playerSpawn: new Vec2(1600, 1350),
  bossSpawn: new Vec2(1600, 1100),
  playerMargin: 40,
  bossMargin: 60,
  projectileMargin: 24,
  pillars: [],
};

export const CRYPT: DungeonDefinition = {
  id: 'crypt',
  name: 'La cripta',
  tagline: 'Dove tutto comincia.',
  description: "Una grande cripta senza ripari. Il guardiano veglia da secoli: schiva le sue raffiche e abbattilo.",
  danger: 1,
  arena: CRYPT_ARENA,
  boss: GUARDIAN,
};
