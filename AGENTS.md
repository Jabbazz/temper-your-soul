# Temper your soul: istruzioni per gli agenti

Fonte unica delle istruzioni condivise per persone e agenti AI (Codex, Claude e altri); `CLAUDE.md` importa questo file. Punto d'ingresso per le persone: [README.md](README.md).

Gioco d'azione 2D per browser in **TypeScript strict**, senza motore di gioco: Canvas 2D in migrazione verso WebGL con **PixiJS** (unica dipendenza runtime nel browser, solo in `src/features/presentation/`) e interfaccia in DOM. Il server Node è autorevole (HTTP/WebSocket, profili su PostgreSQL).

| Argomento | Documento |
| --- | --- |
| Decisioni e valori di gioco | [docs/game-design.md](docs/game-design.md) |
| Fasi, criteri e prove ancora da fare | [docs/roadmap.md](docs/roadmap.md) |
| Difetti e limiti noti | [docs/bugs.md](docs/bugs.md) |
| Grafica | [docs/canone-grafico.md](docs/canone-grafico.md) |
| Versione e changelog | [docs/versioning.md](docs/versioning.md) |
| Server, account, database e limiti | [docs/mmo-persistente.md](docs/mmo-persistente.md) |
| Audio e caratteri con licenza libera | [docs/risorse-libere.md](docs/risorse-libere.md) |

Repository: https://github.com/Jabbazz/temper-your-soul (remote `origin`, ramo `main`).

## Collaborazione obbligatoria

Regole richieste dal proprietario del progetto; valgono anche quando si riprende un lavoro precedente.

- **Prima di qualsiasi nuova modifica** comunicare in italiano l'obiettivo, controllare repository, ramo e stato locale ed eseguire **`git pull --ff-only`** sull'upstream corrente. Per un nuovo ramo aggiornare prima la base. Non lavorare su una copia obsoleta ignorando il pull.
- Se il pull non riesce, spiegare subito perché e risolvere l'allineamento senza perdere lavoro: niente reset distruttivi, force push, stash automatici o risoluzioni che scartino il lavoro di un altro collaboratore. Non iniziare nuove modifiche finché manca una base allineata in sicurezza.
- **Tenere aggiornato l'utente durante il lavoro**, indicativamente almeno ogni minuto di lavoro attivo e quando emergono risultati, ostacoli o cambi di piano. Alla fine riportare modifiche, verifiche, limiti e prova manuale ancora da fare; ramo e hash solo se pubblicati.
- **Commit, push e repository remoti solo su richiesta esplicita.** Quando autorizzati: messaggio descrittivo in italiano, ricontrollare remoto e stato prima di pubblicare, mai force push. Lavori simultanei su rami separati e coordinati.
- **Versione e changelog obbligatori:** prima di creare o aggiornare una PR, o di un commit diretto a `main` autorizzato, applicare [docs/versioning.md](docs/versioning.md): aggiornare `package.json`, lockfile e la prima voce di `src/release-notes.ts`, riassumendo in italiano tutte le modifiche dell'incremento; per il bilanciamento riportare i valori prima → dopo con unità, skill/oggetto/boss e rarità/livello/fase pertinenti. Convenzione vA.BB.CC: un nuovo feature branch parte da main con CC=01 (registrato nel primo commit) e ogni commit successivo incrementa CC; ogni merge, squash o commit diretto a main incrementa BB rispetto al main aggiornato e azzera CC; A cambia solo su richiesta esplicita. Aprire una PR o fare push senza nuovi commit non aumenta la versione. Preservare lo storico delle note, verificare le collisioni di versione dopo il pull ed eseguire `npm run verify`. Questa regola non autorizza commit o push.

## Strumenti e comandi

- Node 22 e npm. Se `node` non è nel PATH, `tools/verify.ps1` cerca da solo un'installazione portatile locale.
- TypeScript 5.6 (strict), Vite 5, Vitest 2, PixiJS 8: versioni fissate in `package.json`. Non aggiornare le dipendenze insieme a un'altra modifica.
- Skill di progetto `tys-*` e skill ufficiali `pixijs-*` in `.agents/skills/` (copia identica per Claude in `.claude/skills/`). Per scrivere codice PixiJS partire dalla skill `pixijs`; provenienza in `pixijs/ORIGINE.md`. Le skill `pixijs-*` sono copie di terzi: non modificarle.
- Lavorare solo nel repository dedicato del progetto (`git rev-parse --show-toplevel`): su alcune macchine anche la cartella home dell'utente è un repository Git, da non toccare.

```powershell
npm install        # una sola volta (npm ci su una copia pulita)
npm run dev        # sviluppo con ricarica (5173); il gioco online richiede anche il server su 4173
npm run build      # controllo dei tipi + build di produzione in dist/
npm run server     # serve dist/ e il WebSocket /party su 4173, dopo npm run build
npm run typecheck  # TypeScript di client, server e strumenti
npm test           # tutti i test (Vitest, senza browser)
npm run verify     # tipi + test + build: codice 0 solo se tutto riesce
.\tools\verify.ps1 # come npm run verify, ma trova Node da solo e stampa "VERIFICA COMPLETA: OK"
npm run benchmark:network  # confronto ripetibile fra snapshot completi e protocollo compatto
```

Avvio, tunnel, database e variabili d'ambiente: README e `docs/mmo-persistente.md`. La build in `dist/` è uno script classico (IIFE), non un modulo ES.

## Struttura

Organizzazione per funzionalità, non per tipo di file. Test accanto al codice (`*.test.ts`).

```
index.html, src/main.ts, src/game.ts, src/style.css   pagina, avvio, ciclo a passo fisso 60 Hz, schermate, collegamento delle parti
src/release-notes.ts   note del changelog; la prima voce corrisponde alla versione di package.json
src/testing.ts, src/testing-png.ts   aiuti per i test (partite con seme, intenzioni, passo fisso, lettura dei PNG)
src/core/        vec2, rng (Rng, SeededRng, cosmeticRng), signal, input + input-bindings (azioni), camera, camera-offset, polygon
src/features/
  arena/         ArenaDefinition (dimensioni, partenze, margini, pilastri), clamp, pilastri, nav-field
  combat/        health, team, collision (HIT_RADIUS), projectile, danger-zone, events (GameEvent), contact-attacks, status-effects/
  skills/        skill-definition (SkillDefinition, SkillEffect, Loadout), mage-skills, skill-bar, skill-effects, mana (SPELL_MANA)
  classes/       statistiche e skill di classe; una cartella per classe (warrior/, archer/, mage/)
  player/        player.ts (movimento, vita, invulnerabilità, loadout)
  boss/          boss-definition, boss.ts, pattern-kit.ts (anelli, ventagli, schedule, carica), guardian.ts, boss-context.ts
  minions/       servitori: definizioni, catalogo, comportamenti
  dungeons/      dungeon-definition, crypt.ts, dungeons.ts (registro DUNGEONS), dungeon-access (soglie GS), swamp/, forge/, glacier/;
                 dungeons.test.ts valida OGNI dungeon registrato
  run/           discesa a stanze: piano, stanze e modelli, regista, vene, luogotenenti, premi dei mob, bestiario
  items/         rarity, equipment-slot, item-family + item-families (catalogo), item-classes, item-skills + dungeon-item-skills,
                 item, scaling, gear-score
  loot/          loot-table, loot-tables (pool espliciti per boss), roll-loot (deterministico con Rng), loot-odds
  character/     character, character-roster, creation, progression, appearance, save-format (SAVE_VERSION, validazione),
                 save-store (localStorage), hub-map / hub-state / hub-services (rifugio)
  match/         match.ts (la partita senza DOM, un solo ordine di passo, emette eventi), encounter, combat-tally
  network/       protocol (NETWORK.protocolVersion), snapshot-codec, party-client, hub e mondo pubblico, account, party sociale
  presentation/  visuals, looks/ (aspetti per id), themes/ (mappe), boss-art/, minion-art/, vfx/, effects, poses, draw-*.ts,
                 scene-renderer, hub-renderer, webgl-renderer + pixi-modules (solo qui si importa PixiJS)
                 personaggi giocabili: pixellab-hero.ts (fogli, direzioni, mano dell'arma, arma rotante), hero-tint.ts (cambio
                 colore da equipaggiamento), game-character-preview.ts, shadow-equipment.ts (materiali e disegni degli oggetti)
                 ritratti illustrati: character-art.ts (dati degli strati), adventurer-body.ts (agganci), portrait-*.ts
  ui/            accesso all'account, menu, schermate, hud, overlay, dungeon-select, inventario e schede oggetto, pannelli del rifugio, dom
  audio/         audio-player (Web Audio, ascolta gli eventi), audio-director, audio-catalog, audio-credits, audio-settings
  settings/      associazioni dei tasti e cursore
  admin/         strumenti admin di sviluppo (ADMIN_TOOLS_ENABLED)
src/assets/      asset finali: art/, audio/, characters/hero-pixellab-64/, fonts/, portraits/, vfx/
server/          index.ts, world-server e world-service (mondo autorevole), auth/, storage/ (PostgreSQL), trade-ledger
tools/           verify.ps1, network-benchmark.ts, verify-postgres.ts, tunnel.mjs, cerca-risorse.mjs, arte/genera-cursori.mjs,
                 arte/prepara-fogli-eroi.mjs (fogli e manifest dei personaggi giocabili dall'esportazione PixelLab)
```

Flusso di una partita: `Game` tiene il personaggio e la schermata corrente. Avviare un dungeon crea un `Match` con `character.loadout()`; `Game.frame` accumula il tempo e chiama a 60 Hz `Match.step(dt, intent)`; `Match` modifica solo sé stessa ed emette `GameEvent`; effetti, pose e audio ascoltano gli eventi; il disegno legge lo stato. Premi e salvataggio avvengono PRIMA di mostrare la schermata finale.

Online il server esegue `Match.stepParty(dt, intents)` a 60 Hz; i client inviano intenzioni e ricevono aggiornamenti a 30 Hz tramite `SnapshotEncoder`/`SnapshotDecoder`. I delta sono ordinati: non saltarli in silenzio e non cambiare il protocollo senza incrementare `NETWORK.protocolVersion`. Definizioni e nascite si inviano una sola volta. Inventario, economia, premi e scambi sono validati e salvati dal server: il browser non è fonte di verità. Non introdurre regole di combattimento nel trasporto o nel rendering.

Il prototipo JavaScript originale («Emberfall») non è più nel repository: si recupera dalla storia Git.

## Convenzioni

### Codice e simulazione

- TypeScript **strict**: niente `any`, parametri inutilizzati con prefisso `_`. File in `kebab-case`, classi in `PascalCase`.
- Testi visibili al giocatore e documentazione in italiano; identificatori nel codice in inglese.
- **Moduli piccoli per responsabilità:** classi in `src/features/classes/<classe>/`, stati in `combat/status-effects/`. Separare profili, equipaggiamento, skill e comportamento; registri condivisi leggeri; nuove categorie in file dedicati invece di ampliare file monolitici.
- **La simulazione non conosce il DOM, il canvas, il tempo reale né `Math.random`:** ciò che è casuale nelle regole passa da un `Rng` iniettato (`SeededRng` nei test e nelle partite), così una partita è riproducibile con il seme. La casualità estetica (`cosmeticRng`) vale solo per presentazione e audio, mai per le regole.
- **Passo fisso:** la logica avanza solo in `Match.step` / `Match.stepParty` a 1/60 s, mai in funzione del frame rate; disegno e HUD a ogni fotogramma. Il tempo di partita (`Match.time`) si ferma alla fine.
- **Dati, comportamento e rappresentazione separati:** i dati (`SkillDefinition`, `ItemFamily`, `ProjectileSpec`, `DangerZoneSpec`, `ArenaDefinition`, `BossDefinition`/`BossStats`, tabelle degli schemi) sono di sola lettura a runtime; il comportamento sta in `skill-effects.ts`, `boss.ts`, `pattern-kit.ts`, `match.ts`; l'aspetto in `presentation/`. I dati scelgono l'aspetto con un id (`ProjectileVisual`), mai con un colore o un numero. Niente regole nella rappresentazione né aspetto nei dati.
- **Eventi:** la simulazione dice cosa è successo (`GameEvent`), non cosa disegnare o suonare. Un effetto o un suono nuovo ascolta un evento esistente; se manca, aggiungerlo a `events.ts` e coprirlo con un test.
- **Valori provvisori:** i valori stanno in tabelle di dati con nome (`PLAYER_STATS`, `BossStats`, `MAGE_SKILLS`, `item-skills.ts`, `RARITY_STATS`, `LOOT_TABLES`, tabelle degli schemi, `ArenaDefinition`, `HIT_RADIUS`), non sepolti nel codice. Sono tutti provvisori: per i punti aperti di `docs/game-design.md` non inventare valori o regole definitive, usare un valore regolabile, segnalarlo e aggiungerlo ai punti aperti.
- Input solo tramite azioni (`Action`), mai tasti hardcoded; tasti legati per posizione fisica (`event.code`). Le pressioni più brevi di un passo non si perdono (`Input.isActionActive` + `takeLatched`).
- **Id stabili** (skill, famiglie di oggetti, dungeon, boss, schemi, `ProjectileVisual`): non rinominarli, li usano salvataggi, test, eventi e rappresentazione.
- L'HUD è in DOM sopra il canvas: UI e tooltip leggono le stesse regole del dominio, senza duplicarle. Font approvati conservati; Silkscreen sul canvas a multipli di 8 px, premi XP/oro almeno 16 px.

### Contenuti

- **Oggetti:** 25 famiglie; la famiglia decide skill, slot e classe richiesta, la rarità scala le skill. Un oggetto salvato è `{ uid, familyId, rarity, level? }`; skill e GS si ricalcolano dai dati. Niente equipaggiamento di altre classi: gli oggetti incompatibili restano nello zaino. Le voci dei pool in `loot-tables.ts` sono esplicite: non derivarle da `exclusiveTo`, che indica solo l'origine. Ricetta per una nuova famiglia: skill `tys-nuova-famiglia`.
- **Skill base:** `SkillDefinition` (con `visual`) e, se serve un nuovo tipo di effetto, un caso in `skill-effects.ts`, in `Effects.onSkillCast` e nel catalogo audio; test.
- **Dungeon:** `features/dungeons/<id>/` con `ArenaDefinition`, `BossDefinition` (schemi con gli attrezzi di `pattern-kit.ts`) e `DungeonDefinition`; tema in `presentation/themes/` (un pixel interno per unità di mondo su entrambi gli assi), grafica in `presentation/boss-art/`, aspetti in `presentation/looks/`; registri e tabella di bottino. `dungeons.test.ts` è il criterio di accettazione (mappa valida, schemi eseguibili e leggibili, danno limitato, simulazione lunga). Ricetta: skill `tys-nuovo-dungeon`.
- **Salvataggio:** formato v10 (`SAVE_VERSION`), raccolta `character-roster` con profili separati. Ogni dato esterno passa da `deserializeRoster` e `deserializeCharacter`; preservare le migrazioni dei formati precedenti e le copie `...:corrupt` / `...:before-roster`. Una raccolta invalida non si ripara perdendo profili in silenzio. I pezzi di altre classi si tolgono dagli slot, non dall'inventario. Cambiando il formato incrementare `SAVE_VERSION` e gestire la migrazione.

### Grafica

Fonte unica: [docs/canone-grafico.md](docs/canone-grafico.md), con le regole decise dal proprietario il 12 novembre 2026; prima di produrre grafica usare la skill `tys-grafica-pixellab`. In sintesi:

- **PixelLab MCP è obbligatorio** per sprite, equipaggiamenti, tile, immagini, icone e grafica UI; se manca, avvisare il collaboratore e farlo collegare prima della produzione.
- **Personaggi giocabili:** PixelLab 64×64 (modalità pro, vista low top-down), corpo a mani vuote, **quattro direzioni** (fronte, dietro, destra, sinistra) scelte dal mouse. Animazioni solo riposo, camminata, attacco e attacco in movimento (le gambe continuano il passo), fatte con `animate_character` in modalità `skeleton-v3` e mosse di libreria.
- **Arma primaria:** livello separato impugnato nella mano; in combattimento ruota a 360° verso il mouse, nel rifugio sta a riposo. Armatura e stivali ricolorano il corpo via codice (tinta del pezzo, orlo per rarità). Armi e altri equipaggiamenti saranno rifatti in una sessione futura.
- **Mappe:** tileset 32×32 seamless con PixelLab.
- **Non sprecare generazioni:** niente prove multiple, varianti o animazioni non richieste; il primo output vale salvo richiesta; prima un personaggio pilota, poi gli altri dopo l'approvazione.
- Gli asset esistenti restano fino a sostituzione approvata; le direzioni artistiche precedenti non sono riferimenti per nuovi asset. La grafica non cambia regole, hitbox, slot o salvataggi.

## Programmi esterni e file generati

Vale per ogni persona o agente, in qualunque fork o clone. Lo scopo: nel repository nessun file inutile, e meno file che gli agenti devono leggere.

- **Fuori dalla cartella del progetto:** candidati, prompt di produzione, immagini di partenza, risultati intermedi, anteprime, strumenti audio, conversioni, cache e log restano nella cartella di lavoro esterna.
- **Nessun percorso della propria macchina nei file del repository:** niente dischi, nomi utente o cartelle personali, né assoluti né relativi a una cartella privata. Si scrive il ruolo («la cartella di lavoro esterna») e ognuno sceglie la propria.
- **Prima fuori, poi dentro solo se approvato:** generare e provare fuori dal repository, mostrare all'utente confronti e anteprime, anch'essi fuori, e integrare **solo dopo la sua approvazione esplicita**.
- **Cosa entra:** l'asset finale ottimizzato in `src/assets/` (PNG, audio), i file di dati che il gioco legge (manifest, geometrie), i crediti in `art-credits.ts` / `audio-credits.ts`, i test e una nota breve di provenienza (programma o modello, licenza, parametri essenziali) nel `LEGGIMI.md` della cartella dell'asset o nel manifest. Poi `npm run verify`.
- **Cosa non entra:** script che pilotano programmi esterni, prompt, immagini di partenza o intermedie, cache, pagine di anteprima usate solo per le prove. `tools/` contiene solo strumenti del progetto che girano con `node`/`npm` senza programmi esterni.
- **File di dati generati:** portano in testa che sono generati e non si modificano a mano. Si rigenerano con lo strumento del progetto indicato nel file (per esempio `tools/arte/prepara-fogli-eroi.mjs`) o, dove non esiste, con i propri strumenti esterni; quelli usati in passato si recuperano dalla storia Git.

## Verifica

`npm run verify` (o `.\tools\verify.ps1`) deve terminare con codice 0. I test sono headless e coprono regole, boss, skill, giocatore, partita, effetti e coerenza dei dati; **non** verificano l'aspetto visivo, la sensazione di gioco, l'interfaccia in DOM né il ciclo del browser: quelli si controllano aprendo il gioco.

- Fotogrammi renderizzati da uno script (per esempio un browser headless) e prove di fumo **non** sono prove giocate: la conferma manuale la dà l'utente. Nella documentazione si registra come confermato a mano solo ciò che l'utente ha detto esplicitamente di aver provato.
- Dopo aver scritto un test verificare che possa fallire (mutazione temporanea e ripristino): per esempio cambiare `HIT_RADIUS.player` deve far fallire un test.

## Come lavorare

- **Piccoli incrementi:** una funzionalità per volta, gioco avviabile a ogni passo; fermarsi a fine incremento in attesa della prova manuale.
- Prima di cambiare, leggere i file esistenti. Dopo ogni modifica `npm run verify`; se si aggiunge comportamento, estendere i test o dichiarare che non è coperto.
- Registrare i difetti realmente rilevati in `docs/bugs.md`; aggiornare roadmap e design quando una decisione cambia.
- Non riscrivere file sorgente con `Get-Content`/`Set-Content`/`WriteAllText` in PowerShell 5.1: altera i caratteri non ASCII (il codice usa `·`, `→`, `✦`, `è`). Usare lo strumento di modifica, Node o Python con UTF-8 esplicito.
