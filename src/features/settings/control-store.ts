import type { InputBindings } from '../../core/input-bindings';
import type { KeyValueStore } from '../character/save-store';
export const CONTROL_SETTINGS_KEY = 'temper-your-soul:controls:v1';
export function loadControls(bindings: InputBindings, storage: KeyValueStore | null): void {
  try {const text=storage?.getItem(CONTROL_SETTINGS_KEY);if(text) {const saved:unknown=JSON.parse(text);if(typeof saved==='object'&&saved!==null&&'skill_4' in saved&&saved.skill_4==='KeyE')saved.skill_4='Space';bindings.replace(saved);}} catch { /* Preferenze non valide: restano i valori predefiniti. */ }
}
export function saveControls(bindings: InputBindings, storage: KeyValueStore | null): boolean {
  try {if(!storage)return false;storage.setItem(CONTROL_SETTINGS_KEY,JSON.stringify(bindings.values));return true;} catch {return false;}
}
