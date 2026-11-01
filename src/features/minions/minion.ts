import type { Vec2 } from '../../core/vec2';
import { Health } from '../combat/health';
import { ELITES, type EliteId, type EliteModifier } from './elites';
import type { MinionDefinition } from './minion-definition';

/**
 * Fase del comportamento di un servitore:
 * - `idle`: si muove e attacca secondo il suo tipo;
 * - `windup`: annuncia un attacco (carica, salto, raffica, teletrasporto) e quasi non si muove;
 * - `dash`: scatta in linea retta (carica);
 * - `airborne`: e' in volo verso il punto d'atterraggio (salto);
 * - `recover`: si riprende dopo la carica, fermo e vulnerabile;
 * - `dormant`: addormentato, sembra arredo;
 * - `burrowed` / `emerging` / `exposed`: sotto terra, mentre emerge, scoperto;
 * - `reviving`: a terra, sta per rialzarsi.
 */
export type MinionState = 'idle' | 'windup' | 'dash' | 'airborne' | 'recover' | 'dormant' | 'burrowed' | 'emerging' | 'exposed' | 'reviving';

/** Opzioni di comparsa: vita propria della stanza, variante d'elite, genitore (per i nidi), preda della Caccia. */
export interface MinionOptions {
  readonly maxHealth?: number;
  readonly elite?: EliteId | null;
  readonly parentId?: number | null;
  /** Conta per la fine della stanza (i servitori generati dai nidi si'; i figli muoiono comunque con la stanza). */
  readonly hostile?: boolean;
  /** Il bersaglio della stanza Caccia: fugge invece di attaccare. */
  readonly prey?: boolean;
  /** `maxHealth` e' gia' quella finale (copie di rete): l'elite non la moltiplica di nuovo. */
  readonly exactHealth?: boolean;
}

/** Un servitore in partita: stato variabile. I dati stanno in `MinionDefinition`. */
export class Minion {
  position: Vec2;
  readonly health: Health;
  /** Secondi al prossimo colpo (raffiche). */
  shotTimer: number;
  /** Secondi alla prossima abilita' (carica, salto, lancio, generazione, scudo, teletrasporto). */
  abilityTimer: number;
  state: MinionState = 'idle';
  /** Secondi rimasti nella fase corrente (`windup`, `dash`, `recover`, `emerging`, `exposed`, `reviving`, `airborne`). */
  stateTimer = 0;
  /** Che cosa sta annunciando in `windup`. */
  pending: 'shot' | 'charge' | 'leap' | 'blink' | null = null;
  /** Punto di arrivo di carica, salto o teletrasporto; punto di partenza della carica. */
  target: Vec2 | null = null;
  origin: Vec2 | null = null;
  /** Angolo di riferimento (ondeggiamento dei volanti, giro degli orbitanti, rotazione dell'anello). */
  heading: number;
  /** Scudo dei sostegni: assorbe i danni dei proiettili. */
  shield = 0;
  /** Scudo dell'elite Schermato: ferma i proiettili finche' una zona o un colpo ravvicinato non lo rompe. */
  warded: boolean;
  /** Secondi di rallentamento rimasti (gelo del giocatore). */
  slowFor = 0;
  rootFor = 0;
  /** Secondi di vita: non spara nei primi istanti. */
  age = 0;
  /** Gia' rialzato una volta (scheletri). */
  revived = false;
  /** Tiene un gettone d'attacco del gruppo. */
  hasToken = false;
  /** Secondi alla prossima zona della scia. */
  trailTimer = 0;
  /** Distanza percorsa dall'ultima zona lasciata durante la carica. */
  chargeTrail = 0;
  /** Quante raffiche ha sparato (rotazione del varco). */
  volleys = 0;
  readonly elite: EliteModifier | null;
  readonly parentId: number | null;
  readonly hostile: boolean;
  readonly prey: boolean;

  constructor(
    readonly id: number,
    readonly definition: MinionDefinition,
    position: Vec2,
    options: MinionOptions = {},
  ) {
    this.position = position;
    this.elite = options.elite ? ELITES[options.elite] : null;
    const base = options.maxHealth ?? definition.maxHealth;
    this.health = new Health(Math.max(1, Math.round(base * (options.exactHealth ? 1 : this.elite?.healthMultiplier ?? 1))));
    this.shotTimer = definition.shot?.firstDelay ?? 0;
    this.abilityTimer = firstAbilityDelay(definition);
    this.heading = (id * 2.399) % (Math.PI * 2);
    this.warded = this.elite?.warded === true;
    this.parentId = options.parentId ?? null;
    this.hostile = options.hostile ?? true;
    this.prey = options.prey === true;
    if (definition.dormant !== undefined) this.state = 'dormant';
    if (definition.burrow !== undefined) this.state = 'burrowed';
  }

  get isDead(): boolean {
    return this.health.isDead && this.state !== 'reviving';
  }

  get hitRadius(): number {
    return this.definition.hitRadius;
  }

  /** Sotto terra o a terra in attesa di rialzarsi: non si colpisce e non colpisce. */
  get isHidden(): boolean {
    return this.state === 'burrowed' || this.state === 'reviving';
  }

  /** Velocita' attuale: elite, gelo. */
  get speed(): number {
    return this.definition.speed * (this.elite?.speedMultiplier ?? 1) * (this.slowFor > 0 ? 0.5 : 1);
  }

  /** Moltiplicatore degli intervalli di attacco (elite Rapido). */
  get cadence(): number {
    return this.elite?.cadence ?? 1;
  }
}

/** Attesa prima della prima abilita', dai dati del tipo. */
function firstAbilityDelay(definition: MinionDefinition): number {
  if (definition.nest) return definition.nest.firstDelay;
  if (definition.lob) return definition.lob.firstDelay;
  if (definition.aura) return definition.aura.interval * 0.5;
  if (definition.charge) return definition.charge.cooldown * 0.5;
  if (definition.leap) return definition.leap.cooldown * 0.5;
  return 0;
}
