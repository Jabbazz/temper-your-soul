# Grafica del mondo aperto · PixelLab

Terreni, mura e ostacoli delle prime due fasce (Bosco Verde, Brughiera delle Nebbie), generati con PixelLab MCP il 12 novembre 2026. Licenza: output PixelLab. File usati senza ritocchi.

- **Tileset di raccordo** (`<inferiore>-<superiore>.png`, tile 32×32): `create_topdown_tileset`, modalità `pro`, vista `low top-down`, `detail` basso, ombreggiatura piatta, `roundness` 1, `transition_size` 0. Sedici tile per foglio, scelti dai quattro angoli. I terreni condivisi (erba, sterrato, acqua, brughiera) sono concatenati con `lower_base_tile_id` / `upper_base_tile_id`, così il tile pieno è identico in tutti i fogli.
- **Mura** (`grass-wall.png`, `moor-wall.png`): stesso strumento con `transition_size` 1 (parete alta, 25 tile): sommità di lastre grigie e facciata di mattoni, con tratti orizzontali, verticali, angoli e incroci.
- **Ostacoli** (`oak`, `bush`, `boulder`, `dead_tree`, `moor_rock`): `create_map_object`, vista `low top-down`, `detail` basso, sfondo trasparente; tele da 32×32 a 64×96.
- **Dati:** `src/features/presentation/world/world-art-data.ts` è generato da `node tools/arte/prepara-mondo.mjs <cartella esterna con i file scaricati>`, che copia qui i PNG e ricava ritagli, schemi dei tile e appoggio degli ostacoli dai metadati PixelLab. Non modificarlo a mano.

Limite noto: il terreno pieno è un solo tile ripetuto, senza varianti.
