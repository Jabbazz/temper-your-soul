# Canone grafico

Regole decise dal proprietario il 12 novembre 2026. Fonte unica per persone e agenti AI che producono grafica per **Temper your soul**: sostituisce tutte le direzioni artistiche, i formati e le ricette precedenti. Gli asset già nel gioco restano fino a sostituzione approvata, ma non sono riferimenti per nuove produzioni.

Scrivere o leggere questo documento non avvia generazioni: ogni lotto va richiesto dall'utente.

## Strumento

- **PixelLab, tramite MCP, è lo strumento obbligatorio** per creare o ritoccare sprite, equipaggiamenti, tile, immagini, icone e grafica dell'interfaccia. Niente altri generatori, rendering 3D o pacchetti grafici di terzi come alternativa.
- Se PixelLab non è collegato, avvisare il collaboratore e farlo collegare prima della produzione; nel frattempo si può proseguire solo con il lavoro che non dipende dagli asset.
- Impaginazione DOM/CSS, testi, caricamento, composizione dei livelli e rendering restano codice del gioco. I font approvati si conservano.
- PixelLab è uno strumento di sviluppo: il gioco distribuisce asset locali, senza chiavi né chiamate al servizio nel browser.

## Stile e palette

- Pixel art 2D fantasy medievale, vista dall'alto. Pixel interi, contorni nitidi, campionamento nearest-neighbor.
- Palette del gioco: dark fantasy cupo (carbone, cenere, pietra, ferro, cuoio), con cremisi e rosso fuoco come accenti; gli elementi restano distinguibili fra loro. I valori stanno nel codice: `src/features/presentation/hub-palette.ts` (`HUB_COLORS`, ambiente) e `src/features/presentation/shadow-equipment.ts` (materiali dei pezzi di equipaggiamento).

## Personaggi giocabili

- Guerriero, Arciere e Mago: sprite PixelLab **64×64**, modalità pro, vista `low top-down`.
- **Corpo a mani vuote.** Armi ed equipaggiamento non si disegnano nel corpo.
- **Quattro direzioni:** fronte, dietro, destra, sinistra (`south`, `north`, `east`, `west`), scelte dalla posizione del mouse.
- **Animazioni: solo riposo, camminata e attacco**, semplici e naturali: il Guerriero dà una spadata, il Mago spinge in avanti la punta dello scettro, l'Arciere tende e rilascia la corda con due mani. In più l'«attacco in movimento», usato quando si attacca mentre ci si sposta: le gambe continuano il passo mentre le braccia colpiscono.
- Le animazioni si fanno con `animate_character` in modalità `skeleton-v3` e mosse di libreria: vedi la ricetta sotto.

## Arma ed equipaggiamento

- **Arma primaria:** livello separato dal corpo, impugnato nella mano. In combattimento ruota a 360° attorno al personaggio verso il mouse; nel rifugio e nelle anteprime sta a riposo.
- La mano che impugna è quella delle mosse generate, misurata fotogramma per fotogramma nel manifest: destra per il Guerriero, sinistra per Arciere e Mago.
- **Armatura e stivali** ricolorano il corpo via codice: i pixel prendono la tinta del pezzo indossato conservando la propria luminosità; l'orlo dell'armatura ha il colore della rarità. La sagoma non cambia.
- Le armi e gli altri equipaggiamenti saranno rifatti in una sessione futura, adattandoli a questi corpi. Fino ad allora i disegni attuali degli oggetti restano quelli di `shadow-equipment.ts`.

## Mappe

- Tileset **32×32 seamless** in pixel art, prodotti con PixelLab. Un tile ripetibile deve combaciare sui due assi: controllarlo affiancando più copie prima di integrarlo.
- La misura dei tile non cambia collisioni, unità di mondo o regole.

## Non ancora deciso

Per l'interfaccia il 14 novembre il proprietario ha scelto lo stile di riferimento: ferro scuro ribattuto, bordo di lava incandescente, pochi rubini rossi coerenti fra loro, grandezza naturale (un pixel del disegno = un pixel CSS), testi nel carattere di default messi dal gioco e non da PixelLab; pulsanti e barre si allungano con il 9-slice. Il ritratto del personaggio sta solo nel menu principale dopo l'accesso, non in partita né nella schermata di accesso. Prima applicazione: barre dell'HUD, ritratto del menu, pulsanti di menu e accesso (`src/assets/art/ui/LEGGIMI.md`).

Per nemici, boss, icone, effetti e il resto dell'interfaccia il 12 novembre non sono state fissate regole nuove: restano gli asset esistenti. Prima di produrre un lotto di questo tipo chiedere al proprietario formato, direzioni e animazioni; non riprendere le regole dei canoni precedenti.

## Costi e ambito

- **Non sprecare generazioni.** Niente prove multiple, varianti esplorative, confronti fra candidati o animazioni non richieste: il primo output è quello valido, salvo richiesta dell'utente.
- Prima un personaggio pilota, mostrato all'utente; gli altri solo dopo la sua approvazione.
- Prima di un lotto controllare saldo e costo del tool scelto (`search_help(tool="...")`, gratuito).
- La grafica rappresenta le regole, non le cambia: nessuna modifica a hitbox, danni, gittate, cadenze, slot o salvataggi per adattarli alle immagini.

## Ricetta PixelLab per i personaggi giocabili

### Sprite base

- `create_character` con `mode="pro"`, `size=64`, `view="low top-down"`: 10 generazioni. Produce sempre otto direzioni; il gioco ne usa quattro.
- Corpo a mani vuote.
- Per rifare uno sprite a un'altra dimensione conservandone l'aspetto, passare la vista `south` approvata come `concept_image_url`.

### Animazioni

- Sempre `animate_character` con `mode="skeleton-v3"` e una mossa di libreria in `move`: un solo movimento 3D proiettato su tutte le direzioni, quindi pose coerenti fra fronte, lati e dietro.

| Animazione | Mossa | Fotogrammi |
| --- | --- | --- |
| Riposo | `idle` | 6 |
| Camminata | `walk` | 8 |
| Attacco del Guerriero | `slash` | 8 |
| Attacco dell'Arciere | `shoot_bow` (gesto a due mani) | 8 |
| Attacco del Mago | `cast` (una mano spinta in avanti) | 8 |

- Costo indicativo: 3 generazioni per direzione, quindi 36 per personaggio (tre animazioni in quattro direzioni). L'attacco in movimento costa altre 12 generazioni per personaggio.
- I fotogrammi escono su una tela 80×80, uguale per tutte le animazioni.
- Al massimo 8 lavori contemporanei: lanciare due animazioni alla volta (2 × 4 direzioni) e attendere con `wait_for_jobs`.
- La prima chiamata `skeleton-v3` senza `move` né `poses` è gratuita e restituisce l'elenco delle mosse.

### Attacco in movimento

- Una sola chiamata `skeleton-v3`: `move={"name": "walk"}` più `poses` che sovrascrivono soltanto braccio e busto (`right_hand`, `right_elbow`, `chest`, `lean`) con le pose dell'attacco indicate dalla guida gratuita del personaggio; l'ultimo fotogramma, senza campi, torna al passo. Così le gambe continuano a camminare mentre il braccio colpisce.
- Animazione chiamata `attack_move`, 8 fotogrammi. Descrizioni usate (solo il gesto, mani vuote): Guerriero «walks while swinging empty right arm»; Arciere «walks while pulling right arm back, empty hands» (braccio sinistro teso, destra alla guancia); Mago «walks while extending empty left arm forward» (mani raccolte al petto, poi la sinistra in avanti).

### Integrazione nel gioco

Scaricare l'esportazione a foglio del personaggio (zip «spritesheet»), estrarla nella cartella di lavoro esterna in `warrior/`, `archer/`, `mage/` e lanciare `node tools/arte/prepara-fogli-eroi.mjs <cartella>`: copia i fogli e rigenera il manifest (righe, fotogrammi, mano dell'arma su ogni fotogramma). Il gioco si aspetta in ogni classe i clip `idle`, `walk`, `attack` e `attack_move`.

### Da non fare

- Non animare gli attacchi con la sola descrizione testuale (modalità v3 senza mossa): ogni direzione inventa un gesto diverso e compaiono armi sdoppiate e movimenti casuali delle mani.
- Non usare mosse o animazioni predefinite di pugni e calci (`punch`, `cross-punch` e simili) per simulare un attacco.
- Non scrivere nomi di armi o magie in `action_description` quando lo sprite è a mani vuote: il modello le disegna. Descrivere solo il gesto del corpo. Hanno funzionato «swings empty right arm» (Guerriero), «pulls right arm back, empty hands» con `shoot_bow` (Arciere) ed «extends empty right arm forward» con `cast` (Mago, resta al più qualche pixel di scintilla in un fotogramma). PixelLab non ha un parametro che garantisca le mani vuote e `palette` non impedisce gli oggetti.

### Controllo

Dopo ogni animazione controllare **tutti** i fotogrammi, non uno a campione: `pixelart_workbench` con `join character:<id>:<direzione>:<id del gruppo> ... --as rows` restituisce gratis un foglio con tutte le direzioni.

## Cosa entra nel repository

Valgono le regole «Programmi esterni e file generati» di [AGENTS.md](../AGENTS.md): si genera e si prova nella cartella di lavoro esterna, si mostra all'utente e si integra solo dopo la sua approvazione esplicita.

- **Entrano:** i fogli finali in `src/assets/`, il manifest generato che il gioco legge, il credito in `src/features/presentation/art-credits.ts`, i test e una nota breve di provenienza nel `LEGGIMI.md` della cartella dell'asset (strumento, modalità, mosse, licenza degli output).
- **Non entrano:** prompt completi, candidati, immagini intermedie, anteprime, script che pilotano programmi esterni, chiavi, percorsi personali.
- Dopo l'integrazione: `npm run verify`, controllo nel browser ed elenco di ciò che l'utente deve ancora provare giocando.

Stato attuale: i tre corpi sono in `src/assets/characters/hero-pixellab-64/` ([provenienza](../src/assets/characters/hero-pixellab-64/LEGGIMI.md)); li disegnano `src/features/presentation/pixellab-hero.ts` (fogli, direzioni, mano dell'arma, arma rotante) e `hero-tint.ts` (cambio colore da equipaggiamento).
