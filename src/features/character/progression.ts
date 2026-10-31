/** Valori provvisori: XP cumulativi, curva crescente senza limite di livello. */
export const PROGRESSION = { base: 100, growth: 50, rewards: { crypt: 100, swamp: 180, forge: 280, glacier: 400 } };
export function levelProgress(total: number): { level: number; current: number; required: number } {
 const a = PROGRESSION.growth / 2;
 const b = PROGRESSION.base - a;
 const levels = Math.floor((Math.sqrt(b * b + 4 * a * total) - b) / (2 * a));
 const spent = a * levels * levels + b * levels;
 return { level: levels + 1, current: total - spent, required: PROGRESSION.base + PROGRESSION.growth * levels };
}
