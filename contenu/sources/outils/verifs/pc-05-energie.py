# Recalcul indépendant des résultats numériques de la fiche 5 (Énergie : gaz parfait et transferts thermiques).
# usage : python3 outils/verifs/pc-05-energie.py
from math import log, exp, sqrt, pi
R = 8.314
print('--- Q.14 : instant t1 (application)')
th0, thth, tau, b = 20.0, 100.0, 150.0, 60.0
print(' t1 =', -tau * log((b - thth) / (th0 - thth)), 's')

print('--- Q.22 : température d\'équilibre de la Terre')
sigma, phis, A = 5.67e-8, 1370.0, 0.30
T1 = (phis / (4 * sigma)) ** 0.25; T2 = ((1 - A) * phis / (4 * sigma)) ** 0.25; T0 = (phis / sigma) ** 0.25
print(' sans albédo : %.1f K = %.1f °C ; avec albédo 0,30 : %.1f K = %.1f °C ; formule fausse de l\'édition 2024 : %.0f K' % (T1, T1 - 273.15, T2, T2 - 273.15, T0))
print(' phi_s/4 = %.1f W/m2 ; absorbé = %.1f W/m2' % (phis / 4, (1 - A) * phis / 4))
print(' effet de serre naturel : de %.0f °C à environ 15 °C, soit environ %.0f °C de plus' % (T2 - 273.15, 15 - (T2 - 273.15)))

print('--- Q.22, remarque sur les gaz à effet de serre')
# composition de l'air sec en volume : diazote 78,084 %, dioxygène 20,946 %
N2_O2 = 78.084 + 20.946
print(' diazote + dioxygène = %.2f %% de l\'air sec' % N2_O2)
# dioxyde de carbone : 278 ppm (1750) à 285 ppm (1850) avant l'ère industrielle ; 415 à 430 ppm entre 2022 et 2026
hausses = [100 * (apres / avant - 1) for avant in (278, 285) for apres in (415, 430)]
print(' hausse de la concentration du CO2 : de %.0f %% à %.0f %% selon les années retenues' % (min(hausses), max(hausses)))

print('--- Exercice 1 : congélateur')
V, P1, th1, th2, M, S = 0.200, 1.013e5, 20.0, -18.0, 29.0e-3, 0.60
T1k, T2k = th1 + 273.15, th2 + 273.15
n = P1 * V / (R * T1k); m = n * M
P2 = P1 * T2k / T1k; dP = P1 - P2; F = dP * S
print(' T1 = %.2f K, T2 = %.2f K' % (T1k, T2k))
print(' n = %.3f mol ; m = %.1f g ; rho = %.3f kg/m3 (PM/RT = %.3f)' % (n, m * 1e3, m / V, P1 * M / (R * T1k)))
print(' P2 = %.4e Pa ; dP = %.4e Pa ; F = %.3e N ; masse équivalente = %.0f kg' % (P2, dP, F, F / 9.81))

print('--- Exercice 2 : capacité thermique massique d\'une huile')
U, I, mh = 12.0, 2.50, 0.2500
t = [0, 60, 120, 180, 240, 300]; th = [20.0, 23.5, 27.2, 30.7, 34.3, 37.9]
nn = len(t); tm = sum(t) / nn; thm = sum(th) / nn
a = sum((x - tm) * (y - thm) for x, y in zip(t, th)) / sum((x - tm) ** 2 for x in t)
b0 = thm - a * tm
print(' régression : a = %.5f °C/s ; ordonnée = %.2f °C ; pente entre extrêmes = %.5f' % (a, b0, (th[-1] - th[0]) / 300))
a_ret = 0.0597
c = U * I / (mh * a_ret)
uU, uI, um, ua = 0.1, 0.02, 0.1e-3, 0.0012
rel = sqrt((uU / U) ** 2 + (uI / I) ** 2 + (um / mh) ** 2 + (ua / a_ret) ** 2)
uc = c * rel
print(' P = %.1f W ; c = %.1f J/kg/K ; u(c)/c = %.4f ; u(c) = %.1f' % (U * I, c, rel, uc))
cref = 1.90e3
print(' z = %.2f (c et u(c) non arrondis)' % (abs(c - cref) / uc))
# la fiche calcule z avec c = 2,01 × 10³ et l'incertitude-type non arrondie, 46,6 (règle de la fiche 14 près de 2)
for ucr in (50, 47, 46.6):
    print('   avec u(c) = %s : z = %.2f' % (ucr, abs(round(c, -1) - cref) / ucr))
Ccal = 30.0
c2 = (U * I / a_ret - Ccal) / mh
print(' avec C_cal = 30 J/K : c = %.1f ; z = %.2f ; part d\'énergie pour le calorimètre = %.1f %%' % (c2, abs(c2 - cref) / uc, 100 * Ccal / (U * I / a_ret)))
print(' énergie en 300 s : %.0f J' % (U * I * 300))

print('--- Exercice 3 : bouilloire')
m, ce, Pel, eta = 1.00, 4180.0, 2200.0, 0.90
Q = m * ce * (100 - 18); E = Q / eta; dt = E / Pel
print(' Q = %.3e J ; E = %.3e J ; dt = %.0f s = %d min %02d s' % (Q, E, dt, dt // 60, round(dt % 60)))
S, tau = 7.5e-2, 3600.0
h = m * ce / (tau * S)
print(' h = %.2f W/m2/K ; hS = %.3f W/K' % (h, h * S))
thext, th0 = 20.0, 100.0
t1 = -tau * log((75 - thext) / (th0 - thext))
print(' t1 (75 °C) = %.0f s = %.1f min' % (t1, t1 / 60))
print(' theta(tau) = %.1f °C ; theta(1800 s) = %.1f °C ; flux initial = %.0f W' % (thext + (th0 - thext) * exp(-1), thext + (th0 - thext) * exp(-0.5), h * S * (th0 - thext)))
print(' 63 %% de la chute : %.1f °C' % (th0 - 0.63 * (th0 - thext)))

print('--- Exercice 4 : mur en paille')
Sm, dT = 60.0, 19.0 - (-2.0)
lam_p, e_p, lam_b, e_b, lam_e, e_e = 0.052, 0.36, 1.1, 0.20, 0.80, 0.040
Rp = e_p / (lam_p * Sm); Rb = e_b / (lam_b * Sm); Re = e_e / (lam_e * Sm)
print(' R_paille = %.4f K/W ; R_parpaing = %.5f K/W ; R_enduit = %.6f K/W' % (Rp, Rb, Re))
print(' flux parpaing = %.0f W ; flux paille = %.0f W ; rapport = %.0f' % (dT / Rb, dT / Rp, Rp / Rb))
print(' épaisseur de parpaing équivalente = %.2f m' % (Rp * lam_b * Sm))
Rt = Rp + 2 * Re
phi = dT / Rt
print(' R_total = %.4f K/W ; flux = %.1f W ; énergie sur 24 h = %.3e J = %.2f kWh' % (Rt, phi, phi * 86400, phi * 86400 / 3.6e6))
print(' parpaing sur 24 h : %.0f kWh' % (dT / Rb * 86400 / 3.6e6))

# ---------------------------------------------------------------- comparaison avec les valeurs imprimées dans la fiche
# (libellé, valeur recalculée, valeur imprimée, écart toléré = une demi-unité du dernier chiffre imprimé)
rho_air = 1.013e5 * 29.0e-3 / (R * 293.15)
t1_q14 = -150.0 * log((60.0 - 100.0) / (20.0 - 100.0))
T_sans, T_avec, T_faux = (phis / (4 * sigma)) ** 0.25, ((1 - A) * phis / (4 * sigma)) ** 0.25, (phis / sigma) ** 0.25
a_extremes = (th[-1] - th[0]) / 300
controles = [
    ('Q.3 masse volumique de l\'air (kg/m3)', rho_air, 1.21, 0.005),
    ('Q.14 exemple t1 (s)', t1_q14, 1.0e2, 5),
    ('Q.22 sans albédo (K)', T_sans, 279, 0.5), ('Q.22 sans albédo (°C)', T_sans - 273.15, 6, 0.5),
    ('Q.22 avec albédo (K)', T_avec, 255, 0.5), ('Q.22 avec albédo (°C)', T_avec - 273.15, -18, 0.5),
    ('Q.22 piège, facteur 4 oublié (K)', T_faux, 394, 0.5),
    ('Q.22 remarque, diazote et dioxygène dans l\'air sec (%)', N2_O2, 99, 0.5),
    ('Q.22 remarque, hausse du CO2, plus petite valeur (%)', min(hausses), 50, 5),
    ('Q.22 remarque, hausse du CO2, plus grande valeur (%)', max(hausses), 50, 5),
    ('Ex.1 n (mol)', n, 8.31, 0.005), ('Ex.1 m (g)', n * M * 1e3, 241, 0.5), ('Ex.1 P2 (Pa)', P2, 8.82e4, 50),
    ('Ex.1 F (N)', F, 7.9e3, 50), ('Ex.1 masse équivalente (kg)', F / 9.81, 8.0e2, 5),
    ('Ex.2 a (°C/s)', a_extremes, 5.97e-2, 5e-5), ('Ex.2 c (J/kg/K)', c, 2.01e3, 5), ('Ex.2 u(c) avant arrondi', uc, 46.6, 0.05),
    ('Ex.2 z, avec u(c) non arrondie (46,6)', abs(2.01e3 - cref) / 46.6, 2.4, 0.05), ('Ex.2 c corrigé (J/kg/K)', c2, 1.89e3, 5),
    ('Ex.2 z corrigé', abs(1.89e3 - cref) / 0.05e3, 0.2, 0.05),
    ('Ex.3 variation d\'énergie interne (J)', Q, 3.4e5, 5000), ('Ex.3 énergie électrique (J)', E, 3.8e5, 5000),
    ('Ex.3 durée de chauffage (s)', dt, 1.7e2, 5), ('Ex.3 theta(tau) (°C)', thext + (th0 - thext) * exp(-1), 49, 0.5),
    ('Ex.3 h (W/m2/K)', h, 15, 0.5), ('Ex.3 t1 (s)', t1, 1.3e3, 50), ('Ex.3 t1 (min)', t1 / 60, 22, 0.5),
    ('Ex.4 R parpaing (K/W)', Rb, 3.0e-3, 5e-5), ('Ex.4 flux parpaing (W)', dT / Rb, 6.9e3, 50),
    ('Ex.4 R paille (K/W)', Rp, 0.115, 5e-4), ('Ex.4 rapport des résistances', Rp / Rb, 38, 0.5),
    ('Ex.4 épaisseur équivalente (m)', Rp * lam_b * Sm, 7.6, 0.05), ('Ex.4 R enduit (K/W)', Re, 8.3e-4, 5e-6),
    ('Ex.4 R total (K/W)', Rt, 0.117, 5e-4), ('Ex.4 flux paille (W)', phi, 179, 0.5),
    ('Ex.4 énergie en 24 h (J)', phi * 86400, 1.55e7, 5e4), ('Ex.4 énergie en 24 h (kWh)', phi * 86400 / 3.6e6, 4.3, 0.05),
    ('Ex.4 parpaing en 24 h (kWh)', dT / Rb * 86400 / 3.6e6, 1.7e2, 5), ('Ex.4 température sans chauffage (°C)', -2 + Rt * 200, 21, 0.5),
]
ecarts = [(nom, calc, imp) for nom, calc, imp, tol in controles if abs(calc - imp) > tol]
print('--- comparaison avec la fiche : %d valeurs contrôlées, %d écart(s)' % (len(controles), len(ecarts)))
for nom, calc, imp in ecarts:
    print('   ÉCART %s : recalculé %.6g, imprimé %.6g' % (nom, calc, imp))
if ecarts:
    raise SystemExit(1)
