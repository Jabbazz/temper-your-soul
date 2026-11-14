// Prepara i fogli dei nemici del mondo aperto in src/assets/characters/enemies/ a partire dalle esportazioni PixelLab.
// Nessuna dipendenza, nessuna generazione esterna: legge soltanto file già scaricati.
//
// Uso: node tools/arte/prepara-nemici.mjs <cartella>
//   <cartella> sta fuori dal repository e contiene una sottocartella per nemico, chiamata con il suo id d'aspetto
//   (`MinionDefinition.visual`), con dentro lo zip «download» del personaggio PixelLab già estratto. Del personaggio si
//   usa solo la camminata verso sud (la prima animazione con la direzione `south`): il gioco la specchia per i lati.
// Scrive per ogni nemico una striscia PNG con i fotogrammi affiancati e rigenera
// src/features/presentation/minion-art/world-mob-sheets.ts (cella, fotogrammi, piedi, cima della figura). Poi `npm run verify`.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const ASSETS = fileURLToPath(new URL('../../src/assets/characters/enemies/', import.meta.url));
const DATA = fileURLToPath(new URL('../../src/features/presentation/minion-art/world-mob-sheets.ts', import.meta.url));
/** Un pixel conta come figura sopra questa opacità. */
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

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (buffer) => { let c = -1; for (const byte of buffer) c = CRC[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const length = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type, 'ascii'), data]), check = Buffer.alloc(4);
  length.writeUInt32BE(data.length); check.writeUInt32BE(crc(body));
  return Buffer.concat([length, body, check]);
}
/** Codifica un PNG RGBA a 8 bit, senza filtri. */
function encodePng(file, { width, height, pixels }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

/** I fotogrammi della camminata verso sud: la prima animazione che ha la direzione `south`. */
function southWalk(folder) {
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (!statSync(path).isDirectory()) continue;
      if (name === 'south' && dir.includes('animations')) return path;
      const found = walk(path);
      if (found) return found;
    }
    return null;
  };
  const south = walk(folder);
  if (!south) throw new Error(`${folder}: nessuna animazione verso sud`);
  return readdirSync(south).filter((file) => /^frame_\d+\.png$/.test(file)).sort().map((file) => decodePng(join(south, file)));
}

const source = process.argv[2];
if (!source) throw new Error('Uso: node tools/arte/prepara-nemici.mjs <cartella con le esportazioni PixelLab>');
mkdirSync(ASSETS, { recursive: true });
const sheets = readdirSync(source).filter((name) => statSync(join(source, name)).isDirectory()).sort().map((visual) => {
  const frames = southWalk(join(source, visual)), cell = frames[0].width;
  if (frames.some((frame) => frame.width !== cell || frame.height !== cell)) throw new Error(`${visual}: fotogrammi di misure diverse`);
  // Piedi: la riga più bassa con figura in qualunque fotogramma; centro e cima dalla figura di tutti i fotogrammi.
  let left = cell, right = -1, top = cell, bottom = -1;
  for (const frame of frames) for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
    if (frame.pixels[(y * cell + x) * 4 + 3] <= OPAQUE) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < 0) throw new Error(`${visual}: fotogrammi vuoti`);
  const strip = { width: cell * frames.length, height: cell, pixels: Buffer.alloc(cell * frames.length * cell * 4) };
  frames.forEach((frame, index) => {
    for (let y = 0; y < cell; y++) frame.pixels.copy(strip.pixels, (y * strip.width + index * cell) * 4, y * cell * 4, (y + 1) * cell * 4);
  });
  encodePng(join(ASSETS, `${visual}.png`), strip);
  return { visual, cell, frames: frames.length, feetX: Math.round((left + right + 1) / 2), feetY: bottom + 1, top };
});

const lines = [
  '// GENERATO da tools/arte/prepara-nemici.mjs dalle esportazioni PixelLab: non modificare a mano.',
  '// Per rigenerarlo: node tools/arte/prepara-nemici.mjs <cartella esterna con una sottocartella per nemico>.',
  '',
  '/**',
  ' * Il foglio della camminata di un nemico del mondo: fotogrammi quadrati di lato `cell` affiancati, visti di fronte.',
  ' * `feetX`/`feetY` sono il punto dei piedi nella cella, `top` la prima riga della figura.',
  ' */',
  'export interface MobSheet { readonly url: string; readonly cell: number; readonly frames: number; readonly feetX: number; readonly feetY: number; readonly top: number }',
  '',
  'export const WORLD_MOB_SHEETS: Readonly<Record<string, MobSheet>> = {',
  ...sheets.map((s) => `  ${s.visual}: { url: new URL('../../../assets/characters/enemies/${s.visual}.png', import.meta.url).href, cell: ${s.cell}, frames: ${s.frames}, feetX: ${s.feetX}, feetY: ${s.feetY}, top: ${s.top} },`),
  '};',
  '',
];
writeFileSync(DATA, lines.join('\n'), 'utf8');
console.log(`Scritti ${sheets.length} nemici in ${ASSETS}`);
