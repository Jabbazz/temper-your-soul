import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../dungeons/dungeons';
import { PROJECTILE_LOOKS, ZONE_LOOKS } from '../presentation/visuals';
import { ARCANE_BOLT, ASTRAL_STEP, FROST_ORB, MAGE_SKILLS, METEOR } from '../skills/mage-skills';
import type { SkillDefinition } from '../skills/skill-definition';
import { EQUIPMENT_SLOTS, SLOT_LABELS, slotIndex } from './equipment-slot';
import { ITEM_FAMILIES, familiesForSlot, familyById } from './item-families';
import { describeSkillStats, formatNumber, itemName, resolveItem, resolveItemSkill } from './item';
import { RARITIES, RARITY_STATS } from './rarity';
import { scaleSkill } from './scaling';

/** Congela in profondita': qualunque scrittura sull'oggetto lancia un'eccezione (i moduli ES sono in modo strict). */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function damageOf(skill: SkillDefinition): number {
  const effect = skill.effect;
  switch (effect.kind) {
    case 'projectile':
      return effect.projectile.damage;
    case 'ground_blast':
      return effect.zone.damage;
    case 'melee_arc':
      return effect.damage;
    case 'dash':
      return 0;
  }
}

describe('rarita\'', () => {
  it('ci sono cinque rarita\' in ordine crescente di potenza e di rapidita\'', () => {
    expect(RARITIES).toEqual(['common', 'uncommon', 'rare', 'epic', 'legendary']);
    for (let i = 1; i < RARITIES.length; i++) {
      const lower = RARITY_STATS[RARITIES[i - 1]!];
      const higher = RARITY_STATS[RARITIES[i]!];
      expect(higher.powerMultiplier).toBeGreaterThan(lower.powerMultiplier);
      expect(higher.cooldownMultiplier).toBeLessThan(lower.cooldownMultiplier);
    }
    expect(RARITY_STATS.common.powerMultiplier).toBe(1);
    expect(RARITY_STATS.common.cooldownMultiplier).toBe(1);
    expect(RARITIES.map((rarity) => RARITY_STATS[rarity].label)).toEqual(['Comune', 'Non comune', 'Raro', 'Epico', 'Leggendario']);
    expect(new Set(RARITIES.map((rarity) => RARITY_STATS[rarity].color)).size).toBe(5);
    for (const rarity of RARITIES) expect(RARITY_STATS[rarity].color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('slot di equipaggiamento', () => {
  it('l\'ordine degli slot e\' quello degli slot di skill', () => {
    expect(EQUIPMENT_SLOTS).toEqual(['primary_hand', 'secondary_hand', 'armor', 'boots']);
    expect(EQUIPMENT_SLOTS.map(slotIndex)).toEqual([0, 1, 2, 3]);
    expect(EQUIPMENT_SLOTS.map((slot) => SLOT_LABELS[slot])).toEqual(['Mano primaria', 'Mano secondaria', 'Armatura', 'Stivali']);
  });
});

describe('scaleSkill', () => {
  it('a rarita\' Comune il risultato e\' identico alla skill base, per ogni famiglia', () => {
    for (const family of ITEM_FAMILIES) {
      expect(scaleSkill(family.skill, 'common'), family.id).toEqual(family.skill);
    }
  });

  it('arrotonda il danno all\'intero e scala ricarica, distanza e invulnerabilita\' con le regole provvisorie', () => {
    const damages = RARITIES.map((rarity) => damageOf(scaleSkill(ARCANE_BOLT, rarity)));
    expect(damages).toEqual([19, 21, 24, 27, 30]); // 19 x 1, 1.12, 1.25, 1.4, 1.6 arrotondati
    for (const family of ITEM_FAMILIES) {
      for (const rarity of RARITIES) expect(Number.isInteger(damageOf(scaleSkill(family.skill, rarity)))).toBe(true);
    }
    expect(damageOf(scaleSkill(METEOR, 'legendary'))).toBe(336);
    expect(scaleSkill(ARCANE_BOLT, 'legendary').cooldown).toBeCloseTo(0.16, 10);
    expect(scaleSkill(FROST_ORB, 'epic').cooldown).toBeCloseTo(2.04, 10);

    const dash = scaleSkill(ASTRAL_STEP, 'legendary').effect;
    if (dash.kind !== 'dash') throw new Error('atteso uno scatto');
    // Potenza 1,6: distanza e invulnerabilita' crescono solo della meta' dell'aumento (x 1,3).
    expect(dash.distance).toBeCloseTo(125 * 1.3, 10);
    expect(dash.invulnerability).toBeCloseTo(0.55 * 1.3, 10);
  });

  it('migliora in modo monotono con la rarita\': danno mai minore, ricarica sempre piu\' breve e mai <= 0', () => {
    for (const family of ITEM_FAMILIES) {
      const scaled = RARITIES.map((rarity) => scaleSkill(family.skill, rarity));
      for (let i = 1; i < scaled.length; i++) {
        expect(damageOf(scaled[i]!), `${family.id} danno`).toBeGreaterThanOrEqual(damageOf(scaled[i - 1]!));
        expect(scaled[i]!.cooldown, `${family.id} ricarica`).toBeLessThan(scaled[i - 1]!.cooldown);
      }
      for (const skill of scaled) expect(skill.cooldown).toBeGreaterThan(0);
    }
    // Per gli scatti il "danno" e' zero: migliorano distanza e invulnerabilita'.
    for (const family of ITEM_FAMILIES.filter((f) => f.skill.effect.kind === 'dash')) {
      const dashes = RARITIES.map((rarity) => scaleSkill(family.skill, rarity).effect);
      for (let i = 1; i < dashes.length; i++) {
        const a = dashes[i - 1]!;
        const b = dashes[i]!;
        if (a.kind !== 'dash' || b.kind !== 'dash') throw new Error('atteso uno scatto');
        expect(b.distance).toBeGreaterThan(a.distance);
        expect(b.invulnerability).toBeGreaterThan(a.invulnerability);
      }
    }
  });

  it('non modifica mai l\'oggetto di input (anche congelato) e restituisce una skill nuova', () => {
    for (const family of ITEM_FAMILIES) {
      const frozen = deepFreeze(structuredClone(family.skill));
      const before = structuredClone(frozen);
      const scaled = scaleSkill(frozen, 'legendary');
      expect(frozen).toEqual(before);
      expect(scaled).not.toBe(frozen);
      expect(scaled.effect).not.toBe(frozen.effect);
    }
  });

  it('conserva l\'identita\': id, nome, descrizione, aspetto, forma, rallentamento, numero di colpi', () => {
    for (const family of ITEM_FAMILIES) {
      const base = family.skill;
      const legendary = scaleSkill(base, 'legendary');
      expect(legendary.id).toBe(base.id);
      expect(legendary.name).toBe(base.name);
      expect(legendary.description).toBe(base.description);
      expect(legendary.visual).toBe(base.visual);
      expect(legendary.effect.kind).toBe(base.effect.kind);
      const a = base.effect;
      const b = legendary.effect;
      if (a.kind === 'projectile' && b.kind === 'projectile') {
        expect({ ...b.projectile, damage: 0 }).toEqual({ ...a.projectile, damage: 0 });
        expect([b.count, b.spread, b.muzzleOffset]).toEqual([a.count, a.spread, a.muzzleOffset]);
      } else if (a.kind === 'ground_blast' && b.kind === 'ground_blast') {
        expect({ ...b.zone, damage: 0 }).toEqual({ ...a.zone, damage: 0 });
        expect(b.center).toBe(a.center);
      } else if (a.kind === 'melee_arc' && b.kind === 'melee_arc') {
        expect([b.range, b.arc]).toEqual([a.range, a.arc]);
      }
    }
  });
});

describe('catalogo delle famiglie', () => {
  const generic = ITEM_FAMILIES.filter((family) => family.exclusiveTo === undefined);
  const exclusive = ITEM_FAMILIES.filter((family) => family.exclusiveTo !== undefined);

  it('17 famiglie con id e nomi unici: 9 generiche e 8 esclusive', () => {
    expect(ITEM_FAMILIES).toHaveLength(17);
    expect(generic).toHaveLength(9);
    expect(exclusive).toHaveLength(8);
    expect(new Set(ITEM_FAMILIES.map((family) => family.id)).size).toBe(17);
    expect(new Set(ITEM_FAMILIES.map((family) => family.name)).size).toBe(17);
    expect(new Set(ITEM_FAMILIES.map((family) => family.skill.id)).size, 'id delle skill').toBe(17);
  });

  it('ogni dungeon ha esattamente 2 famiglie esclusive, e nessuna esclusiva punta a un dungeon inesistente', () => {
    for (const dungeon of DUNGEONS) {
      expect(exclusive.filter((family) => family.exclusiveTo === dungeon.id), dungeon.id).toHaveLength(2);
    }
    const dungeonIds = DUNGEONS.map((dungeon) => dungeon.id);
    for (const family of exclusive) expect(dungeonIds).toContain(family.exclusiveTo);
  });

  it('gli slot sono quelli fissati e ogni slot ha almeno 2 famiglie generiche', () => {
    const slots = Object.fromEntries(ITEM_FAMILIES.map((family) => [family.id, family.slot]));
    expect(slots).toEqual({
      arcane_staff: 'primary_hand', hunter_bow: 'primary_hand', storm_scepter: 'primary_hand',
      frost_grimoire: 'secondary_hand', spirit_talisman: 'secondary_hand',
      meteor_mantle: 'armor', ember_aegis: 'armor',
      astral_boots: 'boots', wind_boots: 'boots',
      guardian_blade: 'primary_hand', tomb_shroud: 'armor',
      spore_fan: 'secondary_hand', bog_boots: 'boots',
      forge_hammer: 'primary_hand', forge_plate: 'armor',
      frost_lance: 'primary_hand', blizzard_veil: 'armor',
    });
    for (const slot of EQUIPMENT_SLOTS) {
      expect(generic.filter((family) => family.slot === slot).length, slot).toBeGreaterThanOrEqual(2);
      expect(familiesForSlot(slot).every((family) => family.slot === slot)).toBe(true);
    }
    expect(familiesForSlot('boots').map((family) => family.id)).toEqual(['astral_boots', 'wind_boots', 'bog_boots']);
    expect(familyById('wind_boots')).toBe(generic.find((family) => family.id === 'wind_boots'));
    expect(familyById('nope')).toBeUndefined();
  });

  it('le famiglie base concedono le skill del mago: le stesse costanti di MAGE_SKILLS', () => {
    expect(familyById('arcane_staff')!.skill).toBe(MAGE_SKILLS[0]);
    expect(familyById('frost_grimoire')!.skill).toBe(MAGE_SKILLS[1]);
    expect(familyById('meteor_mantle')!.skill).toBe(MAGE_SKILLS[2]);
    expect(familyById('astral_boots')!.skill).toBe(MAGE_SKILLS[3]);
  });

  it('ogni skill ha ricarica > 0, un aspetto non vuoto e testi in italiano non vuoti', () => {
    for (const family of ITEM_FAMILIES) {
      expect(family.skill.cooldown, family.id).toBeGreaterThan(0);
      expect(family.skill.visual.length, family.id).toBeGreaterThan(0);
      expect(family.name.length).toBeGreaterThan(0);
      expect(family.description.length).toBeGreaterThan(10);
      expect(family.skill.name.length).toBeGreaterThan(0);
      expect(family.skill.description.length).toBeGreaterThan(0);
    }
  });

  it('ogni aspetto di proiettile e di zona delle skill esiste in PROJECTILE_LOOKS / ZONE_LOOKS', () => {
    for (const family of ITEM_FAMILIES) {
      const effect = family.skill.effect;
      if (effect.kind === 'projectile') {
        expect(PROJECTILE_LOOKS[effect.projectile.visual], `${family.id}: ${effect.projectile.visual}`).toBeDefined();
      } else if (effect.kind === 'ground_blast' && effect.zone.visual !== undefined) {
        expect(ZONE_LOOKS[effect.zone.visual], `${family.id}: ${effect.zone.visual}`).toBeDefined();
      }
    }
  });

  it('le skill nuove hanno un aspetto proprio: nessun visual condiviso tra famiglie diverse', () => {
    expect(new Set(ITEM_FAMILIES.map((family) => family.skill.visual)).size).toBe(17);
  });

  it('nessuna skill generica supera il doppio del riferimento del proprio slot, nemmeno a Leggendaria', () => {
    const reference = { primary_hand: 19, secondary_hand: 100, armor: 210 } as const;
    for (const family of generic) {
      if (family.slot === 'boots') continue;
      const legendary = scaleSkill(family.skill, 'legendary');
      expect(damageOf(legendary), family.id).toBeLessThanOrEqual(reference[family.slot] * 2);
    }
    // Gli scatti: a pari rarita' la distanza non supera il doppio di quella del passo astrale.
    const astral = scaleSkill(ASTRAL_STEP, 'legendary').effect;
    for (const family of generic.filter((f) => f.slot === 'boots')) {
      const effect = scaleSkill(family.skill, 'legendary').effect;
      if (effect.kind !== 'dash' || astral.kind !== 'dash') throw new Error('atteso uno scatto');
      expect(effect.distance, family.id).toBeLessThanOrEqual(astral.distance * 2);
    }
  });

  it('le skill simili alle base hanno un\'identita\' diversa (valori e forma, non un solo numero)', () => {
    const bolt = ARCANE_BOLT.effect;
    const arrow = familyById('hunter_bow')!.skill.effect;
    const storm = familyById('storm_scepter')!.skill.effect;
    if (bolt.kind !== 'projectile' || arrow.kind !== 'projectile' || storm.kind !== 'projectile') throw new Error('atteso un proiettile');
    // Freccia: piu' veloce, piu' lontana, piu' sottile, meno danno, ricarica piu' breve.
    expect(arrow.projectile.speed).toBeGreaterThan(bolt.projectile.speed * 1.4);
    expect(arrow.projectile.speed * arrow.projectile.lifetime).toBeGreaterThan(bolt.projectile.speed * bolt.projectile.lifetime);
    expect(arrow.projectile.damage).toBeLessThan(bolt.projectile.damage);
    expect(arrow.projectile.radius).toBeLessThan(bolt.projectile.radius);
    expect(familyById('hunter_bow')!.skill.cooldown).toBeLessThan(ARCANE_BOLT.cooldown);
    // Scettro: piu' lento, piu' grosso, piu' danno per colpo, ricarica piu' lunga.
    expect(storm.projectile.speed).toBeLessThan(bolt.projectile.speed * 0.7);
    expect(storm.projectile.radius).toBeGreaterThan(bolt.projectile.radius);
    expect(storm.projectile.damage).toBeGreaterThan(bolt.projectile.damage);
    expect(familyById('storm_scepter')!.skill.cooldown).toBeGreaterThan(ARCANE_BOLT.cooldown);
    // Talismano: un ventaglio di 3, ciascuno piu' debole del globo; il globo da solo ha un colpo.
    const wisps = familyById('spirit_talisman')!.skill.effect;
    if (wisps.kind !== 'projectile') throw new Error('atteso un proiettile');
    expect(wisps.count).toBe(3);
    expect(wisps.projectile.damage).toBeLessThan(100);
  });

  it('le esclusive danno abilita\' che le generiche non hanno', () => {
    const effectOf = (id: string) => familyById(id)!.skill.effect;
    const genericKinds = new Set(generic.map((family) => family.skill.effect.kind));
    expect(genericKinds.has('melee_arc')).toBe(false);
    expect(effectOf('guardian_blade').kind).toBe('melee_arc');

    // Zona sul lanciatore con rallentamento: nessuna generica ha il rallentamento su una zona.
    for (const id of ['tomb_shroud', 'blizzard_veil']) {
      const effect = effectOf(id);
      if (effect.kind !== 'ground_blast') throw new Error('atteso uno scoppio');
      expect(effect.center, id).toBe('caster');
      expect(effect.zone.slowSeconds ?? 0, id).toBeGreaterThan(0);
    }
    for (const family of generic) {
      const effect = family.skill.effect;
      if (effect.kind === 'ground_blast') expect(effect.zone.slowSeconds, family.id).toBeUndefined();
    }
    const blizzard = effectOf('blizzard_veil');
    if (blizzard.kind !== 'ground_blast') throw new Error('atteso uno scoppio');
    expect(blizzard.zone.slowSeconds).toBeCloseTo(3, 10);

    const fan = effectOf('spore_fan');
    if (fan.kind !== 'projectile') throw new Error('atteso un proiettile');
    expect(fan.count).toBe(5);
    for (const family of generic) {
      const effect = family.skill.effect;
      if (effect.kind === 'projectile') expect(effect.count ?? 1, family.id).toBeLessThanOrEqual(3);
    }

    const bog = effectOf('bog_boots');
    if (bog.kind !== 'dash') throw new Error('atteso uno scatto');
    expect(bog.invulnerability).toBeGreaterThanOrEqual(0.8);
    for (const family of generic) {
      const effect = family.skill.effect;
      if (effect.kind === 'dash') expect(effect.invulnerability, family.id).toBeLessThan(0.6);
    }

    const plate = effectOf('forge_plate');
    if (plate.kind !== 'ground_blast') throw new Error('atteso uno scoppio');
    for (const family of generic) {
      const effect = family.skill.effect;
      if (effect.kind === 'ground_blast') expect(plate.zone.radius, family.id).toBeGreaterThan(effect.zone.radius);
    }

    const lance = effectOf('frost_lance');
    if (lance.kind !== 'projectile') throw new Error('atteso un proiettile');
    expect(lance.projectile.slowSeconds ?? 0).toBeGreaterThan(0);
    expect(PROJECTILE_LOOKS[lance.projectile.visual]!.shape).toBe('shard');

    const hammer = effectOf('forge_hammer');
    if (hammer.kind !== 'ground_blast') throw new Error('atteso uno scoppio');
    expect(hammer.center ?? 'aim').toBe('aim');
    expect(hammer.zone.radius).toBeLessThan(80);
    expect(familyById('forge_hammer')!.skill.cooldown).toBeCloseTo(1.4, 10);
    expect(familyById('forge_plate')!.skill.cooldown).toBe(7);
  });

  it('il danno al secondo (tutti i colpi a segno) resta nello stesso ordine di grandezza di quello base dello slot', () => {
    const dps = (skill: SkillDefinition): number => {
      const effect = skill.effect;
      const hits = effect.kind === 'projectile' ? (effect.count ?? 1) : 1;
      return (damageOf(skill) * hits) / skill.cooldown;
    };
    const reference = { primary_hand: dps(ARCANE_BOLT), secondary_hand: dps(FROST_ORB), armor: dps(METEOR) } as const;
    for (const family of ITEM_FAMILIES) {
      if (family.slot === 'boots') continue;
      const ratio = dps(family.skill) / reference[family.slot];
      expect(ratio, family.id).toBeGreaterThan(0.25);
      expect(ratio, family.id).toBeLessThan(2.5);
    }
  });
});

describe('oggetti', () => {
  it('resolveItem risolve famiglia e skill con i valori della rarita\'; famiglia sconosciuta = undefined', () => {
    const resolved = resolveItem({ uid: 'i1', familyId: 'meteor_mantle', rarity: 'epic' });
    expect(resolved?.family.id).toBe('meteor_mantle');
    expect(damageOf(resolved!.skill)).toBe(294); // 210 x 1,4
    expect(resolved!.skill).toEqual(resolveItemSkill(familyById('meteor_mantle')!, 'epic'));
    expect(resolveItem({ uid: 'i2', familyId: 'nope', rarity: 'rare' })).toBeUndefined();
    expect(itemName({ uid: 'i1', familyId: 'wind_boots', rarity: 'rare' })).toBe('Stivali del vento');
  });
});

describe('descrizione delle statistiche', () => {
  it('formatta i numeri all\'italiana', () => {
    expect(formatNumber(0.55)).toBe('0,55');
    expect(formatNumber(19)).toBe('19');
    expect(formatNumber(0.2)).toBe('0,2');
    expect(formatNumber(2.04)).toBe('2,04');
  });

  it('non e\' mai vuota, finisce con la ricarica e non contiene numeri non finiti, per ogni famiglia e rarita\'', () => {
    for (const family of ITEM_FAMILIES) {
      for (const rarity of RARITIES) {
        const lines = describeSkillStats(resolveItemSkill(family, rarity));
        expect(lines.length, `${family.id} ${rarity}`).toBeGreaterThanOrEqual(3);
        expect(lines[lines.length - 1]).toMatch(/^Ricarica \d+(,\d+)? s$/);
        for (const line of lines) expect(line).not.toMatch(/NaN|Infinity|undefined|\./);
      }
    }
  });

  it('descrive i valori reali per tipo di effetto', () => {
    expect(describeSkillStats(ARCANE_BOLT)).toEqual(['Danno 19', 'Gittata 1100', 'Ricarica 0,2 s']);
    expect(describeSkillStats(FROST_ORB)).toContain('Rallenta il boss 2 s');
    expect(describeSkillStats(ASTRAL_STEP)).toEqual(['Distanza 125', 'Invulnerabile 0,55 s', 'Ricarica 3,5 s']);
    expect(describeSkillStats(familyById('spore_fan')!.skill)).toContain('Colpi: 5');
    expect(describeSkillStats(familyById('tomb_shroud')!.skill)).toEqual([
      'Danno 170', 'Raggio 170', 'Scoppio dopo 0,9 s', 'Attorno a te', 'Rallenta il boss 2,5 s', 'Ricarica 9 s',
    ]);
    expect(describeSkillStats(METEOR)).toContain('Nel punto mirato');
    expect(describeSkillStats(familyById('guardian_blade')!.skill)).toEqual(['Danno 55', 'Gittata 95', 'Arco 120°', 'Ricarica 0,7 s']);
    // La rarita' cambia i numeri mostrati.
    expect(describeSkillStats(scaleSkill(ARCANE_BOLT, 'legendary'))).toEqual(['Danno 30', 'Gittata 1100', 'Ricarica 0,16 s']);
  });
});
