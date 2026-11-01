import { describe, expect, it } from 'vitest';
import { Camera } from './camera';
import { blocksBrowserDefault, Input, isBrowserShortcut, SKILL_ACTIONS, type Action } from './input';
import { SeededRng } from './rng';
import { Signal } from './signal';
import { clamp, TAU, Vec2 } from './vec2';

describe('Vec2', () => {
  it('le operazioni non modificano i vettori originali', () => {
    const a = new Vec2(1, 2);
    const b = a.add(new Vec2(3, 4)).mul(2);
    expect(b).toEqual(new Vec2(8, 12));
    expect(a).toEqual(new Vec2(1, 2));
  });

  it('angle, angleTo e fromAngle sono coerenti (y verso il basso)', () => {
    expect(new Vec2(0, 1).angle()).toBeCloseTo(Math.PI / 2, 10);
    expect(new Vec2(0, 0).angleTo(new Vec2(-5, 0))).toBeCloseTo(Math.PI, 10);
    const v = Vec2.fromAngle(1.2, 50);
    expect(v.length()).toBeCloseTo(50, 10);
    expect(v.angle()).toBeCloseTo(1.2, 10);
    expect(TAU).toBeCloseTo(2 * Math.PI, 12);
  });

  it('il vettore nullo normalizzato resta nullo e l\'angolo da un punto a se stesso e\' 0', () => {
    expect(Vec2.ZERO.normalized()).toEqual(Vec2.ZERO);
    expect(new Vec2(3, 4).angleTo(new Vec2(3, 4))).toBe(0);
  });

  it('lerp e distanceTo', () => {
    expect(new Vec2(0, 0).lerp(new Vec2(10, 20), 0.25)).toEqual(new Vec2(2.5, 5));
    expect(new Vec2(0, 0).distanceTo(new Vec2(3, 4))).toBe(5);
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
});

describe('SeededRng', () => {
  it('a parita\' di seme produce la stessa sequenza', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('semi diversi producono sequenze diverse e i valori stanno in [0, 1)', () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    const first = Array.from({ length: 10 }, () => a.next());
    const second = Array.from({ length: 10 }, () => b.next());
    expect(first).not.toEqual(second);
    for (const value of [...first, ...second]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('Signal', () => {
  it('emette ai collegati e il collegamento si annulla', () => {
    const signal = new Signal<[number]>();
    const received: number[] = [];
    const disconnect = signal.connect((value) => received.push(value));
    signal.emit(1);
    disconnect();
    signal.emit(2);
    expect(received).toEqual([1]);
  });
});

describe('Input', () => {
  it('lega i tasti per posizione fisica alle azioni', () => {
    const input = new Input();
    input.press('KeyW');
    expect(input.isActionPressed('move_up')).toBe(true);
    expect(input.isActionPressed('move_down')).toBe(false);
    input.release('KeyW');
    expect(input.isActionPressed('move_up')).toBe(false);
  });

  it('mouse sinistro e destro sono le skill 1 e 2; Q ed E le skill 3 e 4', () => {
    const input = new Input();
    const pairs: Array<[string, Action]> = [
      ['Mouse0', 'skill_1'],
      ['Mouse2', 'skill_2'],
      ['KeyQ', 'skill_3'],
      ['KeyE', 'skill_4'],
    ];
    expect(SKILL_ACTIONS).toEqual(pairs.map(([, action]) => action));
    for (const [code, action] of pairs) {
      input.press(code);
      expect(input.isActionPressed(action)).toBe(true);
      input.release(code);
    }
  });

  it('in diagonale la velocita\' non aumenta e tasti opposti si annullano', () => {
    const input = new Input();
    input.press('KeyD');
    input.press('KeyS');
    const diagonal = input.getVector('move_left', 'move_right', 'move_up', 'move_down');
    expect(diagonal.length()).toBeCloseTo(1, 10);
    input.releaseAll();
    input.press('KeyA');
    input.press('KeyD');
    expect(input.getVector('move_left', 'move_right', 'move_up', 'move_down')).toEqual(Vec2.ZERO);
  });

  it('una pressione piu\' breve di un passo non va persa (latch) finche\' non viene letta', () => {
    const input = new Input();
    input.press('KeyQ');
    input.release('KeyQ');
    expect(input.isActionPressed('skill_3')).toBe(false);
    expect(input.isActionActive('skill_3')).toBe(true);
    input.takeLatched();
    expect(input.isActionActive('skill_3')).toBe(false);
  });

  it('actionPressed scatta una sola volta per pressione, non per la ripetizione automatica', () => {
    const input = new Input();
    const pressed: Action[] = [];
    input.actionPressed.connect((action) => pressed.push(action));
    input.press('KeyR');
    input.press('KeyR', true);
    input.press('KeyR');
    input.release('KeyR');
    input.press('KeyR');
    expect(pressed).toEqual(['restart', 'restart']);
  });

  it('Ctrl, Meta o Alt marcano una scorciatoia del browser (Ctrl+R, Ctrl+F) che il gioco non deve intercettare', () => {
    const none = { ctrlKey: false, metaKey: false, altKey: false };
    expect(isBrowserShortcut(none)).toBe(false);
    expect(isBrowserShortcut({ ...none, ctrlKey: true })).toBe(true);
    expect(isBrowserShortcut({ ...none, metaKey: true })).toBe(true);
    expect(isBrowserShortcut({ ...none, altKey: true })).toBe(true);
  });

  it('lo Spazio e\' bloccato solo fuori dai pulsanti (sui pulsanti li attiva); i tasti legati sempre', () => {
    expect(blocksBrowserDefault('Space', false)).toBe(true);
    expect(blocksBrowserDefault('Space', true)).toBe(false);
    expect(blocksBrowserDefault('KeyW', true)).toBe(true);
    expect(blocksBrowserDefault('Escape', false)).toBe(true);
    expect(blocksBrowserDefault('Enter', false)).toBe(false);
    expect(blocksBrowserDefault('Tab', false)).toBe(false);
    // In partita il Tab tiene aperta la mappa della discesa.
    expect(blocksBrowserDefault('Tab', false, true)).toBe(true);
    expect(blocksBrowserDefault('Tab', true, true)).toBe(true);
  });

  it('releaseAll azzera tasti tenuti e pressioni registrate', () => {
    const input = new Input();
    input.press('KeyW');
    input.press('Mouse0');
    input.releaseAll();
    expect(input.isActionActive('move_up')).toBe(false);
    expect(input.isActionActive('skill_1')).toBe(false);
  });
});

describe('Camera', () => {
  it('si centra sul bersaglio e converte il puntatore normalizzato in coordinate del mondo', () => {
    const camera = new Camera();
    camera.setViewSize(800, 400);
    camera.follow(new Vec2(1000, 500));
    expect(camera.position).toEqual(new Vec2(600, 300));
    expect(camera.pointerToWorld(new Vec2(0.5, 0.5))).toEqual(new Vec2(1000, 500));
    expect(camera.pointerToWorld(new Vec2(0, 0))).toEqual(new Vec2(600, 300));
    expect(camera.pointerToWorld(new Vec2(1, 1))).toEqual(new Vec2(1400, 700));
  });

  it('pointerOffset e\' lo scostamento dal centro della vista in unita\' di mondo', () => {
    const camera = new Camera();
    camera.setViewSize(800, 400);
    expect(camera.pointerOffset(new Vec2(0.5, 0.5))).toEqual(Vec2.ZERO);
    expect(camera.pointerOffset(new Vec2(1, 0))).toEqual(new Vec2(400, -200));
    // Con la camera centrata sul giocatore, posizione + offset coincide con la conversione in coordinate del mondo.
    camera.follow(new Vec2(1000, 500));
    expect(new Vec2(1000, 500).add(camera.pointerOffset(new Vec2(0.25, 0.75)))).toEqual(camera.pointerToWorld(new Vec2(0.25, 0.75)));
  });

  it('isVisible rispetta il margine', () => {
    const camera = new Camera();
    camera.setViewSize(100, 100);
    camera.follow(new Vec2(50, 50));
    expect(camera.isVisible(new Vec2(50, 50))).toBe(true);
    expect(camera.isVisible(new Vec2(150, 50))).toBe(false);
    expect(camera.isVisible(new Vec2(150, 50), 60)).toBe(true);
  });

  it('una vista di dimensione nulla viene portata ad almeno 1', () => {
    const camera = new Camera();
    camera.setViewSize(0, 0);
    expect(camera.width).toBe(1);
    expect(camera.height).toBe(1);
  });
});
