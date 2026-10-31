import { EQUIPMENT_SLOTS, type EquipmentSlot } from '../items/equipment-slot';
import { familyById } from '../items/item-families';
import { resolveItem, type Item, type ItemRoll } from '../items/item';
import type { Loadout } from '../skills/skill-definition';

/** Progressi in un dungeon: vittorie e miglior tempo (null finche' non si vince). */
export interface DungeonRecord {
  clears: number;
  bestTimeSeconds: number | null;
}

/** Esito della registrazione di una vittoria. La prima vittoria e' anche un nuovo record (non c'era un tempo prima). */
export interface VictoryResult {
  firstClear: boolean;
  newBest: boolean;
}

/** Quanti oggetti ha il personaggio iniziale e di che famiglie: una per slot, le quattro skill base del mago. */
const STARTER_FAMILY_IDS: readonly string[] = ['arcane_staff', 'frost_grimoire', 'meteor_mantle', 'astral_boots'];

/**
 * Il personaggio del giocatore: inventario, equipaggiamento e progressi. Stato puro, senza DOM ne' casualita'.
 *
 * - L'inventario contiene TUTTI gli oggetti posseduti, anche quelli equipaggiati: `equipped` conserva solo gli `uid`.
 * - Gli `uid` sono unici e stabili (`i1`, `i2`, ...) e non si riusano mai, nemmeno dopo uno scarto.
 * - La skill di ogni slot viene dall'oggetto equipaggiato (`loadout()`).
 */
export class Character {
  inventory: Item[] = [];
  equipped: Record<EquipmentSlot, string | null> = { primary_hand: null, secondary_hand: null, armor: null, boots: null };
  records: Record<string, DungeonRecord> = {};
  /** Il numero del prossimo `uid` da coniare. */
  nextItemNumber = 1;

  /** Il personaggio di partenza: 4 oggetti Comuni, uno per slot, gia' equipaggiati (le 4 skill base del mago). */
  static createStarter(): Character {
    const character = new Character();
    const items = character.addRolls(STARTER_FAMILY_IDS.map((familyId) => ({ familyId, rarity: 'common' as const })));
    for (const item of items) character.equip(item.uid);
    return character;
  }

  itemByUid(uid: string): Item | undefined {
    return this.inventory.find((item) => item.uid === uid);
  }

  /** L'oggetto equipaggiato nello slot, o `null` se lo slot e' vuoto. */
  equippedItem(slot: EquipmentSlot): Item | null {
    const uid = this.equipped[slot];
    return uid === null ? null : (this.itemByUid(uid) ?? null);
  }

  /**
   * Equipaggia un oggetto dell'inventario nello slot della sua famiglia; quello che c'era resta nell'inventario.
   * Restituisce false se l'oggetto non e' nell'inventario o la sua famiglia non esiste.
   */
  equip(uid: string): boolean {
    const item = this.itemByUid(uid);
    const family = item === undefined ? undefined : familyById(item.familyId);
    if (item === undefined || family === undefined) return false;
    this.equipped[family.slot] = item.uid;
    return true;
  }

  /** Svuota lo slot (l'oggetto resta nell'inventario). */
  unequip(slot: EquipmentSlot): void {
    this.equipped[slot] = null;
  }

  /** Elimina un oggetto dall'inventario. Non si scarta un oggetto equipaggiato: restituisce false (e lo stesso se non esiste). */
  discard(uid: string): boolean {
    const index = this.inventory.findIndex((item) => item.uid === uid);
    if (index < 0 || EQUIPMENT_SLOTS.some((slot) => this.equipped[slot] === uid)) return false;
    this.inventory.splice(index, 1);
    return true;
  }

  /** Le skill risolte (con i valori della rarita') per slot, nell'ordine degli slot di skill; `null` = slot vuoto. */
  loadout(): Loadout {
    return EQUIPMENT_SLOTS.map((slot) => {
      const item = this.equippedItem(slot);
      return item === null ? null : (resolveItem(item)?.skill ?? null);
    });
  }

  /** Aggiunge all'inventario gli oggetti estratti, con `uid` nuovi. Le famiglie sconosciute vengono ignorate. */
  addRolls(rolls: readonly ItemRoll[]): Item[] {
    const added: Item[] = [];
    for (const roll of rolls) {
      if (familyById(roll.familyId) === undefined) continue;
      const item: Item = { uid: `i${this.nextItemNumber}`, familyId: roll.familyId, rarity: roll.rarity };
      this.nextItemNumber += 1;
      this.inventory.push(item);
      added.push(item);
    }
    return added;
  }

  /**
   * Registra una vittoria. `firstClear`: era la prima volta in questo dungeon. `newBest`: il tempo batte il record
   * (o non c'era). Un tempo non valido (non finito o <= 0) conta la vittoria ma non tocca il record.
   */
  recordVictory(dungeonId: string, seconds: number): VictoryResult {
    const record = Object.hasOwn(this.records, dungeonId) ? this.records[dungeonId]! : { clears: 0, bestTimeSeconds: null };
    const firstClear = record.clears === 0;
    const validTime = Number.isFinite(seconds) && seconds > 0;
    const newBest = validTime && (record.bestTimeSeconds === null || seconds < record.bestTimeSeconds);
    this.records[dungeonId] = { clears: record.clears + 1, bestTimeSeconds: newBest ? seconds : record.bestTimeSeconds };
    return { firstClear, newBest };
  }

  /** Una copia dei progressi nel dungeon (vuota se non ancora vinto): modificarla non cambia il personaggio. */
  recordFor(dungeonId: string): DungeonRecord {
    const record = Object.hasOwn(this.records, dungeonId) ? this.records[dungeonId]! : undefined;
    return record === undefined ? { clears: 0, bestTimeSeconds: null } : { ...record };
  }
}
