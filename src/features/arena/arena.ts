import { clamp, Vec2 } from '../../core/vec2';

/** Temi grafici delle mappe: ognuno ha il proprio disegno in `presentation/themes/`. */
export type ArenaThemeId = 'crypt' | 'swamp' | 'forge' | 'glacier';

/** Ostacolo cilindrico: blocca il movimento del giocatore e assorbe i proiettili (di entrambe le squadre). Blocca anche i boss. */
export interface Pillar {
  readonly position: Vec2;
  readonly radius: number;
}

/**
 * Massiccio rettangolare dentro la mappa (un blocco di pietra, un argine, un muro interno): come un pilastro ferma il
 * movimento di giocatori, servitori e boss e assorbe i proiettili di entrambe le squadre. Angolo alto a sinistra e misure.
 */
export interface Solid {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /**
   * Solo nella mappa di una partita con ripari: l'indice del riparo (`ArenaDefinition.covers`) che questo massiccio
   * rappresenta finche' resiste. Un riparo e' basso: ferma corpi e colpi, ma non la vista.
   */
  readonly cover?: number;
}

/** Ponte sopra un pozzo: il tratto di pavimento fra due pozzi, disegnato come un ponte. 'ns' si attraversa dall'alto in basso. */
export interface Bridge extends Solid {
  readonly along: 'ns' | 'ew';
}

/**
 * La mappa di un dungeon: dimensioni, punti di partenza, margini e ostacoli. Dati di sola lettura, provvisori
 * (vedi docs/game-design.md). Le coordinate sono in unita' di mondo; l'origine e' l'angolo alto a sinistra.
 * Vincolo dei dati: i pilastri stanno a distanza dai bordi (almeno `playerMargin` + raggio + corpo del giocatore) e non
 * coprono i punti di partenza.
 */
export interface ArenaDefinition {
  readonly id: string;
  /** Nome della mappa (in italiano). */
  readonly name: string;
  readonly theme: ArenaThemeId;
  readonly width: number;
  readonly height: number;
  /** Spessore del muro perimetrale (solo aspetto: il confine di gioco e' dato dai margini sotto). */
  readonly wallThickness: number;
  readonly playerSpawn: Vec2;
  readonly bossSpawn: Vec2;
  /** Distanza minima dal bordo per il centro del giocatore, dei suoi spostamenti e del bersaglio delle zone del giocatore. */
  readonly playerMargin: number;
  /** Distanza minima dal bordo per il centro del boss e per i suoi bersagli (carica, fratture). */
  readonly bossMargin: number;
  /** Un proiettile che esce da questo margine scompare. */
  readonly projectileMargin: number;
  readonly pillars: readonly Pillar[];
  /** Massicci rettangolari (solo alcune stanze della discesa). */
  readonly solids?: readonly Solid[];
  /**
   * Pozzi (crollo, acqua profonda, lava, crepaccio), solo in alcune stanze della discesa: chi cammina non ci entra e si
   * ferma sul bordo; colpi, zone e chi vola ci passano sopra. Lo scatto li supera se atterra sul pavimento.
   */
  readonly chasms?: readonly Solid[];
  /** Ponti sopra i pozzi: solo disegno (per il gioco sono il pavimento fra due pozzi). */
  readonly bridges?: readonly Bridge[];
  /**
   * Ripari distruttibili (panche, radici, casse, blocchi di ghiaccio): la partita li aggiunge ai massicci della sua
   * mappa finche' resistono ai colpi (vedi `Match.covers`).
   */
  readonly covers?: readonly Solid[];
}

/** Il punto del rettangolo piu' vicino a `point` (il punto stesso, se e' dentro). */
function nearestOnSolid(solid: Solid, point: Vec2): Vec2 {
  return new Vec2(clamp(point.x, solid.x, solid.x + solid.width), clamp(point.y, solid.y, solid.y + solid.height));
}

/** Vero se il punto e' dentro il rettangolo o a meno di `extra` da esso. */
function touches(solid: Solid, point: Vec2, extra: number): boolean {
  const inside = point.x > solid.x && point.x < solid.x + solid.width && point.y > solid.y && point.y < solid.y + solid.height;
  return inside || (extra > 0 && nearestOnSolid(solid, point).distanceTo(point) < extra);
}

/** Il massiccio (o riparo) che contiene il punto o che sta a meno di `extra` da esso, se c'e'. */
export function solidAt(arena: ArenaDefinition, point: Vec2, extra = 0): Solid | undefined {
  return arena.solids?.find((solid) => touches(solid, point, extra));
}

/** Il pozzo che contiene il punto o che sta a meno di `extra` da esso, se c'e'. */
export function chasmAt(arena: ArenaDefinition, point: Vec2, extra = 0): Solid | undefined {
  return arena.chasms?.find((chasm) => touches(chasm, point, extra));
}

/** Cio' che ferma chi cammina (massiccio, riparo o pozzo) dentro il punto o a meno di `extra`, se c'e'. */
export function blockerAt(arena: ArenaDefinition, point: Vec2, extra = 0): Solid | undefined {
  return solidAt(arena, point, extra) ?? chasmAt(arena, point, extra);
}

/** Dove il segmento da `from` a `to` entra nel rettangolo (0..1), o null se non lo taglia (ritaglio di Liang-Barsky). */
function segmentEntry(solid: Solid, from: Vec2, to: Vec2): number | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // I quattro lati uno alla volta, senza creare array: si chiama per ogni ostacolo a ogni passo di ogni servitore.
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    return t0 <= t1;
  };
  if (!clip(-dx, from.x - solid.x) || !clip(dx, solid.x + solid.width - from.x)) return null;
  if (!clip(-dy, from.y - solid.y) || !clip(dy, solid.y + solid.height - from.y)) return null;
  return t0;
}

/**
 * Il massiccio che sbarra la vista da `from` a `to`, se c'e'. I ripari sono bassi e la vista ci passa sopra (i colpi
 * invece li colpiscono); anche i pozzi non sbarrano la vista.
 */
export function solidBetween(arena: ArenaDefinition, from: Vec2, to: Vec2): Solid | undefined {
  return arena.solids?.find((solid) => solid.cover === undefined && segmentEntry(solid, from, to) !== null);
}

/** Cio' che ferma chi cammina lungo il segmento (massiccio, riparo o pozzo), se c'e'. */
export function blockerBetween(arena: ArenaDefinition, from: Vec2, to: Vec2): Solid | undefined {
  for (const solid of arena.solids ?? []) if (segmentEntry(solid, from, to) !== null) return solid;
  for (const chasm of arena.chasms ?? []) if (segmentEntry(chasm, from, to) !== null) return chasm;
  return undefined;
}

/** Cio' che ferma chi cammina lungo il segmento, dal piu' vicino a `from` al piu' lontano. */
function blockersAlong(arena: ArenaDefinition, from: Vec2, to: Vec2): Solid[] {
  const hits: { solid: Solid; entry: number }[] = [];
  for (const list of [arena.solids ?? [], arena.chasms ?? []]) {
    for (const solid of list) {
      const entry = segmentEntry(solid, from, to);
      if (entry !== null) hits.push({ solid, entry });
    }
  }
  return hits.sort((a, b) => a.entry - b.entry).map((hit) => hit.solid);
}

/**
 * Spinge un corpo circolare fuori da un rettangolo (scivola lungo il bordo; da dentro esce dal lato piu' vicino fra
 * quelli che restano nella stanza: un blocco addossato al muro non spinge nessuno dentro il muro).
 */
function pushOutOfSolid(solid: Solid, point: Vec2, bodyRadius: number, arena: ArenaDefinition): Vec2 {
  const nearest = nearestOnSolid(solid, point);
  const offset = point.sub(nearest);
  const distance = offset.length();
  if (distance >= bodyRadius) return point;
  if (distance > 0) return nearest.add(offset.mul(bodyRadius / distance));
  const margin = arena.playerMargin;
  const exits = [
    new Vec2(solid.x - bodyRadius, point.y),
    new Vec2(solid.x + solid.width + bodyRadius, point.y),
    new Vec2(point.x, solid.y - bodyRadius),
    new Vec2(point.x, solid.y + solid.height + bodyRadius),
  ];
  const inside = exits.filter((exit) => exit.x >= margin && exit.x <= arena.width - margin && exit.y >= margin && exit.y <= arena.height - margin);
  const candidates = inside.length > 0 ? inside : exits;
  return candidates.reduce((best, exit) => (exit.distanceTo(point) < best.distanceTo(point) ? exit : best));
}

/** Limita un punto all'arena, lasciando `margin` unita' dal bordo. */
export function clampToArena(arena: ArenaDefinition, point: Vec2, margin: number): Vec2 {
  return new Vec2(clamp(point.x, margin, arena.width - margin), clamp(point.y, margin, arena.height - margin));
}

/** Vero se il punto e' fuori dall'area in cui un proiettile puo' vivere. */
export function isOutsideProjectileBounds(arena: ArenaDefinition, point: Vec2): boolean {
  const m = arena.projectileMargin;
  return point.x < m || point.x > arena.width - m || point.y < m || point.y > arena.height - m;
}

/** Il pilastro che contiene il punto (con `extra` di margine), se c'e'. */
export function pillarAt(arena: ArenaDefinition, point: Vec2, extra = 0): Pillar | undefined {
  return arena.pillars.find((pillar) => point.distanceTo(pillar.position) < pillar.radius + extra);
}

/** Il pilastro che taglia il segmento da `from` a `to` (linea di vista bloccata), se c'e'. */
export function pillarBetween(arena: ArenaDefinition, from: Vec2, to: Vec2): Pillar | undefined {
  const segment = to.sub(from);
  const lengthSquared = segment.lengthSquared();
  return arena.pillars.find((pillar) => {
    const offset = pillar.position.sub(from);
    const u = lengthSquared > 0 ? clamp((offset.x * segment.x + offset.y * segment.y) / lengthSquared, 0, 1) : 0;
    return from.add(segment.mul(u)).distanceTo(pillar.position) < pillar.radius;
  });
}

/** Vero se un pilastro o un massiccio taglia il segmento da `from` a `to`: la vista (e il salto) e' sbarrata. */
export function sightBlocked(arena: ArenaDefinition, from: Vec2, to: Vec2): boolean {
  return pillarBetween(arena, from, to) !== undefined || solidBetween(arena, from, to) !== undefined;
}

/**
 * Spinge un corpo circolare di raggio `bodyRadius` fuori dai pilastri, dai massicci (ripari compresi) e dai pozzi:
 * scivola lungo la superficie. Vale per chi sta a terra; chi vola non passa di qui.
 */
export function pushOutOfPillars(arena: ArenaDefinition, point: Vec2, bodyRadius: number): Vec2 {
  let result = point;
  // Piu' passate: uscire da un ostacolo puo' portare dentro un altro vicino.
  for (let pass = 0; pass < 3; pass++) {
    for (const pillar of arena.pillars) {
      const offset = result.sub(pillar.position);
      const distance = offset.length();
      const minimum = pillar.radius + bodyRadius;
      if (distance >= minimum) continue;
      const direction = distance > 0 ? offset.mul(1 / distance) : new Vec2(1, 0);
      result = pillar.position.add(direction.mul(minimum));
    }
    for (const solid of arena.solids ?? []) result = pushOutOfSolid(solid, result, bodyRadius, arena);
    for (const chasm of arena.chasms ?? []) result = pushOutOfSolid(chasm, result, bodyRadius, arena);
  }
  return result;
}

/**
 * Il punto piu' lontano verso `to` che un corpo raggiunge senza attraversare un massiccio, a passi di 8 unita'. Contro
 * una faccia di traverso scivola lungo il blocco; si ferma quando non avanza piu' nella direzione dello scatto. I
 * pilastri non contano: chi scatta li supera come prima. Con `crossChasms` (lo scatto che e' un salto) i pozzi si
 * superano, ma non ci si atterra: se finirebbe dentro un pozzo, torna indietro fino al pavimento. Senza (le corse a
 * terra) i pozzi fermano come i massicci.
 */
export function sweepSolids(arena: ArenaDefinition, from: Vec2, to: Vec2, bodyRadius: number, crossChasms = true): Vec2 {
  const blockers = crossChasms ? arena.solids ?? [] : [...(arena.solids ?? []), ...(arena.chasms ?? [])];
  const blocked = (point: Vec2): boolean => solidAt(arena, point, bodyRadius) !== undefined || (!crossChasms && chasmAt(arena, point, bodyRadius) !== undefined);
  const delta = to.sub(from);
  const length = delta.length();
  const steps = Math.max(1, Math.ceil(length / 8));
  const step = delta.mul(1 / steps);
  const stepLength = length / steps;
  let current = from;
  if (blockers.length === 0) current = to;
  else {
    for (let i = 1; i <= steps; i++) {
      let next = current.add(step);
      if (blocked(next)) {
        for (let pass = 0; pass < 2; pass++) for (const blocker of blockers) next = pushOutOfSolid(blocker, next, bodyRadius, arena);
        const advance = stepLength > 0 ? ((next.x - current.x) * step.x + (next.y - current.y) * step.y) / stepLength : 0;
        // Uno scatto dritto contro la faccia non avanza piu': si ferma. Di traverso scivola della sua parte laterale.
        if (advance < 0.01) break;
      }
      current = next;
    }
  }
  return landOnFloor(arena, from, current);
}

/** Se `point` cade dentro un pozzo, il punto del pavimento piu' vicino tornando verso `from` (a passi di 8 unita'). */
function landOnFloor(arena: ArenaDefinition, from: Vec2, point: Vec2): Vec2 {
  if (chasmAt(arena, point) === undefined) return point;
  const back = from.sub(point);
  const length = back.length();
  const steps = Math.max(1, Math.ceil(length / 8));
  for (let i = 1; i <= steps; i++) {
    const candidate = point.add(back.mul(i / steps));
    if (chasmAt(arena, candidate) === undefined) return candidate;
  }
  return from;
}

/** Spazio in piu' attorno agli angoli degli ostacoli e peso di un angolo da cui la meta non si vede. */
const DETOUR_PAD = 8;
const DETOUR_HIDDEN_COST = 4000;

/**
 * Dove dirigersi per arrivare a `to` girando attorno a massicci, ripari e pozzi: `to` stesso se la strada e' libera,
 * altrimenti un angolo (allargato del corpo) dell'ostacolo che sbarra la strada. Si preferisce un angolo da cui `to` si
 * vede, poi il giro piu' corto; da un angolo all'altro si aggira l'ostacolo. Basta per stanze con pochi ostacoli
 * staccati; nelle stanze con i pozzi la partita usa il campo di flusso (`NavField`).
 */
export function detourAround(arena: ArenaDefinition, from: Vec2, to: Vec2, bodyRadius: number): Vec2 {
  // Prima l'ostacolo piu' vicino sulla strada; se nessuno dei suoi angoli va bene, il successivo.
  for (const blocking of blockersAlong(arena, from, to)) {
    const corner = bestCorner(arena, blocking, from, to, bodyRadius);
    if (corner !== null) return corner;
  }
  return to;
}

/** L'angolo (allargato del corpo) dell'ostacolo per cui conviene passare, o null se nessuno e' raggiungibile. */
function bestCorner(arena: ArenaDefinition, blocking: Solid, from: Vec2, to: Vec2, bodyRadius: number): Vec2 | null {
  const pad = bodyRadius + DETOUR_PAD;
  const left = blocking.x - pad;
  const right = blocking.x + blocking.width + pad;
  const top = blocking.y - pad;
  const bottom = blocking.y + blocking.height + pad;
  const margin = arena.playerMargin;
  let best: Vec2 | null = null;
  let bestCost = Infinity;
  for (const corner of [new Vec2(left, top), new Vec2(right, top), new Vec2(left, bottom), new Vec2(right, bottom)]) {
    if (corner.x < margin || corner.x > arena.width - margin || corner.y < margin || corner.y > arena.height - margin) continue;
    if (corner.distanceTo(from) < 2 || blockerAt(arena, corner, bodyRadius) !== undefined || blockerBetween(arena, from, corner) !== undefined) continue;
    const hidden = blockerBetween(arena, corner, to) !== undefined;
    const cost = from.distanceTo(corner) + corner.distanceTo(to) + (hidden ? DETOUR_HIDDEN_COST : 0);
    if (cost < bestCost) {
      best = corner;
      bestCost = cost;
    }
  }
  return best;
}

/** Movimento a piccoli passi: evita attraversamenti anche durante le cariche. */
export function moveBody(arena: ArenaDefinition, from: Vec2, to: Vec2, radius: number, margin: number): Vec2 {
 let result = from;
 const delta = to.sub(from);
 const steps = Math.max(1, Math.ceil(delta.length() / 4));
 const step = delta.mul(1 / steps);
 for (let i = 0; i < steps; i++) result = clampToArena(arena, pushOutOfPillars(arena, clampToArena(arena, result.add(step), margin), radius), margin);
 return result;
}
