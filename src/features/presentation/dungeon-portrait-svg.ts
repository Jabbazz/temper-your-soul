import type { AtlasRect } from './portrait-layout';
import type { Point } from './portrait-rig';

/** Strati indossabili vettoriali con dettagli a griglia fine; non sono icone inventario ingrandite. */
export function dungeonPortraitSvg(id:string,gx:number,gy:number):{markup:string;crop:AtlasRect;grip:Point}{
  const path=(d:string,fill:string,stroke='#24222a',width=.45)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
  let markup='',crop:AtlasRect=[0,0,64,64];
  if(id==='thorn_bow'){
    crop=[gx-10,gy-29,25,48];
    markup=path(`M${gx-6} ${gy-28} Q${gx+13} ${gy-20} ${gx+1} ${gy-4} L${gx} ${gy+4} Q${gx+12} ${gy+15} ${gx-6} ${gy+18}`,'none','#243825',3.3);
    markup+=path(`M${gx-6} ${gy-28} Q${gx+11} ${gy-20} ${gx+1} ${gy-4} L${gx} ${gy+4} Q${gx+10} ${gy+15} ${gx-6} ${gy+18}`,'none','#a18b52',1.9);
    markup+=path(`M${gx-6} ${gy-28} L${gx-6} ${gy+18}`,'none','#e3d3a4',.25);
    for(const dy of [-21,-14,11,18])markup+=path(`M${gx+4} ${gy+dy} l5 -3 -2 5 -3 1z`,'#698345','#34472a',.35);
    for(let dy=-4;dy<=4;dy+=1.1)markup+=path(`M${gx-1} ${gy+dy} l3 1`,'none','#5a3e2f',.7);
  }else if(id==='ossuary_lantern'){
    crop=[gx-7,gy-3,14,24];
    markup=path(`M${gx-2} ${gy+3} v-4 q2 -3 4 0 v4`,'none','#d6c99e',.9);
    markup+=path(`M${gx-5} ${gy+5} l2 -3 h6 l2 3 -1 12 -4 3 -4 -3z`,'#617967');
    markup+=path(`M${gx-3.5} ${gy+6} h7 v9 l-3.5 2 -3.5 -2z`,'#bdddb3','#d9d1ac',.6);
    markup+=path(`M${gx} ${gy+7} q-4 3 0 8 q4 -5 0 -8`,'#e7f6d3','none');
    for(const dx of [-3,0,3])markup+=path(`M${gx+dx} ${gy+5} v12`,'none','#778c72',.65);
    markup+=path(`M${gx-5} ${gy+5} h10 M${gx-4} ${gy+17} h8`,'none','#dcd0a3',1);
  }else if(id==='cinder_orb'){
    crop=[gx-8,gy-16,16,21];
    markup=path(`M${gx} ${gy-15} l6 5 1 8 -7 5 -7 -5 1 -8z`,'#593d38');
    markup+=path(`M${gx} ${gy-13} l4 4 1 6 -5 3 -5 -3 1 -6z`,'#a64b2c','#c59b65',.7);
    markup+=path(`M${gx-2} ${gy-11} l3 3 -2 3 4 2 M${gx+3} ${gy-10} l-4 6 1 3`,'none','#ffbd59',1);
    markup+=path(`M${gx-6} ${gy-2} l6 4 6 -4 M${gx-6} ${gy-10} l6 -4 6 4`,'none','#d3ad75',.8);
  }else if(id==='glacier_mirror'){
    crop=[gx-7,gy-19,14,26];
    markup=path(`M${gx} ${gy-18} l6 4 -1 12 -5 5 -6 -5 1 -12z`,'#779db3','#d4e5db',.8);
    markup+=path(`M${gx} ${gy-16} l4 3 -1 10 -3 3 -4 -3 1 -10z`,'#91d5e6','#3d607c',.45);
    markup+=path(`M${gx-2} ${gy-12} l5 -2 M${gx-3} ${gy-8} l5 -2 M${gx-2} ${gy-3} l4 -2`,'none','#eaf9ed',.5);
    markup+=path(`M${gx-1} ${gy+2} h2 v4 h-2z`,'#bacad1');
  }else if(id==='reed_mantle'){
    crop=[12,24,40,32];
    markup=path('M24 25 L29 24 32 29 36 24 41 26 45 51 39 54 35 48 32 38 28 50 21 55 19 49Z','#354b36');
    markup+=path('M25 26 L29 26 31 31 28 46 23 52 23 36Z','#6a8450');
    markup+=path('M36 26 L40 28 42 49 39 51 35 41 34 31Z','#8c9c60');
    for(let i=0;i<12;i++){
      const x=22+(i%4)*6,y=29+Math.floor(i/4)*8;
      markup+=path(`M${x} ${y} l3 -1 1 7 -3 4 -1 -4z`,i%2?'#87995b':'#546f41','#a5b77b',.18);
    }
    markup+=path('M25 28 L30 30 34 30 39 28 M26 38 Q32 40 39 38','none','#c5b47c',.65);
    markup+=path('M31 29 l2 -1 2 2 -2 3 -2 -1z','#dac784');
  }else{
    crop=[22,46,26,14];
    const colors=id==='grave_boots'?['#65675e','#e0d8b9','#9caf8f']:id==='ember_treads'?['#62453e','#d1aa78','#f99b47']:['#496c82','#c5e9ee','#8bc8e5'];
    for(const x of [26,35]){
      markup+=path(`M${x} 47 h6 v7 l2 2 v2 h-9 l-1 -2 2 -3z`,colors[0]!);
      markup+=path(`M${x+.5} 48 h4.5 v5 l-2 2 -2 -1z`,colors[1]!,'#3c4242',.35);
      markup+=path(`M${x-.5} 56 l3 -1 4 1 v1 h-7z`,colors[0]!,'#b7ad92',.3);
      for(let y=49;y<=53;y+=1.5)markup+=path(`M${x+1} ${y} l3 .5`,'none',colors[2]!,id==='grave_boots'?.65:.35);
      if(id==='ember_treads')markup+=path(`M${x+2} 49 l-1 2 2 1 -1 2`,'none','#ffc16a',.5);
      if(id==='rime_boots')markup+=path(`M${x} 49 l-2 -4 3 2 2 -2 1 4z`,'#a6deec','#e2f5ee',.3);
    }
  }
  return {markup,crop,grip:[(gx-crop[0])/crop[2],(gy-crop[1])/crop[3]]};
}
