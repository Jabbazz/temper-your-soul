# Temper your soul

Gioco d’azione 2D per browser in **TypeScript strict**, Canvas 2D e DOM, senza motore di gioco né dipendenze runtime nel browser (server cooperativo Node con WebSocket). I principi sono ispirati ad Ashen Realm: le abilità dipendono dall’equipaggiamento. Il prototipo originale si chiamava Emberfall; il nome del gioco attuale è **Temper your soul**.

**Stato al 1 novembre 2026:** prototipo TypeScript con quattro dungeon, tre classi, profili locali multipli, livelli/XP, mana, 25 famiglie di oggetti, vincoli di classe, GS, audio e cooperativa autorevole fino a quattro giocatori. La revisione locale della PR #4 mantiene mappe, 32 servitori a tema con élite, luogotenenti/pre-boss, Bestiario e scelta delle direzioni lungo otto tappe. **Nessuna ricompensa intermedia**: niente XP, oggetti, braci, cure a fine stanza, sigilli, tempre o Altare. Le skill restano quelle dell’equipaggiamento; solo il boss finale assegna gli XP e il bottino già previsti (25% di possibilità di un oggetto). La progressione tra stanze verrà progettata in un secondo momento. Salvataggio v7 compatibile con v6, protocollo cooperativo 5. La qualità visiva e il bilanciamento richiedono ancora prove manuali; il permadeath non è implementato.

## Prima di lavorare: istruzioni per collaboratori e agenti AI

Questa sezione si applica anche a **Claude, Codex e qualsiasi altro agente** che legga il repository. Il proprietario richiede esplicitamente sincronizzazione e aggiornamenti durante il lavoro.

1. **Prima di modificare qualsiasi file**, comunica in italiano cosa hai capito, cosa controllerai e quale incremento intendi fare. Leggi questo README, le istruzioni dell’agente ([CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md)), la [ripartizione dei compiti](docs/ripartizione-compiti.md) e i documenti pertinenti.
2. Controlla cartella, ramo e modifiche locali, poi **esegui un pull prima di iniziare nuove modifiche**:

   ```bash
   git rev-parse --show-toplevel
   git status --short
   git branch --show-current
   git pull --ff-only
   ```

   Il repository principale è [Jabbazz/temper-your-soul](https://github.com/Jabbazz/temper-your-soul), remote `origin`, ramo `main`. Il comando sopra usa l’upstream del ramo corrente; non puntare alla cieca `origin/main` da un altro ramo. Per creare un nuovo ramo di lavoro, aggiorna prima il ramo di partenza. Per Codex usa il prefisso `codex/`.
3. **Non proseguire ignorando un pull fallito.** Se manca l’accesso di rete, il ramo diverge o ci sono conflitti, comunica l’impedimento. Conserva il lavoro locale: niente reset distruttivi, force push o stash automatici delle modifiche altrui. Integra soltanto quanto autorizzato; chiedi una decisione se serve scegliere fra modifiche incompatibili. Su Windows assicurati di operare nel repository del progetto, non in quello eventualmente presente nella home dell’utente.
4. Durante il lavoro **mantieni aggiornato l’utente**: breve avanzamento almeno circa ogni minuto di lavoro attivo, con risultati, decisioni, problemi e cambi di direzione. Non limitarti a messaggi iniziali e finali. Non inventare verifiche o approvazioni manuali.
5. Procedi per incrementi piccoli. Prima di cambiare una parte leggine il codice; dopo le modifiche esegui `npm run verify`. Se cambi regole, aggiungi test significativi; se cambi la UI, controllala anche nel browser.
6. Aggiorna design, roadmap e bug quando cambiano decisioni o stato. Alla fine spiega cosa è cambiato, verifiche eseguite, limiti e prova manuale ancora necessaria.
7. **Commit e push solo su richiesta esplicita dell’utente**, con messaggio descrittivo in italiano. Prima di pubblicare ricontrolla `git status` e l’allineamento col remoto; se nel frattempo ci sono nuovi commit, integra in sicurezza e ripeti le verifiche pertinenti. Riporta ramo e hash pubblicato. Mai force push.

Quando due persone lavorano contemporaneamente, preferire rami distinti e modifiche coordinate: gli agenti non devono sovrascrivere il lavoro dell’altro collaboratore. Questo README è il punto di ingresso; i dati nel codice e [game-design.md](docs/game-design.md) descrivono le regole correnti. Le sezioni storiche della roadmap non annullano le decisioni più recenti.

## Avvio locale

### Versione e note di aggiornamento

Il menu mostra **v0.02.00** al centro in basso e **Changelog** in basso a sinistra, consultabile senza uscire dal menu. Versione e note sono incluse nella build; la fonte del numero è `package.json`. Gli agenti devono aggiornarle per ogni PR o commit diretto a main autorizzato, riportando anche i valori prima → dopo per il bilanciamento: [procedura completa](docs/versioning.md). Le note precedenti restano nello storico. Nessuna modifica ai valori di combattimento in questo incremento.

Verifica dell’incremento versioning: 557 test in 43 file, tipi e build superati; aspetto del menu ancora da confermare dall’utente.

Convenzione **vA.BB.CC**: da `v0.02.00` il nuovo feature parte a `v0.02.01`, poi ogni commit successivo passa a `.02`, `.03` e così via. Il merge in main incrementa BB e azzera CC (`v0.03.00`); i nuovi feature partono da quel main a `v0.03.01`. Anche un commit diretto autorizzato a main incrementa BB e azzera CC. Il primo commit del feature registra l’incremento di creazione, senza contarlo due volte; apertura della PR e push senza nuovi commit non aumentano il numero. La cifra A cambia solo su decisione esplicita. Dettagli su branch paralleli e note nella [procedura](docs/versioning.md).

Richiede **Node.js 22** e npm. Le versioni degli strumenti sono fissate nel lockfile: TypeScript 5.6.3, Vite 5.4.11 e Vitest 2.1.8. Non aggiornare le dipendenze incidentalmente a un’altra modifica.

```bash
git clone https://github.com/Jabbazz/temper-your-soul.git
cd temper-your-soul
npm ci
npm run dev
```

Apri l’URL stampato da Vite, normalmente **http://localhost:5173/** oppure **http://127.0.0.1:5173/**. Se la porta è occupata Vite può sceglierne un’altra: usa quella effettiva. Il processo `npm run dev` deve rimanere in esecuzione; un link locale non avvia da solo il server. Per una copia già esistente esegui prima il flusso di sincronizzazione sopra.

```bash
npm run build
npm run preview
```

La build è in `dist/`, con script classico IIFE e risorse locali: è pubblicabile su hosting statico e `dist/index.html` si può aprire anche con doppio clic. `dist/` non va committata. I salvataggi sono del browser/origine: `localhost`, `127.0.0.1`, un’altra porta e `file://` possono vedere dati differenti.

| Comando | Scopo |
| --- | --- |
| `npm run dev` | Server di sviluppo e ricaricamento automatico |
| `npm run typecheck` | TypeScript client e server, senza emettere file |
| `npm run server` | Server cooperativo + build statica su porta 4173, dopo `npm run build` |
| `npm run benchmark:network` | Confronto di traffico e decodifica: quattro giocatori, 40 secondi simulati |
| `npm test` | Suite Vitest headless |
| `npm run build` | Tipi e build di produzione |
| `npm run verify` | Tipi, tutti i test e build |
| `.\tools\verify.ps1` | Verifica su Windows; cerca anche l’installazione portatile locale di Node se disponibile |

## Cosa è implementato

### Personaggi, classi e inventario

- Profili locali multipli: creazione, selezione, annullamento della bozza e rimozione con conferma nominativa. Ogni personaggio ha inventario, equipaggiamento, XP e record separati; la selezione attiva viene salvata.
- Nome da 3 a 20 caratteri, sesso e classe scelti alla creazione. Nome, sesso e classe non sono modificabili dopo la conferma. Il sesso non è descritto nei riepiloghi del profilo, ma resta salvato per lo sprite.
- Classi: **Guerriero, Arciere, Mago**. Nessun bonus innato alle statistiche per classe: è l’oggetto a concedere la skill dello slot.
- Quattro slot: primaria, secondaria, armatura, stivali. Ogni nuovo personaggio riceve quattro pezzi **Comuni bianchi di classe**, livello oggetto 1, 20 GS ciascuno, già equipaggiati: **80 GS totali**. Queste varianti bianche non cadono dai boss.
- 25 famiglie con rarità Comune bianca, Non comune verde, Raro blu, Epico viola e Leggendario rosso. La rarità scala le skill; il livello oggetto entra attualmente nel GS, non aggiunge un secondo moltiplicatore alle skill.
- Classe richiesta su ogni famiglia: archi solo Arciere; spade, martelli e lance Guerriero; bastoni/scettri e globi Mago. Anche secondarie, armature e stivali hanno una classe specifica: vedere [item-classes.ts](src/features/items/item-classes.ts).
- Oggetti incompatibili più scuri, con classe richiesta nei dettagli. Niente equip da pulsante, clic destro o drag-and-drop. Restano selezionabili per leggerli, conservarli o scartarli. I vecchi pezzi incompatibili vengono rimossi dagli slot senza cancellarli dallo zaino.
- Zaino senza filtri per slot: ordinamento per rarità, tooltip, clic destro per equipaggiare, trascinamento sullo slot corrispondente, scarto con conferma. Gli oggetti equipaggiati non si scartano.
- Pulsante **Menu principale** in alto a sinistra, anche durante la partita: abbandona l’incontro senza premi aggiuntivi.

### Livelli, mana e gear score

- Livello iniziale 1, XP cumulativi per vittoria. Costo del passaggio di livello: `100 + 50 × (livello attuale − 1)`. Per ora salire di livello non concede bonus automatici di potenza.
- Mana massimo 100, rigenerazione base 8/s più bonus degli oggetti e della rarità. Ogni skill ha un costo; senza mana non parte e non avvia la ricarica. Pausa e fine partita fermano la rigenerazione.
- GS per pezzo: `min(100, baseRarità + livelloOggetto − 1)`. Basi 20/40/60/80/100; livello oggetto 1–20. Esempi: Arco novizio bianco livello 1 = 20 GS; Arco del cacciatore verde livello 1 = 40 GS.
- GS del personaggio = somma dei quattro pezzi equipaggiati compatibili, massimo 400. Gli oggetti solo nello zaino non contano.
- HUD centrale in basso: vita rossa a sinistra, livello al centro, mana blu a destra, XP sotto e quattro icone skill in ordine **DX / SX / Q / E**.

I valori numerici di bilanciamento sono provvisori, salvo le richieste esplicite riportate nel design.

### Dungeon e bottino

| Dungeon | Boss | Pericolo | GS minimo | XP | Set principale | Livello set / verdi |
| --- | --- | --- | --- | --- | --- | --- |
| Cripta | Guardiano della cripta | T1 | Nessuno | 100 | Reliquie dell’ossario · Raro | 1 / 1 |
| Palude spenta | Madre delle spore | T2 | Nessuno | 180 | Custode dei rovi · Epico | 5 / 1 |
| Fucina in rovina | Colosso della fornace | T3 | **100** | 280 | Anima della fornace · Leggendario | 10 / 6 |
| Ghiacciaio eterno | Custode del ghiaccio | T4 | **200** | 400 | Cuore del ghiacciaio · Leggendario | 15 / 11 |

Mappe, ostacoli, schemi di attacco e sprite dei boss sono distinti. Movimento e cariche dei boss collidono con i pilastri; i teletrasporti atterrano fuori dagli ostacoli. Non c’è ancora pathfinding completo: un boss può fermarsi contro un pilastro se il giocatore resta esattamente dietro.

Le card hanno altezza uniforme, artwork composti da sprite effettivo e tema della mappa, pallini di pericolo della stessa misura e tooltip **«Loot rate %»** che segue il cursore. Gli ingressi T3/T4 sono bloccati anche nella logica di avvio quando manca GS.

**Bottino condizionato, uguale come struttura su tutti i boss:**

1. 25% di ottenere un oggetto, 75% di non ottenere nulla; massimo un oggetto per vittoria. XP e record vengono comunque assegnati alla vittoria.
2. Se l’oggetto cade: **1/3 set e 2/3 Non comune verde**, cioè 33,33% e 66,67%, normalizzati al 100%.
3. In ciascun gruppo ci sono quattro pezzi, uno per slot, con probabilità uguale del 25%.

Ogni singolo pezzo di set ha quindi **2,0833% per uccisione**; ogni singolo verde **4,1667%**. Il tooltip distingue ripartizione dopo il drop e probabilità complessiva per uccisione. Non confondere queste due percentuali. Non c’è filtro per la classe del giocatore: il grind comprende oggetti inutilizzabili dalla classe attiva.

Ogni boss ha **otto combinazioni esplicite** in [loot-tables.ts](src/features/loot/loot-tables.ts), non pesca liberamente dal catalogo. I set sono tematici: **nessun bonus al completamento del set**. La Cripta non supera il Raro. Le famiglie di origine di un set possono comparire altrove in variante verde; `exclusiveTo` indica l’origine storica, non sostituisce le tabelle effettive.

### Discesa: revisione della PR #4

La revisione locale della PR #4 mantiene mappe, 32 servitori a tema con élite, luogotenenti/pre-boss, Bestiario e scelta delle direzioni lungo otto tappe. **Nessuna ricompensa intermedia**: niente XP, oggetti, braci, cure a fine stanza, sigilli, tempre o Altare. Le skill restano quelle dell’equipaggiamento; solo il boss finale assegna gli XP e il bottino già previsti (25% di possibilità di un oggetto). La progressione tra stanze verrà progettata in un secondo momento.

Le tappe restano: Soglia → due direzioni di Scontro → Scontro/Prova/Reliquiario → Luogotenente → Santuario/Assedio → Scontro/Caccia → Anticamera → Boss. Reliquiario, Santuario e Anticamera sono stanze tranquille, senza premi o recuperi di vita. Le Prove mantengono gli obiettivi; completarli non assegna bonus.

Le porte mostrano il tipo di stanza: in cooperativa tutti i membri vivi devono sostare sulla stessa uscita. Il Bestiario conserva le uccisioni. Restano il Duello sbloccato dopo la prima vittoria e il Pellegrinaggio già presenti nella PR. Non sono disponibili gradi di tempra né menu a tendina per dungeon/modalità: la lobby usa pulsanti.

I vecchi campi del salvataggio relativi a braci/benedizioni/gradi sono conservati per non perdere dati, ma non attribuiscono bonus e non sono utilizzabili. Il protocollo 5 impedisce di mescolare client e server delle due versioni. Aggiornare tutte le schede dopo il riavvio.

Multiplayer: integrata la copia visuale `NetworkView`, che interpola camera, giocatori, boss, proiettili e servitori a ogni fotogramma senza modificare HUD, regole o premi autorevoli. Server 60 Hz e trasporto 30 Hz invariati; ritardo visuale provvisorio di circa 33 ms, nessuna predizione locale. Compatibile con stanze senza boss e luogotenenti. Integrati anche test della cache del pavimento, rune della Cripta fuori dalla cache e watcher Vite che ignora `.tools/` e `dist/`. La fluidità osservata dall’utente con una sola scheda per finestra non sostituisce una prova giocata della versione combinata.

Prossimo passo: prova manuale di porte, mappe, servitori e pre-boss in singolo/cooperativa; poi definire insieme la progressione fra stanze. Non rigenerare sprite o ritratti: revisione sospesa.

Verifica automatica della revisione: `npm run verify` superato, **555 test in 42 file**, tipi client/server e build. Le prove visive e giocate di questa revisione sono ancora a carico dell’utente.

### Party cooperativo sincronizzato

Server autorevole **Node + WebSocket**: una sola simulazione a 60 Hz per stanza, input e snapshot a 30 Hz. Il browser rappresenta lo stato ricevuto; HP, mana, collisioni, ricariche, danni, esito e bottino sono decisi dal server. Il client non invia posizioni o danni. Nessuna dipendenza di rete nel bundle browser; `ws` gira soltanto sul server e `tsx` esegue il server TypeScript.

1. Crea/seleziona un personaggio, apri **Party** in alto a destra e premi **Crea party**.
2. **Copia invito** condivide un URL `?party=<codice>`. Chi lo apre sceglie/crea il proprio personaggio e si unisce alla stessa stanza (massimo quattro membri).
3. Solo il creatore/leader sceglie il dungeon. Tutti confermano **Sono pronto**, poi il leader preme **Avvia dungeon**. Cambiare destinazione azzera le conferme. Il server verifica il GS di **tutti**: T3 100, T4 200.
4. Alleati visibili con sprite/equipaggiamento, nome e barra vita. Proiettili, zone e colpi alleati non infliggono fuoco amico; attacchi, contatto e cariche del boss possono colpire ciascun membro. Il boss prende di mira il vivo più vicino. Un KO rimane fuori combattimento fino al prossimo incontro; sconfitta solo quando tutti sono KO. Nessuna resurrezione né permadeath aggiunti.
5. A vittoria/sconfitta si apre il **Combat report** condiviso: danni effettivi inflitti, subiti e guarigione per membro, senza overkill. Guarigione resta 0: cure/Chierico non sono ancora implementati. Anche il singolo ha il report.

Il pannello mostra il **ping RTT** misurato ogni due secondi, con variazione dell’ultima misura nel tooltip. In cooperativa aprire menu/lobby o cambiare scheda **non mette in pausa il mondo**; l’input scade dopo 350 ms senza comandi. Uscita, ricaricamento e disconnessione abbandonano l’incontro (nessun rientro nello stesso combattimento); il corpo diventa KO. Se il leader esce, il comando passa al primo membro rimasto. Tornare al menu durante l’incontro esce dal party. Cambiare profilo esce dal party; cambiare equipaggiamento in lobby aggiorna il personaggio sul server e annulla il proprio pronto.

Verificato anche il percorso leader su Vite locale → invito pubblico → ospite sul tunnel, fino alla vittoria e al salvataggio personale dei premi. In quella prova il ping del browser in sviluppo ha avuto picchi fino a 922 ms (8 campioni, mediana 104 ms), mentre la build pubblica ha misurato 14–52 ms nelle prove di combattimento. La misura WebSocket diretta su 40 campioni è riportata sotto; il tempo percepito comprende anche cadenza input/snapshot e lavoro del browser. Profilazione del percorso di sviluppo ancora da fare: per la prova condivisa usare preferibilmente la build servita da 4173/tunnel.

Ogni membro ancora connesso alla vittoria riceve gli XP interi del dungeon, il proprio record e un tiro personale di bottino (25%, massimo un pezzo), salvati nel proprio browser prima di mostrare i premi; anche un membro KO riceve il premio se il party vince. Nessuna divisione degli XP. Premi estratti una sola volta per incontro sul server; snapshot ripetuti non ripetono l’assegnazione client. Stanze e incontri sono in memoria: riavviare il server li elimina. Personaggi/equipaggiamento arrivano dai salvataggi locali validati: questa versione di prova non è un’economia protetta contro modifiche manuali dei salvataggi.

Avvio cooperativo (due terminali per sviluppo, solo il secondo per condividere la build):

```bash
npm run build
npm run server                  # http://127.0.0.1:4173, build + /party WebSocket + /health
# In un altro terminale, se si sviluppa:
npm run dev                     # Vite 5173, proxy WebSocket verso 4173
```

Se il leader gioca da localhost mentre gli amici usano il tunnel, avviare il server con **`PUBLIC_URL`** impostato all’URL HTTPS effettivo del tunnel. In PowerShell: `$env:PUBLIC_URL='https://<indirizzo-del-tunnel>'; npm run server`. «Copia invito» userà quell’origine pubblica anche per il leader locale. Dopo aver cambiato tunnel, aggiornare la variabile e riavviare il server; senza questa configurazione gli inviti usano l’indirizzo della pagina aperta.

Per il tunnel pubblico puntare a **4173**, cioè al server cooperativo, per esempio `cloudflared tunnel --url http://127.0.0.1:4173 --protocol http2`. Tenere attivi server e tunnel. Il server espone solo `dist/`, non il workspace. L’URL del tunnel è temporaneo: non va salvato come indirizzo permanente. Le build pubbliche si aggiornano con `npm run build`; dopo cambi al codice server riavviare `npm run server`. Porta alternativa tramite variabile d’ambiente `PORT` (aggiornare proxy/tunnel se cambia). `npm run preview`, hosting statico e `file://` consentono il singolo, ma non ospitano stanze multiplayer.

### Ottimizzazione multiplayer (31 ottobre 2026)

- Protocollo ordinato v2: tuple compatte per personaggi/boss; tipi di proiettile/zona e nascite trasmessi una sola volta per incontro; dopo si inviano rimozioni. Posizione dei proiettili lineari e countdown sono ricostruiti dal tempo autorevole. La simulazione resta a 60 Hz, la rete a 30 Hz. Arrotondamento solo visuale delle coordinate/ricariche dei personaggi: errore massimo 0,005 unità; danni, HP e regole server invariati.
- Ogni frame è serializzato **una volta per stanza**, condiviso fra i membri; report/premi solo a fine incontro e trasmissione del mondo interrotta dopo l’esito. I delta non vengono saltati in silenzio: sequenza non valida o connessione troppo lenta provocano un’uscita esplicita. Dopo questo aggiornamento ricaricare la pagina; il server rifiuta client col vecchio protocollo con un messaggio di aggiornamento.
- Il client riutilizza proiettili/zone per id e applica al massimo uno stato per fotogramma, preservando gli eventi; gli esiti finali e il salvataggio non attendono il rendering di una scheda in background. Ogni ping aggiorna soltanto il badge, senza ricreare il party o interrompere il focus nella lobby.
- Gli sprite attuali vengono rasterizzati una volta per posa/equipaggiamento e disegnati con un’unica operazione per personaggio. Cache limitata a 256 fotogrammi per gestire quattro equipaggiamenti; eliminati array temporanei nel controllo delle collisioni e riutilizzate le descrizioni visive degli alleati. Nessun nuovo asset o cambiamento dello stile.

Benchmark ripetibile: `npm run benchmark:network`. Fixture sintetica di 40 secondi con quattro giocatori e Ghiacciaio in furia, fino a 226 proiettili, 1.200 aggiornamenti: **28.582.862 → 480.050 byte**, circa **−98,3%** rispetto agli snapshot completi. Test confrontano traiettorie, zone, rimozioni, eventi, cambio incontro e premi. I tempi di decodifica stampati dipendono dalla macchina e dal riscaldamento del runtime.

Confronto browser tramite tunnel, due Edge headless isolati a 1440×1000, finestra di 8 secondi: traffico ricevuto **889.719 → 51.553 byte (−94,2%)**, tempo CPU del thread principale **4.099 → 3.469 ms (−15,4%)**, tempo script **1.229 → 944 ms (−23,2%)**. Entrambe le versioni erano già a circa 60 FPS, senza frame oltre 25 ms nella finestra: non è una promessa di aumento FPS universale. Ulteriore prova con quattro browser/classi miste: circa **59,8 FPS**, due frame oltre 25 ms su 478. Le finestre reali non sono replay perfettamente identici; conferma della fluidità sul PC del giocatore ancora necessaria. Vittoria, report identico e premi personali verificati anche dopo il cambio di protocollo.

### Diagnostica FPS e completamento dell’ottimizzazione (1 novembre 2026)

Misure storiche precedenti all’integrazione delle stanze; non descrivono le prestazioni della versione combinata.

Il tasto **F2**, o il pulsante **FPS · F2**, apre un pannello facoltativo con FPS, tempo dei fotogrammi al 95° percentile, lavoro per frame, aggiornamenti di rete al secondo, traffico approssimato, RTT e costi del server. I dati server arrivano da `/health` soltanto quando il pannello è visibile e il client è in party. CPU server è una percentuale di **un core**, non il consumo totale del PC; il tempo del frame non misura direttamente il carico della GPU. Nessuna telemetria inviata a terzi.

La Cripta memorizza il pavimento in tasselli con cache limitata a 8 MiB per arena; torce animate e rune sono disegnate a parte. Completata la verifica di sei viste, inclusi bordi e coordinate frazionarie: **zero differenze di pixel** rispetto alla versione senza cache. Due test controllano riutilizzo, separazione fra arene e rimozione dei tasselli vecchi. Il caricamento audio limita a due le operazioni contemporanee; selezione delle piste e scritture di volume evitano lavoro ripetuto quando lo stato non cambia. Queste ottimizzazioni erano già integrate nel main; la ripresa ne completa verifica e documentazione.

Corretto un problema rilevato nelle prove Windows: il watcher di Vite includeva `.tools/` e poteva arrestarsi con `EBUSY` su file bloccati dei profili browser. Ora ignora `.tools/` e `dist/`. È un problema dell’ambiente di sviluppo/test, non una causa dimostrata del calo durante una partita sulla build pubblica.

Profilo della versione attuale: un browser con accelerazione grafica e un alleato simulato tramite socket, senza un secondo renderer sul PC. Circa **159 FPS in singolo e 165 in party**, frame p95 circa 6,2 ms; server circa **1,5–3,1% di un core**, passo p95 0,11–0,13 ms, invio p95 0,34–0,35 ms, rete 30 aggiornamenti/s e circa 6,3 KB/s nella finestra misurata. In questa prova il server non è risultato saturo e il calo segnalato non è stato riprodotto: non è una garanzia per altre reti, dungeon o carichi. La misura con F2 durante il problema reale resta necessaria; aggiornamenti del mondo a 30 Hz e FPS del canvas sono grandezze distinte. Questo profilo precede l’interpolazione implementata nel successivo incremento descritto sotto.

Verifica storica prima dell’integrazione: **484 test**, tipi client/server e build superati. Controllati il pannello desktop/mobile e la lettura dei dati server. Conferma giocata dell’utente ancora da ricevere. La prossima parte della progressione resta da concordare, senza modifiche implicite a XP, drop o permadeath.

### Salvataggi locali

- Chiave: `temper-your-soul:save`; formato **v7**, raccolta `character-roster` con profili, id attivo e contatore degli id. La v7 aggiunge braci, benedizioni, bestiario, record delle discese e Pellegrinaggio; i salvataggi v6 si leggono senza perdite.
- Migrazione dei precedenti salvataggi singoli v1–v5 senza reset di inventario, XP o record. Copia precedente alla raccolta in `temper-your-soul:save:before-roster`.
- Dati illeggibili conservati in `temper-your-soul:save:corrupt`. Dati esterni sempre validati: vedere [save-format.ts](src/features/character/save-format.ts), [character-roster.ts](src/features/character/character-roster.ts) e [save-store.ts](src/features/character/save-store.ts).
- Si salva a creazione/selezione/rimozione, cambio equipaggiamento e vittoria, prima di mostrare i premi; nella discesa anche a ogni stanza per aggiornare il bestiario (nessun XP o valuta intermedia). Skill, GS e classe richiesta dell’oggetto si ricalcolano dal catalogo; non si salvano statistiche duplicate.
- Nessun account, salvataggio cloud, inventario condiviso fra profili o sincronizzazione dei progressi tra dispositivi. Il server conserva solo stanze/incontri temporanei. Con due schede aperte, ognuna riprende i salvataggi dell’altra appena avvengono; due salvataggi quasi simultanei possono ancora sovrascriversi.
- **Permadeath non implementato:** una sconfitta non elimina attualmente il personaggio. La rimozione dal menu è manuale.

## Controlli

| Comando | Azione |
| --- | --- |
| WASD | Movimento |
| Mouse | Mira |
| Clic sinistro tenuto | Skill della primaria |
| Clic destro | Skill della secondaria |
| Q | Skill dell’armatura |
| E | Skill degli stivali |
| ESC | Pausa; indietro nei menu |
| R | Ricomincia l’incontro durante una partita |
| M | Audio attivo/disattivo |
| F | Schermo intero |

I tasti di gioco non intercettano la digitazione nei campi della creazione. Le scorciatoie del browser con Ctrl/Meta/Alt restano disponibili.

## Direzione grafica e limiti attuali

**UI: C — Reliquiario**, tema globale rame/prugna, bordi asimmetrici e testi caldi. Anche i nuovi comandi devono usare questo tema. L’hover dei profili è scuro, senza fondo giallo o contrasto aggressivo.

**Personaggi: A — Fantasy compatto.** Sprite piccoli modulari e animati; ritratti grandi statici con equipaggiamento sovrapposto. Esistono basi e adattamenti maschili/femminili, icone oggetto e icone spell. Gli otto oggetti aggiunti per completare i set hanno effetti e rappresentazioni propri; i nuovi strati del ritratto sono disegnati nel codice. I PNG approvati sono in `src/assets/portraits/` e vengono serviti localmente.

**La revisione di sprite e ritratti è sospesa su richiesta dell’utente**, per non continuare a consumare crediti in rigenerazioni. Vestibilità, prese, offset, proporzioni e profondità hanno ancora difetti noti. Non rigenerare né rifare questi asset per ogni incremento: riprendere la revisione solo su richiesta esplicita, con un piano e criteri concordati. La scelta della direzione artistica non equivale all’approvazione della resa attuale.

**Boss (proposta del ramo `feature/grafica-boss`):** pixel art di terzi a licenza libera (CC BY e CC0, crediti nel pannello Audio e in `src/assets/art/boss/LEGGIMI.md`), ricolorata con la tavolozza del gioco e preparata da `tools/arte/prepara_boss.py`. Se un'immagine non si carica resta la grafica a matrici. Non tocca personaggi, ritratti e oggetti.

Anteprime di sviluppo: `/character-animation.html` confronta equipaggiamenti e animazioni senza toccare il salvataggio; non è un ingresso della build di produzione. `/ui-preview.html` conserva le precedenti proposte del tema. I preset dell’anteprima grafica sono liberi; i vincoli di classe sono applicati nel gioco reale.

## Architettura e punti di ingresso

Organizzazione per funzionalità, test `*.test.ts` accanto al codice.

| Area | Responsabilità / file utili |
| --- | --- |
| `src/game.ts`, `src/main.ts` | Avvio, profilo attivo, schermate, ciclo, collegamento delle parti e premi |
| `server/index.ts`, `features/network/` | HTTP/WebSocket, stanze, autorizzazione leader, protocollo e snapshot; client di rete |
| `src/core/` | Vettori, RNG iniettato, input per azioni, camera |
| `features/character/` | Identità, creazione, inventario, progressione, raccolta profili e salvataggio |
| `features/items/` | Catalogo, classi richieste, rarità, skill e GS; `item-skills.ts`, `dungeon-item-skills.ts` |
| `features/loot/` | Pool espliciti per boss, tre estrazioni condizionate e probabilità condivise con la UI |
| `features/dungeons/` | Quattro dungeon e `dungeon-access.ts` per le soglie GS |
| `features/arena/`, `boss/`, `combat/`, `skills/`, `player/`, `match/` | Regole, collisioni, boss, mana, skill e simulazione |
| `features/presentation/` | Sprite, pose, effetti, look di proiettili/zone, mappe e registrazioni dei ritratti |
| `features/ui/` | Profili, inventario, card, tooltip, HUD e tema; regole delegate al dominio |
| `src/style.css`, `index.html` | Tema globale e struttura DOM |
| `src/testing.ts` | Supporto alle simulazioni deterministiche nei test |

I percorsi `features/` della tabella sono sotto `src/`. La logica avanza solo in **`Match.step(dt, intent)` in singolo / `Match.stepParty(dt, intents)` sul server cooperativo a 60 Hz**. La simulazione non conosce DOM, Canvas, tempo reale o `Math.random`: le regole casuali usano `Rng` iniettato. Dati, comportamento e rappresentazione restano separati; gli eventi descrivono cosa è successo e vengono ascoltati da effetti/audio/pose.

Per un nuovo oggetto servono: id stabile, famiglia e classe, skill/statistiche/costo mana, icona oggetto e spell, aspetto dei proiettili/zone/scatti, strati indossabili nelle due versioni di corpo e voce esplicita nei pool corretti. Non rinominare gli id già salvati. Rispettare la sospensione della revisione grafica: concordare eventuali nuove generazioni, senza introdurre fallback invisibili o usare solo l’icona dello zaino come vestito.

## Verifiche e prossimi passi

`npm run verify` deve uscire con codice 0. I **568 test attuali** coprono simulazione, contenuti, classi, salvataggi, profili, GS, raggiungibilità delle soglie e probabilità; il conteggio va aggiornato quando cambia. La suite è headless e **non certifica** DOM, aspetto, bilanciamento o sensazione di gioco. Sono stati eseguiti anche controlli browser isolati desktop/390 px; gli script temporanei locali non costituiscono una suite browser versionata.

Priorità per chi riprende il lavoro:

Il prossimo incremento richiesto riguarda un’altra parte della progressione del personaggio, **ancora da definire con il proprietario**. Non dedurre nuove regole di livelli, talenti, permadeath o ricompense da questa intenzione. La cooperativa è stata dichiarata funzionante dall’utente; la resa della versione ottimizzata sul suo PC resta da confermare.

1. **Conferma giocata della cooperativa:** provare con amici su reti diverse, classi miste e tutti i boss. Già verificati due browser isolati via tunnel: lobby, leader, movimento, skill, vittoria, report identico e salvataggio XP senza duplicazioni. Misura RTT su 40 campioni da questa macchina: locale mediana 0,34 ms / p95 1,20 ms; tunnel mediana 13,85 ms / p95 17,05 ms. La prova automatizzata con input validi non certifica bilanciamento o qualità della connessione da altre reti. Prossimi miglioramenti: predizione locale, rientro dopo disconnessione, server persistente e identità affidabili.
2. **Prova giocata dei tre personaggi sui quattro boss.** Verificare leggibilità, mana, collisioni, ritmo e progressione del grind. Riprodurre e registrare i problemi effettivi; distinguere verifica automatica, fotogramma e conferma manuale dell’utente.
3. **Bilanciamento di oggetti e progressione.** Tarare danni, cooldown, costi, livelli oggetto e difficoltà; mantenere la struttura di drop richiesta e le soglie GS salvo nuova decisione dell’utente. I test verificano che ogni classe possa raggiungere 100 GS prima di T3 e 200 prima di T4, non quanto sia divertente o lungo farlo.
4. **Progettare e implementare il permadeath nel prossimo incremento concordato.** Prima definire cosa viene perso, cosa succede al profilo morto e come si ricrea un personaggio. Non assumere inventario condiviso, eredità o nuove penalità non decise.
5. **Robustezza dei salvataggi:** esportazione/importazione e migrazioni future (le due schede si allineano già con l’evento `storage`). Il server cooperativo è già implementato, ma non conserva i progressi: un eventuale salvataggio cloud richiede un incremento dedicato.
6. **Debito noto:** raggi di collisione non uniformi, camera senza limiti e interpolazione del singolo ancora assente, limiti documentati dei backup. Valutare gli aggiornamenti delle dipendenze in un intervento dedicato; gli avvisi storici in `bugs.md` non sono una nuova scansione aggiornata.
7. **Grafica:** resta nella TODO, sospesa; non è il lavoro da riprendere automaticamente.

Leggere sempre [docs/game-design.md](docs/game-design.md) per decisioni e valori, [docs/roadmap.md](docs/roadmap.md) per priorità e prove, [docs/bugs.md](docs/bugs.md) per difetti e limiti. Aggiornare questi file con i risultati del prossimo incremento.

## File esclusi e prototipo storico

`node_modules/`, `dist/`, `.tools/`, profili browser e screenshot temporanei locali non vanno pubblicati. Non committare credenziali, file `.env` o dati personali di test.

`legacy/emberfall-prototype/` conserva la bozza JavaScript originale, solo come riferimento storico: non fa parte della build né dei test. Il codice corrente si scrive in TypeScript dentro `src/` e `server/`.

### Interpolazione del multiplayer (1 novembre 2026)

Implementata `NetworkView`, una copia riservata alla rappresentazione: camera, giocatore, alleati, boss, proiettili e servitori interpolano le posizioni a ogni fotogramma fra gli stati ricevuti. Input, HUD, danni, collisioni, ricariche e premi continuano a usare lo stato autorevole. Le scie seguono le posizioni visuali; la mira locale resta agganciata al puntatore. Server a 60 Hz e trasporto a 30 Hz invariati.

Buffer visivo provvisorio di un aggiornamento (circa 33 ms); non è predizione del movimento locale. Scatti e teletrasporti vengono mostrati immediatamente, così come l’esito finale. Dopo oltre 250 ms senza aggiornamenti si riallinea la scena; senza nuovi dati si ferma all’ultima posizione confermata, senza inventare movimento o colpi. Valori regolabili in `NETWORK_VIEW`.

Verifica storica prima dell’integrazione: 484 test, tipi client/server e build superati. Sei nuovi test coprono posizioni intermedie, separazione dallo stato autorevole, alleati/boss/proiettili/servitori, arrivi irregolari, salti, interruzioni e fine partita. Nessun test visivo eseguito, su richiesta dell’utente: fluidità e ritardo percepito restano da confermare nella sua partita.
