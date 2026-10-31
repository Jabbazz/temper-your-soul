import type { BodyType } from '../character/appearance';
import { PixelPainter } from './pixel-painter';

export interface CharacterMotion { readonly state: 'idle' | 'walk' | 'cast'; readonly frame: number; readonly attackSlot?: 'primary_hand' | 'secondary_hand' | 'armor' | 'boots' }
export interface HandAnchor { readonly x: number; readonly y: number; readonly rotation: number }
export interface BodyAnchors { readonly body: BodyType; readonly bob: number; readonly stride: number; readonly leftFoot: number; readonly rightFoot: number; readonly hand: number; readonly sway: number; readonly primary: HandAnchor; readonly secondary: HandAnchor }
/** Larghezza della versione femminile: viso, collo, spalle, vita, bacino e gambe hanno proporzioni proprie. */
export function bodyWidth(body: BodyType, y: number): number {
  if(body==='male') return 1;
  if(y<20) return .88;
  if(y<23) return .72;
  if(y<29) return .8;
  if(y<36) return .7;
  if(y<43) return .84;
  return .8;
}
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

/** Braccio, polso e dita condividono un punto di presa: nessuna mano aggiunta al disegno dell'oggetto. */
export function drawArms(p: PixelPainter,a: BodyAnchors): void {
  const female=a.body==='female',radius=female?1:2;
  for(const [shoulder,elbow,hand] of [[female?14:12,female?12:10,a.secondary],[female?26.5:28,female?28.5:30,a.primary]] as const) {
    const midY=(26+a.bob+hand.y)/2;
    p.poly([[shoulder-radius,24+a.bob],[shoulder+radius,24+a.bob],[elbow+radius,midY],[hand.x+radius,hand.y],[hand.x-radius,hand.y],[elbow-radius,midY]],'#241d27');
    p.line(shoulder,26+a.bob,elbow,Math.round(midY),'#d9a479');
    p.line(elbow,Math.round(midY),Math.round(hand.x),Math.round(hand.y-2),'#d9a479');
    p.line(elbow-1,Math.round(midY),Math.round(hand.x-1),Math.round(hand.y-3),'#f3c89a');
    p.rect(hand.x-radius,hand.y-3,radius*2,3,'#574032');
  }
}
export function drawHands(p: PixelPainter,a: BodyAnchors): void {
  for(const hand of [a.primary,a.secondary]) {
    p.rect(hand.x-1,hand.y-1,a.body==='female'?2:3,3,'#d9a479');p.rect(hand.x-1,hand.y-1,2,1,'#f3c89a');
  }
}

/** Base A: proporzioni compatte, viso a tre quarti, lino, cuoio e capelli in ciocche. */
export function drawAdventurer(p: PixelPainter, body: BodyType, a: BodyAnchors): void {
  const o = '#241d27', shadow = '#a36c52', skin = '#d9a479', light = '#f3c89a';
  const female = body === 'female', b = a.bob;
  // Gambe e piedi indipendenti, per alternare appoggio e passo.
  for (const [x, lift, stride] of [[14,a.leftFoot,a.stride],[23,a.rightFoot,-a.stride]]) {
    p.poly([[x!,36],[x!+5,36],[x!+5+stride!,47+lift!],[x!+3+stride!,52+lift!],[x!-1+stride!,51+lift!]],o);
    p.poly([[x!+1,38],[x!+4,38],[x!+3+stride!,48+lift!],[x!+stride!,48+lift!]],'#514b47');
    p.line(x!+1,39,x!+1+stride!,46+lift!,'#777060');
    p.rect(x!+stride!-1,48+lift!,6,5,'#49352e');p.rect(x!+stride!,49+lift!,4,1,'#927052');
    p.rect(x!+stride!-2,53+lift!,8,1,o);p.rect(x!+stride!-1,52+lift!,6,1,'#6c5040');
  }
  // Collo, braccia e tunica senza classe obbligatoria.
  p.rect(18,19+b,7,5,shadow);p.rect(19,20+b,4,3,skin);
  p.poly([[15,21+b],[18,23+b],[24,23+b],[27,22+b],[28,29+b],[26,33+b],[28,39+b],[23,41+b],[18,39+b],[13,40+b],[14,31+b],[13,26+b]],o);
  p.poly([[15,23+b],[18,25+b],[24,25+b],[26,24+b],[26,31+b],[25,34+b],[26,38+b],[21,39+b],[15,38+b],[16,32+b]],'#b8a080');
  p.poly([[16,25+b],[18,26+b],[18,32+b],[17,36+b],[15,37+b]],'#e0c8a2');
  p.poly([[24,27+b],[25,27+b],[24,34+b],[25,37+b],[22,36+b]],'#8a755f');
  p.line(20,25+b,20,31+b,'#554338');p.line(22,25+b,21,31+b,'#705744');
  for(let y=26;y<31;y+=2) p.line(20,y+b,22,y+1+b,'#e7d6ae');
  p.rect(14,34+b,13,3,'#4d352c');p.rect(15,34+b,11,1,'#986d46');p.rect(20,34+b,3,3,'#d4a562');p.rect(21,35+b,1,1,'#59402f');
  p.rect(14,36+b,3,4,'#80593d');p.rect(14,36+b,3,1,'#b98958');
  // Viso e orecchie, testa compatta modellata in faccette.
  p.poly([[16,6+b],[23,5+b],[27,9+b],[27,16+b],[24,21+b],[19,21+b],[15,17+b],[14,10+b]],o);
  p.poly([[16,9+b],[24,8+b],[26,11+b],[25,18+b],[23,20+b],[19,19+b],[16,16+b]],skin);
  p.poly([[17,10+b],[22,9+b],[23,12+b],[22,15+b],[18,15+b]],light);
  p.rect(15,13+b,2,4,shadow);p.rect(16,14+b,1,2,light);p.rect(24,12+b,2,2,shadow);
  p.line(18,12+b,20,12+b,'#614436');p.line(23,12+b,25,12+b,'#614436');
  p.rect(19,13+b,2,1,o);p.rect(24,13+b,1,1,o);p.rect(22,14+b,1,2,shadow);
  p.rect(21,18+b,3,1,'#9a5d48');p.rect(20,19+b,3,1,'#e7b48a');
  if(female) {
    // Mento e zigomi meno squadrati, occhi e sopracciglia diversi: non solo capelli aggiunti.
    p.poly([[16,11+b],[20,9+b],[25,10+b],[25,16+b],[22,20+b],[20,19+b],[17,16+b]],skin);
    p.poly([[18,11+b],[21,10+b],[22,12+b],[21,15+b],[18,14+b]],light);
    p.line(18,12+b,20,12+b,'#835142');p.line(23,12+b,24,12+b,'#835142');
    p.rect(19,13+b,2,1,'#4b3935');p.rect(24,13+b,1,1,'#4b3935');
    p.rect(18,13+b,1,1,'#6a4036');p.rect(22,15+b,1,1,shadow);
    p.rect(21,17+b,2,1,'#ad695e');p.rect(21,19+b,1,1,light);
  }
  const hair = female ? '#7c3e30' : '#64432d', hairLight = female ? '#c47543' : '#a97a45';
  p.poly([[14,12+b],[13,7+b],[16,4+b],[15,2+b],[20,4+b],[23,2+b],[24,5+b],[28,5+b],[26,9+b],[23,10+b],[21,7+b],[18,10+b],[16,9+b],[16,13+b]],o);
  p.poly([[15,8+b],[17,5+b],[21,5+b],[23,4+b],[24,6+b],[26,6+b],[24,8+b],[22,8+b],[20,6+b],[17,9+b],[15,11+b]],hair);
  p.line(17,6+b,20,5+b,hairLight);p.line(22,6+b,24,7+b,hairLight);p.rect(15,8+b,1,2,hairLight);
  if(female) {
    p.poly([[14,7+b],[11,6+b],[9,9+b],[10,14+b],[8,20+b],[11,23+b],[14,18+b],[13,12+b]],o);
    p.poly([[12,8+b],[10,10+b],[12,14+b],[10,19+b],[11,21+b],[13,17+b]],hair);
    p.line(11,10+b,12,12+b,hairLight);p.rect(11,8+b,3,1,'#d6a45d');
    p.rect(18,21+b,1,1,'#e5ba83');
  }
  // Dettagli aggiuntivi del ritratto grande.
  if(p.scale>1) {p.rect(18.5,10.5+b,1,.5,'#ffe0b1');p.rect(16.5,27+b,.5,4,'#f1dcba');}
}
