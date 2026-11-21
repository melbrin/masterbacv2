# Recalcul indépendant des résultats numériques de la fiche 1 (Mécanique : chute libre et mouvement d'un projectile).
# usage : python3 outils/verifs/pc-01-mecanique-chute-libre.py
# Le script recalcule chaque valeur imprimée, recompte le tableau des sujets 2025 et 2026
# et mesure dans les PDF la largeur des trois figures à l'échelle (16 cm attendus).
import os, re, sys
from math import sqrt, sin, cos, tan, atan, radians, degrees, hypot
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
g = 9.81

print('--- Q.4 à Q.7 : chute libre verticale sans vitesse initiale')
c_son = 340.0
t_son = c_son / g; d_son = c_son ** 2 / (2 * g)
print(' t_son = %.2f s ; d = %.1f m' % (t_son, d_son))
H5 = 39.0e3; h5 = H5 - d_son
print(' altitude au passage du mur du son : %.0f m' % h5)
H6, h6 = 30.0, 10.0
t_h = sqrt(2 * (H6 - h6) / g); t_sol = sqrt(2 * H6 / g); v_sol = sqrt(2 * g * H6)
print(' t_h = %.3f s ; t_sol = %.3f s ; v_sol = %.2f m/s = %.1f km/h' % (t_h, t_sol, v_sol, v_sol * 3.6))

print('--- Exercice 1 : le saut de la sauterelle')
m1, dt1, v01 = 2.0e-3, 25e-3, 3.0
a1 = v01 / dt1; F1 = m1 * (a1 + g); P1 = m1 * g
tS1 = v01 / g; hmax1 = v01 ** 2 / (2 * g); tvol1 = 2 * v01 / g
print(' a = %.1f m/s2 (%.1f g) ; F = %.4f N ; P = %.5f N ; F/P = %.1f' % (a1, a1 / g, F1, P1, F1 / P1))
print(' t_S = %.4f s ; h_max = %.4f m ; t_vol = %.4f s ; v_y(t_vol) = %.2f m/s' % (tS1, hmax1, tvol1, -g * tvol1 + v01))
# question 6 : la descente est une chute sans vitesse initiale depuis h_max (Q.6 avec H = h_max) ; elle dure autant que la montée
tdesc1 = sqrt(2 * hmax1 / g)
ident_desc = all(abs(sqrt(2 * (v ** 2 / (2 * g)) / g) - v / g) < 1e-12 for v in (0.5, 3.0, 7.0, 12.0, 340.0))
# la même descente, recalculée pas à pas sur l'équation horaire : premier instant après t_S où y repasse par 0
def y1(t): return -0.5 * g * t * t + v01 * t
pas, t_pas = 1e-6, tS1
while y1(t_pas) > 0: t_pas += pas
print(' descente depuis h_max : %.4f s ; t_vol - t_S = %.4f s ; pas à pas : %.4f s ; identité littérale vérifiée : %s'
      % (tdesc1, tvol1 - tS1, t_pas - tS1, ident_desc))

print('--- Q.13 et Q.14 : portée, exemple numérique (g = 10 m/s2)')
def racines(a, b, c):
    D = b * b - 4 * a * c
    return D, (-b + sqrt(D)) / (2 * a), (-b - sqrt(D)) / (2 * a)
H13, al13, v13, g13 = 1.0, radians(45), 10.0, 10.0
a13 = -0.5 * g13 / (v13 * cos(al13)) ** 2; b13 = tan(al13)
D13, x1_13, x2_13 = racines(a13, b13, H13)
print(' a = %.4f ; b = %.4f ; delta = %.4f ; x1 = %.4f m ; x2 = %.4f m' % (a13, b13, D13, x1_13, x2_13))
# la même saisie avec une calculatrice restée en radians (45 pris pour 45 rad) : erreur de l'édition 2024
a_rad = -0.5 * g13 / (v13 * cos(45.0)) ** 2; b_rad = tan(45.0)
_, x1_rad, x2_rad = racines(a_rad, b_rad, H13)
print(' en radians : x1 = %.3f m ; x2 = %.3f m' % (x1_rad, x2_rad))
xp14 = 15.0
v14 = sqrt(g13 / (2 * tan(al13) * xp14 + 2 * H13)) * xp14 / cos(al13)
# contrôle croisé : avec cette vitesse, la portée recalculée doit valoir 15 m
_, _, x_retour = racines(-0.5 * g13 / (v14 * cos(al13)) ** 2, tan(al13), H13)
print(' v0 pour 15 m = %.3f m/s ; portée recalculée avec cette vitesse = %.3f m' % (v14, x_retour))

print('--- Exercice 2 : tirer à la pétanque')
H2, v02, al2 = 1.10, 7.0, radians(40)
k2 = g / (2 * (v02 * cos(al2)) ** 2); b2 = tan(al2)
tS2 = v02 * sin(al2) / g; Hmax2 = (v02 * sin(al2)) ** 2 / (2 * g) + H2
D2, x1_2, xp2 = racines(-k2, b2, H2)                           # coefficients non arrondis
D2a, x1_2a, xp2a = racines(-0.171, 0.839, 1.10)                # coefficients arrondis, comme dans le corrigé
tp2 = xp2 / (v02 * cos(al2))
vx2 = v02 * cos(al2); vy2 = -g * tp2 + v02 * sin(al2); v2 = hypot(vx2, vy2)
v2_energie = sqrt(v02 ** 2 + 2 * g * H2)                        # contrôle croisé par la conservation de l'énergie
v0_65 = sqrt(g / (2 * tan(al2) * 6.5 + 2 * H2)) * 6.5 / cos(al2)
# précision des données : v0 = 7,0 m/s est connu à 0,05 m/s près ; effet sur la portée
def portee(v):
    return racines(-g / (2 * (v * cos(al2)) ** 2), tan(al2), H2)[2]
demi_ecart_xp = (portee(7.05) - portee(6.95)) / 2
print(' coefficients : %.4f et %.4f ; t_S = %.4f s ; H_max = %.4f m' % (k2, b2, tS2, Hmax2))
print(' arrondis : delta = %.4f ; x1 = %.3f m ; x2 = %.3f m ; non arrondis : x_p = %.4f m (écart au cochonnet : %.1f mm)'
      % (D2a, x1_2a, xp2a, xp2, (6.00 - xp2) * 1e3))
print(' t_p = %.4f s ; vx = %.3f ; vy = %.3f ; v = %.3f m/s (par l\'énergie : %.3f m/s)' % (tp2, vx2, vy2, v2, v2_energie))
print(' v0 pour 6,5 m = %.3f m/s' % v0_65)
print(' portée pour v0 = 6,95 puis 7,05 m/s : %.3f m puis %.3f m (demi-écart %.3f m)' % (portee(6.95), portee(7.05), demi_ecart_xp))

print('--- Q.15 et Q.16 : accélération sur un axe')
a15 = (70 / 3.6 - 30 / 3.6) / 5.4
x15 = 0.5 * 2.06 * 5.4 ** 2 + 30 / 3.6 * 5.4
print(' a = %.4f m/s2 ; x(5,4 s) = %.2f m (avec a non arrondie : %.2f m)' % (a15, x15, 0.5 * a15 * 5.4 ** 2 + 30 / 3.6 * 5.4))
a16 = (108 / 3.6 - 0) / (9.0 - 0)
print(' a (graphe) = %.3f m/s2' % a16)

print('--- Q.10, Q.11 et Q.17 : chronophotographie (v0 = 2,0 m/s ; alpha = 45 degrés ; tau = 20 ms ; échelle 1/2)')
tau, v0c, alc = 0.020, 2.0, radians(45)
def G(i):
    t = i * tau
    return v0c * cos(alc) * t, v0c * sin(alc) * t - 0.5 * g * t * t
def papier(i, j):                                                # distance sur le schéma, en cm
    (xa, ya), (xb, yb) = G(i), G(j)
    return hypot(xb - xa, yb - ya) * 100 / 2
d810, d1012 = papier(8, 10), papier(10, 12)
V9, V11 = d810 * 2 / 100 / (2 * tau), d1012 * 2 / 100 / (2 * tau)
def vit(i):
    (xa, ya), (xb, yb) = G(i - 1), G(i + 1)
    return (xb - xa) / (2 * tau), (yb - ya) / (2 * tau)
dV = hypot(vit(11)[0] - vit(9)[0], vit(11)[1] - vit(9)[1])
print(' G8G10 = %.2f cm ; G10G12 = %.2f cm sur le schéma' % (d810, d1012))
print(' V9 = %.3f m/s (%.2f cm) ; V11 = %.3f m/s (%.2f cm)' % (V9, V9 / 0.5, V11, V11 / 0.5))
print(' delta V exact = %.3f m/s, soit %.2f cm ; a10 exact = %.2f m/s2' % (dV, dV / 0.5, dV / (2 * tau)))
print(' avec les valeurs lues (2,9 cm ; 3,2 cm ; 0,8 cm) : V9 = %.2f ; V11 = %.2f ; delta V = %.2f ; a10 = %.1f'
      % (2.9 * 2 / 100 / (2 * tau), 3.2 * 2 / 100 / (2 * tau), 0.8 * 0.5, 0.8 * 0.5 / (2 * tau)))
tSc = v0c * sin(alc) / g
print(' sommet : t = %.4f s (entre G7 et G8) ; x = %.4f m ; y = %.4f m' % (tSc, v0c * cos(alc) * tSc, (v0c * sin(alc)) ** 2 / (2 * g)))
# L'essentiel, ligne « Mesures sur document » : sur une trajectoire courbe, Delta v est la norme du vecteur v11 - v9,
# pas la différence des normes v11 - v9 ; d'où l'écriture vectorielle a = Delta v / Delta t (avec des flèches)
dV_normes = hypot(*vit(11)) - hypot(*vit(9))
print(' norme du vecteur Delta v = %.3f m/s ; différence des normes v11 - v9 = %.3f m/s' % (dV, dV_normes))

print('--- L\'essentiel, ligne « Sommet » : norme de la vitesse au sommet, recalculée sur les équations horaires')
def vitesse_sommet(v0, alpha_deg, gg=g):
    al = radians(alpha_deg); ts = v0 * sin(al) / gg
    return hypot(v0 * cos(al), -gg * ts + v0 * sin(al))
sommets = [(v0s, als, vitesse_sommet(v0s, als)) for v0s, als in ((3.0, 90), (7.0, 40), (10.0, 45), (4.0, 60), (2.0, 45))]
for v0s, als, vs in sommets:
    print(' v0 = %.1f m/s ; alpha = %d degrés : vitesse au sommet = %.3f m/s (v0 cos(alpha) = %.3f m/s)' % (v0s, als, vs, v0s * cos(radians(als))))
sommet_nul_si_vertical = all((vs < 1e-9) == (als == 90) for _, als, vs in sommets)

print('--- Exercice 3 : la balle du jongleur')
tj = 0.050
X = [0.1 * i for i in range(11)]
Y = [0, 0.161, 0.297, 0.409, 0.497, 0.559, 0.598, 0.612, 0.601, 0.566, 0.506]
modele = [4.0 * sin(radians(60)) * i * tj - 0.5 * g * (i * tj) ** 2 for i in range(11)]
ecart_tableau = max(abs(round(a, 3) - b) for a, b in zip(modele, Y))
print(' tableau : écart maximal avec le modèle (v0 = 4,0 m/s ; 60 degrés) arrondi au mm = %.4f m' % ecart_tableau)
def vj(i): return (X[i + 1] - X[i - 1]) / (2 * tj), (Y[i + 1] - Y[i - 1]) / (2 * tj)
v3, v5 = vj(3), vj(5)
dvy = round(v5[1], 2) - round(v3[1], 2)
a4 = dvy / (2 * tj)
v1y = vj(1)[1]; v0y = round(v1y, 2) + g * tj
v0j = hypot(2.00, round(v0y, 2)); alj = degrees(atan(round(v0y, 2) / 2.00))
tSj = round(v0y, 2) / g; Hmaxj = round(v0y, 2) ** 2 / (2 * g)
print(' v3 = (%.2f ; %.2f), norme %.3f ; v5 = (%.2f ; %.2f), norme %.3f' % (v3[0], v3[1], hypot(*v3), v5[0], v5[1], hypot(*v5)))
print(' delta v_y = %.2f m/s ; a4y = %.1f m/s2 ; écart relatif avec g = %.2f %%' % (dvy, a4, abs(abs(round(a4, 1)) - g) / g * 100))
print(' v1y = %.2f ; v0y = %.4f ; v0 = %.3f m/s ; tan = %.3f ; alpha = %.1f degrés' % (v1y, v0y, v0j, round(v0y, 2) / 2.00, alj))
print(' t_S = %.4f s ; H_max = %.4f m ; plus grande ordonnée du tableau : G%d' % (tSj, Hmaxj, Y.index(max(Y))))

# ---------------------------------------------------------------- comparaison avec les valeurs imprimées dans la fiche
# (libellé, valeur recalculée, valeur imprimée, écart toléré = une demi-unité du dernier chiffre imprimé)
controles = [
    ('Q.4 t_son (s)', t_son, 34.7, 0.05), ('Q.4 distance (m)', d_son, 5.89e3, 5), ('Q.4 distance (km)', d_son / 1e3, 6, 0.5),
    ('Q.5 altitude (m)', h5, 3.31e4, 50), ('Q.5 altitude (km)', h5 / 1e3, 33, 0.5),
    ('Q.5 altitude, soustraction imprimée (m)', 39.0e3 - 5.89e3, 3.31e4, 50),
    ('Q.6 t_h (s)', t_h, 2.0, 0.05), ('Q.6 t_sol (s)', t_sol, 2.5, 0.05),
    ('Q.7 v_sol (m/s)', v_sol, 24, 0.5), ('Q.7 v_sol (km/h)', v_sol * 3.6, 87, 0.5),
    ('Ex.1 accélération (m/s2)', a1, 1.2e2, 5), ('Ex.1 accélération en multiples de g', a1 / g, 12, 0.5),
    ('Ex.1 force du sol (N)', F1, 0.26, 0.005), ('Ex.1 force avec a arrondie (N)', 2.0e-3 * (1.2e2 + 9.81), 0.26, 0.005),
    ('Ex.1 poids (N)', P1, 2.0e-2, 5e-4), ('Ex.1 force en multiples du poids', F1 / P1, 13, 0.5),
    ('Ex.1 t_S (s)', tS1, 0.31, 0.005), ('Ex.1 h_max (m)', hmax1, 0.46, 0.005), ('Ex.1 durée du vol (s)', tvol1, 0.61, 0.005),
    ('Ex.1 durée du vol / t_S', tvol1 / tS1, 2, 1e-9), ('Ex.1 vitesse à l\'atterrissage (m/s)', -g * tvol1 + v01, -3.0, 0.05),
    ('Ex.1 descente = t_vol - t_S = t_S', tvol1 - tS1, tS1, 1e-12), ('Ex.1 descente depuis h_max = t_S', tdesc1, tS1, 1e-12),
    ('Ex.1 descente pas à pas sur y(t) = t_S', t_pas - tS1, tS1, 2e-6), ('Ex.1 identité racine(2 h_max / g) = v0 / g', float(ident_desc), 1, 0),
    ('Ex.1 hauteur pour v0 = 2,8 m/s (m)', 2.8 ** 2 / (2 * g), 0.40, 0.005),
    ('Q.13 a (m-1)', a13, -0.10, 0.005), ('Q.13 b', b13, 1.0, 0.05), ('Q.13 delta', D13, 1.4, 0.05),
    ('Q.13 x1 (m)', x1_13, -0.92, 0.005), ('Q.13 x2 (m)', x2_13, 11, 0.5),
    ('Q.13 x1 avec les valeurs imprimées', (-1.0 + sqrt(1.4)) / (2 * -0.10), -0.92, 0.005),
    ('Q.13 x2 avec les valeurs imprimées', (-1.0 - sqrt(1.4)) / (2 * -0.10), 11, 0.5),
    ('Q.13 piège, calculatrice en radians (m)', x2_rad, 9.5, 0.05),
    ('Q.14 v0 (m/s)', v14, 12, 0.5), ('Q.14 portée retrouvée (m)', x_retour, 15, 1e-6),
    ('Ex.2 coefficient de x2', k2, 0.171, 5e-4), ('Ex.2 coefficient de x', b2, 0.839, 5e-4),
    ('Ex.2 t_S (s)', tS2, 0.46, 0.005), ('Ex.2 H_max (m)', Hmax2, 2.1, 0.05),
    ('Ex.2 delta', D2a, 1.46, 0.005), ('Ex.2 x1 (m)', x1_2a, -1.1, 0.05), ('Ex.2 x2 (m)', xp2a, 6.0, 0.05),
    ('Ex.2 x1 avec racine de 1,46', (-0.839 + sqrt(1.46)) / (2 * -0.171), -1.1, 0.05),
    ('Ex.2 x2 avec racine de 1,46', (-0.839 - sqrt(1.46)) / (2 * -0.171), 6.0, 0.05),
    ('Ex.2 x_p non arrondi (m)', xp2, 5.995, 5e-4), ('Ex.2 x_p, deux chiffres significatifs (m)', xp2, 6.0, 0.05),
    ('Ex.2 écart au cochonnet, inférieur à la précision des données (m)', 6.00 - xp2, 0.0, demi_ecart_xp),
    ('Ex.2 durée du vol (s)', tp2, 1.118, 5e-4), ('Ex.2 durée avec la valeur imprimée', 5.995 / (7.0 * cos(al2)), 1.118, 5e-4),
    ('Ex.2 durée du vol, deux chiffres significatifs (s)', tp2, 1.1, 0.05),
    ('Ex.2 v_x (m/s)', vx2, 5.36, 0.005), ('Ex.2 v_y (m/s)', vy2, -6.47, 0.005),
    ('Ex.2 v_y avec la valeur imprimée', -9.81 * 1.118 + 7.0 * sin(al2), -6.47, 0.005),
    ('Ex.2 vitesse à l\'impact (m/s)', v2, 8.4, 0.05), ('Ex.2 vitesse par l\'énergie (m/s)', v2_energie, 8.4, 0.05),
    ('Ex.2 vitesse avec les valeurs imprimées', sqrt(5.36 ** 2 + 6.47 ** 2), 8.4, 0.05),
    ('Ex.2 v0 pour 6,5 m (m/s)', v0_65, 7.3, 0.05), ('Ex.2 gain de vitesse (m/s)', v0_65 - 7.0, 0.3, 0.05),
    ('Q.15 accélération (m/s2)', a15, 2.1, 0.05), ('Q.15 accélération, trois chiffres', a15, 2.06, 0.005),
    ('Q.15 distance OA (m)', x15, 75, 0.5),
    ('Q.16 conversion (m/s)', 108 / 3.6, 30, 1e-9), ('Q.16 accélération (m/s2)', a16, 3.3, 0.05),
    ('Q.17 G8G10 sur le schéma (cm)', d810, 2.9, 0.05), ('Q.17 G10G12 sur le schéma (cm)', d1012, 3.2, 0.05),
    ('Q.17 G8G10 réel (cm)', 2.9 * 2, 5.8, 1e-9), ('Q.17 G10G12 réel (cm)', 3.2 * 2, 6.4, 1e-9),
    ('Q.17 V9 (cm/s)', 2.9 * 2 / (2 * tau), 145, 1e-6), ('Q.17 V9 exact (m/s)', V9, 1.45, 0.01),
    ('Q.17 V11 (cm/s)', 3.2 * 2 / (2 * tau), 1.6e2, 1e-6), ('Q.17 V11 exact (m/s)', V11, 1.6, 0.05),
    ('Q.17 longueur de V9 (cm)', 1.45 / 0.5, 2.9, 1e-9), ('Q.17 longueur de V11 (cm)', 1.6 / 0.5, 3.2, 1e-9),
    ('Q.17 delta V sur le schéma (cm)', dV / 0.5, 0.8, 0.05), ('Q.17 delta V (m/s)', 0.8 * 0.5, 0.40, 1e-9),
    ('Q.17 a10 (m/s2)', 0.40 / (2 * tau), 10, 1e-9), ('Q.17 a10 exact, proche de g (m/s2)', dV / (2 * tau), 9.81, 0.005),
    ('Q.17 longueur de a10 (cm)', 10 / 5, 2.0, 1e-9), ('Q.17 effet de 1 mm sur delta V (%)', 0.1 / 0.8 * 100, 12.5, 1e-9),
    ('Q.17 a10 pour 0,7 cm (m/s2)', 0.7 * 0.5 / (2 * tau), 9, 0.5), ('Q.17 a10 pour 0,9 cm (m/s2)', 0.9 * 0.5 / (2 * tau), 11, 0.5),
    ('Essentiel : la différence des normes ne donne pas Delta v (écart > 0,2 m/s)', float(dV - dV_normes > 0.2), 1, 0),
    ('Essentiel : vitesse au sommet nulle seulement pour un lancer vertical', float(sommet_nul_si_vertical), 1, 0),
    ('Essentiel : vitesse au sommet = v0 cos(alpha)', max(abs(vs - v0s * cos(radians(als))) for v0s, als, vs in sommets), 0, 1e-9),
    ('Ex.3 tableau conforme au modèle (m)', ecart_tableau, 0, 1e-9),
    ('Ex.3 v_x (m/s)', 0.100 / tj, 2.00, 1e-9),
    ('Ex.3 v3x', v3[0], 2.00, 0.005), ('Ex.3 v3y', v3[1], 2.00, 0.005), ('Ex.3 norme de v3', hypot(*v3), 2.83, 0.005),
    ('Ex.3 v5x', v5[0], 2.00, 0.005), ('Ex.3 v5y', v5[1], 1.01, 0.005), ('Ex.3 norme de v5', hypot(*v5), 2.24, 0.005),
    ('Ex.3 delta v_y (m/s)', dvy, -0.99, 0.005), ('Ex.3 a4y (m/s2)', a4, -9.9, 0.05),
    ('Ex.3 écart relatif avec g (%)', abs(9.9 - g) / g * 100, 0.9, 0.05),
    ('Ex.3 v1y (m/s)', v1y, 2.97, 0.005), ('Ex.3 v0y (m/s)', v0y, 3.46, 0.005),
    ('Ex.3 v0 (m/s)', v0j, 4.0, 0.05), ('Ex.3 tan(alpha)', 3.46 / 2.00, 1.73, 0.005), ('Ex.3 alpha (degrés)', alj, 60, 0.5),
    ('Ex.3 t_S (s)', tSj, 0.35, 0.005), ('Ex.3 date de G7 (s)', 7 * tj, 0.35, 1e-9), ('Ex.3 rang du sommet dans le tableau', Y.index(max(Y)), 7, 0),
    ('Ex.3 H_max (m)', Hmaxj, 0.61, 0.005), ('Ex.3 y7 du tableau (m)', Y[7], 0.612, 1e-9),
]
ecarts = [(nom, calc, imp) for nom, calc, imp, tol in controles if abs(calc - imp) > tol]
print('--- comparaison avec la fiche : %d valeurs contrôlées, %d écart(s)' % (len(controles), len(ecarts)))
for nom, calc, imp in ecarts:
    print('   ÉCART %s : recalculé %.6g, imprimé %.6g' % (nom, calc, imp))

# ---------------------------------------------------------------- le tableau « Ce qui est tombé » et les phrases qui le résument
src = open(os.path.join(RACINE, 'fiches', 'pc-01-mecanique-chute-libre', 'fiche.md'), encoding='utf-8').read()
bloc = src[src.index('# Ce qui est tombé'):src.index('Ce qu\'il faut en retenir')]
lignes = [l for l in bloc.splitlines() if l.startswith('| ') and not l.startswith('| Session')]
si = [l for l in lignes if 'sciences de l\'ingénieur' in l]
horaires = [l for l in lignes if 'équations horaires' in l.split('|')[3].lower() and 'saut vertical' not in l]
traj = [l for l in lignes if 'trajectoire' in l.split('|')[3].lower() and 'sommet de la trajectoire' not in l]
comptes = [('exercices du tableau', len(lignes), 10), ('dont sciences de l\'ingénieur', len(si), 0),
           ('équations horaires d\'un projectile', len(horaires), 8), ('équation de la trajectoire', len(traj), 5)]
mauvais = [c for c in comptes if c[1] != c[2]]
print('--- tableau des sujets 2025 et 2026 : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s)' % len(mauvais))

# ---------------------------------------------------------------- précision affichée et notations dans le texte de la fiche
attendus = ['x_p = x_2 = 11\\ \\text{m}', 'elle renvoie ici $9{,}5\\ \\text{m}$', '= 12\\ \\text{m·s}^{-1}$$',
            'x_p = 6{,}0\\ \\text{m}$. Le cochonnet', '= 1{,}60\\ \\text{m·s}^{-1}$$', '\\Delta v = 0{,}8 \\times 0{,}5 = 0{,}4\\ \\text{m·s}^{-1}$',
            '[\\ Objectif 14\\ ]{custom-style="Niv14"}\\ \\ Application · Notions : équation du second degré',
            # L'essentiel : ce qui est appris par cœur doit rester juste dans tous les cas traités par la fiche
            '| Deuxième loi de Newton | $\\sum \\vec{F}_{\\text{ext}} = m \\times \\vec{a}$ | Dans un référentiel galiléen. En chute libre, seul le poids agit : $\\vec{a} = \\vec{g}$, quelle que soit la masse. |',
            '| Vitesse horizontale ; elle n\'est nulle que pour un lancer vertical. |',
            '\\vec{a} \\approx \\dfrac{\\Delta \\vec{v}}{\\Delta t}$ | $\\tau$ : durée entre deux positions successives.',
            'Mouvement rectiligne : $a$ est la pente de $v(t)$.',
            # Q.17 : g = 9,81 m/s2, comme dans les données de Q.4, Q.6, Q.7 et des trois exercices
            'proche de $g = 9{,}81\\ \\text{m·s}^{-2}$',
            # Ex. 1, question 6 : la relation de la question de cours Q.6 est rappelée et nommée comme telle
            'avec la relation $t_{\\text{sol}} = \\sqrt{\\dfrac{2H}{g}}$ de la question de cours Q.6, en remplaçant $H$ par $h_{\\text{max}}$']
interdits = ['10{,}9\\ \\text{m}$', '11{,}9\\ \\text{m·s}', '9{,}52', '5{,}99\\ \\text{m}', '\\vec{V}', 'v_{\\text{son}}',
             'horizontale, pas nulle', 'a = \\dfrac{\\Delta v}{\\Delta t}$ |', 'Sa durée s\'obtient comme en Q.6',
             '| Chute libre | $\\vec{a} = \\vec{g}$ |', 'g = 9{,}8\\ ']
manques = [a for a in attendus if a not in src]
presents = [a for a in interdits if a in src]
print('--- précision et notations dans la fiche : %d motif(s) attendu(s) absent(s), %d motif(s) périmé(s) présent(s)' % (len(manques), len(presents)))
for a in manques: print('   ABSENT :', a)
for a in presents: print('   PÉRIMÉ :', a)

# ---------------------------------------------------------------- figures à l'échelle : largeur réelle dans les PDF fabriqués
defauts = 0
try:
    import pymupdf
    for nom, attendu in (('MasterBac_PC_Fiche1_Mecanique_Chute_libre.pdf', 3), ('MasterBac_PC_Fiche1_Cahier_enonces.pdf', 1)):
        chemin = os.path.join(RACINE, 'sorties', 'pc-01-mecanique-chute-libre', nom)
        if not os.path.exists(chemin):
            print('--- figures à l\'échelle : %s absent, contrôle sauté' % nom); continue
        larg = []
        for page in pymupdf.open(chemin):
            for im in page.get_images(full=True):
                if abs(im[2] / im[3] - 1889 / 732) < 0.01:                      # les trois chronophotographies à l'échelle
                    for r in page.get_image_rects(im[0]):
                        larg.append(r.width / 72 * 2.54)
        ok = len(larg) == attendu and all(abs(v - 16.0) < 0.03 for v in larg)
        defauts += 0 if ok else 1
        print('--- figures à l\'échelle dans %s : %s cm (attendu : %d figure(s) de 16,00 cm) %s'
              % (nom, ', '.join('%.2f' % v for v in larg), attendu, 'conforme' if ok else 'À REVOIR'))
except ImportError:
    print('--- figures à l\'échelle : pymupdf absent, contrôle sauté')
if ecarts or mauvais or defauts or manques or presents:
    raise SystemExit(1)
