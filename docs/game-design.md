# Temper your soul: design del gioco

Distingue le **decisioni prese** dai **valori provvisori** e dai **punti aperti**. Nessun valore numerico è definitivo, salvo dove indicato.

## Decisioni prese

- Il gioco si chiama **Temper your soul**. Repository: https://github.com/Jabbazz/temper-your-soul.
- Gioco **per browser**, in **TypeScript**, senza motore di gioco e senza dipendenze a runtime. Single-player locale.
- **Stessi principi di lavoro di Ashen Realm**: piccoli incrementi, simulazione a passo fisso separata dal disegno, dati / comportamento / rappresentazione separati, test accanto al codice, `verify` come comando unico, documentazione con decisioni e punti aperti distinti, nessun valore inventato per ciò che è ancora aperto.
- **Menu iniziale** con scelta del **dungeon**: la cripta del prototipo più altri **3 dungeon**, ognuno con una **mappa** diversa (dimensioni, tema grafico, ostacoli) e un **boss unico** con schemi di attacco propri.
- **Il personaggio si salva in locale** (nel browser, `localStorage`): inventario, equipaggiamento e record dei dungeon. Nessun backend né cloud per ora.
- **I boss lasciano oggetti** alla vittoria, con **rarità diverse**.
- **Gli oggetti conferiscono le abilità** (come in Ashen Realm): ogni oggetto sta in uno slot; la **famiglia** dell'oggetto determina la skill di quello slot, la **rarità** ne migliora i valori mantenendone l'identità. Ogni boss ha famiglie **esclusive** con abilità uniche che le altre non hanno.
- Quattro slot di equipaggiamento, uno per skill: **mano primaria** (skill 1, clic sinistro tenuto), **mano secondaria** (skill 2, clic destro), **armatura** (skill 3, Q), **stivali** (skill 4, E). Uno slot può restare vuoto (nessuna skill).

## Struttura del gioco (come funziona oggi)

Menu → Dungeon (scegli uno dei 4) → partita contro il boss → vittoria: bottino e record, oppure sconfitta: si riprova. Dal menu si apre anche l'**Equipaggiamento** (equipaggiare, rimuovere, scartare). Tutti i dungeon sono sempre selezionabili. Alla sconfitta non si perde nulla (regola provvisoria, vedi punti aperti).

## Provvisorio (non è una scelta di design)

Tutti i valori sono provvisori e modificabili: stanno in tabelle di dati con nome (file indicati).

### Impostazione e giocatore

- Visuale dall'alto, camera centrata sul giocatore (zoom 1,5, nessun limite ai bordi). Movimento con WASD, mira con il mouse, si può lanciare mentre ci si muove. Vittoria: il boss arriva a 0 PV. Sconfitta: il giocatore arriva a 0 PV.
- Grafica: pixel art disegnata dal codice (matrici di caratteri), particelle e ambiente procedurali, audio sintetizzato con Web Audio (spento all'avvio). Nessun asset esterno.
- **Giocatore** (`PLAYER_STATS`): vita 100, velocità 177/s (in diagonale non aumenta), 0,65 s di invulnerabilità dopo un colpo. Raggio di colpo 9, corpo contro i pilastri 10 (`combat/collision.ts`).
- Ambientazione e testi del prototipo ("Ordine della Brace", "cripta", "guardiano") sono provvisori.

### Dungeon, mappe e boss

| Dungeon (id) | Pericolo | Mappa | Boss (id) | Vita | Carattere |
| --- | --- | --- | --- | --- | --- |
| La cripta (`crypt`) | 1 | 3200 x 2400, nessun ostacolo | Guardiano della cripta (`guardian`) | 1800 | quello del prototipo: raffiche, nova, frattura, carica, spirale, ventaglio |
| La palude spenta (`swamp`) | 2 | 2800 x 2800, 8 alberi morti, nebbia e funghi luminosi | Madre delle spore (`spore_mother`) | 2400 | lento e ingombrante, controlla lo spazio: nuvole di spore, cerchi di zone con centro sicuro, tentacoli, anelli che si chiudono, pioggia di spore, balzo tossico |
| La fucina in rovina (`forge`) | 3 | 3600 x 2200, 8 pilastri di ferro, lava | Colosso della fornace (`forge_colossus`) | 3000 | enorme (raggio di colpo 40), colpi pesanti e zone molto grandi: martellata con anello di schegge, file di lava con varco, raffiche, croce, spirale a due bracci, carica |
| Il ghiacciaio eterno (`glacier`) | 4 | 3000 x 3000, 7 colonne di cristallo, neve | Custode del ghiaccio (`frost_warden`) | 3600 | agile ed evasivo (velocità 165, quasi come il giocatore): ventagli di schegge, punte di ghiaccio, teletrasporto, bufera a spirali opposte, nova doppia, carica con zone sul percorso |

I valori di ogni boss (`BossStats`: vita, velocità, raggio di colpo, danno da contatto e carica, intervalli) e di ogni schema (`ByPhase`: normale / furia) stanno in `features/boss/guardian.ts` e `features/dungeons/<id>/`. Regole comuni: seconda fase (furia) sotto il 50% di vita; un boss lancia i propri schemi in rotazione e non ne inizia uno nuovo finché carica e azioni programmate non sono finite; il boss **ignora i pilastri** (vola) e può teletrasportarsi (Custode).

- **Pilastri**: bloccano il movimento del giocatore (che scivola lungo la superficie) e **assorbono i proiettili di entrambe le squadre**, quindi sono ripari. Non fermano le zone a terra.
- Vincoli verificati dai test per ogni dungeon: mappa 2000-4000 di lato, partenze libere, nessuna fessura più stretta del corpo del giocatore, danno per colpo <= 30 (proiettili) / 40 (zone) / 30 (contatto) / 40 (carica), zone con avviso >= 0,5 s, almeno 3 schemi esclusivi per boss.

### Skill base del mago (`features/skills/mage-skills.ts`)

La dotazione iniziale (oggetti Comuni di base): corrisponde esattamente alle skill del prototipo.

| Slot | Skill (id) | Ricarica | Effetto |
| --- | --- | --- | --- |
| 1 | Dardo arcano (`arcane_bolt`) | 0,2 s | proiettile, 19 danni, 440/s, raggio 4 |
| 2 | Globo di gelo (`frost_orb`) | 2,4 s | proiettile, 100 danni, 310/s, raggio 8; rallenta il boss 2 s |
| 3 | Meteora (`meteor`) | 5 s | zona di raggio 66 sul mirino, scoppia dopo 0,65 s, 210 danni |
| 4 | Passo astrale (`astral_step`) | 3,5 s | scatto di 125 verso la mira, invulnerabile 0,55 s |

Tipi di effetto disponibili (`SkillEffect`): **proiettile** (anche a ventaglio con `count` e `spread`), **zona a terra** (sul mirino o attorno al lanciatore, con rallentamento opzionale), **scatto** e **colpo ravvicinato ad arco**. Ogni skill ha ricarica propria (nessuna ricarica globale).

### Oggetti, rarità e bottino

**Famiglie** (17, `features/items/item-families.ts`; valori in `item-skills.ts`). Le generiche possono cadere da qualunque boss; le esclusive solo dal boss indicato.

| Slot | Generiche | Esclusive (boss) |
| --- | --- | --- |
| Mano primaria | Bastone arcano (dardo, base), Arco del cacciatore (freccia veloce 14 danni, 0,16 s), Scettro tempestoso (sfera lenta 23 danni, 0,4 s) | Lama del guardiano (cripta): colpo ravvicinato ad ampio arco, 55 danni, portata 95 · Martello della fornace (fucina): zona piccola e devastante sul mirino, 160 danni · Lancia di ghiaccio (ghiacciaio): scheggia veloce 70 danni che rallenta |
| Mano secondaria | Grimorio del gelo (globo, base), Talismano degli spiriti (3 fuochi fatui a ventaglio, 42 danni ciascuno) | Ventaglio di spore (palude): 5 semi a ventaglio, 38 danni ciascuno |
| Armatura | Mantello della meteora (base), Egida di brace (esplosione attorno a te, raggio 110, 130 danni) | Sudario della cripta (cripta): grande esplosione attorno a te che rallenta 2,5 s · Corazza della fornace (fucina): enorme zona ritardata sul mirino, 360 danni · Velo di bufera (ghiacciaio): esplosione attorno a te che rallenta 3 s |
| Stivali | Stivali astrali (base), Stivali del vento (scatto 200, invulnerabile 0,3 s, ricarica 2,4 s) | Stivali del pantano (palude): scatto corto con invulnerabilità lunga (0,8 s) |

**Rarità** (`items/rarity.ts`): Comune, Non comune, Raro, Epico, Leggendario. La rarità moltiplica il danno (1 / 1,12 / 1,25 / 1,4 / 1,6) e la ricarica (x 1 / 0,95 / 0,9 / 0,85 / 0,8); distanza e invulnerabilità dello scatto crescono della metà dell'aumento di potenza. A rarità Comune la skill è identica a quella base. Nessuna skill generica supera il doppio del riferimento comune del suo slot nemmeno a rarità Leggendaria.

**Bottino** (`loot/loot-tables.ts`): a ogni vittoria 1 oggetto garantito più un secondo con probabilità 0,5. Per ogni oggetto: con probabilità 0,35 pesca tra le famiglie **esclusive** del boss, altrimenti tra le generiche; poi la rarità per pesi che crescono col pericolo del dungeon:

| Dungeon | Comune | Non comune | Raro | Epico | Leggendario |
| --- | --- | --- | --- | --- | --- |
| Cripta | 55 | 28 | 12 | 4 | 1 |
| Palude | 40 | 30 | 18 | 9 | 3 |
| Fucina | 30 | 30 | 22 | 13 | 5 |
| Ghiacciaio | 20 | 28 | 27 | 17 | 8 |

**Salvataggio** (`features/character/`): chiave `temper-your-soul:save` in `localStorage`, versione 1. Si salva a ogni vittoria e a ogni modifica dell'equipaggiamento (prima di mostrare il bottino). Dati illeggibili, manomessi o di una versione più recente non vengono sovrascritti in silenzio: il testo originale si copia in `temper-your-soul:save:corrupt` e si riparte da un personaggio iniziale. Oggetti non validi si scartano, l'equipaggiamento incoerente si svuota. Se il browser non permette di salvare il gioco funziona in memoria e avvisa.

## Differenze volute rispetto al prototipo originale

Il porting della Fase 0 conservava regole e valori; restano queste differenze (tutte da confermare a mano):

- Passo fisso a 60 Hz; tasti legati alla posizione fisica (`KeyboardEvent.code`); scossa dello schermo applicata; effetti che proseguono dopo la fine; traslazione di camera arrotondata; tocchi brevissimi non persi; scorciatoie del browser con Ctrl/Meta/Alt non intercettate.
- Un proiettile è riconosciuto per i suoi dati (`slowSeconds`, `visual`), non per il raggio; le zone dopo lo scoppio non restano "vive" (il bagliore è un effetto).

## Punti aperti

- **Direzione del gioco**: che cosa significa "temprare l'anima" (progressione, build, rischio/ricompensa, struttura a run o a incontri, tono). Oggi il ciclo è: dungeon → boss → oggetti → build.
- **Morte**: oggi non si perde nulla. Ashen Realm perde livello, equipaggiamento e chiavi: da decidere se e cosa perdere.
- **Progressione**: livelli ed esperienza, tier T1-T15 come in Ashen Realm (qui la potenza viene dalla rarità), sblocco dei dungeon (oggi sono tutti disponibili), difficoltà scalabile.
- **Altri slot**: anello e collana come modificatori delle skill, ali sulla velocità, pantaloni, peso dell'armatura (come in Ashen Realm). Oggi gli slot sono 4, uno per skill.
- **Oggetti**: capienza dell'inventario (oggi illimitata), vendita o riforgiatura, confronto tra oggetti, modificatori casuali, oggetti identici duplicati, eventuali oggetti unici con nome proprio.
- **Salvataggio**: cloud o più profili, esportazione/importazione del salvataggio, cosa fare con due schede aperte contemporaneamente (oggi l'ultima che salva vince), cancellazione dei progressi dal gioco.
- Tutti i valori numerici (vita, danni, velocità, ricariche, pesi del bottino, scalatura delle rarità), da tarare con la prova manuale; equilibrio tra le famiglie e tra i dungeon.
- Ambientazione e lore: nomi dei dungeon e dei boss, "Ordine della Brace", "Emberfall".
- Raggi di collisione (oggi incoerenti di 1 tra proiettili e zone), perforazione e rimbalzo dei proiettili, pilastri distruttibili o che fermano anche le zone.
- Camera: limiti ai bordi, smorzamento, interpolazione del disegno (su schermi a più di 60 Hz il movimento può sembrare lievemente a scatti).
- Direzione artistica e audio definitivi; controlli (rimappatura, controller, touch/mobile); piattaforme e pubblicazione.
