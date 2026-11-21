# Recalcul indépendant des résultats numériques de la fiche 11 (Cinétique et radioactivité),
# puis contrôle de la structure : données des tableaux et des figures, équations nucléaires, niveaux et parcours,
# tableau « Ce qui est tombé » et mentions « Demandé ... », exercices d'après un sujet, figures et index.
# usage : python3 outils/verifs/pc-11-cinetique-radioactivite.py
import os, re
from math import log, exp
import numpy as np
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(RACINE, 'fiches', 'pc-11-cinetique-radioactivite', 'fiche.md'), encoding='utf-8').read()
figsrc = open(os.path.join(RACINE, 'outils', 'figures', 'pc-11-cinetique-radioactivite.py'), encoding='utf-8').read()
NQ, NEX = 26, 5

def ligne(debut):
    # valeurs numériques d'une ligne de tableau de la fiche, repérée par le début de sa première cellule
    # (si la ligne figure deux fois, dans l'énoncé et dans le corrigé, les deux doivent être identiques)
    l = [x for x in src.splitlines() if x.startswith('| ' + debut)]
    if not l or len(set(l)) != 1: return None
    return [float(c.strip().replace(',', '.')) for c in l[0].strip().strip('|').split('|')[1:]]
def tableau_fig(nom):
    # tableau numpy écrit dans le script des figures : NOM = np.array([...])
    r = re.search(r'\b%s = np\.array\(\[([^\]]+)\]\)' % nom, figsrc)
    return [float(x) for x in r.group(1).split(',')] if r else None

# Thème 1
vmoy = 3.0 / 5.0; vmoy_si = vmoy * 1e-3 / 60
I2 = lambda t: 5.0 * (1 - exp(-t / 10.0)); dI2 = lambda t: 0.5 * exp(-t / 10.0)
tan10_0, tan10_20 = I2(10) - 10 * dI2(10), I2(10) + 10 * dI2(10)
T_J = tableau_fig('T_J'); NAC = ligne('$n_\\text{ac}$ (mmol)')
n0 = 1.05 * 0.60 / 60.1; nalc = 1.04 * 1.40 / 108
nE = [10.5 - a for a in NAC]; nEf = 10.5 - NAC[-1]; eta = nEf / 10.5
ecart_jasmin = max(abs(n - 7.9 * (1 - exp(-t / 6))) for t, n in zip(T_J, nE))
t12_jasmin = float(np.interp(nEf / 2, nE[:8], T_J[:8]))
pente_jasmin = 7.9 / 6.0; V_jasmin = (0.60 + 1.40) * 1e-3
# Thème 2
k7 = [10e-6 / 5.0e-3, 5.0e-6 / 2.5e-3, 2.5e-6 / 1.25e-3]
A8 = 2.0e-2 * exp(-2.0e-3 * 600); t12_9 = log(2) / 2.0e-3
T_CV = ligne('*t* (min) | 0 | 4'); CV = ligne('$[\\text{CV}]$')
ecart_cv = max(abs(c - 20.0 * 0.5 ** (t / 8.0)) for t, c in zip(T_CV, CV))
k10 = (round(log(20.0), 2) - round(log(2.5), 2)) / 24
T_P = ligne('*t* (h)'); CP = ligne('$[\\text{P}]$')
modele_P = [round(120.0 * exp(-0.27 * t), 1) for t in T_P]
lnP0 = log(120.0); lnP8 = lnP0 - 8 * 0.27; k_P = (round(lnP0, 2) - round(lnP8, 2)) / 8.0
Plim = 8e-3 / 151; t_lim = log(120 / 53) / 0.27
# Thème 3
chi = {'H': 2.20, 'C': 2.55, 'O': 3.44, 'Cl': 3.16, 'Br': 2.96}
# Thème 4 et 5
lam22 = log(2) / 6.0
N24 = 1.0e-6 / 131 * 6.02e23; lam24 = log(2) / (8.0 * 86400)
age = 5730 / log(2) * log(0.23 / 0.074); t_iode = 8.0 / log(2) * log(1000)
T_PO = ligne('*t* (jours) | 0 | 40'); R_PO = ligne('$N/N_0$'); MLN = ligne('$-\\ln(N/N_0)$')
ecart_po = max(abs(m - (-log(r))) for m, r in zip(MLN, R_PO))
ecart_po_modele = max(abs(r - exp(-5.0e-3 * t)) for t, r in zip(T_PO, R_PO))
lam26 = MLN[-1] / T_PO[-1]; t12_26 = log(2) / lam26
candidats = {'iode 131': 8.0, 'polonium 210': 138, 'cobalt 60': 5.27 * 365.25}
proche = min(candidats, key=lambda n: abs(candidats[n] - t12_26))
lam_Pu = 0.693 / (24100 * 3.16e7); N_Pu = 1.0 / 239 * 6.02e23
E_ph = 511e3 * 1.60e-19; lam_ph = 6.63e-34 * 3.00e8 / 8.18e-14
lam_F = 0.693 / 110; t1pc = log(100) / log(2) * 110

controles = [
    ('Q.2 vitesse moyenne', vmoy, 0.60, 1e-9, '= 0{,}60\\ \\text{mmol·L}^{-1}\\text{·min}^{-1}, \\text{ soit } 1{,}0 \\times 10^{-5}'),
    ('Q.2 vitesse moyenne (SI)', vmoy_si, 1.0e-5, 0.05e-5, '\\text{ soit } 1{,}0 \\times 10^{-5}\\ \\text{mol·L}^{-1}\\text{·s}^{-1}$$'),
    ('Q.3 vitesse à t = 0', dI2(0), 0.50, 1e-9, '= 0{,}50\\ \\text{mmol·L}^{-1}\\text{·min}^{-1} \\qquad'),
    ('Q.3 tangente à 10 min (ordonnée à l\'origine)', tan10_0, 1.3, 0.05, '\\dfrac{5{,}0 - 1{,}3}{20 - 0}'),
    ('Q.3 tangente à 10 min (point à 20 min)', tan10_20, 5.0, 0.05, '\\dfrac{5{,}0 - 1{,}3}{20 - 0}'),
    ('Q.3 vitesse à 10 min', dI2(10), 0.185, 0.006, '= 0{,}185 \\approx 0{,}19\\ \\text{mmol·L}^{-1}\\text{·min}^{-1}$$'),
    ('Q.4 temps de demi-réaction', 10 * log(2), 7, 0.5, '$t_{1/2} \\approx 7\\ \\text{min}$'),
    ('Q.6 demi-réaction des courbes b et c', log(2) / 0.20, 3.5, 0.05, 'environ $3{,}5\\ \\text{min}$'),
    ('Ex. 1 acide éthanoïque', n0, 1.05e-2, 0.005e-2, '= 1{,}05 \\times 10^{-2}\\ \\text{mol} \\qquad'),
    ('Ex. 1 alcool benzylique', nalc, 1.35e-2, 0.005e-2, '= 1{,}35 \\times 10^{-2}\\ \\text{mol}$$'),
    ('Ex. 1 mesures et modèle 7,9 (1 - e^(-t/6))', ecart_jasmin, 0, 0.06, 'n_\\text{E}(t) = n_0 - n_\\text{ac}(t)'),
    ('Ex. 1 ester final', nEf, 7.9, 1e-9, '= 10{,}5 - 2{,}6 = 7{,}9\\ \\text{mmol}'),
    ('Ex. 1 rendement', eta, 0.75, 0.005, '= 0{,}75, \\text{ soit } 75\\ \\%$$'),
    ('Ex. 1 demi-réaction (mesures)', t12_jasmin, 4, 0.5, 'donne $t_{1/2} \\approx 4\\ \\text{min}$'),
    ('Ex. 1 demi-réaction (modèle)', 6 * log(2), 4, 0.5, '= 3{,}95\\ \\text{mmol}$'),
    ('Ex. 1 pente de la tangente', pente_jasmin, 1.32, 0.005, '= 1{,}32\\ \\text{mmol·min}^{-1}$'),
    ('Ex. 1 vitesse volumique à t = 0', 1.32e-3 / V_jasmin, 0.66, 0.005, '= 0{,}66\\ \\text{mol·L}^{-1}\\text{·min}^{-1}$$'),
    ('Q.7 constante (trois rapports égaux)', max(k7) - min(k7), 0, 1e-12, '= 2{,}0 \\times 10^{-3}\\ \\text{s}^{-1}$$'),
    ('Q.7 constante', k7[0], 2.0e-3, 1e-12, '= 2{,}0 \\times 10^{-3}\\ \\text{s}^{-1}$$'),
    ('Q.8 facteur exponentiel', exp(-1.2), 0.30, 0.005, '= 2{,}0 \\times 10^{-2} \\times 0{,}30 = 6{,}0 \\times 10^{-3}\\ \\text{mol·L}^{-1}$$'),
    ('Q.8 concentration à 600 s', A8, 6.0e-3, 0.05e-3, '= 6{,}0 \\times 10^{-3}\\ \\text{mol·L}^{-1}$$'),
    ('Q.9 demi-réaction (s)', t12_9, 3.5e2, 5, '= 3{,}5 \\times 10^{2}\\ \\text{s}, \\text{ soit } 5{,}8\\ \\text{min}$$'),
    ('Q.9 demi-réaction (min)', t12_9 / 60, 5.8, 0.05, '\\text{ soit } 5{,}8\\ \\text{min}$$'),
    ('Q.9 fraction restante', 100 * 0.5 ** 3, 12.5, 1e-9, 'soit $12{,}5\\ \\%$'),
    ('Q.10 mesures et demi-réaction de 8 min', ecart_cv, 0, 0.06, 'est toujours de $8{,}0\\ '),
    ('Q.10 ln 20', log(20.0), 3.00, 0.005, '-\\dfrac{0{,}92 - 3{,}00}{24 - 0}'),
    ('Q.10 ln 2,5', log(2.5), 0.92, 0.005, '-\\dfrac{0{,}92 - 3{,}00}{24 - 0}'),
    ('Q.10 pente', k10, 8.7e-2, 0.05e-2, '= 8{,}7 \\times 10^{-2}\\ \\text{min}^{-1}, \\text{ en accord'),
    ('Q.10 ln 2 / 8,0', log(2) / 8.0, 8.7e-2, 0.05e-2, '\\dfrac{\\ln 2}{8{,}0} = 8{,}7 \\times 10^{-2}\\ \\text{min}^{-1}$$'),
    ('Q.11 rapport ln 10 / ln 2', log(10) / log(2), 3.32, 0.005, '= 3{,}32 \\times 8{,}0 = 27\\ \\text{min}'),
    ('Q.11 durée pour 90 %', log(10) / log(2) * 8.0, 27, 0.5, '= 3{,}32 \\times 8{,}0 = 27\\ \\text{min}'),
    ('Q.11 rapport ln 100 / ln 2', log(100) / log(2), 6.64, 0.005, '= 6{,}64 \\times 8{,}0 = 53\\ \\text{min}$$'),
    ('Q.11 durée pour 99 %', log(100) / log(2) * 8.0, 53, 0.5, '= 6{,}64 \\times 8{,}0 = 53\\ \\text{min}$$'),
    ('Q.11 logarithme de 1/10', log(1 / 10), -log(10), 1e-12, '\\ln\\dfrac{1}{10} = -\\ln 10'),
    ('Q.11 fraction restante à 27 min (un dixième)', exp(-log(2) / 8.0 * 27), 0.10, 0.006, '\\text{e}^{-k\\,t_{90\\ \\%}} = \\dfrac{1}{10}$$'),
    ('Q.11 fraction restante à 53 min (un centième)', exp(-log(2) / 8.0 * 53), 0.01, 0.0006, '\\text{e}^{-k\\,t_{99\\ \\%}} = \\dfrac{1}{100}$'),
    ('Q.11 durée pour 90 % avec k de Q.10', log(10) / 8.7e-2, 27, 0.6, 't_{90\\ \\%} = \\dfrac{\\ln 10}{k}$'),
    ('Ex. 2 mesures et modèle 120 e^(-0,27 t)', max(abs(a - b) for a, b in zip(CP, modele_P)), 0, 1e-9, '| $[\\text{P}]$ (µmol·L⁻¹) | 120 |'),
    ('Ex. 2 baisse pendant la première heure', CP[0] - CP[1], 28.4, 0.05, 'baisse de $28{,}4\\ \\text{µmol·L}^{-1}$'),
    ('Ex. 2 baisse pendant la deuxième heure', CP[1] - CP[2], 21.7, 0.05, 'puis de $21{,}7'),
    ('Ex. 2 ln [P]0', lnP0, 4.79, 0.005, '-\\dfrac{2{,}63 - 4{,}79}{8{,}0 - 0}'),
    ('Ex. 2 ln [P] à 8 h sur la droite', lnP8, 2.63, 0.005, '-\\dfrac{2{,}63 - 4{,}79}{8{,}0 - 0}'),
    ('Ex. 2 constante de vitesse', k_P, 0.27, 0.005, '= 0{,}27\\ \\text{h}^{-1}$$'),
    ('Ex. 2 demi-réaction', 0.693 / 0.27, 2.6, 0.05, '= \\dfrac{0{,}693}{0{,}27} = 2{,}6\\ \\text{h}$$'),
    ('Ex. 2 vérification de la demi-réaction', CP[2] > 60 > CP[3] and 2.0 < 0.693 / 0.27 < 3.0, True, 0, 'cohérent avec $2{,}6\\ \\text{h}$'),
    ('Ex. 2 concentration limite', Plim, 5.3e-5, 0.05e-5, '= 5{,}3 \\times 10^{-5}\\ \\text{mol·L}^{-1} = 53\\ \\text{µmol·L}^{-1}$$'),
    ('Ex. 2 durée de l\'effet', t_lim, 3.0, 0.05, '\\ln\\dfrac{120}{53} = 3{,}0\\ \\text{h}$$'),
    ('Ex. 2 durée après la prise', t_lim + 0.5, 3.5, 0.05, 'environ $3{,}5\\ \\text{h}$ après la prise'),
    ('Q.12 écart C-H', chi['C'] - chi['H'], 0.35, 1e-9, '| $\\text{C-H}$ | $0{,}35$ |'),
    ('Q.12 écart C-O', chi['O'] - chi['C'], 0.89, 1e-9, '| $\\text{C-O}$ et $\\text{C=O}$ | $0{,}89$ |'),
    ('Q.12 écart O-H', chi['O'] - chi['H'], 1.24, 1e-9, '| $\\text{O-H}$ | $1{,}24$ |'),
    ('Q.12 écart C-Cl', chi['Cl'] - chi['C'], 0.61, 1e-9, '| $\\text{C-Cl}$ | $0{,}61$ |'),
    ('Q.13 écart C-Br', chi['Br'] - chi['C'], 0.41, 1e-9, '(écart $0{,}41$)'),
    ('Q.17 neutrons du nickel 63', 63 - 28, 35, 0, '$63 - 28 = 35$ neutrons'),
    ('Q.17 charge du noyau', 28 * 1.60e-19, 4.48e-18, 1e-21, '= 4{,}48 \\times 10^{-18}\\ \\text{C}$$'),
    ('Ex. 4 neutrons de l\'uranium 235', 235 - 92, 143, 0, '$235 - 92 = 143$ neutrons'),
    ('Ex. 4 constante radioactive', lam_Pu, 9.1e-13, 0.05e-13, '= 9{,}1 \\times 10^{-13}\\ \\text{s}^{-1}$$'),
    ('Ex. 4 nombre de noyaux', N_Pu, 2.5e21, 0.05e21, '= 2{,}5 \\times 10^{21} \\qquad'),
    ('Ex. 4 activité', 9.1e-13 * 2.5e21, 2.3e9, 0.05e9, '= 2{,}3 \\times 10^{9}\\ \\text{Bq}$$'),
    ('Ex. 4 activité (valeurs non arrondies)', lam_Pu * N_Pu, 2.3e9, 0.05e9, '= 2{,}3 \\times 10^{9}\\ \\text{Bq}$$'),
    ('Q.22 constante (h-1)', lam22, 0.12, 0.005, '= 0{,}12\\ \\text{h}^{-1}'),
    ('Q.22 constante (s-1)', lam22 / 3600, 3.2e-5, 0.05e-5, '= 3{,}2 \\times 10^{-5}\\ \\text{s}^{-1}$$'),
    ('Q.22 restant après 24 h', 100 * 0.5 ** (24 / 6.0), 6.25, 1e-9, '= 6{,}25\\ \\%$'),
    ('Q.23 activité', 1200 / 60, 20, 1e-9, '= 20\\ \\text{Bq}$$'),
    ('Q.24 nombre de noyaux', N24, 4.6e15, 0.05e15, '= 4{,}6 \\times 10^{15}$$'),
    ('Q.24 constante radioactive', lam24, 1.0e-6, 0.05e-6, '= 1{,}0 \\times 10^{-6}\\ \\text{s}^{-1} \\qquad'),
    ('Q.24 activité', lam24 * N24, 4.6e9, 0.05e9, '= 4{,}6 \\times 10^{9}\\ \\text{Bq}$$'),
    ('Q.25 âge du bois', age, 9.4e3, 50, '= 9{,}4 \\times 10^{3}\\ \\text{ans}$$'),
    ('Q.25 activité de l\'iode divisée par 1 000', t_iode, 80, 0.5, '= 80\\ \\text{jours}, \\text{ soit environ } 10\\ \\text{demi-vies}$$'),
    ('Q.25 nombre de demi-vies', t_iode / 8.0, 10, 0.05, 'soit environ } 10\\ \\text{demi-vies}'),
    ('Q.26 valeurs de -ln(N/N0)', ecart_po, 0, 0.006, '| $-\\ln(N/N_0)$ | 0 | 0,20 |'),
    ('Q.26 mesures et loi de décroissance', ecart_po_modele, 0, 0.006, 'la loi de décroissance est vérifiée'),
    ('Q.26 constante radioactive', lam26, 5.0e-3, 0.05e-3, '= 5{,}0 \\times 10^{-3}\\ \\text{jour}^{-1} \\qquad'),
    ('Q.26 demi-vie', t12_26, 1.4e2, 5, '= 1{,}4 \\times 10^{2}\\ \\text{jours}$$'),
    ('Q.26 demi-vie (environ)', t12_26, 138, 1, "d'environ $1{,}4 \\times 10^{2}$ jours, est celle du polonium 210 ($138$ jours)"),
    ('Q.26 noyau identifié', proche, 'polonium 210', None, 'est celle du polonium 210'),
    ('Ex. 5 énergie du photon', E_ph, 8.18e-14, 0.005e-14, '= 8{,}18 \\times 10^{-14}\\ \\text{J} \\qquad'),
    ('Ex. 5 longueur d\'onde', lam_ph, 2.43e-12, 0.005e-12, '= 2{,}43 \\times 10^{-12}\\ \\text{m}$$'),
    ('Ex. 5 domaine des rayons gamma', lam_ph < 1e-11, True, 0, 'ce sont des photons $\\gamma$'),
    ('Ex. 5 constante (min-1)', lam_F, 6.3e-3, 0.05e-3, '= 6{,}3 \\times 10^{-3}\\ \\text{min}^{-1}'),
    ('Ex. 5 constante (s-1)', 6.3e-3 / 60, 1.1e-4, 0.06e-4, '\\text{ soit } 1{,}1 \\times 10^{-4}\\ \\text{s}^{-1}$$'),
    ('Ex. 5 restant à 90 min', exp(-6.3e-3 * 90), 0.57, 0.005, '= \\text{e}^{-6{,}3 \\times 10^{-3} \\times 90} = 0{,}57$$'),
    ('Ex. 5 restant à 90 min (demi-vie)', 0.5 ** (90 / 110), 0.57, 0.005, 'Il reste environ $57\\ \\%$'),
    ('Ex. 5 durée pour qu\'il reste 1 %', t1pc, 7.3e2, 5, '= 6{,}64 \\times 110 = 7{,}3 \\times 10^{2}\\ \\text{min}$$'),
    ('Ex. 5 durée en heures', t1pc / 60, 12, 0.5, 'Il faut environ $12\\ \\text{h}$, soit un peu plus de six demi-vies'),
]
textes = [('Figures 1, 11, 12 : [I2] = 5,0 (1 - e^(-t/10))', 'TAU_I = 10.0; IF = 5.0' in figsrc and 'IF * (1 - np.exp(-t / TAU_I))' in figsrc),
          ('Figure 2 : courbes a, b et c', "('a', 10.0, 0.050, CUIVRE), ('b', 20.0, 0.20, BLEU), ('c', 10.0, 0.20, VERT)" in figsrc),
          ('Figures 3 et 13 : modèle et tangente de l\'ester', '7.9 * (1 - np.exp(-t / 6))' in figsrc and '7.9 / 6 * x' in figsrc),
          ('Figures 3 et 13 : dates des mesures', T_J == [0, 2, 4, 6, 10, 15, 20, 30, 45, 60] and ligne('*t* (min) | 0 | 2') == T_J),
          ('Figure 14 : mesures du cristal violet', tableau_fig('CV') == CV and tableau_fig('T_CV') == T_CV),
          ('Figures 4 et 15 : paracétamol', 'K_P = 0.27; P0 = 120.0' in figsrc and tableau_fig('T_P') == T_P),
          ('Figure 15 : points repérés', "'(0 ; 4,79)'" in figsrc and "'(8,0 ; 2,63)'" in figsrc),
          ('Figures 9 et 19 : demi-vie de 6,0 h', '100 * 0.5 ** (t / 6.0)' in figsrc),
          ('Figure 20 : mesures du polonium', tableau_fig('R_PO') == R_PO and tableau_fig('T_PO') == T_PO),
          ('Figure 20 : pente annoncée', 'droite de pente 5,0 × 10$^{-3}$ jour$^{-1}$' in figsrc),
          ('Figures 10 et 21 : demi-vie de 110 min', '100 * 0.5 ** (t / 110.0)' in figsrc and "'$t_{1/2}$ = 110 min'" in figsrc)]
def ko(c):
    n, cc, i, t, _ = c
    return cc != i if t is None or isinstance(cc, (bool, str)) else abs(float(cc) - float(i)) > t
ecarts = [c for c in controles if ko(c)]
absents = [(n, wr) for n, _, _, _, wr in controles if wr not in src]
faux = [n for n, ok in textes if not ok]
print('--- comparaison avec la fiche : %d valeurs contrôlées, %d écart(s), %d écriture(s) introuvable(s), %d figure(s) à revoir'
      % (len(controles), len(ecarts), len(absents), len(faux)))
for n, cc, i, _, _ in ecarts: print('   ÉCART', n, ': recalculé %s, imprimé %s' % (cc, i))
for n, wr in absents: print('   INTROUVABLE', n, ':', wr)
for n in faux: print('   FIGURE', n)

# équations nucléaires : conservation du nombre de masse et du nombre de charge, symbole cohérent avec Z
ZSYM = {'e': None, 'n': 0, 'p': 1, 'He': 2, 'B': 5, 'C': 6, 'N': 7, 'O': 8, 'F': 9, 'Ni': 28, 'Cu': 29,
        'Rn': 86, 'Ra': 88, 'U': 92, 'Np': 93, 'Pu': 94}
NUC = r'\{\}\^\{(\d+)\}_\{(-?\d+)\}\\text\{(\w+)\}'
nuc_ko, n_eq = [], 0
for m in re.findall(r'\$\$?(.+?)\$\$?', src):
    if '{}^{' not in m or '\\rightarrow' not in m: continue
    for eq in m.split('\\qquad'):
        if '\\rightarrow' not in eq: continue
        n_eq += 1
        g, d = [[(int(a), int(z), x) for a, z, x in re.findall(NUC, cote)] for cote in eq.split('\\rightarrow')]
        if sum(a for a, _, _ in g) != sum(a for a, _, _ in d) or sum(z for _, z, _ in g) != sum(z for _, z, _ in d):
            nuc_ko.append('non conservée : ' + eq.strip())
        for a, z, x in g + d:
            if x not in ZSYM or (ZSYM[x] is not None and ZSYM[x] != z) or (x == 'e' and (a, abs(z)) != (0, 1)):
                nuc_ko.append('symbole %s avec Z = %d' % (x, z))
for a, z, x in set(re.findall(NUC, src)):
    if x not in ZSYM or (ZSYM[x] is not None and ZSYM[x] != int(z)): nuc_ko.append('noyau %s-%s avec Z = %s' % (x, a, z))
print('--- équations nucléaires : %d contrôlées, %d écart(s)' % (n_eq, len(nuc_ko)))
for d in nuc_ko: print('   ' + d)

# niveaux et parcours
niveaux = {int(q): int(n) for q, n in re.findall(r'^## \[Q\.(\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)', src, flags=re.M)}
attendu = {10: [1, 2, 4, 7, 9, 12, 13, 15, 17, 18, 19, 22, 23], 14: [3, 5, 6, 8, 10, 11, 14, 16, 20, 21, 24, 25, 26], 18: []}
faux_niv = [(q, n) for n, qs in attendu.items() for q in qs if niveaux.get(q) != n]
manque = sorted(set(niveaux) - {q for qs in attendu.values() for q in qs}) + ([0] if len(niveaux) != NQ else [])
ex_meta = {int(e): (int(n), m) for e, n, m in re.findall(r'^### \[Exercice (\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)\\ \].*?\[Type BAC\]\{custom-style="TagBac"\} · (.*)$', src, flags=re.M)}
ex_q = {e: len(re.findall(r'^\*\*\d+\.\*\*', src[src.index('### [Exercice %d]' % e):src.index('[CIBLE:c_ex%d]' % e)], flags=re.M)) for e in range(1, NEX + 1)}
ex_att = {1: (10, 6, '4 points · 35 min · Questions 5 et 6 : objectif 14'), 2: (14, 6, '5 points · 45 min'),
          3: (14, 6, '5 points · 45 min'), 4: (10, 6, '5 points · 45 min · Questions 5 et 6 : objectif 14, à traiter après Q.22 à Q.24'),
          5: (14, 6, '5 points · 45 min · Question 6 : objectif 18')}
ex_ko = [e for e, (n, nq, m) in ex_att.items() if ex_meta.get(e) != (n, m) or ex_q[e] != nq] + ([0] if len(ex_meta) != NEX else [])
print('--- niveaux : %d questions et %d exercices, %d écart(s)' % (len(niveaux), len(ex_meta), len(faux_niv) + len(manque) + len(ex_ko)))
for q, n in faux_niv: print('   NIVEAU Q.%d : %s dans la fiche, %d dans le parcours' % (q, niveaux.get(q), n))
for q in manque: print('   Q.%d absente du parcours' % q if q else '   NOMBRE DE QUESTIONS : %d au lieu de %d' % (len(niveaux), NQ))
for e in ex_ko: print('   EXERCICE %d : niveau, nombre de questions ou mention' % e if e else '   NOMBRE D\'EXERCICES : %d' % len(ex_meta))
parcours = ['| Q.1, Q.2, Q.4, Q.7, Q.9, Q.12, Q.13, Q.15, Q.17 à Q.19, Q.22, Q.23 | Ex. 1 (questions 1 à 4), Ex. 4 (questions 1 à 4) |',
            '| Plus Q.3, Q.5, Q.6, Q.8, Q.10, Q.11, Q.14, Q.16, Q.20, Q.21, Q.24 à Q.26 | Ex. 1 à Ex. 4, Ex. 5 (questions 1 à 5) |']
perdus = [p for p in parcours if p not in src]
for p in perdus: print('   PARCOURS INTROUVABLE :', p)

# tableau « Ce qui est tombé »
bloc = src[src.index('# Ce qui est tombé'):src.index('Ce qu\'il faut en retenir')]
lignes = [[c.strip() for c in l.strip().strip('|').split('|')] for l in bloc.splitlines() if l.startswith('| ') and not l.startswith('| Session')]
def renvois(cell):
    qs = set()
    for a, b in re.findall(r'Q\.(\d+)(?: à Q\.(\d+))?', cell): qs |= set(range(int(a), int(b or a) + 1))
    return qs, {int(e) for e in re.findall(r'Ex\. (\d+)', cell)}
table = [(l[0], l[1], l[2]) + renvois(l[3]) for l in lignes]
avec = lambda qq, ee=(): [t for t in table if (t[3] & set(qq)) or (t[4] & set(ee))]
de2026 = lambda tt: [t for t in tt if '2026' in t[0]]
ordre_annee = [t[0][-30:] for t in table]
rang = [0 if '2026' in t[0] else 1 for t in table]
comptes = [('exercices', len(table), 15), ('sciences de l\'ingénieur', len([t for t in table if 'ingénieur' in ' '.join(t[:3]).lower()]), 0),
           ('sessions 2026', len(de2026(table)), 10), ('2026 avant 2025', int(rang == sorted(rang)), 1),
           ('demi-vie (Q.22)', len(avec((22,))), 6), ('durée à calculer (Q.25)', len(avec((25,))), 4),
           ('vitesse et évolution temporelle (Q.2 à Q.11)', len(avec(range(2, 12))), 5),
           ('loi d\'ordre 1 en 2026 (Q.7 à Q.11)', len(de2026(avec(range(7, 12)))), 3),
           ('flèches courbes (Q.14)', len(avec((14,))), 5), ('mécanisme (Q.13 à Q.15)', len(avec((13, 14, 15))), 5),
           ('renvois hors de la fiche', len([t for t in table if max(t[3] | {0}) > NQ or max(t[4] | {0}) > NEX]), 0)]
mauvais = [cc for cc in comptes if cc[1] != cc[2]]
print('--- tableau : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s)' % len(mauvais))
for n, v, a in mauvais: print('   COMPTE %s : %d au lieu de %d' % (n, v, a))
demande = {1: ('Demandé en 2025 et 2026', ['Métropole, juin 2026, jour 1', 'Métropole, juin 2025, jour 2', 'Métropole 2025, jour 2 (sujet de secours)']),
           2: ('Demandé dans quatre exercices en 2025 et 2026', 4),
           3: ('Demandé en 2026 (Métropole)', ['Métropole, juin 2026, jour 1']),
           4: ('Demandé en 2026 (Métropole)', ['Métropole, juin 2026, jour 1', 'Métropole 2026, jour 2 (sujet de secours)']),
           5: ('Demandé en 2026 (Métropole)', ['Métropole, juin 2026, jour 2']),
           7: ('Demandé en 2026 (Métropole, Antilles-Guyane)', ['Métropole, juin 2026, jour 2', 'Antilles-Guyane 2026, jour 2']),
           8: ('Demandé en 2026 (Métropole, Antilles-Guyane)', ['Métropole, juin 2026, jour 2', 'Antilles-Guyane 2026, jour 2']),
           9: ('Demandé en 2026 (Métropole)', ['Métropole, juin 2026, jour 2']),
           10: ('Demandé en 2026 (Métropole)', ['Métropole, juin 2026, jour 2', 'Métropole 2026, jour 2 (sujet de secours)']),
           11: ('Demandé en 2026 (Antilles-Guyane)', ['Antilles-Guyane 2026, jour 2']),
           12: ('Demandé en 2025 (Métropole, sujet de secours)', ['Métropole 2025, jour 2 (sujet de secours)']),
           13: ('Demandé en 2025 et 2026', ['Métropole, juin 2026, jour 1', 'Amérique du Nord 2026, jour 1', 'Métropole 2025, jour 2 (sujet de secours)']),
           14: ('Demandé dans cinq exercices en 2025 et 2026', 5),
           15: ('Demandé dans quatre exercices en 2025 et 2026', 4),
           17: ('Demandé dans cinq exercices en 2025 et 2026', 5),
           18: ('Demandé en 2025 et 2026', ['Asie 2026, jour 2', 'Centres étrangers 2026, jour 2', 'Métropole, juin 2025, jour 1']),
           19: ('Demandé dans quatre exercices en 2025 et 2026', 4),
           20: ('Demandé en 2025 (Métropole, Amérique du Nord)', ['Métropole 2025, jour 2 (sujet de secours)', 'Amérique du Nord 2025, jour 2']),
           21: ('Demandé dans quatre exercices en 2025 et 2026', 4),
           22: ('Demandé dans six exercices en 2025 et 2026', 6),
           23: ('Demandé en 2026 (Antilles-Guyane)', ['Antilles-Guyane 2026, jour 1']),
           25: ('Demandé dans quatre exercices en 2025 et 2026', 4)}
metas = {int(q): m for q, m in re.findall(r'^## \[Q\.(\d+)\].*?\n\n::: \{custom-style="Meta"\}\n(.*)$', src, flags=re.M)}
dem_ko = []
for q in range(1, NQ + 1):
    lq = [t[0] for t in table if q in t[3]]
    if q not in demande:
        if 'Demandé' in metas[q] or lq: dem_ko.append('Q.%d : mention ou ligne inattendue' % q)
        continue
    texte, att = demande[q]
    if texte not in metas[q]: dem_ko.append('Q.%d : « %s » absent' % (q, texte))
    if (len(lq) != att) if isinstance(att, int) else (sorted(lq) != sorted(att)): dem_ko.append('Q.%d : lignes %s' % (q, lq))
    if isinstance(att, int) and texte.startswith('Demandé dans') and not ({'2025', '2026'} <= {x for l in lq for x in ('2025', '2026') if x in l}):
        dem_ko.append('Q.%d : les deux années ne sont pas représentées' % q)
sujets = {1: ('Métropole, juin 2026, jour 1', "L'odeur de Jasmin", '(voir BAC Métropole, juin 2026)', 'Métropole, juin 2026, jour 1, exercice 2'),
          2: ('Antilles-Guyane 2026, jour 2', 'Le paracétamol', '(voir BAC Antilles-Guyane 2026)', 'Antilles-Guyane 2026, jour 2, exercice 2'),
          3: ('Métropole 2025, jour 2 (sujet de secours)', 'Savon : parfum, synthèse et utilisation', '(voir BAC Métropole 2025, sujet de secours)',
              'Métropole 2025, jour 2 (sujet de secours), exercice 1'),
          4: ('Amérique du Nord 2025, jour 2', 'Combustible MOX pour limiter les déchets nucléaires', '(voir BAC Amérique du Nord 2025)',
              'Amérique du Nord 2025, jour 2, exercice 2'),
          5: ('Centres étrangers 2026, jour 2', 'Le cyclotron Arronax', '(voir BAC Centres étrangers 2026)', 'Centres étrangers 2026, jour 2, exercice 1')}
for e, (sess, nom, voir, mention) in sujets.items():
    tete = src[src.index('### [Exercice %d]' % e):][:900]
    lig = [t for t in table if t[0] == sess and t[1] == nom]
    if not lig or e not in lig[0][4]: dem_ko.append('Ex. %d : ligne « %s » absente ou sans renvoi' % (e, nom))
    if voir not in tete or ('%s : « %s »' % (mention, nom)) not in tete: dem_ko.append('Ex. %d : renvoi au sujet incomplet' % e)
ex_cites = sorted({e for t in table for e in t[4]})
if ex_cites != list(range(1, NEX + 1)): dem_ko.append('exercices cités dans le tableau : %s' % ex_cites)
print('--- mentions « Demandé » et sujets d\'après : %d écart(s)' % len(dem_ko))
for d in dem_ko: print('   ' + d)
phrases = ['dans au moins quinze exercices des sessions 2025 et 2026',
           'Radioactivité : six exercices sur la demi-vie ; quatre font calculer une durée (Q.22, Q.25).',
           'Cinétique : cinq exercices, dont trois de 2026 sur une loi d\'ordre 1 (Q.4, Q.8 à Q.11).',
           'Mécanisme : cinq exercices font tracer des flèches courbes (Q.13 à Q.15).']
perdues = [p for p in phrases if p not in src]
for p in perdues: print('   PHRASE INTROUVABLE :', p)
print('--- phrases de synthèse : %d suivies, %d introuvable(s)' % (len(phrases), len(perdues)))
nums = [int(n) for n in re.findall(r'^Figure (\d+)\. ', src, flags=re.M)]
refs = sorted({int(n) for n in re.findall(r'(?:la |\()figure (\d+)', src)})
fig_ko = nums != list(range(1, len(nums) + 1)) or len(nums) != 21 or any(n not in nums for n in refs)
print('--- figures : %d légendes, renvois vers %s%s' % (len(nums), ', '.join(map(str, refs)), ' ; ÉCART' if fig_ko else ''))
idx = src[src.index('# Index des notions'):]
iq, ie = set(), set()
for l in idx.splitlines():
    if l.startswith('| ') and not l.startswith('| Notion'):
        a, b = renvois(l.split('|')[2]); iq |= a; ie |= b
idx_ko = sorted(set(range(1, NQ + 1)) - iq) + [100 + e for e in sorted(set(range(1, NEX + 1)) - ie)] + [q for q in iq if q > NQ] + [100 + e for e in ie if e > NEX]
print('--- index : %d questions et %d exercices cités%s' % (len(iq), len(ie), ' ; ÉCART %s' % idx_ko if idx_ko else ''))
if ecarts or absents or faux or nuc_ko or faux_niv or manque or ex_ko or perdus or mauvais or dem_ko or perdues or fig_ko or idx_ko:
    raise SystemExit(1)
print('--- tout est bon')
