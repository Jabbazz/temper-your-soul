import { Signal } from './signal';
import { Vec2 } from './vec2';

/** Azioni dell'Input Map. Il gioco legge solo azioni, mai tasti. */
export type Action =
  | 'move_up'
  | 'move_down'
  | 'move_left'
  | 'move_right'
  | 'skill_1'
  | 'skill_2'
  | 'skill_3'
  | 'skill_4'
  | 'pause'
  | 'restart'
  | 'toggle_audio'
  | 'toggle_performance'
  | 'toggle_fullscreen'
  | 'show_map'
  | 'toggle_minimap';

/** Le azioni delle skill, nell'ordine degli slot. */
export const SKILL_ACTIONS: readonly Action[] = ['skill_1', 'skill_2', 'skill_3', 'skill_4'];

/**
 * Tasti legati per posizione fisica (`KeyboardEvent.code`), indipendenti dal layout della tastiera.
 * Il pulsante sinistro del mouse e' `Mouse0`, il destro `Mouse2`.
 */
const BINDINGS: Record<string, Action> = {
  KeyW: 'move_up',
  KeyS: 'move_down',
  KeyA: 'move_left',
  KeyD: 'move_right',
  Mouse0: 'skill_1',
  Mouse2: 'skill_2',
  KeyQ: 'skill_3',
  KeyE: 'skill_4',
  Escape: 'pause',
  KeyR: 'restart',
  KeyM: 'toggle_audio',
  KeyF: 'toggle_fullscreen',
  F2: 'toggle_performance',
  /** Tenuto premuto: la mappa della discesa. */
  Tab: 'show_map',
  KeyN: 'toggle_minimap',
};

/** Vero se la pressione e' una scorciatoia del browser (Ctrl+R, Ctrl+F, Alt+...): il gioco la lascia al browser. */
export function isBrowserShortcut(event: { ctrlKey: boolean; metaKey: boolean; altKey: boolean }): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}

/**
 * Vero se il gioco deve impedire il comportamento del browser per il tasto `code`: i tasti legati sempre, lo Spazio
 * (che farebbe scorrere la pagina) solo se il focus non e' su un pulsante, altrimenti non lo attiverebbe. Il Tab
 * apre la mappa solo in partita (`inMatch`): nei menu resta al browser, che ci sposta il focus tra i pulsanti.
 */
export function blocksBrowserDefault(code: string, onButton: boolean, inMatch = false): boolean {
  if (code === 'Tab') return inMatch;
  if (code in BINDINGS) return true;
  return code === 'Space' && !onButton;
}

/** Vero se l'elemento e' (o sta dentro) un pulsante o un collegamento che lo Spazio o l'Invio attivano. */
function isButtonTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button, a[href], summary') !== null;
}

export class Input {
  /** Emesso a ogni nuova pressione di un'azione (non per la ripetizione automatica dei tasti). */
  readonly actionPressed = new Signal<[Action]>();
  /** Posizione del puntatore normalizzata sul canvas: (0, 0) angolo alto a sinistra, (1, 1) angolo basso a destra. */
  pointer: Vec2 = new Vec2(0.5, 0.43);
  /** Vero durante una partita: il Tab apre la mappa invece di spostare il focus (lo imposta il gioco). */
  inMatch = false;

  private held = new Set<string>();
  /** Azioni premute dall'ultima lettura: una pressione piu' breve di un passo di simulazione non va persa. */
  private latched = new Set<Action>();

  isActionPressed(action: Action): boolean {
    for (const [code, bound] of Object.entries(BINDINGS)) {
      if (bound === action && this.held.has(code)) return true;
    }
    return false;
  }

  /** Vero se l'azione e' tenuta premuta o e' stata premuta (anche brevemente) dall'ultimo `takeLatched`. */
  isActionActive(action: Action): boolean {
    return this.latched.has(action) || this.isActionPressed(action);
  }

  /** Svuota le pressioni brevi registrate: da chiamare dopo ogni passo di simulazione. */
  takeLatched(): void {
    this.latched.clear();
  }

  /** La lunghezza e' limitata a 1, quindi in diagonale la velocita' non aumenta. */
  getVector(negativeX: Action, positiveX: Action, negativeY: Action, positiveY: Action): Vec2 {
    const strength = (action: Action): number => (this.isActionPressed(action) ? 1 : 0);
    const vector = new Vec2(strength(positiveX) - strength(negativeX), strength(positiveY) - strength(negativeY));
    return vector.lengthSquared() > 1 ? vector.normalized() : vector;
  }

  /** Registra la pressione di `code` (tasto o `Mouse0`/`Mouse2`). Usato dagli ascoltatori DOM e dai test. */
  press(code: string, repeat = false): void {
    const wasHeld = this.held.has(code);
    this.held.add(code);
    const action = BINDINGS[code];
    if (action !== undefined && !wasHeld && !repeat) {
      this.latched.add(action);
      this.actionPressed.emit(action);
    }
  }

  release(code: string): void {
    this.held.delete(code);
  }

  releaseAll(): void {
    this.held.clear();
    this.latched.clear();
  }

  /** Collega gli eventi del browser. Restituisce la funzione che li scollega. */
  attach(canvas: HTMLElement): () => void {
    const syncButtons = (buttons: number): void => {
      if (buttons & 1) this.press('Mouse0');
      else this.release('Mouse0');
      if (buttons & 2) this.press('Mouse2');
      else this.release('Mouse2');
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isBrowserShortcut(event)) return;
      // I nomi e i controlli dei menu devono ricevere i propri tasti, anche WASD, F, M e Spazio.
      if(event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return;
      if (blocksBrowserDefault(event.code, isButtonTarget(event.target), this.inMatch)) event.preventDefault();
      this.press(event.code, event.repeat);
    };
    const onKeyUp = (event: KeyboardEvent): void => this.release(event.code);
    const onMouseMove = (event: MouseEvent): void => {
      this.updatePointer(canvas, event);
      syncButtons(event.buttons);
    };
    const onMouseDown = (event: MouseEvent): void => {
      event.preventDefault();
      canvas.focus();
      this.updatePointer(canvas, event);
      // `mousedown` scatta per ogni pulsante di un'accordo (sinistro + destro): non si perde nessuna pressione.
      if (event.button === 0) this.press('Mouse0');
      if (event.button === 2) this.press('Mouse2');
    };
    const onMouseUp = (event: MouseEvent): void => syncButtons(event.buttons);
    const onContextMenu = (event: Event): void => event.preventDefault();
    const onBlur = (): void => this.releaseAll();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }

  private updatePointer(canvas: HTMLElement, event: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.pointer = new Vec2((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  }
}
