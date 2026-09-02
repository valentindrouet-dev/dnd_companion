#!/usr/bin/env python3
"""Extrait le texte d'un PDF page par page vers sources/txt/<nom>/ (dossier ignoré par git).

    pip install pypdf            (ou pymupdf, plus fidèle sur les mises en page à colonnes)
    python3 tools/ingest/pdf-extract.py sources/pdf/mon-aventure.pdf
    python3 tools/ingest/pdf-extract.py sources/pdf/mon-aventure.pdf --pages 12-40

Produit :
    sources/txt/<nom>/page-012.txt …   (une page par fichier)
    sources/txt/<nom>/_all.txt         (tout, avec des marqueurs === PAGE n ===)
"""
import argparse, os, sys

def parse_pages(spec, count):
    if not spec:
        return range(1, count + 1)
    out = []
    for part in spec.split(','):
        part = part.strip()
        if '-' in part:
            a, b = part.split('-')
            out.extend(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return [p for p in out if 1 <= p <= count]

def extract_pymupdf(path, pages):
    import fitz  # pymupdf
    doc = fitz.open(path)
    count = doc.page_count
    for p in parse_pages(pages, count):
        yield p, doc[p - 1].get_text("text")

def extract_pypdf(path, pages):
    from pypdf import PdfReader
    reader = PdfReader(path)
    count = len(reader.pages)
    for p in parse_pages(pages, count):
        yield p, reader.pages[p - 1].extract_text() or ''

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('--pages', help='ex. 12-40 ou 3,5,9-12', default=None)
    ap.add_argument('--out', help='dossier de sortie (défaut : sources/txt/<nom>)', default=None)
    args = ap.parse_args()

    name = os.path.splitext(os.path.basename(args.pdf))[0]
    out = args.out or os.path.join('sources', 'txt', name)
    os.makedirs(out, exist_ok=True)

    try:
        import fitz  # noqa
        extractor = extract_pymupdf
        print('moteur : pymupdf')
    except ImportError:
        try:
            import pypdf  # noqa
            extractor = extract_pypdf
            print('moteur : pypdf')
        except ImportError:
            sys.exit('Installe un extracteur : pip install pymupdf   (ou : pip install pypdf)')

    total = 0
    with open(os.path.join(out, '_all.txt'), 'w', encoding='utf-8') as all_file:
        for p, text in extractor(args.pdf, args.pages):
            with open(os.path.join(out, f'page-{p:03d}.txt'), 'w', encoding='utf-8') as f:
                f.write(text)
            all_file.write(f'\n\n=== PAGE {p} ===\n\n{text}')
            total += 1
    print(f'{total} page(s) extraites dans {out}/')

if __name__ == '__main__':
    main()
