---
name: tys-grafica-pixellab
description: Produrre o revisionare sprite dei personaggi, armi ed equipaggiamenti, tileset, immagini, icone e grafica UI di Temper your soul con PixelLab MCP, secondo il canone grafico del progetto (personaggi 64x64 in quattro direzioni, arma separata che ruota verso il mouse, tile 32x32 seamless). Usare anche per preparare un lotto e valutare la coerenza degli asset; non per solo layout DOM/CSS o audio.
---

# Grafica di Temper your soul con PixelLab

Prima di preparare o produrre un asset leggere [docs/canone-grafico.md](../../../docs/canone-grafico.md): è la fonte unica per regole, ricetta PixelLab e consegna. Qui sotto c'è solo il promemoria operativo; se differisce dal canone, vale il canone.

## Regole da rispettare

- PixelLab MCP per creare e ritoccare tutta la grafica; niente altri generatori né asset grafici di terzi. DOM/CSS, testi, rendering e composizione dei livelli restano codice; font approvati conservati.
- Pixel art 2D fantasy medievale, pixel netti, palette del gioco (`hub-palette.ts`, `shadow-equipment.ts`).
- Personaggi giocabili: 64×64, modalità pro, vista `low top-down`, corpo a mani vuote, quattro direzioni (fronte, dietro, destra, sinistra).
- Animazioni: solo riposo, camminata, attacco e attacco in movimento (mossa `walk` più le pose delle braccia), con `animate_character` in modalità `skeleton-v3` e mosse di libreria (`idle`, `walk`, `slash`, `shoot_bow`, `cast`). Niente animazioni aggiuntive senza richiesta.
- Arma primaria come livello separato impugnato nella mano: ruota a 360° verso il mouse in combattimento, sta a riposo nel rifugio. Armatura e stivali ricolorano il corpo via codice. Le armi e gli altri equipaggiamenti si rifanno in una sessione dedicata.
- Mappe: tileset 32×32 seamless.
- Nemici, boss, icone, effetti e UI non hanno ancora regole nuove: chiedere al proprietario prima di produrli.

## Esecuzione

1. Distinguere la richiesta di specifiche dalla richiesta di produzione: scrivere un brief non avvia generazioni.
2. Se PixelLab non è collegato, avvisare il collaboratore e farlo collegare prima della produzione; proseguire solo con lavoro indipendente dagli asset.
3. Controllare saldo e costo con `search_help` del tool scelto. Non sprecare generazioni: niente prove multiple o varianti, il primo output vale salvo richiesta dell'utente.
4. Seguire la «Ricetta PixelLab» del canone. Nelle descrizioni delle azioni nominare solo il gesto del corpo, mai armi o magie.
5. Prima un personaggio pilota, mostrato all'utente fuori dal repository; gli altri solo dopo la sua approvazione.
6. Dopo ogni animazione controllare tutti i fotogrammi di tutte le direzioni, non uno a campione.
7. Integrare solo risultati approvati esplicitamente: fogli finali, manifest generato, credito in `art-credits.ts`, nota di provenienza nel `LEGGIMI.md` della cartella. Prompt completi, candidati e intermedi restano fuori; mai chiavi o percorsi personali nei file versionati.
8. Dopo l'integrazione: `npm run verify`, controllo nel browser ed elenco della prova giocata ancora da fare. Non cambiare simulazione, slot, hitbox o salvataggi per adattarli alle immagini.
