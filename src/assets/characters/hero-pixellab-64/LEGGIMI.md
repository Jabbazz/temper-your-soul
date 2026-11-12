# Corpi dei personaggi giocabili · PixelLab 64×64

Guerriero, Arciere e Mago a mani vuote, generati con PixelLab MCP il 12 novembre 2026. Licenza: output PixelLab.

- **Sprite base:** `create_character`, modalità `pro`, 64×64, vista `low top-down`; l'aspetto parte da una prima versione 32×32 passata come immagine di concetto. Il gioco usa quattro direzioni (south, east, north, west).
- **Animazioni:** `animate_character`, modalità `skeleton-v3`, con una mossa di libreria per clip, così ogni direzione proietta lo stesso movimento: `idle` (6 fotogrammi), `walk` (8), attacco `slash` per il Guerriero, `shoot_bow` per l'Arciere, `cast` per il Mago (8). La descrizione dell'azione nomina solo il gesto del corpo, senza armi né magie.
- **Fogli:** `warrior.png`, `archer.png`, `mage.png` sono l'esportazione a foglio di PixelLab, celle 80×80, non ritoccata. La riga 0 contiene le otto rotazioni a riposo, non usate dal gioco.
- **`manifest.json`:** generato dal file di layout esportato insieme al foglio (riga e numero di fotogrammi per clip e direzione, appoggio dei piedi misurato sui fotogrammi) e dalla misura, fotogramma per fotogramma, della mano che impugna l'arma (`hands`, in pixel nella cella): la destra per il Guerriero, la sinistra per Arciere e Mago, come nelle mosse generate. La mano è riconosciuta dai pixel color pelle; dove è nascosta vale la posizione di riposo o l'interpolazione fra i fotogrammi vicini. Non modificare a mano.

Armi ed equipaggiamento non sono disegnati in questi corpi: saranno livelli separati.
