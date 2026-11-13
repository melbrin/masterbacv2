# Recalcul indépendant des résultats numériques de la fiche 10 (Dosages),
# puis contrôle de la structure : niveaux et parcours, tableau « Ce qui est tombé » et mentions « Demandé ... »,
# exercices d'après un sujet, figures et index.
# usage : python3 outils/verifs/pc-10-dosages.py
# Les courbes de titrage sont recalculées ici par une résolution exacte de l'électroneutralité.
import os, re
from math import log10, ceil
import numpy as np
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(RACINE, 'fiches', 'pc-10-dosages', 'fiche.md'), encoding='utf-8').read()
figsrc = open(os.path.join(RACINE, 'outils', 'figures', 'pc-10-dosages.py'), encoding='utf-8').read()
Ke = 1e-14

def pH_acide_faible(n0, V0, c, V, pKa):
    Ka = 10 ** -pKa; Vt = (V0 + V) * 1e-3; C = n0 / Vt; Na = c * V * 1e-3 / Vt
    lo, hi = -14.5, 0.5
    for _ in range(80):
        mid = (lo + hi) / 2; h = 10 ** mid
        if Na + h - Ka * C / (Ka + h) - Ke / h > 0: hi = mid
        else: lo = mid
    return -mid
def VE_derivee(n0, V0, c, pKa, Vmax):
    V = np.linspace(0, Vmax, 4001); p = np.array([pH_acide_faible(n0, V0, c, v, pKa) for v in V])
    return V[np.argmax(np.gradient(p, V))]
LAM = {'H3O+': 35.0, 'HO-': 19.9, 'Na+': 5.01, 'Cl-': 7.63, 'Ag+': 6.19, 'NO3-': 7.14}
def intersection(f, VE, Vmax, pas):
    Vm = np.arange(0, Vmax + 1e-9, pas); s = f(Vm)
    p1 = np.polyfit(Vm[Vm < VE], s[Vm < VE], 1); p2 = np.polyfit(Vm[Vm > VE], s[Vm > VE], 1)
    return (p2[1] - p1[1]) / (p1[0] - p2[0])
def sig_HCl(V, n0=1.20e-3, c=0.100):
    nb = c * V * 1e-3
    return (LAM['H3O+'] * np.maximum(n0 - nb, 0) + LAM['HO-'] * np.maximum(nb - n0, 0) + LAM['Na+'] * nb + LAM['Cl-'] * n0) / 200e-6
def sig_Cl(V, n0=5.5e-4, c=0.100):
    na = c * V * 1e-3
    return (LAM['Cl-'] * np.maximum(n0 - na, 0) + LAM['Ag+'] * np.maximum(na - n0, 0) + LAM['NO3-'] * na + LAM['Na+'] * n0) / 200e-6

# Thème 1
C2 = [1.0, 2.0, 3.0, 4.0, 5.0]; A2 = [0.13, 0.26, 0.39, 0.52, 0.65]; k2 = [a / c for a, c in zip(A2, C2)]
C5 = [0.50, 1.00, 1.50, 2.00]; S5 = [6.3, 12.6, 19.0, 25.3]; k5 = sum(s / c for s, c in zip(S5, C5)) / len(S5)
kFe = 1.10 / 100; CS = 2 * 0.66 / kFe * 1e-6; nFe = CS * 0.1000; mFe2O3 = nFe / 2 * 159.7; w = mFe2O3 / 20.0e-3
# Thème 2
ce = 0.100 * 12.0 / 10.0; cI2 = 2.0e-2 * 15.0 / (2 * 20.0); cFe = 5 * 2.00e-2 * 12.4 / 10.0
nI2 = 2.0e-2 * 12.0e-3 / 2; nCu = 2 * nI2; nCu_tot = 20 * nCu; mCu = nCu_tot * 63.5 * 1e3   # mg par kg
cycles = ceil((mCu - 100) / 40)
# Thème 3
VE11 = VE_derivee(1.0e-3, 10.0, 0.100, 4.8, 20.0); pH_demi = pH_acide_faible(1.0e-3, 10.0, 0.100, 5.0, 4.8)
pH_eq = pH_acide_faible(1.0e-3, 10.0, 0.100, 10.0, 4.8)
VEasp = VE_derivee(2.44e-4, 50.0, 2.00e-2, 3.5, 20.0); nasp = 2.00e-2 * 12.2e-3; masp = 10 * nasp * 180.2 * 1e3
nvit = 2.00e-2 * 14.1e-3; mvit = 10 * nvit * 176.1 * 1e3
# Thème 4
VE18 = intersection(sig_HCl, 12.0, 20, 1.0); VEq = intersection(sig_Cl, 5.5, 10, 0.5)

controles = [
    ('Q.2 rapports A/C égaux', max(k2) - min(k2), 0, 1e-9, '$0{,}13\\ \\text{L·µmol}^{-1}$'),
    ('Q.2 concentration', 0.455 / 0.13, 3.5, 0.05, '= 3{,}5\\ \\text{µmol·L}^{-1}'),
    ('Q.2 concentration massique', 3.5e-6 * 792.8, 2.8e-3, 0.05e-3, '= 2{,}8 \\times 10^{-3}\\ \\text{g·L}^{-1}$$'),
    ('Q.3 solution diluée', 0.26 / 0.13, 2.0, 1e-9, '= 2{,}0\\ \\text{µmol·L}^{-1}'),
    ('Q.3 concentration massique', 20e-6 * 792.8, 1.6e-2, 0.05e-2, '= 1{,}6 \\times 10^{-2}\\ \\text{g·L}^{-1}'),
    ('Q.4 chlorure de sodium', (5.01 + 7.63) * 2.0, 25.3, 0.05, '= 25{,}3\\ \\text{mS·m}^{-1}'),
    ('Q.4 acide chlorhydrique', (35.0 + 7.63) * 2.0, 85.3, 0.05, '= 85{,}3\\ \\text{mS·m}^{-1}$$'),
    ('Q.5 étalons proportionnels', max(s / c for s, c in zip(S5, C5)) - min(s / c for s, c in zip(S5, C5)), 0, 0.1, 'k = 12{,}63\\ \\text{mS·m}^{-1}'),
    ('Q.5 solution diluée', 19.5 / k5, 1.54, 0.005, '= 1{,}54\\ \\text{mmol·L}^{-1}'),
    ('Q.5 concentration massique', 19.5 / k5 * 0.1 * 58.5, 9.0, 0.05, '= 9{,}0\\ \\text{g·L}^{-1}$$'),
    ('Ex. 1 volume de solution mère', 50.0 * 40 / 100, 20.0, 1e-9, '= 20{,}0\\ \\text{mL}$ de solution mère'),
    ('Ex. 1 coefficient k', kFe, 1.10e-2, 1e-9, '= 1{,}10 \\times 10^{-2}\\ \\text{L·µmol}^{-1}$$'),
    ('Ex. 1 lecture', 0.66 / kFe, 60, 0.5, 'à une concentration de $60\\ \\text{µmol·L}^{-1}$'),
    ('Ex. 1 ions fer(II)', nFe, 1.20e-5, 0.005e-5, '= 1{,}2 \\times 10^{-5}\\ \\text{mol}$$'),
    ('Ex. 1 oxyde de fer(III) (mol)', nFe / 2, 6.0e-6, 0.05e-6, '= 6{,}0 \\times 10^{-6}\\ \\text{mol}$'),
    ('Ex. 1 masse', mFe2O3, 9.6e-4, 0.05e-4, '= 9{,}6 \\times 10^{-4}\\ \\text{g} = 0{,}96\\ \\text{mg}$$'),
    ('Ex. 1 pourcentage massique', 100 * w, 4.8, 0.05, '\\text{ soit } 4{,}8\\ \\%'),
    ('Ex. 1 quotient z', abs(4.8 - 5.0) / 0.2, 1.0, 1e-9, '= 1{,}0$$'),
    ('Q.8 vinaigre dilué', ce, 0.120, 1e-9, '= 0{,}120\\ \\text{mol·L}^{-1} \\qquad C = 10'),
    ('Q.8 vinaigre', 10 * ce, 1.20, 1e-9, '= 1{,}20\\ \\text{mol·L}^{-1}$$'),
    ('Q.8 diiode', cI2, 7.5e-3, 1e-12, '= 7{,}5 \\times 10^{-3}\\ \\text{mol·L}^{-1}$$'),
    ('Q.10 ions fer(II)', cFe, 0.124, 1e-9, '= 0{,}124\\ \\text{mol·L}^{-1}$$'),
    ('Q.16 quotient z', abs(486 - 500) / 8, 1.75, 1e-9, '= 1{,}75'),
    ('Q.16 écart relatif', abs(486 - 500) / 500, 2.8e-2, 1e-9, '= 2{,}8 \\times 10^{-2}$$'),
    ('Ex. 2 diiode', nI2, 1.2e-4, 1e-12, '= 1{,}20 \\times 10^{-4}\\ \\text{mol}$$'),
    ('Ex. 2 cuivre du prélèvement', nCu, 2.4e-4, 1e-12, '= 2{,}40 \\times 10^{-4}\\ \\text{mol}$$'),
    ('Ex. 2 cuivre de la terre', nCu_tot, 4.8e-3, 1e-12, '= 4{,}80 \\times 10^{-3}\\ \\text{mol}'),
    ('Ex. 2 masse de cuivre (mg/kg)', mCu, 305, 0.5, '= 0{,}305\\ \\text{g}$$'),
    ('Ex. 2 nombre de cycles', cycles, 6, 0, 'il en faut donc six'),
    ('Ex. 2 teneur après cinq cycles', mCu - 5 * 40, 105, 0.5, '= 105\\ \\text{mg·kg}^{-1}$'),
    ('Q.11 volume équivalent (dérivée)', VE11, 10.0, 0.05, 'ici $V_\\text{E} = 10{,}0\\ \\text{mL}$'),
    ('Q.11 concentration', 0.100 * 10.0 / 10.0, 0.100, 1e-9, '= 0{,}100\\ \\text{mol·L}^{-1}$$'),
    ('Q.11 pH à l\'équivalence', pH_eq, 8.7, 0.05, 'voisine de $8{,}7$'),
    ('Q.12 pH à la demi-équivalence', pH_demi, 4.8, 0.05, 'On lit $\\text{pH} = 4{,}8$'),
    ('Q.13 indicateur', 8.2 <= pH_eq <= 10.0, True, 0, "c'est la phénolphtaléine"),
    ('Q.14 ions carbonate', 0.100 * 9.6e-3, 9.6e-4, 1e-12, '= 9{,}6 \\times 10^{-4}\\ \\text{mol}$'),
    ('Q.14 second volume attendu', 2 * 9.6, 19.2, 1e-9, '= 19{,}2\\ \\text{mL}$'),
    ('Q.14 ions hydrogénocarbonate', 0.100 * (21.8 - 19.2) * 1e-3, 2.6e-4, 1e-12, '= 2{,}6 \\times 10^{-4}\\ \\text{mol}'),
    ('Q.15 prise d\'essai', nvit, 2.82e-4, 1e-12, '= 2{,}82 \\times 10^{-4}\\ \\text{mol}$'),
    ('Q.15 masse', mvit, 497, 0.5, '= 0{,}497\\ \\text{g}$$'),
    ('Q.15 écart', abs(500 - mvit) / 500 < 0.01, True, 0, 'écart inférieur à $1\\ \\%$'),
    ('Ex. 3 volume équivalent (dérivée)', VEasp, 12.2, 0.05, '$V_\\text{E} = 12{,}2\\ \\text{mL}$ (figure 10)'),
    ('Ex. 3 aspirine titrée', nasp, 2.44e-4, 1e-12, '= 2{,}44 \\times 10^{-4}\\ \\text{mol}$$'),
    ('Ex. 3 masse', masp, 440, 0.5, '= 0{,}440\\ \\text{g}$$'),
    ('Ex. 3 écart relatif', abs(440 - 500) / 500, 0.12, 1e-9, '= 0{,}12$$'),
    ('Q.18 volume équivalent', VE18, 12.0, 0.05, 'donne $V_\\text{E} = 12{,}0\\ \\text{mL}$'),
    ('Q.18 concentration', 0.100 * 12.0 / 10.0, 0.120, 1e-9, '= 0{,}120\\ \\text{mol·L}^{-1}$$'),
    ('Q.19 ions chlorure', 5.00e-3 * 9.6e-3, 4.8e-5, 1e-12, '= 4{,}8 \\times 10^{-5}\\ \\text{mol}'),
    ('Q.19 concentration', 4.8e-5 / 20.0e-3, 2.4e-3, 1e-12, '= 2{,}4 \\times 10^{-3}\\ \\text{mol·L}^{-1}$$'),
    ('Q.19 concentration massique', 2.4e-3 * 35.5, 8.5e-2, 0.05e-2, '= 8{,}5 \\times 10^{-2}\\ \\text{g·L}^{-1}'),
    ('Ex. 4 volume équivalent', VEq, 5.5, 0.05, 'se coupent pour $V_\\text{E} = 5{,}5\\ \\text{mL}$'),
    ('Ex. 4 solution D', 0.100 * 5.5e-3 / 10.0e-3, 5.5e-2, 1e-12, '= 5{,}5 \\times 10^{-2}\\ \\text{mol·L}^{-1}$$'),
    ('Ex. 4 concentration massique', 0.55 * 35.5, 19.5, 0.05, '= 19{,}5\\ \\text{g·L}^{-1}$$'),
    ('Ex. 4 facteur de dilution', 0.55 / 0.105, 5, 0.5, '\\approx 5$.'),
]
textes = [('Figure 7, étiquette', "'A = 0,66 : 60 µmol·L$^{-1}$'" in figsrc), ('Ex. 1 maximum du spectre à 510 nm', '(lam - 510)' in figsrc)]
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
attendu = {10: [1, 2, 4, 6, 7, 8, 9, 10, 11, 13, 17, 18], 14: [3, 5, 12, 14, 15, 16, 19], 18: []}
faux_niv = [(q, n) for n, qs in attendu.items() for q in qs if niveaux.get(q) != n]
manque = sorted(set(niveaux) - {q for qs in attendu.values() for q in qs})
ex_niv = {int(e): int(n) for e, n in re.findall(r'^### \[Exercice (\d+)\].*?\n\n::: \{custom-style="Meta"\}\n\[\\ Objectif (\d+)', src, flags=re.M)}
ex_q = {e: len(re.findall(r'^\*\*\d+\.\*\*', src[src.index('### [Exercice %d]' % e):src.index('[CIBLE:c_ex%d]' % e)], flags=re.M)) for e in range(1, 5)}
ex_att = {1: (10, 6, 'Questions 5 et 6 : objectif 14'), 2: (14, 6, 'Question 6 : objectif 18'),
          3: (14, 6, 'Question 6 : objectif 18'), 4: (10, 5, 'Question 5 : objectif 14')}
ex_ko = [e for e, (n, nq, m) in ex_att.items() if ex_niv.get(e) != n or ex_q[e] != nq or m not in src[src.index('### [Exercice %d]' % e):][:600]]
print('--- niveaux : %d questions et %d exercices, %d écart(s)' % (len(niveaux), len(ex_niv), len(faux_niv) + len(manque) + len(ex_ko)))
for q, n in faux_niv: print('   NIVEAU Q.%d : %s dans la fiche, %d dans le parcours' % (q, niveaux.get(q), n))
for q in manque: print('   Q.%d absente du parcours' % q)
for e in ex_ko: print('   EXERCICE %d : niveau, nombre de questions ou mention' % e)
parcours = ['| Q.1, Q.2, Q.4, Q.6 à Q.11, Q.13, Q.17, Q.18 | Ex. 1 (questions 1 à 4), Ex. 4 (questions 1 à 4) |',
            '| Plus Q.3, Q.5, Q.12, Q.14 à Q.16, Q.19 | Ex. 1 et Ex. 4 en entier ; Ex. 2 et Ex. 3 (questions 1 à 5) |']
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
comptes = [('exercices', len(table), 19), ('sciences de l\'ingénieur', len([t for t in table if 'ingénieur' in ' '.join(t[:3]).lower()]), 0),
           ('sessions 2026', len([t for t in table if '2026' in t[0]]), 9),
           ('courbe pH-métrique (Q.11 à Q.14, Ex. 3)', len(avec((11, 12, 13, 14), (3,))), 7),
           ('conductimétrie (Q.17 à Q.19)', len(avec((17, 18, 19))), 3),
           ('prise d\'essai (Q.15)', len(avec((15,))), 3), ('prise d\'essai en 2026', len([t for t in avec((15,)) if '2026' in t[0]]), 3),
           ('étalonnage (Q.1 à Q.5)', len(avec((1, 2, 3, 4, 5))), 2)]
mauvais = [cc for cc in comptes if cc[1] != cc[2]]
print('--- tableau : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s)' % len(mauvais))
demande = {1: ('Demandé en 2025 (Amérique du Nord)', ['Amérique du Nord 2025, jour 1']),
           2: ('Demandé en 2025 et 2026', ['Amérique du Nord 2025, jour 1', 'Métropole, septembre 2026, jour 2']),
           3: ('Demandé en 2026 (Métropole, septembre)', ['Métropole, septembre 2026, jour 2']),
           7: ('Demandé en 2025 et 2026', ['Métropole, juin 2026, jour 1', 'Métropole, juin 2025, jour 1', 'Centres étrangers 2025, jour 1', 'Métropole 2025, jour 2 (sujet de secours)']),
           8: ('Demandé en 2025 et 2026', ['Métropole, juin 2026, jour 1', 'Amérique du Nord 2026, jour 2', 'Métropole, septembre 2026, jour 1', 'Métropole, juin 2025, jour 2', 'Métropole, septembre 2025, jour 2', 'Métropole 2025, jour 2 (sujet de secours)']),
           9: ('Demandé en 2025 (Métropole, Centres étrangers)', ['Métropole, septembre 2025, jour 1', 'Centres étrangers 2025, jour 1']),
           10: ('Demandé en 2026 (Asie)', ['Asie 2026, jour 2']),
           11: ('Demandé dans cinq exercices en 2025 et 2026', 5),
           13: ('Demandé en 2025 et 2026', ['Antilles-Guyane 2026, jour 1', 'Amérique du Sud 2025, jour 1']),
           14: ('Demandé en 2025 (Métropole, septembre)', ['Métropole, septembre 2025, jour 1']),
           15: ('Demandé en 2026 (Amérique du Nord, Centres étrangers)', ['Amérique du Nord 2026, jour 1', 'Amérique du Nord 2026, jour 2', 'Centres étrangers 2026, jour 1']),
           16: ('Demandé en 2025 et 2026', ['Antilles-Guyane 2026, jour 1', 'Métropole, septembre 2026, jour 1', 'Métropole, septembre 2026, jour 2', 'Métropole 2025, jour 2 (sujet de secours)']),
           17: ('Demandé en 2025 et 2026', ['Métropole, juin 2026, jour 2', 'Asie 2025, jour 1']),
           18: ('Demandé en 2025 et 2026', ['Métropole, juin 2026, jour 2', 'Asie 2025, jour 1']),
           19: ('Demandé en 2025 et 2026', ['Métropole, juin 2026, jour 2', 'Métropole, juin 2025, jour 2'])}
metas = {int(q): m for q, m in re.findall(r'^## \[Q\.(\d+)\].*?\n\n::: \{custom-style="Meta"\}\n(.*)$', src, flags=re.M)}
dem_ko = []
for q in range(1, 20):
    lq = [t[0] for t in table if q in t[3]]
    if q not in demande:
        if 'Demandé' in metas[q] or lq: dem_ko.append('Q.%d : mention ou ligne inattendue' % q)
        continue
    texte, att = demande[q]
    if texte not in metas[q]: dem_ko.append('Q.%d : « %s » absent' % (q, texte))
    if (len(lq) != att) if isinstance(att, int) else (sorted(lq) != sorted(att)): dem_ko.append('Q.%d : lignes %s' % (q, lq))
sujets = {1: ('Amérique du Nord 2025, jour 1', 'Étude d\'un vernis à ongles', '(voir BAC Amérique du Nord 2025)', 'Amérique du Nord 2025, jour 1, exercice 1'),
          2: ('Asie 2026, jour 2', 'Phytoremédiation', '(voir BAC Asie 2026)', 'Asie 2026, jour 2, exercice 3'),
          3: ('Centres étrangers 2026, jour 1', 'Analyse d\'un comprimé', '(voir BAC Centres étrangers 2026)', 'Centres étrangers 2026, jour 1, exercice 3'),
          4: ('Métropole, juin 2025, jour 2', 'Eau de Quinton', '(voir BAC Métropole, juin 2025)', 'Métropole, juin 2025, jour 2, exercice 2')}
for e, (sess, nom, voir, mention) in sujets.items():
    tete = src[src.index('### [Exercice %d]' % e):][:900]
    lig = [t for t in table if t[0] == sess and t[1] == nom]
    if not lig or e not in lig[0][4]: dem_ko.append('Ex. %d : ligne « %s » absente ou sans renvoi' % (e, nom))
    if voir not in tete or ('%s : « %s »' % (mention, nom)) not in tete: dem_ko.append('Ex. %d : renvoi au sujet incomplet' % e)
print('--- mentions « Demandé » et sujets d\'après : %d écart(s)' % len(dem_ko))
for d in dem_ko: print('   ' + d)
phrases = ['dans au moins dix-neuf exercices des sessions 2025 et 2026', 'Sept des dix-neuf exercices', 'revient dans trois exercices (Q.17 à Q.19, Ex. 4)',
           'demandé dans au moins quatre exercices de 2026 (Q.8, Q.15)', "est tombé au moins trois fois à l'écrit"]
perdues = [p for p in phrases if p not in src]
for p in perdues: print('   PHRASE INTROUVABLE :', p)
print('--- phrases de synthèse : %d suivies, %d introuvable(s)' % (len(phrases), len(perdues)))
nums = [int(n) for n in re.findall(r'^Figure (\d+)\. ', src, flags=re.M)]
refs = sorted({int(n) for n in re.findall(r'(?:la |\()figure (\d+)', src)})
fig_ko = nums != list(range(1, len(nums) + 1)) or any(n not in nums for n in refs)
print('--- figures : %d légendes, renvois vers %s%s' % (len(nums), ', '.join(map(str, refs)), ' ; ÉCART' if fig_ko else ''))
idx = src[src.index('# Index des notions'):]
iq, ie = set(), set()
for l in idx.splitlines():
    if l.startswith('| ') and not l.startswith('| Notion'):
        a, b = renvois(l.split('|')[2]); iq |= a; ie |= b
idx_ko = sorted(set(range(1, 20)) - iq) + [100 + e for e in sorted(set(range(1, 5)) - ie)] + [q for q in iq if q > 19]
print('--- index : %d questions et %d exercices cités%s' % (len(iq), len(ie), ' ; ÉCART %s' % idx_ko if idx_ko else ''))
if ecarts or absents or faux or faux_niv or manque or ex_ko or perdus or mauvais or dem_ko or perdues or fig_ko or idx_ko:
    raise SystemExit(1)
print('--- tout est bon')
