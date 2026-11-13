# Figures de la fiche PC 11 (Cinétique chimique et radioactivité), palette MasterBac
# usage : pc-11-cinetique-radioactivite.py <dossier de sortie, en général fiches/pc-11-cinetique-radioactivite/figs>
import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
from matplotlib.patches import FancyArrowPatch, Rectangle
from PIL import Image, ImageChops

out = sys.argv[1]
ANTH='#2B2C2D'; CUIVRE='#A47351'; GRIS='#8A8F98'; GRISC='#DAD5D0'; GRISM='#EFEBE7'
VERT='#2E6B4F'; BRIQUE='#B23A2E'; BLEU='#2F5D8A'; EAU='#DCE9F2'; SABLE='#F4E3C3'
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
def virgule(v,p): return ('%g' % v).replace('.',',').replace('-','−')
def fr(v, fmt='%.1f'): return (fmt % v).replace('.', ',').replace('-', '−')
def axes_style(ax,xlab,ylab,size=10):
    ax.grid(color=GRISC,lw=0.6)
    ax.grid(which='minor',color=GRISM,lw=0.35); ax.tick_params(which='minor',length=0)
    for s in ('top','right'): ax.spines[s].set_visible(False)
    for s in ('left','bottom'): ax.spines[s].set_linewidth(1.0); ax.spines[s].set_color(ANTH)
    ax.tick_params(labelsize=size-1,colors=ANTH,width=0.8)
    ax.set_xlabel(xlab,fontsize=size); ax.set_ylabel(ylab,fontsize=size)
    ax.xaxis.set_major_formatter(FuncFormatter(virgule)); ax.yaxis.set_major_formatter(FuncFormatter(virgule))
def tirets(ax,xs,ys,color=BRIQUE,lw=1.0):
    ax.plot(xs,ys,color=color,lw=lw,ls=(0,(4,2.5)),zorder=4)
def etiquette(ax, x, y, t, color=BRIQUE, ha='left', va='center', fs=8.5):
    ax.text(x, y, t, fontsize=fs, color=color, ha=ha, va=va,
            bbox=dict(boxstyle='round,pad=0.12', fc='white', ec='none'), zorder=9)
def grille(ax, xmax, xmaj, xmin_, ymax, ymaj, ymin_, ymin=0):
    ax.set_xlim(0, xmax); ax.set_ylim(ymin, ymax)
    ax.set_xticks(np.arange(0, xmax + 1e-9, xmaj)); ax.set_xticks(np.arange(0, xmax + 1e-9, xmin_), minor=True)
    ax.set_yticks(np.arange(ymin, ymax + 1e-9, ymaj)); ax.set_yticks(np.arange(ymin, ymax + 1e-9, ymin_), minor=True)

# ---------------------------------------------------------------- Q.3 et Q.4 : apparition du diiode, [I2](t) = 5,0 (1 - exp(-t/10)) mmol/L
TAU_I = 10.0; IF = 5.0
def iode(t): return IF * (1 - np.exp(-t / TAU_I))
def fig_iode(mode):
    fig, ax = plt.subplots(figsize=(4.8, 2.7)); fig.subplots_adjust(0.12, 0.17, 0.98, 0.97)
    t = np.linspace(0, 40, 400)
    ax.plot(t, iode(t), color=BLEU, lw=1.8, zorder=5)
    grille(ax, 40, 5, 1, 6, 1, 0.2)
    axes_style(ax, 'Temps t (min)', '[I$_2$] (mmol·L$^{-1}$)')
    if mode == 't':
        # tangente à l'origine : pente IF/TAU ; tangente à t = 10 min : passe par (0 ; 1,32) et (20 ; 5,0)
        x = np.array([0, 12]); ax.plot(x, IF / TAU_I * x, color=BRIQUE, lw=1.2, zorder=6)
        p = IF / TAU_I * np.exp(-10 / TAU_I); y10 = iode(10.0)
        x = np.array([0, 24]); ax.plot(x, y10 + p * (x - 10), color=VERT, lw=1.2, zorder=6)
        ax.plot([10], [y10], 'o', color=VERT, ms=4, zorder=8)
        for (xa, ya, c) in ((10, 5.0, BRIQUE), (0, y10 - 10 * p, VERT), (20, y10 + 10 * p, VERT)):
            ax.plot([xa], [ya], 's', color=c, ms=3.6, zorder=8, clip_on=False)
        etiquette(ax, 10.6, 5.25, 'tangente à t = 0', color=BRIQUE)
        etiquette(ax, 24.8, 5.45, 'tangente à t = 10 min', color=VERT)
        print('fig_iode contrôle : pente à 0 = %.3f ; pente à 10 min = %.4f ; ordonnées %.2f et %.2f' % (IF / TAU_I, p, y10 - 10 * p, y10 + 10 * p))
    if mode == 'm':
        th = TAU_I * np.log(2)
        tirets(ax, [0, 40], [IF, IF], color=GRIS, lw=0.9)
        tirets(ax, [0, th], [IF / 2, IF / 2]); tirets(ax, [th, th], [0, IF / 2])
        ax.plot([th], [IF / 2], 'o', color=BRIQUE, ms=4, zorder=8)
        etiquette(ax, th + 0.6, 0.45, '$t_{1/2}$ ≈ 7 min')
        etiquette(ax, 0.6, IF / 2 + 0.7, '[I$_2$]$_\\mathrm{f}$ / 2 =\n2,5 mmol·L$^{-1}$', ha='left')
        etiquette(ax, 30, IF + 0.32, '[I$_2$]$_\\mathrm{f}$ = 5,0 mmol·L$^{-1}$', color=GRIS, ha='center')
        print('fig_iode contrôle : t1/2 = %.2f min' % th)
    save(fig, 'fig_iode' + ('' if mode == '' else '_' + mode))
fig_iode(''); fig_iode('t'); fig_iode('m')

# ---------------------------------------------------------------- Q.6 : trois expériences, transformation totale A -> P d'ordre 1
def fig_trois():
    fig, ax = plt.subplots(figsize=(4.8, 2.8)); fig.subplots_adjust(0.12, 0.17, 0.98, 0.97)
    t = np.linspace(0, 40, 400)
    courbes = (('a', 10.0, 0.050, CUIVRE), ('b', 20.0, 0.20, BLEU), ('c', 10.0, 0.20, VERT))
    for nom, c0, k, col in courbes:
        y = c0 * (1 - np.exp(-k * t)); ax.plot(t, y, color=col, lw=1.7, zorder=5)
    ax.text(30, 8.1, 'a', color=CUIVRE, fontsize=11, fontweight='bold')
    ax.text(30, 18.6, 'b', color=BLEU, fontsize=11, fontweight='bold')
    ax.text(30, 10.7, 'c', color=VERT, fontsize=11, fontweight='bold')
    grille(ax, 40, 5, 1, 22, 2, 1)
    axes_style(ax, 'Temps t (min)', '[P] (mmol·L$^{-1}$)')
    save(fig, 'fig_trois')
fig_trois()

# ---------------------------------------------------------------- Exercice 1 : estérification, n_E(t) = 7,9 (1 - exp(-t/6)) mmol
T_J = np.array([0, 2, 4, 6, 10, 15, 20, 30, 45, 60.0])
NAC = np.array([10.5, 8.3, 6.7, 5.5, 4.1, 3.2, 2.9, 2.7, 2.6, 2.6])
NE = 10.5 - NAC
def fig_jasmin(corrige):
    fig, ax = plt.subplots(figsize=(4.8, 2.8)); fig.subplots_adjust(0.12, 0.17, 0.98, 0.97)
    t = np.linspace(0, 60, 600)
    ax.plot(t, 7.9 * (1 - np.exp(-t / 6)), color=BLEU, lw=1.6, zorder=5)
    ax.plot(T_J, NE, 'o', color=ANTH, ms=3.6, zorder=7, clip_on=False)
    x = np.array([0, 7.6]); ax.plot(x, 7.9 / 6 * x, color=BRIQUE, lw=1.1, zorder=6)
    etiquette(ax, 8.0, 9.6, 'tangente à l\'origine', color=BRIQUE)
    grille(ax, 60, 10, 2, 10, 1, 0.2)
    axes_style(ax, 'Temps t (min)', '$n_\\mathrm{E}$ (mmol)')
    if corrige:
        th = 6 * np.log(2)
        tirets(ax, [0, 60], [7.9, 7.9], color=GRIS, lw=0.9)
        tirets(ax, [0, th], [3.95, 3.95]); tirets(ax, [th, th], [0, 3.95])
        ax.plot([th], [3.95], 'o', color=BRIQUE, ms=4, zorder=8)
        ax.plot([6.0], [7.9], 's', color=BRIQUE, ms=3.8, zorder=8)
        etiquette(ax, th + 1.0, 0.6, '$t_{1/2}$ ≈ 4 min')
        etiquette(ax, 7.0, 3.95, '$n_\\mathrm{E,f}$ / 2 = 3,95 mmol', ha='left')
        etiquette(ax, 40, 8.45, '$n_\\mathrm{E,f}$ = 7,9 mmol', color=GRIS, ha='center')
        print('fig_jasmin contrôle : t1/2 = %.2f min ; pente de la tangente = %.3f mmol/min' % (th, 7.9 / 6))
    save(fig, 'fig_jasmin' + ('_c' if corrige else ''))
fig_jasmin(False); fig_jasmin(True)

# ---------------------------------------------------------------- Q.10 (corrigé) : cristal violet, ln[CV] en fonction de t
T_CV = np.array([0, 4, 8, 12, 16, 24.0]); CV = np.array([20.0, 14.1, 10.0, 7.1, 5.0, 2.5])
def fig_cv():
    fig, ax = plt.subplots(figsize=(4.8, 2.6)); fig.subplots_adjust(0.12, 0.18, 0.98, 0.97)
    y = np.log(CV); p = np.polyfit(T_CV, y, 1)
    x = np.array([0, 26]); ax.plot(x, np.polyval(p, x), color=BLEU, lw=1.3, zorder=5)
    ax.plot(T_CV, y, 'o', color=ANTH, ms=4, zorder=7)
    grille(ax, 26, 2, 1, 3.2, 0.5, 0.1)
    axes_style(ax, 'Temps t (min)', 'ln([CV]), [CV] en µmol·L$^{-1}$')
    etiquette(ax, 13.5, 2.75, 'droite de pente −0,087 min$^{-1}$', color=BLEU)
    print('fig_cv contrôle : pente %.4f, ordonnée %.3f' % (p[0], p[1]))
    save(fig, 'fig_cv_c')
fig_cv()

# ---------------------------------------------------------------- Exercice 2 : paracétamol, ln[P] (µmol/L) en fonction de t (h), k = 0,27 h-1
K_P = 0.27; P0 = 120.0
T_P = np.array([0, 1, 2, 3, 4, 6, 8.0])
CP = np.round(P0 * np.exp(-K_P * T_P), 1)
def fig_parac(corrige):
    fig, ax = plt.subplots(figsize=(4.8, 2.7)); fig.subplots_adjust(0.12, 0.17, 0.98, 0.97)
    y = np.log(CP)
    x = np.array([0, 9]); ax.plot(x, np.log(P0) - K_P * x, color=BLEU, lw=1.3, zorder=5)
    ax.plot(T_P, y, 'o', color=ANTH, ms=4, zorder=7)
    grille(ax, 9, 1, 0.5, 5.0, 0.5, 0.1, ymin=2.0)
    axes_style(ax, 'Temps t (h)', 'ln([P]), [P] en µmol·L$^{-1}$')
    if corrige:
        for (xa, ya) in ((0, np.log(P0)), (8, np.log(P0) - 8 * K_P)):
            ax.plot([xa], [ya], 's', color=BRIQUE, ms=4, zorder=8, clip_on=False)
        etiquette(ax, 0.2, 4.93, '(0 ; 4,79)', ha='left')
        etiquette(ax, 7.0, 2.28, '(8,0 ; 2,63)', ha='left')
        print('fig_parac contrôle : ln P0 = %.3f ; ln P(8 h) = %.3f' % (np.log(P0), np.log(P0) - 8 * K_P))
    save(fig, 'fig_parac' + ('_c' if corrige else ''))
fig_parac(False); fig_parac(True)
print('Ex. 2 tableau :', ', '.join(fr(v) for v in CP))

# ---------------------------------------------------------------- dessin de formules de Lewis et de flèches courbes
def at(ax, x, y, s, fs=15, color=ANTH):
    ax.text(x, y, s, fontsize=fs, ha='center', va='center', color=color, zorder=5)
def liaison(ax, a, b, ordre=1, r=0.24, ecart=0.07, color=ANTH, ra=None, rb=None):
    a = np.array(a, float); b = np.array(b, float); u = (b - a) / np.linalg.norm(b - a); n = np.array([-u[1], u[0]])
    p, q = a + u * (ra if ra is not None else r), b - u * (rb if rb is not None else r)
    decal = [0] if ordre == 1 else [-ecart, ecart]
    for d in decal:
        ax.plot([p[0] + d * n[0], q[0] + d * n[0]], [p[1] + d * n[1], q[1] + d * n[1]], color=color, lw=1.4, solid_capstyle='round', zorder=4)
def doublet(ax, x, y, ang, r=0.33, L=0.17):
    a = np.radians(ang); c = np.array([x + r * np.cos(a), y + r * np.sin(a)]); t = np.array([-np.sin(a), np.cos(a)])
    ax.plot([c[0] - L / 2 * t[0], c[0] + L / 2 * t[0]], [c[1] - L / 2 * t[1], c[1] + L / 2 * t[1]], color=ANTH, lw=1.4, zorder=4)
    return c
def charge(ax, x, y, signe, color=ANTH):
    ax.text(x, y, '−' if signe < 0 else '+', fontsize=9, ha='center', va='center', color=color, zorder=6,
            bbox=dict(boxstyle='circle,pad=0.08', fc='white', ec=color, lw=0.9))
def fleche_courbe(ax, depart, arrivee, rad=-0.45, color=BRIQUE):
    ax.add_patch(FancyArrowPatch(depart, arrivee, connectionstyle='arc3,rad=%g' % rad, arrowstyle='-|>', mutation_scale=11,
                                 color=color, lw=1.3, shrinkA=1, shrinkB=2, zorder=7))
def fleche_bezier(ax, p0, c, p2, color=BRIQUE, L=0.17, W=0.065):
    # flèche courbe tracée à la main : arc de Bézier quadratique p0 -> p2 (point de contrôle c), pointe orientée selon la tangente en p2
    p0, c, p2 = (np.array(v, float) for v in (p0, c, p2))
    t = np.linspace(0, 1, 200)[:, None]
    pts = (1 - t) ** 2 * p0 + 2 * t * (1 - t) * c + t ** 2 * p2
    garde = np.linalg.norm(pts - p2, axis=1) >= L * 0.8
    ax.plot(pts[garde, 0], pts[garde, 1], color=color, lw=1.3, solid_capstyle='round', zorder=7)
    u = (p2 - c) / np.linalg.norm(p2 - c); n = np.array([-u[1], u[0]]); b = p2 - L * u
    ax.add_patch(plt.Polygon([p2, b + W * n, b - W * n], closed=True, fc=color, ec=color, lw=0.6, zorder=7))
def signe(ax, x, y, s, fs=15): ax.text(x, y, s, fontsize=fs, ha='center', va='center', color=ANTH)
def fleche_reaction(ax, x, y, L=0.9):
    ax.annotate('', xy=(x + L / 2, y), xytext=(x - L / 2, y), arrowprops=dict(arrowstyle='-|>', color=ANTH, lw=1.3, mutation_scale=12))
def toile(w, h, xlim, ylim):
    fig, ax = plt.subplots(figsize=(w, h)); fig.subplots_adjust(0, 0, 1, 1)
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.set_aspect('equal'); ax.axis('off')
    return fig, ax

def eau(ax, x, y):
    # H2O coudée : O en (x, y), deux doublets vers le haut
    at(ax, x, y, 'O'); at(ax, x - 0.62, y - 0.42, 'H'); at(ax, x + 0.62, y - 0.42, 'H')
    liaison(ax, (x, y), (x - 0.62, y - 0.42)); liaison(ax, (x, y), (x + 0.62, y - 0.42))
    return doublet(ax, x, y, 55), doublet(ax, x, y, 125)

# ---------------------------------------------------------------- Q.14 : deux actes élémentaires
def fig_meca(corrige):
    fig, ax = toile(6.6, 3.0, (-0.6, 12.6), (-3.9, 1.6))
    # acte 1 : H2O + H+ -> H3O+ ; le signe +, l'ion H+ et la flèche sont sur le même axe
    y1 = 0.3
    at(ax, -0.35, 1.05, '1', fs=11, color=CUIVRE)
    d55, d125 = eau(ax, 0.9, 0.35)
    signe(ax, 2.1, y1, '+'); at(ax, 3.0, y1, 'H'); charge(ax, 3.33, y1 + 0.32, +1)
    fleche_reaction(ax, 6.1, y1)
    xo, yo = 8.1, 0.35
    at(ax, xo, yo, 'O'); at(ax, xo - 0.62, yo - 0.42, 'H'); at(ax, xo + 0.62, yo - 0.42, 'H'); at(ax, xo, yo + 0.78, 'H')
    liaison(ax, (xo, yo), (xo - 0.62, yo - 0.42)); liaison(ax, (xo, yo), (xo + 0.62, yo - 0.42)); liaison(ax, (xo, yo), (xo, yo + 0.78))
    doublet(ax, xo, yo, 180); charge(ax, xo + 0.42, yo + 0.38, +1)
    if corrige: fleche_bezier(ax, (d55[0] + 0.05, d55[1] + 0.06), (2.0, 1.45), (2.8, y1 + 0.12))
    # acte 2 : HO- + CH3-Br -> HO-CH3 + Br-
    y = -2.5
    at(ax, -0.35, y + 0.75, '2', fs=11, color=CUIVRE)
    at(ax, 0.2, y, 'H'); at(ax, 0.9, y, 'O'); liaison(ax, (0.2, y), (0.9, y))
    for a in (90, 270): doublet(ax, 0.9, y, a)
    dO = doublet(ax, 0.9, y, 0); charge(ax, 1.2, y + 0.47, -1)
    signe(ax, 2.15, y, '+')
    xc = 3.6
    at(ax, xc, y, 'C')
    for (dx, dy) in ((0, 0.75), (0, -0.75), (-0.62, -0.42)): at(ax, xc + dx, y + dy, 'H'); liaison(ax, (xc, y), (xc + dx, y + dy))
    xb = 4.6; at(ax, xb, y, 'Br'); liaison(ax, (xc, y), (xb, y), rb=0.33)
    for a in (90, 0, 270): doublet(ax, xb, y, a, r=0.36)
    fleche_reaction(ax, 6.1, y)
    # produits : H-O-CH3 + Br-
    xo = 7.9
    at(ax, xo - 0.7, y, 'H'); at(ax, xo, y, 'O'); liaison(ax, (xo - 0.7, y), (xo, y))
    doublet(ax, xo, y, 90); doublet(ax, xo, y, 270)
    xc2 = xo + 0.95; at(ax, xc2, y, 'C'); liaison(ax, (xo, y), (xc2, y))
    for (dx, dy) in ((0, 0.75), (0, -0.75), (0.68, 0)): at(ax, xc2 + dx, y + dy, 'H'); liaison(ax, (xc2, y), (xc2 + dx, y + dy))
    signe(ax, 10.4, y, '+')
    xb2 = 11.3; at(ax, xb2, y, 'Br')
    for a in (90, 0, 180, 270): doublet(ax, xb2, y, a, r=0.36)
    charge(ax, xb2 + 0.5, y + 0.5, -1)
    if corrige:
        # doublet non liant de O vers C ; doublet de la liaison C-Br vers Br, sous la liaison
        fleche_bezier(ax, (dO[0] + 0.07, dO[1] + 0.03), (2.3, y + 1.25), (xc - 0.24, y + 0.17))
        fleche_bezier(ax, ((xc + xb) / 2 - 0.03, y - 0.1), (4.05, y - 0.55), (xb - 0.2, y - 0.2))
    save(fig, 'fig_meca' + ('_c' if corrige else ''))
fig_meca(False); fig_meca(True)

# ---------------------------------------------------------------- Exercice 3 : mécanisme de la saponification d'un ester R1-COO-R2
def ester_carbonyle(ax, x, y, droite='R2', h_droite=False):
    # R1-C(=O)-O-R2 : C en (x, y), O du carbonyle au-dessus, O lié à droite
    at(ax, x - 1.0, y, 'R$_1$', fs=14); liaison(ax, (x - 1.0, y), (x, y), ra=0.34)
    at(ax, x, y, 'C')
    at(ax, x, y + 1.0, 'O'); liaison(ax, (x, y), (x, y + 1.0), ordre=2)
    d1 = doublet(ax, x, y + 1.0, 40); d2 = doublet(ax, x, y + 1.0, 140)
    at(ax, x + 1.0, y, 'O'); liaison(ax, (x, y), (x + 1.0, y))
    d3 = doublet(ax, x + 1.0, y, 90); d4 = doublet(ax, x + 1.0, y, 270)
    if h_droite:
        at(ax, x + 1.9, y, 'H'); liaison(ax, (x + 1.0, y), (x + 1.9, y))
    else:
        at(ax, x + 2.0, y, 'R$_2$', fs=14); liaison(ax, (x + 1.0, y), (x + 2.0, y), rb=0.34)
    return dict(dc=(d1, d2), do=(d3, d4))
def hydroxyde(ax, x, y):
    at(ax, x, y, 'O'); at(ax, x + 0.72, y, 'H'); liaison(ax, (x, y), (x + 0.72, y))
    for a in (90, 270): doublet(ax, x, y, a)
    d = doublet(ax, x, y, 180); charge(ax, x - 0.42, y + 0.42, -1)
    return d
def tetraedrique(ax, x, y):
    # R1-C(O-)(OH)-O-R2
    at(ax, x - 1.0, y, 'R$_1$', fs=14); liaison(ax, (x - 1.0, y), (x, y), ra=0.34)
    at(ax, x, y, 'C')
    at(ax, x, y + 1.0, 'O'); liaison(ax, (x, y), (x, y + 1.0))
    dh = [doublet(ax, x, y + 1.0, a) for a in (0, 90, 180)]; charge(ax, x + 0.45, y + 1.38, -1)
    at(ax, x, y - 1.0, 'O'); liaison(ax, (x, y), (x, y - 1.0)); at(ax, x, y - 1.75, 'H'); liaison(ax, (x, y - 1.0), (x, y - 1.75))
    for a in (0, 180): doublet(ax, x, y - 1.0, a)
    at(ax, x + 1.0, y, 'O'); liaison(ax, (x, y), (x + 1.0, y))
    for a in (90, 270): doublet(ax, x + 1.0, y, a)
    at(ax, x + 2.0, y, 'R$_2$', fs=14); liaison(ax, (x + 1.0, y), (x + 2.0, y), rb=0.34)
    return dh
def alcoolate(ax, x, y, gauche=True):
    # R2-O- (O à droite de R2)
    at(ax, x, y, 'R$_2$', fs=14); at(ax, x + 1.0, y, 'O'); liaison(ax, (x, y), (x + 1.0, y), ra=0.34)
    doublet(ax, x + 1.0, y, 90); doublet(ax, x + 1.0, y, 270); d = doublet(ax, x + 1.0, y, 0)
    charge(ax, x + 1.3, y + 0.45, -1)
    return d
def fig_savon(corrige):
    fig, ax = toile(6.8, 6.6, (-0.4, 14.4), (-9.6, 2.3))
    # étape 1 : ester + HO- -> intermédiaire tétraédrique
    y = 0.0
    ax.text(-0.35, 1.6, 'Étape 1', fontsize=11, color=CUIVRE, ha='left', va='center')
    e = ester_carbonyle(ax, 1.3, y)
    signe(ax, 4.35, y, '+'); dho = hydroxyde(ax, 5.3, y)
    fleche_reaction(ax, 7.1, y)
    dt = tetraedrique(ax, 9.3, y)
    if corrige:
        # doublet non liant de HO- vers l'atome de carbone ; doublet de la double liaison vers l'oxygène, sur le côté
        fleche_bezier(ax, (dho[0] - 0.05, dho[1] - 0.08), (3.2, y - 1.45), (1.3 + 0.17, y - 0.24))
        fleche_bezier(ax, (1.3 + 0.16, y + 0.46), (1.3 + 0.55, y + 0.62), (1.3 + 0.19, y + 0.9))
    # étape 2 : intermédiaire -> R1-COOH + R2-O-
    y = -4.3
    ax.text(-0.35, y + 1.6, 'Étape 2', fontsize=11, color=CUIVRE, ha='left', va='center')
    dt2 = tetraedrique(ax, 1.3, y)
    fleche_reaction(ax, 4.75, y)
    ester_carbonyle(ax, 7.0, y, h_droite=True)
    signe(ax, 9.85, y, '+'); alcoolate(ax, 10.6, y)
    if corrige:
        # doublet non liant de O- vers la liaison C-O ; doublet de la liaison C-O(R2) vers l'oxygène, sous la liaison
        fleche_bezier(ax, (dt2[0][0] + 0.07, dt2[0][1] - 0.06), (1.3 + 0.65, y + 0.55), (1.3 + 0.12, y + 0.48))
        fleche_bezier(ax, (1.3 + 0.5, y - 0.1), (1.3 + 0.55, y - 0.55), (1.3 + 0.83, y - 0.17))
    # étape 3 : R1-CO-OH + R2-O- -> R1-COO- + R2-OH
    y = -8.3
    ax.text(-0.35, y + 1.6, 'Étape 3', fontsize=11, color=CUIVRE, ha='left', va='center')
    ester_carbonyle(ax, 1.3, y, h_droite=True)
    signe(ax, 4.15, y, '+')
    at(ax, 6.3, y, 'R$_2$', fs=14); at(ax, 5.3, y, 'O'); liaison(ax, (5.3, y), (6.3, y), rb=0.34)
    doublet(ax, 5.3, y, 90); doublet(ax, 5.3, y, 270); dalc = doublet(ax, 5.3, y, 180); charge(ax, 4.95, y + 0.47, -1)
    fleche_reaction(ax, 7.55, y)
    xc = 9.7
    at(ax, xc - 1.0, y, 'R$_1$', fs=14); liaison(ax, (xc - 1.0, y), (xc, y), ra=0.34); at(ax, xc, y, 'C')
    at(ax, xc, y + 1.0, 'O'); liaison(ax, (xc, y), (xc, y + 1.0), ordre=2); doublet(ax, xc, y + 1.0, 30); doublet(ax, xc, y + 1.0, 150)
    at(ax, xc + 1.0, y, 'O'); liaison(ax, (xc, y), (xc + 1.0, y))
    for a in (90, 0, 270): doublet(ax, xc + 1.0, y, a)
    charge(ax, xc + 1.35, y + 0.45, -1)
    signe(ax, 11.65, y, '+')
    at(ax, 12.3, y, 'H'); at(ax, 13.0, y, 'O'); liaison(ax, (12.3, y), (13.0, y)); doublet(ax, 13.0, y, 90); doublet(ax, 13.0, y, 270)
    at(ax, 13.85, y, 'R$_2$', fs=14); liaison(ax, (13.0, y), (13.85, y), rb=0.34)
    if corrige:
        # doublet non liant de R2-O- vers l'atome H ; doublet de la liaison O-H vers l'oxygène, au-dessus de la liaison
        fleche_bezier(ax, (dalc[0] - 0.04, dalc[1] - 0.1), (4.1, y - 1.05), (3.2 + 0.12, y - 0.2))
        fleche_bezier(ax, (1.3 + 1.48, y + 0.1), (1.3 + 1.44, y + 0.5), (1.3 + 1.18, y + 0.1))
    save(fig, 'fig_savon' + ('_c' if corrige else ''))
fig_savon(False); fig_savon(True)

# ---------------------------------------------------------------- Q.20 : extrait du diagramme (N, Z), noyaux légers
NOYAUX_L = {(3, 3): 's', (3, 4): 's', (3, 5): 'm', (4, 5): 's', (4, 6): 'm', (5, 3): 'p', (5, 5): 's', (5, 6): 's', (5, 7): 'm',
            (6, 4): 'p', (6, 5): 'p', (6, 6): 's', (6, 7): 's', (6, 8): 'm', (6, 9): 'm', (7, 5): 'p', (7, 6): 'p', (7, 7): 's', (7, 8): 's',
            (7, 9): 'm', (8, 6): 'p', (8, 7): 'p', (8, 8): 's', (8, 9): 's', (8, 10): 's', (8, 11): 'm', (9, 8): 'p', (9, 9): 'p', (9, 10): 's'}
SYMB_L = {3: 'Li', 4: 'Be', 5: 'B', 6: 'C', 7: 'N', 8: 'O', 9: 'F'}
COUL = {'s': ANTH, 'm': BLEU, 'p': BRIQUE, 'a': '#E3B23C'}
def case(ax, x, y, mode, texte, fs=7):
    ax.add_patch(Rectangle((x - 0.46, y - 0.46), 0.92, 0.92, fc=COUL[mode], ec='white', lw=0.8, zorder=3))
    ax.text(x, y, texte, fontsize=fs, ha='center', va='center', color='white' if mode != 'a' else ANTH, zorder=4)
def legende(ax, x, y, items, dy=0.75):
    for i, (mode, t) in enumerate(items):
        ax.add_patch(Rectangle((x, y - i * dy - 0.25), 0.5, 0.5, fc=COUL[mode], ec='none', zorder=3))
        ax.text(x + 0.7, y - i * dy, t, fontsize=8.5, va='center', color=ANTH)
def fig_segre():
    fig, ax = plt.subplots(figsize=(5.4, 3.7)); fig.subplots_adjust(0.1, 0.13, 0.99, 0.99)
    for (z, n), mode in NOYAUX_L.items(): case(ax, z, n, mode, '%s %d' % (SYMB_L[z], z + n))
    ax.plot([2.5, 10.2], [2.5, 10.2], color=GRIS, lw=0.8, ls=(0, (3, 2)), zorder=2)
    ax.text(10.35, 10.2, 'N = Z', fontsize=8, color=GRIS, ha='left', va='center')
    ax.set_xlim(2.4, 12.6); ax.set_ylim(2.4, 11.6)
    ax.set_xticks(range(3, 10)); ax.set_yticks(range(3, 12))
    for s in ('top', 'right'): ax.spines[s].set_visible(False)
    for s in ('left', 'bottom'): ax.spines[s].set_linewidth(1.0); ax.spines[s].set_color(ANTH)
    ax.tick_params(labelsize=9, colors=ANTH, width=0.8)
    ax.set_xlabel('Nombre de protons Z', fontsize=10); ax.set_ylabel('Nombre de neutrons N', fontsize=10)
    legende(ax, 10.1, 5.2, (('s', 'stable'), ('m', 'émetteur β$^-$'), ('p', 'émetteur β$^+$')))
    save(fig, 'fig_segre')
fig_segre()

# ---------------------------------------------------------------- Q.22 : technétium 99m, pourcentage restant, t1/2 = 6,0 h
def fig_decr(corrige):
    fig, ax = plt.subplots(figsize=(4.8, 2.7)); fig.subplots_adjust(0.12, 0.17, 0.98, 0.97)
    t = np.linspace(0, 30, 400)
    ax.plot(t, 100 * 0.5 ** (t / 6.0), color=BLEU, lw=1.8, zorder=5)
    grille(ax, 30, 5, 1, 100, 10, 5)
    axes_style(ax, 'Temps t (h)', '$N/N_0$ (%)')
    if corrige:
        tirets(ax, [0, 6.0], [50, 50]); tirets(ax, [6.0, 6.0], [0, 50]); ax.plot([6.0], [50], 'o', color=BRIQUE, ms=4, zorder=8)
        etiquette(ax, 6.5, 6, '$t_{1/2}$ = 6,0 h')
        tirets(ax, [24, 24], [0, 6.25], color=VERT); ax.plot([24], [6.25], 'o', color=VERT, ms=4, zorder=8)
        etiquette(ax, 24.4, 16, '6,25 % à 24 h', color=VERT)
    save(fig, 'fig_decr' + ('_c' if corrige else ''))
fig_decr(False); fig_decr(True)

# ---------------------------------------------------------------- Q.26 (corrigé) : -ln(N/N0) en fonction de t, polonium 210
T_PO = np.array([0, 40, 80, 120, 160, 200, 240.0]); R_PO = np.array([1.00, 0.82, 0.67, 0.55, 0.45, 0.37, 0.30])
def fig_po():
    fig, ax = plt.subplots(figsize=(4.8, 2.6)); fig.subplots_adjust(0.12, 0.18, 0.98, 0.97)
    y = -np.log(R_PO); p = np.polyfit(T_PO, y, 1)
    x = np.array([0, 260]); ax.plot(x, np.polyval(p, x), color=BLEU, lw=1.3, zorder=5)
    ax.plot(T_PO, y, 'o', color=ANTH, ms=4, zorder=7, clip_on=False)
    grille(ax, 260, 40, 10, 1.4, 0.2, 0.1)
    axes_style(ax, 'Temps t (jours)', '−ln($N/N_0$)')
    etiquette(ax, 120, 1.15, 'droite de pente 5,0 × 10$^{-3}$ jour$^{-1}$', color=BLEU, ha='center')
    print('fig_po contrôle : pente %.5f, ordonnée %.4f' % (p[0], p[1]))
    save(fig, 'fig_po_c')
fig_po()

# ---------------------------------------------------------------- Exercice 4 : extrait du diagramme (N, Z) autour de l'uranium et du plutonium
NOYAUX_U = {(92, 143): 'a', (92, 144): 'a', (92, 145): 'm', (92, 146): 'a', (92, 147): 'm',
            (93, 144): 'a', (93, 145): 'm', (93, 146): 'm', (93, 147): 'm',
            (94, 144): 'a', (94, 145): 'a', (94, 146): 'a', (94, 147): 'm', (95, 146): 'a', (95, 147): 'm'}
SYMB_U = {92: 'U', 93: 'Np', 94: 'Pu', 95: 'Am'}
def fig_mox(corrige):
    fig, ax = plt.subplots(figsize=(4.6, 3.8)); fig.subplots_adjust(0.12, 0.13, 0.98, 0.98)
    for (z, n), mode in NOYAUX_U.items(): case(ax, z, n, mode, '%s %d' % (SYMB_U[z], z + n), fs=7.5)
    ax.set_xlim(91.4, 98.3); ax.set_ylim(142.4, 148.0)
    ax.set_xticks(range(92, 96)); ax.set_yticks(range(143, 148))
    for s in ('top', 'right'): ax.spines[s].set_visible(False)
    for s in ('left', 'bottom'): ax.spines[s].set_linewidth(1.0); ax.spines[s].set_color(ANTH)
    ax.tick_params(labelsize=9, colors=ANTH, width=0.8)
    ax.set_xlabel('Nombre de protons Z', fontsize=10); ax.set_ylabel('Nombre de neutrons N', fontsize=10)
    legende(ax, 95.9, 146.6, (('a', 'émetteur α'), ('m', 'émetteur β$^-$')), dy=0.6)
    if corrige:
        chemin = [((92, 146), (92, 147), 'capture\nd\'un neutron'), ((92, 147), (93, 146), 'β$^-$'), ((93, 146), (94, 145), 'β$^-$'),
                  ((94, 145), (92, 143), 'α')]
        for (a, b, t) in chemin:
            ax.add_patch(FancyArrowPatch(a, b, arrowstyle='-|>', mutation_scale=11, color=BRIQUE, lw=1.4, shrinkA=9, shrinkB=9, zorder=6,
                                         connectionstyle='arc3,rad=%g' % (0.25 if t == 'α' else 0.0)))
        etiquette(ax, 91.45, 146.5, 'n', fs=9)
        etiquette(ax, 92.62, 146.62, 'β$^-$', fs=9); etiquette(ax, 93.62, 145.62, 'β$^-$', fs=9)
        etiquette(ax, 93.0, 143.62, 'α', fs=10)
    save(fig, 'fig_mox' + ('_c' if corrige else ''))
fig_mox(False); fig_mox(True)

# ---------------------------------------------------------------- Exercice 5 : fluor 18, pourcentage restant, t1/2 = 110 min
def fig_fluor(corrige):
    fig, ax = plt.subplots(figsize=(4.8, 2.7)); fig.subplots_adjust(0.12, 0.17, 0.98, 0.97)
    t = np.linspace(0, 600, 600)
    ax.plot(t, 100 * 0.5 ** (t / 110.0), color=BLEU, lw=1.8, zorder=5)
    grille(ax, 600, 100, 20, 100, 10, 5)
    axes_style(ax, 'Temps t (min)', '$N/N_0$ (%)')
    if corrige:
        tirets(ax, [0, 110], [50, 50]); tirets(ax, [110, 110], [0, 50]); ax.plot([110], [50], 'o', color=BRIQUE, ms=4, zorder=8)
        etiquette(ax, 118, 6, '$t_{1/2}$ = 110 min')
        y90 = 100 * 0.5 ** (90 / 110.0)
        tirets(ax, [90, 90], [0, y90], color=VERT); tirets(ax, [0, 90], [y90, y90], color=VERT)
        ax.plot([90], [y90], 'o', color=VERT, ms=4, zorder=8)
        etiquette(ax, 100, y90 + 6, '57 % à 90 min', color=VERT)
        print('fig_fluor contrôle : %.1f %% à 90 min' % y90)
    save(fig, 'fig_fluor' + ('_c' if corrige else ''))
fig_fluor(False); fig_fluor(True)
