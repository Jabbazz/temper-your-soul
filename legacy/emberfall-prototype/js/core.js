// Configurazione, stato condiviso, coordinate del mondo e telecamera.
// Script classico: condivide lo stato dichiarato in core.js.

'use strict';
const canvas = document.getElementById('game'),
  ctx = canvas.getContext('2d'),
  overlay = document.getElementById('overlay');
const WORLD_W = 3200,
  WORLD_H = 2400,
  ZOOM = 1.5;
let W = 960,
  H = 540;
const camera = {
    x: 0,
    y: 0
  },
  keys = {},
  mouse = {
    x: 1600,
    y: 1000,
    sx: 480,
    sy: 230,
    left: false,
    right: false
  },
  duration = [.2, 2.4, 5, 3.5];

function syncCamera() {
  if (!p) return;
  camera.x = p.x - W / 2;
  camera.y = p.y - H / 2;
  syncAim()
}

function syncAim() {
  mouse.x = camera.x + mouse.sx;
  mouse.y = camera.y + mouse.sy
}
let mageWalk = 0,
  mageMoving = false,
  mageCast = 0,
  bossCast = 0;
let charge = null,
  volleys = [],
  waves = [];
const MAX_PARTICLES = 1400;
let state = 'menu',
  p, b, shots = [],
  danger = [],
  fx = [],
  texts = [],
  time = 0,
  clock = 0,
  cd = [0, 0, 0, 0],
  pattern = 0,
  next = 2,
  shake = 0,
  audio = false,
  ac;
const clamp = (x, a, z) => Math.max(a, Math.min(z, x)),
  dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
