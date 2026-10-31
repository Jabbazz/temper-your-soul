import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { CRYPT_ARENA } from '../dungeons/crypt';
import type { DangerZoneSpec } from '../combat/danger-zone';
import type { GameEvent } from '../combat/events';
import type { ProjectileSpec } from '../combat/projectile';
import { Player } from '../player/player';
import { ARCANE_BOLT, ASTRAL_STEP, FROST_ORB, MAGE_SKILLS, METEOR } from './mage-skills';
import { SkillBar } from './skill-bar';
import type { SkillDefinition } from './skill-definition';
import { tryCastSkill, type SkillContext } from './skill-effects';

function harness(player = new Player(CRYPT_ARENA, MAGE_SKILLS)) {
  const projectiles: Array<{ spec: ProjectileSpec; position: Vec2; angle: number }> = [];
  const zones: Array<{ spec: DangerZoneSpec; position: Vec2 }> = [];
  const strikes: Array<{ origin: Vec2; angle: number; range: number; arc: number; damage: number }> = [];
  const events: GameEvent[] = [];
  const ctx: SkillContext = {
    player,
    spawnProjectile: (spec, position, angle) => projectiles.push({ spec, position, angle }),
    spawnZone: (spec, position) => zones.push({ spec, position }),
    strikeArc: (origin, angle, range, arc, damage) => strikes.push({ origin, angle, range, arc, damage }),
    emit: (event) => events.push(event),
  };
  return { player, ctx, projectiles, zones, strikes, events };
}

describe('SkillBar', () => {
  it('ogni slot ha la propria ricarica, che parte quando la skill viene usata', () => {
    const bar = new SkillBar(MAGE_SKILLS);
    expect(MAGE_SKILLS.map((_, slot) => bar.isReady(slot))).toEqual([true, true, true, true]);
    bar.start(1);
    expect(bar.isReady(1)).toBe(false);
    expect(bar.isReady(0)).toBe(true);
    expect(bar.cooldownFraction(1)).toBe(1);
    bar.tick(1.2);
    expect(bar.cooldownFraction(1)).toBeCloseTo(0.5, 10);
    bar.tick(1.2);
    expect(bar.isReady(1)).toBe(true);
    expect(bar.cooldownFraction(1)).toBe(0);
  });

  it('le ricariche delle quattro skill sono 0,2 / 2,4 / 5 / 3,5 secondi', () => {
    expect(MAGE_SKILLS.map((skill) => skill.cooldown)).toEqual([0.2, 2.4, 5, 3.5]);
  });

  it('gli id delle skill sono stabili e nell\'ordine degli slot', () => {
    expect(MAGE_SKILLS.map((skill) => skill.id)).toEqual(['arcane_bolt', 'frost_orb', 'meteor', 'astral_step']);
  });
});

describe('dardo arcano', () => {
  it('spara un proiettile verso la mira dall\'altezza del bastone', () => {
    const { player, ctx, projectiles, events } = harness();
    player.aim = player.position.add(new Vec2(0, 300));
    expect(tryCastSkill(0, ctx)).toBe(true);
    expect(projectiles).toHaveLength(1);
    const shot = projectiles[0]!;
    expect(shot.position).toEqual(player.position.add(new Vec2(0, -7)));
    expect(shot.angle).toBeCloseTo(Math.PI / 2, 10);
    expect(shot.spec).toMatchObject({ team: 'player', speed: 440, damage: 19, radius: 4, lifetime: 2.5, visual: 'arcane_bolt' });
    expect(shot.spec.slowSeconds).toBeUndefined();
    expect(events).toEqual([expect.objectContaining({ type: 'skill_cast', skillId: 'arcane_bolt' })]);
  });

  it('non si puo\' rilanciare prima della ricarica e riparte dopo 0,2 s', () => {
    const { player, ctx, projectiles } = harness();
    expect(tryCastSkill(0, ctx)).toBe(true);
    expect(tryCastSkill(0, ctx)).toBe(false);
    player.tick(0.19);
    expect(tryCastSkill(0, ctx)).toBe(false);
    player.tick(0.02);
    expect(tryCastSkill(0, ctx)).toBe(true);
    expect(projectiles).toHaveLength(2);
  });

  it('mirando sul proprio punto non produce angoli non numerici', () => {
    const { player, ctx, projectiles } = harness();
    player.aim = player.position;
    tryCastSkill(0, ctx);
    expect(Number.isFinite(projectiles[0]!.angle)).toBe(true);
  });
});

describe('globo di gelo', () => {
  it('e\' un proiettile lento e pesante che rallenta il boss per 2 s', () => {
    const { ctx, projectiles } = harness();
    expect(tryCastSkill(1, ctx)).toBe(true);
    expect(projectiles[0]!.spec).toMatchObject({
      team: 'player',
      speed: 310,
      damage: 100,
      radius: 8,
      lifetime: 2.5,
      visual: 'frost_orb',
      slowSeconds: 2,
    });
  });

  it('usarlo non blocca il dardo (ricariche indipendenti)', () => {
    const { ctx, projectiles } = harness();
    expect(tryCastSkill(1, ctx)).toBe(true);
    expect(tryCastSkill(0, ctx)).toBe(true);
    expect(projectiles).toHaveLength(2);
  });
});

describe('meteora', () => {
  it('crea una zona del giocatore nel punto mirato, che esplode dopo 0,65 s', () => {
    const { player, ctx, zones, events } = harness();
    player.aim = new Vec2(1200, 900);
    expect(tryCastSkill(2, ctx)).toBe(true);
    expect(zones).toEqual([{ spec: { team: 'player', radius: 66, delay: 0.65, damage: 210 }, position: new Vec2(1200, 900) }]);
    expect(events).toEqual([expect.objectContaining({ type: 'skill_cast', skillId: 'meteor', destination: new Vec2(1200, 900) })]);
  });

  it('il punto mirato viene portato dentro l\'arena (margine 40)', () => {
    const { player, ctx, zones } = harness();
    player.aim = new Vec2(-500, 99999);
    tryCastSkill(2, ctx);
    expect(zones[0]!.position).toEqual(new Vec2(CRYPT_ARENA.playerMargin, CRYPT_ARENA.height - CRYPT_ARENA.playerMargin));
  });
});

describe('passo astrale', () => {
  it('sposta il giocatore di 125 unita\' verso la mira e lo rende invulnerabile per 0,55 s', () => {
    const { player, ctx, events } = harness();
    const start = player.position;
    player.aim = start.add(new Vec2(-1000, 0));
    expect(tryCastSkill(3, ctx)).toBe(true);
    expect(player.position.x).toBeCloseTo(start.x - 125, 6);
    expect(player.position.y).toBeCloseTo(start.y, 6);
    expect(player.invulnerableFor).toBeCloseTo(0.55, 10);
    expect(events).toEqual([expect.objectContaining({ type: 'skill_cast', skillId: 'astral_step', origin: start, destination: player.position })]);
  });

  it('non esce dall\'arena', () => {
    const { player, ctx } = harness();
    player.position = new Vec2(CRYPT_ARENA.playerMargin + 10, CRYPT_ARENA.playerMargin + 10);
    player.aim = new Vec2(-1000, -1000);
    tryCastSkill(3, ctx);
    expect(player.position).toEqual(new Vec2(CRYPT_ARENA.playerMargin, CRYPT_ARENA.playerMargin));
  });

  it('con il colpo appena subito, lo scatto non accorcia l\'invulnerabilita\' (resta 0,65, non 0,55 come nel prototipo)', () => {
    const { player, ctx } = harness();
    player.tryHurt(10);
    expect(player.invulnerableFor).toBeCloseTo(0.65, 10);
    tryCastSkill(3, ctx);
    expect(player.invulnerableFor).toBeCloseTo(0.65, 10);
  });

  it('se l\'invulnerabilita\' rimasta e\' minore, lo scatto la porta a 0,55', () => {
    const { player, ctx } = harness();
    player.invulnerableFor = 0.2;
    tryCastSkill(3, ctx);
    expect(player.invulnerableFor).toBeCloseTo(0.55, 10);
  });
});

describe('dati delle skill', () => {
  it('ogni skill ha testi, aspetto e ricarica positiva', () => {
    for (const skill of [ARCANE_BOLT, FROST_ORB, METEOR, ASTRAL_STEP]) {
      expect(skill.name.length).toBeGreaterThan(0);
      expect(skill.description.length).toBeGreaterThan(0);
      expect(skill.visual.length).toBeGreaterThan(0);
      expect(skill.cooldown).toBeGreaterThan(0);
    }
  });

  it('proiettili e zone delle skill del mago sono della squadra del giocatore', () => {
    for (const skill of MAGE_SKILLS) {
      if (skill.effect.kind === 'projectile') expect(skill.effect.projectile.team).toBe('player');
      if (skill.effect.kind === 'ground_blast') expect(skill.effect.zone.team).toBe('player');
    }
  });
});

describe('nuovi tipi di effetto', () => {
  const FAN: SkillDefinition = {
    id: 'test_fan',
    name: 'Ventaglio',
    description: 'prova',
    cooldown: 1,
    visual: 'test_fan',
    effect: {
      kind: 'projectile',
      muzzleOffset: new Vec2(0, -7),
      count: 3,
      spread: 0.2,
      projectile: { team: 'player', speed: 400, damage: 10, radius: 4, lifetime: 2, visual: 'test_fan' },
    },
  };
  const SLASH: SkillDefinition = {
    id: 'test_slash',
    name: 'Fendente',
    description: 'prova',
    cooldown: 0.5,
    visual: 'test_slash',
    effect: { kind: 'melee_arc', range: 90, arc: 1.6, damage: 40 },
  };
  const NOVA: SkillDefinition = {
    id: 'test_nova',
    name: 'Nova',
    description: 'prova',
    cooldown: 4,
    visual: 'test_nova',
    effect: { kind: 'ground_blast', center: 'caster', zone: { team: 'player', radius: 110, delay: 0.4, damage: 120, slowSeconds: 3 } },
  };

  it('un proiettile con count > 1 si apre a ventaglio centrato sulla mira', () => {
    const player = new Player(CRYPT_ARENA, [FAN, null, null, null]);
    const { ctx, projectiles } = harness(player);
    player.aim = player.position.add(new Vec2(0, 300));
    expect(tryCastSkill(0, ctx)).toBe(true);
    expect(projectiles.map((shot) => shot.angle)).toEqual([
      expect.closeTo(Math.PI / 2 - 0.2, 10),
      expect.closeTo(Math.PI / 2, 10),
      expect.closeTo(Math.PI / 2 + 0.2, 10),
    ]);
  });

  it('senza count ne\' spread spara un solo proiettile (come le skill base)', () => {
    const { ctx, projectiles } = harness();
    tryCastSkill(0, ctx);
    expect(projectiles).toHaveLength(1);
  });

  it('una zona sul lanciatore nasce sotto il giocatore, senza clamp sul mirino', () => {
    const player = new Player(CRYPT_ARENA, [null, null, NOVA, null]);
    const { ctx, zones, events } = harness(player);
    player.aim = new Vec2(-999, -999);
    expect(tryCastSkill(2, ctx)).toBe(true);
    expect(zones[0]!.position).toEqual(player.position);
    expect(zones[0]!.spec.slowSeconds).toBe(3);
    expect(events[0]).toMatchObject({ type: 'skill_cast', kind: 'ground_blast', visual: 'test_nova' });
  });

  it('il colpo ravvicinato chiede a Match di colpire con portata, arco e danno, e lo racconta nell\'evento', () => {
    const player = new Player(CRYPT_ARENA, [SLASH, null, null, null]);
    const { ctx, strikes, events, projectiles } = harness(player);
    player.aim = player.position.add(new Vec2(50, 0));
    expect(tryCastSkill(0, ctx)).toBe(true);
    expect(strikes).toEqual([{ origin: player.position, angle: 0, range: 90, arc: 1.6, damage: 40 }]);
    expect(projectiles).toHaveLength(0);
    expect(events[0]).toMatchObject({ kind: 'melee_arc', range: 90, arc: 1.6, skillId: 'test_slash' });
  });

  it('uno slot vuoto non lancia nulla, non e\' mai pronto e non ha ricarica', () => {
    const player = new Player(CRYPT_ARENA, [null, null, null, null]);
    const { ctx, projectiles, zones, events } = harness(player);
    for (let slot = 0; slot < 4; slot++) {
      expect(player.skillBar.isReady(slot)).toBe(false);
      expect(player.skillBar.cooldownFraction(slot)).toBe(0);
      expect(tryCastSkill(slot, ctx)).toBe(false);
    }
    player.skillBar.start(0);
    expect(player.skillBar.cooldownFraction(0)).toBe(0);
    expect([projectiles.length, zones.length, events.length]).toEqual([0, 0, 0]);
  });

  it('lo scatto non finisce dentro un pilastro', () => {
    const pillar = { position: new Vec2(1600 + 125, 1350), radius: 40 };
    const player = new Player({ ...CRYPT_ARENA, pillars: [pillar] }, [null, null, null, ASTRAL_STEP]);
    const { ctx } = harness(player);
    player.aim = player.position.add(new Vec2(500, 0));
    tryCastSkill(3, ctx);
    expect(player.position.distanceTo(pillar.position)).toBeGreaterThanOrEqual(50 - 1e-6);
  });
});
