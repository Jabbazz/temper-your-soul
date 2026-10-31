import { SKILL_ICONS } from '../presentation/skill-icons';
import { renderPixelIcon } from './pixel-icon';
import { describeSkillStats } from '../items/item';
import { manaCost } from '../skills/mana';
import type { Match } from '../match/match';
import type { Loadout } from '../skills/skill-definition';
import { requireElement } from './dom';

/**
 * Interfaccia in DOM sopra il canvas: barre della vita, skill e ricariche. Mostra solo lo stato della partita,
 * senza regole di gioco, e tocca il DOM soltanto quando un valore cambia.
 */
/** Etichette dei comandi per slot di skill (i tasti veri sono nell'Input Map). */
const SLOT_LABELS = ['MOUSE SX', 'MOUSE DX', 'Q', 'E'];

export class Hud {
  private readonly playerBar = requireElement('player-bar');
  private readonly playerText = requireElement('player-text');
  private readonly bossBar = requireElement('boss-bar');
  private readonly bossText = requireElement('boss-text');
  private readonly bossName = requireElement('boss-name');
  private readonly cooldownBars: HTMLElement[] = [];
  private readonly last = new WeakMap<HTMLElement, string>();

  setBossName(name: string): void {
    this.setText(this.bossName, name);
  }

  /** Crea una scheda per ogni slot, nell'ordine degli slot; uno slot vuoto mostra solo il comando. */
  buildSkills(skills: Loadout): void {
    const list = requireElement('skills');
    list.replaceChildren();
    this.cooldownBars.length = 0;
    skills.forEach((skill, slot) => {
      const item = document.createElement('li');
      item.className = skill === null ? 'skill skill-empty' : 'skill';
      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = SLOT_LABELS[slot] ?? '';
      const name = document.createElement('b');
      name.textContent = skill === null ? '— vuoto —' : skill.name;
      const description = document.createElement('small');
      description.textContent = skill === null ? 'Equipaggia un oggetto' : skill.description;
      const cooldown = document.createElement('div');
      cooldown.className = 'cool';
      if (skill !== null) {
        const icon = SKILL_ICONS[skill.id];
        if (icon) item.append(renderPixelIcon(icon));
        item.title = [skill.name, skill.description, ...describeSkillStats(skill)].join('\n');
        item.dataset.cost = String(manaCost(skill));
      }
      item.style.order = String([1, 0, 2, 3][slot]);
      item.append(key, name, description, cooldown);
      list.append(item);
      this.cooldownBars.push(cooldown);
    });
  }

  update(match: Match, progress = {level: 1, current: 0, required: 100}): void {
    this.setText(requireElement('character-level'), String(progress.level));
    this.setText(requireElement('xp-text'), `${progress.current} / ${progress.required} XP`);
    this.setWidth(requireElement('xp-bar'), progress.current / progress.required * 100);
    this.setText(requireElement('mana-text'), `${Math.floor(match.player.mana)} / ${match.player.maxMana} MANA`);
    this.setWidth(requireElement('mana-bar'), match.player.mana / match.player.maxMana * 100);
    for (const element of Array.from(requireElement('skills').children)) {
      (element as HTMLElement).classList.toggle('no-mana', Number((element as HTMLElement).dataset.cost ?? 0) > match.player.mana);
    }
    const { player, boss } = match;
    this.setWidth(this.playerBar, player.health.fraction * 100);
    this.setText(this.playerText, `${Math.ceil(player.health.current)} / ${player.health.max} PV`);
    this.setWidth(this.bossBar, boss.health.fraction * 100);
    this.setText(this.bossText, `${Math.ceil(boss.health.current)} / ${boss.health.max} · FASE ${boss.phase}`);
    this.cooldownBars.forEach((bar, slot) => this.setWidth(bar, player.skillBar.cooldownFraction(slot) * 100));
  }

  private setText(element: HTMLElement, text: string): void {
    if (this.last.get(element) === text) return;
    this.last.set(element, text);
    element.textContent = text;
  }

  private setWidth(element: HTMLElement, percent: number): void {
    const value = `${percent}%`;
    if (this.last.get(element) === value) return;
    this.last.set(element, value);
    element.style.width = value;
  }
}
