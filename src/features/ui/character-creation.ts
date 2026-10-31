import type { Character } from '../character/character';
import type { BodyType } from '../character/appearance';
import { CHARACTER_CLASSES, CLASS_LABELS, type CharacterClass } from '../character/character-class';
import { CHARACTER_NAME, cleanCharacterName, NOVICE_NAMES, STARTER_SETS } from '../character/creation';
import { el } from './dom';
import { renderAppearancePicker } from './appearance-picker';

export function renderCharacterCreation(character:Character,onCreate:(name:string,body:BodyType,kind:CharacterClass)=>void):HTMLElement {
  if(character.created)return renderAppearancePicker(character);
  let body=character.bodyType,kind=character.characterClass;
  const form=el('form','character-creation');
  form.append(el('h2','','Crea il tuo personaggio'));
  const label=el('label','','1 · Scegli il nome');
  const name=el('input');name.id='creation-name';name.name='character-name';name.type='text';name.required=true;
  name.minLength=CHARACTER_NAME.minimum;name.maxLength=CHARACTER_NAME.maximum;name.autocomplete='off';
  name.placeholder='Da 3 a 20 caratteri';label.append(name);form.append(label);
  const bodies=el('fieldset');bodies.append(el('legend','','2 · Scegli il sesso'));
  for(const [value,text] of [['male','Maschio'],['female','Femmina']] as const){
    const choice=el('label','creation-choice');const input=el('input');input.type='radio';input.name='creation-body';input.value=value;input.required=true;
    input.checked=body===value;input.disabled=character.bodyType!==null && character.bodyType!==value;
    input.addEventListener('change',()=>{body=value;});choice.append(input,el('span','',text));bodies.append(choice);
  }
  form.append(bodies);
  const classes=el('fieldset');classes.append(el('legend','','3 · Scegli la classe'));
  const preview=el('p','creation-starter');
  const updatePreview=()=>{preview.textContent=character.starterPending?(kind?'Set bianco iniziale · 80 GS: '+STARTER_SETS[kind].map(id=>NOVICE_NAMES[id]).join(', '):'Ogni classe inizia con quattro pezzi Comuni da 20 GS.'):'I tuoi oggetti e i progressi esistenti verranno conservati.';};
  for(const value of CHARACTER_CLASSES){
    const choice=el('label','creation-choice');const input=el('input');input.type='radio';input.name='creation-class';input.value=value;input.required=true;
    input.checked=kind===value;input.disabled=character.characterClass!==null && character.characterClass!==value;
    input.addEventListener('change',()=>{kind=value;updatePreview();});choice.append(input,el('span','',CLASS_LABELS[value]));classes.append(choice);
  }
  updatePreview();form.append(classes,preview);
  form.append(el('small','','Nome, sesso e classe vengono fissati alla creazione. Il sesso resterà invariato per la vita di questo personaggio.'));
  const error=el('p','creation-error');error.setAttribute('role','alert');
  const submit=el('button','primary','Crea personaggio');submit.type='submit';form.append(error,submit);
  form.addEventListener('submit',event=>{
    event.preventDefault();const validName=cleanCharacterName(name.value);
    if(!validName){error.textContent='Usa da 3 a 20 lettere, numeri, spazi, apostrofi o trattini.';name.focus();return;}
    if(body===null||kind===null){error.textContent='Scegli sesso e classe prima di continuare.';return;}
    onCreate(validName,body,kind);
  });
  return form;
}
