/*
 * Immagini dei fogli di sprite, caricate una volta sola e condivise. Funziona anche aperto da file://: le immagini si
 * disegnano soltanto, non se ne leggono mai i pixel.
 */

const images = new Map<string, HTMLImageElement>();
const ready = new Map<string, Promise<HTMLImageElement>>();
const variants = new Map<string, HTMLCanvasElement>();

function load(url: string): HTMLImageElement {
  let image = images.get(url);
  if (image === undefined) {
    image = new Image();
    const loading = image;
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      loading.onload = () => resolve(loading);
      loading.onerror = () => reject(new Error(`immagine non caricata: ${url}`));
    });
    // Se l'immagine manca resta la grafica a matrici: l'errore non deve finire in console come rifiuto non gestito.
    promise.catch(() => undefined);
    ready.set(url, promise);
    image.src = url;
    images.set(url, image);
  }
  return image;
}

/** Comincia a caricare le immagini (all'avvio, cosi' il boss compare gia' con la sua grafica). */
export function preloadSheets(urls: readonly string[]): void {
  if (typeof Image === 'undefined') return;
  for (const url of urls) load(url);
}

/** L'immagine del foglio se e' pronta, altrimenti null (e intanto la carica). Senza DOM (test) sempre null. */
export function sheetImage(url: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  const image = load(url);
  return image.complete && image.naturalWidth > 0 ? image : null;
}

/** Si risolve quando il foglio e' caricato (per i disegni fatti una volta sola, come le vignette dei dungeon). */
export function whenSheetReady(url: string): Promise<HTMLImageElement> {
  if (typeof Image === 'undefined') return Promise.reject(new Error('nessun DOM'));
  load(url);
  return ready.get(url)!;
}

/** Varianti del foglio: sagoma bianca (lampo del colpo) e velo di brina (rallentato). */
export type SheetVariant = 'white' | 'frost';

const VARIANT_FILL: Readonly<Record<SheetVariant, { readonly color: string; readonly alpha: number }>> = {
  white: { color: '#fff8ec', alpha: 1 },
  frost: { color: '#9fe4ff', alpha: 0.45 },
};

/** Il foglio colorato una volta sola su un canvas: si disegna con le stesse coordinate dell'immagine. */
export function sheetVariant(url: string, image: HTMLImageElement, variant: SheetVariant): HTMLCanvasElement {
  return tinted(url, image, VARIANT_FILL[variant].color, VARIANT_FILL[variant].alpha);
}

/** La sagoma del foglio tutta di un colore (#rrggbb): per il bordo chiaro che stacca il boss dal pavimento. */
export function sheetSilhouette(url: string, image: HTMLImageElement, color: string): HTMLCanvasElement {
  return tinted(url, image, color.slice(0, 7), 1);
}

function tinted(url: string, image: HTMLImageElement, color: string, alpha: number): HTMLCanvasElement {
  const key = `${color}|${alpha}|${url}`;
  let canvas = variants.get(key);
  if (canvas === undefined) {
    canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    // 'source-atop' colora solo i pixel gia' disegnati: resta la sagoma, senza leggere l'immagine.
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    variants.set(key, canvas);
  }
  return canvas;
}
