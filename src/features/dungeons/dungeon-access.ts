import type { DungeonDefinition } from './dungeon-definition';
/** Soglie sul GS totale dei soli pezzi equipaggiati e compatibili con la classe. */
export const DUNGEON_GS_REQUIREMENTS:Readonly<Record<1|2|3|4,number>>={1:0,2:0,3:100,4:200};
export function minimumDungeonGearScore(dungeon:Pick<DungeonDefinition,'danger'>):number {return DUNGEON_GS_REQUIREMENTS[dungeon.danger];}
export function canEnterDungeon(dungeon:Pick<DungeonDefinition,'danger'>,gearScore:number):boolean {return gearScore>=minimumDungeonGearScore(dungeon);}
