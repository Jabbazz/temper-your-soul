import type { Camera } from '../../core/camera';
import { cosmeticRng, type Rng } from '../../core/rng';
import { TAU, Vec2 } from '../../core/vec2';
import type { GameEvent } from '../combat/events';
import type { Projectile } from '../combat/projectile';
import type { Match } from '../match/match';
import { projectileLook, zoneLook, type ZoneLook } from './visuals';

/** Numero massimo di particelle e di onde contemporanee. */
const MAX_PARTICLES = 1400;
const MAX_WAVES = 80;
/** Ogni quanti secondi un proiettile lascia un punto della scia e una particella. */
const TRAIL_INTERVAL = 0.025;
const TRAIL_LENGTH = 9;

/**
 * Colore dello scoppio al lancio, per id di aspetto della skill, dove differisce dal colore del proiettile
 * (valori del prototipo per le skill base). Se manca si usa il colore del proiettile.
 */
const CAST_COLORS: Readonly<Record<string, string>> = {
  arcane_bolt: '#c8a7ff',
  frost_orb: '#a5efff',
  meteor: '#cba5ff',
};

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  remaining: number;
  total: number;
  color: string;
  size: number;
  gravity: number;
}

/** Anello che si espande da un punto. */
export interface Wave {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: string;
  remaining: number;
  readonly total: number;
}

/** Testo che sale e svanisce (numeri del danno, nomi degli attacchi). */
export interface FloatingText {
  x: number;
  y: number;
  readonly text: string;
  readonly color: string;
  remaining: number;
}

/** Bagliore residuo di una zona dopo lo scoppio. */
export interface ZoneFlash {
  readonly position: Vec2;
  readonly radius: number;
  readonly look: ZoneLook;
  remaining: number;
  readonly total: number;
}

/** Fendente visibile di un colpo ravvicinato: un arco davanti al giocatore che svanisce in fretta. */
export interface Slash {
  readonly position: Vec2;
  readonly angle: number;
  readonly range: number;
  readonly arc: number;
  readonly color: string;
  remaining: number;
  readonly total: number;
}

const SLASH_LIFE = 0.18;
const TEXT_LIFE = 0.9;
const FLASH_LIFE = 0.65;

/**
 * Effetti visivi: particelle, onde, testi e scie. Nascono dagli eventi della simulazione e dallo stato dei suoi
 * oggetti, ma non influiscono mai sulle regole. Usa una sorgente casuale propria (estetica, non riproducibile).
 */
export class Effects {
  particles: Particle[] = [];
  waves: Wave[] = [];
  texts: FloatingText[] = [];
  flashes: ZoneFlash[] = [];
  slashes: Slash[] = [];
  /** Intensita' della scossa dello schermo, in unita' di vista: decade da sola. */
  shake = 0;

  private readonly trails = new Map<number, { emit: number; points: Vec2[] }>();

  constructor(private readonly rng: Rng = cosmeticRng) {}

  clear(): void {
    this.particles = [];
    this.waves = [];
    this.texts = [];
    this.flashes = [];
    this.slashes = [];
    this.shake = 0;
    this.trails.clear();
  }

  /** Punti della scia di un proiettile, dal piu' vecchio al piu' recente. */
  trailOf(projectile: Projectile): readonly Vec2[] {
    return this.trails.get(projectile.id)?.points ?? [];
  }

  handle(event: GameEvent): void {
    switch (event.type) {
      case 'skill_cast':
        this.onSkillCast(event);
        break;
      case 'damage_dealt':
        if (event.target === 'boss') {
          this.text(event.position.x + (this.rng.next() - 0.5) * 30, event.position.y - 30, String(event.amount), '#ffe7a9');
          this.burst(event.position, '#d8a5fa', 5);
        } else {
          this.text(event.position.x, event.position.y - 20, `−${event.amount}`, '#ff8e83');
          this.shake = 5;
        }
        break;
      case 'projectile_hit': {
        const color = projectileLook(event.visual).color;
        const big = event.radius > 6;
        this.burst(event.position, color, big ? 24 : 9);
        this.wave(event.position, big ? 35 : 19, color, 0.28);
        if (event.visual === 'frost_orb') {
          for (let i = 0; i < 10; i++) {
            const a = (i * Math.PI) / 5;
            this.particle(event.position.x, event.position.y, Math.cos(a) * 150, Math.sin(a) * 150, '#d5fbff', 0.45, 4, 30);
          }
        }
        break;
      }
      case 'zone_detonated':
        this.onZoneDetonated(event.position, event.radius, zoneLook(event.team, event.visual));
        break;
      case 'boss_teleported':
        for (const point of [event.from, event.to]) {
          this.burst(point, '#d9c6ff', 22);
          this.wave(point, 46, '#e8dcff', 0.4);
        }
        break;
      case 'boss_phase_changed':
        this.text(event.position.x, event.position.y - 48, event.text, '#ff785d');
        this.burst(event.position, '#ff735b', 40);
        this.shake = 6;
        break;
      case 'boss_attack':
        this.text(event.position.x, event.position.y + event.labelOffsetY, event.name, event.color);
        break;
      case 'boss_charge_finished':
        this.burst(event.position, '#ffb06b', 24);
        this.shake = 5;
        break;
      case 'boss_defeated':
        this.burst(event.position, '#ffd17f', 90);
        break;
      case 'boss_pose':
      case 'match_ended':
        break;
    }
  }

  /** Avanza gli effetti di `dt` secondi e genera quelli che dipendono dallo stato (scie, carica del boss). */
  update(dt: number, match: Match, camera: Camera): void {
    this.updateTrails(dt, match.projectiles, camera);
    const charge = match.boss.charge;
    if (charge !== null && charge.elapsed >= charge.windup && match.boss.health.current > 0) {
      this.burst(match.boss.position, '#d89865', 2);
    }

    for (const f of this.particles) {
      f.remaining -= dt;
      f.vy += f.gravity * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= Math.exp(-dt * 1.8);
    }
    this.particles = this.particles.filter((f) => f.remaining > 0);
    for (const w of this.waves) w.remaining -= dt;
    this.waves = this.waves.filter((w) => w.remaining > 0);
    for (const t of this.texts) {
      t.y -= 25 * dt;
      t.remaining -= dt;
    }
    this.texts = this.texts.filter((t) => t.remaining > 0);
    for (const flash of this.flashes) flash.remaining -= dt;
    this.flashes = this.flashes.filter((flash) => flash.remaining > 0);
    for (const slash of this.slashes) slash.remaining -= dt;
    this.slashes = this.slashes.filter((slash) => slash.remaining > 0);
    this.shake = Math.max(0, this.shake - dt * 25);
  }

  /** Scostamento di camera per la scossa corrente (zero a riposo). */
  shakeOffset(): Vec2 {
    if (this.shake <= 0) return Vec2.ZERO;
    return new Vec2((this.rng.next() - 0.5) * this.shake, (this.rng.next() - 0.5) * this.shake);
  }

  private onSkillCast(event: Extract<GameEvent, { type: 'skill_cast' }>): void {
    const { origin, destination } = event;
    switch (event.kind) {
      case 'projectile': {
        const color = CAST_COLORS[event.visual] ?? projectileLook(event.visual).color;
        this.burst(origin.add(Vec2.fromAngle(event.angle, 14)), color, 8);
        this.wave(origin, 16, color, 0.18);
        break;
      }
      case 'ground_blast':
        // Il segnale e lo scoppio sono della zona; attorno al lanciatore si vede solo un anello.
        if (origin.equals(destination)) this.wave(origin, 30, CAST_COLORS[event.visual] ?? '#cba5ff', 0.3);
        break;
      case 'dash':
        this.burst(origin, '#b8a4ef');
        this.wave(origin, 24, '#b8a4ef');
        for (let j = 0; j < 30; j++) {
          const u = j / 30;
          const point = origin.lerp(destination, u);
          this.particle(
            point.x,
            point.y,
            (this.rng.next() - 0.5) * 25,
            (this.rng.next() - 0.5) * 25,
            '#c6acff',
            0.25 + u * 0.3,
            2 + this.rng.next() * 3,
          );
        }
        this.wave(destination, 28, '#dfccff');
        this.burst(destination, '#b8a4ef');
        break;
      case 'melee_arc': {
        const color = CAST_COLORS[event.visual] ?? '#ffd9a0';
        const range = event.range ?? 80;
        this.slashes.push({
          position: origin,
          angle: event.angle,
          range,
          arc: event.arc ?? 1.6,
          color,
          remaining: SLASH_LIFE,
          total: SLASH_LIFE,
        });
        this.burst(origin.add(Vec2.fromAngle(event.angle, range * 0.8)), color, 6);
        break;
      }
    }
  }

  private onZoneDetonated(position: Vec2, radius: number, look: ZoneLook): void {
    this.wave(position, radius, look.burst, 0.55);
    this.wave(position, radius * 0.8, '#fff1ce', 0.3);
    for (let i = 0; i < 65; i++) {
      const a = this.rng.next() * TAU;
      const v = 40 + this.rng.next() * radius * 2;
      this.particle(
        position.x,
        position.y,
        Math.cos(a) * v,
        Math.sin(a) * v - 30,
        i % 3 === 0 ? '#fff1d7' : look.burst,
        0.35 + this.rng.next() * 0.6,
        2 + this.rng.next() * 5,
        115,
      );
    }
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8;
      this.particle(
        position.x + Math.cos(a) * radius * 0.65,
        position.y + Math.sin(a) * radius * 0.65,
        Math.cos(a) * 35,
        Math.sin(a) * 35,
        look.burst,
        0.7,
        3,
      );
    }
    this.flashes.push({ position, radius, look, remaining: FLASH_LIFE, total: FLASH_LIFE });
    this.shake = 3;
  }

  private updateTrails(dt: number, projectiles: readonly Projectile[], camera: Camera): void {
    const alive = new Set<number>();
    for (const projectile of projectiles) {
      alive.add(projectile.id);
      let trail = this.trails.get(projectile.id);
      if (trail === undefined) {
        trail = { emit: 0, points: [] };
        this.trails.set(projectile.id, trail);
      }
      trail.emit += dt;
      while (trail.emit >= TRAIL_INTERVAL) {
        trail.emit -= TRAIL_INTERVAL;
        trail.points.push(projectile.position);
        if (trail.points.length > TRAIL_LENGTH) trail.points.shift();
        if (camera.isVisible(projectile.position, 50)) {
          const r = projectile.radius;
          this.particle(
            projectile.position.x + (this.rng.next() - 0.5) * r,
            projectile.position.y + (this.rng.next() - 0.5) * r,
            -projectile.velocity.x * 0.07 + (this.rng.next() - 0.5) * 22,
            -projectile.velocity.y * 0.07 + (this.rng.next() - 0.5) * 22,
            projectileLook(projectile.spec.visual).color,
            0.18 + this.rng.next() * 0.16,
            projectile.team === 'enemy' ? 2 : 3,
          );
        }
      }
    }
    for (const id of this.trails.keys()) if (!alive.has(id)) this.trails.delete(id);
  }

  private particle(x: number, y: number, vx: number, vy: number, color: string, life = 0.45, size = 3, gravity = 0): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({ x, y, vx, vy, remaining: life, total: life, color, size, gravity });
  }

  private burst(position: Vec2, color: string, count = 16): void {
    for (let i = 0; i < count; i++) {
      const a = this.rng.next() * TAU;
      const v = 35 + this.rng.next() * 150;
      this.particle(position.x, position.y, Math.cos(a) * v, Math.sin(a) * v, color, 0.25 + this.rng.next() * 0.45, 2 + this.rng.next() * 3, 70);
    }
  }

  private wave(position: Vec2, radius: number, color: string, life = 0.4): void {
    this.waves.push({ x: position.x, y: position.y, radius, color, remaining: life, total: life });
    if (this.waves.length > MAX_WAVES) this.waves.shift();
  }

  private text(x: number, y: number, text: string, color: string): void {
    this.texts.push({ x, y, text, color, remaining: TEXT_LIFE });
  }
}
