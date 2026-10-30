import { Camera, ZOOM } from './core/camera';
import { Input, SKILL_ACTIONS } from './core/input';
import { SeededRng } from './core/rng';
import { Vec2 } from './core/vec2';
import { AudioPlayer } from './features/audio/audio-player';
import { Match, type PlayerIntent } from './features/match/match';
import { Effects } from './features/presentation/effects';
import { ActorPoses } from './features/presentation/poses';
import { renderScene } from './features/presentation/scene-renderer';
import { MAGE_SKILLS } from './features/skills/mage-skills';
import { requireElement } from './features/ui/dom';
import { FullscreenToggle } from './features/ui/fullscreen';
import { Hud } from './features/ui/hud';
import { Overlay } from './features/ui/overlay';

/** Passo fisso della simulazione: la logica gira a 60 Hz qualunque sia la frequenza di disegno. */
const STEP = 1 / 60;
/** Tempo massimo simulato in un singolo fotogramma: dopo una pausa (scheda in background) non si recupera tutto. */
const MAX_FRAME_TIME = 0.25;

/** Schermata corrente dell'applicazione. La partita avanza solo in `playing`. */
type Screen = 'menu' | 'playing' | 'paused' | 'ended';

/**
 * Applicazione: collega canvas, input, interfaccia, audio e rappresentazione alla partita, e fa girare il ciclo
 * (simulazione a passo fisso, disegno a ogni fotogramma). Non contiene regole di gioco.
 */
export class Game {
  private readonly input = new Input();
  private readonly camera = new Camera();
  private readonly effects = new Effects();
  private readonly poses = new ActorPoses();
  private readonly audio = new AudioPlayer();
  private readonly hud = new Hud();
  private readonly overlay = new Overlay();
  private readonly fullscreen: FullscreenToggle;
  private readonly ctx: CanvasRenderingContext2D;

  private match: Match;
  private screen: Screen = 'menu';
  private accumulator = 0;
  private lastTime = 0;
  private clock = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('Canvas 2D non disponibile in questo browser');
    this.ctx = ctx;
    this.fullscreen = new FullscreenToggle(() => this.resize());
    this.match = this.createMatch();
    this.hud.buildSkills(MAGE_SKILLS);
  }

  start(): void {
    this.input.attach(this.canvas);
    this.input.actionPressed.connect((action) => {
      if (action === 'pause') this.togglePause();
      else if (action === 'restart') this.startMatch();
      else if (action === 'toggle_audio') this.toggleAudio();
      else if (action === 'toggle_fullscreen') void this.fullscreen.toggle();
    });
    requireElement('pause-button').addEventListener('click', () => this.togglePause());
    this.overlay.onPrimary(() => (this.screen === 'paused' ? this.togglePause() : this.startMatch()));
    window.addEventListener('blur', () => this.pauseIfPlaying());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pauseIfPlaying();
    });
    new ResizeObserver(() => this.resize()).observe(this.canvas.parentElement ?? this.canvas);
    window.addEventListener('resize', () => this.resize());
    this.resize();

    this.overlay.showMenu();
    this.hud.update(this.match);
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.frame(time));
  }

  /** Nuova partita: sostituisce quella corrente, azzera effetti e input e passa al gioco. */
  private startMatch(): void {
    this.match = this.createMatch();
    this.effects.clear();
    this.poses.reset();
    this.input.releaseAll();
    this.screen = 'playing';
    this.overlay.hide();
    this.camera.follow(this.match.player.position);
    this.hud.update(this.match);
    this.canvas.focus();
  }

  private createMatch(): Match {
    const match = new Match(new SeededRng(Math.floor(Math.random() * 0x100000000)));
    match.events.connect((event) => {
      this.effects.handle(event);
      this.poses.handle(event);
      this.audio.handle(event);
      if (event.type === 'match_ended') this.onMatchEnded(event.won);
    });
    return match;
  }

  private onMatchEnded(won: boolean): void {
    this.screen = 'ended';
    this.input.releaseAll();
    this.overlay.showEnded(won, this.match.time, this.match.player.health.current);
  }

  private togglePause(): void {
    if (this.screen === 'playing') {
      this.screen = 'paused';
      this.overlay.showPaused();
    } else if (this.screen === 'paused') {
      this.screen = 'playing';
      this.overlay.hide();
      this.canvas.focus();
    } else {
      return;
    }
    this.input.releaseAll();
  }

  private pauseIfPlaying(): void {
    if (this.screen === 'playing') this.togglePause();
  }

  private toggleAudio(): void {
    const enabled = this.audio.toggle();
    requireElement('audio-state').textContent = enabled ? 'Audio attivo · M' : 'Audio disattivato · M';
  }

  /** La vista e' la finestra divisa per lo zoom: il canvas ha risoluzione ridotta e il CSS lo ingrandisce a scatti. */
  private resize(): void {
    const stage = this.canvas.parentElement ?? this.canvas;
    this.camera.setViewSize(stage.clientWidth / ZOOM, stage.clientHeight / ZOOM);
    this.canvas.width = this.camera.width;
    this.canvas.height = this.camera.height;
    this.ctx.imageSmoothingEnabled = false;
    this.camera.follow(this.match.player.position);
  }

  private readIntent(): PlayerIntent {
    return {
      move: this.input.getVector('move_left', 'move_right', 'move_up', 'move_down'),
      aimOffset: this.camera.pointerOffset(this.input.pointer),
      skills: SKILL_ACTIONS.map((action) => this.input.isActionActive(action)),
    };
  }

  private step(): void {
    const { match } = this;
    if (this.screen === 'playing' || this.screen === 'ended') {
      this.poses.update(STEP, match.player.moving);
      this.effects.update(STEP, match, this.camera);
    }
    if (this.screen === 'playing') {
      match.step(STEP, this.readIntent());
      this.input.takeLatched();
    } else if (this.screen === 'menu') {
      // Dietro il menu la mira segue comunque il mouse, cosi' il mirino e' al suo posto appena si entra.
      match.player.aim = match.player.position.add(this.camera.pointerOffset(this.input.pointer));
    }
    this.camera.follow(match.player.position);
  }

  private frame(time: number): void {
    const delta = Math.min((time - this.lastTime) / 1000, MAX_FRAME_TIME);
    this.lastTime = time;
    this.clock += delta;
    this.accumulator += delta;
    while (this.accumulator >= STEP) {
      this.step();
      this.accumulator -= STEP;
    }
    this.camera.shakeOffset =
      this.screen === 'playing' || this.screen === 'ended' ? this.effects.shakeOffset() : Vec2.ZERO;
    this.hud.update(this.match);
    renderScene(this.ctx, {
      match: this.match,
      effects: this.effects,
      poses: this.poses,
      camera: this.camera,
      clock: this.clock,
    });
    requestAnimationFrame((next) => this.frame(next));
  }
}
