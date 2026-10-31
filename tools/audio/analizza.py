"""Durata, volume (LUFS a finestre) e silenzi dei file audio scaricati, con l'ffmpeg di imageio-ffmpeg.

Uso: python -I analizza.py <file...> [--finestre 10]
"""
import re
import site
import subprocess
import sys

sys.path.append(site.getusersitepackages())
import imageio_ffmpeg  # noqa: E402

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def run(args):
    return subprocess.run([FFMPEG, '-hide_banner', '-nostats', *args], capture_output=True, text=True, encoding='utf-8', errors='replace').stderr


def analyze(path, window):
    info = run(['-i', path])
    duration = re.search(r'Duration: (\d+):(\d+):([\d.]+)', info)
    seconds = int(duration.group(1)) * 3600 + int(duration.group(2)) * 60 + float(duration.group(3)) if duration else 0
    stream = re.search(r'Audio: ([^\n]+)', info)
    loud = run(['-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    integrated = re.search(r'I:\s+(-?[\d.]+) LUFS', loud)
    peak = re.search(r'Peak:\s+(-?[\d.]+) dBFS', loud)
    moments = [(float(t), float(m)) for t, m in re.findall(r't:\s*([\d.]+)\s+TARGET.*?M:\s*(-?[\d.]+)', loud)]
    silences = re.findall(r'silence_(start|end): (-?[\d.]+)', run(['-i', path, '-af', 'silencedetect=n=-45dB:d=0.25', '-f', 'null', '-']))
    print(f'== {path.split(chr(92))[-1].split("/")[-1]}')
    print(f'   durata {seconds:.2f} s · {stream.group(1)[:70] if stream else "?"}')
    print(f'   integrato {integrated.group(1) if integrated else "?"} LUFS · picco {peak.group(1) if peak else "?"} dBFS')
    if seconds > 3 * window:
        row = []
        for start in range(0, int(seconds), window):
            values = [m for t, m in moments if start <= t < start + window and m > -70]
            row.append(f'{start}s:{(sum(values) / len(values)):.0f}' if values else f'{start}s:--')
        print('   volume per finestra:', ' '.join(row))
    if silences:
        print('   silenzi:', ' '.join(f'{kind[0]}{float(value):.2f}' for kind, value in silences[:24]))


if __name__ == '__main__':
    args = sys.argv[1:]
    window = 10
    if '--finestre' in args:
        i = args.index('--finestre')
        window = int(args[i + 1])
        del args[i:i + 2]
    for path in args:
        analyze(path, window)
