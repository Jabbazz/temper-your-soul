# Roadmap

Le fasi sono una **proposta di ordine di lavoro**, non una pianificazione vincolante, e non fissano valori di design. Ogni fase e' un piccolo incremento che lascia il progetto avviabile. Le regole aperte stanno in `docs/game-design.md`.

Criterio valido per tutte le fasi: `npm run verify` con esito positivo (tipi, test, build), test estesi quando serve, **prova manuale da parte dell'utente**, `docs/bugs.md` aggiornato.

## Fase 0: fondamenta e porting del prototipo (implementata, prova manuale confermata in generale)

Il prototipo "Emberfall" (JavaScript classico, variabili globali, regole e disegno mescolati) e' stato riscritto in **TypeScript** con la struttura di Ashen Realm, mantenendo le stesse regole e gli stessi valori: arena, mago con quattro skill, guardiano a due fasi con sei attacchi, particelle, pixel art, HUD, menu/pausa/fine partita, audio sintetizzato. Aggiunti: simulazione a passo fisso senza DOM e riproducibile con un seme, eventi dalla simulazione verso effetti/audio, dati separati da comportamento e aspetto, suite di test, `verify`, documentazione, repository dedicato. Il prototipo originale e' in `legacy/emberfall-prototype/`. Le differenze volute di comportamento sono elencate in `docs/game-design.md`.

Completa quando: `npm run verify` termina con codice 0 **e** la prova manuale dell'utente nel browser (checklist sotto) e' superata.

**Stato: controlli automatici superati; prova manuale eseguita dall'utente.** L'utente ha dichiarato in modo generale che "funziona tutto correttamente" dopo aver provato il gioco nel browser (2026-10-30). Non ha riportato l'esito voce per voce: le caselle sotto restano non spuntate perche' non e' stato detto quali punti specifici sono stati provati (in particolare, non risulta confermato in modo esplicito il giudizio sulla scossa dello schermo, nuova rispetto al prototipo).

Controlli automatici eseguiti: controllo dei tipi (strict), test Vitest su regole, boss, skill, giocatore, partita, effetti e coerenza dei dati, build di produzione, prova di mutazione dei test piu' importanti, prova di fumo in Edge headless (carica da `file://`, avvio con input reali, pausa, ripresa, riavvio, nessun errore in console) e revisione indipendente del porting contro il prototipo (esito in `docs/bugs.md`). Fotogrammi renderizzati hanno mostrato arena, boss, mago, proiettili, zone, nomi degli attacchi e HUD, ma **non sostituiscono la prova giocata**. I test non coprono l'interfaccia in DOM (HUD, schermate, pulsanti) ne' la sensazione di gioco.

Checklist manuale (non spuntata voce per voce; vedi lo stato sopra):

- [ ] Il gioco si apre (`npm run dev` e anche `dist/index.html` con doppio clic) e mostra il menu "Risveglia il guardiano." sopra l'arena; "Entra nella cripta" avvia la partita.
- [ ] WASD muove il mago alla stessa velocita' del prototipo, anche in diagonale; il mago si gira verso il mouse; il mirino e' dove punta il mouse.
- [ ] Clic sinistro tenuto: dardi a raffica; clic destro: globo di gelo che rallenta il boss (il boss diventa azzurrato e lento); Q: meteora nel punto mirato con segnale viola e caduta; E: scatto verso il mouse con invulnerabilita' (il mago lampeggia dopo un colpo).
- [ ] Anche tenendo il clic sinistro premuto, clic destro, Q ed E funzionano; un tocco brevissimo su Q/E lancia comunque la skill.
- [ ] Le quattro ricariche in basso si svuotano e si riempiono come le skill.
- [ ] Il boss insegue, poi gira attorno al mago; sei attacchi in rotazione con il nome sopra la testa: nova, raffica, frattura (zone arancioni con conto alla rovescia), carica (fascia a terra, poi scatto), spirale, triplice ventaglio.
- [ ] Sotto la meta' della vita il boss entra in furia ("IL GUARDIANO SI INFURIA"): occhi/rune rossi, attacchi piu' fitti e veloci.
- [ ] I danni coincidono con le barre: vita del mago, vita del boss, numero del danno sul boss e "-N" rosso sul mago.
- [ ] La camera trema leggermente per colpi subiti, scoppi, furia e fine della carica (nuovo rispetto al prototipo): non da' fastidio.
- [ ] Una freccia in alto o in basso sul bordo indica dov'e' il boss quando e' fuori schermo.
- [ ] ESC mette in pausa e riprende; cambiare scheda o finestra mette in pausa; R ricomincia da qualunque schermata; M attiva l'audio (suoni al lancio e quando si e' colpiti); F schermo intero.
- [ ] Vittoria ("Il guardiano e' caduto" con tempo e vita rimasta) e sconfitta ("La brace si e' spenta"); "Riprova" riparte pulita (barre piene, nessun proiettile o effetto residuo, tasti non incastrati).
- [ ] Il gioco si adatta al ridimensionamento della finestra e allo schermo intero; la pixel art resta nitida.
- [ ] Nessuna differenza di sensazione evidente rispetto al prototipo (`legacy/emberfall-prototype/index.html`) a parte quelle elencate in `docs/game-design.md`.

## Fase 1: menu, dungeon, oggetti e salvataggio locale (implementata, prova manuale da fare)

Il gioco passa da un duello singolo a un ciclo completo: **menu iniziale**, **scelta tra 4 dungeon** (la cripta più palude, fucina e ghiacciaio, ognuno con mappa e boss unici), **oggetti che cadono dai boss** con 5 rarità, **abilità che dipendono dall'equipaggiamento** (4 slot, 17 famiglie, come in Ashen Realm) e **personaggio salvato in locale**. Refactor di base: arena, boss e skill sono ora definizioni di dati (`ArenaDefinition`, `BossDefinition`, `SkillDefinition`), la partita (`Match`) riceve dungeon e skill; nuovi tipi di effetto (ventaglio, zona sul lanciatore, colpo ravvicinato), pilastri che bloccano movimento e proiettili, azioni programmate del boss (onde, teletrasporti). Regole e valori della cripta e delle skill base sono rimasti identici al prototipo. Valori e struttura in `docs/game-design.md`.

Completa quando: `npm run verify` termina con codice 0 **e** la prova manuale dell'utente (checklist sotto) è superata.

**Stato: controlli automatici superati; prova manuale ancora da fare** (nulla è confermato a mano).

Controlli automatici eseguiti: controllo dei tipi, suite Vitest (regole, boss, skill, giocatore, partita, dungeon, oggetti, bottino, salvataggio, effetti, vista inventario), test generici validi per ogni dungeon registrato (mappa, schemi, simulazione lunga senza stati invalidi), build, prova di mutazione, revisione indipendente con verifica avversa (esito in `docs/bugs.md`) e una prova nel browser vero (Edge headless): menu, i 4 dungeon avviati, pausa e abbandono, vittoria forzata con bottino e record in tutti e 4 i dungeon, salvataggio presente in `localStorage` prima di mostrare il bottino, inventario intatto dopo il ricaricamento, equipaggiare un oggetto cambia le skill in partita. Fotogrammi renderizzati hanno mostrato menu, mappe e boss, ma **non sono una prova giocata**: non coprono leggibilità degli attacchi, difficoltà, sensazione di gioco e prestazioni.

Checklist manuale (da eseguire; nessuna voce è spuntata):

- [ ] Il gioco si apre sul menu "Temper your soul" con "Dungeon" ed "Equipaggiamento"; la nota sotto i pulsanti indica lo stato del salvataggio.
- [ ] "Dungeon" mostra 4 schede (cripta, palude, fucina, ghiacciaio) con pericolo, descrizione, boss e record; passando sopra una scheda lo sfondo mostra la mappa; un clic avvia la partita.
- [ ] **Cripta**: identica al prototipo (stessi attacchi e tempi del guardiano, stesse skill).
- [ ] **Palude**: mappa verde con alberi morti che fermano i movimenti e i proiettili; la Madre delle spore è lenta; gli attacchi sono leggibili e schivabili (cerchi di zone con il centro sicuro, tentacoli, anelli che si chiudono, pioggia, balzo).
- [ ] **Fucina**: mappa larga con lava e pilastri di ferro che fanno da riparo; il Colosso è enorme e lento con zone molto grandi; la martellata lascia un anello di schegge.
- [ ] **Ghiacciaio**: colonne di cristallo; il Custode è veloce e si teletrasporta (con segnale a terra prima), spirali opposte, nova doppia, carica con zone sul percorso.
- [ ] I pilastri bloccano il mago (scivola lungo il bordo, non resta incastrato) e fermano i proiettili del boss e i propri; lo scatto non finisce dentro un pilastro.
- [ ] Ogni boss ha una grafica diversa e il testo "… SI INFURIA" con il proprio nome sotto metà vita; gli attacchi hanno un nome sopra il boss.
- [ ] Le difficoltà crescono da cripta a ghiacciaio in modo percepibile ma sensato (nessun attacco ingiusto o inevitabile).
- [ ] Alla vittoria compare "Vittoria." con 1 o 2 oggetti (colorati per rarità), eventuali record ("Prima vittoria", "Nuovo record") e la scritta "Salvato in questo browser".
- [ ] Ricaricando la pagina gli oggetti, l'equipaggiamento e i record sono ancora lì; la nota del menu dice che i progressi sono stati caricati.
- [ ] "Equipaggiamento": 4 slot con la skill di ciascuno e le statistiche; equipaggiare un oggetto dell'inventario cambia la skill (anche la HUD in partita: nomi e comandi); "Rimuovi" svuota lo slot (la skill sparisce e la scheda in partita mostra "— vuoto —"); "Scarta" chiede conferma e non permette di scartare un oggetto equipaggiato; i filtri per slot funzionano.
- [ ] Le skill nuove si sentono diverse: arco veloce, scettro lento e pesante, talismano e ventaglio a più proiettili, Lama del guardiano a corto raggio con arco visibile, esplosioni attorno a te, scatti con invulnerabilità diverse.
- [ ] Le rarità più alte si sentono più forti (danno e ricarica) senza rompere il gioco.
- [ ] ESC in partita mette in pausa; "Abbandona e torna al menu" funziona; ESC nelle schermate del menu torna indietro; R ricomincia solo durante una partita.
- [ ] Dopo la sconfitta "Riprova" riparte pulita; dopo la vittoria "Riprova" non assegna di nuovo il bottino senza una nuova vittoria.
- [ ] Il menu e le schermate sono usabili a finestra stretta o bassa (scorrono, i pulsanti sono raggiungibili).
- [ ] Se si blocca il salvataggio (finestra in incognito/privata o dati del sito disabilitati) il gioco funziona e avvisa che i progressi non si conserveranno.

## Fasi successive (proposta, nessuna avviata)

L'ordine dipende dalle risposte ai punti aperti di `docs/game-design.md`, soprattutto la **direzione del gioco** ("temprare l'anima") e le regole di **morte** e **progressione**.

1. **Messa a punto e sensazione di gioco**: tarare con la prova manuale valori di boss, skill, rarità e bottino; unificare i raggi di collisione; interpolare il disegno tra i passi; feedback di colpo; limiti di camera. Completa quando l'utente ritiene i dungeon piacevoli e ben bilanciati tra loro.
2. **Progressione e "tempra"**: il meccanismo che dà senso al nome del gioco (da definire con l'utente), con regole di morte, livelli ed eventuali tier T1-T15, sblocco o scalatura della difficoltà dei dungeon.
3. **Altri slot e modificatori**: anello e collana che modificano le skill, ali sulla velocità, pantaloni e peso dell'armatura (come in Ashen Realm); modificatori casuali sugli oggetti.
4. **Gestione dell'inventario**: capienza, confronto tra oggetti, vendita o riforgiatura, ordinamento.
5. **Altri dungeon e boss**: aggiungere dungeon è aggiungere una cartella in `features/dungeons/` (mappa, boss, tema, grafica, tabella di bottino) e farli passare dai test generici.
6. **Salvataggio avanzato**: esportazione/importazione, più profili, cloud (richiede un backend), gestione di due schede aperte.
7. **Grafica e audio definitivi**: sostituzione delle forme e della pixel art provvisorie, musica.
8. **Controlli e piattaforme**: rimappatura tasti, controller, touch.
9. **Sviluppi successivi**: classifiche, co-op, altro.
