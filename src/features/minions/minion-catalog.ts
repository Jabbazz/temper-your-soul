import type { BossSummons, MinionDefinition } from './minion-definition';

/*
 * I servitori dei quattro boss e quando arrivano. Pochi, deboli e leggibili: compaiono al passaggio in furia e ogni
 * qualche attacco in furia, per far scegliere fra colpire il boss e liberarsi lo spazio. Tutti i valori sono
 * provvisori (proposta in docs/studio-combattimento-e-vittoria.md, da tarare con la prova manuale).
 */

/** Cripta: braci del guardiano che inseguono e scoppiano a contatto. */
export const CINDER_WISP: MinionDefinition = {
  id: 'cinder_wisp',
  name: 'Fuoco fatuo di brace',
  visual: 'crypt_wisp',
  behavior: 'kamikaze',
  maxHealth: 60,
  speed: 120,
  hitRadius: 10,
  contactDamage: 14,
  blastRadius: 34,
};

/** Palude: funghetti lenti e coriacei che si attaccano al giocatore. */
export const SPORELING: MinionDefinition = {
  id: 'sporeling',
  name: 'Sporello',
  visual: 'swamp_sporeling',
  behavior: 'chaser',
  maxHealth: 90,
  speed: 72,
  hitRadius: 11,
  contactDamage: 10,
};

/** Fucina: folletti di scoria veloci e fragili che si lanciano contro il giocatore. */
export const SLAG_IMP: MinionDefinition = {
  id: 'slag_imp',
  name: 'Folletto di scoria',
  visual: 'forge_imp',
  behavior: 'kamikaze',
  maxHealth: 50,
  speed: 165,
  hitRadius: 9,
  contactDamage: 16,
  blastRadius: 38,
};

/** Ghiacciaio: sentinelle di brina immobili che tirano schegge lente. */
export const FROST_SENTINEL: MinionDefinition = {
  id: 'frost_sentinel',
  name: 'Sentinella di brina',
  visual: 'glacier_sentinel',
  behavior: 'turret',
  maxHealth: 110,
  speed: 0,
  hitRadius: 12,
  contactDamage: 8,
  shot: {
    projectile: { team: 'enemy', speed: 210, damage: 10, radius: 6, lifetime: 4, visual: 'glacier_shard' },
    interval: 1.9,
    firstDelay: 1.2,
  },
};

/** Tutti i servitori, per id (la rete li ritrova cosi'). */
export const MINIONS: Readonly<Record<string, MinionDefinition>> = {
  [CINDER_WISP.id]: CINDER_WISP,
  [SPORELING.id]: SPORELING,
  [SLAG_IMP.id]: SLAG_IMP,
  [FROST_SENTINEL.id]: FROST_SENTINEL,
};

export const GUARDIAN_SUMMONS: BossSummons = { minion: CINDER_WISP, onRage: 3, everyAttacks: 4, wave: 2, maxAlive: 4, ringRadius: 70 };
export const SPORE_MOTHER_SUMMONS: BossSummons = { minion: SPORELING, onRage: 4, everyAttacks: 4, wave: 2, maxAlive: 6, ringRadius: 80 };
export const FORGE_COLOSSUS_SUMMONS: BossSummons = { minion: SLAG_IMP, onRage: 3, everyAttacks: 4, wave: 2, maxAlive: 4, ringRadius: 90 };
export const FROST_WARDEN_SUMMONS: BossSummons = { minion: FROST_SENTINEL, onRage: 2, everyAttacks: 5, wave: 1, maxAlive: 3, ringRadius: 160 };
