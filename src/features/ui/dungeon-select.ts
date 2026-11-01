import type { Character } from '../character/character';
import type { DungeonDefinition } from '../dungeons/dungeon-definition';
import { DUNGEONS } from '../dungeons/dungeons';
import { el, formatSeconds, requireElement } from './dom';
import { lootTableFor } from '../loot/loot-tables';
import { PROGRESSION } from '../character/progression';
import { renderBossArtwork } from './boss-artwork';
import { renderLootRate } from './loot-tooltip';
import { canEnterDungeon, minimumDungeonGearScore } from '../dungeons/dungeon-access';

/** GS che serve per il Pellegrinaggio: quello del dungeon piu' esigente. */
export function pilgrimageGearScore(): number {
  return Math.max(...DUNGEONS.map((dungeon) => minimumDungeonGearScore(dungeon)));
}

/**
 * Scelta del dungeon: una scheda per ognuno, con boss, pericolo e record del personaggio. Si entra con la Discesa
 * (stanze di servitori fino al boss) o, dopo aver battuto il boss, con il Duello (il boss da solo, come prima). Il grado
 * di tempra rende la discesa piu' dura e ricca; il Pellegrinaggio fa le quattro discese di fila.
 */
export class DungeonSelect {
  private readonly list = requireElement('dungeon-list');
  private readonly pilgrimage = requireElement<HTMLButtonElement>('dungeons-pilgrimage');
  private readonly grades = new Map<string, number>();

  constructor(
    private readonly handlers: {
      readonly onDescent: (dungeon: DungeonDefinition, grade: number) => void;
      readonly onDuel: (dungeon: DungeonDefinition) => void;
      readonly onPilgrimage: () => void;
      /** Passando sopra una scheda lo sfondo mostra la mappa di quel dungeon. */
      readonly onPreview: (dungeon: DungeonDefinition) => void;
      readonly onBack: () => void;
    },
  ) {
    requireElement('dungeons-back').addEventListener('click', handlers.onBack);
    this.pilgrimage.addEventListener('click', () => handlers.onPilgrimage());
  }

  render(character: Character): void {
    this.list.replaceChildren();
    const ids = DUNGEONS.map((dungeon) => dungeon.id);
    const pilgrimageOpen = character.canPilgrimage(ids);
    const pilgrimageGs = pilgrimageGearScore();
    this.pilgrimage.disabled = !pilgrimageOpen || character.gearScore < pilgrimageGs;
    this.pilgrimage.title = !pilgrimageOpen
      ? 'Si apre dopo aver vinto una discesa in ogni dungeon.'
      : character.gearScore < pilgrimageGs
        ? `Servono ${pilgrimageGs} GS equipaggiati.`
        : `Le quattro discese di fila, dalla cripta al ghiacciaio.${character.pilgrimage.clears > 0 ? ` Vinto ${character.pilgrimage.clears} volte.` : ''}`;
    for (const dungeon of DUNGEONS) {
      const record = character.recordFor(dungeon.id);
      const descent = character.descentFor(dungeon.id);
      const card = el('article', 'dungeon-card');
      card.tabIndex = 0;
      card.dataset.dungeon = dungeon.id;
      const danger = el('div', 'dungeon-danger');
      danger.setAttribute('aria-label', `Pericolo ${dungeon.danger} su 4`);
      danger.append(el('span', '', 'Pericolo'));
      for (let i = 0; i < 4; i++) {
        const dot = el('i', 'danger-dot' + (i < dungeon.danger ? ' filled' : ''));
        dot.setAttribute('aria-hidden', 'true');
        danger.append(dot);
      }
      card.append(
        danger,
        el('b', 'dungeon-name', dungeon.name),
        renderBossArtwork(dungeon),
        el('span', 'dungeon-boss', `Boss: ${dungeon.boss.name}`),
        el(
          'span',
          descent.clears > 0 ? 'dungeon-record done' : 'dungeon-record',
          descent.clears > 0
            ? `Discese: ${descent.clears}${descent.bestTimeSeconds !== null ? ` · ${formatSeconds(descent.bestTimeSeconds)}` : ''}${descent.bestGrade > 0 ? ` · grado ${descent.bestGrade}` : ''}`
            : descent.furthestStage > 0
              ? `Discesa: arrivato alla tappa ${descent.furthestStage}`
              : 'Discesa non ancora completata',
        ),
        el(
          'span',
          record.clears > 0 ? 'dungeon-record done' : 'dungeon-record',
          record.clears > 0
            ? `Boss: ${record.clears} ${record.clears === 1 ? 'vittoria' : 'vittorie'}${record.bestTimeSeconds !== null ? ` · in ${formatSeconds(record.bestTimeSeconds)}` : ''}`
            : 'Boss mai sconfitto',
        ),
      );
      const table = lootTableFor(dungeon.id);
      card.append(el('p', 'dungeon-rewards', `${PROGRESSION.rewards[dungeon.id as keyof typeof PROGRESSION.rewards]} XP · Set livello ${table.itemLevel}`), renderLootRate(table));
      const allowed = canEnterDungeon(dungeon, character.gearScore);
      const minimum = minimumDungeonGearScore(dungeon);
      const maxGrade = character.maxGrade(dungeon.id);
      const grade = Math.min(this.grades.get(dungeon.id) ?? 0, maxGrade);
      if (maxGrade > 0) {
        const label = el('label', 'dungeon-grade', 'Grado di tempra ');
        const select = el('select');
        for (let value = 0; value <= maxGrade; value++) {
          const option = el('option', '', value === 0 ? '0 · normale' : `${value} · +${value * 10}% nemici e braci`);
          option.value = String(value);
          select.append(option);
        }
        select.value = String(grade);
        select.addEventListener('change', () => this.grades.set(dungeon.id, Number(select.value)));
        select.addEventListener('click', (event) => event.stopPropagation());
        label.append(select);
        card.append(label);
      }
      const buttons = el('div', 'dungeon-buttons');
      const descend = el('button', 'primary dungeon-enter', allowed ? 'Discesa →' : `Richiesti ${minimum} GS · Hai ${character.gearScore}`);
      descend.type = 'button';
      descend.disabled = !allowed;
      descend.title = allowed ? 'Stanze di servitori, una scelta di porte a ogni tappa, il boss in fondo.' : `Ingresso: almeno ${minimum} GS equipaggiati · Attuali ${character.gearScore}`;
      descend.addEventListener('click', () => this.handlers.onDescent(dungeon, Math.min(this.grades.get(dungeon.id) ?? 0, maxGrade)));
      const duel = el('button', 'secondary dungeon-duel', 'Duello');
      duel.type = 'button';
      duel.disabled = !allowed || !character.canDuel(dungeon.id);
      duel.title = character.canDuel(dungeon.id) ? 'Solo il boss, come un tempo.' : 'Si apre dopo aver sconfitto il boss in una discesa.';
      duel.addEventListener('click', () => this.handlers.onDuel(dungeon));
      buttons.append(descend, duel);
      card.append(buttons);
      card.addEventListener('mouseenter', () => this.handlers.onPreview(dungeon));
      card.addEventListener('focus', () => this.handlers.onPreview(dungeon));
      this.list.append(card);
    }
  }
}
