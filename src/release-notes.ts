import { version } from '../package.json';

export interface BalanceChange {
  readonly label: string;
  readonly before: number;
  readonly after: number;
  readonly unit: string;
}

export interface ReleaseNotes {
  readonly version: string;
  readonly date: string;
  readonly changes: readonly string[];
  readonly balanceChanges: readonly BalanceChange[];
}

/** Prima voce = aggiornamento corrente; conservare le precedenti per lo storico. Vedere docs/versioning.md. */
const CLASS_ROLES_PREVIEW: ReleaseNotes = {
    version: "0.2.3", date: "2026-11-01",
    changes: [
      "Changelog completo consultabile per versione e data, con le feature e i bilanciamenti precedenti conservati.",
      "Prima taratura dei ruoli: profili e bonus equipaggiamento separati per Guerriero, Mago e Arciere. Valori provvisori, da provare giocando.",
      "Ogni slot concede bonus di classe, moltiplicati per la rarità x1/1,2/1,5/2/3; il livello oggetto continua a influire solo sul GS. Esempio: corazza Guerriero Comune +12 difesa, Leggendaria +36.",
      "Difesa a rendimenti decrescenti: danno ricevuto moltiplicato per 100/(100+difesa). Report ed eventi contano gli HP effettivamente persi.",
      "Frequenza primaria: cooldown diviso per 1+bonus. Potenza abilità: danno moltiplicato per 1+bonus. Gli oggetti mostrano i nuovi bonus nei dettagli.",
      "Attacchi primari del Guerriero e dell’Arciere gratuiti; il Mago continua a spendere mana per tutti i lanci.",
      "Statistiche conservate fra stanze e nella replica visuale. Protocollo 7: riavviare server e ricaricare client; salvataggi invariati.",
      "Oggetti del Guerriero rifatti: primaria a fendente con taunt in raggio e cancellazione dei proiettili ordinari; Scudo degli spiriti con parata singola anche contro il colpo rosso; armature con difesa e rigenerazione; stivali con corsa e urto, fermata dai pilastri.",
      "Mago: staffe con proc elementale al 15%, secondarie elementali, meteora e marea con canalizzazione rallentata, buff della terra e teletrasporto con esplosione immediata. Fuoco brucia, acqua rallenta, terra blocca il movimento ordinario, vento aumenta il danno ricevuto.",
      "Arciere: frecce gratuite che marchiano e penetrano il 35% dello scudo numerico; Faretra del predatore con frequenza e furto vita; armatura che evoca un lupo per 20 s; due cariche di scatto fisico.",
      "Lupo: segue il proprietario, attacca il marchio, salta al prossimo nemico vicino dopo una uccisione. Ogni morso ha il 20% di sanguinamento; il danno periodico dipende da boss, luogotenente o servitore. La rarità scala il danno del morso.",
      "Boss e luogotenenti: colpo speciale rosso da 100 danni base, preparato per 1,1 s, ogni 12 s dopo il primo a 10 s. Supera l’invulnerabilità ordinaria e i fendenti, si evita spostandosi o con la parata dello scudo.",
      "Nuove icone della barra per tutte le abilità di classe; icona oggetto dello scudo e nomi Scudo/Faretra novizi. Effetti persistenti per buff, parata, channeling, marchio, pet e debuff. Nessuna rigenerazione di ritratti o sprite dei personaggi.",
      "Protocollo cooperativo 7: pet, stati, buff, preparazione del colpo speciale e cariche replicati dal server; nessun cambio ai salvataggi o agli id delle famiglie. Anche gli oggetti già posseduti ricevono le nuove abilità.",
    ],
    balanceChanges: [
      {"label": "Guerriero · Vita innata", "before": 100, "after": 150, "unit": "HP"},
      {"label": "Guerriero · Difesa innata", "before": 0, "after": 15, "unit": "punti"},
      {"label": "Guerriero · Mana innato", "before": 100, "after": 60, "unit": "MP"},
      {"label": "Guerriero · Recupero innato", "before": 8, "after": 5, "unit": "MP/s"},
      {"label": "Guerriero · Movimento innato", "before": 177, "after": 170, "unit": "u/s"},
      {"label": "Mago · Vita innata", "before": 100, "after": 90, "unit": "HP"},
      {"label": "Mago · Mana innato", "before": 100, "after": 150, "unit": "MP"},
      {"label": "Mago · Recupero innato", "before": 8, "after": 10, "unit": "MP/s"},
      {"label": "Arciere · Vita innata", "before": 100, "after": 110, "unit": "HP"},
      {"label": "Arciere · Difesa innata", "before": 0, "after": 5, "unit": "punti"},
      {"label": "Arciere · Mana innato", "before": 100, "after": 80, "unit": "MP"},
      {"label": "Arciere · Recupero innato", "before": 8, "after": 6, "unit": "MP/s"},
      {"label": "Arciere · Movimento innato", "before": 177, "after": 195, "unit": "u/s"},
      {"label": "Arciere · Bonus frequenza primaria innato", "before": 0, "after": 10, "unit": "%"},
      {"label": "Guerriero · set Comune livello 1 · Vita", "before": 100, "after": 200, "unit": "HP"},
      {"label": "Guerriero · set Comune livello 1 · Difesa", "before": 0, "after": 40, "unit": "punti"},
      {"label": "Guerriero · set Comune livello 1 · Mana", "before": 100, "after": 60, "unit": "MP"},
      {"label": "Guerriero · set Comune livello 1 · Movimento", "before": 177, "after": 173, "unit": "u/s"},
      {"label": "Mago · set Comune livello 1 · Vita", "before": 100, "after": 95, "unit": "HP"},
      {"label": "Mago · set Comune livello 1 · Difesa", "before": 0, "after": 2, "unit": "punti"},
      {"label": "Mago · set Comune livello 1 · Mana", "before": 100, "after": 200, "unit": "MP"},
      {"label": "Mago · set Comune livello 1 · Movimento", "before": 177, "after": 179, "unit": "u/s"},
      {"label": "Mago · set Comune livello 1 · Bonus danno abilità", "before": 0, "after": 7, "unit": "%"},
      {"label": "Arciere · set Comune livello 1 · Vita", "before": 100, "after": 120, "unit": "HP"},
      {"label": "Arciere · set Comune livello 1 · Difesa", "before": 0, "after": 10, "unit": "punti"},
      {"label": "Arciere · set Comune livello 1 · Mana", "before": 100, "after": 80, "unit": "MP"},
      {"label": "Arciere · set Comune livello 1 · Movimento", "before": 177, "after": 212, "unit": "u/s"},
      {"label": "Arciere · set Comune livello 1 · Bonus frequenza primaria", "before": 0, "after": 20, "unit": "%"},
      {"label": "Lama del guardiano · primaria Comune livello 1", "before": 3, "after": 0, "unit": "MP/lancio"},
      {"label": "Martello della fornace · primaria Comune livello 1", "before": 12, "after": 0, "unit": "MP/lancio"},
      {"label": "Lancia di ghiaccio · primaria Comune livello 1", "before": 8, "after": 0, "unit": "MP/lancio"},
      {"label": "Arco del cacciatore · primaria Comune livello 1", "before": 1, "after": 0, "unit": "MP/lancio"},
      {"label": "Arco di rovi · primaria Comune livello 1", "before": 3, "after": 0, "unit": "MP/lancio"},
      {"label": "Arco del cacciatore · set Comune livello 1 · ricarica primaria", "before": 0.16, "after": 0.13333333333333333, "unit": "s"},
      {"label": "Dardo arcano · set Comune livello 1 · danno effettivo", "before": 19, "after": 20.33, "unit": "HP"},
      {"label": "Mago · set Comune livello 1 · rigenerazione totale", "before": 9.6, "after": 15.1, "unit": "MP/s"},
      {"label": "Guerriero · set Comune livello 1 · rigenerazione totale", "before": 9.5, "after": 6.7, "unit": "MP/s"},
      {"label": "Arciere · set Comune livello 1 · rigenerazione totale", "before": 9.6, "after": 8, "unit": "MP/s"},
      {"label": "Stivali del sepolcro · Comune livello 1 · ricarica", "before": 4.2, "after": 4, "unit": "s"},
      {"label": "Stivali del sepolcro · Comune livello 1 · costo", "before": 18, "after": 10, "unit": "MP"},
      {"label": "Stivali del sepolcro · Comune livello 1 · distanza", "before": 110, "after": 150, "unit": "unità"},
      {"label": "Stivali del sepolcro · Comune livello 1 · invulnerabilità", "before": 0.85, "after": 0.15, "unit": "s"},
      {"label": "Arco di rovi · Comune livello 1 · costo", "before": 3, "after": 0, "unit": "MP"},
      {"label": "Mantello delle canne · Comune livello 1 · danno diretto / morso", "before": 145, "after": 22, "unit": "HP"},
      {"label": "Mantello delle canne · Comune livello 1 · ricarica", "before": 6.2, "after": 24, "unit": "s"},
      {"label": "Mantello delle canne · Comune livello 1 · costo", "before": 24, "after": 25, "unit": "MP"},
      {"label": "Calzari della fornace · Comune livello 1 · ricarica", "before": 4.8, "after": 4, "unit": "s"},
      {"label": "Calzari della fornace · Comune livello 1 · costo", "before": 19, "after": 10, "unit": "MP"},
      {"label": "Calzari della fornace · Comune livello 1 · distanza", "before": 230, "after": 210, "unit": "unità"},
      {"label": "Calzari della fornace · Comune livello 1 · invulnerabilità", "before": 0.25, "after": 0.15, "unit": "s"},
      {"label": "Scudo degli spiriti · Comune livello 1 · danno diretto / morso", "before": 42, "after": 0, "unit": "HP"},
      {"label": "Scudo degli spiriti · Comune livello 1 · ricarica", "before": 2, "after": 8, "unit": "s"},
      {"label": "Scudo degli spiriti · Comune livello 1 · costo", "before": 18, "after": 12, "unit": "MP"},
      {"label": "Egida di brace · Comune livello 1 · danno diretto / morso", "before": 130, "after": 0, "unit": "HP"},
      {"label": "Egida di brace · Comune livello 1 · ricarica", "before": 4.5, "after": 12, "unit": "s"},
      {"label": "Egida di brace · Comune livello 1 · costo", "before": 22, "after": 20, "unit": "MP"},
      {"label": "Stivali del vento · Comune livello 1 · ricarica", "before": 2.4, "after": 3, "unit": "s"},
      {"label": "Stivali del vento · Comune livello 1 · costo", "before": 10, "after": 0, "unit": "MP"},
      {"label": "Stivali del vento · Comune livello 1 · distanza", "before": 200, "after": 170, "unit": "unità"},
      {"label": "Stivali del vento · Comune livello 1 · invulnerabilità", "before": 0.3, "after": 0.22, "unit": "s"},
      {"label": "Lama del guardiano · Comune livello 1 · danno diretto / morso", "before": 55, "after": 36, "unit": "HP"},
      {"label": "Lama del guardiano · Comune livello 1 · ricarica", "before": 0.7, "after": 0.45, "unit": "s"},
      {"label": "Lama del guardiano · Comune livello 1 · costo", "before": 3, "after": 0, "unit": "MP"},
      {"label": "Sudario della cripta · Comune livello 1 · danno diretto / morso", "before": 170, "after": 0, "unit": "HP"},
      {"label": "Sudario della cripta · Comune livello 1 · ricarica", "before": 9, "after": 12, "unit": "s"},
      {"label": "Sudario della cripta · Comune livello 1 · costo", "before": 28, "after": 25, "unit": "MP"},
      {"label": "Faretra del predatore · Comune livello 1 · danno diretto / morso", "before": 38, "after": 0, "unit": "HP"},
      {"label": "Faretra del predatore · Comune livello 1 · ricarica", "before": 2.6, "after": 10, "unit": "s"},
      {"label": "Faretra del predatore · Comune livello 1 · costo", "before": 20, "after": 18, "unit": "MP"},
      {"label": "Stivali del pantano · Comune livello 1 · ricarica", "before": 4.5, "after": 4, "unit": "s"},
      {"label": "Stivali del pantano · Comune livello 1 · costo", "before": 18, "after": 10, "unit": "MP"},
      {"label": "Stivali del pantano · Comune livello 1 · distanza", "before": 90, "after": 170, "unit": "unità"},
      {"label": "Stivali del pantano · Comune livello 1 · invulnerabilità", "before": 0.8, "after": 0.15, "unit": "s"},
      {"label": "Martello della fornace · Comune livello 1 · danno diretto / morso", "before": 160, "after": 60, "unit": "HP"},
      {"label": "Martello della fornace · Comune livello 1 · ricarica", "before": 1.4, "after": 0.75, "unit": "s"},
      {"label": "Martello della fornace · Comune livello 1 · costo", "before": 12, "after": 0, "unit": "MP"},
      {"label": "Corazza della fornace · Comune livello 1 · danno diretto / morso", "before": 360, "after": 0, "unit": "HP"},
      {"label": "Corazza della fornace · Comune livello 1 · ricarica", "before": 7, "after": 15, "unit": "s"},
      {"label": "Corazza della fornace · Comune livello 1 · costo", "before": 30, "after": 25, "unit": "MP"},
      {"label": "Lancia di ghiaccio · Comune livello 1 · danno diretto / morso", "before": 70, "after": 42, "unit": "HP"},
      {"label": "Lancia di ghiaccio · Comune livello 1 · ricarica", "before": 1.1, "after": 0.55, "unit": "s"},
      {"label": "Lancia di ghiaccio · Comune livello 1 · costo", "before": 8, "after": 0, "unit": "MP"},
      {"label": "Proc elementale primaria Mago", "before": 0, "after": 15, "unit": "%"},
      {"label": "Sanguinamento per morso", "before": 0, "after": 20, "unit": "%"},
      {"label": "Sanguinamento boss", "before": 0, "after": 0.15, "unit": "% HP massimi/s"},
      {"label": "Sanguinamento luogotenente", "before": 0, "after": 0.3, "unit": "% HP massimi/s"},
      {"label": "Sanguinamento servitore", "before": 0, "after": 2.5, "unit": "% HP massimi/s"},
      {"label": "Penetrazione scudo delle frecce", "before": 0, "after": 35, "unit": "%"},
      {"label": "Esposizione al vento: bonus danno subito", "before": 0, "after": 20, "unit": "%"},
      {"label": "Meteora Comune: channeling", "before": 0, "after": 0.7, "unit": "s"},
      {"label": "Marea Comune: channeling", "before": 0, "after": 0.5, "unit": "s"},
      {"label": "Movimento durante il channeling", "before": 100, "after": 35, "unit": "%"},
      {"label": "Blink Comune: danno esplosione", "before": 0, "after": 65, "unit": "HP"},
      {"label": "Parata Comune: assorbimento del prossimo colpo", "before": 0, "after": 100, "unit": "%"},
      {"label": "Secondo fiato Comune: difesa aggiuntiva", "before": 0, "after": 40, "unit": "punti"},
      {"label": "Secondo fiato Comune: rigenerazione", "before": 0, "after": 5, "unit": "HP/s"},
      {"label": "Fortezza vivente Comune: difesa aggiuntiva", "before": 0, "after": 65, "unit": "punti"},
      {"label": "Fortezza vivente Comune: rigenerazione", "before": 0, "after": 7, "unit": "HP/s"},
      {"label": "Istinto predatorio Comune: frequenza primaria", "before": 0, "after": 35, "unit": "%"},
      {"label": "Istinto predatorio Comune: furto vita", "before": 0, "after": 15, "unit": "%"},
      {"label": "Patto della terra Comune: difesa aggiuntiva", "before": 0, "after": 20, "unit": "punti"},
      {"label": "Patto della terra Comune: danno abilità", "before": 0, "after": 25, "unit": "%"},
      {"label": "Stivali del vento: cariche", "before": 1, "after": 2, "unit": "cariche"},
    ],
  };

export const RELEASES: readonly ReleaseNotes[] = [
  { ...CLASS_ROLES_PREVIEW, version: '0.3.0', date: '2026-11-01' },
  CLASS_ROLES_PREVIEW,
  {
    version: '0.2.2', date: '2026-11-01',
    changes: [
      'Ritratti di Guerriero e Mago: i pantaloni ricadono sugli stivali, con il fronte dello stivale sopra; interno e bordo posteriore non si vedono più.',
      'Dita davanti alle armi e palmo coperto dall\'arma, su tutte le classi.',
      'Manto della meteora, egida di brace e corazza della fornace: fodere e stendardi laterali passano dietro le gambe. Sudario e velo restano interi davanti.',
      'Sprite di combattimento femminili ridisegnati: sagoma propria, viso più fine, coda alta che segue il passo e fascia sul braccio, nello stesso stile di quelli maschili.',
    ],
    balanceChanges: [],
  },
  {
    version: '0.2.1', date: '2026-11-01',
    changes: [
      'Ritratti dell\'arciere: il mantello delle canne si divide in cappa dietro il corpo e due lembi sul petto, così tunica, cintura e braccia restano visibili.',
      'Stivali del vento sotto i pantaloni, con piume e fronte del gambale sopra: interno e bordo posteriore non si vedono più.',
      'Arco del cacciatore: corda dietro il corpo, impugnatura più sottile e palmo dietro il legno, con le dita davanti.',
      'Sprite di combattimento: meno lembi del mantello delle canne sul busto. Nessuna nuova immagine generata.',
    ],
    balanceChanges: [],
  },
  {
    version: '0.2.0', date: '2026-11-01',
    changes: [
      'Versione del gioco visibile in basso al centro e testo introduttivo del menu aggiornato.',
      'Changelog consultabile in basso a sinistra, solo nel menu.',
      'Versioning per branch: ultimo numero incrementato a ogni commit del feature; numero centrale incrementato e ultimo azzerato al merge in main. Note con valori prima e dopo per il bilanciamento.',
    ],
    balanceChanges: [],
  },
  {
    version: '0.1.0', date: '2026-11-01',
    changes: [
      'Aggiunto il piano per la futura revisione di ritratti e sprite (PR #6). La revisione grafica resta sospesa.',
    ],
    balanceChanges: [],
  },
];

/** La versione del pacchetto è l’unica fonte del numero mostrato nel gioco. */
export const GAME_VERSION = version;
export const CURRENT_RELEASE = RELEASES[0]!;
export function formatVersion(value: string): string {
  return `v${value.split('.').map((part, index) => index === 0 ? part : part.padStart(2, '0')).join('.')}`;
}
export const GAME_VERSION_LABEL = formatVersion(version);

export function describeBalanceChange(change: BalanceChange): string {
  return `${change.label}: ${change.before} → ${change.after}${change.unit ? ` ${change.unit}` : ''}`;
}
