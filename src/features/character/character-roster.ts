import { Character } from './character';
import { deserializeCharacter,serializeCharacter,SAVE_VERSION } from './save-format';

export interface CharacterProfile {readonly id:string;readonly character:Character}
/** Inventari, XP e record restano separati. Gli id dei personaggi non vengono riutilizzati. */
export class CharacterRoster {
  readonly profiles:CharacterProfile[]=[];
  gold=0;
  activeId:string|null=null;
  nextCharacterNumber=1;
  get active():CharacterProfile|null {return this.profiles.find(p=>p.id===this.activeId)??null;}
  add(character:Character):CharacterProfile {
    const profile={id:'c'+this.nextCharacterNumber++,character};this.profiles.push(profile);this.activeId=profile.id;return profile;
  }
  select(id:string):boolean {
    if(!this.profiles.some(p=>p.id===id))return false;this.activeId=id;return true;
  }
  remove(id:string):boolean {
    const index=this.profiles.findIndex(p=>p.id===id);if(index<0)return false;
    this.profiles.splice(index,1);
    if(this.activeId===id)this.activeId=this.profiles[Math.min(index,this.profiles.length-1)]?.id??null;
    return true;
  }
}
export function serializeRoster(roster:CharacterRoster):string {
  return JSON.stringify({version:SAVE_VERSION,format:'character-roster',gold:roster.gold,activeId:roster.activeId,nextCharacterNumber:roster.nextCharacterNumber,characters:roster.profiles.map(p=>({id:p.id,character:JSON.parse(serializeCharacter(p.character)) as unknown}))});
}
/** I salvataggi singoli v1–v5 vengono adottati senza cambiare il personaggio. Un roster invalido non si ripara perdendo profili. */
export function deserializeRoster(text:string):CharacterRoster|null {
  let raw:unknown;try{raw=JSON.parse(text);}catch{return null;}
  if(typeof raw!=='object'||raw===null||Array.isArray(raw))return null;
  const data=raw as Record<string,unknown>,roster=new CharacterRoster();
  if(data.format!=='character-roster'){
    const character=deserializeCharacter(text);if(!character)return null;roster.add(character);return roster;
  }
  if(typeof data.version!=='number'||data.version<6||data.version>SAVE_VERSION||!Number.isInteger(data.version)||!Array.isArray(data.characters))return null;
  if(data.version>=8){if(typeof data.gold!=='number'||!Number.isSafeInteger(data.gold)||data.gold<0)return null;roster.gold=data.gold;}
  let highest=0;
  for(const entry of data.characters){
    if(typeof entry!=='object'||entry===null||Array.isArray(entry))return null;
    const profile=entry as Record<string,unknown>;
    if(typeof profile.id!=='string'||!/^c[1-9]\d*$/.test(profile.id)||roster.profiles.some(p=>p.id===profile.id))return null;
    const number=Number(profile.id.slice(1));if(!Number.isSafeInteger(number)||number>=Number.MAX_SAFE_INTEGER-1)return null;
    const character=deserializeCharacter(JSON.stringify(profile.character)??'');if(!character)return null;
    roster.profiles.push({id:profile.id,character});highest=Math.max(highest,number);
  }
  const next=typeof data.nextCharacterNumber==='number'&&Number.isSafeInteger(data.nextCharacterNumber)&&data.nextCharacterNumber<Number.MAX_SAFE_INTEGER-1?data.nextCharacterNumber:1;
  roster.nextCharacterNumber=Math.max(highest+1,next,1);
  roster.activeId=typeof data.activeId==='string'&&roster.profiles.some(p=>p.id===data.activeId)?data.activeId:roster.profiles[0]?.id??null;
  return roster;
}
