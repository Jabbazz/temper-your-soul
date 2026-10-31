export const CHARACTER_CLASSES = ['warrior','archer','mage'] as const;
export type CharacterClass = typeof CHARACTER_CLASSES[number];
export const CLASS_LABELS: Readonly<Record<CharacterClass,string>> = {warrior:'Guerriero',archer:'Arciere',mage:'Mago'};
export function isCharacterClass(value: unknown): value is CharacterClass {
  return typeof value==='string' && (CHARACTER_CLASSES as readonly string[]).includes(value);
}
