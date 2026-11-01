import { RELEASES, type ReleaseNotes, describeBalanceChange, formatVersion } from '../../release-notes';
import { el } from './dom';

/** Cronologia completa disponibile, dalla versione corrente alle precedenti. */
export function renderChangelog(): HTMLElement {
  const history = el('div', 'release-history');
  history.append(el('h2', '', 'Cronologia del gioco'));
  RELEASES.forEach((release, index) => history.append(renderRelease(release, index === 0)));
  return history;
}

function renderRelease(release: ReleaseNotes, current: boolean): HTMLElement {
  const section = el('details', 'release-entry');
  section.open = current;
  const heading = el('summary', 'release-heading', `${formatVersion(release.version)}${current ? ' · Attuale' : ''}`);
  const date = el('time', 'release-date', release.date.split('-').reverse().join('/'));
  date.dateTime = release.date;
  heading.append(date);
  section.append(heading);
  const features = el('ul');
  for (const text of release.changes) features.append(el('li', '', text));
  section.append(features);
  if (release.balanceChanges.length > 0) {
    section.append(el('h3', '', 'Bilanciamento'));
    const balance = el('ul');
    for (const change of release.balanceChanges) balance.append(el('li', '', describeBalanceChange(change)));
    section.append(balance);
  } else {
    section.append(el('p', 'release-balance-note', 'Nessuna modifica ai valori di combattimento.'));
  }
  return section;
}
