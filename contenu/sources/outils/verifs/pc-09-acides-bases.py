# Recalcul indépendant des résultats numériques de la fiche 9 (Acides et bases),
# puis contrôle de la structure de la fiche : niveaux et parcours, tableau « Ce qui est tombé » et mentions
# « Demandé ... », exercices d'après un sujet, figures, index, renvois Q.n, rubriques de L'essentiel
# et format des tableaux d'avancement (flèche entre réactifs et produits, lignes État initial, En cours, État final).
# usage : python3 outils/verifs/pc-09-acides-bases.py
# Chaque valeur est recalculée à partir des seules données des énoncés ; on vérifie ensuite que son écriture
# figure telle quelle dans la fiche (écriture LaTeX du fichier source).
import os, re
from math import log10, sqrt
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(RACINE, 'fiches', 'pc-09-acides-bases', 'fiche.md'), encoding='utf-8').read()
figsrc = open(os.path.join(RACINE, 'outils', 'figures', 'pc-09-acides-bases.py'), encoding='utf-8').read()
Ke = 1.0e-14
NQ = 24                                        # nombre de questions de cours (Q.7 insérée le 18 novembre 2026)
h = lambda pH: 10 ** -pH                       # concentration en ions oxonium (mol/L)
pH_de = lambda c: -log10(c)

# Thème 1 : solutions et avancement
M1 = 4 * 12.0 + 6 * 1.0 + 5 * 16.0; n1 = 2.00e-2 * 0.2500; m1 = n1 * M1; V1 = 1.0e-2 * 24.0
Cm2 = 1.2 * 60.0; Cm2_etiq = 0.07 * 1010
m3 = 0.37 * 1180; n3 = m3 / 36.5
Vm4 = 100.0 / 5.00
F5 = (200.0 / 20.0) * 40; Cm5 = F5 * 0.250; m5 = Cm5 * 0.100; V5 = m5 / 0.789
nC6, nH6 = 2.0 / 100.1, 0.50 * 0.0500; xm6 = min(nC6, nH6 / 2); lim6 = 'H3O+' if nH6 / 2 < nC6 else 'CaCO3'
# Q.7 : avancement maximal et avancement final de l'acide éthanoïque dans l'eau (acide limitant, eau solvant)
ni7, nH3O7 = 1.0e-3, 4.0e-5
xm7b = ni7 / 1; xf7b = nH3O7 / 1; reste7 = ni7 - xf7b; tau7b = xf7b / xm7b
xf7_Q14 = 10 ** -3.40 * 0.1000          # même solution qu'en Q.14 (pH 3,40, 100,0 mL) : xf voisin de 4,0e-5 mol
xm7_Q18 = 1.0e-2 * 0.1000                # même solution qu'en Q.18 : xmax = C × V
# Q.7 : l'image des sandwichs (2 tranches de pain et 1 de jambon par sandwich ; 10 tranches de pain, 3 de jambon)
pain, jambon = 10, 3
max_sandw = min(pain // 2, jambon // 1); limitant_sandw = 'jambon' if jambon // 1 < pain // 2 else 'pain'
reste_total = (pain - 2 * max_sandw, jambon - max_sandw)          # trois sandwichs : il ne reste plus de jambon
reste_deux = (pain - 2 * 2, jambon - 2)                            # deux sandwichs : il reste des deux ingrédients
n08 = 9.0 / 60.0; xm8 = min(n08, 0.15); xf8 = n08 - 5.0e-2; tau8 = xf8 / xm8
C0 = 0.55 * 1.25e3 / 90.1; nE1 = C0 * 0.0500; nT1 = 15.0 / 100.1
xm1 = min(nT1, nE1 / 2); lim1 = 'tartre' if nT1 < nE1 / 2 else 'acide'
tauE1 = h(2.10) / nE1

# Thème 2 : acides, bases et pH
HO11a = Ke / h(11.20); HO11b = Ke / h(3.50); h37 = sqrt(2.4e-14)
CE2 = 13.82 / 138.2 / 1.000; HOE2 = Ke / h(11.60); tauE2 = HOE2 / CE2

# Thème 3 : force des acides et des bases
tau13a, tau13b = h(2.00) / 1.0e-2, h(3.40) / 1.0e-2
HO14 = Ke / h(10.60); tau14 = HO14 / 1.0e-2
pKa15 = {'HCOOH': 3.8, 'CH3COOH': 4.8, 'HClO': 7.5, 'NH4+': 9.2}
ordre15 = sorted(pKa15, key=lambda a: -pKa15[a])          # force croissante : pKA décroissant
h16 = h(3.40); AH16 = 1.0e-2 - 4.0e-4; Ka16 = (4.0e-4) ** 2 / AH16; Ka16_exact = h16 ** 2 / (1.0e-2 - h16)
HOE3 = Ke / h(11.25); tauE3 = HOE3 / 0.10; KaE3 = 10 ** -9.5; rE3 = 10 ** (11.25 - 9.5)
rE3_tau = (0.10 - HOE3) / HOE3
Kb = Ke / KaE3; x = (-Kb + sqrt(Kb ** 2 + 4 * Kb * 0.10)) / 2; pH_theo_E3 = 14 + log10(x)   # pH attendu avec C et pKA

# Q.13, ajout d'acide fort à une solution de pH donné
n12 = h(6.30) * 0.0100; pH12 = pH_de((n12 + 0.20e-3) / 0.0100)
# Q.18 : état final d'une solution d'acide faible, équation du second degré en xf
KA17, C17, V17 = 1.7e-5, 1.0e-2, 0.1000
b17, c17 = KA17 * V17, -KA17 * C17 * V17 ** 2
D17 = b17 ** 2 - 4 * c17; x1_17 = (-b17 + sqrt(D17)) / 2; x2_17 = (-b17 - sqrt(D17)) / 2
h17 = x1_17 / V17; pH17 = pH_de(h17); tau17 = x1_17 / (C17 * V17)
h17_exact = (-KA17 + sqrt(KA17 ** 2 + 4 * KA17 * C17)) / 2          # même équation écrite avec [H3O+]
pH17_approx = pH_de(sqrt(KA17 * C17))
check17 = KA17 - h17 ** 2 / (C17 - h17)                                # le résultat redonne bien KA

# Thème 4 : diagrammes, indicateurs, tampons
r18 = 10 ** (7.40 - 6.10); p18 = r18 / (1 + r18)
def carbonates(pH, pk1=6.4, pk2=10.3):
    a = 1 / (1 + 10 ** (pH - pk1) + 10 ** (2 * pH - pk1 - pk2)); b = a * 10 ** (pH - pk1); c = b * 10 ** (pH - pk2)
    return 100 * a, 100 * b, 100 * c
c5, c83 = carbonates(5.0), carbonates(8.3)
indic = {'hélianthine': (3.1, 4.4, 'rouge', 'jaune'), 'bleu de bromothymol': (6.0, 7.6, 'jaune', 'bleu'),
         'phénolphtaléine': (8.2, 10.0, 'incolore', 'rose')}
coul5 = {k: (v[2] if 5.0 < v[0] else v[3] if 5.0 > v[1] else 'mélange') for k, v in indic.items()}
choix20 = [k for k, v in indic.items() if v[0] <= 8.7 <= v[1]]
part = lambda pH, pk=7.5: 1 / (1 + 10 ** (pH - pk))     # part de la forme acide HClO
pH_E4 = 7.5 + log10(40 / 60)

controles = [
    ('Q.1 masse molaire', M1, 134.0, 1e-9, '= 134{,}0\\ \\text{g·mol}^{-1}$$'),
    ('Q.1 quantité', n1, 5.00e-3, 1e-9, '= 5{,}00 \\times 10^{-3}\\ \\text{mol}'),
    ('Q.1 masse', m1, 0.670, 0.0005, '= 0{,}670\\ \\text{g}$$'),
    ('Q.1 volume de gaz', V1, 0.24, 0.005, '= 0{,}24\\ \\text{L}$.'),
    ('Q.2 concentration massique', Cm2, 72, 0.5, '= 72\\ \\text{g·L}^{-1}$$'),
    ('Q.2 vérification étiquette', Cm2_etiq, 71, 0.5, '= 71\\ \\text{g}$'),
    ('Q.3 masse de HCl', m3, 436.6, 0.05, '= 436{,}6\\ \\text{g}'),
    ('Q.3 quantité de HCl', n3, 11.96, 0.005, '= 11{,}96\\ \\text{mol}$$'),
    ('Q.3 concentration', n3, 12, 0.5, '= 12\\ \\text{mol·L}^{-1}$'),
    ('Q.4 volume prélevé', Vm4, 20.0, 1e-9, '= 20{,}0\\ \\text{mL}$$'),
    ('Q.5 facteur global', F5, 400, 1e-9, '= 400$ fois'),
    ('Q.5 concentration du vin', Cm5, 100, 1e-9, '= 100\\ \\text{g·L}^{-1}$$'),
    ('Q.5 masse dans 100 mL', m5, 10.0, 1e-9, '= 10{,}0\\ \\text{g}$'),
    ('Q.5 volume d\'éthanol', V5, 12.7, 0.05, '= 12{,}7\\ \\text{mL}$$'),
    ('Q.6 calcaire', nC6, 2.0e-2, 0.05e-2, '= 2{,}0 \\times 10^{-2}\\ \\text{mol}'),
    ('Q.6 ions oxonium', nH6, 2.5e-2, 1e-9, '= 2{,}5 \\times 10^{-2}\\ \\text{mol}$$'),
    ('Q.6 avancement maximal', xm6, 1.25e-2, 1e-9, '$x_\\text{max} = 1{,}25 \\times 10^{-2}\\ \\text{mol}$.'),
    ('Q.6 calcaire restant (mol)', nC6 - xm6, 7.5e-3, 0.05e-3, '$7{,}5 \\times 10^{-3}$'),
    ('Q.6 volume de CO2', xm6 * 24.0, 0.30, 0.005, '= 0{,}30\\ \\text{L}'),
    ('Q.6 masse restante', (nC6 - xm6) * 100.1, 0.75, 0.005, '= 0{,}75\\ \\text{g}$$'),
    ('Q.7 avancement maximal', xm7b, 1.0e-3, 1e-12, 'x_\\text{max} = n_\\text{i}(\\text{CH}_3\\text{COOH}) = 1{,}0 \\times 10^{-3}\\ \\text{mol} \\qquad'),
    ('Q.7 avancement final', xf7b, 4.0e-5, 1e-12, 'x_\\text{f} = n_\\text{f}(\\text{H}_3\\text{O}^{\\text{+}}) = 4{,}0 \\times 10^{-5}\\ \\text{mol}$$'),
    ('Q.7 xmax / xf', xm7b / xf7b, 25, 1e-9, 'L\'avancement final est 25 fois plus petit'),
    ('Q.7 acide restant', reste7, 9.6e-4, 1e-12, '= 9{,}6 \\times 10^{-4}\\ \\text{mol}$ d\'acide'),
    ('Q.7 tableau, en cours', ni7, 1.0e-3, 1e-12, '| En cours | $x$ | $1{,}0 \\times 10^{-3} - x$ | excès | | $x$ | $x$ |'),
    ('Q.7 tableau, état final si totale', xm7b, 1.0e-3, 1e-12, '| État final si la transformation était totale | $x_\\text{max} = 1{,}0 \\times 10^{-3}$ | $0$ | excès | | $1{,}0 \\times 10^{-3}$ | $1{,}0 \\times 10^{-3}$ |'),
    ('Q.7 tableau, état final réel', reste7, 9.6e-4, 1e-12, '| État final réel | $x_\\text{f} = 4{,}0 \\times 10^{-5}$ | $9{,}6 \\times 10^{-4}$ | excès | | $4{,}0 \\times 10^{-5}$ | $4{,}0 \\times 10^{-5}$ |'),
    ('Q.7 taux d\'avancement', tau7b, 0.040, 1e-9, '= 0{,}040$ est le taux d\'avancement final (Q.8)'),
    ('Q.7 pourcentage d\'acide ayant réagi', 100 * tau7b, 4.0, 1e-9, 'seules $4{,}0\\ \\%$ des molécules d\'acide ont réagi'),
    ('Q.7 cohérent avec Q.14 (pH 3,40 dans 100,0 mL)', xf7_Q14, 4.0e-5, 0.05e-5, None),
    ('Q.7 cohérent avec Q.18 (xmax = C × V)', xm7_Q18, xm7b, 1e-12, None),
    ('Q.7 sandwichs : maximum', max_sandw, 3, 0, 'on peut en faire trois au plus'),
    ('Q.7 sandwichs : trois faits, jambon restant', reste_total[1], 0, 0, 'S\'il y en a trois, il ne reste plus de jambon'),
    ('Q.7 sandwichs : deux faits, pain restant', reste_deux[0], 6, 0, None),
    ('Q.7 sandwichs : deux faits, jambon restant', reste_deux[1], 1, 0, 'S\'il n\'y en a que deux alors qu\'il reste du pain et du jambon'),
    ('Q.8 quantité d\'acide', n08, 0.15, 1e-9, '= 0{,}15\\ \\text{mol}$'),
    ('Q.8 avancement final', xf8, 0.10, 1e-9, '= 0{,}10\\ \\text{mol}$ et'),
    ('Q.8 taux d\'avancement', tau8, 0.67, 0.005, '= 0{,}67$$'),
    ('Q.8 masse d\'ester', xf8 * 88.0, 8.8, 0.05, '= 8{,}8\\ \\text{g}$.'),
    ('Ex. 1 masse d\'acide dans 1 L', 0.55 * 1250, 687.5, 1e-9, '= 687{,}5\\ \\text{g}'),
    ('Ex. 1 concentration C0', C0, 7.63, 0.005, '= 7{,}63\\ \\text{mol}$$'),
    ('Ex. 1 quantité par dose', nE1, 0.382, 0.0005, '= 0{,}382\\ \\text{mol}'),
    ('Ex. 1 tartre', nT1, 0.150, 0.0005, '= 0{,}150\\ \\text{mol}$. Le tableau'),
    ('Ex. 1 xmax si l\'acide limite', nE1 / 2, 0.191, 0.0005, '= 0{,}191\\ \\text{mol}$. La plus petite'),
    ('Ex. 1 acide restant', 0.382 - 2 * 0.150, 0.082, 1e-9, '= 0{,}082\\ \\text{mol}$'),
    ('Ex. 1 volume de CO2', xm1 * 24.0, 3.60, 0.005, '= 3{,}60\\ \\text{L}$$'),
    ('Ex. 1 masse maximale de tartre', nE1 / 2 * 100.1, 19.1, 0.05, '= 19{,}1\\ \\text{g}$$'),
    ('Ex. 1 ions oxonium', h(2.10), 7.9e-3, 0.05e-3, '= 7{,}9 \\times 10^{-3}\\ \\text{mol·L}^{-1}'),
    ('Ex. 1 taux d\'avancement', tauE1, 2.1e-2, 0.05e-2, '= 2{,}1 \\times 10^{-2}$$'),
    ('Q.11 ions oxonium', h(2.70), 2.0e-3, 0.05e-3, '= 2{,}0 \\times 10^{-3}\\ \\text{mol·L}^{-1}$$'),
    ('Q.11 pH', pH_de(4.0e-9), 8.40, 0.005, '= 8{,}40$$'),
    ('Q.12 oxonium à pH 11,20', h(11.20), 6.3e-12, 0.05e-12, '= 6{,}3 \\times 10^{-12}\\ \\text{mol·L}^{-1}$, donc'),
    ('Q.12 hydroxyde à pH 11,20', HO11a, 1.6e-3, 0.05e-3, '= 1{,}6 \\times 10^{-3}\\ \\text{mol·L}^{-1}$$'),
    ('Q.12 oxonium à pH 3,50', h(3.50), 3.2e-4, 0.05e-4, '= 3{,}2 \\times 10^{-4}\\ \\text{mol·L}^{-1}$ et'),
    ('Q.12 hydroxyde à pH 3,50', HO11b, 3.2e-11, 0.05e-11, '$[\\text{HO}^-] = 3{,}2 \\times 10^{-11}'),
    ('Q.12 oxonium neutre à 37 °C', h37, 1.55e-7, 0.005e-7, '= 1{,}55 \\times 10^{-7}'),
    ('Q.12 pH neutre à 37 °C', pH_de(h37), 6.81, 0.005, '\\text{pH} = 6{,}81$$'),
    ('Q.13 acide fort', pH_de(5.0e-3), 2.30, 0.005, '= 2{,}30 \\qquad'),
    ('Q.13 acide dilué 10 fois', pH_de(5.0e-4), 3.30, 0.005, '= 3{,}30$$'),
    ('Q.13 oxonium, base forte', Ke / 2.0e-2, 5.0e-13, 1e-20, '= 5{,}0 \\times 10^{-13}'),
    ('Q.13 base forte', pH_de(Ke / 2.0e-2), 12.30, 0.005, '\\text{pH} = 12{,}30$$'),
    ('Q.13 base diluée 100 fois', pH_de(Ke / 2.0e-4), 10.30, 0.005, 'le pH vaut $10{,}30$'),
    ('Q.13 ions oxonium initiaux (ajout)', n12, 5.0e-9, 0.05e-9, '= 5{,}0 \\times 10^{-9}\\ \\text{mol}$'),
    ('Q.13 pH après ajout', pH12, 1.70, 0.005, '\\text{pH} = 1{,}70$$'),
    ('Ex. 2 concentration', CE2, 0.1000, 0.00005, '= 0{,}1000\\ \\text{mol·L}^{-1}'),
    ('Ex. 2 ions potassium', 2 * 0.100, 0.200, 1e-9, '= 2C = 0{,}200'),
    ('Ex. 2 ions hydroxyde', HOE2, 4.0e-3, 0.05e-3, '= 4{,}0 \\times 10^{-3}\\ \\text{mol·L}^{-1}$$'),
    ('Ex. 2 pH si totale', 14 + log10(0.100), 13.00, 0.005, 'soit un pH de $13{,}00$'),
    ('Ex. 2 taux d\'avancement', tauE2, 4.0e-2, 0.05e-2, '= 4{,}0 \\times 10^{-2}$$'),
    ('Ex. 2 rapport à la soude', 0.100 / 4.0e-3, 25, 1e-9, '25 fois plus faible'),
    ('Q.14 acide chlorhydrique', tau13a, 1.0, 1e-9, '$\\tau = 1$. La réaction est totale'),
    ('Q.14 oxonium, acide éthanoïque', h(3.40), 4.0e-4, 0.05e-4, '= 4{,}0 \\times 10^{-4}\\ \\text{mol·L}^{-1}$, donc'),
    ('Q.14 acide éthanoïque', tau13b, 4.0e-2, 0.05e-2, '\\tau = \\dfrac{4{,}0 \\times 10^{-4}}{1{,}0 \\times 10^{-2}} = 4{,}0 \\times 10^{-2}$$'),
    ('Q.15 ions hydroxyde', HO14, 4.0e-4, 0.05e-4, '= 10^{-3{,}40} = 4{,}0 \\times 10^{-4}\\ \\text{mol·L}^{-1} \\qquad'),
    ('Q.15 taux d\'avancement', tau14, 4.0e-2, 0.05e-2, 'vaut $4{,}0\\ \\%$ : la transformation'),
    ('Q.16 constante d\'acidité', 10 ** -7.5, 3.2e-8, 0.05e-8, '= 3{,}2 \\times 10^{-8}$$'),
    ('Q.17 acide restant', AH16, 9.6e-3, 1e-9, '= 9{,}6 \\times 10^{-3}\\ \\text{mol·L}^{-1}$$'),
    ('Q.17 KA', Ka16, 1.7e-5, 0.05e-5, '= 1{,}7 \\times 10^{-5} \\qquad'),
    ('Q.17 KA sans arrondi', Ka16_exact, 1.7e-5, 0.07e-5, '= 1{,}7 \\times 10^{-5} \\qquad'),
    ('Q.17 pKA (calculé avec KA arrondi à deux chiffres, comme dans la fiche)', -log10(float('%.1e' % Ka16)), 4.77, 0.005, '= 4{,}77$$'),
    ('Q.17 pKA arrondi', round(-log10(float('%.1e' % Ka16)), 1), 4.8, 1e-9, 'Soit $\\text{p}K_\\text{A} = 4{,}8$ avec deux chiffres'),
    ('Q.18 équation : coefficient de xf', b17, 1.7e-6, 0.05e-6, 'x_\\text{f}^2 + 1{,}7 \\times 10^{-6}\\, x_\\text{f} - 1{,}7 \\times 10^{-9} = 0'),
    ('Q.18 discriminant', D17, 6.80e-9, 0.005e-9, '= 6{,}80 \\times 10^{-9}$$'),
    ('Q.18 racine positive', x1_17, 4.04e-5, 0.005e-5, '{2} = 4{,}04 \\times 10^{-5}\\ \\text{mol}$$'),
    ('Q.18 racine négative', x2_17, -4.21e-5, 0.005e-5, '= -4{,}21 \\times 10^{-5}\\ \\text{mol}$$'),
    ('Q.18 xf inférieur à xmax', 0 < x1_17 < C17 * V17, True, 0, 'seule la racine $x_1$ convient'),
    ('Q.18 oxonium', h17, 4.04e-4, 0.005e-4, '= 4{,}04 \\times 10^{-4}\\ \\text{mol·L}^{-1}'),
    ('Q.18 pH', pH17, 3.39, 0.005, '= 3{,}39$$'),
    ('Q.18 taux d\'avancement', tau17, 4.0e-2, 0.05e-2, '= 4{,}0 \\times 10^{-2}$$'),
    ('Q.18 même résultat avec [H3O+]', h17_exact, h17, 1e-9, None),
    ('Q.18 retour sur KA', check17, 0.0, 1e-9, None),
    ('Q.18 pH approché', pH17_approx, 3.38, 0.005, 'un pH de $3{,}38$'),
    ('Ex. 3 ions hydroxyde', HOE3, 1.8e-3, 0.05e-3, '= 1{,}8 \\times 10^{-3}\\ \\text{mol·L}^{-1} \\qquad'),
    ('Ex. 3 taux d\'avancement', tauE3, 1.8e-2, 0.05e-2, '= 1{,}8 \\times 10^{-2}$$'),
    ('Ex. 3 KA', KaE3, 3.2e-10, 0.05e-10, '= 3{,}2 \\times 10^{-10}$$'),
    ('Ex. 3 rapport [B]/[BH+]', rE3, 56, 0.5, '= 10^{1{,}75} = 56$$'),
    ('Ex. 3 rapport tiré du taux', rE3_tau, 55, 0.5, 'soit un rapport voisin de 55'),
    ('Ex. 3 pH cohérent avec C et pKA', pH_theo_E3, 11.25, 0.01, 'il mesure un pH de $11{,}25$'),
    ('Q.20 rapport', r18, 20, 0.05, '= 10^{7{,}40 - 6{,}10} = 10^{1{,}30} = 20$$'),
    ('Q.20 exposant pH - pKA', 7.40 - 6.10, 1.30, 1e-9, '10^{7{,}40 - 6{,}10} = 10^{1{,}30}'),
    ('Q.20 étape : log KA = -pKA', -log10(10 ** -6.10), 6.10, 1e-9, '\\quad \\text{donc} \\quad \\log K_\\text{A} = -\\text{p}K_\\text{A}$$'),
    ('Q.20 étape : log([H3O+]/c°) = -pH', log10(10 ** -7.40), -7.40, 1e-9, '= -\\text{pH}$$'),
    ('Q.20 relation retrouvée (pH = pKA + log r)', 6.10 + log10(r18), 7.40, 1e-9, '$$-\\text{p}K_\\text{A} = \\log\\dfrac{[\\text{HCO}_3^-]}{[\\text{CO}_2]} - \\text{pH}$$'),
    ('L\'essentiel : Ke parmi les données fournies par l\'énoncé', Ke, 1.0e-14, 1e-20, 'Masses molaires, volume molaire, $K_\\text{e}$, $\\text{p}K_\\text{A}$'),
    ('Q.20 pourcentage', p18, 0.95, 0.005, '= 0{,}95$, soit $95\\ \\%$'),
    ('Q.21 CO2 à pH 5,0 (%)', c5[0], 96, 0.5, 'environ $96\\ \\%$ de'),
    ('Q.21 HCO3- à pH 5,0 (%)', c5[1], 4, 0.5, 'et $4\\ \\%$ de'),
    ('Q.21 HCO3- à pH 8,3 (%)', c83[1], 98, 0.5, 'environ $98\\ \\%$ de'),
    ('Q.21 autres espèces à pH 8,3 (%)', max(c83[0], c83[2]), 1, 0.5, 'à peine $1\\ \\%$'),
    ('Q.24 pH du mélange', 4.8 + log10(1), 4.8, 1e-9, '\\log 1 = 4{,}8$$'),
    ('Ex. 4 KA', 10 ** -7.5, 3.2e-8, 0.05e-8, '= 10^{-7{,}5} = 3{,}2 \\times 10^{-8}$$'),
    ('Ex. 4 rapport à pH 7,8', 10 ** 0.3, 2.0, 0.05, '= 10^{0{,}3} = 2{,}0'),
    ('Ex. 4 part de HClO à pH 7,8', part(7.8), 0.33, 0.005, '= 0{,}33$$'),
    ('Ex. 4 rapport à pH 7,2', 10 ** -0.3, 0.50, 0.005, '= 0{,}50'),
    ('Ex. 4 part de HClO à pH 7,2', part(7.2), 0.67, 0.005, '= 0{,}67$$'),
    ('Ex. 4 pH visé', pH_E4, 7.3, 0.05, '= 7{,}5 - 0{,}18 = 7{,}3$$'),
    ('Ex. 4 pH visé dans l\'intervalle', 7.2 <= pH_E4 <= 7.6, True, 0, 'le choix respecte la recommandation'),
    ('Figure 5, lecture à pH 5,0', c5[0], 96, 0.5, None),
    ('Figure 5, lecture à pH 8,3', c83[1], 98, 0.5, None),
    ('Figure 7, lecture à pH 7,8', 100 * part(7.8), 33, 0.5, None),
    ('Figure 7, lecture à pH 7,2', 100 * part(7.2), 67, 0.5, None),
]
textes = [
    ('Q.6 réactif limitant', lim6 == 'H3O+', 'les ions oxonium sont le réactif limitant'),
    ('Ex. 1 réactif limitant', lim1 == 'tartre', 'le tartre est le réactif limitant'),
    ('Q.7 sandwichs : le jambon limite', limitant_sandw == 'jambon', 'le jambon est le « réactif limitant »'),
    ('Q.7 deux sandwichs sur trois possibles : non totale', reste_deux[0] > 0 and reste_deux[1] > 0,
     'elle est non totale. Imaginez un second cuisinier chargé de défaire les sandwichs : une fois deux sandwichs prêts, il en défait autant que le premier en prépare'),
    # l'égalité des deux rythmes ne vaut qu'à l'état final (équilibre dynamique), pas pendant toute la transformation
    ('Q.7 équilibre dynamique à l\'état final', True,
     'En chimie, à l\'état final, la réaction inverse défait les produits au même rythme que la réaction directe les forme'),
    # n = m/M = C × V vaut pour un soluté, n = V/Vm pour un gaz : deux relations écrites à part
    ('L\'essentiel : relation des gaz à part', True, '$n = m/M = C \\times V$ ; gaz : $n = V_\\text{gaz}/V_\\text{m}$'),
    ('Q.1 : relation des gaz à part', True, '$n = \\dfrac{m}{M} = C \\times V$ ; pour un gaz, $n = \\dfrac{V_\\text{gaz}}{V_\\text{m}}$'),
    ('Q.7 énoncé : objet de la conclusion', True, 'puis conclure sur le caractère total ou non de la transformation'),
    ('Q.16 ordre des acides', ordre15 == ['NH4+', 'HClO', 'CH3COOH', 'HCOOH'],
     '\\text{NH}_4^{\\text{+}} < \\text{HClO} < \\text{CH}_3\\text{COOH} < \\text{HCOOH}'),
    ('Q.16 ordre des bases', True, '\\text{HCOO}^- < \\text{CH}_3\\text{COO}^- < \\text{ClO}^- < \\text{NH}_3'),
    ('Q.19 estomac', 2 < 4.4, 'l\'ibuprofène est surtout sous sa forme acide AH'),
    ('Q.19 intestin', 8 > 4.4, 'il est surtout sous sa forme basique'),
    ('Q.22 hélianthine', coul5['hélianthine'] == 'jaune', 'l\'hélianthine est jaune'),
    ('Q.22 bleu de bromothymol', coul5['bleu de bromothymol'] == 'jaune', 'le bleu de bromothymol est jaune'),
    ('Q.22 phénolphtaléine', coul5['phénolphtaléine'] == 'incolore', 'la phénolphtaléine est incolore'),
    ('Q.22 indicateur choisi', choix20 == ['phénolphtaléine'], 'seule la phénolphtaléine'),
    ('Q.23 pH 1', 1 < 2.3, 'À pH 1, inférieur à 2,3, le cation prédomine'),
    ('Q.23 pH 6', 2.3 < 6 < 9.6, 'À pH 6, compris entre 2,3 et 9,6, c\'est l\'amphion'),
    ('Q.23 pH 12', 12 > 9.6, 'À pH 12, supérieur à 9,6, c\'est l\'anion'),
    ('Ex. 3 pH 8,5', 6.4 < 8.5 < 9.5, 'le carbone dissous est surtout sous forme $\\text{HCO}_3^-$'),
    ('Ex. 4 pH 7,8', 7.8 > 7.5, 'l\'ion hypochlorite $\\text{ClO}^-$ prédomine'),
    ('Figure 5, étiquettes', True, "'pH 5,0 : 96 %'"), ('Figure 5, étiquettes (2)', True, "'pH 8,3 : 98 %'"),
    ('Figure 7, étiquettes', True, "'pH 7,8 : 33 %'"), ('Figure 7, étiquettes (2)', True, "'pH 7,2 : 67 %'"),
]
ecarts = [(n, cc, i) for n, cc, i, t, _ in controles if abs(float(cc) - float(i)) > t]
absents = [(n, w) for n, _, _, _, w in controles if w is not None and w not in src]
faux = [n for n, ok, _ in textes if not ok]
absents += [(n, w) for n, _, w in textes if w not in (figsrc if n.startswith('Figure') else src)]
print('--- comparaison avec la fiche : %d valeurs et %d conclusions contrôlées, %d écart(s), %d écriture(s) introuvable(s)'
      % (len(controles), len(textes), len(ecarts) + len(faux), len(absents)))
for n, cc, i in ecarts: print('   ÉCART', n, ': recalculé %.5g, imprimé %.5g' % (cc, i))
for n in faux: print('   CONCLUSION FAUSSE', n)
for n, w in absents: print('   INTROUVABLE', n, ':', w)

# niveaux des questions et des exercices, tableau « Votre parcours »
niveaux = {int(q): int(n) for q, n in re.findall(r'^## \[Q\.(\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)', src, flags=re.M)}
attendu = {10: [1, 2, 4, 6, 7, 9, 10, 11, 14, 16, 19, 22, 24], 14: [3, 5, 8, 12, 13, 15, 17, 20, 21, 23], 18: [18]}
faux_niv = [(q, n) for n, qs in attendu.items() for q in qs if niveaux.get(q) != n]
manque = sorted(set(niveaux) - {q for qs in attendu.values() for q in qs})
ex_niv = {int(e): int(n) for e, n in re.findall(r'^### \[Exercice (\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)', src, flags=re.M)}
ex_q = {}
for e in range(1, 5):
    bloc = src[src.index('### [Exercice %d]' % e):src.index('[CIBLE:c_ex%d]' % e)]
    ex_q[e] = len(re.findall(r'^\*\*\d+\.\*\*', bloc, flags=re.M))
ex_att = {1: (10, 6, 'Questions 1 et 5 : objectif 14'), 2: (10, 5, 'Questions 4 et 5 : objectif 14'),
          3: (14, 6, 'Question 6 : objectif 18'), 4: (14, 6, 'Question 6 : objectif 18')}
ex_ko = [e for e, (n, nq, mention) in ex_att.items() if ex_niv.get(e) != n or ex_q[e] != nq
         or mention not in src[src.index('### [Exercice %d]' % e):][:600]]
print('--- niveaux : %d questions et %d exercices, %d écart(s)' % (len(niveaux), len(ex_niv), len(faux_niv) + len(manque) + len(ex_ko)))
for q, n in faux_niv: print('   NIVEAU Q.%d : %s dans la fiche, %d dans le parcours' % (q, niveaux.get(q), n))
for q in manque: print('   Q.%d absente du parcours' % q)
for e in ex_ko: print('   EXERCICE %d : niveau, nombre de questions ou mention du niveau des dernières questions' % e)
parcours = ['| Q.1, Q.2, Q.4, Q.6, Q.7, Q.9 à Q.11, Q.14, Q.16, Q.19, Q.22, Q.24 | Ex. 1 (questions 2 à 4 et 6), Ex. 2 (questions 1 à 3) |',
            '| Plus Q.3, Q.5, Q.8, Q.12, Q.13, Q.15, Q.17, Q.20, Q.21, Q.23 | Ex. 1 et Ex. 2, Ex. 3 et Ex. 4 (questions 1 à 5) |']
# le parcours couvre exactement les questions de niveau 10, puis 14 (« Plus ... »)
def liste_q(cell):
    qs = []
    for a, b in re.findall(r'Q\.(\d+)(?: à Q\.(\d+))?', cell):
        qs += list(range(int(a), int(b or a) + 1))
    return sorted(qs)
par_ko = [n for n, p in ((10, parcours[0]), (14, parcours[1])) if liste_q(p.split('|')[1]) != attendu[n]]
for n in par_ko: print('   PARCOURS : la ligne Objectif %d ne reprend pas exactement les questions de ce niveau' % n)
perdus_par = par_ko
perdus = [p for p in parcours if p not in src]
for p in perdus: print('   PARCOURS INTROUVABLE :', p)

# tableau « Ce qui est tombé » : uniquement des exercices de physique-chimie, renvois cohérents avec les mentions
bloc = src[src.index('# Ce qui est tombé'):src.index('Ce qu\'il faut en retenir')]
lignes = [[c.strip() for c in l.strip().strip('|').split('|')] for l in bloc.splitlines()
          if l.startswith('| ') and not l.startswith('| Session')]
def renvois(cell):
    qs = set()
    for a, b in re.findall(r'Q\.(\d+)(?: à Q\.(\d+))?', cell):
        qs |= set(range(int(a), int(b or a) + 1))
    return qs, {int(e) for e in re.findall(r'Ex\. (\d+)', cell)}
table = [(l[0], l[1], l[2]) + renvois(l[3]) for l in lignes]
qs_de = lambda *qq: [t for t in table if t[3] & set(qq)]
comptes = [('exercices', len(table), 15), ('sciences de l\'ingénieur', len([t for t in table if 'ingénieur' in ' '.join(t[:3]).lower()]), 0),
           ('sessions 2026', len([t for t in table if '2026' in t[0]]), 7),
           ('forme prédominante (Q.19 à Q.21, Q.23)', len(qs_de(19, 20, 21, 23)), 10),
           ('Brønsted (Q.9)', len(qs_de(9)), 8), ('concentrations (Q.1 à Q.5)', len(qs_de(1, 2, 3, 4, 5)), 6),
           ('force des acides (Q.14 à Q.18)', len(qs_de(14, 15, 16, 17, 18)), 6)]
mauvais = [cc for cc in comptes if cc[1] != cc[2]]
print('--- tableau : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s)' % len(mauvais))
demande = {1: ('Demandé en 2026 (Amérique du Nord)', ['Amérique du Nord 2026, jour 2']),
           2: ('Demandé en 2025 (Amérique du Sud)', ['Amérique du Sud 2025, jour 2']),
           3: ('Demandé en 2025 et 2026', ['Métropole, juin 2025, jour 1', 'Amérique du Sud 2025, jour 2', 'Amérique du Nord 2026, jour 1']),
           4: ('Demandé en 2025 et 2026', ['Centres étrangers 2026, jour 1', 'Amérique du Nord 2025, jour 2', 'Amérique du Sud 2025, jour 2']),
           6: ('Demandé en 2025 (Métropole, septembre)', ['Métropole, septembre 2025, jour 2']),
           9: ('Demandé dans au moins huit exercices en 2025 et 2026', 8),
           10: ('Demandé en 2025 (Métropole, septembre)', ['Métropole, septembre 2025, jour 1']),
           15: ('Demandé en 2026 (Amérique du Nord)', ['Amérique du Nord 2026, jour 1', 'Amérique du Nord 2026, jour 2']),
           16: ('Demandé en 2026 (Antilles-Guyane, Métropole)', ['Antilles-Guyane 2026, jour 2', 'Métropole, septembre 2026, jour 1', 'Métropole, septembre 2026, jour 2']),
           17: ('Demandé en 2025 (Métropole, septembre)', ['Métropole, septembre 2025, jour 2']),
           19: ('Demandé dans au moins huit exercices en 2025 et 2026', 8),
           20: ('Demandé en 2026 (Antilles-Guyane)', ['Antilles-Guyane 2026, jour 2']),
           21: ('Demandé en 2025 et 2026', ['Asie 2026, jour 1', 'Métropole, septembre 2025, jour 2']),
           22: ('Demandé en 2025 (Métropole, Amérique du Nord)', ['Métropole, juin 2025, jour 1', 'Amérique du Nord 2025, jour 2']),
           23: ('Demandé en 2025 (Amérique du Nord)', ['Amérique du Nord 2025, jour 2'])}
metas = {int(q): m for q, m in re.findall(r'^## \[Q\.(\d+)\].*?\n\n::: \{custom-style="Meta"\}\n(.*)$', src, flags=re.M)}
dem_ko = []
for q in range(1, NQ + 1):
    lignes_q = [t[0] for t in table if q in t[3]]
    if q not in demande:
        if 'Demandé' in metas[q] or lignes_q: dem_ko.append('Q.%d : mention ou ligne du tableau inattendue' % q)
        continue
    texte, att = demande[q]
    if texte not in metas[q]: dem_ko.append('Q.%d : « %s » absent de la ligne d\'information' % (q, texte))
    if (len(lignes_q) != att) if isinstance(att, int) else (sorted(lignes_q) != sorted(att)):
        dem_ko.append('Q.%d : lignes du tableau %s' % (q, lignes_q))
sujets = {1: ('Amérique du Sud 2025, jour 2', 'Infusion à la framboise', '(voir BAC Amérique du Sud 2025)', 'Amérique du Sud 2025, jour 2, exercice 1'),
          2: ('Amérique du Nord 2026, jour 2', 'La lessive de cendre', '(voir BAC Amérique du Nord 2026)', 'Amérique du Nord 2026, jour 2, exercice 3'),
          3: ('Amérique du Nord 2026, jour 1', 'Valorisation du dioxyde de carbone dans les cimenteries', '(voir BAC Amérique du Nord 2026)', 'Amérique du Nord 2026, jour 1, exercice 1'),
          4: ('Antilles-Guyane 2026, jour 2', 'Traitement de l\'eau d\'une piscine', '(voir BAC Antilles-Guyane 2026)', 'Antilles-Guyane 2026, jour 2, exercice 3')}
for e, (sess, nom, voir, mention) in sujets.items():
    tete = src[src.index('### [Exercice %d]' % e):][:900]
    lig = [t for t in table if t[0] == sess and t[1] == nom]
    if not lig or e not in lig[0][4]: dem_ko.append('Ex. %d : ligne « %s » absente ou sans renvoi' % (e, nom))
    if voir not in tete or ('%s : « %s »' % (mention, nom)) not in tete: dem_ko.append('Ex. %d : renvoi au sujet incomplet' % e)
print('--- mentions « Demandé » et sujets d\'après : %d écart(s)' % len(dem_ko))
for d in dem_ko: print('   ' + d)
phrases = ['dans au moins quinze exercices des sessions 2025 et 2026',
           'revient dans au moins dix des quinze exercices : c\'est la priorité (Q.19 à Q.21, Q.23, Ex. 3, Ex. 4)',
           'est demandée dans au moins huit exercices (Q.9)',
           'accompagnent au moins six exercices (Q.1 à Q.5, Ex. 1)', 'dans au moins six exercices (Q.14 à Q.18, Ex. 2, Ex. 3)']
perdues = [p for p in phrases if p not in src]
for p in perdues: print('   PHRASE INTROUVABLE :', p)
print('--- phrases de synthèse : %d suivies, %d introuvable(s)' % (len(phrases), len(perdues)))

# figures : légendes numérotées dans l'ordre, renvois du texte vers des figures existantes
nums = [int(n) for n in re.findall(r'^Figure (\d+)\. ', src, flags=re.M)]
refs = sorted({int(n) for n in re.findall(r'\(?figure (\d+)\)?', src)})
fig_ko = nums != list(range(1, len(nums) + 1)) or any(n not in nums for n in refs)
print('--- figures : %d légendes, renvois vers %s%s' % (len(nums), ', '.join(map(str, refs)), ' ; ÉCART' if fig_ko else ''))

# index : renvois existants, chaque question et chaque exercice présents au moins une fois
idx = src[src.index('# Index des notions'):]
iq, ie = set(), set()
for l in idx.splitlines():
    if l.startswith('| ') and not l.startswith('| Notion'):
        a, b = renvois(l.split('|')[2]); iq |= a; ie |= b
idx_ko = sorted(set(range(1, NQ + 1)) - iq) + [100 + e for e in sorted(set(range(1, 5)) - ie)] + [q for q in iq if q > NQ]
print('--- index : %d questions et %d exercices cités%s' % (len(iq), len(ie), ' ; ÉCART %s' % idx_ko if idx_ko else ''))

# renvois « Q.n » du texte, ancres et boutons : chaque renvoi vise une question qui existe, chaque question a son corrigé
renv = sorted({int(n) for n in re.findall(r'\bQ\.(\d+)\b', src)})
anc_e = sorted(int(n) for n in re.findall(r'\{#q(\d+)\}', src)); anc_c = sorted(int(n) for n in re.findall(r'\{#c_q(\d+)\}', src))
bout_c = sorted(int(n) for n in re.findall(r'\[CIBLE:c_q(\d+)\]', src)); bout_e = sorted(int(n) for n in re.findall(r'\[CIBLE:q(\d+)\]', src))
titres_c = [int(n) for n in re.findall(r'^#### \[Corrigé\]\{custom-style="NumCorrige"\}\\ \\ Q\.(\d+) ', src, flags=re.M)]
titres_e = [int(n) for n in re.findall(r'^## \[Q\.(\d+)\]', src, flags=re.M)]
tout = list(range(1, NQ + 1))
renv_ko = [n for n in renv if n > NQ] + (['ancres'] if anc_e != tout or anc_c != tout else []) \
          + (['boutons'] if bout_c != tout or bout_e != tout else []) + (['titres'] if titres_c != tout or titres_e != tout else [])
print('--- renvois Q.n, ancres, boutons et titres : %d questions%s' % (NQ, ' ; ÉCART %s' % renv_ko if renv_ko else ''))

# L'essentiel : « À connaître par cœur » garde ses intitulés de colonnes (lus par l'application), puis vient « À savoir retrouver »
ess = src[src.index('# L\'essentiel en une page'):src.index('# Ce qui est tombé')]
ess_ko = []
if '| Notion | Relation | À retenir |' not in ess: ess_ko.append('intitulés du tableau « À connaître par cœur »')
if not ess.index('À connaître par cœur') < ess.index('À savoir retrouver') < ess.index('Fourni par l\'énoncé'): ess_ko.append('ordre des rubriques')
if '| Notion | Relation | Comment la retrouver |' not in ess: ess_ko.append('intitulés du tableau « À savoir retrouver »')
print('--- L\'essentiel : rubriques%s' % (' ; ÉCART %s' % ess_ko if ess_ko else ' en place'))

# tableaux d'avancement au format de la maison : « État du système », « Avancement (mol) », espèces, colonne de la flèche ;
# lignes État initial, En cours, puis l'état final (deux lignes, « si la transformation était totale » et « réel », quand le tableau oppose xmax à xf)
tav_ko, ntav = [], 0
for bloc_t in re.findall(r'(\| État du système \|.*?)(?:\n\n|\Z)', src, flags=re.S):
    ntav += 1
    lig_t = bloc_t.splitlines()
    tete = [c.strip() for c in lig_t[0].strip().strip('|').split('|')]
    fl = [i for i, c in enumerate(tete) if c in ('→', '⇄')]
    if tete[1] != 'Avancement (mol)' or len(fl) != 1: tav_ko.append(lig_t[0][:60]); continue
    if not lig_t[1].startswith('|:--|') or lig_t[1].count(':-:') != len(tete) - 1: tav_ko.append('alignement : ' + lig_t[0][:40])
    noms_t = [l.strip().strip('|').split('|')[0].strip() for l in lig_t[2:]]
    if noms_t[:2] != ['État initial', 'En cours'] or noms_t[2:] not in (['État final'], ['État final si la transformation était totale', 'État final réel']):
        tav_ko.append('lignes : ' + ', '.join(noms_t))
    for l in lig_t[2:]:
        cel = [c.strip() for c in l.strip().strip('|').split('|')]
        if len(cel) != len(tete) or cel[fl[0]] != '': tav_ko.append('ligne : ' + l[:40])
    # chaque espèce après la première de chaque membre est précédée de « \+ »
    for i, c in enumerate(tete[2:], start=2):
        if i in fl: continue
        premier = (i == 2) or (i == fl[0] + 1)
        if premier == c.startswith('\\+'): tav_ko.append('signe + : ' + c)
if ntav != 5: tav_ko.append('5 tableaux attendus, %d trouvés' % ntav)
print('--- tableaux d\'avancement : %d au format de la maison%s' % (ntav, ' ; ÉCART %s' % tav_ko if tav_ko else ''))

if ecarts or faux or absents or faux_niv or manque or ex_ko or perdus or perdus_par or mauvais or dem_ko or perdues or fig_ko or idx_ko \
        or renv_ko or ess_ko or tav_ko:
    raise SystemExit(1)
print('--- tout est bon')
