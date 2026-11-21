# Recalcul indépendant des résultats numériques de la fiche 12 (Équilibre, piles et électrolyse),
# puis contrôle de la structure : équations chimiques équilibrées (éléments et charges), données des énoncés,
# niveaux et parcours, tableau « Ce qui est tombé » et mentions « Demandé ... », exercices d'après un sujet, figures et index.
# usage : python3 outils/verifs/pc-12-equilibre-piles-electrolyse.py
import os, re
from math import log10, sqrt
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(RACINE, 'fiches', 'pc-12-equilibre-piles-electrolyse', 'fiche.md'), encoding='utf-8').read()
figsrc = open(os.path.join(RACINE, 'outils', 'figures', 'pc-12-equilibre-piles-electrolyse.py'), encoding='utf-8').read()
enonces = src[:src.index('<!--debut:complet-->')]
NQ, NEX, NFIG = 19, 5, 15
F = 9.65e4
MA = {'H': 1.008, 'C': 12.01, 'O': 16.00, 'Li': 6.94}

def cellules(debut):
    # cellules d'une ligne de tableau de la fiche, repérée par sa première cellule (sans celle-ci)
    l = [x for x in src.splitlines() if x.startswith('| ' + debut + ' |')]
    if not l or len(set(l)) != 1: return None
    return [c.strip() for c in l[0].strip().strip('|').split('|')[1:]]
def ligne(debut):
    # valeurs numériques d'une ligne de tableau ($0{,}50$ ou 0,50) ; None pour une case vide (colonne de la flèche)
    c = cellules(debut)
    if c is None: return None
    return [float(x.strip('$').replace('{,}', '.').replace(',', '.')) if x else None for x in c]
def composition(formule):
    comp = {}
    for e, n in re.findall(r'([A-Z][a-z]?)(\d*)', formule): comp[e] = comp.get(e, 0) + int(n or 1)
    return comp
def masse(formule):
    return sum(MA[e] * int(n or 1) for e, n in re.findall(r'([A-Z][a-z]?)(\d*)', formule))

# Thème 1 : quotient de réaction et état d'équilibre
K1 = 1.0e-14 / 10 ** -9.2
cFe, cZn = 1.00e-1 * 100 / 300, 1.00e-1 * 200 / 300
x4 = 0.50 * 2 / 3                                   # (x / (0,50 - x))^2 = 4
poly5 = (4.0 - 1, -4.0 * 1.50, 4.0 * 0.50 * 1.00)   # x^2 = 4 (0,50 - x)(1,00 - x)
x5 = (6 - sqrt(12)) / 6; x5b = (6 + sqrt(12)) / 6
nA, nB = 0.960 * 18.4 / 88.1, 0.789 * 17.5 / 46.1
poly1 = (4.0 - 1, -4.0 * (0.200 + 0.300), 4.0 * 0.200 * 0.300)
d1 = 2 ** 2 - 4 * 3 * 0.24; x1, x2 = (2 - sqrt(d1)) / 6, (2 + sqrt(d1)) / 6
# Thème 2 : oxydoréduction et piles
nCu, nAl = 0.40 * 0.100, 1.0 / 27.0
xm = min(nCu / 3, nAl / 2); Qm = 6 * xm * F
cm = {n: z * 1000 * F / (M * 3600) for n, z, M in (('Li', 1, 6.94), ('Zn', 2, 65.4), ('Al', 3, 27.0))}
QLi = 0.70e-3 * 3.86e3
n_eth = 0.79 * 1000 / 46.1; nH2_2 = 6 * n_eth; ne2 = 2 * nH2_2; Q2 = ne2 * F; E2 = 0.80 * Q2
Q3 = 3.0 * 3600; ne3 = Q3 / F
# Thème 3 : électrolyse et accumulateurs
dt17 = 2 * 1.0 * F / (58.7 * 2.0)
nH2_18 = 5.0e3 / 24; ne18 = 2 * nH2_18
n4 = 50 / 58.7; dt4 = 2 * n4 * F / 2.0; Q4 = 2 * 1.44e5 / 58.7 * F
ne5 = 0.40 * 15 * 60 / F; E5 = 2.0 * 2 * (1000 / 2.0) * F; E5kWh = E5 / 3.6e6

controles = [
    # L'essentiel, « À savoir retrouver » : E = P × Δt et P = U × I donnent E = U × I × Δt = U × Q (Q = I × Δt) ;
    # avec Δt en heures, Q = I × Δt est en A·h et E = P × Δt en W·h ; 1 h = 3 600 s donne 1 A·h = 3 600 C et 1 W·h = 3 600 J
    # (conversions écrites dans les corrigés de Q.12, Q.13 et Q.19) ; exemple de Q.19 : 12 V et 60 A·h, soit 720 W·h
    ('L\'essentiel : 1 h en secondes', 60 * 60, 3600, 0, '$\\Delta t$ en heures, avec $1\\ \\text{h} = 3\\,600\\ \\text{s}$, donne'),
    ('L\'essentiel : 1 A·h = 1 A × 3 600 s en coulombs (Q = I × Δt), comme au corrigé de Q.12', 1.0 * (60 * 60), 3600, 0, '$1\\ \\text{A·h} = 3\\,600\\ \\text{C}$.\n:::'),
    ('L\'essentiel : 1 W·h = 1 W × 3 600 s en joules (E = P × Δt), comme au corrigé de Q.13', 1.0 * (60 * 60), 3600, 0, 'et $1\\ \\text{W·h} = 3\\,600\\ \\text{J}$\n:::'),
    ('L\'essentiel : E = U × Q avec Q en A·h donne des W·h (Q.19 : 12 V × 60 A·h)', 12 * (60 * 3600) / 3600, 12 * 60, 1e-9,
     '| Énergie électrique | $E = U \\times I \\times \\Delta t = U \\times Q$ | Combiner $E = P \\times \\Delta t$, $P = U \\times I$ et $Q = I \\times \\Delta t$ ; $\\Delta t$ en heures, avec $1\\ \\text{h} = 3\\,600\\ \\text{s}$, donne $Q$ en $\\text{A·h}$ et $E$ en $\\text{W·h}$. |'),
    ('L\'essentiel : « Comment la retrouver » en une seule phrase',
     [len(re.findall(r'\.(?:\s|$)', re.sub(r'\$[^$]*\$', 'F', c[3]))) for c in
      (l.split('|') for l in src[src.index('Comment la retrouver |'):src.index('Fourni par l\'énoncé')].splitlines()[2:]) if len(c) > 4],
     [1], None, '| Notion | Relation | Comment la retrouver |'),
    ('L\'essentiel : seuil de transformation totale fourni par l\'énoncé de Q.4, comme dans le corrigé',
     '$K > 10^4$ d\'une transformation totale' in src and 'Donnée : on considère qu\'une transformation est totale lorsque $K > 10^4$.' in enonces
     and 'on la considère comme totale lorsque $K > 10^4$' in src, True, 0, 'le seuil $K > 10^4$ d\'une transformation totale'),
    ('Q.4 seuil : K = 4,0 < 10^4 (non totale) et K = 10^11 > 10^4 (totale)', (4.0 > 1e4, 1e11 > 1e4), (False, True), None,
     'Pour la transformation de Q.3, $K = 10^{11}$ est bien supérieure à $10^4$ : elle est considérée comme totale'),
    ('Q.2 log K1', log10(K1), -4.8, 1e-9, '= 10^{-4{,}8} = 1{,}6 \\times 10^{-5}$$'),
    ('Q.2 constante K1', K1, 1.6e-5, 0.05e-5, '= 10^{-4{,}8} = 1{,}6 \\times 10^{-5}$$'),
    ('Q.2 constante de la réaction inverse', 1 / K1, 6.3e4, 0.05e4, '$\\dfrac{1}{K_1} = 10^{4{,}8} = 6{,}3 \\times 10^{4}$'),
    ('Q.3 [Fe2+] initiale', cFe, 3.33e-2, 0.005e-2, '= 3{,}33 \\times 10^{-2}\\ \\text{mol·L}^{-1}$$'),
    ('Q.3 [Zn2+] initiale', cZn, 6.67e-2, 0.005e-2, '= 6{,}67 \\times 10^{-2}\\ \\text{mol·L}^{-1}$$'),
    ('Q.3 quotient initial', cZn / cFe, 2.0, 1e-9, '\\dfrac{6{,}67 \\times 10^{-2}}{3{,}33 \\times 10^{-2}} = 2{,}00$$'),
    ('Q.3 sens direct', cZn / cFe < 1e11, True, 0, '$Q_\\text{r,i} = 2{,}00 < K = 10^{11}$ : le système évolue spontanément dans le sens direct'),
    ('Q.3 estérification : quotient initial', (0.50 * 0.50) / (0.10 * 0.10), 25.0, 1e-9, '= \\dfrac{0{,}50 \\times 0{,}50}{0{,}10 \\times 0{,}10} = 25$$'),
    ('Q.3 estérification : sens indirect', (0.50 * 0.50) / (0.10 * 0.10) > 4.0, True, 0, '$Q_\\text{r,i} = 25 > K = 4{,}0$ : le système évolue dans le sens indirect'),
    ('Q.4 avancement final vérifie K', (x4 / (0.50 - x4)) ** 2, 4.0, 1e-9, '= \\left(\\dfrac{x_\\text{f}}{0{,}50 - x_\\text{f}}\\right)^2 = 4{,}0$$'),
    ('Q.4 avancement final', x4, 0.333, 0.0005, '$$x_\\text{f} = \\dfrac{1{,}00}{3} = 0{,}333\\ \\text{mol} \\qquad'),
    ('Q.4 taux d\'avancement', x4 / 0.50, 0.67, 0.005, '= \\dfrac{0{,}333}{0{,}50} = 0{,}67, \\text{ soit } 67\\ \\%$$'),
    ('Q.5 polynôme 3x² - 6x + 2', poly5, (3.0, -6.0, 2.0), None, '$3\\,x_\\text{f}^2 - 6\\,x_\\text{f} + 2 = 0$'),
    ('Q.5 développement', (4.0 * 0.50, 4.0 * 1.50), (2.0, 6.0), None, '= 2{,}0 - 6{,}0\\,x_\\text{f} + 4{,}0\\,x_\\text{f}^2$'),
    ('Q.5 avancement final', x5, 0.423, 0.0005, '$$x_\\text{f} = \\dfrac{6 - \\sqrt{12}}{6} = 0{,}423\\ \\text{mol} \\qquad'),
    ('Q.5 avancement final vérifie K', x5 ** 2 / ((0.50 - x5) * (1.00 - x5)), 4.0, 1e-9, '\\times (1{,}00 - x_\\text{f})} = 4{,}0$$'),
    ('Q.5 seconde racine', x5b, 1.58, 0.005, '\\dfrac{6 + \\sqrt{12}}{6} = 1{,}58\\ \\text{mol}$ dépasse $x_\\text{max} = 0{,}50\\ \\text{mol}$'),
    ('Q.5 taux d\'avancement', 0.423 / 0.50, 0.85, 0.005, '\\tau = \\dfrac{0{,}423}{0{,}50} = 0{,}85, \\text{ soit } 85\\ \\%$$'),
    ('Q.5 taux supérieur à celui de Q.4', x5 / 0.50 > x4 / 0.50, True, 0, '\\tau = \\dfrac{0{,}423}{0{,}50} = 0{,}85'),
    ('Ex. 1 masse molaire de l\'acide butanoïque', masse('C4H8O2'), 88.1, 0.05, 'Acide butanoïque : $M = 88{,}1\\ \\text{g·mol}^{-1}$'),
    ('Ex. 1 masse molaire de l\'éthanol', masse('C2H6O'), 46.1, 0.05, 'Éthanol : $M = 46{,}1\\ \\text{g·mol}^{-1}$'),
    ('Ex. 1 masse molaire du butanoate d\'éthyle', masse('C6H12O2'), 116, 0.5, 'Butanoate d\'éthyle : $M = 116\\ \\text{g·mol}^{-1}$'),
    ('Ex. 1 acide butanoïque', nA, 0.200, 0.0005, '= \\dfrac{0{,}960 \\times 18{,}4}{88{,}1} = 0{,}200\\ \\text{mol} \\qquad'),
    ('Ex. 1 éthanol', nB, 0.300, 0.0005, '= \\dfrac{0{,}789 \\times 17{,}5}{46{,}1} = 0{,}300\\ \\text{mol}$$'),
    ('Ex. 1 acide limitant', nA < nB, True, 0, 'n_\\text{acide} = \\dfrac{\\rho \\times V}{M}'),
    ('Ex. 1 masse si la transformation était totale', 0.200 * 116, 23.2, 1e-9, '= 0{,}200 \\times 116 = 23{,}2\\ \\text{g}$$'),
    ('Ex. 1 polynôme 3x² - 2x + 0,24', poly1, (3.0, -2.0, 0.24), None, '$3\\,x_\\text{f}^2 - 2\\,x_\\text{f} + 0{,}24 = 0$'),
    ('Ex. 1 développement', (4.0 * 0.0600, 4.0 * 0.500), (0.240, 2.00), None, '= 0{,}240 - 2{,}00\\,x_\\text{f} + 4{,}00\\,x_\\text{f}^2$'),
    ('Ex. 1 discriminant', d1, 1.12, 1e-9, '\\Delta = 2^2 - 4 \\times 3 \\times 0{,}24 = 1{,}12$'),
    ('Ex. 1 première racine', x1, 0.157, 0.0005, '= 0{,}157\\ \\text{mol} \\qquad x_2'),
    ('Ex. 1 seconde racine', x2, 0.510, 0.0005, '= 0{,}510\\ \\text{mol}$$'),
    ('Ex. 1 racine retenue vérifie K', x1 ** 2 / ((0.200 - x1) * (0.300 - x1)), 4.0, 1e-9, '\\times (0{,}300 - x_\\text{f})} = 4{,}00$$'),
    ('Ex. 1 taux d\'avancement', 0.157 / 0.200, 0.785, 1e-9, '\\tau = \\dfrac{0{,}157}{0{,}200} = 0{,}785, \\text{ soit } 78{,}5\\ \\% \\qquad'),
    ('Ex. 1 masse d\'ester', x1 * 116, 18.2, 0.05, 'm = 0{,}157 \\times 116 = 18{,}2\\ \\text{g}$$'),
    ('Q.11 quotient initial', 0.40 ** 2 / 0.40 ** 3, 2.5, 1e-9, '= \\dfrac{1}{0{,}40} = 2{,}5$$'),
    ('Q.12 ions cuivre(II)', nCu, 4.0e-2, 1e-12, 'n(\\text{Cu}^{\\text{2+}}) = 0{,}40 \\times 0{,}100 = 4{,}0 \\times 10^{-2}\\ \\text{mol} \\qquad'),
    ('Q.12 aluminium', nAl, 3.7e-2, 0.05e-2, '= \\dfrac{1{,}0}{27{,}0} = 3{,}7 \\times 10^{-2}\\ \\text{mol}$$'),
    ('Q.12 avancement maximal (cuivre)', nCu / 3, 1.3e-2, 0.05e-2, '= 1{,}3 \\times 10^{-2}\\ \\text{mol} \\qquad \\dfrac{3{,}7'),
    ('Q.12 avancement maximal (aluminium)', nAl / 2, 1.9e-2, 0.05e-2, '\\dfrac{3{,}7 \\times 10^{-2}}{2} = 1{,}9 \\times 10^{-2}\\ \\text{mol}$$'),
    ('Q.12 électrons échangés', 6 * xm, 8.0e-2, 1e-12, '= 2 \\times n(\\text{Cu}^{\\text{2+}}) = 8{,}0 \\times 10^{-2}\\ \\text{mol}$$'),
    ('Q.12 capacité (C)', Qm, 7.7e3, 0.05e3, '= 7{,}7 \\times 10^{3}\\ \\text{C}, \\text{ soit } \\dfrac{7\\,720}{3\\,600}'),
    ('Q.12 capacité (valeur détaillée)', Qm, 7720, 0.5, '\\dfrac{7\\,720}{3\\,600} = 2{,}1\\ \\text{A·h}$$'),
    ('Q.12 capacité (A·h)', Qm / 3600, 2.1, 0.05, '= 2{,}1\\ \\text{A·h}$$'),
    ('Q.12 durée (s)', Qm / 0.10, 7.7e4, 0.05e4, '= 7{,}7 \\times 10^{4}\\ \\text{s}, \\text{ soit environ } 21\\ \\text{h}$$'),
    ('Q.12 durée (h)', Qm / 0.10 / 3600, 21, 0.5, '\\text{ soit environ } 21\\ \\text{h}$$'),
    ('Q.12 aluminium restant', nAl - 2 * xm, 1.0e-2, 0.05e-2, '= 1{,}0 \\times 10^{-2}\\ \\text{mol}$ d\'aluminium'),
    ('Q.13 capacité massique du lithium', cm['Li'], 3.86e3, 0.005e3, '= 3{,}86 \\times 10^{3}\\ \\text{A·h·kg}^{-1}$$'),
    ('Q.13 capacité massique du zinc', cm['Zn'], 8.20e2, 0.005e2, '= 8{,}20 \\times 10^{2}\\ \\text{A·h·kg}^{-1}$$'),
    ('Q.13 capacité massique de l\'aluminium', cm['Al'], 2.98e3, 0.005e3, '= 2{,}98 \\times 10^{3}\\ \\text{A·h·kg}^{-1}$$'),
    ('Q.13 pile la plus légère', max(cm, key=cm.get), 'Li', None, '= 3{,}86 \\times 10^{3}'),
    ('Q.13 capacité de la pile au lithium', QLi, 2.7, 0.05, '= 0{,}70 \\times 10^{-3} \\times 3{,}86 \\times 10^{3} = 2{,}7\\ \\text{A·h}$'),
    ('Q.13 énergie (W·h)', 3.0 * 2.7, 8.1, 1e-9, '= 3{,}0 \\times 2{,}7 = 8{,}1\\ \\text{W·h}, \\text{ soit }'),
    ('Q.13 énergie (J)', 8.1 * 3600, 2.9e4, 0.05e4, '= 2{,}9 \\times 10^{4}\\ \\text{J}$$'),
    ('Ex. 2 éthanol', n_eth, 17.1, 0.05, '= \\dfrac{0{,}79 \\times 1\\,000}{46{,}1} = 17{,}1\\ \\text{mol} \\qquad'),
    ('Ex. 2 dihydrogène', nH2_2, 1.03e2, 0.005e2, 'n(\\text{H}_2) = 6 \\times 17{,}1 = 1{,}03 \\times 10^{2}\\ \\text{mol}$$'),
    ('Ex. 2 dihydrogène (environ 1,0 × 10^2 mol)', nH2_2, 1.0e2, 0.05e2, 'environ $1{,}0 \\times 10^{2}\\ \\text{mol}$ de dihydrogène'),
    ('Ex. 2 électrons', ne2, 2.06e2, 0.005e2, '= 2{,}06 \\times 10^{2}\\ \\text{mol} \\qquad Q'),
    ('Ex. 2 quantité d\'électricité', Q2, 2.0e7, 0.05e7, '= 2{,}0 \\times 10^{7}\\ \\text{C}$$'),
    ('Ex. 2 énergie (J)', E2, 1.6e7, 0.05e7, '= 0{,}80 \\times 2{,}0 \\times 10^{7} = 1{,}6 \\times 10^{7}\\ \\text{J}'),
    ('Ex. 2 énergie (kW·h)', E2 / 3.6e6, 4.4, 0.05, '= 4{,}4\\ \\text{kW·h}$$'),
    ('Ex. 2 litres d\'éthanol', 40 / (E2 / 3.6e6), 9, 0.1, 'il faut $\\dfrac{40}{4{,}4}$, soit environ $9\\ \\text{L}$ d\'éthanol'),
    ('Ex. 3 masse molaire de LiC6', masse('LiC6'), 79.0, 0.05, '$M(\\text{LiC}_6) = 79{,}0\\ \\text{g·mol}^{-1}$'),
    ('Ex. 3 charge d\'une cellule', Q3, 1.08e4, 1e-9, 'Q = 3{,}0 \\times 3\\,600 = 1{,}08 \\times 10^{4}\\ \\text{C} \\qquad'),
    ('Ex. 3 électrons', ne3, 0.112, 0.0005, '= \\dfrac{1{,}08 \\times 10^{4}}{9{,}65 \\times 10^{4}} = 0{,}112\\ \\text{mol}$$'),
    ('Ex. 3 masse de LiC6', ne3 * 79.0, 8.8, 0.05, '= 0{,}112 \\times 79{,}0 = 8{,}8\\ \\text{g}$$'),
    ('Ex. 3 énergie d\'une cellule', 3.6 * 3.0, 10.8, 1e-9, '= 3{,}6 \\times 3{,}0 = 10{,}8\\ \\text{W·h} \\qquad'),
    ('Ex. 3 énergie de la batterie', 40 * 10.8, 4.3e2, 2, '= 40 \\times 10{,}8 = 4{,}3 \\times 10^{2}\\ \\text{W·h}$$'),
    ('Ex. 3 autonomie', 432 / 10, 43, 0.5, '$\\dfrac{4{,}3 \\times 10^{2}}{10} = 43\\ \\text{km}$ environ'),
    ('Q.14 quotient de réaction', 0.15 / 0.050, 3.0, 1e-9, '= \\dfrac{0{,}15}{0{,}050} = 3{,}0$$'),
    ('Q.14 sens direct', 0.15 / 0.050 < 1e37, True, 0, '$Q_\\text{r} = 3{,}0$ est très inférieur à $K = 10^{37}$'),
    ('Q.17 durée (s)', dt17, 1.6e3, 0.05e3, '= 1\\,644\\ \\text{s}, \\text{ soit } 1{,}6 \\times 10^{3}\\ \\text{s ou environ } 27\\ \\text{min}$$'),
    ('Q.17 durée (valeur non arrondie)', dt17, 1644, 0.5, '= 3{,}0 \\times 2{,}0 \\times 1\\,644 = 9{,}9'),
    ('Q.17 durée (min)', dt17 / 60, 27, 0.5, '\\text{s ou environ } 27\\ \\text{min}$$'),
    ('Q.17 énergie (J)', 3.0 * 2.0 * dt17, 9.9e3, 0.05e3, '= 9{,}9 \\times 10^{3}\\ \\text{J}, \\text{ soit } 2{,}7\\ \\text{W·h}$$'),
    ('Q.17 énergie (W·h)', 3.0 * 2.0 * dt17 / 3600, 2.7, 0.05, '\\text{ soit } 2{,}7\\ \\text{W·h}$$'),
    # méthode de Q.17 : F = N_A × e avec N_A = 6,022 × 10^23 mol^-1 et e = 1,602 × 10^-19 C (avec 6,02 et 1,60, on trouverait 9,63 × 10^4)
    ('Q.17 constante de Faraday F = N_A × e', 6.022e23 * 1.602e-19, F, 0.005e4,
     'F = N_\\text{A} \\times e \\approx 9{,}65 \\times 10^{4}\\ \\text{C·mol}^{-1}$ (avec $N_\\text{A} = 6{,}022 \\times 10^{23}\\ \\text{mol}^{-1}$ et $e = 1{,}602 \\times 10^{-19}\\ \\text{C}$)'),
    ('Q.18 dihydrogène', nH2_18, 2.1e2, 0.05e2, '= \\dfrac{5{,}0 \\times 10^{3}}{24} = 2{,}1 \\times 10^{2}\\ \\text{mol}$$'),
    ('Q.18 électrons', ne18, 4.2e2, 0.05e2, '= 4{,}2 \\times 10^{2}\\ \\text{mol} \\qquad I'),
    ('Q.18 électrons (valeur intermédiaire)', ne18, 4.17e2, 0.005e2, '\\dfrac{4{,}17 \\times 10^{2} \\times 9{,}65 \\times 10^{4}}{3\\,600}'),
    ('Q.18 intensité', ne18 * F / 3600, 1.1e4, 0.05e4, '= 1{,}1 \\times 10^{4}\\ \\text{A}$$'),
    ('Q.19 énergie (W·h)', 12 * 60, 720, 0, '= 12 \\times 60 = 720\\ \\text{W·h}'),
    ('Q.19 énergie (J)', 720 * 3600, 2.6e6, 0.05e6, '= 2{,}6 \\times 10^{6}\\ \\text{J}$$'),
    ('Ex. 4 masse de nickel', 9.0e3 * 0.016, 1.4e2, 5, '= 9{,}0 \\times 10^{3} \\times 0{,}016 = 144\\ \\text{kg}'),
    ('Ex. 4 masse de nickel (valeur détaillée)', 9.0e3 * 0.016, 144, 1e-9, '\\text{ soit } 1{,}4 \\times 10^{2}\\ \\text{kg}$$'),
    ('Ex. 4 nickel déposé', n4, 0.852, 0.0005, '= \\dfrac{50}{58{,}7} = 0{,}852\\ \\text{mol} \\qquad'),
    ('Ex. 4 électrons', 2 * n4, 1.70, 0.005, '= 2 \\times 0{,}852 = 1{,}70\\ \\text{mol}$$'),
    ('Ex. 4 durée (s)', dt4, 8.2e4, 0.05e4, '= 8{,}2 \\times 10^{4}\\ \\text{s}, \\text{ soit environ } 23\\ \\text{h}$$'),
    ('Ex. 4 durée (h)', dt4 / 3600, 23, 0.5, '\\text{ soit environ } 23\\ \\text{h}$$'),
    ('Ex. 4 charge pour une parcelle', Q4, 4.73e8, 0.005e8, '\\times 9{,}65 \\times 10^{4} = 4{,}73 \\times 10^{8}\\ \\text{C} \\qquad'),
    ('Ex. 4 intensité en 30 jours', Q4 / (30 * 86400), 1.8e2, 0.05e2, '= \\dfrac{4{,}73 \\times 10^{8}}{30 \\times 86\\,400} = 1{,}8 \\times 10^{2}\\ \\text{A}$$'),
    ('Ex. 5 électrons', ne5, 3.7e-3, 0.05e-3, '= \\dfrac{0{,}40 \\times 15 \\times 60}{9{,}65 \\times 10^{4}} = 3{,}73 \\times 10^{-3}\\ \\text{mol}, \\text{ soit } 3{,}7 \\times 10^{-3}\\ \\text{mol}$$'),
    ('Ex. 5 dihydrogène', ne5 / 2, 1.87e-3, 0.005e-3, '= 1{,}87 \\times 10^{-3}\\ \\text{mol}$ et'),
    ('Ex. 5 dioxygène', ne5 / 4, 9.33e-4, 0.005e-4, '= 9{,}33 \\times 10^{-4}\\ \\text{mol}$.'),
    ('Ex. 5 volume de dihydrogène (L)', 1.87e-3 * 24, 4.5e-2, 0.05e-2, '= 1{,}87 \\times 10^{-3} \\times 24 = 4{,}5 \\times 10^{-2}\\ \\text{L} = 45\\ \\text{mL} \\qquad'),
    ('Ex. 5 volume de dioxygène (mL)', 9.33e-4 * 24e3, 22, 0.5, '= 9{,}33 \\times 10^{-4} \\times 24 = 22\\ \\text{mL}$$'),
    ('Ex. 5 dihydrogène pour 1,0 kg', 1000 / 2.0, 5.0e2, 0, '= \\dfrac{1\\,000}{2{,}0} = 5{,}0 \\times 10^{2}\\ \\text{mol} \\qquad'),
    ('Ex. 5 charge pour 1,0 kg', 2 * 500 * F, 9.65e7, 1e-6, '= 2 \\times 5{,}0 \\times 10^{2} \\times 9{,}65 \\times 10^{4} = 9{,}65 \\times 10^{7}\\ \\text{C}$$'),
    ('Ex. 5 énergie pour 1,0 kg (J)', E5, 1.93e8, 1e-6, '= 2{,}0 \\times 9{,}65 \\times 10^{7} = 1{,}93 \\times 10^{8}\\ \\text{J}'),
    ('Ex. 5 énergie pour 1,0 kg (kW·h)', E5kWh, 54, 0.5, '= 53{,}6\\ \\text{kW·h}, \\text{ soit environ } 54\\ \\text{kW·h}$$'),
    ('Ex. 5 énergie pour 1,0 kg (valeur détaillée)', E5kWh, 53.6, 0.05, '$400 \\times 53{,}6 = 2{,}1 \\times 10^{4}\\ \\text{kW·h}$'),
    ('Ex. 5 énergie pour 400 kg', 400 * E5kWh, 2.1e4, 0.05e4, '$400 \\times 53{,}6 = 2{,}1 \\times 10^{4}\\ \\text{kW·h}$, soit $21\\ \\text{MW·h}$ par jour'),
    ('Ex. 5 production moyenne de l\'éolienne', 750 / 30, 25, 0, '$\\dfrac{750}{30} = 25\\ \\text{MW·h}$ par jour'),
    ('Ex. 5 l\'éolienne suffit en moyenne', 400 * E5kWh / 1000 < 750 / 30, True, 0, 'en moyenne, elle suffirait, avec une faible marge'),
]
# données des énoncés utilisées dans les corrigés (la fiche et le cahier d'énoncés les reprennent)
donnees = ['$V_1 = 100\\ \\text{mL}$ d\'une solution de sulfate de fer(II) de concentration $C_1 = 1{,}00 \\times 10^{-1}\\ \\text{mol·L}^{-1}$ et $V_2 = 200\\ \\text{mL}$',
           'de constante $K = 10^{11}$ à $25\\ \\text{°C}$',
           'on mélange $0{,}50\\ \\text{mol}$ d\'acide éthanoïque et $0{,}50\\ \\text{mol}$ d\'éthanol. L\'estérification, de constante $K = 4{,}0$',
           'en mélangeant cette fois $0{,}50\\ \\text{mol}$ d\'acide éthanoïque et $1{,}00\\ \\text{mol}$ d\'éthanol',
           'On introduit dans le ballon $18{,}4\\ \\text{mL}$ d\'acide butanoïque et $17{,}5\\ \\text{mL}$ d\'éthanol',
           'la constante d\'équilibre de la réaction vaut $K = 4{,}00$',
           '$\\rho = 0{,}960\\ \\text{g·mL}^{-1}$. Éthanol : $M = 46{,}1\\ \\text{g·mol}^{-1}$, $\\rho = 0{,}789\\ \\text{g·mL}^{-1}$',
           '$[\\text{Al}^{\\text{3+}}]_\\text{i} = [\\text{Cu}^{\\text{2+}}]_\\text{i} = 0{,}40\\ \\text{mol·L}^{-1}$',
           'un volume $V = 100\\ \\text{mL}$ et la lame d\'aluminium a une masse $m = 1{,}0\\ \\text{g}$',
           'sa durée de fonctionnement lorsqu\'elle débite un courant d\'intensité constante $0{,}10\\ \\text{A}$',
           'Une pile au lithium de $3{,}0\\ \\text{V}$ contient $0{,}70\\ \\text{g}$ de lithium',
           'Données : $M(\\text{Li}) = 6{,}94\\ \\text{g·mol}^{-1}$ ; $M(\\text{Zn}) = 65{,}4\\ \\text{g·mol}^{-1}$ ; $M(\\text{Al}) = 27{,}0\\ \\text{g·mol}^{-1}$ ; $F = 9{,}65 \\times 10^{4}\\ \\text{C·mol}^{-1}$ ; $1\\ \\text{A·h} = 3\\,600\\ \\text{C}$',
           'Éthanol : $M = 46{,}1\\ \\text{g·mol}^{-1}$, $\\rho = 0{,}79\\ \\text{g·mL}^{-1}$',
           'Tension de fonctionnement de la pile : $U = 0{,}80\\ \\text{V}$',
           'batterie de voiture de $40\\ \\text{kW·h}$',
           'tension $U = 3{,}6\\ \\text{V}$, capacité $Q = 3{,}0\\ \\text{A·h}$',
           'formée de 40 cellules lithium-ion',
           'Le vélo consomme en moyenne $10\\ \\text{W·h}$ par kilomètre',
           '$[\\text{Zn}^{\\text{2+}}] = 0{,}15\\ \\text{mol·L}^{-1}$ et $[\\text{Cu}^{\\text{2+}}] = 0{,}050\\ \\text{mol·L}^{-1}$',
           'déposer $m = 1{,}0\\ \\text{g}$ de nickel sur la pièce de Q.15 avec un courant d\'intensité constante $I = 2{,}0\\ \\text{A}$',
           'Le générateur impose une tension $U = 3{,}0\\ \\text{V}$',
           'produire $5{,}0\\ \\text{m}^3$ de dihydrogène par heure',
           '$V_\\text{m} = 24\\ \\text{L·mol}^{-1}$ ; $F = 9{,}65 \\times 10^{4}\\ \\text{C·mol}^{-1}$',
           'Une parcelle de $1{,}0\\ \\text{ha}$ produit $9{,}0\\ \\text{t}$ de plantes sèches, qui contiennent $1{,}6\\ \\%$ de nickel en masse',
           'déposer $50\\ \\text{g}$ de nickel avec un courant d\'intensité $2{,}0\\ \\text{A}$',
           'pendant $15\\ \\text{min}$ avec un courant d\'intensité $I = 0{,}40\\ \\text{A}$',
           'L\'électrolyseur industriel fonctionne sous une tension $U = 2{,}0\\ \\text{V}$',
           'En novembre, mois de 30 jours, l\'éolienne a produit $750\\ \\text{MW·h}$',
           'production de $400\\ \\text{kg}$ de dihydrogène par jour',
           'de constante $K = 10^{11}$ ? Donnée : on considère qu\'une transformation est totale lorsque $K > 10^4$.']
# tableau d'avancement de Q.4, au format de la maison : espèces de l'équation, état liquide écrit (ℓ) comme partout ailleurs
# dans la fiche (un « (l) » se lit « (I) » en gras), flèche « ⇄ » (transformation non totale),
# quantités initiales de l'énoncé, puis lignes « En cours » et « État final »
tete4 = '| État du système | Avancement (mol) | CH~3~COOH(ℓ) | \\+ C~2~H~5~OH(ℓ) | ⇄ | CH~3~COOC~2~H~5~(ℓ) | \\+ H~2~O(ℓ) |'
especes4 = [re.sub(r'\(ℓ\)|[~\\+ ]', '', c) for c in tete4.strip('|').split('|')[2:]]
if [c for c in especes4 if c != '⇄' and not re.fullmatch(r'(?:[A-Z][a-z]?\d*)+', c)]: donnees.append('Q.4 : espèce illisible dans l\'en-tête')
if re.search(r'\(l\)', src): donnees.append('état liquide écrit (l) au lieu de (ℓ)')
# cahier d'énoncés : le thème 3 ouvre une page (saut réservé au cahier), sinon son titre reste seul en bas de la page de l'Ex. 3
if '[CIBLE:c_ex3]{custom-style="BoutonCorrige"}\n:::\n\n<!--debut:cahier-->\n```{=openxml}\n<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n```\n\n<!--fin:cahier-->\n# Thème 3 : électrolyse et accumulateurs {#theme3}' not in src:
    donnees.append('cahier : saut de page avant le thème 3')
# Q.10 ouvre une page dans la fiche et dans le cahier : son énoncé reste entier, avec ses deux demi-équations et la figure 2
if 'Figure 1. La pile cuivre-aluminium\n:::\n\n```{=openxml}\n<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n```\n\n## [Q.10]' not in src:
    donnees.append('saut de page avant Q.10')
reactifs4, produits4 = especes4[:2], especes4[3:]
somme = lambda ff: {e: sum(composition(f).get(e, 0) for f in ff) for e in set().union(*map(composition, ff))}
if tete4 not in src: donnees.append('Q.4 : en-tête du tableau d\'avancement')
if somme(reactifs4) != somme(produits4): donnees.append('Q.4 : équation de l\'en-tête non équilibrée')
if ligne('État initial') != [0, 0.50, 0.50, None, 0, 0]: donnees.append('Q.4 : ligne « État initial » du tableau d\'avancement')
if cellules('En cours') != ['$x$', '$0{,}50 - x$', '$0{,}50 - x$', '', '$x$', '$x$']: donnees.append('Q.4 : ligne « En cours » du tableau d\'avancement')
if cellules('État final') != ['$x_\\text{f}$', '$0{,}50 - x_\\text{f}$', '$0{,}50 - x_\\text{f}$', '', '$x_\\text{f}$', '$x_\\text{f}$']:
    donnees.append('Q.4 : ligne « État final » du tableau d\'avancement')
if 'F = 9{,}65 \\times 10^{4}\\ \\text{C·mol}^{-1}' not in src or '9{,}65 \\times 10^{4}\\ \\text{C}$' in src: donnees.append('unité de la constante de Faraday')
dmanque = [d for d in donnees if d not in enonces]
gaz = {k: int(v) for k, v in re.findall(r"if gaz_(g|d): bulles\(ax, [\d.]+, [\d.]+, [\d.]+, n=(\d+)", figsrc)}
textes = [('Figures 1 et 9 : lame d\'aluminium à gauche, lame de cuivre à droite', 'plaque(ax, 1.35, 1.0, 4.7, ALU); plaque(ax, 10.65, 1.0, 4.7, CU)' in figsrc),
          ('Figure 9 : aluminium borne négative, cuivre borne positive', 'borne(ax, 1.35, 5.2, -1, BRIQUE); borne(ax, 10.65, 5.2, +1, BRIQUE)' in figsrc),
          ('Figure 9 : courant du cuivre vers l\'aluminium, électrons en sens inverse', 'fleche(ax, 9.5, 6.6, 8.8, 6.6, BRIQUE)' in figsrc and 'fleche(ax, 1.35, 6.15, 1.35, 5.55, BRIQUE)' in figsrc and 'fleche(ax, 2.3, 7.1, 3.2, 7.1, BLEU)' in figsrc),
          ('Figure 9 : pont salin, K+ vers la cathode et Cl- vers l\'anode', "fleche(ax, 5.8, 4.02, 4.65, 4.02, CUIVRE); texte(ax, 5.45, 3.62, 'Cl$^-$'" in figsrc and "fleche(ax, 6.2, 4.02, 7.35, 4.02, VERT); texte(ax, 6.55, 3.62, 'K$^+$'" in figsrc),
          ('Figures 10 à 12 : électrode de gauche négative, courant et électrons', "borne(ax, 2.3, 4.55, -1 if gauche == '−' else +1, BRIQUE)" in figsrc and 'fleche(ax, 6.0, 5.9, 5.35, 5.9, BRIQUE)' in figsrc and 'fleche(ax, 2.9, 6.35, 3.8, 6.35, BLEU)' in figsrc and 'xa, xb = (3.55, 5.45) if gauche_vers_droite else (5.45, 3.55)' in figsrc),
          ('Figures 2 et 10 : méthanol à l\'électrode 1, ions H+ vers l\'électrode 2', "entree1='CH$_3$OH + H$_2$O', sortie1='CO$_2$', entree2='O$_2$', sortie2='H$_2$O'" in figsrc and "annoter_cellule(ax, 'H$^+$', True, VERT)" in figsrc),
          ('Figures 3 et 11 : dihydrogène à l\'électrode 1, ions oxyde vers l\'électrode 1', "entree1='H$_2$', sortie1='H$_2$O', entree2='air'" in figsrc and "annoter_cellule(ax, 'O$^{2-}$', False, CUIVRE)" in figsrc),
          ('Figures 4 et 12 : graphite à gauche, ions lithium vers l\'oxyde de cobalt', "cellule(ax, 'graphite\\nLiC$_6$', 'CoO$_2$\\nLiCoO$_2$'" in figsrc and "annoter_cellule(ax, 'Li$^+$', True, VERT)" in figsrc),
          ('Figures 13 à 15 : anode à gauche reliée à la borne +', 'borne(ax, 3.3, 6.4, +1, BRIQUE); borne(ax, 4.7, 6.4, -1, BRIQUE)' in figsrc),
          ('Figures 13 à 15 : courant, électrons et ions', 'fleche(ax, 2.2, 5.9, 2.2, 5.25, BRIQUE)' in figsrc and 'fleche(ax, 5.8, 5.25, 5.8, 5.9, BRIQUE)' in figsrc and 'fleche(ax, 6.3, 6.0, 6.3, 5.3, BLEU)' in figsrc and 'fleche(ax, 1.7, 5.3, 1.7, 6.0, BLEU)' in figsrc and 'if cation: fleche(ax, 3.35, 2.15, 4.75, 2.15, VERT)' in figsrc and 'if anion: fleche(ax, 4.75, 1.8, 3.35, 1.8, CUIVRE)' in figsrc),
          ('Figures 5 et 13 : plaque de nickel à l\'anode, pièce à la cathode', "electrolyseur(ax, 'plaque\\nde nickel', 'pièce\\nà nickeler'" in figsrc and "annoter_electrolyseur(ax, 'Ni$^{2+}$', 'SO$_4^{2-}$')" in figsrc),
          ('Figures 6 et 14 : dioxygène sur le carbone, nickel sur le titane', "'électrode\\nde carbone', 'électrode\\nde titane'" in figsrc and "gaz_g='O$_2$')" in figsrc and "annoter_electrolyseur(ax, 'Ni$^{2+}$', None)" in figsrc),
          ('Figures 7 et 15 : dioxygène en A (anode), dihydrogène en B', "gaz_g='O$_2$', gaz_d='H$_2$')" in figsrc and "annoter_electrolyseur(ax, 'H$^+$', None)" in figsrc),
          ('Figures 7 et 15 : deux fois plus de bulles de dihydrogène', gaz.get('d') == 2 * gaz.get('g', 0) > 0),
          ('Figure 8 : critère d\'évolution', "'$Q_\\\\mathrm{r} < K$ : évolution\\ndans le sens direct'" in figsrc and "'$Q_\\\\mathrm{r} > K$ : évolution\\ndans le sens indirect'" in figsrc and 'fleche(ax, 1.4, 0.55, 4.9, 0.55, VERT' in figsrc and 'fleche(ax, 9.6, 0.55, 6.1, 0.55, CUIVRE' in figsrc and "équilibre, pas d\\'évolution" in figsrc)]
def ko(c):
    n, cc, i, t, _ = c
    return cc != i if t is None or isinstance(cc, (bool, str, tuple)) else abs(float(cc) - float(i)) > t
ecarts = [c for c in controles if ko(c)]
absents = [(n, wr) for n, _, _, _, wr in controles if wr not in src]
faux = [n for n, ok in textes if not ok]
print('--- comparaison avec la fiche : %d valeurs contrôlées, %d écart(s), %d écriture(s) introuvable(s), %d donnée(s) d\'énoncé introuvable(s), %d figure(s) à revoir'
      % (len(controles), len(ecarts), len(absents), len(dmanque), len(faux)))
for n, cc, i, _, _ in ecarts: print('   ÉCART', n, ': recalculé %s, imprimé %s' % (cc, i))
for n, wr in absents: print('   INTROUVABLE', n, ':', wr)
for d in dmanque: print('   DONNÉE INTROUVABLE :', d)
for n in faux: print('   FIGURE', n)

# équations chimiques : conservation des éléments et de la charge
ETAT = re.compile(r'\((?:\\text\{(?:aq|s|g)\}|\\ell)\)')
CHARGE = re.compile(r'\^(?:\{\\text\{(\d*)\+\}\}|-|\{(\d*)-\})$')
ELEMENTS = {'H', 'C', 'N', 'O', 'S', 'Cl', 'Al', 'Cu', 'Zn', 'Fe', 'Ni', 'Li', 'Co', 'Mn', 'Pb', 'I'}
GENERIQUES = {'\\text{M} \\rightarrow \\text{M}^{z\\text{+}} + z\\,\\text{e}^-', '\\text{Ox} + z\\,\\text{e}^- = \\text{Red}',
              'a\\,\\text{A} + b\\,\\text{B} \\rightleftarrows c\\,\\text{C} + d\\,\\text{D}',
              '\\text{acide}(\\ell) + \\text{alcool}(\\ell) \\rightleftarrows \\text{ester}(\\ell) + \\text{eau}(\\ell)'}
def terme(t):
    m = re.fullmatch(r'(?:(\d+)\\,)?(.+)', ETAT.sub('', t).strip())
    coef, t = int(m.group(1) or 1), m.group(2)
    charge, c = 0, CHARGE.search(t)
    if c:
        charge = int(c.group(1) or 1) if c.group(0).startswith('^{\\text') else (-1 if c.group(0) == '^-' else -int(c.group(2) or 1))
        t = t[:c.start()]
    brut = re.sub(r'_(\d)', r'\1', re.sub(r'_\{(\d+)\}', r'\1', re.sub(r'\\text\{([A-Za-z]+)\}', r'\1', t)))
    if brut == 'e': return (coef, {}, -1) if charge == -1 else None
    if not re.fullmatch(r'(?:[A-Z][a-z]?\d*)+', brut): return None
    comp = {}
    for el, n in re.findall(r'([A-Z][a-z]?)(\d*)', brut):
        if el not in ELEMENTS: return None
        comp[el] = comp.get(el, 0) + int(n or 1)
    return coef, comp, charge
def bilan(cote):
    termes = [terme(t) for t in cote.split(' + ')]
    if None in termes: return None
    el, q = {}, 0
    for coef, comp, ch in termes:
        q += coef * ch
        for e, n in comp.items(): el[e] = el.get(e, 0) + coef * n
    return el, q
eq_ko, n_eq = [], 0
for a, b in re.findall(r'\$\$(.+?)\$\$|\$(.+?)\$', src, flags=re.S):
    for eq in (a or b).split('\\qquad'):
        eq = eq.strip().rstrip(',.')
        fleche = next((f for f in ('\\rightleftarrows', '\\rightarrow') if f in eq), None)
        demi = fleche is None and eq.count(' = ') == 1 and re.search(r'(?<!n\()\\text\{e\}\^-', eq)
        if not fleche and not demi: continue
        if eq in GENERIQUES: continue
        cotes = eq.split(fleche) if fleche else eq.split(' = ')
        if len(cotes) != 2: eq_ko.append('écriture illisible : ' + eq); continue
        g, d = bilan(cotes[0].strip()), bilan(cotes[1].strip())
        if g is None or d is None: eq_ko.append('espèce illisible : ' + eq); continue
        n_eq += 1
        if {k: v for k, v in g[0].items() if v} != {k: v for k, v in d[0].items() if v} or g[1] != d[1]:
            eq_ko.append('non équilibrée : ' + eq)
print('--- équations chimiques : %d contrôlées, %d écart(s)' % (n_eq, len(eq_ko)))
for d in eq_ko: print('   ' + d)

# niveaux et parcours
niveaux = {int(q): int(n) for q, n in re.findall(r'^## \[Q\.(\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)', src, flags=re.M)}
attendu = {10: [1, 3, 6, 7, 9, 10, 14, 15, 19], 14: [2, 4, 5, 8, 11, 12, 13, 16, 17, 18], 18: []}
faux_niv = [(q, n) for n, qs in attendu.items() for q in qs if niveaux.get(q) != n]
manque = sorted(set(niveaux) - {q for qs in attendu.values() for q in qs}) + ([0] if len(niveaux) != NQ else [])
ex_meta = {int(e): (int(n), m) for e, n, m in re.findall(r'^### \[Exercice (\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)\\ \].*?\[Type BAC\]\{custom-style="TagBac"\} · (.*)$', src, flags=re.M)}
ex_q = {e: len(re.findall(r'^\*\*\d+\.\*\*', src[src.index('### [Exercice %d]' % e):src.index('[CIBLE:c_ex%d]' % e)], flags=re.M)) for e in range(1, NEX + 1)}
ex_att = {1: (10, 6, '4 points · 35 min · Questions 4 à 6 : objectif 14'), 2: (10, 6, '5 points · 45 min · Questions 5 et 6 : objectif 14'),
          3: (14, 6, '4 points · 35 min'), 4: (10, 6, '5 points · 45 min · Questions 1, 5 et 6 : objectif 14'),
          5: (14, 6, '5 points · 45 min · Question 6 : objectif 18')}
ex_ko = [e for e, (n, nq, m) in ex_att.items() if ex_meta.get(e) != (n, m) or ex_q[e] != nq] + ([0] if len(ex_meta) != NEX else [])
print('--- niveaux : %d questions et %d exercices, %d écart(s)' % (len(niveaux), len(ex_meta), len(faux_niv) + len(manque) + len(ex_ko)))
for q, n in faux_niv: print('   NIVEAU Q.%d : %s dans la fiche, %d dans le parcours' % (q, niveaux.get(q), n))
for q in manque: print('   Q.%d absente du parcours' % q if q else '   NOMBRE DE QUESTIONS : %d au lieu de %d' % (len(niveaux), NQ))
for e in ex_ko: print('   EXERCICE %d : niveau, nombre de questions ou mention' % e if e else '   NOMBRE D\'EXERCICES : %d' % len(ex_meta))
parcours = ['| Q.1, Q.3, Q.6, Q.7, Q.9, Q.10, Q.14, Q.15, Q.19 | Ex. 1 (questions 1 à 3), Ex. 2 (questions 1 à 4), Ex. 4 (questions 2 à 4) |',
            '| Plus Q.2, Q.4, Q.5, Q.8, Q.11 à Q.13, Q.16 à Q.18 | Ex. 1 à Ex. 4, Ex. 5 (questions 1 à 5) |']
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
de2025 = lambda tt: [t for t in tt if '2025' in t[0]]
rang = [0 if '2026' in t[0] else 1 for t in table]
comptes = [('exercices', len(table), 14), ('sciences de l\'ingénieur', len([t for t in table if 'ingénieur' in ' '.join(t[:3]).lower()]), 0),
           ('sessions 2026', len(de2026(table)), 7), ('2026 avant 2025', int(rang == sorted(rang)), 1),
           ('équilibre (Q.1 à Q.5, Ex. 1)', len(avec(range(1, 6), (1,))), 6), ('rendement (Q.5)', len(avec((5,))), 4),
           ('électrolyse, durée, masse ou énergie (Q.17)', len(avec((17,))), 4), ('dont 2026', len(de2026(avec((17,)))), 3),
           ('piles (Q.9 à Q.12)', len(avec(range(9, 13))), 2), ('piles en 2025', len(de2025(avec(range(9, 13)))), 2),
           ('renvois hors de la fiche', len([t for t in table if max(t[3] | {0}) > NQ or max(t[4] | {0}) > NEX]), 0)]
mauvais = [cc for cc in comptes if cc[1] != cc[2]]
print('--- tableau : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s)' % len(mauvais))
for n, v, a in mauvais: print('   COMPTE %s : %d au lieu de %d' % (n, v, a))
demande = {1: ('Demandé en 2025 et 2026', ['Métropole, septembre 2026, jour 1', 'Amérique du Nord 2025, jour 2 (sujet de secours)', 'Asie 2025, jour 1']),
           2: ('Demandé en 2025 (Métropole, Polynésie)', ['Métropole 2025, jour 2 (sujet de secours)', 'Polynésie 2025, jour 1']),
           3: ('Demandé en 2025 et 2026', ['Métropole, septembre 2026, jour 1', 'Asie 2025, jour 1']),
           4: ('Demandé en 2025 et 2026', ['Centres étrangers 2026, jour 2', 'Polynésie 2025, jour 1']),
           5: ('Demandé dans quatre exercices en 2025 et 2026', 4),
           6: ('Demandé en 2026 (Métropole, Polynésie)', ['Métropole 2026, jour 2 (sujet de secours)', 'Polynésie 2026, jour 2']),
           7: ('Demandé dans au moins six exercices en 2025 et 2026', 6),
           8: ('Demandé en 2025 et 2026', ['Métropole 2026, jour 2 (sujet de secours)', 'Polynésie 2026, jour 2', 'Amérique du Nord 2025, jour 2 (sujet de secours)']),
           9: ('Demandé en 2025 (Amérique du Sud, Asie)', ['Amérique du Sud 2025, jour 1', 'Asie 2025, jour 2']),
           10: ('Demandé en 2025 (Amérique du Sud, Asie)', ['Amérique du Sud 2025, jour 1', 'Asie 2025, jour 2']),
           11: ('Demandé en 2025 (Amérique du Sud)', ['Amérique du Sud 2025, jour 1']),
           12: ('Demandé en 2025 (Amérique du Sud, Asie)', ['Amérique du Sud 2025, jour 1', 'Asie 2025, jour 2']),
           14: ('Demandé en 2025 (Métropole, septembre)', ['Métropole, septembre 2025, jour 1']),
           15: ('Demandé dans quatre exercices en 2025 et 2026', 4),
           16: ('Demandé en 2025 et 2026', ['Amérique du Nord 2026, jour 2', 'Métropole, septembre 2025, jour 1']),
           17: ('Demandé dans quatre exercices en 2025 et 2026', 4),
           18: ('Électrolyse de l\'eau tombée en 2026 (Amérique du Nord), avec une masse à calculer', ['Amérique du Nord 2026, jour 2']),
           19: ('Décharge d\'un accumulateur demandée en 2025 (Asie)', ['Asie 2025, jour 2'])}
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
sujets = {1: ('Centres étrangers 2026, jour 2', 'Une synthèse non totale, l\'estérification', '(voir BAC Centres étrangers 2026)', 'Centres étrangers 2026, jour 2, exercice 3'),
          2: ('Amérique du Sud 2025, jour 1', 'Recharge des voitures électriques', '(voir BAC Amérique du Sud 2025)', 'Amérique du Sud 2025, jour 1, exercice 2'),
          3: ('Asie 2025, jour 2', 'Batteries au lithium', '(voir BAC Asie 2025)', 'Asie 2025, jour 2, exercice 1'),
          4: ('Centres étrangers 2026, jour 1', 'La dépollution par les plantes pour extraire du nickel', '(voir BAC Centres étrangers 2026)',
              'Centres étrangers 2026, jour 1, exercice 2'),
          5: ('Amérique du Nord 2026, jour 2', 'HOPE, l\'espoir du dihydrogène vert', '(voir BAC Amérique du Nord 2026)', 'Amérique du Nord 2026, jour 2, exercice 2')}
for e, (sess, nom, voir, mention) in sujets.items():
    tete = src[src.index('### [Exercice %d]' % e):][:900]
    lig = [t for t in table if t[0] == sess and t[1] == nom]
    if not lig or e not in lig[0][4]: dem_ko.append('Ex. %d : ligne « %s » absente ou sans renvoi' % (e, nom))
    if voir not in tete or ('%s : « %s »' % (mention, nom)) not in tete: dem_ko.append('Ex. %d : renvoi au sujet incomplet' % e)
ex_cites = sorted({e for t in table for e in t[4]})
if ex_cites != list(range(1, NEX + 1)): dem_ko.append('exercices cités dans le tableau : %s' % ex_cites)
print('--- mentions « Demandé » et sujets d\'après : %d écart(s)' % len(dem_ko))
for d in dem_ko: print('   ' + d)
phrases = ['dans au moins quatorze exercices des sessions 2025 et 2026',
           'Équilibre : six exercices font utiliser $Q_\\text{r}$ ou $K$, dont quatre pour améliorer un rendement (Q.5).',
           'Électrolyse : quatre exercices, dont trois de 2026, font calculer une durée, une masse ou une énergie (Q.17).',
           'Piles : deux exercices de 2025, une pile à combustible et une batterie lithium-ion (Q.9 à Q.12).']
perdues = [p for p in phrases if p not in src]
for p in perdues: print('   PHRASE INTROUVABLE :', p)
print('--- phrases de synthèse : %d suivies, %d introuvable(s)' % (len(phrases), len(perdues)))
nums = [int(n) for n in re.findall(r'^Figure (\d+)\. ', src, flags=re.M)]
refs = sorted({int(n) for n in re.findall(r'(?:la |\()figure (\d+)', src)})
fig_ko = nums != list(range(1, len(nums) + 1)) or len(nums) != NFIG or any(n not in nums for n in refs)
print('--- figures : %d légendes, renvois vers %s%s' % (len(nums), ', '.join(map(str, refs)), ' ; ÉCART' if fig_ko else ''))
idx = src[src.index('# Index des notions'):]
iq, ie = set(), set()
for l in idx.splitlines():
    if l.startswith('| ') and not l.startswith('| Notion'):
        a, b = renvois(l.split('|')[2]); iq |= a; ie |= b
idx_ko = sorted(set(range(1, NQ + 1)) - iq) + [100 + e for e in sorted(set(range(1, NEX + 1)) - ie)] + [q for q in iq if q > NQ] + [100 + e for e in ie if e > NEX]
print('--- index : %d questions et %d exercices cités%s' % (len(iq), len(ie), ' ; ÉCART %s' % idx_ko if idx_ko else ''))
if ecarts or absents or dmanque or faux or eq_ko or faux_niv or manque or ex_ko or perdus or mauvais or dem_ko or perdues or fig_ko or idx_ko:
    raise SystemExit(1)
print('--- tout est bon')
