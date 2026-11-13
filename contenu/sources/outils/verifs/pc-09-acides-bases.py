# Recalcul indépendant des résultats numériques de la fiche 9 (Acides et bases),
# puis contrôle de la structure de la fiche : niveaux et parcours, tableau « Ce qui est tombé » et mentions
# « Demandé ... », exercices d'après un sujet, figures et index.
# usage : python3 outils/verifs/pc-09-acides-bases.py
# Chaque valeur est recalculée à partir des seules données des énoncés ; on vérifie ensuite que son écriture
# figure telle quelle dans la fiche (écriture LaTeX du fichier source).
import os, re
from math import log10, sqrt
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(RACINE, 'fiches', 'pc-09-acides-bases', 'fiche.md'), encoding='utf-8').read()
figsrc = open(os.path.join(RACINE, 'outils', 'figures', 'pc-09-acides-bases.py'), encoding='utf-8').read()
Ke = 1.0e-14
h = lambda pH: 10 ** -pH                       # concentration en ions oxonium (mol/L)
pH_de = lambda c: -log10(c)

# Thème 1 : solutions et avancement
M1 = 4 * 12.0 + 6 * 1.0 + 5 * 16.0; n1 = 2.00e-2 * 0.2500; m1 = n1 * M1; V1 = 1.0e-2 * 24.0
Cm2 = 1.2 * 60.0; Cm2_etiq = 0.07 * 1010
m3 = 0.37 * 1180; n3 = m3 / 36.5
Vm4 = 100.0 / 5.00
F5 = (200.0 / 20.0) * 40; Cm5 = F5 * 0.250; m5 = Cm5 * 0.100; V5 = m5 / 0.789
nC6, nH6 = 2.0 / 100.1, 0.50 * 0.0500; xm6 = min(nC6, nH6 / 2); lim6 = 'H3O+' if nH6 / 2 < nC6 else 'CaCO3'
n07 = 9.0 / 60.0; xm7 = min(n07, 0.15); xf7 = n07 - 5.0e-2; tau7 = xf7 / xm7
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

# Q.12, ajout d'acide fort à une solution de pH donné
n12 = h(6.30) * 0.0100; pH12 = pH_de((n12 + 0.20e-3) / 0.0100)
# Q.17 : état final d'une solution d'acide faible, équation du second degré en xf
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
    ('Q.7 quantité d\'acide', n07, 0.15, 1e-9, '= 0{,}15\\ \\text{mol}$'),
    ('Q.7 avancement final', xf7, 0.10, 1e-9, '= 0{,}10\\ \\text{mol}$ et'),
    ('Q.7 taux d\'avancement', tau7, 0.67, 0.005, '= 0{,}67$$'),
    ('Q.7 masse d\'ester', xf7 * 88.0, 8.8, 0.05, '= 8{,}8\\ \\text{g}$.'),
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
    ('Q.10 ions oxonium', h(2.70), 2.0e-3, 0.05e-3, '= 2{,}0 \\times 10^{-3}\\ \\text{mol·L}^{-1}$$'),
    ('Q.10 pH', pH_de(4.0e-9), 8.40, 0.005, '= 8{,}40$$'),
    ('Q.11 oxonium à pH 11,20', h(11.20), 6.3e-12, 0.05e-12, '= 6{,}3 \\times 10^{-12}\\ \\text{mol·L}^{-1}$, donc'),
    ('Q.11 hydroxyde à pH 11,20', HO11a, 1.6e-3, 0.05e-3, '= 1{,}6 \\times 10^{-3}\\ \\text{mol·L}^{-1}$$'),
    ('Q.11 oxonium à pH 3,50', h(3.50), 3.2e-4, 0.05e-4, '= 3{,}2 \\times 10^{-4}\\ \\text{mol·L}^{-1}$ et'),
    ('Q.11 hydroxyde à pH 3,50', HO11b, 3.2e-11, 0.05e-11, '$[\\text{HO}^-] = 3{,}2 \\times 10^{-11}'),
    ('Q.11 oxonium neutre à 37 °C', h37, 1.55e-7, 0.005e-7, '= 1{,}55 \\times 10^{-7}'),
    ('Q.11 pH neutre à 37 °C', pH_de(h37), 6.81, 0.005, '\\text{pH} = 6{,}81$$'),
    ('Q.12 acide fort', pH_de(5.0e-3), 2.30, 0.005, '= 2{,}30 \\qquad'),
    ('Q.12 acide dilué 10 fois', pH_de(5.0e-4), 3.30, 0.005, '= 3{,}30$$'),
    ('Q.12 oxonium, base forte', Ke / 2.0e-2, 5.0e-13, 1e-20, '= 5{,}0 \\times 10^{-13}'),
    ('Q.12 base forte', pH_de(Ke / 2.0e-2), 12.30, 0.005, '\\text{pH} = 12{,}30$$'),
    ('Q.12 base diluée 100 fois', pH_de(Ke / 2.0e-4), 10.30, 0.005, 'le pH vaut $10{,}30$'),
    ('Q.12 ions oxonium initiaux (ajout)', n12, 5.0e-9, 0.05e-9, '= 5{,}0 \\times 10^{-9}\\ \\text{mol}$'),
    ('Q.12 pH après ajout', pH12, 1.70, 0.005, '\\text{pH} = 1{,}70$$'),
    ('Ex. 2 concentration', CE2, 0.1000, 0.00005, '= 0{,}1000\\ \\text{mol·L}^{-1}'),
    ('Ex. 2 ions potassium', 2 * 0.100, 0.200, 1e-9, '= 2C = 0{,}200'),
    ('Ex. 2 ions hydroxyde', HOE2, 4.0e-3, 0.05e-3, '= 4{,}0 \\times 10^{-3}\\ \\text{mol·L}^{-1}$$'),
    ('Ex. 2 pH si totale', 14 + log10(0.100), 13.00, 0.005, 'soit un pH de $13{,}00$'),
    ('Ex. 2 taux d\'avancement', tauE2, 4.0e-2, 0.05e-2, '= 4{,}0 \\times 10^{-2}$$'),
    ('Ex. 2 rapport à la soude', 0.100 / 4.0e-3, 25, 1e-9, '25 fois plus faible'),
    ('Q.13 acide chlorhydrique', tau13a, 1.0, 1e-9, '$\\tau = 1$. La réaction est totale'),
    ('Q.13 oxonium, acide éthanoïque', h(3.40), 4.0e-4, 0.05e-4, '= 4{,}0 \\times 10^{-4}\\ \\text{mol·L}^{-1}$, donc'),
    ('Q.13 acide éthanoïque', tau13b, 4.0e-2, 0.05e-2, '\\tau = \\dfrac{4{,}0 \\times 10^{-4}}{1{,}0 \\times 10^{-2}} = 4{,}0 \\times 10^{-2}$$'),
    ('Q.14 ions hydroxyde', HO14, 4.0e-4, 0.05e-4, '= 10^{-3{,}40} = 4{,}0 \\times 10^{-4}\\ \\text{mol·L}^{-1} \\qquad'),
    ('Q.14 taux d\'avancement', tau14, 4.0e-2, 0.05e-2, 'vaut $4{,}0\\ \\%$ : la transformation'),
    ('Q.15 constante d\'acidité', 10 ** -7.5, 3.2e-8, 0.05e-8, '= 3{,}2 \\times 10^{-8}$$'),
    ('Q.16 acide restant', AH16, 9.6e-3, 1e-9, '= 9{,}6 \\times 10^{-3}\\ \\text{mol·L}^{-1}$$'),
    ('Q.16 KA', Ka16, 1.7e-5, 0.05e-5, '= 1{,}7 \\times 10^{-5} \\qquad'),
    ('Q.16 KA sans arrondi', Ka16_exact, 1.7e-5, 0.07e-5, '= 1{,}7 \\times 10^{-5} \\qquad'),
    ('Q.16 pKA (calculé avec KA arrondi à deux chiffres, comme dans la fiche)', -log10(float('%.1e' % Ka16)), 4.77, 0.005, '= 4{,}77$$'),
    ('Q.16 pKA arrondi', round(-log10(float('%.1e' % Ka16)), 1), 4.8, 1e-9, 'Soit $\\text{p}K_\\text{A} = 4{,}8$ avec deux chiffres'),
    ('Q.17 équation : coefficient de xf', b17, 1.7e-6, 0.05e-6, 'x_\\text{f}^2 + 1{,}7 \\times 10^{-6}\\, x_\\text{f} - 1{,}7 \\times 10^{-9} = 0'),
    ('Q.17 discriminant', D17, 6.80e-9, 0.005e-9, '= 6{,}80 \\times 10^{-9}$$'),
    ('Q.17 racine positive', x1_17, 4.04e-5, 0.005e-5, '= 4{,}04 \\times 10^{-5}\\ \\text{mol} \\qquad'),
    ('Q.17 racine négative', x2_17, -4.21e-5, 0.005e-5, '= -4{,}21 \\times 10^{-5}\\ \\text{mol}$$'),
    ('Q.17 xf inférieur à xmax', 0 < x1_17 < C17 * V17, True, 0, 'seule la racine $x_1$ convient'),
    ('Q.17 oxonium', h17, 4.04e-4, 0.005e-4, '= 4{,}04 \\times 10^{-4}\\ \\text{mol·L}^{-1}'),
    ('Q.17 pH', pH17, 3.39, 0.005, '= 3{,}39$$'),
    ('Q.17 taux d\'avancement', tau17, 4.0e-2, 0.05e-2, '= 4{,}0 \\times 10^{-2}$$'),
    ('Q.17 même résultat avec [H3O+]', h17_exact, h17, 1e-9, None),
    ('Q.17 retour sur KA', check17, 0.0, 1e-9, None),
    ('Q.17 pH approché', pH17_approx, 3.38, 0.005, 'un pH de $3{,}38$'),
    ('Ex. 3 ions hydroxyde', HOE3, 1.8e-3, 0.05e-3, '= 1{,}8 \\times 10^{-3}\\ \\text{mol·L}^{-1} \\qquad'),
    ('Ex. 3 taux d\'avancement', tauE3, 1.8e-2, 0.05e-2, '= 1{,}8 \\times 10^{-2}$$'),
    ('Ex. 3 KA', KaE3, 3.2e-10, 0.05e-10, '= 3{,}2 \\times 10^{-10}$$'),
    ('Ex. 3 rapport [B]/[BH+]', rE3, 56, 0.5, '= 10^{1{,}75} = 56$$'),
    ('Ex. 3 rapport tiré du taux', rE3_tau, 55, 0.5, 'soit un rapport voisin de 55'),
    ('Ex. 3 pH cohérent avec C et pKA', pH_theo_E3, 11.25, 0.01, 'il mesure un pH de $11{,}25$'),
    ('Q.18 rapport', r18, 20, 0.05, '= 10^{1{,}30} = 20$$'),
    ('Q.18 pourcentage', p18, 0.95, 0.005, '= 0{,}95$, soit $95\\ \\%$'),
    ('Q.19 CO2 à pH 5,0 (%)', c5[0], 96, 0.5, 'environ $96\\ \\%$ de'),
    ('Q.19 HCO3- à pH 5,0 (%)', c5[1], 4, 0.5, 'et $4\\ \\%$ de'),
    ('Q.19 HCO3- à pH 8,3 (%)', c83[1], 98, 0.5, 'environ $98\\ \\%$ de'),
    ('Q.19 autres espèces à pH 8,3 (%)', max(c83[0], c83[2]), 1, 0.5, 'à peine $1\\ \\%$'),
    ('Q.23 pH du mélange', 4.8 + log10(1), 4.8, 1e-9, '\\log 1 = 4{,}8$$'),
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
    ('Q.15 ordre des acides', ordre15 == ['NH4+', 'HClO', 'CH3COOH', 'HCOOH'],
     '\\text{NH}_4^{\\text{+}} < \\text{HClO} < \\text{CH}_3\\text{COOH} < \\text{HCOOH}'),
    ('Q.15 ordre des bases', True, '\\text{HCOO}^- < \\text{CH}_3\\text{COO}^- < \\text{ClO}^- < \\text{NH}_3'),
    ('Q.17 estomac', 2 < 4.4, 'l\'ibuprofène est surtout sous sa forme acide AH'),
    ('Q.17 intestin', 8 > 4.4, 'il est surtout sous sa forme basique'),
    ('Q.20 hélianthine', coul5['hélianthine'] == 'jaune', 'l\'hélianthine est jaune'),
    ('Q.20 bleu de bromothymol', coul5['bleu de bromothymol'] == 'jaune', 'le bleu de bromothymol est jaune'),
    ('Q.20 phénolphtaléine', coul5['phénolphtaléine'] == 'incolore', 'la phénolphtaléine est incolore'),
    ('Q.20 indicateur choisi', choix20 == ['phénolphtaléine'], 'seule la phénolphtaléine'),
    ('Q.21 pH 1', 1 < 2.3, 'À pH 1, inférieur à 2,3, le cation prédomine'),
    ('Q.21 pH 6', 2.3 < 6 < 9.6, 'À pH 6, compris entre 2,3 et 9,6, c\'est l\'amphion'),
    ('Q.21 pH 12', 12 > 9.6, 'À pH 12, supérieur à 9,6, c\'est l\'anion'),
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
attendu = {10: [1, 2, 4, 6, 8, 9, 10, 13, 15, 18, 21, 23], 14: [3, 5, 7, 11, 12, 14, 16, 19, 20, 22], 18: [17]}
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
parcours = ['| Q.1, Q.2, Q.4, Q.6, Q.8 à Q.10, Q.13, Q.15, Q.18, Q.21, Q.23 | Ex. 1 (questions 2 à 4 et 6), Ex. 2 (questions 1 à 3) |',
            '| Plus Q.3, Q.5, Q.7, Q.11, Q.12, Q.14, Q.16, Q.19, Q.20, Q.22 | Ex. 1 et Ex. 2, Ex. 3 et Ex. 4 (questions 1 à 5) |']
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
           ('forme prédominante (Q.18 à Q.20, Q.22)', len(qs_de(18, 19, 20, 22)), 10),
           ('Brønsted (Q.8)', len(qs_de(8)), 8), ('concentrations (Q.1 à Q.5)', len(qs_de(1, 2, 3, 4, 5)), 6),
           ('force des acides (Q.13 à Q.17)', len(qs_de(13, 14, 15, 16, 17)), 6)]
mauvais = [cc for cc in comptes if cc[1] != cc[2]]
print('--- tableau : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s)' % len(mauvais))
demande = {1: ('Demandé en 2026 (Amérique du Nord)', ['Amérique du Nord 2026, jour 2']),
           2: ('Demandé en 2025 (Amérique du Sud)', ['Amérique du Sud 2025, jour 2']),
           3: ('Demandé en 2025 et 2026', ['Métropole, juin 2025, jour 1', 'Amérique du Sud 2025, jour 2', 'Amérique du Nord 2026, jour 1']),
           4: ('Demandé en 2025 et 2026', ['Centres étrangers 2026, jour 1', 'Amérique du Nord 2025, jour 2', 'Amérique du Sud 2025, jour 2']),
           6: ('Demandé en 2025 (Métropole, septembre)', ['Métropole, septembre 2025, jour 2']),
           8: ('Demandé dans au moins huit exercices en 2025 et 2026', 8),
           9: ('Demandé en 2025 (Métropole, septembre)', ['Métropole, septembre 2025, jour 1']),
           14: ('Demandé en 2026 (Amérique du Nord)', ['Amérique du Nord 2026, jour 1', 'Amérique du Nord 2026, jour 2']),
           15: ('Demandé en 2026 (Antilles-Guyane, Métropole)', ['Antilles-Guyane 2026, jour 2', 'Métropole, septembre 2026, jour 1', 'Métropole, septembre 2026, jour 2']),
           16: ('Demandé en 2025 (Métropole, septembre)', ['Métropole, septembre 2025, jour 2']),
           18: ('Demandé dans au moins huit exercices en 2025 et 2026', 8),
           19: ('Demandé en 2026 (Antilles-Guyane)', ['Antilles-Guyane 2026, jour 2']),
           20: ('Demandé en 2025 et 2026', ['Asie 2026, jour 1', 'Métropole, septembre 2025, jour 2']),
           21: ('Demandé en 2025 (Métropole, Amérique du Nord)', ['Métropole, juin 2025, jour 1', 'Amérique du Nord 2025, jour 2']),
           22: ('Demandé en 2025 (Amérique du Nord)', ['Amérique du Nord 2025, jour 2'])}
metas = {int(q): m for q, m in re.findall(r'^## \[Q\.(\d+)\].*?\n\n::: \{custom-style="Meta"\}\n(.*)$', src, flags=re.M)}
dem_ko = []
for q in range(1, 24):
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
           'revient dans au moins dix des quinze exercices', 'est demandée dans au moins huit exercices (Q.8)',
           'accompagnent au moins six exercices (Q.1 à Q.5, Ex. 1)', 'dans au moins six exercices (Q.13 à Q.17, Ex. 2, Ex. 3)']
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
idx_ko = sorted(set(range(1, 24)) - iq) + [100 + e for e in sorted(set(range(1, 5)) - ie)] + [q for q in iq if q > 23]
print('--- index : %d questions et %d exercices cités%s' % (len(iq), len(ie), ' ; ÉCART %s' % idx_ko if idx_ko else ''))
if ecarts or faux or absents or faux_niv or manque or ex_ko or perdus or mauvais or dem_ko or perdues or fig_ko or idx_ko:
    raise SystemExit(1)
print('--- tout est bon')
