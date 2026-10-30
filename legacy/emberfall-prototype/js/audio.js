// Sintesi dei suoni con Web Audio: nessun file audio esterno.
// Script classico: condivide lo stato dichiarato in core.js.

function tone(f, d = .08) {
  if (!audio) return;
  try {
    ac ??= new(window.AudioContext || window.webkitAudioContext)();
    let o = ac.createOscillator(),
      g = ac.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, ac.currentTime);
    g.gain.setValueAtTime(.035, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + d);
    o.connect(g);
    g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + d)
  } catch {}
}
