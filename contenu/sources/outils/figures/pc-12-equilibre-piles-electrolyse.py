# Figures de la fiche PC 12 (Équilibre, piles et électrolyse), palette MasterBac
# usage : pc-12-equilibre-piles-electrolyse.py <dossier de sortie, en général fiches/pc-12-equilibre-piles-electrolyse/figs>
# Conventions des schémas corrigés : courant I en brique, électrons en bleu, cations en vert, anions en cuivre.
import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, FancyArrowPatch, Polygon
from PIL import Image, ImageChops

out = sys.argv[1]
ANTH='#2B2C2D'; CUIVRE='#A47351'; GRIS='#8A8F98'; GRISC='#DAD5D0'; GRISM='#EFEBE7'
VERT='#2E6B4F'; BRIQUE='#B23A2E'; BLEU='#2F5D8A'; EAU='#DCE9F2'; SABLE='#F4E3C3'
ALU='#C9CDD2'; CU='#C98B5E'; NI='#A9ADA4'; GRAPH='#55595E'; TITANE='#B8BDC4'
plt.rcParams.update({'font.family':'Carlito','font.size':11,'mathtext.fontset':'stix',
                     'axes.linewidth':0,'savefig.dpi':300})

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
    print(name,rogne(p))
def toile(w, h, xlim, ylim):
    fig, ax = plt.subplots(figsize=(w, h)); fig.subplots_adjust(0, 0, 1, 1)
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.set_aspect('equal'); ax.axis('off')
    return fig, ax
def texte(ax, x, y, t, fs=9.5, color=ANTH, ha='center', va='center', fond=False):
    kw = dict(bbox=dict(boxstyle='round,pad=0.15', fc='white', ec='none')) if fond else {}
    ax.text(x, y, t, fontsize=fs, color=color, ha=ha, va=va, zorder=8, **kw)

# ---------------------------------------------------------------- éléments de schéma
def becher(ax, x0, x1, y0, y1, niveau, couleur=EAU):
    ax.add_patch(Rectangle((x0, y0), x1 - x0, niveau - y0, fc=couleur, ec='none', zorder=1))
    ax.plot([x0, x0, x1, x1], [y1, y0, y0, y1], color=ANTH, lw=1.4, solid_joinstyle='round', zorder=3)
def plaque(ax, xc, y0, y1, couleur, w=0.42):
    ax.add_patch(Rectangle((xc - w / 2, y0), w, y1 - y0, fc=couleur, ec=ANTH, lw=1.0, zorder=4))
def fil(ax, xs, ys):
    ax.plot(xs, ys, color=ANTH, lw=1.3, solid_joinstyle='round', zorder=2)
def resistance(ax, xc, yc, L=1.2, h=0.42):
    ax.add_patch(Rectangle((xc - L / 2, yc - h / 2), L, h, fc='white', ec=ANTH, lw=1.3, zorder=5))
def appareil(ax, xc, yc, lettre, r=0.42):
    ax.add_patch(Circle((xc, yc), r, fc='white', ec=ANTH, lw=1.3, zorder=5))
    ax.text(xc, yc, lettre, fontsize=10, ha='center', va='center', color=ANTH, zorder=6)
def borne(ax, x, y, s, color=ANTH, r=0.2):
    ax.add_patch(Circle((x, y), r, fc='white', ec=color, lw=1.0, zorder=6))
    ax.text(x, y - 0.01, '+' if s > 0 else '−', fontsize=9, ha='center', va='center', color=color, zorder=7)
def fleche(ax, x0, y0, x1, y1, color, lw=1.4):
    ax.add_patch(FancyArrowPatch((x0, y0), (x1, y1), arrowstyle='-|>', mutation_scale=10, color=color, lw=lw, shrinkA=0, shrinkB=0, zorder=7))
def pont_salin(ax, xa, xb, y_bas, y_haut):
    for lw, c in ((11, ANTH), (8.4, SABLE)):
        ax.plot([xa, xa, xb, xb], [y_bas, y_haut, y_haut, y_bas], color=c, lw=lw, solid_joinstyle='round', solid_capstyle='butt', zorder=2.5)
def bulles(ax, xc, y0, y1, n=7, seed=1):
    rng = np.random.default_rng(seed)
    for i in range(n):
        x = xc + rng.uniform(-0.28, 0.28); y = y0 + (y1 - y0) * (i + rng.uniform(0, 0.6)) / n
        ax.add_patch(Circle((x, y), 0.07 + 0.03 * rng.uniform(), fc='white', ec=ANTH, lw=0.7, zorder=4.5))

# ---------------------------------------------------------------- Q.9 et Q.11 : pile cuivre-aluminium
def fig_pile(corrige):
    fig, ax = toile(5.8, 3.9, (-0.6, 12.6), (-0.9, 7.6))
    becher(ax, 0.3, 4.9, 0.4, 3.6, 2.8); becher(ax, 7.1, 11.7, 0.4, 3.6, 2.8)
    plaque(ax, 1.35, 1.0, 4.7, ALU); plaque(ax, 10.65, 1.0, 4.7, CU)
    pont_salin(ax, 4.2, 7.8, 1.7, 4.45)
    fil(ax, [1.35, 1.35, 10.65, 10.65], [4.7, 6.6, 6.6, 4.7])
    resistance(ax, 4.4, 6.6); appareil(ax, 7.6, 6.6, 'A')
    texte(ax, 6.0, 4.95, 'pont salin (K$^+$ + Cl$^-$)', fs=9)
    texte(ax, 0.95, 4.3, 'lame\nd\'aluminium', fs=9, ha='right')
    texte(ax, 11.05, 4.3, 'lame\nde cuivre', fs=9, ha='left')
    texte(ax, 2.85, 1.55, 'Al$^{3+}$(aq)\nSO$_4^{2-}$(aq)', fs=9)
    texte(ax, 9.15, 1.55, 'Cu$^{2+}$(aq)\nSO$_4^{2-}$(aq)', fs=9)
    if corrige:
        borne(ax, 1.35, 5.2, -1, BRIQUE); borne(ax, 10.65, 5.2, +1, BRIQUE)
        fleche(ax, 9.5, 6.6, 8.8, 6.6, BRIQUE); texte(ax, 9.15, 6.95, '$I$', color=BRIQUE)
        fleche(ax, 1.35, 6.15, 1.35, 5.55, BRIQUE); texte(ax, 0.95, 5.85, '$I$', color=BRIQUE)
        fleche(ax, 2.3, 7.1, 3.2, 7.1, BLEU); texte(ax, 2.75, 7.42, 'e$^-$', color=BLEU)
        fleche(ax, 5.8, 4.02, 4.65, 4.02, CUIVRE); texte(ax, 5.45, 3.62, 'Cl$^-$', fs=9, color=CUIVRE)
        fleche(ax, 6.2, 4.02, 7.35, 4.02, VERT); texte(ax, 6.55, 3.62, 'K$^+$', fs=9, color=VERT)
        texte(ax, 2.6, -0.3, 'anode : oxydation', fs=9, color=BRIQUE)
        texte(ax, 9.4, -0.3, 'cathode : réduction', fs=9, color=BRIQUE)
    save(fig, 'fig_pile' + ('_c' if corrige else ''))
fig_pile(False); fig_pile(True)

# ---------------------------------------------------------------- Q.10, exercices 2 et 3 : cellules à deux électrodes séparées
def cellule(ax, nom1, nom2, coul1, coul2, milieu, coul_milieu, entree1=None, entree2=None, sortie1=None, sortie2=None, charge='R'):
    # électrode 1 à gauche, électrode 2 à droite, milieu conducteur ionique au centre, circuit extérieur en haut
    ax.add_patch(Rectangle((1.5, 0.6), 1.6, 3.6, fc=coul1, ec=ANTH, lw=1.2, zorder=3))
    ax.add_patch(Rectangle((3.1, 0.6), 2.8, 3.6, fc=coul_milieu, ec=ANTH, lw=1.2, zorder=2))
    ax.add_patch(Rectangle((5.9, 0.6), 1.6, 3.6, fc=coul2, ec=ANTH, lw=1.2, zorder=3))
    texte(ax, 2.3, 2.4, nom1, fs=9, fond=True); texte(ax, 6.7, 2.4, nom2, fs=9, fond=True)
    texte(ax, 4.5, 3.6, milieu, fs=8.5, fond=True)
    fil(ax, [2.3, 2.3, 6.7, 6.7], [4.2, 5.9, 5.9, 4.2])
    if charge == 'R': resistance(ax, 4.5, 5.9)
    else: appareil(ax, 4.5, 5.9, charge, r=0.45)
    if entree1: fleche(ax, 0.1, 3.2, 1.45, 3.2, ANTH, lw=1.2); texte(ax, 0.75, 3.55, entree1, fs=9)
    if sortie1: fleche(ax, 1.45, 1.4, 0.1, 1.4, ANTH, lw=1.2); texte(ax, 0.75, 1.75, sortie1, fs=9)
    if entree2: fleche(ax, 8.9, 3.2, 7.55, 3.2, ANTH, lw=1.2); texte(ax, 8.25, 3.55, entree2, fs=9)
    if sortie2: fleche(ax, 7.55, 1.4, 8.9, 1.4, ANTH, lw=1.2); texte(ax, 8.25, 1.75, sortie2, fs=9)
def annoter_cellule(ax, ion, gauche_vers_droite, coul_ion, gauche='−'):
    # électrode de gauche négative : électrons de gauche à droite dans le circuit, courant de droite à gauche
    borne(ax, 2.3, 4.55, -1 if gauche == '−' else +1, BRIQUE); borne(ax, 6.7, 4.55, +1 if gauche == '−' else -1, BRIQUE)
    fleche(ax, 6.0, 5.9, 5.35, 5.9, BRIQUE); texte(ax, 5.7, 6.25, '$I$', color=BRIQUE)
    fleche(ax, 2.9, 6.35, 3.8, 6.35, BLEU); texte(ax, 3.35, 6.68, 'e$^-$', color=BLEU)
    xa, xb = (3.55, 5.45) if gauche_vers_droite else (5.45, 3.55)
    fleche(ax, xa, 1.7, xb, 1.7, coul_ion); texte(ax, 4.5, 2.1, ion, fs=9.5, color=coul_ion, fond=True)

def fig_pem(corrige):
    fig, ax = toile(5.0, 3.6, (-0.4, 9.4), (-0.1, 6.95))
    cellule(ax, 'électrode\n1', 'électrode\n2', GRISC, GRISC, 'membrane\n(ions H$^+$)', SABLE,
            entree1='CH$_3$OH + H$_2$O', sortie1='CO$_2$', entree2='O$_2$', sortie2='H$_2$O')
    if corrige: annoter_cellule(ax, 'H$^+$', True, VERT)
    save(fig, 'fig_pem' + ('_c' if corrige else ''))
fig_pem(False); fig_pem(True)

def fig_sofc(corrige):
    fig, ax = toile(5.0, 3.6, (-0.4, 9.4), (-0.1, 6.95))
    cellule(ax, 'électrode\n1', 'électrode\n2', GRISC, GRISC, 'électrolyte\nsolide\n(ions O$^{2-}$)', SABLE,
            entree1='H$_2$', sortie1='H$_2$O', entree2='air', sortie2=None)
    if corrige: annoter_cellule(ax, 'O$^{2-}$', False, CUIVRE)
    save(fig, 'fig_sofc' + ('_c' if corrige else ''))
fig_sofc(False); fig_sofc(True)

def fig_liion(corrige):
    fig, ax = toile(5.0, 3.6, (-0.4, 9.4), (-0.1, 6.95))
    cellule(ax, 'graphite\nLiC$_6$', 'CoO$_2$\nLiCoO$_2$', GRAPH, GRISC, 'électrolyte\n(ions Li$^+$)', EAU, charge='M')
    ax.plot([4.5, 4.5], [0.6, 4.2], color=ANTH, lw=1.0, ls=(0, (4, 3)), zorder=2.5)
    if corrige: annoter_cellule(ax, 'Li$^+$', True, VERT)
    save(fig, 'fig_liion' + ('_c' if corrige else ''))
fig_liion(False); fig_liion(True)

# ---------------------------------------------------------------- Q.15, exercices 4 et 5 : électrolyseurs
def electrolyseur(ax, nom_g, nom_d, coul_g, coul_d, solution, gaz_g=None, gaz_d=None):
    becher(ax, 0.9, 7.1, 0.4, 3.9, 3.1)
    plaque(ax, 2.2, 1.0, 4.9, coul_g, w=0.5); plaque(ax, 5.8, 1.0, 4.9, coul_d, w=0.5)
    fil(ax, [2.2, 2.2, 5.8, 5.8], [4.9, 6.4, 6.4, 4.9])
    appareil(ax, 4.0, 6.4, 'G', r=0.48)
    texte(ax, 1.65, 4.45, nom_g, fs=9, ha='right'); texte(ax, 6.35, 4.45, nom_d, fs=9, ha='left')
    texte(ax, 4.0, 1.25, solution, fs=9)
    if gaz_g: bulles(ax, 2.2, 1.3, 2.9, n=4, seed=3); texte(ax, 2.95, 2.45, gaz_g, fs=9, ha='left')
    if gaz_d: bulles(ax, 5.8, 1.3, 2.9, n=8, seed=5); texte(ax, 5.05, 2.45, gaz_d, fs=9, ha='right')
def annoter_electrolyseur(ax, cation, anion, nom_anode='anode : oxydation', nom_cathode='cathode : réduction'):
    # électrode de gauche reliée à la borne +, électrode de droite reliée à la borne -
    borne(ax, 3.3, 6.4, +1, BRIQUE); borne(ax, 4.7, 6.4, -1, BRIQUE)
    fleche(ax, 2.2, 5.9, 2.2, 5.25, BRIQUE); texte(ax, 2.55, 5.6, '$I$', color=BRIQUE)
    fleche(ax, 5.8, 5.25, 5.8, 5.9, BRIQUE); texte(ax, 5.45, 5.6, '$I$', color=BRIQUE)
    fleche(ax, 6.3, 6.0, 6.3, 5.3, BLEU); texte(ax, 6.7, 5.65, 'e$^-$', color=BLEU)
    fleche(ax, 1.7, 5.3, 1.7, 6.0, BLEU); texte(ax, 1.3, 5.65, 'e$^-$', color=BLEU)
    if cation: fleche(ax, 3.35, 2.15, 4.75, 2.15, VERT); texte(ax, 4.05, 2.5, cation, fs=9, color=VERT, fond=True)
    if anion: fleche(ax, 4.75, 1.8, 3.35, 1.8, CUIVRE); texte(ax, 4.05, 1.45, anion, fs=9, color=CUIVRE, fond=True)
    texte(ax, 2.2, -0.15, nom_anode, fs=9, color=BRIQUE); texte(ax, 5.8, -0.15, nom_cathode, fs=9, color=BRIQUE)

def fig_nickelage(corrige):
    fig, ax = toile(4.8, 3.9, (-0.6, 8.6), (-0.6, 6.95))
    electrolyseur(ax, 'plaque\nde nickel', 'pièce\nà nickeler', NI, GRISC, 'Ni$^{2+}$(aq) + SO$_4^{2-}$(aq)' if not corrige else '')
    if corrige: annoter_electrolyseur(ax, 'Ni$^{2+}$', 'SO$_4^{2-}$')
    save(fig, 'fig_nickelage' + ('_c' if corrige else ''))
fig_nickelage(False); fig_nickelage(True)

def fig_plantes(corrige):
    fig, ax = toile(4.8, 3.9, (-0.6, 8.6), (-0.6, 6.95))
    electrolyseur(ax, 'électrode\nde carbone', 'électrode\nde titane', GRAPH, TITANE, 'solution acidifiée\nd\'ions Ni$^{2+}$' if not corrige else '',
                  gaz_g='O$_2$')
    if corrige: annoter_electrolyseur(ax, 'Ni$^{2+}$', None)
    save(fig, 'fig_plantes' + ('_c' if corrige else ''))
fig_plantes(False); fig_plantes(True)

def fig_eau(corrige):
    fig, ax = toile(4.8, 3.9, (-0.6, 8.6), (-0.6, 6.95))
    electrolyseur(ax, 'électrode\nA', 'électrode\nB', GRISC, GRISC, 'eau acidifiée' if not corrige else '', gaz_g='O$_2$', gaz_d='H$_2$')
    if corrige: annoter_electrolyseur(ax, 'H$^+$', None)
    save(fig, 'fig_eau' + ('_c' if corrige else ''))
fig_eau(False); fig_eau(True)

# ---------------------------------------------------------------- Q.3 : critère d'évolution spontanée
def fig_critere():
    fig, ax = toile(5.6, 1.7, (-0.3, 11.3), (-1.55, 1.75))
    fleche(ax, 0.0, 0.0, 11.0, 0.0, ANTH, lw=1.3); texte(ax, 10.9, -0.4, '$Q_\\mathrm{r}$', fs=11, ha='right')
    ax.plot([5.5, 5.5], [-0.22, 0.22], color=ANTH, lw=1.5, zorder=6); texte(ax, 5.5, -0.5, '$K$', fs=11)
    fleche(ax, 1.4, 0.55, 4.9, 0.55, VERT, lw=1.8); texte(ax, 3.15, 1.15, '$Q_\\mathrm{r} < K$ : évolution\ndans le sens direct', fs=9, color=VERT)
    fleche(ax, 9.6, 0.55, 6.1, 0.55, CUIVRE, lw=1.8); texte(ax, 7.85, 1.15, '$Q_\\mathrm{r} > K$ : évolution\ndans le sens indirect', fs=9, color=CUIVRE)
    texte(ax, 5.5, -1.1, '$Q_\\mathrm{r} = K$ : équilibre, pas d\'évolution', fs=9)
    save(fig, 'fig_critere')
fig_critere()
