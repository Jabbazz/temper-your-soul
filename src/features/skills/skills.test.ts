import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { ARENA } from '../arena/arena';
import type { DangerZoneSpec } from '../combat/danger-zone';
import type { GameEvent } from '../combat/events';
import type { ProjectileSpec } from '../combat/projectile';
import { Player } from '../player/player';
import { ARCANE_BOLT, ASTRAL_STEP, FROST_ORB, MAGE_SKILLS, METEOR } from './mage-skills';
import { SkillBar } from './skill-bar';
import { tryCastSkill, type SkillContext } from './skill-effects';

function harness(player = new Player()) {
  const projectiles: Array<{ spec: ProjectileSpec; position: Vec2; angle: number }> = [];
  const zones: Array<{ spec: DangerZoneSpec; position: Vec2 }> = [];
  const events: GameEvent[] = [];
  const ctx: SkillContext = {
    player,
    spawnProjectile: (spec, position, angle) => projectiles.push({ spec, position, angle }),
    spawnZone: (spec, position) => zones.push({ spec, position }),
    emit: (event) => events.push(event),
  };
  return { player, ctx, projectiles, zones, events };
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
    expect(zones[0]!.position).toEqual(new Vec2(ARENA.playerMargin, ARENA.height - ARENA.playerMargin));
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
    player.position = new Vec2(ARENA.playerMargin + 10, ARENA.playerMargin + 10);
    player.aim = new Vec2(-1000, -1000);
    tryCastSkill(3, ctx);
    expect(player.position).toEqual(new Vec2(ARENA.playerMargin, ARENA.playerMargin));
  });

  it('con il colpo appena subito, lo scatto imposta l\'invulnerabilita\' a 0,55 (come nel prototipo)', () => {
    const { player, ctx } = harness();
    player.tryHurt(10);
    expect(player.invulnerableFor).toBeCloseTo(0.65, 10);
    tryCastSkill(3, ctx);
    expect(player.invulnerableFor).toBeCloseTo(0.55, 10);
  });
});

describe('dati delle skill', () => {
  it('ogni skill ha testi, etichetta del comando e ricarica positiva', () => {
    for (const skill of [ARCANE_BOLT, FROST_ORB, METEOR, ASTRAL_STEP]) {
      expect(skill.name.length).toBeGreaterThan(0);
      expect(skill.description.length).toBeGreaterThan(0);
      expect(skill.keyLabel.length).toBeGreaterThan(0);
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
