import { requireElement } from './dom';

/**
 * Stendardo a tutto schermo del passaggio alla fase II ("FASE II · IL GUARDIANO SI INFURIA"). Solo rappresentazione:
 * l'animazione e' in CSS e il gioco decide se fermare la simulazione nel frattempo.
 */
export class PhaseBanner {
  private readonly root = requireElement('phase-banner');
  private readonly text = requireElement('phase-banner-text');

  show(text: string): void {
    this.text.textContent = text;
    // Toglie e rimette la classe (con un reflow in mezzo) per far ripartire l'animazione.
    this.root.classList.remove('show', 'hidden');
    void this.root.offsetWidth;
    this.root.classList.add('show');
  }

  hide(): void {
    this.root.classList.remove('show');
    this.root.classList.add('hidden');
  }
}
