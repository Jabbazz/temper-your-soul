"""Taglia, unisce e converte le registrazioni scaricate nei file del gioco (mp3), registrando cosa e' stato fatto.

Uso: python -I converti.py <cartella_scaricati> <cartella_uscita>
Stampa in JSON, per ogni file prodotto: percorso, fonti, modifiche e durata.
"""
import array
import json
import re
import site
import subprocess
import sys
from pathlib import Path

sys.path.append(site.getusersitepackages())
import imageio_ffmpeg  # noqa: E402

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])
REPORT = []

# Formati: effetti e interfaccia mono 96 kbps, ambienti mono 64 kbps, musica stereo 96 kbps.
FORMATS = {
    'effetti': ['-ac', '1', '-ar', '44100', '-b:a', '96k'],
    'interfaccia': ['-ac', '1', '-ar', '44100', '-b:a', '96k'],
    'ambiente': ['-ac', '1', '-ar', '44100', '-b:a', '64k'],
    'musica': ['-ac', '2', '-ar', '44100', '-b:a', '96k'],
}
# Picco di arrivo: i volumi relativi li decide poi il catalogo del gioco.
TARGET_PEAK = -1.0


def ffmpeg(args, capture=False):
    result = subprocess.run([FFMPEG, '-hide_banner', '-nostats', '-y', *args], capture_output=True, text=True,
                            encoding='utf-8', errors='replace')
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-2000:])
    return result.stderr if capture else None


def max_volume(path):
    text = ffmpeg(['-i', str(path), '-af', 'volumedetect', '-f', 'null', '-'], capture=True)
    match = re.search(r'max_volume: (-?[\d.]+) dB', text)
    return float(match.group(1)) if match else 0.0


def duration(path):
    text = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path)], capture_output=True, text=True,
                          encoding='utf-8', errors='replace').stderr
    h, m, s = re.search(r'Duration: (\d+):(\d+):([\d.]+)', text).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def decode(path, rate=11025):
    raw = subprocess.run([FFMPEG, '-hide_banner', '-i', str(path), '-ac', '1', '-ar', str(rate), '-f', 's16le', '-'],
                         capture_output=True).stdout
    samples = array.array('h')
    samples.frombytes(raw[: len(raw) // 2 * 2])
    return samples, rate


def onsets(path, count, min_gap=0.6, start=0.0, end=None, frame=0.02):
    """Gli attacchi piu' forti (inizio del colpo), separati di almeno `min_gap` secondi."""
    samples, rate = decode(path)
    size = int(rate * frame)
    rms = []
    for i in range(0, len(samples) - size, size):
        chunk = samples[i:i + size]
        rms.append((sum(v * v for v in chunk) / size) ** 0.5)
    first = int(start / frame)
    # Un attacco troppo vicino alla fine non lascerebbe spazio al suono: si cerca solo fino a 1,5 s dalla fine.
    last = len(rms) - int(1.5 / frame) if end is None else min(len(rms), int(end / frame))
    candidates = sorted(((rms[i], i) for i in range(max(first, 1), last - 1)
                         if rms[i] >= rms[i - 1] and rms[i] >= rms[i + 1]), reverse=True)
    chosen = []
    for value, i in candidates:
        if all(abs(i - j) * frame >= min_gap for j in chosen):
            chosen.append(i)
        if len(chosen) == count:
            break
    times = []
    for i in sorted(chosen):
        j = i
        while j > 0 and rms[j - 1] > rms[i] * 0.25 and (i - j) * frame < 0.12:
            j -= 1
        times.append(round(max(0.0, j * frame - 0.01), 3))
    return times


def finish(tmp, out_path, kind, sources, changes):
    gain = TARGET_PEAK - max_volume(tmp)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg(['-i', str(tmp), '-af', f'volume={gain:.2f}dB', *FORMATS[kind], str(out_path)])
    tmp.unlink()
    REPORT.append({'file': str(out_path.relative_to(OUT)).replace('\\', '/'), 'sources': sources, 'changes': changes,
                   'seconds': round(duration(out_path), 2), 'bytes': out_path.stat().st_size})


def cut(src, out, kind, start, length, fade_in=0.005, fade_out=0.1, sources=(), note=''):
    tmp = OUT / '_tmp.wav'
    # Il tratto non puo' superare la fine del file (i clic dell'interfaccia durano meno di 0,3 s).
    length = min(length, duration(SRC / src) - start - 0.01)
    fade_out = min(fade_out, length / 2)
    ffmpeg(['-ss', f'{start}', '-t', f'{length}', '-i', str(SRC / src),
            '-af', f'afade=t=in:d={fade_in},afade=t=out:st={max(0, length - fade_out)}:d={fade_out},apad=whole_dur=0.15',
            str(tmp)])
    finish(tmp, OUT / out, kind, list(sources), note or f'tratto {start:.2f}–{start + length:.2f} s, dissolvenze, volume normalizzato')


def loop(src, out, kind, start, length, cross, sources=(), note=''):
    """Anello senza scatti: gli ultimi `cross` secondi sfumano nell'inizio del tratto."""
    tmp = OUT / '_tmp.wav'
    # Corpo = [start + cross, start + length + cross]; testa = [start, start + cross]. La fine del corpo sfuma nella testa,
    # cosi' quando il file ricomincia (dal corpo) la musica prosegue senza salti.
    ffmpeg(['-ss', f'{start + cross}', '-t', f'{length}', '-i', str(SRC / src),
            '-ss', f'{start}', '-t', f'{cross}', '-i', str(SRC / src),
            '-filter_complex', f'[0:a][1:a]acrossfade=d={cross}:c1=tri:c2=tri[out]', '-map', '[out]', str(tmp)])
    finish(tmp, OUT / out, kind, list(sources),
           note or f'tratto {start:.1f}–{start + length + cross:.1f} s chiuso ad anello con dissolvenza incrociata di {cross} s, volume normalizzato')


def mix(parts, out, kind, length, fade_out, sources, note):
    """Sovrappone piu' tratti (file, inizio, durata, ritardo, guadagno in dB)."""
    tmp = OUT / '_tmp.wav'
    args, labels, graph = [], [], []
    for index, (src, start, dur, delay, gain) in enumerate(parts):
        args += ['-ss', f'{start}', '-t', f'{dur}', '-i', str(SRC / src)]
        ms = int(delay * 1000)
        graph.append(f'[{index}:a]aformat=channel_layouts=mono,adelay={ms}|{ms},volume={gain}dB[p{index}]')
        labels.append(f'[p{index}]')
    graph.append(f'{"".join(labels)}amix=inputs={len(parts)}:normalize=0,atrim=0:{length},'
                 f'afade=t=out:st={max(0, length - fade_out)}:d={fade_out}[out]')
    ffmpeg([*args, '-filter_complex', ';'.join(graph), '-map', '[out]', str(tmp)])
    finish(tmp, OUT / out, kind, list(sources), note)


def kenney(pack, name):
    return f'kenney-{pack}/Audio/{name}.ogg'


def main():
    # --- Musica ---------------------------------------------------------------------------------------------
    cut('menu-music-goldberg-aria.ogg', 'musica/menu-bach-aria-goldberg.mp3', 'musica', 1.6, 146.5, 1.0, 5.0,
        ['archive-goldberg-aria'], 'prima meta\' dell\'Aria (1,6–148,1 s), dissolvenze, ricodifica a 96 kbps')
    loop('crypt-music-320530.mp3', 'musica/cripta-canto-gregoriano.mp3', 'musica', 20.0, 120.0, 3.0, ['fs-320530'])
    loop('swamp-music-465558.mp3', 'musica/palude-violoncello.mp3', 'musica', 0.8, 63.0, 3.0, ['fs-465558'])
    loop('forge-music-127337.mp3', 'musica/fucina-taiko.mp3', 'musica', 0.0, 64.0, 2.0, ['fs-127337'])
    cut('glacier-music-246988.mp3', 'musica/ghiacciaio-grieg-morte-di-ase.mp3', 'musica', 1.0, 271.0, 1.0, 6.0,
        ['imslp-246988'], 'brano intero senza i silenzi ai bordi (1,0–272,0 s), dissolvenze, ricodifica a 96 kbps')
    loop('rage-music-246990.mp3', 'musica/furia-grieg-re-della-montagna.mp3', 'musica', 96.0, 47.0, 3.0,
         ['imslp-246990'])

    # --- Ambienti -------------------------------------------------------------------------------------------
    loop('ambience-crypt-196713.mp3', 'ambiente/cripta-grotta.mp3', 'ambiente', 20.0, 75.0, 3.0, ['fs-196713'])
    loop('ambience-swamp-181364.mp3', 'ambiente/palude-notte.mp3', 'ambiente', 340.0, 75.0, 3.0, ['fs-181364'])
    loop('ambience-forge-456806.mp3', 'ambiente/fucina-fango-ribollente.mp3', 'ambiente', 0.3, 10.0, 2.0, ['fs-456806'])
    loop('ambience-glacier-47704.mp3', 'ambiente/ghiacciaio-vento.mp3', 'ambiente', 15.0, 75.0, 3.0, ['fs-47704'])

    # --- Esiti e boss ---------------------------------------------------------------------------------------
    cut('victory-26198.mp3', 'interfaccia/vittoria-fanfara.mp3', 'interfaccia', 0.0, 4.6, 0.005, 0.4, ['fs-26198'])
    cut('defeat-329324.mp3', 'interfaccia/sconfitta-campana.mp3', 'interfaccia', 0.0, 10.0, 0.005, 3.5, ['fs-329324'])
    cut('boss-rage-486629.mp3', 'effetti/furia-gong.mp3', 'effetti', 0.0, 8.0, 0.005, 3.0, ['fs-486629'])

    # --- Lanci per materiale --------------------------------------------------------------------------------
    for n, t in enumerate(onsets(SRC / 'cast-blade-568790.mp3', 3, min_gap=1.0, end=40), 1):
        cut('cast-blade-568790.mp3', f'effetti/lama-{n}.mp3', 'effetti', t, 0.5, 0.003, 0.15, ['fs-568790'],
            f'singolo scontro di lame a {t:.2f} s (0,5 s), volume normalizzato, mono')
    cut('cast-bow-179996.mp3', 'effetti/arco-1.mp3', 'effetti', 0.0, 0.42, 0.003, 0.12, ['fs-179996'],
        'solo il rilascio della freccia (0–0,42 s), senza l\'impatto, volume normalizzato, mono')
    for n, t in enumerate(onsets(SRC / 'cast-fire-363092.mp3', 3, min_gap=2.0), 1):
        cut('cast-fire-363092.mp3', f'effetti/fuoco-{n}.mp3', 'effetti', t, 0.7, 0.01, 0.3, ['fs-363092'],
            f'scoppiettio a {t:.2f} s (0,7 s), volume normalizzato, mono')
    ice = onsets(SRC / 'cast-frost-369982.mp3', 4, min_gap=1.5)
    for n, t in enumerate(ice[:3], 1):
        cut('cast-frost-369982.mp3', f'effetti/ghiaccio-{n}.mp3', 'effetti', t, 0.55, 0.003, 0.2, ['fs-369982'],
            f'crepa nel ghiaccio a {t:.2f} s (0,55 s), volume normalizzato, mono')
    cut('cast-frost-369982.mp3', 'effetti/teletrasporto-ghiaccio.mp3', 'effetti', ice[3], 0.9, 0.003, 0.4, ['fs-369982'],
        f'crepa nel ghiaccio a {ice[3]:.2f} s (0,9 s), volume normalizzato, mono')
    for n, name in enumerate(['impactGlass_light_000', 'impactGlass_light_002', 'impactGlass_light_004'], 1):
        cut(kenney('impact-sounds', name), f'effetti/arcano-{n}.mp3', 'effetti', 0.0, 0.6, 0.002, 0.2,
            ['kenney-impact-sounds'], f'{name}.ogg, volume normalizzato, mono')
    for n, name in enumerate(['footstep_grass_000', 'footstep_grass_002', 'footstep_grass_004'], 1):
        cut(kenney('impact-sounds', name), f'effetti/natura-{n}.mp3', 'effetti', 0.0, 0.5, 0.002, 0.15,
            ['kenney-impact-sounds'], f'{name}.ogg (fruscio d\'erba), volume normalizzato, mono')

    # --- Scoppi delle zone (unione di due registrazioni) ---------------------------------------------------
    fire = onsets(SRC / 'cast-fire-363092.mp3', 1, start=5.0)[0]
    mix([(kenney('impact-sounds', 'impactMining_002'), 0, 1.2, 0, 0), ('cast-fire-363092.mp3', fire, 1.2, 0.03, -4)],
        'effetti/scoppio-fuoco.mp3', 'effetti', 1.1, 0.5, ['kenney-impact-sounds', 'fs-363092'],
        f'unione di impactMining_002.ogg e dello scoppiettio a {fire:.2f} s di "Fire Crackle and Flames 002", mono')
    mix([(kenney('impact-sounds', 'impactGlass_heavy_000'), 0, 1.0, 0, -2), ('cast-frost-369982.mp3', ice[0], 0.8, 0.02, 0)],
        'effetti/scoppio-ghiaccio.mp3', 'effetti', 0.95, 0.4, ['kenney-impact-sounds', 'fs-369982'],
        f'unione di impactGlass_heavy_000.ogg e della crepa a {ice[0]:.2f} s di "Ice cracking", mono')
    mix([(kenney('impact-sounds', 'impactSoft_heavy_001'), 0, 0.8, 0, 0), ('ambience-forge-456806.mp3', 2.0, 1.0, 0.05, -3)],
        'effetti/scoppio-palude.mp3', 'effetti', 1.0, 0.45, ['kenney-impact-sounds', 'fs-456806'],
        'unione di impactSoft_heavy_001.ogg e di 1 s di "Hot Bubbling Mud" (da 2,0 s), mono')
    mix([(kenney('impact-sounds', 'impactBell_heavy_004'), 0, 1.4, 0, -6), (kenney('impact-sounds', 'impactGlass_medium_001'), 0, 0.8, 0, 0)],
        'effetti/scoppio-arcano.mp3', 'effetti', 1.2, 0.6, ['kenney-impact-sounds'],
        'unione di impactBell_heavy_004.ogg (piu\' basso) e impactGlass_medium_001.ogg, mono')

    # --- Colpi, boss e interfaccia (Kenney) -----------------------------------------------------------------
    simple = [
        ('impactSoft_medium_000', 'effetti/impatto-1.mp3', 0.4), ('impactSoft_medium_002', 'effetti/impatto-2.mp3', 0.4),
        ('impactPunch_medium_000', 'effetti/colpo-boss-1.mp3', 0.5), ('impactPunch_medium_003', 'effetti/colpo-boss-2.mp3', 0.5),
        ('impactPunch_heavy_001', 'effetti/colpo-subito-1.mp3', 0.7), ('impactPunch_heavy_003', 'effetti/colpo-subito-2.mp3', 0.7),
        ('impactMining_000', 'effetti/schianto-1.mp3', 1.0), ('impactMining_003', 'effetti/schianto-2.mp3', 1.0),
        ('impactBell_heavy_000', 'interfaccia/bottino-campana.mp3', 2.5), ('impactBell_heavy_002', 'interfaccia/livello-campana.mp3', 2.5),
    ]
    for name, out, length in simple:
        cut(kenney('impact-sounds', name), out, 'interfaccia' if out.startswith('interfaccia') else 'effetti',
            0.0, length, 0.002, min(0.3, length / 3), ['kenney-impact-sounds'], f'{name}.ogg, volume normalizzato, mono')
    mix([(kenney('impact-sounds', 'impactMining_004'), 0, 1.5, 0, 0), (kenney('impact-sounds', 'impactPlate_heavy_000'), 0, 1.5, 0.12, -2),
         ('boss-rage-486629.mp3', 0.0, 3.0, 0.2, -10)],
        'effetti/boss-sconfitto.mp3', 'effetti', 2.8, 1.5, ['kenney-impact-sounds', 'fs-486629'],
        'unione di impactMining_004.ogg, impactPlate_heavy_000.ogg e dell\'attacco del gong Paiste (molto basso), mono')
    for name, out in [('click1', 'interfaccia/clic-1.mp3'), ('click2', 'interfaccia/clic-2.mp3'), ('switch2', 'interfaccia/interruttore.mp3')]:
        cut(kenney('ui-audio', name), out, 'interfaccia', 0.0, 0.3, 0.001, 0.08, ['kenney-ui-audio'],
            f'{name}.ogg, volume normalizzato, mono')

    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps(REPORT, indent=1, ensure_ascii=False))


if __name__ == '__main__':
    main()
