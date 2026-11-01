import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../core/rng';
import { Vec2 } from '../../core/vec2';
import { dungeonById } from '../dungeons/dungeons';
import { Match, type PlayerIntent } from '../match/match';
import { roomArena, ROOM_TEMPLATES } from '../run/room-templates';
import { MAGE_SKILLS } from '../skills/mage-skills';
import { eventsOfType, recordEvents, STEP } from '../../testing';
import { MINIONS } from './minion-catalog';

/*
 * I comportamenti nuovi delle vene B e C (fase 7 dello studio sulla grafica): raffica in serie, spirale doppia,
 * anello all'arrivo, lanci ad anello, a croce e a cono, aure di fervore e riparazione, agguato, carica di sponda.
 */

const idle: PlayerIntent = { move: Vec2.ZERO, aimOffset: new Vec2(100, 0), skills: [false, false, false, false] };

/** Una stanza calma vuota (senza regista) con il giocatore fermo in `player`. */
function room(dungeonId: string, player: Vec2): Match {
  const dungeon = dungeonById(dungeonId)!;
  const template = ROOM_TEMPLATES[dungeonId]!.find((item) => item.use === 'calm')!;
  const match = new Match({ rng: new SeededRng(7), dungeon, loadout: MAGE_SKILLS, arena: roomArena(template, dungeon.arena.theme), boss: null });
  match.player.position = player;
  return match;
}

/** Fa avanzare la partita con il giocatore fermo e invulnerabile; `each` dopo ogni passo. */
function hold(match: Match, seconds: number, each: (step: number) => void = () => {}): void {
  const position = match.player.position;
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    match.player.health.current = match.player.health.max;
    match.player.invulnerableFor = 1;
    match.player.position = position;
    match.step(STEP, idle);
    each(i);
  }
}

/** Annota i proiettili nemici nuovi: id e passo in cui sono comparsi. */
function collect(match: Match, born: Map<number, number>, step: number): void {
  for (const projectile of match.projectiles) if (projectile.team === 'enemy' && !born.has(projectile.id)) born.set(projectile.id, step);
}

describe('comportamenti delle vene B e C', () => {
  it('raffica in serie: la canna d\'organo spara dodici raffiche di tre colpi una dopo l\'altra, senza nuova posa', () => {
    const match = room('crypt', new Vec2(850, 900));
    match.spawnMinion(MINIONS.organ_pipe!, new Vec2(850, 500));
    const born = new Map<number, number>();
    hold(match, 4, (step) => collect(match, born, step));
    const steps = [...born.values()].sort((a, b) => a - b);
    expect(steps.length).toBeGreaterThanOrEqual(30);
    // Le raffiche arrivano a 0,12 s l'una dall'altra: dalla prima all'ultima passano circa 11 intervalli.
    const span = (steps[35]! - steps[0]!) / 60;
    expect(span).toBeGreaterThan(1.1);
    expect(span).toBeLessThan(1.6);
  });

  it('spirale doppia: l\'astrolabio spara due anelli che ruotano in versi opposti', () => {
    const match = room('glacier', new Vec2(900, 900));
    const astrolabe = match.spawnMinion(MINIONS.living_astrolabe!, new Vec2(900, 500));
    const born = new Map<number, number>();
    hold(match, 4, (step) => collect(match, born, step));
    const byStep = new Map<number, number>();
    for (const step of born.values()) byStep.set(step, (byStep.get(step) ?? 0) + 1);
    const counts = [...byStep.entries()].sort((x, y) => x[0] - y[0]).map(([, count]) => count);
    // La prima raffica ha un solo anello (il secondo coinciderebbe), poi due bracci per ognuno dei due anelli.
    expect(counts[0]).toBe(2);
    expect(counts.slice(1).every((count) => count === 4)).toBe(true);
    expect(astrolabe.volleys).toBeGreaterThanOrEqual(16);
  });

  it('anello all\'arrivo: l\'aquila del leggio atterra e sparge dieci piume attorno a se\'', () => {
    const match = room('crypt', new Vec2(850, 900));
    const eagle = match.spawnMinion(MINIONS.lectern_eagle!, new Vec2(850, 600));
    let landed: Vec2 | null = null;
    let ring = 0;
    for (let i = 0; i < 4 * 60 && landed === null; i++) {
      match.player.invulnerableFor = 1;
      // In volo il giocatore si scansa: l'anello non lo tocca appena nato.
      if (eagle.state === 'airborne') match.player.position = new Vec2(1150, 900);
      match.step(STEP, idle);
      if (eagle.state === 'idle' && eagle.origin !== null) {
        landed = eagle.position;
        ring = match.projectiles.filter((p) => p.team === 'enemy' && p.position.distanceTo(eagle.position) < 30).length;
      }
    }
    expect(landed).not.toBeNull();
    expect(ring).toBe(10);
  });

  it('lancio ad anello: la lavandaia getta nove zone attorno al giocatore, il centro resta libero', () => {
    const player = new Vec2(850, 800);
    const match = room('swamp', player);
    match.spawnMinion(MINIONS.night_washer!, new Vec2(850, 450));
    const events = recordEvents(match);
    hold(match, 3.2);
    const zones = eventsOfType(events, 'zone_detonated').filter((event) => event.visual === 'swamp_washer_ring');
    expect(zones.length).toBe(9);
    for (const zone of zones) expect(zone.position.distanceTo(player)).toBeGreaterThan(80);
  });

  it('lancio a croce: il fochino segna il bersaglio e quattro bracci che scoppiano dal centro verso fuori', () => {
    const player = new Vec2(900, 700);
    const match = room('forge', player);
    match.spawnMinion(MINIONS.blaster!, new Vec2(900, 360));
    const events = recordEvents(match);
    hold(match, 2.6);
    const zones = match.zones.filter((zone) => zone.spec.visual === 'forge_blast_cross');
    expect(zones.length + eventsOfType(events, 'zone_detonated').filter((e) => e.visual === 'forge_blast_cross').length).toBe(13);
    // Piu' lontano dal centro, piu' tardi.
    const far = zones.filter((zone) => zone.position.distanceTo(player) > 120);
    const near = zones.filter((zone) => zone.position.distanceTo(player) < 60);
    if (far.length > 0 && near.length > 0) expect(Math.max(...far.map((z) => z.remaining))).toBeGreaterThan(Math.min(...near.map((z) => z.remaining)));
  });

  it('lancio a cono: il lettore di stelle getta cinque ondate di tre zone verso il giocatore', () => {
    const player = new Vec2(900, 800);
    const match = room('glacier', player);
    const reader = match.spawnMinion(MINIONS.star_reader!, new Vec2(900, 380));
    const events = recordEvents(match);
    hold(match, 2.4);
    const zones = match.zones.filter((zone) => zone.spec.visual === 'glacier_star_lance');
    expect(zones.length + eventsOfType(events, 'zone_detonated').filter((e) => e.visual === 'glacier_star_lance').length).toBe(15);
    for (const zone of zones) expect(zone.position.distanceTo(reader.position)).toBeLessThanOrEqual(reader.position.distanceTo(player) + 120);
  });

  it('aura di fervore: il maestro di cappella fa sparare piu\' spesso i vicini', () => {
    const match = room('crypt', new Vec2(850, 1000));
    match.spawnMinion(MINIONS.chapel_master!, new Vec2(850, 400));
    const pipe = match.spawnMinion(MINIONS.organ_pipe!, new Vec2(900, 420));
    const events = recordEvents(match);
    let hasted = false;
    hold(match, 4, () => {
      if (pipe.hasteFor > 0) hasted = true;
    });
    expect(hasted).toBe(true);
    expect(eventsOfType(events, 'minion_aura').some((event) => event.aura === 'haste')).toBe(true);
  });

  it('aura di riparazione: l\'armaiolo rimette in piedi i vicini feriti', () => {
    const match = room('forge', new Vec2(900, 1000));
    match.spawnMinion(MINIONS.armorer!, new Vec2(900, 400));
    const page = match.spawnMinion(MINIONS.empty_armor!, new Vec2(950, 420));
    page.health.current = 50;
    hold(match, 3.5);
    expect(page.health.current).toBeGreaterThanOrEqual(50 + Math.ceil(page.health.max * 0.15));
  });

  it('agguato: la volpe segna un punto dietro il giocatore, ci ricompare e morde con tre colpi', () => {
    const player = new Vec2(900, 700);
    const match = room('glacier', player);
    const fox = match.spawnMinion(MINIONS.arctic_fox!, new Vec2(900, 500));
    const events = recordEvents(match);
    const born = new Map<number, number>();
    let after: Vec2 | null = null;
    hold(match, 3, (step) => {
      collect(match, born, step);
      if (after === null && eventsOfType(events, 'minion_blinked').length > 0) after = fox.position;
    });
    const telegraph = eventsOfType(events, 'minion_telegraph').find((event) => event.action === 'blink');
    expect(telegraph?.to).toBeDefined();
    // Dietro il giocatore rispetto a dove stava la volpe.
    expect(telegraph!.to!.y).toBeGreaterThan(player.y);
    expect(after).not.toBeNull();
    expect(after!.distanceTo(telegraph!.to!)).toBeLessThan(1);
    expect(born.size).toBeGreaterThanOrEqual(3);
  });

  it('carica di sponda: il carrello impazzito tocca il muro e riparte riflesso', () => {
    const match = room('forge', new Vec2(900, 1100));
    match.spawnMinion(MINIONS.runaway_cart!, new Vec2(900, 700));
    const events = recordEvents(match);
    hold(match, 4);
    const charges = eventsOfType(events, 'minion_telegraph').filter((event) => event.action === 'charge');
    // La carica annunciata e almeno un rimbalzo sul muro in basso, che la rimanda verso l'alto.
    expect(charges.length).toBeGreaterThanOrEqual(2);
    const bounce = charges[1]!;
    expect(bounce.to!.y).toBeLessThan(bounce.position.y);
  });
});
