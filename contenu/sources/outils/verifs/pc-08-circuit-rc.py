# Recalcul indépendant des résultats numériques de la fiche 8 (Circuit RC : condensateur, charge et décharge).
# usage : python3 outils/verifs/pc-08-circuit-rc.py
# Chaque valeur imprimée est recalculée à partir des seules données des énoncés, puis on vérifie que son écriture
# figure telle quelle dans la fiche. Les courbes lues sur les figures sont reprises du script des figures.
import os, re
from math import pi, exp, log
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(RACINE, 'fiches', 'pc-08-circuit-rc', 'fiche.md'), encoding='utf-8').read()
e0 = 8.85e-12

def date_charge(E, tau, u):      # date à laquelle une charge sous E atteint u
    return tau * log(E / (E - u))
def date_decharge(U0, tau, u):   # date à laquelle une décharge depuis U0 atteint u
    return tau * log(U0 / u)

# Thème 1
I1 = 5.0 / 0.20e-3
qA2 = 470e-6 * 6.0
u3 = 0.10e-3 * 2.0 / 22e-6
S4 = 0.20 * 0.30; C4 = e0 * 3.0 * S4 / 1.0e-4
C5a, C5b, C5c = 12 * 0.50 / 0.40, 2.2 * 12, 2 / 3 * 12
S_ex1 = pi * (12e-3 / 2) ** 2; C0_ex1 = e0 * 1.00 * S_ex1 / 25e-6; q0_ex1 = C0_ex1 * 48
C1_ex1 = C0_ex1 * 25 / 24.5; dC_ex1 = C1_ex1 - C0_ex1; dq_ex1 = 48 * dC_ex1; I_ex1 = dq_ex1 / 0.25e-3; uR_ex1 = 1.0e6 * I_ex1
# Thème 2
u7a, u7b = 5.0 * (1 - exp(-1.0 / 2.0)), 5.0 * (1 - exp(-10 / 2.0))
tau8 = 10e3 * 470e-6; R8 = 2.0 / 470e-6
tau9 = 20e-3                                    # constante de temps de la figure de Q.9 (script des figures)
C9 = tau9 / 10e3
t10 = date_charge(5.0, 20, 4.0)
I0_11 = 5.0 / 10e3; i11 = I0_11 * exp(-1); t11 = 20 * log(10)
E12 = 0.5 * 32e-6 * (5.0e3) ** 2
R_ex2 = 30 / (4.70e-3 * log(3)); tau_ex2 = 5.0e3 * 4.70e-3; ts_ex2 = tau_ex2 * log(3)
ts470, ts100k = 470 * 4.70e-3 * log(3), 100e3 * 4.70e-3 * log(3)
tau_exp = 27.0                                  # constante de temps de la figure de l'exercice 2 (script des figures)
Cexp = tau_exp / 5.0e3; ecart_ex2 = (Cexp - 4.70e-3) / 4.70e-3; tr_ex2 = tau_exp * log(3)
# Thème 3
C14 = 1.0 / 10e3                                # figure de Q.14 : U0 = 6,0 V et tau = 1,0 s
tau15 = 50 * 32e-6; i15 = -5.0e3 / 50
t16 = [0, 1, 2, 3, 4, 5]; u16 = [9.00, 6.03, 4.04, 2.71, 1.82, 1.22]; l16 = [log(u) for u in u16]
n = len(t16); mt, ml = sum(t16) / n, sum(l16) / n
a16 = sum((t - mt) * (l - ml) for t, l in zip(t16, l16)) / sum((t - mt) ** 2 for t in t16); b16 = ml - a16 * mt
tau_ex3 = 14 / log(4); R_ex3 = tau_ex3 / 47e-6
lect = {}
for nom, R in (('R1', 106e3), ('R2', 215e3), ('R3', 426e3)):     # réglages de la figure de l'exercice 3
    ta = R * 47e-6
    lect[nom] = (date_decharge(5.0, ta, 4.0), date_decharge(5.0, ta, 1.0), ta)
E_ex3 = 0.5 * 47e-6 * (4.0 ** 2 - 1.0 ** 2)
# Thème 4
tau17a, tau17b = 1.0e6 * 10e-12, 1.0e6 * 12e-12
C18 = 0.50e-3 / 10e6; S18 = 0.05 * 0.04; C0_18 = e0 * S18 / 0.40e-3; e18 = e0 * S18 / C18
de18 = 0.40e-3 - e18; m18 = 1.5e4 * de18 / 9.81
R19 = 4.0e-3 / 1.0e-6
th19 = 1 / (1 / 298.15 + log(R19 / 10e3) / 3950) - 273.15         # thermistance du script des figures
tau_ex4 = 120e-6                                # figure de l'exercice 4, graphique a
C_ex4 = tau_ex4 / 330e3
C0_et, pente_et = 177.0, 2.2125 * 1.2           # droite d'étalonnage du graphique b (pF et pF par cm)
h_ex4 = (C_ex4 * 1e12 - C0_et) / pente_et; H_ex4 = round(h_ex4) + 5.0
V_ex4 = pi * 0.580 ** 2 / 4 * H_ex4 / 100
dC_ex4 = 1e-6 / 330e3; C80 = C0_et + pente_et * 80; dh_ex4 = dC_ex4 * 1e12 / ((C80 - C0_et) / 80)
dV_ex4 = pi * 0.580 ** 2 / 4 * dh_ex4 / 100 * 1000

controles = [
    ('Essentiel : u_C(tau) en charge, fraction de E', 1 - exp(-1), 0.63, 0.005, r'| $u_C(\tau) = 0{,}63\,E$ (charge), $0{,}37\,U_0$ (décharge) |'),
    ('Essentiel : u_C(tau) en décharge, fraction de U0', exp(-1), 0.37, 0.005, r'| $u_C(\tau) = 0{,}63\,E$ (charge), $0{,}37\,U_0$ (décharge) |'),
    ('Essentiel : écart restant à 5 tau, en % (moins de 1 %)', 100 * exp(-5), 0.7, 0.3, r'| Remplacez $t$ par $\tau$, puis par $5\tau$ (fin). |'),
    ('Q.1 intensité de la foudre', I1, 2.5e4, 1e-9, r'= 2{,}5 \times 10^{4}\ \text{A}'),
    ('Q.2 charge de l\'armature A', qA2, 2.8e-3, 5e-5, r'= 2{,}8 \times 10^{-3}\ \text{C} \qquad q_B = -2{,}8 \times 10^{-3}\ \text{C}'),
    ('Q.3 tension au bout de 2,0 s', u3, 9.1, 0.05, r'{22 \times 10^{-6}} = 9{,}1\ \text{V}'),
    ('Q.4 surface', S4, 6.0e-2, 1e-12, r'S = 0{,}20 \times 0{,}30 = 6{,}0 \times 10^{-2}\ \text{m}^2'),
    ('Q.4 capacité', C4, 1.6e-8, 5e-10, r'= 1{,}6 \times 10^{-8}\ \text{F} = 16\ \text{nF}'),
    ('Q.5 a) armatures rapprochées', C5a, 15, 1e-9, r'C = 12 \times \dfrac{0{,}50}{0{,}40} = 15\ \text{pF}'),
    ('Q.5 b) huile', C5b, 26, 0.5, r'C = 2{,}2 \times 12 = 26\ \text{pF}'),
    ('Q.5 c) surface réduite', C5c, 8.0, 1e-9, r'\times 12 = 8{,}0\ \text{pF}'),
    ('Ex.1 surface des disques', S_ex1, 1.13e-4, 5e-7, r'= 1{,}13 \times 10^{-4}\ \text{m}^2'),
    ('Ex.1 capacité au repos', C0_ex1, 4.00e-11, 5e-14, r'= 4{,}00 \times 10^{-11}\ \text{F} = 40{,}0\ \text{pF}'),
    ('Ex.1 charge au repos', q0_ex1, 1.9e-9, 5e-11, r'= 1{,}9 \times 10^{-9}\ \text{C}'),
    ('Ex.1 nouvelle capacité (pF)', C1_ex1 * 1e12, 40.8, 0.06, r'= 40{,}8\ \text{pF}'),
    ('Ex.1 variation de capacité (pF)', dC_ex1 * 1e12, 0.82, 0.005, r'= 40{,}0 \times 0{,}0204 = 0{,}82\ \text{pF}'),
    ('Ex.1 variation de charge', dq_ex1, 3.9e-11, 5e-13, r'= 3{,}9 \times 10^{-11}\ \text{C}'),
    ('Ex.1 intensité moyenne', I_ex1, 1.6e-7, 5e-9, r'= 1{,}6 \times 10^{-7}\ \text{A}'),
    ('Ex.1 signal', uR_ex1, 0.16, 0.005, r'= 0{,}16\ \text{V}'),
    ('Ex.1 rapport u_R / U (%)', uR_ex1 / 48 * 100, 0.3, 0.05, r'= 0{,}3\ \%'),
    ('Ex.1 rapport inférieur à 0,4 %', uR_ex1 / 48 * 100, 0.33, 0.07, r'à moins de 0,4 % près'),
    ('Q.7 exponentielle', exp(-0.5), 0.61, 0.005, r'(1 - 0{,}61) = 2{,}0\ \text{V}'),
    ('Q.7 tension à 1,0 s', u7a, 2.0, 0.05, r'(1 - 0{,}61) = 2{,}0\ \text{V}'),
    ('Q.7 tension à 10 s', u7b, 5.0, 0.05, r'(1 - 0{,}007) = 5{,}0\ \text{V}'),
    ('Q.7 exponentielle à 5 tau', exp(-5), 0.007, 0.0005, r'(1 - 0{,}007)'),
    ('Q.8 tableau, tau', 1 - exp(-1), 0.63, 0.005, r'| 0,63 | 0,86 | 0,95 | 0,99 |'),
    ('Q.8 tableau, 2 tau', 1 - exp(-2), 0.86, 0.005, r'| 0,63 | 0,86 | 0,95 | 0,99 |'),
    ('Q.8 tableau, 3 tau', 1 - exp(-3), 0.95, 0.005, r'| 0,63 | 0,86 | 0,95 | 0,99 |'),
    ('Q.8 tableau, 5 tau', 1 - exp(-5), 0.99, 0.005, r'| 0,63 | 0,86 | 0,95 | 0,99 |'),
    ('Q.8 constante de temps', tau8, 4.7, 1e-9, r'= 4{,}7\ \text{s}'),
    ('Q.8 durée de la charge', 5 * tau8, 24, 0.5, r'5\tau = 24\ \text{s}'),
    ('Q.8 résistance', R8, 4.3e3, 50, r'= 4{,}3 \times 10^{3}\ \text{Ω} = 4{,}3\ \text{kΩ}'),
    ('Q.9 63 % de E', 5.0 * (1 - exp(-1)), 3.2, 0.05, r'0{,}63\,E = 0{,}63 \times 5{,}0 = 3{,}2\ \text{V}'),
    ('Q.9 lecture de tau (ms)', date_charge(5.0, 20, 5.0 * (1 - exp(-1))), 20, 1e-9, r'donnent $\tau = 20\ \text{ms}$'),
    ('Q.9 capacité', C9, 2.0e-6, 1e-12, r'= 2{,}0 \times 10^{-6}\ \text{F} = 2{,}0\ \text{µF}'),
    ('Q.10 date du seuil (ms)', t10, 32, 0.5, r'= 20 \times \ln 5 = 32\ \text{ms}'),
    ('Q.11 intensité initiale', I0_11, 5.0e-4, 1e-12, r'= 5{,}0 \times 10^{-4}\ \text{A} = 0{,}50\ \text{mA}'),
    ('Q.11 intensité à tau (mA)', i11 * 1e3, 0.18, 0.005, r'= 0{,}18\ \text{mA}'),
    ('Q.11 intensité divisée par 10 (ms)', t11, 46, 0.5, r'= 20 \times 2{,}30 = 46\ \text{ms}'),
    ('Q.12 énergie du défibrillateur', E12, 4.0e2, 1e-9, r'= 4{,}0 \times 10^{2}\ \text{J}'),
    ('Ex.2 résistance pour 30 s', R_ex2, 5.8e3, 50, r'= 5{,}8 \times 10^{3}\ \text{Ω}'),
    ('Ex.2 constante de temps', tau_ex2, 23.5, 1e-9, r'= 23{,}5\ \text{s}$ et une'),
    ('Ex.2 temporisation obtenue', ts_ex2, 26, 0.5, r'23{,}5 \times \ln 3 = 26\ \text{s}'),
    ('Ex.2 avec 470 ohms', ts470, 2.4, 0.05, r'$2{,}4\ \text{s}$ avec $470\ \text{Ω}$'),
    ('Ex.2 avec 100 kiloohms', ts100k, 5.2e2, 5, r'$5{,}2 \times 10^{2}\ \text{s}$, près de 9 minutes'),
    ('Ex.2 100 kiloohms en minutes', ts100k / 60, 8.6, 0.05, r'près de 9 minutes'),
    ('Ex.2 63 % de E', 4.5 * (1 - exp(-1)), 2.84, 0.005, r'0{,}632 \times 4{,}5 = 2{,}84\ \text{V}'),
    ('Ex.2 lecture de tau', date_charge(4.5, tau_exp, 4.5 * (1 - exp(-1))), 27, 1e-9, r'\tau_{\text{exp}} = 27\ \text{s}'),
    ('Ex.2 capacité réelle', Cexp, 5.4e-3, 1e-12, r'= 5{,}4 \times 10^{-3}\ \text{F}'),
    ('Ex.2 écart relatif', ecart_ex2 * 100, 15, 0.5, r'= 15\ \%$$'),
    ('Ex.2 durée réelle', tr_ex2, 30, 0.5, r'27 \times \ln 3 = 30\ \text{s}'),
    ('Q.14 37 % de U0', 6.0 * exp(-1), 2.2, 0.05, r'0{,}37 \times 6{,}0 = 2{,}2\ \text{V}'),
    ('Q.14 lecture de tau', date_decharge(6.0, 1.0, 6.0 * exp(-1)), 1.0, 1e-9, r'donnent $\tau = 1{,}0\ \text{s}$'),
    ('Q.14 capacité', C14, 1.0e-4, 1e-12, r'= 1{,}0 \times 10^{-4}\ \text{F} = 100\ \text{µF}'),
    ('Q.15 constante de temps', tau15, 1.6e-3, 1e-12, r'= 1{,}6 \times 10^{-3}\ \text{s} = 1{,}6\ \text{ms}'),
    ('Q.15 intensité initiale', i15, -1.0e2, 1e-9, r'= -1{,}0 \times 10^{2}\ \text{A}'),
    ('Q.15 fin de la décharge (ms)', 5 * tau15 * 1e3, 8, 1e-9, r'$5\tau = 8\ \text{ms}$'),
    ('Q.16 pente', a16, -0.400, 0.0006, r'a = -0{,}400\ \text{s}^{-1}'),
    ('Q.16 ordonnée à l\'origine', b16, 2.196, 0.0006, r'b = 2{,}196'),
    ('Q.16 constante de temps', -1 / a16, 2.50, 0.005, r'= 2{,}50\ \text{s}'),
    ('Q.16 tension initiale', exp(b16), 8.99, 0.005, r'= 8{,}99\ \text{V}'),
    ('Q.16 tableau des mesures (modèle à 2,5 s)', max(abs(u - 9.0 * exp(-t / 2.5)) for t, u in zip(t16, u16)), 0, 0.005, r'| 9,00 | 6,03 | 4,04 | 2,71 | 1,82 | 1,22 |'),
    ('Ex.3 constante de temps', tau_ex3, 10.1, 0.05, r'= 10{,}1\ \text{s}'),
    ('Ex.3 résistance', R_ex3, 2.1e5, 5e3, r'= 2{,}1 \times 10^{5}\ \text{Ω} = 0{,}21\ \text{MΩ}'),
    ('Ex.3 R1 départ', lect['R1'][0], 1.1, 0.06, r'$1{,}1\ \text{s}$ et $8{,}0\ \text{s}$ pour $R_1$'),
    ('Ex.3 R1 arrêt', lect['R1'][1], 8.0, 0.06, r'$1{,}1\ \text{s}$ et $8{,}0\ \text{s}$ pour $R_1$'),
    ('Ex.3 R1 durée', lect['R1'][1] - lect['R1'][0], 6.9, 0.06, r'soit $6{,}9\ \text{s}$ de rotation'),
    ('Ex.3 R2 départ', lect['R2'][0], 2.3, 0.06, r'$2{,}3\ \text{s}$ et $16{,}3\ \text{s}$ pour $R_2$'),
    ('Ex.3 R2 arrêt', lect['R2'][1], 16.3, 0.06, r'$2{,}3\ \text{s}$ et $16{,}3\ \text{s}$ pour $R_2$'),
    ('Ex.3 R2 durée', lect['R2'][1] - lect['R2'][0], 14, 0.06, r'soit $14\ \text{s}$ ;'),
    ('Ex.3 R3 départ', lect['R3'][0], 4.5, 0.06, r'$4{,}5\ \text{s}$ et $32{,}2\ \text{s}$ pour $R_3$'),
    ('Ex.3 R3 arrêt', lect['R3'][1], 32.2, 0.06, r'$4{,}5\ \text{s}$ et $32{,}2\ \text{s}$ pour $R_3$'),
    ('Ex.3 R3 durée', lect['R3'][1] - lect['R3'][0], 28, 0.3, r'soit $28\ \text{s}$'),
    ('Ex.3 37 % de U0', 0.37 * 5.0, 1.85, 1e-9, r'0{,}37 \times 5{,}0 = 1{,}85\ \text{V}'),
    ('Ex.3 tau de R1 (méthode rapide)', lect['R1'][2], 5, 0.1, r'vers $5\ \text{s}$ et $20\ \text{s}$'),
    ('Ex.3 tau de R3 (méthode rapide)', lect['R3'][2], 20, 0.1, r'vers $5\ \text{s}$ et $20\ \text{s}$'),
    ('Ex.3 énergie dissipée', E_ex3, 3.5e-4, 5e-6, r'= 3{,}5 \times 10^{-4}\ \text{J}'),
    ('Q.17 sans doigt', tau17a, 1.0e-5, 1e-15, r'= 1{,}0 \times 10^{-5}\ \text{s} = 10\ \text{µs}'),
    ('Q.17 avec le doigt', tau17b, 1.2e-5, 1e-15, r'= 12\ \text{µs}'),
    ('Q.18 capacité mesurée', C18, 5.0e-11, 1e-15, r'= 5{,}0 \times 10^{-11}\ \text{F} = 50\ \text{pF}'),
    ('Q.18 capacité à vide', C0_18, 4.4e-11, 5e-13, r'= 4{,}4 \times 10^{-11}\ \text{F}$, soit $44\ \text{pF}$'),
    ('Q.18 distance', e18, 3.54e-4, 5e-7, r'= 3{,}54 \times 10^{-4}\ \text{m} = 0{,}354\ \text{mm}'),
    ('Q.18 descente du plateau', de18, 4.6e-5, 5e-7, r'= 0{,}046\ \text{mm} = 4{,}6 \times 10^{-5}\ \text{m}'),
    ('Q.18 masse', m18, 7.0e-2, 5e-4, r'= 7{,}0 \times 10^{-2}\ \text{kg} = 70\ \text{g}'),
    ('Q.19 résistance', R19, 4.0e3, 1e-9, r'= 4{,}0 \times 10^{3}\ \text{Ω} = 4{,}0\ \text{kΩ}'),
    ('Q.19 température lue', th19, 47, 0.5, r'\theta = 47\ \text{°C}'),
    ('Ex.4 63 % de E', 5.0 * (1 - exp(-1)), 3.2, 0.05, r'u_C(\tau) = 0{,}63 \times 5{,}0 = 3{,}2\ \text{V}'),
    ('Ex.4 1 - e^-1', 1 - exp(-1), 0.632, 0.0005, r'= 0{,}632 \times E'),
    ('Ex.4 lecture de tau (µs)', date_charge(5.0, 120, 5.0 * (1 - exp(-1))), 120, 1e-9, r'\tau = 120\ \text{µs} = 1{,}2 \times 10^{-4}\ \text{s}'),
    ('Ex.4 capacité', C_ex4, 3.64e-10, 5e-13, r'= 3{,}64 \times 10^{-10}\ \text{F} = 364\ \text{pF}'),
    ('Ex.4 hauteur lue (cm)', h_ex4, 70, 0.6, r'correspond à $h = 70\ \text{cm}$ environ'),
    ('Ex.4 hauteur dans le fût (cm)', H_ex4, 75, 1e-9, r'H = 70 + 5{,}0 = 75\ \text{cm}'),
    ('Ex.4 volume', V_ex4, 0.20, 0.005, r'\times 0{,}75 = 0{,}20\ \text{m}^3'),
    ('Ex.4 volume en litres', V_ex4 * 1000, 2.0e2, 5, r'soit $2{,}0 \times 10^{2}\ \text{L}$'),
    ('Ex.4 erreur sur la capacité', dC_ex4, 3.0e-12, 5e-14, r'= 3{,}0 \times 10^{-12}\ \text{F} = 3{,}0\ \text{pF}'),
    ('Ex.4 capacité à 80 cm (pF)', C80, 389, 0.5, r'389 - 177 = 212\ \text{pF}'),
    ('Ex.4 pente de l\'étalonnage', (C80 - C0_et) / 80, 2.65, 0.005, r'soit $2{,}65\ \text{pF}$ par centimètre'),
    ('Ex.4 erreur sur la hauteur', dh_ex4, 1.1, 0.05, r'= 1{,}1\ \text{cm}'),
    ('Ex.4 erreur en litres', dV_ex4, 3, 0.5, r'soit environ $3\ \text{L}$'),
]

# relations de L'essentiel (« À connaître par cœur », « À savoir retrouver » et « Fourni par l'énoncé ») : vérifiées
# numériquement sur des valeurs quelconques, avec une dérivée calculée par différence finie, puis cherchées telles
# quelles dans la fiche
def derivee(f, t, h=1e-6):
    return (f(t + h) - f(t - h)) / (2 * h)
rel_faux = []
for E, U0, R, C, Us in ((5.0, 6.0, 10e3, 2.0e-6, 4.0), (12.0, 9.0, 470.0, 4.7e-3, 3.0)):
    tau = R * C
    uc = lambda t: E * (1 - exp(-t / tau))                       # charge sous E, condensateur déchargé à t = 0
    ud = lambda t: U0 * exp(-t / tau)                            # décharge depuis U0
    for t in (0.3 * tau, tau, 2.7 * tau):
        if abs(derivee(uc, t) + uc(t) / tau - E / tau) > 1e-6 * E / tau: rel_faux.append('équation de la charge')
        if abs(derivee(ud, t) + ud(t) / tau) > 1e-6 * U0 / tau: rel_faux.append('équation de la décharge')
        i = C * derivee(uc, t)                                   # relation du condensateur
        if abs(i - E / R * exp(-t / tau)) > 1e-6 * E / R: rel_faux.append('intensité pendant la charge')
        if abs(R * i - E * exp(-t / tau)) > 1e-6 * E or abs(R * i - (E - uc(t))) > 1e-6 * E: rel_faux.append('u_R pendant la charge')
    if uc(0) != 0 or abs(uc(50 * tau) - E) > 1e-9 or ud(0) != U0 or ud(50 * tau) > 1e-9: rel_faux.append('valeurs initiale et finale')
    if abs(uc(tau) / E - 0.63) > 0.005 or abs(ud(tau) / U0 - 0.37) > 0.005 or abs(uc(5 * tau) - E) > 0.01 * E or ud(5 * tau) > 0.01 * U0:
        rel_faux.append('valeurs remarquables')
    if abs(uc(tau * log(E / (E - Us))) - Us) > 1e-9 or abs(ud(tau * log(U0 / Us)) - Us) > 1e-9: rel_faux.append("instant d'un seuil")
    # chaque étiquette va avec la bonne phase : la formule « charge » ne convient pas à la décharge, et inversement
    if abs(ud(tau * log(E / (E - Us))) - Us) < 1e-3 or abs(uc(tau * log(U0 / Us)) - Us) < 1e-3: rel_faux.append("étiquettes charge et décharge")
    if abs(ud(tau) / U0 - 0.63) < 0.005 or abs(uc(tau) / E - 0.37) < 0.005: rel_faux.append("étiquettes charge et décharge")
# rubrique « Fourni par l'énoncé » : sens de variation de la capacité d'un condensateur plan, C = e0 * er * S / e,
# vérifié en faisant varier une seule grandeur à la fois autour de plusieurs situations
plan = lambda er, S, e: e0 * er * S / e
for er, S, e in ((1.0, 6.0e-2, 1.0e-4), (2.2, 1.13e-4, 25e-6), (3.0, 2.0e-3, 0.40e-3)):
    for k in (0.5, 1.1, 3.0):
        plus = k > 1
        if (plan(er, k * S, e) > plan(er, S, e)) != plus: rel_faux.append('condensateur plan : sens de variation avec S')
        if (plan(k * er, S, e) > plan(er, S, e)) != plus: rel_faux.append('condensateur plan : sens de variation avec er')
        if (plan(er, S, k * e) < plan(er, S, e)) != plus: rel_faux.append('condensateur plan : sens de variation avec e')
ecritures = [r'$\tau = R \times C$',
             r'$\dfrac{\mathrm{d}u_C}{\mathrm{d}t} + \dfrac{u_C}{\tau} = \dfrac{E}{\tau} \quad \text{et} \quad u_C = E\left(1 - e^{-t/\tau}\right)$',
             r'$\dfrac{\mathrm{d}u_C}{\mathrm{d}t} + \dfrac{u_C}{\tau} = 0 \quad \text{et} \quad u_C = U_0\, e^{-t/\tau}$',
             r'$i = \dfrac{E}{R}\, e^{-t/\tau} \quad \text{et} \quad u_R = E\, e^{-t/\tau}$',
             r'$u_C(\tau) = 0{,}63\,E$ (charge), $0{,}37\,U_0$ (décharge)',
             r'$t_s = \tau \ln \dfrac{E}{E - U_s}$ (charge), $\tau \ln \dfrac{U_0}{U_s}$ (décharge)',
             r'Condensateur plan ($C$ croît avec $S$ et $\varepsilon_r$, décroît avec $e$), $\varepsilon_0$, énergie stockée, souvent la solution.']
essentiel = src[src.index('# L\'essentiel'):src.index('# Ce qui est tombé')]
rel_absentes = [w for w in ecritures if w not in essentiel]
print('--- relations de L\'essentiel : %d écriture(s) suivie(s), %d erreur(s), %d introuvable(s)' % (len(ecritures), len(set(rel_faux)), len(rel_absentes)))
for n in sorted(set(rel_faux)): print('   RELATION FAUSSE :', n)
for w in rel_absentes: print('   RELATION INTROUVABLE :', w)

ecarts = [(n, cc, i) for n, cc, i, t, _ in controles if abs(cc - i) > t]
absents = [(n, w) for n, _, _, _, w in controles if w not in src]
print('--- comparaison avec la fiche : %d valeurs contrôlées, %d écart(s), %d écriture(s) introuvable(s)' % (len(controles), len(ecarts), len(absents)))
for n, cc, i in ecarts: print('   ÉCART', n, ': recalculé %.5g, imprimé %.5g' % (cc, i))
for n, w in absents: print('   INTROUVABLE', n, ':', w)

# niveaux des questions : ligne d'information et tableau « Votre parcours »
niveaux = {int(q): int(n) for q, n in re.findall(r'^## \[Q\.(\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)', src, flags=re.M)}
attendu = {10: [1, 2, 3, 4, 6, 7, 8, 9, 12, 13, 14, 17], 14: [5, 10, 11, 15, 18, 19], 18: [16]}
faux_niv = [(q, n) for n, qs in attendu.items() for q in qs if niveaux.get(q) != n]
manque = sorted(set(niveaux) - {q for qs in attendu.values() for q in qs})
print('--- niveaux : %d questions, %d écart(s) avec le parcours' % (len(niveaux), len(faux_niv) + len(manque)))
for q, n in faux_niv: print('   NIVEAU Q.%d : %s dans la fiche, %d dans le parcours' % (q, niveaux.get(q), n))
parcours = ['| Q.1 à Q.4, Q.6 à Q.9, Q.12 à Q.14, Q.17 |', '| Plus Q.5, Q.10, Q.11, Q.15, Q.18, Q.19 |']
perdus = [p for p in parcours if p not in src]
for p in perdus: print('   PARCOURS INTROUVABLE :', p)

# tableau « Ce qui est tombé » et phrases qui le résument
bloc = src[src.index('# Ce qui est tombé'):src.index('Ce qu\'il faut en retenir')]
lignes = [l for l in bloc.splitlines() if l.startswith('| ') and not l.startswith('| Session')]
notions = [l.split('|')[3].lower() for l in lignes]
si = [l for l in lignes if 'ingénieur' in l.lower()]
comptes = [('exercices', len(lignes), 7), ('sciences de l\'ingénieur', len(si), 0),
           ('équation différentielle', len([n for n in notions if 'équation' in n]), 7),
           ('constante de temps', len([n for n in notions if 'constante de temps' in n]), 7),
           ('capteur ou épaisseur', len([n for n in notions if 'capteur' in n or 'épaisseur' in n]), 3),
           ('décharge', len([n for n in notions if 'décharge' in n]), 2),
           ('instant ou seuil', len([n for n in notions if 'instant' in n or 'seuil' in n]), 2),
           ('énergie', len([n for n in notions if 'énergie' in n]), 1),
           ('sessions 2026', len([l for l in lignes if '2026' in l.split('|')[1]]), 4)]
mauvais = [cc for cc in comptes if cc[1] != cc[2]]
print('--- tableau : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s)' % len(mauvais))
phrases = ['au moins sept exercices des sessions 2025 et 2026', 'sont demandées dans les sept exercices',
           'Trois exercices utilisent le condensateur comme capteur', 'Deux sujets de 2026 demandent un instant ou une durée',
           'La décharge apparaît dans deux sujets', 'dans un seul', 'Six sujets en 2025 et 2026',
           'Cinq sujets en 2025 et 2026', 'Demandée deux fois en 2025']
perdues = [p for p in phrases if p not in src]
for p in perdues: print('   PHRASE INTROUVABLE :', p)
print('--- phrases de synthèse : %d suivies, %d introuvable(s)' % (len(phrases), len(perdues)))
if ecarts or absents or faux_niv or manque or perdus or mauvais or perdues or rel_faux or rel_absentes:
    raise SystemExit(1)
print('--- tout est bon')
