import { describe, expect, it } from 'vitest';
import { CRYPT_ARENA } from '../../dungeons/crypt';
import { DUNGEONS } from '../../dungeons/dungeons';
import { worldArena } from '../../world/world-arena';
import { WorldMap } from '../../world/world-map';
import { drawLight, LightMap } from '../lights';
import { ARENA_THEMES, arenaTheme } from '../themes';
import { worldTheme } from './world-theme';

describe('grafica del mondo: luce', () => {
  it('il mondo aperto è in piena luce, i dungeon tengono la loro', () => {
    expect(arenaTheme(worldArena(new WorldMap()))).toBe(worldTheme);
    expect(worldTheme.daylight).toBe(true);
    expect(arenaTheme(CRYPT_ARENA)).toBe(ARENA_THEMES.crypt);
    for (const dungeon of DUNGEONS) expect(arenaTheme(dungeon.arena).daylight ?? false, dungeon.id).toBe(false);
  });

  it('in piena luce le luci raccolte si scartano invece di finire sulla scena', () => {
    const map = new LightMap(), ctx = {} as CanvasRenderingContext2D;
    map.begin();
    drawLight(ctx, 100, 100, '#e8dcc8', 300, 0.85);
    expect([map.isCollecting, map.count]).toEqual([true, 1]);
    map.discard();
    expect([map.isCollecting, map.count]).toEqual([false, 0]);
    // Una raccolta successiva riparte pulita.
    map.begin();
    expect(map.count).toBe(0);
    map.discard();
  });
});
