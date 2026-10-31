import { Camera, ZOOM } from './core/camera';
import { Input, SKILL_ACTIONS } from './core/input';
import { SeededRng } from './core/rng';
import { Vec2 } from './core/vec2';
import { AudioPlayer } from './features/audio/audio-player';
import type { Character } from './features/character/character';
import { browserStorage, SaveStore, type LoadStatus } from './features/character/save-store';
import { CRYPT } from './features/dungeons/crypt';
import type { DungeonDefinition } from './features/dungeons/dungeon-definition';
import { lootTableFor } from './features/loot/loot-tables';
import { rollLoot } from './features/loot/roll-loot';
import { Match, type PlayerIntent } from './features/match/match';
import { Effects } from './features/presentation/effects';
import { ActorPoses } from './features/presentation/poses';
import { renderScene } from './features/presentation/scene-renderer';
import { DungeonSelect } from './features/ui/dungeon-select';
import { requireElement } from './features/ui/dom';
import { FullscreenToggle } from './features/ui/fullscreen';
import { Hud } from './features/ui/hud';
import { InventoryScreen } from './features/ui/inventory-screen';
import { renderLoot } from './features/ui/loot-view';
import { MainMenu } from './features/ui/main-menu';
import { Overlay } from './features/ui/overlay';
import { Screens } from './features/ui/screens';

/** Passo fisso della simulazione: la logica gira a 60 Hz qualunque sia la frequenza di disegno. */
const STEP = 1 / 60;
/** Tempo massimo simulato in un singolo fotogramma: dopo una pausa (scheda in background) non si recupera tutto. */
const MAX_FRAME_TIME = 0.25;
/** Per quanti millisecondi resta visibile un avviso. */
const TOAST_MS = 6000;

/**
 * Schermata corrente dell'applicazione. Le prime tre sono fuori dalla partita (mostrano lo sfondo di un dungeon);
 * la partita avanza solo in `playing`.
 */
type Screen = 'menu' | 'dungeons' | 'inventory' | 'playing' | 'paused' | 'ended';

const IDLE_SCREENS: readonly Screen[] = ['menu', 'dungeons', 'inventory'];

const LOAD_NOTES: Record<LoadStatus, string> = {
  fresh: 'Nuovo personaggio: i progressi si salvano in questo browser.',
  loaded: 'Progressi caricati dal salvataggio locale di questo browser.',
  recovered: 'Il salvataggio era illeggibile: ne ho conservato una copia e riparti da un personaggio nuovo.',
};

/**
 * Applicazione: collega canvas, input, interfaccia, audio, salvataggio e rappresentazione alla partita, e fa girare
 * il ciclo (simulazione a passo fisso, disegno a ogni fotogramma). Non contiene regole di gioco.
 */
export class Game {
  private readonly input = new Input();
  private readonly camera = new Camera();
  private readonly effects = new Effects();
  private readonly poses = new ActorPoses();
  private readonly audio = new AudioPlayer();
  private readonly hud = new Hud();
  private readonly overlay = new Overlay();
  private readonly screens = new Screens();
  private readonly fullscreen: FullscreenToggle;
  private readonly menu: MainMenu;
  private readonly dungeonSelect: DungeonSelect;
  private readonly inventoryScreen: InventoryScreen;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly saveStore: SaveStore;

  private readonly character: Character;
  private readonly loadStatus: LoadStatus;
  private dungeon: DungeonDefinition = CRYPT;
  private match: Match;
  private screen: Screen = 'menu';
  private accumulator = 0;
  private lastTime = 0;
  private clock = 0;
  private toastTimer: number | undefined;
  private saveWarningShown = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('Canvas 2D non disponibile in questo browser');
    this.ctx = ctx;
    this.fullscreen = new FullscreenToggle(() => this.resize());

    const storage = browserStorage();
    this.saveStore = new SaveStore(storage);
    const loaded = this.saveStore.load();
    this.character = loaded.character;
    this.loadStatus = loaded.status;

    this.menu = new MainMenu({ onDungeons: () => this.openDungeons(), onInventory: () => this.openInventory() });
    this.dungeonSelect = new DungeonSelect({
      onChoose: (dungeon) => this.startDungeon(dungeon),
      onPreview: (dungeon) => this.preview(dungeon),
      onBack: () => this.showMenu(),
    });
    this.inventoryScreen = new InventoryScreen({ onChange: () => this.persist(), onBack: () => this.showMenu() });
    this.match = this.createMatch(this.dungeon);
    this.menu.setNote(
      storage === null ? 'Salvataggio locale non disponibile: i progressi non verranno conservati.' : LOAD_NOTES[this.loadStatus],
    );
  }

  start(): void {
    this.input.attach(this.canvas);
    this.input.actionPressed.connect((action) => {
      if (action === 'pause') this.onEscape();
      else if (action === 'restart') this.restartIfInGame();
      else if (action === 'toggle_audio') this.toggleAudio();
      else if (action === 'toggle_fullscreen') void this.fullscreen.toggle();
    });
    requireElement('pause-button').addEventListener('click', () => this.togglePause());
    this.overlay.onButtons(
      () => (this.screen === 'paused' ? this.togglePause() : this.startMatch()),
      () => this.showMenu(),
    );
    window.addEventListener('blur', () => this.pauseIfPlaying());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pauseIfPlaying();
    });
    new ResizeObserver(() => this.resize()).observe(this.canvas.parentElement ?? this.canvas);
    window.addEventListener('resize', () => this.resize());
    this.resize();

    this.showMenu();
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.frame(time));
  }

  // --- Navigazione tra le schermate ------------------------------------------------------------------------------

  private showMenu(): void {
    this.input.releaseAll();
    this.screen = 'menu';
    this.overlay.hide();
    this.screens.show('menu');
    this.preview(this.dungeon);
  }

  private openDungeons(): void {
    this.screen = 'dungeons';
    this.screens.show('dungeons');
    this.dungeonSelect.render(this.character);
  }

  private openInventory(): void {
    this.screen = 'inventory';
    this.screens.show('inventory');
    this.inventoryScreen.render(this.character);
  }

  /** Sfondo delle schermate fuori dalla partita: la mappa e il boss del dungeon indicato, fermi. */
  private preview(dungeon: DungeonDefinition): void {
    this.dungeon = dungeon;
    this.match = this.createMatch(dungeon);
    this.effects.clear();
    this.poses.reset();
    this.camera.follow(this.match.player.position);
  }

  private startDungeon(dungeon: DungeonDefinition): void {
    this.dungeon = dungeon;
    this.startMatch();
  }

  /** Nuova partita nel dungeon corrente, con le skill dell'equipaggiamento attuale. */
  private startMatch(): void {
    this.match = this.createMatch(this.dungeon);
    this.effects.clear();
    this.poses.reset();
    this.input.releaseAll();
    this.screen = 'playing';
    this.screens.show(null);
    this.overlay.hide();
    this.hud.buildSkills(this.match.player.skillBar.skills);
    this.hud.setBossName(this.match.boss.definition.name);
    this.camera.follow(this.match.player.position);
    this.hud.update(this.match);
    this.canvas.focus();
  }

  private restartIfInGame(): void {
    if (this.screen === 'playing' || this.screen === 'paused' || this.screen === 'ended') this.startMatch();
  }

  private onEscape(): void {
    if (this.screen === 'dungeons' || this.screen === 'inventory') this.showMenu();
    else this.togglePause();
  }

  private createMatch(dungeon: DungeonDefinition): Match {
    const match = new Match({
      rng: new SeededRng(Math.floor(Math.random() * 0x100000000)),
      dungeon,
      loadout: this.character.loadout(),
    });
    match.events.connect((event) => {
      this.effects.handle(event);
      this.poses.handle(event);
      this.audio.handle(event);
      if (event.type === 'match_ended') this.onMatchEnded(match, event.won);
    });
    return match;
  }

  // --- Fine partita, bottino e salvataggio -----------------------------------------------------------------------

  private onMatchEnded(match: Match, won: boolean): void {
    this.screen = 'ended';
    this.input.releaseAll();
    let extra: HTMLElement | null = null;
    if (won) {
      // Il bottino si assegna e si salva PRIMA di mostrarlo: se la pagina si chiude ora, non si perde.
      const rolls = rollLoot(lootTableFor(match.dungeon.id), new SeededRng(Math.floor(Math.random() * 0x100000000)));
      const items = this.character.addRolls(rolls);
      const record = this.character.recordVictory(match.dungeon.id, match.time);
      const saved = this.persist();
      extra = renderLoot(items, { ...record, seconds: match.time }, saved);
    }
    this.overlay.showEnded({
      won,
      dungeonName: match.dungeon.name,
      bossName: match.boss.definition.name,
      seconds: match.time,
      healthLeft: match.player.health.current,
      extra,
    });
  }

  /** Salva il personaggio; se non riesce avvisa una volta sola. Restituisce se il salvataggio e' riuscito. */
  private persist(): boolean {
    const saved = this.saveStore.save(this.character);
    if (!saved && !this.saveWarningShown) {
      this.saveWarningShown = true;
      this.showToast('Impossibile salvare in questo browser: i progressi andranno persi alla chiusura.');
    }
    return saved;
  }

  private showToast(text: string): void {
    const toast = requireElement('toast');
    toast.textContent = text;
    toast.classList.remove('hidden');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.add('hidden'), TOAST_MS);
  }

  // --- Pausa, audio, ridimensionamento ---------------------------------------------------------------------------

  private togglePause(): void {
    if (this.screen === 'playing') {
      this.screen = 'paused';
      this.overlay.showPaused(this.dungeon.name);
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

  // --- Ciclo -----------------------------------------------------------------------------------------------------

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
    } else if (IDLE_SCREENS.includes(this.screen)) {
      // Dietro i menu la mira segue comunque il mouse, cosi' il mirino e' al suo posto appena si entra.
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
