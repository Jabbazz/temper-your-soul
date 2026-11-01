import type { CharacterAppearance } from '../character/appearance';
import type { EquipmentSlot } from '../items/equipment-slot';
import { RARITY_STATS } from '../items/rarity';
import type { WearableArt } from './character-art';
import type { BodyAnchors } from './adventurer-body';
import { PixelPainter } from './pixel-painter';

const outline = '#241c28';
export type WearableDepth = 'back' | 'front';
/** Le parti sotto la presa delle armi lunghe stanno dietro; spada e secondaria restano davanti (anche un futuro scudo). */
export function hasRearGrip(shape: string): boolean { return ['staff','scepter','lance','hammer','bow','thorn-bow'].includes(shape); }
function shade(hex: string, factor: number): string {
  return '#' + [1,3,5].map(i => Math.round(parseInt(hex.slice(i,i+2),16)*factor).toString(16).padStart(2,'0')).join('');
}

/** Mantelli dietro il corpo: forma e lunghezza diverse per famiglia; non coprono la faccia. */
export function drawWearableBack(p: PixelPainter, appearance: CharacterAppearance, registry: Readonly<Record<string,WearableArt>>, a: BodyAnchors): void {
  const item = appearance.equipment.armor;
  const art = item ? registry[item.familyId] : undefined;
  const b=a.bob, s=a.sway;
  if(art && ['mantle','shroud','veil','reed'].includes(art.shape)) {
    const long=art.shape==='shroud'?53:art.shape==='veil'?51:49;
    const edge=art.shape==='veil'?art.light:shade(art.color,.65);
    p.poly([[13,22+b],[27,22+b],[32+s,37],[36+s,long-2],[25+s,long],[22,42],[17+s,long-1],[3+s,long-2],[8+s,34]],outline);
    p.poly([[13,24+b],[25,24+b],[29+s,36],[34+s,long-3],[25+s,long-2],[22,39],[17+s,long-3],[5+s,long-3],[10+s,34]],art.color);
    p.line(13,28+b,8+s,long-5,edge);p.line(26,29+b,31+s,long-5,edge);
    p.line(6+s,long-3,17+s,long-3,art.light);p.line(25+s,long-2,34+s,long-3,art.light);
    if(art.shape==='shroud') {p.rect(11+s,long-3,2,3,art.color);p.rect(27+s,long-2,2,3,art.color);}
    if(art.shape==='veil') {
      p.poly([[8,30],[5+s,44],[10+s,42],[13,28]],'#9bced8');
      p.poly([[28,29],[35+s,46],[30+s,43],[26,27]],'#8bbecb');
      p.line(8,33,7+s,41,'#daeff0');
    }
  }
  if(['hunter_bow','thorn_bow'].includes(appearance.equipment.primary_hand?.familyId??'')) {
    p.poly([[10,18],[14,17],[16,33],[12,35]],outline);
    p.poly([[11,19],[13,19],[15,32],[13,33]],'#795438');
    for(let i=0;i<3;i++){p.line(9+i*2,13-i,12+i,24,'#d6b47a');p.rect(8+i*2,12-i,2,3,'#e4ddbd');}
  }
}

/** Strati indossati agganciati alle stesse articolazioni delle due basi. */
export function drawWearable(p: PixelPainter, appearance: CharacterAppearance, slot: EquipmentSlot, art: WearableArt, a: BodyAnchors, depth: WearableDepth = 'front'): void {
  const item=appearance.equipment[slot];if(!item) return;
  const c=art.color, light=art.light, dark=shade(c,.62), deep=shade(c,.4);
  const trim=item.rarity==='common'?'#bc955b':RARITY_STATS[item.rarity].color;
  const b=a.bob;
  if(depth==='back' && (slot==='armor' || slot==='boots' || !hasRearGrip(art.shape))) return;
  if(slot==='armor') {
    if(art.shape==='plate') {
      // Corazza bombata e grandi spallacci: sagoma molto piu larga della base.
      p.poly([[11,22+b],[16,20+b],[25,20+b],[29,23+b],[29,30+b],[26,35+b],[28,39+b],[22,41+b],[14,39+b],[13,32+b]],outline);
      p.poly([[14,24+b],[19,22+b],[25,23+b],[27,26+b],[25,33+b],[20,35+b],[15,31+b]],c);
      p.poly([[15,25+b],[19,23+b],[22,24+b],[20,31+b],[16,30+b]],'#a2acb6');
      p.poly([[23,24+b],[26,26+b],[24,32+b],[21,33+b]],dark);
      p.line(15,32+b,20,35+b,trim);p.line(20,35+b,25,32+b,trim);
      p.line(20,28+b,22,30+b,light);p.rect(21,29+b,1,3,light);
      for(const x of [7,26]) {
        p.poly([[x,23+b],[x+4,20+b],[x+8,23+b],[x+8,28+b],[x+3,30+b],[x,27+b]],outline);
        p.poly([[x+1,24+b],[x+4,22+b],[x+7,24+b],[x+6,27+b],[x+2,28+b]],c);
        p.line(x+1,24+b,x+4,22+b,'#b1bbc5');p.line(x+2,28+b,x+6,27+b,trim);
      }
      for(let y=35;y<42;y+=3){p.rect(14,y+b,13,2,dark);p.line(15,y+b,25,y+b,trim);}
      p.poly([[18,37+b],[24,37+b],[25,46],[20,49],[17,46]],'#6e343e');p.line(20,39+b,20,46,trim);
    } else if(art.shape==='aegis') {
      p.poly([[12,23+b],[16,21+b],[25,22+b],[29,26+b],[26,36+b],[14,37+b]],outline);
      p.poly([[14,24+b],[19,23+b],[25,24+b],[26,28+b],[24,34+b],[15,34+b]],c);
      p.poly([[17,25+b],[23,25+b],[25,28+b],[23,32+b],[19,34+b],[16,31+b]],dark);
      p.poly([[20,26+b],[23,30+b],[20,32+b],[18,30+b]],light);
      for(const x of [9,27]) {p.rect(x,24+b,4,5,c);p.rect(x,24+b,4,1,trim);p.rect(x+1,25+b,2,1,light);}
      p.line(14,35+b,25,35+b,trim);p.rect(18,35+b,4,2,light);
    } else {
      // Colletto alto e lembi aperti: la tunica rimane visibile sotto il mantello.
      p.poly([[13,21+b],[17,21+b],[20,27+b],[18,38+b],[13,44],[11,39+b]],outline);
      p.poly([[25,21+b],[29,23+b],[30,39+b],[26,45],[23,37+b],[22,27+b]],outline);
      p.poly([[14,23+b],[17,24+b],[18,28+b],[16,38+b],[13,42],[13,31+b]],c);
      p.poly([[25,23+b],[27,24+b],[28,37+b],[26,43],[24,37+b],[24,28+b]],c);
      p.line(15,25+b,17,28+b,light);p.line(17,29+b,14,40,trim);
      p.line(25,26+b,25,36+b,light);p.line(26,37+b,26,41,trim);
      if(art.shape==='shroud') {
        p.poly([[12,22+b],[16,20+b],[24,21+b],[28,23+b],[24,27+b],[18,26+b]],dark);
        p.rect(19,23+b,4,3,'#b5b1a1');p.rect(20,24+b,1,1,deep);p.rect(22,24+b,1,1,deep);
      } else if(art.shape==='veil') {
        for(const x of [10,27]) {p.poly([[x,26+b],[x-2,20+b],[x+4,23+b],[x+5,27+b]],light);p.line(x,23+b,x+3,25+b,'#ecfff5');}
        p.rect(20,27+b,3,4,'#79c5e4');p.rect(21,28+b,1,2,'#e8f8ee');
      } else if(art.shape==='reed') {
        // Due foglie sui lembi: il grosso del mantello sta dietro, tunica e cintura restano visibili.
        for(const x of [14,26]){p.poly([[x,26+b],[x+2,29+b],[x,33+b],[x-1,29+b]],light);}
      } else {
        p.rect(12,24+b,4,2,trim);p.rect(25,24+b,3,2,trim);p.line(15,25+b,25,26+b,'#d6b969');
        p.rect(20,26+b,2,2,light);
      }
    }
    if(p.scale>1) {for(let y=30;y<38;y+=3)p.rect(14.5,y+b,.5,.5,light);}
    return;
  }
  if(slot==='boots') {
    for(const [base,lift,stride] of [[14,a.leftFoot,a.stride],[23,a.rightFoot,-a.stride]]) {
      const x=base!+stride!,y=46+lift!;
      p.poly([[x-1,y-2],[x+5,y-2],[x+5,y+5],[x+7,y+6],[x+7,y+8],[x-2,y+8]],outline);
      p.rect(x,y-1,4,7,c);p.rect(x-1,y+6,7,1,c);p.rect(x,y,1,5,light);p.rect(x,y-1,4,1,trim);
      if(art.shape==='wind') {
        p.poly([[x,y+2],[x-5,y-2],[x-4,y+2],[x-2,y+4]],'#e8e2c5');
        p.line(x-4,y,x-1,y+3,'#a4c5b0');p.rect(x+2,y+3,2,1,trim);
      } else if(art.shape==='bog') {
        p.rect(x-1,y-2,6,2,light);p.rect(x+1,y,3,4,dark);p.rect(x-2,y+6,9,2,'#4f5135');p.rect(x,y+5,4,1,'#a9ad64');
      } else if(art.shape==='grave') {
        p.rect(x-1,y-2,6,3,light);p.line(x,y+2,x+4,y+2,light);p.rect(x+1,y+4,2,2,'#283a30');
      } else if(art.shape==='ember') {
        p.line(x,y,x+3,y+4,light);p.line(x+3,y+1,x,y+5,'#ffca69');p.rect(x-1,y+6,7,1,'#ee7939');
      } else if(art.shape==='rime') {
        p.poly([[x-2,y+1],[x-4,y-4],[x+1,y-2]],light);p.line(x,y+3,x+4,y+4,'#e5fbff');
      } else {
        p.rect(x+1,y+1,2,2,light);p.rect(x+2,y+4,1,1,light);p.line(x,y+5,x+4,y+5,trim);
      }
      p.rect(x-1,y+8,8,1,outline);
    }
    return;
  }
  // Oggetto canonico in uno strato separato: incliniamo insieme lama, guardia e impugnatura.
  const destination=p;
  p=new PixelPainter(40,56,p.scale);
  const x=slot==='primary_hand'?33:5, y=33;
  if(art.shape==='bow'||art.shape==='thorn-bow') {
    // Arco di profilo, con spazio vuoto tra corda e flettenti.
    const pull=a.primary.rotation>0?2:0;
    p.line(31-pull,y-17,31-pull,y+16,'#ded5b5');
    const curve: readonly (readonly [number,number])[]=[[31,-17],[34,-14],[36,-9],[38,-4],[38,3],[36,9],[34,13],[31,16]];
    for(let i=1;i<curve.length;i++) {
      const prev=curve[i-1]!,cur=curve[i]!;
      p.line(prev[0],y+prev[1],cur[0],y+cur[1],outline);
      p.line(prev[0]-1,y+prev[1],cur[0]-1,y+cur[1],c);
    }
    p.line(35,y-8,37,y-3,'#d6ac66');p.line(37,y+3,35,y+8,'#d6ac66');
    p.rect(36,y-2,2,5,'#61422f');p.rect(35,y,2,1,trim);
    if(art.shape==='thorn-bow')for(const iy of [-12,-6,6,12])p.poly([[36,y+iy],[39,y+iy-2],[38,y+iy+2]],light);
    if(pull>0) {p.line(28,y,39,y,'#bfa16c');p.rect(38,y-1,2,2,'#d6e2d9');}
  } else if(art.shape==='staff'||art.shape==='scepter'||art.shape==='lance') {
    p.line(x,y-19,x-1,y+16,outline);p.line(x+1,y-18,x,y+16,c);
    p.line(x,y-7,x,y+15,'#ba925b');
    for(let iy=-6;iy<=6;iy+=5) p.rect(x, y+iy,2,1,trim);
    if(art.shape==='lance') {
      p.poly([[x,y-27],[x-3,y-19],[x-1,y-12],[x+3,y-19]],outline);
      p.poly([[x,y-26],[x-2,y-19],[x,y-14],[x+2,y-19]],c);p.line(x,y-24,x,y-15,light);
      p.line(x-4,y-17,x+4,y-17,trim);
    } else {
      p.poly([[x,y-26],[x-3,y-21],[x,y-16],[x+3,y-21]],outline);
      p.poly([[x,y-25],[x-2,y-21],[x,y-17],[x+2,y-21]],c);p.line(x,y-24,x,y-19,light);
      p.line(x-3,y-19,x,y-14,trim);p.line(x+3,y-19,x,y-14,trim);
      if(art.shape==='scepter') {p.rect(x-4,y-21,2,1,light);p.rect(x+3,y-21,2,1,light);p.rect(x-1,y-23,3,1,light);}
    }
  } else if(art.shape==='sword') {
    p.poly([[x,y-21],[x+3,y-17],[x+1,y-2],[x-2,y-2]],outline);
    p.poly([[x,y-19],[x+2,y-17],[x,y-3],[x-1,y-3]],c);p.line(x,y-18,x,y-4,light);
    p.line(x-4,y-1,x+4,y-1,trim);p.rect(x-1,y,2,7,dark);p.rect(x-2,y+7,4,2,trim);
  } else if(art.shape==='hammer') {
    p.line(x-1,y-13,x-2,y+15,outline);p.line(x,y-13,x-1,y+14,'#a27b50');
    p.poly([[x-6,y-18],[x+4,y-18],[x+6,y-15],[x+5,y-9],[x-6,y-9],[x-8,y-12]],outline);
    p.rect(x-5,y-17,9,7,c);p.rect(x-6,y-16,2,6,dark);p.rect(x+3,y-16,2,6,trim);
    p.line(x-5,y-17,x+3,y-17,'#d6b48a');p.line(x-2,y-16,x,y-13,light);p.line(x,y-13,x-2,y-10,light);p.rect(x+1,y-14,1,3,light);
  } else if(art.shape==='lantern') {
    p.line(x,y-4,x,y-8,light);p.line(x-3,y-7,x+3,y-7,trim);
    p.rect(x-5,y-5,10,13,outline);p.rect(x-4,y-4,8,11,c);p.rect(x-2,y-2,4,7,light);
    for(const dx of [-3,0,3])p.line(x+dx,y-4,x+dx,y+6,trim);p.rect(x-4,y+7,8,2,light);
  } else if(art.shape==='cinder') {
    p.poly([[x,y-9],[x+6,y-5],[x+5,y+2],[x,y+5],[x-5,y+2],[x-6,y-5]],outline);
    p.poly([[x,y-8],[x+5,y-4],[x+3,y+2],[x,y+4],[x-4,y+1],[x-5,y-4]],c);
    p.line(x-2,y-5,x+2,y+2,light);p.line(x+3,y-5,x-2,y+1,'#ffd489');p.rect(x-1,y-4,2,3,'#ffecaa');
  } else if(art.shape==='mirror') {
    p.poly([[x,y-10],[x+5,y-7],[x+5,y+2],[x,y+5],[x-5,y+1],[x-5,y-6]],outline);
    p.poly([[x,y-9],[x+4,y-6],[x+3,y+1],[x,y+4],[x-4,y],[x-4,y-5]],c);
    p.line(x-2,y-5,x+2,y-7,light);p.line(x-1,y-2,x+3,y-4,light);p.rect(x-1,y+5,2,5,trim);
  } else if(art.shape==='book') {
    p.poly([[1,y-5],[5,y-3],[11,y-5],[11,y+5],[5,y+7],[1,y+5]],outline);
    p.poly([[2,y-4],[5,y-2],[10,y-4],[10,y+4],[5,y+6],[2,y+4]],c);
    p.poly([[2,y-3],[5,y-1],[5,y+4],[2,y+2]],'#dce4d1');p.poly([[6,y-1],[9,y-3],[9,y+2],[6,y+4]],light);
    p.line(5,y,5,y+5,trim);p.rect(3,y-1,1,2,'#7c9cbd');p.rect(7,y,1,2,'#7c9cbd');
  } else if(art.shape==='talisman') {
    p.line(5,y-8,3,y-1,trim);p.line(5,y-8,8,y-1,trim);
    p.poly([[5,y-3],[9,y+1],[5,y+5],[1,y+1]],outline);p.poly([[5,y-2],[8,y+1],[5,y+4],[2,y+1]],c);
    p.rect(4,y,2,2,light);p.line(4,y+5,3,y+8,trim);p.line(6,y+5,7,y+8,light);
  } else if(art.shape==='fan') {
    p.poly([[0,y-5],[3,y-8],[8,y-8],[11,y-5],[7,y+4],[4,y+5]],outline);
    p.poly([[1,y-5],[4,y-7],[7,y-7],[10,y-5],[6,y+3],[5,y+3]],c);
    for(const px of [2,5,8]) {p.line(px,y-5,5,y+4,trim);p.rect(px,y-6,2,2,light);}
    p.rect(5,y+4,1,5,dark);
  }
  const hand=slot==='primary_hand'?a.primary:a.secondary;
  const grips: Readonly<Record<string,readonly [number,number]>> = {
    staff:[32,40],scepter:[32,40],lance:[32,40],sword:[33,36],hammer:[32,40],bow:[36,33],'thorn-bow':[36,33],book:[9,38],talisman:[5,36],fan:[5,40],lantern:[5,25],cinder:[5,37],mirror:[5,40],
  };
  const grip=grips[art.shape]!;
  const angle=art.shape==='sword' ? Math.min(1.1,hand.rotation+.4)
    : ['staff','scepter','lance'].includes(art.shape) ? .3+(hand.rotation-.3)*.25
    : ['bow','thorn-bow'].includes(art.shape) ? .4 : art.shape==='hammer' ? Math.max(.5,hand.rotation) : hand.rotation;
  const split=hasRearGrip(art.shape);
  destination.stamp(p,grip[0],grip[1],hand.x,hand.y,angle,{
    scale:appearance.body==='female'?.88:1,
    ...(split ? depth==='back'?{minY:grip[1]}:{maxY:grip[1]} : {}),
  });
}
