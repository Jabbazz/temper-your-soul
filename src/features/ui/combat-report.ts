import type { CombatStats, PartyMember } from '../network/protocol';
import { el, formatSeconds } from './dom';

export function showCombatReport(report: Record<string, CombatStats>, members: readonly Pick<PartyMember, 'id' | 'name'>[], seconds: number, won: boolean): void {
  document.querySelector<HTMLDialogElement>('.combat-report')?.close();
  const dialog = el('dialog', 'party-dialog combat-report'); dialog.setAttribute('aria-label', 'Combat report');
  dialog.append(el('span', 'eyebrow', won ? 'VITTORIA DEL PARTY' : 'PARTY SCONFITTO'), el('h2', '', 'Combat report'), el('p', '', `Durata: ${formatSeconds(seconds)} · Danni effettivi, escluso l’overkill.`));
  const wrap = el('div', 'combat-report-scroll'), table = el('table', 'combat-report-table'), head = el('tr');
  for (const name of ['Personaggio', 'Danni fatti', 'Danni subiti', 'Guarigione']) head.append(el('th', '', name));
  const thead = el('thead'); thead.append(head); table.append(thead); const body = el('tbody');
  for (const [id, stats] of Object.entries(report)) {
    const row = el('tr'); row.append(el('td', '', members.find(m => m.id === id)?.name ?? 'Alleato disconnesso'));
    for (const value of [stats.damageDealt, stats.damageReceived, stats.healing]) row.append(el('td', '', Math.round(value).toLocaleString('it-IT')));
    body.append(row);
  }
  table.append(body); wrap.append(table); dialog.append(wrap, el('p', 'party-preview-note', 'Guarigione: 0 finché non saranno introdotte le cure e la classe Chierico.'));
  const close = el('button', 'primary', 'Continua →'); close.addEventListener('click', () => dialog.close()); dialog.append(close);
  dialog.addEventListener('keydown', e => { if (e.code === 'Escape') e.stopPropagation(); });
  dialog.addEventListener('close', () => dialog.remove()); document.body.append(dialog); dialog.showModal();
}
