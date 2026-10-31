import { clamp, TAU } from '../../core/vec2';
import type { Camera } from '../../core/camera';
import type { Charge } from '../boss/boss';
import type { DangerZone } from '../combat/danger-zone';
import type { Projectile } from '../combat/projectile';
import type { Vec2 } from '../../core/vec2';
import type { ZoneFlash } from './effects';
import { projectileLook, zoneLook } from './visuals';

/** Segnale a terra della carica del boss: la fascia di percorso e il punto d'arrivo. Solo durante la preparazione. */
export function drawChargeTelegraph(ctx: CanvasRenderingContext2D, charge: Charge): void {
  if (charge.elapsed >= charge.windup) return;
  ctx.save();
  ctx.strokeStyle = '#ffad7060';
  ctx.lineWidth = 50;
  ctx.beginPath();
  ctx.moveTo(charge.start.x, charge.start.y);
  ctx.lineTo(charge.target.x, charge.target.y);
  ctx.stroke();
  ctx.strokeStyle = '#ffbc81';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(charge.target.x, charge.target.y, 26, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/** Zona in attesa di scoppiare: area segnalata con il conto alla rovescia. `time` anima le tacche. */
export function drawPendingZone(ctx: CanvasRenderingContext2D, zone: DangerZone, time: number): void {
  const u = zone.progress;
  const friendly = zone.team === 'player';
  const look = zoneLook(zone.team, zone.spec.visual);
  ctx.save();
  ctx.translate(zone.position.x, zone.position.y);
  ctx.fillStyle = look.fill;
  ctx.beginPath();
  ctx.arc(0, 0, zone.radius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = look.ring;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, zone.radius, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, zone.radius + 4, -Math.PI / 2, -Math.PI / 2 + u * TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.3 + u * 0.45;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, zone.radius * (1 - u), 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + (friendly ? time * 0.6 : -time * 0.3);
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = look.ring;
    ctx.fillRect(zone.radius * 0.78, -2, 7, 4);
    ctx.restore();
  }
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(7, 0);
  ctx.moveTo(0, -7);
  ctx.lineTo(0, 7);
  ctx.stroke();
  ctx.restore();
}

/** Bagliore che resta per un attimo dopo lo scoppio di una zona. */
export function drawZoneFlash(ctx: CanvasRenderingContext2D, flash: ZoneFlash): void {
  const color = flash.look.ring;
  const fade = clamp(flash.remaining / flash.total, 0, 1);
  const r = flash.radius;
  ctx.save();
  ctx.translate(flash.position.x, flash.position.y);
  ctx.globalAlpha = fade * 0.25;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = fade * 0.7;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
    ctx.lineTo(Math.cos(a + 0.13) * r * 0.45, Math.sin(a + 0.13) * r * 0.45);
    ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

/** Meteora in caduta (zone del giocatore) o presagio degli ultimi istanti (zone nemiche). */
export function drawFallingSpell(ctx: CanvasRenderingContext2D, zone: DangerZone): void {
  if (zone.remaining <= 0) return;
  const u = zone.progress;
  if (zone.team === 'player') {
    const h = (1 - u) * 190;
    const x = zone.position.x - h * 0.35;
    const y = zone.position.y - h;
    ctx.save();
    ctx.strokeStyle = '#b798ff';
    ctx.lineWidth = 9;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(x - 24, y - 65);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f1daff';
    ctx.globalAlpha = 0.8;
    ctx.stroke();
    ctx.fillStyle = '#b88aff';
    ctx.beginPath();
    ctx.arc(x, y, 9 + u * 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff0df';
    ctx.fillRect(x - 4, y - 5, 7, 8);
    ctx.restore();
  } else if (u > 0.7) {
    ctx.save();
    ctx.globalAlpha = (u - 0.7) * 2;
    ctx.strokeStyle = '#ffbe85';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(zone.position.x + Math.cos(a) * zone.radius * 0.6, zone.position.y + Math.sin(a) * zone.radius * 0.6);
      ctx.lineTo(zone.position.x + Math.cos(a) * zone.radius * 0.25, zone.position.y + Math.sin(a) * zone.radius * 0.25);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** Proiettile con la sua scia e la sua forma. `time` fa ruotare il rombo del gelo. */
export function drawProjectile(
  ctx: CanvasRenderingContext2D,
  projectile: Projectile,
  trail: readonly Vec2[],
  camera: Camera,
  time: number,
): void {
  if (!camera.isVisible(projectile.position, 80)) return;
  const look = projectileLook(projectile.spec.visual);
  const r = projectile.radius;
  ctx.save();
  ctx.strokeStyle = look.color;
  ctx.lineCap = 'round';
  for (let i = 1; i < trail.length; i++) {
    ctx.globalAlpha = (i / trail.length) * 0.55;
    ctx.lineWidth = Math.max(1, (r * i) / trail.length);
    ctx.beginPath();
    ctx.moveTo(trail[i - 1]!.x, trail[i - 1]!.y);
    ctx.lineTo(trail[i]!.x, trail[i]!.y);
    ctx.stroke();
  }
  ctx.translate(projectile.position.x, projectile.position.y);
  ctx.rotate(projectile.velocity.angle());
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = look.color;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.5, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  if(['wisp','thorn','ember','mirror'].includes(look.shape)){
    ctx.fillStyle=look.color;ctx.strokeStyle='#f4f4d8';ctx.lineWidth=1;
    ctx.beginPath();
    if(look.shape==='wisp'){
      ctx.moveTo(10,0);ctx.quadraticCurveTo(1,-12,-10,-3);ctx.lineTo(-4,0);ctx.lineTo(-12,5);ctx.quadraticCurveTo(2,11,10,0);
    }else if(look.shape==='thorn'){
      ctx.moveTo(15,0);ctx.lineTo(-8,-5);ctx.lineTo(-3,0);ctx.lineTo(-8,5);ctx.closePath();
    }else if(look.shape==='ember'){
      ctx.moveTo(9,0);ctx.lineTo(2,-6);ctx.lineTo(-12,-3);ctx.lineTo(-7,1);ctx.lineTo(-14,5);ctx.lineTo(2,5);ctx.closePath();
    }else{
      ctx.rotate(Math.sin(time*7)*.4);ctx.moveTo(12,0);ctx.lineTo(3,-7);ctx.lineTo(-9,-3);ctx.lineTo(-5,7);ctx.closePath();
    }
    ctx.fill();ctx.stroke();ctx.fillStyle='#fff6dc';ctx.fillRect(0,-1,4,2);
  } else if (look.shape === 'diamond') {
    ctx.rotate(time * 3);
    ctx.fillStyle = '#417eac';
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-11, 0);
    ctx.lineTo(0, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a1f0ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#e6ffff';
    ctx.fillRect(-3, -3, 6, 6);
  } else if (look.shape === 'dart') {
    ctx.fillStyle = '#9261db';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-7, -4);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e7d6ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();
  } else if (look.shape === 'arrow') {
    ctx.strokeStyle = look.color;
    ctx.lineWidth = Math.max(2, r * 0.8);
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(9, 0);
    ctx.stroke();
    ctx.fillStyle = '#fff6dc';
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(6, -3.5);
    ctx.lineTo(6, 3.5);
    ctx.closePath();
    ctx.fill();
  } else if (look.shape === 'shard') {
    ctx.fillStyle = look.color;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(0, -4.5);
    ctx.lineTo(-10, 0);
    ctx.lineTo(0, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.fillStyle = look.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff2d2';
    ctx.fillRect(-2, -2, 3, 3);
  }
  ctx.restore();
}
