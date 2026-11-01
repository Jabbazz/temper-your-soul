/*
 * Il bestiario: per ogni servitore e luogotenente, lo schema del boss che insegna e un'iscrizione del reliquiario.
 * Solo testo. Una pagina si apre con la prima uccisione.
 */

export interface LoreEntry {
  /** Ruolo, in breve (folla, minaccia, pesante...). */
  readonly role: string;
  /** Lo schema del boss che porta in piccolo (o la regola che insegna). */
  readonly teaches: string;
  readonly text: string;
}

export const MINION_LORE: Readonly<Record<string, LoreEntry>> = {
  cinder_wisp: { role: 'Kamikaze', teaches: 'Tenere la distanza', text: 'Briciole della brace del Guardiano: cercano un corpo da scaldare e si spengono addosso a lui.' },
  wax_candle: { role: 'Torretta', teaches: 'NOVA DI BRACE', text: 'I ceri della veglia non si sono mai spenti. Piangono cera rovente su chi disturba il sonno dei morti.' },
  belfry_bat: { role: 'Folla volante', teaches: 'I ripari non bastano', text: 'Dal campanile scendono a stormi quando la campana tace.' },
  ossuary_skeleton: { role: 'Folla', teaches: 'Usare le zone', text: 'Le ossa dell\'Ordine si ricompongono, a meno che il fuoco non le disperda.' },
  gargoyle: { role: 'Dormiente', teaches: 'CARICA', text: 'Sembra pietra sul piedistallo. Lo è, finché non passi.' },
  censer_acolyte: { role: 'Tiratore', teaches: 'TRIPLICE VENTAGLIO', text: 'L\'incenso dell\'accolito brucia ancora: tre braci per ogni oscillazione.' },
  vesper_bell: { role: 'Pesante', teaches: 'SPIRALE DEL VUOTO', text: 'Il vespro suona una volta per ogni anima che manca. Ogni rintocco lascia un varco diverso.' },
  bone_reliquary: { role: 'Nido', teaches: 'Le priorità', text: 'Dentro, le reliquie dei fratelli caduti ardono e non smettono di uscire.' },
  sporeling: { role: 'Folla', teaches: 'Non farsi chiudere', text: 'Figli della Madre: crescono dove il passo dei vivi si ferma.' },
  puffball: { role: 'Kamikaze', teaches: 'NUVOLA DI SPORE', text: 'Una vescia gonfia aspetta solo di essere toccata. La nube non distingue amici e nemici.' },
  bog_gnat: { role: 'Folla volante', teaches: 'I ripari non bastano', text: 'Nugoli che ronzano sopra l\'acqua nera, attirati dal calore.' },
  bog_toad: { role: 'Saltatore', teaches: 'SLANCIO TOSSICO', text: 'Il rospo guarda dove atterrerà. Il cerchio a terra è la sua promessa.' },
  spitting_flower: { role: 'Artiglieria', teaches: 'PIOGGIA DI SPORE', text: 'Un fiore che non ha mai visto il sole sputa veleno verso chi ne porta la luce.' },
  root_worm: { role: 'Scavatore', teaches: 'FRUSTA DI RADICI', text: 'Sotto il fango si muove una radice con la bocca. Quando emerge, frusta.' },
  moss_snail: { role: 'Pesante', teaches: 'ANELLO DI MELMA', text: 'Lento come la palude, lascia una scia che ti trattiene.' },
  fairy_ring: { role: 'Nido', teaches: 'ACCERCHIAMENTO', text: 'Chi entra nel cerchio delle fate non ne esce: il cerchio si stringe.' },
  slag_imp: { role: 'Kamikaze', teaches: 'Tenere la distanza', text: 'Scorie che hanno imparato a correre. E a scoppiare.' },
  forge_spark: { role: 'Folla volante', teaches: 'I ripari non bastano', text: 'Scintille sfuggite al maglio, che non vogliono spegnersi.' },
  slag_pebble: { role: 'Folla', teaches: 'Non farsi chiudere', text: 'Sassi di scoria che rotolano in branco verso il calore.' },
  living_bellows: { role: 'Torretta', teaches: 'SBARRAMENTO DI BRACI', text: 'Il mantice respira da solo. Ogni respiro è un cono di scintille.' },
  forge_devil: { role: 'Tiratore', teaches: 'CROCE DELLA FUCINA', text: 'Il garzone del Colosso: tiene la distanza e tira dardi a croce.' },
  anvil_golem: { role: 'Pesante', teaches: 'MARTELLATA', text: 'Un\'incudine che ha preso vita a forza di colpi. Da vicino batte a terra.' },
  molten_slag: { role: 'Scissione', teaches: 'Le aree e il gelo', text: 'Metallo fuso che si divide in gocce. Il gelo lo fredda.' },
  molten_droplet: { role: 'Folla', teaches: 'Le aree', text: 'Una goccia della colata, ancora affamata.' },
  crucible: { role: 'Pesante', teaches: 'LINEE DI FUSIONE', text: 'Il crogiolo rovescia la lava di traverso. C\'è sempre un varco.' },
  frost_sentinel: { role: 'Torretta', teaches: 'LANCE DI GHIACCIO', text: 'Le sentinelle del Custode non dormono e non si muovono.' },
  razor_flake: { role: 'Folla volante', teaches: 'I ripari non bastano', text: 'Fiocchi di neve affilati come lame, che girano nel vento.' },
  snow_wolf: { role: 'Branco', teaches: 'Guardarsi le spalle', text: 'Cacciano in branco: girano attorno, poi uno di loro si lancia.' },
  frost_apprentice: { role: 'Tiratore', teaches: 'SALTO GELIDO e SCHEGGE', text: 'Gli allievi del Custode hanno imparato la prima lezione: non farsi raggiungere.' },
  blizzard_spirit: { role: 'Orbitante', teaches: 'BUFERA', text: 'Uno spirito del vento che gira attorno alla sua preda.' },
  living_ice: { role: 'Pesante', teaches: 'NOVA GELIDA', text: 'Un blocco di ghiaccio con una faccia. Quando si rompe, le schegge volano ovunque.' },
  echo_crystal: { role: 'Sostegno', teaches: 'Le priorità', text: 'Il cristallo ripete il canto del Custode e copre i suoi di ghiaccio.' },
  ice_ram: { role: 'Caricatore', teaches: 'CARICA GLACIALE', text: 'L\'ariete scivola sul ghiaccio e lascia una scia che morde.' },
};

export const LIEUTENANT_LORE: Readonly<Record<string, LoreEntry>> = {
  belfry_gargoyle: { role: 'Luogotenente', teaches: 'CARICA e RAFFICA', text: 'Il più antico dei doccioni veglia sul campanile e scende solo per chi arriva fin lì.' },
  toad_king: { role: 'Luogotenente', teaches: 'SLANCIO TOSSICO e PIOGGIA DI SPORE', text: 'La corona d\'oro gli è cresciuta addosso, come tutto in questa palude.' },
  anvil_master: { role: 'Luogotenente', teaches: 'MARTELLATA e CARICA DI FERRO', text: 'Forgiava per il Colosso. Ora forgia contro chiunque scenda.' },
  first_apprentice: { role: 'Luogotenente', teaches: 'SALTO GELIDO e NOVA GELIDA', text: 'La prima allieva del Custode ha imparato tutto, tranne la pietà.' },
};
