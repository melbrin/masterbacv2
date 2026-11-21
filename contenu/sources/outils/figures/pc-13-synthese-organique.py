# Figures de la fiche PC 13 (Synthèse organique), palette MasterBac
# usage : pc-13-synthese-organique.py <dossier de sortie, en général fiches/pc-13-synthese-organique/figs>
# Formules topologiques : liaison de longueur 1, angles de 120°, même échelle pour toutes les molécules (ECH pouces par unité).
# Flèches courbes des mécanismes : arcs de Bézier tracés à la main (fleche_bezier), pointe orientée selon la tangente à l'arrivée.
import sys, re
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker
from matplotlib.patches import Rectangle, Circle, Polygon, FancyBboxPatch, Ellipse, PathPatch
from matplotlib.path import Path
from PIL import Image, ImageChops

out = sys.argv[1]
ANTH='#2B2C2D'; CUIVRE='#A47351'; GRIS='#8A8F98'; GRISC='#DAD5D0'; GRISM='#EFEBE7'
VERT='#2E6B4F'; BRIQUE='#B23A2E'; BLEU='#2F5D8A'; EAU='#DCE9F2'; SABLE='#F4E3C3'; VERTC='#E3EFE8'; ORGA='#F6E7C9'
plt.rcParams.update({'font.family':'Carlito','font.size':11,'mathtext.fontset':'stix',
                     'axes.linewidth':0,'savefig.dpi':300})
ECH = 0.34          # pouces par unité de longueur de liaison
C30 = np.cos(np.radians(30))

def rogne(p):
    im=Image.open(p).convert('RGB')
    bg=Image.new('RGB',im.size,(255,255,255))
    box=ImageChops.difference(im,bg).convert('L').point(lambda v:255 if v>8 else 0).getbbox()
    pad=14
    im=im.crop((max(0,box[0]-pad),max(0,box[1]-pad),min(im.width,box[2]+pad),min(im.height,box[3]+pad)))
    im.save(p,dpi=(300,300)); return im.size
def save(fig,name):
    p=f'{out}/{name}.png'
    fig.savefig(p,facecolor='white'); plt.close(fig)
    w, h = rogne(p)
    print(name, (w, h), 'largeur conseillée %.1f cm' % (w / 300 * 2.54 * 0.78))
def toile(xlim, ylim, ech=ECH):
    fig, ax = plt.subplots(figsize=((xlim[1] - xlim[0]) * ech, (ylim[1] - ylim[0]) * ech)); fig.subplots_adjust(0, 0, 1, 1)
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.set_aspect('equal'); ax.axis('off')
    return fig, ax
def texte(ax, x, y, t, fs=10, color=ANTH, ha='center', va='center', fond=False, **kw):
    if fond: kw['bbox'] = dict(boxstyle='round,pad=0.15', fc='white', ec='none')
    ax.text(x, y, t, fontsize=fs, color=color, ha=ha, va=va, zorder=8, **kw)

# ---------------------------------------------------------------- formules topologiques
def pas(p, ang, L=1.0):
    a = np.radians(ang); return (p[0] + L * np.cos(a), p[1] + L * np.sin(a))
def zigzag(n, x0=0.0, y0=0.0, haut=True):
    # n sommets d'une chaîne en zigzag, le deuxième plus haut que le premier si haut=True
    return [(x0 + k * C30, y0 + (0.5 if (k % 2 == 1) == haut else 0.0)) for k in range(n)]
DECAL = {'O': 0.0, 'OH': 0.15, 'HO': -0.15, 'NH2': 0.15, 'H2N': -0.24, 'Cl': 0.0, 'N': 0.0, 'NH': 0.0, 'Br': 0.0, 'O⁻': 0.0}
def mol(ax, at, li, fs=11.5, color=ANTH, lw=1.45, r=0.27, dbl=0.15, dnh=0.42):
    # at : {nom: (x, y, étiquette)} ; '' pour un carbone (sommet non écrit)
    # li : [(a, b, ordre, côté)] ; côté +1 ou -1 : trait intérieur d'une double liaison C=C du côté gauche (+1) ou droit (-1) du sens a -> b ;
    #      côté 0 : double liaison centrée (C=O)
    for l in li:
        a, b, o = l[0], l[1], l[2]; cote = l[3] if len(l) > 3 else 0
        pa = np.array(at[a][:2], float); pb = np.array(at[b][:2], float)
        u = (pb - pa) / np.linalg.norm(pb - pa); n = np.array([-u[1], u[0]])
        ra = r if at[a][2] else 0.0; rb = r if at[b][2] else 0.0
        p, q = pa + u * ra, pb - u * rb
        if o == 1 or (o == 2 and cote != 0):
            ax.plot([p[0], q[0]], [p[1], q[1]], color=color, lw=lw, solid_capstyle='round', zorder=4)
        if o == 2 and cote != 0:
            ra2 = max(ra, 0.14); rb2 = max(rb, 0.14)
            p2, q2 = pa + u * ra2 + cote * dbl * n, pb - u * rb2 + cote * dbl * n
            ax.plot([p2[0], q2[0]], [p2[1], q2[1]], color=color, lw=lw, solid_capstyle='round', zorder=4)
        if o == 2 and cote == 0:
            for d in (-0.07, 0.07):
                ax.plot([p[0] + d * n[0], q[0] + d * n[0]], [p[1] + d * n[1], q[1] + d * n[1]], color=color, lw=lw, solid_capstyle='round', zorder=4)
    for nom, (x, y, e) in at.items():
        if not e: continue
        if e == 'NH':      # azote avec son hydrogène écrit en dessous
            ax.text(x, y, 'N', fontsize=fs, color=color, ha='center', va='center', zorder=6)
            ax.text(x, y - dnh, 'H', fontsize=fs, color=color, ha='center', va='center', zorder=6)
            continue
        lab = {'NH2': 'NH$_2$', 'H2N': 'H$_2$N'}.get(e, e)
        ha = 'left' if e in ('OH', 'NH2') else ('right' if e in ('HO', 'H2N') else 'center')
        dx = {'left': -0.15, 'right': 0.15, 'center': 0.0}[ha]
        if e == 'H2N': dx = 0.15
        ax.text(x + dx, y, lab, fontsize=fs, color=color, ha=ha, va='center', zorder=6)
def cycle6(c, ang0=90, R=1.0):
    return [(c[0] + R * np.cos(np.radians(ang0 + 60 * k)), c[1] + R * np.sin(np.radians(ang0 + 60 * k))) for k in range(6)]
def benzene(at, li, prefixe, c, ang0=90, doubles=(0, 2, 4)):
    # ajoute un cycle benzénique (sommets prefixe0..prefixe5) ; doubles : indices k des liaisons k -> k+1 dessinées doubles (trait intérieur)
    pts = cycle6(c, ang0)
    for k, p in enumerate(pts): at['%s%d' % (prefixe, k)] = (p[0], p[1], '')
    for k in range(6):
        a, b = '%s%d' % (prefixe, k), '%s%d' % (prefixe, (k + 1) % 6)
        li.append((a, b, 2, 1) if k in doubles else (a, b, 1))
    return pts
def entoure(ax, x0, y0, x1, y1, color=CUIVRE, nom=None, pos='haut', fs=9.5):
    ax.add_patch(FancyBboxPatch((x0, y0), x1 - x0, y1 - y0, boxstyle='round,pad=0.06,rounding_size=0.22', fc='none', ec=color, lw=1.3, zorder=3))
    if nom:
        if pos == 'haut': texte(ax, (x0 + x1) / 2, y1 + 0.3, nom, fs=fs, color=color)
        elif pos == 'bas': texte(ax, (x0 + x1) / 2, y0 - 0.3, nom, fs=fs, color=color)
        elif pos == 'droite': texte(ax, x1 + 0.15, (y0 + y1) / 2, nom, fs=fs, color=color, ha='left')
        else: texte(ax, x0 - 0.15, (y0 + y1) / 2, nom, fs=fs, color=color, ha='right')
def entoure_pts(ax, at, noms, color, nom=None, pos='haut', pad=0.32, fs=9.5, decal=0.0):
    xs = [at[n][0] for n in noms]; ys = [at[n][1] for n in noms]
    x0, x1, y0, y1 = min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad
    for n in noms:                       # les étiquettes OH, NH2 débordent à droite, HO, H2N à gauche
        e = at[n][2]
        if e in ('OH', 'NH2'): x1 = max(x1, at[n][0] + 0.62)
        if e == 'HO': x0 = min(x0, at[n][0] - 0.62)
        if e == 'H2N': x0 = min(x0, at[n][0] - 0.95)
        if e == 'NH': y0 = min(y0, at[n][1] - 0.62)
    ax.add_patch(FancyBboxPatch((x0, y0), x1 - x0, y1 - y0, boxstyle='round,pad=0.02,rounding_size=0.2', fc='none', ec=color, lw=1.3, zorder=3))
    if nom:
        if pos == 'haut': texte(ax, (x0 + x1) / 2 + decal, y1 + 0.28, nom, fs=fs, color=color)
        elif pos == 'bas': texte(ax, (x0 + x1) / 2 + decal, y0 - 0.28, nom, fs=fs, color=color)
        elif pos == 'droite': texte(ax, x1 + 0.12, (y0 + y1) / 2 + decal, nom, fs=fs, color=color, ha='left')
        else: texte(ax, x0 - 0.12, (y0 + y1) / 2 + decal, nom, fs=fs, color=color, ha='right')
    return x0, y0, x1, y1
def fleche_reaction(ax, x0, x1, y, haut=None, bas=None, fs=9.5):
    ax.annotate('', xy=(x1, y), xytext=(x0, y), arrowprops=dict(arrowstyle='-|>', color=ANTH, lw=1.3, mutation_scale=13))
    if haut: texte(ax, (x0 + x1) / 2, y + 0.38, haut, fs=fs)
    if bas: texte(ax, (x0 + x1) / 2, y - 0.38, bas, fs=fs)
def etiq(ax, x, y, t, fs=10.5, color=CUIVRE, **kw): texte(ax, x, y, t, fs=fs, color=color, **kw)

# contrôle des molécules dessinées : la formule brute lue sur le dessin (sommets sans étiquette = carbones, hydrogènes implicites
# par la tétravalence du carbone) doit être celle de la formule semi-développée écrite à côté ; chaque hétéroatome garde sa valence
VALENCE = {'C': 4, 'O': 2, 'N': 3, 'Cl': 1, 'Br': 1}
def compo(f):
    s = f.replace('-', '').replace('=', '')
    pos = 0
    def groupe():
        nonlocal pos
        comp = {}
        while pos < len(s) and s[pos] != ')':
            if s[pos] == '(':
                pos += 1; sous = groupe(); pos += 1
                k = re.match(r'\d*', s[pos:]).group(); pos += len(k)
                for e, n in sous.items(): comp[e] = comp.get(e, 0) + int(k or 1) * n
            else:
                m = re.match(r'([A-Z][a-z]?)(\d*)', s[pos:]); pos += len(m.group())
                comp[m.group(1)] = comp.get(m.group(1), 0) + int(m.group(2) or 1)
        return comp
    return groupe()
def formule_dessin(at, li):
    deg = {k: 0 for k in at}
    for l in li: deg[l[0]] += l[2]; deg[l[1]] += l[2]
    comp = {}
    for k, (x, y, e) in at.items():
        if not e:
            if deg[k] > 4: raise SystemExit('carbone %s : %d liaisons' % (k, deg[k]))
            els = {'C': 1, 'H': 4 - deg[k]}
        else:
            els = {}
            for el, n in re.findall(r'([A-Z][a-z]?)(\d*)', e): els[el] = els.get(el, 0) + int(n or 1)
            lourd = next(el for el in els if el != 'H')
            if deg[k] + els.get('H', 0) != VALENCE[lourd]: raise SystemExit('valence de %s (%s) : %d liaisons' % (k, e, deg[k] + els.get('H', 0)))
        for el, n in els.items(): comp[el] = comp.get(el, 0) + n
    return {e: n for e, n in comp.items() if n}
def verifie(at, li, semi):
    if formule_dessin(at, li) != compo(semi): raise SystemExit('dessin différent de %s : %s' % (semi, formule_dessin(at, li)))

# --- Q.1 : acide 3-méthylbutanoïque (énoncé) et butan-2-ol (corrigé)
def fig_q1():
    fig, ax = toile((-0.5, 4.3), (-0.55, 2.1))
    z = zigzag(4)
    at = {'c4': z[0] + ('',), 'c3': z[1] + ('',), 'c2': z[2] + ('',), 'c1': z[3] + ('',)}
    at['m'] = pas(z[1], 90) + ('',); at['o'] = pas(z[3], 90) + ('O',); at['oh'] = pas(z[3], -30) + ('OH',)
    mol(ax, at, [('c4', 'c3', 1), ('c3', 'c2', 1), ('c2', 'c1', 1), ('c3', 'm', 1), ('c1', 'o', 2), ('c1', 'oh', 1)])
    save(fig, 'fig_q1')
def fig_q1_c():
    # panneau de gauche : formule topologique numérotée ; panneau de droite : formule développée (toutes les liaisons, y compris C-H et O-H)
    fig, ax = toile((-0.7, 11.9), (-2.3, 3.5))
    z = zigzag(4)
    at = {'a': z[0] + ('',), 'b': z[1] + ('',), 'c': z[2] + ('',), 'd': z[3] + ('',), 'o': pas(z[1], 90) + ('OH',)}
    mol(ax, at, [('a', 'b', 1), ('b', 'c', 1), ('c', 'd', 1), ('b', 'o', 1)])
    for k, p in enumerate(z):
        texte(ax, p[0] + (0.0 if k % 2 == 0 else 0.3), p[1] + (-0.36 if k % 2 == 0 else 0.22), str(k + 1), fs=8.5, color=CUIVRE)
    texte(ax, 1.3, -1.75, 'formule topologique', fs=10.5, color=CUIVRE)
    L = 1.25; x0 = 6.2; y0 = 0.5
    d = {}; li = []
    for k in range(4): d['C%d' % (k + 1)] = (x0 + k * L, y0, 'C')
    for k in range(3): li.append(('C%d' % (k + 1), 'C%d' % (k + 2), 1))
    for k, (hx, hy) in {1: (-L, 0), 4: (L, 0)}.items():
        d['Hg%d' % k] = (d['C%d' % k][0] + hx, y0 + hy, 'H'); li.append(('C%d' % k, 'Hg%d' % k, 1))
    for k in (1, 3, 4):
        for sg, nom in ((1, 'h'), (-1, 'b')):
            d['H%s%d' % (nom, k)] = (d['C%d' % k][0], y0 + sg * L, 'H'); li.append(('C%d' % k, 'H%s%d' % (nom, k), 1))
    d['Hb2'] = (d['C2'][0], y0 - L, 'H'); li.append(('C2', 'Hb2', 1))
    d['O'] = (d['C2'][0], y0 + L, 'O'); li.append(('C2', 'O', 1))
    d['HO'] = (d['C2'][0], y0 + 2 * L, 'H'); li.append(('O', 'HO', 1))
    mol(ax, d, li)
    texte(ax, x0 + 1.5 * L, -1.75, 'formule développée', fs=10.5, color=CUIVRE)
    save(fig, 'fig_q1_c')
def lactique(x0, y0):
    z = zigzag(3, x0, y0)
    at = {'a': z[0] + ('',), 'b': z[1] + ('',), 'c': z[2] + ('',)}
    at['oh1'] = pas(z[1], 90) + ('OH',); at['o'] = pas(z[2], -90) + ('O',); at['oh2'] = pas(z[2], 30) + ('OH',)
    return at, [('a', 'b', 1), ('b', 'c', 1), ('b', 'oh1', 1), ('c', 'o', 2), ('c', 'oh2', 1)]
def paracetamol(x0, y0):
    at, li = {}, []
    pts = benzene(at, li, 'r', (x0, y0), ang0=0)
    at['oh'] = pas(pts[3], 180) + ('HO',); li.append(('r3', 'oh', 1))
    at['n'] = pas(pts[0], 0) + ('NH',); li.append(('r0', 'n', 1))
    at['c'] = pas(at['n'][:2], 30) + ('',); li.append(('n', 'c', 1))
    at['o'] = pas(at['c'][:2], 90) + ('O',); li.append(('c', 'o', 2))
    at['m'] = pas(at['c'][:2], -30) + ('',); li.append(('c', 'm', 1))
    return at, li
def glutamine(x0, y0):
    z = zigzag(5, x0, y0, haut=False)
    at = {'n1': (z[0][0] - C30, z[0][1] - 0.5, 'H2N'), 'c5': z[0] + ('',), 'c4': z[1] + ('',), 'c3': z[2] + ('',), 'c2': z[3] + ('',), 'c1': z[4] + ('',)}
    at['o5'] = pas(z[0], 90) + ('O',); at['n2'] = pas(z[3], -90) + ('NH2',); at['o1'] = pas(z[4], 90) + ('O',); at['oh'] = pas(z[4], -30) + ('OH',)
    li = [('n1', 'c5', 1), ('c5', 'c4', 1), ('c4', 'c3', 1), ('c3', 'c2', 1), ('c2', 'c1', 1), ('c5', 'o5', 2), ('c2', 'n2', 1), ('c1', 'o1', 2), ('c1', 'oh', 1)]
    return at, li
def fig_groupes(corrige):
    # noms des molécules à la même distance des dessins que les lettres des figures 4 et 5
    fig, ax = toile((-0.9, 20.9), (-2.3, 2.75))
    at, li = lactique(0.0, 0.0); mol(ax, at, li); etiq(ax, 1.2, -1.9, 'acide lactique')
    at2, li2 = paracetamol(6.9, 0.0); mol(ax, at2, li2); etiq(ax, 7.6, -1.9, 'paracétamol')
    at3, li3 = glutamine(14.2, 0.2); mol(ax, at3, li3); etiq(ax, 16.0, -1.9, 'glutamine')
    if corrige:
        entoure_pts(ax, at, ['oh1'], VERT, 'hydroxyle', 'haut')
        entoure_pts(ax, at, ['c', 'o', 'oh2'], CUIVRE, 'carboxyle', 'droite', decal=-0.6)
        entoure_pts(ax, at2, ['oh'], VERT, 'hydroxyle', 'haut')
        entoure_pts(ax, at2, ['n', 'c', 'o'], BLEU, 'amide', 'droite', decal=0.75)
        entoure_pts(ax, at3, ['n1', 'c5', 'o5'], BLEU, 'amide', 'bas')
        entoure_pts(ax, at3, ['n2'], VERT, 'amine', 'droite')
        entoure_pts(ax, at3, ['c1', 'o1', 'oh'], CUIVRE, 'carboxyle', 'haut')
    save(fig, 'fig_groupes' + ('_c' if corrige else ''))

# --- Q.4 : six molécules de formule C4H10O ou C4H8O, puis le but-2-ène
def fig_isomeres():
    fig, ax = toile((-0.7, 26.5), (-1.5, 2.05))
    YL = -1.05      # lettres sous les molécules, à la même distance que dans la figure 5
    def lettre(x, y, s): texte(ax, x, y, s, fs=10.5, color=CUIVRE)
    x = 0.0
    # a : butan-1-ol
    z = zigzag(4, x, 0.0)
    at = {'1': z[0] + ('',), '2': z[1] + ('',), '3': z[2] + ('',), '4': z[3] + ('',), 'o': pas(z[3], -30) + ('OH',)}
    mol(ax, at, [('1', '2', 1), ('2', '3', 1), ('3', '4', 1), ('4', 'o', 1)]); lettre(x + 1.7, YL, 'a')
    x += 5.2
    # b : butan-2-ol
    z = zigzag(4, x, 0.0)
    at = {'1': z[0] + ('',), '2': z[1] + ('',), '3': z[2] + ('',), '4': z[3] + ('',), 'o': pas(z[1], 90) + ('OH',)}
    mol(ax, at, [('1', '2', 1), ('2', '3', 1), ('3', '4', 1), ('2', 'o', 1)]); lettre(x + 1.3, YL, 'b')
    x += 3.9
    # c : 2-méthylpropan-1-ol
    z = zigzag(3, x, 0.0)
    at = {'1': z[0] + ('',), '2': z[1] + ('',), '3': z[2] + ('',), 'm': pas(z[1], 90) + ('',), 'o': pas(z[2], 30) + ('OH',)}
    mol(ax, at, [('1', '2', 1), ('2', '3', 1), ('2', 'm', 1), ('3', 'o', 1)]); lettre(x + 1.3, YL, 'c')
    x += 4.4
    # d : éthoxyéthane
    z = zigzag(5, x, 0.0)
    at = {'1': z[0] + ('',), '2': z[1] + ('',), 'o': z[2] + ('O',), '4': z[3] + ('',), '5': z[4] + ('',)}
    mol(ax, at, [('1', '2', 1), ('2', 'o', 1), ('o', '4', 1), ('4', '5', 1)]); lettre(x + 1.7, YL, 'd')
    x += 4.6
    # e : butanal
    z = zigzag(4, x, 0.0)
    at = {'1': z[0] + ('',), '2': z[1] + ('',), '3': z[2] + ('',), '4': z[3] + ('',), 'o': pas(z[3], -30) + ('O',)}
    mol(ax, at, [('1', '2', 1), ('2', '3', 1), ('3', '4', 1), ('4', 'o', 2)]); lettre(x + 1.7, YL, 'e')
    x += 4.8
    # f : butanone
    z = zigzag(4, x, 0.0)
    at = {'1': z[0] + ('',), '2': z[1] + ('',), '3': z[2] + ('',), '4': z[3] + ('',), 'o': pas(z[1], 90) + ('O',)}
    mol(ax, at, [('1', '2', 1), ('2', '3', 1), ('3', '4', 1), ('2', 'o', 2)]); lettre(x + 1.3, YL, 'f')
    save(fig, 'fig_isomeres')
def fig_ze():
    fig, ax = toile((-0.6, 9.6), (-1.6, 1.6))
    # g : méthyles de part et d'autre de la double liaison ; h : méthyles du même côté
    at = {'c1': (0.0, -0.5, ''), 'c2': (C30, 0.0, ''), 'c3': (2 * C30, -0.5, ''), 'c4': (3 * C30, 0.0, '')}
    mol(ax, at, [('c1', 'c2', 1), ('c2', 'c3', 2, -1), ('c3', 'c4', 1)])
    texte(ax, 1.3, -1.35, 'g', fs=10.5, color=CUIVRE)
    x0 = 5.4
    at = {'c1': (x0, 0.5, ''), 'c2': (x0 + C30, 0.0, ''), 'c3': (x0 + 2 * C30, 0.5, ''), 'c4': (x0 + C30 * 2 + C30, 0.0, '')}
    at = {'c2': (x0 + 0.9, -0.2, ''), 'c3': (x0 + 1.9, -0.2, ''), 'c1': (x0 + 0.4, 0.67, ''), 'c4': (x0 + 2.4, 0.67, '')}
    mol(ax, at, [('c1', 'c2', 1), ('c2', 'c3', 2, 1), ('c3', 'c4', 1)])
    texte(ax, x0 + 1.4, -1.35, 'h', fs=10.5, color=CUIVRE)
    save(fig, 'fig_ze')

# --- corrigés de Q.3 et de Q.4 : les espèces de l'énoncé redessinées, avec leur nom (et, pour Q.3, la chaîne principale numérotée)
# Chaque espèce : (lettre, formule semi-développée de l'énoncé, nom donné par le corrigé, dessin). Le dessin rend (atomes, liaisons, numéros),
# numéros = [(atome, chiffre, 'b' sous l'atome, 'h' au-dessus, 'in' à l'intérieur du cycle)] ; verifie() contrôle que le dessin a la formule brute de l'énoncé.
def q3_a(x, y):   # 3-méthylbutan-1-ol
    z = zigzag(4, x, y)
    at = {'4': z[0] + ('',), '3': z[1] + ('',), '2': z[2] + ('',), '1': z[3] + ('',), 'm': pas(z[1], 90) + ('',), 'o': pas(z[3], -30) + ('OH',)}
    return at, [('4', '3', 1), ('3', '2', 1), ('2', '1', 1), ('3', 'm', 1), ('1', 'o', 1)], [(k, k, 'b') for k in '4321']
def q3_b(x, y):   # 3-méthylbutan-2-one
    z = zigzag(4, x, y)
    at = {'1': z[0] + ('',), '2': z[1] + ('',), '3': z[2] + ('',), '4': z[3] + ('',), 'o': pas(z[1], 90) + ('O',), 'm': pas(z[2], 270) + ('',)}
    return at, [('1', '2', 1), ('2', '3', 1), ('3', '4', 1), ('2', 'o', 2), ('3', 'm', 1)], [('1', '1', 'b'), ('2', '2', 'b'), ('3', '3', 'h'), ('4', '4', 'b')]
def q3_c(x, y):   # acide 2-méthylbutanoïque
    z = zigzag(4, x, y)
    at = {'4': z[0] + ('',), '3': z[1] + ('',), '2': z[2] + ('',), '1': z[3] + ('',), 'm': pas(z[2], 270) + ('',), 'o': pas(z[3], 90) + ('O',), 'oh': pas(z[3], -30) + ('OH',)}
    return at, [('4', '3', 1), ('3', '2', 1), ('2', '1', 1), ('2', 'm', 1), ('1', 'o', 2), ('1', 'oh', 1)], [('4', '4', 'b'), ('3', '3', 'b'), ('2', '2', 'h'), ('1', '1', 'b')]
def q3_d(x, y):   # propanal
    z = zigzag(3, x, y)
    at = {'3': z[0] + ('',), '2': z[1] + ('',), '1': z[2] + ('',), 'o': pas(z[2], 30) + ('O',)}
    return at, [('3', '2', 1), ('2', '1', 1), ('1', 'o', 2)], [(k, k, 'b') for k in '321']
def q3_e(x, y):   # propanoate de butyle : partie issue de l'acide à gauche, partie liée à l'oxygène à droite
    z = zigzag(8, x, y, haut=False)
    at = {'a3': z[0] + ('',), 'a2': z[1] + ('',), 'a1': z[2] + ('',), 'o': z[3] + ('O',), 'b1': z[4] + ('',), 'b2': z[5] + ('',), 'b3': z[6] + ('',), 'b4': z[7] + ('',),
          'od': pas(z[2], 90) + ('O',)}
    li = [('a3', 'a2', 1), ('a2', 'a1', 1), ('a1', 'od', 2), ('a1', 'o', 1), ('o', 'b1', 1), ('b1', 'b2', 1), ('b2', 'b3', 1), ('b3', 'b4', 1)]
    return at, li, []
def q3_f(x, y):   # 2-chlorobutane
    z = zigzag(4, x, y)
    at = {'1': z[0] + ('',), '2': z[1] + ('',), '3': z[2] + ('',), '4': z[3] + ('',), 'cl': pas(z[1], 90) + ('Cl',)}
    return at, [('1', '2', 1), ('2', '3', 1), ('3', '4', 1), ('2', 'cl', 1)], [(k, k, 'b') for k in '1234']
def q3_g(x, y):   # N-méthyléthanamide
    z = zigzag(4, x, y)
    at = {'2': z[0] + ('',), '1': z[1] + ('',), 'n': z[2] + ('NH',), 'm': z[3] + ('',), 'o': pas(z[1], 90) + ('O',)}
    return at, [('2', '1', 1), ('1', 'n', 1), ('n', 'm', 1), ('1', 'o', 2)], [('2', '2', 'b'), ('1', '1', 'b')]
def q3_h(x, y):   # 2,3-diméthylpentane
    z = zigzag(5, x, y)
    at = {'1': z[0] + ('',), '2': z[1] + ('',), '3': z[2] + ('',), '4': z[3] + ('',), '5': z[4] + ('',), 'm2': pas(z[1], 90) + ('',), 'm3': pas(z[2], 270) + ('',)}
    li = [('1', '2', 1), ('2', '3', 1), ('3', '4', 1), ('4', '5', 1), ('2', 'm2', 1), ('3', 'm3', 1)]
    return at, li, [('1', '1', 'b'), ('2', '2', 'b'), ('3', '3', 'h'), ('4', '4', 'b'), ('5', '5', 'b')]
def q3_i(x, y):   # 1,4-diméthylcyclohexane, numéros à l'intérieur du cycle
    c = (x + 2.0, y + 0.25); pts = cycle6(c, 0)
    at = {'r%d' % k: (p[0], p[1], '') for k, p in enumerate(pts)}
    at['m0'] = pas(pts[0], 0) + ('',); at['m3'] = pas(pts[3], 180) + ('',)
    li = [('r%d' % k, 'r%d' % ((k + 1) % 6), 1) for k in range(6)] + [('r0', 'm0', 1), ('r3', 'm3', 1)]
    return at, li, [('r%d' % k, str(k + 1), 'in') for k in range(6)]
def q3_j(x, y):   # butan-2-amine
    z = zigzag(4, x, y)
    at = {'4': z[0] + ('',), '3': z[1] + ('',), '2': z[2] + ('',), '1': z[3] + ('',), 'n': pas(z[2], 270) + ('NH2',)}
    return at, [('4', '3', 1), ('3', '2', 1), ('2', '1', 1), ('2', 'n', 1)], [('4', '4', 'b'), ('3', '3', 'b'), ('2', '2', 'h'), ('1', '1', 'b')]
def q3_k(x, y):   # 2-méthylpent-2-ène
    z = zigzag(5, x, y)
    at = {'1': z[0] + ('',), '2': z[1] + ('',), '3': z[2] + ('',), '4': z[3] + ('',), '5': z[4] + ('',), 'm': pas(z[1], 90) + ('',)}
    li = [('1', '2', 1), ('2', '3', 2, 1), ('3', '4', 1), ('4', '5', 1), ('2', 'm', 1)]
    return at, li, [(k, k, 'b') for k in '12345']
def q3_l(x, y):   # 2-chloro-3-méthylbutane
    z = zigzag(4, x, y)
    at = {'1': z[0] + ('',), '2': z[1] + ('',), '3': z[2] + ('',), '4': z[3] + ('',), 'cl': pas(z[1], 90) + ('Cl',), 'm': pas(z[2], 270) + ('',)}
    return at, [('1', '2', 1), ('2', '3', 1), ('3', '4', 1), ('2', 'cl', 1), ('3', 'm', 1)], [('1', '1', 'b'), ('2', '2', 'b'), ('3', '3', 'h'), ('4', '4', 'b')]
Q3_ESPECES = [('a', 'CH3-CH(CH3)-CH2-CH2-OH', '3-méthylbutan-1-ol', q3_a), ('b', 'CH3-CO-CH(CH3)-CH3', '3-méthylbutan-2-one', q3_b),
              ('c', 'CH3-CH2-CH(CH3)-COOH', 'acide 2-méthylbutanoïque', q3_c), ('d', 'CH3-CH2-CHO', 'propanal', q3_d),
              ('e', 'CH3-CH2-COO-CH2-CH2-CH2-CH3', 'propanoate de butyle', q3_e), ('f', 'CH3-CHCl-CH2-CH3', '2-chlorobutane', q3_f),
              ('g', 'CH3-CO-NH-CH3', 'N-méthyléthanamide', q3_g), ('h', 'CH3-CH(CH3)-CH(CH3)-CH2-CH3', '2,3-diméthylpentane', q3_h),
              ('i', 'C6H10(CH3)2', '1,4-diméthylcyclohexane', q3_i), ('j', 'CH3-CH2-CH(NH2)-CH3', 'butan-2-amine', q3_j),
              ('k', 'CH3-C(CH3)=CH-CH2-CH3', '2-méthylpent-2-ène', q3_k), ('l', 'CH3-CHCl-CH(CH3)-CH3', '2-chloro-3-méthylbutane', q3_l)]
def etendue(at):
    # étendue horizontale d'une molécule, étiquettes comprises
    bord = {'OH': (0.2, 1.0), 'NH2': (0.2, 1.3), 'HO': (1.0, 0.2), 'H2N': (1.2, 0.2), 'O': (0.3, 0.3), 'Cl': (0.35, 0.45), 'NH': (0.3, 0.3), '': (0.05, 0.05)}
    return min(x - bord[e][0] for x, y, e in at.values()), max(x + bord[e][1] for x, y, e in at.values())
def fig_q3_c():
    CW, RH = 7.6, 4.35
    fig, ax = toile((0.0, 4 * CW), (-3 * RH + 1.95, 2.45), ech=0.235)
    for k, (lettre, semi, nom, dessin) in enumerate(Q3_ESPECES):
        cx, y = (k % 4 + 0.5) * CW, -(k // 4) * RH
        at, li, nums = dessin(0.0, 0.0)
        x0, x1 = etendue(at)
        at, li, nums = dessin(cx - (x0 + x1) / 2, y)
        verifie(at, li, semi); mol(ax, at, li)
        for cle, t, pos in nums:
            px, py = at[cle][:2]
            if pos == 'in':
                c = np.mean([at['r%d' % j][:2] for j in range(6)], axis=0); px, py = c + 0.62 * (np.array([px, py]) - c)
                texte(ax, px, py, t, fs=8, color=CUIVRE)
            else: texte(ax, px, py + (0.4 if pos == 'h' else -0.4), t, fs=8, color=CUIVRE)
        if lettre == 'e':
            xa = np.mean([at[c][0] for c in ('a3', 'a2', 'a1')]); xb = np.mean([at[c][0] for c in ('b1', 'b2', 'b3', 'b4')])
            texte(ax, xa, y - 0.5, 'propanoate', fs=8, color=GRIS); texte(ax, xb, y - 0.5, 'butyle', fs=8, color=GRIS)
        etiq(ax, cx, y - 1.75, '%s. %s' % (lettre, nom), fs=9.5)
    save(fig, 'fig_q3_c')

Q4_ESPECES = [('a', 'CH3-CH2-CH2-CH2-OH', 'butan-1-ol'), ('b', 'CH3-CH(OH)-CH2-CH3', 'butan-2-ol'), ('c', 'CH3-CH(CH3)-CH2-OH', '2-méthylpropan-1-ol'),
              ('d', 'CH3-CH2-O-CH2-CH3', 'éthoxyéthane'), ('e', 'CH3-CH2-CH2-CHO', 'butanal'), ('f', 'CH3-CO-CH2-CH3', 'butanone'),
              ('g', 'CH3-CH=CH-CH3', '(E)-but-2-ène'), ('h', 'CH3-CH=CH-CH3', '(Z)-but-2-ène')]
def q4_dessin(lettre, x, y):
    # mêmes dessins que les figures 4 et 5 de l'énoncé (fig_isomeres, fig_ze)
    if lettre in 'abcdef':
        n = 3 if lettre == 'c' else (5 if lettre == 'd' else 4)
        z = zigzag(n, x, y); at = {str(k): z[k] + ('',) for k in range(n)}; li = [(str(k), str(k + 1), 1) for k in range(n - 1)]
        if lettre == 'a': at['o'] = pas(z[3], -30) + ('OH',); li.append(('3', 'o', 1))
        if lettre == 'b': at['o'] = pas(z[1], 90) + ('OH',); li.append(('1', 'o', 1))
        if lettre == 'c': at['m'] = pas(z[1], 90) + ('',); at['o'] = pas(z[2], 30) + ('OH',); li += [('1', 'm', 1), ('2', 'o', 1)]
        if lettre == 'd': at['2'] = z[2] + ('O',)
        if lettre == 'e': at['o'] = pas(z[3], -30) + ('O',); li.append(('3', 'o', 2))
        if lettre == 'f': at['o'] = pas(z[1], 90) + ('O',); li.append(('1', 'o', 2))
        return at, li
    if lettre == 'g':   # méthyles de part et d'autre de la double liaison
        at = {'c1': (x, y - 0.5, ''), 'c2': (x + C30, y, ''), 'c3': (x + 2 * C30, y - 0.5, ''), 'c4': (x + 3 * C30, y, '')}
        return at, [('c1', 'c2', 1), ('c2', 'c3', 2, -1), ('c3', 'c4', 1)]
    at = {'c2': (x + 0.5, y - 0.2, ''), 'c3': (x + 1.5, y - 0.2, ''), 'c1': (x, y + 0.67, ''), 'c4': (x + 2.0, y + 0.67, '')}   # h : méthyles du même côté
    return at, [('c1', 'c2', 1), ('c2', 'c3', 2, 1), ('c3', 'c4', 1)]
def fig_isomeres_c():
    CW, RH = 6.4, 4.9
    fig, ax = toile((-0.2, 4 * CW + 0.2), (-RH - 2.3, 2.75), ech=0.235)
    for k, (lettre, semi, nom) in enumerate(Q4_ESPECES):
        cx, y = (k % 4 + 0.5) * CW, -(k // 4) * RH
        at, li = q4_dessin(lettre, 0.0, 0.0); x0, x1 = etendue(at)
        at, li = q4_dessin(lettre, cx - (x0 + x1) / 2, y)
        verifie(at, li, semi); mol(ax, at, li)
        etiq(ax, cx, y - 1.25, '%s. %s' % (lettre, nom), fs=9.5)
    # en-têtes : groupes d'isomères de même formule brute
    for g0, g1, y, t in ((0, 4, 2.25, 'formule brute C$_4$H$_{10}$O'), (0, 2, 2.25 - RH, 'formule brute C$_4$H$_8$O'), (2, 4, 2.25 - RH, 'formule brute C$_4$H$_8$')):
        ax.plot([g0 * CW + 0.5, g1 * CW - 0.5], [y - 0.38, y - 0.38], color=GRISC, lw=1.0, zorder=2)
        texte(ax, (g0 + g1) / 2 * CW, y, t, fs=9.5)
    save(fig, 'fig_isomeres_c')

# --- Exercice 1 : deux esters isomères (énoncé) et l'éthanoate de 3-méthylbutyle (corrigé)
def ethanoate(x0, y0, n_alkyle, branche=None):
    z = zigzag(3 + n_alkyle, x0, y0)
    at = {'m': z[0] + ('',), 'c': z[1] + ('',), 'o': z[2] + ('O',), 'od': pas(z[1], 90) + ('O',)}
    li = [('m', 'c', 1), ('c', 'od', 2), ('c', 'o', 1)]
    prec = 'o'
    for k in range(n_alkyle):
        at['a%d' % k] = z[3 + k] + ('',); li.append((prec, 'a%d' % k, 1)); prec = 'a%d' % k
    if branche is not None:
        at['b'] = pas(z[3 + branche], 90) + ('',); li.append(('a%d' % branche, 'b', 1))
    return at, li
def fig_ex1_esters():
    fig, ax = toile((-0.7, 15.9), (-1.85, 2.0))
    # A : pentanoate d'éthyle
    z = zigzag(8, 0.0, 0.0)
    at = {'c5': z[0] + ('',), 'c4': z[1] + ('',), 'c3': z[2] + ('',), 'c2': z[3] + ('',), 'c1': z[4] + ('',), 'o': z[5] + ('O',), 'e1': z[6] + ('',), 'e2': z[7] + ('',)}
    at['od'] = pas(z[4], -90) + ('O',)
    mol(ax, at, [('c5', 'c4', 1), ('c4', 'c3', 1), ('c3', 'c2', 1), ('c2', 'c1', 1), ('c1', 'od', 2), ('c1', 'o', 1), ('o', 'e1', 1), ('e1', 'e2', 1)])
    texte(ax, 3.0, -1.55, 'A', fs=11, color=CUIVRE)
    # B : éthanoate de pentyle
    at, li = ethanoate(8.6, 0.0, 5); mol(ax, at, li)
    texte(ax, 11.6, -1.55, 'B', fs=11, color=CUIVRE)
    save(fig, 'fig_ex1_esters')
def fig_ex1_c():
    fig, ax = toile((-0.6, 6.0), (-0.75, 2.05))
    at, li = ethanoate(0.0, 0.0, 4, branche=2); mol(ax, at, li)
    save(fig, 'fig_ex1_c')

# ---------------------------------------------------------------- schémas de Lewis (exercice 2)
def at_(ax, x, y, s, fs=14, color=ANTH):
    ax.text(x, y, s, fontsize=fs, ha='center', va='center', color=color, zorder=5)
def liaison(ax, a, b, ordre=1, r=0.24, ecart=0.07, color=ANTH, ra=None, rb=None):
    a = np.array(a, float); b = np.array(b, float); u = (b - a) / np.linalg.norm(b - a); n = np.array([-u[1], u[0]])
    p, q = a + u * (ra if ra is not None else r), b - u * (rb if rb is not None else r)
    for d in ([0] if ordre == 1 else [-ecart, ecart]):
        ax.plot([p[0] + d * n[0], q[0] + d * n[0]], [p[1] + d * n[1], q[1] + d * n[1]], color=color, lw=1.4, solid_capstyle='round', zorder=4)
def doublet(ax, x, y, ang, r=0.32, L=0.17):
    a = np.radians(ang); c = np.array([x + r * np.cos(a), y + r * np.sin(a)]); t = np.array([-np.sin(a), np.cos(a)])
    ax.plot([c[0] - L / 2 * t[0], c[0] + L / 2 * t[0]], [c[1] - L / 2 * t[1], c[1] + L / 2 * t[1]], color=ANTH, lw=1.4, zorder=4)
    return c
def charge(ax, x, y, signe, color=ANTH):
    ax.text(x, y, '−' if signe < 0 else '+', fontsize=9, ha='center', va='center', color=color, zorder=6,
            bbox=dict(boxstyle='circle,pad=0.08', fc='white', ec=color, lw=0.9))
def fleche_bezier(ax, p0, c, p2, color=BRIQUE, L=0.17, W=0.065):
    p0, c, p2 = (np.array(v, float) for v in (p0, c, p2))
    t = np.linspace(0, 1, 200)[:, None]
    pts = (1 - t) ** 2 * p0 + 2 * t * (1 - t) * c + t ** 2 * p2
    garde = np.linalg.norm(pts - p2, axis=1) >= L * 0.8
    ax.plot(pts[garde, 0], pts[garde, 1], color=color, lw=1.3, solid_capstyle='round', zorder=7)
    u = (p2 - c) / np.linalg.norm(p2 - c); n = np.array([-u[1], u[0]]); b = p2 - L * u
    ax.add_patch(plt.Polygon([p2, b + W * n, b - W * n], closed=True, fc=color, ec=color, lw=0.6, zorder=7))
def fig_ex2_meca(corrige):
    fig, ax = toile((-0.4, 11.5), (-1.6, 1.95), ech=0.40)
    # amine R1-NH2 : doublet non liant de l'azote tourné vers la droite
    xn = 1.25
    at_(ax, 0.3, 0, 'R$_1$', fs=12); at_(ax, xn, 0, 'N'); at_(ax, xn, 0.82, 'H'); at_(ax, xn, -0.82, 'H')
    liaison(ax, (0.3, 0), (xn, 0), ra=0.3); liaison(ax, (xn, 0), (xn, 0.82)); liaison(ax, (xn, 0), (xn, -0.82))
    dN = doublet(ax, xn, 0, 0)
    at_(ax, 2.35, -0.05, '+', fs=14)
    # acide carboxylique R2-COOH : C trigonal, O du groupe C=O en haut, R2 en bas à gauche, O-H en bas à droite
    # doublets non liants placés loin des liaisons : à 120° de la double liaison pour l'oxygène du groupe C=O (à 30° et 150°),
    # dans les deux secteurs libres pour l'oxygène du groupe O-H, dont les liaisons partent vers C (150°) et vers H (321°)
    xc = 3.95
    at_(ax, xc, 0, 'C'); at_(ax, xc, 0.95, 'O'); liaison(ax, (xc, 0), (xc, 0.95), ordre=2)
    doublet(ax, xc, 0.95, 30); doublet(ax, xc, 0.95, 150)
    at_(ax, xc - 0.9, -0.5, 'R$_2$', fs=12); liaison(ax, (xc, 0), (xc - 0.9, -0.5), rb=0.32)
    xo, yo = xc + 0.82, -0.47
    at_(ax, xo, yo, 'O'); at_(ax, xo + 0.62, yo - 0.5, 'H'); liaison(ax, (xc, 0), (xo, yo)); liaison(ax, (xo, yo), (xo + 0.62, yo - 0.5))
    doublet(ax, xo, yo, 60); doublet(ax, xo, yo, 240)
    ax.annotate('', xy=(6.75, 0.0), xytext=(5.75, 0.0), arrowprops=dict(arrowstyle='-|>', color=ANTH, lw=1.3, mutation_scale=13))
    # intermédiaire tétraédrique : N chargé +, O chargé -
    xc2, xn2 = 9.6, 8.65
    at_(ax, xc2, 0, 'C'); at_(ax, xc2, 0.95, 'O'); liaison(ax, (xc2, 0), (xc2, 0.95))
    for a in (30, 90, 150): doublet(ax, xc2, 0.95, a)
    charge(ax, xc2 + 0.62, 1.22, -1)
    at_(ax, xc2, -0.95, 'O'); at_(ax, xc2 + 0.7, -1.35, 'H'); liaison(ax, (xc2, 0), (xc2, -0.95)); liaison(ax, (xc2, -0.95), (xc2 + 0.7, -1.35))
    doublet(ax, xc2, -0.95, 175); doublet(ax, xc2, -0.95, 255)
    at_(ax, xc2 + 0.95, 0.0, 'R$_2$', fs=12); liaison(ax, (xc2, 0), (xc2 + 0.95, 0), rb=0.32)
    at_(ax, xn2, 0, 'N'); liaison(ax, (xn2, 0), (xc2, 0))
    at_(ax, xn2, 0.82, 'H'); at_(ax, xn2, -0.82, 'H'); liaison(ax, (xn2, 0), (xn2, 0.82)); liaison(ax, (xn2, 0), (xn2, -0.82))
    charge(ax, xn2 - 0.36, 0.4, +1)
    at_(ax, xn2 - 0.95, 0, 'R$_1$', fs=12); liaison(ax, (xn2 - 0.95, 0), (xn2, 0), ra=0.3)
    if corrige:
        texte(ax, xc + 0.38, 0.1, 'δ+', fs=9, color=BLEU); texte(ax, xc - 0.62, 0.86, 'δ−', fs=9, color=BLEU)
        # flèche 1 : du doublet de N vers l'atome de carbone ; flèche 2 : de la double liaison C=O vers l'atome d'oxygène (côté droit, sous le doublet à 30°)
        fleche_bezier(ax, (dN[0] + 0.06, dN[1] + 0.1), (2.6, 1.15), (xc - 0.21, 0.16))
        fleche_bezier(ax, (xc + 0.12, 0.42), (xc + 0.78, 0.5), (xc + 0.3, 0.84))
    save(fig, 'fig_ex2_meca' + ('_c' if corrige else ''))

# --- Exercice 2 : formation de l'aspartame
def plus(ax, x, y): texte(ax, x, y, '+', fs=15)
def acide_aspartique(x0, y0):
    # HOOC-CH2-CH(NH2)-COOH, le groupe carboxyle voisin du groupe amine (c1) tourné vers la droite
    z = zigzag(4, x0, y0)
    at = {'c4': z[0] + ('',), 'c3': z[1] + ('',), 'c2': z[2] + ('',), 'c1': z[3] + ('',)}
    at['o4'] = pas(z[0], 270) + ('O',); at['oh4'] = pas(z[0], 150) + ('HO',); at['n'] = pas(z[2], 270) + ('NH2',)
    at['o1'] = pas(z[3], 90) + ('O',); at['oh1'] = pas(z[3], -30) + ('OH',)
    li = [('c4', 'c3', 1), ('c3', 'c2', 1), ('c2', 'c1', 1), ('c4', 'o4', 2), ('c4', 'oh4', 1), ('c2', 'n', 1), ('c1', 'o1', 2), ('c1', 'oh1', 1)]
    return at, li
def phe_methylee(x0, y0):
    # H2N-CH(CH2-C6H5)-CO-O-CH3, dessinée comme dans l'aspartame : groupe amine à gauche, groupe benzyle vers le haut, ester à droite
    n = (x0, y0); ca = pas(n, 30); cc = pas(ca, -30); o = pas(cc, 30); m = pas(o, -30); cb = pas(ca, 90)
    at = {'n': n + ('H2N',), 'ca': ca + ('',), 'cc': cc + ('',), 'o': o + ('O',), 'm': m + ('',), 'od': pas(cc, 270) + ('O',), 'cb': cb + ('',)}
    li = [('n', 'ca', 1), ('ca', 'cc', 1), ('cc', 'o', 1), ('o', 'm', 1), ('cc', 'od', 2), ('ca', 'cb', 1)]
    benzene(at, li, 'r', pas(pas(cb, 30), 30), ang0=210); li.append(('cb', 'r0', 1))
    return at, li
def aspartame(x0, y0):
    # la liaison amide relie le groupe carboxyle c1 de l'acide aspartique au groupe amine de la phénylalanine méthylée
    z = zigzag(9, x0, y0)
    at = {'c4': z[0] + ('',), 'c3': z[1] + ('',), 'c2': z[2] + ('',), 'c1': z[3] + ('',), 'n': z[4] + ('NH',), 'ca': z[5] + ('',), 'cc': z[6] + ('',), 'o': z[7] + ('O',), 'm': z[8] + ('',)}
    at['o4'] = pas(z[0], 270) + ('O',); at['oh4'] = pas(z[0], 150) + ('HO',); at['n2'] = pas(z[2], 270) + ('NH2',); at['o1'] = pas(z[3], 90) + ('O',)
    at['od'] = pas(z[6], 270) + ('O',); at['cb'] = pas(z[5], 90) + ('',)
    li = [('c4', 'c3', 1), ('c3', 'c2', 1), ('c2', 'c1', 1), ('c1', 'n', 1), ('n', 'ca', 1), ('ca', 'cc', 1), ('cc', 'o', 1), ('o', 'm', 1),
          ('c4', 'o4', 2), ('c4', 'oh4', 1), ('c2', 'n2', 1), ('c1', 'o1', 2), ('cc', 'od', 2), ('ca', 'cb', 1)]
    benzene(at, li, 'r', pas(pas(at['cb'][:2], 30), 30), ang0=210); li.append(('cb', 'r0', 1))
    return at, li
def fig_ex2_molecules():
    # équation sur une seule ligne : réactifs, flèche, produits ; même échelle que les figures des exercices 3 et 5
    fig, ax = toile((-1.9, 24.6), (-2.45, 3.75), ech=0.235)
    at, li = acide_aspartique(0.0, 0.0); verifie(at, li, 'HOOC-CH2-CH(NH2)-COOH'); mol(ax, at, li, r=0.3)
    etiq(ax, 1.3, -1.95, 'acide aspartique', fs=10)
    plus(ax, 5.0, 0.25)
    at, li = phe_methylee(6.85, 0.0); verifie(at, li, 'H2N-CH(CH2-C6H5)-COO-CH3'); mol(ax, at, li, r=0.3)
    etiq(ax, 8.0, -1.95, 'phénylalanine méthylée', fs=10)
    fleche_reaction(ax, 10.95, 12.85, 0.25)
    at, li = aspartame(14.95, 0.0); verifie(at, li, 'HOOC-CH2-CH(NH2)-CO-NH-CH(CH2-C6H5)-COO-CH3'); mol(ax, at, li, r=0.3, dnh=0.5)
    etiq(ax, 18.4, -1.95, 'aspartame', fs=10)
    plus(ax, 22.55, 0.25); texte(ax, 23.75, 0.25, 'H$_2$O', fs=12)
    save(fig, 'fig_ex2_molecules')

# --- Exercice 3 : de l'aldéhyde A à la frambinone
def phenol_chaine(x0, y0, motif):
    # cycle benzénique (sommets pointus à gauche et à droite), HO à gauche, chaîne à droite
    at, li = {}, []
    pts = benzene(at, li, 'r', (x0, y0), ang0=0)
    at['oh'] = pas(pts[3], 180) + ('HO',); li.append(('r3', 'oh', 1))
    c1 = pas(pts[0], 30)
    if motif == 'aldehyde':
        at['c1'] = c1 + ('',); at['o'] = pas(c1, -30) + ('O',); li += [('r0', 'c1', 1), ('c1', 'o', 2)]
    else:
        c2 = pas(c1, -30); c3 = pas(c2, 30); c4 = pas(c3, -30)
        at.update({'c1': c1 + ('',), 'c2': c2 + ('',), 'c3': c3 + ('',), 'c4': c4 + ('',), 'o': pas(c3, 90) + ('O',)})
        li += [('r0', 'c1', 1), ('c1', 'c2', 2, 1) if motif == 'enone' else ('c1', 'c2', 1), ('c2', 'c3', 1), ('c3', 'c4', 1), ('c3', 'o', 2)]
    return at, li
def fig_ex3_sequence():
    fig, ax = toile((-3.2, 25.9), (-1.85, 2.15), ech=0.235)
    at, li = phenol_chaine(0.0, 0.0, 'aldehyde'); mol(ax, at, li); etiq(ax, 0.6, -1.55, 'A', fs=11)
    fleche_reaction(ax, 3.5, 6.4, 0.0, haut='propanone', bas='HO$^-$ (aq)')
    at, li = phenol_chaine(9.8, 0.0, 'enone'); mol(ax, at, li); etiq(ax, 11.1, -1.55, 'B', fs=11)
    fleche_reaction(ax, 14.75, 17.6, 0.0, haut='H$_2$', bas='catalyseur')
    at, li = phenol_chaine(21.0, 0.0, 'cetone'); mol(ax, at, li); etiq(ax, 22.3, -1.55, 'frambinone', fs=11)
    save(fig, 'fig_ex3_sequence')

# --- Exercice 5 : synthèse de la coumarine A
def fig_ex5_equation():
    fig, ax = toile((-3.0, 25.2), (-2.45, 2.55), ech=0.235)
    # résorcinol : deux groupes hydroxyle en position 1,3
    at, li = {}, []
    pts = benzene(at, li, 'r', (0.0, 0.0), ang0=90)
    at['oh1'] = pas(pts[2], 210) + ('HO',); li.append(('r2', 'oh1', 1))
    at['oh2'] = pas(pts[4], 330) + ('OH',); li.append(('r4', 'oh2', 1))
    mol(ax, at, li); etiq(ax, 0.0, -1.85, 'résorcinol', fs=10)
    plus(ax, 3.6, 0.0)
    # acétoacétate d'éthyle : CH3-CO-CH2-CO-O-CH2-CH3
    z = zigzag(7, 4.7, -0.25)
    at = {'1': z[0] + ('',), '2': z[1] + ('',), '3': z[2] + ('',), '4': z[3] + ('',), 'o': z[4] + ('O',), '6': z[5] + ('',), '7': z[6] + ('',),
          'o2': pas(z[1], 90) + ('O',), 'o4': pas(z[3], 90) + ('O',)}
    mol(ax, at, [('1', '2', 1), ('2', '3', 1), ('3', '4', 1), ('4', 'o', 1), ('o', '6', 1), ('6', '7', 1), ('2', 'o2', 2), ('4', 'o4', 2)])
    etiq(ax, 7.3, -1.85, "acétoacétate d'éthyle", fs=10)
    fleche_reaction(ax, 10.6, 12.6, 0.0, haut='APTS')
    # 7-hydroxy-4-méthylcoumarine
    cx, cy = 15.0, 0.0
    at, li = {}, []
    v = cycle6((cx, cy), 90)                 # cycle benzénique : v[0] haut, v[4] (330°) et v[5] (30°) communs aux deux cycles
    for k, p in enumerate(v): at['b%d' % k] = (p[0], p[1], '')
    for k, d in zip(range(6), (2, 1, 2, 1, 2, 1)):
        li.append(('b%d' % k, 'b%d' % ((k + 1) % 6), 2, 1) if d == 2 else ('b%d' % k, 'b%d' % ((k + 1) % 6), 1))
    w = cycle6((cx + 2 * C30, cy), 90)       # cycle de la lactone : w[3] = O, w[4] = C2, w[5] = C3, w[0] = C4
    at['O1'] = (w[3][0], w[3][1], 'O'); at['C2'] = (w[4][0], w[4][1], ''); at['C3'] = (w[5][0], w[5][1], ''); at['C4'] = (w[0][0], w[0][1], '')
    li += [('b4', 'O1', 1), ('O1', 'C2', 1), ('C2', 'C3', 1), ('C3', 'C4', 2, 1), ('C4', 'b5', 1)]
    at['Od'] = pas(w[4], -30) + ('O',); li.append(('C2', 'Od', 2))
    at['me'] = pas(w[0], 90) + ('',); li.append(('C4', 'me', 1))
    at['oh'] = pas(v[2], 210) + ('HO',); li.append(('b2', 'oh', 1))
    mol(ax, at, li); etiq(ax, cx + 0.9, -1.85, 'composé A', fs=10)
    plus(ax, 20.4, 0.0); texte(ax, 21.75, 0.0, 'H$_2$O', fs=12); plus(ax, 23.1, 0.0); texte(ax, 24.1, 0.0, 'X', fs=12)
    save(fig, 'fig_ex5_equation')

# ---------------------------------------------------------------- verrerie
VERRE = dict(fc='white', ec=ANTH, lw=1.4)
def contour(ax, pts, fc='white', ec=ANTH, lw=1.4, z=3, ferme=True):
    ax.add_patch(Polygon(pts, closed=ferme, fc=fc if ferme else 'none', ec=ec, lw=lw, zorder=z, joinstyle='round'))
def contour_ouvert(ax, pts, fc='white', z=3):
    # surface remplie, mais contour tracé sans le segment de fermeture (extrémité ouverte entre le dernier point et le premier)
    ax.add_patch(Polygon(pts, closed=True, fc=fc, ec='none', zorder=z))
    p = np.array(pts); ax.plot(p[:, 0], p[:, 1], color=ANTH, lw=1.4, zorder=z + 1, solid_capstyle='round', solid_joinstyle='round')
def courbe(ax, pts, color=ANTH, lw=1.4, z=4):
    pts = np.array(pts); ax.plot(pts[:, 0], pts[:, 1], color=color, lw=lw, zorder=z, solid_capstyle='round', solid_joinstyle='round')
def arc_pts(c, r, a0, a1, n=60):
    t = np.radians(np.linspace(a0, a1, n)); return [(c[0] + r * np.cos(u), c[1] + r * np.sin(u)) for u in t]
def ballon(ax, cx, cy, r, col, niveau, ponce=True):
    # ballon à fond rond : sphère + col ; niveau = hauteur du liquide par rapport au centre
    dcol = 0.24; a = np.degrees(np.arcsin(dcol / r))
    pts = arc_pts((cx, cy), r, 90 + a, 450 - a)
    pts = [(cx + dcol, cy + r + col)] + pts[::-1] + [(cx - dcol, cy + r + col)]
    pts = arc_pts((cx, cy), r, 90 - a, -270 + a)
    corps = [(cx + dcol, cy + r * np.cos(np.radians(a)) + col)] + pts + [(cx - dcol, cy + r * np.cos(np.radians(a)) + col)]
    contour_ouvert(ax, corps, fc='white', z=3)
    # liquide : segment de disque sous la corde y = cy + niveau
    b = np.degrees(np.arcsin(niveau / r))
    liq = arc_pts((cx, cy), r * 0.985, b, 180 - b, 2)[::-1]
    liq = arc_pts((cx, cy), r * 0.985, 180 - b, 360 + b)
    ax.add_patch(Polygon(liq, closed=True, fc=EAU, ec='none', zorder=3.2))
    if ponce:
        for dx, dy in ((-0.35, -0.72), (0.05, -0.82), (0.4, -0.7), (-0.1, -0.6)):
            ax.add_patch(Circle((cx + dx * r, cy + dy * r), 0.07, fc=GRIS, ec='none', zorder=3.4))
    return cx, cy + r * np.cos(np.radians(a)) + col
def chauffe_ballon(ax, cx, cy, r):
    # coque en demi-sphère sous le ballon
    ext = arc_pts((cx, cy), r + 0.45, 180, 360)
    inter = arc_pts((cx, cy), r + 0.08, 360, 180)
    contour(ax, ext + inter, fc=GRISM, z=2)
    ax.add_patch(Rectangle((cx - r - 0.75, cy - r - 0.95), 2 * r + 1.5, 0.5, fc=GRISC, ec=ANTH, lw=1.2, zorder=2))
def refrigerant_boules(ax, x, y0, y1, nb=4, w=0.22, wb=0.42, wj=0.62):
    # tube intérieur à boules et manchon d'eau
    contour(ax, [(x - wj, y0 + 0.35), (x + wj, y0 + 0.35), (x + wj, y1 - 0.35), (x - wj, y1 - 0.35)], fc=EAU, z=2.5)
    h = (y1 - y0 - 0.9) / nb
    gauche, droite = [(x - w, y0)], [(x + w, y0)]
    for k in range(nb):
        yc = y0 + 0.45 + h * (k + 0.5)
        for t in np.linspace(-1, 1, 21):
            gauche.append((x - w - (wb - w) * np.cos(t * np.pi / 2), yc + t * h / 2))
            droite.append((x + w + (wb - w) * np.cos(t * np.pi / 2), yc + t * h / 2))
    gauche.append((x - w, y1)); droite.append((x + w, y1))
    ax.add_patch(Polygon(gauche + droite[::-1], closed=True, fc='white', ec='none', zorder=3))
    courbe(ax, gauche, z=4); courbe(ax, droite, z=4)       # tube ouvert en haut et en bas
def eau_fleche(ax, x0, y0, x1, y1, color=BLEU):
    ax.annotate('', xy=(x1, y1), xytext=(x0, y0), arrowprops=dict(arrowstyle='-|>', color=color, lw=1.3, mutation_scale=11), zorder=6)
def repere(ax, x, y, tx, ty, t, num=None, ha='left', fs=9.5):
    # trait de rappel du point (x, y) vers l'étiquette (tx, ty) ; num : numéro cerclé (énoncé) au lieu du texte
    ax.plot([x, tx], [y, ty], color=GRIS, lw=0.8, zorder=6)
    if num is not None:
        ax.text(tx + (0.25 if ha == 'left' else -0.25), ty, str(num), fontsize=9, ha='center', va='center', color=CUIVRE, zorder=7,
                bbox=dict(boxstyle='circle,pad=0.18', fc='white', ec=CUIVRE, lw=0.9))
    else:
        texte(ax, tx + (0.12 if ha == 'left' else -0.12), ty, t, fs=fs, ha=ha)
def fig_reflux(corrige):
    fig, ax = toile((-7.4, 9.4), (-2.3, 10.0), ech=0.26)
    cx, cy, r = 0.0, 0.0, 1.25
    chauffe_ballon(ax, cx, cy, r)
    xt, yt = ballon(ax, cx, cy, r, 0.55, 0.15)
    refrigerant_boules(ax, xt, yt, yt + 7.4)
    # tubulures d'eau : entrée en bas, sortie en haut
    ax.plot([0.62, 1.45], [yt + 0.75, yt + 0.75], color=ANTH, lw=1.4, zorder=3); ax.plot([0.62, 1.45], [yt + 1.0, yt + 1.0], color=ANTH, lw=1.4, zorder=3)
    ax.plot([-0.62, -1.45], [yt + 6.4, yt + 6.4], color=ANTH, lw=1.4, zorder=3); ax.plot([-0.62, -1.45], [yt + 6.65, yt + 6.65], color=ANTH, lw=1.4, zorder=3)
    eau_fleche(ax, 2.6, yt + 0.875, 1.5, yt + 0.875); eau_fleche(ax, -1.5, yt + 6.525, -2.6, yt + 6.525)
    n = (lambda k: k) if not corrige else (lambda k: None)
    repere(ax, 0.45, yt + 4.0, 3.0, yt + 4.0, 'réfrigérant à boules', n(1))
    repere(ax, 2.6, yt + 0.875, 3.0, yt + 1.6, 'entrée d\'eau', n(2))
    repere(ax, -2.6, yt + 6.525, -2.9, yt + 7.3, 'sortie d\'eau', n(3), ha='right')
    repere(ax, 0.95, 0.75, 3.0, 0.95, 'ballon', n(4))
    repere(ax, 0.45, -0.75, 3.0, -0.35, 'mélange réactionnel\net pierre ponce', n(5))
    repere(ax, -1.55, -0.9, -2.9, -0.2, 'chauffe-ballon', n(6), ha='right')
    save(fig, 'fig_reflux' + ('_c' if corrige else ''))

def fig_ampoule():
    fig, ax = toile((-6.2, 10.0), (-3.2, 8.4), ech=0.26)
    # corps en poire : col en haut (bouchon), robinet et tige en bas
    def bord(t):     # demi-largeur du corps en fonction de la hauteur t (0 en bas, 1 en haut)
        return 0.22 + 1.45 * np.sin(np.pi * np.clip(t, 0, 1) ** 0.75) * (1 - 0.35 * t)
    y0, y1 = 1.0, 6.4
    ys = np.linspace(y0, y1, 80); ws = bord((ys - y0) / (y1 - y0))
    droite = list(zip(ws, ys)); gauche = list(zip(-ws, ys))[::-1]
    corps = [(0.22, 6.4), (0.22, 7.05)] [::-1] + droite[::-1] + [(0.12, y0 - 0.0), (0.12, -0.2)][::-1]
    # liquides : phase aqueuse en bas, phase organique au-dessus
    ym = 3.55; yh = 5.2
    yi = np.linspace(y0 + 0.02, ym, 40); wi = bord((yi - y0) / (y1 - y0)) - 0.04
    ax.add_patch(Polygon(list(zip(-wi, yi)) + list(zip(wi, yi))[::-1], closed=True, fc=EAU, ec='none', zorder=2))
    yo = np.linspace(ym, yh, 40); wo = bord((yo - y0) / (y1 - y0)) - 0.04
    ax.add_patch(Polygon(list(zip(-wo, yo)) + list(zip(wo, yo))[::-1], closed=True, fc=ORGA, ec='none', zorder=2))
    ax.plot([-bord((ym - y0) / (y1 - y0)) + 0.04, bord((ym - y0) / (y1 - y0)) - 0.04], [ym, ym], color=GRIS, lw=0.9, zorder=2.5)
    courbe(ax, [(0.22, 7.0)] + [(w, y) for w, y in zip(ws[::-1], ys[::-1])][::-1][::-1] + [(0.12, y0)])
    courbe(ax, list(zip(ws, ys))[::-1] + [(0.12, y0)])
    courbe(ax, list(zip(-ws, ys))[::-1] + [(-0.12, y0)])
    courbe(ax, [(0.22, 6.4), (0.22, 7.05)]); courbe(ax, [(-0.22, 6.4), (-0.22, 7.05)])
    ax.add_patch(Rectangle((1.0, 7.5), 0.6, 0.5, fc=GRISC, ec=ANTH, lw=1.2, zorder=4))            # bouchon retiré, posé à côté du col
    courbe(ax, [(0.12, y0), (0.12, -0.6)]); courbe(ax, [(-0.12, y0), (-0.12, -0.6)])
    ax.add_patch(Rectangle((-0.5, 0.25), 1.0, 0.36, fc=GRISC, ec=ANTH, lw=1.2, zorder=4))          # robinet
    courbe(ax, [(0.12, -0.6), (0.06, -1.1)]); courbe(ax, [(-0.12, -0.6), (-0.06, -1.1)])
    # anneau et support
    ax.plot([-1.75, 1.75], [2.35, 2.35], color=GRIS, lw=3.0, zorder=1.5, solid_capstyle='round')
    ax.plot([-1.75, -4.2], [2.35, 2.35], color=GRIS, lw=1.6, zorder=1.4); ax.plot([-4.2, -4.2], [-3.0, 7.6], color=GRIS, lw=2.2, zorder=1.4)
    # bécher sous l'ampoule
    contour(ax, [(-1.05, -1.25), (-1.05, -2.9), (1.05, -2.9), (1.05, -1.25)], fc='none', ferme=False)
    ax.add_patch(Rectangle((-1.0, -2.85), 2.0, 0.55, fc=EAU, ec='none', zorder=2))
    repere(ax, 1.25, 4.4, 3.2, 5.4, 'phase organique,\nla moins dense :\ncyclohexane et ester')
    repere(ax, 1.3, 2.4, 3.2, 2.3, 'phase aqueuse,\nla plus dense :\neau et acides')
    repere(ax, 0.5, 0.43, 3.2, 0.43, 'robinet')
    repere(ax, 1.6, 7.75, 3.2, 7.75, 'bouchon retiré')
    save(fig, 'fig_ampoule')

def panneau_sous_vide(ax):
    # fiole à vide : erlenmeyer à tubulure latérale
    contour_ouvert(ax, [(-0.45, 2.9), (-0.45, 1.9), (-2.1, -2.6), (2.1, -2.6), (0.45, 1.9), (0.45, 2.9)], fc='white', z=2)
    ax.add_patch(Polygon([(-1.86, -1.95), (1.86, -1.95), (2.04, -2.5), (-2.04, -2.5)], closed=True, fc=EAU, ec='none', zorder=2.2))
    courbe(ax, [(0.45, 2.45), (1.6, 2.45), (1.6, 2.25), (0.5, 2.25)])                                   # tubulure
    ax.plot([1.6, 4.2], [2.35, 2.35], color=GRIS, lw=4.0, zorder=1.5, solid_capstyle='round')           # tuyau vers la trompe
    eau_fleche(ax, 4.2, 2.35, 5.2, 2.35, color=GRIS)
    # joint conique et entonnoir Büchner
    ax.add_patch(Polygon([(-0.62, 3.25), (0.62, 3.25), (0.48, 2.65), (-0.48, 2.65)], closed=True, fc=GRISC, ec=ANTH, lw=1.2, zorder=3))
    contour_ouvert(ax, [(-0.22, 2.75), (-0.22, 3.6), (-1.7, 4.3), (-1.7, 5.7), (1.7, 5.7), (1.7, 4.3), (0.22, 3.6), (0.22, 2.75)], fc='white', z=3.5)
    ax.plot([-1.62, 1.62], [4.35, 4.35], color=ANTH, lw=2.2, zorder=4)                                 # plaque perforée
    for x in np.linspace(-1.3, 1.3, 7): ax.plot([x, x], [4.25, 4.45], color='white', lw=1.0, zorder=4.1)
    ax.add_patch(Rectangle((-1.6, 4.47), 3.2, 0.08, fc=GRIS, ec='none', zorder=4))                      # papier filtre
    rng = np.random.default_rng(3)
    for k in range(60):                                                                                 # cristaux
        x, y = rng.uniform(-1.5, 1.5), rng.uniform(4.6, 5.05)
        ax.add_patch(Polygon([(x - 0.08, y), (x, y + 0.1), (x + 0.08, y), (x, y - 0.1)], closed=True, fc=SABLE, ec=CUIVRE, lw=0.5, zorder=4.2))
    repere(ax, 1.55, 4.85, 3.4, 5.6, 'solide sur le papier filtre')
    repere(ax, 1.62, 4.35, 3.4, 4.5, 'entonnoir Büchner')
    repere(ax, 0.6, 2.95, 3.4, 3.35, 'joint conique')
    repere(ax, 5.2, 2.35, 5.4, 1.5, 'vers la trompe à eau\n(pression réduite)')
    repere(ax, 1.3, -1.2, 3.4, -0.6, 'fiole à vide')
    repere(ax, 0.9, -2.25, 3.4, -2.25, 'filtrat')
    texte(ax, 3.0, -3.5, 'filtration sous vide', fs=10.5, color=CUIVRE)

def panneau_simple(ax):
    # filtration simple : mélange versé dans un entonnoir garni d'un papier filtre plissé, maintenu par un support à anneau
    JET = '#8FB3D1'
    # support : socle, tige, bras et anneau
    ax.add_patch(Rectangle((-4.7, -2.6), 2.2, 0.28, fc=GRIS, ec=ANTH, lw=1.0, zorder=2))
    ax.add_patch(Rectangle((-3.69, -2.32), 0.18, 6.72, fc=GRISC, ec=ANTH, lw=1.0, zorder=2))
    ax.add_patch(Rectangle((-3.51, 4.28), 2.45, 0.2, fc=GRISC, ec=ANTH, lw=1.0, zorder=2))
    ax.add_patch(Rectangle((1.0, 4.28), 0.42, 0.2, fc=GRISC, ec=ANTH, lw=1.0, zorder=2))
    # récipient (bécher) et filtrat
    contour_ouvert(ax, [(-1.5, 1.6), (-1.5, -2.6), (1.5, -2.6), (1.5, 1.6)], fc='white', z=2)
    ax.add_patch(Rectangle((-1.44, -2.54), 2.88, 0.7, fc=EAU, ec='none', zorder=2.2))
    # entonnoir, mélange et papier filtre plissé
    ax.add_patch(Polygon([(-0.2, 0.2), (-0.2, 3.2), (-2.0, 6.0), (2.0, 6.0), (0.2, 3.2), (0.2, 0.2)], closed=True, fc='white', ec='none', zorder=2.5))
    ax.add_patch(Polygon([(-0.2, 3.4), (0.2, 3.4), (1.3, 5.0), (-1.3, 5.0)], closed=True, fc=EAU, ec='none', zorder=2.6))
    courbe(ax, [(-0.2, 3.4), (-1.85, 5.8)], color=GRIS, lw=1.2, z=3); courbe(ax, [(0.2, 3.4), (1.85, 5.8)], color=GRIS, lw=1.2, z=3)
    for x in (-1.1, -0.55, 0.0, 0.55, 1.1): courbe(ax, [(0.0, 3.4), (x * 1.6, 5.8)], color=GRIS, lw=0.5, z=3)
    rng = np.random.default_rng(5)
    for k in range(18):
        y = rng.uniform(3.6, 4.9); hw = 0.2 + (y - 3.4) * 0.6875 - 0.22; x = rng.uniform(-hw, hw)
        ax.add_patch(Polygon([(x - 0.07, y), (x, y + 0.09), (x + 0.07, y), (x, y - 0.09)], closed=True, fc=SABLE, ec=CUIVRE, lw=0.5, zorder=3.2))
    courbe(ax, [(-0.2, 0.2), (-0.2, 3.2), (-2.0, 6.0)], z=3.5); courbe(ax, [(0.2, 0.2), (0.2, 3.2), (2.0, 6.0)], z=3.5)
    for y in (-0.15, -0.9): ax.add_patch(Circle((0.0, y), 0.06, fc=JET, ec='none', zorder=3))
    ax.add_patch(Rectangle((-0.19, 0.2), 0.38, 0.01, fc='white', ec='none', zorder=3.6))
    # bécher incliné qui verse le mélange
    cx, cy, ang = 1.97, 7.09, np.radians(60)
    loc = [(-0.8, -1.0), (0.8, -1.0), (0.8, 1.0), (-0.8, 1.0)]
    mon = [(cx + x * np.cos(ang) - y * np.sin(ang), cy + x * np.sin(ang) + y * np.cos(ang)) for x, y in loc]
    contour_ouvert(ax, [mon[3], mon[0], mon[1], mon[2]], fc='white', z=2)
    ax.add_patch(Polygon([mon[3], mon[0], (3.02, mon[3][1])], closed=True, fc=EAU, ec='none', zorder=2.3))
    courbe(ax, [mon[3], (0.6, 6.55), (0.5, 5.9), (0.5, 5.1)], color=JET, lw=2.0, z=3.3)
    repere(ax, 2.55, 6.55, 3.9, 7.6, 'mélange à filtrer\n(versé)')
    repere(ax, 1.42, 5.1, 3.9, 5.2, 'entonnoir')
    repere(ax, 0.4, 3.8, 3.9, 3.3, 'solide retenu\npar le papier')
    repere(ax, 1.5, -0.8, 3.9, -0.8, 'récipient')
    repere(ax, 0.9, -2.2, 3.9, -2.2, 'filtrat')
    repere(ax, -1.51, 5.3, -2.6, 6.0, 'papier filtre plissé', ha='right')
    repere(ax, -3.0, 4.38, -4.3, 3.4, 'support\net anneau', ha='right')
    texte(ax, 0.0, -3.5, 'filtration simple', fs=10.5, color=CUIVRE)

def fig_buchner():
    # deux panneaux à la même échelle : filtration simple (gauche), filtration sous vide (droite)
    ech = 0.26; xl = (-7.6, 8.6); xr = (-5.6, 11.6); yl = (-4.0, 9.7)
    wl, wr = xl[1] - xl[0], xr[1] - xr[0]
    fig = plt.figure(figsize=((wl + wr) * ech, (yl[1] - yl[0]) * ech))
    for rect, xlim, fn in (([0, 0, wl / (wl + wr), 1], xl, panneau_simple), ([wl / (wl + wr), 0, wr / (wl + wr), 1], xr, panneau_sous_vide)):
        ax = fig.add_axes(rect); ax.set_xlim(*xlim); ax.set_ylim(*yl); ax.set_aspect('equal'); ax.axis('off'); fn(ax)
    fig.add_artist(matplotlib.lines.Line2D([wl / (wl + wr)] * 2, [0.03, 0.97], color=GRISC, lw=1.0))
    save(fig, 'fig_buchner')
def paroi_vigreux(x, y_bas, y_haut, sgn, niveaux, W, creux, h_haut=0.24, h_bas=0.04, chute=0.24):
    # profil d'une paroi de la colonne (sgn = -1 à gauche, +1 à droite), du haut vers le bas : à chaque niveau, le verre est enfoncé
    # vers l'axe en une pointe inclinée vers le bas (bord supérieur raide, bord inférieur presque horizontal), qui s'arrête à creux de l'axe
    pts = [(x + sgn * W, y_haut)]
    for y in sorted(niveaux, reverse=True):
        pts += [(x + sgn * W, y + h_haut), (x + sgn * creux, y - chute), (x + sgn * W, y - h_bas)]
    pts.append((x + sgn * W, y_bas))
    return pts
def fig_distillation():
    fig, ax = toile((-10.8, 16.4), (-3.6, 11.9), ech=0.22)
    cx, cy, r = 0.0, 0.0, 1.25
    chauffe_ballon(ax, cx, cy, r)
    xt, yt = ballon(ax, cx, cy, r, 0.45, 0.1)
    # colonne de Vigreux : tube plus large que le col, raccordé par un cône ; six rangées de pointes de verre, enfoncées par paires
    # jusqu'à près de l'axe et inclinées vers le bas (le liquide condensé s'écoule par leur extrémité)
    W, creux = 0.5, 0.07
    yc0 = yt + 0.5                                   # début de la partie droite de la colonne
    y1 = yc0 + 5.0                                   # fin de la partie à pointes
    niveaux = list(np.linspace(yc0 + 0.6, y1 - 0.45, 6))
    ybras = y1 + 0.8                                 # axe du bras latéral, à la hauteur du réservoir du thermomètre
    yh = ybras + 0.75                                # haut de la tête de colonne
    ang = np.radians(-22); u = np.array([np.cos(ang), np.sin(ang)]); nrm = np.array([-u[1], u[0]])
    a0 = np.array([W, ybras]); L = 6.4; e = 0.18      # demi-épaisseur du bras
    yb_h, yb_b = ybras + e / np.cos(ang), ybras - e / np.cos(ang)   # bords du bras sur la paroi droite
    gauche = [(-W, yh)] + paroi_vigreux(0.0, yc0, y1, -1, niveaux, W, creux)[1:] + [(-0.24, yt + 0.2), (-0.24, yt - 0.02)]
    droite = [(W, yb_b)] + paroi_vigreux(0.0, yc0, y1, 1, niveaux, W, creux) + [(0.24, yt + 0.2), (0.24, yt - 0.02)]
    ax.add_patch(Polygon(gauche + droite[::-1], closed=True, fc='white', ec='none', zorder=2.8))
    courbe(ax, gauche); courbe(ax, droite); courbe(ax, [(W, yb_h), (W, yh)])
    # bouchon de la tête de colonne et thermomètre, réservoir à la hauteur du bras latéral
    ax.add_patch(Rectangle((-W - 0.08, yh), 2 * W + 0.16, 0.42, fc=GRISC, ec=ANTH, lw=1.2, zorder=4))
    ax.add_patch(Rectangle((-0.07, ybras), 0.14, yh + 2.4 - ybras, fc='white', ec=ANTH, lw=1.0, zorder=5))
    ax.add_patch(Circle((0.0, ybras), 0.14, fc=BRIQUE, ec=ANTH, lw=0.8, zorder=5.1))
    # bras latéral vers le réfrigérant droit, incliné vers le bas
    for d in (e, -e):
        p0 = np.array([W, ybras + d / np.cos(ang)]); courbe(ax, [p0, a0 + L * u + d * nrm])
    j0, j1 = a0 + 1.4 * u, a0 + 5.6 * u                      # manchon du réfrigérant
    ax.add_patch(Polygon([j0 + 0.5 * nrm, j1 + 0.5 * nrm, j1 - 0.5 * nrm, j0 - 0.5 * nrm], closed=True, fc=EAU, ec=ANTH, lw=1.3, zorder=2.5))
    for d in (e, -e):
        courbe(ax, [j0 + d * nrm, j1 + d * nrm], z=4)
    ein = j1 - 0.5 * nrm - 0.4 * u; sout = j0 + 0.5 * nrm + 0.4 * u
    courbe(ax, [ein, ein - 0.7 * nrm]); eau_fleche(ax, *(ein - 1.6 * nrm), *(ein - 0.75 * nrm))
    courbe(ax, [sout, sout + 0.7 * nrm]); eau_fleche(ax, *(sout + 0.75 * nrm), *(sout + 1.6 * nrm))
    bout = a0 + L * u
    # erlenmeyer qui recueille le distillat
    xe, ye = bout[0] + 0.1, bout[1] - 0.6
    contour_ouvert(ax, [(xe - 0.35, ye + 0.3), (xe - 0.35, ye - 0.4), (xe - 1.4, ye - 2.9), (xe + 1.4, ye - 2.9), (xe + 0.35, ye - 0.4), (xe + 0.35, ye + 0.3)], fc='white', z=2)
    ax.add_patch(Polygon([(xe - 1.07, ye - 2.1), (xe + 1.07, ye - 2.1), (xe + 1.37, ye - 2.85), (xe - 1.37, ye - 2.85)], closed=True, fc=ORGA, ec='none', zorder=2.2))
    repere(ax, 0.07, yh + 1.7, -2.6, yh + 2.0, 'thermomètre', ha='right')
    repere(ax, -0.12, ybras, -2.6, ybras + 0.45, 'réservoir à la hauteur\ndu bras latéral', ha='right')
    repere(ax, -W, niveaux[4] + 0.5, -2.6, niveaux[4] + 0.5, 'colonne de Vigreux', ha='right')
    repere(ax, -0.25, niveaux[2] - 0.15, -2.6, niveaux[2] - 0.6, 'pointes de verre', ha='right')
    repere(ax, -1.15, 0.5, -2.6, 0.9, 'ballon', ha='right')
    repere(ax, -1.6, -0.9, -2.6, -1.4, 'chauffe-ballon', ha='right')
    mid = a0 + 3.5 * u + 0.5 * nrm
    repere(ax, mid[0], mid[1], mid[0] + 1.0, mid[1] + 1.6, 'réfrigérant droit')
    repere(ax, *(ein - 1.6 * nrm), ein[0] - 1.6 * nrm[0] - 0.5, ein[1] - 1.6 * nrm[1] - 0.55, 'entrée d\'eau', ha='right')
    repere(ax, *(sout + 1.6 * nrm), sout[0] + 1.6 * nrm[0] + 1.0, sout[1] + 1.6 * nrm[1] + 0.5, 'sortie d\'eau')
    repere(ax, xe + 1.2, ye - 2.45, xe + 2.3, ye - 2.0, 'distillat')
    save(fig, 'fig_distillation')

# ---------------------------------------------------------------- chromatographie sur couche mince (unités : cm)
def plaque_ccm(ax, depots, front, lettres, corrige=False, mesures=(), fs=9):
    n = len(depots); w = 1.3 * n + 0.6
    ax.add_patch(Rectangle((0, -0.9), w, front + 1.6, fc='#F7F5F2', ec=ANTH, lw=1.3, zorder=1))
    ax.plot([0, w], [0, 0], color=GRIS, lw=1.0, ls=(0, (4, 3)), zorder=2)
    ax.plot([0, w], [front, front], color=BLEU, lw=1.1, ls=(0, (4, 3)), zorder=2)
    texte(ax, w + 0.15, front, "front de l'éluant", fs=fs, color=BLEU, ha='left')
    texte(ax, w + 0.15, 0.0, 'ligne de dépôt', fs=fs, color=GRIS, ha='left')
    for k, (taches, lettre) in enumerate(zip(depots, lettres)):
        x = 0.95 + 1.3 * k
        ax.add_patch(Circle((x, 0), 0.06, fc=ANTH, ec='none', zorder=3))
        for h in taches: ax.add_patch(Ellipse((x, h), 0.5, 0.34, fc=CUIVRE, ec='none', alpha=0.85, zorder=3))
        texte(ax, x, -0.55, lettre, fs=fs + 1.5)
    # règle graduée en centimètres
    ax.plot([-0.75, -0.75], [0, front], color=ANTH, lw=1.0, zorder=2)
    for k in range(int(round(front * 10)) + 1):
        y = k / 10; L = 0.28 if k % 10 == 0 else (0.18 if k % 5 == 0 else 0.1)
        ax.plot([-0.75, -0.75 + L], [y, y], color=ANTH, lw=0.8 if k % 5 else 1.0, zorder=2)
        if k % 10 == 0: texte(ax, -1.05, y, str(k // 10), fs=fs - 0.5, ha='right')
    texte(ax, -1.45, front + 0.55, 'cm', fs=fs - 0.5)
    if corrige:
        for x, h, t, cote in mesures:
            ax.annotate('', xy=(x, h), xytext=(x, 0), arrowprops=dict(arrowstyle='<->', color=BRIQUE, lw=1.0, mutation_scale=8, shrinkA=0, shrinkB=0), zorder=4)
            texte(ax, x + 0.12 * cote, h / 2, t, fs=fs - 0.5, color=BRIQUE, ha='left' if cote > 0 else 'right', fond=True)
    return w
def ccm(nom, depots, front, lettres, corrige=False, mesures=()):
    w = 1.3 * len(depots) + 0.6
    fig, ax = toile((-2.4, w + 3.4), (-1.65, front + 1.15), ech=0.42)
    plaque_ccm(ax, depots, front, lettres, corrige, mesures)
    save(fig, nom)

# ---------------------------------------------------------------- spectres infrarouges simulés
def transmittance(sig, bandes):
    A = np.zeros_like(sig)
    for s0, w, d in bandes: A += d * np.exp(-0.5 * ((sig - s0) / w) ** 2)
    base = 94 - 4 * (4000 - sig) / 3500
    return base * np.exp(-A)
def axes_ir(ax, titre=None):
    ax.set_xlim(4000, 500); ax.set_ylim(0, 100)
    ax.set_xticks(range(4000, 499, -500)); ax.set_xticks(range(4000, 499, -100), minor=True)
    ax.set_yticks([0, 50, 100]); ax.set_yticks(range(0, 101, 10), minor=True)
    for sp in ('top', 'right'): ax.spines[sp].set_visible(False)
    for sp in ('left', 'bottom'): ax.spines[sp].set_linewidth(0.9); ax.spines[sp].set_color(ANTH)
    ax.tick_params(labelsize=8.5, colors=ANTH, length=3); ax.tick_params(which='minor', length=1.8)
    ax.xaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, p: '%d' % v if v < 1000 else '%d %03d' % (v // 1000, v % 1000)))
    ax.grid(axis='x', which='major', color=GRISM, lw=0.6); ax.set_axisbelow(True)
    ax.set_ylabel('T (%)', fontsize=9, color=ANTH)
    if titre: ax.text(3950, 8, titre, fontsize=9.5, color=CUIVRE, ha='left', va='bottom')
SPECTRES = {
    'butanol': [(3340, 110, 2.2), (2958, 18, 1.6), (2932, 16, 1.4), (2873, 14, 1.0), (1465, 12, 0.5), (1380, 10, 0.3),
                (1060, 22, 1.6), (1035, 12, 0.8), (965, 12, 0.3), (900, 10, 0.2), (740, 12, 0.25)],
    'butanone': [(2980, 18, 0.9), (2940, 15, 0.6), (1716, 14, 2.6), (1460, 12, 0.5), (1415, 10, 0.5), (1365, 10, 0.9),
                 (1170, 15, 0.9), (1090, 10, 0.3), (945, 10, 0.4), (760, 10, 0.3)],
    'ester': [(2960, 18, 1.4), (2935, 15, 1.0), (2875, 14, 0.8), (1742, 14, 2.6), (1465, 12, 0.5), (1370, 10, 0.8),
              (1240, 20, 2.3), (1040, 14, 1.1), (955, 10, 0.3), (740, 10, 0.2)],
    'octenol': [(3350, 120, 1.9), (3080, 12, 0.35), (2958, 18, 1.5), (2930, 16, 1.6), (2860, 14, 1.0), (1644, 10, 0.45),
                (1465, 12, 0.6), (1380, 10, 0.3), (1010, 18, 1.2), (990, 8, 1.0), (920, 8, 1.3)]}
def fig_spectres(nom, cles, titres):
    sig = np.linspace(4000, 500, 3501)
    fig, axs = plt.subplots(len(cles), 1, figsize=(6.0, 1.85 * len(cles) + 0.5))
    axs = np.atleast_1d(axs)
    fig.subplots_adjust(left=0.1, right=0.98, top=0.97, bottom=0.25 if len(cles) == 1 else 0.13, hspace=0.42)
    for ax, k, t in zip(axs, cles, titres):
        ax.plot(sig, transmittance(sig, SPECTRES[k]), color=BLEU, lw=1.1); axes_ir(ax, t)
    axs[-1].set_xlabel('nombre d\'onde σ (cm$^{-1}$)', fontsize=9, color=ANTH)
    save(fig, nom)

def fig_ex4_analyses():
    # a : spectre infrarouge du produit distillé ; b : chromatographie
    fig = plt.figure(figsize=(8.4, 2.45))
    ax1 = fig.add_axes([0.075, 0.2, 0.56, 0.72])
    sig = np.linspace(4000, 500, 3501)
    ax1.plot(sig, transmittance(sig, SPECTRES['octenol']), color=BLEU, lw=1.1); axes_ir(ax1)
    ax1.set_xlabel('nombre d\'onde σ (cm$^{-1}$)', fontsize=9, color=ANTH)
    ax1.text(3950, 103, 'a', fontsize=11, color=CUIVRE, ha='left', va='bottom')
    ax2 = fig.add_axes([0.665, 0.02, 0.33, 0.96])
    ax2.set_xlim(-2.4, 7.3); ax2.set_ylim(-1.65, 6.4); ax2.set_aspect('equal'); ax2.axis('off')
    plaque_ccm(ax2, [[3.6], [3.6, 2.2], [2.2]], 5.0, '123', fs=8.5)
    ax2.text(-2.2, 6.1, 'b', fontsize=11, color=CUIVRE, ha='left', va='center')
    save(fig, 'fig_ex4_analyses')

def fig_spectres_cote(nom, cles, titres):
    # deux spectres côte à côte, graduations tous les 1 000 cm-1
    sig = np.linspace(4000, 500, 3501)
    fig, axs = plt.subplots(1, len(cles), figsize=(8.4, 2.35))
    fig.subplots_adjust(left=0.07, right=0.99, top=0.95, bottom=0.24, wspace=0.18)
    for ax, k, t in zip(axs, cles, titres):
        ax.plot(sig, transmittance(sig, SPECTRES[k]), color=BLEU, lw=1.0); axes_ir(ax, t)
        ax.set_xticks(range(4000, 499, -1000)); ax.set_xticks(range(4000, 499, -250), minor=True)
        ax.set_xlabel('nombre d\'onde σ (cm$^{-1}$)', fontsize=9, color=ANTH)
    axs[1].set_ylabel('')
    save(fig, nom)

# --- Q.3 : un cycloalcane à nommer (1,4-diméthylcyclohexane) ; Q.13 : avancement avec et sans catalyseur (corrigé)
def fig_cyclo():
    fig, ax = toile((-2.35, 2.35), (-1.12, 1.12))
    pts = cycle6((0.0, 0.0), 0)
    at = {'r%d' % k: (p[0], p[1], '') for k, p in enumerate(pts)}
    li = [('r%d' % k, 'r%d' % ((k + 1) % 6), 1) for k in range(6)]
    at['m0'] = pas(pts[0], 0) + ('',); at['m3'] = pas(pts[3], 180) + ('',)
    li += [('r0', 'm0', 1), ('r3', 'm3', 1)]
    mol(ax, at, li)
    save(fig, 'fig_cyclo')
def fig_catalyse():
    fig, ax = plt.subplots(figsize=(4.4, 2.5))
    fig.subplots_adjust(left=0.1, right=0.97, top=0.95, bottom=0.17)
    t = np.linspace(0, 60, 400)
    TAU_AVEC, TAU_SANS = 4.0, 15.0          # même avancement final, atteint plus vite avec le catalyseur
    ax.plot(t, 1 - np.exp(-t / TAU_AVEC), color=BLEU, lw=1.6)
    ax.plot(t, 1 - np.exp(-t / TAU_SANS), color=CUIVRE, lw=1.6)
    ax.axhline(1.0, color=GRIS, lw=0.9, ls='--')
    ax.set_xlim(0, 60); ax.set_ylim(0, 1.2)
    ax.set_xticks([]); ax.set_yticks([1.0]); ax.set_yticklabels(['$x_\\mathrm{f}$'])
    for sp in ('top', 'right'): ax.spines[sp].set_visible(False)
    for sp in ('left', 'bottom'): ax.spines[sp].set_linewidth(0.9); ax.spines[sp].set_color(ANTH)
    ax.tick_params(colors=ANTH, labelsize=10, length=3)
    ax.set_xlabel('temps t', fontsize=9.5, color=ANTH); ax.set_ylabel('avancement x', fontsize=9.5, color=ANTH)
    ax.text(5.0, 1.09, 'avec catalyseur', color=BLEU, fontsize=9.5, ha='left', va='center')
    ax.text(30.0, 0.62, 'sans catalyseur', color=CUIVRE, fontsize=9.5, ha='left', va='center')
    save(fig, 'fig_catalyse')

# ---------------------------------------------------------------- production
fig_q1(); fig_q1_c(); fig_groupes(False); fig_groupes(True); fig_isomeres(); fig_ze(); fig_cyclo(); fig_catalyse(); fig_q3_c(); fig_isomeres_c()
fig_ex1_esters(); fig_ex1_c(); fig_spectres('fig_ex1_ir', ['ester'], [None])
fig_ex2_molecules(); fig_ex2_meca(False); fig_ex2_meca(True); fig_ex3_sequence()
fig_reflux(False); fig_reflux(True); fig_ampoule(); fig_buchner(); fig_distillation()
ccm('fig_ccm', [[4.2], [1.8], [4.2, 1.8], [4.2]], 6.0, 'ABCD')
ccm('fig_ccm_c', [[4.2], [1.8], [4.2, 1.8], [4.2]], 6.0, 'ABCD', True, [(0.95 + 0.42, 4.2, '4,2 cm', -1), (2.25 + 0.42, 1.8, '1,8 cm', 1)])
fig_spectres_cote('fig_ir', ['butanol', 'butanone'], ['spectre 1', 'spectre 2'])
fig_ex4_analyses()
fig_ex5_equation()
