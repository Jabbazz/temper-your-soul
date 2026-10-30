# Emberfall — prototipo RPG browser

## Avvio rapido

Estrai tutta la cartella e apri `index.html` con Chrome, Edge o Firefox.
Non aprire il file direttamente dentro lo ZIP. Non servono npm, build o dipendenze.
Per modificare il progetto, apri la cartella `emberfall` in VS Code o WebStorm.
Dopo una modifica salva il file e ricarica la pagina.

In alternativa, dalla cartella esegui `python -m http.server 8000` e apri
http://localhost:8000. Puoi anche usare Live Server di VS Code.

## Tecnologie

HTML per l'interfaccia, CSS per l'impaginazione e JavaScript per il gioco.
Grafica Canvas 2D, suoni generati con Web Audio. Non sono presenti immagini,
sprite sheet PNG o file audio: sprite e animazioni sono definiti in `js/sprites.js`,
mentre particelle e ambiente vengono disegnati dal codice.

## Dove trovare il codice

| File | Contenuto |
| --- | --- |
| `index.html` | Canvas, HUD, menu e caricamento ordinato degli script |
| `css/game.css` | Stili, HUD sovrapposto e adattamento alla finestra |
| `js/core.js` | Configurazione, stato condiviso, coordinate del mondo e telecamera. |
| `js/audio.js` | Sintesi dei suoni con Web Audio: nessun file audio esterno. |
| `js/game-state.js` | Avvio, riavvio, pausa, vittoria e sconfitta. |
| `js/particles.js` | Emissione delle particelle, impatti, onde e numeri di danno. |
| `js/combat.js` | Danni, proiettili e quattro abilità del mago. |
| `js/boss.js` | Sei schemi di attacco e sequenze temporizzate del guardiano. |
| `js/update.js` | Simulazione per fotogramma: movimento, collisioni, cooldown ed effetti. |
| `js/sprites.js` | Pixel art originale definita come matrici di caratteri e fotogrammi animati. |
| `js/renderer.js` | Disegno Canvas del mondo, personaggi, effetti, mira e aggiornamento HUD. |
| `js/input.js` | Mouse, tastiera, ridimensionamento e schermo intero. |
| `js/main.js` | Stato iniziale e ciclo requestAnimationFrame. Caricare per ultimo. |

## Come leggere il progetto

Parti da `main.js`: il ciclo chiama `update(dt)` e poi `draw()`.
`update.js` gestisce la simulazione; `renderer.js` disegna lo stato sul canvas.
Gli script sono classici e condividono variabili globali dichiarate in `core.js`:
non sono moduli ES e il loro ordine in `index.html` deve essere mantenuto.
Questa scelta permette di avviare la bozza anche tramite doppio clic, senza server.

Variabili principali: `p` = giocatore; `b` = boss; `shots` = proiettili;
`danger` = aree di attacco; `fx` = particelle; `waves` = onde d'urto;
`cd` = cooldown; `camera` = origine della visuale nel mondo.
Le coordinate del mondo sono distinte da quelle del mouse sullo schermo.

## Modifiche frequenti

- Dimensioni mappa, zoom, cooldown: `core.js` (`WORLD_W`, `WORLD_H`, `ZOOM`, `duration`).
- Danni e abilità del mago: `combat.js`, funzione `cast`.
- Velocità del giocatore e inseguimento del boss: `update.js`.
- Mosse del boss: `boss.js`, funzione `bossAttack`.
- Vita e posizione iniziale: `game-state.js` e `main.js` (entrambe le inizializzazioni).
- Disegni e fotogrammi dei personaggi: `sprites.js`.
- Scie e animazioni ad area: `renderer.js`; emissione particelle: `particles.js`.

## Comandi

WASD: movimento. Mouse: mira. Sinistro: dardo arcano (anche tenuto premuto).
Destro: globo di gelo. Q: meteora. E: passo astrale.
F: schermo intero. ESC: pausa. R: riavvio. M: audio.
Destro, Q ed E funzionano anche tenendo premuto il sinistro.

## Stato del prototipo

Single player locale: un mago, un boss con due fasi e sei attacchi,
mappa da 3200 × 2400, telecamera sul giocatore, sprite animati e particelle.
Non include backend, account, party, multiplayer o salvataggio persistente.
La separazione dei file conserva il comportamento della precedente versione HTML.
