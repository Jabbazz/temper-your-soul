import { describe, expect, it } from 'vitest';
import { Vec2 } from '../../core/vec2';
import { HubState } from '../character/hub-state';
import { PEER_HEADING_MIN_STEP, peerHeading } from './hub-heading';
import { heroDirectionFromAim } from './pixellab-hero';

describe('quattro direzioni nel rifugio', () => {
  it('il giocatore tiene la direzione del movimento, anche in diagonale e da fermo', () => {
    const state = new HubState();
    expect(heroDirectionFromAim(state.heading.x, state.heading.y)).toBe('east');
    // Sulle diagonali prevale il lato.
    const cases: Array<[Vec2, string]> = [
      [new Vec2(0, 1), 'south'], [new Vec2(1, 1), 'east'], [new Vec2(1, 0), 'east'], [new Vec2(1, -1), 'east'],
      [new Vec2(0, -1), 'north'], [new Vec2(-1, -1), 'west'], [new Vec2(-1, 0), 'west'], [new Vec2(-1, 1), 'west'],
    ];
    for (const [move, direction] of cases) {
      state.step(1 / 60, move);
      expect(heroDirectionFromAim(state.heading.x, state.heading.y), `${move.x},${move.y}`).toBe(direction);
    }
    state.step(1 / 60, Vec2.ZERO);
    expect(heroDirectionFromAim(state.heading.x, state.heading.y)).toBe('west');
  });

  it('un compagno prende la direzione dal suo spostamento e la conserva da fermo', () => {
    let track = peerHeading(undefined, { x: 100, y: 100, facing: -1 });
    expect(track.heading.x).toBeLessThan(0);
    track = peerHeading(track, { x: 100, y: 96, facing: -1 });
    expect(heroDirectionFromAim(track.heading.x, track.heading.y)).toBe('north');
    track = peerHeading(track, { x: 100 + PEER_HEADING_MIN_STEP / 2, y: 96, facing: 1 });
    expect(heroDirectionFromAim(track.heading.x, track.heading.y)).toBe('north');
    track = peerHeading(track, { x: 104, y: 100, facing: 1 });
    expect(heroDirectionFromAim(track.heading.x, track.heading.y)).toBe('east');
  });
});
