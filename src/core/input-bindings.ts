import { Signal } from './signal';
import type { Action } from './input';
export const SKILL_BINDING_ACTIONS = ['skill_1','skill_2','skill_3','skill_4'] as const;
export type SkillAction = typeof SKILL_BINDING_ACTIONS[number];
export type SkillBindings = Readonly<Record<SkillAction, string>>;
export const DEFAULT_SKILL_BINDINGS: SkillBindings = {skill_1:'Mouse0',skill_2:'Mouse2',skill_3:'KeyQ',skill_4:'Space'};
export const FIXED_BINDINGS: Readonly<Record<string, Action>> = {
  KeyE:'interact',KeyW:'move_up',KeyS:'move_down',KeyA:'move_left',KeyD:'move_right',Escape:'pause',KeyR:'restart',KeyM:'toggle_audio',
  KeyF:'toggle_fullscreen',F2:'toggle_performance',Tab:'show_map',KeyN:'toggle_minimap',
};
export function isBindableCode(code: string): boolean {
  return !FIXED_BINDINGS[code] && /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Space|ShiftLeft|ShiftRight|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Mouse0|Mouse2)$/.test(code);
}
export function bindingLabel(code: string): string {
  const names: Readonly<Record<string,string>> = {Mouse0:'MOUSE SX',Mouse2:'MOUSE DX',Space:'SPAZIO',ShiftLeft:'SHIFT SX',ShiftRight:'SHIFT DX',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'};
  return names[code] ?? code.replace(/^Key|^Digit/, '').replace(/^Numpad/, 'NUM ');
}
/** Mappa locale: nessuna modifica alla simulazione o ai salvataggi dei personaggi. */
export class InputBindings {
  readonly changed = new Signal();
  private skills: SkillBindings = {...DEFAULT_SKILL_BINDINGS};
  get values(): SkillBindings { return {...this.skills}; }
  actionFor(code: string): Action | undefined {
    return FIXED_BINDINGS[code] ?? SKILL_BINDING_ACTIONS.find(action => this.skills[action] === code);
  }
  labelForSlot(slot: number): string { const action=SKILL_BINDING_ACTIONS[slot];return action ? bindingLabel(this.skills[action]) : ''; }
  bind(action: SkillAction, code: string): void {
    if (!isBindableCode(code)) throw new Error('Tasto riservato o non supportato. Movimento e comandi di sistema restano invariati.');
    const previous=this.skills[action], other=SKILL_BINDING_ACTIONS.find(key=>key!==action && this.skills[key]===code);
    this.skills={...this.skills,[action]:code,...(other ? {[other]:previous} : {})};this.changed.emit();
  }
  replace(value: unknown): boolean {
    if (typeof value!=='object' || value===null || Array.isArray(value)) return false;
    const data=value as Record<string,unknown>;
    if (!SKILL_BINDING_ACTIONS.every(action=>typeof data[action]==='string' && isBindableCode(data[action] as string))) return false;
    const codes=SKILL_BINDING_ACTIONS.map(action=>data[action] as string);if(new Set(codes).size!==4)return false;
    this.skills=Object.fromEntries(SKILL_BINDING_ACTIONS.map(action=>[action,data[action]])) as Record<SkillAction,string>;
    this.changed.emit();return true;
  }
  reset(): void {this.skills={...DEFAULT_SKILL_BINDINGS};this.changed.emit();}
}
