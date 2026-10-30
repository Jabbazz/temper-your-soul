# Temper your soul: design del gioco

Distingue le **decisioni prese** dai **valori provvisori ereditati dal prototipo** e dai **punti aperti**. Nessun valore numerico e' definitivo, salvo dove indicato.

## Decisioni prese

- Il gioco si chiama **Temper your soul**. Repository: https://github.com/Jabbazz/temper-your-soul.
- Gioco **per browser**, in **TypeScript**, senza motore di gioco e senza dipendenze a runtime.
- **Stessi principi di lavoro di Ashen Realm**: piccoli incrementi, simulazione a passo fisso separata dal disegno, dati / comportamento / rappresentazione separati, test accanto al codice, `verify` come comando unico, documentazione con decisioni e punti aperti distinti, nessun valore inventato per cio' che e' ancora aperto.
- Punto di partenza: il prototipo "Emberfall" (arena singola, un mago, un boss). Il primo incremento lo porta in TypeScript senza cambiarne le regole (vedi `docs/roadmap.md`, Fase 0).
- Single-player locale. Nessun backend, account, salvataggio o multiplayer per ora.

## Ereditato dal prototipo (provvisorio, non e' una scelta di design)

Tutto cio' che segue descrive il prototipo cosi' com'e' e serve a verificare il sistema; **non** e' stato deciso come direzione del gioco. Resta modificabile: i valori stanno in tabelle di dati con nome (file indicati).

### Impostazione

- Un **duello in un'arena**: il mago contro il **guardiano della cripta**. Visuale dall'alto, arena da 3200 x 2400 con muro perimetrale, camera centrata sul giocatore (zoom 1,5, nessun limite ai bordi).
- Movimento libero con WASD, mira con il mouse, si puo' lanciare mentre ci si muove. Vittoria: il boss arriva a 0 PV. Sconfitta: il giocatore arriva a 0 PV. Poi "Riprova".
- Grafica: pixel art disegnata dal codice (matrici di caratteri), particelle e ambiente procedurali, audio sintetizzato con Web Audio (spento all'avvio). Nessun asset esterno.
- Ambientazione e testi del prototipo (provvisori): "Dungeon I · La cripta", "Ordine della Brace", "guardiano della cripta".

### Giocatore (`PLAYER_STATS` in `features/player/player.ts`)

| Valore | Prototipo |
| --- | --- |
| Vita | 100 |
| Velocita' | 177 unita'/s (in diagonale non aumenta) |
| Invulnerabilita' dopo un colpo | 0,65 s |
| Posizione iniziale | (1600, 1350), margine dal bordo 40 |

### Skill del mago (`features/skills/mage-skills.ts`)

| Slot | Comando | Skill (id) | Ricarica | Effetto |
| --- | --- | --- | --- | --- |
| 1 | clic sinistro (anche tenuto) | Dardo arcano (`arcane_bolt`) | 0,2 s | proiettile, 19 danni, 440/s, raggio 4, durata 2,5 s |
| 2 | clic destro (anche tenuto) | Globo di gelo (`frost_orb`) | 2,4 s | proiettile, 100 danni, 310/s, raggio 8, durata 2,5 s; rallenta il boss per 2 s |
| 3 | Q | Meteora (`meteor`) | 5 s | zona di raggio 66 nel punto mirato, scoppia dopo 0,65 s, 210 danni al boss |
| 4 | E | Passo astrale (`astral_step`) | 3,5 s | scatto di 125 verso la mira, invulnerabile 0,55 s |

Regole: ogni skill ha la propria ricarica (nessuna ricarica globale); i proiettili partono 7 unita' sopra il centro del giocatore; la meteora e lo scatto restano a 40 dal bordo; il numero del danno mostrato e' il danno del colpo anche se supera gli HP rimasti (come in Ashen Realm).

### Guardiano (`BOSS_STATS` in `features/boss/boss.ts`)

| Valore | Prototipo |
| --- | --- |
| Vita | 1800, due fasi: la furia scatta sotto il 50% (strettamente minore) |
| Movimento | insegue a 100/s (30 con il gelo); entro 180 dal giocatore gli gira attorno a 0,38 x velocita' |
| Primo attacco | dopo 1,8 s; poi ogni 2,15 s (1,65 s in furia), solo a carica e raffiche finite |
| Contatto | sotto 29 di distanza: 18 danni |
| Posizione iniziale | (1600, 1100), margine dal bordo 60 |

Sei attacchi in rotazione (`features/boss/boss-patterns.ts`), a partire dal primo; i valori `rage` valgono in seconda fase:

| # | Attacco | Cosa fa |
| --- | --- | --- |
| 1 | Nova di brace | 16 proiettili in tutte le direzioni (12 danni, 105/s, raggio 5), ruotati con il tempo di partita; in furia due anelli (il secondo a 145/s, sfasato di 0,12 rad) |
| 2 | Raffica | 7 proiettili a ventaglio di 0,15 rad verso il giocatore (15 danni, raggio 6), 165/s (205/s in furia) |
| 3 | Frattura | 3 zone (5 in furia), raggio 42, scoppio dopo 1,15 s, 24 danni: la prima sul giocatore, le altre a caso entro +-225 x +-175 |
| 4 | Carica | preparazione 0,95 s con il percorso segnalato a terra, poi scatto in 0,48 s verso il punto fissato; 25 danni se tocca il giocatore (sotto 37) |
| 5 | Spirale del vuoto | 16 raffiche (22 in furia) ogni 0,085 s, ciascuna ruotata di 0,29 rad e da 3 proiettili a 120 gradi (10 danni, raggio 4, 125/s; 155/s in furia) |
| 6 | Triplice ventaglio | 3 ventagli da 5 proiettili (14 danni, raggio 5, 185/s) a 0,5 / 0,88 / 1,26 s, ruotati di 0,25 rad |

### Collisioni (`features/combat/collision.ts`)

Raggio di colpo del giocatore 9 e del boss 26 per i proiettili; le zone usano un margine di 8 sul giocatore e di 25 sul boss. L'incoerenza (9 contro 8, 26 contro 25) e' del prototipo ed e' un punto aperto.

## Differenze volute rispetto al prototipo

Il porting conserva regole e valori; queste sono le sole differenze di comportamento, tutte da confermare a mano:

- **Passo fisso a 60 Hz** invece del tempo variabile: ricariche, scatti e durate sono quantizzati sul passo (un'azione puo' differire di meno di un fotogramma).
- **Tasti legati alla posizione fisica** (`KeyboardEvent.code`): WASD, Q, E, R, M, F funzionano anche con layout diversi (AZERTY, ecc.).
- **Scossa dello schermo applicata**: nel prototipo il valore veniva calcolato (danno, scoppi, furia, carica) ma non veniva mai disegnato; ora la camera trema leggermente (fino a +-3 unita' di vista per 0,25 s circa). Solo aspetto.
- **Gli effetti continuano a muoversi alla fine della partita** (l'esplosione della vittoria non resta congelata dietro la schermata).
- **Traslazione di camera arrotondata al pixel**: la pixel art resta nitida in movimento.
- Un proiettile del giocatore e' riconosciuto per i suoi dati (`slowSeconds`, `visual`), non per il raggio.
- Le zone dopo lo scoppio non restano "vive" 0,65 s: il bagliore residuo e' solo un effetto.
- L'HUD si aggiorna solo quando un valore cambia; il CSS e' stato riscritto in un livello solo (stesso risultato finale).
- **Scorciatoie del browser con Ctrl/Meta/Alt non intercettate** (Ctrl+R ricarica la pagina, Ctrl+F apre la ricerca); i tasti del gioco senza modificatori funzionano come prima.
- Una pressione piu' breve di un passo di simulazione (un tocco rapido su Q/E/clic) non si perde: viene registrata e lanciata nel passo successivo.

## Punti aperti

- **Direzione del gioco**: che cosa significa "temprare l'anima" nel gioco? (progressione, build, rischio/ricompensa, struttura a run o a incontri, tono). Finche' non e' deciso, il prototipo resta un duello singolo.
- Ambientazione e lore: tenere "Ordine della Brace", "cripta", "guardiano" e il nome del prototipo "Emberfall" o cambiarli.
- Quanti boss e quali; se esistono nemici comuni, stanze, un percorso o un hub.
- Personaggio: un solo mago o piu' classi/archetipi; se le abilita' diventano equipaggiamento o una scelta prima dell'incontro.
- Progressione, ricompense, morte (cosa si perde o si conserva), salvataggio.
- Tutti i valori numerici (velocita', danni, vita, ricariche, durate): da tarare con la prova manuale.
- Unificare i raggi di collisione (vedi sopra) e decidere se i colpi possono perforare, rimbalzare o essere bloccati.
- Direzione artistica (pixel art o altro, palette, risoluzione interna e zoom) e audio definitivi.
- Controlli: rimappatura dei tasti, controller, touch/mobile.
- Camera: limiti ai bordi dell'arena, smorzamento, interpolazione del disegno tra i passi di simulazione (su schermi a piu' di 60 Hz il movimento puo' sembrare leggermente a scatti).
- Piattaforme e pubblicazione (hosting statico), eventuale classifica o tempi record.
