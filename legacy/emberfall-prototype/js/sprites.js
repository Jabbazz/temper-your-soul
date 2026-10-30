// Pixel art originale definita come matrici di caratteri e fotogrammi animati.
// Script classico: condivide lo stato dichiarato in core.js.

const mage = ['....aa......', '...abba.....', '..abbbba....', '.abbbbba....', 'aaaaaaa.....', '..cssc..d...', '..cssc..de..', '...ff...d...', '..fggf..d...', '.ffggff.d...', '.fggggf.d...', '..gggg..d...', '..g..g......', '.cc..cc.....'];
const guardian = ['....aa....aa....', '...abba..abba...', '...abbbbbbbba...', '..abbbbbbbbbba..', '.abccbbbbcccbba.', '.abbcbbbbbcbbba.', '..abbbddbbbba...', '...abddddbba....', '..aabbbbbbaa....', '.aeeebbbbeeea...', 'aeeeebbbbeeeea..', 'aeeefbbbbfeeea..', '.aafbbddbbfaa...', '...fbbddbbf.....', '..ffbbbbbbff....', '..ff......ff....', '.aaa......aaa...'];
// Hand-drawn pixel frames: alternating feet, robe, sleeves and staff positions.
const mageFrames = [mage,
  ['....aa......', '...abba.....', '..abbbba....', '.abbbbba....', 'aaaaaaa.....', '..cssc...d..', '..cssc...de.', '...ff....d..', '..fggff..d..', '.ffgggf..d..', '..ggggf..d..', '..gggg...d..', '.gg..g......', '.cc...cc....'],
  mage,
  ['....aa......', '...abba.....', '..abbbba....', '.abbbbba....', 'aaaaaaa.....', '..cssc.d....', '..cssc.de...', '...ff..d....', '.ffggf.d....', '.fgggffd....', '.fgggg.d....', '..gggg.d....', '..g..gg.....', '..cc..cc....']
];
const mageCasting = ['....aa......', '...abba.....', '..abbbba....', '.abbbbba..e.', 'aaaaaaa..dd.', '..cssc...d..', '..cssc.ffd..', '...ffff..d..', '..fggf...d..', '.ffggf......', '.fggggf.....', '..gggg......', '..g..g......', '.cc..cc.....'];
const bossFrames = [guardian,
  guardian.map((row, i) => i === 14 ? '..fffbbbbff.....' : i === 15 ? '...ff....fff....' : i === 16 ? '..aaa...aaa.....' : row),
  guardian,
  guardian.map((row, i) => i === 14 ? '...ffbbbbfff....' : i === 15 ? '..fff....ff.....' : i === 16 ? '.aaa......aaa...' : row)
];
const bossCasting = guardian.map((row, i) => i === 7 ? 'aeeabddddbbaeea.' : i === 8 ? 'aeeabbbbbbaaeea.' : i === 9 ? '.aeeebbbbeeea...' : i === 10 ? '..aeebbbbeea....' : row);

function animatedMage() {
  const f = Math.floor(mageWalk) % 4,
    facing = mouse.x < p.x ? -1 : 1;
  ctx.save();
  ctx.translate(Math.round(p.x), Math.round(p.y));
  ctx.scale(facing, 1);
  sprite(mageCast > 0 ? mageCasting : mageFrames[f], 0, mageMoving && f % 2 ? -1 : 0, 2, {
    a: '#302646',
    b: '#a485dc',
    c: '#262638',
    s: '#efcba9',
    d: '#a38256',
    e: '#a2e8ef',
    f: '#694795',
    g: '#8d65be'
  });
  if (mageCast > 0) {
    ctx.fillStyle = Math.floor(time * 35) % 2 ? '#f0dcff' : '#b39cff';
    ctx.fillRect(9, -13, 5, 5)
  }
  ctx.restore();
}

function animatedBoss() {
  const f = Math.floor(time * (b.slow ? 2 : 5)) % 4;
  ctx.save();
  ctx.translate(Math.round(b.x), Math.round(b.y));
  ctx.scale(p.x < b.x ? -1 : 1, 1);
  sprite(bossCast > 0 ? bossCasting : bossFrames[f], 0, bossCast > 0 ? -3 : (f % 2 ? -1 : 1), 3, {
    a: '#141823',
    b: b.slow ? '#658999' : '#777783',
    c: b.phase === 2 ? '#ff755d' : '#ffd38b',
    d: '#dca375',
    e: '#555461',
    f: '#424753'
  });
  if (bossCast > 0) {
    ctx.fillStyle = b.phase === 2 ? '#ff795a' : '#ffd38b';
    for (let i of [-1, 1]) {
      ctx.fillRect(i * 25 - 3, -13, 6, 6);
      ctx.fillRect(i * 29 - 1, -20, 3, 3)
    }
  }
  ctx.restore();
}

function sprite(data, x, y, scale, palette) {
  data.forEach((row, j) => [...row].forEach((v, i) => {
    if (palette[v]) {
      ctx.fillStyle = palette[v];
      ctx.fillRect(Math.round(x + (i - row.length / 2) * scale), Math.round(y + (j - data.length / 2) * scale), scale, scale)
    }
  }))
}
