import { describe, expect, it } from 'vitest';
import { SeededRng, type Rng } from '../../core/rng';
import { DUNGEONS } from '../dungeons/dungeons';
import { familyById, ITEM_FAMILIES } from '../items/item-families';
import { RARITIES, type Rarity } from '../items/rarity';
import type { LootTable } from './loot-table';
import { LOOT_TABLES, lootTableFor } from './loot-tables';
import { rollLoot } from './roll-loot';

/** Un Rng che restituisce una sequenza prefissata e lancia se se ne chiedono di piu' (per contare le estrazioni). */
function scripted(values: number[]): Rng & { used: number } {
  const rng = {
    used: 0,
    next(): number {
      if (rng.used >= values.length) throw new Error('estrazione in piu\' del previsto');
      return values[rng.used++]!;
    },
  };
  return rng;
}

const CRYPT = lootTableFor('crypt');

describe('tabelle di bottino', () => {
  it('c\'e\' una tabella per ognuno dei 4 dungeon, e non altre', () => {
    expect(Object.keys(LOOT_TABLES).sort()).toEqual(DUNGEONS.map((dungeon) => dungeon.id).sort());
    for (const dungeon of DUNGEONS) {
      expect(lootTableFor(dungeon.id).dungeonId).toBe(dungeon.id);
      expect(LOOT_TABLES[dungeon.id]).toBe(lootTableFor(dungeon.id));
    }
    expect(() => lootTableFor('nope')).toThrow(/nope/);
    expect(() => lootTableFor('toString')).toThrow();
  });

  it('valori provvisori attesi: un oggetto garantito, bonus 0,5, esclusiva 0,35 e pesi crescenti di qualita\'', () => {
    const weights = (id: string) => RARITIES.map((rarity) => lootTableFor(id).rarityWeights[rarity]);
    expect(weights('crypt')).toEqual([55, 28, 12, 4, 1]);
    expect(weights('swamp')).toEqual([40, 30, 18, 9, 3]);
    expect(weights('forge')).toEqual([30, 30, 22, 13, 5]);
    expect(weights('glacier')).toEqual([20, 28, 27, 17, 8]);
    for (const table of Object.values(LOOT_TABLES)) {
      expect(table.guaranteedDrops).toBe(1);
      expect(table.bonusDropChance).toBe(0.5);
      expect(table.exclusiveChance).toBe(0.35);
    }
    // Piu' il dungeon e' pericoloso, piu' sono probabili Epico e Leggendario.
    const order = ['crypt', 'swamp', 'forge', 'glacier'];
    for (let i = 1; i < order.length; i++) {
      expect(lootTableFor(order[i]!).rarityWeights.legendary).toBeGreaterThan(lootTableFor(order[i - 1]!).rarityWeights.legendary);
      expect(lootTableFor(order[i]!).rarityWeights.common).toBeLessThan(lootTableFor(order[i - 1]!).rarityWeights.common);
    }
  });

  it('pesi positivi e famiglie nei gruppi giusti: 2 esclusive del dungeon e le 9 generiche, tutte esistenti', () => {
    for (const table of Object.values(LOOT_TABLES)) {
      for (const rarity of RARITIES) expect(table.rarityWeights[rarity], `${table.dungeonId} ${rarity}`).toBeGreaterThan(0);
      expect(table.exclusiveFamilyIds).toHaveLength(2);
      expect(table.genericFamilyIds).toHaveLength(9);
      for (const id of table.exclusiveFamilyIds) expect(familyById(id)?.exclusiveTo, id).toBe(table.dungeonId);
      for (const id of table.genericFamilyIds) {
        expect(familyById(id), id).toBeDefined();
        expect(familyById(id)!.exclusiveTo, id).toBeUndefined();
      }
      expect(table.bonusDropChance).toBeGreaterThanOrEqual(0);
      expect(table.bonusDropChance).toBeLessThanOrEqual(1);
    }
    // Ogni famiglia del catalogo e' ottenibile da qualche dungeon.
    const obtainable = new Set(Object.values(LOOT_TABLES).flatMap((t) => [...t.exclusiveFamilyIds, ...t.genericFamilyIds]));
    expect(obtainable.size).toBe(ITEM_FAMILIES.length);
  });
});

describe('rollLoot', () => {
  it('e\' deterministico a parita\' di seme e cambia con un altro seme', () => {
    const run = (seed: number) => {
      const rng = new SeededRng(seed);
      return Array.from({ length: 50 }, () => rollLoot(lootTableFor('forge'), rng));
    };
    expect(run(7)).toEqual(run(7));
    expect(run(7)).not.toEqual(run(8));
  });

  it('da 1 oggetto (garantito) o 2 (con il bonus): il bonus dipende da un\'estrazione < bonusDropChance', () => {
    expect(rollLoot(CRYPT, scripted([0.5, 0.9, 0, 0]))).toHaveLength(1);
    expect(rollLoot(CRYPT, scripted([0.4999, 0.9, 0, 0, 0.9, 0, 0]))).toHaveLength(2);
    const counts = new Set<number>();
    const rng = new SeededRng(3);
    for (let i = 0; i < 500; i++) counts.add(rollLoot(CRYPT, rng).length);
    expect([...counts].sort()).toEqual([1, 2]);
    const none: LootTable = { ...CRYPT, guaranteedDrops: 0, bonusDropChance: 0 };
    expect(rollLoot(none, scripted([0.1]))).toEqual([]);
    const sure: LootTable = { ...CRYPT, guaranteedDrops: 3, bonusDropChance: 1 };
    expect(rollLoot(sure, new SeededRng(1))).toHaveLength(4);
  });

  it('rispetta l\'ordine ESATTO delle estrazioni: bonus, poi per oggetto gruppo, famiglia, rarita\'', () => {
    // Nessun bonus; gruppo esclusivo (0,1 < 0,35); famiglia: l'ultima delle 2 (0,99); rarita': prima (0).
    const first = scripted([0.9, 0.1, 0.99, 0]);
    expect(rollLoot(CRYPT, first)).toEqual([{ familyId: 'tomb_shroud', rarity: 'common' }]);
    expect(first.used).toBe(4);

    // Bonus; 1o oggetto: generico (0,5), famiglia 0 (arcane_staff), rarita' leggendaria (0,999);
    // 2o oggetto: esclusivo (0,2), famiglia 0 (guardian_blade), rarita' 0,5 -> 50 < 55 = comune.
    const both = scripted([0.1, 0.5, 0, 0.999, 0.2, 0, 0.5]);
    expect(rollLoot(CRYPT, both)).toEqual([
      { familyId: 'arcane_staff', rarity: 'legendary' },
      { familyId: 'guardian_blade', rarity: 'common' },
    ]);
    expect(both.used).toBe(7);

    // La famiglia e' uniforme nel gruppo: 9 generiche, 0,999 -> l'ultima; 0,5 -> la quinta (indice 4).
    const last = rollLoot(CRYPT, scripted([0.9, 0.5, 0.999, 0]))[0]!;
    expect(last.familyId).toBe(CRYPT.genericFamilyIds[8]);
    expect(rollLoot(CRYPT, scripted([0.9, 0.5, 0.5, 0]))[0]!.familyId).toBe(CRYPT.genericFamilyIds[4]);
  });

  it('la rarita\' segue i pesi nell\'ordine di RARITIES, ai confini cumulativi', () => {
    const rarityAt = (draw: number): Rarity => rollLoot(CRYPT, scripted([0.9, 0.5, 0, draw]))[0]!.rarity;
    // Crypt: 55 / 28 / 12 / 4 / 1 su 100 -> confini a 0,55 / 0,83 / 0,95 / 0,99.
    expect(rarityAt(0)).toBe('common');
    expect(rarityAt(0.549)).toBe('common');
    expect(rarityAt(0.551)).toBe('uncommon');
    expect(rarityAt(0.829)).toBe('uncommon');
    expect(rarityAt(0.831)).toBe('rare');
    expect(rarityAt(0.951)).toBe('epic');
    expect(rarityAt(0.991)).toBe('legendary');
    expect(rarityAt(0.999999)).toBe('legendary');
    // Una rarita' con peso 0 non esce mai.
    const noCommon: LootTable = { ...CRYPT, rarityWeights: { ...CRYPT.rarityWeights, common: 0 } };
    expect(rollLoot(noCommon, scripted([0.9, 0.5, 0, 0]))[0]!.rarity).toBe('uncommon');
  });

  it('la distribuzione su 20000 estrazioni e\' vicina a quella attesa (rarita\', gruppi, famiglie, numero di oggetti)', () => {
    for (const dungeonId of ['crypt', 'glacier']) {
      const table = lootTableFor(dungeonId);
      const rng = new SeededRng(12345);
      const rarityCount: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
      const familyCount = new Map<string, number>();
      let exclusive = 0;
      let items = 0;
      const draws = 20000;
      for (let i = 0; i < draws; i++) {
        for (const roll of rollLoot(table, rng)) {
          rarityCount[roll.rarity]++;
          familyCount.set(roll.familyId, (familyCount.get(roll.familyId) ?? 0) + 1);
          if (table.exclusiveFamilyIds.includes(roll.familyId)) exclusive++;
          items++;
        }
      }
      expect(items / draws, 'oggetti per vittoria').toBeCloseTo(1.5, 1);
      const totalWeight = RARITIES.reduce((sum, rarity) => sum + table.rarityWeights[rarity], 0);
      for (const rarity of RARITIES) {
        expect(rarityCount[rarity] / items, `${dungeonId} ${rarity}`).toBeCloseTo(table.rarityWeights[rarity] / totalWeight, 1);
        expect(Math.abs(rarityCount[rarity] / items - table.rarityWeights[rarity] / totalWeight)).toBeLessThan(0.015);
      }
      expect(Math.abs(exclusive / items - table.exclusiveChance)).toBeLessThan(0.015);
      for (const id of table.exclusiveFamilyIds) {
        expect(Math.abs((familyCount.get(id) ?? 0) / items - table.exclusiveChance / 2), id).toBeLessThan(0.015);
      }
      for (const id of table.genericFamilyIds) {
        expect(Math.abs((familyCount.get(id) ?? 0) / items - (1 - table.exclusiveChance) / 9), id).toBeLessThan(0.015);
      }
      // Mai famiglie di altri dungeon.
      for (const id of familyCount.keys()) expect(familyById(id)!.exclusiveTo ?? dungeonId).toBe(dungeonId);
    }
  });

  it('con un gruppo vuoto usa l\'altro (e consuma comunque tre estrazioni per oggetto); con entrambi vuoti non da nulla', () => {
    const noExclusive: LootTable = { ...CRYPT, exclusiveFamilyIds: [], exclusiveChance: 1 };
    const a = scripted([0.9, 0.0, 0.0, 0]);
    expect(rollLoot(noExclusive, a)).toEqual([{ familyId: CRYPT.genericFamilyIds[0], rarity: 'common' }]);
    expect(a.used).toBe(4);
    const noGeneric: LootTable = { ...CRYPT, genericFamilyIds: [], exclusiveChance: 0 };
    expect(rollLoot(noGeneric, scripted([0.9, 0.9, 0.99, 0]))).toEqual([{ familyId: 'tomb_shroud', rarity: 'common' }]);
    const empty: LootTable = { ...CRYPT, genericFamilyIds: [], exclusiveFamilyIds: [] };
    expect(rollLoot(empty, scripted([0.1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]))).toEqual([]);
    // Con exclusiveChance 0 non esce mai un'esclusiva, con 1 escono solo esclusive.
    const rng = new SeededRng(9);
    const never: LootTable = { ...CRYPT, exclusiveChance: 0 };
    const always: LootTable = { ...CRYPT, exclusiveChance: 1 };
    for (let i = 0; i < 200; i++) {
      for (const roll of rollLoot(never, rng)) expect(familyById(roll.familyId)!.exclusiveTo).toBeUndefined();
      for (const roll of rollLoot(always, rng)) expect(familyById(roll.familyId)!.exclusiveTo).toBe('crypt');
    }
  });

  it('non modifica la tabella e non usa altra casualita\' (Math.random, Date)', () => {
    const before = structuredClone(CRYPT);
    const realRandom = Math.random;
    Math.random = () => {
      throw new Error('Math.random non va usato dalla simulazione');
    };
    try {
      rollLoot(CRYPT, new SeededRng(1));
    } finally {
      Math.random = realRandom;
    }
    expect(CRYPT).toEqual(before);
  });
});
