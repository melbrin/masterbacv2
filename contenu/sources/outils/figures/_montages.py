# Figures de la fiche annexe « Montages de chimie », palette MasterBac
# usage : _montages.py <dossier de sortie, en général fiches/_montages/figs> [nom de figure ...]
#   Sans nom de figure : toutes les figures. Avec des noms (fig_reflux_c ...) : seulement celles-là.
# Les schémas de verrerie reprennent les éléments dessinés pour la fiche 13 (ballon, chauffe-ballon, réfrigérants),
# à la même échelle de texte : une figure insérée à la largeur conseillée garde un texte de 7,4 points environ.
# Énoncé : éléments numérotés (numéros cerclés). Corrigé (suffixe _c) : éléments nommés.
import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, Polygon, Ellipse, FancyBboxPatch, FancyArrowPatch, Arc
from matplotlib.ticker import FuncFormatter
from PIL import Image, ImageChops

out = sys.argv[1]
SEULES = set(sys.argv[2:])
ANTH = '#2B2C2D'; CUIVRE = '#A47351'; GRIS = '#8A8F98'; GRISC = '#DAD5D0'; GRISM = '#EFEBE7'
VERT = '#2E6B4F'; BRIQUE = '#B23A2E'; BLEU = '#2F5D8A'; EAU = '#DCE9F2'; SABLE = '#F4E3C3'; ORGA = '#F6E7C9'
CUIVRE_M = '#C98B5E'; ZINC = '#B9BEC4'; ACIER = '#9FA4AA'; VIOLET = '#E4D8E8'; BLEU_S = '#C9DCEC'
plt.rcParams.update({'font.family': 'Carlito', 'font.size': 11, 'mathtext.fontset': 'stix',
                     'axes.linewidth': 0, 'savefig.dpi': 300})
FS = 9.5          # taille du texte des légendes, en points, avant réduction à la largeur conseillée


def rogne(p):
    im = Image.open(p).convert('RGB')
    bg = Image.new('RGB', im.size, (255, 255, 255))
    box = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > 8 else 0).getbbox()
    pad = 14
    im = im.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad)))
    im.save(p, dpi=(300, 300))
    return im.size


def save(fig, name):
    p = f'{out}/{name}.png'
    fig.savefig(p, facecolor='white'); plt.close(fig)
    w, h = rogne(p)
    print(name, (w, h), 'largeur conseillée %.1f cm' % (w / 300 * 2.54 * 0.78))


def toile(xlim, ylim, ech=0.26):
    fig, ax = plt.subplots(figsize=((xlim[1] - xlim[0]) * ech, (ylim[1] - ylim[0]) * ech)); fig.subplots_adjust(0, 0, 1, 1)
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.set_aspect('equal'); ax.axis('off')
    return fig, ax


def texte(ax, x, y, t, fs=FS, color=ANTH, ha='center', va='center', fond=False, **kw):
    if fond: kw['bbox'] = dict(boxstyle='round,pad=0.15', fc='white', ec='none')
    ax.text(x, y, t, fontsize=fs, color=color, ha=ha, va=va, zorder=9, **kw)


def contour(ax, pts, fc='white', ec=ANTH, lw=1.4, z=3, ferme=True):
    ax.add_patch(Polygon(pts, closed=ferme, fc=fc if ferme else 'none', ec=ec, lw=lw, zorder=z, joinstyle='round'))


def contour_ouvert(ax, pts, fc='white', z=3, lw=1.4):
    # surface remplie, contour tracé sans le segment de fermeture (ouverture entre le dernier point et le premier)
    ax.add_patch(Polygon(pts, closed=True, fc=fc, ec='none', zorder=z))
    p = np.array(pts); ax.plot(p[:, 0], p[:, 1], color=ANTH, lw=lw, zorder=z + 0.1, solid_capstyle='round', solid_joinstyle='round')


def courbe(ax, pts, color=ANTH, lw=1.4, z=4, ls='-'):
    pts = np.array(pts); ax.plot(pts[:, 0], pts[:, 1], color=color, lw=lw, zorder=z, ls=ls, solid_capstyle='round', solid_joinstyle='round')


def arc_pts(c, r, a0, a1, n=60):
    t = np.radians(np.linspace(a0, a1, n)); return [(c[0] + r * np.cos(u), c[1] + r * np.sin(u)) for u in t]


def fleche(ax, x0, y0, x1, y1, color=ANTH, lw=1.3, ms=11, z=7):
    ax.add_patch(FancyArrowPatch((x0, y0), (x1, y1), arrowstyle='-|>', mutation_scale=ms, color=color, lw=lw,
                                 shrinkA=0, shrinkB=0, zorder=z))


def repere(ax, x, y, tx, ty, t, num=None, ha='left', fs=FS, color=ANTH):
    # trait de rappel du point (x, y) vers l'étiquette (tx, ty) ; num : numéro cerclé (énoncé) au lieu du texte
    ax.plot([x, tx], [y, ty], color=GRIS, lw=0.8, zorder=6)
    if num is not None:
        ax.text(tx + (0.3 if ha == 'left' else -0.3), ty, str(num), fontsize=9, ha='center', va='center', color=CUIVRE, zorder=9,
                bbox=dict(boxstyle='circle,pad=0.2', fc='white', ec=CUIVRE, lw=0.9))
    else:
        texte(ax, tx + (0.12 if ha == 'left' else -0.12), ty, t, fs=fs, ha=ha, color=color)


def eau_fleche(ax, x0, y0, x1, y1, color=BLEU):
    fleche(ax, x0, y0, x1, y1, color=color, lw=1.3, ms=11, z=6)


# ---------------------------------------------------------------- éléments de laboratoire
def potence(ax, x, y_socle, y_haut, x0, x1):
    ax.add_patch(Rectangle((x0, y_socle - 0.3), x1 - x0, 0.3, fc=GRISC, ec=ANTH, lw=1.0, zorder=1.5))
    ax.plot([x, x], [y_socle, y_haut], color=GRIS, lw=3.0, zorder=1.4, solid_capstyle='butt')


def pince(ax, x_tige, y, x_obj, w_obj=0.3):
    # bras horizontal de la tige à l'objet, et mâchoires autour de l'objet
    sgn = 1 if x_obj > x_tige else -1
    ax.plot([x_tige, x_obj - sgn * (w_obj + 0.15)], [y, y], color=GRIS, lw=2.0, zorder=1.6, solid_capstyle='butt')
    ax.add_patch(Rectangle((x_tige - 0.13, y - 0.17), 0.26, 0.34, fc=GRISC, ec=ANTH, lw=0.8, zorder=1.7))   # noix
    for d in (-1, 1):
        ax.add_patch(Rectangle((x_obj + d * w_obj - (0.16 if d > 0 else -0.0) - (0.0 if d > 0 else 0.16), y - 0.2), 0.16, 0.4,
                               fc=GRISC, ec=ANTH, lw=0.7, zorder=5))


def agitateur(ax, x0, y0, w, h=0.7):
    ax.add_patch(Rectangle((x0, y0), w, h, fc=GRISM, ec=ANTH, lw=1.1, zorder=1.5))
    ax.add_patch(Circle((x0 + w - 0.45, y0 + h / 2), 0.17, fc=GRISC, ec=ANTH, lw=0.8, zorder=1.6))
    return y0 + h


def barreau(ax, x, y, L=0.62):
    ax.add_patch(FancyBboxPatch((x - L / 2, y + 0.04), L, 0.13, boxstyle='round,pad=0.0,rounding_size=0.06', fc=ANTH, ec='none', zorder=3.6))


def becher(ax, x0, x1, y0, y1, niveau=None, couleur=EAU, z=2, lw=1.4):
    # bécher à bord droit, avec un petit bec à gauche ; niveau : hauteur du liquide
    if niveau is not None:
        ax.add_patch(Rectangle((x0 + 0.04, y0 + 0.04), x1 - x0 - 0.08, niveau - y0 - 0.04, fc=couleur, ec='none', zorder=z))
    courbe(ax, [(x0 - 0.12, y1 + 0.08), (x0, y1), (x0, y0), (x1, y0), (x1, y1)], lw=lw, z=z + 0.5)


def erlen(ax, cx, y0, wb, h, wc=0.45, hc=0.9, niveau=None, couleur=EAU, z=2):
    # erlenmeyer : base de demi-largeur wb, col de demi-largeur wc, hauteur du corps h, hauteur du col hc
    pts = [(cx - wc, y0 + h + hc), (cx - wc, y0 + h), (cx - wb, y0), (cx + wb, y0), (cx + wc, y0 + h), (cx + wc, y0 + h + hc)]
    contour_ouvert(ax, pts, fc='white', z=z)
    if niveau is not None:
        f = lambda y: wb - (wb - wc) * (y - y0) / h
        ax.add_patch(Polygon([(cx - f(y0) + 0.08, y0 + 0.05), (cx + f(y0) - 0.08, y0 + 0.05), (cx + f(niveau) - 0.06, niveau),
                              (cx - f(niveau) + 0.06, niveau)], closed=True, fc=couleur, ec='none', zorder=z + 0.05))
    return cx, y0 + h + hc


def ballon(ax, cx, cy, r, col, niveau, ponce=True, couleur=EAU, z=3):
    # ballon à fond rond : sphère et col ; niveau = hauteur du liquide par rapport au centre
    dcol = 0.24; a = np.degrees(np.arcsin(dcol / r))
    pts = arc_pts((cx, cy), r, 90 - a, -270 + a)
    corps = [(cx + dcol, cy + r * np.cos(np.radians(a)) + col)] + pts + [(cx - dcol, cy + r * np.cos(np.radians(a)) + col)]
    contour_ouvert(ax, corps, fc='white', z=z)
    b = np.degrees(np.arcsin(np.clip(niveau / r, -0.98, 0.98)))
    liq = arc_pts((cx, cy), r * 0.985, 180 - b, 360 + b)
    ax.add_patch(Polygon(liq, closed=True, fc=couleur, ec='none', zorder=z + 0.2))
    if ponce:
        for dx, dy in ((-0.35, -0.72), (0.05, -0.82), (0.4, -0.7), (-0.1, -0.6)):
            ax.add_patch(Circle((cx + dx * r, cy + dy * r), 0.07, fc=GRIS, ec='none', zorder=z + 0.4))
    return cx, cy + r * np.cos(np.radians(a)) + col


def chauffe_ballon(ax, cx, cy, r):
    # coque en demi-sphère sous le ballon, posée sur son socle
    ext = arc_pts((cx, cy), r + 0.45, 180, 360)
    inter = arc_pts((cx, cy), r + 0.08, 360, 180)
    contour(ax, ext + inter, fc=GRISM, z=2)
    ax.add_patch(Rectangle((cx - r - 0.75, cy - r - 0.95), 2 * r + 1.5, 0.5, fc=GRISC, ec=ANTH, lw=1.2, zorder=2))
    return cy - r - 0.95


def support_elevateur(ax, cx, y_haut, w=3.2, h=1.3):
    # plateau, ciseaux et socle : le support élévateur se baisse pour éloigner aussitôt le chauffe-ballon
    y0 = y_haut - h
    ax.add_patch(Rectangle((cx - w / 2, y_haut - 0.18), w, 0.18, fc=GRISC, ec=ANTH, lw=1.0, zorder=1.8))
    ax.add_patch(Rectangle((cx - w / 2, y0), w, 0.18, fc=GRISC, ec=ANTH, lw=1.0, zorder=1.8))
    for s in (-1, 1):
        ax.plot([cx - s * w * 0.38, cx + s * w * 0.38], [y0 + 0.18, y_haut - 0.18], color=GRIS, lw=1.6, zorder=1.7)
    ax.add_patch(Circle((cx, (y0 + y_haut) / 2), 0.08, fc=GRIS, ec='none', zorder=1.75))
    return y0


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
    courbe(ax, gauche, z=4); courbe(ax, droite, z=4)


def tubulures(ax, x, y_bas, y_haut, entree_bas=True, wj=0.62, L=0.85):
    # deux tubulures du manchon : basse à droite, haute à gauche ; flèches selon le sens de l'eau
    ax.plot([x + wj, x + wj + L], [y_bas - 0.125, y_bas - 0.125], color=ANTH, lw=1.4, zorder=3)
    ax.plot([x + wj, x + wj + L], [y_bas + 0.125, y_bas + 0.125], color=ANTH, lw=1.4, zorder=3)
    ax.plot([x - wj, x - wj - L], [y_haut - 0.125, y_haut - 0.125], color=ANTH, lw=1.4, zorder=3)
    ax.plot([x - wj, x - wj - L], [y_haut + 0.125, y_haut + 0.125], color=ANTH, lw=1.4, zorder=3)
    if entree_bas:
        eau_fleche(ax, x + wj + L + 1.1, y_bas, x + wj + L + 0.05, y_bas)
        eau_fleche(ax, x - wj - L - 0.05, y_haut, x - wj - L - 1.1, y_haut)
    else:
        eau_fleche(ax, x + wj + L + 0.05, y_bas, x + wj + L + 1.1, y_bas)
        eau_fleche(ax, x - wj - L - 1.1, y_haut, x - wj - L - 0.05, y_haut)
    return (x + wj + L + 1.1, y_bas), (x - wj - L - 1.1, y_haut)


def bouchon(ax, x, y, w=0.62, h=0.5):
    ax.add_patch(Polygon([(x - w / 2, y), (x + w / 2, y), (x + w / 2 + 0.06, y + h), (x - w / 2 - 0.06, y + h)], closed=True,
                         fc=GRISC, ec=ANTH, lw=1.1, zorder=5))


def thermometre(ax, x, y_res, y_haut, w=0.14):
    ax.add_patch(Rectangle((x - w / 2, y_res), w, y_haut - y_res, fc='white', ec=ANTH, lw=1.0, zorder=5))
    ax.add_patch(Rectangle((x - 0.025, y_res), 0.05, (y_haut - y_res) * 0.45, fc=BRIQUE, ec='none', zorder=5.05))
    ax.add_patch(Circle((x, y_res), 0.15, fc=BRIQUE, ec=ANTH, lw=0.8, zorder=5.1))


def boitier(ax, x0, y0, w, h, ecran, nom=None, fs_ecran=10.5, boutons=True):
    # appareil de mesure : boîtier, écran et nom au-dessus
    ax.add_patch(FancyBboxPatch((x0, y0), w, h, boxstyle='round,pad=0.0,rounding_size=0.15', fc=GRISM, ec=ANTH, lw=1.2, zorder=3))
    ax.add_patch(Rectangle((x0 + 0.25, y0 + h * 0.42), w - 0.5, h * 0.42, fc='white', ec=ANTH, lw=0.9, zorder=3.2))
    texte(ax, x0 + w / 2, y0 + h * 0.63, ecran, fs=fs_ecran, family='monospace')
    if boutons:
        for k in range(3):
            ax.add_patch(Circle((x0 + 0.5 + k * 0.45, y0 + h * 0.2), 0.1, fc=GRISC, ec=ANTH, lw=0.6, zorder=3.2))
    if nom: texte(ax, x0 + w / 2, y0 + h + 0.35, nom)


def fil(ax, xs, ys, z=2, lw=1.2, color=ANTH):
    ax.plot(xs, ys, color=color, lw=lw, solid_joinstyle='round', zorder=z)


def burette(ax, x, y_bas, y_haut, niveau, couleur=EAU, w=0.32, grad=True, chiffres=False):
    # tube gradué (zéro en haut), robinet et pointe ; niveau : hauteur du liquide
    ax.add_patch(Rectangle((x - w / 2, y_bas), w, y_haut - y_bas, fc='white', ec=ANTH, lw=1.1, zorder=3))
    ax.add_patch(Rectangle((x - w / 2 + 0.03, y_bas), w - 0.06, niveau - y_bas, fc=couleur, ec='none', zorder=3.05))
    if grad:
        for k, y in enumerate(np.linspace(y_haut - 0.3, y_bas + 0.3, 26)):
            L = 0.16 if k % 5 == 0 else 0.08
            ax.plot([x - w / 2, x - w / 2 + L], [y, y], color=ANTH, lw=0.55, zorder=3.1)
    # robinet et pointe
    ax.plot([x, x], [y_bas, y_bas - 0.55], color=ANTH, lw=1.3, zorder=3)
    ax.add_patch(Rectangle((x - 0.28, y_bas - 0.38), 0.56, 0.16, fc=ANTH, ec='none', zorder=3.2))
    ax.add_patch(Polygon([(x - 0.06, y_bas - 0.55), (x + 0.06, y_bas - 0.55), (x + 0.02, y_bas - 0.85), (x - 0.02, y_bas - 0.85)],
                         closed=True, fc='white', ec=ANTH, lw=0.9, zorder=3.1))
    return y_bas - 0.85


def electrode_ph(ax, x, y_bas, y_haut, w=0.32):
    # électrode combinée : corps, bulbe de verre au bout
    ax.add_patch(Rectangle((x - w / 2, y_bas + 0.25), w, y_haut - y_bas - 0.25, fc='white', ec=ANTH, lw=1.0, zorder=4))
    ax.add_patch(Ellipse((x, y_bas + 0.22), w * 0.95, 0.5, fc='white', ec=ANTH, lw=1.0, zorder=4.05))
    ax.add_patch(Rectangle((x - w / 2 + 0.01, y_bas + 0.25), w - 0.02, 0.12, fc='white', ec='none', zorder=4.1))
    ax.plot([x, x], [y_bas + 0.3, y_haut - 0.2], color=GRIS, lw=0.8, zorder=4.1)


def cellule_cond(ax, x, y_bas, y_haut, w=0.42):
    # cellule conductimétrique : corps fermé, fenêtre en bas avec deux plaques parallèles
    ax.add_patch(Rectangle((x - w / 2, y_bas + 0.75), w, y_haut - y_bas - 0.75, fc='white', ec=ANTH, lw=1.0, zorder=4))
    ax.plot([x - w / 2, x - w / 2], [y_bas, y_bas + 0.75], color=ANTH, lw=1.0, zorder=4)
    ax.plot([x + w / 2, x + w / 2], [y_bas, y_bas + 0.75], color=ANTH, lw=1.0, zorder=4)
    for d in (-1, 1):
        ax.add_patch(Rectangle((x + d * 0.13 - 0.04, y_bas + 0.1), 0.08, 0.55, fc=GRIS, ec=ANTH, lw=0.6, zorder=4.1))


def pissette(ax, x, y, s=1.0):
    contour(ax, [(x - 0.45 * s, y), (x + 0.45 * s, y), (x + 0.45 * s, y + 1.2 * s), (x + 0.2 * s, y + 1.45 * s),
                 (x - 0.2 * s, y + 1.45 * s), (x - 0.45 * s, y + 1.2 * s)], fc='white', z=3)
    ax.add_patch(Rectangle((x - 0.43 * s, y + 0.03), 0.86 * s, 0.75 * s, fc=EAU, ec='none', zorder=3.05))
    courbe(ax, [(x, y + 1.45 * s), (x, y + 1.85 * s), (x - 0.5 * s, y + 2.05 * s)], lw=1.3, z=3.1)


# ---------------------------------------------------------------- Q.1 : la verrerie
def verrerie_becher(ax, cx, y0):
    becher(ax, cx - 1.0, cx + 1.0, y0, y0 + 2.6, niveau=y0 + 1.5)
    for k, y in enumerate((y0 + 0.8, y0 + 1.3, y0 + 1.8)):
        ax.plot([cx - 0.95, cx - 0.6], [y, y], color=ANTH, lw=0.7, zorder=3)


def verrerie_eprouvette(ax, cx, y0, h=6.4):
    ax.add_patch(Polygon([(cx - 0.9, y0), (cx + 0.9, y0), (cx + 0.6, y0 + 0.22), (cx - 0.6, y0 + 0.22)], closed=True,
                         fc=GRISC, ec=ANTH, lw=1.0, zorder=3))
    ax.add_patch(Rectangle((cx - 0.36, y0 + 0.26), 0.72, 3.6, fc=EAU, ec='none', zorder=3))
    courbe(ax, [(cx - 0.5, y0 + h + 0.1), (cx - 0.4, y0 + h), (cx - 0.4, y0 + 0.22), (cx + 0.4, y0 + 0.22), (cx + 0.4, y0 + h)], lw=1.3)
    for k, y in enumerate(np.linspace(y0 + 0.6, y0 + h - 0.4, 21)):
        ax.plot([cx - 0.4, cx - 0.4 + (0.3 if k % 5 == 0 else 0.15)], [y, y], color=ANTH, lw=0.6, zorder=3.2)


def verrerie_pipette_graduee(ax, cx, y0, h=8.0):
    ax.add_patch(Polygon([(cx - 0.03, y0), (cx + 0.03, y0), (cx + 0.12, y0 + 0.5), (cx + 0.12, y0 + h), (cx - 0.12, y0 + h),
                          (cx - 0.12, y0 + 0.5)], closed=True, fc='white', ec=ANTH, lw=1.1, zorder=3))
    for k, y in enumerate(np.linspace(y0 + 1.2, y0 + h - 1.0, 26)):
        ax.plot([cx - 0.12, cx - 0.12 + (0.2 if k % 5 == 0 else 0.1)], [y, y], color=ANTH, lw=0.5, zorder=3.2)


def verrerie_pipette_jaugee(ax, cx, y0, h=8.0, trait=True):
    yb0, yb1 = y0 + 2.2, y0 + 4.6
    pts_d = [(cx + 0.03, y0), (cx + 0.1, y0 + 0.5), (cx + 0.1, yb0 - 0.4), (cx + 0.38, yb0), (cx + 0.38, yb1),
             (cx + 0.1, yb1 + 0.45), (cx + 0.1, y0 + h)]
    pts = pts_d + [(-x + 2 * cx, y) for x, y in pts_d[::-1]]
    ax.add_patch(Polygon(pts, closed=True, fc='white', ec=ANTH, lw=1.1, zorder=3, joinstyle='round'))
    if trait:
        ax.plot([cx - 0.2, cx + 0.2], [y0 + 6.6, y0 + 6.6], color=BRIQUE, lw=1.4, zorder=3.3)
    return y0 + 6.6


def fiole_profil(s=1.0, n=40):
    # demi-profil droit d'une fiole jaugée, du fond au haut du col : fond plat, panse ronde, épaule conique, col étroit
    R, yc, a = 1.3 * s, 0.95 * s, np.radians(40)
    a0 = -np.arcsin(yc / R)                                  # angle du bord du fond plat
    arc = [(R * np.cos(t), yc + R * np.sin(t)) for t in np.linspace(a0, a, n)]
    px, py = arc[-1]
    u = np.array([-np.sin(a), np.cos(a)]); k = (px - 0.2 * s) / -u[0]
    yn = py + k * u[1]
    return [(0.0, 0.0)] + arc + [(0.2 * s, yn), (0.2 * s, 5.4 * s)], yn


def verrerie_fiole(ax, cx, y0, trait=True, niveau=None, bouche=True, s=1.0):
    # fiole jaugée ; niveau : hauteur du liquide au-dessus du fond, en unités (à l'échelle s)
    prof, yn = fiole_profil(s)
    droite = [(cx + x, y0 + y) for x, y in prof[1:]]
    gauche = [(2 * cx - x, y) for x, y in droite]
    contour_ouvert(ax, gauche[::-1] + droite, fc='white', z=3)
    courbe(ax, [gauche[0], droite[0]], z=3.1)
    if niveau is not None:
        yl = y0 + niveau * s
        dr = []
        for (x1, y1), (x2, y2) in zip(droite[:-1], droite[1:]):
            if y1 <= yl: dr.append((x1 - 0.05, y1))
            if (y1 - yl) * (y2 - yl) < 0:
                dr.append((x1 + (x2 - x1) * (yl - y1) / (y2 - y1) - 0.05, yl))
        if yl >= droite[-1][1]: dr.append((droite[-1][0] - 0.05, yl))
        ga = [(2 * cx - x, y) for x, y in dr]
        ax.add_patch(Polygon(ga[::-1] + dr, closed=True, fc=BLEU_S, ec='none', zorder=3.05))
    if trait:
        ax.plot([cx - 0.3 * s, cx + 0.3 * s], [y0 + 4.4 * s, y0 + 4.4 * s], color=BRIQUE, lw=1.4, zorder=3.3)
    if bouche:
        ax.add_patch(Rectangle((cx - 0.26 * s, y0 + 5.4 * s), 0.52 * s, 0.45 * s, fc=GRISC, ec=ANTH, lw=1.0, zorder=3.3))
    return y0 + 4.4 * s


def fig_verrerie():
    fig, ax = toile((-2.6, 25.6), (-3.2, 10.6), ech=0.235)
    y0 = 0.0
    items = [(0.0, 'bécher', 'contenir, mélanger ;\nne mesure pas'),
             (4.2, 'éprouvette\ngraduée', 'volume\napproximatif'),
             (8.2, 'pipette\ngraduée', 'volume variable,\nassez précis'),
             (12.4, 'pipette\njaugée', 'volume fixe et\nprécis, prélevé'),
             (17.0, 'fiole\njaugée', 'volume fixe et\nprécis, contenu'),
             (22.0, 'burette\ngraduée', 'volume variable\net précis, versé')]
    verrerie_becher(ax, 0.0, y0)
    verrerie_eprouvette(ax, 4.2, y0)
    verrerie_pipette_graduee(ax, 8.2, y0 + 0.6)
    yt = verrerie_pipette_jaugee(ax, 12.4, y0 + 0.6)
    repere(ax, 12.55, yt, 13.6, yt + 1.2, 'trait de jauge', fs=9)
    yf = verrerie_fiole(ax, 17.0, y0, niveau=4.4)
    repere(ax, 17.25, yf, 18.4, yf + 1.4, 'trait de jauge', fs=9)
    burette(ax, 22.0, y0 + 1.6, y0 + 9.6, y0 + 7.2, grad=True)
    repere(ax, 22.3, y0 + 1.3, 23.4, y0 + 2.3, 'robinet', fs=9)
    for x, nom, role in items:
        texte(ax, x, -1.0, nom, fs=FS, color=CUIVRE)
        texte(ax, x, -2.45, role, fs=8.5, color=GRIS)
    save(fig, 'fig_verrerie')


# ---------------------------------------------------------------- Q.2 : dissolution d'un solide, en quatre gestes
def cristaux(ax, cx, cy, n=14, dx=0.5, dy=0.15, seed=2):
    rng = np.random.default_rng(seed)
    for k in range(n):
        x, y = cx + rng.uniform(-dx, dx), cy + rng.uniform(-dy, dy)
        ax.add_patch(Polygon([(x - 0.09, y), (x, y + 0.1), (x + 0.09, y), (x, y - 0.1)], closed=True, fc='#7FA7CC', ec=BLEU, lw=0.4, zorder=4))


def fig_dissolution():
    D = 6.6                                   # écart entre deux gestes
    fig, ax = toile((-2.9, 3 * D + 3.0), (-3.3, 8.0), ech=0.235)
    # 1. pesée : balance, coupelle tarée, spatule
    ax.add_patch(FancyBboxPatch((-2.2, 0.0), 4.4, 1.4, boxstyle='round,pad=0.0,rounding_size=0.15', fc=GRISM, ec=ANTH, lw=1.2, zorder=2))
    ax.add_patch(Rectangle((-1.75, 0.33), 2.5, 0.74, fc='white', ec=ANTH, lw=0.9, zorder=2.2))
    texte(ax, -0.5, 0.7, '1,25 g', fs=9, family='monospace')
    ax.add_patch(Circle((1.45, 0.62), 0.17, fc=GRISC, ec=ANTH, lw=0.7, zorder=2.2))
    texte(ax, 1.45, 1.08, 'tare', fs=7.5, color=GRIS)
    ax.add_patch(Rectangle((-1.6, 1.4), 3.2, 0.15, fc=GRISC, ec=ANTH, lw=0.9, zorder=2.1))      # plateau
    ax.add_patch(Polygon([(-0.9, 1.55), (0.9, 1.55), (1.15, 1.95), (-1.15, 1.95)], closed=True, fc='white', ec=ANTH, lw=1.0, zorder=3))
    cristaux(ax, 0.0, 1.78, n=12, dx=0.6, dy=0.08)
    courbe(ax, [(0.6, 2.3), (2.2, 3.4)], lw=2.0, color=GRIS)                                        # spatule
    ax.add_patch(Ellipse((0.5, 2.22), 0.5, 0.2, angle=35, fc=GRISC, ec=ANTH, lw=0.7, zorder=4))
    # 2. transfert dans la fiole jaugée par un entonnoir, rinçage à la pissette
    x2 = D
    verrerie_fiole(ax, x2, 0.0, niveau=0.3, bouche=False)
    cristaux(ax, x2, 0.2, n=8, dx=0.5, dy=0.07, seed=4)
    contour(ax, [(x2 - 0.9, 6.5), (x2 + 0.9, 6.5), (x2 + 0.12, 5.55), (x2 + 0.12, 4.9), (x2 - 0.12, 4.9), (x2 - 0.12, 5.55)], fc='white', z=4)
    pissette(ax, x2 + 2.3, 4.2, s=0.9)
    courbe(ax, [(x2 + 1.85, 6.05), (x2 + 1.2, 6.25), (x2 + 0.6, 6.1)], color='#8FB3D1', lw=1.6, z=4.2)
    # 3. remplir aux trois quarts, boucher, agiter
    x3 = 2 * D
    verrerie_fiole(ax, x3, 0.0, niveau=2.0, bouche=True)
    for sg in (-1, 1):
        ax.add_patch(FancyArrowPatch((x3 + sg * 1.85, 0.9), (x3 + sg * 1.85, 2.7), connectionstyle='arc3,rad=%.1f' % (0.4 * sg),
                                     arrowstyle='<|-|>', mutation_scale=10, color=CUIVRE, lw=1.2, zorder=6))
    # 4. compléter au trait de jauge au compte-gouttes, puis retourner pour homogénéiser
    x4 = 3 * D
    yf4 = verrerie_fiole(ax, x4, 0.0, niveau=4.4, bouche=False)
    ax.add_patch(Rectangle((x4 - 0.07, 5.75), 0.14, 1.0, fc='white', ec=ANTH, lw=0.9, zorder=4))         # compte-gouttes
    ax.add_patch(Ellipse((x4, 7.0), 0.42, 0.62, fc=GRISC, ec=ANTH, lw=0.9, zorder=4))
    ax.add_patch(Circle((x4, 5.55), 0.06, fc='#8FB3D1', ec='none', zorder=4))
    repere(ax, x4 + 0.25, yf4, x4 + 1.2, yf4 + 0.9, 'trait\nde jauge', fs=8.5)
    ax.add_patch(FancyArrowPatch((x4 + 1.8, 2.0), (x4 + 1.8, 0.4), connectionstyle='arc3,rad=-0.6', arrowstyle='-|>', mutation_scale=10,
                                 color=CUIVRE, lw=1.2, zorder=6))
    legendes = [(0.0, '1. Peser le solide\ndans une coupelle tarée'), (x2, '2. Le verser dans la fiole,\nrincer coupelle et entonnoir'),
                (x3, '3. Remplir aux trois quarts,\nboucher, agiter'), (x4, '4. Ajuster au trait de jauge,\nboucher, retourner')]
    for x, t in legendes:
        texte(ax, x, -1.75, t, fs=8.6)
    save(fig, 'fig_dissolution')


# ---------------------------------------------------------------- Q.4 : principe du spectrophotomètre
SPECTRE = ['#7B5EA7', '#3F6FB5', '#2E8B8B', '#5FA35A', '#D9B740', '#E08A3C', '#C9473A']
def etiquette(ax, x, y, tx, ty, t, num=None, fs=FS, va='bottom'):
    # trait de rappel vertical ou oblique, texte centré au bout (au-dessus si va='bottom', au-dessous si va='top')
    ax.plot([x, tx], [y, ty], color=GRIS, lw=0.8, zorder=6)
    if num is not None:
        ax.text(tx, ty + (0.3 if va == 'bottom' else -0.3), str(num), fontsize=9, ha='center', va='center', color=CUIVRE, zorder=9,
                bbox=dict(boxstyle='circle,pad=0.2', fc='white', ec=CUIVRE, lw=0.9))
    else:
        texte(ax, tx, ty + (0.12 if va == 'bottom' else -0.12), t, fs=fs, va=va)


def fig_spectro(corrige):
    fig, ax = toile((-2.4, 22.6), (-3.6, 6.6), ech=0.235)
    yr = 1.6
    # 1. source : lampe et faisceau de lumière blanche
    ax.add_patch(Circle((0.0, yr), 0.75, fc='#FFF7E0', ec=ANTH, lw=1.2, zorder=4))
    courbe(ax, [(-0.35, yr - 0.15), (-0.15, yr + 0.2), (0.05, yr - 0.2), (0.25, yr + 0.2), (0.4, yr - 0.1)], lw=1.0, z=5)
    ax.add_patch(Rectangle((-0.35, yr - 1.35), 0.7, 0.6, fc=GRISC, ec=ANTH, lw=1.0, zorder=3.9))
    ax.add_patch(Polygon([(0.75, yr + 0.18), (3.35, yr + 0.18), (3.35, yr - 0.18), (0.75, yr - 0.18)], closed=True, fc='#FFF1C9', ec='none', zorder=2))
    # 2. monochromateur : prisme qui disperse la lumière, fente qui ne laisse passer qu'une radiation
    ax.add_patch(Polygon([(3.0, yr - 1.1), (4.6, yr - 1.1), (3.8, yr + 1.3)], closed=True, fc='#F2F5F8', ec=ANTH, lw=1.2, zorder=4))
    for k, c in enumerate(SPECTRE):
        a = np.radians(-16 + 5 * k)
        ax.plot([4.25, 4.25 + 3.2 * np.cos(a)], [yr, yr + 3.2 * np.sin(a)], color=c, lw=1.6, zorder=3)
    xf = 7.4
    ax.add_patch(Rectangle((xf - 0.1, yr + 0.14), 0.2, 1.6, fc=ANTH, ec='none', zorder=4.2))
    ax.add_patch(Rectangle((xf - 0.1, yr - 1.74), 0.2, 1.6, fc=ANTH, ec='none', zorder=4.2))
    c_sel = SPECTRE[5]
    ax.plot([xf, 10.1], [yr, yr], color=c_sel, lw=2.2, zorder=3)
    # 3. cuve contenant la solution
    xc = 10.8
    ax.add_patch(Rectangle((xc - 0.7, yr - 1.0), 1.4, 2.6, fc='white', ec=ANTH, lw=1.3, zorder=4))
    ax.add_patch(Rectangle((xc - 0.64, yr - 0.94), 1.28, 1.9, fc=BLEU_S, ec='none', zorder=4.05))
    ax.plot([xc + 0.7, 14.0], [yr, yr], color=c_sel, lw=1.2, zorder=3, alpha=0.7)
    # 4. capteur de lumière
    xd = 14.45
    ax.add_patch(Rectangle((xd - 0.45, yr - 0.8), 0.9, 1.6, fc=GRISC, ec=ANTH, lw=1.2, zorder=4))
    ax.add_patch(Rectangle((xd - 0.45, yr - 0.45), 0.25, 0.9, fc=ANTH, ec='none', zorder=4.1))
    # 5. afficheur, relié au capteur
    fil(ax, [xd + 0.45, 16.0, 16.0], [yr, yr, yr + 1.4])
    boitier(ax, 14.6, yr + 1.4, 3.0, 1.9, '0,452', fs_ecran=10)
    if corrige:
        etiquette(ax, 0.0, yr + 0.75, 0.0, 4.6, 'source de\nlumière blanche')
        etiquette(ax, 3.8, yr - 1.1, 3.8, -1.3, 'prisme ou réseau :\ndisperse la lumière', va='top')
        etiquette(ax, xf, yr + 1.74, xf, 4.6, 'fente : ne laisse passer\nqu\'une longueur d\'onde λ')
        etiquette(ax, xc, yr - 1.0, xc, -1.3, 'cuve contenant\nla solution', va='top')
        etiquette(ax, xd, yr - 0.8, xd + 0.9, -1.3, 'capteur : intensité\nde la lumière transmise', va='top')
        repere(ax, 17.6, yr + 2.35, 18.5, yr + 2.35, 'afficheur de\nl\'absorbance')
    else:
        etiquette(ax, 0.0, yr + 0.75, 0.0, 4.4, None, num=1)
        ax.plot([3.0, 7.5], [yr - 2.25, yr - 2.25], color=CUIVRE, lw=1.0, zorder=5)
        ax.plot([3.0, 3.0], [yr - 2.25, yr - 2.1], color=CUIVRE, lw=1.0, zorder=5); ax.plot([7.5, 7.5], [yr - 2.25, yr - 2.1], color=CUIVRE, lw=1.0, zorder=5)
        etiquette(ax, 5.25, yr - 2.25, 5.25, -1.5, None, num=2, va='top')
        etiquette(ax, xc, yr - 1.0, xc, -1.5, None, num=3, va='top')
        etiquette(ax, xd, yr - 0.8, xd, -1.5, None, num=4, va='top')
        etiquette(ax, 17.6, yr + 2.35, 18.6, yr + 2.35, None, num=5)
    save(fig, 'fig_spectro' + ('_c' if corrige else ''))


# ---------------------------------------------------------------- Q.5 : conductimètre et cellule
def fig_conductimetre():
    fig, ax = toile((-6.4, 14.2), (-1.4, 9.4), ech=0.235)
    agitateur(ax, -1.6, 0.0, 4.8, 0.7)
    becher(ax, -0.9, 2.5, 0.7, 4.2, niveau=3.2)
    barreau(ax, 0.8, 0.7)
    xc = 1.1
    cellule_cond(ax, xc, 1.25, 7.4)
    fil(ax, [xc, xc, 5.4], [7.4, 8.2, 8.2])
    boitier(ax, 5.4, 6.6, 3.8, 2.1, '1413 µS/cm', fs_ecran=9)
    # zoom sur les deux plaques : surface S, distance L
    zx, zy = 9.6, 1.8
    ax.add_patch(Rectangle((zx - 1.6, zy - 1.3), 3.2, 2.6, fc=EAU, ec=GRIS, lw=0.8, zorder=2))
    for d in (-1, 1):
        ax.add_patch(Polygon([(zx + d * 0.55, zy - 0.85), (zx + d * 0.55 + 0.35, zy - 0.55), (zx + d * 0.55 + 0.35, zy + 1.05),
                              (zx + d * 0.55, zy + 0.75)], closed=True, fc=GRIS, ec=ANTH, lw=0.8, zorder=3))
    ax.annotate('', xy=(zx + 0.55, zy - 1.05), xytext=(zx - 0.55, zy - 1.05),
                arrowprops=dict(arrowstyle='<->', color=BRIQUE, lw=1.0, mutation_scale=8, shrinkA=0, shrinkB=0), zorder=6)
    texte(ax, zx, zy - 0.75, '$L$', fs=10, color=BRIQUE, fond=True)
    texte(ax, zx + 1.15, zy + 0.95, '$S$', fs=10, color=BRIQUE)
    ax.plot([xc + 0.25, zx - 1.6], [1.75, zy + 1.3], color=GRIS, lw=0.7, ls=(0, (3, 2)), zorder=1.8)
    ax.plot([xc + 0.25, zx - 1.6], [1.2, zy - 1.3], color=GRIS, lw=0.7, ls=(0, (3, 2)), zorder=1.8)
    texte(ax, zx, zy - 1.75, 'deux plaques parallèles,\nde surface S, distantes de L', fs=8.8, va='top')
    repere(ax, xc - 0.21, 5.6, -2.0, 6.4, 'cellule\nconductimétrique', ha='right')
    repere(ax, -0.9, 2.2, -2.0, 2.6, 'solution', ha='right')
    texte(ax, 7.3, 9.0, 'conductimètre')
    save(fig, 'fig_conductimetre')


# ---------------------------------------------------------------- Q.6 : pH-mètre, électrode combinée et solution tampon
def fig_phmetre():
    fig, ax = toile((-7.8, 12.6), (-1.0, 9.6), ech=0.235)
    becher(ax, -1.2, 1.6, 0.0, 3.3, niveau=2.4, couleur=SABLE)
    xe = 0.2
    electrode_ph(ax, xe, 0.45, 7.3)
    fil(ax, [xe, xe, 4.6], [7.3, 8.3, 8.3])
    boitier(ax, 4.6, 6.6, 3.4, 2.1, '7,00', nom='pH-mètre', fs_ecran=11)
    pissette(ax, 3.6, 0.0, s=1.05)
    repere(ax, xe - 0.16, 5.5, -2.0, 6.0, 'électrode combinée', ha='right')
    repere(ax, xe - 0.15, 0.4, -2.0, 0.9, 'membrane de verre\n(bulbe fragile)', ha='right')
    repere(ax, -1.2, 1.9, -2.0, 2.6, 'solution tampon\nde pH 7,0', ha='right')
    repere(ax, 4.05, 0.9, 5.4, 1.9, 'pissette\nd\'eau distillée')
    save(fig, 'fig_phmetre')


# ---------------------------------------------------------------- Q.7 et Q.8 : montages de titrage
def montage_titrage(ax, x0=0.0, suivi='ph', nom_app=None):
    # potence, burette, bécher (ou erlenmeyer) sur agitateur ; suivi : 'ph', 'cond' ou 'couleur'
    xb = x0 + 3.0                                     # axe de la burette
    potence(ax, x0 + 0.6, 0.3, 10.6, x0 - 0.2, x0 + 2.2)
    ytop = agitateur(ax, x0 + 1.5, 0.3, 4.4, 0.75)
    pince(ax, x0 + 0.6, 9.2, xb, 0.18)
    ypointe = burette(ax, xb, 4.9, 10.5, 9.6)
    if suivi == 'couleur':
        ax.add_patch(Rectangle((x0 + 1.75, ytop), 3.4, 0.09, fc='white', ec=GRIS, lw=0.7, zorder=1.9))     # feuille blanche
        erlen(ax, xb + 0.2, ytop + 0.09, 1.45, 2.6, wc=0.42, hc=0.8, niveau=ytop + 1.0, couleur=EAU)
        barreau(ax, xb + 0.2, ytop + 0.09)
    else:
        haut = 4.1 if suivi == 'cond' else 3.6
        becher(ax, x0 + 1.85, x0 + 5.05, ytop, ytop + haut, niveau=ytop + (2.9 if suivi == 'cond' else 1.9), couleur=SABLE)
        barreau(ax, x0 + 3.2, ytop)
        xs = x0 + 4.25
        if suivi == 'ph':
            electrode_ph(ax, xs, ytop + 0.55, ytop + 5.0)
            fil(ax, [xs, xs, x0 + 6.2], [ytop + 5.0, ytop + 5.1, ytop + 5.1])
            boitier(ax, x0 + 6.2, ytop + 4.2, 3.0, 1.8, '7,02', nom=nom_app)
        else:
            cellule_cond(ax, xs, ytop + 0.35, ytop + 5.0, w=0.38)
            fil(ax, [xs, xs, x0 + 6.2], [ytop + 5.0, ytop + 5.1, ytop + 5.1])
            boitier(ax, x0 + 6.2, ytop + 4.2, 3.0, 1.8, '25,3', nom=nom_app, fs_ecran=10)
    return xb, ytop


def fig_titrage_c():
    fig, ax = toile((-4.6, 22.2), (-0.6, 11.4), ech=0.235)
    xb, ytop = montage_titrage(ax, 0.0, 'ph', nom_app='pH-mètre')
    repere(ax, xb + 0.16, 8.6, 10.6, 9.9, 'burette graduée : solution titrante\n(hydroxyde de sodium, c = 0,100 mol·L$^{-1}$)')
    repere(ax, xb - 0.28, 4.6, -0.4, 5.6, 'robinet', ha='right')
    repere(ax, 0.6, 7.2, -0.4, 7.6, 'potence', ha='right')
    repere(ax, 1.2, 9.2, -0.4, 9.6, 'pince', ha='right')
    repere(ax, 4.41, 3.4, 10.6, 4.6, 'électrode combinée')
    repere(ax, 5.05, 1.9, 10.6, 3.2, 'bécher : 20,0 mL de solution titrée,\nprélevés à la pipette jaugée, et eau distillée')
    repere(ax, 3.5, 1.15, 10.6, 1.75, 'barreau aimanté')
    repere(ax, 5.9, 0.6, 10.6, 0.45, 'agitateur magnétique')
    save(fig, 'fig_titrage_c')


def fig_titrage_variantes():
    fig, ax = toile((-1.0, 26.5), (-1.6, 11.2), ech=0.215)
    xb, ytop = montage_titrage(ax, 0.0, 'cond', nom_app='conductimètre')
    repere(ax, 4.44, 3.0, 8.0, 3.9, 'cellule\nconductimétrique')
    repere(ax, 5.05, 1.7, 8.0, 1.6, 'solution titrée\net environ 150 mL\nd\'eau distillée')
    texte(ax, 4.5, -0.9, 'suivi conductimétrique', color=CUIVRE)
    xb2, ytop2 = montage_titrage(ax, 14.5, 'couleur')
    repere(ax, xb2 + 1.0, ytop2 + 0.6, 21.3, 3.4, 'solution titrée\net quelques gouttes\nd\'indicateur coloré')
    repere(ax, 14.5 + 4.9, ytop2 + 0.05, 21.3, 0.9, 'feuille blanche')
    texte(ax, 18.0, -0.9, 'repérage colorimétrique', color=CUIVRE)
    fig.add_artist(matplotlib.lines.Line2D([0.535, 0.535], [0.06, 0.96], color=GRISC, lw=1.0))
    save(fig, 'fig_titrage_variantes')


# ---------------------------------------------------------------- Q.10 : chauffage à reflux (et ses erreurs, Q.16)
def montage_reflux(ax, cx=0.0, eau_bas=True, ouvert=True, niveau=0.15, ponce=True):
    r = 1.25
    yb = chauffe_ballon(ax, cx, 0.0, r)
    ysoc = support_elevateur(ax, cx, yb)
    xt, yt = ballon(ax, cx, 0.0, r, 0.55, niveau, ponce=ponce)
    yh = yt + 7.4
    refrigerant_boules(ax, xt, yt, yh)
    e_in, e_out = tubulures(ax, xt, yt + 0.875, yt + 6.525, entree_bas=eau_bas)
    xp = cx - 3.3
    potence(ax, xp, ysoc, yh + 0.4, xp - 1.0, cx + 2.0)
    pince(ax, xp, yt - 0.25, xt, 0.24)
    pince(ax, xp, yt + 4.0, xt, 0.62)
    if not ouvert:
        bouchon(ax, xt, yh - 0.05, w=0.5, h=0.45)
    return dict(xt=xt, yt=yt, yh=yh, e_in=e_in, e_out=e_out, ysoc=ysoc, xp=xp, yb=yb)


def fig_reflux_c():
    fig, ax = toile((-8.6, 12.6), (-4.2, 10.6), ech=0.235)
    m = montage_reflux(ax)
    xt, yt, yh = m['xt'], m['yt'], m['yh']
    repere(ax, xt, yh, xt + 1.1, yh + 0.55, 'réfrigérant ouvert à son sommet')
    repere(ax, xt + 0.45, yt + 3.2, 3.6, yt + 3.2, 'réfrigérant à boules')
    repere(ax, *m['e_in'], 3.6, yt + 1.6, 'entrée d\'eau (en bas)')
    # « sortie d'eau » au-dessus de la flèche de sortie (longue de 1,05), entre la tige de la potence et le réfrigérant :
    # un trait de rappel tiré vers la gauche croiserait la tige
    texte(ax, m['e_out'][0] + 0.525, m['e_out'][1] + 0.3, 'sortie\nd\'eau', va='bottom')
    repere(ax, 0.95, 0.75, 3.6, 1.0, 'ballon, rempli au plus à moitié')
    repere(ax, 0.45, -0.75, 3.6, -0.35, 'mélange réactionnel\net pierre ponce')
    repere(ax, 1.65, -1.2, 3.6, -1.7, 'chauffe-ballon')
    repere(ax, 1.5, m['yb'] - 0.6, 3.6, -3.0, 'support élévateur')
    repere(ax, m['xp'], yt + 2.0, -4.2, yt + 2.0, 'potence et pinces', ha='right')
    save(fig, 'fig_reflux_c')


# ---------------------------------------------------------------- Q.11 : appareil de Dean-Stark
def montage_dean_stark(ax, corrige):
    r = 1.25
    yb = chauffe_ballon(ax, 0.0, 0.0, r)
    support_elevateur(ax, 0.0, yb)
    xt, yt = ballon(ax, 0.0, 0.0, r, 0.45, 0.2, couleur=ORGA)
    w = 0.3                                           # demi-épaisseur du tube montant et du bras
    xd, wd = 4.0, 0.34                                # axe et demi-largeur du tube décanteur
    ya = yt + 3.6                                     # axe du bras, côté décanteur
    yg = ya - 0.45                                    # axe du bras, côté ballon : le bras descend vers le ballon
    yd0 = ya - 3.7                                    # fond du tube décanteur
    # tube montant du ballon, coude, bras qui descend légèrement du décanteur vers le ballon
    contour_ouvert(ax, [(-0.24, yt - 0.02), (-0.24, yt + 0.3), (-w, yt + 0.5), (-w, yg + w), (xd - wd, ya + w)], fc='white', z=2.8)
    ax.add_patch(Polygon([(-w, yt + 0.5), (-w, yg + w), (xd - wd, ya + w), (xd - wd, ya - w), (w, yg - w), (w, yt + 0.5)],
                         closed=True, fc='white', ec='none', zorder=2.8))
    courbe(ax, [(0.24, yt - 0.02), (0.24, yt + 0.3), (w, yt + 0.5), (w, yg - w), (xd - wd, ya - w)])
    # tube décanteur gradué : eau au fond, cyclohexane au-dessus, jusqu'au bras
    yw = yd0 + 1.6
    ax.add_patch(Rectangle((xd - wd, yd0), 2 * wd, ya + 0.8 - yd0, fc='white', ec='none', zorder=2.8))
    ax.add_patch(Rectangle((xd - wd + 0.03, yd0 + 0.02), 2 * wd - 0.06, yw - yd0, fc=EAU, ec='none', zorder=2.9))
    ax.add_patch(Rectangle((xd - wd + 0.03, yw), 2 * wd - 0.06, ya - w - yw, fc=ORGA, ec='none', zorder=2.9))
    ax.plot([xd - wd + 0.03, xd + wd - 0.03], [yw, yw], color=GRIS, lw=0.8, zorder=3)
    courbe(ax, [(xd - wd, ya - w), (xd - wd, yd0), (xd + wd, yd0), (xd + wd, ya + 0.8)])
    courbe(ax, [(xd - wd, ya + w), (xd - wd, ya + 0.8)])
    for k, y in enumerate(np.linspace(yd0 + 0.3, ya - 0.55, 13)):
        ax.plot([xd + wd - (0.18 if k % 4 == 0 else 0.1), xd + wd], [y, y], color=ANTH, lw=0.55, zorder=3.1)
    ax.plot([xd, xd], [yd0, yd0 - 0.55], color=ANTH, lw=1.3, zorder=3)                       # robinet de vidange
    ax.add_patch(Rectangle((xd - 0.3, yd0 - 0.4), 0.6, 0.17, fc=ANTH, ec='none', zorder=3.2))
    # réfrigérant à boules au-dessus du décanteur
    yr0, yr1 = ya + 0.8, ya + 7.4
    refrigerant_boules(ax, xd, yr0, yr1, nb=4)
    e_in, e_out = tubulures(ax, xd, yr0 + 0.875, yr1 - 0.875)
    # potence et pinces
    xp = -3.4
    potence(ax, xp, yb - 1.3, yr1 + 0.4, xp - 1.0, 2.0)
    pince(ax, xp, yt - 0.25, 0.0, 0.24)
    pince(ax, xp, yr0 + 3.6, xd, 0.62)
    if corrige:
        fleche(ax, 0.0, yt + 0.7, 0.0, yg - 0.3, color=BRIQUE, lw=1.2, ms=9)                       # vapeurs qui montent
        fleche(ax, 0.6, yg + 0.18, xd - 1.1, ya + 0.12, color=BRIQUE, lw=1.2, ms=9)             # vapeurs vers le réfrigérant
        fleche(ax, xd, yr0 + 1.0, xd, yr0 + 2.6, color=BRIQUE, lw=1.2, ms=9)                    # vapeurs qui montent dans le réfrigérant
        # le liquide condensé dans le réfrigérant retombe en gouttes dans le tube décanteur : flèche qui descend
        for y in (yr0 + 0.55, yr0 + 0.15):
            ax.add_patch(Ellipse((xd, y), 0.12, 0.18, fc='#8FB3D1', ec='none', zorder=4))
        fleche(ax, xd, ya + 0.6, xd, ya - 0.2, color=CUIVRE, lw=1.2, ms=9)                      # chute des gouttes
        fleche(ax, xd - 1.1, ya - 0.17, 0.6, yg - 0.15, color=VERT, lw=1.2, ms=9)               # cyclohexane qui retourne au ballon
    return dict(xd=xd, ya=ya, yg=yg, yd0=yd0, yw=yw, yr0=yr0, yr1=yr1, e_in=e_in, e_out=e_out, xp=xp, yt=yt)


def fig_deanstark(corrige):
    fig, ax = toile((-8.4 if corrige else -10.6, 14.8), (-4.2, 15.8), ech=0.235)
    m = montage_dean_stark(ax, corrige)
    xd, ya, yd0 = m['xd'], m['ya'], m['yd0']
    X = 7.4
    repere(ax, xd + 0.45, m['yr0'] + 3.0, X, m['yr0'] + 3.4, 'réfrigérant à boules')
    repere(ax, *m['e_in'], X, m['yr0'] + 1.7, 'entrée d\'eau')
    # « sortie d'eau » au bout de la flèche, à droite de la tige de la potence (qu'elle ne doit pas traverser)
    texte(ax, m['e_out'][0] - 0.15, m['e_out'][1], 'sortie d\'eau', ha='right')
    repere(ax, xd + 0.34, ya + 0.5, X, ya + 0.5, 'tube décanteur gradué')
    repere(ax, xd + 0.3, yd0 - 0.32, X, yd0 - 0.9, 'robinet')
    repere(ax, -1.0, 0.7, -4.6, 1.6, 'ballon' if corrige else 'ballon : acide, alcool,\ncyclohexane, acide\nsulfurique, pierre ponce', ha='right')
    repere(ax, -1.6, -1.2, -4.6, -1.0, 'chauffe-ballon', ha='right')
    if corrige:
        repere(ax, xd + 0.3, (m['yw'] + ya) / 2, X, ya - 0.9, 'cyclohexane, moins dense')
        repere(ax, xd + 0.3, (yd0 + m['yw']) / 2, X, yd0 + 0.7, 'eau formée, plus dense,\nau fond du tube')
        texte(ax, -0.45, m['yt'] + 1.9, 'vapeurs', color=BRIQUE, ha='right', fs=9)
        texte(ax, 2.0, m['yg'] - 0.55, 'retour du\ncyclohexane', color=VERT, fs=8.5, va='top')
        texte(ax, xd - 0.75, m['yr0'] + 1.8, 'vapeurs', color=BRIQUE, ha='right', fs=9)
        texte(ax, xd - 0.85, m['yr0'] + 0.5, 'gouttes\ncondensées', color=CUIVRE, ha='right', fs=8.5)
    save(fig, 'fig_deanstark' + ('_c' if corrige else ''))


# ---------------------------------------------------------------- Q.12 : distillation fractionnée (et ses erreurs, Q.16)
def paroi_vigreux(x, y_bas, y_haut, sgn, niveaux, W, creux, h_haut=0.24, h_bas=0.04, chute=0.24):
    pts = [(x + sgn * W, y_haut)]
    for y in sorted(niveaux, reverse=True):
        pts += [(x + sgn * W, y + h_haut), (x + sgn * creux, y - chute), (x + sgn * W, y - h_bas)]
    pts.append((x + sgn * W, y_bas))
    return pts


def montage_distillation(ax, thermo_ok=True, recepteur_ouvert=True):
    cx, cy, r = 0.0, 0.0, 1.25
    yb = chauffe_ballon(ax, cx, cy, r)
    ysoc = support_elevateur(ax, cx, yb)
    xt, yt = ballon(ax, cx, cy, r, 0.45, 0.1, couleur=ORGA)
    W, creux = 0.5, 0.07
    yc0 = yt + 0.5
    y1 = yc0 + 5.0
    niveaux = list(np.linspace(yc0 + 0.6, y1 - 0.45, 6))
    ybras = y1 + 0.8
    yh = ybras + 0.75
    ang = np.radians(-22); u = np.array([np.cos(ang), np.sin(ang)]); nrm = np.array([-u[1], u[0]])
    a0 = np.array([W, ybras]); L = 6.4 if recepteur_ouvert else 6.9; e = 0.18
    yb_h, yb_b = ybras + e / np.cos(ang), ybras - e / np.cos(ang)
    gauche = [(-W, yh)] + paroi_vigreux(0.0, yc0, y1, -1, niveaux, W, creux)[1:] + [(-0.24, yt + 0.2), (-0.24, yt - 0.02)]
    droite = [(W, yb_b)] + paroi_vigreux(0.0, yc0, y1, 1, niveaux, W, creux) + [(0.24, yt + 0.2), (0.24, yt - 0.02)]
    ax.add_patch(Polygon(gauche + droite[::-1], closed=True, fc='white', ec='none', zorder=2.8))
    courbe(ax, gauche); courbe(ax, droite); courbe(ax, [(W, yb_h), (W, yh)])
    ax.add_patch(Rectangle((-W - 0.08, yh), 2 * W + 0.16, 0.42, fc=GRISC, ec=ANTH, lw=1.2, zorder=4))
    if thermo_ok:
        yres = ybras
    else:
        yres = cy - 0.55                                  # réservoir plongé dans le liquide du ballon
    ax.add_patch(Rectangle((-0.07, yres), 0.14, yh + 2.4 - yres, fc='white', ec=ANTH, lw=1.0, zorder=5))
    ax.add_patch(Circle((0.0, yres), 0.14, fc=BRIQUE, ec=ANTH, lw=0.8, zorder=5.1))
    for d in (e, -e):
        p0 = np.array([W, ybras + d / np.cos(ang)]); courbe(ax, [p0, a0 + L * u + d * nrm])
    j0, j1 = a0 + 1.4 * u, a0 + 5.6 * u
    ax.add_patch(Polygon([j0 + 0.5 * nrm, j1 + 0.5 * nrm, j1 - 0.5 * nrm, j0 - 0.5 * nrm], closed=True, fc=EAU, ec=ANTH, lw=1.3, zorder=2.5))
    for d in (e, -e):
        courbe(ax, [j0 + d * nrm, j1 + d * nrm], z=4)
    ein = j1 - 0.5 * nrm - 0.4 * u; sout = j0 + 0.5 * nrm + 0.4 * u
    courbe(ax, [ein, ein - 0.7 * nrm]); eau_fleche(ax, *(ein - 1.6 * nrm), *(ein - 0.75 * nrm))
    courbe(ax, [sout, sout + 0.7 * nrm]); eau_fleche(ax, *(sout + 0.75 * nrm), *(sout + 1.6 * nrm))
    bout = a0 + 6.4 * u
    xe, ye = bout[0] + 0.1, bout[1] - 0.6
    contour_ouvert(ax, [(xe - 0.35, ye + 0.3), (xe - 0.35, ye - 0.4), (xe - 1.4, ye - 2.9), (xe + 1.4, ye - 2.9), (xe + 0.35, ye - 0.4),
                        (xe + 0.35, ye + 0.3)], fc='white', z=2)
    ax.add_patch(Polygon([(xe - 1.07, ye - 2.1), (xe + 1.07, ye - 2.1), (xe + 1.37, ye - 2.85), (xe - 1.37, ye - 2.85)], closed=True,
                         fc=ORGA, ec='none', zorder=2.2))
    if not recepteur_ouvert:
        # allonge qui descend du bras dans le col, à travers un bouchon : le montage est fermé
        bx, by = (a0 + 6.9 * u)
        ax.add_patch(Rectangle((xe - 0.12, ye - 0.9), 0.24, by - ye + 0.9, fc='white', ec=ANTH, lw=1.1, zorder=4.4))
        ax.add_patch(Rectangle((xe - 0.45, ye - 0.15), 0.9, 0.55, fc=GRISC, ec=ANTH, lw=1.1, zorder=4.5))
    xp = -3.3
    potence(ax, xp, ysoc, yh + 0.6, xp - 1.0, 2.0)
    pince(ax, xp, yt - 0.25, 0.0, 0.24)
    pince(ax, xp, yc0 + 2.6, 0.0, 0.5)
    return dict(yh=yh, ybras=ybras, niveaux=niveaux, W=W, a0=a0, u=u, nrm=nrm, ein=ein, sout=sout, xe=xe, ye=ye, yb=yb, xp=xp, yt=yt, yres=yres)


def fig_distillation_c():
    fig, ax = toile((-12.6, 16.0), (-4.4, 12.4), ech=0.215)
    m = montage_distillation(ax)
    yh, ybras, niveaux, W = m['yh'], m['ybras'], m['niveaux'], m['W']
    repere(ax, 0.07, yh + 1.7, -4.4, yh + 2.0, 'thermomètre', ha='right')
    repere(ax, -0.12, ybras, -4.4, ybras + 0.45, 'réservoir à la hauteur\ndu bras latéral', ha='right')
    repere(ax, -W, niveaux[4] + 0.5, -4.4, niveaux[4] + 0.2, 'colonne de Vigreux', ha='right')
    repere(ax, -1.15, 0.5, -4.4, 0.9, 'ballon : mélange\net pierre ponce', ha='right')
    repere(ax, -1.6, -0.9, -4.4, -1.4, 'chauffe-ballon', ha='right')
    repere(ax, -1.4, m['yb'] - 0.6, -4.4, -2.9, 'support élévateur', ha='right')
    a0, u, nrm = m['a0'], m['u'], m['nrm']
    mid = a0 + 3.5 * u + 0.5 * nrm
    repere(ax, mid[0], mid[1], mid[0] + 1.0, mid[1] + 1.6, 'réfrigérant droit')
    ein, sout = m['ein'], m['sout']
    repere(ax, *(ein - 1.6 * nrm), ein[0] - 1.6 * nrm[0] - 0.5, ein[1] - 1.6 * nrm[1] - 0.55, 'entrée d\'eau', ha='right')
    repere(ax, *(sout + 1.6 * nrm), sout[0] + 1.6 * nrm[0] + 1.0, sout[1] + 1.6 * nrm[1] + 0.5, 'sortie d\'eau')
    repere(ax, m['xe'] + 1.2, m['ye'] - 2.45, m['xe'] + 2.3, m['ye'] - 1.6, 'distillat,\ndans un\nerlenmeyer\nouvert')
    save(fig, 'fig_distillation_c')


# ---------------------------------------------------------------- Q.13 : ampoule à décanter
def montage_ampoule(ax, organique_haut=True, legendes=None):
    def bord(t):
        return 0.22 + 1.45 * np.sin(np.pi * np.clip(t, 0, 1) ** 0.75) * (1 - 0.35 * t)
    y0, y1 = 1.0, 6.4
    ys = np.linspace(y0, y1, 80); ws = bord((ys - y0) / (y1 - y0))
    ym = 3.55; yh = 5.2
    bas, haut = (EAU, VIOLET) if organique_haut else (VIOLET, EAU)
    yi = np.linspace(y0 + 0.02, ym, 40); wi = bord((yi - y0) / (y1 - y0)) - 0.04
    ax.add_patch(Polygon(list(zip(-wi, yi)) + list(zip(wi, yi))[::-1], closed=True, fc=bas, ec='none', zorder=2))
    yo = np.linspace(ym, yh, 40); wo = bord((yo - y0) / (y1 - y0)) - 0.04
    ax.add_patch(Polygon(list(zip(-wo, yo)) + list(zip(wo, yo))[::-1], closed=True, fc=haut, ec='none', zorder=2))
    ax.plot([-bord((ym - y0) / (y1 - y0)) + 0.04, bord((ym - y0) / (y1 - y0)) - 0.04], [ym, ym], color=GRIS, lw=0.9, zorder=2.5)
    courbe(ax, list(zip(ws, ys))[::-1] + [(0.12, y0)])
    courbe(ax, list(zip(-ws, ys))[::-1] + [(-0.12, y0)])
    courbe(ax, [(0.22, 6.4), (0.22, 7.05)]); courbe(ax, [(-0.22, 6.4), (-0.22, 7.05)])
    ax.add_patch(Rectangle((1.0, 7.5), 0.6, 0.5, fc=GRISC, ec=ANTH, lw=1.2, zorder=4))            # bouchon retiré, posé à côté
    courbe(ax, [(0.12, y0), (0.12, -0.6)]); courbe(ax, [(-0.12, y0), (-0.12, -0.6)])
    ax.add_patch(Rectangle((-0.5, 0.25), 1.0, 0.36, fc=GRISC, ec=ANTH, lw=1.2, zorder=4))          # robinet
    courbe(ax, [(0.12, -0.6), (0.06, -1.1)]); courbe(ax, [(-0.12, -0.6), (-0.06, -1.1)])
    ax.plot([-1.75, 1.75], [2.35, 2.35], color=GRIS, lw=3.0, zorder=1.5, solid_capstyle='round')  # anneau
    ax.plot([-1.75, -4.2], [2.35, 2.35], color=GRIS, lw=1.6, zorder=1.4); ax.plot([-4.2, -4.2], [-3.0, 7.6], color=GRIS, lw=2.2, zorder=1.4)
    becher(ax, -1.05, 1.05, -2.9, -1.25, niveau=-2.3)
    return ym


def fig_ampoule_c():
    fig, ax = toile((-4.8, 10.6), (-3.2, 8.4), ech=0.26)
    montage_ampoule(ax)
    repere(ax, 1.25, 4.4, 3.2, 5.4, 'phase organique, la moins\ndense : cyclohexane et\ndiiode extrait (violette)')
    repere(ax, 1.3, 2.4, 3.2, 2.5, 'phase aqueuse, la plus\ndense, presque incolore')
    repere(ax, 0.5, 0.43, 3.2, 0.43, 'robinet')
    repere(ax, 1.6, 7.75, 3.2, 7.75, 'bouchon retiré')
    repere(ax, -2.6, 2.35, -3.4, 4.6, 'anneau')
    repere(ax, 1.05, -2.0, 3.2, -1.6, 'bécher')
    save(fig, 'fig_ampoule_c')


# ---------------------------------------------------------------- Q.14 : filtration sous vide
def fig_buchner_c():
    fig, ax = toile((-9.4, 13.6), (-3.6, 7.6), ech=0.24)
    # fiole à vide : erlenmeyer à tubulure latérale
    contour_ouvert(ax, [(-0.45, 2.9), (-0.45, 1.9), (-2.1, -2.6), (2.1, -2.6), (0.45, 1.9), (0.45, 2.9)], fc='white', z=2)
    ax.add_patch(Polygon([(-1.86, -1.95), (1.86, -1.95), (2.04, -2.5), (-2.04, -2.5)], closed=True, fc=EAU, ec='none', zorder=2.2))
    courbe(ax, [(0.45, 2.45), (1.6, 2.45), (1.6, 2.25), (0.5, 2.25)])
    # tuyau à vide vers la trompe à eau
    ax.plot([1.6, 6.3, 6.3], [2.35, 2.35, 3.3], color=GRIS, lw=4.0, zorder=1.5, solid_capstyle='round', solid_joinstyle='round')
    # trompe à eau sous le robinet d'eau
    xr = 7.0
    courbe(ax, [(xr - 2.2, 6.4), (xr, 6.4), (xr, 5.6)], lw=2.6, color=GRIS)
    ax.add_patch(Rectangle((xr - 0.3, 5.75), 0.6, 0.25, fc=GRISC, ec=ANTH, lw=0.9, zorder=3))
    ax.add_patch(Rectangle((xr - 0.18, 1.6), 0.36, 4.0, fc='white', ec=ANTH, lw=1.1, zorder=3))
    ax.plot([xr - 0.18, 6.3], [3.3, 3.3], color=ANTH, lw=1.1, zorder=3)
    ax.plot([6.3, 6.3], [3.1, 3.5], color=ANTH, lw=0.0, zorder=3)
    for y in (1.3, 0.9, 0.5):
        ax.add_patch(Ellipse((xr, y), 0.14, 0.22, fc='#8FB3D1', ec='none', zorder=3))
    # joint conique et entonnoir Büchner
    ax.add_patch(Polygon([(-0.62, 3.25), (0.62, 3.25), (0.48, 2.65), (-0.48, 2.65)], closed=True, fc=GRISC, ec=ANTH, lw=1.2, zorder=3))
    contour_ouvert(ax, [(-0.22, 2.75), (-0.22, 3.6), (-1.7, 4.3), (-1.7, 5.7), (1.7, 5.7), (1.7, 4.3), (0.22, 3.6), (0.22, 2.75)], fc='white', z=3.5)
    ax.plot([-1.62, 1.62], [4.35, 4.35], color=ANTH, lw=2.2, zorder=4)
    for x in np.linspace(-1.3, 1.3, 7): ax.plot([x, x], [4.25, 4.45], color='white', lw=1.0, zorder=4.1)
    ax.add_patch(Rectangle((-1.6, 4.47), 3.2, 0.08, fc=GRIS, ec='none', zorder=4))
    rng = np.random.default_rng(3)
    for k in range(60):
        x, y = rng.uniform(-1.5, 1.5), rng.uniform(4.6, 5.05)
        ax.add_patch(Polygon([(x - 0.08, y), (x, y + 0.1), (x + 0.08, y), (x, y - 0.1)], closed=True, fc=SABLE, ec=CUIVRE, lw=0.5, zorder=4.2))
    repere(ax, -1.55, 4.85, -2.2, 6.6, 'solide sur le papier filtre', ha='right')
    repere(ax, -1.62, 4.35, -2.2, 3.9, 'entonnoir Büchner', ha='right')
    repere(ax, -0.6, 2.95, -2.2, 2.2, 'joint conique', ha='right')
    repere(ax, -1.3, -1.2, -2.2, -0.6, 'fiole à vide', ha='right')
    repere(ax, -0.9, -2.25, -2.2, -2.4, 'filtrat', ha='right')
    repere(ax, 3.9, 2.35, 3.5, 0.5, 'tuyau à vide')
    repere(ax, xr + 0.18, 4.4, 8.0, 4.4, 'trompe à eau')
    repere(ax, xr - 1.2, 6.4, 8.0, 6.9, 'arrivée d\'eau du robinet')
    save(fig, 'fig_buchner_c')


# ---------------------------------------------------------------- Q.15 : chromatographie sur couche mince
def plaque_ccm(ax, depots, front, lettres, fs=9):
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
    ax.plot([-0.75, -0.75], [0, front], color=ANTH, lw=1.0, zorder=2)
    for k in range(int(round(front * 10)) + 1):
        y = k / 10; L = 0.28 if k % 10 == 0 else (0.18 if k % 5 == 0 else 0.1)
        ax.plot([-0.75, -0.75 + L], [y, y], color=ANTH, lw=0.8 if k % 5 else 1.0, zorder=2)
        if k % 10 == 0: texte(ax, -1.05, y, str(k // 10), fs=fs - 0.5, ha='right')
    texte(ax, -1.45, front + 0.55, 'cm', fs=fs - 0.5)


def fig_ccm():
    fig, ax = toile((-2.4, 7.6), (-1.65, 7.15), ech=0.42)
    plaque_ccm(ax, [[1.5], [3.6], [3.6, 1.5]], 6.0, 'RPS')
    save(fig, 'fig_ccm')


def cuve_ccm(ax, x0=0.0, eluant=0.55, ligne=1.0, couvercle=True, front=None):
    # cuve en verre, éluant au fond, plaque posée sur le fond et appuyée contre la paroi droite
    W, H = 4.0, 6.2
    courbe(ax, [(x0, H), (x0, 0), (x0 + W, 0), (x0 + W, H)], lw=1.4, z=3)
    if couvercle:
        ax.add_patch(Rectangle((x0 - 0.25, H), W + 0.5, 0.32, fc=GRISC, ec=ANTH, lw=1.1, zorder=4))
    th = np.radians(9); larg, lon = 1.5, 5.4
    d = np.array([np.sin(th), np.cos(th)]); e = np.array([np.cos(th), -np.sin(th)])
    P0 = np.array([x0 + 0.9, 0.06 + larg * np.sin(th)])                 # coin bas gauche ; le coin bas droit touche le fond
    pts = [P0, P0 + larg * e, P0 + larg * e + lon * d, P0 + lon * d]
    ax.add_patch(Polygon(pts, closed=True, fc='#F7F5F2', ec=ANTH, lw=1.1, zorder=2.5))
    pl = lambda h, t: P0 + d * h + e * (larg / 2 + t)                   # point de la plaque : hauteur h, décalage t depuis l'axe
    p0, p1 = pl(ligne, -0.6), pl(ligne, 0.6)
    ax.plot([p0[0], p1[0]], [p0[1], p1[1]], color=GRIS, lw=1.0, ls=(0, (3, 2)), zorder=2.6)
    for t in (-0.35, 0.35):
        ax.add_patch(Circle(pl(ligne, t), 0.07, fc=ANTH, ec='none', zorder=2.7))
    if front is not None:
        f0, f1 = pl(front, -0.7), pl(front, 0.7)
        ax.plot([f0[0], f1[0]], [f0[1], f1[1]], color=BLEU, lw=1.0, ls=(0, (3, 2)), zorder=2.6)
    ax.add_patch(Rectangle((x0 + 0.05, 0.05), W - 0.1, eluant, fc=EAU, ec='none', zorder=2.55, alpha=0.75))
    return pl, W, H


def fig_ccm_c():
    fig, ax = toile((-6.2, 9.6), (-0.6, 7.2), ech=0.3)
    pl, W, H = cuve_ccm(ax, 0.0, eluant=0.55, ligne=1.0, couvercle=True, front=3.6)
    repere(ax, -0.25, H + 0.16, -1.0, H + 0.55, 'couvercle', ha='right')
    repere(ax, 0.0, 3.0, -1.0, 3.6, 'cuve', ha='right')
    p = pl(4.6, -0.6); repere(ax, p[0], p[1], -1.0, 5.2, 'plaque', ha='right')
    p = pl(1.0, -0.6); repere(ax, p[0], p[1], -1.0, 1.8, 'ligne de dépôt,\nau-dessus de l\'éluant', ha='right')
    repere(ax, 0.4, 0.3, -1.0, 0.25, 'éluant, sur 0,5 cm environ', ha='right')
    p = pl(3.6, 0.7); repere(ax, p[0], p[1], W + 0.8, 3.9, 'front de l\'éluant,\nqui monte par capillarité')
    p = pl(1.0, 0.35); repere(ax, p[0] + 0.05, p[1], W + 0.8, 1.6, 'dépôts')
    save(fig, 'fig_ccm_c')


# ---------------------------------------------------------------- Q.16 : trois montages qui contiennent des erreurs
def fig_erreurs():
    ech = 0.2
    xa, xbb, xc = (-6.0, 6.8), (-6.0, 12.6), (-1.0, 5.2)
    ya = (-5.6, 11.8)
    largeurs = [xa[1] - xa[0], xbb[1] - xbb[0], xc[1] - xc[0]]
    tot = sum(largeurs)
    fig = plt.figure(figsize=(tot * ech, (ya[1] - ya[0]) * ech))
    x = 0.0
    axes = []
    for lim, wl in zip((xa, xbb, xc), largeurs):
        ax = fig.add_axes([x / tot, 0, wl / tot, 1]); ax.set_xlim(*lim); ax.set_ylim(*ya); ax.set_aspect('equal'); ax.axis('off')
        axes.append(ax); x += wl
    montage_reflux(axes[0], eau_bas=False, ouvert=False, niveau=0.15)
    texte(axes[0], 0.3, -5.0, 'a. chauffage à reflux', color=CUIVRE)
    montage_distillation(axes[1], thermo_ok=False, recepteur_ouvert=False)
    texte(axes[1], 3.3, -5.0, 'b. distillation', color=CUIVRE)
    axc = axes[2]
    cuve_ccm(axc, 0.0, eluant=1.6, ligne=1.0, couvercle=False)
    texte(axc, 2.0, -5.0, 'c. chromatographie', color=CUIVRE)
    for xs in np.cumsum(largeurs)[:-1] / tot:
        fig.add_artist(matplotlib.lines.Line2D([xs, xs], [0.05, 0.97], color=GRISC, lw=1.0))
    save(fig, 'fig_erreurs')


# ---------------------------------------------------------------- Q.17 : pile et voltmètre ; Q.18 : électrolyse
def becher_u(ax, x0, x1, y0, y1, niveau, couleur=EAU):
    ax.add_patch(Rectangle((x0, y0), x1 - x0, niveau - y0, fc=couleur, ec='none', zorder=1))
    ax.plot([x0, x0, x1, x1], [y1, y0, y0, y1], color=ANTH, lw=1.4, solid_joinstyle='round', zorder=3)


def plaque(ax, xc, y0, y1, couleur, w=0.42):
    ax.add_patch(Rectangle((xc - w / 2, y0), w, y1 - y0, fc=couleur, ec=ANTH, lw=1.0, zorder=4))


def pont_salin(ax, xa, xb, y_bas, y_haut):
    for lw, c in ((11, ANTH), (8.4, SABLE)):
        ax.plot([xa, xa, xb, xb], [y_bas, y_haut, y_haut, y_bas], color=c, lw=lw, solid_joinstyle='round', solid_capstyle='butt', zorder=2.5)


def multimetre(ax, x0, y0, w, h, ecran, bornes, nom=None):
    # multimètre : écran en haut, bornes en bas, nom de chaque borne à côté d'elle ; bornes = [(x relatif, nom, 'g' ou 'd')]
    boitier(ax, x0, y0, w, h, ecran, nom=nom, fs_ecran=10, boutons=False)
    pos = []
    for xr, lab, cote in bornes:
        ax.add_patch(Circle((x0 + xr, y0 + 0.38), 0.17, fc='white', ec=ANTH, lw=1.0, zorder=3.4))
        texte(ax, x0 + xr + (-0.3 if cote == 'g' else 0.3), y0 + 0.38, lab, fs=8, ha='right' if cote == 'g' else 'left')
        pos.append((x0 + xr, y0 + 0.38))
    return pos


def fig_pile_c():
    fig, ax = toile((-5.4, 17.6), (-1.0, 9.6), ech=0.235)
    becher_u(ax, 0.3, 4.9, 0.4, 3.6, 2.8); becher_u(ax, 7.1, 11.7, 0.4, 3.6, 2.8)
    plaque(ax, 1.35, 1.0, 4.9, ZINC); plaque(ax, 10.65, 1.0, 4.9, CUIVRE_M)
    pont_salin(ax, 4.2, 7.8, 1.7, 4.45)
    # borne COM assez loin du bord pour que son nom reste dans le boîtier
    (xa, ya_), (xb, yb_) = multimetre(ax, 4.2, 6.1, 3.6, 2.1, '1,08', [(1.5, 'COM', 'g'), (2.45, 'V', 'd')], nom='voltmètre')
    fil(ax, [xa, xa, 1.35, 1.35], [ya_, 5.6, 5.6, 4.9])
    fil(ax, [xb, xb, 10.65, 10.65], [yb_, 5.6, 5.6, 4.9])
    texte(ax, 6.0, 5.05, 'pont salin (K$^+$ + NO$_3^-$)', fs=9)
    texte(ax, 2.75, 1.45, 'Zn$^{2+}$(aq)\nSO$_4^{2-}$(aq)', fs=9)
    texte(ax, 9.25, 1.45, 'Cu$^{2+}$(aq)\nSO$_4^{2-}$(aq)', fs=9)
    repere(ax, 1.14, 4.3, -0.4, 4.6, 'lame de zinc :\npôle négatif', ha='right')
    repere(ax, 10.86, 4.3, 12.2, 4.6, 'lame de cuivre :\npôle positif')
    texte(ax, 2.6, -0.35, 'anode : oxydation', fs=9, color=BRIQUE)
    texte(ax, 9.4, -0.35, 'cathode : réduction', fs=9, color=BRIQUE)
    save(fig, 'fig_pile_c')


def cle(ax, x, y_haut, L=3.2, couleur=ACIER, depot=None):
    # clé suspendue par son anneau : anneau, tige, panneton
    ax.add_patch(Circle((x, y_haut - 0.45), 0.45, fc=couleur, ec=ANTH, lw=1.0, zorder=4))
    ax.add_patch(Circle((x, y_haut - 0.45), 0.17, fc='white', ec=ANTH, lw=0.8, zorder=4.1))
    ax.add_patch(Rectangle((x - 0.13, y_haut - 0.9 - L), 0.26, L, fc=couleur, ec=ANTH, lw=1.0, zorder=4))
    ax.add_patch(Polygon([(x + 0.13, y_haut - 0.9 - L + 0.2), (x + 0.6, y_haut - 0.9 - L + 0.2), (x + 0.6, y_haut - 0.9 - L + 0.55),
                          (x + 0.42, y_haut - 0.9 - L + 0.55), (x + 0.42, y_haut - 0.9 - L + 0.85), (x + 0.13, y_haut - 0.9 - L + 0.85)],
                         closed=True, fc=couleur, ec=ANTH, lw=1.0, zorder=4))
    return y_haut - 0.9 - L


def fig_electrolyse_c():
    fig, ax = toile((-7.6, 17.6), (-0.6, 11.8), ech=0.235)
    becher_u(ax, 0.6, 9.0, 0.4, 4.6, 3.6, couleur=BLEU_S)
    xa, xc = 2.4, 7.2
    plaque(ax, xa, 1.0, 5.6, CUIVRE_M)
    fil(ax, [xc, xc], [5.6, 7.3])
    cle(ax, xc, 5.6, couleur=ACIER)
    ax.add_patch(Rectangle((xc + 0.13, 1.6), 0.06, 2.4, fc=CUIVRE_M, ec='none', zorder=4.2))       # dépôt de cuivre
    ax.add_patch(Rectangle((xc - 0.19, 1.6), 0.06, 2.4, fc=CUIVRE_M, ec='none', zorder=4.2))
    # générateur de tension continue
    ax.add_patch(FancyBboxPatch((3.4, 9.5), 2.8, 1.5, boxstyle='round,pad=0.0,rounding_size=0.15', fc=GRISM, ec=ANTH, lw=1.2, zorder=3))
    texte(ax, 4.8, 10.55, 'générateur', fs=8.5)
    ax.add_patch(Circle((3.95, 9.9), 0.2, fc='white', ec=BRIQUE, lw=1.0, zorder=3.4)); texte(ax, 3.95, 9.89, '+', fs=9, color=BRIQUE)
    ax.add_patch(Circle((5.65, 9.9), 0.2, fc='white', ec=ANTH, lw=1.0, zorder=3.4)); texte(ax, 5.65, 9.9, '−', fs=9)
    # ampèremètre en série : le courant entre par la borne A, sort par COM, va à l'anode
    # nom de la borne COM à sa gauche : à droite, il débordait du boîtier
    (xA, yA), (xCOM, yCOM) = multimetre(ax, -2.6, 6.0, 3.2, 2.1, '0,50 A', [(0.8, 'A', 'g'), (2.5, 'COM', 'g')], nom='ampèremètre')
    fil(ax, [3.95, 3.95, -3.6, -3.6, xA, xA], [9.7, 9.3, 9.3, 5.6, 5.6, yA])
    fil(ax, [xCOM, xCOM, xa, xa], [yCOM, 5.9, 5.9, 5.6])
    # interrupteur, fermé, sur le fil de la borne négative
    fil(ax, [5.65, 5.65, 7.4], [9.7, 9.3, 9.3])
    ax.add_patch(Circle((7.4, 9.3), 0.08, fc=ANTH, ec='none', zorder=3)); ax.add_patch(Circle((8.4, 9.3), 0.08, fc=ANTH, ec='none', zorder=3))
    fil(ax, [7.4, 8.4], [9.3, 9.3], lw=1.6)
    fil(ax, [8.4, 9.6, 9.6, xc, xc], [9.3, 9.3, 7.3, 7.3, 7.3])
    texte(ax, 7.9, 9.75, 'interrupteur', fs=8.5)
    # courant et électrons dans les fils, ions dans la solution
    fleche(ax, -3.6, 8.0, -3.6, 7.2, color=BRIQUE, lw=1.3, ms=10); texte(ax, -4.0, 7.6, '$I$', color=BRIQUE)
    fleche(ax, xc, 6.2, xc, 6.9, color=BRIQUE, lw=1.3, ms=10); texte(ax, xc + 0.4, 6.55, '$I$', color=BRIQUE)
    fleche(ax, 10.05, 8.9, 10.05, 8.0, color=BLEU, lw=1.3, ms=10); texte(ax, 10.6, 8.45, 'e$^-$', color=BLEU)
    fleche(ax, 3.95, 2.5, 6.0, 2.5, color=VERT, lw=1.3, ms=10); texte(ax, 4.95, 2.95, 'Cu$^{2+}$', fs=9, color=VERT, fond=True)
    fleche(ax, 6.0, 1.6, 3.95, 1.6, color=CUIVRE, lw=1.3, ms=10); texte(ax, 4.95, 1.15, 'SO$_4^{2-}$', fs=9, color=CUIVRE, fond=True)
    repere(ax, xa - 0.21, 3.9, -0.4, 4.1, 'anode, reliée à la\nborne + : lame de cuivre,\noxydée', ha='right')
    repere(ax, xc + 0.6, 1.6, 10.2, 2.6, 'cathode, reliée à la\nborne − : la clé, qui\nse couvre de cuivre')
    repere(ax, 9.0, 0.9, 10.2, 0.7, 'solution de sulfate\nde cuivre(II)')
    save(fig, 'fig_electrolyse_c')


# ---------------------------------------------------------------- Q.19 et exercice 4 : suivi par un capteur de pression
def fig_pression_c():
    fig, ax = toile((-10.2, 17.4), (-1.6, 11.2), ech=0.235)
    agitateur(ax, -2.6, 0.0, 6.4, 0.75)
    # bain d'eau (cristallisoir)
    ax.add_patch(Rectangle((-1.9, 0.79), 5.0, 2.05, fc=EAU, ec='none', zorder=1.6))
    courbe(ax, [(-1.95, 3.3), (-1.95, 0.75), (3.15, 0.75), (3.15, 3.3)], lw=1.3, z=1.9)
    # erlenmeyer bouché
    xe = 0.6
    cxe, ycol = erlen(ax, xe, 0.8, 1.9, 3.2, wc=0.5, hc=1.0, niveau=1.8, couleur='#EEF3F7', z=2.2)
    barreau(ax, xe, 0.8)
    bouchon(ax, xe, ycol - 0.35, w=1.05, h=0.55)
    # seringue : aiguille à travers le bouchon
    ax.add_patch(Rectangle((xe - 0.32 - 0.03, ycol + 0.2), 0.0001, 0.0001, fc='none', ec='none'))
    sx = xe - 0.25
    ax.plot([sx, sx], [ycol - 0.6, ycol + 0.5], color=ANTH, lw=1.0, zorder=5.2)
    ax.add_patch(Rectangle((sx - 0.2, ycol + 0.5), 0.4, 1.9, fc='white', ec=ANTH, lw=1.0, zorder=5.2))
    ax.add_patch(Rectangle((sx - 0.17, ycol + 0.53), 0.34, 0.9, fc='#F2E3C8', ec='none', zorder=5.25))
    ax.plot([sx, sx], [ycol + 2.4, ycol + 3.2], color=ANTH, lw=1.4, zorder=5.2)
    ax.plot([sx - 0.3, sx + 0.3], [ycol + 3.2, ycol + 3.2], color=ANTH, lw=1.6, zorder=5.2)
    ax.plot([sx - 0.17, sx + 0.17], [ycol + 1.43, ycol + 1.43], color=ANTH, lw=1.8, zorder=5.3)
    # tuyau vers le capteur de pression
    tx = xe + 0.25
    ax.plot([tx, tx, 4.8], [ycol + 0.1, ycol + 1.6, ycol + 1.6], color=GRIS, lw=3.2, zorder=1.5, solid_joinstyle='round')
    ax.add_patch(FancyBboxPatch((4.8, ycol + 1.05), 2.2, 1.1, boxstyle='round,pad=0.0,rounding_size=0.12', fc=GRISC, ec=ANTH, lw=1.1, zorder=3))
    # câble vers l'ordinateur
    fil(ax, [7.0, 8.4, 8.4], [ycol + 1.6, ycol + 1.6, 5.0])
    ax.add_patch(Rectangle((8.0, 3.6), 4.6, 3.2, fc=GRISM, ec=ANTH, lw=1.2, zorder=3))
    ax.add_patch(Rectangle((8.25, 3.85), 4.1, 2.7, fc='white', ec=ANTH, lw=0.9, zorder=3.1))
    t = np.linspace(0, 1, 50)
    ax.plot(8.5 + 3.6 * t, 4.15 + 2.0 * (1 - 2 ** (-t / 0.18)), color=BLEU, lw=1.3, zorder=3.2)
    ax.add_patch(Polygon([(8.4, 3.6), (12.2, 3.6), (12.8, 3.1), (7.8, 3.1)], closed=True, fc=GRISC, ec=ANTH, lw=1.0, zorder=3))
    repere(ax, sx - 0.2, ycol + 1.8, -2.4, ycol + 2.4, 'seringue : solution\nd\'ions fer(III), injectée à t = 0', ha='right')
    repere(ax, xe - 0.52, ycol - 0.1, -2.4, ycol - 0.2, 'bouchon : erlenmeyer\nfermé de façon étanche', ha='right')
    repere(ax, xe - 1.2, 1.4, -2.4, 1.9, 'eau oxygénée', ha='right')
    repere(ax, -1.95, 1.0, -2.6, 0.2, 'bain d\'eau à 20 °C', ha='right')
    repere(ax, 3.8, 0.3, 4.6, -0.6, 'agitateur magnétique')
    texte(ax, 7.0, ycol + 0.7, 'capteur de pression', va='top', ha='right')
    texte(ax, 10.6, 7.7, 'ordinateur : acquisition de P(t)')
    save(fig, 'fig_pression_c')


# ---------------------------------------------------------------- graphiques
def virgule(v, p): return ('%g' % v).replace('.', ',').replace('-', '−')
def axes_style(ax, xlab, ylab, size=9.5):
    ax.grid(color=GRISC, lw=0.6)
    ax.grid(which='minor', color=GRISM, lw=0.35); ax.tick_params(which='minor', length=0)
    for sp in ('top', 'right'): ax.spines[sp].set_visible(False)
    for sp in ('left', 'bottom'): ax.spines[sp].set_linewidth(1.0); ax.spines[sp].set_color(ANTH)
    ax.tick_params(labelsize=size - 1, colors=ANTH, width=0.8)
    ax.set_xlabel(xlab, fontsize=size); ax.set_ylabel(ylab, fontsize=size)
    ax.xaxis.set_major_formatter(FuncFormatter(virgule)); ax.yaxis.set_major_formatter(FuncFormatter(virgule))
def tirets(ax, xs, ys, color=BRIQUE, lw=1.0):
    ax.plot(xs, ys, color=color, lw=lw, ls=(0, (4, 2.5)), zorder=4)


# exercice 1 : spectres des deux colorants du sirop, droite d'étalonnage
LAM_E102, LAM_E131 = 427, 638
def spectre_e102(l): return 0.52 * np.exp(-0.5 * ((l - LAM_E102) / 38.0) ** 2)
def spectre_e131(l): return 0.80 * np.exp(-0.5 * ((l - LAM_E131 - 0.6) / 24.0) ** 2) + 0.14 * np.exp(-0.5 * ((l - 588) / 20.0) ** 2)
def trace_spectres(ax, fs=8.5):
    lam = np.linspace(400, 750, 701)
    ax.plot(lam, spectre_e102(lam), color=CUIVRE, lw=1.5, zorder=5)
    ax.plot(lam, spectre_e131(lam), color=BLEU, lw=1.5, zorder=5)
    ax.set_xlim(400, 750); ax.set_ylim(0, 0.9)
    ax.set_xticks(range(400, 751, 50)); ax.set_xticks(range(400, 751, 10), minor=True)
    ax.set_yticks(np.arange(0, 0.91, 0.1)); ax.set_yticks(np.arange(0, 0.91, 0.02), minor=True)
    axes_style(ax, 'Longueur d\'onde λ (nm)', 'Absorbance A', size=9)
    ax.text(LAM_E102 + 22, 0.55, 'tartrazine (E102)', color=CUIVRE, fontsize=fs, ha='left', va='bottom',
            bbox=dict(boxstyle='round,pad=0.1', fc='white', ec='none'), zorder=7)
    ax.text(LAM_E131 - 6, 0.83, 'bleu patenté V (E131)', color=BLEU, fontsize=fs, ha='right', va='bottom',
            bbox=dict(boxstyle='round,pad=0.1', fc='white', ec='none'), zorder=7)
    return lam


C_ETAL = np.array([2.0, 4.0, 6.0, 8.0, 10.0]); A_ETAL = np.array([0.21, 0.41, 0.63, 0.85, 1.05])
K_SIROP = float(np.sum(A_ETAL * C_ETAL) / np.sum(C_ETAL ** 2))
def trace_etalonnage(ax, size=9):
    x = np.linspace(0, 11, 50); ax.plot(x, K_SIROP * x, color=BLEU, lw=1.4, zorder=4)
    ax.plot(C_ETAL, A_ETAL, 'o', color=ANTH, ms=4.2, zorder=6)
    ax.set_xlim(0, 11); ax.set_ylim(0, 1.2)
    ax.set_xticks(range(0, 12, 1)); ax.set_xticks(np.arange(0, 11.01, 0.2), minor=True)
    ax.set_yticks(np.arange(0, 1.21, 0.2)); ax.set_yticks(np.arange(0, 1.21, 0.05), minor=True)
    axes_style(ax, 'Concentration en E131 (µmol·L$^{-1}$)', 'Absorbance A', size=size)


def fig_sirop():
    # énoncé de l'exercice 1 : a, spectres des deux colorants ; b, courbe d'étalonnage
    fig = plt.figure(figsize=(7.7, 2.75))
    ax1 = fig.add_axes([0.075, 0.18, 0.39, 0.70]); ax2 = fig.add_axes([0.585, 0.18, 0.40, 0.70])
    lam = trace_spectres(ax1); trace_etalonnage(ax2)
    for ax, lettre in ((ax1, 'a'), (ax2, 'b')):
        ax.text(-0.12, 1.06, lettre, fontsize=11, color=CUIVRE, ha='left', va='bottom', transform=ax.transAxes, clip_on=False)
    save(fig, 'fig_sirop')
    print('Ex. 1 contrôle : maximum E131 à %.0f nm ; tartrazine à 638 nm : %.4f ; k = %.4f L/µmol'
          % (lam[np.argmax(spectre_e131(lam))], spectre_e102(638), K_SIROP))


def fig_sirop_etalonnage_c():
    fig, ax = plt.subplots(figsize=(4.8, 2.6)); fig.subplots_adjust(0.12, 0.18, 0.98, 0.97)
    trace_etalonnage(ax, size=9.5)
    cl = 0.54 / K_SIROP
    tirets(ax, [0, cl, cl], [0.54, 0.54, 0], color=BRIQUE)
    ax.plot([cl], [0.54], 'o', color=BRIQUE, ms=4, zorder=8)
    ax.text(cl + 0.25, 0.42, 'A = 0,54 : 5,1 µmol·L$^{-1}$', fontsize=8.5, color=BRIQUE, ha='left', va='top',
            bbox=dict(boxstyle='round,pad=0.12', fc='white', ec='none'), zorder=7)
    save(fig, 'fig_sirop_etalonnage_c')
    print('Ex. 1 contrôle : A = 0,54 -> %.2f µmol/L' % cl)


# exercice 2 : lecture d'une burette, l'œil à trois hauteurs
def oeil(ax, x, y, s=1.0):
    t = np.linspace(-1, 1, 40)
    haut = [(x + 0.55 * s * u, y + 0.22 * s * (1 - u * u)) for u in t]
    bas = [(x + 0.55 * s * u, y - 0.22 * s * (1 - u * u)) for u in t[::-1]]
    ax.add_patch(Polygon(haut + bas, closed=True, fc='white', ec=ANTH, lw=1.0, zorder=5))
    ax.add_patch(Circle((x - 0.18 * s, y), 0.16 * s, fc=ANTH, ec='none', zorder=5.1))


def fig_burette():
    fig, ax = toile((-2.6, 9.2), (-1.0, 7.4), ech=0.3)
    # tube de burette vu de près : graduations de 16 à 17 mL, tous les 0,1 mL ; le zéro est en haut
    x0, x1 = 0.0, 2.2
    y16, y17 = 6.0, 1.0                                   # 1 mL = 5 unités
    ym = y16 - 0.8 * (y16 - y17)                           # bas du ménisque à 16,80 mL
    ax.add_patch(Rectangle((x0, -0.8), x1 - x0, ym + 0.35 - (-0.8), fc=BLEU_S, ec='none', zorder=1))
    # ménisque : surface concave, plus haute contre la paroi
    xs = np.linspace(x0, x1, 60); ys = ym + 0.35 * ((xs - (x0 + x1) / 2) / ((x1 - x0) / 2)) ** 2
    ax.add_patch(Polygon(list(zip(xs, ys)) + [(x1, ym + 0.6), (x0, ym + 0.6)], closed=True, fc='white', ec='none', zorder=1.1))
    ax.plot(xs, ys, color=BLEU, lw=1.3, zorder=1.2)
    courbe(ax, [(x0, -0.8), (x0, 7.0)], lw=1.4); courbe(ax, [(x1, -0.8), (x1, 7.0)], lw=1.4)
    # graduations sur la paroi de droite, tournée vers les yeux, comme sur une vraie burette (face graduée vers l'opérateur)
    for k in range(-3, 14):
        y = y16 - k * 0.5
        if -0.8 < y < 7.0:
            L = 1.1 if k % 10 == 0 else (0.75 if k % 5 == 0 else 0.45)
            ax.plot([x1 - L, x1], [y, y], color=ANTH, lw=0.9 if k % 10 else 1.3, zorder=3)
    texte(ax, x1 - 1.5, y16, '16', fs=10); texte(ax, x1 - 1.5, y17, '17', fs=10)
    # trois positions de l'œil, et leurs lignes de visée vers le bas du ménisque
    pm = ((x0 + x1) / 2, ym)
    for lettre, (xo, yo) in (('a', (7.0, ym + 2.4)), ('b', (7.0, ym)), ('c', (7.0, ym - 2.4))):
        oeil(ax, xo, yo)
        ax.plot([pm[0], xo - 0.6], [pm[1], yo], color=GRIS, lw=0.9, ls=(0, (3, 2)), zorder=4)
        texte(ax, xo + 1.0, yo, lettre, fs=11, color=CUIVRE)
    save(fig, 'fig_burette')


# exercice 4 : pression au cours du temps
P0_H2O2, DP_H2O2, T12_H2O2 = 1013.0, 2.0e-3 * 8.314 * 293 / 2.40e-4 / 100, 4.0
def p_h2o2(t): return P0_H2O2 + DP_H2O2 * (1 - 2 ** (-t / T12_H2O2))
def fig_h2o2(corrige):
    fig, ax = plt.subplots(figsize=(4.9, 2.75)); fig.subplots_adjust(0.14, 0.16, 0.98, 0.97)
    t = np.linspace(0, 30, 601)
    ax.plot(t, p_h2o2(t), color=BLEU, lw=1.6, zorder=5)
    ax.set_xlim(0, 30); ax.set_ylim(1000, 1240)
    ax.set_xticks(range(0, 31, 2)); ax.set_xticks(np.arange(0, 30.01, 0.5), minor=True)
    ax.set_yticks(range(1000, 1241, 20)); ax.set_yticks(range(1000, 1241, 5), minor=True)
    axes_style(ax, 'Temps t (min)', 'Pression P (hPa)')
    ax.yaxis.set_major_formatter(FuncFormatter(lambda v, p: ('%d' % v) if v < 1000 else '%d %03d' % (v // 1000, v % 1000)))
    if corrige:
        pf = P0_H2O2 + DP_H2O2; pd = P0_H2O2 + DP_H2O2 / 2
        tirets(ax, [0, 30], [pf, pf], color=GRIS)
        tirets(ax, [0, T12_H2O2, T12_H2O2], [pd, pd, 1000], color=BRIQUE)
        ax.plot([T12_H2O2], [pd], 'o', color=BRIQUE, ms=4, zorder=8)
        ax.text(T12_H2O2 + 0.6, 1040, '$t_{1/2}$ = 4,0 min', fontsize=8.5, color=BRIQUE, ha='left', va='center',
                bbox=dict(boxstyle='round,pad=0.12', fc='white', ec='none'), zorder=7)
        ax.text(0.5, pd + 6, '$P_0$ + ($P_\\mathrm{f}$ − $P_0$)/2 = 1 115 hPa', fontsize=8.5, color=BRIQUE, ha='left', va='bottom',
                bbox=dict(boxstyle='round,pad=0.12', fc='white', ec='none'), zorder=7)
        ax.text(29.5, pf + 5, '$P_\\mathrm{f}$ = 1 216 hPa', fontsize=8.5, color=GRIS, ha='right', va='bottom',
                bbox=dict(boxstyle='round,pad=0.12', fc='white', ec='none'), zorder=7)
    save(fig, 'fig_h2o2' + ('_c' if corrige else ''))
    print('Ex. 4 contrôle : DP = %.1f hPa ; P(4 min) = %.1f hPa ; P(8 min) = %.1f hPa ; P(30 min) = %.1f hPa'
          % (DP_H2O2, p_h2o2(4), p_h2o2(8), p_h2o2(30)))


# ---------------------------------------------------------------- production
FIGURES = {}
def figure(nom, fn):
    FIGURES[nom] = fn
figure('fig_verrerie', fig_verrerie)
figure('fig_dissolution', fig_dissolution)
figure('fig_spectro', lambda: fig_spectro(False))
figure('fig_spectro_c', lambda: fig_spectro(True))
figure('fig_conductimetre', fig_conductimetre)
figure('fig_phmetre', fig_phmetre)
figure('fig_titrage_c', fig_titrage_c)
figure('fig_titrage_variantes', fig_titrage_variantes)
figure('fig_reflux_c', fig_reflux_c)
figure('fig_deanstark', lambda: fig_deanstark(False))
figure('fig_deanstark_c', lambda: fig_deanstark(True))
figure('fig_distillation_c', fig_distillation_c)
figure('fig_ampoule_c', fig_ampoule_c)
figure('fig_buchner_c', fig_buchner_c)
figure('fig_ccm', fig_ccm)
figure('fig_ccm_c', fig_ccm_c)
figure('fig_erreurs', fig_erreurs)
figure('fig_pile_c', fig_pile_c)
figure('fig_electrolyse_c', fig_electrolyse_c)
figure('fig_pression_c', fig_pression_c)
figure('fig_sirop', fig_sirop)
figure('fig_sirop_etalonnage_c', fig_sirop_etalonnage_c)
figure('fig_burette', fig_burette)
figure('fig_h2o2', lambda: fig_h2o2(False))
figure('fig_h2o2_c', lambda: fig_h2o2(True))

if __name__ == '__main__':
    for nom, fn in FIGURES.items():
        if not SEULES or nom in SEULES:
            fn()
