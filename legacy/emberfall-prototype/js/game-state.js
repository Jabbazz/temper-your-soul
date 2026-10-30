// Avvio, riavvio, pausa, vittoria e sconfitta.
// Script classico: condivide lo stato dichiarato in core.js.

function reset() {
  waves = [];
  charge = null;
  volleys = [];
  mageWalk = 0;
  mageMoving = false;
  mageCast = 0;
  bossCast = 0;
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
  shots = [];
  danger = [];
  fx = [];
  texts = [];
  time = 0;
  next = 1.8;
  pattern = 0;
  cd = [0, 0, 0, 0];
  state = 'play';
  overlay.classList.add('hidden');
  mouse.left = mouse.right = false;
  Object.keys(keys).forEach(k => keys[k] = false);
  syncCamera();
  canvas.focus()
}

function end(win) {
  state = win ? 'win' : 'dead';
  mouse.left = mouse.right = false;
  document.getElementById('tag').textContent = win ? 'DUNGEON COMPLETATO' : 'LA CRIPTA TI HA TRATTENUTO';
  document.getElementById('title').textContent = win ? 'Il guardiano è caduto.' : 'La brace si è spenta.';
  document.getElementById('desc').textContent = win ? `Hai sconfitto il guardiano in ${Math.floor(time)} secondi. Vita rimasta: ${Math.ceil(p.hp)}. Prova ancora per migliorare il tempo.` : 'Schiva le zone rosse e usa Passo astrale per attraversare le raffiche. Il gelo rallenta il guardiano.';
  document.getElementById('start').textContent = 'Riprova →';
  overlay.classList.remove('hidden')
}

function pause() {
  if (state === 'play') {
    state = 'paused';
    document.getElementById('title').textContent = 'Il tempo si ferma.';
    document.getElementById('tag').textContent = 'PAUSA';
    document.getElementById('desc').textContent = 'Riprendi quando sei pronto.';
    document.getElementById('start').textContent = 'Riprendi →';
    overlay.classList.remove('hidden')
  } else if (state === 'paused') {
    state = 'play';
    overlay.classList.add('hidden');
    canvas.focus()
  }
  mouse.left = mouse.right = false;
  Object.keys(keys).forEach(k => keys[k] = false)
}
