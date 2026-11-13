# Recalcul indépendant des résultats numériques de la fiche 2 (Gravitation : satellites et lois de Kepler).
# usage : python3 outils/verifs/pc-03-gravitation.py
# Le script recalcule chaque valeur imprimée à partir des seules données des énoncés, vérifie que la valeur
# contrôlée figure bien telle quelle dans la fiche, puis recompte le tableau des sujets 2025 et 2026
# et les phrases qui le résument. Il s'arrête en erreur au moindre écart.
import os, re, sys
from math import pi, sqrt
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(RACINE, 'fiches', 'pc-03-gravitation', 'fiche.md'), encoding='utf-8').read()

G, MT, RT = 6.67e-11, 5.972e24, 6.378e6          # données communes à toute la fiche
JOUR, SIDERAL = 86400.0, 86164.0
def cbrt(x): return x ** (1.0 / 3.0)

print('--- Q.2 à Q.4 : satellite de la Terre à 400 km')
g0 = G * MT / RT ** 2
R400 = RT + 400e3
g400 = G * MT / R400 ** 2
v400 = sqrt(G * MT / R400)
T400 = 2 * pi * sqrt(R400 ** 3 / (G * MT))
print(' g(sol) = %.4f ; g(400 km) = %.4f m/s2 (%.1f %%) ; v = %.1f m/s = %.0f km/h ; T = %.1f s = %.2f min ; N = %.3f'
      % (g0, g400, 100 * g400 / g0, v400, v400 * 3.6, T400, T400 / 60, JOUR / T400))

print('--- Exercice 1 : le télescope spatial Hubble')
mH, RH = 11e3, RT + 540e3
FH = G * MT * mH / RH ** 2
vH = sqrt(G * MT / RH)
TH = 2 * pi * RH / vH
gH = G * MT / RH ** 2
print(' R = %.4e m ; F = %.4e N ; v = %.1f m/s ; T = %.1f s = %.2f min ; N = %.3f ; g = %.4f m/s2 (%.1f %%)'
      % (RH, FH, vH, TH, TH / 60, JOUR / TH, gH, 100 * gH / g0))

print('--- Q.7 et Q.8 : masse du Soleil, rayon de l\'orbite de la Lune')
T_terre = 365.25 * JOUR; R_terre = 1.496e11
M_soleil = 4 * pi ** 2 * R_terre ** 3 / (G * T_terre ** 2)
T_lune = 27.3 * JOUR
R_lune = cbrt(T_lune ** 2 * G * MT / (4 * pi ** 2))
print(' T_Terre = %.4e s ; M_Soleil = %.4e kg ; T_Lune = %.4e s ; R_Lune = %.4e m' % (T_terre, M_soleil, T_lune, R_lune))

print('--- Exercice 2 : les planètes de TRAPPIST-1')
Tj = {'b': 1.51, 'c': 2.42, 'd': 4.05, 'e': 6.10, 'f': 9.21, 'g': 12.35}        # périodes en jour (h à trouver)
Rm = {'b': 1.73e9, 'c': 2.36e9, 'd': 3.33e9, 'e': 4.38e9, 'g': 7.01e9, 'h': 9.27e9}   # rayons en mètre (f à trouver)
Te = Tj['e'] * JOUR
ME = 4 * pi ** 2 * Rm['e'] ** 3 / (G * Te ** 2)
qb = (Tj['b'] * JOUR) ** 2 / Rm['b'] ** 3
qd = (Tj['d'] * JOUR) ** 2 / Rm['d'] ** 3
Rf = Rm['e'] * cbrt((Tj['f'] / Tj['e']) ** 2)
Th = Tj['e'] * sqrt((Rm['h'] / Rm['e']) ** 3)
ve = 2 * pi * Rm['e'] / Te
print(' T_e = %.4e s ; M_E = %.4e kg (%.4f M_Soleil, soit %.1f fois moins) ; T2/R3 : b %.3e, d %.3e ; R_f = %.4e m ; T_h = %.3f j'
      % (Te, ME, ME / 1.99e30, 1.99e30 / ME, qb, qd, Rf, Th))
print(' v_e = %.1f m/s, soit %.3f fois la vitesse de la Terre ; orbite %.1f fois plus petite' % (ve, ve / 29.8e3, R_terre / Rm['e']))
# cohérence du tableau de l'énoncé : le quotient T2/R3 doit être le même pour toutes les planètes renseignées
quot = {p: (Tj[p] * JOUR) ** 2 / Rm[p] ** 3 for p in Tj if p in Rm}
ecart_tab = max(quot.values()) / min(quot.values()) - 1
print(' tableau de l\'énoncé : T2/R3 varie de %.1f %% entre les planètes renseignées' % (100 * ecart_tab))

print('--- Q.11 et Q.12 : satellite géostationnaire')
Rgeo = cbrt(G * MT * SIDERAL ** 2 / (4 * pi ** 2))
hgeo = Rgeo - RT
vgeo = sqrt(G * MT / Rgeo)
R24 = cbrt(G * MT * JOUR ** 2 / (4 * pi ** 2))
print(' R = %.5e m ; h = %.4e m ; v = %.1f m/s (par le périmètre : %.1f m/s) ; avec 24 h : %.1f km de plus'
      % (Rgeo, hgeo, vgeo, 2 * pi * Rgeo / SIDERAL, (R24 - Rgeo) / 1e3))

print('--- Exercice 3 : Internet par satellite')
k_exact = 4 * pi ** 2 / (G * MT)
k = 7.9e9 / 8.0e22                       # lecture du point P sur le graphique
MT3 = 4 * pi ** 2 / (G * 9.9e-14)
T2geo = SIDERAL ** 2
R3geo = 7.42e9 / 9.9e-14
R3 = cbrt(7.5e22); h3 = 4.2e7 - 0.64e7
dt = 2 * 3.6e7 / 3.00e8
RB = RT + 550e3
TB2 = 9.9e-14 * RB ** 3; TB = sqrt(3.3e7)
dtB = 2 * 550e3 / 3.00e8
print(' k (lecture) = %.3e ; k exact = %.4e ; ordonnée exacte de P = %.3e s2 ; M_T = %.3e kg' % (k, k_exact, k_exact * 8.0e22, MT3))
print(' T2 = %.4e s2 ; R3 = %.3e m3 ; R = %.3e m ; h = %.2e m ; aller-retour = %.3f s' % (T2geo, R3geo, R3, h3, dt))
print(' orbite basse : R_B = %.4e m ; T_B2 = %.3e s2 ; T_B = %.1f s (%.1f min ; valeur exacte %.1f s) ; aller-retour = %.3e s ; rapport = %.1f'
      % (RB, TB2, TB, TB / 60, 2 * pi * sqrt(RB ** 3 / (G * MT)), dtB, 0.24 / 3.7e-3))

# ---------------------------------------------------------------- comparaison avec les valeurs imprimées
# (libellé, valeur recalculée, valeur imprimée, tolérance, écriture attendue dans la fiche)
controles = [
    ('Q.2 g au sol (m/s2)', g0, 9.79, 0.005, r'= 9{,}79\ \text{m·s}^{-2}'),
    ('Q.2 distance au centre à 400 km (m)', R400, 6.778e6, 1, r'R_T + h = 6{,}778 \times 10^{6}\ \text{m}'),
    ('Q.2 g à 400 km (m/s2)', g400, 8.67, 0.005, r'= 8{,}67\ \text{m·s}^{-2}'),
    ('Q.2 part de la pesanteur au sol (%)', 100 * g400 / g0, 89, 0.5, 'vaut encore 89 % de sa valeur au sol'),
    ('Q.3 vitesse (m/s)', v400, 7.67e3, 5, r'= 7{,}67 \times 10^{3}\ \text{m·s}^{-1}'),
    ('Q.3 vitesse (km/h)', v400 * 3.6, 27600, 50, r'27\ 600\ \text{km·h}^{-1}'),
    ('Q.4 période (s)', T400, 5.56e3, 5, r'= 5{,}56 \times 10^{3}\ \text{s}'),
    ('Q.4 période (min)', T400 / 60, 92.6, 0.05, 'soit 92,6 min'),
    ('Q.4 tours par jour, avec la période non arrondie imprimée', JOUR / 5555, 15.6, 0.05, r'= 15{,}6\ \text{tours}'),
    ('Q.4 tours par jour, sans arrondi intermédiaire', JOUR / T400, 15.6, 0.06, r'= 15{,}6\ \text{tours}'),
    ('Ex.1 rayon de l\'orbite (m)', RH, 6.918e6, 1, r'= 6{,}918 \times 10^{6}\ \text{m}'),
    ('Ex.1 force (N)', FH, 9.2e4, 500, r'= 9{,}2 \times 10^{4}\ \text{N}'),
    ('Ex.1 vitesse (m/s)', vH, 7.59e3, 5, r'= 7{,}59 \times 10^{3}\ \text{m·s}^{-1}'),
    ('Ex.1 période (s)', TH, 5.73e3, 5, r'= 5{,}73 \times 10^{3}\ \text{s}'),
    ('Ex.1 période avec la vitesse imprimée (s)', 2 * pi * 6.918e6 / 7.59e3, 5.73e3, 5, r'= 5{,}73 \times 10^{3}\ \text{s}'),
    ('Ex.1 période (min)', TH / 60, 95.5, 0.05, 'en 95,5 min'),
    ('Ex.1 tours par jour', JOUR / TH, 15.1, 0.05, r'= 15{,}1$$'),
    ('Ex.1 tours par jour, avec la période imprimée', JOUR / 5.73e3, 15.1, 0.05, r'= 15{,}1$$'),
    ('Ex.1 pesanteur à 540 km (m/s2)', gH, 8.32, 0.005, r'= 8{,}32\ \text{m·s}^{-2}'),
    ('Ex.1 part de la pesanteur au sol (%)', 100 * gH / g0, 85, 0.5, 'vaut encore 85 % de sa valeur au sol'),
    ('Q.7 période de la Terre (s)', T_terre, 3.156e7, 5e3, r'365{,}25 \times 86\ 400 = 3{,}156 \times 10^{7}\ \text{s}'),
    ('Q.7 masse du Soleil (kg)', M_soleil, 1.99e30, 5e27, r'= 1{,}99 \times 10^{30}\ \text{kg}'),
    ('Q.7 masse du Soleil, avec la période imprimée (kg)', 4 * pi ** 2 * R_terre ** 3 / (G * 3.156e7 ** 2), 1.99e30, 5e27, r'= 1{,}99 \times 10^{30}\ \text{kg}'),
    ('Q.8 période de la Lune (s)', T_lune, 2.36e6, 5e3, r'27{,}3 \times 86\ 400 = 2{,}36 \times 10^{6}\ \text{s}'),
    ('Q.8 rayon de l\'orbite de la Lune (m)', R_lune, 3.83e8, 5e5, r'= 3{,}83 \times 10^{8}\ \text{m}'),
    ('Q.8 rayon, avec la période imprimée (m)', cbrt(2.36e6 ** 2 * G * MT / (4 * pi ** 2)), 3.83e8, 5e5, r'= 3{,}83 \times 10^{8}\ \text{m}'),
    ('Q.8 rayon (km)', R_lune / 1e3, 383000, 500, 'soit environ 383 000 km'),
    ('Ex.2 période de e (s)', Te, 5.27e5, 500, r'6{,}10 \times 86\ 400 = 5{,}27 \times 10^{5}\ \text{s}'),
    ('Ex.2 masse de l\'étoile (kg)', ME, 1.79e29, 5e26, r'= 1{,}79 \times 10^{29}\ \text{kg}'),
    ('Ex.2 masse, avec la période imprimée (kg)', 4 * pi ** 2 * 4.38e9 ** 3 / (G * 5.27e5 ** 2), 1.79e29, 5e26, r'= 1{,}79 \times 10^{29}\ \text{kg}'),
    ('Ex.2 rapport des masses', 1.79e29 / 1.99e30, 0.090, 0.0005, r'= 0{,}090$$'),
    ('Ex.2 rapport des masses (%)', 100 * ME / 1.99e30, 9, 0.5, 'égale à 9 % de celle du Soleil'),
    ('Ex.2 « fois moins massive »', 1.99e30 / ME, 11, 0.5, 'environ 11 fois moins massive'),
    ('Ex.2 période de b (s)', Tj['b'] * JOUR, 1.30e5, 500, r'1{,}51 \times 86\ 400 = 1{,}30 \times 10^{5}\ \text{s}'),
    ('Ex.2 quotient pour b (s2/m3)', 1.30e5 ** 2 / 1.73e9 ** 3, 3.26e-18, 5e-21, r'(1{,}73 \times 10^{9})^{3}} = 3{,}26 \times 10^{-18}'),
    ('Ex.2 quotient pour b, sans arrondi (s2/m3)', qb, 3.26e-18, 5e-20, r'(1{,}73 \times 10^{9})^{3}} = 3{,}26 \times 10^{-18}'),
    ('Ex.2 période de d (s)', Tj['d'] * JOUR, 3.50e5, 500, r'4{,}05 \times 86\ 400 = 3{,}50 \times 10^{5}\ \text{s}'),
    ('Ex.2 quotient pour d (s2/m3)', 3.50e5 ** 2 / 3.33e9 ** 3, 3.32e-18, 5e-21, r'(3{,}33 \times 10^{9})^{3}} = 3{,}32 \times 10^{-18}'),
    ('Ex.2 quotient pour d, sans arrondi (s2/m3)', qd, 3.32e-18, 5e-20, r'(3{,}33 \times 10^{9})^{3}} = 3{,}32 \times 10^{-18}'),
    ('Ex.2 écart relatif des deux quotients (%) : « moins de 2 % »', 100 * (3.317 / 3.264 - 1), 1.0, 1.0, 'égaux à moins de 2 % près'),
    ('Q.6 constante 4pi2/(G M) pour le Soleil (s2/m3)', 4 * pi ** 2 / (G * 1.99e30), 2.97e-19, 5e-22, r'2{,}97 \times 10^{-19}\ \text{s}^{2}\text{·m}^{-3}'),
    ('Q.2 g au sol avec le rayon moyen 6 371 km (m/s2)', G * MT / 6.371e6 ** 2, 9.81, 0.005, r'$9{,}81\ \text{m·s}^{-2}$ : $6\ 378'),
    ('Ex.3 k avec la lecture 8,0 (s2/m3)', 8.0e9 / 8.0e22, 1.0e-13, 1e-15, r'k = 1{,}0 \times 10^{-13}'),
    ('Ex.3 M_T avec la lecture 8,0 (kg)', 4 * pi ** 2 / (G * 1.0e-13), 5.9e24, 5e22, r'M_T = 5{,}9 \times 10^{24}\ \text{kg}'),
    ('Ex.2 rayon de l\'orbite de f (m)', Rf, 5.76e9, 5e6, r'= 5{,}76 \times 10^{9}\ \text{m}'),
    ('Ex.2 période de h (jour)', Th, 18.8, 0.05, r'= 18{,}8\ \text{jours}'),
    ('Ex.2 vitesse de e (m/s)', ve, 5.22e4, 50, r'= 5{,}22 \times 10^{4}\ \text{m·s}^{-1}'),
    ('Ex.2 vitesse de e, avec la période imprimée (m/s)', 2 * pi * 4.38e9 / 5.27e5, 5.22e4, 50, r'= 5{,}22 \times 10^{4}\ \text{m·s}^{-1}'),
    ('Ex.2 vitesse de e (km/s)', ve / 1e3, 52.2, 0.05, r'52{,}2\ \text{km·s}^{-1}'),
    ('Ex.2 rapport des vitesses', 52.2 / 29.8, 1.75, 0.005, 'va 1,75 fois plus vite que la Terre'),
    ('Ex.2 rapport des rayons d\'orbite', R_terre / Rm['e'], 34, 0.5, '34 fois plus petit'),
    ('Q.11 rayon de l\'orbite géostationnaire (m)', Rgeo, 4.215e7, 5e3, r'= 4{,}215 \times 10^{7}\ \text{m}$$'),
    ('Q.11 altitude (m)', hgeo, 3.58e7, 5e4, r'= 3{,}58 \times 10^{7}\ \text{m}'),
    ('Q.11 altitude, soustraction imprimée (m)', 4.215e7 - 0.638e7, 3.58e7, 5e4, r'4{,}215 \times 10^{7} - 0{,}638 \times 10^{7} = 3{,}58 \times 10^{7}'),
    ('Q.11 altitude (km)', hgeo / 1e3, 3.58e4, 50, r'3{,}58 \times 10^{4}\ \text{km}'),
    ('Q.11 « près de 36 000 km »', hgeo / 1e3, 36000, 500, 'soit près de 36 000 km'),
    ('Q.11 surplus d\'altitude avec 24 h (km)', (R24 - Rgeo) / 1e3, 80, 5, "supérieure d'environ 80 km"),
    ('Q.12 vitesse (m/s)', vgeo, 3.07e3, 5, r'= 3{,}07 \times 10^{3}\ \text{m·s}^{-1}'),
    ('Q.12 vitesse, avec le rayon imprimé (m/s)', sqrt(G * MT / 4.215e7), 3.07e3, 5, r'= 3{,}07 \times 10^{3}\ \text{m·s}^{-1}'),
    ('Q.12 vitesse par le périmètre (m/s)', 2 * pi * 4.215e7 / SIDERAL, 3.07e3, 5, r'{86\ 164} = 3{,}07 \times 10^{3}\ \text{m·s}^{-1}'),
    ('Ex.3 ordonnée du point P (s2)', k_exact * 8.0e22, 7.9e9, 5e7, r"d'ordonnée $7{,}9 \times 10^{9}\ \text{s}^{2}$"),
    ('Ex.3 coefficient directeur (s2/m3)', k, 9.9e-14, 5e-16, r'= 9{,}9 \times 10^{-14}\ \text{s}^{2}\text{·m}^{-3}'),
    ('Ex.3 coefficient directeur exact (s2/m3)', k_exact, 9.9e-14, 5e-16, r'= 9{,}9 \times 10^{-14}\ \text{s}^{2}\text{·m}^{-3}'),
    ('Ex.3 masse de la Terre (kg)', MT3, 6.0e24, 5e22, r'= 6{,}0 \times 10^{24}\ \text{kg}'),
    ('Ex.3 masse connue de la Terre (kg)', MT, 5.97e24, 5e21, r'$5{,}97 \times 10^{24}\ \text{kg}$'),
    ('Ex.3 carré de la période (s2)', T2geo, 7.42e9, 5e6, r'(86\ 164)^{2} = 7{,}42 \times 10^{9}\ \text{s}^{2}'),
    ('Ex.3 cube du rayon (m3)', R3geo, 7.5e22, 5e20, r'= 7{,}5 \times 10^{22}\ \text{m}^{3}'),
    ('Ex.3 cube du rayon, valeur exacte (m3)', Rgeo ** 3, 7.5e22, 5e20, r'= 7{,}5 \times 10^{22}\ \text{m}^{3}'),
    ('Ex.3 ordonnée lue pour le satellite géostationnaire (s2)', T2geo, 7.4e9, 5e7, r"d'ordonnée $7{,}4 \times 10^{9}\ \text{s}^{2}$"),
    ('Ex.3 rayon de l\'orbite (m)', R3, 4.2e7, 5e5, r'= 4{,}2 \times 10^{7}\ \text{m}$$'),
    ('Ex.3 rayon de l\'orbite, valeur exacte (m)', Rgeo, 4.2e7, 5e5, r'= 4{,}2 \times 10^{7}\ \text{m}$$'),
    ('Ex.3 altitude (m)', h3, 3.6e7, 5e5, r'4{,}2 \times 10^{7} - 0{,}64 \times 10^{7} = 3{,}6 \times 10^{7}\ \text{m}'),
    ('Ex.3 altitude, valeur exacte (m)', hgeo, 3.6e7, 5e5, r'4{,}2 \times 10^{7} - 0{,}64 \times 10^{7} = 3{,}6 \times 10^{7}\ \text{m}'),
    ('Ex.3 altitude (km)', hgeo / 1e3, 36000, 500, 'soit environ 36 000 km'),
    ('Ex.3 aller-retour (s)', dt, 0.24, 0.005, r'= 0{,}24\ \text{s}'),
    ('Ex.3 aller-retour, valeur exacte (s)', 2 * hgeo / 3.00e8, 0.24, 0.005, r'= 0{,}24\ \text{s}'),
    ('Ex.3 rayon de l\'orbite basse (m)', RB, 6.928e6, 1, r'= 6{,}928 \times 10^{6}\ \text{m}'),
    ('Ex.3 carré de la période en orbite basse (s2)', TB2, 3.3e7, 5e5, r'= 3{,}3 \times 10^{7}\ \text{s}^{2}'),
    ('Ex.3 période en orbite basse (s)', TB, 5.7e3, 50, r'= 5{,}7 \times 10^{3}\ \text{s}'),
    ('Ex.3 période en orbite basse, valeur exacte (s)', 2 * pi * sqrt(RB ** 3 / (G * MT)), 5.7e3, 50, r'= 5{,}7 \times 10^{3}\ \text{s}'),
    ('Ex.3 période en orbite basse (min) : « un peu plus de 95 »', 2 * pi * sqrt(RB ** 3 / (G * MT)) / 60, 95.5, 0.5, 'soit un peu plus de 95 min'),
    ('Ex.3 aller-retour en orbite basse (s)', dtB, 3.7e-3, 5e-5, r'= 3{,}7 \times 10^{-3}\ \text{s}'),
    ('Ex.3 rapport des durées', 0.24 / 3.7e-3, 65, 0.5, r'= 65$$'),
    ('Ex.3 rapport des durées, valeurs exactes', hgeo / 550e3, 65, 0.5, 'environ 65 fois moins de temps'),
]
ecarts = [(nom, calc, imp) for nom, calc, imp, tol, _ in controles if abs(calc - imp) > tol]
absents = sorted({(nom, ecrit) for nom, _, _, _, ecrit in controles if ecrit not in src})
print('--- comparaison avec la fiche : %d valeurs contrôlées, %d écart(s), %d écriture(s) introuvable(s) dans la fiche'
      % (len(controles), len(ecarts), len(absents)))
for nom, calc, imp in ecarts: print('   ÉCART', nom, ': recalculé %.5g, imprimé %.5g' % (calc, imp))
for nom, ecrit in absents: print('   INTROUVABLE', nom, ':', ecrit)

# ---------------------------------------------------------------- données des énoncés : mêmes valeurs partout
donnees = [(r'M_T = 5{,}972 \times 10^{24}\ \text{kg}', 3), (r'R_T = 6\ 378\ \text{km}', 4),
           (r'G = 6{,}67 \times 10^{-11}\ \text{N·m}^{2}\text{·kg}^{-2}', 6), (r'86\ 164\ \text{s}', 5)]
manques = [(d, n, src.count(d)) for d, n in donnees if src.count(d) < n]
print('--- données des énoncés : %d écriture(s) suivie(s), %d en défaut' % (len(donnees), len(manques)))
for d, n, v in manques: print('   DONNÉE', d, ': attendue au moins %d fois, trouvée %d fois' % (n, v))

# ---------------------------------------------------------------- graphique de l'exercice 3 : les points portés sont bien sur la droite
fig = open(os.path.join(RACINE, 'outils', 'figures', 'pc-03-gravitation.py'), encoding='utf-8').read()
m = re.search(r'Rs=np\.array\(\[([^\]]+)\]\)', fig)
rayons = [float(x) for x in m.group(1).split(',')]
pts = [(r ** 3 / 1e22, k_exact * r ** 3 / 1e9) for r in rayons]
hors = [p for p in pts if not (0 < p[0] < 10 and 0 < p[1] < 10)]
print('--- graphique de l\'exercice 3 : %d satellites, abscisses %s (10^22 m3), %d point(s) hors du cadre'
      % (len(pts), ' ; '.join('%.2f' % p[0] for p in pts), len(hors)))

# ---------------------------------------------------------------- le tableau « Ce qui est tombé » et les phrases qui le résument
bloc = src[src.index('# Ce qui est tombé'):src.index('Ce qu\'il faut en retenir')]
lignes = [l for l in bloc.splitlines() if l.startswith('| ') and not l.startswith('| Session')]
notions = [l.split('|')[3].lower() for l in lignes]
si = [l for l in lignes if 'sciences de l\'ingénieur' in l]
demo = [n for n in notions if 'frenet' in n or 'deuxième loi de newton' in n or 'mouvement circulaire uniforme' in n]
periode = [n for n in notions if 'période' in n]
kepler3 = [n for n in notions if 'troisième loi de kepler' in n]
geo = [l for l in lignes if 'géostationnaire' in l.lower()]
comptes = [('exercices du tableau', len(lignes), 9, '=='), ('dont sciences de l\'ingénieur', len(si), 0, '=='),
           ('démonstration de Q.1 et Q.3', len(demo), 9, '=='), ('période de révolution', len(periode), 7, '>='),
           ('troisième loi de Kepler', len(kepler3), 4, '>='), ('satellite géostationnaire', len(geo), 1, '==')]
mauvais = [c for c in comptes if not (c[1] == c[2] if c[3] == '==' else c[1] >= c[2])]
print('--- tableau des sujets 2025 et 2026 : ' + ' ; '.join('%s : %d (annoncé %s %d)' % (n, v, 'au moins' if o == '>=' else ':', a)
                                                          for n, v, a, o in comptes) + ' ; %d écart(s)' % len(mauvais))
phrases = ['au moins neuf exercices des sessions 2025 et 2026.', 'attendue dans les neuf exercices',
           'au moins sept exercices', 'au moins quatre exercices', 'tombé en 2026 (Asie)', 'Les neuf exercices relevés en 2025 et 2026',
           'Au moins sept sujets en 2025 et 2026', 'Au moins quatre sujets en 2025 et 2026']
perdues = [p for p in phrases if p not in src]
for p in perdues: print('   PHRASE INTROUVABLE :', p)
# les sessions citées en tête des exercices et dans les lignes d'information figurent bien au tableau
cites = [('Observer l\'ISS', 'Métropole, septembre 2026, jour 2'), ('Le satellite TESS', 'Métropole, juin 2026, jour 2'),
         ('Satellites de communication', 'Asie 2026, jour 1')]
orphelins = [c for c in cites if not any(c[0] in l and c[1] in l for l in lignes)]
for c in orphelins: print('   SUJET CITÉ ABSENT DU TABLEAU :', c)
print('--- phrases de synthèse : %d suivies, %d introuvable(s) ; sujets cités : %d suivis, %d absent(s) du tableau'
      % (len(phrases), len(perdues), len(cites), len(orphelins)))

if ecarts or absents or manques or hors or mauvais or perdues or orphelins or ecart_tab > 0.03:
    raise SystemExit(1)
print('--- tout est bon')
