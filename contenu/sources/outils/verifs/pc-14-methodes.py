# Recalcul indépendant des résultats numériques de la fiche 14 (Méthodes du BAC),
# puis contrôle de la structure de la fiche : niveaux et parcours, tableau « Ce qui est tombé », numéros des figures.
# usage : python3 outils/verifs/pc-14-methodes.py
# Chaque valeur imprimée est recalculée à partir des seules données des énoncés, puis on vérifie que son écriture
# figure telle quelle dans la fiche. Les programmes Python des énoncés sont réexécutés ici avec les mêmes données.
import os, re, statistics as st
from math import pi, sqrt, exp, log
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(RACINE, 'fiches', 'pc-14-methodes', 'fiche.md'), encoding='utf-8').read()

# Thème 1 : mesures et incertitudes
T_aff, uT_aff = 1.4192378, 0.0213
serie = [1.42, 1.40, 1.45, 1.43, 1.39, 1.44, 1.41, 1.42]
moy2, s2 = st.mean(serie), st.stdev(serie); u2 = s2 / sqrt(len(serie))
L4, uL4, T4, uT4 = 0.500, 0.002, 1.420, 0.007
g4 = 4 * pi ** 2 * L4 / T4 ** 2; r4L, r4T = uL4 / L4, 2 * uT4 / T4; rel4 = sqrt(r4L ** 2 + r4T ** 2)
z51, z52 = abs(9.79 - 9.81) / 0.10, abs(10.21 - 9.81) / 0.15
d1 = [12.70, 12.68, 12.72, 12.70, 12.66, 12.72]
moy1, s1 = st.mean(d1), st.stdev(d1); ud1 = s1 / sqrt(6)
m1, um1 = 8.36, 0.01 / sqrt(3)
rho1 = 6 * m1 / (pi * (moy1 / 10) ** 3)
rel1 = sqrt((um1 / m1) ** 2 + (3 * ud1 / moy1) ** 2)
z1 = abs(7.80 - 7.83) / 0.02

# Thème 2 : programmer en Python
t6 = [0.0, 0.5, 1.0, 1.5, 2.0]; x6 = [0.00, 0.40, 0.95, 1.65, 2.50]
v7 = [(x6[i + 1] - x6[i]) / (t6[i + 1] - t6[i]) for i in range(len(t6) - 1)]
a7 = [(v7[i + 1] - v7[i]) / (t6[i + 1] - t6[i]) for i in range(len(v7) - 1)]
C1, V1, C2 = 0.050, 10.0e-3, 0.100
VE = C1 * V1 / C2; n1_2mL = C1 * V1 - C2 * 2.0e-3
try:
    import numpy as np
    rng = np.random.default_rng(2026)
    Ls = rng.normal(0.500, 0.002, 100000); Ts = rng.normal(1.420, 0.007, 100000)
    gs = 4 * np.pi ** 2 * Ls / Ts ** 2
    mc = (float(gs.mean()), float(gs.std(ddof=1)))
except ImportError:
    mc = None
def z_asc(t):                                   # altitude de la cabine (modèle des données de l'exercice 2)
    if t <= 8: return 0.375 * t * t
    if t <= 32: return 24 + 6 * (t - 8)
    return 168 + 6 * (t - 32) - 0.375 * (t - 32) ** 2
P_asc = [101300.0 - 1.2 * 9.81 * z_asc(t) for t in range(41)]
z_calc = [(P_asc[0] - p) / (1.2 * 9.81) for p in P_asc]
v_asc = [z_calc[i + 1] - z_calc[i] for i in range(40)]
a_asc = [v_asc[i + 1] - v_asc[i] for i in range(39)]

# Thème 3 : équations différentielles
tau12 = 1.0e3 / 1.0
th13 = 20 + 60 * exp(-600 / tau12)
t14 = tau12 * log(2)
lam = log(2) / 30.1
def euler(dt):                                  # même boucle que le programme de la fiche (while t[-1] < 100, sans tolérance)
    N, t = [1.0e6], [0.0]
    while t[-1] < 100:
        N.append(N[-1] - lam * N[-1] * dt); t.append(t[-1] + dt)
    return 100 * N[-1] / N[0]
tauA = 0.80 / 2.0e-2
tr = lambda tau, thx: tau * log((thx - 22) / (thx - 68))

# Thème 4 : rédiger
Ec16 = 0.5 * 0.450 * (72 / 3.6) ** 2
Q19 = 1.7 * 4.18e3 * 80; dt19 = 5.7e5 / 2000
C4 = 47e-3 / 10e3; E4 = 0.5 * 4.7e-6 * 12 ** 2

controles = [
    ('Q.1 u à un chiffre', round(uT_aff, 2), 0.02, 1e-9, 'T = 1{,}42\\ \\text{s}$'),
    ('Q.1 T avec u à deux chiffres', round(T_aff, 3), 1.419, 1e-9, '1{,}419'),
    ('Q.1 u à deux chiffres', round(uT_aff, 3), 0.021, 1e-9, '0{,}021'),
    ('Q.2 moyenne', moy2, 1.42, 0.005, '= \\dfrac{11{,}36}{8} = 1{,}42\\ \\text{s}$$'),
    ('Q.2 écart-type', s2, 0.020, 0.0005, '= 0{,}020\\ \\text{s}$$'),
    ('Q.2 incertitude-type', u2, 7.1e-3, 0.05e-3, '= 7{,}1 \\times 10^{-3}\\ \\text{s}$$'),
    ('Q.3 règle', 1 / sqrt(12), 0.29, 0.005, '= 0{,}29\\ \\text{mm}'),
    ('Q.3 pipette', 0.02 / sqrt(3), 0.012, 0.0005, '= 0{,}012\\ \\text{mL}'),
    ('Q.4 g', g4, 9.789, 0.0005, '= 9{,}789\\ \\text{m·s}^{-2}$$'),
    ('Q.4 terme L', r4L, 4.00e-3, 0.005e-3, '= 4{,}00 \\times 10^{-3}'),
    ('Q.4 terme T', r4T, 9.86e-3, 0.005e-3, '= 9{,}86 \\times 10^{-3}'),
    ('Q.4 incertitude relative', rel4, 1.06e-2, 0.005e-2, '= 1{,}06 \\times 10^{-2}$$'),
    ('Q.4 u(g)', g4 * rel4, 0.10, 0.005, 'u(g) = 0{,}10'),
    ('Q.5 z1', z51, 0.2, 0.05, '= 0{,}2 \\quad'),
    ('Q.5 z2', z52, 2.7, 0.05, '= 2{,}7$$'),
    ('Ex. 1 diamètre moyen', moy1, 12.697, 0.0005, '= 12{,}697\\ \\text{mm}'),
    ('Ex. 1 écart-type', s1, 0.023, 0.0005, 's = 0{,}023\\ \\text{mm}'),
    ('Ex. 1 u(d)', ud1, 0.0095, 0.00005, '= 0{,}0095\\ \\text{mm}'),
    ('Ex. 1 u(m)', um1, 0.0058, 0.00005, '0{,}0058'),
    ('Ex. 1 rho', rho1, 7.80, 0.005, '= 7{,}80\\ \\text{g·cm}^{-3}$$'),
    ('Ex. 1 u(rho)', rho1 * rel1, 0.02, 0.005, 'u(\\rho) = 0{,}02\\ \\text{g·cm}^{-3}'),
    ('Ex. 1 z', z1, 1.5, 0.05, '= 1{,}5$$'),
    ('Ex. 1 z sans arrondi', abs(rho1 - 7.83) / (rho1 * rel1), 1.6, 0.05, 'on trouve $z = 1{,}6$'),
    ('Q.6 dx', x6[3] - x6[2], 0.70, 0.005, '= 0{,}70\\ \\text{m}$$'),
    ('Q.7 première vitesse', v7[0], 0.80, 0.005, '0,80 ; 1,1 ; 1,4 ; 1,7'),
    ('Q.7 dernière vitesse', v7[-1], 1.7, 0.05, '0,80 ; 1,1 ; 1,4 ; 1,7'),
    ('Q.7 accélération', a7[0], 0.60, 0.005, '0,60 ; 0,60 ; 0,60'),
    ('Q.7 accélérations égales', max(a7) - min(a7), 0, 1e-9, '0,60 ; 0,60 ; 0,60'),
    ('Q.9 volume équivalent (mL)', VE * 1e3, 5.0, 0.05, 'soit } 5{,}0\\ \\text{mL}$$'),
    ('Q.9 n1 après 2 mL', n1_2mL, 3.0e-4, 0.05e-4, '= 3{,}0 \\times 10^{-4}\\ \\text{mol}$$'),
    ('Ex. 2 hauteur finale', z_calc[-1], 192, 0.5, '= 192\\ \\text{m}$$'),
    ('Ex. 2 écart de pression', P_asc[0] - P_asc[-1], 2260.2, 0.05, '2\\,260{,}2'),
    ('Ex. 2 nombre de vitesses', len(v_asc), 40, 0, '`v` en contient 40'),
    ('Ex. 2 nombre d\'accélérations', len(a_asc), 39, 0, '`a` en contient 39'),
    ('Ex. 2 accélération lue', (v_asc[4] - v_asc[0]) / 4.0, 0.75, 0.005, '= 0{,}75\\ \\text{m·s}^{-2}$$'),
    ('Ex. 2 altitude pour 1 Pa', 1 / (1.2 * 9.81), 0.085, 0.0005, '= 0{,}085\\ \\text{m}$$'),
    ('Q.11 tau du circuit', 1 / 50, 0.020, 0.0005, '\\tau = 0{,}020'),
    ('Q.12 tau du thé', tau12, 1.0e3, 0.05e3, '1{,}0 \\times 10^{3}\\ \\text{s}'),
    ('Q.13 température à 600 s', th13, 53, 0.5, '= 20 + 33 = 53\\ \\text{°C}$$'),
    ('Q.14 date', t14, 690, 5, '= 6{,}9 \\times 10^{2}\\ \\text{s}$'),
    ('Q.15 Euler, pas de 1 an (%)', euler(1.0), 9.73, 0.005, 'restant au bout de 100 ans : 9,73 %'),
    ('Q.15 solution exacte (%)', 100 * exp(-lam * 100), 10.0, 0.05, '10{,}0\\ \\%$$'),
    ('Q.15 Euler, pas de 0,25 an (%)', euler(0.25), 9.93, 0.005, 'il donne 9,93 %'),
    ('Ex. 3 tau ampoule A', tauA, 40, 0.5, '40\\ \\text{s}'),
    ('Ex. 3 rupture ampoule A', tr(tauA, 200), 12, 0.5, '12\\ \\text{s}'),
    ('Ex. 3 rupture ampoule B', tr(12, 200), 3.6, 0.05, '3{,}6\\ \\text{s}'),
    ('Ex. 3 rupture à 100 °C', tr(tauA, 100), 36, 0.5, '= 36\\ \\text{s}$$'),
    ('Q.16 vitesse', 72 / 3.6, 20, 0.05, '20\\ \\text{m·s}^{-1}'),
    ('Q.16 énergie cinétique', Ec16, 90, 0.5, '90\\ \\text{J}'),
    ('Q.19 énergie', Q19, 5.7e5, 0.05e5, '= 5{,}7 \\times 10^{5}\\ \\text{J}$$'),
    ('Q.19 durée', dt19, 2.8e2, 0.05e2, '= 2{,}8 \\times 10^{2}\\ \\text{s}'),
    ('Ex. 4 capacité', C4, 4.7e-6, 0.05e-6, '= 4{,}7 \\times 10^{-6}\\ \\text{F}$'),
    ('Ex. 4 borne basse', 4.7 * 0.9, 4.2, 0.05, '= 4{,}2\\ \\text{µF}$'),
    ('Ex. 4 borne haute', 4.7 * 1.1, 5.2, 0.05, '= 5{,}2\\ \\text{µF}$'),
    ('Ex. 4 énergie', E4, 3.4e-4, 0.05e-4, '= 3{,}4 \\times 10^{-4}'),
    ('Ex. 4 rapport à la copie', log(33840 / E4, 10), 8, 0.1, 'cent millions'),
]
if mc is not None:
    controles += [('Q.10 moyenne Monte Carlo', mc[0], 9.7898, 0.00005, '9.7898 0.1042'),
                  ('Q.10 écart-type Monte Carlo', mc[1], 0.1042, 0.00005, '9.7898 0.1042')]
ecarts = [(n, cc, i) for n, cc, i, t, _ in controles if abs(cc - i) > t]
absents = [(n, w) for n, _, _, _, w in controles if w not in src]
print('--- comparaison avec la fiche : %d valeurs contrôlées, %d écart(s), %d écriture(s) introuvable(s)%s'
      % (len(controles), len(ecarts), len(absents), '' if mc else ' (numpy absent : Q.10 non recalculée)'))
for n, cc, i in ecarts: print('   ÉCART', n, ': recalculé %.5g, imprimé %.5g' % (cc, i))
for n, w in absents: print('   INTROUVABLE', n, ':', w)

# niveaux des questions : ligne d'information et tableau « Votre parcours »
niveaux = {int(q): int(n) for q, n in re.findall(r'^## \[Q\.(\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)', src, flags=re.M)}
attendu = {10: [1, 2, 3, 5, 6, 8, 11, 14, 16, 17, 18], 14: [4, 7, 9, 10, 12, 13, 19], 18: [15]}
faux_niv = [(q, n) for n, qs in attendu.items() for q in qs if niveaux.get(q) != n]
manque = sorted(set(niveaux) - {q for qs in attendu.values() for q in qs})
print('--- niveaux : %d questions, %d écart(s) avec le parcours' % (len(niveaux), len(faux_niv) + len(manque)))
for q, n in faux_niv: print('   NIVEAU Q.%d : %s dans la fiche, %d dans le parcours' % (q, niveaux.get(q), n))
for q in manque: print('   Q.%d absente du parcours' % q)
parcours = ['| Q.1 à Q.3, Q.5, Q.6, Q.8, Q.11, Q.14, Q.16 à Q.18 | Ex. 1 (questions 1 à 3), Ex. 4 |',
            '| Plus Q.4, Q.7, Q.9, Q.10, Q.12, Q.13, Q.19 | Ex. 1 et Ex. 4, Ex. 2 et Ex. 3 (questions 1 à 5) |']
perdus = [p for p in parcours if p not in src]
for p in perdus: print('   PARCOURS INTROUVABLE :', p)

# tableau « Ce qui est tombé » : uniquement des exercices de physique-chimie avec un programme Python
bloc = src[src.index('# Ce qui est tombé'):src.index('Ce qu\'il faut en retenir')]
lignes = [l for l in bloc.splitlines() if l.startswith('| ') and not l.startswith('| Session')]
notions = [l.split('|')[3].lower() for l in lignes]
comptes = [('exercices', len(lignes), 14), ('sciences de l\'ingénieur', len([l for l in lignes if 'ingénieur' in l.lower()]), 0),
           ('vitesse ou accélération entre deux dates', len([n for n in notions if 'vitesse' in n or 'accélération' in n]), 5),
           ('énergies', len([n for n in notions if 'énergie' in n]), 3),
           ('titrage', len([n for n in notions if 'titrage' in n]), 2),
           ('sessions 2026', len([l for l in lignes if '2026' in l.split('|')[1]]), 5)]
mauvais = [cc for cc in comptes if cc[1] != cc[2]]
print('--- tableau : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s)' % len(mauvais))
phrases = ['les quatorze exercices où il faut lire ou compléter un programme Python',
           'Aucun exercice ne fait écrire un programme entier',
           'entre deux dates (cinq), énergies (trois) ou titrage (deux)',
           'Utile dans les quatorze exercices Python de 2025 et 2026', 'Demandé trois fois en 2025',
           'Demandé dans quatre sujets en 2025']
perdues = [p for p in phrases if p not in src]
for p in perdues: print('   PHRASE INTROUVABLE :', p)
print('--- phrases de synthèse : %d suivies, %d introuvable(s)' % (len(phrases), len(perdues)))

# figures : légendes numérotées dans l'ordre, renvois du texte vers des figures existantes
nums = [int(n) for n in re.findall(r'^Figure (\d+)\. ', src, flags=re.M)]
renvois = sorted({int(n) for n in re.findall(r'\(?figure (\d+)\)?', src)})
fig_ko = nums != list(range(1, len(nums) + 1)) or any(n not in nums for n in renvois)
print('--- figures : %d légendes, renvois vers %s%s' % (len(nums), ', '.join(map(str, renvois)), ' ; ÉCART' if fig_ko else ''))
if ecarts or absents or faux_niv or manque or perdus or mauvais or perdues or fig_ko:
    raise SystemExit(1)
print('--- tout est bon')
