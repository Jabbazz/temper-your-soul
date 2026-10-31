/** Trova un elemento per id e, se manca, fallisce subito con un messaggio chiaro invece di rompersi piu' avanti. */
export function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Elemento #${id} non trovato in index.html`);
  return element as T;
}

/** Crea un elemento con classe e testo (sempre come testo: niente HTML da stringhe). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className !== '') element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Secondi in formato minuti:secondi (es. 83,4 -> "1:23"). */
export function formatSeconds(seconds: number): string {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}
