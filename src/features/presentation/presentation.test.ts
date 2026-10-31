import { describe, expect, it } from 'vitest';
import { Camera } from '../../core/camera';
import { SeededRng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import { Boss } from '../boss/boss';
import { Projectile, type ProjectileSpec } from '../combat/projectile';
import { DUNGEONS } from '../dungeons/dungeons';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { createBossHarness, createQuietMatch, intent, STEP } from '../../testing';
import { BOSS_ART } from './boss-art';
import { Effects } from './effects';
import { ActorPoses } from './poses';
import { MAGE_CASTING, MAGE_PALETTE, MAGE_WALK, type SpriteFrame } from './sprites';
import { ARENA_THEMES } from './themes';
import { PROJECTILE_LOOKS, ZONE_LOOKS, zoneLook } from './visuals';

const dimensions = (frame: SpriteFrame): string => `${frame[0]!.length}x${frame.length}`;
const symbolsOf = (frames: readonly SpriteFrame[]) => new Set(frames.flatMap((frame) => frame.flatMap((row) => [...row])));

describe('sprite', () => {
  it('i fotogrammi del mago sono matrici rettangolari della stessa misura e usano solo colori della tavolozza', () => {
    const frames = [...MAGE_WALK, MAGE_CASTING];
    for (const frame of frames) {
      expect(new Set(frame.map((row) => row.length)).size).toBe(1);
      expect(dimensions(frame)).toBe(dimensions(frames[0]!));
    }
    for (const symbol of symbolsOf(frames)) {
      if (symbol !== '.') expect(MAGE_PALETTE[symbol], `mago: ${symbol}`).toBeDefined();
    }
  });

  it('la grafica di ogni boss ha 4 fotogrammi di camminata e una posa di lancio coerenti, con la tavolozza completa', () => {
    for (const [id, art] of Object.entries(BOSS_ART)) {
      expect(art.walk, id).toHaveLength(4);
      const frames = [...art.walk, art.casting];
      for (const frame of frames) {
        expect(new Set(frame.map((row) => row.length)).size, `${id}: righe di lunghezza diversa`).toBe(1);
        expect(dimensions(frame), `${id}: misure diverse`).toBe(dimensions(frames[0]!));
      }
      for (const [slowed, enraged] of [[false, false], [true, false], [false, true], [true, true]] as const) {
        const palette = art.palette(slowed, enraged);
        for (const symbol of symbolsOf(frames)) {
          if (symbol !== '.') expect(palette[symbol], `${id}: simbolo ${symbol}`).toBeDefined();
        }
      }
      expect(art.scale).toBeGreaterThan(0);
    }
  });

  it('il guardiano cambia colore con il gelo (corpo) e con la furia (rune)', () => {
    const art = BOSS_ART.guardian!;
    expect(art.palette(true, false).b).not.toBe(art.palette(false, false).b);
    expect(art.palette(false, true).c).not.toBe(art.palette(false, false).c);
  });

  it('i fotogrammi di camminata sono quattro e si alternano', () => {
    expect(MAGE_WALK).toHaveLength(4);
    expect(MAGE_WALK[0]).toBe(MAGE_WALK[2]);
    expect(BOSS_ART.guardian!.walk[1]).not.toEqual(BOSS_ART.guardian!.walk[3]);
  });
});

describe('aspetto dei contenuti', () => {
  it('ogni dungeon usa una grafica del boss e un tema di mappa che esistono', () => {
    for (const dungeon of DUNGEONS) {
      expect(BOSS_ART[dungeon.boss.art], `${dungeon.id}: grafica ${dungeon.boss.art}`).toBeDefined();
      expect(ARENA_THEMES[dungeon.arena.theme], `${dungeon.id}: tema ${dungeon.arena.theme}`).toBeDefined();
    }
  });

  it('ogni proiettile e ogni zona che i dati possono creare ha un aspetto', () => {
    const projectiles: ProjectileSpec[] = [];
    const zoneVisuals = new Set<string | undefined>();
    for (const skill of MAGE_SKILLS) {
      if (skill.effect.kind === 'projectile') projectiles.push(skill.effect.projectile);
      if (skill.effect.kind === 'ground_blast') zoneVisuals.add(skill.effect.zone.visual);
    }
    for (const dungeon of DUNGEONS) {
      for (let index = 0; index < dungeon.boss.patterns.length; index++) {
        for (const enraged of [false, true]) {
          const boss = new Boss(dungeon.boss, dungeon.arena);
          boss.phase = enraged ? 2 : 1;
          boss.attackCount = index;
          boss.attackTimer = 0;
          const harness = createBossHarness(dungeon.arena.playerSpawn);
          for (let i = 0; i < 400; i++) boss.step(STEP, harness.ctx);
          projectiles.push(...harness.projectiles.map((shot) => shot.spec));
          for (const zone of harness.zones) zoneVisuals.add(zone.spec.visual);
        }
      }
    }
    expect(projectiles.length).toBeGreaterThan(50);
    for (const spec of projectiles) expect(PROJECTILE_LOOKS[spec.visual], spec.visual).toBeDefined();
    for (const visual of zoneVisuals) {
      if (visual !== undefined) expect(ZONE_LOOKS[visual], `zona ${visual}`).toBeDefined();
    }
  });

  it('una zona senza aspetto proprio usa quello della squadra; una sconosciuta non rompe il disegno', () => {
    expect(zoneLook('enemy')).toBe(ZONE_LOOKS.enemy);
    expect(zoneLook('player', 'non_esiste')).toBe(ZONE_LOOKS.player);
  });
});

describe('effetti', () => {
  const camera = new Camera();
  camera.setViewSize(960, 540);
  camera.follow(new Vec2(1600, 1350));
  const seeded = () => new Effects(new SeededRng(5));

  it('il danno al boss mostra il numero del colpo e qualche particella; quello al giocatore il numero rosso e la scossa', () => {
    const effects = seeded();
    effects.handle({ type: 'damage_dealt', target: 'boss', amount: 19, position: new Vec2(100, 100) });
    expect(effects.texts.map((t) => t.text)).toEqual(['19']);
    expect(effects.particles.length).toBe(5);
    effects.handle({ type: 'damage_dealt', target: 'player', amount: 18, position: new Vec2(100, 100) });
    expect(effects.texts.map((t) => t.text)).toEqual(['19', '−18']);
    expect(effects.shake).toBe(5);
  });

  it('lo scoppio di una zona crea onde, particelle, un bagliore residuo e una scossa', () => {
    const effects = seeded();
    effects.handle({ type: 'zone_detonated', position: new Vec2(50, 50), radius: 42, team: 'enemy' });
    expect(effects.waves).toHaveLength(2);
    expect(effects.particles.length).toBe(65 + 16);
    expect(effects.flashes).toHaveLength(1);
    expect(effects.shake).toBe(3);
  });

  it('il nome dell\'attacco compare sopra il boss con il suo scostamento', () => {
    const effects = seeded();
    effects.handle({ type: 'boss_phase_changed', position: new Vec2(5, 100), phase: 2, text: 'LA MADRE SI DESTA' });
    expect(effects.texts.map((t) => t.text)).toContain('LA MADRE SI DESTA');
    effects.clear();
    effects.handle({ type: 'boss_attack', patternId: 'ember_burst', position: new Vec2(100, 200), name: 'RAFFICA', color: '#fff', labelOffsetY: -42 });
    expect(effects.texts[0]).toMatchObject({ text: 'RAFFICA', x: 100, y: 158 });
  });

  it('tutto svanisce col tempo: particelle, onde, testi, bagliori e scossa', () => {
    const effects = seeded();
    const match = createQuietMatch();
    effects.handle({ type: 'zone_detonated', position: new Vec2(50, 50), radius: 42, team: 'player' });
    effects.handle({ type: 'damage_dealt', target: 'boss', amount: 5, position: new Vec2(0, 0) });
    for (let i = 0; i < 60 * 3; i++) effects.update(STEP, match, camera);
    expect(effects.particles).toHaveLength(0);
    expect(effects.waves).toHaveLength(0);
    expect(effects.texts).toHaveLength(0);
    expect(effects.flashes).toHaveLength(0);
    expect(effects.shake).toBe(0);
    expect(effects.shakeOffset()).toEqual(Vec2.ZERO);
  });

  it('il numero di particelle e di onde ha un tetto', () => {
    const effects = seeded();
    for (let i = 0; i < 40; i++) effects.handle({ type: 'boss_defeated', position: new Vec2(0, 0) });
    expect(effects.particles.length).toBeLessThanOrEqual(1400);
    for (let i = 0; i < 200; i++) effects.handle({ type: 'skill_cast', skillId: 'astral_step', visual: 'astral_step', kind: 'dash', origin: new Vec2(0, 0), destination: new Vec2(10, 0), angle: 0 });
    expect(effects.waves.length).toBeLessThanOrEqual(80);
  });

  it('le scie seguono i proiettili e vengono dimenticate quando spariscono', () => {
    const effects = seeded();
    const match = createQuietMatch();
    const spec: ProjectileSpec = { team: 'enemy', speed: 50, damage: 1, radius: 4, lifetime: 5, visual: 'ember_nova' };
    const projectile = new Projectile(1, spec, match.player.position.add(new Vec2(300, 0)), 0);
    match.projectiles.push(projectile);
    for (let i = 0; i < 60; i++) {
      projectile.advance(STEP);
      effects.update(STEP, match, camera);
    }
    expect(effects.trailOf(projectile).length).toBeGreaterThan(0);
    expect(effects.trailOf(projectile).length).toBeLessThanOrEqual(9);
    expect(effects.particles.length).toBeGreaterThan(0);
    match.projectiles = [];
    effects.update(STEP, match, camera);
    expect(effects.trailOf(projectile)).toHaveLength(0);
  });

  it('fuori dalla vista le scie non producono particelle', () => {
    const effects = seeded();
    const match = createQuietMatch();
    const spec: ProjectileSpec = { team: 'enemy', speed: 0, damage: 1, radius: 4, lifetime: 5, visual: 'ember_nova' };
    match.projectiles.push(new Projectile(1, spec, new Vec2(100, 100), 0));
    for (let i = 0; i < 30; i++) effects.update(STEP, match, camera);
    expect(effects.particles).toHaveLength(0);
  });

  it('clear() svuota tutto', () => {
    const effects = seeded();
    effects.handle({ type: 'boss_defeated', position: new Vec2(0, 0) });
    effects.handle({ type: 'boss_phase_changed', position: new Vec2(0, 0), phase: 2, text: 'IL BOSS SI INFURIA' });
    effects.clear();
    expect([effects.particles.length, effects.texts.length, effects.shake]).toEqual([0, 0, 0]);
  });

  it('gli effetti non toccano la simulazione (stessa partita con e senza effetti)', () => {
    const withEffects = createQuietMatch(3);
    const without = createQuietMatch(3);
    const effects = seeded();
    withEffects.events.connect((event) => effects.handle(event));
    const command = (match: typeof withEffects) =>
      intent(match, { move: new Vec2(1, 0), aim: match.boss.position, skills: [true, true, true, true] });
    for (let i = 0; i < 600; i++) {
      withEffects.step(STEP, command(withEffects));
      effects.update(STEP, withEffects, camera);
      without.step(STEP, command(without));
    }
    expect(withEffects.player.position).toEqual(without.player.position);
    expect(withEffects.boss.health.current).toBe(without.boss.health.current);
    expect(withEffects.projectiles.length).toBe(without.projectiles.length);
  });
});

describe('pose', () => {
  it('il lancio dura 0,16 s e la posa del boss la durata dell\'evento', () => {
    const poses = new ActorPoses();
    poses.handle({ type: 'skill_cast', skillId: 'arcane_bolt', visual: 'arcane_bolt', kind: 'projectile', origin: Vec2.ZERO, destination: Vec2.ZERO, angle: 0 });
    poses.handle({ type: 'boss_pose', seconds: 0.5 });
    expect(poses.playerCast).toBeCloseTo(0.16, 10);
    expect(poses.bossCast).toBe(0.5);
    poses.update(0.2, false);
    expect(poses.playerCast).toBe(0);
    expect(poses.bossCast).toBeCloseTo(0.3, 10);
  });

  it('la camminata avanza solo mentre ci si muove e si azzera da fermi', () => {
    const poses = new ActorPoses();
    poses.update(1, true);
    expect(poses.walkPhase).toBeCloseTo(9, 10);
    poses.update(0.1, false);
    expect(poses.walkPhase).toBe(0);
  });

  it('reset azzera tutto', () => {
    const poses = new ActorPoses();
    poses.handle({ type: 'boss_pose', seconds: 1 });
    poses.update(0.1, true);
    poses.reset();
    expect([poses.walkPhase, poses.playerCast, poses.bossCast]).toEqual([0, 0, 0]);
  });
});
