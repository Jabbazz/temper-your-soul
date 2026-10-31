import { AUDIO_CREDITS, AUDIO_LICENSES } from '../audio/audio-credits';
import type { AudioPlayer } from '../audio/audio-player';
import { VOLUME_CONTROLS, type VolumeControl } from '../audio/audio-settings';
import { el, requireElement } from './dom';

const VOLUME_LABELS: Record<VolumeControl, string> = {
  master: 'Generale',
  music: 'Musica',
  effects: 'Effetti',
  ambience: 'Ambiente',
  interface: 'Interfaccia',
};

/**
 * Pannello delle impostazioni audio (pulsante "Audio" in alto a destra): acceso/spento, volumi per canale e crediti
 * delle registrazioni. Non conosce le regole del suono: legge e cambia le impostazioni del motore.
 */
export class AudioPanel {
  private readonly root = requireElement('audio-panel');
  private readonly button = requireElement('audio-button');

  constructor(
    private readonly audio: AudioPlayer,
    private readonly handlers: { readonly onOpen: () => void },
  ) {
    this.button.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));
    audio.changed.connect(() => this.syncControls());
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  open(): void {
    this.render();
    this.root.classList.remove('hidden');
    this.button.setAttribute('aria-expanded', 'true');
    this.handlers.onOpen();
    this.root.querySelector<HTMLElement>('input')?.focus();
  }

  close(): void {
    this.root.classList.add('hidden');
    this.button.setAttribute('aria-expanded', 'false');
  }

  private render(): void {
    const header = el('div', 'audio-panel-header');
    header.append(el('h2', '', 'Audio'));
    const close = el('button', 'audio-panel-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Chiudi le impostazioni audio');
    close.addEventListener('click', () => this.close());
    header.append(close);

    const toggle = el('label', 'audio-toggle');
    const checkbox = el('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.audio = 'enabled';
    checkbox.addEventListener('change', () => this.audio.setEnabled(checkbox.checked));
    toggle.append(checkbox, el('span', '', 'Audio attivo'));

    const sliders = el('div', 'audio-sliders');
    for (const control of VOLUME_CONTROLS) {
      const row = el('label', 'audio-slider');
      const slider = el('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.step = '5';
      slider.dataset.audio = control;
      slider.setAttribute('aria-label', `Volume ${VOLUME_LABELS[control].toLowerCase()}`);
      slider.addEventListener('input', () => this.audio.setVolume(control, Number(slider.value) / 100));
      const value = el('output', 'audio-slider-value');
      value.dataset.audioValue = control;
      row.append(el('span', '', VOLUME_LABELS[control]), slider, value);
      sliders.append(row);
    }

    this.root.replaceChildren(header, toggle, sliders, this.renderCredits());
    this.syncControls();
  }

  /**
   * Crediti richiusi in fondo al pannello: una riga per registrazione (titolo, autore, licenza). Le licenze CC BY chiedono
   * di citare autore e licenza e di dire che il file e' stato modificato: lo dice l'ultima riga, i dettagli stanno nel codice.
   */
  private renderCredits(): HTMLElement {
    const section = el('details', 'audio-credits');
    section.append(el('summary', '', 'Crediti'));
    const list = el('ul');
    for (const credit of Object.values(AUDIO_CREDITS)) {
      const item = el('li');
      const link = el('a', '', credit.title);
      link.href = credit.source;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      item.append(link, el('span', '', ` · ${credit.author} · ${AUDIO_LICENSES[credit.license].name}`));
      list.append(item);
    }
    section.append(list, el('small', '', 'Registrazioni tagliate e convertite per il gioco.'));
    return section;
  }

  /** Allinea i controlli alle impostazioni correnti (anche se cambiano dal tasto M). */
  private syncControls(): void {
    const settings = this.audio.currentSettings;
    for (const input of Array.from(this.root.querySelectorAll<HTMLInputElement>('input[data-audio]'))) {
      const control = input.dataset.audio;
      if (control === 'enabled') input.checked = settings.enabled;
      else if (control !== undefined && control in settings.volumes) {
        input.value = String(Math.round(settings.volumes[control as VolumeControl] * 100));
        input.disabled = !settings.enabled;
      }
    }
    for (const output of Array.from(this.root.querySelectorAll<HTMLOutputElement>('output[data-audio-value]'))) {
      const control = output.dataset.audioValue as VolumeControl;
      output.value = `${Math.round(settings.volumes[control] * 100)}%`;
    }
  }
}
