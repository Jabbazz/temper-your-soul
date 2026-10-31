import { Character } from './character';
import { deserializeCharacter, serializeCharacter } from './save-format';
import { CharacterRoster,deserializeRoster,serializeRoster } from './character-roster';

export { SAVE_VERSION } from './save-format';

/** Chiave sotto cui sta il salvataggio. Non cambiarla: i salvataggi esistenti andrebbero persi. */
export const SAVE_KEY = 'temper-your-soul:save';

/** Il sottoinsieme di `Storage` che serve al salvataggio (cosi' si puo' provare senza browser). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Archivio in memoria: per i test e come ripiego dove il browser non permette di salvare. */
export class MemoryStore implements KeyValueStore {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

/**
 * `window.localStorage` se esiste e funziona davvero (puo' mancare o lanciare eccezioni: modalita' privata, dati del sito
 * bloccati, quota piena, ambienti senza `window`), altrimenti `null`. L'unico punto del dominio che tocca il browser.
 */
export function browserStorage(): KeyValueStore | null {
  try {
    if (typeof window === 'undefined') return null;
    const storage = window.localStorage;
    const probe = `${SAVE_KEY}:probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/**
 * `fresh`: nessun salvataggio, si parte dal personaggio iniziale. `loaded`: salvataggio letto (anche riparato in parte).
 * `recovered`: salvataggio illeggibile; il testo originale e' stato copiato sotto `SAVE_KEY + ':corrupt'` e si riparte
 * dal personaggio iniziale. L'interfaccia puo' avvisare il giocatore.
 */
export type LoadStatus = 'fresh' | 'loaded' | 'recovered';

/** Chiave della copia di sicurezza di un salvataggio illeggibile. */
export const CORRUPT_BACKUP_KEY = `${SAVE_KEY}:corrupt`;
export const PRE_ROSTER_BACKUP_KEY=`${SAVE_KEY}:before-roster`;

/**
 * Legge e scrive il personaggio. Non lancia mai eccezioni. Con `store` null il gioco funziona in memoria:
 * `load()` da' sempre un personaggio iniziale e `save()` restituisce false.
 */
export class SaveStore {
  constructor(private readonly store: KeyValueStore | null) {}

  loadRoster():{roster:CharacterRoster;status:LoadStatus}{
    let text:string|null;try{text=this.store?.getItem(SAVE_KEY)??null;}catch{return {roster:new CharacterRoster(),status:'fresh'};}
    if(text===null)return {roster:new CharacterRoster(),status:'fresh'};
    const roster=deserializeRoster(text);if(roster)return {roster,status:'loaded'};
    this.backUpCorrupt(text);return {roster:new CharacterRoster(),status:'recovered'};
  }
  saveRoster(roster:CharacterRoster):boolean {
    if(!this.store)return false;
    try{
      const previous=this.store.getItem(SAVE_KEY);
      if(previous!==null && !this.store.getItem(PRE_ROSTER_BACKUP_KEY)){
        let single=false;
        try{const parsed:unknown=JSON.parse(previous);single=typeof parsed==='object'&&parsed!==null&&!('format' in parsed);}catch{/* Il testo illeggibile è già conservato da loadRoster in :corrupt. */}
        if(single)this.store.setItem(PRE_ROSTER_BACKUP_KEY,previous);
      }
      this.store.setItem(SAVE_KEY,serializeRoster(roster));return true;
    }catch{return false;}
  }

  load(): { character: Character; status: LoadStatus } {
    let text: string | null = null;
    try {
      text = this.store?.getItem(SAVE_KEY) ?? null;
    } catch {
      return { character: Character.createStarter(), status: 'fresh' };
    }
    if (text === null) return { character: Character.createStarter(), status: 'fresh' };
    const character = deserializeCharacter(text);
    if (character !== null) return { character, status: 'loaded' };
    this.backUpCorrupt(text);
    return { character: Character.createStarter(), status: 'recovered' };
  }

  /** Salva il personaggio; false se non e' stato possibile (nessun archivio, quota piena, accesso negato). */
  save(character: Character): boolean {
    if (this.store === null) return false;
    try {
      this.store.setItem(SAVE_KEY, serializeCharacter(character));
      return true;
    } catch {
      return false;
    }
  }

  /** Il testo illeggibile non si cancella in silenzio: se la copia fallisce, il salvataggio originale resta dov'e'. */
  private backUpCorrupt(text: string): void {
    try {
      this.store?.setItem(CORRUPT_BACKUP_KEY, text);
    } catch {
      // Nessuna copia possibile: load() non scrive su SAVE_KEY, quindi il testo originale resta finche' non si salva.
    }
  }
}
