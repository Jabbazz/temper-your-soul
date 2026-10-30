/** Trova un elemento per id e, se manca, fallisce subito con un messaggio chiaro invece di rompersi piu' avanti. */
export function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Elemento #${id} non trovato in index.html`);
  return element as T;
}
