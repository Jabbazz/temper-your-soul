// Danni, proiettili e quattro abilità del mago.
// Script classico: condivide lo stato dichiarato in core.js.

function hitBoss(d) {
  if (b.hp <= 0) return;
  b.hp = Math.max(0, b.hp - d);
  label(b.x + (Math.random() - .5) * 30, b.y - 30, d, '#ffe7a9');
  burst(b.x, b.y, '#d8a5fa', 5);
  if (!b.hp) {
    burst(b.x, b.y, '#ffd17f', 90);
    end(true)
  }
}

function hurt(d) {
  if (p.inv > 0 || state !== 'play') return;
  p.hp = Math.max(0, p.hp - d);
  p.inv = .65;
  shake = 5;
  label(p.x, p.y - 20, '−' + d, '#ff8e83');
  tone(100, .15);
  if (!p.hp) end(false)
}

function shot(x, y, a, s, enemy, dmg, r, color, life = 5) {
  shots.push({
    trail: [],
    emit: 0,
    x,
    y,
    vx: Math.cos(a) * s,
    vy: Math.sin(a) * s,
    enemy,
    dmg,
    r,
    color,
    life
  })
}

function cast(i) {
  if (state !== 'play' || cd[i] > 0) return;
  syncAim();
  cd[i] = duration[i];
  mageCast = .16;
  let a = Math.atan2(mouse.y - p.y, mouse.x - p.x);
  if (i < 2) {
    shot(p.x, p.y - 7, a, i ? 310 : 440, false, i ? 100 : 19, i ? 8 : 4, i ? '#8be9fa' : '#c1a4ff', 2.5);
    burst(p.x + Math.cos(a) * 14, p.y - 7 + Math.sin(a) * 14, i ? '#a5efff' : '#c8a7ff', 8);
    wave(p.x, p.y - 7, 16, i ? '#a5efff' : '#c8a7ff', .18);
    tone(i ? 320 : 650)
  }
  if (i === 2) {
    danger.push({
      x: clamp(mouse.x, 40, WORLD_W - 40),
      y: clamp(mouse.y, 40, WORLD_H - 40),
      r: 66,
      t: .65,
      max: .65,
      friendly: true
    });
    tone(180, .2)
  }
  if (i === 3) {
    const ox = p.x,
      oy = p.y;
    burst(p.x, p.y, '#b8a4ef');
    wave(p.x, p.y, 24, '#b8a4ef');
    p.x = clamp(p.x + Math.cos(a) * 125, 40, WORLD_W - 40);
    p.y = clamp(p.y + Math.sin(a) * 125, 40, WORLD_H - 40);
    for (let j = 0; j < 30; j++) {
      let u = j / 30;
      particle(ox + (p.x - ox) * u, oy + (p.y - oy) * u, (Math.random() - .5) * 25, (Math.random() - .5) * 25, '#c6acff', .25 + u * .3, 2 + Math.random() * 3)
    }
    wave(p.x, p.y, 28, '#dfccff');
    syncCamera();
    p.inv = .55;
    burst(p.x, p.y, '#b8a4ef');
    tone(850, .15)
  }
}
