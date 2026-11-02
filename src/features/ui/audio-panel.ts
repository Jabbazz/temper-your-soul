import { AUDIO_CREDITS, AUDIO_LICENSES } from '../audio/audio-credits';
import { ART_CREDITS, ART_LICENSES } from '../presentation/art-credits';
import { FONT_CREDITS, FONT_LICENSE_NAME } from './font-credits';
import type { AudioPlayer } from '../audio/audio-player';
import { VOLUME_CONTROLS, type VolumeControl } from '../audio/audio-settings';
import { el } from './dom';

/** Elenco di crediti: titolo con il link alla fonte, autore e licenza. */
function creditList<T extends { title: string; author: string; source: string }>(credits: readonly T[], licenseOf: (credit: T) => string): HTMLElement {
  const list = el('ul');
  for (const credit of credits) {
    const item = el('li');
    const link = el('a', '', credit.title);
    link.href = credit.source;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    item.append(link, el('span', '', ` · ${credit.author} · ${licenseOf(credit)}`));
    list.append(item);
  }
  return list;
}

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
export class AudioSettingsView {
  constructor(private readonly root: HTMLElement, private readonly audio: AudioPlayer) {
    audio.changed.connect(() => this.syncControls());this.render();
  }
  private render(): void {
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

    this.root.replaceChildren(toggle, sliders, this.renderCredits());
    this.syncControls();
  }

  /**
   * Crediti richiusi in fondo al pannello, per suoni, grafica e caratteri: una riga per opera (titolo, autore, licenza).
   * Le licenze CC BY chiedono di citare autore e licenza e di dire che l'opera e' stata modificata: lo dice la riga
   * sotto ogni elenco, i dettagli stanno nel codice (`audio-credits.ts`, `art-credits.ts`, `font-credits.ts`).
   */
  private renderCredits(): HTMLElement {
    const section = el('details', 'audio-credits');
    section.append(
      el('summary', '', 'Crediti'),
      el('p', 'credits-heading', 'Suoni'),
      creditList(Object.values(AUDIO_CREDITS), (credit) => AUDIO_LICENSES[credit.license].name),
      el('small', '', 'Registrazioni tagliate e convertite per il gioco.'),
      el('p', 'credits-heading', 'Grafica'),
      creditList(Object.values(ART_CREDITS), (credit) => ART_LICENSES[credit.license].name),
      el('small', '', 'Sprite e tile ritagliati e ricolorati per il gioco.'),
      el('p', 'credits-heading', 'Caratteri'),
      creditList(Object.values(FONT_CREDITS), () => FONT_LICENSE_NAME),
      el('small', '', 'Sottoinsieme latino di Google Fonts, non modificato; la licenza accompagna i file.'),
    );
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
