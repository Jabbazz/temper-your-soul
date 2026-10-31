import { ARCANE_BOLT, ASTRAL_STEP, FROST_ORB, METEOR } from '../skills/mage-skills';
import type { EquipmentSlot } from './equipment-slot';
import type { ItemFamily } from './item-family';
import {
  BLIZZARD_BURST,
  BOG_STEP,
  EMBER_RING,
  FORGE_ERUPTION,
  FORGE_SLAM,
  FROST_SHARD,
  GUARDIAN_SWEEP,
  HUNTER_ARROW,
  SPIRIT_WISPS,
  SPORE_BURST,
  STORM_BOLT,
  TOMB_PULSE,
  WIND_DASH,
} from './item-skills';

/*
 * Il catalogo delle famiglie di oggetti: 9 generiche (cadono da ogni boss) e 8 esclusive (2 per dungeon, cadono solo
 * dal boss indicato in `exclusiveTo`). Id e slot sono stabili; nomi, descrizioni e valori delle skill sono provvisori.
 * Le quattro famiglie "base" concedono le skill originali del mago (stesse costanti di `mage-skills.ts`).
 */
export const ITEM_FAMILIES: readonly ItemFamily[] = [
  // --- Generiche ---
  { id: 'arcane_staff', name: 'Bastone arcano', description: 'Il bastone del mago: un dardo arcano rapido.', slot: 'primary_hand', skill: ARCANE_BOLT },
  { id: 'hunter_bow', name: 'Arco del cacciatore', description: 'Frecce veloci a lunga gittata, ma meno potenti.', slot: 'primary_hand', skill: HUNTER_ARROW },
  { id: 'storm_scepter', name: 'Scettro tempestoso', description: 'Una sfera di tempesta lenta e pesante.', slot: 'primary_hand', skill: STORM_BOLT },
  { id: 'frost_grimoire', name: 'Grimorio del gelo', description: 'Un globo di gelo che rallenta il boss.', slot: 'secondary_hand', skill: FROST_ORB },
  { id: 'spirit_talisman', name: 'Talismano degli spiriti', description: "Tre fuochi fatui a ventaglio: più facili da centrare.", slot: 'secondary_hand', skill: SPIRIT_WISPS },
  { id: 'meteor_mantle', name: 'Mantello della meteora', description: 'Fa cadere una meteora nel punto mirato.', slot: 'armor', skill: METEOR },
  { id: 'ember_aegis', name: 'Egida di brace', description: "Un'esplosione ritardata attorno a te, per respingere chi ti sta addosso.", slot: 'armor', skill: EMBER_RING },
  { id: 'astral_boots', name: 'Stivali astrali', description: "Scatto verso il mouse con un attimo di invulnerabilità.", slot: 'boots', skill: ASTRAL_STEP },
  { id: 'wind_boots', name: 'Stivali del vento', description: 'Scatto lungo e con ricarica corta, ma poca protezione.', slot: 'boots', skill: WIND_DASH },
  // --- Esclusive: cripta ---
  { id: 'guardian_blade', name: 'Lama del guardiano', description: 'Un fendente ravvicinato ad ampio arco, largo e pesante.', slot: 'primary_hand', skill: GUARDIAN_SWEEP, exclusiveTo: 'crypt' },
  { id: 'tomb_shroud', name: 'Sudario della cripta', description: 'Una grande esplosione attorno a te che rallenta il boss.', slot: 'armor', skill: TOMB_PULSE, exclusiveTo: 'crypt' },
  // --- Esclusive: palude ---
  { id: 'spore_fan', name: 'Ventaglio di spore', description: 'Cinque semi di spora a ventaglio.', slot: 'secondary_hand', skill: SPORE_BURST, exclusiveTo: 'swamp' },
  { id: 'bog_boots', name: 'Stivali del pantano', description: "Uno scatto corto con una lunga invulnerabilità.", slot: 'boots', skill: BOG_STEP, exclusiveTo: 'swamp' },
  // --- Esclusive: fornace ---
  { id: 'forge_hammer', name: 'Martello della fornace', description: 'Una zona piccola ma devastante sul mirino.', slot: 'primary_hand', skill: FORGE_SLAM, exclusiveTo: 'forge' },
  { id: 'forge_plate', name: 'Corazza della fornace', description: "Un'enorme eruzione ritardata sul mirino, danno altissimo.", slot: 'armor', skill: FORGE_ERUPTION, exclusiveTo: 'forge' },
  // --- Esclusive: ghiacciaia ---
  { id: 'frost_lance', name: 'Lancia di ghiaccio', description: 'Una scheggia veloce e pesante che rallenta il boss.', slot: 'primary_hand', skill: FROST_SHARD, exclusiveTo: 'glacier' },
  { id: 'blizzard_veil', name: 'Velo di bufera', description: 'Una bufera attorno a te che rallenta il boss a lungo.', slot: 'armor', skill: BLIZZARD_BURST, exclusiveTo: 'glacier' },
];

export function familyById(id: string): ItemFamily | undefined {
  return ITEM_FAMILIES.find((family) => family.id === id);
}

/** Tutte le famiglie (generiche ed esclusive) di uno slot, nell'ordine del catalogo. */
export function familiesForSlot(slot: EquipmentSlot): ItemFamily[] {
  return ITEM_FAMILIES.filter((family) => family.slot === slot);
}
