# Temper your soul

Gioco d'azione 2D per browser, scritto in **TypeScript** (Canvas 2D, nessuna dipendenza a runtime).
Scegli un dungeon, sconfiggi il suo boss, ottieni oggetti di rarita' diverse e cambia le tue abilita' con l'equipaggiamento. Il personaggio si salva nel browser.

> Stato: **Fase 1** (menu, 4 dungeon con boss e mappe uniche, oggetti con rarita', salvataggio locale). Vedi `docs/roadmap.md`.

## Provarlo

```bash
npm install
npm run dev      # http://localhost:5173
```

Oppure `npm run build` e aprire `dist/index.html` con doppio clic (funziona anche da `file://`).

### Comandi di gioco

| Comando | Azione |
| --- | --- |
| WASD | movimento |
| Mouse | mira |
| Clic sinistro (tenuto) | skill 1: mano primaria |
| Clic destro | skill 2: mano secondaria |
| Q | skill 3: armatura |
| E | skill 4: stivali |
| ESC | pausa (nei menu: indietro) |
| R | ricomincia (durante una partita) |
| M | audio on/off |
| F | schermo intero |

Le skill dipendono dall'equipaggiamento (dalla schermata "Equipaggiamento"); la dotazione iniziale e' quella del mago: dardo arcano, globo di gelo, meteora e passo astrale.

## Sviluppo

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | server di sviluppo con ricarica |
| `npm test` | test (Vitest, senza browser) |
| `npm run typecheck` | solo controllo dei tipi |
| `npm run build` | tipi + build in `dist/` |
| `npm run verify` | tipi + test + build; codice 0 solo se tutto riesce |

Su Windows senza Node nel PATH: `.\tools\verify.ps1`.

## Come e' fatto

La simulazione (`src/features/match`) e' una classe senza DOM che avanza a passo fisso di 1/60 s ed emette eventi; effetti, audio e disegno li ascoltano. I dati (skill, schemi del boss, valori) sono separati dal comportamento e dall'aspetto. Mappa completa delle cartelle, convenzioni e modo di lavorare in [`CLAUDE.md`](CLAUDE.md).

- [`docs/game-design.md`](docs/game-design.md): decisioni prese, valori provvisori ereditati dal prototipo, punti aperti
- [`docs/roadmap.md`](docs/roadmap.md): fasi, criteri di completamento, checklist di prova manuale
- [`docs/bugs.md`](docs/bugs.md): problemi noti e differenze rispetto al prototipo

## Il prototipo originale

`legacy/emberfall-prototype/` contiene la bozza JavaScript da cui si e' partiti ("Emberfall"), tenuta solo come riferimento: si apre con doppio clic su `index.html` e non fa parte del build.
