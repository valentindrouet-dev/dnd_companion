#!/usr/bin/env python3
"""Génère les images de carte de l'application depuis le PDF de l'aventure.

    pip install pymupdf
    python3 tools/make-maps.py

Produit, pour chaque carte décrite dans tools/map-coords.json :
    assets/maps/<carte>/complete.jpg     la carte entière
    assets/maps/<carte>/<salle>.jpg      un cadrage centré sur la salle, avec un repère doré
    data/maps.json                       la liste des fichiers (précachés par le service worker)

Le PDF source reste dans sources/ (ignoré par git) : seules les images produites sont versionnées.
"""
import json, os, sys

try:
    import pymupdf
except ImportError:
    sys.exit('Installe l’extracteur : pip install pymupdf')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COORDS = os.path.join(ROOT, 'tools', 'map-coords.json')
OUT_DIR = os.path.join(ROOT, 'assets', 'maps')

ZOOM_ROOM = 4.0       # rendu des cadrages de salle
ZOOM_FULL = 4.0       # rendu de la carte complète
QUALITY = 80
DEFAULT_W, DEFAULT_H = 120, 90
MARK = (226, 180, 92)  # repère doré autour de l'étiquette de la salle


def save_jpeg(pix, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(pix.tobytes('jpeg', jpg_quality=QUALITY))
    return os.path.getsize(path)


def frame(pix, x0, y0, x1, y1, width=3):
    """Dessine un cadre plein sur le pixmap (coordonnées du pixmap)."""
    for rect in (
        (x0, y0, x1, y0 + width), (x0, y1 - width, x1, y1),
        (x0, y0, x0 + width, y1), (x1 - width, y0, x1, y1),
    ):
        r = pymupdf.IRect(*[int(v) for v in rect]) & pix.irect
        if not r.is_empty:
            pix.set_rect(r, MARK)


def build(name, spec, index):
    pdf = os.path.join(ROOT, spec['pdf'])
    if not os.path.exists(pdf):
        print(f'  ! {spec["pdf"]} introuvable — carte « {name} » ignorée')
        return
    doc = pymupdf.open(pdf)
    page = doc[spec['page'] - 1]
    clip = pymupdf.Rect(*spec['clip'])

    full = page.get_pixmap(matrix=pymupdf.Matrix(ZOOM_FULL, ZOOM_FULL), clip=clip)
    size = save_jpeg(full, os.path.join(OUT_DIR, name, 'complete.jpg'))
    files = [f'assets/maps/{name}/complete.jpg']
    print(f'  carte complète {full.width}×{full.height} ({size // 1024} Ko)')

    rooms, spots, total = {}, {}, 0
    for room, val in spec['rooms'].items():
        cx, cy = val[0], val[1]
        w = val[2] if len(val) > 2 else DEFAULT_W
        h = val[3] if len(val) > 3 else DEFAULT_H
        box = pymupdf.Rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2) & clip
        sub = page.get_pixmap(matrix=pymupdf.Matrix(ZOOM_ROOM, ZOOM_ROOM), clip=box)
        # repère autour de l'étiquette
        mx, my = cx * ZOOM_ROOM, cy * ZOOM_ROOM
        frame(sub, mx - 26, my - 17, mx + 26, my + 17)
        rel = f'assets/maps/{name}/{room}.jpg'
        total += save_jpeg(sub, os.path.join(ROOT, rel))
        rooms[room] = rel
        # position relative sur la carte complète, en % — sert aux zones cliquables
        spots[room] = [round((cx - clip.x0) / clip.width * 100, 2), round((cy - clip.y0) / clip.height * 100, 2)]
        files.append(rel)
    print(f'  {len(rooms)} cadrages de salle ({total // 1024} Ko au total)')
    index[name] = {'complete': f'assets/maps/{name}/complete.jpg', 'rooms': rooms, 'spots': spots}
    return files


def main():
    specs = json.load(open(COORDS, encoding='utf-8'))
    index, all_files = {}, []
    for name, spec in specs.items():
        if name.startswith('_'):
            continue
        print(f'Carte « {name} »')
        files = build(name, spec, index)
        if files:
            all_files += files
    with open(os.path.join(ROOT, 'data', 'maps.json'), 'w', encoding='utf-8') as f:
        json.dump({'maps': index, 'files': sorted(all_files)}, f, ensure_ascii=False, indent=2)
    print(f'\ndata/maps.json : {len(all_files)} fichier(s).')


if __name__ == '__main__':
    main()
