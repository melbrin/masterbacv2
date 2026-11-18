import "server-only";
import type { ExercicePython } from "@/lib/commun/python/types";

// Chimie : quantités de matière d'un titrage, diagramme de distribution, vitesse de disparition, décroissance radioactive.
export const EXERCICES_CHIMIE: ExercicePython[] = [
  {
    id: "titrage-quantites",
    titre: "Les quantités de matière d'un titrage",
    theme: "chimie",
    fiche: 10,
    niveau: 14,
    minutes: 12,
    genre: "completer",
    enonce: [
      "Le programme simule le titrage d'un vinaigre dilué par une solution d'hydroxyde de sodium. L'acide éthanoïque du bécher (espèce A) réagit avec les ions hydroxyde versés par la burette (espèce B) : la réaction support, notée A + B → C + D, est totale.",
      "Le bécher contient au départ `V1` = 20,0 mL de solution de A, de concentration `C1` = 0,075 mol/L ; la solution de B a pour concentration `C2` = 0,100 mol/L. Le tableau `V` donne les volumes versés, de 0 à 25 mL, exprimés en litres.",
      "Remplace les trois points : d'abord le volume à l'équivalence `VE`, en litres, puis, dans la boucle, la quantité `n1` de A restant et la quantité `n2` de B en excès, en mol, avant et après l'équivalence.",
      "Lance ton programme : il affiche `VE` en mL et trace `n1` et `n2` en fonction du volume versé.",
    ],
    depart: `import numpy as np
import matplotlib.pyplot as plt

C1 = 0.075      # concentration de A, en mol/L
V1 = 20.0e-3    # volume de solution titrée, en L
C2 = 0.100      # concentration de B, en mol/L

VE = ...        # volume à l'équivalence, en L
print("VE =", VE * 1000, "mL")

V = np.linspace(0, 25.0e-3, 51)   # volumes versés, en L
n1 = []         # quantités de A restant, en mol
n2 = []         # quantités de B en excès, en mol
for Vk in V:
    if Vk < VE:        # avant l'équivalence
        n1.append(...)
        n2.append(...)
    else:              # après l'équivalence
        n1.append(...)
        n2.append(...)

plt.plot(1000 * V, n1, "b", label="n1 : A restant")
plt.plot(1000 * V, n2, "r", label="n2 : B en excès")
plt.xlabel("V versé (mL)")
plt.ylabel("quantité de matière (mol)")
plt.legend()
plt.show()
`,
    tests: [
      {
        nom: "Le volume à l'équivalence VE est juste",
        code: `_h_VE = C1 * V1 / C2
assert abs(float(VE) - 1000 * _h_VE) > 1e-6 * _h_VE, "VE doit rester en litres, comme V1 : le programme le convertit lui-même en mL pour l'afficher."
assert abs(float(VE) - _h_VE) <= 1e-6 * _h_VE, "VE n'a pas la bonne valeur : à l'équivalence, la quantité de B versée est égale à la quantité de A présente au départ."`,
      },
      {
        nom: "Les quantités n1 de A restant sont justes",
        code: `_h_n0 = C1 * V1
assert len(n1) == len(V), "n1 doit recevoir une valeur par volume versé : une à chaque tour de boucle."
for _h_v, _h_n in zip(V, n1):
    _h_a = max(_h_n0 - C2 * float(_h_v), 0.0)
    assert abs(float(_h_n) - _h_a) <= 1e-9 * _h_n0, "n1 est faux pour V = " + str(round(1000 * float(_h_v), 1)).replace(".", ",") + " mL : avant l'équivalence, A est consommé par le B versé ; après, il n'en reste plus."`,
      },
      {
        nom: "Les quantités n2 de B en excès sont justes",
        code: `_h_n0 = C1 * V1
assert len(n2) == len(V), "n2 doit recevoir une valeur par volume versé : une à chaque tour de boucle."
for _h_v, _h_n in zip(V, n2):
    _h_a = max(C2 * float(_h_v) - _h_n0, 0.0)
    assert abs(float(_h_n) - _h_a) <= 1e-9 * _h_n0, "n2 est faux pour V = " + str(round(1000 * float(_h_v), 1)).replace(".", ",") + " mL : avant l'équivalence, tout le B versé réagit ; après, le B versé en trop s'accumule dans le bécher."`,
      },
      {
        nom: "Le graphique montre n1 et n2 en fonction du volume versé",
        code: `assert len(_figures_hub) > 0, "Aucun graphique n'est tracé : garde les lignes plt.plot et plt.show()."
_h_c = _figures_hub[0]["courbes"]
assert len(_h_c) >= 2, "Le graphique doit montrer deux courbes : n1 et n2 en fonction de V."
assert all(len(_h_k["y"]) == len(V) for _h_k in _h_c[:2]), "Chaque courbe doit avoir un point par volume versé : garde les deux lignes plt.plot."`,
      },
    ],
    indices: [
      "Avant l'équivalence, le réactif limitant est B : tout le B versé est consommé. Après l'équivalence, c'est A qui a entièrement réagi.",
      "À l'équivalence, la quantité de B versée, C2 × VE, est égale à la quantité de A présente au départ, C1 × V1.",
      "Avant l'équivalence, il reste la quantité initiale de A moins la quantité de B versée, C2 × Vk ; après, le B en excès est la quantité versée moins celle qui a réagi avec tout le A.",
    ],
    solution: `import numpy as np
import matplotlib.pyplot as plt

C1 = 0.075      # concentration de A, en mol/L
V1 = 20.0e-3    # volume de solution titrée, en L
C2 = 0.100      # concentration de B, en mol/L

VE = C1 * V1 / C2   # volume à l'équivalence, en L
print("VE =", VE * 1000, "mL")

V = np.linspace(0, 25.0e-3, 51)   # volumes versés, en L
n1 = []         # quantités de A restant, en mol
n2 = []         # quantités de B en excès, en mol
for Vk in V:
    if Vk < VE:        # avant l'équivalence
        n1.append(C1 * V1 - C2 * Vk)
        n2.append(0)
    else:              # après l'équivalence
        n1.append(0)
        n2.append(C2 * Vk - C1 * V1)

plt.plot(1000 * V, n1, "b", label="n1 : A restant")
plt.plot(1000 * V, n2, "r", label="n2 : B en excès")
plt.xlabel("V versé (mL)")
plt.ylabel("quantité de matière (mol)")
plt.legend()
plt.show()
`,
    explication: [
      "À l'équivalence, C2 × VE = C1 × V1 : ici VE = 0,075 × 20,0 / 0,100 = 15,0 mL.",
      "Avant l'équivalence, B est le réactif limitant : n1 = C1 × V1 - C2 × V diminue depuis 1,5 × 10⁻³ mol et n2 reste nul. Après, A a disparu : n2 = C2 × V - C1 × V1 augmente.",
      "Sur le graphique, n1 atteint zéro à VE, juste où n2 commence à croître : c'est là que le réactif limitant change. Dans la boucle, le test if Vk < VE choisit pour chaque volume la formule qui convient.",
    ],
    etat: "brouillon",
  },
  {
    id: "diagramme-distribution",
    titre: "Le diagramme de distribution",
    theme: "chimie",
    fiche: 9,
    niveau: 14,
    minutes: 12,
    genre: "completer",
    enonce: [
      "Le couple acide éthanoïque / ion éthanoate, CH3COOH / CH3COO⁻, a un pKA de 4,8 : il est rangé dans la variable `pKa`. Le tableau `pH` contient 141 valeurs du pH, de 0 à 14, de 0,1 en 0,1.",
      "Pour une valeur du pH, le pourcentage de la forme acide vaut 100 / (1 + 10 puissance (pH - pKA)) ; celui de la forme basique est ce qui manque à la forme acide pour atteindre 100 %.",
      "Remplace les trois points pour que les listes `acide` et `base` reçoivent, à chaque tour de boucle, les pourcentages des deux formes. Le programme trace ensuite le diagramme de distribution du couple.",
    ],
    depart: `import numpy as np
import matplotlib.pyplot as plt

pKa = 4.8                      # couple CH3COOH / CH3COO-
pH = np.linspace(0, 14, 141)   # 141 valeurs, de 0 à 14

acide = []    # pourcentages de CH3COOH
base = []     # pourcentages de CH3COO-
for i in range(len(pH)):
    acide.append(...)
    base.append(...)

plt.plot(pH, acide, "r")       # forme acide
plt.plot(pH, base, "b")        # forme basique
plt.axvline(pKa, color="k", linestyle="--")
plt.text(0.5, 85, "CH3COOH")
plt.text(10, 85, "CH3COO-")
plt.xlabel("pH")
plt.ylabel("pourcentage (%)")
plt.show()
`,
    tests: [
      {
        nom: "Les pourcentages de la forme acide sont justes",
        code: `assert len(acide) == len(pH), "La liste acide doit recevoir une valeur par pH : une à chaque tour de boucle."
for _h_x, _h_a in zip(pH, acide):
    _h_att = 100 / (1 + 10 ** (float(_h_x) - pKa))
    assert abs(float(_h_a) - _h_att) <= 1e-6, "Le pourcentage d'acide est faux à pH = " + str(round(float(_h_x), 1)).replace(".", ",") + " : vérifie la formule, ses parenthèses et la puissance, qui s'écrit ** en Python."`,
      },
      {
        nom: "Les pourcentages de la forme basique sont justes",
        code: `assert len(base) == len(pH), "La liste base doit recevoir une valeur par pH : une à chaque tour de boucle."
for _h_k in range(len(pH)):
    _h_att = 100 - 100 / (1 + 10 ** (float(pH[_h_k]) - pKa))
    if abs(float(base[_h_k]) - _h_att) > 1e-6:
        _h_suit = len(acide) == len(pH) and abs(float(acide[_h_k]) + float(base[_h_k]) - 100) <= 1e-6
        assert not _h_suit, "Le pourcentage de base complète bien celui de l'acide à 100 %, mais celui de l'acide est faux : corrige-le d'abord."
        assert False, "Le pourcentage de base est faux à pH = " + str(round(float(pH[_h_k]), 1)).replace(".", ",") + " : la forme basique représente ce qui manque à la forme acide pour faire 100 %."`,
      },
      {
        nom: "Les deux pourcentages font 100 % à chaque pH",
        code: `assert len(acide) == len(base) == len(pH), "Les listes acide et base doivent avoir une valeur par pH."
assert all(abs(float(_h_a) + float(_h_b) - 100) <= 1e-6 for _h_a, _h_b in zip(acide, base)), "À chaque pH, les pourcentages des deux formes doivent faire 100 % à eux deux."`,
      },
      {
        nom: "À pH = pKA, chaque forme représente 50 %",
        code: `_h_i = min(range(len(pH)), key=lambda _h_k: abs(float(pH[_h_k]) - pKa))
assert abs(float(pH[_h_i]) - pKa) < 1e-6, "Le tableau pH doit contenir la valeur du pKA : ne le change pas."
assert abs(float(acide[_h_i]) - 50) < 1e-6 and abs(float(base[_h_i]) - 50) < 1e-6, "À pH = pKA, l'acide et la base doivent être en quantités égales, 50 % chacun : vérifie la formule et ses parenthèses."`,
      },
      {
        nom: "Le diagramme montre une courbe pour chaque forme",
        code: `assert len(_figures_hub) > 0, "Aucun graphique n'est tracé : garde les lignes plt.plot et plt.show()."
_h_c = _figures_hub[0]["courbes"]
assert len(_h_c) >= 2, "Le diagramme doit montrer deux courbes : une pour l'acide, une pour la base."
assert all(len(_h_k["y"]) == len(pH) for _h_k in _h_c[:2]), "Chaque courbe doit avoir un point par valeur du pH : garde les deux lignes plt.plot."`,
      },
    ],
    indices: [
      "À chaque tour de boucle, le pH vaut pH[i] : c'est ce nombre qui entre dans la formule, pas le tableau pH entier.",
      "En Python, une puissance s'écrit ** : 10 puissance a s'écrit 10**a. Le symbole ^ ne calcule pas une puissance.",
      "Mets des parenthèses autour de l'exposant et autour du dénominateur. Pour la base, pars du pourcentage d'acide qui vient d'être calculé pour le même pH.",
    ],
    solution: `import numpy as np
import matplotlib.pyplot as plt

pKa = 4.8                      # couple CH3COOH / CH3COO-
pH = np.linspace(0, 14, 141)   # 141 valeurs, de 0 à 14

acide = []    # pourcentages de CH3COOH
base = []     # pourcentages de CH3COO-
for i in range(len(pH)):
    acide.append(100 / (1 + 10**(pH[i] - pKa)))
    base.append(100 - acide[i])

plt.plot(pH, acide, "r")       # forme acide
plt.plot(pH, base, "b")        # forme basique
plt.axvline(pKa, color="k", linestyle="--")
plt.text(0.5, 85, "CH3COOH")
plt.text(10, 85, "CH3COO-")
plt.xlabel("pH")
plt.ylabel("pourcentage (%)")
plt.show()
`,
    explication: [
      "Pour pH < pKA, la forme acide CH3COOH prédomine ; pour pH > pKA, c'est l'ion éthanoate CH3COO⁻. Les deux courbes se croisent à 50 % pour pH = pKA = 4,8.",
      "Une unité sous le pKA, à pH = 3,8, il y a 91 % d'acide ; une unité au-dessus, à pH = 5,8, il n'en reste que 9 %.",
      "La formule vient de pH = pKA + log([A⁻]/[AH]) : le rapport [A⁻]/[AH] vaut 10 puissance (pH - pKA), et le pourcentage d'acide est 100 / (1 + ce rapport).",
      "Dans la boucle, pH[i] est un nombre : 10**(pH[i] - pKa) se calcule pour chaque pH, puis append range le résultat à la fin de la liste.",
    ],
    etat: "brouillon",
  },
  {
    id: "vitesse-disparition",
    titre: "La vitesse volumique de disparition",
    theme: "chimie",
    fiche: 11,
    niveau: 18,
    minutes: 15,
    genre: "completer",
    enonce: [
      "On suit la décomposition de l'eau oxygénée, catalysée par des ions fer(III). Le début du programme simule les mesures pour une loi de vitesse d'ordre 1 de constante `k` = 0,020 min⁻¹ : les dates `t`, en min, et les concentrations `C`, en mol/L, arrondies à trois chiffres significatifs.",
      "Remplace les trois points de la boucle : `v` reçoit la vitesse volumique de disparition, v = -dC/dt, estimée entre les dates `t[i]` et `t[i+1]` avec les mesures à ces deux dates ; `r` reçoit le rapport de cette vitesse à la concentration `C[i]`.",
      "Si la loi de vitesse est d'ordre 1, la vitesse est proportionnelle à la concentration : les rapports v / C sont tous voisins de k. Le programme affiche les rapports, puis leur moyenne `km`, qui estime k.",
    ],
    depart: `import math

# mesures simulées pour une loi d'ordre 1
k = 0.020       # constante de vitesse, en min^-1
C0 = 5.00e-2    # concentration initiale, en mol/L
t = []          # dates, en min
C = []          # concentrations, en mol/L
for i in range(9):
    t.append(5 * i)
    C.append(round(C0 * math.exp(-k * t[i]), 4))

v = []    # vitesses de disparition, en mol/L/min
r = []    # rapports v / C, en min^-1
for i in range(len(t) - 1):
    v.append(...)
    r.append(...)

for i in range(len(r)):
    print("t =", t[i], "min : v / C =", round(r[i], 4))
km = sum(r) / len(r)
print("k estimé :", round(km, 4), "min^-1")
`,
    tests: [
      {
        nom: "Les vitesses de disparition sont justes",
        code: `assert len(v) == len(t) - 1, "v doit contenir une vitesse par intervalle entre deux dates : une de moins que de dates."
for _h_i in range(len(v)):
    _h_a = -(C[_h_i + 1] - C[_h_i]) / (t[_h_i + 1] - t[_h_i])
    _h_x = float(v[_h_i])
    assert abs(_h_x + _h_a) > 1e-9 * _h_a, "Les vitesses sont négatives : une vitesse de disparition est positive, alors que la concentration du réactif diminue."
    assert abs(_h_x - _h_a) <= 1e-9 * _h_a, "La vitesse entre " + str(t[_h_i]) + " et " + str(t[_h_i + 1]) + " min est fausse : estime -dC/dt avec les concentrations et les dates d'indices i et i + 1."`,
      },
      {
        nom: "Les rapports v / C sont justes",
        code: `assert len(r) == len(t) - 1, "r doit contenir un rapport par vitesse calculée : une valeur de moins que de dates."
for _h_i in range(len(r)):
    _h_a = -(C[_h_i + 1] - C[_h_i]) / (t[_h_i + 1] - t[_h_i]) / C[_h_i]
    _h_x = float(r[_h_i])
    if abs(_h_x - _h_a) > 1e-9 * abs(_h_a):
        _h_suit = len(v) == len(r) and abs(_h_x - float(v[_h_i]) / C[_h_i]) <= 1e-9 * abs(_h_x) + 1e-15
        assert not _h_suit, "Les rapports sont bien v[i] / C[i], mais les vitesses sont fausses : corrige-les d'abord."
        assert False, "Le rapport d'indice " + str(_h_i) + " est faux : divise la vitesse d'indice i par la concentration C[i], celle du début de l'intervalle."`,
      },
      {
        nom: "La moyenne des rapports est proche de k",
        code: `# v[i] est une vitesse moyenne sur une durée dt : le rapport v[i] / C[i] vaut environ k × (1 - k × dt / 2),
# soit 5 % de moins que k ici ; l'arrondi des mesures change peu la moyenne (0,2 %). On accepte k × dt / 2 + 3 %.
_h_dt = (t[-1] - t[0]) / (len(t) - 1)
_h_tol = k * _h_dt / 2 + 0.03
assert abs(float(km) - k) <= _h_tol * k, "La moyenne des rapports s'écarte trop de k : vérifie les vitesses et les rapports, et garde le calcul de km."`,
      },
    ],
    indices: [
      "Entre les dates t[i] et t[i+1], la concentration passe de C[i] à C[i+1] : elle diminue, et la vitesse de disparition doit pourtant être positive.",
      "Une dérivée s'estime par une variation divisée par une durée : ici, la variation de C entre les deux dates, divisée par t[i+1] - t[i], puis changée de signe.",
      "Le rapport se calcule avec la vitesse qui vient d'être rangée, v[i], et la concentration au début de l'intervalle, C[i].",
    ],
    solution: `import math

# mesures simulées pour une loi d'ordre 1
k = 0.020       # constante de vitesse, en min^-1
C0 = 5.00e-2    # concentration initiale, en mol/L
t = []          # dates, en min
C = []          # concentrations, en mol/L
for i in range(9):
    t.append(5 * i)
    C.append(round(C0 * math.exp(-k * t[i]), 4))

v = []    # vitesses de disparition, en mol/L/min
r = []    # rapports v / C, en min^-1
for i in range(len(t) - 1):
    v.append(-(C[i + 1] - C[i]) / (t[i + 1] - t[i]))
    r.append(v[i] / C[i])

for i in range(len(r)):
    print("t =", t[i], "min : v / C =", round(r[i], 4))
km = sum(r) / len(r)
print("k estimé :", round(km, 4), "min^-1")
`,
    explication: [
      "La vitesse volumique de disparition s'estime par -(C[i+1] - C[i]) / (t[i+1] - t[i]) : le signe moins la rend positive, puisque la concentration du réactif diminue.",
      "Les rapports v / C restent voisins de 0,019 min⁻¹ : la vitesse est proportionnelle à la concentration, la loi de vitesse est bien d'ordre 1.",
      "Leur moyenne, 0,019 min⁻¹, est un peu inférieure à k = 0,020 min⁻¹ : v[i] est une vitesse moyenne sur 5 min, pendant lesquelles la concentration devient plus faible que C[i]. Des mesures plus rapprochées réduiraient cet écart.",
    ],
    etat: "brouillon",
  },
  {
    id: "decroissance-radioactive",
    titre: "La décroissance radioactive pas à pas",
    theme: "chimie",
    fiche: 11,
    niveau: 18,
    minutes: 12,
    genre: "completer",
    enonce: [
      "L'iode 131, utilisé en médecine, a une demi-vie de 8,02 jours. Un échantillon contient au départ N0 = 1,0 × 10⁶ noyaux. Le nombre N de noyaux vérifie dN/dt = -λN, où λ est la constante radioactive.",
      "Le programme calcule N tous les `dt` = 0,5 jour pendant 40 jours par la méthode d'Euler : pendant une durée dt courte, le nombre de noyaux varie de dN = -λ × N × dt.",
      "Remplace les trois points : la constante radioactive `lam`, en jour⁻¹, calculée à partir de la demi-vie `t12`, puis, dans la boucle, le nombre de noyaux à la date suivante, calculé à partir du dernier nombre de la liste `N`. La variable s'appelle `lam`, car lambda est un mot réservé de Python.",
      "Le programme calcule aussi la solution exacte, N = N0 × exp(-λt), affiche les deux nombres de noyaux obtenus à 40 jours et trace les deux courbes.",
    ],
    depart: `import math
import matplotlib.pyplot as plt

t12 = 8.02    # demi-vie de l'iode 131, en jours
lam = ...     # constante radioactive, en jour^-1
N0 = 1.0e6    # nombre initial de noyaux
dt = 0.5      # pas de calcul, en jours

t = [0.0]     # dates, en jours
N = [N0]      # nombres de noyaux, calculés pas à pas
for i in range(80):            # 80 pas de dt : 40 jours
    N.append(...)
    t.append(t[i] + dt)

Nex = []      # solution exacte
for x in t:
    Nex.append(N0 * math.exp(-lam * x))

print("à 40 jours, pas à pas :", round(N[-1]))
print("à 40 jours, exact :", round(Nex[-1]))

plt.plot(t, N, "b", label="pas à pas")
plt.plot(t, Nex, "k--", label="solution exacte")
plt.xlabel("t (jours)")
plt.ylabel("N")
plt.legend()
plt.show()
`,
    tests: [
      {
        nom: "La constante radioactive lam est juste",
        code: `import math as _h_m
_h_lam = _h_m.log(2) / t12
assert abs(float(lam) - _h_lam) <= 1e-3 * _h_lam, "lam n'a pas la bonne valeur : relis la relation entre la demi-vie et la constante radioactive ; le logarithme népérien s'écrit math.log."
assert abs(float(lam) - _h_lam) <= 1e-6 * _h_lam, "lam est presque juste : calcule ln 2 avec math.log(2), sans l'arrondir."`,
      },
      {
        nom: "La liste N suit la méthode d'Euler",
        code: `assert len(N) == len(t), "N et t doivent avoir autant de valeurs : la boucle en ajoute une à chacune à chaque tour."
assert abs(t[-1] - 40) < 1e-6, "Le calcul doit s'arrêter à 40 jours : garde dt et le nombre de tours de la boucle."
assert float(N[0]) == N0, "La liste N doit commencer par N0."
_h_l = float(lam)
for _h_i in range(len(N) - 1):
    _h_a = float(N[_h_i]) - _h_l * float(N[_h_i]) * dt
    assert abs(float(N[_h_i + 1]) - _h_a) <= 1e-9 * N0, "N ne suit pas la méthode d'Euler : le nombre suivant est le dernier nombre calculé, augmenté de sa variation dN pendant dt."`,
      },
      {
        nom: "À 40 jours, l'écart avec la solution exacte est inférieur à 1 % de N0",
        code: `import math as _h_m
_h_ex = N0 * _h_m.exp(-_h_m.log(2) / t12 * t[-1])
assert abs(float(N[-1]) - _h_ex) <= 0.01 * N0, "À 40 jours, le calcul pas à pas s'écarte trop de la solution exacte : vérifie lam, la ligne de la boucle et le pas dt."`,
      },
    ],
    indices: [
      "La boucle construit N pas à pas : à chaque tour, le nombre suivant se calcule avec le dernier nombre connu, N[i].",
      "La demi-vie et la constante radioactive sont liées par t12 = ln 2 / λ ; en Python, ln 2 s'écrit math.log(2).",
      "Pendant dt, le nombre de noyaux varie de -λ × N[i] × dt : le nombre suivant est N[i] augmenté de cette variation, qui est négative.",
    ],
    solution: `import math
import matplotlib.pyplot as plt

t12 = 8.02    # demi-vie de l'iode 131, en jours
lam = math.log(2) / t12  # constante radioactive, en jour^-1
N0 = 1.0e6    # nombre initial de noyaux
dt = 0.5      # pas de calcul, en jours

t = [0.0]     # dates, en jours
N = [N0]      # nombres de noyaux, calculés pas à pas
for i in range(80):            # 80 pas de dt : 40 jours
    N.append(N[i] - lam * N[i] * dt)
    t.append(t[i] + dt)

Nex = []      # solution exacte
for x in t:
    Nex.append(N0 * math.exp(-lam * x))

print("à 40 jours, pas à pas :", round(N[-1]))
print("à 40 jours, exact :", round(Nex[-1]))

plt.plot(t, N, "b", label="pas à pas")
plt.plot(t, Nex, "k--", label="solution exacte")
plt.xlabel("t (jours)")
plt.ylabel("N")
plt.legend()
plt.show()
`,
    explication: [
      "λ = ln 2 / t12 = 8,64 × 10⁻² jour⁻¹. La méthode d'Euler remplace la dérivée par une variation sur un pas : N(t + dt) = N(t) - λ × N(t) × dt.",
      "À 40 jours, le calcul pas à pas donne 2,92 × 10⁴ noyaux, contre 3,15 × 10⁴ pour la solution exacte. L'écart ne vaut que 0,2 % de N0 : sur le graphique, les deux courbes se superposent presque.",
      "Le calcul pas à pas décroît un peu trop vite : chaque variation est calculée avec le nombre de noyaux du début du pas, plus grand que pendant le reste du pas. Avec un pas de 0,1 jour, on trouverait 3,11 × 10⁴ noyaux.",
    ],
    etat: "brouillon",
  },
];
