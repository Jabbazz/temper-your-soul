import type { Camera } from '../../core/camera';
import { TAU, type Vec2 } from '../../core/vec2';
import type { ArenaDefinition, ArenaThemeId } from '../arena/arena';
import type { Minion } from '../minions/minion';
import type { PickupKind, RoomView } from '../run/encounter';
import { ROOM_LAYOUT } from '../run/room-templates';
import { REWARD_LABELS, ROOM_LABELS, type DoorOption } from '../run/rooms';
import { drawBossIndicator } from './draw-effects';
import { drawSprite, type Palette, type SpriteFrame } from './sprites';

/*
 * La stanza della discesa nel mondo: i cancelli delle porte (chiusi finche' la stanza non e' libera), i cartelli con
 * tipo di stanza e premio, la soglia che si riempie quando il gruppo ci sta sopra, i premi a terra. Solo aspetto: le
 * regole stanno in `run/encounter.ts`.
 */

/** Colori dei cancelli per tema: grata della cripta, radici della palude, saracinesca della fucina, lastra di ghiaccio. */
const GATES: Readonly<Record<ArenaThemeId, { readonly bar: string; readonly frame: string; readonly glow: string }>> = {
  crypt: { bar: '#6a6474', frame: '#3a3644', glow: '#ffd27a' },
  swamp: { bar: '#5a4428', frame: '#2a2414', glow: '#c8e060' },
  forge: { bar: '#4a4a56', frame: '#24242c', glow: '#ff9a3d' },
  glacier: { bar: '#9fe4ff', frame: '#2a4a6a', glow: '#e8fbff' },
};

/** Icone dei premi: pixel art 7x7. */
const PICKUP_ICONS: Readonly<Record<PickupKind, { readonly frame: SpriteFrame; readonly palette: Palette; readonly label: string }>> = {
  temper: { frame: ['..aaa..', '.abcba.', 'abcdcba', 'abcccba', '.aeeea.', '..aea..', '.aaaaa.'], palette: { a: '#2a1a14', b: '#ff9a3d', c: '#ffd04a', d: '#fff6e0', e: '#6a6474' }, label: 'Tempra' },
  embers: { frame: ['...a...', '..aba..', '.abcba.', 'abcdcba', 'abcccba', '.abbba.', '..aaa..'], palette: { a: '#3a1408', b: '#ff6a1a', c: '#ffb04a', d: '#fff0b0' }, label: 'Braci' },
  heal: { frame: ['..aaa..', '...a...', '..aba..', '.abbba.', 'abcbbba', 'abbbbba', '.aaaaa.'], palette: { a: '#2a1418', b: '#d53640', c: '#ffb0b0' }, label: 'Ristoro' },
  seal: { frame: ['.aaaaa.', 'abbbbba', 'abcccba', 'abcdcba', 'abcccba', 'abbbbba', '.aaaaa.'], palette: { a: '#3a1418', b: '#a82a3a', c: '#d84a5a', d: '#ffd889' }, label: 'Sigillo' },
  fountain: { frame: ['...b...', '..bcb..', '...b...', 'aaaaaaa', 'abcccba', '.abbba.', '..aaa..'], palette: { a: '#3a4250', b: '#7fd8ff', c: '#e8fbff' }, label: 'Fonte · cura' },
  anvil: { frame: ['.......', 'aaaaaaa', 'abbbbba', '.aabaa.', '..aba..', '.abbba.', 'aaaaaaa'], palette: { a: '#14141a', b: '#6a6a78' }, label: 'Incudine · tempra' },
  chest: { frame: ['.aaaaa.', 'abbbbba', 'accccca', 'abbdbba', 'abbbbba', 'abbbbba', 'aaaaaaa'], palette: { a: '#2a1a10', b: '#8a5a2a', c: '#d8a84a', d: '#ffe9a0' }, label: 'Forziere' },
};

/** Teschio delle porte piu' dure. */
const SKULL: SpriteFrame = ['.aaa.', 'abbba', 'acbca', 'abbba', '.aba.'];
const SKULL_PALETTE: Palette = { a: '#1a1418', b: '#e8dfc8', c: '#1a1418' };

export interface RoomLook {
  readonly view: RoomView;
  readonly arena: ArenaDefinition;
  /** Le porte della tappa successiva, nell'ordine dei cancelli. */
  readonly nextOptions: readonly DoorOption[];
  /** Il giocatore di questo client (i premi gia' presi da lui non si vedono piu'). */
  readonly localId: string;
}

function pickupHidden(view: RoomView, pickup: RoomView['pickups'][number], localId: string): boolean {
  if (pickup.kind === 'seal') return pickup.takenBy.length > 0;
  if (pickup.takenBy.includes(localId)) return true;
  // Fonte o incudine: presa una, l'altra sparisce.
  if (pickup.kind === 'fountain' || pickup.kind === 'anvil') {
    return view.pickups.some((other) => (other.kind === 'fountain' || other.kind === 'anvil') && other.takenBy.includes(localId));
  }
  return false;
}

/** Sotto i personaggi: cancelli, soglie e premi. */
export function drawRoomFloor(ctx: CanvasRenderingContext2D, look: RoomLook, clock: number): void {
  const { view, arena } = look;
  const gate = GATES[arena.theme];
  const wall = ROOM_LAYOUT.wallThickness;
  // L'ingresso alle spalle, sempre chiuso.
  drawGate(ctx, arena.width / 2, arena.height - wall, wall, gate, false, clock, true);
  for (const door of view.doors) {
    const open = view.doorsOpen;
    // La soglia: una lastra davanti al cancello, che si accende quando il gruppo ci sta sopra.
    ctx.save();
    ctx.fillStyle = open ? `${gate.glow}${door.progress > 0 ? '40' : '18'}` : '#00000030';
    ctx.fillRect(door.x - ROOM_LAYOUT.doorHalfWidth, wall, ROOM_LAYOUT.doorHalfWidth * 2, ROOM_LAYOUT.doorDepth);
    ctx.restore();
    drawGate(ctx, door.x, 0, wall, gate, open, clock, false);
    if (door.progress > 0) {
      ctx.save();
      ctx.strokeStyle = gate.glow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(door.x, door.y, 30, -Math.PI / 2, -Math.PI / 2 + door.progress * TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
  for (const pickup of view.pickups) {
    if (pickupHidden(view, pickup, look.localId)) continue;
    const icon = PICKUP_ICONS[pickup.kind];
    const bob = Math.sin(clock * 3 + pickup.id) * 3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gradient = ctx.createRadialGradient(pickup.x, pickup.y, 2, pickup.x, pickup.y, 34);
    gradient.addColorStop(0, '#ffe9a055');
    gradient.addColorStop(1, '#ffe9a000');
    ctx.fillStyle = gradient;
    ctx.fillRect(pickup.x - 34, pickup.y - 34, 68, 68);
    ctx.restore();
    ctx.fillStyle = '#070c1670';
    ctx.beginPath();
    ctx.ellipse(pickup.x, pickup.y + 14, 12, 4, 0, 0, TAU);
    ctx.fill();
    drawSprite(ctx, icon.frame, pickup.x, pickup.y - 4 + bob, 3, icon.palette);
  }
}

function drawGate(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  wall: number,
  gate: (typeof GATES)[ArenaThemeId],
  open: boolean,
  clock: number,
  entrance: boolean,
): void {
  const half = ROOM_LAYOUT.doorHalfWidth - 6;
  ctx.save();
  ctx.fillStyle = gate.frame;
  ctx.fillRect(x - half - 8, top - 2, half * 2 + 16, wall + 4);
  ctx.fillStyle = '#07060a';
  ctx.fillRect(x - half, top, half * 2, wall);
  if (open) {
    const pulse = 0.5 + 0.5 * Math.sin(clock * 4 + x);
    ctx.globalAlpha = 0.35 + 0.35 * pulse;
    ctx.fillStyle = gate.glow;
    ctx.fillRect(x - half, top, half * 2, wall);
  } else {
    ctx.fillStyle = gate.bar;
    for (let bx = x - half + 6; bx < x + half; bx += 12) ctx.fillRect(bx, top, 4, wall);
    if (!entrance) ctx.fillRect(x - half, top + wall / 2 - 2, half * 2, 4);
  }
  ctx.restore();
}

/** Sopra i personaggi: i cartelli delle porte (tipo di stanza, premio, teschio per le piu' dure) e i nomi dei premi. */
export function drawRoomLabels(ctx: CanvasRenderingContext2D, look: RoomLook): void {
  const { view } = look;
  view.doors.forEach((door, index) => {
    const option = look.nextOptions[index];
    if (option === undefined) return;
    const room = ROOM_LABELS[option.kind].name.toUpperCase();
    const reward = option.reward !== null ? REWARD_LABELS[option.reward].name : '';
    const text = reward !== '' ? `${room} · ${reward}` : room;
    ctx.save();
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    const width = ctx.measureText(text).width + (option.hard ? 26 : 14);
    const y = ROOM_LAYOUT.wallThickness + ROOM_LAYOUT.doorDepth + 18;
    ctx.fillStyle = view.doorsOpen ? '#1a1218e6' : '#1a121890';
    ctx.fillRect(door.x - width / 2, y - 11, width, 15);
    ctx.strokeStyle = option.hard ? '#d84a5a' : '#8d6b61';
    ctx.lineWidth = 1;
    ctx.strokeRect(door.x - width / 2 + 0.5, y - 10.5, width - 1, 14);
    ctx.fillStyle = view.doorsOpen ? '#ffe7c6' : '#a89aa0';
    ctx.fillText(text, door.x + (option.hard ? 6 : 0), y);
    if (option.hard) drawSprite(ctx, SKULL, door.x - width / 2 + 9, y - 4, 2, SKULL_PALETTE);
    ctx.restore();
  });
  for (const pickup of view.pickups) {
    if (pickupHidden(view, pickup, look.localId)) continue;
    ctx.save();
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a0';
    ctx.fillText(PICKUP_ICONS[pickup.kind].label, pickup.x, pickup.y + 28);
    ctx.restore();
  }
}

/** Sullo schermo: frecce verso la preda della Caccia e verso l'ultimo nemico fuori vista. */
export function drawRoomIndicators(ctx: CanvasRenderingContext2D, camera: Camera, player: Vec2, view: RoomView, minions: readonly Minion[]): void {
  if (view.cleared) return;
  const prey = view.preyId === null ? undefined : minions.find((minion) => minion.id === view.preyId);
  if (prey !== undefined) {
    drawBossIndicator(ctx, camera, player, prey.position, 'PREDA', '#ffd889');
    return;
  }
  const hostile = minions.filter((minion) => !minion.isDead && minion.hostile);
  if (hostile.length > 0 && hostile.length <= 3) {
    for (const minion of hostile) drawBossIndicator(ctx, camera, player, minion.position, hostile.length === 1 ? 'ULTIMO' : '', '#e8c4aa');
  }
}
