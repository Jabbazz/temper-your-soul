import { Vec2 } from '../../core/vec2';
import { arenaObstacles, type ArenaDefinition, type Solid } from './arena';

/**
 * Campo di flusso per le stanze con pozzi, massicci e ripari (fase 5 dello studio grafico, proposta per Jabbaz). Valori
 * provvisori: lato delle celle, spazio libero attorno al centro di una cella perche' sia percorribile, ogni quanti passi
 * si ricalcolano le distanze.
 */
export const NAV_FIELD = {
  cell: 40, clearance: 12, refreshSteps: 6,
  /**
   * Mappe con terreno (il mondo aperto): lato della finestra attorno a un giocatore, di quanto può allontanarsi dal
   * centro prima che la finestra lo segua, ed entro quale distanza un nemico tiene vivo il campo.
   */
  localSize: 1600, localShift: 320, localRange: 900,
} as const;

/** I passi verso le otto celle vicine e il loro costo (le diagonali costano di piu'), in tre file parallele. */
const STEP_X = [1, -1, 0, 0, 1, 1, -1, -1] as const;
const STEP_Y = [0, 0, 1, -1, 1, -1, 1, -1] as const;
const STEP_COST = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2] as const;

/** Vero se il punto (`x`, `y`) e' dentro il rettangolo allargato di `extra`. Senza vettori: si chiama per ogni cella. */
function near(rect: Solid, x: number, y: number, extra: number): boolean {
  const dx = Math.max(rect.x - x, 0, x - (rect.x + rect.width));
  const dy = Math.max(rect.y - y, 0, y - (rect.y + rect.height));
  return dx * dx + dy * dy < extra * extra || (dx === 0 && dy === 0);
}

/**
 * Le celle percorribili della stanza: dentro i margini, lontane da pilastri, massicci, ripari ancora in piedi e pozzi.
 * Si ricalcola solo quando cambia un ostacolo (un riparo si rompe); i campi di flusso la condividono.
 *
 * Con `size` copre solo una finestra quadrata della mappa, da spostare con `recenter`: serve alle mappe troppo grandi
 * per una griglia intera (il mondo aperto), dove ogni giocatore ha la propria.
 */
export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  readonly open: Uint8Array;
  /** Angolo alto a sinistra della griglia nella mappa (zero se la copre tutta). */
  private originX = 0;
  private originY = 0;

  constructor(private readonly arena: ArenaDefinition, size?: number) {
    this.cols = Math.ceil((size ?? arena.width) / NAV_FIELD.cell);
    this.rows = Math.ceil((size ?? arena.height) / NAV_FIELD.cell);
    this.open = new Uint8Array(this.cols * this.rows);
    this.rebuild();
  }

  /** Il centro dell'area coperta. */
  get middle(): Vec2 {
    return new Vec2(this.originX + (this.cols * NAV_FIELD.cell) / 2, this.originY + (this.rows * NAV_FIELD.cell) / 2);
  }

  /** Vero se il punto cade dentro l'area coperta. */
  contains(point: Vec2): boolean {
    const cell = NAV_FIELD.cell;
    return point.x >= this.originX && point.y >= this.originY && point.x < this.originX + this.cols * cell && point.y < this.originY + this.rows * cell;
  }

  /** Sposta la finestra attorno a `center` (allineata alle celle, così le celle non scivolano) e la ricalcola. */
  recenter(center: Vec2): void {
    const cell = NAV_FIELD.cell;
    this.originX = Math.round((center.x - (this.cols * cell) / 2) / cell) * cell;
    this.originY = Math.round((center.y - (this.rows * cell) / 2) / cell) * cell;
    this.rebuild();
  }

  /** Ricalcola le celle libere: da chiamare quando un ostacolo cambia (un riparo che si rompe). */
  rebuild(): void {
    const { arena } = this;
    const margin = arena.playerMargin;
    const clearance = NAV_FIELD.clearance;
    const cell = NAV_FIELD.cell;
    const { pillars, solids, chasms } = arenaObstacles(arena, this.originX - clearance, this.originY - clearance, this.originX + this.cols * cell + clearance, this.originY + this.rows * cell + clearance);
    for (let index = 0; index < this.open.length; index++) {
      const x = this.originX + (index % this.cols) * cell + cell / 2;
      const y = this.originY + Math.floor(index / this.cols) * cell + cell / 2;
      let free = x >= margin && x <= arena.width - margin && y >= margin && y <= arena.height - margin;
      if (free) for (const pillar of pillars) if (Math.hypot(x - pillar.position.x, y - pillar.position.y) < pillar.radius + clearance) { free = false; break; }
      if (free) for (const solid of solids) if (near(solid, x, y, clearance)) { free = false; break; }
      if (free) for (const chasm of chasms) if (near(chasm, x, y, clearance)) { free = false; break; }
      this.open[index] = free ? 1 : 0;
    }
  }

  /** Il centro della cella. */
  center(index: number): Vec2 {
    const cell = NAV_FIELD.cell;
    return new Vec2(this.originX + (index % this.cols) * cell + cell / 2, this.originY + Math.floor(index / this.cols) * cell + cell / 2);
  }

  /** La cella che contiene il punto (i punti fuori dalla stanza vanno nella cella di bordo). */
  cellOf(point: Vec2): number {
    const cell = NAV_FIELD.cell;
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor((point.x - this.originX) / cell)));
    const cy = Math.min(this.rows - 1, Math.max(0, Math.floor((point.y - this.originY) / cell)));
    return cy * this.cols + cx;
  }

  /** Vero se si puo' andare in diagonale da (`cx`, `cy`) di (`dx`, `dy`): le due celle accanto devono essere libere. */
  diagonalFree(cx: number, cy: number, dx: number, dy: number): boolean {
    return dx === 0 || dy === 0 || (this.open[cy * this.cols + cx + dx] === 1 && this.open[(cy + dy) * this.cols + cx] === 1);
  }
}

/**
 * Le distanze a piedi da ogni cella ai bersagli, girando attorno agli ostacoli della griglia. Chi cammina segue la cella
 * vicina con la distanza minore: cosi' trova i ponti anche quando il pozzo e' lungo quanto la stanza. La partita ne tiene
 * uno per giocatore, cosi' ogni servitore segue il proprio bersaglio (anche quando lo provoca il Guerriero). Solo
 * simulazione e deterministico.
 */
export class NavField {
  readonly grid: NavGrid;
  private readonly distance: Float64Array;
  private readonly heap = new MinHeap();

  /** Su una griglia condivisa, oppure (comodo nei test) su una griglia nuova della mappa. */
  constructor(source: NavGrid | ArenaDefinition) {
    this.grid = source instanceof NavGrid ? source : new NavGrid(source);
    this.distance = new Float64Array(this.grid.cols * this.grid.rows).fill(Infinity);
  }

  /** La cella che contiene il punto. */
  cellOf(point: Vec2): number {
    return this.grid.cellOf(point);
  }

  /** La distanza a piedi dalla cella al bersaglio piu' vicino (Infinity se non lo raggiunge). */
  distanceAt(index: number): number {
    return this.distance[index]!;
  }

  /**
   * Ricalcola le distanze dai bersagli: Dijkstra con otto vicini, senza tagliare gli angoli degli ostacoli. La cella di
   * un bersaglio conta come libera anche quando e' sul bordo di un pozzo o di un riparo.
   */
  update(targets: readonly Vec2[]): void {
    const { grid, heap } = this;
    const { cols, rows, open } = grid;
    this.distance.fill(Infinity);
    for (const target of targets) {
      const index = grid.cellOf(target);
      if (this.distance[index]! > 0) {
        this.distance[index] = 0;
        heap.push(index, 0);
      }
    }
    while (heap.size > 0) {
      const cost = heap.topCost;
      const index = heap.pop();
      if (cost > this.distance[index]!) continue;
      const cx = index % cols;
      const cy = Math.floor(index / cols);
      for (let k = 0; k < 8; k++) {
        const dx = STEP_X[k]!;
        const dy = STEP_Y[k]!;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const next = ny * cols + nx;
        if (open[next] !== 1 || !grid.diagonalFree(cx, cy, dx, dy)) continue;
        const total = cost + STEP_COST[k]!;
        if (total < this.distance[next]!) {
          this.distance[next] = total;
          heap.push(next, total);
        }
      }
    }
  }

  /**
   * Il centro della cella vicina che avvicina di piu' al bersaglio, o null se da qui non lo si raggiunge (o si e' gia'
   * nella sua cella).
   */
  next(from: Vec2): Vec2 | null {
    const { grid } = this;
    const index = grid.cellOf(from);
    const here = this.distance[index]!;
    if (here === 0) return null;
    const cx = index % grid.cols;
    const cy = Math.floor(index / grid.cols);
    let best = -1;
    let bestDistance = here;
    for (let k = 0; k < 8; k++) {
      const dx = STEP_X[k]!;
      const dy = STEP_Y[k]!;
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
      if (!grid.diagonalFree(cx, cy, dx, dy)) continue;
      const next = ny * grid.cols + nx;
      if (this.distance[next]! < bestDistance) {
        best = next;
        bestDistance = this.distance[next]!;
      }
    }
    return best < 0 ? null : grid.center(best);
  }
}

/** Coda con priorita' minima (heap binario) di celle e costi. */
class MinHeap {
  private readonly cells: number[] = [];
  private readonly costs: number[] = [];

  get size(): number {
    return this.cells.length;
  }

  /** Il costo della cella in cima (da leggere prima di `pop`). */
  get topCost(): number {
    return this.costs[0]!;
  }

  push(cell: number, cost: number): void {
    this.cells.push(cell);
    this.costs.push(cost);
    let i = this.cells.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.costs[parent]! <= this.costs[i]!) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  /** Toglie e restituisce la cella con il costo minore. */
  pop(): number {
    const top = this.cells[0]!;
    const lastCell = this.cells.pop()!;
    const lastCost = this.costs.pop()!;
    if (this.cells.length > 0) {
      this.cells[0] = lastCell;
      this.costs[0] = lastCost;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.cells.length && this.costs[left]! < this.costs[smallest]!) smallest = left;
        if (right < this.cells.length && this.costs[right]! < this.costs[smallest]!) smallest = right;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.cells[a], this.cells[b]] = [this.cells[b]!, this.cells[a]!];
    [this.costs[a], this.costs[b]] = [this.costs[b]!, this.costs[a]!];
  }
}
