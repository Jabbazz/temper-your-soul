import { describe,expect,it } from 'vitest';
import { DUNGEONS } from './dungeons';
import { canEnterDungeon,minimumDungeonGearScore } from './dungeon-access';

describe('accesso dungeon per GS',()=>{
  it('T1/T2 aperti, T3 da 100 e T4 da 200: soglie inclusive',()=>{
    for(const dungeon of DUNGEONS){
      const expected=dungeon.danger===3?100:dungeon.danger===4?200:0;
      expect(minimumDungeonGearScore(dungeon)).toBe(expected);
      expect(canEnterDungeon(dungeon,expected)).toBe(true);
      if(expected>0)expect(canEnterDungeon(dungeon,expected-1)).toBe(false);
    }
  });
});
