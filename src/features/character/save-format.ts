import { dungeonById } from '../dungeons/dungeons';
import { EQUIPMENT_SLOTS } from '../items/equipment-slot';
import { familyById } from '../items/item-families';
import type { Item } from '../items/item';
import { isRarity } from '../items/rarity';
import { Character, type DungeonRecord } from './character';
import { isCharacterClass } from './character-class';
import { cleanCharacterName } from './creation';
import { cleanItemLevel } from '../items/gear-score';

/** Versione del formato di salvataggio. Se cambia la struttura, alzarla e aggiungere la migrazione in `deserializeCharacter`. */
export const SAVE_VERSION = 6;

/** Dati del singolo personaggio v6, inclusi nel roster locale. GS e skill restano derivati. */
export function serializeCharacter(character: Character): string {
  return JSON.stringify({
    version: SAVE_VERSION,
    name: character.name,
    starterPending: character.starterPending,
    totalXp: character.totalXp,
    bodyType: character.bodyType,
    characterClass: character.characterClass,
    items: character.inventory.map(({ uid, familyId, rarity,level }) => ({ uid, familyId, rarity,...(cleanItemLevel(level)>1?{level:cleanItemLevel(level)}:{}) })),
    equipped: Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, character.equipped[slot]])),
    records: character.records,
    nextItemNumber: character.nextItemNumber,
  });
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Legge un salvataggio con validazione rigorosa; `null` se il testo non e' utilizzabile (JSON non valido, non un oggetto,
 * versione assente o piu' recente di `SAVE_VERSION`). Il contenuto parzialmente valido si ripara senza lanciare eccezioni:
 *  - oggetti con famiglia o rarita' sconosciute, `uid` non stringa o duplicati: scartati;
 *  - equipaggiamento verso `uid` inesistenti o di una famiglia di un altro slot: slot vuoto;
 *  - record di dungeon sconosciuti: scartati; numeri non validi riportati a valori validi;
 *  - `nextItemNumber` sempre maggiore di ogni numero degli `uid` presenti;
 *  - nessun oggetto valido: inventario ed equipaggiamento del personaggio iniziale (i record restano).
 */
export function deserializeCharacter(text: string): Character | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data)) return null;
  const { version, items, equipped, records, nextItemNumber } = data;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > SAVE_VERSION) return null;
  if (!Array.isArray(items)) return null;

  const character = new Character();
  character.name=cleanCharacterName(data.name);
  character.starterPending=version>=5 && data.starterPending===true && character.name===null;
  character.bodyType = data.bodyType === 'male' || data.bodyType === 'female' ? data.bodyType : null;
  character.characterClass = isCharacterClass(data.characterClass) ? data.characterClass : null;
  character.totalXp = typeof data.totalXp === 'number' && Number.isSafeInteger(data.totalXp) && data.totalXp >= 0 ? Math.min(data.totalXp, 1000000000) : 0;
  const seen = new Set<string>();
  for (const raw of items) {
    if (!isObject(raw)) continue;
    const { uid, familyId, rarity } = raw;
    if (typeof uid !== 'string' || uid === '' || seen.has(uid)) continue;
    if (typeof familyId !== 'string' || familyById(familyId) === undefined || !isRarity(rarity)) continue;
    seen.add(uid);
    const level=cleanItemLevel(raw.level);
    const item: Item = { uid, familyId, rarity, ...(level>1?{level}:{}) };
    character.inventory.push(item);
  }

  if (isObject(equipped)) {
    for (const slot of EQUIPMENT_SLOTS) {
      const uid = equipped[slot];
      const item = typeof uid === 'string' ? character.itemByUid(uid) : undefined;
      character.equipped[slot] = item !== undefined && familyById(item.familyId)?.slot === slot ? item.uid : null;
    }
  }

  character.records = cleanRecords(records);

  let highest = 0;
  for (const { uid } of character.inventory) {
    const match = /^i(\d+)$/.exec(uid);
    if (match !== null) highest = Math.max(highest, Number(match[1]));
  }
  const saved = typeof nextItemNumber === 'number' && Number.isInteger(nextItemNumber) ? nextItemNumber : 1;
  character.nextItemNumber = Math.max(saved, highest + 1, 1);

  if (character.inventory.length === 0) {
    const starter = Character.createStarter(character.characterClass??'mage');
    character.inventory = starter.inventory;
    character.equipped = starter.equipped;
    character.nextItemNumber = Math.max(character.nextItemNumber, starter.nextItemNumber);
  }
  character.reconcileEquipment();
  return character;
}

function cleanRecords(raw: unknown): Record<string, DungeonRecord> {
  const records: Record<string, DungeonRecord> = {};
  if (!isObject(raw)) return records;
  for (const [dungeonId, value] of Object.entries(raw)) {
    if (dungeonById(dungeonId) === undefined || !isObject(value)) continue;
    const { clears, bestTimeSeconds } = value;
    records[dungeonId] = {
      clears: typeof clears === 'number' && Number.isFinite(clears) ? Math.max(0, Math.floor(clears)) : 0,
      bestTimeSeconds: typeof bestTimeSeconds === 'number' && Number.isFinite(bestTimeSeconds) && bestTimeSeconds > 0 ? bestTimeSeconds : null,
    };
  }
  return records;
}
