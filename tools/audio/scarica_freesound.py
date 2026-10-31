"""Scarica le anteprime hq di Freesound del primo lotto e ne registra titolo, autore, licenza e descrizione.

Uso: python -I scarica_freesound.py <cartella_destinazione>
"""
import html
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

SOUNDS = {
    320530: 'crypt-music',
    465558: 'swamp-music',
    127337: 'forge-music',
    26198: 'victory',
    329324: 'defeat',
    486629: 'boss-rage',
    568790: 'cast-blade',
    179996: 'cast-bow',
    363092: 'cast-fire',
    369982: 'cast-frost',
    196713: 'ambience-crypt',
    181364: 'ambience-swamp',
    456806: 'ambience-forge',
    47704: 'ambience-glacier',
}

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) temper-your-soul-asset-fetch'}


def get(url: str) -> bytes:
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def meta(page: str, prop: str) -> str:
    match = re.search(rf'<meta[^>]+(?:property|name)="{re.escape(prop)}"[^>]+content="([^"]*)"', page)
    return html.unescape(match.group(1)) if match else ''


def main() -> None:
    target = Path(sys.argv[1])
    target.mkdir(parents=True, exist_ok=True)
    report = {}
    for sound_id, name in SOUNDS.items():
        page_url = f'https://freesound.org/s/{sound_id}/'
        page = get(page_url).decode('utf-8', 'replace')
        previews = sorted(set(re.findall(r'https://cdn\.freesound\.org/previews/[^"\'\s]+-hq\.mp3', page)))
        licenses = sorted(set(re.findall(r'https?://creativecommons\.org/(?:licenses|publicdomain)/[a-z\-/.0-9]+', page)))
        description = re.sub(r'<[^>]+>', ' ', html.unescape(meta(page, 'og:description') or meta(page, 'description')))
        entry = {
            'page': page_url,
            'title': meta(page, 'og:title'),
            'audio_meta': meta(page, 'og:audio'),
            'licenses_on_page': licenses,
            'description': ' '.join(description.split())[:400],
            'previews': previews,
        }
        if previews:
            data = get(previews[0])
            path = target / f'{name}-{sound_id}.mp3'
            path.write_bytes(data)
            entry['file'] = path.name
            entry['bytes'] = len(data)
        report[sound_id] = entry
        print(f"{sound_id} {name}: {entry['title']!r} {licenses} {entry.get('bytes', 'NESSUNA ANTEPRIMA')}")
        time.sleep(1.5)
    (target / 'freesound.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')


if __name__ == '__main__':
    main()
