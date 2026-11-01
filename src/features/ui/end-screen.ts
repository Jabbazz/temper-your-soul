import type { Item } from '../items/item';
import type { CharacterClass } from '../character/character-class';
import { DEFEAT_TIPS, type CombatSummary } from '../match/combat-tally';
import { el, formatSeconds } from './dom';
import { renderLoot } from './loot-view';

/*
 * Contenuto delle schermate di fine incontro, con una gerarchia chiara: esito (il titolo lo mette l'overlay), poi
 * prestazione, poi ricompense, poi azioni. Solo rappresentazione: riceve numeri gia' calcolati.
 */

const number = (value: number): string => Math.round(value).toLocaleString('it-IT');

/** Una tessera di statistica: valore grande, etichetta piccola, eventuale distintivo ("Record!"). */
function tile(label: string, value: string, badge?: string, delay = 0): HTMLElement {
  const root = el('div', 'result-tile');
  root.style.setProperty('--delay', `${delay}ms`);
  root.append(el('strong', '', value), el('span', '', label));
  if (badge !== undefined) root.append(el('em', 'result-badge', badge));
  return root;
}

function accuracyText(summary: CombatSummary): string {
  return summary.accuracy === null ? '—' : `${Math.round(summary.accuracy * 100)}%`;
}

export interface VictoryView {
  readonly bossName: string;
  readonly seconds: number;
  readonly firstClear: boolean;
  readonly newBest: boolean;
  readonly healthLeft: number;
  readonly healthMax: number;
  readonly summary: CombatSummary;
  /** Esperienza: guadagnata, livello e frazione della barra prima e dopo. */
  readonly xp: { readonly gained: number; readonly levelBefore: number; readonly levelAfter: number; readonly before: number; readonly after: number };
  readonly items: readonly Item[];
  readonly saved: boolean;
  readonly characterClass: CharacterClass | null;
}

/** Vittoria: sottotitolo, statistiche (con record), esperienza che si riempie, bottino rivelato in sequenza. */
export function renderVictory(view: VictoryView): HTMLElement {
  const root = el('div', 'result result-victory');
  // Neutro rispetto al genere del boss ("la Madre delle spore", "il Colosso"): niente articoli ne' participi.
  root.append(el('p', 'result-subtitle', `Boss sconfitto · ${titleCase(view.bossName)}`));

  const stats = el('div', 'result-stats');
  const timeBadge = view.firstClear ? 'Prima vittoria' : view.newBest ? 'Record!' : undefined;
  stats.append(
    tile('Tempo', formatSeconds(view.seconds), timeBadge, 0),
    tile('Danni inflitti', number(view.summary.damageDealt), undefined, 90),
    tile('Precisione', accuracyText(view.summary), undefined, 180),
    tile('Colpo più forte', number(view.summary.biggestHit), undefined, 270),
    tile('Vita rimasta', `${Math.ceil(view.healthLeft)} / ${view.healthMax}`, view.summary.hitsTaken === 0 ? 'Intatto' : undefined, 360),
  );
  if (view.summary.minionsDefeated > 0) stats.append(tile('Servitori abbattuti', number(view.summary.minionsDefeated), undefined, 450));
  root.append(stats);

  const xp = el('div', 'result-xp');
  const leveled = view.xp.levelAfter > view.xp.levelBefore;
  const track = el('div', 'result-xp-track');
  const fill = el('i');
  fill.style.setProperty('--from', `${(leveled ? 0 : view.xp.before) * 100}%`);
  fill.style.setProperty('--to', `${view.xp.after * 100}%`);
  track.append(fill);
  xp.append(el('b', '', `+${view.xp.gained} XP`), track, el('span', '', `Livello ${view.xp.levelAfter}`));
  if (leveled) xp.append(el('em', 'result-levelup', `Livello ${view.xp.levelAfter}!`));
  root.append(xp);

  const loot = renderLoot(view.items, { firstClear: false, newBest: false, seconds: view.seconds }, view.saved, view.characterClass);
  loot.classList.add('result-loot');
  if (view.items.length === 0) {
    loot.querySelector('.loot-title')!.textContent = 'Nessun oggetto questa volta';
    loot.querySelector('.loot-grid')?.remove();
    loot.insertBefore(el('small', 'result-note', 'Ogni vittoria ha il 25% di probabilità di lasciare un oggetto.'), loot.querySelector('.loot-saved'));
  }
  root.append(loot);
  return root;
}

export interface DefeatView {
  readonly bossName: string;
  readonly seconds: number;
  /** Frazione di vita rimasta al boss. */
  readonly bossHealth: number;
  readonly summary: CombatSummary;
  /** Apre lo zaino per cambiare equipaggiamento. */
  readonly onInventory: () => void;
}

/** Sconfitta: quanto mancava, quanto si e' resistito, cosa ha colpito di piu' e un consiglio su quello. */
export function renderDefeat(view: DefeatView): HTMLElement {
  const root = el('div', 'result result-defeat');
  root.append(el('p', 'result-subtitle', 'La brace si è spenta.'));

  const boss = el('div', 'result-boss');
  const bar = el('div', 'result-boss-bar');
  const fill = el('i');
  fill.style.width = `${Math.max(0, Math.min(1, view.bossHealth)) * 100}%`;
  bar.append(fill);
  boss.append(el('span', '', titleCase(view.bossName)), bar, el('small', '', `aveva ancora il ${Math.ceil(view.bossHealth * 100)}% di vita`));
  root.append(boss);

  const stats = el('div', 'result-stats');
  stats.append(
    tile('Resistito', formatSeconds(view.seconds), undefined, 0),
    tile('Danni inflitti', number(view.summary.damageDealt), undefined, 90),
    tile('Precisione', accuracyText(view.summary), undefined, 180),
  );
  root.append(stats);

  const top = view.summary.topSources.slice(0, 2);
  if (top.length > 0) {
    const cause = el('div', 'result-cause');
    cause.append(el('b', '', 'Ti ha colpito soprattutto'));
    const list = el('ul');
    for (const source of top) {
      list.append(el('li', '', `${source.name} · ${source.hits} ${source.hits === 1 ? 'colpo' : 'colpi'} · ${number(source.damage)} danni`));
    }
    cause.append(list, el('p', 'result-tip', DEFEAT_TIPS[top[0]!.kind]));
    root.append(cause);
  }

  const inventory = el('button', 'result-link', 'Cambia equipaggiamento');
  inventory.type = 'button';
  inventory.addEventListener('click', view.onInventory);
  root.append(inventory);
  return root;
}

/** Cio' che la schermata finale di una discesa racconta. */
export interface DescentSummaryView {
  readonly title: string;
  /** Secondi di tutta la discesa. */
  readonly seconds: number;
  readonly newBest: boolean;
  readonly firstClear: boolean;
  readonly stage: number;
  readonly stages: number;
  readonly rooms: number;
  readonly embers: number;
  readonly tempers: number;
  readonly seals: number;
  readonly summary: CombatSummary;
  readonly xp: VictoryView['xp'];
  readonly items: readonly Item[];
  readonly saved: boolean;
  readonly characterClass: CharacterClass | null;
  /** Probabilità di bottino originale del boss, senza bonus delle stanze. */
  readonly dropChance: number;
}

/** Fine di una discesa vinta: tempo totale, stanze, esperienza e bottino del boss. */
export function renderDescentVictory(view: DescentSummaryView): HTMLElement {
  const root = el('div', 'result result-victory');
  root.append(el('p', 'result-subtitle', view.title));
  const stats = el('div', 'result-stats');
  stats.append(
    tile('Tempo della discesa', formatSeconds(view.seconds), view.firstClear ? 'Prima vittoria' : view.newBest ? 'Record!' : undefined, 0),
    tile('Stanze liberate', number(view.rooms), undefined, 90),
    tile('Servitori abbattuti', number(view.summary.minionsDefeated), undefined, 360),
  );
  root.append(stats);
  root.append(xpTrack(view.xp));
  const loot = renderLoot(view.items, { firstClear: false, newBest: false, seconds: view.seconds }, view.saved, view.characterClass);
  loot.classList.add('result-loot');
  if (view.items.length === 0) {
    loot.querySelector('.loot-title')!.textContent = 'Nessun oggetto questa volta';
    loot.querySelector('.loot-grid')?.remove();
  }
  root.append(loot);
  return root;
}

/** Fine di una discesa persa: dove si è arrivati, bestiario e cause dei danni. */
export function renderDescentDefeat(view: DescentSummaryView & { readonly onInventory: () => void }): HTMLElement {
  const root = el('div', 'result result-defeat');
  root.append(el('p', 'result-subtitle', view.title));
  const stats = el('div', 'result-stats');
  stats.append(
    tile('Tappa raggiunta', `${view.stage} di ${view.stages}`, undefined, 0),
    tile('Resistito', formatSeconds(view.seconds), undefined, 90),
    tile('Stanze liberate', number(view.rooms), undefined, 270),
  );
  root.append(stats);
  root.append(xpTrack(view.xp));
  const top = view.summary.topSources.slice(0, 2);
  if (top.length > 0) {
    const cause = el('div', 'result-cause');
    cause.append(el('b', '', 'Ti ha colpito soprattutto'));
    const list = el('ul');
    for (const source of top) list.append(el('li', '', `${source.name} · ${source.hits} ${source.hits === 1 ? 'colpo' : 'colpi'} · ${number(source.damage)} danni`));
    cause.append(list, el('p', 'result-tip', DEFEAT_TIPS[top[0]!.kind]));
    root.append(cause);
  }
  root.append(el('small', 'result-note', 'Il bestiario resta aggiornato. Le stanze intermedie non assegnano ricompense.'));
  const inventory = el('button', 'result-link', 'Cambia equipaggiamento');
  inventory.type = 'button';
  inventory.addEventListener('click', view.onInventory);
  root.append(inventory);
  return root;
}

function xpTrack(xp: VictoryView['xp']): HTMLElement {
  const root = el('div', 'result-xp');
  const leveled = xp.levelAfter > xp.levelBefore;
  const track = el('div', 'result-xp-track');
  const fill = el('i');
  fill.style.setProperty('--from', `${(leveled ? 0 : xp.before) * 100}%`);
  fill.style.setProperty('--to', `${xp.after * 100}%`);
  track.append(fill);
  root.append(el('b', '', `+${xp.gained} XP`), track, el('span', '', `Livello ${xp.levelAfter}`));
  if (leveled) root.append(el('em', 'result-levelup', `Livello ${xp.levelAfter}!`));
  return root;
}

/** "GUARDIANO DELLA CRIPTA" -> "Guardiano della cripta". */
function titleCase(name: string): string {
  const lower = name.toLocaleLowerCase('it-IT');
  return lower.charAt(0).toLocaleUpperCase('it-IT') + lower.slice(1);
}
