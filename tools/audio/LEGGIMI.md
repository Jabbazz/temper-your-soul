# Strumenti audio

Script usati per il primo lotto di registrazioni (31 ottobre 2026), conservati per rifare o estendere il lavoro. Le regole sono in `docs/prompt-di-progetto.md` (sezione 5), la procedura nella skill `.claude/skills/tys-risorse-libere`.

Requisiti: Python 3 e `imageio-ffmpeg` (`pip install --user imageio-ffmpeg`). Si eseguono con `python -I`, su file scaricati in una **cartella temporanea fuori dal progetto**: nel repository finiscono solo i file convertiti in `src/assets/audio/`.

| Script | Cosa fa |
| --- | --- |
| `scarica_freesound.py <cartella>` | Per ogni numero di Freesound dell'elenco legge dalla pagina titolo, autore e licenza, poi scarica l'anteprima `-hq.mp3` (senza account). Scrive `freesound.json` con quanto letto |
| `analizza.py <file...>` | Durata, picco, volume a finestre e silenzi: serve a scegliere i tagli |
| `converti.py <scaricati> <uscita>` | Tagli, anelli con dissolvenza incrociata, unioni di due registrazioni, normalizzazione del picco e conversione in mp3. Stampa in JSON file, fonti e modifiche: le modifiche vanno riportate nei crediti (`src/features/audio/audio-credits.ts`) |

Gli altri file del primo lotto sono stati scaricati a mano con `curl`:

- **Grieg (Musopen, CC BY 3.0):** gli indirizzi diretti stanno nella pagina IMSLP dell'opera (lettore integrato). La pagina `Special:ImagefromIndex` chiede invece di accettare una dichiarazione, che va lasciata all'utente.
- **Bach, Aria delle Goldberg (Kimiko Ishizaka, CC0):** `archive.org/download/The_Open_Goldberg_Variations-11823/Kimiko_Ishizaka_-_01_-_Aria.ogg`.
- **Kenney UI Audio e Impact Sounds (CC0):** dalla pagina del pacchetto si chiede l'indirizzo a `kenney.nl/download-link/<id>`. La licenza è anche nel `License.txt` dentro lo zip.

Formati: effetti mono 96 kbps, ambienti mono 64 kbps, musiche stereo 96 kbps, tutti normalizzati a un picco di -1 dBFS (i volumi relativi li decide il catalogo).
