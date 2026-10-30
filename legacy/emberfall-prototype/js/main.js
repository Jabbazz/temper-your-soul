// Stato iniziale e ciclo requestAnimationFrame. Caricare per ultimo.
// Script classico: condivide lo stato dichiarato in core.js.

p = {
  x: 1600,
  y: 1350,
  hp: 100,
  inv: 0
};
b = {
  x: 1600,
  y: 1100,
  hp: 1800,
  max: 1800,
  slow: 0,
  phase: 1
};
syncCamera();
let last = performance.now();

function frame(now) {
  let dt = Math.min((now - last) / 1000, .033);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame);
