# Temper your soul: istruzioni per Claude

Gioco d'azione 2D per browser in **TypeScript** (Canvas 2D, nessuna dipendenza a runtime, nessun motore di gioco).
Nato come prototipo JavaScript generato con ChatGPT ("Emberfall", un mago contro un guardiano in un'arena), poi riscritto con la struttura e i principi di Ashen Realm.
Decisioni di gioco: `docs/game-design.md`. Fasi e criteri: `docs/roadmap.md`. Problemi noti: `docs/bugs.md`.
Repository: https://github.com/Jabbazz/temper-your-soul (remote `origin` configurato, branch `main`).

## Il prototipo originale

Resta in `legacy/emberfall-prototype/` (HTML + JS classico, si apre con doppio clic) **solo come riferimento storico**: non fa parte del build, non e' coperto da `tsc` ne' dai test. Il codice attuale e' tutto in `src/`.

## Strumenti

- Node 22 + npm. Se `node` non e' nel PATH si puo' usare la copia portatile di Ashen Realm:
  `$env:PATH = "C:\Users\gianm\Documents\ashen-realm\.tools\node-v22.11.0-win-x64;$env:PATH"` (PowerShell). `tools/verify.ps1` la cerca da solo.
- TypeScript 5.6 (strict), Vite 5 (sviluppo e build), Vitest 2 (test). Versioni fissate in `package.json`, come in Ashen Realm.
- `C:\Users\gianm` e' un repository Git (senza commit): questo progetto ha un repository **dedicato** nella propria cartella; non toccare quello della home.

## Comandi (dalla radice del progetto)

```powershell
npm install        # una sola volta
npm run dev        # server di sviluppo con ricarica (http://localhost:5173)
npm run build      # controllo dei tipi + build di produzione in dist/
npm run typecheck  # solo tsc --noEmit
npm test           # tutti i test (Vitest)
npm run verify     # tipi + test + build: esce con codice 0 solo se tutto riesce
.\tools\verify.ps1 # come npm run verify, ma trova Node da solo e stampa "VERIFICA COMPLETA: OK"
```

`dist/index.html` e' uno script classico (non un modulo ES): si apre anche con doppio clic (`file://`) e si pubblica su qualunque hosting statico.

## Struttura

Organizzazione per funzionalita', non per tipo di file. Test accanto al codice (`*.test.ts`).

```
index.html, src/main.ts, src/game.ts, src/style.css   pagina, avvio, ciclo (passo fisso 60 Hz), collegamento di tutte le parti, stile
src/core/        vec2, rng (Rng + SeededRng), signal, input (azioni), camera (+ ZOOM)
src/features/
  arena/         arena.ts (dimensioni, margini, clamp: regole), arena-layout.ts (decorazione: solo aspetto)
  combat/        health, team, collision (raggi e distanze), projectile (+ ProjectileSpec), danger-zone (+ DangerZoneSpec), events (GameEvent)
  skills/        skill-definition (dati), mage-skills (le 4 skill del mago), skill-bar (ricariche), skill-effects (comportamento)
  player/        player.ts (movimento, vita, invulnerabilita')
  boss/          boss.ts (stato, movimento, fasi, carica, raffiche), boss-patterns.ts (6 schemi: dati + comportamento), boss-context.ts
  match/         match.ts: la partita completa e senza DOM (orchestra tutto, un solo ordine di passo, emette eventi)
  presentation/  tutto cio' che e' aspetto: visuals (colori e forme per id), effects (particelle, onde, testi, scie, scossa), poses,
                 sprites (pixel art), draw-*.ts (arena, attori, combattimento, effetti), scene-renderer.ts
  ui/            hud.ts (barre e skill in DOM), overlay.ts (menu, pausa, fine), fullscreen.ts, dom.ts
  audio/         audio-player.ts (Web Audio, ascolta gli eventi)
src/testing.ts   aiuti per i test (partite con seme, intenzioni, esecuzione a passo fisso, contesto del boss)
```

Flusso: `Game.frame` accumula il tempo e chiama a 60 Hz `Match.step(dt, intent)`; `Match` modifica solo se stessa ed emette `GameEvent`; effetti, pose e audio ascoltano gli eventi; `renderScene` disegna leggendo lo stato (non lo modifica mai).

## Convenzioni

- TypeScript **strict**: niente `any`, parametri inutilizzati con prefisso `_`. File in `kebab-case`, classi in `PascalCase`.
- Testi visibili al giocatore e documentazione in italiano; identificatori nel codice in inglese.
- **La simulazione non conosce il DOM, il canvas, il tempo reale ne' `Math.random`**: tutto cio' che e' casuale nelle regole passa da un `Rng` iniettato (`SeededRng` nei test e nelle partite), cosi' una partita e' riproducibile con il seme. La casualita' estetica (`cosmeticRng`) vale solo in `presentation/`.
- **Passo fisso**: la logica avanza solo in `Match.step(dt, intent)` a 1/60 s (mai dipendente dal frame rate); disegno e HUD a ogni fotogramma. Il tempo di partita (`Match.time`) si ferma alla fine.
- **Dati / comportamento / rappresentazione separati**: i dati (`SkillDefinition`, `ProjectileSpec`, `DangerZoneSpec`, `BOSS_STATS`, tabelle degli schemi) sono di sola lettura a runtime; il comportamento sta in `skill-effects.ts`, `boss.ts`, `boss-patterns.ts`, `match.ts`; l'aspetto in `presentation/`. I dati scelgono l'aspetto con un id (`ProjectileVisual`), mai con un colore o con un numero (non identificare un proiettile dal raggio). Non mettere regole nella rappresentazione ne' aspetto nei dati.
- **Eventi**: la simulazione dice cosa e' successo (`GameEvent`), non cosa disegnare o suonare. Aggiungere un effetto o un suono = ascoltare un evento esistente; se manca l'evento, aggiungerlo a `events.ts` e coprirlo con un test.
- **Valori provvisori**: i valori ereditati dal prototipo stanno in tabelle di dati con nome (`PLAYER_STATS`, `BOSS_STATS`, `MAGE_SKILLS`, `NOVA`/`BURST`/..., `ARENA`, `HIT_RADIUS`), non sepolti nel codice. Sono tutti provvisori (vedi `docs/game-design.md`): non inventare valori definitivi, usare un valore regolabile e segnalarlo.
- Input solo tramite azioni (`Action`), mai tasti hardcoded; tasti legati per posizione fisica (`event.code`). Le pressioni piu' brevi di un passo non si perdono (`Input.isActionActive` + `takeLatched`).
- Id stabili (`arcane_bolt`, `frost_orb`, `meteor`, `astral_step`, id degli schemi, `ProjectileVisual`): non rinominarli, li usano test, eventi e rappresentazione.
- Per aggiungere una skill: nuovo `SkillDefinition` in `mage-skills.ts` (e, se serve un nuovo tipo di effetto, un caso in `skill-effects.ts`), un caso in `Effects.onSkillCast` e in `AudioPlayer`, test. Per aggiungere uno schema del boss: nuovo `BossPattern` in `boss-patterns.ts` e in `BOSS_PATTERNS`, test.
- Grafica provvisoria: pixel art come matrici di caratteri in `sprites.ts`; niente asset esterni finche' non decisi. L'interfaccia (HUD) e' in DOM sopra il canvas e mostra solo lo stato, senza regole.

## Verifica

`npm run verify` (o `.\tools\verify.ps1`) deve terminare con codice 0. I test sono headless (nessun browser) e coprono regole, boss, skill, giocatore, partita, effetti e coerenza dei dati; **non** verificano l'aspetto visivo, la sensazione di gioco, l'interfaccia in DOM (HUD, schermate, pulsanti) ne' il ciclo del browser: quelli si controllano aprendo il gioco (`npm run dev` o `dist/index.html`).
Fotogrammi renderizzati da uno script (es. Edge headless) e prove di fumo **non** sono prove giocate: la conferma manuale la da' l'utente.
Dopo aver scritto un test conviene verificare che possa fallire (mutazione temporanea e ripristino): ad esempio cambiare `HIT_RADIUS.player` o togliere `slowSeconds` dalla logica del gelo deve far fallire un test.

## Come lavorare

- **Piccoli incrementi**: una funzionalita' per volta, gioco avviabile a ogni passo; fermarsi a fine incremento in attesa della prova manuale.
- Prima di cambiare, leggere i file esistenti.
- Dopo ogni modifica: `npm run verify`. Se si aggiunge comportamento, estendere i test o dichiarare che non e' coperto.
- **Conferme manuali**: nella documentazione si registra come confermato a mano solo cio' che l'utente ha detto esplicitamente di aver provato. Distinguere sempre controlli automatici, fotogrammi renderizzati e prove manuali ancora da fare.
- Non inventare valori definitivi o regole per i punti aperti di `docs/game-design.md`: usare un valore provvisorio regolabile, segnalarlo e aggiungerlo ai punti aperti.
- Registrare i difetti realmente rilevati in `docs/bugs.md`; aggiornare roadmap e design quando una decisione cambia.
- **Non fare commit, push o repository remoti senza richiesta esplicita.** Mai force push. Commit con messaggio descrittivo in italiano.
- Non riscrivere file sorgente con `Get-Content`/`Set-Content`/`WriteAllText` in PowerShell 5.1: altera i caratteri non ASCII (il codice usa `·`, `→`, `✦`, `è`). Usare Python (UTF-8 esplicito), Node o lo strumento di modifica.
