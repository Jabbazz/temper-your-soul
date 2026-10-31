import { describe, expect, it } from 'vitest';
import { bodyAnchors } from './adventurer-body';
import { WEARABLES } from './character-art';
import { drawWearable } from './wearable-draw';
import { PixelPainter } from './pixel-painter';

describe('articolazioni e armi rigide', () => {
  it('ruota punta e impugnatura dello stesso strato attorno a un unico perno', () => {
    const sword=new PixelPainter(5,5);
    sword.rect(2,0,1,1,'#ff0000');sword.rect(2,4,1,1,'#0000ff');
    const frame=new PixelPainter(24,24);
    frame.stamp(sword,2.5,2.5,10.5,10.5,Math.PI/2);
    expect(frame.pixels[10]![12]).toBe('#ff0000');
    expect(frame.pixels[10]![8]).toBe('#0000ff');
    expect(frame.pixels[8]![10]).toBe('');
  });
  it('lanciare dalla mano secondaria muove la sinistra, lasciando ferma la destra', () => {
    const idle=bodyAnchors({state:'idle',frame:0});
    const secondary=bodyAnchors({state:'cast',frame:3,attackSlot:'secondary_hand'});
    expect(secondary.primary).toEqual(idle.primary);
    expect(secondary.secondary.y).toBeLessThan(idle.secondary.y);
    const primary=bodyAnchors({state:'cast',frame:3,attackSlot:'primary_hand'});
    expect(primary.secondary).toEqual(idle.secondary);
    expect(primary.primary.rotation).toBeGreaterThan(idle.primary.rotation);
  });
  it('il ventaglio non aggiunge dita o protuberanze di pelle nel proprio strato', () => {
    const painter=new PixelPainter(64,64,1,12,4);
    drawWearable(painter,{body:'male',equipment:{secondary_hand:{uid:'test',familyId:'spore_fan',rarity:'common'}}},'secondary_hand',WEARABLES.spore_fan!,bodyAnchors({state:'cast',frame:3,attackSlot:'secondary_hand'}));
    const colors=new Set(painter.pixels.flat());
    expect(colors.size).toBeGreaterThan(2);
    for(const skin of ['#dcad83','#f2c99a','#d9a479','#f3c89a']) expect(colors.has(skin)).toBe(false);
  });
});
