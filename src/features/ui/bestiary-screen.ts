import type { Character } from '../character/character';
import { DUNGEONS } from '../dungeons/dungeons';
import { DUNGEON_MINIONS } from '../minions/minion-catalog';
import { bossArt } from '../presentation/boss-art';
import { minionArt } from '../presentation/minion-art';
import { drawSprite } from '../presentation/sprites';
import { LIEUTENANT_LORE, MINION_LORE } from '../run/bestiary-lore';
import { LIEUTENANTS } from '../run/lieutenants';
import { el, requireElement } from './dom';

/**
 * Il bestiario: una pagina per servitore, divisa per dungeon. Si apre con la prima uccisione; prima si vede solo la
 * sagoma. Ogni pagina dice ruolo, schema del boss che insegna, uccisioni e un'iscrizione.
 */
export class BestiaryScreen {
  private readonly list = requireElement('bestiary-list');

  constructor(handlers: { readonly onBack: () => void }) {
    requireElement('bestiary-back').addEventListener('click', handlers.onBack);
  }

  render(character: Character): void {
    const sections: HTMLElement[] = [];
    let known = 0;
    let total = 0;
    for (const dungeon of DUNGEONS) {
      const section = el('section', 'bestiary-section');
      section.append(el('h3', '', dungeon.name));
      const grid = el('div', 'bestiary-grid');
      for (const minion of DUNGEON_MINIONS[dungeon.id] ?? []) {
        total++;
        const kills = character.bestiary[minion.id] ?? 0;
        const lore = MINION_LORE[minion.id];
        const open = kills > 0;
        if (open) known++;
        const card = el('article', open ? 'bestiary-card' : 'bestiary-card locked');
        card.append(thumbnail(minion.visual, open));
        card.append(el('strong', '', open ? minion.name : '???'));
        if (open && lore) {
          card.append(
            el('span', 'bestiary-role', `${lore.role} · insegna: ${lore.teaches}`),
            el('p', '', lore.text),
            el('small', '', `Abbattuti: ${kills}`),
          );
        } else card.append(el('small', '', 'Abbattine uno per aprire la pagina.'));
        grid.append(card);
      }
      const lieutenant = LIEUTENANTS[dungeon.id];
      if (lieutenant !== undefined) {
        total++;
        const kills = character.bestiary[lieutenant.id] ?? 0;
        const lore = LIEUTENANT_LORE[lieutenant.id];
        const open = kills > 0;
        if (open) known++;
        const card = el('article', open ? 'bestiary-card bestiary-lieutenant' : 'bestiary-card bestiary-lieutenant locked');
        card.append(lieutenantThumbnail(lieutenant.art, open), el('strong', '', open ? lieutenant.name : '???'));
        if (open && lore) {
          card.append(
            el('span', 'bestiary-role', `${lore.role} · insegna: ${lore.teaches}`),
            el('p', '', lore.text),
            el('small', '', `Abbattuti: ${kills}`),
          );
        } else card.append(el('small', '', 'Il luogotenente di metà discesa.'));
        grid.append(card);
      }
      section.append(grid);
      sections.push(section);
    }
    this.list.replaceChildren(el('p', 'bestiary-count', `Pagine aperte: ${known} di ${total}`), ...sections);
  }
}

/** Miniatura del servitore (sagoma scura se la pagina e' chiusa). */
function thumbnail(visual: string, open: boolean): HTMLCanvasElement {
  const art = minionArt(visual);
  const frame = art.frames[0];
  const scale = 3;
  const canvas = document.createElement('canvas');
  canvas.className = 'bestiary-thumb';
  canvas.width = Math.max(...frame.map((row) => row.length)) * scale;
  canvas.height = frame.length * scale;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    const palette = open ? art.palette : Object.fromEntries(Object.keys(art.palette).map((key) => [key, '#2a2230']));
    drawSprite(ctx, frame, canvas.width / 2, canvas.height / 2, scale, palette);
  }
  return canvas;
}

/** Miniatura del luogotenente: la posa d'attacco, a scala intera, nella stessa altezza delle altre. */
function lieutenantThumbnail(id: string, open: boolean): HTMLCanvasElement {
  const art = bossArt(id);
  const frame = art.casting;
  const scale = Math.max(1, Math.floor(36 / frame.length));
  const canvas = document.createElement('canvas');
  canvas.className = 'bestiary-thumb';
  canvas.width = Math.max(...frame.map((row) => row.length)) * scale;
  canvas.height = frame.length * scale;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    const colors = art.palette(false, false);
    const palette = open ? colors : Object.fromEntries(Object.keys(colors).map((key) => [key, '#2a2230']));
    drawSprite(ctx, frame, canvas.width / 2, canvas.height / 2, scale, palette);
  }
  return canvas;
}
