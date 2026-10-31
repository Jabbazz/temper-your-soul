import type { Character } from '../character/character';
import { serializeCharacter } from '../character/save-format';
import type { PlayerIntent } from '../match/match';
import { NETWORK, type BattleSnapshot, type ClientMessage, type PartyState, type ServerMessage } from './protocol';
import { SnapshotDecoder } from './snapshot-codec';

export class PartyClient {
  state: PartyState | null = null;
  playerId = '';
  inviteBase = '';
  latency: number | null = null;
  jitter = 0;
  connecting = false;
  private socket: WebSocket | null = null;
  private timer: number | undefined;
  private lastInput = 0;
  private serialized = '';
  private lastReply = 0;
  private lastSnapshot = 0;
  private decoder = new SnapshotDecoder();
  private pending: BattleSnapshot | null = null;
  constructor(private readonly changed: (pingOnly?: boolean) => void, private readonly snapshot: (state: BattleSnapshot) => void,
    private readonly error: (message: string) => void, private readonly disconnected: () => void) {}

  connect(character: Character, code?: string): void {
    if (this.socket) return;
    if (location.protocol === 'file:') { this.error('Per giocare online apri il gioco tramite il server HTTP.'); return; }
    this.connecting = true; this.changed();
    this.decoder = new SnapshotDecoder();
    const url = new URL('/party', location.href); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url); this.socket = socket;
    socket.addEventListener('open', () => {
      this.serialized = serializeCharacter(character); this.lastReply = performance.now();
      this.send({ type: 'enter', protocol: NETWORK.protocolVersion, character: this.serialized, ...(code ? { code } : {}) });
      this.timer = window.setInterval(() => {
        if (performance.now() - this.lastReply > 12_000 || (this.state?.playing && performance.now() - this.lastSnapshot > 4000)) {
          this.error('Connessione interrotta: il server non risponde.'); this.leave(); return;
        }
        this.send({ type: 'ping', sent: performance.now() });
      }, 2000);
      this.send({ type: 'ping', sent: performance.now() });
    });
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data)) as ServerMessage; this.lastReply = performance.now();
      switch (message.type) {
        case 'frame':
          try { this.receiveSnapshot(this.decoder.decode(message)); }
          catch (error) { this.error(error instanceof Error ? error.message : 'Dati di rete non validi.'); this.leave(); }
          break;
        case 'party': this.state = message.state; this.playerId = message.playerId; this.inviteBase = message.inviteBase ?? ''; this.connecting = false; this.lastSnapshot = performance.now(); this.changed(); break;
        case 'snapshot':
          this.receiveSnapshot(message.snapshot); break;
        case 'error': this.error(message.message); if (!this.state) this.leave(); break;
        case 'pong': {
          const rtt = performance.now() - message.sent;
          this.jitter = this.latency === null ? 0 : Math.abs(rtt - this.latency);
          this.latency = Math.round(rtt); this.changed(true); break;
        }
      }
    });
    socket.addEventListener('error', () => this.error('Server cooperativo non raggiungibile. Verifica che npm run server sia avviato.'));
    socket.addEventListener('close', () => { if (this.socket === socket) this.leave(); });
  }
  private receiveSnapshot(snapshot: BattleSnapshot): void {
    this.lastSnapshot = performance.now();
    // I delta vengono tutti decodificati, ma in un burst si rappresenta solo lo stato più recente.
    if (this.pending?.id === snapshot.id) snapshot.events = [...this.pending.events, ...snapshot.events].slice(-256);
    this.pending = snapshot;
    // Esiti e salvataggi non devono attendere un RAF sospeso in una scheda in background.
    if (snapshot.status !== 'playing') this.flushSnapshot();
  }
  flushSnapshot(): void {
    const snapshot = this.pending; if (!snapshot) return; this.pending = null;
    if (this.state && snapshot.status !== 'playing' && this.state.playing) {
      this.state.playing = false; this.state.members.forEach(m => { m.ready = false; }); this.changed();
    }
    this.snapshot(snapshot);
  }
  sync(character: Character): void {
    const text = serializeCharacter(character);
    if (this.state && !this.state.playing && text !== this.serialized) { this.serialized = text; this.send({ type: 'character', character: text }); }
  }
  send(message: ClientMessage): void { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message)); }
  input(intent: PlayerIntent): boolean {
    const now = performance.now(); if (now - this.lastInput < NETWORK.inputMs) return false;
    this.lastInput = now; this.send({ type: 'input', intent }); return true;
  }
  leave(): void {
    const socket = this.socket; const hadConnection = this.state !== null;
    this.socket = null; this.pending = null; window.clearInterval(this.timer); socket?.close();
    this.state = null; this.playerId = ''; this.inviteBase = ''; this.connecting = false; this.latency = null; this.changed();
    if (hadConnection) this.disconnected();
  }
}
