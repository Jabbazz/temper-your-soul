import { dungeonById } from '../dungeons/dungeons';
import type { RunView } from '../run/descent';
import { ROOM_LABELS, type DoorOption } from '../run/rooms';
import { STAGE_MARKS } from './descent-hud';
import { requireElement } from './dom';
import { showsVeins, veinName } from '../run/veins';

/*
 * La mappa intera della discesa, tenendo premuto Tab: le tappe in colonna da sinistra a destra, con il percorso fatto
 * pieno, le porte scartate in grigio (restano leggibili: ricordano a cosa si e' rinunciato), le porte della tappa dopo
 * con tipo e premio, e il resto ancora da scoprire. Le tappe fisse (Soglia, Luogotenente, Anticamera, Boss) si vedono
 * dall'inizio. Solo rappresentazione: legge la vista della discesa, non mette in pausa nulla.
 */

/** Come appare un nodo: fatto (scelto), scartato, la stanza di adesso, la prossima scelta, fisso, da scoprire. */
export type MapNodeState = 'chosen' | 'discarded' | 'current' | 'next' | 'fixed' | 'unknown';

export interface MapNode {
  readonly stage: number;
  readonly index: number;
  readonly count: number;
  readonly state: MapNodeState;
  /** Tipo e premio, se si possono mostrare (non per i nodi da scoprire). */
  readonly option: DoorOption | null;
}

/** I nodi della mappa: uno per porta di ogni tappa, con quello che il giocatore puo' sapere a questo punto. */
export function descentMapNodes(run: Pick<RunView, 'plan' | 'stage'>): MapNode[] {
  const nodes: MapNode[] = [];
  run.plan.forEach((stage, s) => {
    stage.options.forEach((option, index) => {
      const count = stage.options.length;
      let state: MapNodeState;
      if (s < run.stage) state = stage.chosen === index ? 'chosen' : 'discarded';
      else if (s === run.stage) state = stage.chosen === null || stage.chosen === index ? 'current' : 'discarded';
      else if (s === run.stage + 1) state = 'next';
      else state = count === 1 ? 'fixed' : 'unknown';
      nodes.push({ stage: s, index, count, state, option: state === 'unknown' ? null : option });
    });
  });
  return nodes;
}

const SVG = 'http://www.w3.org/2000/svg';
const WIDTH = 760;
const HEIGHT = 300;
const ROW = 74;

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number>, text?: string): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  if (text !== undefined) element.textContent = text;
  return element;
}

export class DescentMapOverlay {
  private readonly root = requireElement('descent-map');
  private key = '';

  get visible(): boolean {
    return !this.root.classList.contains('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  show(run: RunView): void {
    this.root.classList.remove('hidden');
    // La chiave comprende le porte e le vene: una discesa nuova alla stessa tappa non mostra la mappa della vecchia.
    const key = JSON.stringify([
      run.dungeonId,
      run.dungeonIndex,
      run.stage,
      run.plan.map((stage) => [stage.chosen, stage.options.map((option) => option.kind)]),
      run.veins,
    ]);
    if (key === this.key) return;
    this.key = key;
    this.root.replaceChildren(this.render(run));
  }

  private render(run: RunView): SVGSVGElement {
    const nodes = descentMapNodes(run);
    const stages = run.plan.length;
    const columnX = (stage: number): number => 60 + (stage * (WIDTH - 120)) / Math.max(1, stages - 1);
    const nodeY = (node: Pick<MapNode, 'index' | 'count'>): number => 150 + (node.index - (node.count - 1) / 2) * ROW;
    const dungeon = dungeonById(run.dungeonId);
    const pilgrimage = run.mode === 'pilgrimage' ? ` · Pellegrinaggio ${run.dungeonIndex + 1}/${run.dungeons.length}` : '';
    const title = `${dungeon?.name ?? ''} · tappa ${run.stage + 1} di ${run.stages}${pilgrimage}`;
    const root = svg('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, role: 'img', 'aria-label': `Mappa della discesa: ${title}` });
    root.append(svg('text', { x: 24, y: 28, class: 'descent-map-title' }, title));
    // Le vene della discesa: d'ingresso fino al luogotenente, poi la profonda.
    if (showsVeins(run.veins)) {
      const veins = run.veins.entrance === run.veins.deep
        ? `Vena: ${veinName(run.dungeonId, run.veins.entrance)}`
        : `Ingresso: ${veinName(run.dungeonId, run.veins.entrance)} · Profondo: ${veinName(run.dungeonId, run.veins.deep)}`;
      root.append(svg('text', { x: WIDTH - 24, y: 28, class: 'descent-map-veins', 'text-anchor': 'end' }, veins));
    }
    // Collegamenti: dalla porta presa a ogni tappa (fino a quella di adesso) verso le porte della tappa dopo; piu'
    // avanti, da ogni porta possibile a ogni porta possibile. Pieni il percorso fatto, grigi verso le porte scartate,
    // tratteggiati verso il futuro.
    const links = svg('g', { class: 'descent-map-links' });
    const atStage = (stage: number): MapNode[] => nodes.filter((node) => node.stage === stage);
    for (let stage = 0; stage + 1 < stages; stage++) {
      const sources = stage <= run.stage ? atStage(stage).filter((node) => node.state === 'chosen' || node.state === 'current') : atStage(stage);
      for (const from of sources) {
        for (const to of atStage(stage + 1)) {
          const kind = to.stage > run.stage ? 'ahead' : to.state === 'discarded' ? 'past' : 'travelled';
          links.append(svg('line', { x1: columnX(from.stage) + 16, y1: nodeY(from), x2: columnX(to.stage) - 16, y2: nodeY(to), class: kind }));
        }
      }
    }
    root.append(links);
    for (const node of nodes) {
      const x = columnX(node.stage);
      const y = nodeY(node);
      const group = svg('g', { class: `descent-map-node ${node.state}` });
      group.append(svg('circle', { cx: x, cy: y, r: 16 }));
      if (node.state === 'current') group.append(svg('circle', { cx: x, cy: y, r: 22, class: 'ring' }));
      group.append(svg('text', { x, y: y + 5, class: 'mark' }, node.option === null ? '?' : STAGE_MARKS[node.option.kind]));
      if (node.option !== null) {
        group.append(svg('text', { x, y: y + 32, class: 'name' }, ROOM_LABELS[node.option.kind].name));
        if (node.option.hard) group.append(svg('text', { x, y: y + 45, class: 'detail' }, 'dura'));
      } else if (node.index === node.count - 1) {
        group.append(svg('text', { x, y: y + 32, class: 'detail' }, `${node.count} porte`));
      }
      group.append(svg('title', {}, node.option === null ? 'Da scoprire' : ROOM_LABELS[node.option.kind].summary));
      root.append(group);
    }
    for (const [column, label] of run.plan.map((_, s) => [s, ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][s] ?? String(s + 1)] as const)) {
      root.append(svg('text', { x: columnX(column), y: 56, class: 'descent-map-column' }, label));
    }
    root.append(svg('text', { x: 24, y: HEIGHT - 14, class: 'descent-map-legend' }, 'Pieno: percorso fatto · grigio: porta scartata · ?: da scoprire · anello: qui · rilascia Tab per chiudere'));
    return root;
  }
}
