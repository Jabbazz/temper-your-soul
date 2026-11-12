// Prepara i fogli dei personaggi giocabili in src/assets/characters/hero-pixellab-64/ a partire dall'esportazione
// a foglio di PixelLab. Nessuna dipendenza, nessuna generazione esterna: legge soltanto file già scaricati.
//
// Uso: node tools/arte/prepara-fogli-eroi.mjs <cartella>
//   <cartella> sta fuori dal repository e contiene warrior/, archer/, mage/: in ognuna il PNG del foglio e il JSON
//   di layout estratti dallo zip «spritesheet» del personaggio PixelLab.
// Copia i tre PNG e riscrive manifest.json: riga e fotogrammi di ogni clip e, fotogramma per fotogramma, la mano che
// impugna l'arma (riconosciuta dai pixel color pelle). Poi `npm run verify`.
import { copyFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const OUTPUT = fileURLToPath(new URL('../../src/assets/characters/hero-pixellab-64/', import.meta.url));
const HEROES = ['warrior', 'archer', 'mage'];
/** Cella del foglio e appoggio dei piedi nella cella, misurato sui fotogrammi. */
const CELL = 80, PIVOT = [40, 64];
/**
 * La mano dell'arma, come la muovono le mosse PixelLab: destra per il fendente, sinistra per l'arco (shoot_bow tende
 * il braccio sinistro) e per lo scettro (in cast avanza la mano sinistra).
 */
const WEAPON_HAND = { warrior: 'right', archer: 'left', mage: 'left' };
/**
 * Di fronte e di spalle, durante l'attacco: 'displaced' segue la mano che si allontana di più dal riposo (il fendente
 * incrocia il corpo), 'side' la mano del lato dell'arma. Di lato vale sempre 'displaced'.
 */
const FRONT_MODE = { warrior: 'displaced', archer: 'side', mage: 'side' };
/** Soglie in pixel, tarate sui tre fogli. */
const LIMITS = { restBelowRow: 42, feetFromRow: 56, faceAboveRow: 40, faceMinPixels: 16, minPixels: 3, movedMinPixels: 5, moved: 8, nearRest: 10, nearRestAttack: 8, sideReach: 13, sameStatic: 4 };

/** Decodifica un PNG RGBA a 8 bit non interlacciato (il formato dell'esportazione PixelLab). */
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
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4, data = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x];
      const left = x >= 4 ? data[y * stride + x - 4] : 0, up = y ? data[(y - 1) * stride + x] : 0, corner = x >= 4 && y ? data[(y - 1) * stride + x - 4] : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const a = Math.abs(up - corner), b = Math.abs(left - corner), c = Math.abs(left + up - 2 * corner);
        predicted = a <= b && a <= c ? left : b <= c ? up : corner;
      }
      data[y * stride + x] = (value + predicted) & 255;
    }
  }
  return { width, height, data };
}

/** Pelle: chiara, calda, con abbastanza blu da non confondersi con l'oro delle rifiniture. */
const isSkin = (r, g, b, a) => a > 0 && r > 150 && g > 95 && b >= 92 && r > g + 25 && g > b + 10;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Le macchie di pelle di un fotogramma: baricentro (x, y) e numero di pixel, dalla più grande. */
function skinBlobs(image, row, frame) {
  const skin = new Uint8Array(CELL * CELL), seen = new Uint8Array(CELL * CELL), blobs = [];
  for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
    const i = ((row * CELL + y) * image.width + frame * CELL + x) * 4;
    skin[y * CELL + x] = isSkin(image.data[i], image.data[i + 1], image.data[i + 2], image.data[i + 3]) ? 1 : 0;
  }
  for (let start = 0; start < CELL * CELL; start++) {
    if (!skin[start] || seen[start]) continue;
    const stack = [start]; seen[start] = 1;
    let n = 0, sumX = 0, sumY = 0;
    while (stack.length) {
      const at = stack.pop(), x = at % CELL, y = (at - x) / CELL;
      n++; sumX += x; sumY += y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= CELL || ny >= CELL) continue;
        const next = ny * CELL + nx;
        if (skin[next] && !seen[next]) { seen[next] = 1; stack.push(next); }
      }
    }
    blobs.push({ n, x: Math.round(sumX / n), y: Math.round(sumY / n) });
  }
  return blobs.filter((blob) => blob.n >= LIMITS.minPixels).sort((a, b) => b.n - a.n);
}

/** Toglie il viso (la macchia più grande in alto) e i piedi. */
function withoutFaceAndFeet(blobs) {
  const face = blobs.filter((blob) => blob.y <= LIMITS.faceAboveRow && blob.n >= LIMITS.faceMinPixels).sort((a, b) => b.n - a.n)[0];
  return blobs.filter((blob) => blob !== face && blob.y < LIMITS.feetFromRow);
}

/** La mano dell'arma su ogni fotogramma di ogni clip: { clip: { direzione: [[x, y], …] } }, in pixel nella cella. */
function weaponHands(kind, image, rows) {
  const rest = {}, statics = {}, result = {};
  for (const row of rows.filter((entry) => entry.animation === 'idle')) {
    const blobs = withoutFaceAndFeet(skinBlobs(image, row.row, 0)), hands = blobs.filter((blob) => blob.y > LIMITS.restBelowRow);
    statics[row.direction] = blobs.filter((blob) => !hands.includes(blob));
    let pick;
    if (row.direction === 'south' || row.direction === 'north') {
      // Di fronte la destra anatomica è a sinistra sullo schermo; di spalle è a destra.
      const byX = [...hands].sort((a, b) => a.x - b.x || b.n - a.n), first = byX[0], last = byX[byX.length - 1];
      const right = row.direction === 'south' ? first : last, left = row.direction === 'south' ? last : first;
      pick = WEAPON_HAND[kind] === 'right' ? right : left;
    } else pick = [...hands].sort((a, b) => b.n - a.n)[0];
    if (!pick) throw new Error(`${kind} ${row.direction}: nessuna mano a riposo riconosciuta`);
    rest[row.direction] = { pick, all: hands };
  }
  for (const row of rows) {
    const { pick, all } = rest[row.direction], last = row.frame_count - 1, attack = row.animation.startsWith('attack');
    const candidates = (frame) => withoutFaceAndFeet(skinBlobs(image, row.row, frame))
      .filter((blob) => !statics[row.direction].some((fixed) => distance(fixed, blob) <= LIMITS.sameStatic && blob.n <= fixed.n + 3));
    const nearRest = (frame, reach) => {
      const near = candidates(frame).map((blob) => ({ blob, far: distance(blob, pick) })).filter((entry) => entry.far <= reach).sort((a, b) => a.far - b.far)[0];
      return near ? { x: near.blob.x, y: near.blob.y } : { x: pick.x, y: pick.y };
    };
    const side = (row.direction === 'south' || row.direction === 'north') && FRONT_MODE[kind] === 'side';
    const found = [];
    for (let frame = 0; frame < row.frame_count; frame++) {
      if (!attack) { found.push(nearRest(frame, LIMITS.nearRest)); continue; }
      if (frame === last) { found.push(nearRest(frame, LIMITS.nearRestAttack)); continue; }
      if (side) { found.push(nearRest(frame, LIMITS.sideReach)); continue; }
      const moved = candidates(frame).filter((blob) => blob.n >= LIMITS.movedMinPixels)
        .map((blob) => ({ blob, far: Math.min(...all.map((hand) => distance(hand, blob))) }))
        .filter((entry) => entry.far > LIMITS.moved).sort((a, b) => b.far - a.far)[0];
      found.push(moved ? { x: moved.blob.x, y: moved.blob.y } : null);
    }
    if (attack) {
      // Mano nascosta dal corpo: riposo prima e dopo il gesto, via di mezzo fra i fotogrammi vicini durante il gesto.
      const keys = found.map((hand, frame) => (hand ? frame : -1)).filter((frame) => frame >= 0 && frame < last);
      const first = keys[0] ?? row.frame_count, end = keys[keys.length - 1] ?? -1;
      for (let frame = 0; frame < last; frame++) {
        if (found[frame]) continue;
        if (frame < first || frame > end) { found[frame] = nearRest(frame, LIMITS.nearRestAttack); continue; }
        const before = keys.filter((key) => key < frame).pop(), after = keys.find((key) => key > frame), t = (frame - before) / (after - before);
        found[frame] = { x: Math.round(found[before].x + (found[after].x - found[before].x) * t), y: Math.round(found[before].y + (found[after].y - found[before].y) * t) };
      }
    }
    (result[row.animation] ??= {})[row.direction] = found.map((hand) => [hand.x, hand.y]);
  }
  return result;
}

const source = process.argv[2];
if (!source) { console.error('Uso: node tools/arte/prepara-fogli-eroi.mjs <cartella con warrior/, archer/, mage/>'); process.exit(1); }
const manifest = {
  _generato: "File generato da tools/arte/prepara-fogli-eroi.mjs (righe e fotogrammi dal layout PixelLab, mano dell'arma misurata su ogni fotogramma): non modificare a mano.",
  cell: CELL, pivot: PIVOT, heroes: {},
};
for (const kind of HEROES) {
  const folder = `${source}/${kind}`, layoutFile = readdirSync(folder).find((name) => name.endsWith('.json'));
  if (!layoutFile) throw new Error(`${folder}: manca il JSON di layout del foglio`);
  const layout = JSON.parse(readFileSync(`${folder}/${layoutFile}`, 'utf8')), sheet = layout.spritesheet;
  if (sheet.cell_size.width !== CELL || sheet.cell_size.height !== CELL) throw new Error(`${kind}: cella ${sheet.cell_size.width}×${sheet.cell_size.height}, attesa ${CELL}×${CELL}`);
  const rows = sheet.rows.filter((row) => row.type === 'animation'), image = decodePng(`${folder}/${sheet.path}`);
  const hands = weaponHands(kind, image, rows), clips = {};
  for (const row of rows) (clips[row.animation] ??= {})[row.direction] = { row: row.row, frames: row.frame_count, hands: hands[row.animation][row.direction] };
  copyFileSync(`${folder}/${sheet.path}`, `${OUTPUT}${kind}.png`);
  manifest.heroes[kind] = { pixellabId: layout.character.id, sheet: [sheet.sheet_size.width, sheet.sheet_size.height], clips };
  console.log(`${kind}: ${Object.keys(clips).join(', ')} · foglio ${sheet.sheet_size.width}×${sheet.sheet_size.height}`);
}
// Le coppie [x, y] su una riga: il file resta leggibile nelle revisioni.
writeFileSync(`${OUTPUT}manifest.json`, JSON.stringify(manifest, null, 1).replace(/\[\s+(-?\d+),\s+(-?\d+)\s+\]/g, '[$1,$2]') + '\n');
console.log('manifest.json aggiornato: eseguire npm run verify.');
