# Recalcul indépendant des résultats numériques de la fiche 6 (Ondes : propagation, son, diffraction, interférences, effet Doppler).
# usage : python3 outils/verifs/pc-06-ondes.py
# Chaque valeur imprimée est recalculée à partir des seules données des énoncés, puis on vérifie que son écriture
# figure telle quelle dans la fiche. Les données des graphiques sont reprises du script des figures.
import os
from math import pi, sqrt, log10, degrees
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(RACINE, 'fiches', 'pc-06-ondes', 'fiche.md'), encoding='utf-8').read()
c, I0 = 3.00e8, 1.0e-12
L_ = lambda I: 10 * log10(I / I0)
I_ = lambda L: I0 * 10 ** (L / 10)

# Thème 1
v1 = 4.0 / 0.20; tau1 = 1.5 / v1
d2 = 1.50e3 * 0.24 / 2
T3 = 1 / 40.0e3; lam3 = 343 / 40.0e3
vverre, veau = c / 1.50, c / 1.33
r5 = (295 / 331) ** 2; T5 = 273 * r5; v20 = 331 * sqrt(293 / 273)
lam6 = c / 2.45e9; frouge, fviolet = c / 800e-9, c / 400e-9
# Exercice 1 (écho dessiné à 2 x 2,00 / 343 s, lu 11,7 ms)
t_echo = 2 * 2.00 / 343; d_ex1 = 343 * 11.7e-3 / 2
vfroid = 331 * sqrt(263 / 273); dt_froid = 2 * 2.00 / vfroid; d_aff = 340 * 1.23e-2 / 2; d_aff_exact = 340 * dt_froid / 2
salve = 8 * T3; dmin = 343 * salve / 2
# Thème 2
I7 = 0.50 / (4 * pi * 4.0 ** 2)
L8 = L_(2.0e-5); I8 = I_(95); L8b = L_(2.5e-3)
L9a = L_(2 * I_(80)); L9b = L_(I_(80) + I_(70))
A10 = 20 * log10(10 / 2.0)
# Exercice 2 (figure : casque 32 dB et bouchons 16 dB à 2 kHz)
fr = [125, 250, 500, 1000, 2000, 4000, 8000]; casque = [10, 15, 22, 28, 32, 35, 33]; bouch = [14, 15, 15, 16, 16, 17, 18]
Acas, Abou = casque[fr.index(2000)], bouch[fr.index(2000)]
L1 = L_(5.0e-4); I2 = I_(82); L12 = L_(5.0e-4 + I2)
L3 = 104 - 20 * log10(25 / 5.0); q5 = 10 ** (19 / 20); dmin5 = 5.0 * q5
I3 = I_(L3); Ltot = L_(5.0e-4 + I2 + I3)
# Thème 3
th14 = 633e-9 / 0.10e-3; th15 = 2.6e-2 / (2 * 2.0); L16 = 2 * 633e-9 * 2.00 / 0.10e-3
L17 = 2 * 6.5e-3     # annulations en x = ± 6,5 mm (figure : u = pi x / 6,5)
a17 = 2 * 650e-9 * 2.00 / L17
th18 = 1.22 * 633e-9 / 0.20e-3; d18 = 2 * 2.0 * th18
# Exercice 3
a_um = [50, 80, 100, 150, 200, 300]; Lmm = [42.8, 26.4, 21.5, 14.1, 10.7, 7.0]
x = [1000 / a for a in a_um]
kfit = sum(xi * yi for xi, yi in zip(x, Lmm)) / sum(xi * xi for xi in x)     # mm², droite par l'origine
k_att = 2 * 532e-9 * 2.00
a_ex3 = 2.13e-6 / 4.6e-3; ur = sqrt((0.03 / 2.13) ** 2 + (0.3 / 4.6) ** 2); ua = ur * a_ex3; z = abs(a_ex3 - 0.45e-3) / ua
Lth = [k_att / (a * 1e-6) * 1e3 for a in a_um]
# Thème 4
r20 = [1.8 / 0.600, 1.5 / 0.600, 2.0 / 0.600]
i22 = 532e-9 * 1.50 / 0.40e-3
i23 = (19.8 - 4.2) / 6; lam23 = i23 * 1e-3 * 0.50e-3 / 2.00; b23 = 650e-9 * 2.00 / 4.0e-3
deux_ne = 2 * 1.33 * 300; lam24 = [deux_ne / (k - 0.5) for k in (1, 2, 3)]
# Exercice 4
lam_k = 343 / 2500; D4_prevu = 2 * 343 / 2500; v_k = 2500 * 0.275 / 2
# Thème 5
f_app = 900 * 340 / (340 - 25); f_elo = 900 * 340 / (340 + 25); f_approx = 900 * 25 / 340
v27 = c * 2.40e3 / (2 * 24.0e9)
v28 = c * (662.9 - 656.3) / 656.3; d28 = v28 / 1e3 / 70
# Exercice 5
cel = {th: 331.3 * sqrt((th + 273.15) / 273.15) for th in range(15, 21)}
cel_imp = {15: 340.3, 16: 340.9, 17: 341.5, 18: 342.0, 19: 342.6, 20: 343.2}
fE = 5 / 125e-6; vch = 96 * 342.0 / (2 * 40.0e3)
xs = [0.0, 1.6, 3.3, 4.9, 6.6, 8.2]; ts = [0, 40, 80, 120, 160, 200]
v_pos = 8.2e-2 / 0.200
v50 = 50 / 3.6; df7 = 2 * 24.0e9 * 13.9 / c

controles = [
    ('Q.1 célérité', v1, 20, 1e-9, r'= 20\ \text{m·s}^{-1}'),
    ('Q.1 retard', tau1, 0.075, 1e-9, r'= 0{,}075\ \text{s} = 75\ \text{ms}'),
    ('Q.2 profondeur', d2, 180, 1e-9, r'= 1{,}8 \times 10^{2}\ \text{m}'),
    ('Q.3 période', T3, 2.50e-5, 1e-12, r'= 2{,}50 \times 10^{-5}\ \text{s} = 25{,}0\ \text{µs}'),
    ('Q.3 longueur d\'onde (8,575 arrondi au-dessus)', lam3, 8.58e-3, 6e-6, r'= 8{,}58 \times 10^{-3}\ \text{m}'),
    ('Q.4 verre', vverre, 2.00e8, 5e5, r'= 2{,}00 \times 10^{8}\ \text{m·s}^{-1}'),
    ('Q.4 eau', veau, 2.26e8, 5e5, r'= 2{,}26 \times 10^{8}\ \text{m·s}^{-1}'),
    ('Q.5 rapport au carré', r5, 0.794, 5e-4, r'0{,}794'),
    ('Q.5 température absolue', T5, 217, 0.5, r'= 217\ \text{K}'),
    ('Q.5 température Celsius', 217 - 273, -56, 1e-9, r'= -56\ \text{°C}'),
    ('Q.5 vérification à 20 °C', v20, 343, 0.5, r'= 343\ \text{m·s}^{-1}'),
    ('Q.6 longueur d\'onde du four', lam6, 0.122, 5e-4, r'= 0{,}122\ \text{m} = 12{,}2\ \text{cm}'),
    ('Q.6 fréquence du rouge', frouge, 3.8e14, 5e12, r'= 3{,}8 \times 10^{14}\ \text{Hz}'),
    ('Q.6 fréquence du violet', fviolet, 7.5e14, 5e12, r'= 7{,}5 \times 10^{14}\ \text{Hz}'),
    ('Ex.1 écho lu (ms)', t_echo * 1e3, 11.7, 0.05, r'\Delta t \approx 11{,}7\ \text{ms}'),
    ('Ex.1 écho en divisions', 11.7 / 2, 5.85, 1e-9, r'vers 5,85 divisions'),
    ('Ex.1 distance', d_ex1, 2.01, 0.005, r'= 2{,}01\ \text{m}'),
    ('Ex.1 célérité à -10 °C', vfroid, 325, 0.5, r'= 325\ \text{m·s}^{-1}'),
    ('Ex.1 facteur racine', sqrt(263 / 273), 0.982, 5e-4, r'0{,}982'),
    ('Ex.1 aller-retour à -10 °C', dt_froid, 1.23e-2, 5e-5, r'= 1{,}23 \times 10^{-2}\ \text{s} = 12{,}3\ \text{ms}'),
    ('Ex.1 distance affichée', d_aff, 2.09, 0.005, r'= 2{,}09\ \text{m}'),
    ('Ex.1 distance affichée sans arrondi', d_aff_exact, 2.09, 0.005, r'= 2{,}09\ \text{m}'),
    ('Ex.1 surestimation (cm)', (d_aff_exact - 2.00) * 100, 9, 0.5, r"d'environ $9\ \text{cm}$"),
    ('Ex.1 durée de la salve', salve, 2.00e-4, 1e-12, r'= 200\ \text{µs} = 2{,}00 \times 10^{-4}\ \text{s}'),
    ('Ex.1 distance minimale', dmin, 3.4e-2, 5e-4, r'= 3{,}4 \times 10^{-2}\ \text{m}'),
    ('Q.7 intensité', I7, 2.5e-3, 5e-5, r'= 2{,}5 \times 10^{-3}\ \text{W·m}^{-2}'),
    ('Q.7 aire', 4 * pi * 16, 201, 0.5, r'{201}'),
    ('Q.8 niveau', L8, 73, 0.5, r'= 73\ \text{dB}'),
    ('Q.8 intensité', I8, 3.2e-3, 5e-5, r'= 3{,}2 \times 10^{-3}\ \text{W·m}^{-2}'),
    ('Q.8 niveau de l\'enceinte', L8b, 94, 0.5, r'= 94\ \text{dB}'),
    ('Q.9 deux sources de 80 dB', L9a, 83, 0.5, r'= 83\ \text{dB}'),
    ('Q.9 80 dB et 70 dB', L9b, 80.4, 0.05, r'= 80{,}4\ \text{dB}'),
    ('Q.10 atténuation', A10, 14, 0.5, r'= 14\ \text{dB}'),
    ('Q.10 niveau à 10 m', 96 - A10, 82, 0.5, r'= 82\ \text{dB}'),
    ('Q.11 vitrage', 74 - 42, 32, 1e-9, r'= 32\ \text{dB}'),
    ('Q.11 casque', 98 - 28, 70, 1e-9, r'= 70\ \text{dB}'),
    ('Q.12 fréquence', 1 / 2.5e-3, 4.0e2, 1e-9, r'= 4{,}0 \times 10^{2}\ \text{Hz}'),
    ('Ex.2 tour seul', L1, 87, 0.5, r'= 87\ \text{dB}'),
    ('Ex.2 intensité de la perceuse', I2, 1.6e-4, 5e-6, r'= 1{,}6 \times 10^{-4}\ \text{W·m}^{-2}'),
    ('Ex.2 tour et perceuse', L12, 88, 0.5, r'= 88\ \text{dB}'),
    ('Ex.2 tour et perceuse, intensité', 5.0e-4 + I2, 6.6e-4, 5e-6, r'6{,}6 \times 10^{8}'),
    ('Ex.2 presse au poste', L3, 90, 0.5, r'= 90\ \text{dB}'),
    ('Ex.2 rapport des distances', q5, 8.9, 0.05, r'= 8{,}9'),
    ('Ex.2 distance minimale', dmin5, 45, 0.5, r"d' > 45\ \text{m}"),
    ('Ex.2 intensité de la presse', I3, 1.0e-3, 5e-5, r'= 1{,}0 \times 10^{-3}\ \text{W·m}^{-2}'),
    ('Ex.2 niveau total', Ltot, 92, 0.5, r'= 92\ \text{dB}'),
    ('Ex.2 intensité totale', 5.0e-4 + 1.6e-4 + 1.0e-3, 1.66e-3, 5e-6, r'1{,}66 \times 10^{9}'),
    ('Ex.2 casque à 2 kHz', Acas, 32, 1e-9, r'$32\ \text{dB}$ pour le casque'),
    ('Ex.2 bouchons à 2 kHz', Abou, 16, 1e-9, r'$16\ \text{dB}$ pour les bouchons'),
    ('Ex.2 avec le casque', 92 - Acas, 60, 1e-9, r'92 - 32 = 60\ \text{dB}'),
    ('Ex.2 avec les bouchons', 92 - Abou, 76, 1e-9, r'92 - 16 = 76\ \text{dB}'),
    ('Q.14 angle', th14, 6.3e-3, 5e-5, r'= 6{,}3 \times 10^{-3}\ \text{rad}'),
    ('Q.14 angle en degré', degrees(th14), 0.36, 0.005, r'= 0{,}36\text{°}'),
    ('Q.14 fente deux fois plus étroite', 2 * th14, 1.3e-2, 5e-4, r'= 1{,}3 \times 10^{-2}\ \text{rad}'),
    ('Q.15 angle', th15, 6.5e-3, 5e-5, r'= 6{,}5 \times 10^{-3}\ \text{rad}'),
    ('Q.16 largeur', L16, 2.5e-2, 5e-4, r'= 2{,}5 \times 10^{-2}\ \text{m} = 2{,}5\ \text{cm}'),
    ('Q.17 largeur (mm)', L17 * 1e3, 13, 1e-9, r'L = 6{,}5 - (-6{,}5) = 13\ \text{mm}'),
    ('Q.17 largeur de fente', a17, 2.0e-4, 5e-6, r'= 2{,}0 \times 10^{-4}\ \text{m} = 0{,}20\ \text{mm}'),
    ('Q.18 angle', th18, 3.86e-3, 5e-6, r'= 3{,}86 \times 10^{-3}\ \text{rad}'),
    ('Q.18 diamètre', d18, 1.5e-2, 5e-4, r'= 1{,}5 \times 10^{-2}\ \text{m}'),
    ('Ex.3 k par ajustement (mm2)', kfit, 2.13, 0.005, r'= 2{,}13\ \text{mm}^{2}'),
    ('Ex.3 point de la droite en 20 mm-1', kfit * 20, 42.6, 0.1, r'42{,}6\ \text{mm}'),
    ('Ex.3 k attendu', k_att, 2.13e-6, 5e-9, r'= 2{,}13 \times 10^{-6}\ \text{m}^{2}'),
    ('Ex.3 diamètre', a_ex3, 4.63e-4, 5e-7, r'= 4{,}63 \times 10^{-4}\ \text{m} = 0{,}463\ \text{mm}'),
    ('Ex.3 incertitude relative', ur, 0.067, 5e-4, r'= 0{,}067'),
    ('Ex.3 incertitude', ua * 1e3, 0.031, 5e-4, r'= 0{,}031\ \text{mm}'),
    ('Ex.3 z-score', z, 0.4, 0.05, r'= 0{,}4 < 2'),
    ('Q.20 premier quotient', r20[0], 3, 1e-9, r'= 3$, entier'),
    ('Q.20 deuxième quotient', r20[1], 2.5, 1e-9, r'= 2{,}5$, demi-entier'),
    ('Q.20 troisième quotient', r20[2], 3.33, 0.005, r'= 3{,}33$'),
    ('Q.22 interfrange', i22, 2.0e-3, 5e-5, r'= 2{,}0 \times 10^{-3}\ \text{m} = 2{,}0\ \text{mm}'),
    ('Q.23 interfrange (mm)', i23, 2.6, 1e-9, r'i = 2{,}6\ \text{mm}'),
    ('Q.23 longueur d\'onde', lam23, 6.5e-7, 5e-9, r'= 6{,}5 \times 10^{-7}\ \text{m} = 650\ \text{nm}'),
    ('Q.23 écart des fentes (3,25 arrondi au-dessus)', b23, 3.3e-4, 6e-6, r'= 3{,}3 \times 10^{-4}\ \text{m} = 0{,}33\ \text{mm}'),
    ('Q.24 2ne (nm)', deux_ne, 798, 1e-9, r'= 798\ \text{nm}'),
    ('Q.24 k = 1', lam24[0], 1596, 1e-9, r'= 1\ 596\ \text{nm}'),
    ('Q.24 k = 2', lam24[1], 532, 1e-9, r'= 532\ \text{nm}'),
    ('Q.24 k = 3', lam24[2], 319, 0.5, r'= 319\ \text{nm}'),
    ('Ex.4 longueur d\'onde (vérification avec v = 344)', 344 / 2500, 0.138, 5e-4, r'= 0{,}138\ \text{m}'),
    ('Ex.4 D = 3,4 cm proche de lambda/4 (cm)', lam_k / 4 * 100, 3.4, 0.05, r'D = 3{,}4\ \text{cm}'),
    ('Ex.4 quatrième maximum prévu (cm)', D4_prevu * 100, 27.5, 0.1, r'D = 27{,}5\ \text{cm}'),
    ('Ex.4 célérité', v_k, 344, 0.5, r'= 344\ \text{m·s}^{-1}'),
    ('Q.26 approche', f_app, 971, 0.5, r'= 971\ \text{Hz}'),
    ('Q.26 éloignement', f_elo, 838, 0.5, r'= 838\ \text{Hz}'),
    ('Q.26 approximation', f_approx, 66, 0.5, r'= 66\ \text{Hz}'),
    ('Q.26 décalage exact', f_app - 900, 71, 0.5, r'au lieu de $71\ \text{Hz}$'),
    ('Q.27 vitesse', v27, 15.0, 0.05, r'= 15{,}0\ \text{m·s}^{-1} = 15{,}0 \times 3{,}6\ \text{km·h}^{-1} = 54{,}0\ \text{km·h}^{-1}'),
    ('Q.28 décalage (nm)', 662.9 - 656.3, 6.6, 1e-9, r'= 6{,}6\ \text{nm}'),
    ('Q.28 vitesse', v28, 3.0e6, 5e4, r'= 3{,}0 \times 10^{6}\ \text{m·s}^{-1}'),
    ('Q.28 distance (Mpc)', d28, 43, 0.5, r'= 43\ \text{Mpc}'),
    ('Ex.5 fréquence émise', fE, 4.00e4, 1e-9, r'= 4{,}00 \times 10^{4}\ \text{Hz} = 40{,}0\ \text{kHz}'),
    ('Ex.5 vitesse par effet Doppler', vch, 0.41, 0.005, r'= 0{,}41\ \text{m·s}^{-1}'),
    ('Ex.5 vitesse par les positions', v_pos, 0.41, 1e-9, r'{0{,}200} = 0{,}41\ \text{m·s}^{-1}'),
    ('Ex.5 fréquence en éloignement', 40000 - 96, 39904, 1e-9, r'= 39\ 904\ \text{Hz}'),
    ('Ex.5 50 km/h en m/s', v50, 13.9, 0.05, r'= 13{,}9\ \text{m·s}^{-1}'),
    ('Ex.5 décalage du vrai radar', df7, 2.22e3, 5, r'= 2{,}22 \times 10^{3}\ \text{Hz}'),
]
for th in range(15, 21):
    controles.append(('Ex.5 célérité à %d °C' % th, cel[th], cel_imp[th], 0.05, ('%.1f' % cel_imp[th]).replace('.', ',')))
for t, xv in zip(ts, xs):
    controles.append(('Ex.5 position à %d ms (cm)' % t, 0.41 * t * 1e-3 * 100, xv, 0.05, ('%.1f' % xv).replace('.', ',')))
for a, l_imp, l_th in zip(a_um, Lmm, Lth):
    controles.append(('Ex.3 tableau, a = %d µm (mm)' % a, l_th, l_imp, 0.03 * l_th, ('%.1f' % l_imp).replace('.', ',')))

ecarts = [(n, cc, i) for n, cc, i, t, _ in controles if abs(cc - i) > t]
absents = [(n, w) for n, _, _, _, w in controles if w not in src]
print('--- comparaison avec la fiche : %d valeurs contrôlées, %d écart(s), %d écriture(s) introuvable(s)' % (len(controles), len(ecarts), len(absents)))
for n, cc, i in ecarts: print('   ÉCART', n, ': recalculé %.5g, imprimé %.5g' % (cc, i))
for n, w in absents: print('   INTROUVABLE', n, ':', w)

# tableau « Ce qui est tombé » et phrases qui le résument
bloc = src[src.index('# Ce qui est tombé'):src.index('Ce qu\'il faut en retenir')]
lignes = [l for l in bloc.splitlines() if l.startswith('| ') and not l.startswith('| Session')]
notions = [l.split('|')[3].lower() for l in lignes]
si = [l for l in lignes if 'ingénieur' in l.lower()]
comptes = [('exercices', len(lignes), 13), ('sciences de l\'ingénieur', len(si), 0),
           ('effet Doppler', len([n for n in notions if 'doppler' in n]), 5),
           ('interférences', len([n for n in notions if 'interférences' in n]), 4),
           ('diffraction', len([n for n in notions if 'diffraction' in n]), 2),
           ('niveau sonore', len([n for n in notions if "niveau d'intensité sonore" in n]), 2),
           ('sessions 2026', len([l for l in lignes if '2026' in l.split('|')[1]]), 4)]
mauvais = [cc for cc in comptes if cc[1] != cc[2]]
print('--- tableau : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s)' % len(mauvais))
phrases = ['Au moins treize exercices des sessions 2025 et 2026', 'cinq exercices, dont quatre', 'suivent, quatre exercices',
           'Les deux exercices de diffraction', 'Le son est tombé deux fois en 2026', 'Cinq sujets en 2025', 'Quatre sujets en 2025',
           'Trois sujets en 2025', 'Demandée deux fois en 2025']
perdues = [p for p in phrases if p not in src]
for p in perdues: print('   PHRASE INTROUVABLE :', p)
print('--- phrases de synthèse : %d suivies, %d introuvable(s)' % (len(phrases), len(perdues)))
if ecarts or absents or mauvais or perdues:
    raise SystemExit(1)
print('--- tout est bon')
