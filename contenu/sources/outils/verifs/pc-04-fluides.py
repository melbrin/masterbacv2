# Recalcul indépendant des résultats numériques de la fiche 4 (thème 3, chute dans un fluide, puis Q.2, Q.4 et exercices 1, 2, 3, 6, 7),
# puis contrôle de la structure de la fiche : niveaux et parcours, tableau « Ce qui est tombé », numéros des figures.
# usage : python3 outils/verifs/pc-04-fluides.py
# Chaque valeur imprimée est recalculée à partir des seules données des énoncés, puis on vérifie que son écriture
# figure telle quelle dans la fiche. Les courbes lues sur les figures sont reprises du script des figures.
import os, re
from math import pi, sqrt, tanh
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(RACINE, 'fiches', 'pc-04-fluides', 'fiche.md'), encoding='utf-8').read()
g = 9.81
rho_air, rho_eau = 1.2, 1.00e3

# Q.11 : goutte de pluie dans l'air
r11 = rho_air / rho_eau
# Q.13 et Q.14 : gouttelette de brouillard, r = 10 µm, k = 6 pi eta r
m13 = rho_eau * 4 / 3 * pi * (10e-6) ** 3
k13 = 6 * pi * 1.8e-5 * 10e-6
tau13 = 4.2e-12 / 3.4e-9                       # avec les valeurs arrondies imprimées
v14 = 4.2e-12 * g / 3.4e-9
dt14 = 1.0 / 1.2e-2
# Q.15 : bille d'acier (rayon 1,0 mm, eta = 1,0 Pa.s) dans une huile, courbe du script des figures
mb = 7.80e3 * 4 / 3 * pi * (1.0e-3) ** 3; kb = 6 * pi * 1.0 * 1.0e-3
tau15 = mb / kb * 1e3                          # en ms
a15 = g * (1 - 9.70e2 / 7.80e3)                # en m.s-2
v15 = a15 * tau15 * 1e-3 * 100                 # en cm.s-1
v_tan15 = a15 * 1.0e-3 * 100                   # ordonnée de la tangente à t = 1,0 ms, en cm.s-1
pente15 = 0.86e-2 / 1.0e-3
# Q.16 : pétanque et tennis de table à 10 m/s
def frott(d, v=10.0): return 0.5 * rho_air * 0.47 * pi * d ** 2 / 4 * v ** 2
f_p, P_p = frott(7.5e-2), 0.700 * g
f_t, P_t = frott(4.0e-2), 2.7e-3 * g
vl_t = sqrt(P_t / (0.5 * rho_air * 0.47 * pi * (4.0e-2) ** 2 / 4))
# Exercice 8 : thermomètre de Galilée
rho = lambda th: 880 - 0.80 * (th - 20)
V8 = 12.0e-6
m22 = rho(22) * V8; dm8 = (rho(20) - rho(22)) * V8
F8 = (rho(22) - rho(23)) * V8 * g; P8 = m22 * g
R8 = (3 * V8 / (4 * pi)) ** (1 / 3); S8 = pi * R8 ** 2; K8 = 0.5 * rho(23) * 0.47 * S8
v8 = sqrt(9.4e-5 / 0.131); dt8 = 0.25 / 2.7e-2
# Exercice 9 : parachutiste, f = K v^2
m9, K9, K9o = 80.0, 0.280, 28.0
P9 = m9 * g; Pi9 = rho_air * 0.080 * g
v9 = sqrt(m9 * g / K9); tau9 = v9 / g; v9tau = v9 * tanh(1)
v9o = sqrt(m9 * g / K9o); h9 = v9o ** 2 / (2 * g)

# Exercices 2, 3, 6, 7 et Q.4 (ajoutés après le contrôle qualité)
tau2 = 2 * 7.80e3 * (3.00e-3) ** 2 / (9 * 10.0)
vl2 = 2 * (3.00e-3) ** 2 * g * (7.80e3 - 1.42e3) / (9 * 10.0)
D3 = pi * (2.0e-2) ** 2 / 4 * sqrt(2 * g * 3.2e-2)
SA6 = pi * (12.0e-3) ** 2 / 4; vA6 = (9.00e-3 / 60) / SA6; vB6 = 9.00 * vA6
dP6 = 0.5 * 1.00e3 * (vB6 ** 2 - vA6 ** 2)
dt7 = 1.00e-2 / (pi * (12.0e-3) ** 2 / 4 * sqrt(2 * g * 0.900))

# Q.2 (vérification par le calcul) : cube d'arête 10,0 cm dans l'eau, face du haut à 20,0 cm sous la surface
a2, prof2, Patm = 0.100, 0.200, 1.013e5
P_haut2 = Patm + rho_eau * g * prof2
P_bas2 = Patm + rho_eau * g * (prof2 + a2)
dP2 = rho_eau * g * a2                         # la pression atmosphérique s'élimine
S2 = a2 ** 2
F_haut2, F_bas2 = P_haut2 * S2, P_bas2 * S2
dF2 = dP2 * S2
Pi2 = rho_eau * a2 ** 3 * g
# Exercice 1 : pèse-sirop (unités du corrigé : g, cm, g.cm-3)
m1, V01, s1, L1 = 25.0, 18.0, 0.200, 16.0
rhoA1 = m1 / (V01 + s1 * 10.0)
hB1 = (m1 / 1.32 - V01) / s1
rhomin1 = m1 / (V01 + s1 * L1)
Vmax1 = V01 + s1 * L1
dh1 = m1 / s1 * (1 / rhoA1 - 1 / 1.32)         # déplacement de la tige entre les sirops A et B (question 7)

controles = [
    ('Q.11 Pi/P', r11, 1.2e-3, 0.05e-3, '= 1{,}2 \\times 10^{-3}$$'),
    ('Q.11 en %', r11 * 100, 0.12, 0.005, 'vaut 0,12 % du poids'),
    ('Q.13 masse', m13, 4.2e-12, 0.05e-12, '= 4{,}2 \\times 10^{-12}\\ \\text{kg}$$'),
    ('Q.13 k', k13, 3.4e-9, 0.05e-9, '= 3{,}4 \\times 10^{-9}\\ \\text{kg·s}^{-1}$$'),
    ('Q.13 tau', tau13, 1.2e-3, 0.05e-3, '= 1{,}2 \\times 10^{-3}\\ \\text{s}$'),
    ('Q.13 5 tau (ms)', 5 * m13 / k13 * 1e3, 6, 0.5, 'soit $6\\ \\text{ms}$'),
    ('Q.14 vitesse limite', v14, 1.2e-2, 0.05e-2, '= 1{,}2 \\times 10^{-2}\\ \\text{m·s}^{-1}$'),
    ('Q.14 durée sur 1 m', dt14, 83, 0.5, '\\approx 83\\ \\text{s}$$'),
    ('Q.15 vitesse limite', v15, 1.5, 0.05, 'v_{\\text{lim}} \\approx 1{,}5\\ \\text{cm·s}^{-1}$'),
    ('Q.15 63 %', 0.63 * v15, 0.94, 0.005, 'environ $0{,}94\\ \\text{cm·s}^{-1}$'),
    ('Q.15 tau (ms)', tau15, 1.7, 0.05, '\\tau \\approx 1{,}7\\ \\text{ms}$'),
    ('Q.15 tangente à 1 ms', v_tan15, 0.86, 0.005, '0{,}86\\ \\text{cm·s}^{-1})$'),
    ('Q.15 pente lue', pente15, 8.6, 0.05, '= 8{,}6\\ \\text{m·s}^{-2}$$\n\nÀ $t = 0$'),
    ('Q.15 dv/dt(0) théorique', a15, 8.6, 0.05, '\\right) = 8{,}6\\ \\text{m·s}^{-2}$$'),
    ('Q.15 part du poids compensée (%)', 9.70e2 / 7.80e3 * 100, 12, 0.5, 'compense 12 % du poids'),
    ('Q.16 frottement pétanque', f_p, 0.12, 0.005, '= 0{,}12\\ \\text{N}$$'),
    ('Q.16 poids pétanque', P_p, 6.9, 0.05, '= 6{,}9\\ \\text{N}$'),
    ('Q.16 rapport pétanque (%)', f_p / P_p * 100, 2, 0.5, 'en représente environ 2 %'),
    ('Q.16 frottement tennis de table', f_t, 3.5e-2, 0.05e-2, '= 3{,}5 \\times 10^{-2}\\ \\text{N}$$'),
    ('Q.16 poids tennis de table', P_t, 2.6e-2, 0.05e-2, '= 2{,}6 \\times 10^{-2}\\ \\text{N}$'),
    ('Q.16 vitesse limite tennis de table', vl_t, 8.6, 0.05, 'ne vaut que $8{,}6\\ \\text{m·s}^{-1}$'),
    ('Ex. 8 rho(22)', rho(22), 878.4, 0.05, '= 878{,}4\\ \\text{kg·m}^{-3}$$'),
    ('Ex. 8 masse (kg)', m22, 1.054e-2, 0.0005e-2, '= 1{,}054 \\times 10^{-2}\\ \\text{kg}$'),
    ('Ex. 8 masse (g)', m22 * 1e3, 10.54, 0.005, 'soit $10{,}54\\ \\text{g}$'),
    ('Ex. 8 écart de masse volumique', rho(20) - rho(22), 1.6, 0.05, '0{,}80 \\times 2 = 1{,}6\\ \\text{kg·m}^{-3}$'),
    ('Ex. 8 écart de masse (kg)', dm8, 1.9e-5, 0.05e-5, '= 1{,}9 \\times 10^{-5}\\ \\text{kg}'),
    ('Ex. 8 écart de masse (mg)', dm8 * 1e6, 19, 0.5, 'soit } 19\\ \\text{mg}$$'),
    ('Ex. 8 écart relatif (%)', dm8 / m22 * 100, 0.2, 0.05, 'soit 0,2 % de leur masse'),
    ('Ex. 8 rho(23)', rho(23), 877.6, 0.05, '= 877{,}6\\ \\text{kg·m}^{-3}$$'),
    ('Ex. 8 résultante', F8, 9.4e-5, 0.05e-5, '$F = 9{,}4 \\times 10^{-5}\\ \\text{N}$'),
    ('Ex. 8 poids de la boule', P8, 0.103, 0.0005, 'qui est de $0{,}103\\ \\text{N}$'),
    ('Ex. 8 résultante / poids (%)', F8 / P8 * 100, 0.09, 0.01, 'moins de 0,1 % du poids'),
    ('Ex. 8 rayon', R8, 1.42e-2, 0.005e-2, '= 1{,}42 \\times 10^{-2}\\ \\text{m}$$'),
    ('Ex. 8 section', S8, 6.34e-4, 0.005e-4, 'S = \\pi R^{2} = 6{,}34 \\times 10^{-4}'),
    ('Ex. 8 K', K8, 0.131, 0.0005, '= 0{,}131\\ \\text{kg·m}^{-1}$$'),
    ('Ex. 8 vitesse limite', v8, 2.7e-2, 0.05e-2, '= 2{,}7 \\times 10^{-2}\\ \\text{m·s}^{-1}$'),
    ('Ex. 8 durée minimale', dt8, 9, 0.5, '\\approx 9\\ \\text{s}$$'),
    ('Ex. 9 poids', P9, 785, 0.5, '= 785\\ \\text{N}'),
    ('Ex. 9 poussée', Pi9, 0.94, 0.005, '= 0{,}94\\ \\text{N}$$'),
    ('Ex. 9 rapport', Pi9 / P9, 1.2e-3, 0.05e-3, '\\dfrac{\\Pi}{P}$ vaut $1{,}2 \\times 10^{-3}$'),
    ('Ex. 9 vitesse limite', v9, 52.9, 0.05, '= 52{,}9\\ \\text{m·s}^{-1}$'),
    ('Ex. 9 en km/h (valeur non arrondie)', v9 * 3.6, 191, 0.5, 'soit $191\\ \\text{km·h}^{-1}$'),
    ('Ex. 9 lecture de la figure', v9, 53, 0.5, 'environ $53\\ \\text{m·s}^{-1}$'),
    ('Ex. 9 tangente à 5,0 s', g * 5.0, 49, 0.5, '(5{,}0\\ \\text{s} ; 49\\ \\text{m·s}^{-1})$'),
    ('Ex. 9 pente', 49 / 5.0, 9.8, 0.05, '= 9{,}8\\ \\text{m·s}^{-2}$$'),
    ('Ex. 9 tau', tau9, 5.4, 0.05, '= 5{,}4\\ \\text{s}$'),
    ('Ex. 9 vitesse à tau', v9tau, 40, 0.5, 'vaut environ $40\\ \\text{m·s}^{-1}$'),
    ('Ex. 9 vitesse à tau (%)', tanh(1) * 100, 76, 0.5, 'soit 76 % de'),
    ('Ex. 9 vitesse limite parachute ouvert', v9o, 5.29, 0.005, '= 5{,}29\\ \\text{m·s}^{-1}$$'),
    ('Ex. 9 hauteur équivalente', h9, 1.43, 0.005, '= 1{,}43\\ \\text{m}$'),
    ('Ex. 6 vitesse en B', vB6, 11.9, 0.05, '= 11{,}9\\ \\text{m·s}^{-1}$$'),
    ('Ex. 6 différence de pression', dP6, 7.04e4, 0.005e4, '= 7{,}04 \\times 10^{4}\\ \\text{Pa}$$'),
    ('Ex. 6 pression en B', 1.50e5 - dP6, 7.96e4, 0.005e4, '= 7{,}96 \\times 10^{4}\\ \\text{Pa}$$'),
    ('Ex. 7 durée de remplissage', dt7, 21.0, 0.05, '\\approx 21{,}0\\ \\text{s}$$'),
    ('Ex. 3 débit', D3, 2.5e-4, 0.05e-4, '= 2{,}5 \\times 10^{-4}\\ \\text{m}^{3}\\text{·s}^{-1}$$'),
    ('Ex. 3 débit en L/min', D3 * 6e4, 15, 0.5, 'Soit $15\\ \\text{L·min}^{-1}$'),
    ('Ex. 2 vitesse limite (miel de référence)', vl2, 1.25e-2, 0.005e-2, 'v_{\\text{lim}} = 1{,}25 \\times 10^{-2}'),
    ('Ex. 2 distance en 5 tau (mm)', vl2 * 5 * tau2 * 1e3, 0.1, 0.01, 'moins de $0{,}1\\ \\text{mm}$'),
    ('Q.4 masse du ballon', 1.0e3 * 2 / 3 * pi * 0.25 ** 3, 33, 0.5, '= 33\\ \\text{kg}'),
    ('Q.2 pression sur la face du haut', P_haut2, 1.033e5, 0.0005e5, '= 1{,}033 \\times 10^{5}\\ \\text{Pa}$$'),
    ('Q.2 pression sur la face du bas', P_bas2, 1.042e5, 0.0005e5, '= 1{,}042 \\times 10^{5}\\ \\text{Pa}$$'),
    ('Q.2 différence de pression', dP2, 981, 0.5, '\\times 0{,}100 = 981\\ \\text{Pa}$$'),
    ('Q.2 différence (par les pressions non arrondies)', P_bas2 - P_haut2, 981, 0.5, '= 981\\ \\text{Pa}$$'),
    ('Q.2 force sur la face du haut', F_haut2, 1.03e3, 0.005e3, 'environ $1{,}03 \\times 10^{3}\\ \\text{N}$ sur la face du haut'),
    ('Q.2 force sur la face du bas', F_bas2, 1.04e3, 0.005e3, '$1{,}04 \\times 10^{3}\\ \\text{N}$ sur la face du bas'),
    ('Q.2 différence des forces', dF2, 9.81, 0.005, '981 \\times 1{,}00 \\times 10^{-2} = 9{,}81\\ \\text{N}$$'),
    ('Q.2 différence (par les forces non arrondies)', F_bas2 - F_haut2, 9.81, 0.005, '= 9{,}81\\ \\text{N}$$'),
    ('Q.2 volume du cube', a2 ** 3, 1.00e-3, 0.005e-3, 'V = a^{3} = 1{,}00 \\times 10^{-3}\\ \\text{m}^{3}$'),
    ('Q.2 poussée d\'Archimède', Pi2, 9.81, 0.005, '\\times 10^{-3} \\times 9{,}81 = 9{,}81\\ \\text{N}$$'),
    ('Ex. 1 masse volumique du sirop A', rhoA1, 1.25, 0.005, '= 1{,}25\\ \\text{g·cm}^{-3}$$'),
    ('Ex. 1 hauteur immergée dans le sirop B', hB1, 4.70, 0.005, '= 4{,}70\\ \\text{cm}$$'),
    ('Ex. 1 masse volumique minimale', rhomin1, 1.18, 0.005, '= 1{,}18\\ \\text{g·cm}^{-3}$$'),
    ('Ex. 1 volume immergé maximal', Vmax1, 21.2, 0.05, 'que $21{,}2\\ \\text{cm}^{3}$ d\'eau, soit $21{,}2\\ \\text{g}$'),
    ('Ex. 1 déplacement de la tige (formule de la question 7)', dh1, 5.30, 0.005, '\\right) = 5{,}30\\ \\text{cm}$$'),
    ('Ex. 1 déplacement de la tige (valeurs des questions 4 et 5)', 10.0 - round(hB1, 2), 5.30, 0.005, 'h_A - h_B = 10{,}0 - 4{,}70 = 5{,}30\\ \\text{cm}$'),
]
ecarts = [(n, cc, i) for n, cc, i, t, _ in controles if abs(cc - i) > t]
absents = [(n, w) for n, _, _, _, w in controles if w not in src]
print('--- comparaison avec la fiche : %d valeurs contrôlées, %d écart(s), %d écriture(s) introuvable(s)' % (len(controles), len(ecarts), len(absents)))
for n, cc, i in ecarts: print('   ÉCART', n, ': recalculé %.5g, imprimé %.5g' % (cc, i))
for n, w in absents: print('   INTROUVABLE', n, ':', w)

# niveaux des questions : ligne d'information et tableau « Votre parcours »
niveaux = {int(q): int(n) for q, n in re.findall(r'^## \[Q\.(\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)', src, flags=re.M)}
attendu = {10: [1, 2, 3, 5, 6, 10, 11, 12, 14, 16], 14: [4, 7, 8, 9, 13, 15]}
faux_niv = [(q, n) for n, qs in attendu.items() for q in qs if niveaux.get(q) != n]
manque = sorted(set(niveaux) - {q for qs in attendu.values() for q in qs})
print('--- niveaux : %d questions, %d écart(s) avec le parcours' % (len(niveaux), len(faux_niv) + len(manque)))
for q, n in faux_niv: print('   NIVEAU Q.%d : %s dans la fiche, %d dans le parcours' % (q, niveaux.get(q), n))
for q in manque: print('   Q.%d absente du parcours' % q)
parcours = ['| Q.1 à Q.3, Q.5, Q.6, Q.10 à Q.12, Q.14 et Q.16 |', '| Les précédentes, plus Q.4, Q.7 à Q.9, Q.13 et Q.15 |',
            'exercice 8 (questions 1 à 3)', 'Questions 1 à 4 : objectif 10', 'Parties A et B : objectif 10', 'exercice 9 (questions 1 à 5)', 'la fin des 2 et 9',
            'Entraînement · 4 points · 35 min · Questions 4 et 5 : objectif 14', 'Entraînement · 5 points · 45 min · Question 6 : objectif 18']
perdus = [p for p in parcours if p not in src]
for p in perdus: print('   PARCOURS INTROUVABLE :', p)

# tableau « Ce qui est tombé » et phrases qui le résument
bloc = src[src.index('# Ce qui est tombé'):src.index('Ce qu\'il faut en retenir')]
lignes = [l for l in bloc.splitlines() if l.startswith('| ') and not l.startswith('| Session')]
notions = [l.split('|')[3].lower() for l in lignes]
comptes = [('exercices', len(lignes), 13), ('sciences de l\'ingénieur', len([l for l in lignes if 'ingénieur' in l.lower()]), 0),
           ('débit', len([n for n in notions if 'débit' in n]), 8),
           ('Bernoulli', len([n for n in notions if 'bernoulli' in n]), 7),
           ('poussée d\'Archimède', len([n for n in notions if 'archimède' in n]), 4),
           ('statique', len([n for n in notions if 'statique' in n]), 3),
           ('chute ou frottement', len([n for n in notions if 'chute' in n or 'frottement' in n]), 3),
           ('chute dans un fluide en 2025', len([l for l, n in zip(lignes, notions) if '2025' in l.split('|')[1] and ('fluide visqueux' in n or 'frottement' in n)]), 3),
           ('sessions 2026', len([l for l in lignes if '2026' in l.split('|')[1]]), 2)]
mauvais = [cc for cc in comptes if cc[1] != cc[2]]
print('--- tableau : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s)' % len(mauvais))
phrases = ['au moins treize exercices des sessions 2025 et 2026', 'huit de ces treize exercices et la relation de Bernoulli dans sept',
           'demandée dans au moins quatre exercices', 'La statique des fluides, vue en première, est revenue trois fois',
           'La chute dans un fluide est revenue trois fois en 2025', 'Demandée en 2025 (Métropole, juin, jour 1)',
           'Demandé en 2025 (Amérique du Nord, sujet de secours)']
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
