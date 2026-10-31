# Studio: sensazione di combattimento, fase 2, vittoria e sconfitta

Studio del 31 ottobre 2026 sul main `e59f495`, richiesto dall'utente: vincere deve essere soddisfacente, perdere chiaro, i danni leggibili, colpire diverso dal mancare, il passaggio alla fase 2 evidente anche senza musica, boss meno generici, qualche servitore. Le proposte che toccano le regole sono segnate **[decide Jabbaz]**.

## 1. Stato attuale (osservato nel gioco e nel codice)

| Momento | Oggi | Problema |
| --- | --- | --- |
| Colpo a segno | 5 particelle viola sul boss, numero bianco 13 px in monospace, suono | Il boss non reagisce. Il numero è piccolo, uguale per 19 e per 360 danni, poco leggibile sui pavimenti chiari |
| Colpo mancato | Il proiettile sparisce a fine vita senza segnale; contro un pilastro fa lo stesso scoppio di un colpo a segno | Colpire e mancare si confondono: manca il contrasto che rende soddisfacente il colpo |
| Danni fatti | Barra del boss sottile in alto, che scende di colpo | Non si capisce quanto ha tolto l'ultimo colpo né la propria velocità di danno |
| Colpo subito | "−N" rosso piccolo, scossa di 5 | Poco visibile nel caos; nessun segnale di vita bassa |
| Fase 2 | Testo "… SI INFURIA" sopra il boss, 40 particelle, occhi rossi, musica e gong | Durante un attacco il testo si perde; il boss non cambia davvero e il gioco non si ferma per sottolineare il momento |
| Morte del boss | Il boss sparisce nello stesso fotogramma, 90 particelle, e la schermata copre subito tutto | Nessun "colpo finale": il momento più bello non si vede |
| Vittoria | Riquadro di testo «Vittoria.» con tempo e vita; in partita singola si apre sopra anche la finestra «Combat report» (una riga) | Piatto, ridondante, nessuna gerarchia: titolo, prestazioni, ricompense e azioni hanno lo stesso peso |
| Sconfitta | «La brace si è spenta.» e un consiglio fisso | Non dice cosa ci ha uccisi, quanto mancava, né cosa fare di diverso |
| Boss | Sprite di 16–20 pixel ingranditi, palette spente, un'animazione di camminata e una di lancio | Leggibili ma "generici": niente aura, niente particelle proprie, nessun cambiamento visibile in fase 2 |
| Nemici | Solo il boss | Il ritmo è sempre lo stesso: un solo bersaglio, nessuna scelta su cosa colpire |

## 2. Principi (game feel)

1. **Ogni azione ha una risposta proporzionata.** Un colpo a segno ha cinque segnali coordinati: lampo bianco del bersaglio (60–90 ms), sobbalzo di 2–3 pixel nella direzione del colpo, scintilla d'impatto, numero proporzionato al danno e suono. Un colpo mancato ha un segnale piccolo e spento (sbuffo grigio). Il contrasto fra i due *è* la soddisfazione.
2. **Gerarchia dei numeri.** Dimensione e colore crescono con il danno (bianco, oro, arancio per i colpi pesanti), con contorno scuro per la leggibilità, un piccolo "pop" all'apparizione e numeri sfalsati per non sovrapporsi.
3. **Barre con memoria.** La barra del boss mostra la "scheggia" dei danni recenti, un segmento chiaro che si consuma dopo mezzo secondo, più un contatore dei danni degli ultimi istanti e una tacca al 50% che annuncia la fase 2.
4. **Pausa drammatica nei momenti chiave.** Fase 2 e colpo finale fermano la simulazione per un attimo (circa 1,5 s), mentre effetti, testo e camera raccontano cosa succede: si guarda invece di schivare. In cooperativa il server non si ferma: il client mostra solo lo stendardo.
5. **Schermate con gerarchia.** Esito (titolo grande, animato), poi prestazione (tempo, danni, precisione, colpo più forte, record), poi ricompense (XP che si riempie, bottino rivelato con il colore della rarità), poi azioni. La sconfitta dice *perché*: chi ci ha colpiti di più, quanto mancava al boss, un consiglio legato a quel tipo di attacco.
6. **Identità dei boss senza toccare le regole.** Aura, particelle proprie, lampo e sobbalzo, trasformazione visibile in fase 2. Il raggio di colpo resta quello dei dati: lo sprite non si ingrandisce, per non ingannare il giocatore.
7. **Servitori come scelta tattica [decide Jabbaz].** Pochi, deboli, leggibili. Arrivano al passaggio di fase e ogni tanto in furia: fanno scegliere fra colpire il boss e liberarsi lo spazio, e rendono la fase 2 un capitolo nuovo.

## 3. Piano realizzato in questo incremento

| Area | Cosa | Dove |
| --- | --- | --- |
| Audio | Attivo di base anche per chi aveva salvato "spento" con la versione precedente (impostazioni v2); pannello essenziale con crediti richiudibili | `audio-settings.ts`, `audio-panel.ts` |
| Eventi | `projectile_hit` dice cosa ha colpito (`struck`); nuovo `projectile_faded` per i colpi del giocatore persi nel vuoto; `damage_dealt` ai giocatori porta la fonte (nome dello schema, contatto, carica, servitore) | `events.ts`, `match.ts` |
| Colpi | Lampo bianco e sobbalzo del boss e dei servitori, scintilla d'impatto, sbuffo grigio sui colpi mancati, numeri proporzionati con contorno e "pop", vignetta rossa sui colpi subiti, battito con vita sotto il 30% | `effects.ts`, `draw-*.ts` |
| Barre | Scheggia dei danni recenti, contatore dei danni, tacca della fase 2, barra rossa in furia; scheggia anche sulla vita del giocatore | `hud.ts`, `index.html`, CSS |
| Fase 2 | Pausa drammatica di 1,6 s in partita singola, stendardo «FASE II», onda d'urto, aura di furia persistente, servitori evocati | `game.ts`, `phase-banner`, `effects.ts` |
| Morte del boss | Il boss resta visibile: lampeggia, trema e si frantuma; lampo dello schermo; la schermata arriva dopo 1,6 s | `effects.ts`, `draw-actors.ts`, `game.ts` |
| Vittoria | Titolo animato, statistiche (tempo con record, danni, precisione, colpo più forte, colpi subiti), XP che si riempie con salita di livello, bottino rivelato in sequenza; niente finestra ridondante in partita singola | `end-screen.ts`, `combat-tally.ts`, CSS |
| Sconfitta | Scena desaturata, vita rimasta al boss, tempo, danni, «Colpito soprattutto da…» con consiglio per tipo di attacco, pulsante Zaino | come sopra |
| Boss | Aura e particelle proprie per ciascuno (braci, spore, scorie, neve), trasformazione in furia | `boss-fx.ts` |
| Servitori **[decide Jabbaz]** | Sistema generico guidato dai dati e un servitore per boss (fuoco fatuo di brace, sporello, scintilla di scoria, sentinella di ghiaccio); arrivano al passaggio di fase e ogni 4 attacchi in furia; si possono colpire; inviati in cooperativa (protocollo v3) | `features/minions/`, `boss.ts`, rete |

Valori nuovi tutti provvisori, nelle tabelle con nome: durate delle pause, soglie dei numeri, vita, velocità e danni dei servitori.

## 4. Da fare in seguito

- Ridisegno vero dei boss e dei servitori in pixel art più dettagliata: lo studio sulle fonti, con un primo lotto proposto, è in `risorse-libere.md` (sezione «Studio: pixel art per boss, servitori, effetti e schermate»). Da decidere con Jabbaz, che ha sospeso la revisione grafica.
- Suoni dedicati per servitori e colpi mancati (secondo lotto audio).
- Camera: limiti ai bordi e interpolazione del disegno (debito noto).
- Statistiche per giocatore anche nel resoconto cooperativo (precisione, colpo più forte) oltre alla tabella attuale.
