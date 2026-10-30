# Roadmap

Le fasi sono una **proposta di ordine di lavoro**, non una pianificazione vincolante, e non fissano valori di design. Ogni fase e' un piccolo incremento che lascia il progetto avviabile. Le regole aperte stanno in `docs/game-design.md`.

Criterio valido per tutte le fasi: `npm run verify` con esito positivo (tipi, test, build), test estesi quando serve, **prova manuale da parte dell'utente**, `docs/bugs.md` aggiornato.

## Fase 0: fondamenta e porting del prototipo (implementata, prova manuale da fare)

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

## Fasi successive (proposta, nessuna avviata)

L'ordine dipende dalle risposte ai punti aperti di `docs/game-design.md`, soprattutto la **direzione del gioco**.

1. **Messa a punto e sensazione di gioco**: tarare i valori provvisori con la prova manuale, unificare i raggi di collisione, interpolare il disegno tra i passi di simulazione, feedback di colpo (lampeggio, pause brevi), limiti di camera. Completa quando l'utente ritiene il duello piacevole.
2. **Incontri guidati dai dati**: una `EncounterDefinition` (boss, vita, schemi, arena) cosi' che aggiungere un boss sia aggiungere dati e, solo se serve, un nuovo tipo di schema. Completa quando esistono almeno due boss diversi giocabili.
3. **Skill, equipaggiamento e build**: rendere le skill intercambiabili (slot, famiglie, tier) come in Ashen Realm, se la direzione lo richiede.
4. **Progressione e "tempra"**: il meccanismo che da' senso al nome del gioco (da definire con l'utente), con regole di morte e salvataggio.
5. **Struttura del mondo**: stanze, percorso o hub, nemici comuni, navigazione.
6. **Grafica e audio definitivi**: sostituzione delle forme e della pixel art provvisorie, musica.
7. **Controlli e piattaforme**: rimappatura tasti, controller, touch.
8. **Sviluppi successivi**: classifiche, co-op, altro.
