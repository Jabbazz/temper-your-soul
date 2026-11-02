import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomUUID, randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { WebSocketServer, WebSocket } from 'ws';
import { PartyRoom } from '../src/features/network/party-room';
import { cleanIntent, NETWORK, type ServerMessage } from '../src/features/network/protocol';
import { deserializeCharacter } from '../src/features/character/save-format';
import { SnapshotEncoder } from '../src/features/network/snapshot-codec';
import { TimingWindow } from '../src/features/network/timing-window';

const stepTimings = new TimingWindow(), networkTimings = new TimingWindow();
let cpuPercent = 0, eventLoopPercent = 0;
let previousCpu = process.cpuUsage(), previousUsageTime = performance.now(), previousLoop = performance.eventLoopUtilization();
setInterval(() => {
  const now = performance.now(), cpu = process.cpuUsage(), loop = performance.eventLoopUtilization();
  cpuPercent = Math.round((cpu.user + cpu.system - previousCpu.user - previousCpu.system) / ((now - previousUsageTime) * 1000) * 1000) / 10;
  eventLoopPercent = Math.round(performance.eventLoopUtilization(loop, previousLoop).utilization * 1000) / 10;
  previousCpu = cpu; previousUsageTime = now; previousLoop = loop;
}, 2000).unref();

const root = resolve('dist');
const port = Number(process.env.PORT ?? 4173);
const publicAddress = process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL) : null;
if (publicAddress && !['http:', 'https:'].includes(publicAddress.protocol)) throw new Error('PUBLIC_URL deve essere un indirizzo HTTP/HTTPS.');
const inviteBase = publicAddress?.origin;
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ ok: true, simulationHz: 60, snapshotHz: 30,
      performance: { cpuPercent, eventLoopPercent, rooms: rooms.size, players: [...rooms.values()].reduce((sum, room) => sum + room.characters.size, 0),
        step: stepTimings.summary(), network: networkTimings.summary() } })); return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname));
    if (path !== root && !path.startsWith(root + sep)) throw new Error('path');
    const file = (await stat(path)).isDirectory() ? resolve(path, 'index.html') : path;
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404); res.end('Non trovato'); }
});
const sockets = new WebSocketServer({ server, path: '/party', maxPayload: 64_000, perMessageDeflate: false });
const rooms = new Map<string, PartyRoom>();
interface Connection { id: string; room: PartyRoom | null; alive: boolean; window: number; messages: number }
const clients = new Map<WebSocket, Connection>();
function send(ws: WebSocket, message: ServerMessage): void {
  sendText(ws, JSON.stringify(message));
}
function sendText(ws: WebSocket, text: string): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  // I delta non si possono saltare: chi accumula troppo ritardo viene disconnesso esplicitamente.
  if (ws.bufferedAmount >= NETWORK.maxBufferedBytes) { ws.close(1013, 'Connessione troppo lenta'); return; }
  ws.send(text);
}
function publish(room: PartyRoom): void {
  const state = room.state();
  for (const [ws, c] of clients) if (c.room === room) send(ws, { type: 'party', playerId: c.id, state, inviteBase });
}
sockets.on('connection', ws => {
  if (clients.size >= 128) { ws.close(1013, 'Server pieno'); return; }
  const client: Connection = { id: randomUUID(), room: null, alive: true, window: performance.now(), messages: 0 }; clients.set(ws, client);
  ws.on('pong', () => { client.alive = true; });
  ws.on('message', bytes => {
    const now = performance.now();
    if (now - client.window > 1000) { client.window = now; client.messages = 0; }
    if (++client.messages > 150) { ws.close(1008, 'Troppi messaggi'); return; }
    try {
      const raw: unknown = JSON.parse(bytes.toString());
      if (!raw || typeof raw !== 'object') throw new Error('Messaggio non valido.');
      const m = raw as Record<string, unknown>;
      if (m.type === 'ping' && typeof m.sent === 'number' && Number.isFinite(m.sent)) { send(ws, { type: 'pong', sent: m.sent }); return; }
      if (m.type === 'enter') {
        if (m.protocol !== NETWORK.protocolVersion) throw new Error('Client e server usano versioni diverse. Ricarica la pagina; se il messaggio resta, aggiorna e riavvia il server cooperativo.');
        if (client.room) throw new Error('Sei già in un party.');
        if (typeof m.character !== 'string' || m.character.length > 60_000 || (m.code !== undefined && typeof m.code !== 'string')) throw new Error('Personaggio non valido.');
        const code = typeof m.code === 'string' ? m.code : randomBytes(9).toString('hex');
        let room = rooms.get(code);
        if (m.code !== undefined && !room) throw new Error('Party non trovato o link scaduto.');
        if (!room) room = new PartyRoom(code);
        room.enter(client.id, m.character); rooms.set(code, room); client.room = room; publish(room); return;
      }
      const room = client.room; if (!room) throw new Error('Entra prima in un party.');
      switch (m.type) {
        case 'character': {
          if (room.playing || typeof m.character !== 'string' || m.character.length > 60_000) throw new Error('Personaggio non modificabile durante il combattimento.');
          const character = deserializeCharacter(m.character);
          if (!character?.created) throw new Error('Personaggio non valido.');
          room.characters.set(client.id, character); room.ready.delete(client.id); publish(room); break;
        }
        case 'choose': if (typeof m.dungeonId !== 'string') throw new Error('Dungeon non valido.'); room.choose(client.id, m.dungeonId); publish(room); break;
        case 'mode': room.chooseMode(client.id, m.mode, m.grade); publish(room); break;
        case 'temper': room.chooseTemper(client.id, m.index); break;
        case 'pact': room.answerPact(client.id, m.accept); break;
        case 'ready': if (room.playing || typeof m.ready !== 'boolean') throw new Error('Stato non valido.'); if (m.ready) room.ready.add(client.id); else room.ready.delete(client.id); publish(room); break;
        case 'start': room.start(client.id, randomUUID(), randomBytes(4).readUInt32LE()); publish(room); break;
        case 'input': { const intent = cleanIntent(m.intent); if (!intent) throw new Error('Input non valido.'); room.inputs.set(client.id, { intent, receivedAt: now }); break; }
        default: throw new Error('Comando non valido.');
      }
    } catch (error) { send(ws, { type: 'error', message: error instanceof Error ? error.message : 'Errore del server.' }); }
  });
  ws.on('error', () => ws.close());
  ws.on('close', () => { clients.delete(ws); const room = client.room; if (room) { room.leave(client.id); if (!room.characters.size) rooms.delete(room.code); else publish(room); } });
});
const encoders = new WeakMap<PartyRoom, SnapshotEncoder>();
const completed = new WeakMap<PartyRoom, string>();
let previous = performance.now(), accumulator = 0, steps = 0;
setInterval(() => {
  const now = performance.now(); accumulator += Math.min((now - previous) / 1000, 0.25); previous = now;
  while (accumulator >= NETWORK.step) {
    const stepStart = performance.now();
    for (const room of rooms.values()) room.tick(now);
    if (rooms.size) stepTimings.add(performance.now() - stepStart);
    accumulator -= NETWORK.step; steps++;
    if (steps % NETWORK.snapshotSteps === 0) for (const room of rooms.values()) {
      if (!room.playing && completed.get(room) === room.battleId) continue;
      const networkStart = performance.now();
      const snapshot = room.snapshot(); if (!snapshot) continue;
      let encoder = encoders.get(room); if (!encoder) { encoder = new SnapshotEncoder(); encoders.set(room, encoder); }
      const text = JSON.stringify(encoder.encode(snapshot));
      for (const [ws, client] of clients) if (client.room === room) sendText(ws, text);
      networkTimings.add(performance.now() - networkStart);
      if (snapshot.status !== 'playing') completed.set(room, room.battleId);
    }
  }
}, 8);
setInterval(() => { for (const [ws, client] of clients) { if (!client.alive) ws.terminate(); else { client.alive = false; ws.ping(); } } }, 10_000);
server.listen(port, '0.0.0.0', () => console.log(`Temper your soul · server cooperativo http://127.0.0.1:${port}`));
