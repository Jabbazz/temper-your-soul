import { WARRIOR_SKILLS } from './warrior/skills';
import { MAGE_CLASS_SKILLS } from './mage/skills';
import { ARCHER_SKILLS } from './archer/skills';

/** Registri leggeri: gli id delle famiglie e delle skill storiche restano stabili. */
export const CLASS_SKILLS = { ...WARRIOR_SKILLS, ...MAGE_CLASS_SKILLS, ...ARCHER_SKILLS };
