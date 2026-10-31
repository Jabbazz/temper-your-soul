import type { SkillDefinition } from '../skills/skill-definition';
import type { EquipmentSlot } from './equipment-slot';
import type { CharacterClass } from '../character/character-class';

/**
 * Una famiglia di oggetti: determina lo slot e la skill che l'oggetto concede (come in Ashen Realm, la famiglia
 * decide la skill, la rarita' ne migliora i valori). Dati di sola lettura. L'id e' stabile: lo usano i salvataggi,
 * le tabelle di bottino e i test, quindi non va rinominato.
 */
export interface ItemFamily {
  readonly id: string;
  /** Nome dell'oggetto (italiano). */
  readonly name: string;
  readonly description: string;
  readonly slot: EquipmentSlot;
  readonly characterClass:CharacterClass;
  /** La skill concessa, con i valori a rarita' Comune (vedi `scaleSkill` per le altre). */
  readonly skill: SkillDefinition;
  /** Dungeon di origine del set; può comparire come alternativa inferiore altrove. Le fonti reali sono in LOOT_TABLES. */
  readonly exclusiveTo?: string;
}
