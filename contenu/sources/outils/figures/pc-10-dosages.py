# Figures de la fiche PC 10 (Dosages), palette MasterBac
# usage : pc-10-dosages.py <dossier de sortie, en général fiches/pc-10-dosages/figs>
import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
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


Ke = 1e-14
def pH_acide_faible(n0, V0, c, V, pKa):
    # titrage d'un acide faible AH (n0 mol dans V0 mL) par la soude de concentration c ; résolution exacte de l'électroneutralité
    Ka = 10 ** -pKa; Vt = (V0 + V) * 1e-3; C = n0 / Vt; Na = c * V * 1e-3 / Vt
    lo, hi = -14.5, 0.5
    for _ in range(80):
        mid = (lo + hi) / 2; h = 10 ** mid
        if Na + h - Ka * C / (Ka + h) - Ke / h > 0: hi = mid
        else: lo = mid
    return -mid
def courbe_ph(n0, V0, c, pKa, Vmax, npts=2001):
    V = np.linspace(0, Vmax, npts); pH = np.array([pH_acide_faible(n0, V0, c, v, pKa) for v in V])
    return V, pH, np.gradient(pH, V)

# ---------------------------------------------------------------- 1. Exercice 1 : spectre d'absorption du complexe fer(II)-orthophénantroline
fig, ax = plt.subplots(figsize=(4.8, 2.5)); fig.subplots_adjust(0.12, 0.19, 0.98, 0.97)
lam = np.linspace(400, 700, 601)
A = 0.55 * np.exp(-((lam - 510) / np.where(lam < 510, 42, 62)) ** 2)
ax.plot(lam, A, color=BLEU, lw=1.7, zorder=5)
ax.set_xlim(400, 700); ax.set_ylim(0, 0.6)
ax.set_xticks(range(400, 701, 50)); ax.set_xticks(range(400, 701, 10), minor=True)
ax.set_yticks(np.arange(0, 0.61, 0.1)); ax.set_yticks(np.arange(0, 0.61, 0.02), minor=True)
axes_style(ax, 'Longueur d\'onde λ (nm)', 'Absorbance A')
save(fig, 'fig_spectre')
print('Ex. 1 contrôle : maximum du spectre à %.0f nm' % lam[np.argmax(A)])

# ---------------------------------------------------------------- 2 et 3. Exercice 1 : courbe d'étalonnage du fer(II)
KFE = 0.0110                                   # L/µmol
CE = np.array([10, 20, 40, 50, 100]); AE = KFE * CE
def fer(corrige):
    fig, ax = plt.subplots(figsize=(4.8, 2.6)); fig.subplots_adjust(0.12, 0.18, 0.98, 0.97)
    x = np.linspace(0, 110, 50); ax.plot(x, KFE * x, color=BLEU, lw=1.4, zorder=4)
    ax.plot(CE, AE, 'o', color=ANTH, ms=4.5, zorder=6)
    ax.set_xlim(0, 110); ax.set_ylim(0, 1.25)
    ax.set_xticks(range(0, 111, 10)); ax.set_xticks(range(0, 111, 2), minor=True)
    ax.set_yticks(np.arange(0, 1.21, 0.2)); ax.set_yticks(np.arange(0, 1.26, 0.05), minor=True)
    axes_style(ax, 'Concentration en ions fer(II) (µmol·L$^{-1}$)', 'Absorbance A', size=9.5)
    if corrige:
        tirets(ax, [0, 60, 60], [0.66, 0.66, 0], color=BRIQUE)
        ax.plot([60], [0.66], 'o', color=BRIQUE, ms=4, zorder=8)
        ax.text(62, 0.60, 'A = 0,66 : 60 µmol·L$^{-1}$', fontsize=8.5, color=BRIQUE, ha='left', va='top',
                bbox=dict(boxstyle='round,pad=0.12', fc='white', ec='none'), zorder=7)
    save(fig, 'fig_fer_c' if corrige else 'fig_fer')
fer(False); fer(True)
print('Ex. 1 contrôle : k = %.4f L/µmol ; A = 0,66 -> %.1f µmol/L' % (KFE, 0.66 / KFE))

# ---------------------------------------------------------------- 4. Q.8 : schéma légendé d'un titrage avec suivi pH-métrique
fig, ax = plt.subplots(figsize=(5.6, 4.2)); fig.subplots_adjust(0, 0, 1, 1)
ax.set_xlim(0, 11.2); ax.set_ylim(0, 8.4); ax.set_aspect('equal'); ax.axis('off')
lc = dict(color=ANTH, lw=1.2)
ax.add_patch(plt.Rectangle((0.6, 0.3), 3.6, 0.25, fc=GRISC, ec=ANTH, lw=1.0))           # socle
ax.plot([1.0, 1.0], [0.55, 7.9], color=ANTH, lw=2.2)                                     # tige
ax.plot([1.0, 3.05], [6.6, 6.6], **lc)                                                   # pince
ax.add_patch(plt.Rectangle((2.95, 3.3), 0.3, 4.6, fc='white', ec=ANTH, lw=1.1))          # burette
ax.add_patch(plt.Rectangle((2.95, 3.3), 0.3, 3.2, fc=EAU, ec='none'))
for y in np.arange(3.5, 7.8, 0.3): ax.plot([2.95, 3.08], [y, y], color=ANTH, lw=0.6)
ax.plot([3.1, 3.1], [3.3, 2.95], color=ANTH, lw=1.4)                                     # robinet et pointe
ax.add_patch(plt.Rectangle((2.88, 3.02), 0.44, 0.13, fc=ANTH, ec='none'))
ax.add_patch(plt.Rectangle((1.6, 0.55), 3.0, 0.55, fc=GRISM, ec=ANTH, lw=1.0))          # agitateur
ax.add_patch(plt.Circle((4.25, 0.82), 0.12, fc=GRISC, ec=ANTH, lw=0.8))
ax.plot([2.05, 3.95, 3.85, 2.15, 2.05], [2.8, 2.8, 1.1, 1.1, 2.8], color=ANTH, lw=1.2)  # bécher
ax.add_patch(plt.Polygon([[2.11, 2.2], [3.89, 2.2], [3.86, 1.13], [2.14, 1.13]], fc=SABLE, ec='none', alpha=0.9))
ax.add_patch(plt.Rectangle((2.75, 1.17), 0.5, 0.11, fc=ANTH, ec='none'))                  # barreau
ax.add_patch(plt.Rectangle((3.45, 1.45), 0.16, 2.6, fc='white', ec=ANTH, lw=1.0))        # électrode
ax.plot([3.53, 3.53, 6.2], [4.05, 4.6, 4.6], color=ANTH, lw=1.0)
ax.add_patch(plt.Rectangle((6.2, 4.1), 1.7, 1.0, fc='white', ec=ANTH, lw=1.1))            # pH-mètre
ax.text(7.05, 4.6, '7,02', fontsize=11, color=ANTH, ha='center', va='center', family='monospace')
def leg(x, y, tx, ty, t):
    ax.plot([x, tx], [y, ty], color=GRIS, lw=0.7)
    ax.text(tx + 0.08, ty, t, fontsize=8.5, color=ANTH, ha='left', va='center')
leg(3.25, 6.9, 5.0, 7.5, 'burette graduée : solution titrante')
leg(3.62, 3.2, 5.0, 3.35, 'électrode de mesure du pH')
leg(3.86, 2.0, 5.0, 2.35, 'bécher : solution titrée,\nprélevée à la pipette jaugée')
leg(3.25, 1.23, 5.0, 1.45, 'barreau aimanté')
leg(4.4, 0.7, 5.0, 0.55, 'agitateur magnétique')
ax.text(7.05, 5.35, 'pH-mètre', fontsize=8.5, color=ANTH, ha='center', va='bottom')
ax.text(1.12, 7.95, 'potence', fontsize=8.5, color=ANTH, ha='left', va='bottom')
save(fig, 'fig_montage')

# ---------------------------------------------------------------- 5 et 6. Q.11 à Q.13 : titrage de l'acide éthanoïque par la soude
Va, pHa, da = courbe_ph(1.0e-3, 10.0, 0.100, 4.8, 20.0)
def tangentes(V, pH, d, VE, s):
    i1 = np.argmin(np.abs(d[(V > VE - 4) & (V < VE - 0.2)] - s)); V1 = V[(V > VE - 4) & (V < VE - 0.2)][i1]
    i2 = np.argmin(np.abs(d[(V > VE + 0.2) & (V < VE + 4)] - s)); V2 = V[(V > VE + 0.2) & (V < VE + 4)][i2]
    p1, p2 = np.interp(V1, V, pH), np.interp(V2, V, pH)
    b1, b2 = p1 - s * V1, p2 - s * V2; bm = (b1 + b2) / 2
    k = np.argmin(np.abs(pH - (s * V + bm)) + 100 * (np.abs(V - VE) > 1.5))
    return (V1, b1), (V2, b2), bm, V[k], pH[k]
def ph_fig(V, pH, d, nom, VE, corrige, demi=None, Vmax=20, dmax=None, tang=None):
    fig, ax = plt.subplots(figsize=(4.9, 2.9)); fig.subplots_adjust(0.11, 0.16, 0.89, 0.97)
    ax.plot(V, pH, color=BLEU, lw=1.7, zorder=5)
    ax.set_xlim(0, Vmax); ax.set_ylim(0, 14)
    ax.set_xticks(range(0, Vmax + 1, 2)); ax.set_xticks(np.arange(0, Vmax + 0.01, 0.5), minor=True)
    ax.set_yticks(range(0, 15, 2)); ax.set_yticks(range(0, 15, 1), minor=True)
    axes_style(ax, 'Volume V de solution d\'hydroxyde de sodium versé (mL)', 'pH', size=9.5)
    ax2 = ax.twinx(); ax2.plot(V, d, color=CUIVRE, lw=1.3, ls=(0, (5, 2.5)), zorder=4)
    dm = dmax or 1.15 * d.max(); ax2.set_ylim(0, dm)
    for s in ('top', 'left', 'bottom'): ax2.spines[s].set_visible(False)
    ax2.spines['right'].set_color(CUIVRE); ax2.tick_params(colors=CUIVRE, labelsize=8.5)
    ax2.yaxis.set_major_formatter(FuncFormatter(virgule))
    ax2.set_ylabel('dpH/dV (mL$^{-1}$)', fontsize=9.5, color=CUIVRE)
    if corrige:
        tirets(ax, [VE, VE], [0, 14], color=BRIQUE)
        ax.text(VE + 1.6, 3.0, '$V_\\mathrm{E}$ = %s mL' % ('%.1f' % VE).replace('.', ','), fontsize=8.5, color=BRIQUE, ha='left', va='center',
                bbox=dict(boxstyle='round,pad=0.12', fc='white', ec='none'), zorder=7)
        if demi is not None:
            pd = np.interp(VE / 2, V, pH)
            tirets(ax, [VE / 2, VE / 2, 0], [0, pd, pd], color=VERT)
            ax.plot([VE / 2], [pd], 'o', color=VERT, ms=3.5, zorder=8)
            ax.text(0.3, 6.3, 'demi-équivalence : pH = %s' % virgule(round(pd, 1), 0), fontsize=8.5, color=VERT, ha='left', va='bottom',
                    bbox=dict(boxstyle='round,pad=0.12', fc='white', ec='none'), zorder=7)
        if tang is not None:
            (V1, b1), (V2, b2), bm, VEt, pEt = tang
            xs = np.array([V1 - 3, V2 + 3]); s = (b2 - b1) * 0 + tang_s
            for b in (b1, b2): ax.plot(xs, s * xs + b, color=GRIS, lw=0.9, zorder=3)
            ax.plot(xs, s * xs + bm, color=GRIS, lw=0.9, ls=(0, (2, 2)), zorder=3)
            ax.plot([VEt], [pEt], 'o', color=BRIQUE, ms=4, zorder=8)
    save(fig, nom + ('_c' if corrige else ''))
tang_s = 0.35
T = tangentes(Va, pHa, da, 10.0, tang_s)
ph_fig(Va, pHa, da, 'fig_ph', 10.0, False, dmax=12)
ph_fig(Va, pHa, da, 'fig_ph', 10.0, True, demi=True, dmax=12, tang=T)
print('Q.11 à Q.13 contrôle : VE = 10,0 mL ; pH(5,0 mL) = %.2f ; pH(10,0 mL) = %.2f ; tangentes : VE = %.2f mL' %
      (np.interp(5.0, Va, pHa), np.interp(10.0, Va, pHa), T[3]))

# ---------------------------------------------------------------- 7 et 8. Exercice 3 : titrage de l'aspirine d'un comprimé
Vs, pHs, ds = courbe_ph(2.44e-4, 50.0, 2.00e-2, 3.5, 20.0)
ph_fig(Vs, pHs, ds, 'fig_aspirine', 12.2, False, dmax=12)
ph_fig(Vs, pHs, ds, 'fig_aspirine', 12.2, True, dmax=12)
print('Ex. 3 contrôle : maximum de la dérivée à %.2f mL ; pH à l\'équivalence %.2f' % (Vs[np.argmax(ds)], np.interp(12.2, Vs, pHs)))

# ---------------------------------------------------------------- 9 à 12. Q.17 et exercice 4 : titrages conductimétriques
LAM = {'H3O+': 35.0, 'HO-': 19.9, 'Na+': 5.01, 'Cl-': 7.63, 'Ag+': 6.19, 'NO3-': 7.14}   # mS·m²·mol⁻¹
def sigma_HCl(V, n0=1.20e-3, c=0.100, V0=200.0):
    nb = c * V * 1e-3; Vt = V0 * 1e-6                      # dilution négligée : volume constant (m³)
    nH = np.maximum(n0 - nb, 0); nOH = np.maximum(nb - n0, 0)
    return (LAM['H3O+'] * nH + LAM['HO-'] * nOH + LAM['Na+'] * nb + LAM['Cl-'] * n0) / Vt
def sigma_Cl(V, n0=5.5e-4, c=0.100, V0=200.0):
    na = c * V * 1e-3; Vt = V0 * 1e-6
    nCl = np.maximum(n0 - na, 0); nAg = np.maximum(na - n0, 0)
    return (LAM['Cl-'] * nCl + LAM['Ag+'] * nAg + LAM['NO3-'] * na + LAM['Na+'] * n0) / Vt
def cond_fig(f, nom, VE, Vmax, corrige, ymax, ystep, mesures):
    fig, ax = plt.subplots(figsize=(4.8, 2.6)); fig.subplots_adjust(0.13, 0.18, 0.98, 0.97)
    Vm = np.array(mesures); ax.plot(Vm, f(Vm), 'o', color=ANTH, ms=4, zorder=6)
    ax.set_xlim(0, Vmax); ax.set_ylim(0, ymax)
    ax.set_xticks(range(0, Vmax + 1, 2)); ax.set_xticks(np.arange(0, Vmax + 0.01, 0.5), minor=True)
    ax.set_yticks(np.arange(0, ymax + 0.01, ystep)); ax.set_yticks(np.arange(0, ymax + 0.01, ystep / 5), minor=True)
    axes_style(ax, 'Volume V de solution titrante versé (mL)', 'σ (mS·m$^{-1}$)', size=9.5)
    if corrige:
        av = Vm[Vm < VE]; ap = Vm[Vm > VE]
        p1 = np.polyfit(av, f(av), 1); p2 = np.polyfit(ap, f(ap), 1)
        x1 = np.linspace(0, VE + 2.5, 20); x2 = np.linspace(VE - 2.5, Vmax, 20)
        ax.plot(x1, np.polyval(p1, x1), color=BLEU, lw=1.2, zorder=4); ax.plot(x2, np.polyval(p2, x2), color=BLEU, lw=1.2, zorder=4)
        Vi = (p2[1] - p1[1]) / (p1[0] - p2[0]); si = np.polyval(p1, Vi)
        tirets(ax, [Vi, Vi], [0, si], color=BRIQUE); ax.plot([Vi], [si], 'o', color=BRIQUE, ms=4, zorder=8)
        ax.text(Vi + 0.25, 0.08 * ymax, '$V_\\mathrm{E}$ = %s mL' % ('%.1f' % Vi).replace('.', ','), fontsize=8.5, color=BRIQUE, ha='left', va='center',
                bbox=dict(boxstyle='round,pad=0.12', fc='white', ec='none'), zorder=7)
        print('%s contrôle : intersection des droites à %.2f mL' % (nom, Vi))
    save(fig, nom + ('_c' if corrige else ''))
cond_fig(sigma_HCl, 'fig_cond', 12.0, 20, False, 300, 50, np.arange(0, 20.1, 1.0))
cond_fig(sigma_HCl, 'fig_cond', 12.0, 20, True, 300, 50, np.arange(0, 20.1, 1.0))
cond_fig(sigma_Cl, 'fig_quinton', 5.5, 10, False, 70, 10, np.arange(0, 10.1, 0.5))
cond_fig(sigma_Cl, 'fig_quinton', 5.5, 10, True, 70, 10, np.arange(0, 10.1, 0.5))
print('Q.17 contrôle : σ(0) = %.0f mS/m ; Ex. 4 : σ(0) = %.1f mS/m, σ(VE) = %.1f mS/m' % (sigma_HCl(0.0), sigma_Cl(0.0), sigma_Cl(5.5)))
