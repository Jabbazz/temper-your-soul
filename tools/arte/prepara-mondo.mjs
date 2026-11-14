// Prepara la grafica del mondo aperto in src/assets/art/world/ a partire dai file scaricati da PixelLab.
// Nessuna dipendenza, nessuna generazione esterna: legge soltanto file già scaricati.
//
// Uso: node tools/arte/prepara-mondo.mjs <cartella>
//   <cartella> sta fuori dal repository e contiene, per ogni tileset di raccordo, `<inferiore>-<superiore>.png` (il
//   foglio) e `<inferiore>-<superiore>.json` (i metadati PixelLab), e per ogni ostacolo `obj-<tipo>.png`.
//   I nomi dei terreni e dei tipi sono gli id di src/features/world/.
// Copia i PNG e riscrive src/features/presentation/world/world-art-data.ts: per ogni tile il ritaglio nel foglio e lo
// schema 4×4 dei vertici (0 terreno inferiore, 1 superiore, 2 facciata della parete, 255 qualsiasi); per ogni ostacolo
// misure e appoggio del disegno. Poi `npm run verify`.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const ASSETS = fileURLToPath(new URL('../../src/assets/art/world/', import.meta.url));
const DATA = fileURLToPath(new URL('../../src/features/presentation/world/world-art-data.ts', import.meta.url));
/** Ordine dei tileset nel file generato: prima i raccordi piani, poi le pareti. */
const TILESETS = [
  'road-grass', 'water-grass', 'grass-moor', 'road-moor', 'water-moor',
  'moor-bog', 'road-bog', 'water-bog', 'bog-snow', 'road-snow', 'water-snow', 'ash-snow', 'road-ash', 'water-ash',
  'ash-abyss', 'road-abyss', 'lava-abyss', 'water-lava', 'water-abyss', 'lava-ash',
  'grass-wall', 'moor-wall', 'bog-wall', 'snow-wall', 'ash-wall', 'abyss-wall',
  // Varianti del suolo (solo aspetto): macchie di un secondo aspetto sul suolo pieno di ogni fascia.
  'grass-grass_lush', 'moor-moor_heather', 'bog-bog_puddle', 'snow-snow_ice', 'ash-ash_cinder', 'abyss-abyss_vein',
];
const OBJECTS = [
  'oak', 'bush', 'boulder', 'dead_tree', 'moor_rock', 'stump', 'thorn_bush', 'swamp_tree', 'reeds', 'charred_tree', 'ash_rock', 'snow_pine', 'snow_rock',
  'birch', 'fir', 'maple', 'berry_bush', 'mossy_rocks', 'crooked_tree', 'yew', 'thorn_tree', 'bone_pile',
  'willow', 'mangrove', 'rotten_trunk', 'giant_mushrooms', 'spruce', 'frozen_birch', 'iced_tree', 'ice_crystals', 'snowy_bush',
  'split_charred_tree', 'petrified_tree', 'ember_tree', 'obsidian_rocks', 'obsidian_spire', 'basalt_pillar', 'burning_tree', 'lava_vent', 'skull_pile',
  'fence', 'knight_statue', 'gravestone', 'grave_cross', 'angel_statue', 'flowers', 'tall_grass',
];
const STATE = { lower: 0, upper: 1, transition: 2 };
/** Un pixel conta come disegno sopra questa opacità. */
const OPAQUE = 40;

/** Decodifica un PNG RGBA a 8 bit non interlacciato (il formato dei file PixelLab). */
function decodePng(file) {
  const bytes = readFileSync(file), chunks = [];
  let offset = 8, width = 0, height = 0;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8), data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error(`${file}: atteso PNG RGBA a 8 bit non interlacciato`);
    }
    if (type === 'IDAT') chunks.push(data);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4, pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = y * (stride + 1) + 1, out = y * stride;
    for (let i = 0; i < stride; i++) {
      const left = i >= 4 ? pixels[out + i - 4] : 0, up = y > 0 ? pixels[out + i - stride] : 0, corner = i >= 4 && y > 0 ? pixels[out + i - stride - 4] : 0;
      let value = raw[line + i];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        const a = Math.abs(up - corner), b = Math.abs(left - corner), c = Math.abs(left + up - 2 * corner);
        value += a <= b && a <= c ? left : b <= c ? up : corner;
      }
      pixels[out + i] = value & 255;
    }
  }
  return { width, height, pixels };
}

const source = process.argv[2];
if (!source) throw new Error('Uso: node tools/arte/prepara-mondo.mjs <cartella con i file PixelLab>');
const present = new Set(readdirSync(source));
mkdirSync(ASSETS, { recursive: true });

const tilesets = TILESETS.map((name) => {
  for (const file of [`${name}.png`, `${name}.json`]) if (!present.has(file)) throw new Error(`Manca ${file} in ${source}`);
  const [lower, upper] = name.split('-'), meta = JSON.parse(readFileSync(join(source, `${name}.json`), 'utf8'));
  const size = meta.tile_size.width;
  const tiles = meta.tileset_data.tiles.map((tile) => {
    const p = tile.pattern_4x4, c = tile.corners, box = tile.bounding_box;
    if (box.width !== size || box.height !== size) throw new Error(`${name}: tile ${tile.name} non è ${size}×${size}`);
    // Gli angoli valgono sempre; lo schema aggiunge, per le pareti, i vertici attorno che distinguono i tile gemelli.
    const pattern = [...p.row_0, ...p.row_1, ...p.row_2, ...p.row_3];
    pattern[5] = STATE[c.NW]; pattern[6] = STATE[c.NE]; pattern[9] = STATE[c.SW]; pattern[10] = STATE[c.SE];
    return { x: box.x, y: box.y, pattern };
  });
  copyFileSync(join(source, `${name}.png`), join(ASSETS, `${name}.png`));
  return { name, lower, upper, size, tiles };
});

const objects = OBJECTS.map((kind) => {
  const file = `obj-${kind}.png`;
  if (!present.has(file)) throw new Error(`Manca ${file} in ${source}`);
  const { width, height, pixels } = decodePng(join(source, file));
  let left = width, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (pixels[(y * width + x) * 4 + 3] <= OPAQUE) continue;
    left = Math.min(left, x); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < 0) throw new Error(`${file}: immagine vuota`);
  copyFileSync(join(source, file), join(ASSETS, `${kind}.png`));
  return { kind, width, height, anchorX: Math.round((left + right) / 2), bottom: bottom + 1, spread: right - left + 1 };
});

const url = (file) => `new URL('../../../assets/art/world/${file}', import.meta.url).href`;
const lines = [
  '// GENERATO da tools/arte/prepara-mondo.mjs dai file PixelLab: non modificare a mano.',
  '// Per rigenerarlo: node tools/arte/prepara-mondo.mjs <cartella esterna con i file scaricati>.',
  '',
  '/** Un tile nel foglio: ritaglio e schema 4×4 dei vertici (0 inferiore, 1 superiore, 2 facciata, 255 qualsiasi). */',
  'export interface WorldTileArt { readonly x: number; readonly y: number; readonly pattern: readonly number[] }',
  '/** Un tileset di raccordo fra due terreni (id di `WORLD_TERRAINS`). */',
  'export interface WorldTilesetArt { readonly lower: string; readonly upper: string; readonly size: number; readonly url: string; readonly tiles: readonly WorldTileArt[] }',
  '/** Il disegno di un ostacolo: `anchorX` e `bottom` sono il centro e il bordo inferiore dei pixel disegnati, `spread` la loro larghezza. */',
  'export interface WorldObjectArt { readonly url: string; readonly width: number; readonly height: number; readonly anchorX: number; readonly bottom: number; readonly spread: number }',
  '',
  'export const WORLD_TILESET_ART: readonly WorldTilesetArt[] = [',
  ...tilesets.map((set) => [
    `  { lower: '${set.lower}', upper: '${set.upper}', size: ${set.size}, url: ${url(`${set.name}.png`)}, tiles: [`,
    ...set.tiles.map((tile) => `    { x: ${tile.x}, y: ${tile.y}, pattern: [${tile.pattern.join(', ')}] },`),
    '  ] },',
  ].join('\n')),
  '];',
  '',
  'export const WORLD_OBJECT_ART: Readonly<Record<string, WorldObjectArt>> = {',
  ...objects.map((o) => `  ${o.kind}: { url: ${url(`${o.kind}.png`)}, width: ${o.width}, height: ${o.height}, anchorX: ${o.anchorX}, bottom: ${o.bottom}, spread: ${o.spread} },`),
  '};',
  '',
];
mkdirSync(fileURLToPath(new URL('.', new URL(`file:///${DATA.replace(/\\/g, '/')}`))), { recursive: true });
writeFileSync(DATA, lines.join('\n'), 'utf8');
console.log(`Scritti ${tilesets.length} tileset e ${objects.length} ostacoli in ${ASSETS}`);
