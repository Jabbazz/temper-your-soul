import { requireElement } from './dom';

/** Contenuto di una schermata sopra il gioco (pausa, fine partita). */
interface OverlayScreen {
  readonly tag: string;
  readonly title: string;
  readonly text: string;
  readonly button: string;
  /** Pulsante secondario (es. "Torna al menu"). */
  readonly secondary: string;
  /** Contenuto aggiuntivo (es. gli oggetti ottenuti). */
  readonly extra?: HTMLElement | null;
}

/** Schermate di testo sopra il canvas durante una partita. Non conosce le regole: riceve cio' che deve mostrare. */
export class Overlay {
  private readonly root = requireElement('overlay');
  private readonly tag = requireElement('overlay-tag');
  private readonly title = requireElement('overlay-title');
  private readonly text = requireElement('overlay-text');
  private readonly extra = requireElement('overlay-extra');
  private readonly button = requireElement('overlay-button');
  private readonly secondary = requireElement('overlay-secondary');

  /** Collega le azioni dei due pulsanti. */
  onButtons(primary: () => void, secondary: () => void): void {
    this.button.addEventListener('click', primary);
    this.secondary.addEventListener('click', secondary);
  }

  showPaused(dungeonName: string): void {
    this.show({
      tag: `PAUSA · ${dungeonName.toUpperCase()}`,
      title: 'Il tempo si ferma.',
      text: 'Riprendi quando sei pronto.',
      button: 'Riprendi →',
      secondary: 'Abbandona e torna al menu',
    });
  }

  showEnded(options: {
    readonly won: boolean;
    readonly dungeonName: string;
    readonly bossName: string;
    readonly seconds: number;
    readonly healthLeft: number;
    readonly extra?: HTMLElement | null;
  }): void {
    const { won, dungeonName, bossName, seconds, healthLeft, extra } = options;
    this.show(
      won
        ? {
            tag: `DUNGEON COMPLETATO · ${dungeonName.toUpperCase()}`,
            title: 'Vittoria.',
            text: `Hai sconfitto ${bossName} in ${Math.floor(seconds)} secondi. Vita rimasta: ${Math.ceil(healthLeft)}.`,
            button: 'Riprova →',
            secondary: 'Torna al menu',
            extra,
          }
        : {
            tag: `SCONFITTA · ${dungeonName.toUpperCase()}`,
            title: 'La brace si è spenta.',
            text: 'Schiva le zone segnalate e usa lo scatto per attraversare le raffiche. Cambiare equipaggiamento cambia le tue abilità.',
            button: 'Riprova →',
            secondary: 'Torna al menu',
            extra: null,
          },
    );
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  private show(screen: OverlayScreen): void {
    this.tag.textContent = screen.tag;
    this.title.textContent = screen.title;
    this.text.textContent = screen.text;
    this.button.textContent = screen.button;
    this.secondary.textContent = screen.secondary;
    this.extra.replaceChildren();
    if (screen.extra) this.extra.append(screen.extra);
    this.root.classList.remove('hidden');
  }
}
