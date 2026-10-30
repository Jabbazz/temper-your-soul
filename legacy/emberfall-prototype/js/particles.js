// Emissione delle particelle, impatti, onde e numeri di danno.
// Script classico: condivide lo stato dichiarato in core.js.

function particle(x, y, vx, vy, color, life = .45, size = 3, gravity = 0) {
  if (fx.length >= MAX_PARTICLES) return;
  fx.push({
    x,
    y,
    vx,
    vy,
    t: life,
    max: life,
    color,
    size,
    gravity
  })
}

function burst(x, y, color, n = 16) {
  for (let i = 0; i < n; i++) {
    let a = Math.random() * Math.PI * 2,
      v = 35 + Math.random() * 150;
    particle(x, y, Math.cos(a) * v, Math.sin(a) * v, color, .25 + Math.random() * .45, 2 + Math.random() * 3, 70)
  }
}

function wave(x, y, r, color, life = .4) {
  waves.push({
    x,
    y,
    r,
    color,
    t: life,
    max: life
  });
  if (waves.length > 80) waves.shift()
}

function impact(s) {
  burst(s.x, s.y, s.color, s.r > 6 ? 24 : 9);
  wave(s.x, s.y, s.r > 6 ? 35 : 19, s.color, .28);
  if (!s.enemy && s.r === 8) {
    for (let i = 0; i < 10; i++) {
      let a = i * Math.PI / 5;
      particle(s.x, s.y, Math.cos(a) * 150, Math.sin(a) * 150, '#d5fbff', .45, 4, 30)
    }
  }
}

function detonate(z) {
  const color = z.friendly ? '#cba5ff' : '#ff9c64';
  wave(z.x, z.y, z.r, color, .55);
  wave(z.x, z.y, z.r * .8, '#fff1ce', .3);
  for (let i = 0; i < 65; i++) {
    let a = Math.random() * Math.PI * 2,
      v = 40 + Math.random() * z.r * 2;
    particle(z.x, z.y, Math.cos(a) * v, Math.sin(a) * v - 30, i % 3 === 0 ? '#fff1d7' : color, .35 + Math.random() * .6, 2 + Math.random() * 5, 115)
  }
  for (let i = 0; i < 16; i++) {
    let a = i * Math.PI / 8;
    particle(z.x + Math.cos(a) * z.r * .65, z.y + Math.sin(a) * z.r * .65, Math.cos(a) * 35, Math.sin(a) * 35, color, .7, 3, 0)
  }
}

function label(x, y, s, color) {
  texts.push({
    x,
    y,
    s,
    color,
    t: .9
  })
}
