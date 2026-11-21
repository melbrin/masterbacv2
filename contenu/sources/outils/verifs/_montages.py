# Recalcul indépendant des résultats numériques de la fiche annexe « Montages de chimie »,
# puis contrôle de la structure : niveaux et parcours, tableau « Ce qui est tombé » et mentions « Demandé ... »,
# figures, renvois de l'index.
# usage : python3 -I outils/verifs/_montages.py
import os, re
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOSSIER = os.path.join(RACINE, 'fiches', '_montages')
src = open(os.path.join(DOSSIER, 'fiche.md'), encoding='utf-8').read()
figsrc = open(os.path.join(RACINE, 'outils', 'figures', '_montages.py'), encoding='utf-8').read()

# masses molaires recalculées à partir des masses atomiques
MA = {'H': 1.008, 'C': 12.011, 'N': 14.007, 'O': 15.999, 'S': 32.06, 'K': 39.098, 'Mn': 54.938, 'Cu': 63.546, 'Ca': 40.078}
def M(formule):
    tot = 0.0
    for el, n in re.findall(r'([A-Z][a-z]?)(\d*)', formule):
        tot += MA[el] * int(n or 1)
    return tot
R, F = 8.314, 9.65e4

# Q.2 et Q.3 : dissolution, gamme d'étalons
M_cuso4_5h2o = M('CuSO4') + 5 * M('H2O')
m_q2 = 5.00e-2 * 0.1000 * 249.7
C0 = 50.0                                         # mmol/L
etalons = [(c, C0 / c, 50.0 * c / C0) for c in (5.00, 10.0, 20.0, 25.0)]
# Q.5 : conversion
sig_q5 = 1413e-6 / 1e-2                           # S/m
# Q.9 : déboucheur
VE_direct = 6 * 10.0 / 0.100
Cd_q9 = 0.100 * 12 / 10.0
F_q9 = 6 / Cd_q9
VE_q9 = 6 / (100.0 / 2.00) * 10.0 / 0.100         # dilution de 2,00 mL dans 100,0 mL, prise d'essai de 10,0 mL
# Q.11 : Dean-Stark
n_eau = 1.00 * 3.4 / 18.0
eta_q11 = n_eau / 0.200
# équilibre d'estérification équimolaire avec K = 4 : x/(1-x) au carré = 4
x_K4 = 2 / 3
# Q.15 : rapports frontaux
Rf_P, Rf_R = 3.6 / 6.0, 1.5 / 6.0
# Q.18 : cuivrage
Q_q18 = 0.50 * 20.0 * 60
ne_q18 = Q_q18 / F
nCu_q18 = ne_q18 / 2
m_q18 = nCu_q18 * 63.5
# Exercice 1 : sirop de menthe
C_etal = [2.0, 4.0, 6.0, 8.0, 10.0]; A_etal = [0.21, 0.41, 0.63, 0.85, 1.05]
V0_ex1 = [c * 50.0 / 100.0 for c in C_etal]       # mL, solution mère à 100 µmol/L
k_reg = sum(a * c for a, c in zip(A_etal, C_etal)) / sum(c * c for c in C_etal)
k_ex1 = 1.05 / 10.0
Cd_ex1 = 0.54 / k_ex1
C_ex1 = 5 * Cd_ex1
Cm_ex1 = 2.6e-5 * 1159
M_e131 = M('C54H62CaN4O14S4')                       # bleu patenté V, sel de calcium
Cm_ex1_mgL = C_ex1 * 1e-6 * 1159 * 1e3              # mg/L, sans arrondi intermédiaire
m_verre = Cm_ex1_mgL * (250 / 8) * 1e-3             # mg, avec la valeur non arrondie
m_verre_arrondi = 30 * (250 / 8) * 1e-3             # avec 30 mg/L arrondi : 0,94 mg, valeur à ne pas imprimer
# Exercice 2 : vinaigre
Cd_ex2 = 0.100 * 16.8 / 20.0
C_ex2 = 10 * Cd_ex2
Cm_ex2 = C_ex2 * 60.1
ecart_bulle = (17.0 - 16.8) / 16.8
# Exercice 3 : acide benzoïque
n1 = 1.04 * 2.0 / 108.1
n_mno4 = 4.7 / 158.0
mmax_ex3 = n1 * 122.1
eta_ex3 = 1.65 * 108.1 / (1.04 * 2.0 * 122.1)
# équation : 3 C7H8O + 4 MnO4- -> 3 C7H5O2- + 4 MnO2 + HO- + 4 H2O, bilan des atomes et des charges
def bilan(cote):
    tot = {}
    for coef, formule, charge in cote:
        for el, n in re.findall(r'([A-Z][a-z]?)(\d*)', formule):
            tot[el] = tot.get(el, 0) + coef * int(n or 1)
        tot['charge'] = tot.get('charge', 0) + coef * charge
    return tot
equilibree = bilan([(3, 'C7H8O', 0), (4, 'MnO4', -1)]) == bilan([(3, 'C7H5O2', -1), (4, 'MnO2', 0), (1, 'OH', -1), (4, 'H2O', 0)])
# Exercice 4 : eau oxygénée
n0_ex4 = 0.40 * 10.0e-3
nmax_ex4 = n0_ex4 / 2
dP_ex4 = nmax_ex4 * R * 293 / 2.40e-4             # Pa
P_demi = 1013 + dP_ex4 / 100 / 2                   # hPa
P8 = 1013 + dP_ex4 / 100 * (1 - 2 ** (-8 / 4.0))   # modèle de la figure, t1/2 = 4,0 min
nO2_8 = 1.52e4 * 2.40e-4 / (R * 293)
cH2O2_8 = (4.0e-3 - 3.0e-3) / 11.0e-3

controles = [
    ('Q.2 masse molaire du sulfate de cuivre pentahydraté', M_cuso4_5h2o, 249.7, 0.05, '$M = 249{,}7\\ \\text{g·mol}^{-1}$'),
    ('Q.2 masse molaire du sulfate de cuivre anhydre', M('CuSO4'), 159.6, 0.05, '$159{,}6\\ \\text{g·mol}^{-1}$'),
    ('Q.2 masse à peser', m_q2, 1.25, 0.005, '\\times 249{,}7 = 1{,}25\\ \\text{g}$$'),
    ('Q.3 étalon 1 (F)', etalons[0][1], 10.0, 1e-9, '| 1 | 5,00 | 10,0 | 5,00 |'),
    ('Q.3 étalon 2 (F)', etalons[1][1], 5.00, 1e-9, '| 2 | 10,0 | 5,00 | 10,0 |'),
    ('Q.3 étalon 3 (F)', etalons[2][1], 2.50, 1e-9, '| 3 | 20,0 | 2,50 | 20,0 |'),
    ('Q.3 étalon 4 (F)', etalons[3][1], 2.00, 1e-9, '| 4 | 25,0 | 2,00 | 25,0 |'),
    ('Q.3 étalon 3 (volume)', etalons[2][2], 20.0, 1e-9, '| 3 | 20,0 | 2,50 | 20,0 |'),
    ('Q.5 conductivité en S/m', sig_q5, 0.1413, 1e-9, '= 0{,}1413\\ \\text{S·m}^{-1}$$'),
    ('Q.5 1 mS/cm en S/m', 1e-3 / 1e-2, 0.1, 1e-12, '$1\\ \\text{mS·cm}^{-1} = 0{,}1\\ \\text{S·m}^{-1}$'),
    ('Q.9 titrage direct (mL)', VE_direct, 600, 1e-9, '= 6 \\times 10^{2}\\ \\text{mL}$$'),
    ('Q.9 nombre de burettes', VE_direct / 25, 24, 1e-9, 'soit vingt-quatre burettes'),
    ('Q.9 concentration à titrer', Cd_q9, 0.12, 1e-9, '= 0{,}12\\ \\text{mol·L}^{-1} \\qquad F'),
    ('Q.9 facteur de dilution', F_q9, 50, 1e-9, '= \\dfrac{6}{0{,}12} = 50$$'),
    ('Q.9 volume équivalent obtenu', VE_q9, 12, 1e-9, 'On prélève $2{,}00\\ \\text{mL}$ de déboucheur'),
    ('Q.11 quantité d\'eau', n_eau, 0.19, 0.005, '= 0{,}19\\ \\text{mol} \\qquad'),
    ('Q.11 quantité d\'eau, trois chiffres', n_eau, 0.189, 0.0005, '\\dfrac{0{,}189}{0{,}200}'),
    ('Q.11 rendement', eta_q11, 0.94, 0.005, '= 0{,}94$$'),
    ('Q.11 rendement en %', 100 * eta_q11, 94, 0.5, 'Le rendement atteint $94\\ \\%$'),
    ('Q.11 rendement sans élimination (K = 4)', x_K4, 2 / 3, 1e-9, 'contre environ deux tiers'),
    ('Q.11 eau maximale (mL)', 0.200 * 18.0 / 1.00, 3.6, 1e-9, '= 3{,}6\\ \\text{mL}$.'),
    ('Q.15 rapport frontal de P', Rf_P, 0.60, 1e-9, '= 0{,}60 \\qquad'),
    ('Q.15 rapport frontal de R', Rf_R, 0.25, 1e-9, '= 0{,}25$$'),
    ('Q.18 charge', Q_q18, 600, 1e-9, '= 6{,}0 \\times 10^{2}\\ \\text{C}'),
    ('Q.18 électrons', ne_q18, 6.2e-3, 0.05e-3, '= 6{,}2 \\times 10^{-3}\\ \\text{mol}$$'),
    ('Q.18 cuivre (mol)', nCu_q18, 3.1e-3, 0.05e-3, '= 3{,}1 \\times 10^{-3}\\ \\text{mol} \\qquad m'),
    ('Q.18 masse de cuivre', m_q18, 0.20, 0.005, '\\times 63{,}5 = 0{,}20\\ \\text{g}$$'),
    ('Q.18 masse avec la valeur arrondie', 3.1e-3 * 63.5, 0.20, 0.005, '= 3{,}1 \\times 10^{-3} \\times 63{,}5 = 0{,}20'),
    ('Ex. 1 volumes de solution mère (premier)', V0_ex1[0], 1.0, 1e-9, 'Les volumes valent $1{,}0$ ; $2{,}0$ ; $3{,}0$ ; $4{,}0$ et $5{,}0\\ \\text{mL}$'),
    ('Ex. 1 volumes de solution mère (dernier)', V0_ex1[-1], 5.0, 1e-9, 'Les volumes valent $1{,}0$'),
    ('Ex. 1 masse molaire de E131', M_e131, 1159, 0.5, '$M = 1\\,159\\ \\text{g·mol}^{-1}$'),
    ('Ex. 1 coefficient par régression', k_reg, 0.105, 0.0005, '= 0{,}105\\ \\text{L·µmol}^{-1}$$'),
    ('Ex. 1 coefficient par le point (10,0 ; 1,05)', k_ex1, 0.105, 1e-12, '\\dfrac{1{,}05}{10{,}0} = 0{,}105'),
    ('Ex. 1 absorbance du sirop pur', 5 * 0.54, 2.7, 1e-9, '$5 \\times 0{,}54 = 2{,}7$'),
    ('Ex. 1 sirop dilué', Cd_ex1, 5.1, 0.05, '= 5{,}1\\ \\text{µmol·L}^{-1}$$'),
    ('Ex. 1 sirop', C_ex1, 26, 0.5, '= 26\\ \\text{µmol·L}^{-1}'),
    ('Ex. 1 concentration en masse', Cm_ex1, 3.0e-2, 0.05e-2, '= 3{,}0 \\times 10^{-2}\\ \\text{g·L}^{-1}$$'),
    ('Ex. 1 concentration en masse (mg/L)', C_ex1 * 1e-6 * 1159 * 1e3, 30, 0.5, 'environ $30\\ \\text{mg}$ de bleu patenté V'),
    ('Ex. 1 volume de sirop dans un verre', 250 / 8, 31.25, 1e-9, '= 31{,}25\\ \\text{mL}$'),
    ('Ex. 1 sirop sans arrondi (µmol/L)', C_ex1, 25.7, 0.05, 'Sans arrondir en cours de calcul, $C = 25{,}7\\ \\text{µmol·L}^{-1}$'),
    ('Ex. 1 concentration en masse sans arrondi (mg/L)', Cm_ex1_mgL, 29.8, 0.05, '$C_\\text{m} = 29{,}8\\ \\text{mg·L}^{-1}$ :'),
    ('Ex. 1 masse de colorant dans un verre', m_verre, 0.93, 0.005, '= 29{,}8 \\times 31{,}25 \\times 10^{-3} = 0{,}93\\ \\text{mg}$$'),
    ('Ex. 1 masse avec la valeur imprimée 29,8 mg/L', 29.8 * 31.25e-3, 0.93, 0.005, '= 0{,}93\\ \\text{mg}$$'),
    ('Ex. 1 facteur de dilution', 50.0 / 10.0, 5, 1e-9, '\\dfrac{50{,}0}{10{,}0} = 5$'),
    ('Ex. 2 solution diluée', Cd_ex2, 8.40e-2, 1e-9, '= 8{,}40 \\times 10^{-2}\\ \\text{mol·L}^{-1}'),
    ('Ex. 2 vinaigre', C_ex2, 0.840, 1e-9, '= 0{,}840\\ \\text{mol·L}^{-1}$$'),
    ('Ex. 2 concentration en masse', Cm_ex2, 50.5, 0.05, '= 50{,}5\\ \\text{g·L}^{-1}$$'),
    ('Ex. 2 volume lu avec la bulle', 16.8 + 0.20, 17.0, 1e-9, '$16{,}8 + 0{,}20 = 17{,}0\\ \\text{mL}$'),
    ('Ex. 2 écart relatif', ecart_bulle, 1.2e-2, 0.05e-2, '= 1{,}2 \\times 10^{-2}$$'),
    ('Ex. 2 lecture de la burette', 16 + (6.0 - (6.0 - 0.8 * (6.0 - 1.0))) / 5, 16.80, 1e-9, 'en b : on lit $16{,}80\\ \\text{mL}$'),
    ('Ex. 3 alcool benzylique', n1, 1.92e-2, 0.005e-2, '= 1{,}92 \\times 10^{-2}\\ \\text{mol} \\qquad n'),
    ('Ex. 3 ions permanganate', n_mno4, 2.97e-2, 0.005e-2, '= 2{,}97 \\times 10^{-2}\\ \\text{mol}$$'),
    ('Ex. 3 n1 / 3', n1 / 3, 6.41e-3, 0.005e-3, '= 6{,}41 \\times 10^{-3}\\ \\text{mol}$ est'),
    ('Ex. 3 n(MnO4-) / 4', n_mno4 / 4, 7.44e-3, 0.005e-3, '= 7{,}44 \\times 10^{-3}\\ \\text{mol}$.'),
    ('Ex. 3 réactif limitant', n1 / 3 < n_mno4 / 4, True, 0, "L'alcool benzylique est le réactif limitant"),
    ('Ex. 3 masse maximale', mmax_ex3, 2.35, 0.005, '= 2{,}35\\ \\text{g}$$'),
    ('Ex. 3 rendement', eta_ex3, 0.70, 0.005, '= 0{,}70$$'),
    ('Ex. 3 équation équilibrée', equilibree, True, 0, '3\\,\\text{C}_6\\text{H}_5\\text{CH}_2\\text{OH}(\\text{aq}) + 4\\,\\text{MnO}_4^-(\\text{aq})'),
    ('Ex. 3 masse molaire de l\'alcool benzylique', M('C7H8O'), 108.1, 0.05, '$M_1 = 108{,}1\\ \\text{g·mol}^{-1}$'),
    ('Ex. 3 masse molaire de l\'acide benzoïque', M('C7H6O2'), 122.1, 0.05, '$M_2 = 122{,}1\\ \\text{g·mol}^{-1}$'),
    ('Ex. 3 masse molaire du permanganate de potassium', M('KMnO4'), 158.0, 0.05, '$M = 158{,}0\\ \\text{g·mol}^{-1}$'),
    ('Ex. 2 masse molaire de l\'acide éthanoïque', M('C2H4O2'), 60.1, 0.05, '$M = 60{,}1\\ \\text{g·mol}^{-1}$'),
    ('Ex. 4 peroxyde d\'hydrogène initial', n0_ex4, 4.0e-3, 1e-12, '= 4{,}0 \\times 10^{-3}\\ \\text{mol} \\qquad'),
    ('Ex. 4 dioxygène maximal', nmax_ex4, 2.0e-3, 1e-12, '= 2{,}0 \\times 10^{-3}\\ \\text{mol}$$'),
    ('Ex. 4 surpression finale (Pa)', dP_ex4, 2.03e4, 0.005e4, '= 2{,}03 \\times 10^{4}\\ \\text{Pa} = 203\\ \\text{hPa}$$'),
    ('Ex. 4 pression finale', 1013 + dP_ex4 / 100, 1216, 0.5, '$P_\\text{f} = 1\\,013 + 203 = 1\\,216\\ \\text{hPa}$'),
    ('Ex. 4 pression à mi-parcours', P_demi, 1114.5, 0.06, '1\\,013 + 101{,}5 \\approx 1\\,115\\ \\text{hPa}$'),
    ('Ex. 4 pression à 8 min (figure)', P8, 1165, 0.5, 'on lit $P = 1\\,165\\ \\text{hPa}$'),
    ('Ex. 4 dioxygène à 8 min', nO2_8, 1.50e-3, 0.005e-3, '= 1{,}50 \\times 10^{-3}\\ \\text{mol}$$'),
    ('Ex. 4 peroxyde d\'hydrogène à 8 min', cH2O2_8, 9.1e-2, 0.05e-2, '= 9{,}1 \\times 10^{-2}\\ \\text{mol·L}^{-1}$$'),
    ('Ex. 4 reste au bout de deux t1/2', (4.0e-3 - 2 * nO2_8) / 4.0e-3, 0.25, 0.005, 'soit deux fois $t_{1/2}$, il reste le quart'),
    ('Ex. 4 8,0 min = deux temps de demi-réaction', 8.0 / 4.0, 2, 1e-12, 'Ici, à $8{,}0\\ \\text{min}$, soit deux fois $t_{1/2}$'),
    ('Ex. 4 ordre 1 : 1/4 au bout de 2 t1/2', 2 ** (-8.0 / 4.0), 0.25, 1e-12, 'comme le prévoit une loi de vitesse d\'ordre 1'),
    ('Ex. 4 concentration initiale dans 11,0 mL, divisée par quatre', 4.0e-3 / 11.0e-3 / 4, 9.1e-2, 0.05e-2, '= 9{,}1 \\times 10^{-2}\\ \\text{mol·L}^{-1}$$'),
    # écritures attendues (relecture du 18 novembre) : symboles définis, critère du tableau, classement de l'étape 2, index
    ('L\'essentiel : z défini', True, True, 0, "où $z$ est le nombre d'électrons échangés par ion métallique"),
    ('L\'essentiel : a, b, A et B définis', True, True, 0, 'Pour $a\\,\\text{A} + b\\,\\text{B} \\rightarrow \\ldots$, avec A titré et B titrant'),
    ('Ce qui est tombé : critère de sélection écrit', True, True, 0, "qui interrogent un montage, un appareil de mesure, la conduite d'un suivi ou un geste de laboratoire"),
    ('Index : renvoi aux schémas des montages', True, True, 0, 'puis aux figures qui en donnent le schéma'),
    # relecture du 19 novembre
    # Ex. 3, question 1 : une étape se classe par son rôle ; l'étape 4 comporte une réaction mais reste un isolement
    ('Ex. 3 : critère du classement (rôle de l\'étape)', True, True, 0, "Une étape se classe d'après son rôle, et non d'après la présence d'une réaction."),
    ('Ex. 3 : étape 2 rattachable à la transformation', True, True, 0, "L'étape 2 détruit l'oxydant en excès et met ainsi fin à la transformation : on peut aussi l'y rattacher."),
    ('Ex. 3 : étape 4, réaction acide-base mais isolement', True, True, 0, "L'étape 4 comporte une réaction acide-base, mais elle sert à faire précipiter le produit, formé dès l'étape 1 sous forme d'ions benzoate : c'est un isolement."),
    # L'essentiel : la lettre F ne désigne que la constante de Faraday ; h et H définis
    ('L\'essentiel : facteur de dilution sans la lettre F', True, True, 0, '| Facteur de dilution $V_\\text{fille} / V_\\text{mère}$ ;'),
    ('L\'essentiel : h et H définis', True, True, 0, "$h$ et $H$ : distances parcourues par la tache et par le front de l'éluant depuis la ligne de dépôt"),
    # Ex. 2, question 5 : « plus petites » pouvait se lire « plus courtes »
    ('Ex. 2 : valeurs des graduations', True, True, 0, 'là où les valeurs des graduations sont plus faibles'),
    # index : les trois montages fautifs (figure 6) et la parallaxe (figure 3)
    ('Index : erreurs de manipulation', True, True, 0, '| Erreurs de manipulation | Q.16, Ex. 2 ; schémas : figures 3 et 6 |'),
    ('Index : sécurité au laboratoire', True, True, 0, '| Sécurité au laboratoire | Q.9, Q.10, Q.16 ; schéma : figure 6 |'),
    # figure 5 insérée à la largeur conseillée par le script des figures (graduations de la règle lisibles)
    ('Figure 5 à 7,0 cm', True, True, 0, '(figs/fig_ccm.png){width=7.0cm}'),
    # Q.4 ouvre une page : sa figure 1 reste avec elle (dans les deux versions)
    ('Q.4 précédée d\'un saut de page', True, True, 0, '<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n```\n\n## [Q.4]'),
]
# écritures qui ne doivent plus apparaître
interdits = [('Ex. 1 masse calculée avec 30 mg/L arrondi', '= 30 \\times 31{,}25'),
             ('Ex. 1 masse 0,94 mg', '0{,}94\\ \\text{mg}'),
             ('Ex. 2 burette « en fin de titrage » (le suivi pH-métrique continue au-delà de l\'équivalence)', 'en fin de titrage'),
             ('Ex. 4 règle des deux t1/2 énoncée comme générale', 'Après deux temps de demi-réaction'),
             ('Fig. 14 unité mol/L', 'mol/L)\')'),
             # relecture du 19 novembre
             ('Ex. 3 critère « une réaction s\'y produit » (il vaudrait aussi pour l\'étape 4)', 'comme une réaction s\'y produit'),
             ('L\'essentiel : lettre F pour le facteur de dilution (F est la constante de Faraday)', 'Facteur $F'),
             ('Ex. 2 « graduations plus petites » (à lire : valeurs plus faibles)', 'les graduations sont plus petites'),
             ('Fig. 16 trait de rappel de « sortie d\'eau » à travers la tige de la potence', "repere(ax, *m['e_out'], -3.7"),
             ('Ce qui est tombé : exercice sans question sur un montage (Amérique du Sud 2025, jour 1, exercice 2)', 'Recharge des voitures électriques'),
             ('Ce qui est tombé : exercice sans question sur un montage (Asie 2026, jour 2, exercice 3)', '| Phytoremédiation |')]
presents_interdits = [(n, t) for n, t in interdits if t in src or t in figsrc]
print('--- écritures retirées : %d encore présente(s)' % len(presents_interdits))
for n, t in presents_interdits: print('   ENCORE PRÉSENT', n, ':', t)
print('    (pour mémoire : avec 30 mg/L arrondi, on trouverait %.3f mg au lieu de %.3f mg)' % (m_verre_arrondi, m_verre))
textes = [('Q.15 plaque : dépôts R, P, S', "plaque_ccm(ax, [[1.5], [3.6], [3.6, 1.5]], 6.0, 'RPS')" in figsrc),
          ('Ex. 1 maximum de E131 à 638 nm', 'LAM_E102, LAM_E131 = 427, 638' in figsrc),
          ('Ex. 1 étalons de la figure', 'A_ETAL = np.array([0.21, 0.41, 0.63, 0.85, 1.05])' in figsrc),
          ('Ex. 4 modèle de la figure', 'P0_H2O2, DP_H2O2, T12_H2O2 = 1013.0, 2.0e-3 * 8.314 * 293 / 2.40e-4 / 100, 4.0' in figsrc),
          ('Ex. 2 ménisque à 16,80 mL', 'ym = y16 - 0.8 * (y16 - y17)' in figsrc),
          # graduations sur la paroi tournée vers les yeux : vu d'en haut, la ligne de visée croise la paroi graduée
          # au-dessus du ménisque (16,70 mL ici), d'où « trop faible » dans le corrigé
          ('Ex. 2 graduations sur la paroi tournée vers les yeux', 'ax.plot([x1 - L, x1], [y, y]' in figsrc and 'ax.plot([x0, x0 + L]' not in figsrc),
          ('Q.11 corrigé : flèche qui monte « vapeurs », chute des gouttes vers le tube', "'vapeurs\\ncondensées'" not in figsrc
           and "fleche(ax, xd, ya + 0.6, xd, ya - 0.2, color=CUIVRE" in figsrc and "'gouttes\\ncondensées'" in figsrc),
          ('Q.11 « sortie d\'eau » au bout de la flèche, hors de la tige de la potence',
           "texte(ax, m['e_out'][0] - 0.15, m['e_out'][1], 'sortie d\\'eau', ha='right')" in figsrc),
          ('Q.10 corrigé (figure 16) : « sortie d\'eau » au-dessus de la flèche, entre la tige et le réfrigérant',
           "texte(ax, m['e_out'][0] + 0.525, m['e_out'][1] + 0.3, 'sortie\\nd\\'eau', va='bottom')" in figsrc),
          ('Fig. 14 unité mol·L-1', 'c = 0,100 mol·L$^{-1}$' in figsrc),
          # nom des bornes COM dans le boîtier du multimètre (il touchait le bord du voltmètre et débordait de l'ampèremètre)
          ('Fig. 22 et 23 bornes COM dans le boîtier', "[(1.5, 'COM', 'g'), (2.45, 'V', 'd')]" in figsrc
           and "[(0.8, 'A', 'g'), (2.5, 'COM', 'g')]" in figsrc)]
# Ex. 2, question 5 : la ligne de visée de l'œil a croise la paroi graduée (x1 = 2,2) à la hauteur de la graduation 16,70 mL
x0b, x1b, y16b, y17b, xoeil = 0.0, 2.2, 6.0, 1.0, 7.0 - 0.6
ymb = y16b - 0.8 * (y16b - y17b)
y_croise = ymb + (x1b - (x0b + x1b) / 2) / (xoeil - (x0b + x1b) / 2) * 2.4
lu_a = 16 + (y16b - y_croise) / (y16b - y17b)
controles.append(('Ex. 2 lecture vue d\'en haut (a) : trop faible', lu_a < 16.80, True, 0, 'on lirait une valeur trop faible'))
ecarts = [(n, cc, i) for n, cc, i, t, _ in controles if abs(float(cc) - float(i)) > t]
absents = [(n, wr) for n, _, _, _, wr in controles if wr not in src]
faux = [n for n, ok in textes if not ok]
print('--- comparaison avec la fiche : %d valeurs contrôlées, %d écart(s), %d écriture(s) introuvable(s), %d figure(s) à revoir'
      % (len(controles), len(ecarts), len(absents), len(faux)))
for n, cc, i in ecarts: print('   ÉCART', n, ': recalculé %.5g, imprimé %.5g' % (cc, i))
for n, wr in absents: print('   INTROUVABLE', n, ':', wr)
for n in faux: print('   FIGURE', n)

# niveaux et parcours
niveaux = {int(q): int(n) for q, n in re.findall(r'^## \[Q\.(\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)', src, flags=re.M)}
attendu = {10: [1, 2, 3, 4, 5, 6, 7, 8, 10, 13, 14, 15, 17, 18], 14: [9, 11, 12, 16, 19], 18: []}
faux_niv = [(q, n) for n, qs in attendu.items() for q in qs if niveaux.get(q) != n]
manque = sorted(set(niveaux) - {q for qs in attendu.values() for q in qs})
ex_niv = {int(e): int(n) for e, n in re.findall(r'^## \[Exercice (\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)', src, flags=re.M)}
ex_q = {e: len(re.findall(r'^\*\*\d+\.\*\*', src[src.index('## [Exercice %d]' % e):src.index('[CIBLE:c_ex%d]' % e)], flags=re.M)) for e in range(1, 5)}
ex_att = {1: (10, 6, 'Questions 5 et 6 : objectif 14'), 2: (14, 6, 'Entraînement · 4 points · 35 min\n'),
          3: (14, 6, 'Question 6 : objectif 18'), 4: (14, 6, 'Question 6 : objectif 18')}
ex_ko = [e for e, (n, nq, m) in ex_att.items() if ex_niv.get(e) != n or ex_q[e] != nq or m not in src[src.index('## [Exercice %d]' % e):][:400]]
print('--- niveaux : %d questions et %d exercices, %d écart(s)' % (len(niveaux), len(ex_niv), len(faux_niv) + len(manque) + len(ex_ko)))
for q, n in faux_niv: print('   NIVEAU Q.%d : %s dans la fiche, %d dans le parcours' % (q, niveaux.get(q), n))
for q in manque: print('   Q.%d absente du parcours' % q)
for e in ex_ko: print('   EXERCICE %d : niveau, nombre de questions ou mention' % e)
parcours = ['| Q.1 à Q.8, Q.10, Q.13 à Q.15, Q.17, Q.18 | Ex. 1 (questions 1 à 4) |',
            '| Plus Q.9, Q.11, Q.12, Q.16, Q.19 | Ex. 1 et Ex. 2 en entier ; Ex. 3 et Ex. 4 (questions 1 à 5) |']
for p in parcours:
    if p not in src: print('   PARCOURS INTROUVABLE :', p); ex_ko.append('parcours')

# tableau « Ce qui est tombé »
bloc = src[src.index('# Ce qui est tombé'):src.index('Ce qu\'il faut en retenir')]
lignes = [[c.strip() for c in l.strip().strip('|').split('|')] for l in bloc.splitlines() if l.startswith('| ') and not l.startswith('| Session')]
def renvois(cell):
    qs = set()
    for a, b in re.findall(r'Q\.(\d+)(?: à Q\.(\d+))?', cell): qs |= set(range(int(a), int(b or a) + 1))
    return qs, {int(e) for e in re.findall(r'Ex\. (\d+)', cell)}
table = [(l[0], l[1], l[2]) + renvois(l[3]) for l in lignes]
FORMAT = r'(Métropole, (juin|septembre) 202[56], jour [12]|Métropole 202[56], jour [12] \(sujet de secours\)|' \
         r'(Amérique du Nord|Amérique du Sud|Antilles-Guyane|Asie|Centres étrangers|Polynésie|Nouvelle-Calédonie) 202[56], jour [12]( \(sujet de secours\))?)'
mal_ecrites = [t[0] for t in table if not re.fullmatch(FORMAT, t[0])]
avec = lambda mot: [t for t in table if mot in t[2].lower()]
comptes = [('exercices', len(table), 22), ('titrages', len(avec('titrage')), 7), ('schémas de titrage', len(avec('schéma du titrage')), 3),
           ('dilutions', len([t for t in table if 'dilution' in t[2].lower() or 'verrerie' in t[2].lower()]), 9),
           ('extractions', len([t for t in table if 'extraction' in t[2].lower() or 'ampoule' in t[2].lower()]), 7),
           ('CCM', len(avec('ccm')), 6), ('reflux', len(avec('reflux')), 3), ('électrolyses', len(avec('électrolyse')), 4),
           ('électrolyses en 2026', len([t for t in avec('électrolyse') if '2026' in t[0]]), 3),
           ('sciences de l\'ingénieur', len([t for t in table if 'ingénieur' in ' '.join(t[:3]).lower()]), 0)]
mauvais = [cc for cc in comptes if cc[1] != cc[2]]
# relecture du 19 novembre : chaque ligne a été relue sur son sujet. Code du sujet, numéro de l'exercice et questions
# qui portent sur un montage, un appareil de mesure, la conduite d'un suivi ou un geste de laboratoire.
SUJETS = {
    ('Métropole, juin 2026, jour 1', "L'odeur de Jasmin"): '26-PYCJ1ME1, ex. 2 : Q2 (rôle de la trempe)',
    ('Métropole, juin 2026, jour 2', 'Le kéfir de fruit'): '26-PYCJ2ME1, ex. 1 : Q1 (schéma du titrage conductimétrique), Q8 (méthode de suivi), Q16 (solvant d\'extraction), Q17 (CCM)',
    ('Métropole, septembre 2026, jour 1', "Synthèse de l'alcool de champignon"): '26-PYCJ1ME3, ex. 3 : Q2 (indicateur coloré), Q6 (reflux), Q7 (ampoule), Q8 (distillation), Q9 (CCM)',
    ('Métropole, septembre 2026, jour 2', "De l'acide salicylique à l'aspirine"): '26-PYCJ2ME3, ex. 1 : Q10 (dilution avant le dosage par étalonnage), Q12 (sécurité), Q13 (reflux), Q15 (eau froide et bain de glace), Q16 (CCM)',
    ('Métropole 2026, jour 2 (sujet de secours)', 'La tomate, un fruit plein de ressources'): '26-PYCJ2ME2, ex. 1 : Q1 (solvant), Q2 (schéma de l\'ampoule)',
    ('Amérique du Nord 2026, jour 1', 'Valorisation du dioxyde de carbone dans les cimenteries'): '26-PYCJ1AN1, ex. 1 : Q.11 (verrerie de la dilution)',
    ('Amérique du Nord 2026, jour 2', "HOPE, l'espoir du dihydrogène vert"): '26-PYCJ2AN1, ex. 2 : Q.2 (courant et électrons dans le circuit), Q.3 (électrodes)',
    ('Antilles-Guyane 2026, jour 1', 'Les 200 ans de la pastille de Vichy'): '26-PYCJ1AG1, ex. 1 : Q12 (indicateur coloré), Q14 (montage d\'hydrodistillation), Q15 (solvant), Q16 (chromatogramme)',
    ('Antilles-Guyane 2026, jour 2', "Traitement de l'eau d'une piscine"): '26-PYCJ2AG1, ex. 3 : Q7 (polarité du générateur), Q8 (durée)',
    ('Centres étrangers 2026, jour 1', "Analyse d'un comprimé"): '26-PYCJ1G11, ex. 3 : Q.3 (verrerie de la dilution)',
    ('Centres étrangers 2026, jour 1', 'La dépollution par les plantes pour extraire du nickel'): '26-PYCJ1G11, ex. 2 : Q.6 (schéma du montage), Q.7 et Q.8 (durée)',
    ('Polynésie 2026, jour 1', "Synthèse d'une Coumarine"): '26-PYCJ1PO1, ex. 1 : Q2 (protocole de dilution), Q11 et Q12 (cristallisation), Q13 (montage de Büchner)',
    ('Métropole, juin 2025, jour 2', 'Eau de Quinton'): '25-PYCJ2ME1, ex. 2 : Q1 (protocole et verrerie de la dilution)',
    ('Métropole, juin 2025, jour 2', 'Un parfum de rose'): '25-PYCJ2ME1, ex. 3 : Q6 (rôle du chauffage), Q7 (phases de l\'ampoule)',
    ('Métropole, septembre 2025, jour 1', "Étude d'une lessive « multi-usages »"): '25-PYCJ1ME3, ex. 2 : Q5 (schéma du titrage), Q6 (verrerie)',
    ('Métropole, septembre 2025, jour 1', "Traitement de surface d'une pièce de jeu d'échecs"): '25-PYCJ1ME3, ex. 3 : Q1 (précautions), Q7 (bornes du générateur)',
    ('Métropole 2025, jour 2 (sujet de secours)', 'Savon : parfum, synthèse et utilisation'): '25-PYCJ2ME4, ex. 1 : Q7 (élimination de l\'eau), Q8 (phases de l\'ampoule), Q9 (CCM)',
    ('Amérique du Nord 2025, jour 1', "Étude d'un vernis à ongles"): '25-PYCJ1AN1, ex. 1 : Q.5 (schéma de l\'ampoule), Q.9 (verrerie d\'un étalon), Q.10 (longueur d\'onde)',
    ('Amérique du Nord 2025, jour 2 (sujet de secours)', "L'atropine"): 'sujet de secours, ex. 1, questions relues sur le corrigé : Q7 (protocole de CCM), Q12 (reflux), Q15 (Dean-Stark)',
    ('Amérique du Sud 2025, jour 1', "Étude d'un herbicide"): '25-PYCJ1AS1, ex. 3 : Q2 (protocole de dilution), Q7 et Q8 (indicateur coloré)',
    ('Asie 2025, jour 1', 'Pollution ammoniacale'): '25-PYCJ1JA1, ex. 2 : Q5 (verrerie de la dilution)',
    ('Centres étrangers 2025, jour 1', 'Autour du géranium rosat'): '25-PYCJ1G11, ex. 1 : Q.3 (verrerie de la dilution), Q.4 (schéma du titrage)'}
# exercices relus et écartés : aucune question sur un montage, un appareil ou un geste
EXCLUS = {('Amérique du Sud 2025, jour 1', 'Recharge des voitures électriques'): '25-PYCJ1AS1, ex. 2 : demi-équations, polarité, porteurs de charge, capacité',
          ('Asie 2026, jour 2', 'Phytoremédiation'): '26-PYCJ2JA1, ex. 3 : relations à l\'équivalence seulement'}
sans_sujet = [t[:2] for t in table if t[:2] not in SUJETS]
exclus_presents = [t[:2] for t in table if t[:2] in EXCLUS]
if sans_sujet: mauvais.append(('lignes non relues sur leur sujet', len(sans_sujet), 0))
if exclus_presents: mauvais.append(('lignes écartées encore présentes', len(exclus_presents), 0))
for s in sans_sujet: print('   LIGNE non relue sur son sujet :', ' | '.join(s))
for s in exclus_presents: print('   LIGNE écartée encore présente :', ' | '.join(s))
print('--- tableau : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s), %d session(s) mal écrite(s)' % (len(mauvais), len(mal_ecrites)))
for n, v, a in mauvais: print('   COMPTE %s : %d dans le tableau, %d attendu' % (n, v, a))
for sess in mal_ecrites: print('   SESSION mal écrite :', sess)
# chaque ligne reprend un exercice déjà relevé dans le tableau d'une fiche de la série (même session, même titre)
import glob
serie = set()
for f in glob.glob(os.path.join(RACINE, 'fiches', 'pc-*', 'fiche.md')):
    t = open(f, encoding='utf-8').read()
    if '# Ce qui est tombé' not in t: continue
    b = t[t.index('# Ce qui est tombé'):]
    b = b[:b.index('::: {custom-style="Intertitre"}')]
    for l in b.splitlines():
        if l.startswith('| ') and not l.startswith('| Session'):
            c = [x.strip() for x in l.strip().strip('|').split('|')]
            serie.add((c[0], c[1]))
hors_serie = [t[:2] for t in table if t[:2] not in serie]
if hors_serie: mauvais.append(('lignes absentes des fiches de la série', len(hors_serie), 0))
for h in hors_serie: print('   LIGNE absente des fiches de la série :', ' | '.join(h))
# phrases de l'en-tête et du bilan, écrites à partir des comptes du tableau
LETTRES = {2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq', 6: 'six', 7: 'sept', 8: 'huit', 9: 'neuf', 21: 'vingt et un', 22: 'vingt-deux', 23: 'vingt-trois'}
nb = {n: v for n, v, _ in comptes}
bilan = ['Ce tableau relève %s des exercices de 2025 et 2026 qui interrogent' % LETTRES[nb['exercices']],
         "Titrage : %s de ces exercices, dont %s où l'on schématise le montage (Q.5 à Q.9, Q.19)." % (LETTRES[nb['titrages']], LETTRES[nb['schémas de titrage']]),
         'Dilution : verrerie ou protocole demandés dans %s exercices (Q.1, Q.3, Q.9).' % LETTRES[nb['dilutions']],
         'Synthèse : extraction dans %s exercices, CCM dans %s, chauffage à reflux dans %s (Q.10 à Q.15).' % (LETTRES[nb['extractions']], LETTRES[nb['CCM']], LETTRES[nb['reflux']]),
         'Électrolyse : %s exercices, dont %s en 2026 (Q.18).' % (LETTRES[nb['électrolyses']], LETTRES[nb['électrolyses en 2026']])]
bilan_ko = [b for b in bilan if b not in src]
if bilan_ko: mauvais.append(('phrases du bilan', len(bilan_ko), 0))
for b in bilan_ko: print('   BILAN INTROUVABLE :', b)

# mentions « Demandé » des questions et lignes du tableau : mêmes années, mêmes centres
metas = {int(q): m for q, m in re.findall(r'^## \[Q\.(\d+)\].*?\n\n::: \{custom-style="Meta"\}\n(.*)$', src, flags=re.M)}
dem_ko = []
for q in range(1, 20):
    lq = [t for t in table if q in t[3]]
    annees = sorted({re.search(r'202[56]', t[0]).group() for t in lq})
    mention = re.search(r'Demandé en ([^\\]*?)(?:\\ |$)', metas[q])
    if not lq:
        if 'Demandé' in metas[q]: dem_ko.append('Q.%d : mention sans ligne dans le tableau' % q)
        continue
    if not mention:
        dem_ko.append('Q.%d : lignes %s sans mention « Demandé »' % (q, [t[0] for t in lq])); continue
    texte = mention.group(1)
    if annees == ['2025', '2026']:
        if not texte.startswith('2025 et 2026'): dem_ko.append('Q.%d : « %s » au lieu de 2025 et 2026' % (q, texte))
    else:
        if not texte.startswith(annees[0]): dem_ko.append('Q.%d : « %s » au lieu de %s' % (q, texte, annees[0]))
        centres = sorted({re.sub(r',.*|\s+202[56].*', '', t[0]) for t in lq})
        for c in centres:
            if c not in texte: dem_ko.append('Q.%d : centre %s absent de « %s »' % (q, c, texte))
print('--- mentions « Demandé » : %d écart(s)' % len(dem_ko))
for d in dem_ko: print('   ', d)

# figures : chaque image citée existe, chaque image du dossier est citée, légendes numérotées dans l'ordre
cites = re.findall(r'\(figs/(fig_\w+\.png)\)', src)
presents = sorted(f for f in os.listdir(os.path.join(DOSSIER, 'figs')) if f.endswith('.png'))
legendes = [int(n) for n in re.findall(r'^Figure (\d+)\.', src, flags=re.M)]
fig_ko = [f for f in cites if f not in presents] + ['inutilisée : ' + f for f in presents if f not in cites]
if legendes != list(range(1, len(legendes) + 1)): fig_ko.append('légendes : %s' % legendes)
refs = sorted({int(n) for n in re.findall(r'\b[Ff]igure (\d+)', src)})
fig_ko += ['figure %d citée sans légende' % n for n in refs if n not in legendes]
print('--- figures : %d citées, %d dans le dossier, %d légendes, %d écart(s)' % (len(cites), len(presents), len(legendes), len(fig_ko)))
for f in fig_ko: print('   FIGURE', f)

# index : renvois existants, notions travaillées là où l'index le dit
idx = src[src.index('# Index des notions'):]
qs_existantes = set(range(1, 20)); ex_existants = set(range(1, 5))
idx_ko = []
for l in idx.splitlines():
    if l.startswith('| ') and not l.startswith('| Notion'):
        notion, ou = [c.strip() for c in l.strip().strip('|').split('|')]
        qs, exs = renvois(ou)
        if not qs <= qs_existantes or not exs <= ex_existants: idx_ko.append(notion)
print('--- index : %d écart(s)' % len(idx_ko))
for n in idx_ko: print('   INDEX', n)

total = len(ecarts) + len(absents) + len(faux) + len(faux_niv) + len(manque) + len(ex_ko) + len(mauvais) + len(mal_ecrites) + len(dem_ko) + len(fig_ko) + len(idx_ko) + len(presents_interdits)
print('BILAN : %s' % ('tout est juste' if total == 0 else '%d point(s) à revoir' % total))
