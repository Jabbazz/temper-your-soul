import { requireElement } from './dom';

/** Le schermate a pieno schermo fuori dalla partita (menu iniziale, scelta del dungeon, equipaggiamento). */
export type ScreenId = 'menu' | 'dungeons' | 'inventory';

const IDS: readonly ScreenId[] = ['menu', 'dungeons', 'inventory'];

/** Mostra una sola schermata alla volta (o nessuna, durante la partita). */
export class Screens {
  private readonly roots = new Map<ScreenId, HTMLElement>(IDS.map((id) => [id, requireElement(`screen-${id}`)]));

  show(id: ScreenId | null): void {
    for (const [screen, root] of this.roots) root.classList.toggle('hidden', screen !== id);
    // Fuori dalla partita l'interfaccia di gioco (barre, skill) non serve.
    document.body.classList.toggle('in-menu', id !== null);
  }
}
