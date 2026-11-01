# Temper your soul: design del gioco

## Aspetto del personaggio e oggetti indossati

Direzione artistica scelta dall'utente: **A — Fantasy compatto** (distinta dal tema UI C — Reliquiario). La tavola generata e un riferimento artistico, non un atlante utilizzabile direttamente. Prima traduzione modulare: basi a tre quarti in lino e cuoio, colori caldi, materiali ombreggiati, capelli a ciocche, mantelli aperti e spallacci con sagome differenti. L'approvazione della tavola non costituisce approvazione della resa del prototipo nel gioco.

Sviluppo grafico dei ritratti del personaggio **sospeso su richiesta dell’utente**: restano difetti di vestibilità e registrazione da rivedere in un incremento dedicato. Nessuna rigenerazione per le modifiche di gioco correnti. Sesso e classe ora si scelgono con il nome alla creazione e non si modificano dallo zaino; il formato v6 conserva più personaggi, identità e livello degli oggetti.

Le 17 famiglie hanno tre rappresentazioni: icona inventario, strato illustrato per la scheda personaggio e strato compatto da combattimento (48×48, inclusi margini per il movimento delle armi). Su richiesta dell'utente, il ritratto usa ora asset PNG dettagliati derivati dalla proposta A (`src/assets/portraits/`), con due basi e armature distinte per sesso, oggetti secondari, armi e stivali. `portrait-atlas.ts` collega ogni famiglia al suo asset; `portrait-layout.ts` ne registra posizione, scala e ritaglio. È possibile ingrandire il ritratto con Zoom. Gli elementi vengono ricomposti quando cambia l'equipaggiamento, non si sceglie un'illustrazione fissa di classe.

Il combattimento continua a usare `WEARABLES` e `characterPixels`, separati dal ritratto. `adventurer-body.ts` definisce articolazioni, fisionomie e proporzioni; `wearable-draw.ts` aggancia gli oggetti alle stesse pose. Riposo, camminata e lancio hanno cicli di 8 fotogrammi campionati. La base femminile è più esile anche sotto il collo, con proporzioni proprie di viso, spalle, vita e gambe; tutti gli oggetti vengono adattati a questi punti di attacco. Le parti sotto la presa di arco, martello, scettro, bastone e lancia passano dietro il corpo; la spada e gli oggetti secondari restano davanti. Un futuro scudo userà il livello davanti al torso, senza che questo incremento aggiunga uno scudo al catalogo.

L'arco ha flettenti curvi e corda separata di profilo; la posa di attacco mostra anche freccia e tensione. Queste sono pose visive, non modificano tempi, danno o geometria della skill. Il ritratto illustrato è statico; le animazioni sono del personaggio in gioco. La pagina di sviluppo `/character-animation.html` permette di confrontare il ritratto illustrato con lo sprite piccolo, entrambi i corpi, tutti gli oggetti e le animazioni, senza leggere o modificare il salvataggio; non fa parte della build di produzione.

Una nuova famiglia deve avere icona, skill con statistiche e icona spell. La revisione di `WEARABLES` e degli asset illustrati in `PORTRAIT_LAYERS` con entrambi i corpi è rinviata alla ripresa del lavoro grafico. Gli asset attuali vengono distribuiti localmente, senza nuove dipendenze o generazione remota durante il gioco.

Direzione UI scelta dall'utente: **C — Reliquiario**. Comandi principali in rame e prugna, bordi lavorati con angoli asimmetrici, rilievo e pannello del menu coordinato. Implementazione CSS senza nuove dipendenze.

Distingue le **decisioni prese** dai **valori provvisori** e dai **punti aperti**. Nessun valore numerico è definitivo, salvo dove indicato.

## Decisioni prese

- Il gioco si chiama **Temper your soul**. Repository: https://github.com/Jabbazz/temper-your-soul.
- Gioco **per browser**, in **TypeScript**, senza motore di gioco e senza dipendenze a runtime. Single-player locale.
- **Stessi principi di lavoro di Ashen Realm**: piccoli incrementi, simulazione a passo fisso separata dal disegno, dati / comportamento / rappresentazione separati, test accanto al codice, `verify` come comando unico, documentazione con decisioni e punti aperti distinti, nessun valore inventato per ciò che è ancora aperto.
- **Menu iniziale** con scelta del **dungeon**: la cripta del prototipo più altri **3 dungeon**, ognuno con una **mappa** diversa (dimensioni, tema grafico, ostacoli) e un **boss unico** con schemi di attacco propri.
- **Il personaggio si salva in locale** (nel browser, `localStorage`): inventario, equipaggiamento e record dei dungeon. Il backend cooperativo conserva soltanto stanze e incontri in memoria; nessun salvataggio cloud.
- **I boss lasciano oggetti** alla vittoria, con **rarità diverse**.
- **Gli oggetti conferiscono le abilità** (come in Ashen Realm): ogni oggetto sta in uno slot; la **famiglia** dell'oggetto determina la skill di quello slot, la **rarità** ne migliora i valori mantenendone l'identità. Ogni boss ha famiglie **esclusive** con abilità uniche che le altre non hanno.
- Quattro slot di equipaggiamento, uno per skill: **mano primaria** (skill 1, clic sinistro tenuto), **mano secondaria** (skill 2, clic destro), **armatura** (skill 3, Q), **stivali** (skill 4, E). Uno slot può restare vuoto (nessuna skill).

## Struttura del gioco (come funziona oggi)

Menu → Dungeon (scegli uno dei 4) → partita contro il boss → vittoria: bottino e record, oppure sconfitta: si riprova. Dal menu si apre anche l'**Equipaggiamento** (equipaggiare, rimuovere, scartare). Tutti i dungeon sono sempre selezionabili. Alla sconfitta non si perde nulla (regola provvisoria, vedi punti aperti).

## Provvisorio (non è una scelta di design)

Tutti i valori sono provvisori e modificabili: stanno in tabelle di dati con nome (file indicati).

### Impostazione e giocatore

- Visuale dall'alto, camera centrata sul giocatore (zoom 1,5, nessun limite ai bordi). Movimento con WASD, mira con il mouse, si può lanciare mentre ci si muove. Vittoria: il boss arriva a 0 PV. Sconfitta: il giocatore arriva a 0 PV.
- Grafica: pixel art disegnata dal codice (matrici di caratteri), particelle e ambiente procedurali. Audio: motore a canali guidato dai dati con registrazioni vere a licenza libera (vedi "Audio" sotto), acceso per impostazione.
- **Giocatore** (`PLAYER_STATS`): vita 100, velocità 177/s (in diagonale non aumenta), 0,65 s di invulnerabilità dopo un colpo. Raggio di colpo 9, corpo contro i pilastri 10 (`combat/collision.ts`).
- Ambientazione e testi del prototipo ("Ordine della Brace", "cripta", "guardiano") sono provvisori.

### Dungeon, mappe e boss

| Dungeon (id) | Pericolo | Mappa | Boss (id) | Vita | Carattere |
| --- | --- | --- | --- | --- | --- |
| La cripta (`crypt`) | 1 | 3200 x 2400, nessun ostacolo | Guardiano della cripta (`guardian`) | 1800 | quello del prototipo: raffiche, nova, frattura, carica, spirale, ventaglio |
| La palude spenta (`swamp`) | 2 | 2800 x 2800, 8 alberi morti, nebbia e funghi luminosi | Madre delle spore (`spore_mother`) | 2400 | lento e ingombrante, controlla lo spazio: nuvole di spore, cerchi di zone con centro sicuro, tentacoli, anelli che si chiudono, pioggia di spore, balzo tossico |
| La fucina in rovina (`forge`) | 3 | 3600 x 2200, 8 pilastri di ferro, lava | Colosso della fornace (`forge_colossus`) | 3000 | enorme (raggio di colpo 40), colpi pesanti e zone molto grandi: martellata con anello di schegge, file di lava con varco, raffiche, croce, spirale a due bracci, carica |
| Il ghiacciaio eterno (`glacier`) | 4 | 3000 x 3000, 7 colonne di cristallo, neve | Custode del ghiaccio (`frost_warden`) | 3600 | agile ed evasivo (velocità 165, quasi come il giocatore): ventagli di schegge, punte di ghiaccio, teletrasporto, bufera a spirali opposte, nova doppia, carica con zone sul percorso |

I valori di ogni boss (`BossStats`: vita, velocità, raggio di colpo, danno da contatto e carica, intervalli) e di ogni schema (`ByPhase`: normale / furia) stanno in `features/boss/guardian.ts` e `features/dungeons/<id>/`. Regole comuni: seconda fase (furia) sotto il 50% di vita; un boss lancia i propri schemi in rotazione e non ne inizia uno nuovo finché carica e azioni programmate non sono finite; il boss **ignora i pilastri** (vola) e può teletrasportarsi (Custode).

- **Pilastri**: bloccano il movimento del giocatore (che scivola lungo la superficie) e **assorbono i proiettili di entrambe le squadre**, quindi sono ripari. Fermano anche il colpo ravvicinato se tagliano la linea fino al bordo del boss. Non fermano le zone a terra.
- Vincoli verificati dai test per ogni dungeon: mappa 2000-4000 di lato, partenze libere, nessuna fessura più stretta del corpo del giocatore, danno per colpo <= 30 (proiettili) / 40 (zone) / 30 (contatto) / 40 (carica), zone con avviso >= 0,5 s, almeno 3 schemi esclusivi per boss.

### Skill base del mago (`features/skills/mage-skills.ts`)

La dotazione iniziale (oggetti Comuni di base): corrisponde esattamente alle skill del prototipo.

| Slot | Skill (id) | Ricarica | Effetto |
| --- | --- | --- | --- |
| 1 | Dardo arcano (`arcane_bolt`) | 0,2 s | proiettile, 19 danni, 440/s, raggio 4 |
| 2 | Globo di gelo (`frost_orb`) | 2,4 s | proiettile, 100 danni, 310/s, raggio 8; rallenta il boss 2 s |
| 3 | Meteora (`meteor`) | 5 s | zona di raggio 66 sul mirino, scoppia dopo 0,65 s, 210 danni |
| 4 | Passo astrale (`astral_step`) | 3,5 s | scatto di 125 verso la mira, invulnerabile 0,55 s (non accorcia un'invulnerabilità più lunga già in corso) |

Tipi di effetto disponibili (`SkillEffect`): **proiettile** (anche a ventaglio con `count` e `spread`), **zona a terra** (sul mirino o attorno al lanciatore, con rallentamento opzionale), **scatto** e **colpo ravvicinato ad arco**. Ogni skill ha ricarica propria (nessuna ricarica globale).

### Oggetti, rarità e bottino

**Famiglie** (25, `features/items/item-families.ts`; valori in `item-skills.ts` e `dungeon-item-skills.ts`). Nove famiglie storiche e sedici pezzi di set. La tabella seguente descrive i 17 oggetti originari; gli otto nuovi sono riportati sotto. `exclusiveTo` conserva il dungeon di origine del set, mentre le fonti effettive sono le voci esplicite in `LOOT_TABLES`, anche quando un pezzo compare altrove come alternativa inferiore.

| Slot | Generiche | Esclusive (boss) |
| --- | --- | --- |
| Mano primaria | Bastone arcano (dardo, base), Arco del cacciatore (freccia veloce 14 danni, 0,16 s), Scettro tempestoso (sfera lenta 23 danni, 0,4 s) | Lama del guardiano (cripta): colpo ravvicinato ad ampio arco, 55 danni, portata 95 · Martello della fornace (fucina): zona piccola e devastante sul mirino, 160 danni · Lancia di ghiaccio (ghiacciaio): scheggia veloce 70 danni che rallenta |
| Mano secondaria | Grimorio del gelo (globo, base), Talismano degli spiriti (3 fuochi fatui a ventaglio, 42 danni ciascuno) | Ventaglio di spore (palude): 5 semi a ventaglio, 38 danni ciascuno |
| Armatura | Mantello della meteora (base), Egida di brace (esplosione attorno a te, raggio 110, 130 danni) | Sudario della cripta (cripta): grande esplosione attorno a te che rallenta 2,5 s · Corazza della fornace (fucina): enorme zona ritardata sul mirino, 360 danni · Velo di bufera (ghiacciaio): esplosione attorno a te che rallenta 3 s |
| Stivali | Stivali astrali (base), Stivali del vento (scatto 200, invulnerabile 0,3 s, ricarica 2,4 s) | Stivali del pantano (palude): scatto corto con invulnerabilità lunga (0,8 s) |

**Rarità** (`items/rarity.ts`): Comune bianco, Non comune verde, Raro blu, Epico viola, Leggendario rosso (l’id `legendary` resta stabile). Danno x 1 / 1,2 / 1,5 / 2 / 3 e ricarica x 1 / 0,95 / 0,9 / 0,85 / 0,8; distanza e invulnerabilità dello scatto crescono della metà dell'aumento di potenza. A rarità Comune la skill è identica alla base. I valori restano provvisori.

**Bottino** (`loot/loot-tables.ts`): un tentativo per vittoria, **0 oppure 1 oggetto**, nessun drop garantito e nessun filtro di classe. Ogni boss ha otto voci: un set tematico completo di quattro slot e una sola alternativa verde Non comune per slot. Estrazione condizionata in tre passi: 25% di ottenere un oggetto; una volta ottenuto, **1/3 set e 2/3 Non comune** (33,33% e 66,67%, normalizzati al 100%); poi quattro pezzi equiprobabili, 25% ciascuno nel proprio gruppo. Per ogni specifico pezzo: `P(pezzo)=P(drop)×P(gruppo|drop)×P(pezzo|gruppo)`, quindi 2,0833% per uccisione per un pezzo di set e 4,1667% per un verde. I pesi per voce sono 1 nel set e 2 nelle alternative su tutti i boss, incluso il ghiacciaio. Rarità del set e livello restano fissati nella voce; nessuna estrazione dal catalogo generico globale.

| Dungeon | Drop | Set principale | Alternative |
| --- | --- | --- | --- |
| Cripta | 25% | Reliquie dell’ossario · Raro, livello 1 | Non comune, livello 1 |
| Palude | 25% | Custode dei rovi · Epico, livello 5 | Non comune, livello 1 |
| Fucina | 25% | Anima della fornace · Leggendario, livello 10 | Non comune, livello 6 |
| Ghiacciaio | 25% | Cuore del ghiacciaio · Leggendario, livello 15 | Non comune, livello 11 |

Set principali, nell’ordine primaria/secondaria/armatura/stivali: Cripta = Lama del guardiano, Lanterna dell’ossario, Sudario della cripta, Stivali del sepolcro; Palude = Arco di rovi, Ventaglio di spore, Mantello delle canne, Stivali del pantano; Fucina = Martello della fornace, Cuore di brace, Corazza della fornace, Calzari della fornace; Ghiacciaio = Lancia di ghiaccio, Specchio del ghiacciaio, Velo di bufera, Stivali di brina. Sono set tematici senza bonus per completamento.

Alternative per slot: Cripta = Arco del cacciatore, Grimorio del gelo, Egida di brace, Stivali del vento; Palude = Bastone arcano, Talismano degli spiriti, Mantello della meteora, Stivali astrali; Fucina = Scettro tempestoso, Ventaglio di spore, Mantello delle canne, Stivali del pantano; Ghiacciaio = i quattro pezzi della Fucina in variante Non comune. Tutte le 25 famiglie restano ottenibili; le varianti storiche già possedute restano valide.

**Salvataggio** (`features/character/`): chiave `temper-your-soul:save` in `localStorage`, versione **6**, raccolta con `format: character-roster`. Ogni profilo ha id stabile e dati separati; si conserva l’id attivo. Si salva alla creazione, selezione, rimozione, vittoria e modifica dell'equipaggiamento. I singoli personaggi v1–v5 vengono importati senza reset; alla prima scrittura della raccolta il vecchio testo viene conservato in `temper-your-soul:save:before-roster`. Dati illeggibili o futuri vengono copiati in `temper-your-soul:save:corrupt`; una raccolta con profili non validi non viene riparata scartandoli in silenzio. Se il browser non permette di salvare il gioco funziona in memoria e avvisa.

### Audio (proposta del ramo `feature/lavoro-personale`, da approvare)

Motore in `features/audio/`, separato in dati, regia e riproduzione. La simulazione non cambia: l'audio ascolta i `GameEvent`.

- **Catalogo** (`audio-catalog.ts`): suoni brevi per **materiale** (lanci e scoppi arcano, gelo, fuoco, natura; arco, lama, scatto), colpi, eventi del boss (annuncio d'attacco, furia, teletrasporto, schianto della carica, sconfitta), interfaccia ed esiti (clic, bottino, livello, vittoria, sconfitta). Musiche: menu, una per dungeon, una per la furia. Ambienti in anello per tema. Ogni skill degli oggetti dichiara il proprio materiale in `SKILL_SOUNDS` (un test lo impone); le zone dei boss lo ricavano dal prefisso dell'aspetto (`forge_`, `glacier_`, `swamp_`, `void_`…).
- **Regia** (`audio-director.ts`, funzioni pure): evento → suoni (in cooperativa il colpo subito solo per il giocatore del client, gli alleati colpiti come impatti); musica del menu fuori dalla partita, del dungeon in partita, della furia se esiste, abbassata in pausa, silenzio a fine partita; ambiente del dungeon anche dietro i menu, più basso; stereo e distanza rispetto al giocatore; limite di voci e intervallo minimo per suono.
- **Motore** (`audio-player.ts`): effetti con Web Audio (stereo, piccole variazioni di velocità) quando i file si possono leggere, elementi `<audio>` aprendo il gioco da `file://`; musica e ambienti con dissolvenza incrociata di 1,5 s. Si avvia al primo clic o tasto, come chiedono i browser; tace a scheda nascosta.
- **Impostazioni** (`audio-settings.ts`, chiave `temper-your-soul:audio`, separata dal salvataggio del personaggio): acceso/spento (tasto M) e volumi generale, musica, effetti, ambiente, interfaccia. Pannello **Audio** in alto a destra, con i crediti delle registrazioni.
- **Registrazioni:** solo vere e con licenza libera (CC0, pubblico dominio, CC BY con crediti visibili), mai IA. Crediti in `audio-credits.ts`; i test rifiutano file senza credito o mancanti. Primo lotto (48 file, circa 10,5 MB):

| Contesto | Registrazione | Licenza |
| --- | --- | --- |
| Menu | Bach, Aria delle *Goldberg*, Kimiko Ishizaka (pianoforte) | CC0 |
| Cripta | Canto gregoriano binaurale, Suso_Ramallo; ambiente: grotta, Andy_Gardner | CC BY 4.0; CC0 |
| Palude | Violoncello tenuto, carrieedick; ambiente: palude di notte, chris_dagorne | CC0 |
| Fucina | Taiko dal vivo, whatsanickname4u (Dave Thayer); ambiente: fango che ribolle, Breviceps | CC BY 3.0; CC0 |
| Ghiacciaio | Grieg, *La morte di Åse*, Czech National Symphony Orchestra (Musopen); ambiente: vento, moxobna | CC BY 3.0; CC0 |
| Furia dei boss | Grieg, finale di *Nell'antro del re della montagna*, CNSO (Musopen), in anello; gong Paiste, JensZygar | CC BY 3.0; CC0 |
| Vittoria / sconfitta | Fanfara per due trombe, tobyk; campana funebre, aoristos | CC BY 3.0; CC0 |
| Lanci | Lama: spade, Fenodyrie · Arco: rilascio della freccia, calvarychurchatlanta · Fuoco: scoppiettio, TheWoodlandNomad · Gelo: ghiaccio che si crepa, northern87 · Arcano: vetro (Kenney) · Natura: fruscio d'erba (Kenney) | CC0 |
| Scoppi, colpi, boss, interfaccia | Impatti, campane e clic di Kenney (Impact Sounds, UI Audio); gli scoppi uniscono un impatto Kenney alla registrazione del materiale | CC0 |

Ancora senza registrazione (secondo lotto, vedi `docs/risorse-libere.md`): lo scatto, che conserva il tono del prototipo, e l'annuncio degli attacchi del boss, che resta muto.

Valori provvisori: volumi, limiti di voci, dissolvenza, abbassamento in pausa (0,4), ambiente dietro i menu (0,35), stereo massimo (0,7), volume minimo dei suoni lontani (0,3), audio acceso per impostazione (nel prototipo era spento: c'erano solo toni sintetizzati).

## Differenze volute rispetto al prototipo originale

Il porting della Fase 0 conservava regole e valori; restano queste differenze (tutte da confermare a mano):

- Passo fisso a 60 Hz; tasti legati alla posizione fisica (`KeyboardEvent.code`); scossa dello schermo applicata; effetti che proseguono dopo la fine; traslazione di camera arrotondata; tocchi brevissimi non persi; scorciatoie del browser con Ctrl/Meta/Alt non intercettate.
- Un proiettile è riconosciuto per i suoi dati (`slowSeconds`, `visual`), non per il raggio; le zone dopo lo scoppio non restano "vive" (il bagliore è un effetto).

## Punti aperti

- **Direzione del gioco**: che cosa significa "temprare l'anima" (progressione, build, rischio/ricompensa, struttura a run o a incontri, tono). Oggi il ciclo è: dungeon → boss → oggetti → build.
- **Morte**: oggi non si perde nulla. Ashen Realm perde livello, equipaggiamento e chiavi: da decidere se e cosa perdere.
- **Progressione**: livelli ed esperienza, tier T1-T15 come in Ashen Realm (qui la potenza viene dalla rarità), sblocco dei dungeon (oggi sono tutti disponibili), difficoltà scalabile.
- **Altri slot**: anello e collana come modificatori delle skill, ali sulla velocità, pantaloni, peso dell'armatura (come in Ashen Realm). Oggi gli slot sono 4, uno per skill.
- **Oggetti**: capienza dell'inventario (oggi illimitata), vendita o riforgiatura, confronto tra oggetti, modificatori casuali, oggetti identici duplicati, eventuali oggetti unici con nome proprio.
- **Salvataggio**: cloud, esportazione/importazione del salvataggio e due schede aperte contemporaneamente (oggi una scheda adotta i salvataggi dell'altra appena avvengono; due salvataggi quasi simultanei restano "l'ultimo vince"). Profili multipli e rimozione individuale sono implementati localmente.
- Tutti i valori numerici (vita, danni, velocità, ricariche, pesi del bottino, scalatura delle rarità), da tarare con la prova manuale; equilibrio tra le famiglie e tra i dungeon.
- Ambientazione e lore: nomi dei dungeon e dei boss, "Ordine della Brace", "Emberfall".
- Raggi di collisione (oggi incoerenti di 1 tra proiettili e zone), perforazione e rimbalzo dei proiettili, pilastri distruttibili o che fermano anche le zone.
- Camera: limiti ai bordi, smorzamento, interpolazione del disegno (su schermi a più di 60 Hz il movimento può sembrare lievemente a scatti).
- Direzione artistica e audio definitivi; controlli (rimappatura, controller, touch/mobile); piattaforme e pubblicazione.

### Inventario a slot (2026-10-31)

Lo zaino si apre dal pulsante con icona pixel art nel menu. Equipaggiamento e bottino usano slot compatti con uno sprite originale 16×16 per ciascuna delle 17 famiglie (`presentation/item-sprites.ts`). La famiglia conserva lo stesso sprite a ogni rarità; bordo dello slot e nome nel tooltip usano il colore della rarità. Il tooltip appare al passaggio del mouse e al focus tastiera, con nome, rarità testuale, slot, abilità e statistiche risolte dalla rarità (anche velocità, raggio, durata e apertura totale dei proiettili).

Un clic seleziona l'oggetto nello zaino e mostra i comandi Equipaggia/Scarta; lo scarto mantiene la conferma in due passi. Gli oggetti equipaggiati sono segnati con E e si rimuovono dai quattro slot superiori. Filtri, ordinamento, salvataggi e regole del bottino restano quelli esistenti. Nessuna nuova capienza o statistica di bilanciamento introdotta.

## Livelli, mana e HUD (incremento corrente)
XP cumulativi salvati nel formato v2; v1 migrato con 0 XP mantenendo oggetti e record. Premi provvisori per vittoria: cripta 100, palude 180, fucina 280, ghiacciaio 400. Livello iniziale 1; costo del passaggio 100 + 50 per ogni livello gia ottenuto. Nessun bonus automatico alle statistiche per livello, per ora.
Mana massimo 100, ripristinato a inizio dungeon, rigenerazione base 8/s; ogni oggetto aggiunge un bonus secondo il tipo di skill e la rarita. Costi per tutte le skill in SPELL_MANA; rigenerazione ferma in pausa/fine partita. Skill senza mana non attiva ricarica. Danno per rarita: x1, x1.2, x1.5, x2, x3; costi e cooldown migliorano con rarita. Valori tutti provvisori.
HUD centrale in basso: vita rossa, livello, mana blu, barra XP e icone originali pixel art in ordine DX/SX/Q/E; tooltip con statistiche. Ogni nuova skill richiede icona in SKILL_ICONS, costo in SPELL_MANA e test di copertura.
Boss e cariche collidono coi pilastri; i teletrasporti atterrano fuori dagli ostacoli. Droprate e permadeath rimandati.

## Classi e anteprima delle animazioni
Le tre classi sono Guerriero, Arciere e Mago. Nell’anteprima: Fornace rappresenta il Guerriero, arco e stivali del vento rappresentano l’Arciere, Arcano rappresenta il Mago. I preset dell’anteprima sono combinazioni visive libere; nel gioco reale ogni famiglia è ora vincolata a una classe, senza introdurre statistiche innate di classe.
Le armi vengono disegnate come strati rigidi e ruotate attorno alla presa, senza deformare la lama. Braccio, polso e dita condividono un punto di attacco per mano; il lancio usa lo slot della skill effettivamente lanciata. L’anteprima permette di scegliere Primaria/Secondaria/Armatura/Stivali. Il ventaglio non contiene pixel di pelle: la mano viene disegnata una sola volta dal corpo.

### Ritratti indossabili e scelta della classe

La scheda personaggio usa la direzione A «Fantasy compatto», con sei basi illustrate: maschio e femmina per Guerriero, Arciere e Mago. Il Guerriero ha una presa bassa, l’Arciere una posa rilassata con arco non teso, il Mago una mano per bastone/scettro e una aperta per sostenere il tomo. Gli oggetti vengono montati su punti anatomici: presa delle mani, collo e spalle, caviglia e suola di ciascun piede. Le armature si adattano con registrazioni proprie di collo, cintura e spalle: busto e gonna hanno un giunto continuo alla cintura; le tuniche lunghe coprono la parte alta degli stivali. Gli stivali sostituiscono i piedi della base e seguono l’inclinazione della gamba. Dita davanti alle impugnature e parti delle armi lunghe dietro al corpo definiscono la profondità. I ritratti restano statici; gli sprite piccoli e le animazioni di combattimento restano quelli esistenti.

Nome, sesso e classe si scelgono nel menu prima del primo dungeon, con un’unica conferma. Da quel momento non si cambiano. I salvataggi v1–v4 mantengono inventario, equipaggiamento, XP, record e le scelte già fatte; richiedono solo i campi mancanti. La morte permanente non è ancora implementata: una sconfitta attuale non sblocca la ricreazione del personaggio.

### Creazione, equipaggiamento novizio e GS

Nome da 3 a 20 caratteri, con lettere Unicode, numeri, spazi, apostrofi e trattini; gli spazi vengono normalizzati. Nessun controllo di unicità globale, essendo un gioco locale.

Ogni nuovo personaggio riceve quattro pezzi Comuni bianchi della propria classe, uno per slot, già equipaggiati, livello oggetto 1 e 20 GS per pezzo (totale 80). Riutilizzano famiglie e abilità attuali con nomi novizio: Guerriero (spada, talismano, armatura, schinieri), Arciere (arco, ventaglio, corpetto delle canne, stivali), Mago (bastone, tomo, tunica, calzari). L’Arciere non condivide più l’Egida di brace del Guerriero. Il bianco è riservato al set iniziale e non compare nei dungeon. Nessun nuovo asset o skill per questo adeguamento.

GS provvisorio per pezzo: `min(100, baseRarità + livelloOggetto - 1)`, basi 20/40/60/80/100 e livello oggetto limitato a 1–20. Esempi: Arco novizio bianco livello 1 = 20, Arco del cacciatore verde livello 1 = 40, verde livello 5 = 44, rosso = 100. Le fasce non si sovrappongono; totale equipaggiato = somma dei quattro slot, massimo 400. Il livello oggetto è indipendente dal livello personaggio e attualmente entra nel GS; la potenza delle skill continua a scalare con la rarità. Eventuali bonus diretti per livello oggetto restano da definire.

Tooltip e slot mostrano GS; la scheda personaggio mostra nome, classe, livello e GS totale. **Il sesso compare solo durante la creazione**, resta salvato per il corpo e non viene descritto nei riepiloghi di menu o inventario. Ogni scheda dungeon mostra artwork, nome, pericolo, record, XP e livello del set. Descrizioni e taglines sono rimosse dalla card; altezza uniforme di 480 px e pallini 7×7 px. **«Loot rate %»** apre un tooltip che segue il cursore, senza dropdown: mostra drop 25%, nessun oggetto 75%, percentuali dei gruppi e, a destra, la ripartizione condizionata dopo il drop (8,33% per pezzo di set, 16,67% per verde); nei dettagli resta la probabilità complessiva per uccisione. Mostra anche classe richiesta, rarità, livello e GS. Accessibile con focus/clic, chiuso con Escape o navigazione.

### Vincoli di classe e ingresso nei dungeon

Ogni famiglia ha una sola classe richiesta (`item-classes.ts`, esposta da `ItemFamily.characterClass`), uguale a tutte le rarità. Mago: bastoni/scettri, tomi, lanterna, globo di brace, specchio, vesti magiche, calzari astrali e di brina. Arciere: archi, ventaglio, mantello delle canne e stivali del vento. Guerriero: spada, martello, lancia, talismano, armature pesanti e schinieri del sepolcro/pantano/fornace. Il bottino non è filtrato per classe: un oggetto di un’altra classe si conserva o si scarta, ma non si equipaggia.

Inventario e bottino mostrano gli oggetti incompatibili più scuri; i tooltip indicano la classe richiesta. Clic destro, pulsante Equipaggia e trascinamento passano dalle stesse regole di `Character`. I vecchi salvataggi conservano tutti gli oggetti, ma gli slot incompatibili vengono svuotati. Questi oggetti non conferiscono skill né GS, anche se referenziati impropriamente. Gli stati incompleti senza classe servono solo alla creazione/migrazione e non possono entrare in partita.

T1 e T2 non hanno soglia; **T3 richiede almeno 100 GS equipaggiati, T4 almeno 200**. La scheda disabilita l’ingresso e mostra requisito e GS attuale; la verifica è ripetuta nell’avvio della partita. Si conta solo il totale degli oggetti equipaggiati compatibili, non l’inventario. Test controllano i confini esatti e che ciascuna classe possa raggiungere le soglie con il bottino dei dungeon precedenti. Soglie richieste dall’utente; bilanciamento delle probabilità e dei valori ancora provvisorio.

### Profili locali e ritorno al menu

Il menu elenca i personaggi con nome, classe, livello e GS. «Nuovo personaggio» apre una bozza: non sostituisce il profilo selezionato e si può annullare; solo la conferma aggiunge il nuovo personaggio alla raccolta. Selezionare un profilo cambia personaggio attivo; inventario, equipaggiamento, XP e record non sono condivisi. «Rimuovi» apre una conferma nominativa, inizialmente focalizzata su Annulla, e cancella solo quel profilo; rimuovendo l’ultimo si torna alla creazione e la raccolta vuota resta vuota al ricaricamento. Non è permadeath.

Il pulsante **«← Menu principale»** resta nell’angolo superiore sinistro durante dungeon, inventario, partita, pausa e fine. Durante una partita abbandona l’incontro senza premi; gli oggetti e i progressi già salvati restano. Lo stato di selezione/scarto dell’inventario viene azzerato quando si cambia profilo.

### Party cooperativo sincronizzato

Server autorevole **Node + WebSocket**: una sola simulazione a 60 Hz per stanza, input e snapshot a 30 Hz. Il browser rappresenta lo stato ricevuto; HP, mana, collisioni, ricariche, danni, esito e bottino sono decisi dal server. Il client non invia posizioni o danni. Nessuna dipendenza di rete nel bundle browser; `ws` gira soltanto sul server e `tsx` esegue il server TypeScript.

1. Crea/seleziona un personaggio, apri **Party** in alto a destra e premi **Crea party**.
2. **Copia invito** condivide un URL `?party=<codice>`. Chi lo apre sceglie/crea il proprio personaggio e si unisce alla stessa stanza (massimo quattro membri).
3. Solo il creatore/leader sceglie il dungeon. Tutti confermano **Sono pronto**, poi il leader preme **Avvia dungeon**. Cambiare destinazione azzera le conferme. Il server verifica il GS di **tutti**: T3 100, T4 200.
4. Alleati visibili con sprite/equipaggiamento, nome e barra vita. Proiettili, zone e colpi alleati non infliggono fuoco amico; attacchi, contatto e cariche del boss possono colpire ciascun membro. Il boss prende di mira il vivo più vicino. Un KO rimane fuori combattimento fino al prossimo incontro; sconfitta solo quando tutti sono KO. Nessuna resurrezione né permadeath aggiunti.
5. A vittoria/sconfitta si apre il **Combat report** condiviso: danni effettivi inflitti, subiti e guarigione per membro, senza overkill. Guarigione resta 0: cure/Chierico non sono ancora implementati. Anche il singolo ha il report.

Il pannello mostra il **ping RTT** misurato ogni due secondi, con variazione dell’ultima misura nel tooltip. In cooperativa aprire menu/lobby o cambiare scheda **non mette in pausa il mondo**; l’input scade dopo 350 ms senza comandi. Uscita, ricaricamento e disconnessione abbandonano l’incontro (nessun rientro nello stesso combattimento); il corpo diventa KO. Se il leader esce, il comando passa al primo membro rimasto. Tornare al menu durante l’incontro esce dal party. Cambiare profilo esce dal party; cambiare equipaggiamento in lobby aggiorna il personaggio sul server e annulla il proprio pronto.

Ogni membro ancora connesso alla vittoria riceve gli XP interi del dungeon, il proprio record e un tiro personale di bottino (25%, massimo un pezzo), salvati nel proprio browser prima di mostrare i premi; anche un membro KO riceve il premio se il party vince. Nessuna divisione degli XP. Premi estratti una sola volta per incontro sul server; snapshot ripetuti non ripetono l’assegnazione client. Stanze e incontri sono in memoria: riavviare il server li elimina. Personaggi/equipaggiamento arrivano dai salvataggi locali validati: questa versione di prova non è un’economia protetta contro modifiche manuali dei salvataggi.

Avvio cooperativo (due terminali per sviluppo, solo il secondo per condividere la build):

```bash
npm run build
npm run server                  # http://127.0.0.1:4173, build + /party WebSocket + /health
# In un altro terminale, se si sviluppa:
npm run dev                     # Vite 5173, proxy WebSocket verso 4173
```

Se il leader usa localhost e gli ospiti il tunnel, `PUBLIC_URL` sul server deve contenere l’URL HTTPS del tunnel: la lobby restituisce quell’origine per «Copia invito». Senza configurazione si usa l’indirizzo della pagina. Quando cambia il tunnel, aggiornare la variabile e riavviare il server.

Per il tunnel pubblico puntare a **4173**, cioè al server cooperativo, per esempio `cloudflared tunnel --url http://127.0.0.1:4173 --protocol http2`. Tenere attivi server e tunnel. Il server espone solo `dist/`, non il workspace. L’URL del tunnel è temporaneo: non va salvato come indirizzo permanente. Le build pubbliche si aggiornano con `npm run build`; dopo cambi al codice server riavviare `npm run server`. Porta alternativa tramite variabile d’ambiente `PORT` (aggiornare proxy/tunnel se cambia). `npm run preview`, hosting statico e `file://` consentono il singolo, ma non ospitano stanze multiplayer.

Valori provvisori da tarare: capienza 4, input/snapshot 30 Hz, scadenza input 350 ms, boss senza aumento automatico degli HP per dimensione del party. Premi interi personali e bersaglio vivo più vicino sono scelte iniziali regolabili, da confermare con prove giocate. Nessun riassetto degli sprite incluso.

### Ottimizzazione multiplayer (31 ottobre 2026)

- Protocollo ordinato v2: tuple compatte per personaggi/boss; tipi di proiettile/zona e nascite trasmessi una sola volta per incontro; dopo si inviano rimozioni. Posizione dei proiettili lineari e countdown sono ricostruiti dal tempo autorevole. La simulazione resta a 60 Hz, la rete a 30 Hz. Arrotondamento solo visuale delle coordinate/ricariche dei personaggi: errore massimo 0,005 unità; danni, HP e regole server invariati.
- Ogni frame è serializzato **una volta per stanza**, condiviso fra i membri; report/premi solo a fine incontro e trasmissione del mondo interrotta dopo l’esito. I delta non vengono saltati in silenzio: sequenza non valida o connessione troppo lenta provocano un’uscita esplicita. Dopo questo aggiornamento ricaricare la pagina; il server rifiuta client col vecchio protocollo con un messaggio di aggiornamento.
- Il client riutilizza proiettili/zone per id e applica al massimo uno stato per fotogramma, preservando gli eventi; gli esiti finali e il salvataggio non attendono il rendering di una scheda in background. Ogni ping aggiorna soltanto il badge, senza ricreare il party o interrompere il focus nella lobby.
- Gli sprite attuali vengono rasterizzati una volta per posa/equipaggiamento e disegnati con un’unica operazione per personaggio. Cache limitata a 256 fotogrammi per gestire quattro equipaggiamenti; eliminati array temporanei nel controllo delle collisioni e riutilizzate le descrizioni visive degli alleati. Nessun nuovo asset o cambiamento dello stile.

Benchmark ripetibile: `npm run benchmark:network`. Fixture sintetica di 40 secondi con quattro giocatori e Ghiacciaio in furia, fino a 226 proiettili, 1.200 aggiornamenti: **28.582.862 → 480.050 byte**, circa **−98,3%** rispetto agli snapshot completi. Test confrontano traiettorie, zone, rimozioni, eventi, cambio incontro e premi. I tempi di decodifica stampati dipendono dalla macchina e dal riscaldamento del runtime.

Confronto browser tramite tunnel, due Edge headless isolati a 1440×1000, finestra di 8 secondi: traffico ricevuto **889.719 → 51.553 byte (−94,2%)**, tempo CPU del thread principale **4.099 → 3.469 ms (−15,4%)**, tempo script **1.229 → 944 ms (−23,2%)**. Entrambe le versioni erano già a circa 60 FPS, senza frame oltre 25 ms nella finestra: non è una promessa di aumento FPS universale. Ulteriore prova con quattro browser/classi miste: circa **59,8 FPS**, due frame oltre 25 ms su 478. Le finestre reali non sono replay perfettamente identici; conferma della fluidità sul PC del giocatore ancora necessaria. Vittoria, report identico e premi personali verificati anche dopo il cambio di protocollo.

### Kit degli otto nuovi oggetti

Lanterna dell’ossario: due luci lente con rallentamento; Arco di rovi: due spine divergenti; Cuore di brace: tre frammenti rapidi; Specchio del ghiacciaio: cinque schegge ad ampio ventaglio. Ciascun proiettile ha id, scia e forma propri (luce spettrale, spina, brace, frammento speculare). Mantello delle canne: zona di rovi attorno al giocatore con preavviso e rallentamento. Stivali del sepolcro, Calzari della fornace e Stivali di brina: tre scatti con distanze, invulnerabilità, ricariche, mana ed effetti differenti. Statistiche e costi sono provvisori e risolti dalla rarità come per le altre famiglie.

Ogni oggetto ha icona inventario 16×16, icona spell, strato indossato animato in gioco per entrambi i corpi e strati dedicati del ritratto. I nuovi strati del ritratto sono SVG disegnati nel codice, separati dalle icone dello zaino e agganciati a mani/caviglie/busto: non sono nuove immagini generate. Gli atlanti illustrati precedenti restano invariati; la revisione estetica complessiva rimane sospesa. Nessuna modifica al formato v5 o reset dei salvataggi richiesto.

Punti aperti: taratura di probabilità e GS, bonus del livello oggetto, futura gestione della morte e ricreazione. Vincoli di classe e soglie di ingresso sono implementati. UI nel tema C — Reliquiario; l’hover dei profili usa prugna scuro con testo crema smorzato, senza il vecchio fondo giallo.

## Sensazione di combattimento, fase II, servitori e schermate finali (proposta del ramo `feature/combattimento-e-vittoria`, da approvare)

Studio completo, con stato prima e dopo, in [studio-combattimento-e-vittoria.md](studio-combattimento-e-vittoria.md). Valori tutti provvisori, nelle tabelle con nome indicate.

- **Risposta ai colpi** (`presentation/effects.ts`, `FEEDBACK`, `DAMAGE_TIERS`):
  - colpo a segno su boss o servitore: lampo bianco di 0,09 s, sobbalzo, scintilla a stella, scoppio;
  - colpo contro un pilastro: polvere spenta;
  - proiettile perso nel vuoto (nuovo evento `projectile_faded`): sbuffo grigio;
  - numeri del danno a quattro livelli (13/16/20/24 px, dal bianco all'arancio), con contorno scuro e "pop";
  - colpo subito: vignetta rossa e scossa, solo per il giocatore di questo client in cooperativa; sotto il 30% di vita la vignetta pulsa.
- **Barre** (`ui/health-feedback.ts`, `CHIP`, `DAMAGE_WINDOW`):
  - scheggia chiara dei danni appena fatti o subiti, che resta 0,45 s e poi si consuma;
  - contatore dei danni degli ultimi 1,6 s sotto la barra del boss;
  - tacca della soglia della fase II;
  - in furia barra rosso-arancio, "FASE II" e bordo acceso.
- **Fase II**: stendardo «FASE II · <testo della furia>», lampo rosso, tre onde d'urto, scossa forte. In partita singola la simulazione si ferma per 1,6 s (`PHASE_INTERLUDE` in `game.ts`); in cooperativa il server non si ferma e il client mostra solo lo stendardo. Dopo, alone pulsante e particelle fitte del colore del boss (`presentation/boss-fx.ts`).
- **Morte del boss e fine incontro**: il boss resta visibile per 1,4 s mentre si illumina, trema e si frantuma, con un lampo bianco. Bottino, XP e record si salvano subito; la schermata arriva dopo 1,7 s alla vittoria e 1,3 s alla sconfitta (`END_DELAY`), e alla sconfitta la scena si spegne in grigio.
- **Vittoria** (`ui/end-screen.ts`): «Vittoria» dorato animato, «Boss sconfitto · nome», statistiche con distintivi («Record!», «Prima vittoria», «Intatto»), barra XP che si riempie con salita di livello, bottino rivelato con un lampo. La finestra «Combat report» resta solo in cooperativa (in partita singola ripeteva una riga).
- **Sconfitta**: «Sei caduto», vita rimasta al boss, tempo resistito, danni, precisione, «Ti ha colpito soprattutto» (prime due fonti con colpi e danni) e un consiglio per tipo di colpo (`DEFEAT_TIPS`), più il pulsante «Cambia equipaggiamento». La fonte dei danni arriva dalla simulazione (`damage_dealt.source`: nome dello schema, contatto, carica, servitore).
- **Statistiche** (`match/combat-tally.ts`):
  - si contano dagli eventi, anche in cooperativa (solo il giocatore del client);
  - precisione = proiettili a segno su proiettili a segno, persi nel vuoto o fermati da un pilastro;
  - le zone e i colpi ravvicinati contano nei danni, non nella precisione.

### Servitori (decisione per Jabbaz)

Sistema generico in `features/minions/`: comportamenti `chaser` (insegue e ferisce a contatto), `kamikaze` (esplode a contatto), `turret` (spara da ferma).

| Boss | Servitore | Comportamento | Vita | Velocità | Danno | All'ingresso in furia | In furia | Massimo vivi |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guardiano | Fuoco fatuo di brace | kamikaze, esplosione di raggio 34 | 60 | 120 | 14 | 3 | 2 ogni 4 attacchi | 4 |
| Madre delle spore | Sporello | chaser | 90 | 72 | 10 | 4 | 2 ogni 4 attacchi | 6 |
| Colosso della fornace | Folletto di scoria | kamikaze, esplosione di raggio 38 | 50 | 165 | 16 | 3 | 2 ogni 4 attacchi | 4 |
| Custode del ghiaccio | Sentinella di brina | turret, scheggia da 10 ogni 1,9 s | 110 | 0 | 8 | 2 | 1 ogni 5 attacchi | 3 |

Regole comuni:
- compaiono in cerchio attorno al boss, senza casualità (la partita resta riproducibile);
- fermano i proiettili del giocatore prima del boss (fanno da scudo) e sono colpiti da zone e colpi ravvicinati;
- contano nei danni del resoconto e muoiono con il boss;
- in cooperativa viaggiano nelle istantanee (protocollo **3**: lista `m` con id, tipo, posizione e vita; nel ramo `feature/discesa` protocollo 4, vedi sotto).

Grafica nel codice in `presentation/minion-art.ts`. Punti aperti: numeri e frequenze, esperienza o bottino per i servitori (oggi nessuno), servitori anche in fase I.

## Discesa, servitori a tema e progressione (proposta del ramo `feature/discesa`, da approvare)

Implementa lo studio sulla progressione (documento a parte, condiviso dall'utente): prima del boss si scende per stanze piene di servitori del suo stesso tema. Ispirazioni dichiarate: porte con il premio scritto sopra (Hades), regista a budget delle ondate (Risk of Rain 2), stanze modello con ripari (The Binding of Isaac, Enter the Gungeon), scalatura per il gruppo (Realm of the Mad God). **Tutti i valori sono provvisori**, nelle tabelle con nome indicate; le regole restano da confermare da Jabbaz.

### Modalità e sblocchi

- **Discesa** (predefinita, dalla scheda del dungeon): otto tappe fino al boss.
- **Duello**: solo il boss, come prima. Si apre vincendo una discesa in quel dungeon; chi aveva già battuto il boss con un salvataggio v6 lo trova aperto.
- **Pellegrinaggio**: le quattro discese di fila in versione breve (5 tappe ciascuna), dalla cripta al ghiacciaio. Si apre dopo una discesa vinta in ogni dungeon e chiede il GS d'ingresso più alto (oggi 200).
- **Gradi di tempra** 0–5: ogni grado aggiunge il 10% al budget dei nemici e alle braci (`DESCENT.gradeBudget`, `gradeEmbers`). Il grado n+1 si apre vincendo al grado n.

### La discesa (`features/run/`)

| Tappa | Porte (`plan.ts`) |
| --- | --- |
| 1 | Soglia (scontro facile, braci) |
| 2 | due Scontri con premi diversi, uno con la tempra |
| 3 | Scontro, Prova (più dura, teschio sulla porta) o Reliquiario |
| 4 | Luogotenente |
| 5 | Santuario o Assedio (più duro) |
| 6 | Scontro o Caccia (con sigillo) |
| 7 | Anticamera |
| 8 | Boss |

- **Porte**: a stanza libera si aprono sul muro in alto con il cartello tipo · premio. Si esce restando tutti i vivi sulla stessa porta per 0,8 s, e solo dopo aver scelto le tempre in sospeso (`DESCENT.doorHold`).
- **Premi**: tempra, braci, ristoro (+30% vita), sigillo (+5 punti alla probabilità di bottino del boss, fino a +20). I premi a terra sono **per giocatore**: in cooperativa ognuno raccoglie il suo.
- **Stanze**:
  - Prova: senza un graffio oppure entro 45 s; premio doppio e un sigillo.
  - Reliquiario: un forziere, a volte un patto (due tempre per −20 vita massima fino alla fine della discesa).
  - Santuario: si sceglie fra la fonte (+40% vita) e l'incudine (una tempra).
  - Assedio: 45 s fra i nidi, ogni nido distrutto toglie 8 s.
  - Caccia: una preda che fugge ed evoca.
  - Anticamera: +25% vita.
- **Stanze modello** (`room-templates.ts`): sei per dungeon (cinque di scontro e una di calma), da 1600–2400 × 1000–1500, con ripari e punti di comparsa. Il boss combatte nella mappa originale del dungeon.
- **Regista delle ondate** (`director.ts`):
  - budget = 60 × (1 + 0,15 × tappa) × tipo di stanza × (giocatori + 1)/2 × (1 + 0,1 × grado);
  - al massimo tre tipi per stanza, la minaccia dalla seconda ondata, un pesante nell'ultima, al massimo un nido o un sostegno;
  - le élite costano il triplo;
  - la prossima ondata arriva quando ne resta vivo meno del 30% o dopo 20 s;
  - vivi al massimo 30, +5 per ogni giocatore in più;
  - ogni comparsa è annunciata a terra per 0,9 s, a lotti di sei, ad almeno 300 unità dai giocatori.
- **Insidie** (`hazards.ts`), una per dungeon: vetrate che cadono in linea (cripta), bolle di gas (palude), bocchette di lava fisse (fucina), stalattiti (ghiacciaio).
- **Luogotenenti** (`lieutenants.ts`): uno per dungeon, con due o tre schemi del boss in piccolo e la folla del dungeon in furia. Doccione del campanile 800, Rospo re 1000, Maestro d'incudine 1100, Prima allieva 1200; +50% di vita per ogni giocatore in più.
- **Sconfitta**: la discesa finisce. Braci, esperienza e bestiario restano; le tempre si spengono.

### Servitori a tema (`features/minions/`)

32 servitori più la goccia della colata, otto per dungeon, coerenti con il boss: cripta (fiammelle, ceri, pipistrelli, scheletri, doccioni dormienti, accoliti, campane, reliquiari), palude, fucina e ghiacciaio con lo stesso schema di ruoli.

- **Comportamenti composti dai dati**: inseguitore, kamikaze, torretta, tiratore, caricatore, volante, saltatore, scavatore, nido, sostegno, orbitante, fuggitivo. Opzioni: raffiche, cariche, salti, scavo, aure, lanci, teletrasporto, effetti alla morte (scissione, pozza, anello, rinascita), scie, sonno, volo.
- **Élite**: generiche (robusta, rapida, gemella, schermata) e una a tema per dungeon (ardente, marcia, incandescente, gelida).
- **Leggibilità**: ogni attacco ha un segnale a terra. Al massimo 3 + (giocatori vivi) servitori attaccano insieme (gettoni). Il tetto è di 80 proiettili dei servitori. I proiettili nemici non usano l'arancio sui fondi caldi.
- **Vita** per dungeon: ×1 / 1,6 / 2,4 / 3,2, perché l'equipaggiamento dei dungeon alti è più forte.
- **Ricompense**: ogni stanza di combattimento vale il 5% dell'esperienza del boss del dungeon. Le braci per premio vanno da 6 a 35, × 1 / 1,4 / 1,8 / 2,2 per dungeon.
- **Grafica**: disegnata nel codice (`presentation/minion-art/`, `boss-art/lieutenants.ts`), senza nuovi asset. L'audio riusa le registrazioni già presenti.

### Tempre, braci, Altare e Bestiario

- **Tempre** (`tempers.ts`): nove, in tre famiglie del gesto del fabbro.
  - Fuoco: Brace viva, Fiamma concentrata.
  - Martello: Colpo doppio, Onda larga, Punta pesante.
  - Acqua: Mano svelta, Risparmio, Passo lungo, Tempra d'acqua.
  - Ognuna si applica a uno slot e sale fino al grado 3. Si sceglie fra tre carte, con un clic o con i tasti 1–4.
- **Altare dell'anima** (`blessings.ts`): le braci comprano benedizioni permanenti, valide solo nelle discese e nel Pellegrinaggio e che non cambiano il GS:
  - Vigore +10 vita (60/120/200);
  - Prima scintilla (150);
  - Seconda vita (300);
  - Occhio del fabbro, quattro offerte (200);
  - Fortuna, sigilli iniziali (120/240).
- **Bestiario**: una pagina per servitore e per luogotenente, aperta dalla prima uccisione, con ruolo, schema del boss che insegna e un'iscrizione (`bestiary-lore.ts`).
- **Salvataggio v7** (`save-format.ts`): aggiunge braci, benedizioni, bestiario, record delle discese (vittorie, miglior tempo, grado massimo, tappa più lontana) e Pellegrinaggio. I salvataggi v6 si leggono senza perdite. Braci, esperienza e bestiario si salvano a ogni stanza, quindi un ricaricamento a metà discesa non li perde.

### Cooperativa (protocollo 4)

- Il leader sceglie destinazione, modalità e grado; il server controlla GS, Duello, Pellegrinaggio e grado di **ogni** membro.
- I servitori nascono una volta, poi viaggiano come posizione intera, stato e flag; la vita solo quando cambia. Stanza e discesa viaggiano solo quando cambiano. Ogni stanza ha un id d'incontro proprio.
- Nuovi messaggi del client: `mode`, `temper`, `pact`. Chi è a terra si rialza nella stanza dopo con il 30% della vita.
- **Benchmark** (`npm run benchmark:network`):
  - duello: fino a 231 proiettili, 552.886 byte in 40 s, −98,2% rispetto agli snapshot completi;
  - stanza piena del ghiacciaio con quattro giocatori: fino a 35 servitori, 1.037.484 byte in 40 s, cioè circa 26 KB/s per client, il doppio del duello.

### Decisioni da confermare con Jabbaz

1. Le braci comprano **benedizioni** all'Altare, non il livello degli oggetti (la "Forgia" dello studio): alzare il livello degli oggetti con le braci aggirerebbe le soglie GS di T3/T4.
2. Il Duello si apre dopo la prima discesa vinta in quel dungeon.
3. Il bottino resta **solo** dal boss, con i sigilli che ne alzano la probabilità; i servitori non lasciano oggetti.
4. Alla sconfitta si tengono braci, esperienza e bestiario; si perdono le tempre.
5. Scalatura del gruppo: budget × (giocatori + 1)/2, luogotenente +50% per giocatore, il boss resta senza aumento (come prima).

### Punti aperti

- Taratura di vita, danni e budget con partite vere: ogni dungeon è stato provato a fondo solo con simulazioni e bot.
- Banda nelle stanze affollate: si potrebbero inviare le posizioni dei servitori a 15 Hz o solo quando cambiano.
- Il resoconto della sconfitta chiama "Contatto con il boss" anche il contatto con il luogotenente.
- La pagina dell'Altare e il Bestiario usano il tema Reliquiario, ma la revisione grafica complessiva resta sospesa.

## Grafica: fase 0 dello studio (proposta del ramo `feature/discesa`, da approvare)

Primo passo dello studio su grafica, stanze, minimappa e nemici (documento a parte, condiviso dall'utente): leggibilità a costo basso, senza nuovi asset e senza toccare le regole. Valori provvisori nelle tabelle indicate.

- **Proiettili per squadra** (`draw-combat.ts`, `PROJECTILE_STYLE`):
  - quelli nemici hanno alone, contorno scuro e nucleo chiaro;
  - quelli dei giocatori sono al 70% di opacità, con scia leggera e senza alone.

  Tutte le forme usano il colore del loro aspetto. Prima il rombo e il dardo avevano un colore fisso, quindi il globo di gelo era uguale alla nova del Custode e il dardo arcano uguale al dardo a croce.
- **Colori nuovi dei proiettili nemici** che si confondevano con la lava o con i colpi dei giocatori:
  - fucina: mantice, braci e scossa del Colosso, dardo a croce e schegge d'incudine;
  - ghiacciaio: nova, schegge, bufera antioraria e schegge dell'apprendista;
  - cripta: incensiere e campana.

  Le zone a terra restano del loro materiale. Un test controlla la distanza di colore fra colpi dei giocatori e proiettili nemici della stessa forma, e fra i proiettili di un dungeon e i colori a terra del suo tema (`ArenaTheme.groundColors`).
- **Ordine di disegno**: le figure (servitori, boss, eroi) si ordinano per profondità, poi vengono i colpi dei giocatori, le particelle e infine i proiettili nemici. Nomi e vita degli alleati stanno sopra tutto. Con più di 40 proiettili le particelle di scia si dimezzano.
- **Sagome**: i servitori hanno un bordo chiaro di un'unità del colore del tema (`ArenaTheme.silhouette`), cotto nel raster in cache. I dormienti non ce l'hanno: devono sembrare pietra.
- **Luce finta** (`presentation/lights.ts`):
  - aloni in cache sotto torce, bracieri, crepe di lava, funghi e cristalli;
  - buio ai bordi dello schermo, del colore del tema.

  I funghi della palude diventano ciano: il giallo e il viola sono della Madre delle spore.
- **Decori**:
  - torce della cripta e bracieri della fucina stanno lungo i muri, a passo regolare;
  - le incudini stanno in posizioni relative alla mappa;
  - tutti lontano da ingresso, porte e pilastri (`themes/decor.ts`);
  - tappeto e cerchi runici della cripta sono frazioni della mappa: nell'arena del boss restano dov'erano.

  Prima, nelle stanze, un braciere cadeva sulla porta centrale e uno sull'ingresso.
- **Pavimento della cripta**: un hash vero al posto della sinusoide, che disegnava strisce regolari.
