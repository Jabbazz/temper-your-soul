import { describe, expect, it } from 'vitest';
import { CHIP, ChipBar, DAMAGE_WINDOW, DamageMeter } from './health-feedback';

describe('scheggia delle barre di vita', () => {
  it('dopo un colpo resta ferma, poi scende fino alla vita attuale', () => {
    const chip = new ChipBar();
    expect(chip.update(1, 0)).toBe(1);
    expect(chip.update(0.6, 1)).toBe(1); // appena colpito: la scheggia mostra i 40 punti persi
    expect(chip.update(0.6, 1 + CHIP.hold - 0.01)).toBe(1);
    const draining = chip.update(0.6, 1 + CHIP.hold + 0.1);
    expect(draining).toBeLessThan(1);
    expect(draining).toBeGreaterThan(0.6);
    expect(chip.update(0.6, 5)).toBe(0.6);
  });

  it('un nuovo colpo durante l\'attesa la fa ripartire; se la vita sale la scheggia la segue subito', () => {
    const chip = new ChipBar();
    chip.update(1, 0);
    chip.update(0.8, 1);
    chip.update(0.7, 1.4);
    expect(chip.update(0.7, 1.4 + CHIP.hold - 0.01)).toBe(1);
    expect(chip.update(0.9, 3)).toBeGreaterThanOrEqual(0.9);
    chip.reset();
    expect(chip.update(1, 10)).toBe(1);
  });
});

describe('contatore dei danni recenti', () => {
  it('somma i colpi dentro la finestra e dimentica i vecchi', () => {
    const meter = new DamageMeter();
    meter.add(19, 0);
    meter.add(19, 0.2);
    meter.add(100, 0.4);
    expect(meter.total(0.5)).toBe(138);
    expect(meter.total(0.3 + DAMAGE_WINDOW)).toBe(100);
    expect(meter.total(1 + DAMAGE_WINDOW)).toBe(0);
    meter.add(5, 10);
    meter.clear();
    expect(meter.total(10)).toBe(0);
  });
});
