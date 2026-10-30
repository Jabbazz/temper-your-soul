import { requireElement } from './dom';

/** Contenuto di una schermata sopra il gioco (menu, pausa, fine partita). */
interface Screen {
  readonly tag: string;
  readonly title: string;
  readonly text: string;
  readonly button: string;
}

const MENU: Screen = {
  tag: 'TEMPER YOUR SOUL · DUNGEON I · LA CRIPTA',
  title: 'Risveglia il guardiano.',
  text: "Sei un mago dell'Ordine della Brace. Muoviti con WASD, mira con il mouse e schiva i proiettili. Le zone rosse annunciano un impatto.",
  button: 'Entra nella cripta →',
};

const PAUSED: Screen = {
  tag: 'PAUSA',
  title: 'Il tempo si ferma.',
  text: 'Riprendi quando sei pronto.',
  button: 'Riprendi →',
};

/** Schermate di testo sopra il canvas. Non conosce le regole: riceve cio' che deve mostrare. */
export class Overlay {
  private readonly root = requireElement('overlay');
  private readonly tag = requireElement('overlay-tag');
  private readonly title = requireElement('overlay-title');
  private readonly text = requireElement('overlay-text');
  private readonly button = requireElement('overlay-button');

  /** Collega l'azione del pulsante principale della schermata. */
  onPrimary(handler: () => void): void {
    this.button.addEventListener('click', handler);
  }

  showMenu(): void {
    this.show(MENU);
  }

  showPaused(): void {
    this.show(PAUSED);
  }

  showEnded(won: boolean, seconds: number, healthLeft: number): void {
    this.show(
      won
        ? {
            tag: 'DUNGEON COMPLETATO',
            title: 'Il guardiano è caduto.',
            text: `Hai sconfitto il guardiano in ${Math.floor(seconds)} secondi. Vita rimasta: ${Math.ceil(healthLeft)}. Prova ancora per migliorare il tempo.`,
            button: 'Riprova →',
          }
        : {
            tag: 'LA CRIPTA TI HA TRATTENUTO',
            title: 'La brace si è spenta.',
            text: 'Schiva le zone rosse e usa Passo astrale per attraversare le raffiche. Il gelo rallenta il guardiano.',
            button: 'Riprova →',
          },
    );
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  private show(screen: Screen): void {
    this.tag.textContent = screen.tag;
    this.title.textContent = screen.title;
    this.text.textContent = screen.text;
    this.button.textContent = screen.button;
    this.root.classList.remove('hidden');
  }
}
