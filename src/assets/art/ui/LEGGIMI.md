# Interfaccia in ferro, lava e rubini

Grafica dell'interfaccia generata con PixelLab (MCP) il 14 novembre 2026, stile approvato dal proprietario: ferro scuro
ribattuto, bordo di lava incandescente, pochi rubini rossi. La scritta dei pulsanti e i numeri delle barre li mette il gioco.

| File | Misura | Origine | Dove |
| --- | --- | --- | --- |
| `barra-vita-vuota.png`, `barra-vita-piena.png` | 161×38 | modello "riquadro di stato" (`create_ui_asset`), stato "full red" (`create_ui_states`) | HUD di gioco (`forged-hud.css`) |
| `barra-mana-vuota.png`, `barra-mana-piena.png` | 162×39 | stesso modello, stato "full blue" | HUD di gioco |
| `barra-esp-vuota.png`, `barra-esp-piena.png` | 161×19 | stesso modello, stato "full gold" | HUD di gioco, menu principale |
| `cornice-ritratto.png` | 121×127 | incavo del ritratto dello stesso modello, interno svuotato | menu principale (`forged-menu.css`) |
| `pulsante.png`, `pulsante-sopra.png`, `pulsante-premuto.png` | 192×44 | modello "pulsanti" (pulsante medio), stati hover e pressed | menu, accesso, creazione (`forged-buttons.css`) |

| `pannello.png` | 266×246 | modello "contenitori" (`create_ui_asset`), angoli di 32 px | finestre, schermate, impostazioni, comandi del menu (`forged-panels.css`) |
| `card.png` | 170×178 | stesso modello, angoli di 32 px | schede dei dungeon, riquadri della pagina personaggi |
| `targa.png` | 169×58 | stesso modello, angoli 28×24 px | riserva per intestazioni (non ancora usata) |
| `riquadro-icona.png`, `-sopra`, `-premuto` | 48×48 | modello "pulsanti" (pulsante quadrato), stati hover e pressed | comandi in alto a destra (`forged-panels.css`) |

Lavorazione (fuori dal repository): elementi divisi dal modello, ritaglio alla parte disegnata. Per le barre, la piena è
la vuota con i soli pixel del canale (trovati con un riempimento del nero dal centro) presi dallo stato pieno: le due
immagini coincidono fuori dal canale e il gioco mostra la piena tagliata al valore. Pulsanti e barre si allungano in
orizzontale con il 9-slice; le estremità restano intatte.

Canale delle barre (sinistra, alto, destra, basso): vita 8, 9, 8, 9 · mana 10, 9, 10, 10 · esperienza 4, 4, 5, 4.
Finestra del ritratto: 92×94 a 14,16. `src/features/ui/forged-ui.test.ts` controlla misure e coincidenze.
