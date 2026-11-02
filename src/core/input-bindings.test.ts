import { describe, expect, it } from 'vitest';
import { Input } from './input';
import { DEFAULT_SKILL_BINDINGS, InputBindings } from './input-bindings';
import { CONTROL_SETTINGS_KEY, loadControls, saveControls } from '../features/settings/control-store';
import { MemoryStore } from '../features/character/save-store';
describe('associazioni delle spell',()=>{
  it('rimappa lo scatto sullo spazio e conserva pressioni brevi, senza lasciare la vecchia E attiva',()=>{
    const input=new Input();input.press('KeyE');input.bindings.bind('skill_4','Space');
    expect(input.isActionActive('skill_4')).toBe(false);input.press('KeyE');expect(input.isActionActive('skill_4')).toBe(false);
    input.press('Space');input.release('Space');expect(input.isActionActive('skill_4')).toBe(true);
    input.takeLatched();expect(input.isActionActive('skill_4')).toBe(false);
  });
  it('scambia le associazioni tra skill senza perdere azioni o introdurre doppioni',()=>{
    const map=new InputBindings();map.bind('skill_4','KeyQ');
    expect(map.actionFor('KeyQ')).toBe('skill_4');expect(map.actionFor('Space')).toBe('skill_3');expect(map.actionFor('KeyE')).toBe('interact');
    expect(new Set(Object.values(map.values)).size).toBe(4);
    expect(()=>map.bind('skill_4','KeyW')).toThrow();expect(map.actionFor('KeyW')).toBe('move_up');
    map.reset();expect(map.values).toEqual(DEFAULT_SKILL_BINDINGS);
  });
  it('valida i dati esterni prima di sostituire le associazioni e non espone stato mutabile',()=>{
    const map=new InputBindings();
    for(const value of [null,[],{}, {...DEFAULT_SKILL_BINDINGS,skill_4:'Escape'}, {...DEFAULT_SKILL_BINDINGS,skill_4:'Mouse0'}]) expect(map.replace(value)).toBe(false);
    expect(map.values).toEqual(DEFAULT_SKILL_BINDINGS);
    const copy={...map.values};copy.skill_4='Space';expect(map.values.skill_4).toBe('Space');
  });
  it('salva separatamente dai personaggi e ripristina i tasti al riavvio',()=>{
    const store=new MemoryStore(),map=new InputBindings();map.bind('skill_2','KeyZ');
    expect(saveControls(map,store)).toBe(true);const loaded=new InputBindings();loadControls(loaded,store);
    expect(loaded.actionFor('KeyZ')).toBe('skill_2');expect(loaded.actionFor('Mouse2')).toBeUndefined();
    store.setItem(CONTROL_SETTINGS_KEY,'{corrotto');const safe=new InputBindings();loadControls(safe,store);expect(safe.values).toEqual(DEFAULT_SKILL_BINDINGS);
    expect(saveControls(map,null)).toBe(false);
  });
  it('riserva E alle interazioni e migra la precedente associazione predefinita dello scatto',()=>{
    const store=new MemoryStore();store.setItem(CONTROL_SETTINGS_KEY,JSON.stringify({...DEFAULT_SKILL_BINDINGS,skill_4:'KeyE'}));
    const map=new InputBindings();loadControls(map,store);expect(map.actionFor('KeyE')).toBe('interact');expect(map.actionFor('Space')).toBe('skill_4');expect(()=>map.bind('skill_1','KeyE')).toThrow();
  });
  it('non esegue azioni durante la configurazione, neanche tramite il mouse',()=>{
    const input=new Input();input.suspended=true;input.press('KeyQ');input.press('Mouse0');
    expect(input.isActionActive('skill_1')).toBe(false);expect(input.isActionActive('skill_3')).toBe(false);
    input.suspended=false;input.press('KeyQ');expect(input.isActionActive('skill_3')).toBe(true);
  });
});
