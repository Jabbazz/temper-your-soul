import type { Character } from '../character/character';
import type { DungeonDefinition } from '../dungeons/dungeon-definition';
import { DUNGEONS } from '../dungeons/dungeons';
import { el, formatSeconds, requireElement } from './dom';
import { lootTableFor } from '../loot/loot-tables';
import { PROGRESSION } from '../character/progression';
import { renderBossArtwork } from './boss-artwork';
import { renderLootRate } from './loot-tooltip';
import { canEnterDungeon,minimumDungeonGearScore } from '../dungeons/dungeon-access';

/** Scelta del dungeon: una scheda per ognuno, con boss, pericolo e record del personaggio. */
export class DungeonSelect {
  private readonly list = requireElement('dungeon-list');

  constructor(
    private readonly handlers: {
      readonly onChoose: (dungeon: DungeonDefinition) => void;
      /** Passando sopra una scheda lo sfondo mostra la mappa di quel dungeon. */
      readonly onPreview: (dungeon: DungeonDefinition) => void;
      readonly onBack: () => void;
    },
  ) {
    requireElement('dungeons-back').addEventListener('click', handlers.onBack);
  }

  render(character: Character): void {
    this.list.replaceChildren();
    for (const dungeon of DUNGEONS) {
      const record = character.recordFor(dungeon.id);
      const card = el('article', 'dungeon-card');
      card.tabIndex=0;
      card.dataset.dungeon = dungeon.id;
      const danger=el('div','dungeon-danger');danger.setAttribute('aria-label',`Pericolo ${dungeon.danger} su 4`);
      danger.append(el('span','','Pericolo'));
      for(let i=0;i<4;i++){const dot=el('i','danger-dot'+(i<dungeon.danger?' filled':''));dot.setAttribute('aria-hidden','true');danger.append(dot);}
      card.append(
        danger,
        el('b', 'dungeon-name', dungeon.name),
        renderBossArtwork(dungeon),
        el('span', 'dungeon-boss', `Boss: ${dungeon.boss.name}`),
        el(
          'span',
          record.clears > 0 ? 'dungeon-record done' : 'dungeon-record',
          record.clears > 0
            ? `Vittorie: ${record.clears}${record.bestTimeSeconds !== null ? ` · Miglior tempo: ${formatSeconds(record.bestTimeSeconds)}` : ''}`
            : 'Non ancora completato',
        ),
      );
      const table=lootTableFor(dungeon.id);
      card.append(el('p','dungeon-rewards',`${PROGRESSION.rewards[dungeon.id as keyof typeof PROGRESSION.rewards]} XP · Set livello ${table.itemLevel}`),renderLootRate(table));
      const allowed=canEnterDungeon(dungeon,character.gearScore),minimum=minimumDungeonGearScore(dungeon);
      const start=el('button','primary dungeon-enter',allowed?'Entra nel dungeon →':`Richiesti ${minimum} GS · Hai ${character.gearScore}`);start.type='button';start.disabled=!allowed;
      if(minimum>0)start.setAttribute('title',`Ingresso: almeno ${minimum} GS equipaggiati · Attuali ${character.gearScore}`);
      start.addEventListener('click',()=>this.handlers.onChoose(dungeon));card.append(start);
      card.addEventListener('mouseenter', () => this.handlers.onPreview(dungeon));
      card.addEventListener('focus', () => this.handlers.onPreview(dungeon));
      this.list.append(card);
    }
  }
}
