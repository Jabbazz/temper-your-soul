// Simulazione per fotogramma: movimento, collisioni, cooldown ed effetti.
// Script classico: condivide lo stato dichiarato in core.js.

function update(dt) {
  clock += dt;
  if (state !== 'play') return;
  time += dt;
  mageCast = Math.max(0, mageCast - dt);
  bossCast = Math.max(0, bossCast - dt);
  p.inv = Math.max(0, p.inv - dt);
  b.slow = Math.max(0, b.slow - dt);
  cd = cd.map(v => Math.max(0, v - dt));
  let dx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0),
    dy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0),
    len = Math.hypot(dx, dy) || 1;
  p.x = clamp(p.x + dx / len * 177 * dt, 40, WORLD_W - 40);
  p.y = clamp(p.y + dy / len * 177 * dt, 40, WORLD_H - 40);
  syncCamera();
  mageMoving = !!(dx || dy);
  if (mageMoving) mageWalk += dt * 9;
  else mageWalk = 0;
  if (mouse.left) cast(0);
  if (mouse.right) cast(1);
  if (keys.q) cast(2);
  if (keys.e) cast(3);
  if (b.hp < b.max / 2 && b.phase === 1) {
    b.phase = 2;
    label(b.x, b.y - 48, 'IL GUARDIANO SI INFURIA', '#ff785d');
    burst(b.x, b.y, '#ff735b', 40);
    shake = 6
  }
  if (!charge) {
    let a = Math.atan2(p.y - b.y, p.x - b.x),
      d = dist(p, b),
      speed = (b.slow ? 30 : 100);
    if (d > 180) {
      b.x += Math.cos(a) * speed * dt;
      b.y += Math.sin(a) * speed * dt
    } else {
      b.x += Math.cos(a + Math.PI / 2) * speed * .38 * dt;
      b.y += Math.sin(a + Math.PI / 2) * speed * .38 * dt
    }
    b.x = clamp(b.x, 60, WORLD_W - 60);
    b.y = clamp(b.y, 60, WORLD_H - 60);
  }
  updateBossMoves(dt);
  if (dist(p, b) < 29) hurt(18);
  next -= dt;
  if (next <= 0 && !charge && volleys.length === 0) {
    bossAttack();
    next = b.phase === 2 ? 1.65 : 2.15
  }
  for (let s of shots) {
    s.emit += dt;
    while (s.emit >= .025) {
      s.emit -= .025;
      s.trail.push({
        x: s.x,
        y: s.y
      });
      if (s.trail.length > 9) s.trail.shift();
      if (s.x > camera.x - 50 && s.x < camera.x + W + 50 && s.y > camera.y - 50 && s.y < camera.y + H + 50) particle(s.x + (Math.random() - .5) * s.r, s.y + (Math.random() - .5) * s.r, -s.vx * .07 + (Math.random() - .5) * 22, -s.vy * .07 + (Math.random() - .5) * 22, s.color, .18 + Math.random() * .16, s.enemy ? 2 : 3)
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.enemy) {
      if (dist(s, p) < s.r + 9) {
        hurt(s.dmg);
        impact(s);
        s.life = 0
      }
    } else if (dist(s, b) < s.r + 26) {
      hitBoss(s.dmg);
      if (s.r === 8) b.slow = 2;
      impact(s);
      s.life = 0
    }
    if (s.x < 24 || s.x > WORLD_W - 24 || s.y < 24 || s.y > WORLD_H - 24) s.life = 0
  }
  shots = shots.filter(s => s.life > 0);
  for (let z of danger) {
    z.t -= dt;
    if (z.t <= 0 && !z.done) {
      z.done = true;
      detonate(z);
      if (z.friendly) {
        if (dist(z, b) < z.r + 25) hitBoss(210)
      } else if (dist(z, p) < z.r + 8) hurt(24);
      shake = 3
    }
  }
  danger = danger.filter(z => z.t > -.65);
  for (let f of fx) {
    f.t -= dt;
    f.vy += (f.gravity || 0) * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vx *= Math.exp(-dt * 1.8)
  }
  fx = fx.filter(f => f.t > 0);
  for (let w of waves) w.t -= dt;
  waves = waves.filter(w => w.t > 0);
  for (let t of texts) {
    t.y -= 25 * dt;
    t.t -= dt
  }
  texts = texts.filter(t => t.t > 0);
  shake = Math.max(0, shake - dt * 25)
}
