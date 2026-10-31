"""Prepara i fogli di sprite dei boss dalla pixel art scaricata (primo lotto grafico, 1 novembre 2026).

Uso: python -I prepara_boss.py <cartella_scaricati> <radice_progetto>

Per ogni boss ritaglia le animazioni scelte, le ricolora con la tavolozza del gioco (calma e furia), aggiunge il
contorno dove manca e le mette in un unico PNG a celle uguali, una riga per animazione:
`src/assets/art/boss/<id>.png`. Scrive poi la geometria dei fogli (cella, punto dei piedi, righe e fotogrammi) in
`src/features/presentation/boss-art/boss-sheet-layout.ts`, che non va modificato a mano.

Requisiti: Python 3 e Pillow. I file scaricati restano in una cartella temporanea fuori dal progetto (vedi LEGGIMI.md).
"""
import colorsys
import sys
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
SRC = Path(sys.argv[1])
ROOT = Path(sys.argv[2])
OUT_PNG = ROOT / 'src' / 'assets' / 'art' / 'boss'
OUT_TS = ROOT / 'src' / 'features' / 'presentation' / 'boss-art' / 'boss-sheet-layout.ts'

GOLEM = SRC / 'enemy_galore' / 'Golem'
WIZARD = SRC / 'evil-wizard-2' / 'EVil Wizard 2' / 'Sprites'


def hexrgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def luminance(rgb):
    r, g, b = rgb
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255


# --- Tavolozze ------------------------------------------------------------------------------------------------------
# Ogni gruppo di colori del sorgente (scelto da `match` su tinta, saturazione e luminosita') diventa una rampa del
# gioco: il colore piu' scuro del gruppo va al primo gradino, il piu' chiaro all'ultimo, gli altri in mezzo per
# luminosita' (interpolati). Le tinte vengono da boss-fx.ts e dalle vecchie tavolozze dei boss.

def any_color(h, s, v):
    return True


def is_grey(h, s, v):
    return s < 0.2


def is_green(h, s, v):
    return s >= 0.2 and 0.2 < h < 0.5


def is_gold(h, s, v):
    return s > 0.5 and 0.04 < h < 0.15


def is_red_eye(h, s, v):
    return s > 0.7 and v > 0.8 and (h < 0.03 or h > 0.97)


def is_flame(h, s, v):
    return s >= 0.35 and (h > 0.74 or h < 0.04)


PALETTES = {
    'guardian': {
        # Pietra fredda della cripta; in furia la pietra si arroventa dalle luci verso l'interno.
        'calm': [(any_color, ['#2b2e3b', '#424656', '#5d6172', '#7d7f8e', '#a4a2ab', '#d2cdc8'])],
        'rage': [(any_color, ['#2a1a1e', '#4a2b2b', '#723f33', '#a65a3c', '#e08c4c', '#ffd58c'])],
    },
    'spore_mother': {
        # Fiore pallido di palude con spore verdi; in furia viola tossico con luci acide.
        'calm': [(is_grey, ['#16121c', '#3d5232', '#86a04c', '#dfeb94']),
                 (is_green, ['#5f8f2e', '#c8f05a', '#f4ffc0'])],
        'rage': [(is_grey, ['#150f1e', '#4b2a6e', '#9f6bff', '#e9d6ff']),
                 (is_green, ['#7a9a2a', '#e2ff7a', '#fbffd8'])],
    },
    'forge_colossus': {
        # Ferro bruno con il nucleo di lava; senza armatura (furia) e' roccia fusa.
        'calm': [(any_color, ['#140c0b', '#33231e', '#523b31', '#755645', '#9a7660', '#bd9a80', '#ffb35c', '#ffe9a0'])],
        'rage': [(any_color, ['#1e0d09', '#40170c', '#6e2510', '#ab3d16', '#ec6a22', '#ffb347', '#fff0b0'])],
    },
    'frost_warden': {
        # Il pavimento del ghiacciaio e' blu scuro: tunica chiara di brina, fiamma di ghiaccio luminosa, ori -> argento,
        # occhio rosso -> bianco. In furia la fiamma diventa viola-bianca.
        'calm': [(is_red_eye, ['#ffffff', '#ffffff']),
                 (is_gold, ['#bfe3f5', '#e9f8ff', '#ffffff']),
                 (is_flame, ['#2b6fa6', '#4fb0e0', '#8fe6ff', '#d2f6ff', '#ffffff']),
                 (any_color, ['#2a3550', '#5a7193', '#94afca', '#d4e6f4'])],
        'rage': [(is_red_eye, ['#ff6f8f', '#ff6f8f']),
                 (is_gold, ['#c9b3ff', '#ece4ff', '#ffffff']),
                 (is_flame, ['#4a3aa8', '#7b63e0', '#a995ff', '#ddd2ff', '#ffffff']),
                 (any_color, ['#2c2a52', '#5b5890', '#9894c8', '#dad6f2'])],
    },
}


def lerp_ramp(ramp, t):
    stops = [hexrgb(c) for c in ramp]
    if len(stops) == 1:
        return stops[0]
    x = max(0.0, min(1.0, t)) * (len(stops) - 1)
    i = min(int(x), len(stops) - 2)
    f = x - i
    a, b = stops[i], stops[i + 1]
    return tuple(round(a[k] + (b[k] - a[k]) * f) for k in range(3))


def colors_of(frames):
    colors = set()
    for frame in frames:
        for count, (r, g, b, a) in frame.getcolors(1 << 20):
            if a > 0:
                colors.add((r, g, b))
    return colors


def build_mapper(groups, frames, reference):
    """Mappa ogni colore usato nei fotogrammi nel colore della sua rampa. La rampa si stende sui colori dei fotogrammi
    di riferimento; i colori fuori da quell'intervallo (per esempio le scintille della morte) vanno agli estremi."""
    def grouped(colors):
        members = {i: [] for i in range(len(groups))}
        for rgb in colors:
            h, s, v = colorsys.rgb_to_hsv(*(c / 255 for c in rgb))
            for i, (match, _) in enumerate(groups):
                if match(h, s, v):
                    members[i].append(rgb)
                    break
        return members

    members = grouped(colors_of(frames))
    anchors = grouped(colors_of(reference))
    mapping = {}
    for i, (_, ramp) in enumerate(groups):
        group = members[i]
        if not group:
            continue
        span = anchors[i] or group
        low = min(luminance(c) for c in span)
        high = max(luminance(c) for c in span)
        for rgb in group:
            t = 0.0 if high == low else (luminance(rgb) - low) / (high - low)
            mapping[rgb] = lerp_ramp(ramp, t)
    return mapping


def recolor(frame, mapping):
    out = frame.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a > 0:
                px[x, y] = (*mapping[(r, g, b)], 255)
    return out


def outlined(frame, color):
    """Contorno di un pixel (4 vicini) attorno alle parti opache: uniforma gli stili e stacca dal pavimento."""
    out = frame.copy()
    src = frame.load()
    px = out.load()
    rgb = hexrgb(color)
    for y in range(frame.height):
        for x in range(frame.width):
            if src[x, y][3] > 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < frame.width and 0 <= ny < frame.height and src[nx, ny][3] > 0:
                    px[x, y] = (*rgb, 255)
                    break
    return out


def strip(path, fw, fh, row=0, start=0, count=None):
    """Fotogrammi di una riga di un foglio a griglia, con un pixel di margine per il contorno."""
    img = Image.open(path).convert('RGBA')
    if count is None:
        count = img.width // fw - start
    frames = []
    for i in range(start, start + count):
        cell = img.crop((i * fw, row * fh, (i + 1) * fw, (row + 1) * fh))
        padded = Image.new('RGBA', (fw + 2, fh + 2))
        padded.paste(cell, (1, 1))
        frames.append(padded)
    return frames


# --- Boss -----------------------------------------------------------------------------------------------------------
# Per ogni boss: le animazioni (clip) con i fotogrammi sorgente e la tavolozza. `walk` e' sempre la prima: da essa si
# ricava il punto dei piedi.

STATUE = SRC / 'statue-spritesheet-alt-no-green.png'
FLOWER = SRC / 'mon4' / 'mon4_sprite_base.png'

BOSSES = {
    'guardian': {
        'source': 'Animated Statue (Calciumtrice), variante grigia',
        'outline': '#141823',
        'feet': 'mass',
        'clips': [
            ('walk', 'calm', strip(STATUE, 64, 64, 1, 0, 8)),
            ('attack', 'calm', strip(STATUE, 64, 64, 2, 0, 5)),
            ('rageWalk', 'rage', strip(STATUE, 64, 64, 1, 0, 8)),
            ('rageAttack', 'rage', strip(STATUE, 64, 64, 2, 0, 5)),
            ('transform', 'rage', strip(STATUE, 64, 64, 0, 0, 4)),
            ('death', 'rage', strip(STATUE, 64, 64, 3, 0, 6)),
        ],
    },
    'spore_mother': {
        'source': 'Demon Flower Monster (Rosswet Mobile)',
        'outline': None,
        'clips': [
            ('walk', 'calm', strip(FLOWER, 64, 64, 0, 0, 4)),
            ('attack', 'calm', strip(FLOWER, 64, 64, 3, 0, 14)),
            ('rageWalk', 'rage', strip(FLOWER, 64, 64, 0, 0, 4)),
            ('rageAttack', 'rage', strip(FLOWER, 64, 64, 3, 0, 14)),
            ('transform', 'rage', strip(FLOWER, 64, 64, 1, 0, 9)),
            ('death', 'rage', strip(FLOWER, 64, 64, 4, 0, 8)),
        ],
    },
    'forge_colossus': {
        'source': 'Enemy Galore I, golem (Admurin)',
        'outline': None,
        'clips': [
            ('walk', 'calm', strip(GOLEM / 'Armored' / 'Golem_Armor_Run.png', 64, 64)),
            ('attack', 'calm', strip(GOLEM / 'Armored' / 'Golem_Armor_AttackA.png', 64, 64, 0)
             + strip(GOLEM / 'Armored' / 'Golem_Armor_AttackA.png', 64, 64, 1)
             + strip(GOLEM / 'Armored' / 'Golem_Armor_AttackA.png', 64, 64, 2, 0, 3)),
            ('rageWalk', 'rage', strip(GOLEM / 'No Armor' / 'Golem_Run.png', 64, 64)),
            ('rageAttack', 'rage', strip(GOLEM / 'No Armor' / 'Golem_AttackA.png', 64, 64, 0)
             + strip(GOLEM / 'No Armor' / 'Golem_AttackA.png', 64, 64, 1)
             + strip(GOLEM / 'No Armor' / 'Golem_AttackA.png', 64, 64, 2)),
            # La rottura dell'armatura: con i colori della calma, l'armatura cade e scopre la roccia fusa.
            ('transform', 'calm', strip(GOLEM / 'Armored' / 'Golem_Armor_ArmorBreak.png', 64, 64, 0)
             + strip(GOLEM / 'Armored' / 'Golem_Armor_ArmorBreak.png', 64, 64, 1, 0, 1)),
            ('death', 'rage', strip(GOLEM / 'No Armor' / 'Golem_DeathB.png', 64, 64, 0)
             + strip(GOLEM / 'No Armor' / 'Golem_DeathB.png', 64, 64, 1)
             + strip(GOLEM / 'No Armor' / 'Golem_DeathB.png', 64, 64, 2, 0, 1)),
        ],
    },
    'frost_warden': {
        'source': 'EVil Wizard 2 (LuizMelo)',
        'outline': '#0a1020',
        'clips': [
            ('walk', 'calm', strip(WIZARD / 'Idle.png', 250, 250)),
            ('attack', 'calm', strip(WIZARD / 'Attack2.png', 250, 250)),
            ('rageWalk', 'rage', strip(WIZARD / 'Idle.png', 250, 250)),
            ('rageAttack', 'rage', strip(WIZARD / 'Attack2.png', 250, 250)),
            ('death', 'rage', strip(WIZARD / 'Death.png', 250, 250)),
        ],
    },
}


def union_bbox(frames):
    boxes = [f.getchannel('A').getbbox() for f in frames]
    boxes = [b for b in boxes if b is not None]
    return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))


def feet_of(frames, mode):
    """Punto dei piedi: y del pixel opaco piu' basso; x mediana dei pixel opachi dell'ultimo quinto della figura
    (`base`) o di tutta la figura (`mass`, per chi cammina a gambe larghe)."""
    xs, bottom = [], 0
    for frame in frames:
        box = frame.getchannel('A').getbbox()
        bottom = max(bottom, box[3])
        alpha = frame.getchannel('A').load()
        top = box[1] if mode == 'mass' else box[3] - max(3, (box[3] - box[1]) // 5)
        for y in range(top, box[3]):
            for x in range(box[0], box[2]):
                if alpha[x, y] > 0:
                    xs.append(x)
    xs.sort()
    return xs[len(xs) // 2], bottom


def prepare(boss_id, spec):
    palettes = PALETTES[boss_id]
    # Le rampe si stendono sui colori di camminata e attacco (le prime due animazioni): lo stesso colore sorgente cade
    # nello stesso punto della rampa in calma e in furia, e i colori in piu' della morte non scuriscono il resto.
    source = [f for _, _, frames in spec['clips'] for f in frames]
    reference = [f for _, _, frames in spec['clips'][:2] for f in frames]
    mappers = {variant: build_mapper(ramps, source, reference) for variant, ramps in palettes.items()}
    clips = []
    for name, variant, frames in spec['clips']:
        done = [recolor(f, mappers[variant]) for f in frames]
        if spec['outline']:
            done = [outlined(f, spec['outline']) for f in done]
        clips.append((name, done))
    every = [f for _, frames in clips for f in frames]
    x0, y0, x1, y1 = union_bbox(every)
    cell_w, cell_h = x1 - x0, y1 - y0
    columns = max(len(frames) for _, frames in clips)
    sheet = Image.new('RGBA', (columns * cell_w, len(clips) * cell_h))
    for row, (_, frames) in enumerate(clips):
        for column, frame in enumerate(frames):
            sheet.paste(frame.crop((x0, y0, x1, y1)), (column * cell_w, row * cell_h))
    OUT_PNG.mkdir(parents=True, exist_ok=True)
    path = OUT_PNG / f'{boss_id}.png'
    sheet.save(path, optimize=True)
    fx, fy = feet_of(clips[0][1], spec.get('feet', 'base'))
    print(f'{boss_id}: cella {cell_w}x{cell_h}, {columns}x{len(clips)}, piedi ({fx - x0}, {fy - y0}), '
          f'{path.stat().st_size} byte, colori {len(sheet.getcolors(1 << 20)) - 1}')
    return {
        'id': boss_id,
        'source': spec['source'],
        'cell': (cell_w, cell_h),
        'feet': (fx - x0, fy - y0),
        'clips': [(name, row, len(frames)) for row, (name, frames) in enumerate(clips)],
    }


def camel(boss_id):
    head, *rest = boss_id.split('_')
    return head + ''.join(word.capitalize() for word in rest)


def write_layout(layouts):
    lines = [
        '// File generato da tools/arte/prepara_boss.py: non modificarlo a mano, rilancia lo script.',
        '',
        "import type { SheetLayout } from './boss-sheet';",
        '',
    ]
    for layout in layouts:
        clips = ', '.join(f'{name}: {{ row: {row}, frames: {frames} }}' for name, row, frames in layout['clips'])
        lines += [
            f"/** {layout['source']}. */",
            f"export const {camel(layout['id'])}Layout: SheetLayout = {{",
            f"  url: new URL('../../../assets/art/boss/{layout['id']}.png', import.meta.url).href,",
            f"  cell: {{ width: {layout['cell'][0]}, height: {layout['cell'][1]} }},",
            f"  feet: {{ x: {layout['feet'][0]}, y: {layout['feet'][1]} }},",
            f'  clips: {{ {clips} }},',
            '};',
            '',
        ]
    OUT_TS.write_text('\n'.join(lines), encoding='utf-8', newline='\n')


write_layout([prepare(boss_id, spec) for boss_id, spec in BOSSES.items()])
