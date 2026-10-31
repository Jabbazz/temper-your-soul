export const TAU = Math.PI * 2;

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
export const lerp = (from: number, to: number, weight: number): number => from + (to - from) * weight;

/** Differenza tra due angoli, riportata in [-PI, PI]. */
export const angleDifference = (from: number, to: number): number => {
  let difference = (to - from) % TAU;
  if (difference > Math.PI) difference -= TAU;
  else if (difference < -Math.PI) difference += TAU;
  return difference;
};

/** Vettore 2D immutabile. Ogni operazione restituisce un nuovo vettore. */
export class Vec2 {
  static readonly ZERO = new Vec2(0, 0);

  constructor(
    readonly x: number = 0,
    readonly y: number = 0,
  ) {}

  static fromAngle(angle: number, length = 1): Vec2 {
    return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  add(other: Vec2): Vec2 {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vec2): Vec2 {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  mul(factor: number): Vec2 {
    return new Vec2(this.x * factor, this.y * factor);
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** Vettore unitario; il vettore nullo resta nullo. */
  normalized(): Vec2 {
    const length = this.length();
    return length > 0 ? this.mul(1 / length) : Vec2.ZERO;
  }

  /** Angolo del vettore (da `this` verso destra, in senso orario con y verso il basso). */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  distanceTo(other: Vec2): number {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }

  /** Angolo della direzione da `this` verso `other`. */
  angleTo(other: Vec2): number {
    return Math.atan2(other.y - this.y, other.x - this.x);
  }

  lerp(to: Vec2, weight: number): Vec2 {
    return new Vec2(lerp(this.x, to.x, weight), lerp(this.y, to.y, weight));
  }

  equals(other: Vec2): boolean {
    return this.x === other.x && this.y === other.y;
  }
}
