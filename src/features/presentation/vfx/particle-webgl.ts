import type { Particle } from '../effects';

/** Un vertice per particella; memoria e buffer riutilizzati. Coordinate nello spazio del canvas finale. */
export const PARTICLE_STRIDE = 7;
export const MAX_GPU_PARTICLES = 1400;
export function particleVertices(out: Float32Array, particles: readonly Particle[], transform: { a: number; b: number; c: number; d: number; e: number; f: number }): number {
  let count = 0;
  for (const particle of particles) {
    if (count >= Math.min(MAX_GPU_PARTICLES, Math.floor(out.length / PARTICLE_STRIDE)) || particle.remaining <= 0) continue;
    const alpha = Math.max(0, Math.min(1, particle.remaining / particle.total)), offset = count * PARTICLE_STRIDE;
    const hex = particle.color.replace('#', '');
    out[offset] = transform.a * particle.x + transform.c * particle.y + transform.e;
    out[offset + 1] = transform.b * particle.x + transform.d * particle.y + transform.f;
    out[offset + 2] = Math.max(2, particle.size * Math.sqrt(alpha) * 3 * Math.hypot(transform.a, transform.b));
    out[offset + 3] = parseInt(hex.slice(0, 2), 16) / 255;
    out[offset + 4] = parseInt(hex.slice(2, 4), 16) / 255;
    out[offset + 5] = parseInt(hex.slice(4, 6), 16) / 255;
    out[offset + 6] = alpha;
    count++;
  }
  return count;
}
const VERTEX = `attribute vec2 a_position;attribute float a_size;attribute vec4 a_color;uniform vec2 u_view;varying vec4 v_color;
void main(){vec2 p=a_position/u_view;gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.0,1.0);gl_PointSize=a_size;v_color=a_color;}`;
const FRAGMENT = `precision mediump float;varying vec4 v_color;
void main(){vec2 uv=floor(gl_PointCoord*5.0)/4.0;vec2 p=abs(uv-0.5);float core=1.0-step(0.25,max(p.x,p.y));float glow=(1.0-max(p.x,p.y)*1.5)*0.18;float a=(core+glow)*v_color.a;gl_FragColor=vec4(v_color.rgb*a,a);}`;

class ParticleWebGL {
  readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly buffer: WebGLBuffer;
  private readonly view: WebGLUniformLocation | null;
  private readonly data = new Float32Array(MAX_GPU_PARTICLES * PARTICLE_STRIDE);
  private lost = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    const gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL non disponibile');
    this.gl = gl;
    const shader = (type: number, source: string): WebGLShader => {
      const result = gl.createShader(type); if (!result) throw new Error('Shader non disponibile');
      gl.shaderSource(result, source); gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) { gl.deleteShader(result); throw new Error('Compilazione shader fallita'); }
      return result;
    };
    const vertex = shader(gl.VERTEX_SHADER, VERTEX), fragment = shader(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram(); if (!program) throw new Error('Programma WebGL non disponibile');
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Collegamento shader fallito');
    this.program = program;
    const buffer = gl.createBuffer(); if (!buffer) throw new Error('Buffer non disponibile');
    this.buffer = buffer; gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    for (const [name, size, offset] of [['a_position', 2, 0], ['a_size', 1, 2], ['a_color', 4, 3]] as const) {
      const location = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, PARTICLE_STRIDE * 4, offset * 4);
    }
    this.view = gl.getUniformLocation(program, 'u_view'); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    this.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); this.lost = true; });
  }
  draw(ctx: CanvasRenderingContext2D, particles: readonly Particle[]): boolean {
    if (this.lost || this.gl.isContextLost()) return false;
    const { gl, canvas } = this;
    if (canvas.width !== ctx.canvas.width || canvas.height !== ctx.canvas.height) { canvas.width = ctx.canvas.width; canvas.height = ctx.canvas.height; }
    gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(this.program);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const count = particleVertices(this.data, particles, ctx.getTransform());
    if (count === 0) return true;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data.subarray(0, count * PARTICLE_STRIDE));
    gl.uniform2f(this.view, canvas.width, canvas.height); gl.drawArrays(gl.POINTS, 0, count);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(canvas, 0, 0); ctx.restore(); return true;
  }
}
const renderers = new WeakMap<HTMLCanvasElement, ParticleWebGL | null>();
/** Se manca WebGL, la scena continua con le particelle Canvas 2D esistenti. */
export function drawWebGLParticles(ctx: CanvasRenderingContext2D, particles: readonly Particle[]): boolean {
  if (typeof document === 'undefined' || !ctx.canvas || !ctx.getTransform) return false;
  let renderer = renderers.get(ctx.canvas);
  if (renderer === undefined) {
    try { renderer = new ParticleWebGL(); } catch { renderer = null; }
    renderers.set(ctx.canvas, renderer);
  }
  return renderer?.draw(ctx, particles) ?? false;
}
