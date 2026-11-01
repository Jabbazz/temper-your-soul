import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../dungeons/dungeons';
import { MINIONS, VEIN_MINIONS, type VeinId } from '../minions/minion-catalog';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { DescentRun } from './descent';
import { planDescent } from './plan';
import { bestiaryEntry, ROOM_BESTIARY, VEIN_BESTIARY, VEIN_LABELS } from './room-bestiary';
import { planVeins, roomVeins, stageVein, unlockedVeins, VEIN_RULES, veinBestiary } from './veins';

const ALL: VeinId[] = ['a', 'b', 'c'];

describe('vene dei servitori', () => {
  it('ogni vena di ogni dungeon ha nome, folla, minacce, un pesante e un nido o un sostegno', () => {
    for (const dungeon of DUNGEONS) {
      const veins = VEIN_BESTIARY[dungeon.id]!;
      expect(veins.a).toBe(ROOM_BESTIARY[dungeon.id]);
      for (const vein of ALL) {
        const list = veins[vein];
        expect(VEIN_LABELS[dungeon.id]![vein].name.length, `${dungeon.id}/${vein}`).toBeGreaterThan(0);
        expect(list.filter((item) => item.role === 'swarm').length, `${dungeon.id}/${vein}: folla`).toBeGreaterThanOrEqual(2);
        expect(list.filter((item) => item.role === 'threat').length, `${dungeon.id}/${vein}: minacce`).toBeGreaterThanOrEqual(2);
        expect(list.some((item) => item.role === 'heavy'), `${dungeon.id}/${vein}: pesante`).toBe(true);
        // La vena A della fucina non ha nidi: l'Assedio usa i pesanti (com'era prima delle vene).
        if (vein !== 'a') expect(list.some((item) => item.role === 'nest' || item.role === 'support'), `${dungeon.id}/${vein}: nido o sostegno`).toBe(true);
        // Le prime stanze hanno sempre qualcosa da comprare.
        expect(list.some((item) => (item.firstStage ?? 0) === 0 && item.role === 'swarm'), `${dungeon.id}/${vein}`).toBe(true);
      }
    }
  });

  it('ogni servitore delle vene B e C e\' nel bestiario della sua vena (i figli dei nidi possono mancare)', () => {
    for (const dungeon of DUNGEONS) {
      for (const vein of ['b', 'c'] as const) {
        const ids = new Set(VEIN_BESTIARY[dungeon.id]![vein].map((item) => item.minion.id));
        for (const minion of VEIN_MINIONS[dungeon.id]![vein]) {
          const child = Object.values(MINIONS).some((other) => other.nest?.spawn === minion.id || (other.onDeath?.kind === 'split' && other.onDeath.into === minion.id));
          if (!child) expect(ids.has(minion.id), `${dungeon.id}/${vein}: ${minion.id}`).toBe(true);
        }
        for (const item of VEIN_BESTIARY[dungeon.id]![vein]) expect(bestiaryEntry(dungeon.id, item.minion.id)).toBe(item);
      }
    }
  });

  it('sblocchi: la prima discesa solo la vena A, la B al luogotenente, la C con la prima vittoria', () => {
    expect(unlockedVeins({ clears: 0, furthestStage: 0 })).toEqual(['a']);
    expect(unlockedVeins({ clears: 0, furthestStage: 3 })).toEqual(['a']);
    expect(unlockedVeins({ clears: 0, furthestStage: VEIN_RULES.veinBStage })).toEqual(['a', 'b']);
    expect(unlockedVeins({ clears: 1, furthestStage: 8 })).toEqual(['a', 'b', 'c']);
  });

  it('il piano delle vene: stesso seme stesse vene, ingresso e profonda diverse, la terza per l\'Incursione', () => {
    expect(planVeins(42, ALL)).toEqual(planVeins(42, ALL));
    expect(planVeins(42, ['a'])).toEqual({ entrance: 'a', deep: 'a', third: null });
    const pairs = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const plan = planVeins(seed, ALL);
      expect(plan.entrance).not.toBe(plan.deep);
      expect(plan.third).not.toBeNull();
      expect(new Set([plan.entrance, plan.deep, plan.third]).size).toBe(3);
      pairs.add(`${plan.entrance}${plan.deep}`);
      const single = planVeins(seed, ALL, true);
      expect(single.entrance).toBe(single.deep);
      expect(single.third).toBeNull();
    }
    expect(pairs.size).toBe(6);
  });

  it('prima del luogotenente la vena d\'ingresso, poi la profonda; gli ospiti nelle due tappe di passaggio', () => {
    const stages = planDescent('crypt', 7).stages;
    const plan = { entrance: 'b', deep: 'c', third: 'a' } as const;
    const lieutenant = stages.findIndex((stage) => stage.options.some((option) => option.kind === 'lieutenant'));
    expect(lieutenant).toBe(3);
    expect(stages.map((_, index) => stageVein(plan, stages, index))).toEqual(['b', 'b', 'b', 'c', 'c', 'c', 'c', 'c']);
    // Una stanza che non e' uno Scontro non diventa mai un'Incursione.
    expect(roomVeins(plan, stages, 2, 'reliquary', 1)).toEqual({ vein: 'b', guest: 'c' });
    expect(roomVeins(plan, stages, 5, 'hunt', 1)).toEqual({ vein: 'c', guest: 'b' });
    expect(roomVeins(plan, stages, 1, 'combat', 1).guest).toBeUndefined();
    expect(roomVeins({ entrance: 'a', deep: 'a', third: null }, stages, 2, 'combat', 1)).toEqual({ vein: 'a' });
  });

  it('l\'Incursione: circa il 3% degli Scontri dalla terza tappa, tutta della terza vena', () => {
    const stages = planDescent('swamp', 3).stages;
    const plan = { entrance: 'a', deep: 'b', third: 'c' } as const;
    let incursions = 0;
    const rooms = 4000;
    for (let seed = 0; seed < rooms; seed++) {
      const room = roomVeins(plan, stages, 2, 'combat', seed * 2654435761);
      if (room.incursion) {
        incursions++;
        expect(room.vein).toBe('c');
        expect(room.guest).toBeUndefined();
      }
      expect(roomVeins(plan, stages, 1, 'combat', seed).incursion).toBeUndefined();
    }
    expect(incursions / rooms).toBeGreaterThan(0.015);
    expect(incursions / rooms).toBeLessThan(0.05);
  });

  it('l\'ospite e\' un solo tipo di folla o minaccia dell\'altra vena', () => {
    for (let seed = 0; seed < 30; seed++) {
      const list = veinBestiary('forge', { vein: 'b', guest: 'c' }, seed);
      const guests = list.filter((item) => !VEIN_BESTIARY.forge!.b.includes(item));
      expect(guests.length).toBe(1);
      expect(['swarm', 'threat']).toContain(guests[0]!.role);
      expect(VEIN_BESTIARY.forge!.c).toContain(guests[0]);
    }
  });

  it('una discesa con tutte le vene sbloccate compra i servitori della vena della stanza', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const run = new DescentRun({ mode: 'descent', dungeonId: 'glacier', members: [{ id: 'local', loadout: MAGE_SKILLS }], seed, veins: { glacier: ALL } });
      const room = run.roomVein;
      expect(run.view().roomVeins).toEqual(room);
      expect(run.view().stageVeins[0]).toBe(run.veins.entrance);
      const allowed = new Set(veinBestiary('glacier', room, 0).map((item) => item.minion.id));
      for (const item of VEIN_BESTIARY.glacier![room.vein]) allowed.add(item.minion.id);
      for (const plan of run.encounter.waves) {
        for (const order of plan.orders) {
          const fromVein = VEIN_BESTIARY.glacier![room.vein].some((item) => item.minion.id === order.entry.minion.id);
          expect(fromVein || room.guest !== undefined, `${seed}: ${order.entry.minion.id}`).toBe(true);
        }
      }
    }
  });

  it('senza sblocchi la discesa resta quella di sempre (vena A)', () => {
    const run = new DescentRun({ mode: 'descent', dungeonId: 'crypt', members: [{ id: 'local', loadout: MAGE_SKILLS }], seed: 9 });
    expect(run.veins).toEqual({ entrance: 'a', deep: 'a', third: null });
    for (const plan of run.encounter.waves) for (const order of plan.orders) expect(ROOM_BESTIARY.crypt).toContain(order.entry);
  });
});

describe('pagine del Bestiario delle vene', () => {
  it('ogni servitore ha la sua pagina: ruolo, schema che insegna e iscrizione', async () => {
    const { MINION_LORE } = await import('./bestiary-lore');
    for (const minion of Object.values(MINIONS)) {
      const lore = MINION_LORE[minion.id];
      expect(lore, minion.id).toBeDefined();
      expect(lore!.text.length, minion.id).toBeGreaterThan(10);
    }
  });
});

describe('luogotenente sulla cerniera delle vene', () => {
  it('con la vena A è quello di sempre; con la B o la C quello della vena, che chiama la folla della sua vena', async () => {
    const { LIEUTENANTS } = await import('./lieutenants');
    const { VEIN_LIEUTENANTS } = await import('./vein-lieutenants');
    const { veinLieutenant } = await import('./veins');
    const ids = new Set<string>();
    for (const dungeon of DUNGEONS) {
      expect(veinLieutenant(dungeon.id, 'a')).toBe(LIEUTENANTS[dungeon.id]);
      for (const vein of ['b', 'c'] as const) {
        const lieutenant = veinLieutenant(dungeon.id, vein);
        expect(lieutenant).toBe(VEIN_LIEUTENANTS[dungeon.id]![vein]);
        ids.add(lieutenant.id);
        const swarm = VEIN_BESTIARY[dungeon.id]![vein].filter((item) => item.role === 'swarm').map((item) => item.minion);
        expect(swarm, lieutenant.id).toContain(lieutenant.summons!.minion);
      }
    }
    expect(ids.size).toBe(8);
  });
});

describe('grafica e pagine dei luogotenenti delle vene', () => {
  it('ognuno ha la sua grafica completa (righe regolari, tavolozze in tutte le pose), gli effetti e la pagina del Bestiario', async () => {
    const { VEIN_LIEUTENANTS } = await import('./vein-lieutenants');
    const { BOSS_ART } = await import('../presentation/boss-art');
    const { BOSS_FX } = await import('../presentation/boss-fx');
    const { LIEUTENANT_LORE } = await import('./bestiary-lore');
    for (const veins of Object.values(VEIN_LIEUTENANTS)) {
      for (const lieutenant of Object.values(veins)) {
        const art = BOSS_ART[lieutenant.art];
        expect(art, lieutenant.id).toBeDefined();
        expect(Object.hasOwn(BOSS_FX, lieutenant.art), lieutenant.id).toBe(true);
        expect(LIEUTENANT_LORE[lieutenant.id], lieutenant.id).toBeDefined();
        for (const [slowed, enraged] of [[false, false], [true, false], [false, true]] as const) {
          const palette = art!.palette(slowed, enraged);
          for (const frame of [...art!.walk, art!.casting]) {
            expect(new Set(frame.map((row) => row.length)).size, lieutenant.id).toBe(1);
            for (const symbol of new Set(frame.flatMap((row) => [...row]))) {
              if (symbol !== '.') expect(Object.hasOwn(palette, symbol), `${lieutenant.id}: ${symbol}`).toBe(true);
            }
          }
        }
      }
    }
  });
});
