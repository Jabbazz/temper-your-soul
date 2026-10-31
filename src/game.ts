import { renderCharacterCreation } from './features/ui/character-creation';
import { PROGRESSION, levelProgress } from './features/character/progression';
import { Camera, ZOOM } from './core/camera';
import { Input, SKILL_ACTIONS } from './core/input';
import { SeededRng } from './core/rng';
import { Vec2 } from './core/vec2';
import { AudioPlayer } from './features/audio/audio-player';
import { Character } from './features/character/character';
import type { CharacterRoster } from './features/character/character-roster';
import { renderCharacterProfiles } from './features/ui/character-profiles';
import { browserStorage, rosterFromExternalSave, SaveStore, type LoadStatus } from './features/character/save-store';
import { CRYPT } from './features/dungeons/crypt';
import type { DungeonDefinition } from './features/dungeons/dungeon-definition';
import { canEnterDungeon,minimumDungeonGearScore } from './features/dungeons/dungeon-access';
import { lootTableFor } from './features/loot/loot-tables';
import { rollLoot } from './features/loot/roll-loot';
import { Match, type PlayerIntent } from './features/match/match';
import { Effects } from './features/presentation/effects';
import { ActorPoses } from './features/presentation/poses';
import { renderScene, type Scene } from './features/presentation/scene-renderer';
import { DungeonSelect } from './features/ui/dungeon-select';
import { requireElement } from './features/ui/dom';
import { FullscreenToggle } from './features/ui/fullscreen';
import { Hud } from './features/ui/hud';
import { AudioPanel } from './features/ui/audio-panel';
import { InventoryScreen } from './features/ui/inventory-screen';
import { renderDefeat, renderVictory } from './features/ui/end-screen';
import { PhaseBanner } from './features/ui/phase-banner';
import { CombatTally } from './features/match/combat-tally';
import { MainMenu } from './features/ui/main-menu';
import { Overlay } from './features/ui/overlay';
import { Screens } from './features/ui/screens';
import { PartyPanel } from './features/ui/party-panel';
import { applySnapshot, type BattleSnapshot, type PartyMember } from './features/network/protocol';
import { deserializeCharacter } from './features/character/save-format';
import { dungeonById } from './features/dungeons/dungeons';
import type { ItemRoll } from './features/items/item';
import { showCombatReport } from './features/ui/combat-report';

/** Passo fisso della simulazione: la logica gira a 60 Hz qualunque sia la frequenza di disegno. */
const STEP = 1 / 60;
/** Tempo massimo simulato in un singolo fotogramma: dopo una pausa (scheda in background) non si recupera tutto. */
const MAX_FRAME_TIME = 0.25;
/** Secondi di pausa drammatica al passaggio in fase II (solo in partita singola: in cooperativa il server non si ferma). */
const PHASE_INTERLUDE = 1.6;
/** Secondi fra la fine dell'incontro e la sua schermata: il tempo di vedere il boss frantumarsi o la propria caduta. */
const END_DELAY = { won: 1.7, lost: 1.3 } as const;
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
  private readonly audio: AudioPlayer;
  private readonly audioPanel: AudioPanel;
  private readonly hud = new Hud();
  private readonly overlay = new Overlay();
  private readonly tally = new CombatTally();
  private readonly phaseBanner = new PhaseBanner();
  /** Secondi di pausa drammatica rimasti (fase II in partita singola): intanto la simulazione aspetta. */
  private interlude = 0;
  /** Schermata di fine incontro in attesa: prima si guarda la morte del boss (o la propria), poi il resoconto. */
  private pendingEnd: { remaining: number; show: () => void } | null = null;
  private readonly screens = new Screens();
  private readonly party = new PartyPanel(() => this.pauseIfPlaying(), snapshot => this.receiveSnapshot(snapshot), () => {
    if (this.networkBattleId) { this.networkBattleId = ''; this.showToast('Hai lasciato il combattimento cooperativo.'); this.showMenu(); }
  });
  private networkBattleId = '';
  private readonly completedBattles = new Set<string>();
  private battleMembers: PartyMember[] = [];
  private readonly allyPoses = new Map<string, ActorPoses>();
  private allyVisuals: Scene['allies'] = [];
  private renderAppearance: Scene['appearance'];
  private readonly fullscreen: FullscreenToggle;
  private readonly menu: MainMenu;
  private readonly dungeonSelect: DungeonSelect;
  private readonly inventoryScreen: InventoryScreen;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly saveStore: SaveStore;

  private roster:CharacterRoster;
  private draft:Character|null=null;
  private get character():Character {return this.draft??this.roster.active?.character??this.newDraft();}
  private newDraft():Character {this.draft=Character.createStarter();return this.draft;}
  private updateParty():void {
    const phase=this.screen==='playing'?'playing':this.screen==='paused'?'paused':this.screen==='ended'?'ended':'idle';
    this.party.update(this.character,this.draft?null:this.roster.activeId,this.dungeon,phase);
  }
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
    this.audio = new AudioPlayer(storage);
    this.audioPanel = new AudioPanel(this.audio, { onOpen: () => this.pauseIfPlaying() });
    const loaded = this.saveStore.loadRoster();
    this.roster=loaded.roster;
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
    requireElement('main-menu-button').addEventListener('click',()=>this.showMenu());
    this.overlay.onButtons(
      () => (this.screen === 'paused' ? this.togglePause() : this.startMatch()),
      () => this.showMenu(),
    );
    window.addEventListener('storage', (event) => this.adoptExternalSave(event.key, event.newValue));
    window.addEventListener('blur', () => this.pauseIfPlaying());
    // Il browser avvia l'audio solo dopo un gesto: ogni clic o tasto lo sblocca (le chiamate successive non costano).
    window.addEventListener('pointerdown', () => this.audio.unlock());
    window.addEventListener('keydown', () => this.audio.unlock());
    document.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('button') !== null) this.audio.play('ui_click');
    });
    this.audio.changed.connect((settings) => this.showAudioState(settings.enabled));
    this.showAudioState(this.audio.enabled);
    document.addEventListener('visibilitychange', () => {
      this.audio.setHidden(document.hidden);
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
    if (this.networkBattleId && this.screen === 'playing') this.party.client.leave();
    this.networkBattleId = '';
    this.input.releaseAll();
    this.screen = 'menu';
    this.clearBattleFeedback();
    this.overlay.hide();
    this.screens.show('menu');
    this.preview(this.dungeon);
    const character=this.character;
    requireElement('menu-profiles').replaceChildren(renderCharacterProfiles(this.roster,this.draft!==null,{
      onNew:()=>{this.newDraft();this.inventoryScreen.reset();this.showMenu();},
      onCancel:()=>{this.draft=null;this.showMenu();},
      onSelect:id=>{if(this.roster.select(id)){this.draft=null;this.inventoryScreen.reset();this.persist();this.showMenu();}},
      onRemove:id=>{if(this.roster.remove(id)){this.draft=null;this.inventoryScreen.reset();this.persist();this.showMenu();}},
    }));
    requireElement('menu-appearance').replaceChildren(renderCharacterCreation(character,(name,body,kind)=>{
      if(character.completeCreation(name,body,kind)){
        if(this.draft===character){this.roster.add(character);this.draft=null;}
        this.persist();this.showMenu();
      }
    }));
    (requireElement('menu-dungeons') as HTMLButtonElement).disabled = !this.character.created;
    (requireElement('menu-inventory') as HTMLButtonElement).disabled = !this.character.created;
  }

  private openDungeons(): void {
    if(!this.character.created) return;
    this.screen = 'dungeons';
    this.screens.show('dungeons');
    this.dungeonSelect.render(this.character);
    this.updateParty();
  }

  private openInventory(): void {
    if(!this.character.created)return;
    this.screen = 'inventory';
    this.clearBattleFeedback();
    this.overlay.hide();
    this.screens.show('inventory');
    // Si riapre da capo: uno scarto chiesto prima di uscire (anche con ESC) non resta in attesa di conferma.
    this.inventoryScreen.reset();
    this.inventoryScreen.render(this.character);
    this.updateParty();
  }

  /** Sfondo delle schermate fuori dalla partita: la mappa e il boss del dungeon indicato, fermi. */
  private preview(dungeon: DungeonDefinition): void {
    this.renderAppearance = undefined; this.allyVisuals = [];
    this.dungeon = dungeon;
    this.match = this.createMatch(dungeon);
    this.effects.clear();
    this.poses.reset();
    this.camera.follow(this.match.player.position);
    this.updateParty();
  }

  private startDungeon(dungeon: DungeonDefinition): void {
    if (this.party.client.state) {
      this.party.client.send({ type: 'choose', dungeonId: dungeon.id }); this.party.openDialog(); return;
    }
    this.dungeon = dungeon;
    this.startMatch();
  }

  /** Nuova partita nel dungeon corrente, con le skill dell'equipaggiamento attuale. */
  private startMatch(): void {
    if (this.party.client.state) { this.party.openDialog(); return; }
    this.networkBattleId = '';
    this.renderAppearance = undefined; this.allyVisuals = [];
    if(!this.character.created)return;
    if(!canEnterDungeon(this.dungeon,this.character.gearScore)){
      this.showToast(`Servono almeno ${minimumDungeonGearScore(this.dungeon)} GS equipaggiati per questo dungeon.`);return;
    }
    this.match = this.createMatch(this.dungeon);
    this.effects.clear();
    this.poses.reset();
    this.input.releaseAll();
    this.clearBattleFeedback();
    this.tally.reset('local');
    this.hud.resetBars();
    this.screen = 'playing';
    this.screens.show(null);
    this.overlay.hide();
    this.hud.buildSkills(this.match.player.skillBar.skills);
    this.hud.setBossName(this.match.boss.definition.name);
    this.camera.follow(this.match.player.position);
    this.hud.update(this.match, levelProgress(this.character.totalXp));
    this.canvas.focus();
    this.updateParty();
  }

  private restartIfInGame(): void {
    if (this.screen === 'playing' || this.screen === 'paused' || this.screen === 'ended') this.startMatch();
  }

  private onEscape(): void {
    if (this.audioPanel.isOpen) this.audioPanel.close();
    else if (this.screen === 'dungeons' || this.screen === 'inventory') this.showMenu();
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
      this.hud.onEvent(event);
      this.tally.handle(event);
      if (event.type === 'boss_phase_changed') this.onPhaseChanged(event.text, true);
      if (event.type === 'match_ended') this.onMatchEnded(match, event.won);
    });
    return match;
  }

  // --- Fine partita, bottino e salvataggio -----------------------------------------------------------------------

  /**
   * Fine dell'incontro. Bottino, esperienza e record si assegnano e si salvano SUBITO (se la pagina si chiude ora non
   * si perde nulla); la schermata arriva dopo `END_DELAY`, il tempo di vedere il colpo finale. `after` (cooperativa)
   * parte insieme alla schermata.
   */
  private onMatchEnded(match: Match, won: boolean, networkRolls?: readonly ItemRoll[], after?: () => void): void {
    this.screen = 'ended';
    this.input.releaseAll();
    this.interlude = 0;
    const summary = this.tally.summary();
    let extra: HTMLElement;
    let sounds: Array<'loot' | 'level_up'> = [];
    if (won) {
      const rolls = networkRolls ?? rollLoot(lootTableFor(match.dungeon.id), new SeededRng(Math.floor(Math.random() * 0x100000000)));
      const items = this.character.addRolls(rolls);
      const before = levelProgress(this.character.totalXp);
      const gained = PROGRESSION.rewards[match.dungeon.id as keyof typeof PROGRESSION.rewards] ?? 100;
      this.character.totalXp += gained;
      const afterXp = levelProgress(this.character.totalXp);
      const record = this.character.recordVictory(match.dungeon.id, match.time);
      const saved = this.persist();
      if (items.length > 0) sounds.push('loot');
      if (afterXp.level > before.level) sounds.push('level_up');
      extra = renderVictory({
        bossName: match.boss.definition.name,
        seconds: match.time,
        firstClear: record.firstClear,
        newBest: record.newBest,
        healthLeft: match.player.health.current,
        healthMax: match.player.health.max,
        summary,
        xp: {
          gained,
          levelBefore: before.level,
          levelAfter: afterXp.level,
          before: before.current / before.required,
          after: afterXp.current / afterXp.required,
        },
        items,
        saved,
        characterClass: this.character.characterClass,
      });
    } else {
      extra = renderDefeat({
        bossName: match.boss.definition.name,
        seconds: match.time,
        bossHealth: match.boss.health.fraction,
        summary,
        onInventory: () => this.openInventory(),
      });
      // La scena si spegne (grigia e scura) mentre si aspetta la schermata.
      document.body.classList.add('defeated');
    }
    this.pendingEnd = {
      remaining: won ? END_DELAY.won : END_DELAY.lost,
      show: () => {
        this.overlay.showEnded({ won, dungeonName: match.dungeon.name, extra });
        for (const sound of sounds) this.audio.play(sound);
        sounds = [];
        after?.();
      },
    };
    this.updateParty();
  }

  /** Passaggio alla fase II: stendardo a tutto schermo e, in partita singola, una breve pausa drammatica. */
  private onPhaseChanged(text: string, freeze: boolean): void {
    this.phaseBanner.show(text);
    if (freeze) this.interlude = PHASE_INTERLUDE;
  }

  /** Toglie cio' che resta di un incontro: pausa drammatica, schermata in attesa, stendardo, scena spenta. */
  private clearBattleFeedback(): void {
    this.interlude = 0;
    this.pendingEnd = null;
    this.phaseBanner.hide();
    document.body.classList.remove('defeated');
  }

  private receiveSnapshot(snapshot: BattleSnapshot): void {
    if (this.completedBattles.has(snapshot.id) || !snapshot.players.some(p => p.id === this.party.client.playerId)) return;
    if (snapshot.id !== this.networkBattleId) {
      const state = this.party.client.state, dungeon = dungeonById(snapshot.dungeonId);
      if (!state || !dungeon) return;
      this.networkBattleId = snapshot.id; this.dungeon = dungeon; this.battleMembers = [...state.members];
      const members = state.members.map(m => ({ id: m.id, loadout: deserializeCharacter(m.character)!.loadout() }));
      this.match = new Match({ rng: new SeededRng(1), dungeon, loadout: members[0].loadout, members });
      this.match.viewPlayerId = this.party.client.playerId;
      this.allyPoses.clear(); for (const member of members) this.allyPoses.set(member.id, new ActorPoses());
      this.allyVisuals = this.battleMembers.filter(m => m.id !== this.party.client.playerId).map(member => ({
        player: this.match.players.get(member.id)!, poses: this.allyPoses.get(member.id)!, name: member.name, appearance: member.appearance,
      }));
      this.renderAppearance = this.character.appearance();
      this.effects.clear(); this.poses.reset(); this.input.releaseAll();
      this.clearBattleFeedback(); this.tally.reset(this.party.client.playerId); this.hud.resetBars();
      this.screen = 'playing'; this.screens.show(null); this.overlay.hide(); this.party.close();
      this.hud.buildSkills(this.match.player.skillBar.skills); this.hud.setBossName(this.match.boss.definition.name); this.canvas.focus();
    }
    applySnapshot(this.match, snapshot);
    for (const event of snapshot.events) {
      this.effects.handle(event, this.party.client.playerId); this.audio.handle(event, this.party.client.playerId);
      this.hud.onEvent(event, this.party.client.playerId); this.tally.handle(event);
      if (event.type === 'boss_phase_changed') this.onPhaseChanged(event.text, false);
      if (!event.playerId || event.playerId === this.party.client.playerId) this.poses.handle(event);
      if (event.playerId) this.allyPoses.get(event.playerId)?.handle(event);
    }
    this.camera.follow(this.match.player.position);
    if (snapshot.status !== 'playing') {
      this.completedBattles.add(snapshot.id);
      const members = this.battleMembers;
      this.onMatchEnded(this.match, snapshot.status === 'won', snapshot.rewards[this.party.client.playerId] ?? [],
        () => showCombatReport(snapshot.report, members, snapshot.time, snapshot.status === 'won'));
    }
  }

  /**
   * Un'altra scheda ha salvato: si adotta la sua raccolta (con il profilo attivo di questa scheda, se esiste ancora) e
   * si ridisegna la schermata aperta. Una partita in corso prosegue con le skill che aveva; il bottino va al personaggio
   * aggiornato. Il personaggio in creazione (`draft`) non e' nella raccolta e resta com'e'.
   */
  private adoptExternalSave(key: string | null, newValue: string | null): void {
    const roster = rosterFromExternalSave(key, newValue, this.roster.activeId);
    if (roster === null) return;
    this.roster = roster;
    // Come dopo un salvataggio: l'aspetto disegnato e il pannello del party seguono il personaggio aggiornato.
    this.renderAppearance = undefined;
    this.updateParty();
    // Durante la creazione non si ridisegna il menu: il nome che si sta scrivendo andrebbe perso.
    if (this.screen === 'menu' && this.draft === null) this.showMenu();
    else if (this.screen === 'dungeons') this.dungeonSelect.render(this.character);
    else if (this.screen === 'inventory') {
      this.inventoryScreen.reset();
      this.inventoryScreen.render(this.character);
    }
    this.showToast('Progressi aggiornati da un\'altra scheda di questo browser.');
  }

  /** Salva il personaggio; se non riesce avvisa una volta sola. Restituisce se il salvataggio e' riuscito. */
  private persist(): boolean {
    this.renderAppearance = undefined;
    const saved = this.saveStore.saveRoster(this.roster);
    this.updateParty();
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
    if (this.networkBattleId && this.screen === 'playing') { this.party.openDialog(); return; }
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
    this.updateParty();
  }

  private pauseIfPlaying(): void {
    if (this.screen === 'playing' && !this.networkBattleId) this.togglePause();
  }

  private toggleAudio(): void {
    this.audio.toggle();
  }

  private showAudioState(enabled: boolean): void {
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
      for (const [id, poses] of this.allyPoses) poses.update(STEP, match.players.get(id)?.moving ?? false);
      this.effects.update(STEP, match, this.camera);
    }
    if (this.screen === 'playing') {
      if (this.networkBattleId) {
        if (this.party.client.input(this.readIntent())) this.input.takeLatched();
      } else if (this.interlude > 0) {
        // Pausa drammatica della fase II: il mondo aspetta, gli effetti continuano; le pressioni non si accumulano.
        this.interlude -= STEP; this.input.takeLatched();
      } else {
        match.step(STEP, this.readIntent()); this.input.takeLatched();
      }
    } else if (IDLE_SCREENS.includes(this.screen)) {
      // Dietro i menu la mira segue comunque il mouse, cosi' il mirino e' al suo posto appena si entra.
      match.player.aim = match.player.position.add(this.camera.pointerOffset(this.input.pointer));
    }
    this.camera.follow(match.player.position);
  }

  private frame(time: number): void {
    this.party.client.flushSnapshot();
    const delta = Math.min((time - this.lastTime) / 1000, MAX_FRAME_TIME);
    this.lastTime = time;
    this.clock += delta;
    this.accumulator += delta;
    while (this.accumulator >= STEP) {
      this.step();
      this.accumulator -= STEP;
    }
    if (this.pendingEnd !== null) {
      this.pendingEnd.remaining -= delta;
      if (this.pendingEnd.remaining <= 0) {
        const { show } = this.pendingEnd;
        this.pendingEnd = null;
        show();
      }
    }
    this.camera.shakeOffset =
      this.screen === 'playing' || this.screen === 'ended' ? this.effects.shakeOffset() : Vec2.ZERO;
    this.hud.update(this.match, levelProgress(this.character.totalXp));
    this.audio.setListener(this.match.player.position, this.camera.width / 2);
    this.audio.setScene({ screen: this.screen, theme: this.dungeon.arena.theme, enraged: this.match.boss.isEnraged });
    this.audio.update(delta);
    renderScene(this.ctx, {
      match: this.match,
      effects: this.effects,
      poses: this.poses,
      camera: this.camera,
      clock: this.clock,
      appearance: this.renderAppearance ??= this.character.appearance(),
      allies: this.allyVisuals,
    });
    requestAnimationFrame((next) => this.frame(next));
  }
}
