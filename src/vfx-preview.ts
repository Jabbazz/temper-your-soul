import { familyById } from './features/items/item-families';
import { drawCanvasParticles } from './features/presentation/draw-effects';
import { VFX_IDS, PIXELLAB_MANIFEST, GENERATED_ITEM_ICONS, drawVfx } from './features/presentation/vfx/assets';
import { drawWebGLParticles } from './features/presentation/vfx/particle-webgl';
import type { Particle } from './features/presentation/effects';
const root = document.querySelector('#effects')!;
const gpu = document.querySelector<HTMLInputElement>('#gpu')!;
const backendLabel = document.querySelector('#backend')!;
const playback = document.querySelector<HTMLButtonElement>('#playback')!;
let playing = true;
playback.addEventListener('click', () => { playing = !playing; playback.textContent = playing ? 'Ferma al fotogramma 5' : 'Riprendi animazione'; });
const labels: Record<typeof VFX_IDS[number], string> = {
  'warrior-cleave':'Fendente provocatorio', 'warrior-guard':'Parata del baluardo', 'warrior-fortify':'Secondo fiato', 'warrior-rush':'Carica del guerriero',
  'mage-fireball':'Dardo di fuoco', 'mage-water-orb':'Globo d’acqua', 'mage-earth-wisp':'Luci della terra', 'mage-wind-orb':'Dardo del vento',
  'mage-fire-explosion':'Esplosione di fuoco', 'mage-water-explosion':'Marea gelida', 'mage-earth-aura':'Patto della terra', 'mage-blink':'Traslazione esplosiva',
  'archer-arrow':'Freccia del cacciatore', 'archer-predator':'Istinto predatorio', 'archer-summon':'Evocazione del lupo', 'archer-dash':'Passo del cacciatore',
};
const previews = VFX_IDS.map(id => {
  const card = document.createElement('article'), title = document.createElement('h2'), canvas = document.createElement('canvas');
  title.textContent = labels[id]; canvas.width = canvas.height = 192; card.append(title, canvas); root.append(card);
  return { id, ctx: canvas.getContext('2d')! };
});
for (const [id, url] of Object.entries(GENERATED_ITEM_ICONS)) {
  const figure = document.createElement('figure'), image = document.createElement('img'), caption = document.createElement('figcaption');
  image.src = url; image.alt = familyById(id)?.name ?? id; caption.textContent = image.alt; figure.append(image, caption); document.querySelector('#items')!.append(figure);
}
const particles: Particle[] = Array.from({length: 28}, () => ({x:0,y:0,vx:0,vy:0,remaining:1,total:1,color:'#f6ca83',size:0.8,gravity:0}));
function frame(now: number): void {
  const time = playing ? now / 1000 : 4 / 24;
  for (const { id, ctx } of previews) {
    ctx.clearRect(0, 0, 192, 192);
    const asset = PIXELLAB_MANIFEST.effects[id];
    const duration = asset ? asset.frames.length / asset.fps : 0.5;
    drawVfx(ctx, id, 96, 96, 176, asset?.loop ? time : time % (duration + 0.35));
    // Un solo contesto GPU per lo studio; le restanti carte mostrano gli atlanti puri.
    if (id === 'warrior-cleave') {
      particles.forEach((p, i) => { const age = (time + i / 28) % 1; const a = i * 2.4; p.x=96+Math.cos(a)*age*78; p.y=96+Math.sin(a)*age*78; p.remaining=1-age; });
      const webgl = gpu.checked && drawWebGLParticles(ctx, particles);
      if (!webgl) drawCanvasParticles(ctx, particles);
      document.body.dataset.particleBackend = webgl ? 'webgl' : 'canvas2d';
      backendLabel.textContent = webgl ? 'WebGL attivo' : 'Canvas 2D attivo';
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
