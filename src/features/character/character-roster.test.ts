import { describe,expect,it } from 'vitest';
import { Character } from './character';
import { CharacterRoster,deserializeRoster,serializeRoster } from './character-roster';
import { serializeCharacter } from './save-format';
import { SaveStore,MemoryStore,SAVE_KEY,PRE_ROSTER_BACKUP_KEY,CORRUPT_BACKUP_KEY } from './save-store';

function character(name:string){const c=Character.createStarter();c.completeCreation(name,'female','mage');return c;}
describe('profili locali indipendenti',()=>{
  it('seleziona, aggiunge e rimuove senza condividere inventario o progressi',()=>{
    const roster=new CharacterRoster(),a=roster.add(character('Aria')),b=roster.add(character('Brina'));
    a.character.totalXp=500;a.character.recordVictory('crypt',10);a.character.addRolls([{familyId:'frost_lance',rarity:'rare'}]);
    expect(b.character.totalXp).toBe(0);expect(b.character.inventory).toHaveLength(4);expect(b.character.recordFor('crypt').clears).toBe(0);
    expect(roster.select(a.id)).toBe(true);expect(roster.select('missing')).toBe(false);expect(roster.active).toBe(a);
    expect(roster.remove(b.id)).toBe(true);expect(roster.active).toBe(a);
    const next=roster.add(character('Celeste'));expect(next.id).toBe('c3');
    expect(roster.remove(next.id)).toBe(true);expect(roster.active).toBe(a);
    expect(roster.remove(a.id)).toBe(true);expect(roster.active).toBeNull();expect(roster.remove(a.id)).toBe(false);
  });
  it('il vecchio personaggio viene importato con identità, inventario, XP e record intatti',()=>{
    const old=character('Antica');old.totalXp=390;old.recordVictory('swamp',34);
    const data=JSON.parse(serializeCharacter(old));data.version=5;
    const migrated=deserializeRoster(JSON.stringify(data))!;
    expect(migrated.profiles).toHaveLength(1);expect(migrated.active?.character).toEqual(old);
    const other=migrated.add(character('Nuova'));migrated.select('c1');
    const loaded=deserializeRoster(serializeRoster(migrated))!;
    expect(loaded.activeId).toBe('c1');expect(loaded.profiles[0]!.character).toEqual(old);expect(loaded.profiles[1]!.id).toBe(other.id);
  });
  it('una raccolta vuota resta vuota ricaricando; gli id rimossi non vengono riutilizzati',()=>{
    const roster=new CharacterRoster(),a=roster.add(character('Aria'));roster.remove(a.id);
    const loaded=deserializeRoster(serializeRoster(roster))!;expect(loaded.profiles).toEqual([]);expect(loaded.activeId).toBeNull();
    expect(loaded.add(character('Brina')).id).toBe('c2');
  });
  it('validazione rigorosa: nessun profilo perso silenziosamente per dati invalidi',()=>{
    const roster=new CharacterRoster();roster.add(character('Aria'));const data=JSON.parse(serializeRoster(roster));
    for(const value of ['bad','null','[]',JSON.stringify({...data,version:999}),JSON.stringify({...data,characters:[...data.characters,...data.characters]}),JSON.stringify({...data,characters:[{id:'c1',character:{items:'invalid'}}]})])expect(deserializeRoster(value)).toBeNull();
    const repaired=deserializeRoster(JSON.stringify({...data,activeId:'missing',nextCharacterNumber:-99}))!;
    expect(repaired.activeId).toBe('c1');expect(repaired.add(character('Brina')).id).toBe('c2');
  });
  it('migrazione salva una copia del testo originale e conserva selezione e raccolta',()=>{
    const memory=new MemoryStore(),old=serializeCharacter(character('Antica'));memory.setItem(SAVE_KEY,old);
    const store=new SaveStore(memory),loaded=store.loadRoster();expect(loaded.status).toBe('loaded');
    const b=loaded.roster.add(character('Brina'));expect(store.saveRoster(loaded.roster)).toBe(true);
    expect(memory.getItem(PRE_ROSTER_BACKUP_KEY)).toBe(old);expect(store.loadRoster().roster.activeId).toBe(b.id);
    loaded.roster.remove(b.id);loaded.roster.remove('c1');expect(store.saveRoster(loaded.roster)).toBe(true);
    expect(store.loadRoster().roster.profiles).toEqual([]);expect(memory.getItem(PRE_ROSTER_BACKUP_KEY)).toBe(old);
  });
  it('testo corrotto conservato e nuova raccolta salvabile; storage indisponibile gestito',()=>{
    const memory=new MemoryStore();memory.setItem(SAVE_KEY,'broken');const store=new SaveStore(memory),loaded=store.loadRoster();
    expect(loaded.status).toBe('recovered');expect(memory.getItem(CORRUPT_BACKUP_KEY)).toBe('broken');
    loaded.roster.add(character('Nuova'));expect(store.saveRoster(loaded.roster)).toBe(true);expect(store.loadRoster().roster.profiles).toHaveLength(1);
    expect(new SaveStore(null).loadRoster().roster.profiles).toEqual([]);expect(new SaveStore(null).saveRoster(loaded.roster)).toBe(false);
  });
});
