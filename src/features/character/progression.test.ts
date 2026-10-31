import { describe, expect, it } from 'vitest';
import { levelProgress } from './progression';
import { Character } from './character';
import { deserializeCharacter, serializeCharacter } from './save-format';
import { ITEM_FAMILIES } from '../items/item-families';
import { SKILL_ICONS } from '../presentation/skill-icons';
import { createQuietMatch, holding, STEP } from '../../testing';
import { moveBody } from '../arena/arena';
import { CRYPT_ARENA } from '../dungeons/crypt';
import { Vec2 } from '../../core/vec2';

describe('progressione, mana e ostacoli', () => {
  it('gestisce soglie e piu livelli in una ricompensa', () => {
    expect(levelProgress(0)).toEqual({level:1,current:0,required:100});
    expect(levelProgress(99).level).toBe(1);
    expect(levelProgress(100)).toEqual({level:2,current:0,required:150});
    expect(levelProgress(270)).toEqual({level:3,current:20,required:200});
  });
  it('conserva XP e migra i salvataggi v1 senza perdere gli oggetti', () => {
    const c = Character.createStarter(); c.totalXp = 270;
    expect(deserializeCharacter(serializeCharacter(c))?.totalXp).toBe(270);
    const old = JSON.parse(serializeCharacter(c)); old.version = 1; delete old.totalXp;
    const migrated = deserializeCharacter(JSON.stringify(old))!;
    expect(migrated.totalXp).toBe(0);
    expect(migrated.inventory).toEqual(c.inventory);
  });
  it('non lancia senza mana e rigenera fino al massimo', () => {
    const m = createQuietMatch(); m.player.mana = 0;
    m.step(STEP, holding(m,[2]));
    expect(m.zones).toHaveLength(0);
    expect(m.player.skillBar.cooldownFraction(2)).toBe(0);
    m.player.tick(100);
    expect(m.player.mana).toBe(m.player.maxMana);
    m.step(STEP, holding(m,[2]));
    expect(m.player.mana).toBeLessThan(m.player.maxMana);
  });
  it('equipaggiamento leggendario migliora rigenerazione e potenza', () => {
    const c = Character.createStarter();
    const before = c.loadout()[0]!;
    c.inventory[0] = {...c.inventory[0]!,rarity:'legendary'};
    const after = c.loadout()[0]!;
    expect(after.manaRegeneration).toBeGreaterThan(0);
    if(before.effect.kind === 'projectile' && after.effect.kind === 'projectile')
      expect(after.effect.projectile.damage).toBe(before.effect.projectile.damage * 3);
  });
  it('ogni skill ha una icona pixel art valida, anche per nuove famiglie', () => {
    for(const family of ITEM_FAMILIES) {
      const icon = SKILL_ICONS[family.skill.id];
      expect(icon, family.id).toBeDefined();
      expect(icon!.pixels).toHaveLength(16);
      for(const row of icon!.pixels) expect(row.length).toBe(16);
    }
  });
  it('una carica molto veloce non oltrepassa un pilastro', () => {
    const arena = {...CRYPT_ARENA,pillars:[{position:new Vec2(1000,1000),radius:50}]};
    const p = moveBody(arena,new Vec2(500,1000),new Vec2(1500,1000),30,60);
    expect(p.x).toBeLessThanOrEqual(920);
    expect(p.distanceTo(arena.pillars[0]!.position)).toBeGreaterThanOrEqual(80);
  });
});
