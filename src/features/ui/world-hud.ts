import { Vec2 } from '../../core/vec2';
import type { WorldMap } from '../world/world-map';
import { el } from './dom';

/**
 * Strumenti di prova del mondo aperto sopra la partita: il luogo in cui ci si trova e i viaggi rapidi verso i punti da
 * controllare. Provvisorio: sparirà quando il mondo avrà il suo ingresso e la sua mappa.
 */
export class WorldHud {
  private readonly root = el('div', 'world-hud hidden');
  private readonly place = el('p', 'world-place');
  private readonly bar = el('div', 'world-bar');
  private map: WorldMap | null = null;

  constructor(private readonly handlers: { readonly travel: (point: Vec2) => void }) {
    this.place.setAttribute('role', 'status');
    this.root.append(this.place, this.bar);
    document.body.append(this.root);
  }

  show(map: WorldMap): void {
    if (this.map !== map) {
      this.map = map;
      this.bar.replaceChildren(...this.destinations(map).map(({ label, point }) => {
        const button = el('button', 'relic-button secondary', label);
        button.type = 'button';
        // Il fuoco torna alla partita: i tasti di movimento non devono restare sul pulsante.
        button.onclick = () => { this.handlers.travel(point); button.blur(); };
        return button;
      }));
    }
    this.root.classList.remove('hidden');
  }

  hide(): void { this.root.classList.add('hidden'); }

  update(position: Vec2): void {
    const map = this.map;
    if (map === null || this.root.classList.contains('hidden')) return;
    const tile = map.definition.tile, tx = Math.round(position.x / tile), ty = Math.round(position.y / tile);
    const biome = map.generator.biomeAt(tx, ty), text = `${biome.name} · grado ${biome.tier + 1} · ${tx}, ${ty}`;
    if (this.place.textContent !== text) this.place.textContent = text;
  }

  /** Tappe lungo il sentiero principale e il primo tratto di rovine. */
  private destinations(map: WorldMap): readonly { readonly label: string; readonly point: Vec2 }[] {
    const { generator, definition } = map, tile = definition.tile;
    const onPath = (row: number): Vec2 => new Vec2(generator.mainPathCenter(row) * tile, row * tile);
    const list = [{ label: 'Partenza', point: new Vec2(map.width / 2, definition.spawn.row * tile) }];
    let end = 0;
    definition.biomes.forEach((biome, index) => {
      if (index > 0) list.push({ label: `Confine · ${biome.name}`, point: onPath(end - 6) }, { label: biome.name, point: onPath(end + Math.round(biome.rows / 2)) });
      end += biome.rows;
    });
    for (let vy = 24; vy < generator.heightTiles; vy += definition.ruins.grid) for (let vx = Math.ceil(definition.ruins.fromColumn * generator.widthTiles); vx < generator.widthTiles; vx++) {
      if (generator.terrainAtVertex(vx, vy) === 'wall') return [...list, { label: 'Rovine', point: new Vec2((vx + 2) * tile, (vy + 3) * tile) }];
    }
    return list;
  }
}
