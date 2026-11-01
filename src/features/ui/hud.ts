import { SKILL_ICONS } from '../presentation/skill-icons';
import { renderPixelIcon } from './pixel-icon';
import { describeSkillStats } from '../items/item';
import { manaCost } from '../skills/mana';
import { ENVIRONMENT_ID, type Match } from '../match/match';
import type { Loadout } from '../skills/skill-definition';
import type { GameEvent } from '../combat/events';
import { requireElement } from './dom';
import { ChipBar, DamageMeter } from './health-feedback';

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
  private readonly playerChip = requireElement('player-chip');
  private readonly bossChip = requireElement('boss-chip');
  private readonly bossDamage = requireElement('boss-damage');
  private readonly bossHud = requireElement('boss-name').closest<HTMLElement>('.hud-boss')!;
  private readonly playerChipBar = new ChipBar();
  private readonly bossChipBar = new ChipBar();
  private readonly meter = new DamageMeter();
  /** Istante dell'ultimo colpo al boss: la barra sussulta per un attimo. */
  private lastBossHit = -1;

  /** Barre e contatore da capo, a ogni nuova partita. */
  resetBars(): void {
    this.playerChipBar.reset();
    this.bossChipBar.reset();
    this.meter.clear();
    this.lastBossHit = -1;
  }

  /**
   * Ascolta gli eventi per il contatore dei danni: conta i colpi di questo client (in cooperativa `localPlayerId`) al
   * boss e ai servitori.
   */
  onEvent(event: GameEvent, localPlayerId?: string): void {
    if (event.type !== 'damage_dealt' || event.target === 'player') return;
    if (event.playerId === ENVIRONMENT_ID) return;
    if (localPlayerId !== undefined && event.playerId !== undefined && event.playerId !== localPlayerId) return;
    const now = performance.now() / 1000;
    this.meter.add(event.amount, now);
    if (event.target === 'boss') this.lastBossHit = now;
  }

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
    const now = performance.now() / 1000;
    this.setWidth(this.playerChip, this.playerChipBar.update(player.health.fraction, now) * 100);
    // Nelle stanze senza boss (o dopo la caduta del luogotenente) la barra del boss sparisce.
    const showBoss = boss !== null && !(boss.health.isDead && match.encounter !== null);
    this.bossHud.classList.toggle('no-boss', !showBoss);
    if (boss !== null) {
      this.setWidth(this.bossBar, boss.health.fraction * 100);
      this.setText(this.bossText, `${Math.ceil(boss.health.current)} / ${boss.health.max} · FASE ${boss.phase === 2 ? 'II' : 'I'}`);
      this.setWidth(this.bossChip, this.bossChipBar.update(boss.health.fraction, now) * 100);
      this.bossHud.classList.toggle('enraged', boss.isEnraged);
      // La tacca indica la soglia della furia finche' non e' superata.
      this.bossHud.style.setProperty('--phase-mark', `${boss.stats.phaseTwoThreshold * 100}%`);
    }
    const recent = this.meter.total(now);
    this.setText(this.bossDamage, recent > 0 ? `−${Math.round(recent)}` : '');
    this.bossHud.classList.toggle('struck', now - this.lastBossHit < 0.12);
    this.cooldownBars.forEach((bar, slot) => {
      this.setWidth(bar, player.skillBar.cooldownFraction(slot) * 100);
      const skill = player.skillBar.skillAt(slot);
      const item = bar.parentElement;
      if (skill?.charges && item) {
        let badge = item.querySelector<HTMLElement>('.skill-charges');
        if (!badge) { badge = document.createElement('span'); badge.className = 'skill-charges'; item.append(badge); }
        this.setText(badge, `${player.skillBar.availableCharges(slot)}/${skill.charges}`);
      }
    });
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
