import type { Match } from '../match/match';
import type { SkillDefinition } from '../skills/skill-definition';
import { requireElement } from './dom';

/**
 * Interfaccia in DOM sopra il canvas: barre della vita, skill e ricariche. Mostra solo lo stato della partita,
 * senza regole di gioco, e tocca il DOM soltanto quando un valore cambia.
 */
export class Hud {
  private readonly playerBar = requireElement('player-bar');
  private readonly playerText = requireElement('player-text');
  private readonly bossBar = requireElement('boss-bar');
  private readonly bossText = requireElement('boss-text');
  private readonly cooldownBars: HTMLElement[] = [];
  private readonly last = new Map<HTMLElement, string>();

  /** Crea una scheda per ogni skill, nell'ordine degli slot. */
  buildSkills(skills: readonly SkillDefinition[]): void {
    const list = requireElement('skills');
    list.replaceChildren();
    this.cooldownBars.length = 0;
    for (const skill of skills) {
      const item = document.createElement('li');
      item.className = 'skill';
      const key = document.createElement('span');
      key.className = 'key';
      key.textContent = skill.keyLabel;
      const name = document.createElement('b');
      name.textContent = skill.name;
      const description = document.createElement('small');
      description.textContent = skill.description;
      const cooldown = document.createElement('div');
      cooldown.className = 'cool';
      item.append(key, name, description, cooldown);
      list.append(item);
      this.cooldownBars.push(cooldown);
    }
  }

  update(match: Match): void {
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
