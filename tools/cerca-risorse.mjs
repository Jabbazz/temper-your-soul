#!/usr/bin/env node
// Cerca risorse con licenza libera tramite l'API pubblica di Openverse (https://api.openverse.org), senza chiave.
// Filtra SOLO le licenze ammesse dal progetto (docs/prompt-di-progetto.md, sezione 5): CC0, pubblico dominio e CC BY.
// Non scarica nulla: stampa titolo, autore, licenza, durata/dimensione e pagina della fonte, da proporre all'utente.
//
// Uso:
//   node tools/cerca-risorse.mjs audio "organ gothic" [--licenza cc0,by,pdm] [--fonte freesound] [--quanti 15] [--json]
//   node tools/cerca-risorse.mjs immagini "dungeon tileset pixel" --licenza cc0
//
// Limiti dell'accesso anonimo: poche richieste al minuto. Freesound ha un'API piu' completa ma richiede una chiave
// personale dell'utente (vedi docs/risorse-libere.md).

const ENDPOINTS = { audio: 'audio', immagini: 'images' };
const ALLOWED_LICENSES = new Set(['cc0', 'pdm', 'by']);

function parseArgs(argv) {
  const [kind, query, ...rest] = argv;
  const options = { licenza: 'cc0,pdm,by', fonte: '', quanti: '15', json: false };
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    if (flag === '--json') options.json = true;
    else if (flag.startsWith('--') && i + 1 < rest.length) options[flag.slice(2)] = rest[++i];
    else throw new Error(`Opzione non riconosciuta: ${flag}`);
  }
  return { kind, query, options };
}

function usage(message) {
  if (message) console.error(`Errore: ${message}\n`);
  console.error('Uso: node tools/cerca-risorse.mjs <audio|immagini> "<parole>" [--licenza cc0,by,pdm] [--fonte <provider>] [--quanti N] [--json]');
  process.exit(2);
}

function describeSize(result) {
  const parts = [];
  if (typeof result.duration === 'number') parts.push(`${(result.duration / 1000).toFixed(1)} s`);
  if (typeof result.filesize === 'number') parts.push(`${Math.round(result.filesize / 1024)} KB`);
  if (typeof result.width === 'number' && typeof result.height === 'number') parts.push(`${result.width}×${result.height}`);
  if (result.filetype) parts.push(result.filetype);
  return parts.join(' · ') || 'dimensione non indicata';
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    usage(error.message);
  }
  const { kind, query, options } = parsed;
  if (!Object.hasOwn(ENDPOINTS, kind)) usage('il tipo deve essere "audio" o "immagini"');
  if (!query) usage('mancano le parole da cercare');
  const licenses = options.licenza.split(',').map((license) => license.trim().toLowerCase()).filter(Boolean);
  const refused = licenses.filter((license) => !ALLOWED_LICENSES.has(license));
  if (refused.length > 0) usage(`licenze non ammesse dal progetto: ${refused.join(', ')} (ammesse: cc0, pdm, by)`);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(options.quanti, 10) || 15));

  const url = new URL(`https://api.openverse.org/v1/${ENDPOINTS[kind]}/`);
  url.searchParams.set('q', query);
  url.searchParams.set('license', licenses.join(','));
  url.searchParams.set('page_size', String(pageSize));
  url.searchParams.set('mature', 'false');
  if (options.fonte) url.searchParams.set('source', options.fonte);

  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'temper-your-soul-asset-search/1.0' } });
  if (!response.ok) {
    console.error(`Openverse ha risposto ${response.status} ${response.statusText}${response.status === 429 ? ' (troppe richieste: riprova fra un minuto)' : ''}`);
    process.exit(1);
  }
  const data = await response.json();
  // Doppio controllo: anche se l'API cambiasse, nessun risultato con licenza non ammessa arriva in uscita.
  const results = (data.results ?? []).filter((result) => ALLOWED_LICENSES.has(String(result.license).toLowerCase()));

  if (options.json) {
    console.log(JSON.stringify(results.map((result) => ({
      title: result.title,
      creator: result.creator,
      license: `${result.license} ${result.license_version ?? ''}`.trim(),
      licenseUrl: result.license_url,
      source: result.source,
      page: result.foreign_landing_url,
      file: result.url,
      size: describeSize(result),
    })), null, 2));
    return;
  }

  console.log(`${results.length} risultati per "${query}" (${kind}, licenze ${licenses.join('/')}; totale stimato ${data.result_count ?? '?'})\n`);
  results.forEach((result, index) => {
    console.log(`${String(index + 1).padStart(2)}. ${result.title || '(senza titolo)'} — ${result.creator || 'autore sconosciuto'}`);
    console.log(`    ${String(result.license).toUpperCase()} ${result.license_version ?? ''} · ${result.source} · ${describeSize(result)}`);
    console.log(`    pagina: ${result.foreign_landing_url}`);
  });
  console.log('\nPrima di scaricare: verificare la licenza sulla pagina e nel file, che sia una registrazione vera (non IA), e chiedere all\'utente.');
}

main().catch((error) => {
  console.error(`Ricerca non riuscita: ${error.message}`);
  process.exit(1);
});
