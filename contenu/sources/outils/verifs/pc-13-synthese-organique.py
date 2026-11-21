# Recalcul indépendant des résultats numériques de la fiche 13 (Synthèse organique), puis contrôle de la structure :
# formules brutes recalculées à partir des formules semi-développées, équations équilibrées (éléments et charges),
# données des énoncés, figures (montages, chromatographies, spectres, mécanisme), niveaux et parcours,
# tableau « Ce qui est tombé » et mentions « Demandé ... », exercices d'après un sujet, légendes et index.
# usage : python3 outils/verifs/pc-13-synthese-organique.py
import os, re, ast
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(RACINE, 'fiches', 'pc-13-synthese-organique', 'fiche.md'), encoding='utf-8').read()
figsrc = open(os.path.join(RACINE, 'outils', 'figures', 'pc-13-synthese-organique.py'), encoding='utf-8').read()
enonces = src[:src.index('<!--debut:complet-->')]
NQ, NEX, NFIG = 20, 5, 27
MA = {'H': 1.0, 'C': 12.0, 'N': 14.0, 'O': 16.0, 'S': 32.1}

def compo(f):
    # composition d'une formule brute ou semi-développée écrite en clair : CH3-CH(OH)-CH3, H2N-CH2-COOH, R'-OH...
    s = f.replace("R'", 'Q').replace('-', '').replace('=', '')
    pos = 0
    def groupe():
        nonlocal pos
        comp = {}
        while pos < len(s) and s[pos] != ')':
            if s[pos] == '(':
                pos += 1; sous = groupe()
                if pos >= len(s) or s[pos] != ')': raise ValueError(f)
                pos += 1
                k = re.match(r'\d*', s[pos:]).group(); pos += len(k)
                for e, n in sous.items(): comp[e] = comp.get(e, 0) + int(k or 1) * n
            else:
                m = re.match(r'([A-Z][a-z]?)(\d*)', s[pos:])
                if not m: raise ValueError(f)
                pos += len(m.group()); comp[m.group(1)] = comp.get(m.group(1), 0) + int(m.group(2) or 1)
        return comp
    c = groupe()
    if pos != len(s): raise ValueError(f)
    return c
def ecrire(c):
    ordre = ['C', 'H'] + sorted(e for e in c if e not in ('C', 'H'))
    return ''.join(e + (str(c[e]) if c[e] > 1 else '') for e in ordre if c.get(e))
def brute(f): return ecrire(compo(f))
def masse(f): return sum(MA[e] * n for e, n in compo(f).items())
def reste(reactifs, produits):
    # ce qu'il faut ajouter aux produits connus pour conserver les éléments
    c = {}
    for f in reactifs:
        for e, n in compo(f).items(): c[e] = c.get(e, 0) + n
    for f in produits:
        for e, n in compo(f).items(): c[e] = c.get(e, 0) - n
    return ecrire(c)

# données des figures : chromatographies (Q.17, exercice 4) et spectres infrarouges
def appel(motif):
    m = re.search(motif, figsrc)
    return ast.literal_eval('(' + m.group(1) + ')') if m else None
ccm17 = appel(r"\nccm\('fig_ccm', (\[\[.*?\]\], [\d.]+), 'ABCD'\)")
ccm17c = appel(r"\nccm\('fig_ccm_c', (\[\[.*?\]\], [\d.]+), 'ABCD', True")
ccm4 = appel(r"plaque_ccm\(ax2, (\[\[.*?\]\], [\d.]+), '123'")
SPEC = ast.literal_eval(re.search(r'\nSPECTRES = (\{.*?\]\})\n', figsrc, flags=re.S).group(1))
def bandes(cle, a, b, large=0, prof=0):
    return [c for c, l, p in SPEC[cle] if a <= c <= b and l >= large and p >= prof]
(dA, dB, dC, dD), front = ccm17
(d1, d2, d3), front4 = ccm4

controles = [
    # Thème 1 : structure et nomenclature
    ('Q.1 formule brute de l\'acide 3-méthylbutanoïque', brute('CH3-CH(CH3)-CH2-COOH'), 'C5H10O2', None,
     r'\text{CH}_3\text{-CH}(\text{CH}_3)\text{-CH}_2\text{-COOH} \qquad \text{formule brute : } \text{C}_5\text{H}_{10}\text{O}_2$$'),
    ('Q.1 hydrogènes comptés groupe par groupe', compo('CH3-CH(CH3)-CH2-COOH')['H'], 3 + 1 + 3 + 2 + 1, None, '$3 + 1 + 3 + 2 + 1 = 10$'),
    ('Q.1 formule brute du butan-2-ol', brute('CH3-CH(OH)-CH2-CH3'), 'C4H10O', None, r'Sa formule brute est $\text{C}_4\text{H}_{10}\text{O}$.'),
    ('Q.4 isomères a à d', {brute(f) for f in ('CH3-CH2-CH2-CH2-OH', 'CH3-CH(OH)-CH2-CH3', 'CH3-CH(CH3)-CH2-OH', 'CH3-CH2-O-CH2-CH3')}, {'C4H10O'}, None,
     r'et d (éthoxyéthane) ont pour formule brute $\text{C}_4\text{H}_{10}\text{O}$ : ce sont des isomères'),
    ('Q.4 isomères e et f', {brute('CH3-CH2-CH2-CHO'), brute('CH3-CO-CH2-CH3')}, {'C4H8O'}, None,
     r'Les molécules e (butanal) et f (butanone) ont pour formule brute $\text{C}_4\text{H}_8\text{O}$'),
    ('Q.4 alcène g et h', brute('CH3-CH=CH-CH3'), 'C4H8', None, r"Figure 5. Deux alcènes de formule $\text{C}_4\text{H}_8$"),
    ('Q.1 formules générales des alcanes et des alcènes', all(brute('CH3' + 'CH2' * (n - 2) + 'CH3') == 'C%dH%d' % (n, 2 * n + 2) for n in range(2, 12)), True, 0,
     r'sa formule brute générale est $\text{C}_n\text{H}_{2n+2}$. Un alcène est un hydrocarbure insaturé : il porte une double liaison $\text{C=C}$ ; avec une seule, sa formule brute est $\text{C}_n\text{H}_{2n}$'),
    ('Q.1 formule brute de l\'heptane', (brute('CH3(CH2)5CH3'), 2 * 7 + 2), ('C7H16', 16), None, r"a pour formule brute $\text{C}_7\text{H}_{16}$, car $2 \times 7 + 2 = 16$"),
    ('Q.3 h, 2,3-diméthylpentane isomère de l\'heptane', brute('CH3-CH(CH3)-CH(CH3)-CH2-CH3'), brute('CH3(CH2)5CH3'), None,
     r"2,3-diméthylpentane. Sa formule brute, $\text{C}_7\text{H}_{16}$, est celle de l'heptane"),
    ('Q.3 i, 1,4-diméthylcyclohexane', brute('C6H10(CH3)2'), 'C8H16', None, r'1,4-diméthylcyclohexane, de formule brute $\text{C}_8\text{H}_{16}$'),
    ('Q.3 i, formule CnH2n d\'un cycloalcane', all(brute('C%dH%d' % (n, 2 * n)) == 'C%dH%d' % (n, 2 * n) for n in (3, 6, 8)), True, 0,
     r'Un cycloalcane à un seul cycle a pour formule brute $\text{C}_n\text{H}_{2n}$'),
    ('Q.2 classes de l\'alcool de l\'acide lactique et de l\'amine de la glutamine', ('secondaire', 'primaire'), ('secondaire', 'primaire'), None,
     "L'acide lactique contient un alcool secondaire"),
    ('Q.9 ion oléate : chaîne à une double liaison', 2 * 17 + 1 - 2, 33, None, r"L'ion oléate, $\text{C}_{17}\text{H}_{33}\text{-COO}^-$"),
    ('Q.5 motif et monomère du polypropylène', (brute('CH2-CH(CH3)'), brute('CH2=CH-CH3')), ('C3H6', 'C3H6'), None,
     r'Le motif du polypropylène est $\text{-CH}_2\text{-CH}(\text{CH}_3)\text{-}$ ; le monomère est le propène, $\text{CH}_2\text{=CH-CH}_3$.'),
    ('Q.5 masse molaire du motif', masse('C3H6'), 42, 1e-9, r'$3 \times 12{,}0 + 6 \times 1{,}0 = 42{,}0\ \text{g·mol}^{-1}$'),
    ('Q.5 nombre moyen de motifs', 1.26e5 / 42.0, 3.00e3, 0.005e3, r'= \dfrac{1{,}26 \times 10^{5}}{42{,}0} = 3{,}00 \times 10^{3}\ \text{motifs}$$'),
    ('Ex. 1 formule brute de A et de B', (brute('CH3-CH2-CH2-CH2-COO-CH2-CH3'), brute('CH3-COO-CH2-CH2-CH2-CH2-CH3')), ('C7H14O2', 'C7H14O2'), None,
     r'on obtient pour les deux $\text{C}_7\text{H}_{14}\text{O}_2$'),
    ('Ex. 1 éthanoate de 3-méthylbutyle', brute('CH3-COO-CH2-CH2-CH(CH3)-CH3'), 'C7H14O2', None,
     r'$\text{CH}_3\text{-COO-CH}_2\text{-CH}_2\text{-CH}(\text{CH}_3)\text{-CH}_3$, a pour formule brute $\text{C}_7\text{H}_{14}\text{O}_2$'),
    ('Ex. 1 masse molaire du pentan-1-ol', masse('CH3-CH2-CH2-CH2-CH2-OH'), 88.0, 1e-9, r'Pentan-1-ol : $M = 88{,}0\ \text{g·mol}^{-1}$'),
    ('Ex. 1 masse molaire de l\'ester', masse('C7H14O2'), 130, 1e-9, r'$7 \times 12{,}0 + 14 \times 1{,}0 + 2 \times 16{,}0 = 130\ \text{g·mol}^{-1}$'),
    ('Ex. 1 pentan-1-ol', 0.814 * 54.1 / 88.0, 0.500, 0.0005, r'= \dfrac{0{,}814 \times 54{,}1}{88{,}0} = 0{,}500\ \text{mol}$$'),
    ('Ex. 1 réactifs en quantités égales', round(0.814 * 54.1 / 88.0, 3) == 0.500, True, 0, r'Les deux réactifs, à $0{,}500\ \text{mol}$ chacun, réagissent mole à mole'),
    ('Ex. 1 ester obtenu', 42.9 / 130, 0.330, 0.0005, r'n_\text{ester} = \dfrac{42{,}9}{130} = 0{,}330\ \text{mol}'),
    ('Ex. 1 rendement', 0.330 / 0.500, 0.660, 0.0005, r'\eta = \dfrac{0{,}330}{0{,}500} = 0{,}660, \text{ soit } 66{,}0\ \%$$'),
    # Thème 2 : réactions et stratégie de synthèse
    ('Q.8 espèce X', reste(['C5H12O', 'C2H4O2'], ['C7H14O2']), 'H2O', None, r"X a pour formule $\text{H}_2\text{O}$ : c'est l'eau."),
    ('Q.8 sommes de la question a', (5 + 2, 12 + 4, 1 + 2), (7, 16, 3), None, r"Carbone : $5 + 2 = 7$, déjà tous dans l'ester. Hydrogène : $12 + 4 = 16$"),
    ('Q.8 espèce Y', reste(['C7H6O3', 'C4H6O3'], ['C9H8O4']), 'C2H4O2', None, r'Y a pour formule $\text{C}_2\text{H}_4\text{O}_2$'),
    ('Q.8 différences de la question b', (7 + 4 - 9, 6 + 6 - 8, 3 + 3 - 4), (2, 4, 2), None, r'$7 + 4 - 9 = 2$ ; hydrogène : $6 + 6 - 8 = 4$ ; oxygène : $3 + 3 - 4 = 2$'),
    ('Q.11 dipeptide Gly-Ala', brute('H2N-CH2-CO-NH-CH(CH3)-COOH'), reste(['H2N-CH2-COOH', 'H2N-CH(CH3)-COOH'], ['H2O']), None,
     r'le dipeptide Gly-Ala, $\text{H}_2\text{N-CH}_2\text{-CO-NH-CH}(\text{CH}_3)\text{-COOH}$'),
    ('Q.11 nombre de dipeptides', 2 * 2, 4, None, r'$2 \times 2 = 4$ dipeptides sont possibles'),
    ('Ex. 2 conservation des éléments', (4 + 10, 7 + 13, 18 + 2, 1 + 1, 4 + 2, 5 + 1), (14, 20, 20, 2, 6, 6), None,
     r'Carbone : $4 + 10 = 14$ ; hydrogène : $7 + 13 = 20 = 18 + 2$ ; azote : $1 + 1 = 2$ ; oxygène : $4 + 2 = 6 = 5 + 1$'),
    ('Ex. 2 différence d\'électronégativité', 3.44 - 2.55, 0.89, 1e-9, r'\chi(\text{O}) - \chi(\text{C}) = 3{,}44 - 2{,}55 = 0{,}89'),
    ('Ex. 3 formules brutes de A, B et de la frambinone', (brute('HO-C6H4-CHO'), brute('HO-C6H4-CH=CH-CO-CH3'), brute('HO-C6H4-CH2-CH2-CO-CH3')),
     ('C7H6O2', 'C10H10O2', 'C10H12O2'), None,
     r'A : $\text{C}_7\text{H}_6\text{O}_2$ ; B : $\text{C}_{10}\text{H}_{10}\text{O}_2$ ; frambinone : $\text{C}_{10}\text{H}_{12}\text{O}_2$'),
    ('Ex. 3 conservation des éléments', (7 + 3, 6 + 6, 10 + 2, 2 + 1), (10, 12, 12, 3), None,
     r'Carbone : $7 + 3 = 10$ ; hydrogène : $6 + 6 = 10 + 2$ ; oxygène : $2 + 1 = 2 + 1$'),
    ('Ex. 3 masses molaires', (masse('C7H6O2'), masse('C10H12O2')), (122, 164), None, r'$M(\text{A}) = 122\ \text{g·mol}^{-1}$ ; $M(\text{frambinone}) = 164\ \text{g·mol}^{-1}$'),
    ('Ex. 3 quantité de A', 2.44 / 122, 2.00e-2, 0.005e-2, r'n(\text{A}) = \dfrac{2{,}44}{122} = 2{,}00 \times 10^{-2}\ \text{mol}'),
    ('Ex. 3 masse maximale', 2.00e-2 * 164, 3.28, 0.005, r'm_\text{max} = 2{,}00 \times 10^{-2} \times 164 = 3{,}28\ \text{g}$$'),
    ('Ex. 3 rendement', 2.13 / 3.28, 0.649, 0.0005, r'\eta = \dfrac{2{,}13}{3{,}28} = 0{,}649, \text{ soit } 64{,}9\ \%$$'),
    # Thème 3 : protocole, purification, analyse et rendement
    ('Q.15 volume minimal', 5.0 / 60, 8.3e-2, 0.05e-2, r'V_\text{min} = \dfrac{5{,}0}{60} = 8{,}3 \times 10^{-2}\ \text{L} = 83\ \text{mL}$$'),
    ('Q.15 masse restée dissoute', 3.0 * 5.0 / 60, 0.25, 0.005, r'm_\text{dissoute} = 3{,}0 \times 8{,}3 \times 10^{-2} = 0{,}25\ \text{g}'),
    ('Q.15 masse récupérable', 5.0 - 3.0 * 5.0 / 60, 4.8, 0.05, r'm_\text{récupérable} = 5{,}0 - 0{,}25 \approx 4{,}8\ \text{g}$$'),
    ('Q.15 fraction récupérée', (5.0 - 3.0 * 5.0 / 60) / 5.0, 0.95, 0.005, r'On récupère au mieux $95\ \%$ du solide'),
    ('Q.17 rapport frontal de l\'aspirine (figure 12)', dA[0] / front, 0.70, 0.005, r'R_\text{f}(\text{aspirine}) = \dfrac{4{,}2}{6{,}0} = 0{,}70'),
    ('Q.17 rapport frontal de l\'acide salicylique (figure 12)', dB[0] / front, 0.30, 0.005, r'R_\text{f}(\text{acide salicylique}) = \dfrac{1{,}8}{6{,}0} = 0{,}30$$'),
    ('Q.17 produit brut : deux taches, celles de A et B', sorted(dC) == sorted(dA + dB), True, 0, 'Le produit brut C donne deux taches, à la hauteur de l\'aspirine et de l\'acide salicylique'),
    ('Q.17 produit recristallisé : la seule tache de A', dD == dA, True, 0, 'Le produit recristallisé D ne donne qu\'une tache, à la hauteur de l\'aspirine'),
    ('Q.18 nombre d\'onde', 1 / 5.85e-4, 1.71e3, 0.005e3, r'= \dfrac{1}{5{,}85 \times 10^{-4}\ \text{cm}} = 1{,}71 \times 10^{3}\ \text{cm}^{-1}$$'),
    ('Q.19 masses molaires', (masse('C7H6O3'), masse('C4H6O3'), masse('C9H8O4')), (138, 102, 180), None,
     r"d'acide salicylique ($M = 138\ \text{g·mol}^{-1}$) et $5{,}0\ \text{mL}$ d'anhydride éthanoïque ($\rho = 1{,}08\ \text{g·mL}^{-1}$ ; $M = 102\ \text{g·mol}^{-1}$)"),
    ('Q.19 acide salicylique', 2.76 / 138, 2.00e-2, 0.005e-2, r'n_\text{acide} = \dfrac{2{,}76}{138} = 2{,}00 \times 10^{-2}\ \text{mol}'),
    ('Q.19 anhydride éthanoïque', 1.08 * 5.0 / 102, 5.3e-2, 0.05e-2, r'= \dfrac{1{,}08 \times 5{,}0}{102} = 5{,}3 \times 10^{-2}\ \text{mol}$$'),
    ('Q.19 réactif limitant', 2.76 / 138 < 1.08 * 5.0 / 102, True, 0, 'l\'acide salicylique est le réactif limitant'),
    ('Q.19 masse maximale', 2.00e-2 * 180, 3.60, 0.005, r'm_\text{max} = 2{,}00 \times 10^{-2} \times 180 = 3{,}60\ \text{g}'),
    ('Q.19 rendement', 2.88 / 3.60, 0.800, 0.0005, r'\eta = \dfrac{2{,}88}{3{,}60} = 0{,}800, \text{ soit } 80{,}0\ \%$$'),
    ('Q.19 rendement global', 0.800 * 0.75, 0.60, 0.005, r'$0{,}800 \times 0{,}75 = 0{,}60$'),
    ('Q.19 coefficients : A s\'épuise pour', 3.0 / 2, 1.5, 1e-9, r'$x = 3{,}0/2 = 1{,}5\ \text{mol}$'),
    ('Q.19 coefficients : avancement maximal et quantité de C', (min(3.0 / 2, 1.0 / 1), 3 * min(3.0 / 2, 1.0 / 1)), (1.0, 3.0), None,
     r'$x_\text{max} = 1{,}0\ \text{mol}$, et $n_\text{max}(\text{C}) = 3 \times x_\text{max} = 3{,}0\ \text{mol}$'),
    ('Q.20 énergie du protocole A', 250 * 45 * 60, 6.75e5, 1, r'E_\text{A} = 250 \times 45 \times 60 = 6{,}75 \times 10^{5}\ \text{J} = 0{,}19\ \text{kW·h}'),
    ('Q.20 énergie du protocole A en kW·h', 250 * 45 * 60 / 3.6e6, 0.19, 0.005, r'= 6{,}75 \times 10^{5}\ \text{J} = 0{,}19\ \text{kW·h}'),
    ('Q.20 énergie du protocole B', 800 * 3 * 60, 1.44e5, 1, r'E_\text{B} = 800 \times 3 \times 60 = 1{,}44 \times 10^{5}\ \text{J} = 0{,}040\ \text{kW·h}$$'),
    ('Q.20 énergie du protocole B en kW·h', 800 * 3 * 60 / 3.6e6, 0.040, 0.0005, r'= 1{,}44 \times 10^{5}\ \text{J} = 0{,}040\ \text{kW·h}$$'),
    ('Q.20 masses obtenues', (round(0.80 * 3.60, 2), round(0.70 * 3.60, 2)), (2.88, 2.52), None, r'Masses obtenues : $0{,}80 \times 3{,}60 = 2{,}88\ \text{g}$ pour A et $0{,}70 \times 3{,}60 = 2{,}52\ \text{g}$ pour B'),
    ('Q.20 énergie par gramme, A', 6.75e5 / 2.88, 2.3e5, 0.05e5, r'= \dfrac{6{,}75 \times 10^{5}}{2{,}88} = 2{,}3 \times 10^{5}\ \text{J·g}^{-1}'),
    ('Q.20 énergie par gramme, B', 1.44e5 / 2.52, 5.7e4, 0.05e4, r'= \dfrac{1{,}44 \times 10^{5}}{2{,}52} = 5{,}7 \times 10^{4}\ \text{J·g}^{-1}$$'),
    ('Q.20 rapport des énergies par gramme', round((6.75e5 / 2.88) / (1.44e5 / 2.52)), 4, None, 'consomme environ quatre fois moins d\'énergie par gramme d\'aspirine'),
    ('Q.20 rapport des durées', 45 // 3, 15, None, 'dure quinze fois moins longtemps'),
    ('Ex. 4 formule et masse molaire de l\'oct-1-én-3-ol', (brute('CH2=CH-CH(OH)-CH2-CH2-CH2-CH2-CH3'), masse('C8H16O')), ('C8H16O', 128), None,
     r'oct-1-én-3-ol ($\text{C}_8\text{H}_{16}\text{O}$)'),
    ('Ex. 4 masse molaire imprimée', masse('C8H16O'), 128, 1e-9, r'Alcool de champignon : $M = 128\ \text{g·mol}^{-1}$'),
    ('Ex. 4 ordre de distillation', sorted([(35, 'éther'), (53, 'acroléine'), (175, 'alcool')]) == [(35, 'éther'), (53, 'acroléine'), (175, 'alcool')], True, 0,
     r"l'éther ($35\ \text{°C}$), puis l'acroléine qui reste ($53\ \text{°C}$), enfin l'alcool de champignon"),
    ('Ex. 4 rapport frontal du produit (figure 14)', d3[0] / front4, 0.44, 0.005, r'R_\text{f} = \dfrac{h}{H} = \dfrac{2{,}2}{5{,}0} = 0{,}44$$'),
    ('Ex. 4 dépôts 2 et 3 (figure 14)', (sorted(d2) == sorted(d1 + d3), d3 != d1), (True, True), None, 'Le dépôt 2 donne deux taches : l\'une à la hauteur de l\'acroléine'),
    ('Ex. 4 quantité d\'organomagnésien', 2.00 * 10.0e-3, 2.00e-2, 1e-12, r'n = 2{,}00 \times 10{,}0 \times 10^{-3} = 2{,}00 \times 10^{-2}\ \text{mol}'),
    ('Ex. 4 masse maximale', 2.00e-2 * 128, 2.56, 1e-9, r'm_\text{max} = 2{,}00 \times 10^{-2} \times 128 = 2{,}56\ \text{g}'),
    ('Ex. 4 rendement', 2.25 / 2.56, 0.879, 0.0005, r'\eta = \dfrac{2{,}25}{2{,}56} = 0{,}879$$'),
    ('Ex. 4 quantité réelle', 1.94 * 10.0e-3, 1.94e-2, 1e-12, r'$n = 1{,}94 \times 10^{-2}\ \text{mol}$'),
    ('Ex. 4 masse maximale réelle', 1.94e-2 * 128, 2.483, 0.0005, r'$m_\text{max} = 2{,}483\ \text{g}$'),
    ('Ex. 4 rendement réel', 2.25 / (1.94e-2 * 128), 0.906, 0.0005, r'$\eta = \dfrac{2{,}25}{2{,}483} = 0{,}906$'),
    ('Ex. 4 conclusion', (round(100 * 2.25 / (1.94e-2 * 128), 1), round(100 * 2.25 / 2.56, 1)), (90.6, 87.9), None, r'Le rendement est de $90{,}6\ \%$ : la valeur de $87{,}9\ \%$ sous-estimait'),
    ('Ex. 5 masses molaires du tableau', (masse('C6H6O2'), masse('C6H10O3'), round(masse('C7H8O3S')), masse('C10H8O3')), (110, 130, 172, 176), None,
     r'| Résorcinol ($\text{C}_6\text{H}_6\text{O}_2$) | 110 |'),
    ('Ex. 5 atomes des réactifs et des produits connus', (ecrire({e: compo('C6H6O2').get(e, 0) + compo('C6H10O3').get(e, 0) for e in 'CHO'}),
                                                          ecrire({e: compo('C10H8O3').get(e, 0) + compo('H2O').get(e, 0) for e in 'CHO'})), ('C12H16O5', 'C10H10O4'), None,
     r'soit 12 C, 16 H et 5 O. Produits connus : $\text{C}_{10}\text{H}_8\text{O}_3 + \text{H}_2\text{O}$, soit 10 C, 10 H et 4 O'),
    ('Ex. 5 espèce X', reste(['C6H6O2', 'C6H10O3'], ['C10H8O3', 'H2O']), 'C2H6O', None, r'Il reste 2 C, 6 H et 1 O : X a pour formule $\text{C}_2\text{H}_6\text{O}$'),
    ('Ex. 5 résorcinol', 2.20 / 110, 2.00e-2, 0.005e-2, r'n_\text{résorcinol} = \dfrac{2{,}20}{110} = 2{,}00 \times 10^{-2}\ \text{mol}'),
    ('Ex. 5 acétoacétate d\'éthyle', 2.60 / 130, 2.00e-2, 0.005e-2, r'n_\text{ester} = \dfrac{2{,}60}{130} = 2{,}00 \times 10^{-2}\ \text{mol}$$'),
    ('Ex. 5 proportions stœchiométriques', round(2.20 / 110, 4) == round(2.60 / 130, 4), True, 0, 'ils sont dans les proportions stœchiométriques'),
    ('Ex. 5 masse maximale', 2.00e-2 * 176, 3.52, 1e-9, r'm_\text{max} = 2{,}00 \times 10^{-2} \times 176 = 3{,}52\ \text{g}'),
    ('Ex. 5 rendement', 2.0 / 3.52, 0.57, 0.005, r'\eta = \dfrac{2{,}0}{3{,}52} = 0{,}57, \text{ soit } 57\ \%$$'),
    ('Ex. 5 énergie de la voie à l\'acide sulfamique', 500 * 20 * 60, 6.0e5, 1, r'$E_1 = 500 \times 20 \times 60 = 6{,}0 \times 10^{5}\ \text{J}$'),
    ('Ex. 5 énergie de la voie étudiée', 300 * 10 * 60, 1.8e5, 1, r'$E_2 = 300 \times 10 \times 60 = 1{,}8 \times 10^{5}\ \text{J}$'),
    ('Ex. 5 masse obtenue par l\'autre voie', 0.65 * 3.52, 2.29, 0.005, r'$0{,}65 \times 3{,}52 = 2{,}29\ \text{g}$'),
    ('Ex. 5 énergie par gramme, voie 1', 6.0e5 / 2.29, 2.6e5, 0.05e5, r'= \dfrac{6{,}0 \times 10^{5}}{2{,}29} = 2{,}6 \times 10^{5}\ \text{J·g}^{-1}'),
    ('Ex. 5 énergie par gramme, voie 2', 1.8e5 / 2.0, 9.0e4, 0.05e4, r'= \dfrac{1{,}8 \times 10^{5}}{2{,}0} = 9{,}0 \times 10^{4}\ \text{J·g}^{-1}$$'),
    ('Ex. 5 rapport des énergies par gramme', round((6.0e5 / 2.29) / (1.8e5 / 2.0)), 3, None, 'elle consomme environ trois fois plus d\'énergie par gramme'),
    # bandes infrarouges citées dans les corrigés, relues sur les spectres dessinés
    ('Ex. 1 spectre : C=O vers 1 740, C-O vers 1 240, pas de bande O-H', (len(bandes('ester', 1730, 1750, prof=2)), len(bandes('ester', 1230, 1250, prof=2)), len(bandes('ester', 2500, 3500, large=60))),
     (1, 1, 0), None, r'une bande forte et fine vers $1\,740\ \text{cm}^{-1}$ (liaison $\text{C=O}$), une bande forte vers $1\,240\ \text{cm}^{-1}$ (liaison $\text{C-O}$)'),
    ('Q.18 spectre 1 : O-H large vers 3 340, pas de C=O', (len(bandes('butanol', 3300, 3400, large=60, prof=1.5)), len(bandes('butanol', 1650, 1800))), (1, 0), None,
     r'Le spectre 1 présente une bande forte et large vers $3\,340\ \text{cm}^{-1}$'),
    ('Q.18 spectre 2 : C=O vers 1 715, pas de bande large', (len(bandes('butanone', 1705, 1725, prof=2)), len(bandes('butanone', 2500, 3600, large=60))), (1, 0), None,
     r'Le spectre 2 présente une bande forte et fine vers $1\,715\ \text{cm}^{-1}$'),
    ('Q.18 bande de 5,85 µm dans le spectre 2', len(bandes('butanone', 1700, 1720, prof=2)), 1, None, 'Cette bande, du spectre 2, correspond à la liaison'),
    ('Ex. 4 spectre : O-H vers 3 350, C=C faible vers 1 645, pas de C=O', (len(bandes('octenol', 3300, 3400, large=60)), len(bandes('octenol', 1620, 1680)),
                                                                          max(p for c, l, p in SPEC['octenol'] if 1620 <= c <= 1680), len(bandes('octenol', 1681, 1760))),
     (1, 1, 0.45, 0), None, r'la petite bande fine vers $1\,645\ \text{cm}^{-1}$ correspond à la liaison $\text{C=C}$'),
]
# données des énoncés utilisées dans les corrigés (la fiche et le cahier d'énoncés les reprennent)
donnees = [r'masse molaire moyenne $M = 1{,}26 \times 10^{5}\ \text{g·mol}^{-1}$',
           r'$M(\text{H}) = 1{,}0\ \text{g·mol}^{-1}$ ; $M(\text{C}) = 12{,}0\ \text{g·mol}^{-1}$ ; $M(\text{O}) = 16{,}0\ \text{g·mol}^{-1}$. Pentan-1-ol : $M = 88{,}0\ \text{g·mol}^{-1}$, $\rho = 0{,}814\ \text{g·mL}^{-1}$',
           r"on fait réagir $54{,}1\ \text{mL}$ de pentan-1-ol avec $0{,}500\ \text{mol}$ d'acide éthanoïque ; on recueille $42{,}9\ \text{g}$ d'ester",
           r'$\text{C=O}$, $1\,650$ à $1\,750\ \text{cm}^{-1}$, forte et fine ; $\text{C-O}$, $1\,000$ à $1\,300\ \text{cm}^{-1}$, forte',
           r'$\chi(\text{C}) = 2{,}55$', r'$\chi(\text{O}) = 3{,}44$',
           r'acide aspartique $\text{C}_4\text{H}_7\text{NO}_4$ ; phénylalanine méthylée $\text{C}_{10}\text{H}_{13}\text{NO}_2$ ; aspartame $\text{C}_{14}\text{H}_{18}\text{N}_2\text{O}_5$',
           r'on dissout $2{,}44\ \text{g}$ de 4-hydroxybenzaldéhyde (espèce A)', r'on recueille $2{,}13\ \text{g}$ de frambinone',
           r'$M(\text{A}) = 122\ \text{g·mol}^{-1}$ ; $M(\text{frambinone}) = 164\ \text{g·mol}^{-1}$',
           r'Densités : ester $0{,}88$ ; cyclohexane $0{,}78$ ; eau $1{,}00$',
           r'fournit $5{,}0\ \text{g}$ de solide P brut', r'dont on néglige la masse',
           r'vaut $3{,}0\ \text{g·L}^{-1}$ à $20\ \text{°C}$ et $60\ \text{g·L}^{-1}$ à $100\ \text{°C}$',
           r'cyclohexane ($T_\text{éb} = 81\ \text{°C}$) et de toluène ($T_\text{éb} = 111\ \text{°C}$)', r"de densité $0{,}89$ et très peu soluble dans l'eau",
           r'le produit recristallisé fond à $135\ \text{°C}$', r'$\lambda = 5{,}85\ \text{µm}$',
           r"On introduit $2{,}76\ \text{g}$ d'acide salicylique ($M = 138\ \text{g·mol}^{-1}$) et $5{,}0\ \text{mL}$ d'anhydride éthanoïque",
           r"on obtient $2{,}88\ \text{g}$ d'aspirine ($M = 180\ \text{g·mol}^{-1}$)", r'de rendement $75\ \%$',
           r'pendant $45\ \text{min}$ avec un chauffe-ballon de puissance $250\ \text{W}$, rendement $80\ \%$',
           r'pendant $3\ \text{min}$ à $800\ \text{W}$, rendement $70\ \%$', r'la masse maximale étant $3{,}60\ \text{g}$',
           r"$10{,}0\ \text{mL}$ d'une solution de bromure de pentylmagnésium à $2{,}00\ \text{mol·L}^{-1}$", "l'acroléine en excès",
           r'On recueille $2{,}25\ \text{g}$ de produit', r'Éther diéthylique : $T_\text{éb} = 35\ \text{°C}$, densité $0{,}71$',
           r'Acroléine : $T_\text{éb} = 53\ \text{°C}$', r'Alcool de champignon : $M = 128\ \text{g·mol}^{-1}$, $T_\text{éb} = 175\ \text{°C}$',
           r'$\text{C=C}$, $1\,620$ à $1\,680\ \text{cm}^{-1}$, faible', r'vaut $1{,}94\ \text{mol·L}^{-1}$',
           r"on mélange $2{,}20\ \text{g}$ de résorcinol, $2{,}60\ \text{g}$ d'acétoacétate d'éthyle", r'au bain-marie à $60\ \text{°C}$ pendant $10\ \text{min}$',
           r'on recueille $2{,}0\ \text{g}$ de composé A', r'| APTS | 172 |', r'| Composé A ($\text{C}_{10}\text{H}_8\text{O}_3$) | 176 |',
           r"| Acétoacétate d'éthyle ($\text{C}_6\text{H}_{10}\text{O}_3$) | 130 |",
           r'demande $20\ \text{min}$ de chauffage à $130\ \text{°C}$ sur une plaque de $500\ \text{W}$ et a un rendement de $65\ \%$', r'un bain-marie de $300\ \text{W}$',
           r'on introduit $3{,}0\ \text{mol}$ de A et $1{,}0\ \text{mol}$ de B', "porte le pictogramme « corrosion », celui de l'alcool les pictogrammes « flamme » et « point d'exclamation »"]
dmanque = [d for d in donnees if d not in enonces]
# figures : numéros du montage à reflux, molécules dessinées, mécanisme, ampoule, distillation
num = {re.sub(r'\\n', ' ', t).replace("\\'", "'"): int(k) for t, k in re.findall(r"repere\(ax, [^']*'((?:[^'\\]|\\.)+)', n\((\d)\)", figsrc)}
phrase_montage = re.search(r'Éléments du montage \(figure \d+\) : (.*?)\. L\'eau', src)
num_c = {t.strip(): int(k) for k, t in re.findall(r'(\d), ([^;]+)', phrase_montage.group(1))} if phrase_montage else {}
textes = [('Figures 11 et 22 : numéros du montage à reflux et corrigé de Q.12', num == num_c and len(num) == 6),
          ('Figures 11 et 22 : entrée d\'eau en bas du réfrigérant, sortie en haut', "repere(ax, 2.6, yt + 0.875, 3.0, yt + 1.6, 'entrée d\\'eau', n(2))" in figsrc
           and "repere(ax, -2.6, yt + 6.525, -2.9, yt + 7.3, 'sortie d\\'eau', n(3), ha='right')" in figsrc),
          ('Figures 12 et 27 : mêmes dépôts et même front', ccm17 == ccm17c),
          ('Figure 27 : mesures portées sur les taches de A et de B', "[(0.95 + 0.42, 4.2, '4,2 cm', -1), (2.25 + 0.42, 1.8, '1,8 cm', 1)]" in figsrc and dA == [4.2] and dB == [1.8]),
          ('Figure 13 : spectre 1 du butan-1-ol, spectre 2 de la butanone', "fig_spectres_cote('fig_ir', ['butanol', 'butanone'], ['spectre 1', 'spectre 2'])" in figsrc),
          ('Figures 7 et 14 : spectres de l\'ester et de l\'alcool de champignon', "fig_spectres('fig_ex1_ir', ['ester'], [None])" in figsrc and "transmittance(sig, SPECTRES['octenol'])" in figsrc),
          ('Figure 16 : butan-2-ol, panneau de formule développée (10 H, O-H compris)', "texte(ax, x0 + 1.5 * L, -1.75, 'formule développée'" in figsrc and "d['HO'] = (d['C2'][0], y0 + 2 * L, 'H')" in figsrc),
          ('Figure 25 : deux panneaux, filtration simple et filtration sous vide', "panneau_simple" in figsrc and "panneau_sous_vide" in figsrc and "'papier filtre plissé'" in figsrc),
          ('Figure 1 : acide 3-méthylbutanoïque', "at['m'] = pas(z[1], 90) + ('',); at['o'] = pas(z[3], 90) + ('O',); at['oh'] = pas(z[3], -30) + ('OH',)" in figsrc),
          ('Figure 4 : molécules a à f dans l\'ordre du corrigé', re.findall(r'# ([a-f]) : (.+)', figsrc[figsrc.index('def fig_isomeres'):figsrc.index('def fig_ze')]) ==
           [('a', 'butan-1-ol'), ('b', 'butan-2-ol'), ('c', '2-méthylpropan-1-ol'), ('d', 'éthoxyéthane'), ('e', 'butanal'), ('f', 'butanone')]
           and "'o': pas(z[3], -30) + ('OH',)}\n    mol(ax, at, [('1', '2', 1), ('2', '3', 1), ('3', '4', 1), ('4', 'o', 1)]); lettre(x + 1.7, YL, 'a')" in figsrc
           and "'o': pas(z[1], 90) + ('OH',)}\n    mol(ax, at, [('1', '2', 1), ('2', '3', 1), ('3', '4', 1), ('2', 'o', 1)]); lettre(x + 1.3, YL, 'b')" in figsrc
           and "mol(ax, at, [('1', '2', 1), ('2', '3', 1), ('3', '4', 1), ('4', 'o', 2)]); lettre(x + 1.7, YL, 'e')" in figsrc
           and "mol(ax, at, [('1', '2', 1), ('2', '3', 1), ('3', '4', 1), ('2', 'o', 2)]); lettre(x + 1.3, YL, 'f')" in figsrc),
          ('Figure 5 : méthyles de part et d\'autre en g (E), du même côté en h (Z)', "at = {'c1': (0.0, -0.5, ''), 'c2': (C30, 0.0, ''), 'c3': (2 * C30, -0.5, ''), 'c4': (3 * C30, 0.0, '')}" in figsrc
           and "at = {'c2': (x0 + 0.9, -0.2, ''), 'c3': (x0 + 1.9, -0.2, ''), 'c1': (x0 + 0.4, 0.67, ''), 'c4': (x0 + 2.4, 0.67, '')}" in figsrc
           and 'En h, les méthyles sont du même côté, c\'est le (Z)-but-2-ène ; en g, ils sont de part et d\'autre, c\'est le (E)-but-2-ène.' in src),
          ('Figures 6 et 20 : A pentanoate d\'éthyle, B éthanoate de pentyle, corrigé ramifié en 3', "at = {'c5': z[0] + ('',), 'c4': z[1] + ('',), 'c3': z[2] + ('',), 'c2': z[3] + ('',), 'c1': z[4] + ('',), 'o': z[5] + ('O',), 'e1': z[6] + ('',), 'e2': z[7] + ('',)}" in figsrc
           and 'at, li = ethanoate(8.6, 0.0, 5); mol(ax, at, li)' in figsrc and 'at, li = ethanoate(0.0, 0.0, 4, branche=2); mol(ax, at, li)' in figsrc),
          ('Figure 21 : flèche du doublet de N vers C, puis de C=O vers O', 'fleche_bezier(ax, (dN[0] + 0.06, dN[1] + 0.1), (2.6, 1.15), (xc - 0.21, 0.16))' in figsrc
           and 'fleche_bezier(ax, (xc + 0.12, 0.42), (xc + 0.78, 0.5), (xc + 0.3, 0.84))' in figsrc),
          ('Figures 9 et 21 : intermédiaire avec N chargé + et O chargé −', 'charge(ax, xc2 + 0.62, 1.22, -1)' in figsrc and 'charge(ax, xn2 - 0.36, 0.4, +1)' in figsrc
           and 'for a in (30, 90, 150): doublet(ax, xc2, 0.95, a)' in figsrc),
          ('Figure 24 : phase organique (cyclohexane et ester) au-dessus, phase aqueuse au-dessous, bouchon retiré', "'phase organique,\\nla moins dense :\\ncyclohexane et ester'" in figsrc and "'phase aqueuse,\\nla plus dense :\\neau et acides'" in figsrc and "'bouchon retiré'" in figsrc),
          ('Figure 26 : réservoir du thermomètre au niveau du bras latéral', 'ax.add_patch(Circle((0.0, ybras), 0.14' in figsrc and 'a0 = np.array([W, ybras])' in figsrc),
          ('Figure 3 : cycle à six carbones, liaisons simples, méthyles sur deux sommets opposés', "li = [('r%d' % k, 'r%d' % ((k + 1) % 6), 1) for k in range(6)]" in figsrc
           and "at['m0'] = pas(pts[0], 0) + ('',); at['m3'] = pas(pts[3], 180) + ('',)" in figsrc),
          ('Figure 23 : même avancement final, atteint plus vite avec le catalyseur', re.search(r'TAU_AVEC, TAU_SANS = ([\d.]+), ([\d.]+)', figsrc) is not None
           and float(re.search(r'TAU_AVEC, TAU_SANS = ([\d.]+), ([\d.]+)', figsrc).group(1)) < float(re.search(r'TAU_AVEC, TAU_SANS = ([\d.]+), ([\d.]+)', figsrc).group(2))
           and 'ax.plot(t, 1 - np.exp(-t / TAU_AVEC), color=BLEU' in figsrc and 'ax.plot(t, 1 - np.exp(-t / TAU_SANS), color=CUIVRE' in figsrc
           and "'avec catalyseur', color=BLEU" in figsrc and "'sans catalyseur', color=CUIVRE" in figsrc),
          ('Corrigé de Q.12 : les trois pictogrammes de l\'énoncé', all(r in src for r in ('| Flamme | Espèce inflammable |', '| Corrosion : un liquide ronge une main et une surface |', "| Point d'exclamation | Irritant ou nocif |"))),
          ('Figure 15 : eau et espèce X formées', "texte(ax, 21.75, 0.0, 'H$_2$O', fs=12); plus(ax, 23.1, 0.0); texte(ax, 24.1, 0.0, 'X', fs=12)" in figsrc)]
# figures redessinées après la relecture : équation de l'aspartame sur une ligne (figure 8), doublets de l'acide (figures 9 et 21),
# colonne de Vigreux (figure 26), espèces de Q.3 et de Q.4 reprises dans les corrigés (figures 18 et 19)
import math
bloc8 = figsrc[figsrc.index('def fig_ex2_molecules'):figsrc.index('# --- Exercice 3')]
lignes8 = [re.search(r'%s\(([\d.]+), ([\d.-]+)\)' % f, bloc8) for f in ('acide_aspartique', 'phe_methylee', 'aspartame')]
formules8 = re.findall(r"verifie\(at, li, '([^']+)'\)", bloc8)
controles.append(('Figure 8 : formules brutes des trois molécules dessinées', tuple(brute(f) for f in formules8), ('C4H7NO4', 'C10H13NO2', 'C14H18N2O5'), None,
                  r'acide aspartique $\text{C}_4\text{H}_7\text{NO}_4$ ; phénylalanine méthylée $\text{C}_{10}\text{H}_{13}\text{NO}_2$ ; aspartame $\text{C}_{14}\text{H}_{18}\text{N}_2\text{O}_5$'))
textes.append(('Figure 8 : réactifs, flèche et produits sur une seule ligne', all(lignes8) and len({m.group(2) for m in lignes8}) == 1
               and float(lignes8[0].group(1)) < float(lignes8[1].group(1)) < float(lignes8[2].group(1)) and 'fleche_reaction(ax, ' in bloc8))
def ecart_angle(a, b): return abs((a - b + 180) % 360 - 180)
d_co = [int(a) for a in re.findall(r'doublet\(ax, xc, 0\.95, (\d+)\)', figsrc)]
d_oh = [int(a) for a in re.findall(r'doublet\(ax, xo, yo, (\d+)\)', figsrc)]
geo = 'xo, yo = xc + 0.82, -0.47' in figsrc and "at_(ax, xo + 0.62, yo - 0.5, 'H')" in figsrc and "at_(ax, xc, 0.95, 'O'); liaison(ax, (xc, 0), (xc, 0.95), ordre=2)" in figsrc
liaisons_oh = [math.degrees(math.atan2(0.47, -0.82)), math.degrees(math.atan2(-0.5, 0.62))]
textes.append(('Figures 9 et 21 : deux doublets par oxygène de l\'acide, à 60° au moins de ses liaisons', geo and len(d_co) == 2 and len(d_oh) == 2
               and min(ecart_angle(a, 270) for a in d_co) >= 90 and min(ecart_angle(a, b) for a in d_oh for b in liaisons_oh) >= 60 and ecart_angle(*d_co) >= 90 and ecart_angle(*d_oh) >= 90))
m_vig = re.search(r'W, creux = ([\d.]+), ([\d.]+)', figsrc)
textes.append(('Figure 26 : pointes de verre par paires, enfoncées jusqu\'à près de l\'axe', m_vig is not None and float(m_vig.group(2)) <= 0.2 * float(m_vig.group(1))
               and 'paroi_vigreux(0.0, yc0, y1, -1, niveaux, W, creux)' in figsrc and 'paroi_vigreux(0.0, yc0, y1, 1, niveaux, W, creux)' in figsrc
               and 'pointes de verre' in src[src.index('{#c_q16}'):src.index('{#c_q17}')]))
def clair(t): return re.sub(r'\\text\{([^{}]*)\}', r'\1', t).replace('_', '').replace('{', '').replace('}', '')
q3 = re.findall(r"\('([a-l])', '([^']+)', '([^']+)', q3_[a-l]\)", figsrc)
enonce_q3 = src[src.index('{#q3}'):src.index('{#q4}')]
corrige_q3 = src[src.index('{#c_q3}'):src.index('{#c_q4}')]
q3_ko = [l for l, semi, nom in q3 if (l != 'i' and not re.search(r'^%s\. \$%s\$$' % (l, re.escape(semi)), '\n'.join(clair(x) for x in enonce_q3.splitlines()), re.M))
         or not re.search(r'^%s\. .*%s' % (l, re.escape(nom)), corrige_q3, re.M)]
textes.append(('Figure 18 : les douze espèces de Q.3, formules de l\'énoncé et noms du corrigé', len(q3) == 12 and [l for l, _, _ in q3] == list('abcdefghijkl') and not q3_ko
               and brute(dict((l, s) for l, s, _ in q3)['i']) == 'C8H16'))
bloc4 = figsrc[figsrc.index('Q4_ESPECES = '):figsrc.index('def q4_dessin')]
q4 = re.findall(r"\('([a-h])', '([^']+)', '([^']+)'\)", bloc4)
corrige_q4 = src[src.index('{#c_q4}'):src.index('{#c_q5}')]
q4_ko = [l for l, semi, nom in q4 if brute(semi) != {'a': 'C4H10O', 'b': 'C4H10O', 'c': 'C4H10O', 'd': 'C4H10O', 'e': 'C4H8O', 'f': 'C4H8O', 'g': 'C4H8', 'h': 'C4H8'}[l]
         or ('%s (%s)' % (l, nom) not in corrige_q4 if l in 'abcdef' else "en %s, ils sont de part et d'autre, c'est le %s" % (l, nom) not in corrige_q4 and "En %s, les méthyles sont du même côté, c'est le %s" % (l, nom) not in corrige_q4)]
textes.append(('Figure 19 : les huit molécules de Q.4, formules brutes et noms du corrigé', len(q4) == 8 and not q4_ko
               and "at = {'c1': (x, y - 0.5, ''), 'c2': (x + C30, y, ''), 'c3': (x + 2 * C30, y - 0.5, ''), 'c4': (x + 3 * C30, y, '')}" in figsrc
               and "at = {'c2': (x + 0.5, y - 0.2, ''), 'c3': (x + 1.5, y - 0.2, ''), 'c1': (x, y + 0.67, ''), 'c4': (x + 2.0, y + 0.67, '')}" in figsrc))
# figures 1 à 5 (thème 1) : même échelle à l'impression, une liaison mesurant entre 0,50 et 0,59 cm
# (dessin à ECH pouces par unité de liaison, 300 points par pouce, image insérée à la largeur écrite dans la fiche)
from PIL import Image
ECH = float(re.search(r'^ECH = ([\d.]+)', figsrc, flags=re.M).group(1))
liaisons = {}
for nom in ('fig_q1', 'fig_groupes', 'fig_cyclo', 'fig_isomeres', 'fig_ze'):
    largeur = float(re.search(r'figs/%s\.png\)\{width=([\d.]+)cm\}' % nom, src).group(1))
    liaisons[nom] = largeur * ECH * 300 / Image.open(os.path.join(RACINE, 'fiches', 'pc-13-synthese-organique', 'figs', nom + '.png')).size[0]
textes.append(('Figures 1 à 5 : même échelle, liaison de 0,50 à 0,59 cm (%s)' % ', '.join('%.3f' % v for v in liaisons.values()),
               all(0.50 <= v <= 0.59 for v in liaisons.values())))
# « L'essentiel en une page » : rubriques dans l'ordre, premier tableau inchangé pour l'application, rien de hors programme
ess = src[src.index('# L\'essentiel en une page'):src.index('# Ce qui est tombé')]
rubriques = re.findall(r'::: \{custom-style="Rubrique"\}\n(.+)\n:::', ess)
tableaux = re.findall(r'^\| (Notion \| Relation \| .+) \|$', ess, flags=re.M)
textes.append(('L\'essentiel : rubriques, en-têtes des deux tableaux, rien de hors programme', rubriques[:3] == ['À connaître par cœur', 'À savoir retrouver', "Fourni par l'énoncé, à savoir exploiter"]
               and tableaux == ['Notion | Relation | À retenir', 'Notion | Relation | Comment la retrouver'] and 'hors programme' not in ess and 'Z/E' not in ess))
controles.append(('L\'essentiel : rendement de deux étapes, comme en Q.19', 0.800 * 0.75, 0.60, 0.005, r'| Plusieurs étapes | $\eta = \eta_1 \times \eta_2$ |'))
controles.append(('L\'essentiel : alcane et alcène', all(brute('CH3' + 'CH2' * (n - 2) + 'CH3') == 'C%dH%d' % (n, 2 * n + 2) and brute('CH2=CH' + 'CH2' * (n - 3) + 'CH3') == 'C%dH%d' % (n, 2 * n) for n in range(3, 10)), True, 0,
                  r'| Alcane, alcène | $\text{C}_n\text{H}_{2n+2}$ ; $\text{C}_n\text{H}_{2n}$ | Carbone tétravalent ; une double liaison retire deux H. |'))
def ko(c):
    n, cc, i, t, _ = c
    return cc != i if t is None or isinstance(cc, (bool, str, tuple, set)) else abs(float(cc) - float(i)) > t
ecarts = [c for c in controles if ko(c)]
absents = [(n, wr) for n, _, _, _, wr in controles if wr not in src]
faux = [n for n, ok in textes if not ok]
print('--- comparaison avec la fiche : %d valeurs contrôlées, %d écart(s), %d écriture(s) introuvable(s), %d donnée(s) d\'énoncé introuvable(s), %d figure(s) à revoir'
      % (len(controles), len(ecarts), len(absents), len(dmanque), len(faux)))
for n, cc, i, _, _ in ecarts: print('   ÉCART', n, ': recalculé %s, imprimé %s' % (cc, i))
for n, wr in absents: print('   INTROUVABLE', n, ':', wr)
for d in dmanque: print('   DONNÉE INTROUVABLE :', d)
for n in faux: print('   FIGURE', n)

# équations chimiques : conservation des éléments et de la charge ; R et R' sont traités comme des groupes inchangés
ETAT = re.compile(r'\((?:\\text\{(?:aq|s|g)\}|\\ell)\)')
CHARGE = re.compile(r'\^(?:\{\\text\{(\d*)\+\}\}|-|\{(\d*)-\})$')
ELEMENTS = {'H', 'C', 'N', 'O', 'Mg', 'Br', 'Cl', 'R', 'Q'}
GENERIQUES = {r'\text{C}_5\text{H}_{12}\text{O} + \text{C}_2\text{H}_4\text{O}_2 \rightarrow \text{C}_7\text{H}_{14}\text{O}_2 + \text{X}',
              r'\text{C}_7\text{H}_6\text{O}_3 + \text{C}_4\text{H}_6\text{O}_3 \rightarrow \text{C}_9\text{H}_8\text{O}_4 + \text{Y}',
              r'\text{R-CH}_2\text{-OH} \rightarrow \text{R-COOH}',
              r'2\,\text{A} + \text{B} \rightarrow 3\,\text{C} + \text{D}', r'a\,\text{A} + b\,\text{B} \rightarrow c\,\text{C} + d\,\text{D}'}
def terme(t):
    m = re.fullmatch(r'(?:(\d+)\\,)?(.+)', ETAT.sub('', t).strip())
    coef, t = int(m.group(1) or 1), m.group(2)
    charge, c = 0, CHARGE.search(t)
    if c:
        charge = int(c.group(1) or 1) if c.group(0).startswith('^{\\text') else (-1 if c.group(0) == '^-' else -int(c.group(2) or 1))
        t = t[:c.start()]
    clair = re.sub(r'_(\d)', r'\1', re.sub(r'_\{(\d+)\}', r'\1', re.sub(r'\\text\{([^{}]+)\}', r'\1', t)))
    if clair == 'e': return (coef, {}, -1) if charge == -1 else None
    try: comp = compo(clair)
    except ValueError: return None
    if set(comp) - ELEMENTS: return None
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
attendu = {10: [1, 2, 5, 6, 8, 9, 12, 14, 15, 17, 18, 19], 14: [3, 4, 7, 10, 11, 13, 16, 20], 18: []}
faux_niv = [(q, n) for n, qs in attendu.items() for q in qs if niveaux.get(q) != n]
manque = sorted(set(niveaux) - {q for qs in attendu.values() for q in qs}) + ([0] if len(niveaux) != NQ else [])
ex_meta = {int(e): (int(n), m) for e, n, m in re.findall(r'^### \[Exercice (\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)\\ \].*?\[Type BAC\]\{custom-style="TagBac"\} · (.*)$', src, flags=re.M)}
ex_q = {e: len(re.findall(r'^\*\*\d+\.\*\*', src[src.index('### [Exercice %d]' % e):src.index('[CIBLE:c_ex%d]' % e)], flags=re.M)) for e in range(1, NEX + 1)}
ex_att = {1: (10, 6, '4 points · 35 min · Questions 5 et 6 : objectif 14'), 2: (14, 6, '5 points · 45 min · Question 6 : objectif 18'),
          3: (10, 6, '4 points · 35 min · Questions 5 et 6 : objectif 14'), 4: (10, 6, '5 points · 45 min · Question 6 : objectif 14'),
          5: (14, 6, '5 points · 45 min · Question 6 : objectif 18')}
ex_ko = [e for e, (n, nq, m) in ex_att.items() if ex_meta.get(e) != (n, m) or ex_q[e] != nq] + ([0] if len(ex_meta) != NEX else [])
print('--- niveaux : %d questions et %d exercices, %d écart(s)' % (len(niveaux), len(ex_meta), len(faux_niv) + len(manque) + len(ex_ko)))
for q, n in faux_niv: print('   NIVEAU Q.%d : %s dans la fiche, %d dans le parcours' % (q, niveaux.get(q), n))
for q in manque: print('   Q.%d absente du parcours' % q if q else '   NOMBRE DE QUESTIONS : %d au lieu de %d' % (len(niveaux), NQ))
for e in ex_ko: print('   EXERCICE %d : niveau, nombre de questions ou mention' % e if e else '   NOMBRE D\'EXERCICES : %d' % len(ex_meta))
parcours = ['| Q.1, Q.2, Q.5, Q.6, Q.8, Q.9, Q.12, Q.14, Q.15, Q.17 à Q.19 | Ex. 1 (questions 1 à 4), Ex. 3 (questions 1 à 4), Ex. 4 (questions 1 à 5) |',
            '| Plus Q.3, Q.4, Q.7, Q.10, Q.11, Q.13, Q.16, Q.20 | Ex. 1, Ex. 3 et Ex. 4 en entier ; Ex. 2 et Ex. 5 (questions 1 à 5 de chacun) |']
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
rang = [0 if '2026' in t[0] else 1 for t in table]
comptes = [('exercices', len(table), 15), ('sciences de l\'ingénieur', len([t for t in table if 'ingénieur' in ' '.join(t[:3]).lower()]), 0),
           ('sessions 2026', len(de2026(table)), 7), ('2026 avant 2025', int(rang == sorted(rang)), 1),
           ('rendement (Q.19)', len(avec((19,))), 8), ('groupes caractéristiques (Q.2)', len(avec((2,))), 8), ('spectre IR (Q.18)', len(avec((18,))), 7),
           ('extraction (Q.14)', len(avec((14,))), 5), ('CCM (Q.17)', len(avec((17,))), 4),
           ('renvois hors de la fiche', len([t for t in table if max(t[3] | {0}) > NQ or max(t[4] | {0}) > NEX]), 0)]
mauvais = [cc for cc in comptes if cc[1] != cc[2]]
print('--- tableau : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s)' % len(mauvais))
for n, v, a in mauvais: print('   COMPTE %s : %d au lieu de %d' % (n, v, a))
demande = {1: ('Demandé en 2025 (Métropole, Amérique du Sud)', ['Métropole 2025, jour 2 (sujet de secours)', 'Amérique du Sud 2025, jour 2']),
           2: ('Demandé dans huit exercices en 2025 et 2026', 8),
           4: ('Demandé en 2025 (Asie)', ['Asie 2025, jour 1']),
           6: ('Demandé dans quatre exercices en 2025 et 2026', 4),
           7: ('Demandé en 2025 (Amérique du Sud)', ['Amérique du Sud 2025, jour 2']),
           9: ('Demandé en 2025 et 2026', ['Métropole, juin 2026, jour 1', 'Métropole 2025, jour 2 (sujet de secours)', 'Centres étrangers 2025, jour 1']),
           11: ('Demandé en 2025 (Nouvelle-Calédonie)', ['Nouvelle-Calédonie 2025, jour 2']),
           12: ('Demandé en 2025 et 2026', ['Métropole, septembre 2026, jour 1', 'Métropole, septembre 2026, jour 2', 'Amérique du Nord 2025, jour 2 (sujet de secours)']),
           13: ('Demandé dans quatre exercices en 2025 et 2026', 4),
           14: ('Demandé dans cinq exercices en 2025 et 2026', 5),
           15: ('Demandé en 2026 (Polynésie)', ['Polynésie 2026, jour 1']),
           16: ('Demandé en 2026 (Métropole, septembre)', ['Métropole, septembre 2026, jour 1']),
           17: ('Demandé dans quatre exercices en 2025 et 2026', 4),
           18: ('Demandé dans sept exercices en 2025 et 2026', 7),
           19: ('Demandé dans huit exercices en 2025 et 2026', 8),
           20: ('Comparaison de deux voies demandée en 2026 (Polynésie)', ['Polynésie 2026, jour 1'])}
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
sujets = {1: ('Asie 2025, jour 1', 'Arôme de poire', '(voir BAC Asie 2025)', 'Asie 2025, jour 1, exercice 3'),
          2: ('Nouvelle-Calédonie 2025, jour 2', 'Synthèse d\'un édulcorant : l\'aspartame', '(voir BAC Nouvelle-Calédonie 2025)', 'Nouvelle-Calédonie 2025, jour 2, exercice 1'),
          3: ('Amérique du Sud 2025, jour 2', 'Infusion à la framboise', '(voir BAC Amérique du Sud 2025)', 'Amérique du Sud 2025, jour 2, exercice 1'),
          4: ('Métropole, septembre 2026, jour 1', 'Synthèse de l\'alcool de champignon', '(voir BAC Métropole, septembre 2026)', 'Métropole, septembre 2026, jour 1, exercice 3'),
          5: ('Polynésie 2026, jour 1', 'Synthèse d\'une Coumarine', '(voir BAC Polynésie 2026)', 'Polynésie 2026, jour 1, exercice 1')}
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
           'Rendement : huit exercices le font calculer, souvent après une purification (Q.19).',
           'Groupes caractéristiques : huit exercices ; spectre IR : sept (Q.2, Q.18).',
           'Protocole : extraction liquide-liquide dans cinq exercices, CCM dans quatre (Q.14, Q.17).']
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
