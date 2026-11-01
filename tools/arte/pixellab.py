"""PixelLab REST v2: budget locale, job riprendibili e asset locali. Chiave solo da PIXELLAB_API_KEY."""
import argparse,atexit,base64,json,os,sys,urllib.request,urllib.error
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8',line_buffering=True)
ROOT=Path(__file__).resolve().parents[2]
PRIVATE=ROOT/'.tools/pixellab'
PUBLIC=ROOT/'src/assets/vfx/pixellab'
KEY=os.environ.get('PIXELLAB_API_KEY','')
PLAN=json.loads((Path(__file__).with_name('pixellab-plan.json')).read_text(encoding='utf-8'))
PRIVATE.mkdir(parents=True,exist_ok=True)
STATE=PRIVATE/'ledger.json'
LOCK=PRIVATE/'client.lock'
try: lock_fd=os.open(LOCK,os.O_CREAT|os.O_EXCL|os.O_WRONLY)
except FileExistsError: raise SystemExit('Client già attivo: non inviare richieste duplicate. Verificare il processo prima di rimuovere client.lock.')
os.write(lock_fd,str(os.getpid()).encode());os.close(lock_fd)
atexit.register(lambda: LOCK.unlink(missing_ok=True))
ledger=json.loads(STATE.read_text(encoding='utf-8')) if STATE.exists() else {'budget':39,'effects':{},'icons':{}}
def save():
 temporary=STATE.with_suffix('.tmp')
 temporary.write_text(json.dumps(ledger,ensure_ascii=False,indent=2),encoding='utf-8');temporary.replace(STATE)
def request(path,payload=None):
 if not KEY: raise SystemExit('Impostare PIXELLAB_API_KEY solo nell’ambiente del processo.')
 req=urllib.request.Request('https://api.pixellab.ai/v2/'+path.lstrip('/'),data=None if payload is None else json.dumps(payload).encode(),headers={'Authorization':'Bearer '+KEY,'Content-Type':'application/json'})
 try:
  return json.load(urllib.request.urlopen(req,timeout=60))
 except urllib.error.HTTPError as error:
  raise SystemExit('PixelLab HTTP '+str(error.code)+': '+error.read().decode('utf-8','replace').replace(KEY,'[REDACTED]')[:500])
def balance():
 result=request('balance');ledger['balance']=result;save();return result['subscription']['generations']
def spent():
 return sum(float((job.get('usage') or {}).get('generations',0)) for job in ledger['effects'].values())+sum(float((job.get('usage') or {}).get('generations',0)) for job in ledger['icons'].values())
def remaining():
 reserved=sum(job.get('quoted_generations',1)*2 for job in ledger['effects'].values() if job.get('status') not in ('completed','failed'))
 outputs=sum(job.get('status')!='failed' for job in [*ledger['effects'].values(),*ledger['icons'].values()])
 return min(balance()-reserved,ledger['budget']-spent()-reserved,ledger['budget']-outputs)
def submit(ids):
 for name in ids:
  if name in ledger['effects']:
   print(name,'gia registrato',ledger['effects'][name].get('status'));continue
  spec=next(x for x in PLAN['effects'] if x['id']==name)
  if remaining()<2: print('Budget riservato esaurito');break
  ledger['effects'][name]={'status':'submitting'};save()
  response=request('vfx',{k:v for k,v in spec.items() if k!='id'})
  ledger['effects'][name]={**response,'request':spec};save()
  print(name,response['status'],'quote',response['quoted_generations'])
def poll():
 for name,job in ledger['effects'].items():
  if job.get('status') in ('completed','failed') or not job.get('background_job_id'):continue
  result=request('background-jobs/'+job['background_job_id'])
  job.update(result);save()
  print(name,result['status'],result.get('usage'))
 print('Saldo',balance(),'Speso dal flusso',spent())
def download():
 for name,job in ledger['effects'].items():
  if job.get('status')!='completed':continue
  folder=PRIVATE/name;folder.mkdir(exist_ok=True)
  for filename,url in job['last_response']['files'].items():
   if not filename.endswith(('.png','.json','.gif')):continue
   if not url.startswith('https://api.pixellab.ai/'):raise SystemExit('Origine file non prevista')
   target=folder/Path(filename).name
   if not target.exists():target.write_bytes(urllib.request.urlopen(url,timeout=45).read())
  print(name,'scaricato')
def pack():
 sys.path.insert(0,str(ROOT/'.tools/python'))
 from PIL import Image
 PUBLIC.mkdir(parents=True,exist_ok=True)
 manifest={'provider':'PixelLab','terms':'https://www.pixellab.ai/termsofservice','retrieved':'2026-11-01','effects':{},'icons':{}}
 for name,job in ledger['effects'].items():
  if job.get('status')!='completed':continue
  folder=PRIVATE/name
  metadata=json.loads((folder/('tys-'+name+'.json')).read_text(encoding='utf-8'))
  image=Image.open(folder/metadata['meta']['image']).convert('RGBA')
  assert image.getchannel('A').getextrema()[0]==0,'Sfondo non trasparente'
  image.save(PUBLIC/(name+'.png'),optimize=True)
  result=job['last_response'];frames=[]
  for frame in metadata['frames']:
   rect=frame['frame'];frames.append([rect['x'],rect['y'],rect['w'],rect['h']])
  manifest['effects'][name]={'file':name+'.png','frames':frames,'fps':result['fps'],'loop':result['loop'],'pivot':[result['anchor']['x'],result['anchor']['y']],
    'source':result['edit_url'],'effectId':result['effect_id'],'generations':(job.get('usage') or {}).get('generations',0)}
 for name,job in ledger['icons'].items():
  if job.get('status')=='completed':manifest['icons'][name]={'file':'icon-'+name+'.png','generations':(job.get('usage') or {}).get('generations',0)}
 temporary=PUBLIC/'manifest.tmp';temporary.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');temporary.replace(PUBLIC/'manifest.json')
 print('Atlas',len(manifest['effects']),'icone',len(manifest['icons']))
def icons(count):
 PUBLIC.mkdir(parents=True,exist_ok=True)
 for spec in [x for x in PLAN['items'] if x['id'] not in ledger['icons']][:count]:
  name=spec['id']
  if remaining()<1:print('Budget icone esaurito');break
  ledger['icons'][name]={'status':'submitting'};save()
  result=request('create-image-pixen',{'description':spec['description'],'image_size':{'width':64,'height':64},'no_background':True,'enhance_prompt':False,'seed':20261101})
  data=result['image']['base64'];data=data.split(',',1)[-1]
  (PUBLIC/('icon-'+name+'.png')).write_bytes(base64.b64decode(data))
  ledger['icons'][name]={'status':'completed','usage':result.get('usage',{}),'request':spec};save()
  print(name,'generato; saldo',balance())
parser=argparse.ArgumentParser();parser.add_argument('command',choices=['balance','submit','poll','download','pack','icons','advance','batch']);parser.add_argument('values',nargs='*');args=parser.parse_args()
if args.command=='balance':print('Saldo',balance(),'Speso',spent(),'Disponibile con riserve',remaining())
if args.command=='submit':submit(args.values)
if args.command=='poll':poll()
if args.command=='download':download()
if args.command=='pack':pack()
if args.command=='icons':icons(int(args.values[0]))

if args.command=='advance':
 poll()
 if not any(job.get('status') not in ('completed','failed') for job in ledger['effects'].values()):
  next_id=next((x['id'] for x in PLAN['effects'] if x['id'] not in ledger['effects']),None)
  if next_id:submit([next_id])
  else:print('Tutti i VFX sono pronti')

if args.command=='batch':
 import time
 packed=-1
 while True:
  poll()
  completed=sum(job.get('status')=='completed' for job in ledger['effects'].values())
  if completed!=packed:download();pack();packed=completed
  pending=any(job.get('status') not in ('completed','failed') for job in ledger['effects'].values())
  next_id=next((x['id'] for x in PLAN['effects'] if x['id'] not in ledger['effects']),None)
  if not pending:
   if not next_id or remaining()<2:break
   submit([next_id])
  time.sleep(8)
 icons(25)
 pack()
 print('Flusso completato; saldo',balance(),'generazioni spese',spent())
