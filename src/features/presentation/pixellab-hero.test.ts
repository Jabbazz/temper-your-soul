import { describe, expect, it } from 'vitest';
import { CHARACTER_CLASSES } from '../character/character-class';
import manifest from '../../assets/characters/hero-pixellab-64/manifest.json';
import { HERO_CLIPS, HERO_DIRECTIONS, HERO_SHEET, HERO_WEAPON, heroClassOf, heroDirectionFromAim, heroHandAnchor, heroSheetFrame, heroWeaponPose, heroWeaponRestMirror } from './pixellab-hero';

describe('corpi PixelLab 64×64', () => {
  it('sceglie una delle quattro direzioni dalla mira sullo schermo', () => {
    expect(heroDirectionFromAim(10, 2)).toBe('east');
    expect(heroDirectionFromAim(-10, -3)).toBe('west');
    expect(heroDirectionFromAim(2, 10)).toBe('south');
    expect(heroDirectionFromAim(-2, -10)).toBe('north');
    // Sulle diagonali esatte prevale il lato, così il verso non sfarfalla fra due viste.
    expect(heroDirectionFromAim(5, 5)).toBe('east');
    expect(heroDirectionFromAim(-5, -5)).toBe('west');
  });

  it('ogni classe ha riposo, camminata e attacco nelle quattro direzioni', () => {
    for (const kind of CHARACTER_CLASSES) for (const clip of HERO_CLIPS) for (const direction of HERO_DIRECTIONS) {
      const entry = manifest.heroes[kind].clips[clip][direction];
      expect(entry.frames, `${kind} ${clip} ${direction}`).toBeGreaterThanOrEqual(6);
      expect(entry.row).toBeGreaterThan(0);
    }
  });

  it('il ritaglio resta nella riga del clip e avvolge la fase', () => {
    for (const kind of CHARACTER_CLASSES) for (const clip of HERO_CLIPS) for (const direction of HERO_DIRECTIONS) {
      const { row, frames } = manifest.heroes[kind].clips[clip][direction];
      for (const phase of [0, 0.49, 0.999, 1, 1.5, -0.25]) {
        const frame = heroSheetFrame(kind, clip, direction, phase);
        expect(frame.sy).toBe(row * HERO_SHEET.cell);
        expect(frame.sx % HERO_SHEET.cell).toBe(0);
        expect(frame.sx / HERO_SHEET.cell).toBeLessThan(frames);
        expect(frame.sx).toBeGreaterThanOrEqual(0);
      }
      expect(heroSheetFrame(kind, clip, direction, 0).sx).toBe(0);
      expect(heroSheetFrame(kind, clip, direction, 1).sx).toBe(0);
      expect(heroSheetFrame(kind, clip, direction, 0.999).sx).toBe((frames - 1) * HERO_SHEET.cell);
    }
  });

  it('la classe del personaggio decide il corpo', () => {
    expect(heroClassOf({ characterClass: 'mage', body: 'male', equipment: {} })).toBe('mage');
    expect(heroClassOf({ body: 'female', equipment: {} })).toBe('warrior');
  });

  it('l’arma segue la mira a 360°: punta in avanti a riposo, il fendente attraversa la mira, l’arco si tende a metà colpo', () => {
    for (const aim of [0, 1, Math.PI / 2, Math.PI, -2.5]) {
      // I disegni delle armi puntano in alto: un quarto di giro li porta sulla mira. L'arco guarda già a destra.
      expect(heroWeaponPose('staff', aim, null).rotation).toBeCloseTo(aim + Math.PI / 2);
      expect(heroWeaponPose('sword', aim, null).rotation).toBeCloseTo(aim + Math.PI / 2);
      expect(heroWeaponPose('bow', aim, null).rotation).toBeCloseTo(aim);
      expect(heroWeaponPose('sword', aim, 0.5).rotation).toBeCloseTo(aim + Math.PI / 2);
      expect(heroWeaponPose('sword', aim, 1).rotation - heroWeaponPose('sword', aim, 0).rotation).toBeCloseTo(HERO_WEAPON.slashArc * 2);
    }
    expect(heroWeaponPose('staff', 1, 0.5).rotation).toBeCloseTo(1 + Math.PI / 2);
    expect(heroWeaponPose('bow', 0, null).pulled).toBe(false);
    expect(heroWeaponPose('bow', 0, 0.4).pulled).toBe(true);
    expect(heroWeaponPose('bow', 0, 0.9).pulled).toBe(false);
  });

  it('ogni fotogramma ha la mano dell’arma, dentro la cella e sul corpo', () => {
    for (const kind of CHARACTER_CLASSES) for (const clip of HERO_CLIPS) for (const direction of HERO_DIRECTIONS) {
      const { frames, hands } = manifest.heroes[kind].clips[clip][direction];
      expect(hands.length, `${kind} ${clip} ${direction}`).toBe(frames);
      for (let frame = 0; frame < frames; frame++) {
        const hand = heroHandAnchor(kind, clip, direction, (frame + 0.5) / frames);
        expect(hand.x, `${kind} ${clip} ${direction} ${frame}`).toBe(hands[frame]![0]! - HERO_SHEET.feetX);
        expect(Math.abs(hand.x)).toBeLessThanOrEqual(24);
        // Fra la testa e le ginocchia: mai ai piedi, mai sopra la figura.
        expect(hand.y).toBeLessThanOrEqual(-8);
        expect(hand.y).toBeGreaterThanOrEqual(-52);
      }
    }
  });

  it('a riposo la mano dell’arma sta sul fianco giusto: destra per il Guerriero, sinistra per Arciere e Mago', () => {
    // Di fronte la destra anatomica è a sinistra sullo schermo; di spalle è a destra.
    expect(heroHandAnchor('warrior', 'idle', 'south', 0).x).toBeLessThan(0);
    expect(heroHandAnchor('warrior', 'idle', 'north', 0).x).toBeGreaterThan(0);
    for (const kind of ['archer', 'mage'] as const) {
      expect(heroHandAnchor(kind, 'idle', 'south', 0).x).toBeGreaterThan(0);
      expect(heroHandAnchor(kind, 'idle', 'north', 0).x).toBeLessThan(0);
    }
  });

  it('a riposo l’arma non ruota: si specchia soltanto, verso il lato della mano', () => {
    expect(heroWeaponRestMirror('east', -1)).toBe(1);
    expect(heroWeaponRestMirror('west', 1)).toBe(-1);
    for (const kind of CHARACTER_CLASSES) for (const direction of ['south', 'north'] as const) {
      const hand = heroHandAnchor(kind, 'idle', direction, 0);
      expect(heroWeaponRestMirror(direction, hand.x)).toBe(hand.x < 0 ? -1 : 1);
    }
  });
});
