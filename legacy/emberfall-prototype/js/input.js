// Mouse, tastiera, ridimensionamento e schermo intero.
// Script classico: condivide lo stato dichiarato in core.js.

function resizeArena() {
  const stage = canvas.parentElement;
  W = Math.max(1, Math.round(stage.clientWidth / ZOOM));
  H = Math.max(1, Math.round(stage.clientHeight / ZOOM));
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false;
  syncCamera()
}
new ResizeObserver(resizeArena).observe(canvas.parentElement);
window.addEventListener('resize', resizeArena);
resizeArena();
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen()
  } catch {
    document.getElementById('fullscreen').textContent = 'Usa F11 nel browser'
  }
}
document.getElementById('fullscreen').onclick = toggleFullscreen;
document.addEventListener('fullscreenchange', () => {
  document.getElementById('fullscreen').textContent = document.fullscreenElement ? 'Esci da schermo intero · F' : 'Schermo intero · F';
  resizeArena()
});
document.getElementById('start').onclick = () => state === 'paused' ? pause() : reset();
document.getElementById('pause').onclick = pause;
window.addEventListener('keydown', e => {
  let k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'q', 'e', ' '].includes(k)) e.preventDefault();
  keys[k] = true;
  if (e.repeat) return;
  if (k === 'q') cast(2);
  if (k === 'e') cast(3);
  if (k === 'f') toggleFullscreen();
  if (k === 'escape') pause();
  if (k === 'r') reset();
  if (k === 'm') {
    audio = !audio;
    document.getElementById('sound').textContent = audio ? 'Audio attivo · M' : 'Audio disattivato · M';
    tone(500)
  }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function aim(e) {
  let r = canvas.getBoundingClientRect();
  mouse.sx = (e.clientX - r.left) * W / r.width;
  mouse.sy = (e.clientY - r.top) * H / r.height;
  syncAim()
}
// mousedown fires for every button in a chord; pointerdown only fires for the first.
canvas.addEventListener('mousemove', e => {
  aim(e);
  mouse.left = !!(e.buttons & 1);
  mouse.right = !!(e.buttons & 2)
});
canvas.addEventListener('mousedown', e => {
  e.preventDefault();
  canvas.focus();
  aim(e);
  mouse.left = !!(e.buttons & 1);
  mouse.right = !!(e.buttons & 2);
  if (e.button === 0) cast(0);
  if (e.button === 2) cast(1)
});
window.addEventListener('mouseup', e => {
  mouse.left = !!(e.buttons & 1);
  mouse.right = !!(e.buttons & 2)
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('blur', () => {
  if (state === 'play') pause()
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'play') pause()
});
