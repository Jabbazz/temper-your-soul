import { Vec2 } from '../../../core/vec2';
import type { ArenaDefinition, Pillar } from '../../arena/arena';
import type { DungeonDefinition } from '../dungeon-definition';
import { SPORE_MOTHER } from './spore-mother';

/**
 * Alberi morti: ripari da cui sparare e ostacoli per i proiettili (anche quelli del boss, che li ignora). Posizioni
 * provvisorie. Uno e' al centro, tra le due partenze, cosi' il boss che avanza lo attraversa e il giocatore ci si copre;
 * i due in alto a sinistra stanno a 30 unita' l'uno dall'altro (appena piu' larghi del corpo del giocatore: un passaggio
 * stretto in cui i proiettili grandi non passano); gli altri sono sparsi ai lati per avere sempre un riparo vicino.
 */
export const SWAMP_PILLARS: readonly Pillar[] = [
  { position: new Vec2(620, 640), radius: 72 },
  { position: new Vec2(725, 745), radius: 46 },
  { position: new Vec2(2140, 560), radius: 58 },
  { position: new Vec2(1400, 1400), radius: 84 },
  { position: new Vec2(560, 1520), radius: 62 },
  { position: new Vec2(2260, 1480), radius: 66 },
  { position: new Vec2(980, 2150), radius: 56 },
  { position: new Vec2(1900, 2300), radius: 72 },
];

/** Una palude quadrata e aperta: il giocatore parte a sud, il boss a nord con un albero morto in mezzo. */
export const SWAMP_ARENA: ArenaDefinition = {
  id: 'swamp',
  name: 'La palude spenta',
  theme: 'swamp',
  width: 2800,
  height: 2800,
  wallThickness: 30,
  playerSpawn: new Vec2(1400, 1950),
  bossSpawn: new Vec2(1400, 850),
  playerMargin: 40,
  bossMargin: 60,
  projectileMargin: 24,
  pillars: SWAMP_PILLARS,
};

export const SWAMP: DungeonDefinition = {
  id: 'swamp',
  name: 'La palude spenta',
  tagline: 'Qui anche la luce marcisce.',
  description:
    'Acque nere, nebbia bassa e funghi che brillano di un verde malato. La Madre delle Spore dorme tra le radici degli alberi morti: è lenta, ma ogni suo respiro riempie la palude di veleno. Non lasciarti chiudere in un angolo.',
  danger: 2,
  arena: SWAMP_ARENA,
  boss: SPORE_MOTHER,
};
