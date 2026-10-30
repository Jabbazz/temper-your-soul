// Sei schemi di attacco e sequenze temporizzate del guardiano.
// Script classico: condivide lo stato dichiarato in core.js.

function bossAttack() {
  bossCast = .5;
  pattern++;
  let a = Math.atan2(p.y - b.y, p.x - b.x),
    rage = b.phase === 2;
  switch ((pattern - 1) % 6) {
    case 0:
      for (let j = 0; j < (rage ? 2 : 1); j++)
        for (let i = 0; i < 16; i++) shot(b.x, b.y, i * Math.PI / 8 + time * .2 + j * .12, 105 + j * 40, true, 12, 5, '#ee9867');
      label(b.x, b.y - 42, 'NOVA DI BRACE', '#eeb184');
      break;
    case 1:
      for (let i = -3; i <= 3; i++) shot(b.x, b.y, a + i * .15, rage ? 205 : 165, true, 15, 6, '#f2c56e');
      label(b.x, b.y - 42, 'RAFFICA', '#eeb184');
      break;
    case 2:
      for (let i = 0; i < (rage ? 5 : 3); i++) danger.push({
        x: clamp(p.x + (i ? (Math.random() - .5) * 450 : 0), 60, WORLD_W - 60),
        y: clamp(p.y + (i ? (Math.random() - .5) * 350 : 0), 60, WORLD_H - 60),
        r: 42,
        t: 1.15,
        max: 1.15,
        friendly: false
      });
      label(b.x, b.y - 42, 'FRATTURA', '#eeb184');
      break;
    case 3:
      charge = {
        sx: b.x,
        sy: b.y,
        tx: clamp(p.x, 60, WORLD_W - 60),
        ty: clamp(p.y, 60, WORLD_H - 60),
        t: 0,
        wind: .95,
        duration: .48
      };
      bossCast = .95;
      label(b.x, b.y - 45, 'CARICA · SPOSTATI!', '#ffb177');
      break;
    case 4:
      for (let i = 0; i < (rage ? 22 : 16); i++) volleys.push({
        delay: i * .085,
        angle: a + i * .29,
        type: 'spiral'
      });
      label(b.x, b.y - 45, 'SPIRALE DEL VUOTO', '#c9a6ff');
      break;
    case 5:
      for (let i = 0; i < 3; i++) volleys.push({
        delay: .5 + i * .38,
        angle: a + (i - 1) * .25,
        type: 'fan'
      });
      bossCast = .5;
      label(b.x, b.y - 45, 'TRIPLICE VENTAGLIO', '#ffc97e');
      break;
  }
}

function updateBossMoves(dt) {
  if (charge) {
    charge.t += dt;
    if (charge.t >= charge.wind) {
      let u = clamp((charge.t - charge.wind) / charge.duration, 0, 1);
      b.x = charge.sx + (charge.tx - charge.sx) * u;
      b.y = charge.sy + (charge.ty - charge.sy) * u;
      burst(b.x, b.y, '#d89865', 2);
      if (dist(p, b) < 37) hurt(25);
      if (u === 1) {
        burst(b.x, b.y, '#ffb06b', 24);
        shake = 5;
        charge = null
      }
    }
  }
  for (let v of volleys) {
    v.delay -= dt;
    if (v.delay <= 0 && !v.done) {
      v.done = true;
      if (v.type === 'spiral') {
        for (let k = 0; k < 3; k++) shot(b.x, b.y, v.angle + k * Math.PI * 2 / 3, b.phase === 2 ? 155 : 125, true, 10, 4, '#c49af5')
      } else {
        for (let k = -2; k <= 2; k++) shot(b.x, b.y, v.angle + k * .13, 185, true, 14, 5, '#ffcf83');
        bossCast = .18
      }
    }
  }
  volleys = volleys.filter(v => !v.done);
}
