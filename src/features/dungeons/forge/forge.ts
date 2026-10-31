import { Vec2 } from '../../../core/vec2';
import type { ArenaDefinition } from '../../arena/arena';
import type { DungeonDefinition } from '../dungeon-definition';
import { FORGE_COLOSSUS } from './forge-colossus';

/**
 * La fucina: una mappa larga e bassa (3600 x 2200), una sala lunga di corridoi di fuoco. Provvisoria (vedi
 * docs/game-design.md). I pilastri di ferro sono ripari da cui sparare e ostacoli per le schegge; il boss li ignora:
 *  - due pilastri a sinistra (sopra e sotto la linea di partenza) e due a destra (ai lati del boss) fanno da ripari;
 *  - un blocco di tre al centro (incudine grande e due piu' piccole) spezza la linea di tiro tra le partenze,
 *    con corsie larghe tra un pilastro e l'altro;
 *  - uno dietro il boss serve a chi lo aggira.
 */
export const FORGE_ARENA: ArenaDefinition = {
  id: 'forge',
  name: 'La fucina in rovina',
  theme: 'forge',
  width: 3600,
  height: 2200,
  wallThickness: 30,
  playerSpawn: new Vec2(1100, 1100),
  bossSpawn: new Vec2(2400, 1100),
  playerMargin: 44,
  bossMargin: 90,
  projectileMargin: 28,
  pillars: [
    { position: new Vec2(1100, 540), radius: 70 },
    { position: new Vec2(1100, 1660), radius: 70 },
    { position: new Vec2(1750, 1100), radius: 85 },
    { position: new Vec2(1750, 640), radius: 60 },
    { position: new Vec2(1750, 1560), radius: 60 },
    { position: new Vec2(2400, 500), radius: 70 },
    { position: new Vec2(2400, 1700), radius: 70 },
    { position: new Vec2(3050, 1100), radius: 75 },
  ],
};

export const FORGE: DungeonDefinition = {
  id: 'forge',
  name: 'La fucina in rovina',
  tagline: 'Il ferro non dimentica il fuoco.',
  description:
    'Una sala lunga e bassa dove le fornaci non si sono mai spente. Tra incudini spezzate e pilastri di ferro annerito, ' +
    'il Colosso della Fornace batte il tempo con i suoi pugni: schiva le colate di lava, usa i pilastri per ripararti dalle braci e ' +
    'non farti trovare fermo quando solleva il martello.',
  danger: 3,
  arena: FORGE_ARENA,
  boss: FORGE_COLOSSUS,
};
