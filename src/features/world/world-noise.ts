/**
 * Casualità del mondo calcolata dalle coordinate: lo stesso seme dà lo stesso valore in qualunque ordine si generino
 * i blocchi, su server e client. Non usa uno stato, a differenza di `SeededRng`.
 */
export function hash01(seed: number, x: number, y: number, salt = 0): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul((seed ^ Math.imul(salt + 1, 0x9e3779b1)) | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Rumore continuo in [0, 1): valori casuali sui punti interi, raccordati in mezzo. */
export function valueNoise(seed: number, x: number, y: number, salt = 0): number {
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = smooth(x - x0), ty = smooth(y - y0);
  const top = hash01(seed, x0, y0, salt) * (1 - tx) + hash01(seed, x0 + 1, y0, salt) * tx;
  const bottom = hash01(seed, x0, y0 + 1, salt) * (1 - tx) + hash01(seed, x0 + 1, y0 + 1, salt) * tx;
  return top * (1 - ty) + bottom * ty;
}
