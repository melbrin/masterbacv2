# Recalcul indépendant des résultats numériques de la fiche 7 (Lumière : lentilles, lunette astronomique et photons).
# usage : python3 outils/verifs/pc-07-lumiere.py
# Chaque valeur imprimée est recalculée à partir des seules données des énoncés, puis on vérifie que son écriture
# figure telle quelle dans la fiche. Les courbes des panneaux sont reprises du script des figures.
import os, re
from math import sqrt, sin, radians, degrees, atan2, exp, log
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(RACINE, 'fiches', 'pc-07-lumiere', 'fiche.md'), encoding='utf-8').read()
h, c, eV, me = 6.63e-34, 3.00e8, 1.60e-19, 9.11e-31
hc = h * c
conj = lambda OA, f: 1 / (1 / f + 1 / OA)          # position de l'image, distances algébriques

# Thème 1
OAp2 = conj(-7.5, 5.0); g2 = OAp2 / -7.5
AB3 = 1.00 * 9.1e-3
inv4 = 1 / 0.050 + 1 / -2.00; OAp4 = 1 / inv4
inv_ex1 = 1 / 3.00 - 1 / 5.0e-2; OA_ex1 = 1 / inv_ex1; g_ex1 = 3.00 / OA_ex1; larg = abs(g_ex1) * 2.0
est = 2.0 * 3.00 / 5.0e-2
g5 = -1.80 / 2.0e-2; OA5 = 3.00 / g5; inv5 = 1 / 3.00 - 1 / OA5; f5 = 1 / inv5; f5_est = 2.0e-2 * 3.00 / 1.80
# Thème 2
G8 = 0.36 / 9.1e-3; G9 = 329 / 7.0
th10 = 3.17e4 / 1.42e9; thp10 = 47 * 2.23e-5
tg, thu = 1.22 * 550e-9 / 29.0e-3, 1.22 * 550e-9 / 51.0e-3
# Exercice 2
d_ex2 = 34.0 + 0.070; h_ex2 = d_ex2 * sin(radians(40)); G_ex2 = 34.0 / 7.0e-2
A1B1 = 34.0 * 2.2e-4; thp_ex2 = G_ex2 * 2.2e-4
th_mes = 7.0e-3 / 34.0; u_th = th_mes * 0.3 / 7.0; z = abs(th_mes - 2.2e-4) / 0.09e-4
thT = 1.6e4 / 6.3e8; thpT = G_ex2 * thT; thd_ex2 = 1.22 * 550e-9 / 0.20
ang_fig = degrees(atan2(6.2, 9.0 - 1.6))                 # angle du fil sur la figure de l'astroscope
# Thème 3
E650 = hc / 650e-9; E250 = hc / 250e-9
lam14 = hc / (2.11 * eV)
niv = {'E0': -5.14, 'E1': -3.03, 'E2': -1.94, 'E3': -1.52, 'E4': -1.38, 'E5': -0.85}
En = {n: -13.6 / n ** 2 for n in range(1, 5)}
lam_a = hc / ((En[3] - En[2]) * eV); lam_b = hc / ((En[4] - En[2]) * eV); lam_c = hc / ((En[2] - En[1]) * eV)
# Thème 4
W18 = 2.9 * eV; nus18 = W18 / h; lams18 = c / 7.0e14
Ehnu19 = hc / 400e-9; Ec19 = Ehnu19 - W18; v19 = sqrt(2 * 3.3e-20 / me)
nu20 = [7.0e14, 9.0e14, 11.0e14, 13.0e14]; Ec20 = [0.60, 1.43, 2.26, 3.09]
pente = [(Ec20[i + 1] - Ec20[i]) / (nu20[i + 1] - nu20[i]) for i in range(3)]
h20 = 4.15e-15 * eV; W20 = 4.15e-15 * 7.0e14 - 0.60; nus20 = 2.3 / 4.15e-15
Ec20_th = [h * n / eV - 2.3 for n in nu20]
eta21 = 340 / (1000 * 1.70)
lam22 = hc / (1.12 * eV)
# Q.23 : caractéristique du petit panneau (modèle du script des figures)
isc, voc, a = 5.0, 21.6, 1.3
P23 = max((u / 1000) * isc * (1 - exp((u / 1000 - voc) / a)) for u in range(0, 21601))
U23 = max(range(0, 21601), key=lambda u: (u / 1000) * isc * (1 - exp((u / 1000 - voc) / a))) / 1000
I23_18 = isc * (1 - exp((18 - voc) / a)); eta23 = 84 / (1000 * 0.50)
# Exercice 4
E_ex4 = hc / 250e-9; lams_ex4 = hc / (4.3 * eV); Ec_ex4 = E_ex4 - 4.3 * eV; v_ex4 = sqrt(2 * 1.1e-19 / me)
def pmax(E):
    iscE = 11.3 * E / 1000; vocE = 40.0 + 1.2 * log(E / 1000)
    best = max(range(0, int(vocE * 1000)), key=lambda u: (u / 1000) * iscE * (1 - exp((u / 1000 - vocE) / 1.6)))
    u = best / 1000
    return u * iscE * (1 - exp((u - vocE) / 1.6)), u
P1000, U1000 = pmax(1000); P800, _ = pmax(800); P400, _ = pmax(400)
eta1000 = 378 / (1000 * 1.94); eta800 = 300 / (800 * 1.94); eta400 = 147 / (400 * 1.94)
Elum = 1350 * 1.94; Eel = 0.195 * Elum; N = 2250 / 511

controles = [
    ('Q.2 inverse de OA′', 1 / 5.0 - 1 / 7.5, 1 / 15, 1e-12, r'= \dfrac{1}{15}\ \text{cm}^{-1}'),
    ('Q.2 position de l\'image', OAp2, 15, 1e-9, r'\overline{\text{OA′}} = 15\ \text{cm}'),
    ('Q.2 grandissement', g2, -2.0, 1e-9, r'\gamma = \dfrac{15}{-7{,}5} = -2{,}0'),
    ('Q.2 taille de l\'image', g2 * 1.0, -2.0, 1e-9, r'= -2{,}0 \times 1{,}0 = -2{,}0\ \text{cm}'),
    ('Q.3 image de la Lune', AB3, 9.1e-3, 1e-12, r'= 9{,}1 \times 10^{-3}\ \text{m} = 9{,}1\ \text{mm}'),
    ('Q.4 inverse', inv4, 19.5, 1e-9, r'= 19{,}5\ \text{m}^{-1}'),
    ('Q.4 position du capteur', OAp4, 5.13e-2, 5e-5, r'= 5{,}13 \times 10^{-2}\ \text{m} = 51{,}3\ \text{mm}'),
    ('Q.4 déplacement (mm)', (OAp4 - 0.050) * 1e3, 1.3, 0.05, r'environ $1{,}3\ \text{mm}$'),
    ('Ex.1 inverse', inv_ex1, -19.67, 0.005, r'= -19{,}67\ \text{m}^{-1}'),
    ('Ex.1 position de la matrice', OA_ex1, -5.08e-2, 5e-5, r'\overline{\text{OA}} = -5{,}08 \times 10^{-2}\ \text{m}'),
    ('Ex.1 écart au foyer (mm), inférieur à 1', (abs(OA_ex1) - 0.050) * 1e3, 0.85, 0.01, r"à moins d'un millimètre"),
    ('Ex.1 grandissement', g_ex1, -59.0, 0.05, r'= -59{,}0'),
    ('Ex.1 largeur (cm)', larg, 118, 0.5, r'59{,}0 \times 2{,}00 = 118\ \text{cm}'),
    ('Ex.1 estimation (cm)', est, 120, 1e-9, r'= 120\ \text{cm}'),
    ('Ex.1 écart relatif (%), inférieur à 2', (est - larg) / larg * 100, 1.7, 0.05, r'moins de $2\ \%$'),
    ('Ex.1 grandissement voulu', g5, -90, 1e-9, r'= -90{,}0'),
    ('Ex.1 position voulue', OA5, -3.33e-2, 5e-5, r'= -3{,}33 \times 10^{-2}\ \text{m}'),
    ('Ex.1 inverse de f′', inv5, 30.34, 0.01, r'= 30{,}34\ \text{m}^{-1}'),
    ('Ex.1 distance focale', f5, 3.30e-2, 5e-5, r'f\text{′} = 3{,}30 \times 10^{-2}\ \text{m}'),
    ('Ex.1 distance focale estimée', f5_est, 3.33e-2, 5e-5, r'{1{,}80} = 3{,}33 \times 10^{-2}\ \text{m}'),
    ('Q.7 somme des distances focales', 329 + 7.0, 336, 1e-9, r'= 329 + 7{,}0 = 336\ \text{cm}'),
    ('Q.8 grossissement', G8, 40, 0.5, r'{9{,}1 \times 10^{-3}} = 40'),
    ('Q.9 grossissement de Huygens', G9, 47, 0.5, r'\dfrac{329}{7{,}0} = 47'),
    ('Q.10 angle à l\'œil nu', th10, 2.23e-5, 5e-8, r'= 2{,}23 \times 10^{-5}\ \text{rad}'),
    ('Q.10 angle à travers la lunette', thp10, 1.0e-3, 5e-5, r'= 1{,}0 \times 10^{-3}\ \text{rad}'),
    ('Q.11 diffraction, Galilée', tg, 2.31e-5, 5e-8, r'= 2{,}31 \times 10^{-5}\ \text{rad}'),
    ('Q.11 diffraction, Huygens', thu, 1.32e-5, 5e-8, r'= 1{,}32 \times 10^{-5}\ \text{rad}'),
    ('Ex.2 longueur du fil', d_ex2, 34.07, 1e-9, r'= 34{,}0 + 0{,}070 = 34{,}07\ \text{m}'),
    ('Ex.2 sinus de 40°', sin(radians(40)), 0.643, 5e-4, r'34{,}07 \times 0{,}643'),
    ('Ex.2 hauteur de l\'objectif', h_ex2, 21.9, 0.05, r'= 21{,}9\ \text{m}'),
    ('Ex.2 angle du fil sur la figure', ang_fig, 40, 0.1, r'angle de $40°$ avec le sol'),
    ('Ex.2 grossissement', G_ex2, 4.9e2, 5, r'= 4{,}9 \times 10^{2}$$'),
    ('Ex.2 image intermédiaire', A1B1, 7.5e-3, 5e-5, r'= 7{,}5 \times 10^{-3}\ \text{m}'),
    ('Ex.2 angle θ′', thp_ex2, 0.11, 0.005, r'= 0{,}11\ \text{rad}'),
    ('Ex.2 angle θ′ en degrés', degrees(thp_ex2), 6, 0.5, r'soit $6°$'),
    ('Ex.2 diamètre apparent mesuré', th_mes, 2.06e-4, 5e-7, r'= 2{,}06 \times 10^{-4}\ \text{rad}'),
    ('Ex.2 incertitude-type', u_th, 0.09e-4, 5e-7, r'= 0{,}09 \times 10^{-4}\ \text{rad}'),
    ('Ex.2 écart normalisé', z, 1.6, 0.05, r'= 1{,}6 < 2'),
    ('Ex.2 tache à l\'œil nu', thT, 2.5e-5, 5e-7, r'= 2{,}5 \times 10^{-5}\ \text{rad}'),
    ('Ex.2 tache à travers l\'astroscope', thpT, 1.2e-2, 5e-4, r'= 1{,}2 \times 10^{-2}\ \text{rad}'),
    ('Ex.2 diffraction', thd_ex2, 3.4e-6, 5e-8, r'= 3{,}4 \times 10^{-6}\ \text{rad}'),
    ('Q.12 photon rouge (J)', E650, 3.06e-19, 5e-22, r'= 3{,}06 \times 10^{-19}\ \text{J}'),
    ('Q.12 photon rouge (eV)', E650 / eV, 1.91, 0.005, r'= 1{,}91\ \text{eV}'),
    ('Q.12 photon ultraviolet (J)', E250, 7.96e-19, 5e-22, r'= 7{,}96 \times 10^{-19}\ \text{J} = 4{,}97\ \text{eV}'),
    ('Q.12 photon ultraviolet (eV)', E250 / eV, 4.97, 0.005, r'= 4{,}97\ \text{eV}'),
    ('Q.13 énergie d\'ionisation du sodium', 0 - niv['E0'], 5.14, 1e-9, r'E_{\text{ion}} = 0 - E_0 = 5{,}14\ \text{eV}'),
    ('Q.14 écart E1 - E0', niv['E1'] - niv['E0'], 2.11, 1e-9, r'= 2{,}11\ \text{eV}'),
    ('Q.14 longueur d\'onde', lam14, 5.89e-7, 5e-10, r'= 5{,}89 \times 10^{-7}\ \text{m} = 589\ \text{nm}'),
    ('Q.15 cas a', niv['E0'] + 1.00, -4.14, 1e-9, r'= -4{,}14\ \text{eV}'),
    ('Q.15 cas b', niv['E1'] + 2.00, -1.03, 1e-9, r'= -1{,}03\ \text{eV}'),
    ('Q.15 cas c', niv['E1'] + 1.09, niv['E2'], 1e-9, r'= -1{,}94\ \text{eV} = E_2'),
    ('Ex.3 niveau 2', En[2], -3.40, 1e-9, r'= -3{,}40\ \text{eV}'),
    ('Ex.3 niveau 3', En[3], -1.51, 0.005, r'= -1{,}51\ \text{eV}'),
    ('Ex.3 niveau 4', En[4], -0.85, 1e-9, r'= -0{,}85\ \text{eV}'),
    ('Ex.3 écart (a)', -1.51 + 3.40, 1.89, 1e-9, r'= 1{,}89\ \text{eV}'),
    ('Ex.3 longueur d\'onde (a)', lam_a, 6.58e-7, 5e-10, r'= 6{,}58 \times 10^{-7}\ \text{m} = 658\ \text{nm}'),
    ('Ex.3 longueur d\'onde (b)', lam_b, 4.88e-7, 1e-9, r'\lambda_b = 4{,}88 \times 10^{-7}\ \text{m}$, soit $488\ \text{nm}$'),
    ('Ex.3 écart (c)', -3.40 + 13.6, 10.2, 1e-9, r'= 10{,}2\ \text{eV}'),
    ('Ex.3 longueur d\'onde (c)', lam_c, 1.22e-7, 5e-10, r'= 1{,}22 \times 10^{-7}\ \text{m} = 122\ \text{nm}'),
    ('Ex.3 photon de 11,0 eV', -13.6 + 11.0, -2.6, 1e-9, r'= -2{,}6\ \text{eV}'),
    ('Ex.3 électron arraché', 15.0 - 13.6, 1.4, 1e-9, r'= 15{,}0 - 13{,}6 = 1{,}4\ \text{eV}'),
    ('Q.18 travail d\'extraction en joule', W18, 4.64e-19, 1e-24, r'= 4{,}64 \times 10^{-19}\ \text{J}'),
    ('Q.18 fréquence seuil', nus18, 7.0e14, 5e12, r'= 7{,}0 \times 10^{14}\ \text{Hz}'),
    ('Q.18 longueur d\'onde seuil', lams18, 4.3e-7, 5e-9, r'= 4{,}3 \times 10^{-7}\ \text{m} = 4{,}3 \times 10^{2}\ \text{nm}'),
    ('Q.19 énergie du photon', Ehnu19, 4.97e-19, 5e-22, r'{400 \times 10^{-9}} = 4{,}97 \times 10^{-19}\ \text{J}'),
    ('Q.19 énergie cinétique (J)', Ec19, 3.3e-20, 5e-22, r'= 3{,}3 \times 10^{-20}\ \text{J} = 0{,}21\ \text{eV}'),
    ('Q.19 énergie cinétique (eV)', Ec19 / eV, 0.21, 0.005, r'= 0{,}21\ \text{eV}'),
    ('Q.19 vitesse', v19, 2.7e5, 5e3, r'= 2{,}7 \times 10^{5}\ \text{m·s}^{-1}'),
    ('Q.20 pente 1', pente[0], 4.15e-15, 1e-19, r'= 4{,}15 \times 10^{-15}\ \text{eV·s}$$'),
    ('Q.20 pente 2', pente[1], 4.15e-15, 1e-19, r'{2{,}0 \times 10^{14}} = \dfrac{3{,}09 - 2{,}26}'),
    ('Q.20 pente 3', pente[2], 4.15e-15, 1e-19, r'= 4{,}15 \times 10^{-15}\ \text{eV·s}$$'),
    ('Q.20 constante de Planck', h20, 6.64e-34, 5e-37, r'= 6{,}64 \times 10^{-34}\ \text{J·s}'),
    ('Q.20 travail d\'extraction', W20, 2.3, 0.05, r'- 0{,}60 = 2{,}3\ \text{eV}'),
    ('Q.20 fréquence seuil', nus20, 5.5e14, 5e12, r'= 5{,}5 \times 10^{14}\ \text{Hz}'),
    ('Q.21 rendement', eta21, 0.200, 5e-4, r'= 0{,}200 = 20{,}0\ \%'),
    ('Q.22 longueur d\'onde maximale', lam22, 1.11e-6, 5e-9, r'= 1{,}11 \times 10^{-6}\ \text{m} = 1{,}11\ \text{µm}'),
    ('Q.23 puissance maximale lue', P23, 84, 1.0, r'P_{\text{max}} = 84\ \text{W}'),
    ('Q.23 tension correspondante', U23, 18, 0.5, r'pour $U = 18\ \text{V}$'),
    ('Q.23 intensité à 18 V', I23_18, 4.7, 0.05, r'on lit $I = 4{,}7\ \text{A}$'),
    ('Q.23 vérification', 18 * 4.7, 85, 0.5, r'18 \times 4{,}7 = 85\ \text{W}'),
    ('Q.23 rendement', eta23, 0.17, 0.005, r'= 0{,}17 = 17\ \%'),
    ('Ex.4 photon de 250 nm (J)', E_ex4, 7.96e-19, 5e-22, r'{250 \times 10^{-9}} = 7{,}96 \times 10^{-19}\ \text{J} = \dfrac{7{,}956 \times 10^{-19}}{1{,}60 \times 10^{-19}} = 4{,}97\ \text{eV}'),
    ('Ex.4 longueur d\'onde seuil du zinc', lams_ex4, 2.9e-7, 5e-9, r'= 2{,}9 \times 10^{-7}\ \text{m} = 2{,}9 \times 10^{2}\ \text{nm}'),
    ('Ex.4 énergie cinétique', Ec_ex4, 1.1e-19, 5e-21, r'= 1{,}1 \times 10^{-19}\ \text{J}'),
    ('Ex.4 vitesse', v_ex4, 4.9e5, 5e3, r'= 4{,}9 \times 10^{5}\ \text{m·s}^{-1}'),
    ('Ex.4 puissance maximale à 1 000 W/m²', P1000, 378, 1.0, r'P_{\text{max}} \approx 378\ \text{W}'),
    ('Ex.4 tension au maximum', U1000, 35, 0.5, r'pour $U \approx 35\ \text{V}$'),
    ('Ex.4 rendement à 1 000 W/m²', eta1000, 0.195, 5e-4, r'= 0{,}195 = 19{,}5\ \%'),
    ('Ex.4 puissance maximale à 800 W/m²', P800, 300, 1.0, r'On lit $300\ \text{W}$'),
    ('Ex.4 rendement à 800 W/m²', eta800 * 100, 19.3, 0.05, r'= 19{,}3\ \%'),
    ('Ex.4 puissance maximale à 400 W/m²', P400, 147, 1.0, r'environ $147\ \text{W}$'),
    ('Ex.4 rendement à 400 W/m²', eta400 * 100, 18.9, 0.05, r'= 18{,}9\ \%'),
    ('Ex.4 énergie lumineuse reçue', Elum, 2619, 0.5, r'= 2\ 619\ \text{kWh}'),
    ('Ex.4 énergie électrique produite', Eel, 511, 0.5, r'= 511\ \text{kWh}'),
    ('Ex.4 énergie à produire', 4500 / 2, 2250, 1e-9, r'= 2\ 250\ \text{kWh}'),
    ('Ex.4 nombre de panneaux', N, 4.4, 0.05, r'= 4{,}4$$'),
]
for nu, e_imp, e_th in zip(nu20, Ec20, Ec20_th):
    controles.append(('Q.20 tableau, %.1e Hz (eV)' % nu, e_th, e_imp, 0.006, ('%.2f' % e_imp).replace('.', ',')))

ecarts = [(n, cc, i) for n, cc, i, t, _ in controles if abs(cc - i) > t]
absents = [(n, w) for n, _, _, _, w in controles if w not in src]
print('--- comparaison avec la fiche : %d valeurs contrôlées, %d écart(s), %d écriture(s) introuvable(s)' % (len(controles), len(ecarts), len(absents)))
for n, cc, i in ecarts: print('   ÉCART', n, ': recalculé %.5g, imprimé %.5g' % (cc, i))
for n, w in absents: print('   INTROUVABLE', n, ':', w)

# niveaux des questions : ligne d'information et tableau « Votre parcours »
niveaux = {int(q): int(n) for q, n in re.findall(r'^## \[Q\.(\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)', src, flags=re.M)}
attendu = {10: [1, 2, 3, 5, 7, 8, 10, 12, 13, 14, 15, 17, 18, 19, 21], 14: [4, 6, 9, 16, 20, 22, 23], 18: [11]}
faux_niv = [(q, n) for n, qs in attendu.items() for q in qs if niveaux.get(q) != n]
manque = sorted(set(niveaux) - {q for qs in attendu.values() for q in qs})
print('--- niveaux : %d questions, %d écart(s) avec le parcours' % (len(niveaux), len(faux_niv) + len(manque)))
for q, n in faux_niv: print('   NIVEAU Q.%d : %s dans la fiche, %d dans le parcours' % (q, niveaux.get(q), n))

# tableau « Ce qui est tombé » et phrases qui le résument
bloc = src[src.index('# Ce qui est tombé'):src.index('Ce qu\'il faut en retenir')]
lignes = [l for l in bloc.splitlines() if l.startswith('| ') and not l.startswith('| Session')]
notions = [l.split('|')[3].lower() for l in lignes]
si = [l for l in lignes if 'ingénieur' in l.lower()]
comptes = [('exercices', len(lignes), 8), ('sciences de l\'ingénieur', len(si), 0),
           ('lunette', len([n for n in notions if 'lunette' in n or 'grossissement' in n]), 3),
           ('effet photoélectrique', len([n for n in notions if 'photoélectrique' in n]), 3),
           ('rendement', len([n for n in notions if 'rendement' in n]), 5),
           ('niveaux d\'énergie', len([n for n in notions if "niveau" in n]), 0),
           ('sessions 2026', len([l for l in lignes if '2026' in l.split('|')[1]]), 5)]
mauvais = [cc for cc in comptes if cc[1] != cc[2]]
print('--- tableau : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s)' % len(mauvais))
phrases = ['au moins huit exercices des sessions 2025 et 2026', 'la notion la plus demandée : cinq exercices',
           'est tombée trois fois en 2026', 'apparaît dans trois exercices', "n'apparaissent dans aucun de ces exercices",
           'Demandée deux fois en 2026', 'Deux sujets en 2026', 'Trois sujets en 2025 et 2026', 'Cinq sujets en 2025 et 2026']
perdues = [p for p in phrases if p not in src]
for p in perdues: print('   PHRASE INTROUVABLE :', p)
print('--- phrases de synthèse : %d suivies, %d introuvable(s)' % (len(phrases), len(perdues)))
if ecarts or absents or faux_niv or manque or mauvais or perdues:
    raise SystemExit(1)
print('--- tout est bon')
