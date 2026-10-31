import { Camera } from '../../core/camera';
import type { DungeonDefinition } from '../dungeons/dungeon-definition';
import { bossArt, bossSheet } from '../presentation/boss-art';
import { sheetImage, whenSheetReady } from '../presentation/boss-art/sheet-images';
import { drawSprite } from '../presentation/sprites';
import { ARENA_THEMES } from '../presentation/themes';
import { el } from './dom';

/**
 * Vignetta deterministica: palette, sprite e pavimento sono quelli effettivi del dungeon. Nessun asset remoto. Se il
 * boss ha un foglio di sprite non ancora caricato si disegna intanto la grafica a matrici, poi si ridipinge.
 */
export function renderBossArtwork(dungeon:DungeonDefinition):HTMLCanvasElement {
  const canvas=el('canvas','boss-artwork');canvas.width=480;canvas.height=280;
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label',dungeon.boss.name+' · '+dungeon.name);
  const ctx=canvas.getContext('2d');if(!ctx)return canvas;
  const sheet=bossSheet(dungeon.boss.art),image=sheet===null?null:sheetImage(sheet.layout.url);
  paintArtwork(ctx,dungeon,image);
  if(sheet!==null&&image===null)whenSheetReady(sheet.layout.url).then((ready)=>paintArtwork(ctx,dungeon,ready),()=>undefined);
  return canvas;
}

function paintArtwork(ctx:CanvasRenderingContext2D,dungeon:DungeonDefinition,image:HTMLImageElement|null):void {
  const camera=new Camera();camera.setViewSize(480,280);camera.follow(dungeon.arena.bossSpawn);
  const colors:Readonly<Record<string,string>>={crypt:'#9a80bd',swamp:'#91a957',forge:'#ec8b4d',glacier:'#85d5eb'};
  const theme=ARENA_THEMES[dungeon.arena.theme],accent=colors[dungeon.id]??'#b98d83';
  ctx.clearRect(0,0,480,280);
  ctx.save();ctx.translate(-camera.position.x,-camera.position.y);theme.drawFloor(ctx,dungeon.arena,camera,2);
  for(const pillar of dungeon.arena.pillars)if(camera.isVisible(pillar.position,pillar.radius))theme.drawPillar(ctx,pillar,camera,2);
  ctx.restore();
  const shade=ctx.createLinearGradient(0,0,0,280);shade.addColorStop(0,'#0d0916cc');shade.addColorStop(.6,'#17101a66');shade.addColorStop(1,'#0c0912ee');ctx.fillStyle=shade;ctx.fillRect(0,0,480,280);
  const glow=ctx.createRadialGradient(240,130,8,240,130,155);glow.addColorStop(0,accent+'77');glow.addColorStop(1,accent+'00');ctx.fillStyle=glow;ctx.fillRect(0,0,480,280);
  ctx.strokeStyle=accent;ctx.lineWidth=1;ctx.globalAlpha=.45;
  for(const r of [76,88]){ctx.beginPath();ctx.ellipse(240,227,r,r*.25,0,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
  ctx.fillStyle='#09071199';ctx.beginPath();ctx.ellipse(240,228,52,13,0,0,Math.PI*2);ctx.fill();
  const sheet=bossSheet(dungeon.boss.art);
  if(sheet!==null&&image!==null){
    // Primo fotogramma della camminata, ingrandito di un fattore intero, con i piedi sull'ombra.
    const {cell,feet,clips}=sheet.layout,scale=sheet.portraitScale;
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,0,clips.walk.row*cell.height,cell.width,cell.height,240-feet.x*scale,228-feet.y*scale,cell.width*scale,cell.height*scale);
  }else{
    const art=bossArt(dungeon.boss.art),frame=art.casting;
    const scale=Math.max(1,Math.floor(Math.min(170/frame.length,200/frame[0]!.length)));
    drawSprite(ctx,frame,240,225-frame.length*scale/2,scale,art.palette(false,false));
  }
  ctx.fillStyle=accent;for(let i=0;i<15;i++){const x=25+(i*83)%430,y=30+(i*47)%190;ctx.globalAlpha=.2+(i%3)*.15;ctx.fillRect(x,y,i%2+1,i%2+1);}ctx.globalAlpha=1;
}
