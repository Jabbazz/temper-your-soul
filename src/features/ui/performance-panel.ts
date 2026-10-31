import type { PartyClient } from '../network/party-client';
import { el, requireElement } from './dom';

interface ServerMetrics {
  cpuPercent: number; eventLoopPercent: number;
  step: { meanMs: number; p95Ms: number }; network: { meanMs: number; p95Ms: number };
}

/** Diagnostica facoltativa: costi del browser distinti da rete e simulazione server. */
export class PerformancePanel {
  private readonly root = requireElement('performance-panel');
  private readonly button = requireElement('performance-button');
  private readonly lines = new Map<string, HTMLElement>();
  private visible = false;
  private since = 0;
  private lastFrame = 0;
  private intervals: number[] = [];
  private work = 0;
  private bytes = 0;
  private snapshots = 0;
  private server: ServerMetrics | null = null;
  private lastPoll = 0;
  private polling = false;
  constructor() {
    this.root.append(el('strong', '', 'Prestazioni · F2'));
    for (const id of ['fps', 'work', 'network', 'ping', 'server', 'cost']) { const line = el('div'); this.lines.set(id, line); this.root.append(line); }
    this.root.append(el('small', '', 'FPS = disegno; aggiornamenti/s = rete. CPU server riferita a un core.'));
    this.button.addEventListener('click', () => this.toggle());
  }
  toggle(): void {
    this.visible = !this.visible; this.root.classList.toggle('hidden', !this.visible);
    this.button.setAttribute('aria-expanded', String(this.visible)); this.since = 0; this.lastFrame = 0; this.intervals = []; this.work = 0;
  }
  frame(now: number, workMs: number, client: PartyClient): void {
    if (!this.visible) return;
    if (!this.since) { this.since = now; this.bytes = client.receivedCharacters; this.snapshots = client.receivedFrames; }
    if (this.lastFrame) this.intervals.push(now - this.lastFrame);
    this.lastFrame = now; this.work += workMs;
    if (now - this.since < 1000) return;
    const elapsed = (now - this.since) / 1000, frames = this.intervals.length;
    const sorted = this.intervals.sort((a, b) => a - b);
    this.set('fps', `${Math.round(frames / elapsed)} FPS · frame p95 ${(sorted[Math.floor(frames * .95)] ?? 0).toFixed(1)} ms`);
    this.set('work', `Lavoro per frame: ${(this.work / Math.max(1, frames)).toFixed(2)} ms`);
    this.set('network', client.state ? `Rete: ${Math.round((client.receivedFrames - this.snapshots) / elapsed)} aggiornamenti/s · ≈ ${((client.receivedCharacters - this.bytes) / elapsed / 1024).toFixed(1)} KB/s` : 'Rete: partita locale');
    this.set('ping', client.state && client.latency !== null ? `RTT: ${client.latency} ms · variazione ${Math.round(client.jitter)} ms` : 'RTT: —');
    this.set('server', client.state && this.server ? `Server: CPU ${this.server.cpuPercent}% · loop ${this.server.eventLoopPercent}%` : 'Server: —');
    this.set('cost', client.state && this.server ? `Server p95: passo ${this.server.step.p95Ms.toFixed(2)} ms · invio ${this.server.network.p95Ms.toFixed(2)} ms` : 'Server: dati in attesa');
    this.since = now; this.intervals = []; this.work = 0; this.bytes = client.receivedCharacters; this.snapshots = client.receivedFrames;
    if (client.state && !this.polling && now - this.lastPoll >= 2000) {
      this.lastPoll = now; this.polling = true;
      const controller = new AbortController(), timeout = window.setTimeout(() => controller.abort(), 1800);
      void fetch('/health', { signal: controller.signal }).then(response => response.json() as Promise<{ performance?: ServerMetrics }>)
        .then(data => { this.server = data.performance ?? null; }).catch(() => { this.server = null; })
        .finally(() => { window.clearTimeout(timeout); this.polling = false; });
    }
  }
  private set(id: string, text: string): void { const line = this.lines.get(id)!; if (line.textContent !== text) line.textContent = text; }
}
