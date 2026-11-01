/** Id stabili del vocabolario condiviso. Catalogo: non applica ancora questi debuff. */
export const ELEMENTS = ['fire', 'water', 'earth', 'wind'] as const;
export type Element = typeof ELEMENTS[number];
export const ELEMENT_LABELS: Readonly<Record<Element, string>> = {
  fire: 'Fuoco', water: 'Acqua', earth: 'Terra', wind: 'Vento',
};
export const STATUS_EFFECTS = {
  burning: { name: 'Bruciatura', element: 'fire', kind: 'damage_over_time' },
  soaked: { name: 'Inzuppato', element: 'water', kind: 'slow' },
  rooted: { name: 'Radicamento', element: 'earth', kind: 'immobilize' },
  exposed: { name: 'Esposizione', element: 'wind', kind: 'vulnerability' },
  bleeding: { name: 'Sanguinamento', element: null, kind: 'damage_over_time' },
  taunted: { name: 'Provocazione', element: null, kind: 'forced_target' },
} as const;
export type StatusEffectId = keyof typeof STATUS_EFFECTS;
export const STATUS_CHANCES = { mageBasic: 0.15, petBleeding: 0.2 } as const;
