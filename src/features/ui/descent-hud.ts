import { dungeonById } from '../dungeons/dungeons';
import type { RunView } from '../run/descent';
import type { RoomView } from '../run/encounter';
import { DESCENT, REWARD_LABELS, ROOM_LABELS, TRIAL_LABELS, type RoomKind } from '../run/rooms';
import { temperById, TEMPER_FAMILIES } from '../run/tempers';
import { el, formatSeconds, requireElement } from './dom';

/** Etichette brevi degli slot (come nella barra delle skill). */
export const SLOT_NAMES = ['SX', 'DX', 'Q', 'E'];
const ROMAN = ['', 'I', 'II', 'III'];

/** Lettera della tappa nella mappa della discesa. */
const STAGE_MARKS: Readonly<Record<RoomKind, string>> = {
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
 * Prova), la mappa delle tappe, braci, sigilli, grado e tempre. Solo rappresentazione: riceve le viste della discesa e
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

  update(run: RunView, room: RoomView, localId: string): void {
    const player = run.players[localId];
    const status = room.cleared
      ? room.doors.length > 0
        ? 'Stanza libera: raccogli il premio e scegli una porta'
        : 'Stanza libera'
      : room.countdown !== null
        ? `${room.kind === 'siege' ? 'Resisti' : 'Tempo'} ${formatSeconds(room.countdown)}`
        : room.waves > 0
          ? `Ondata ${Math.max(1, room.wave)} di ${room.waves}`
          : room.kind === 'boss' || room.kind === 'lieutenant'
            ? 'Abbatti il nemico'
            : '';
    const key = JSON.stringify([run.stage, run.dungeonIndex, run.seals, run.status, player?.embers, player?.tempers, status, room.trialFailed, room.kind]);
    this.root.classList.remove('hidden');
    if (key === this.last) return;
    this.last = key;
    const dungeon = dungeonById(run.dungeonId);
    const head = el('div', 'descent-head');
    const pilgrimage = run.mode === 'pilgrimage' ? ` · Pellegrinaggio ${run.dungeonIndex + 1}/${run.dungeons.length}` : '';
    head.append(
      el('span', 'eyebrow', `${(dungeon?.name ?? '').toUpperCase()} · TAPPA ${run.stage + 1}/${run.stages}${pilgrimage}`),
      el('strong', '', this.roomTitle(room)),
    );
    const line = el('span', room.trialFailed ? 'descent-status failed' : 'descent-status', room.trialFailed ? 'Prova fallita: niente premio' : status);
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
    const meta = el('div', 'descent-meta');
    meta.append(
      el('span', 'descent-embers', `Braci ${player?.embers ?? 0}`),
      el('span', 'descent-seals', `Sigilli ${run.seals}/${DESCENT.maxSeals}`),
      ...(run.grade > 0 ? [el('span', 'descent-grade', `Grado ${run.grade}`)] : []),
    );
    const tempers = el('ul', 'descent-tempers');
    for (const pick of player?.tempers ?? []) {
      const temper = temperById(pick.temperId);
      if (temper === undefined) continue;
      const chip = el('li', `temper-chip temper-${temper.family}`, `${temper.name} ${ROMAN[pick.grade] ?? ''} · ${SLOT_NAMES[pick.slot] ?? ''}`);
      chip.title = `${TEMPER_FAMILIES[temper.family].name}: ${temper.describe(pick.grade)}`;
      tempers.append(chip);
    }
    this.root.replaceChildren(head, line, map, meta, tempers);
  }

  private roomTitle(room: RoomView): string {
    const name = ROOM_LABELS[room.kind].name;
    if (room.kind === 'trial' && room.rule) return `${name} · ${TRIAL_LABELS[room.rule].name}`;
    if (room.reward !== null && room.kind !== 'boss') return `${name} · ${REWARD_LABELS[room.reward].name}`;
    return name;
  }

  /** Stendardo d'ingresso nella stanza: tappa, nome, regola. */
  announce(run: RunView, room: RoomView): void {
    const eyebrow = `TAPPA ${run.stage + 1} DI ${run.stages}`;
    const title = this.roomTitle(room);
    const detail = room.kind === 'trial' && room.rule ? TRIAL_LABELS[room.rule].summary : ROOM_LABELS[room.kind].summary;
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
