import type { CharacterRoster } from './character-roster';
import type { Character } from './character';
import { STARTER_SETS } from './creation';
/** Costi provvisori; solo oro, nessun materiale consumato in questo incremento. */
export const HUB_PRICES = { buy: 30, craft: 120, upgrade: 60, maxUpgrade: 5 } as const;
export function acquireBasic(roster: CharacterRoster, character: Character, slot: number, craft = false): boolean {
  const familyId = STARTER_SETS[character.characterClass ?? 'mage'][slot];
  const price = craft ? HUB_PRICES.craft : HUB_PRICES.buy;
  if (!character.created || !familyId || roster.gold < price) return false;
  character.addRolls([{familyId, rarity: craft ? 'uncommon' : 'common'}]); roster.gold -= price; return true;
}
export function upgradeItem(roster: CharacterRoster, character: Character, uid: string): boolean {
  const index=character.inventory.findIndex(item=>item.uid===uid), item=character.inventory[index];
  if(!item || (item.upgrade ?? 0)>=HUB_PRICES.maxUpgrade) return false;
  const price=HUB_PRICES.upgrade*((item.upgrade ?? 0)+1);
  if(roster.gold<price) return false;
  character.inventory[index]={...item,upgrade:(item.upgrade ?? 0)+1};roster.gold-=price;return true;
}
export { depositItem, withdrawItem } from './character-storage';
