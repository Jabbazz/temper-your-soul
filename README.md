# Temper your soul

Gioco d'azione 2D per browser in **TypeScript strict**, senza motore di gioco: Canvas 2D in migrazione verso WebGL con PixiJS, interfaccia in DOM, server Node autorevole con WebSocket e profili su PostgreSQL. Le abilità dipendono dall'equipaggiamento: ogni pezzo indossato porta una skill. Il prototipo originale si chiamava Emberfall.

**Stato al 12 novembre 2026 · v0.20.00.** Tre classi (Guerriero, Arciere, Mago), quattro dungeon con discese a otto tappe e boss finale, 25 famiglie di oggetti con rarità e gear score, rifugio condiviso con deposito, forgia e mercante, account con più personaggi. Salvataggi v10, protocollo di rete 23. Il permadeath non è implementato. La versione è in `package.json`; le note di ogni versione si leggono nel menu (**Changelog**) e in `src/release-notes.ts`.

Molte prove giocate non sono ancora state confermate dal proprietario: l'elenco è in [docs/roadmap.md](docs/roadmap.md).

## Documenti

| Documento | Contenuto |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Regole di collaborazione, struttura del codice, convenzioni, verifica. Vale per persone e agenti; `CLAUDE.md` lo importa |
| [docs/game-design.md](docs/game-design.md) | Decisioni di gioco, valori provvisori, punti aperti |
| [docs/roadmap.md](docs/roadmap.md) | Fasi, criteri e prove manuali ancora da fare |
| [docs/bugs.md](docs/bugs.md) | Difetti e limiti noti |
| [docs/canone-grafico.md](docs/canone-grafico.md) | Regole grafiche e ricetta PixelLab |
| [docs/versioning.md](docs/versioning.md) | Numero di versione e changelog |
| [docs/mmo-persistente.md](docs/mmo-persistente.md) | Server, account, database, limiti |
| [docs/risorse-libere.md](docs/risorse-libere.md) | Audio e caratteri con licenza libera: regole e fonti |
| [docs/studio-combattimento-e-vittoria.md](docs/studio-combattimento-e-vittoria.md) | Studio sulla sensazione di combattimento e sulle schermate finali |

## Prima di lavorare

Vale per ogni collaboratore e per ogni agente AI (Claude, Codex e altri). Le regole complete sono in [AGENTS.md](AGENTS.md); in breve:

1. **Prima di modificare qualsiasi file** comunica in italiano cosa hai capito e quale incremento intendi fare.
2. Controlla cartella, ramo e modifiche locali, poi **esegui un pull**:

   ```bash
   git rev-parse --show-toplevel
   git status --short
   git branch --show-current
   git pull --ff-only
   ```

   Il repository principale è [Jabbazz/temper-your-soul](https://github.com/Jabbazz/temper-your-soul), remote `origin`, ramo `main`. Il comando usa l'upstream del ramo corrente; per un nuovo ramo aggiorna prima il ramo di partenza.
3. **Non proseguire ignorando un pull fallito:** spiega l'impedimento e conserva il lavoro locale. Niente reset distruttivi, force push o stash automatici delle modifiche altrui.
4. **Mantieni aggiornato l'utente** durante il lavoro, circa ogni minuto di lavoro attivo. Non inventare verifiche o approvazioni manuali.
5. Procedi per piccoli incrementi; dopo le modifiche esegui `npm run verify`. Se cambi regole aggiungi test; se cambi l'interfaccia controllala anche nel browser.
6. **Commit e push solo su richiesta esplicita**, con messaggio in italiano e dopo aver applicato [docs/versioning.md](docs/versioning.md). Mai force push.
7. Grafica solo con PixelLab secondo [docs/canone-grafico.md](docs/canone-grafico.md); candidati e intermedi restano fuori dal repository.

Quando due persone lavorano insieme, usare rami distinti e modifiche coordinate.

## Avvio locale

Richiede **Node.js 22** e npm. Le versioni degli strumenti sono fissate nel lockfile.

```bash
git clone https://github.com/Jabbazz/temper-your-soul.git
cd temper-your-soul
npm ci
npm run dev
```

Apri l'indirizzo stampato da Vite, di solito **http://localhost:5173/**; il processo deve restare in esecuzione. Senza server il gioco si prova con **«Gioca offline (prova locale)»** sulla schermata di accesso: il pulsante compare solo da `localhost` o da file, i personaggi si salvano nel browser e non ci sono cooperativa né rifugio condiviso.

```bash
npm run build
npm run preview
```

La build finisce in `dist/` (non va committata). I salvataggi locali appartengono all'origine del browser: `localhost`, `127.0.0.1`, un'altra porta e `file://` vedono dati diversi.

| Comando | Scopo |
| --- | --- |
| `npm run dev` | Server di sviluppo con ricaricamento automatico |
| `npm run build` | Controllo dei tipi e build di produzione |
| `npm run server` | Server di gioco e pagine di `dist/` sulla porta 4173, dopo `npm run build` |
| `npm run tunnel` | Avvia cloudflared verso la porta 4173 e stampa l'indirizzo pubblico |
| `npm run typecheck` | TypeScript di client e server, senza emettere file |
| `npm test` | Test Vitest, senza browser |
| `npm run verify` | Tipi, tutti i test e build: deve uscire con codice 0 |
| `.\tools\verify.ps1` | Come `npm run verify` su Windows; cerca anche un Node portatile locale |
| `npm run verify:postgres` | Verifica reale su un database di prova (`TEST_DATABASE_URL`), mai su quello di produzione |
| `npm run benchmark:network` | Misura ripetibile del traffico di rete |

## Gioco online e server

Il mondo condiviso richiede PostgreSQL e autenticazione configurati nel file `.env` (locale, escluso da Git): copiare `.env.example` e seguire [docs/mmo-persistente.md](docs/mmo-persistente.md).

1. `npm run build`, poi `npm run server` (porta 4173).
2. In sviluppo avviare anche `npm run dev`: Vite inoltra `/party`, `/online-config` e `/auth` al server.
3. Per giocare con altri da fuori: `npm run tunnel`. Server e tunnel devono restare attivi; in produzione servono HTTPS/WSS.

Il gioco si apre sulla schermata di accesso. Dopo il login si sceglie o si crea un personaggio dell'account e si entra nel rifugio comune. Inventario, economia, premi e scambi sono validati e salvati dal server; l'oro è condiviso fra i personaggi dello stesso account. I dungeon sono istanze pubbliche fino a 32 giocatori; il party sociale ha quattro posti.

Dopo un aggiornamento che cambia il protocollo, riavviare il server e ricaricare tutte le schede.

## Controlli

| Comando | Azione |
| --- | --- |
| WASD | Movimento |
| Mouse | Mira |
| Clic sinistro tenuto | Skill della primaria |
| Clic destro | Skill della secondaria |
| Q | Skill dell'armatura |
| Spazio | Skill degli stivali |
| E | Interagire nel rifugio |
| ESC | Chiude le finestre e torna al menu mantenendo la connessione |
| R | Ricomincia l'incontro |
| M | Audio attivo/disattivo |
| F | Schermo intero |
| F2 | Pannello FPS e diagnostica |
| Tab tenuto | Mappa della discesa (solo in partita) |
| N | Minimappa della stanza sì/no |

I tasti delle quattro skill si cambiano nelle Impostazioni e si salvano per browser.

## Grafica

Le regole sono in [docs/canone-grafico.md](docs/canone-grafico.md), decise dal proprietario il 12 novembre 2026. I tre personaggi giocabili sono sprite PixelLab 64×64 a mani vuote, in quattro direzioni scelte dal mouse, con riposo, camminata e attacco. L'arma primaria è un livello separato che in combattimento ruota verso il mouse; armatura e stivali cambiano il colore del corpo. Le mappe useranno tileset 32×32 seamless.

Ancora da fare: nuove armi ed equipaggiamenti disegnati per questi corpi, oggetto della mano secondaria, tileset delle mappe. Nemici, boss, icone ed effetti restano quelli esistenti.

## Limiti attuali

- **Permadeath** non implementato; la progressione fra le stanze è ancora da definire con il proprietario.
- **Database:** sui profili remoti la protezione RLS risulta disabilitata, [difetto aperto](docs/bugs.md) da risolvere prima dell'uso pubblico.
- **Server:** un solo processo; combattimenti, posizioni e istanze non sopravvivono a un riavvio, e non c'è ripresa della discesa dopo una disconnessione.
- **Strumenti admin:** nel menu la tendina «Admin · sviluppo» è visibile a tutti finché `ADMIN_TOOLS_ENABLED` in `src/features/admin/admin-tools.ts` resta vero. Va spenta o legata a un ruolo prima di una versione pubblica.
- **Bilanciamento:** tutti i valori sono provvisori (vedi [docs/game-design.md](docs/game-design.md)).
- I test sono senza browser: non certificano aspetto, interfaccia o sensazione di gioco.

## File esclusi dal repository

`node_modules/`, `dist/`, `.tools/`, `.env`, profili del browser e schermate temporanee non vanno pubblicati; mai credenziali o dati personali. Candidati grafici, prompt, strumenti audio e risultati intermedi restano nella cartella di lavoro esterna: vedi «Programmi esterni e file generati» in [AGENTS.md](AGENTS.md).
