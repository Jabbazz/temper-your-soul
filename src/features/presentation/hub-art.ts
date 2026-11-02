import { HUB_HOUSES, HUB_CRATES, type HubObstacle, type HubStation } from '../character/hub-state';
import { drawSprite, type Palette, type SpriteFrame } from './sprites';
const hash=(x:number,y:number)=>{let n=Math.imul(x+11,374761393)^Math.imul(y+17,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;};
function rect(c:CanvasRenderingContext2D,color:string,x:number,y:number,w:number,h:number):void {c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
/** Selciato e facciate rasterizzati una sola volta, senza immagini esterne. */
export function drawTown(c:CanvasRenderingContext2D):void {
 rect(c,'#242529',0,0,960,640);
 for(let y=0;y<640;y+=12)for(let x=-16;x<960;x+=24){const offset=(y/12%2)*12,n=hash(x,y),px=x+offset;
  rect(c,['#3d3c3b','#42403d','#37383b','#48443f','#343538'][n%5]!,px+1,y+1,22,10);
  rect(c,'#54504a',px+2,y+1,18-n%4,1);rect(c,'#24272a',px+22,y+3,1,8);
  rect(c,'#25272a',px+1,y+1,1,1);rect(c,'#25272a',px+21,y+10,2,1);
  if(n%3===0){rect(c,'#292c2d',px+7,y+5,1,5);rect(c,'#292c2d',px+8,y+5,4,1);}
  if(n%4===0)rect(c,'#282b2b',px+5+n%12,y+4,5,1);
  if(n%7===0)rect(c,'#4b4a42',px+4,y+6,2,2);
 }
 // Bordure di pietra dell'antica via mercantile.
 for(let x=128;x<832;x+=18){rect(c,'#666054',x,152,16,5);rect(c,'#1e2225',x,157,16,2);rect(c,'#625b4e',x,548,16,5);}
 for(let y=164;y<548;y+=18){rect(c,'#666054',135,y,5,16);rect(c,'#625b4e',820,y,5,16);}
 for(let i=0;i<170;i++){const x=145+hash(i,3)%670,y=160+hash(i,5)%380;if(hash(i,4)%3===0)rect(c,'#202728',x,y,3,2);}
 // Dallage ancien sous le portail, mosaïque octogonale en pixels.
 for(let y=-48;y<=48;y+=4)for(let x=-72;x<=72;x+=4){const d=Math.abs(x)/1.5+Math.abs(y);if(d>76)continue;
  rect(c,d>65?'#766b54':d>60?'#282b30':((x+y)%12===0?'#54504a':'#454440'),480+x,265+y,4,4);
 }
 for(const house of HUB_HOUSES)drawHouse(c,house);
 for(const crate of HUB_CRATES)drawCrate(c,crate);
 // Detriti, muschio e griglie di scolo.
 for(const x of [154,790])for(const y of [350,530]){rect(c,'#171d20',x,y,20,12);for(let i=0;i<5;i++)rect(c,'#4b4d49',x+i*4,y,1,12);}
 for(const [x,y] of [[183,268],[786,386],[337,533],[612,185]]){rect(c,'#1b2422',x!,y!,18,5);rect(c,'#3f4937',x!+3,y!-2,6,3);}
}
function drawHouse(c:CanvasRenderingContext2D,o:HubObstacle):void {
 const {x,y,width:w,height:h}=o,faceY=y+h-48;
 rect(c,'#12171cd9',x+8,y+12,w+7,h+8);
 rect(c,'#363335',x,y,w,h);rect(c,'#686051',x,faceY,w,4);
 for(let by=faceY+5;by<y+h;by+=9)for(let bx=x;bx<x+w;bx+=18){const shift=(Math.floor(by/9)%2)*9;
  rect(c,['#4f4942','#585046','#494541'][hash(bx,by)%3]!,bx+shift+1,by,16,7);rect(c,'#696052',bx+shift+2,by,13,1);
 }
 // Ardesia e travi scure del tetto.
 rect(c,'#1b222b',x-3,y-18,w+6,h-30);
 for(let ty=y-18;ty<faceY;ty+=8)for(let tx=x-3;tx<x+w+3;tx+=16){const n=hash(tx,ty),offset=(Math.floor(ty/8)%2)*8;
  rect(c,['#303642','#383b46','#282f39','#3e4048'][n%4]!,tx+offset,ty,15,6);rect(c,'#4a4a50',tx+offset,ty,13,1);
 }
 rect(c,'#786755',x-5,faceY-3,w+10,4);rect(c,'#191c23',x-5,faceY+1,w+10,3);
 for(const wx of [x+22,x+w-34]){rect(c,'#24262a',wx-3,faceY+11,20,23);rect(c,'#9e7141',wx,faceY+13,14,17);rect(c,'#d29b50',wx+2,faceY+15,10,12);rect(c,'#40332d',wx+6,faceY+13,2,17);rect(c,'#40332d',wx,faceY+21,14,2);rect(c,'#8e7960',wx-3,faceY+32,20,3);}
 const doorX=x+Math.floor(w/2)-11;rect(c,'#222124',doorX-4,faceY+12,30,38);rect(c,'#594334',doorX,faceY+14,22,34);
 for(let i=0;i<4;i++)rect(c,'#332c29',doorX+i*6,faceY+15,1,32);rect(c,'#b68b50',doorX+17,faceY+31,2,2);rect(c,'#776b5b',doorX-4,y+h-2,30,4);
 // Comignolo in mattoni sopra le tegole.
 rect(c,'#302e31',x+w-42,y-23,19,31);for(let i=0;i<4;i++){rect(c,'#66584b',x+w-41,y-22+i*7,17,5);rect(c,'#87705b',x+w-40,y-22+i*7,14,1);}rect(c,'#24272c',x+w-45,y-26,25,5);
}
function drawCrate(c:CanvasRenderingContext2D,o:HubObstacle):void {
 const {x,y,width:w,height:h}=o;rect(c,'#12191b99',x+3,y+5,w+4,h+2);rect(c,'#30271f',x,y-10,w,h+10);rect(c,'#755a3d',x+2,y-8,w-4,h+6);
 for(let i=5;i<w-3;i+=6)rect(c,'#4d3b2c',x+i,y-8,1,h+6);rect(c,'#ad8852',x+1,y-10,w-2,3);rect(c,'#ad8852',x+1,y+h-3,w-2,3);
 for(let i=0;i<Math.min(w,h);i+=3)rect(c,'#957247',x+2+i,y-5+i,3,3);rect(c,'#302d28',x+1,y-7,2,h+4);rect(c,'#302d28',x+w-3,y-7,2,h+4);
}
export const NPC_FRAMES:readonly SpriteFrame[]=[0,1,2,3].map(frame=>[
 '......aaaa......','.....abbbba.....','.....acccca.....','......cddc......','......ceec......','.....ffffff.....',
 '....fgfffggf....','...cfghhhgfc....',frame%2?'...c.ghhhg.c....':'...c.ghhhgc.....','.....ghhhg......','.....ghhhg......',
 '.....giiig......','.....i..ii......',frame===1?'....ii...i......':'.....i..ii......','....aa..aaa.....',
]);
const SMITH_PALETTE:Palette={a:'#22242a',b:'#433329',c:'#b58b67',d:'#27202a',e:'#614333',f:'#706b62',g:'#3b3130',h:'#76503b',i:'#3b4149'};
const MERCHANT_PALETTE:Palette={...SMITH_PALETTE,b:'#4a3938',f:'#675c4b',g:'#313a37',h:'#4b6258',i:'#303b3d'};
export function drawHubStation(c:CanvasRenderingContext2D,s:HubStation,time:number):void {
 const x=s.x,y=s.y,frame=Math.floor(time*4)%4;
 rect(c,'#10161b99',x-s.width/2-4,y+5,s.width+8,10);
 if(s.id==='portal'){
  // Anello spezzato di pietra, rune e vortice in quattro fasi.
  for(let yy=-70;yy<8;yy+=3)for(let xx=-34;xx<=34;xx+=3){const d=(xx*xx)/(31*31)+((yy+32)*(yy+32))/(41*41);
   if(d<1.15&&d>.75)rect(c,(hash(xx,yy)%3===0?'#9f947a':'#625f60'),x+xx,y+yy,3,3);
   else if(d<=.75)rect(c,['#232333','#383244','#51465a','#716270'][(Math.floor((xx+yy)/9)+frame+100)%4]!,x+xx,y+yy,3,3);
  }
  for(let i=0;i<12;i++){const a=i*Math.PI/6+time*.65;rect(c,i%3?'#d3b783':'#f1e1b6',x+Math.cos(a)*25,y-32+Math.sin(a)*33,2,3);}
  rect(c,'#93836a',x-40,y+7,80,5);rect(c,'#4e4b48',x-45,y+12,90,5);
 }else if(s.id==='storage'){
  drawCrate(c,{x:x-21,y:y-6,width:42,height:22});rect(c,'#49342a',x-23,y-22,46,17);rect(c,'#a47e43',x-23,y-23,46,3);rect(c,'#b38f4f',x-20,y-23,4,37);rect(c,'#b38f4f',x+16,y-23,4,37);rect(c,'#d2af62',x-4,y-8,8,9);if(frame===0)rect(c,'#fff1b2',x-2,y-8,2,2);
 }else if(s.id==='forge'){
  rect(c,'#454044',x-25,y-63,50,72);for(let by=-61;by<8;by+=9)for(let bx=-23;bx<24;bx+=13){rect(c,'#6b5e51',x+bx,y+by,11,7);rect(c,'#89725b',x+bx,y+by,11,1);}
  rect(c,'#151b21',x-17,y-34,34,39);rect(c,'#4a2e2b',x-15,y-32,30,35);
  for(let i=0;i<8;i++){const flame=7+hash(i,frame)%17;rect(c,['#b04d2d','#dc7939','#edb559'][i%3]!,x-13+i*4,y+3-flame,3,flame);}
  rect(c,'#95806b',x-29,y+5,58,5);rect(c,'#252b31',x-13,y-77,26,17);rect(c,'#716356',x-17,y-80,34,5);
  for(let i=0;i<3;i++)rect(c,'#8f827966',x-7+i*5+frame*2,y-85-i*8-frame*2,7,5);
 }else if(s.id==='smith'){
  drawSprite(c,NPC_FRAMES[frame]!,x-18,y-15,2,SMITH_PALETTE);
  rect(c,'#8e9699',x+10,y-15,34,7);rect(c,'#4c5661',x+14,y-8,26,6);rect(c,'#535660',x+23,y-2,9,12);rect(c,'#85837c',x+16,y+9,24,4);
  const lift=frame===1?14:frame===2?4:9;rect(c,'#8f6a45',x+1,y-20-lift,3,16);rect(c,'#b3b6b0',x-2,y-23-lift,13,6);
  if(frame===2){rect(c,'#ffc16b',x+17,y-19,2,2);rect(c,'#e59b4c',x+24,y-24,2,2);}
 }else{
  // Bottega: tenda di tela, bancone e mercante animato.
  rect(c,'#6b513a',x-33,y-53,3,65);rect(c,'#6b513a',x+30,y-53,3,65);
  for(let i=0;i<8;i++){rect(c,i%2?'#5b3d39':'#9f8661',x-36+i*9,y-58+(i%2),9,15);rect(c,i%2?'#392c2d':'#6e5e48',x-36+i*9,y-43,9,4);}
  drawSprite(c,NPC_FRAMES[frame]!,x,y-14,2,MERCHANT_PALETTE);
  rect(c,'#342c29',x-30,y-5,60,20);rect(c,'#93704a',x-33,y-8,66,5);for(let i=0;i<6;i++)rect(c,'#634b36',x-28+i*10,y-2,8,15);
  rect(c,'#a36d4a',x-20,y-13,8,5);rect(c,'#a5ac9b',x+12,y-14,9,6);
 }
}
export function drawTownLights(c:CanvasRenderingContext2D,time:number):void {
 for(const [x,y] of [[155,160],[805,160],[146,545],[814,545]]){
  for(let r=34;r>0;r-=9){c.globalAlpha=.018;rect(c,'#e7a15d',x!-r,y!-r,2*r,2*r);}c.globalAlpha=1;
  rect(c,'#252328',x!-3,y!-21,6,23);rect(c,'#b48a51',x!-5,y!-26,10,8);rect(c,'#e7a24e',x!-3,y!-30,6,10);rect(c,'#ffe0a0',x!-1,y!-28-Math.floor(time*5)%3,2,8);
 }
}
