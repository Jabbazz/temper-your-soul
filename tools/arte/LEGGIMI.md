# Strumenti per la grafica

Script usati per il primo lotto grafico (1 novembre 2026), conservati per rifare o estendere il lavoro. Regole e fonti in `docs/risorse-libere.md`, procedura nella skill `.claude/skills/tys-risorse-libere`.

Requisiti: Python 3 e Pillow (`pip install --user pillow`). Si esegue con `python -I`, su file scaricati in una **cartella temporanea fuori dal progetto**: nel repository finiscono solo i fogli preparati in `src/assets/art/boss/` e la loro geometria.

| Script | Cosa fa |
| --- | --- |
| `prepara_boss.py <scaricati> <radice_progetto>` | Per ogni boss ritaglia le animazioni scelte, le ricolora con la tavolozza del gioco (calma e furia), aggiunge il contorno dove manca e scrive un PNG a celle uguali, una riga per animazione. Scrive poi `src/features/presentation/boss-art/boss-sheet-layout.ts` (cella, punto dei piedi, righe e fotogrammi): quel file non va modificato a mano |

La cartella dei file scaricati deve contenere gli archivi estratti con i nomi originali:

- `statue-spritesheet-alt-no-green.png` (Animated Statue, Calciumtrice, OpenGameArt);
- `mon4/mon4_sprite_base.png` (da `mon4.zip`, Demon Flower Monster, Rosswet Mobile, OpenGameArt);
- `enemy_galore/Golem/...` (da `enemy_galore_i.zip`, Enemy Galore I, Admurin, OpenGameArt);
- `evil-wizard-2/EVil Wizard 2/Sprites/...` (da `EVil Wizard 2.zip`, LuizMelo, itch.io; il pacchetto contiene `License.txt` con CC0).

Per cambiare colori, animazioni o boss si modificano le tabelle `PALETTES` e `BOSSES` in cima allo script e lo si rilancia; scala, verso della figura e velocita' si regolano invece in `boss-sheets.ts`. I crediti stanno in `src/features/presentation/art-credits.ts` e si vedono nel gioco (pannello Audio, «Crediti»).
