import { dungeonById } from '../dungeons/dungeons';
import type { RunView } from '../run/descent';
import type { RoomView } from '../run/encounter';
import { ROOM_LABELS, TRIAL_LABELS, type RoomKind } from '../run/rooms';
import { showsVeins, veinName } from '../run/veins';
import { el, formatSeconds, requireElement } from './dom';

/** Lettera della tappa nella mappa della discesa (anche nella mappa intera). */
export const STAGE_MARKS: Readonly<Record<RoomKind, string>> = {
  threshold: 'S',
  combat: '⚔',
  trial: '!',
  reliquary: '◆',
  lieutenant: 'L',
  sanctuary: '✚',
  siege: '⌛',
  hunt: '➶',
  antechamber: '·',
  boss: '☠',
};

/**
 * Pannello della discesa: dove si e' (dungeon, tappa, stanza), che cosa sta succedendo (ondate, conto alla rovescia,
 * Prova), la mappa delle tappe e le direzioni disponibili. Solo rappresentazione: riceve le viste della discesa e
 * della stanza e tocca il DOM soltanto quando cambia qualcosa.
 */
export class DescentHud {
  private readonly root = requireElement('descent-hud');
  private readonly banner = requireElement('room-banner');
  private bannerTimer: number | undefined;
  private last = '';

  hide(): void {
    this.root.classList.add('hidden');
    this.last = '';
  }

  update(run: RunView, room: RoomView, _localId: string): void {

    const status = room.cleared
      ? room.doors.length > 0
        ? 'Stanza libera: scegli una direzione'
        : 'Stanza libera'
      : room.countdown !== null
        ? `${room.kind === 'siege' ? 'Resisti' : 'Tempo'} ${formatSeconds(room.countdown)}`
        : room.waves > 0
          ? `Ondata ${Math.max(1, room.wave)} di ${room.waves}`
          : room.kind === 'boss' || room.kind === 'lieutenant'
            ? 'Abbatti il nemico'
            : '';
    const key = JSON.stringify([run.stage, run.dungeonIndex, run.status, status, room.trialFailed, room.kind, run.roomVeins]);
    this.root.classList.remove('hidden');
    if (key === this.last) return;
    this.last = key;
    const dungeon = dungeonById(run.dungeonId);
    const head = el('div', 'descent-head');
    const pilgrimage = run.mode === 'pilgrimage' ? ` · Pellegrinaggio ${run.dungeonIndex + 1}/${run.dungeons.length}` : '';
    // Con piu' vene, anche la vena della stanza (e l'Incursione).
    const vein = showsVeins(run.veins) && run.roomVeins !== undefined ? ` · ${run.roomVeins.incursion ? 'INCURSIONE: ' : ''}${veinName(run.dungeonId, run.roomVeins.vein).toUpperCase()}` : '';
    head.append(
      el('span', 'eyebrow', `${(dungeon?.name ?? '').toUpperCase()}${vein} · TAPPA ${run.stage + 1}/${run.stages}${pilgrimage}`),
      el('strong', '', this.roomTitle(room)),
    );
    const line = el('span', room.trialFailed ? 'descent-status failed' : 'descent-status', room.trialFailed ? 'Obiettivo della prova non raggiunto' : status);
    const map = el('ol', 'descent-map');
    run.plan.forEach((stage, index) => {
      const chosen = stage.chosen === null ? null : stage.options[stage.chosen] ?? null;
      const pip = el('li', index < run.stage ? 'done' : index === run.stage ? 'current' : '');
      pip.textContent = chosen !== null && index <= run.stage ? STAGE_MARKS[chosen.kind] : stage.options.length > 1 ? String(stage.options.length) : STAGE_MARKS[stage.options[0]!.kind];
      pip.title = chosen !== null && index <= run.stage
        ? ROOM_LABELS[chosen.kind].name
        : stage.options.map((option) => ROOM_LABELS[option.kind].name).join(' o ');
      map.append(pip);
    });
    this.root.replaceChildren(head, line, map);
  }

  private roomTitle(room: RoomView): string {
    const name = ROOM_LABELS[room.kind].name;
    if (room.kind === 'trial' && room.rule) return `${name} · ${TRIAL_LABELS[room.rule].name}`;
    return name;
  }

  /** Stendardo d'ingresso nella stanza: tappa, nome, regola. */
  announce(run: RunView, room: RoomView): void {
    const veins = run.roomVeins;
    const named = showsVeins(run.veins) && veins !== undefined && room.kind !== 'boss';
    const eyebrow = `TAPPA ${run.stage + 1} DI ${run.stages}${named ? ` · ${veinName(run.dungeonId, veins.vein).toUpperCase()}` : ''}`;
    const title = this.roomTitle(room);
    // L'Incursione ha il suo stendardo: una stanza tutta della terza vena.
    const detail = veins?.incursion
      ? `Incursione: ${veinName(run.dungeonId, veins.vein)} sale dal profondo. Servitori mai visti in questa discesa.`
      : room.kind === 'trial' && room.rule
        ? TRIAL_LABELS[room.rule].summary
        : ROOM_LABELS[room.kind].summary;
    this.banner.classList.toggle('incursion', veins?.incursion === true);
    this.banner.replaceChildren(el('span', 'room-banner-eyebrow', eyebrow), el('strong', '', title), el('small', '', detail));
    this.banner.classList.remove('hidden', 'show');
    void this.banner.offsetWidth;
    this.banner.classList.add('show');
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.banner.classList.add('hidden'), 2600);
  }

  hideBanner(): void {
    window.clearTimeout(this.bannerTimer);
    this.banner.classList.add('hidden');
  }
}
