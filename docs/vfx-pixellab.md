# VFX PixelLab e particelle

Richiesta e autorizzazione del proprietario: 1 novembre 2026. Budget di questa sessione: **39 generazioni**, prima VFX di tutte le skill, poi icone degli oggetti. Mob, boss e personaggi sono rimandati. Questa è un’eccezione esplicita alla precedente regola contro la grafica generata da IA; non cambia le regole dell’audio o degli asset di terzi.

## Risultato della sessione

16 atlanti animati (192 fotogrammi, circa 193 KB complessivi) e 22 icone trasparenti da 64×64. Consumo effettivo: **38,173061 generazioni** sulle 39 disponibili; saldo residuo **0,826939**, insufficiente per un’altra icona da una generazione. Un solo atlante è costato 1,173061 anziché 1: il limite è stato rispettato usando l’addebito effettivo.

## Organizzazione

- `src/assets/vfx/pixellab/manifest.json`: atlanti, frame, pivot, frequenza, loop, origine e consumo dichiarato dal provider. PNG locali trasparenti, nessun collegamento al servizio a runtime.
- `src/features/presentation/vfx/assets.ts`: caricamento e riproduzione degli atlanti; ripiego sui disegni precedenti durante caricamento/errore.
- `sprite-effects.ts`: eventi della simulazione → animazioni; legge buff e stati autorevoli. Limite di 96 effetti transitori.
- `particle-webgl.ts`: buffer riusato, massimo 1400 particelle, composizione additiva; Canvas 2D se WebGL manca o perde il contesto. Nessuna dipendenza runtime aggiunta.
- `tools/arte/pixellab-plan.json`: prompt riproducibili e priorità; `pixellab.py`: client REST ufficiale, ledger privato e protezione del budget. La chiave viene letta soltanto da `PIXELLAB_API_KEY` nell’ambiente del processo.
- `vfx-preview.html`: studio animato per sviluppo, apribile tramite Vite. Non è una prova giocata.

## Copertura

| Classe | Animazioni condivise dalle famiglie |
| --- | --- |
| Guerriero | Fendente direzionale, parata e impatto sullo scudo, rigenerazione/difesa, scatto fisico |
| Mago | Fuoco/acqua/terra/vento nei proiettili, impatti elementali, meteora, marea, aura della terra e canalizzazione, partenza/arrivo del teletrasporto esplosivo |
| Arciere | Frecce, artigli/furto vita, cerchio di evocazione e morsi del pet, scie dello scatto |

Gli effetti leggono eventi esistenti e snapshot: nessuna modifica a danni, hitbox, cooldown, mana o protocollo. I proiettili nemici restano disegnati sopra gli effetti del giocatore. Il lupo mantiene la sagoma esistente: nessuna generazione di creature in questo incremento.

## Provenienza e verifica

Generati con l’API ufficiale [PixelLab](https://api.pixellab.ai/v2/docs), termini consultati il 1 novembre 2026: [Terms of Service](https://www.pixellab.ai/termsofservice). La voce `PixelLab-output` nei crediti identifica questi output senza attribuire loro una licenza Creative Commons. Prompt, metadati e contatori pubblici sono nel piano/manifest; risposte integrali, token di servizio e credenziali rimangono nella cartella ignorata `.tools`.

Controlli automatici: geometria degli atlanti PNG RGBA, selezione dei fotogrammi, limiti/decadimento degli effetti, trasformazione e capacità dei buffer GPU, coerenza dei crediti e catalogo. Da confermare giocando: intensità luminosa, leggibilità nelle stanze affollate e cooperativa, prestazioni su GPU meno recenti e qualità percepita delle icone piccole. I valori estetici sono provvisori.

La versione di prova include anche la correzione locale già verificata della preda sotterranea nella Caccia della palude, con i suoi due test. La copia di lavoro originale è conservata.

## Punti aperti del prossimo giro

- Tre icone ancora precedenti: `grave_boots`, `ember_treads`, `rime_boots`. Tutte le armi, secondarie e armature hanno priorità in questa sessione.
- Sprite e animazioni di mob, boss e personaggi rimandati per esplicita richiesta del proprietario.
- La conversione del piano a pagamento richiede leggere quote e saldo effettivi del provider; non si presume un numero illimitato di generazioni e non si azzera automaticamente il budget locale.
- Conferma giocata del proprietario ancora da ricevere per leggibilità degli effetti e per la Caccia della palude. I controlli nel browser sono prove tecniche dell’agente.

## Revisione dopo la prima prova giocata

Gli effetti personali seguono il proprietario: il fendente usa posizione attuale e direzione del lancio; parata e buff leggono lo stato corrente. Nessun doppio cerchio al lancio dei buff. Vecchi archi, anelli, flash e barriere sono esclusi quando l’asset sostitutivo è disponibile. Raggio e arco visivi del fendente sono quelli della simulazione; il clipping impedisce alla splash di suggerire danno fuori dal settore. La risoluzione del colpo resta istantanea: l’animazione non diventa una hitbox persistente. Le teletraslazioni e le esplosioni a terra restano ancorate ai punti del mondo previsti. Nessuna ulteriore generazione consumata.
