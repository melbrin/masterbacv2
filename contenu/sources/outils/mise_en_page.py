# Contrôle de mise en page des PDF fabriqués.
# usage : python3 -I outils/mise_en_page.py sorties/<dossier de la fiche>/*.pdf
# Signale : le sommaire qui déborde de sa page, « L'essentiel en une page » ou « Ce qui est tombé » sur plus d'une page,
# et les pages remplies à moins de 25 % (hors couverture et dernière page). Rien d'affiché sous le nom du fichier : tout va bien.
import sys, pymupdf


def blocs(page):
    h = page.rect.height
    return [b for b in sorted(page.get_text('blocks'), key=lambda b: b[1]) if b[1] > 0.07 * h and b[3] < 0.93 * h and b[4].strip()]


def bas(page):
    """Hauteur atteinte par le contenu de la page, en pourcentage (en-tête et pied exclus)."""
    h = page.rect.height
    y = 0
    for b in blocs(page):
        y = max(y, b[3])
    for d in page.get_drawings():
        r = d['rect']
        if r.y0 > 0.07 * h and r.y1 < 0.93 * h:
            y = max(y, r.y1)
    for im in page.get_image_info():
        r = pymupdf.Rect(im['bbox'])
        if r.y0 > 0.07 * h and r.y1 < 0.93 * h:
            y = max(y, r.y1)
    return round(100 * y / h)


def debut(page):
    b = blocs(page)
    return ' '.join(b[0][4].split())[:45] if b else ''


for f in sys.argv[1:]:
    d = pymupdf.open(f)
    pg = {}
    for niveau, titre, page in d.get_toc():
        if niveau != 1:
            continue
        k = 'e' if 'essentiel' in titre else 't' if 'tombé' in titre else 'th1' if titre.startswith('Thème 1') else None
        if k and k not in pg:
            pg[k] = page
    som = 2 if 'Cahier' in f else 4
    msg = []
    if pg.get('e') and pg['e'] - som > 1:
        msg.append('le sommaire déborde')
    if pg.get('e') and pg.get('t') and pg['t'] - pg['e'] > 1:
        msg.append("« L'essentiel » sur %d pages" % (pg['t'] - pg['e']))
    if pg.get('t') and pg.get('th1') and pg['th1'] - pg['t'] > 1:
        msg.append('« Ce qui est tombé » sur %d pages' % (pg['th1'] - pg['t']))
    print('%s : %d pages%s' % (f.split('/')[-1], len(d), (' ; ' + ' ; '.join(msg)) if msg else ''))
    for i, p in enumerate(d):
        if 0 < i < len(d) - 1 and bas(p) < 25:
            print('    page %d remplie à %d %% : %s' % (i + 1, bas(p), debut(p)))
