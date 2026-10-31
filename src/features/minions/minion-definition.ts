import type { ProjectileSpec } from '../combat/projectile';

/**
 * Come si comporta un servitore:
 * - `chaser`: insegue il giocatore piu' vicino e lo ferisce per contatto (con l'invulnerabilita' dopo il colpo);
 * - `kamikaze`: insegue e, arrivato a contatto, esplode ferendo chi e' vicino e muore;
 * - `turret`: resta fermo e spara a intervalli verso il giocatore piu' vicino.
 */
export type MinionBehavior = 'chaser' | 'kamikaze' | 'turret';

/** Un tipo di servitore. Dati di sola lettura e provvisori (vedi docs/game-design.md). */
export interface MinionDefinition {
  /** Id stabile: lo usano rete, test e rappresentazione. */
  readonly id: string;
  /** Nome in italiano. */
  readonly name: string;
  /** Aspetto (id in `presentation/minion-art.ts`). Il prefisso del tema (`crypt_`, `swamp_`...) sceglie anche il suono. */
  readonly visual: string;
  readonly behavior: MinionBehavior;
  readonly maxHealth: number;
  /** Velocita' in unita' al secondo (zero per le torrette). */
  readonly speed: number;
  /** Raggio di colpo contro proiettili, zone e colpi ravvicinati del giocatore; anche corpo contro i pilastri. */
  readonly hitRadius: number;
  /** Danno al contatto (o dell'esplosione, per `kamikaze`). */
  readonly contactDamage: number;
  /** Solo `kamikaze`: raggio dell'esplosione attorno al servitore. */
  readonly blastRadius?: number;
  /** Solo `turret`: proiettile, intervallo tra i colpi e attesa prima del primo. */
  readonly shot?: { readonly projectile: ProjectileSpec; readonly interval: number; readonly firstDelay: number };
}

/** Quando e quanti servitori evoca un boss. Provvisorio. */
export interface BossSummons {
  readonly minion: MinionDefinition;
  /** Quanti ne evoca entrando in furia (fase 2). */
  readonly onRage: number;
  /** In furia, ogni quanti attacchi ne evoca altri `wave`. */
  readonly everyAttacks: number;
  readonly wave: number;
  /** Mai piu' di questi vivi insieme. */
  readonly maxAlive: number;
  /** Distanza dal boss a cui compaiono (in cerchio). */
  readonly ringRadius: number;
}
