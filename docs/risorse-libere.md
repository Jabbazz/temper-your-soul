# Risorse libere: fonti valutate

Ricerca del 31 ottobre 2026, solo pagine web, nessun download. **V** = verificato aprendo la pagina; **D** = dedotto (tag, descrizione, fonti terze). Regole in [prompt-di-progetto.md](prompt-di-progetto.md), sezione 5. Il primo lotto è nel progetto (vedi sotto). Ogni nuovo scaricamento va proposto all'utente (nome, fonte, dimensione) e registrato in `src/features/audio/audio-credits.ts`.

Che una registrazione sia "vera" lo si ricava dalla descrizione dell'autore, non dall'ascolto: va confermato ascoltando, prima di inserirla.

## Escluse (e perché)

| Fonte | Motivo |
| --- | --- |
| Kevin MacLeod / incompetech | La pagina "software" (aggiornata a novembre 2025) dichiara l'uso di **Suno** (IA) per cori e strumenti solisti, oltre a Tone Transfer e a librerie di campioni: non si può sapere quali brani contengano IA (V) |
| Pixabay | Licenza propria, non CC; le linee guida ammettono audio IA anche senza etichetta (V) |
| BBC Sound Effects (RemArc) | Solo uso personale, educativo o di ricerca (D) |
| Musica su OpenGameArt | Quasi sempre campioni o synth (per esempio "Solemn (Opening)" elenca "Synth") (V) |
| Licenze BY-SA (per esempio Night on Bald Mountain, Skidmore College) | La clausola SA su musica sincronizzata a immagini è rischiosa per un gioco (V la licenza, D l'interpretazione) |
| Holst, *Mars* (USAF Heritage of America Band) | Possibile trascrizione ancora protetta (Merlin Patterson); licenze discordanti fra le pagine |
| Internet Archive senza verifica | La licenza la dichiara chi carica, spesso a torto (per esempio Karl Richter, vinile DECCA 1970, segnato come pubblico dominio) (V) |
| "12 Public Domain Boss Sprites" (OGA) | Ottenuti con stile neurale e nomi presi da giochi protetti |
| 7soul1 "496 icons" (OGA) | Licenza contraddittoria, icone rimosse perché derivate da giochi protetti (D) |

## Musica (registrazioni vere)

| Uso nel gioco | Brano ed esecuzione | Pagina | Licenza | Durata / peso | Note |
| --- | --- | --- | --- | --- | --- |
| Menu | Debussy, *La cathédrale engloutie*, Stefano Ligoratti (pianoforte) | imslp.org/wiki/Special:ImagefromIndex/220924 | CC BY 3.0 (V) | 5:51, 5,4 MB | Solo questo file: altri dello stesso esecutore sono NC |
| Menu (alt.) | Bach, *Variazioni Goldberg*, Aria, Kimiko Ishizaka | archive.org/details/The_Open_Goldberg_Variations-11823 | CC0 (V) | 4:59 | Più sereno che cupo |
| Cripta | Canto gregoriano binaurale, monastero vicino a Burgos, Suso_Ramallo | freesound.org/people/Suso_Ramallo/sounds/320530/ | CC BY 4.0 (V) | 10:25 | Ritagliare 1–2 min per l'anello |
| Cripta (organo) | "Pipe Organ Clip", St Mark's, g0ggs | freesound.org/people/g0ggs/sounds/342598/ | CC0 (V) | 2:50 | Satura verso la fine |
| Palude | Drone di violoncello, carrieedick / juskiddink | freesound.org/people/carrieedick/sounds/465558/ · …/juskiddink/sounds/81032/ | CC0 / CC BY 4.0 (V) | 1:08 / 0:32 | Tappeto da sovrapporre all'ambiente |
| Fucina | Taiko (4 tamburi, suona Dave Thayer), whatsanickname4u | freesound.org/people/whatsanickname4u/sounds/127337/ | CC BY 3.0 (V) | 3:31 | Anello a battute; citare anche l'esecutore |
| Ghiacciaio | Grieg, *La morte di Åse*, Czech National Symphony Orchestra (Musopen 2012) | imslp.org/wiki/Special:ImagefromIndex/246988 | CC BY 3.0 su IMSLP, Public Domain Mark su archive.org: **trattare come CC BY e citare** (V) | 4:38, 10,7 MB | Archi |
| Ghiacciaio (alt.) | Debussy, *Des pas sur la neige*, Chiara Bertoglio | imslp.org/wiki/Special:ImagefromIndex/297337 | CC BY 3.0 (V) | 4:01 | Non trovata una celesta vera e libera |
| Furia del boss | Grieg, *Nell'antro del re della montagna*, CNSO (Musopen) | imslp.org/wiki/Special:ImagefromIndex/246990 | Come Åse | 2:38, 6,1 MB | Accelera: non fa da anello. Alternativa: anello di taiko |
| Vittoria | "Medieval Fanfare", due trombe (Jo Wright), tobyk | freesound.org/people/tobyk/sounds/26198/ | CC BY 3.0 (V) | 0:07 | — |
| Sconfitta | "funeral bell", aoristos | freesound.org/people/aoristos/sounds/329324/ | CC0 (V) | 0:29 | Alternativa: Chopin, marcia funebre, Harald Vetter, IMSLP 683229, CC BY 4.0 |

## Effetti sonori

| Fonte | Licenza | Uso | Avvertenze |
| --- | --- | --- | --- |
| Freesound, autori **kyles**, **Breviceps**, **felix.blume** | Quasi tutto CC0 (V; kyles 2 NC, felix.blume 22 NC) | Foley, ambienti, fango bollente (lava), cori | Controllare ogni singolo suono |
| Freesound, **qubodup** | CC0 e CC BY (V) | Fruscii, pozze di fango | Licenza diversa suono per suono |
| Freesound, **InspectorJ**, **klankbeeld** | Quasi tutto CC BY (V) | Passi, vento, horror | Evitare "Wind, Synthesized" |
| **Kenney** UI Audio | CC0 (V) | Clic e interfaccia | Dichiarati "organic sounds" (V) |
| **Kenney** RPG Audio, Impact Sounds | CC0 (V) | Colpi, oggetti, passi | Metodo di registrazione non dichiarato (D: foley); evitare Digital/Sci-fi Audio |
| Michel Baradari, "15 monster grunt/pain/death" (OGA) | CC BY 3.0 (V) | Versi del boss | Origine non dichiarata |
| Sonniss GDC bundle | Licenza propria, non CC (V) | — | Non ridistribuibile come effetti; pacchetti enormi: non adatto a un repository pubblico |

Suoni puntuali CC0 (V tramite filtro di licenza): spade Fenodyrie 568790, Qat 107589 · arco calvarychurchatlanta 179996, EminYILDIRIM 536067, plantmonkey 410751 · fuoco TheWoodlandNomad 363092, Spandau 40699 · esplosioni waxsocks 254836 · ghiaccio northern87 369982, karlis.stigis 168712 · mostri Voices_Of_Marz 444444 (voce elaborata) · passi su neve bajko 378056, zerrofs 118417; fango Nox_Sound 548384, Alex_hears_things 376809 · gong Paiste 32" JensZygar 486629 · campane aoristos 329324, Aeonemi 180330 · ambienti: palude chris_dagorne 181364, vento moxobna 47704, lava RTB45 415609 e Breviceps 456806, grotta Andy_Gardner 196713. Gli indirizzi sono `freesound.org/s/<numero>/`.

## Primo lotto: scaricato il 31 ottobre 2026

Approvato dall'utente e integrato nel gioco: 48 file, circa 10,5 MB in `src/assets/audio/`. Crediti in `src/features/audio/audio-credits.ts` e nel pannello Audio; script in `tools/audio/`. Licenze rilette sulle pagine al momento dello scaricamento.

Differenze rispetto alla proposta:

- **Menu:** l'Aria delle *Goldberg* di Kimiko Ishizaka (CC0) al posto del Debussy di Ligoratti. IMSLP fa scaricare quel file solo dopo aver accettato una dichiarazione sul copyright, e accettarla spetta all'utente. Il Debussy resta un'alternativa.
- **Grieg:** scaricato dagli indirizzi diretti del lettore della pagina IMSLP dell'opera. La pagina conferma "Musopen, 2012 · Creative Commons Attribution 3.0" e "Czech National Symphony Orchestra".
- **Kenney:** usato anche per l'arcano (vetro), la natura (fruscio d'erba), gli scoppi (impatti uniti alle registrazioni del materiale), il bottino e il livello (campane).

Il carattere "registrazione vera" è stato ricavato da titoli e descrizioni; **l'ascolto finale spetta all'utente** (vedi la checklist in `docs/roadmap.md`).

## Secondo lotto proposto (da approvare)

| Suono | Candidati | Licenza | Peso |
| --- | --- | --- | --- |
| `cast_dash` (scatto, oggi tono del prototipo) | Fruscio di un bastone di bambù, qubodup (verificare la licenza del singolo suono) | CC0 o CC BY | < 0,1 MB |
| `boss_attack` (annuncio degli attacchi, oggi muto) | Versi di mostri di Michel Baradari (OGA, origine non dichiarata) o Voices_Of_Marz 444444 (voce elaborata) | CC BY 3.0 / CC0 | < 0,5 MB |
| Varianti per boss | Ruggito diverso per ciascun boss, scelto con `tools/cerca-risorse.mjs` | CC0 / CC BY | < 0,5 MB |
| Passi (proposta nuova) | Kenney Impact Sounds, già nel progetto: `footstep_concrete`, `footstep_grass`, `footstep_snow` per cripta, palude e ghiacciaio | CC0 | già scaricati |
| Organo per la cripta (alternativa) | "Pipe Organ Clip", g0ggs (CC0), oppure l'organo del Duomo di Vienna, Breviceps 462340 (CC0) | CC0 | circa 2 MB |

## Grafica e caratteri (per quando la grafica riprenderà)

La revisione di sprite e ritratti è sospesa: queste fonti servono a pianificare, non a sostituire gli asset approvati.

| Nome | Licenza | Uso | Avvertenze |
| --- | --- | --- | --- |
| 0x72 DungeonTileset II | CC0 (V) | Pietra della cripta, eroi, non morti | Niente lava, ghiaccio o palude |
| Puny Characters (Shade, OGA) | CC0 (V) | Riferimento per le 3 classi in 8 direzioni | Le edizioni estese su itch.io hanno un'altra licenza |
| DawnLike (DragonDePlatino) | CC BY 4.0 + citare DawnBringer (V) | Tileset roguelike vasto | Leggere il file di licenza nel pacchetto |
| ArMM1998 "Zelda-like" + Eman Quest (OGA) | CC0 (V) | Lava di caverna, foresta di ghiaccio, foresta morta | Ricolorati Endesga |
| actg "swamp" | CC0, "No generative AI" (V) | Acqua animata, ninfee | Da ricolorare in chiave cupa |
| Kenney Tiny Dungeon, Roguelike Caves & Dungeons | CC0 (V) | Tile 16×16 | — |
| foozlecc Pixel Magic Sprite Effects | CC0, "No generative AI" (V) | Effetti 32×32 (fuoco, esplosione, vento, terra) | — |
| Kyrise 16×16 RPG Icon Pack | CC BY 4.0 (V) | Icone di oggetti | — |
| game-icons.net | CC BY 3.0 (V) | Icone di abilità (vettoriali) | Da pixelare; citare |
| Font: Jacquard 24, Jacquarda Bastarda 9, Grenze Gotisch, Cinzel Decorative, Silkscreen, Pixelify Sans | OFL (V) | Titoli gotici e testi | Servire in locale (`@font-face`), niente CDN |
| Palette Resurrect 64 / Endesga 32 (Lospec) | Nessuna licenza; uso in giochi confermato dall'autrice di Resurrect 64 (V) | Palette unica per i ricolori | — |

Boss grandi top-down CC0 di qualità: nessuno verificato. La via realistica resta la grafica dei boss disegnata nel codice.

## Connettori e API

| Servizio | Accesso | Filtro di licenza | Limiti | Note |
| --- | --- | --- | --- | --- |
| **Openverse** | Anonimo (circa 1 richiesta/s, 20 risultati per pagina) o token gratuito | `license=cc0,by,pdm` | — | Usato da `tools/cerca-risorse.mjs`; indicizza Freesound (circa 592 000 audio), Wikimedia, Jamendo (spesso NC: il filtro le esclude) |
| **Freesound API v2** | Chiave personale per cercare; OAuth2 per gli originali | `license:"Creative Commons 0"` / `"Attribution"` | 60/min, 2000/giorno | Esistono server MCP (johnkimdw/freesound-mcp-server, timjrobinson/freesoundmcpserver), manutenzione non verificata. Serve un account dell'utente: un agente non lo crea |
| Internet Archive | `advancedsearch.php`, senza chiave | `licenseurl:(*publicdomain*)` | — | Licenze dichiarate da chi carica: verificarle |
| Wikimedia Commons | API MediaWiki | Sì | — | Da questo PC `upload.wikimedia.org` è troppo lento |
| OpenGameArt, Musopen, IMSLP, FMA | Nessuna API utile; OGA risponde 403 alle letture automatiche, Musopen ha una verifica anti-bot | — | — | Leggerli con il browser |
