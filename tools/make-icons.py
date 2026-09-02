#!/usr/bin/env python3
"""Génère les icônes PNG de l'app (sans dépendance) : un losange doré sur fond sombre.
   python3 tools/make-icons.py
"""
import struct, zlib, os

BG = (21, 23, 27)
GOLD = (226, 180, 92)
INK = (27, 21, 8)
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons')

def shade(x, y, size):
    """Couleur d'un point (coordonnées en fraction 0..1)."""
    dx, dy = abs(x - 0.5), abs(y - 0.5)
    d = dx + dy                     # distance « losange »
    if d <= 0.19:
        return INK
    if d <= 0.30:
        return GOLD
    if 0.33 <= d <= 0.36 and dy < 0.05:   # deux petits traits latéraux (facettes)
        return GOLD
    return BG

def render(size, ss=3):
    rows = []
    for py in range(size):
        row = bytearray([0])            # filtre 0
        for px in range(size):
            r = g = b = 0
            for sy in range(ss):
                for sx in range(ss):
                    c = shade((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size, size)
                    r += c[0]; g += c[1]; b += c[2]
            n = ss * ss
            row += bytes((r // n, g // n, b // n))
        rows.append(bytes(row))
    return b''.join(rows)

def png(size):
    raw = render(size)
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for s in (180, 192, 512):
        path = os.path.join(OUT, f'icon-{s}.png')
        with open(path, 'wb') as f:
            f.write(png(s))
        print('écrit', os.path.relpath(path))
