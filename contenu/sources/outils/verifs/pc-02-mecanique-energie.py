# Recalcul indépendant des résultats numériques de la fiche 2 (Mécanique : énergie et champ électrique uniforme).
# usage : python3 outils/verifs/pc-02-mecanique-energie.py
# Chaque valeur imprimée est recalculée à partir des seules données des énoncés, puis on vérifie que son écriture
# figure telle quelle dans la fiche. Les données des graphiques sont reprises du script des figures.
import os, re
from math import pi, sqrt, sin, cos, atan, radians, degrees
RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(RACINE, 'fiches', 'pc-02-mecanique-energie', 'fiche.md'), encoding='utf-8').read()
g = 9.81

# Q.1 à Q.5
W1 = 0.020 * g * 1.2
m3, v03, a3 = 0.60, 10.0, radians(60)
Ec0 = 0.5 * m3 * v03 ** 2; vy = v03 * sin(a3); Epmax3 = m3 * g * vy ** 2 / (2 * g)
m4, h04, vy04 = 70, 5.0, 3.0
Ep04 = m4 * g * h04; Epmax4 = m4 * g * (h04 + vy04 ** 2 / (2 * g))
m5, v05 = 0.40, 50.0; Em5 = 0.5 * m5 * v05 ** 2
# Exercice 1
hs = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30]; vs = [0.99, 1.40, 1.71, 1.98, 2.21, 2.43]
v2 = [v * v for v in vs]
k1 = sum(h * w for h, w in zip(hs, v2)) / sum(h * h for h in hs)      # droite par l'origine, moindres carrés
# Q.6, Q.8
T6 = 20 * 5.0e-2
F8 = 58e-3 * 50 / 5.0e-3; P8 = 58e-3 * g
# Exercice 2 (g = 9,81 dans l'énoncé, comme dans le reste de la fiche : contrôle de cohérence du 21 novembre 2026)
gb, mb, Db, al, hC = 9.81, 10e-3, 0.50, radians(30), 0.40
hA = Db * sin(al); EpA = mb * gb * hA; vB = sqrt(2 * gb * Db * sin(al))
tsol = sqrt(2 * hC / gb); Xf = 2.2 * tsol; Xf_exact = vB * tsol
vC_vise = 0.575 / tsol; D_vise = 2.0 ** 2 / (2 * gb * sin(al)); D_vise_exact = vC_vise ** 2 / (2 * gb * sin(al))
vsol = sqrt(2 * gb * (hA + hC))
# Thème 3 : goutte d'encre
mq, q, v0, U, d, L, D = 3.4e-11, 2.0e-13, 20.0, 1.5e3, 2.0e-3, 1.0e-2, 2.0e-2
E = U / d; rapport = q * E / (mq * g); az = q * E / mq
tS = L / v0; zS = 0.5 * az * tS ** 2; tana = az * L / v0 ** 2; HI = q * E * L / (mq * v0 ** 2) * (L / 2 + D)
# Q.12 goutte d'huile, Q.17 proton
r, rho, d12, U12, e = 1.0e-6, 9.0e2, 1.0e-2, 460, 1.60e-19
q12 = 4 * pi * r ** 3 * rho * g * d12 / (3 * U12)
mp = 1.67e-27; v17 = sqrt(2 * e * 2.0e3 / mp)
# Exercice 3 : cyclotron
Uc, dc = 50e3, 4.0e-2
Pc = mp * g; Ec_ = Uc / dc; Fc = e * Ec_; ax = e * Uc / (mp * dc)
tc = sqrt(2 * dc / ax); vc = ax * tc; Ekc = 0.5 * mp * vc ** 2; N = 30e6 / (2 * 50e3)

controles = [
    ('Q.1 travail du poids (J)', W1, 0.24, 0.005, r'= 0{,}24\ \text{J}'),
    ('Q.3 Ec initiale (J)', Ec0, 30, 0.5, r'part de $30\ \text{J}$'),
    ('Q.3 Epp maximale (J)', Epmax3, 22.5, 0.05, r'22{,}5\ \text{J}'),
    ('Q.3 vitesse de lancement (m/s)', sqrt(2 * 30 / m3), 10, 0.05, r'= 10\ \text{m·s}^{-1}'),
    ('Q.3 hauteur maximale (m)', 22.5 / (m3 * g), 3.8, 0.05, r'= 3{,}8\ \text{m}'),
    ('Q.4 Epp maximale (kJ)', Epmax4 / 1e3, 3.75, 0.01, r'3{,}75\ \text{kJ}'),
    ('Q.4 hauteur maximale (m)', 3.75e3 / (m4 * g), 5.5, 0.05, r'= 5{,}5\ \text{m}'),
    ('Q.4 Epp initiale (kJ)', Ep04 / 1e3, 3.4, 0.05, r'3{,}4\ \text{kJ}'),
    ('Q.4 hauteur de la plateforme (m)', 3.4e3 / (m4 * g), 5.0, 0.06, r'donne $5{,}0\ \text{m}$'),
    ('Q.5 énergie mécanique (J)', Em5, 500, 0.5, r'égale à $500\ \text{J}$'),
    ('Q.5 hauteur maximale (m)', 500 / (m5 * g), 1.3e2, 5, r'= 1{,}3 \times 10^{2}\ \text{m}'),
    ('Ex.1 v2 (1)', v2[0], 0.98, 0.005, '| 0,98 | 1,96 | 2,92 | 3,92 | 4,88 | 5,90 |'),
    ('Ex.1 v2 (6)', v2[5], 5.90, 0.005, '| 0,98 | 1,96 | 2,92 | 3,92 | 4,88 | 5,90 |'),
    ('Ex.1 coefficient directeur (m/s2)', k1, 19.6, 0.05, r'k = 19{,}6\ \text{m·s}^{-2}'),
    ('Ex.1 g (m/s2)', k1 / 2, 9.8, 0.05, r'\dfrac{19{,}6}{2} = 9{,}8\ \text{m·s}^{-2}'),
    ('Ex.1 z-score', abs(9.8 - 9.81) / 0.2, 0.05, 1e-9, r'\dfrac{|9{,}8 - 9{,}81|}{0{,}2} = 0{,}05$$'),
    ('Ex.1 Ec finale (J)', 0.5 * 0.20 * 2.43 ** 2, 0.59, 0.005, r'2{,}43^{2} = 0{,}59\ \text{J}'),
    ('Ex.1 Epp perdue (J)', 0.20 * g * 0.30, 0.59, 0.005, r'0{,}30 = 0{,}59\ \text{J}'),
    ('Q.6 tension (N)', T6, 1.0, 1e-9, r'= 1{,}0\ \text{N}'),
    ('Q.8 force (N)', F8, 5.8e2, 5, r'= 5{,}8 \times 10^{2}\ \text{N}'),
    ('Q.8 poids (N)', P8, 0.57, 0.005, r'= 0{,}57\ \text{N}'),
    ('Ex.2 Epp(A) (J)', EpA, 2.5e-2, 1e-3, r'= 2{,}5 \times 10^{-2}\ \text{J}'),
    ('Ex.2 vB (m/s)', vB, 2.2, 0.05, r'= 2{,}2\ \text{m·s}^{-1}'),
    ('Ex.2 durée de chute (s)', tsol, 0.29, 0.005, r'= 0{,}29\ \text{s}'),
    ('Ex.2 abscisse d\'impact (m)', Xf, 0.63, 0.005, r'= 0{,}63\ \text{m}'),
    ('Ex.2 abscisse d\'impact, sans arrondi (m)', Xf_exact, 0.63, 0.005, r'= 0{,}63\ \text{m}'),
    ('Ex.2 vitesse visée (m/s)', vC_vise, 2.0, 0.05, r'= 2{,}0\ \text{m·s}^{-1}'),
    ('Ex.2 longueur D visée (m)', D_vise, 0.41, 0.005, r'= 0{,}41\ \text{m}'),
    ('Ex.2 longueur D visée, sans arrondi (m)', D_vise_exact, 0.41, 0.005, r'= 0{,}41\ \text{m}'),
    ('Ex.2 vitesse au sol (m/s)', vsol, 3.6, 0.05, r'= 3{,}6\ \text{m·s}^{-1}'),
    ('Q.11 rapport des forces', rapport, 4.5e2, 5, r'= 4{,}5 \times 10^{2}'),
    ('Q.11 accélération (m/s2)', az, 4.4e3, 50, r'= 4{,}4 \times 10^{3}\ \text{m·s}^{-2}'),
    ('Q.14 date de sortie (s)', tS, 5.0e-4, 1e-9, r'= 5{,}0 \times 10^{-4}\ \text{s}'),
    ('Q.14 ordonnée de sortie (m)', zS, 5.5e-4, 5e-6, r'= 5{,}5 \times 10^{-4}\ \text{m}'),
    ('Q.15 tangente', tana, 0.11, 0.005, r'= 0{,}11'),
    ('Q.15 angle (degré)', degrees(atan(tana)), 6.3, 0.05, r'\alpha = 6{,}3°'),
    ('Q.16 H\'I (m)', HI, 2.8e-3, 5e-5, r'= 2{,}8 \times 10^{-3}\ \text{m}'),
    ('Q.12 charge (C)', q12, 8.0e-19, 5e-21, r'= 8{,}0 \times 10^{-19}\ \text{C}'),
    ('Q.12 nombre de charges élémentaires', q12 / e, 5.0, 0.05, r'= 5{,}0$$'),
    ('Q.17 vitesse (m/s)', v17, 6.2e5, 5e3, r'= 6{,}2 \times 10^{5}\ \text{m·s}^{-1}'),
    ('Ex.3 poids (N)', Pc, 1.64e-26, 5e-29, r'= 1{,}64 \times 10^{-26}\ \text{N}'),
    ('Ex.3 champ (V/m)', Ec_, 1.25e6, 1, r'= 1{,}25 \times 10^{6}\ \text{V·m}^{-1}'),
    ('Ex.3 force (N)', Fc, 2.0e-13, 5e-16, r'= 2{,}0 \times 10^{-13}\ \text{N}'),
    ('Ex.3 rapport des forces', Fc / Pc, 1.2e13, 5e11, r'= 1{,}2 \times 10^{13}'),
    ('Ex.3 accélération (m/s2)', ax, 1.2e14, 5e11, r'= 1{,}2 \times 10^{14}\ \text{m·s}^{-2}'),
    ('Ex.3 durée (s)', tc, 2.6e-8, 5e-10, r'= 2{,}6 \times 10^{-8}\ \text{s}'),
    ('Ex.3 vitesse (m/s)', vc, 3.1e6, 5e4, r'= 3{,}1 \times 10^{6}\ \text{m·s}^{-1}'),
    ('Ex.3 énergie cinétique (J)', Ekc, 8.0e-15, 5e-17, r'= 8{,}0 \times 10^{-15}\ \text{J}'),
    ('Ex.3 énergie cinétique, avec la vitesse imprimée (J)', 0.5 * mp * 3.1e6 ** 2, 8.0e-15, 5e-17, r'= 8{,}0 \times 10^{-15}\ \text{J}'),
    ('Ex.3 eU (J)', e * Uc, 8.0e-15, 5e-17, r'= 8{,}0 \times 10^{-15}\ \text{J}'),
    ('Ex.3 nombre de tours', N, 300, 1e-9, r'= 300\ \text{tours}'),
]
ecarts = [(n, c, i) for n, c, i, t, _ in controles if abs(c - i) > t]
absents = [(n, w) for n, _, _, _, w in controles if w not in src]
print('--- comparaison avec la fiche : %d valeurs contrôlées, %d écart(s), %d écriture(s) introuvable(s)' % (len(controles), len(ecarts), len(absents)))
for n, c, i in ecarts: print('   ÉCART', n, ': recalculé %.5g, imprimé %.5g' % (c, i))
for n, w in absents: print('   INTROUVABLE', n, ':', w)

# tableau « Ce qui est tombé » et phrases qui le résument
bloc = src[src.index('# Ce qui est tombé'):src.index('Ce qu\'il faut en retenir')]
lignes = [l for l in bloc.splitlines() if l.startswith('| ') and not l.startswith('| Session')]
notions = [l.split('|')[3].lower() for l in lignes]
si = [l for l in lignes if 'ingénieur' in l]
energie = [n for n in notions if 'énergie' in n or 'énergétique' in n]
etude = [l for l in lignes if 'énergie cinétique' not in l.split('|')[2] and ('énergie' in l.split('|')[3].lower() or 'énergétique' in l.split('|')[3].lower())]
python = [n for n in notions if 'python' in n]
champ = [n for n in notions if 'électrique' in n]
comptes = [('exercices', len(lignes), 7), ('sciences de l\'ingénieur', len(si), 0), ('énergie (hors cyclotron)', len([l for l in lignes if 'cyclotron' not in l and ('énergie' in l.split('|')[3].lower() or 'énergétique' in l.split('|')[3].lower())]), 6),
           ('Python', len(python), 3), ('champ électrique', len(champ), 1)]
mauvais = [c for c in comptes if c[1] != c[2]]
print('--- tableau : ' + ' ; '.join('%s : %d' % (n, v) for n, v, _ in comptes) + ' ; %d écart(s)' % len(mauvais))
phrases = ['au moins sept exercices des sessions 2025 et 2026', 'six de ces sept exercices', 'dans trois exercices', 'tombé une fois, en 2026',
           'Au moins cinq sujets en 2025 et 2026',
           # corrections de relecture : milieu de la cible, g à trois chiffres, listes Python, tension entre deux plaques
           'à l\'abscisse $0{,}575\\ \\text{m}$', '\\dfrac{0{,}575}{0{,}286}', 'Epp.append(m\\*g\\*(0.30 - h\\[i\\]))', 'Em.append(Ec\\[i\\] + Epp\\[i\\])',
           'la tension entre les deux plaques vaut', 'Hauteur maximale | Q.3 à Q.5',
           # relecture du 18 novembre 2026, deuxième tour : le champ entre deux plaques est donné par les énoncés ; le poids est conservatif
           'Champ électrique entre les plaques : $E = \\dfrac{U}{d}$', 'Champ électrique entre les électrodes : $E = \\dfrac{U}{d}$',
           'seul compte le dénivelé, pas le chemin',
           # contrôle de cohérence du 21 novembre 2026 : g = 9,81 dans les données de l'exercice 2 ; dans l'exercice 1, la
           # mesure s'arrête à la même décimale que son incertitude-type (fiche 14, Q.1)
           '$h_C = 0{,}40\\ \\text{m}$ ; $g = 9{,}81\\ \\text{m·s}^{-2}$', '$u(g) = 0{,}2\\ \\text{m·s}^{-2}$. Comparer',
           'La valeur mesurée s\'arrête à la même décimale que son incertitude-type (voir la fiche 14, Q.1) : $g = 9{,}8\\ \\text{m·s}^{-2}$ avec $u(g) = 0{,}2\\ \\text{m·s}^{-2}$']
perdues = [p for p in phrases if p not in src]
for p in perdues: print('   PHRASE INTROUVABLE :', p)
print('--- phrases de synthèse : %d suivies, %d introuvable(s)' % (len(phrases), len(perdues)))

# g (contrôle de cohérence du 21 novembre 2026) : 9,81 m·s⁻² dans toutes les données et tous les calculs. Seule la mesure de
# l'exercice 1 s'écrit 9,8 (résultat de la question 6, écriture du résultat, écart normalisé), jamais 9,80 : avec
# u(g) = 0,2 m·s⁻², la valeur s'arrête au dixième.
ex1_c = src[src.index('{#c_ex1}'):src.index('# Corrigés du thème 2')]
g_court = r'(?<!\d)9(?:\{,\}|,)80?(?!\d)'
g_hors_ex1 = re.findall(g_court, src.replace(ex1_c, ''))
g_ex1 = re.findall(g_court, ex1_c)
defauts_g = []
if g_hors_ex1:
    defauts_g.append('g écrit %s hors de la mesure de l\'exercice 1' % ', '.join(g_hors_ex1))
if g_ex1 != ['9{,}8'] * 3:
    defauts_g.append('mesure de l\'exercice 1 écrite %s (attendu : 9{,}8, trois fois)' % ', '.join(g_ex1))
for t in defauts_g: print('   g :', t)
print('--- g : %d écriture(s) de 9,81, %d de la mesure 9,8 dans l\'exercice 1, %d écart(s)'
      % (len(re.findall(r'9\{,\}81(?!\d)', src)), len(g_ex1), len(defauts_g)))

# L'essentiel (relecture du 18 novembre 2026) : « À connaître par cœur » ne garde que les définitions et les lois du programme ;
# les relations à établir passent dans « À savoir retrouver », placée juste après, avec la démarche qui les donne.
ess = src[src.index("# L'essentiel en une page"):src.index('# Ce qui est tombé')]
morceaux = re.split(r'::: \{custom-style="Rubrique"\}\n(.*?)\n:::', ess)
rubriques = [morceaux[k] for k in range(1, len(morceaux), 2)]
corps = {morceaux[k]: morceaux[k + 1] for k in range(1, len(morceaux), 2)}
def notions(titre):
    return [l.split('|')[1].strip() for l in corps.get(titre, '').splitlines() if l.startswith('| ') and not l.startswith('| Notion')]
attendu = {'À connaître par cœur': ("| Notion | Relation | À retenir |", ["Travail d'une force constante", 'Énergies', "Théorème de l'énergie cinétique", 'Énergie mécanique', 'Champ et force électriques']),
           'À savoir retrouver': ('| Notion | Relation | Comment la retrouver |', ['Travail du poids', 'Particule chargée'])}
defauts = [t for t, (entete, liste) in attendu.items() if entete not in corps.get(t, '') or notions(t) != liste]
if rubriques[:2] != ['À connaître par cœur', 'À savoir retrouver']:
    defauts.append('ordre des rubriques : ' + ' ; '.join(rubriques))
# le champ entre deux plaques : le programme de terminale le veut « son expression étant donnée » ; il passe donc dans
# « Fourni par l'énoncé, à savoir exploiter » et ne figure plus dans « À connaître par cœur »
fourni = corps.get("Fourni par l'énoncé, à savoir exploiter", '')
if 'E = U / d' not in fourni:
    defauts.append("E = U / d absent de « Fourni par l'énoncé »")
if 'dfrac{U}{d}' in corps.get('À connaître par cœur', '') or 'E = U / d' in corps.get('À connaître par cœur', ''):
    defauts.append('E = U / d encore dans « À connaître par cœur »')
for t in defauts: print('   ESSENTIEL :', t, '->', notions(t) if t in corps else '')
print("--- L'essentiel : %d relation(s) par cœur, %d à savoir retrouver, %d écart(s)" % (len(notions('À connaître par cœur')), len(notions('À savoir retrouver')), len(defauts)))

# E = U / d donné par l'énoncé (relecture du 18 novembre 2026, deuxième tour) : « Fourni par l'énoncé » l'annonce, donc chaque
# énoncé dont le corrigé s'en sert, directement ou pour retrouver W = q × U (« À savoir retrouver »), doit la donner.
# Les questions du déflecteur (Q.9 à Q.11, Q.13 à Q.16) partagent les données placées en tête du thème 3.
champ_donne = r'E = \dfrac{U}{d}'
enonces3 = src[src.index('# Thème 3'):src.index('<!--debut:complet-->')]
blocs_e = re.split(r'\n(?=#{2,3} \[)', enonces3)
deflecteur = ['q9', 'q10', 'q11', 'q13', 'q14', 'q15', 'q16']
def enonce_de(ident):
    return blocs_e[0] if ident in deflecteur else next(b for b in blocs_e if '{#%s}' % ident in b)
corriges3 = src[src.index('# Corrigés du thème 3'):src.index('# Index des notions')]
blocs_c = re.split(r'\n(?=#### \[Corrigé\])', corriges3)[1:]
utilisent = [re.search(r'\{#c_(\w+)\}', b).group(1) for b in blocs_c if re.search(r'\\dfrac\{U\}\{d\}|q\| \\times U|e \\times U', b)]
sans_champ = [i for i in utilisent if champ_donne not in enonce_de(i)]
for i in sans_champ: print('   E = U / d ABSENT de l\'énoncé de', i)
# les corrigés qui écrivent W = e × U le retrouvent à partir du champ donné
derivation = r'e \times E \times d = e \times U'
sans_derivation = []
for b in blocs_c:
    ecrit_w = r'W_{AB}(\vec{F}_e) = e \times U' in b or r'W(\vec{F}_e) = e \times U' in b
    if ecrit_w and derivation not in b:
        sans_derivation.append(re.search(r'\{#c_(\w+)\}', b).group(1))
for i in sans_derivation: print('   W = e × U sans démarche dans le corrigé de', i)
print('--- E = U / d : %d corrigé(s) s\'en servent (%s), %d énoncé(s) sans la relation, %d corrigé(s) sans la démarche'
      % (len(utilisent), ', '.join(utilisent), len(sans_champ), len(sans_derivation)))
if ecarts or absents or mauvais or perdues or defauts_g or defauts or sans_champ or sans_derivation or len(utilisent) < 4:
    raise SystemExit(1)
print('--- tout est bon')
