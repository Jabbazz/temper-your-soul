import type { BodyType } from '../character/appearance';

/** Posa dei ritratti: stato, fotogramma e slot che attacca. */
export interface CharacterMotion { readonly state: 'idle' | 'walk' | 'cast'; readonly frame: number; readonly attackSlot?: 'primary_hand' | 'secondary_hand' | 'armor' | 'boots' }
export interface HandAnchor { readonly x: number; readonly y: number; readonly rotation: number }
export interface BodyAnchors { readonly body: BodyType; readonly bob: number; readonly stride: number; readonly leftFoot: number; readonly rightFoot: number; readonly hand: number; readonly sway: number; readonly primary: HandAnchor; readonly secondary: HandAnchor }
export function bodyAnchors(motion: CharacterMotion, body: BodyType = 'male'): BodyAnchors {
  const f = motion.frame % 8;
  const walk = motion.state === 'walk';
  const bob=walk ? [0,0,-1,-1,0,0,-1,-1][f]! : motion.state === 'idle' && f >= 4 ? -1 : 0;
  const attack=motion.state==='cast' ? [0,.2,.55,1,.85,.5,.2,0][f]! : 0;
  const slot=motion.attackSlot ?? 'primary_hand';
  const primary=slot==='primary_hand'?attack:0,secondary=slot==='secondary_hand'?attack:0;
  return {
    body,
    bob,
    stride: walk ? [0,1,2,1,0,-1,-2,-1][f]! : 0,
    leftFoot: walk && f >= 1 && f <= 3 ? -1 : 0,
    rightFoot: walk && f >= 5 ? -1 : 0,
    hand: motion.state === 'cast' ? [0,-2,-4,-4,-3,-2,-1,0][f]! : 0,
    sway: walk ? [0,0,1,1,0,0,-1,-1][f]! : f >= 4 ? 1 : 0,
    primary:{x:(body==='female'?28.5:30)-primary,y:40+bob-7*primary,rotation:.3+.65*primary},
    secondary:{x:(body==='female'?12.5:11)-3*secondary,y:40+bob-7*secondary,rotation:.12-.65*secondary},
  };
}
