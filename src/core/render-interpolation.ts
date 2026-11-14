import type { Vec2 } from './vec2';

/** Qualunque cosa abbia una posizione assegnabile: giocatori, nemici, proiettili, boss. */
export interface Positioned { position: Vec2 }

/**
 * Interpolazione per il disegno: la simulazione avanza a passi fissi di 1/60 s, lo schermo può andare più veloce (144,
 * 165 Hz). Senza interpolazione ogni posizione resta a schermo per 2 o 3 fotogrammi in modo irregolare, e scorrendo
 * si vedono scatti e immagini doppie. Prima di ogni passo si ricorda dove stava ogni corpo; al disegno lo si mostra fra
 * la posizione precedente e quella attuale, in proporzione al tempo già trascorso del passo successivo, poi si
 * rimettono le posizioni vere. Le regole non vedono mai le posizioni interpolate.
 */
export class RenderInterpolation {
  private readonly previous = new Map<Positioned, Vec2>();
  private readonly moved: { body: Positioned; position: Vec2 }[] = [];

  /** Prima di un passo: la posizione di partenza di ogni corpo. */
  remember(bodies: Iterable<Positioned>): void {
    // Mai partire da una posizione interpolata rimasta da un disegno interrotto.
    this.restore();
    this.previous.clear();
    for (const body of bodies) this.previous.set(body, body.position);
  }

  /**
   * Sposta ogni corpo ricordato fra la posizione di partenza e quella attuale (`alpha` da 0 a 1). Un salto più lungo di
   * `maxJump` (scatto, teletrasporto, viaggio) non si interpola: si vede subito l'arrivo.
   */
  apply(bodies: Iterable<Positioned>, alpha: number, maxJump: number): void {
    this.restore();
    const t = Math.min(1, Math.max(0, alpha));
    for (const body of bodies) {
      const from = this.previous.get(body);
      if (from === undefined) continue;
      const to = body.position;
      if (from.distanceTo(to) > maxJump || from.equals(to)) continue;
      this.moved.push({ body, position: to });
      body.position = from.add(to.sub(from).mul(t));
    }
  }

  /** Rimette le posizioni vere dopo il disegno. */
  restore(): void {
    for (const { body, position } of this.moved) body.position = position;
    this.moved.length = 0;
  }
}
