// Disegno Canvas del mondo, personaggi, effetti, mira e aggiornamento HUD.
// Script classico: condivide lo stato dichiarato in core.js.

function text(s, x, y, color = '#d8d0c8', size = 12, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${size}px monospace`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y)
}

function drawWorld() {
  ctx.fillStyle = '#10151d';
  ctx.fillRect(camera.x, camera.y, W, H);
  const x0 = Math.max(0, Math.floor(camera.x / 32) * 32),
    y0 = Math.max(0, Math.floor(camera.y / 32) * 32);
  for (let y = y0; y < Math.min(WORLD_H, camera.y + H + 32); y += 32)
    for (let x = x0; x < Math.min(WORLD_W, camera.x + W + 32); x += 32) {
      let n = Math.sin(x * 17 + y * 31) * .5 + .5;
      ctx.fillStyle = n > .8 ? '#292f39' : n > .4 ? '#252b34' : '#222831';
      ctx.fillRect(x, y, 32, 32);
      ctx.fillStyle = '#1a2029';
      ctx.fillRect(x, y, 32, 1);
      ctx.fillRect(x, y, 1, 32);
      if (n > .85) {
        ctx.fillStyle = '#363b45';
        ctx.fillRect(x + 6, y + 7, 9, 2);
        ctx.fillStyle = '#1b2129';
        ctx.fillRect(x + 19, y + 18, 2, 8)
      }
      if ((x > 1440 && x < 1760) || (y > 1040 && y < 1280)) {
        ctx.fillStyle = '#38313c50';
        ctx.fillRect(x + 2, y + 2, 28, 28)
      }
    }
  // Physical perimeter belongs to the world, not to the screen.
  ctx.fillStyle = '#424652';
  ctx.fillRect(0, 0, WORLD_W, 24);
  ctx.fillRect(0, WORLD_H - 24, WORLD_W, 24);
  ctx.fillRect(0, 0, 24, WORLD_H);
  ctx.fillRect(WORLD_W - 24, 0, 24, WORLD_H);
  for (const [rx, ry] of [
      [1600, 1100],
      [640, 640],
      [2560, 640],
      [640, 1792],
      [2560, 1792]
    ]) {
    if (rx < camera.x - 140 || rx > camera.x + W + 140 || ry < camera.y - 140 || ry > camera.y + H + 140) continue;
    ctx.strokeStyle = '#575064';
    ctx.lineWidth = 2;
    for (let r of [90, 108]) {
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.stroke()
    }
    for (let i = 0; i < 8; i++) {
      let a = i * Math.PI / 4;
      ctx.save();
      ctx.translate(rx + Math.cos(a) * 99, ry + Math.sin(a) * 99);
      ctx.rotate(a);
      ctx.fillStyle = '#8b6b94';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore()
    }
  }
  for (let x = 256; x < WORLD_W; x += 384)
    for (let y = 256; y < WORLD_H; y += 384) {
      if (x < camera.x - 30 || x > camera.x + W + 30 || y < camera.y - 30 || y > camera.y + H + 30) continue;
      ctx.fillStyle = '#10151e70';
      ctx.fillRect(x - 12, y, 28, 13);
      ctx.fillStyle = '#504b58';
      ctx.fillRect(x - 7, y - 8, 14, 15);
      ctx.fillStyle = '#e7a76c';
      ctx.fillRect(x - 4, y - 17, 8, 10);
      ctx.fillStyle = '#ffe4a0';
      ctx.fillRect(x - 2, y - 19 + Math.sin(clock * 8 + x) * 2, 4, 7)
    }
}

function drawProjectile(s) {
  if (s.x < camera.x - 80 || s.x > camera.x + W + 80 || s.y < camera.y - 80 || s.y > camera.y + H + 80) return;
  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.lineCap = 'round';
  for (let i = 1; i < s.trail.length; i++) {
    ctx.globalAlpha = i / s.trail.length * .55;
    ctx.lineWidth = Math.max(1, s.r * i / s.trail.length);
    ctx.beginPath();
    ctx.moveTo(s.trail[i - 1].x, s.trail[i - 1].y);
    ctx.lineTo(s.trail[i].x, s.trail[i].y);
    ctx.stroke()
  }
  ctx.translate(s.x, s.y);
  ctx.rotate(Math.atan2(s.vy, s.vx));
  ctx.globalAlpha = .13;
  ctx.fillStyle = s.color;
  ctx.beginPath();
  ctx.arc(0, 0, s.r * 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (!s.enemy && s.r === 8) {
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
    ctx.fillRect(-3, -3, 6, 6)
  } else if (!s.enemy) {
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
    ctx.stroke()
  } else {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(0, 0, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff2d2';
    ctx.fillRect(-2, -2, 3, 3)
  }
  ctx.restore();
}

function drawArea(z) {
  const warm = z.t > 0,
    u = clamp(1 - z.t / z.max, 0, 1),
    color = z.friendly ? '#c5a1ff' : '#ff9670';
  ctx.save();
  ctx.translate(z.x, z.y);
  if (warm) {
    ctx.fillStyle = z.friendly ? '#9b68ec20' : '#ec563026';
    ctx.beginPath();
    ctx.arc(0, 0, z.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = .8;
    ctx.beginPath();
    ctx.arc(0, 0, z.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, z.r + 4, -Math.PI / 2, -Math.PI / 2 + u * Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = .3 + u * .45;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, z.r * (1 - u), 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      let a = i * Math.PI / 4 + (z.friendly ? time * .6 : -time * .3);
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = color;
      ctx.fillRect(z.r * .78, -2, 7, 4);
      ctx.restore()
    }
    ctx.globalAlpha = .7;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.moveTo(0, -7);
    ctx.lineTo(0, 7);
    ctx.stroke();
  } else {
    const fade = clamp(1 + z.t / .65, 0, 1);
    ctx.globalAlpha = fade * .25;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, z.r * .92, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fade * .7;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      let a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
      ctx.lineTo(Math.cos(a + .13) * z.r * .45, Math.sin(a + .13) * z.r * .45);
      ctx.lineTo(Math.cos(a) * z.r * .8, Math.sin(a) * z.r * .8);
      ctx.stroke()
    }
  }
  ctx.restore();
}

function drawFallingSpell(z) {
  if (z.t <= 0 || z.t > z.max) return;
  const u = 1 - z.t / z.max;
  if (z.friendly) {
    let h = (1 - u) * 190,
      x = z.x - h * .35,
      y = z.y - h;
    ctx.save();
    ctx.strokeStyle = '#b798ff';
    ctx.lineWidth = 9;
    ctx.globalAlpha = .3;
    ctx.beginPath();
    ctx.moveTo(x - 24, y - 65);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f1daff';
    ctx.globalAlpha = .8;
    ctx.stroke();
    ctx.fillStyle = '#b88aff';
    ctx.beginPath();
    ctx.arc(x, y, 9 + u * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff0df';
    ctx.fillRect(x - 4, y - 5, 7, 8);
    ctx.restore()
  } else if (u > .7) {
    ctx.save();
    ctx.globalAlpha = (u - .7) * 2;
    ctx.strokeStyle = '#ffbe85';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      let a = i * Math.PI / 2 + .3;
      ctx.beginPath();
      ctx.moveTo(z.x + Math.cos(a) * z.r * .6, z.y + Math.sin(a) * z.r * .6);
      ctx.lineTo(z.x + Math.cos(a) * z.r * .25, z.y + Math.sin(a) * z.r * .25);
      ctx.stroke()
    }
    ctx.restore()
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  drawWorld();
  if (charge && charge.t < charge.wind) {
    ctx.save();
    ctx.strokeStyle = '#ffad7060';
    ctx.lineWidth = 50;
    ctx.beginPath();
    ctx.moveTo(charge.sx, charge.sy);
    ctx.lineTo(charge.tx, charge.ty);
    ctx.stroke();
    ctx.strokeStyle = '#ffbc81';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(charge.tx, charge.ty, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore()
  }
  for (let z of danger) drawArea(z);
  if (b.hp > 0) {
    ctx.fillStyle = '#070c1680';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + 25, 30, 10, 0, 0, 7);
    ctx.fill();
    animatedBoss()
  }
  ctx.fillStyle = '#080b1480';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 14, 14, 5, 0, 0, 7);
  ctx.fill();
  if (p.inv <= 0 || Math.floor(clock * 20) % 2 === 0) animatedMage();
  for (let s of shots) drawProjectile(s);
  for (let z of danger) drawFallingSpell(z);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let w of waves) {
    let u = 1 - w.t / w.max;
    ctx.globalAlpha = (1 - u) * .85;
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 1 + (1 - u) * 5;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r * Math.sqrt(u), 0, Math.PI * 2);
    ctx.stroke()
  }
  for (let f of fx) {
    let alpha = clamp(f.t / f.max, 0, 1),
      size = Math.max(1, (f.size || 3) * Math.sqrt(alpha));
    ctx.globalAlpha = alpha * .18;
    ctx.fillStyle = f.color;
    ctx.fillRect(f.x - size, f.y - size, size * 3, size * 3);
    ctx.globalAlpha = alpha;
    ctx.fillRect(Math.round(f.x), Math.round(f.y), size, size)
  }
  ctx.restore();
  for (let t of texts) text(t.s, t.x, t.y, t.color, 13, 'center');
  ctx.strokeStyle = '#d0bbef';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 7, 0, 7);
  ctx.moveTo(mouse.x - 11, mouse.y);
  ctx.lineTo(mouse.x + 11, mouse.y);
  ctx.moveTo(mouse.x, mouse.y - 11);
  ctx.lineTo(mouse.x, mouse.y + 11);
  ctx.stroke();
  ctx.restore();
  document.getElementById('hpbar').style.width = p.hp + '%';
  document.getElementById('hptext').textContent = `${Math.ceil(p.hp)} / 100 PV`;
  document.getElementById('bossbar').style.width = b.hp / b.max * 100 + '%';
  document.getElementById('bosstext').textContent = `${Math.ceil(b.hp)} / ${b.max} · FASE ${b.phase}`;
  // Direction indicator keeps the boss locatable while exploring.
  let bx = b.x - camera.x,
    by = b.y - camera.y;
  if (b.hp > 0 && (bx < 30 || bx > W - 30 || by < 85 || by > H - 80)) {
    const a = Math.atan2(b.y - p.y, b.x - p.x),
      r = Math.min((W / 2 - 40) / Math.max(.001, Math.abs(Math.cos(a))), (H / 2 - 95) / Math.max(.001, Math.abs(Math.sin(a))));
    let x = W / 2 + Math.cos(a) * Math.max(30, r),
      y = H / 2 + Math.sin(a) * Math.max(30, r);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = '#f0b380';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-7, -7);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    text('BOSS', x, y + 22, '#f0b380', 10, 'center')
  }
  for (let i = 0; i < 4; i++) document.getElementById('cd' + i).style.width = cd[i] / duration[i] * 100 + '%'
}
