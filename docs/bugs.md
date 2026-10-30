# Bug e problemi rilevati

Solo problemi effettivamente osservati o rilevati leggendo il codice, distinti per origine. Stato dopo la Fase 0 (porting del prototipo in TypeScript).

## Aperti

- **Prova manuale della Fase 0 confermata solo in generale.** L'utente ha dichiarato che "funziona tutto correttamente" (2026-10-30), senza dettaglio per voce della checklist in `docs/roadmap.md`: non sono stati segnalati problemi. I controlli automatici, la prova di fumo in Edge headless e i fotogrammi renderizzati non coprono da soli sensazione di gioco, leggibilita', interfaccia in DOM e prestazioni.
- **Interfaccia in DOM, ciclo del browser e disegno non coperti dai test automatici.** `Hud`, `Overlay`, `FullscreenToggle`, `Game` e le funzioni `draw-*` non hanno test (la suite gira in Node, senza DOM ne' canvas). Sono stati solo esercitati dalla prova di fumo in un browser vero (rieseguita anche dopo le correzioni della revisione, senza errori in console).
- **Voci della revisione indipendente non corrette**: vedi la sezione "Revisione indipendente del porting".
- **Raggi di collisione incoerenti (ereditati).** I proiettili usano raggio + 9 sul giocatore e + 26 sul boss; le zone raggio + 8 e + 25 (`features/combat/collision.ts`). Da unificare con la prova manuale.
- **Valori provvisori.** Tutti i valori di gioco sono quelli del prototipo e non sono tarati (vedi `docs/game-design.md`).
- **Lo scatto puo' accorciare l'invulnerabilita'.** `Passo astrale` imposta l'invulnerabilita' a 0,55 s anche se dopo un colpo restavano piu' di 0,55 s dei 0,65 s (comportamento del prototipo, coperto da un test che lo documenta). Da decidere se tenere il valore maggiore.
- **Camera senza limiti.** Vicino ai bordi dell'arena la camera mostra il vuoto scuro oltre il muro (come nel prototipo).
- **Disegno senza interpolazione.** La simulazione gira a 60 Hz e il disegno usa l'ultimo stato: su schermi a frequenza maggiore il movimento puo' risultare lievemente a scatti.
- **Differenze volute rispetto al prototipo da confermare a mano**: elenco in `docs/game-design.md` (passo fisso, tasti per posizione fisica, scossa dello schermo applicata, effetti che proseguono dopo la fine, traslazione di camera arrotondata, tocchi brevissimi non persi).
- **`npm audit` segnala avvisi sulle dipendenze di sviluppo** (osservato). Le versioni sono fissate uguali a quelle di Ashen Realm (vite 5.4.11, vitest 2.1.8): esbuild (<= 0.24.2, il server di sviluppo risponde a richieste di qualunque sito), `@vitest/mocker` (moderata) e `tinypool` (segnalata critica, ma riguarda le opzioni dei worker dei test). npm indica come correzione disponibile vite 5.4.21 e vitest 2.1.9 (aggiornamenti di patch, fuori dall'intervallo fissato). Sono solo dipendenze di sviluppo e non finiscono nel gioco pubblicato; non e' stato aggiornato nulla. Da decidere se allineare le versioni anche in Ashen Realm.

## Rilevati nel prototipo leggendo il codice (non riprodotti a mano)

Difetti o fragilita' del prototipo JavaScript, trattati nel porting come indicato.

- **Scossa dello schermo mai disegnata.** `shake` veniva impostata da danni, scoppi, furia e carica, ma `draw()` non la usava. Nel porting e' applicata (vedi differenze volute).
- **Simulazione dipendente dal frame rate.** `dt` variabile limitato a 0,033 s: sotto i 30 fps il gioco rallentava e le quantita' integrate dipendevano dal passo. Nel porting: passo fisso a 60 Hz.
- **Tasti letti con `e.key`**: dipendono dal layout (AZERTY, ecc.). Nel porting: `e.code`.
- **Un tocco piu' breve di un fotogramma su Q/E** era gestito con un lancio immediato nel gestore dell'evento; con il passo fisso e' sostituito da una pressione registrata (`Input.takeLatched`).
- **Proiettili distinti dal raggio** (`s.r === 8` per il gelo, `s.r > 6` per l'effetto d'impatto): un cambio di raggio avrebbe cambiato in silenzio comportamento e aspetto. Nel porting: `slowSeconds` e `visual` espliciti nei dati.
- **Stato globale mutabile condiviso** (variabili globali in `core.js`) e regole mescolate con particelle e DOM: nessun test era possibile. Nel porting: `Match` senza DOM, eventi, test.
- **HUD aggiornata nel DOM a ogni fotogramma** (`style.width`, `textContent`). Nel porting: solo se il valore cambia.
- **CSS a livelli sovrapposti** (tre blocchi che si ridefiniscono a vicenda, markup `header`/`foot` nascosto con `!important`). Nel porting: un solo livello con lo stesso risultato finale; `header`, `foot` e il titolo di pagina nascosti non esistono piu'.
- **Traslazione di camera non arrotondata**: il personaggio al centro vibrava di mezzo pixel. Nel porting: arrotondata.
- **Effetti congelati alla fine della partita**: l'aggiornamento si fermava con lo stato diverso da `play`, lasciando l'esplosione della vittoria ferma dietro la schermata. Nel porting: gli effetti proseguono.

## Revisione indipendente del porting (Fase 0)

Quattro revisori indipendenti hanno confrontato il porting con il prototipo (simulazione, rappresentazione, interfaccia/input, architettura e test); ogni segnalazione e' stata poi controllata da uno scettico incaricato di smentirla. Esito: **9 segnalazioni, nessuna smentita, tutte di gravita' bassa dopo la verifica**. La revisione della simulazione non ha trovato differenze di valori o di regole; quella della rappresentazione ha trovato solo il problema della mira. Si tratta di una lettura del codice da parte di agenti, non di una prova giocata.

Trattate nella stessa fase (vedi "Risolti"): mira sfasata di un passo, scorciatoie del browser intercettate, lacune dei test sui confini, id dello schema e posa iniziale.

Non corrette, da decidere:
- **Menu: WASD non e' piu' in grassetto** e il suggerimento in basso a sinistra e' stato riscritto ("WASD · Muoviti | ESC · Pausa | R · Ricomincia | Audio ... · M" invece di "WASD · Esplora la cripta | R · Ricomincia"). Il suggerimento e' voluto (nel prototipo lo stato audio stava in un elemento nascosto e non si vedeva mai); con altezza finestra sotto 450 px il suggerimento sparisce e con lui lo stato audio (come nel prototipo). Solo estetico.
- **Testi e colori delle etichette degli attacchi stanno nei dati del boss** (`BossPattern.name/labelColor/labelOffsetY`) e non in `presentation/`, a differenza dei proiettili (che hanno solo un id). Il prototipo faceva lo stesso; da spostare se si localizza o si cambia la grafica.
- **`Game` (ciclo, pausa, ripartenza), `Hud`, `Overlay`, `AudioPlayer` senza test**, e nessun controllo automatico che la simulazione non usi `Math.random` o il DOM (oggi non succede: l'unico `Math.random` e' in `cosmeticRng` e nel seme di `Game`). Possibile estrazione di un `FixedStepLoop` puro da testare.
- **La mira dipende dalla camera centrata sul giocatore**: `PlayerIntent.aimOffset` e' l'offset del mouse dal centro della vista. Se la camera avra' smorzamento o limiti, la mira andra' ricalcolata.
- **Mutante equivalente**: la ressincronizzazione della mira prima di ogni skill (`match.ts`) e' ridondante con le skill attuali; resta per quando una skill che sposta il giocatore precedera' un'altra.

## Risolti

- **Mira e mirino sfasati di un passo rispetto alla camera** (revisione). La mira era calcolata con la camera del passo precedente: camminando il mirino restava circa 3 unita' (4 px a schermo) dietro il mouse e dopo il Passo astrale saltava di 125 unita' per un fotogramma. Ora `PlayerIntent.aimOffset` e la mira si ricavano dopo il movimento, prima di ogni skill e a fine passo (come `syncAim()` nel prototipo). Test: la mira e' posizione + offset dopo il movimento e dopo lo scatto; il dardo parte verso il mouse anche mentre ci si muove. Le mutazioni (togliere la sincronizzazione dopo il movimento o a fine passo) fanno fallire i test.
- **Ctrl+R e Ctrl+F intercettati** (revisione). Il gioco bloccava il comportamento del browser per tutti i tasti legati, anche con Ctrl/Meta/Alt (Ctrl+R riavviava la partita invece di ricaricare la pagina; Ctrl+F attivava lo schermo intero). Ora le scorciatoie con modificatori sono lasciate al browser (`isBrowserShortcut`). Il prototipo aveva lo stesso difetto per W/A/S/D/Q/E.
- **Lacune dei test sui confini** (revisione). Mancavano prove per: contatto a 29, raggio di colpo sul boss (raggio + 26), margine delle zone sul boss (raggio + 25), soglia della carica (37), soglia di orbita (180), rinnovo del gelo senza somma, estremi della casualita' delle fratture, esito della morte simultanea (ora si asserisce `lost`, un solo `match_ended`, nessun `boss_defeated`). Aggiunte; ognuna fallisce con la mutazione corrispondente.
- **Id dello schema non nell'evento `boss_attack`** e posa iniziale 0,5 s duplicata (revisione). Ora l'evento porta `patternId` (il test di rotazione confronta gli id stabili) e la posa e' `BOSS_STATS.attackPose`.
