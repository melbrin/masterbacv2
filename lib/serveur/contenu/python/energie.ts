import "server-only";
import type { ExercicePython } from "@/lib/commun/python/types";

// Énergie et transferts thermiques : énergies cinétique, potentielle et mécanique, refroidissement (loi de Newton).
export const EXERCICES_ENERGIE: ExercicePython[] = [
  {
    id: "energie-mecanique",
    titre: "La fonction énergie mécanique",
    theme: "energie",
    fiche: 2,
    niveau: 14,
    minutes: 12,
    genre: "ecrire",
    enonce: [
      "Écris une fonction `energie_mecanique(m, v, z)` qui renvoie l'énergie mécanique, en joules, d'un objet de masse `m` (en kg), de vitesse `v` (en m/s) et d'altitude `z` (en m).",
      "L'énergie mécanique est la somme de l'énergie cinétique ½ × m × v² et de l'énergie potentielle de pesanteur m × g × z, avec g = 9,81 m/s².",
      "La fonction renvoie sa valeur avec `return` : elle n'affiche rien. Les lignes du bas l'essaient sur une balle de 58 g.",
    ],
    depart: `g = 9.81    # intensité de la pesanteur, en m/s2

def energie_mecanique(m, v, z):
    # écris ici le calcul, puis renvoie le résultat avec return
    ...


print(energie_mecanique(0.058, 12.0, 1.5))
`,
    tests: [
      {
        nom: "La fonction renvoie un nombre",
        code: `_h_r = energie_mecanique(0.058, 12.0, 1.5)
assert _h_r is not None, "Ta fonction ne renvoie rien : termine-la par return suivi du résultat."
assert isinstance(_h_r, (int, float)), "Ta fonction doit renvoyer un nombre."`,
      },
      {
        nom: "Sans vitesse, il ne reste que l'énergie potentielle",
        code: `assert abs(energie_mecanique(2.0, 0.0, 10.0) - 2.0 * 9.81 * 10.0) < 1e-6, "Pour v = 0, la fonction doit renvoyer m × g × z."`,
      },
      {
        nom: "Au sol, il ne reste que l'énergie cinétique",
        code: `assert abs(energie_mecanique(2.0, 3.0, 0.0) - 9.0) < 1e-6, "Pour z = 0, la fonction doit renvoyer ½ × m × v² : vérifie le carré, qui s'écrit v**2."`,
      },
      {
        nom: "Le cas de la balle est juste",
        code: `_h_attendu = 0.5 * 0.058 * 12.0**2 + 0.058 * 9.81 * 1.5
assert abs(energie_mecanique(0.058, 12.0, 1.5) - _h_attendu) < 1e-6, "Le résultat n'est pas le bon : fais la somme des deux énergies."`,
      },
    ],
    indices: [
      "Une fonction calcule avec ses paramètres m, v et z, puis renvoie le résultat : return Ec + Epp.",
      "En Python, le carré de v s'écrit v**2. Le symbole ^ ne calcule pas une puissance.",
      "Tu peux calculer Ec = 0.5 * m * v**2 et Epp = m * g * z sur deux lignes, puis renvoyer leur somme.",
    ],
    solution: `g = 9.81    # intensité de la pesanteur, en m/s2

def energie_mecanique(m, v, z):
    Ec = 0.5 * m * v**2
    Epp = m * g * z
    return Ec + Epp


print(energie_mecanique(0.058, 12.0, 1.5))
`,
    explication: [
      "return renvoie la valeur à qui appelle la fonction : on peut alors l'afficher, la mettre dans une liste ou la comparer.",
      "print affiche, mais ne renvoie rien : une fonction qui se termine par print renvoie None.",
      "La balle a ici une énergie mécanique d'environ 5,0 J, dont 4,2 J d'énergie cinétique.",
    ],
    etat: "brouillon",
  },
  {
    id: "energies-chute",
    titre: "Les énergies au cours d'une chute",
    theme: "energie",
    fiche: 2,
    niveau: 10,
    minutes: 10,
    genre: "completer",
    enonce: [
      "Une balle de golf de 46 g est lâchée sans vitesse d'une hauteur de 10 m. Le programme donne, toutes les 0,15 s, la date `t` (en s), l'altitude `z` de la balle au-dessus du sol (en m) et sa vitesse `v` (en m/s).",
      "Complète les trois lignes de la boucle : à la date `t[i]`, `Ec` reçoit l'énergie cinétique ½ × m × v², `Epp` l'énergie potentielle de pesanteur m × g × z (nulle au sol) et `Em` l'énergie mécanique, somme des deux.",
      "Le programme trace ensuite les trois énergies en fonction du temps : regarde comment évolue `Em`.",
    ],
    depart: `import matplotlib.pyplot as plt

m = 0.046    # masse de la balle, en kg
g = 9.81     # intensité de la pesanteur, en m/s2
t = [0.00, 0.15, 0.30, 0.45, 0.60,
     0.75, 0.90, 1.05, 1.20, 1.35]       # en s
z = [10.00, 9.88, 9.55, 9.00, 8.24,
     7.25, 6.05, 4.63, 3.01, 1.17]       # en m
v = [0.00, 1.47, 2.93, 4.40, 5.85,
     7.30, 8.73, 10.14, 11.54, 12.91]    # en m/s

Ec, Epp, Em = [], [], []
for i in range(len(t)):
    Ec.append(...)     # énergie cinétique, en J
    Epp.append(...)    # énergie potentielle de pesanteur
    Em.append(...)     # énergie mécanique

print("Em passe de", Em[0], "J à", Em[-1], "J")

plt.plot(t, Ec, label="Ec")
plt.plot(t, Epp, label="Epp")
plt.plot(t, Em, label="Em")
plt.xlabel("t (s)")
plt.ylabel("énergie (J)")
plt.legend()
plt.show()
`,
    tests: [
      {
        nom: "Les trois listes ont une valeur par date",
        code: `assert len(Ec) == len(z) and len(Epp) == len(z) and len(Em) == len(z), "Ec, Epp et Em doivent avoir chacune " + str(len(z)) + " valeurs, une par date : ajoute une valeur à chaque liste à chaque tour de boucle."`,
      },
      {
        nom: "Les énergies cinétiques sont justes",
        code: `_h_att = [0.5 * m * _h_w**2 for _h_w in v]
assert len(Ec) > 0 and all(isinstance(_h_e, (int, float)) for _h_e in Ec), "Ec ne contient pas encore de nombres : remplace les trois points par le calcul de l'énergie cinétique."
assert all(abs(_h_e - _h_b) <= 1e-6 * abs(_h_b) + 1e-12 for _h_e, _h_b in zip(Ec, _h_att)), "Une énergie cinétique est fausse : elle se calcule avec la masse m et la vitesse v[i] de la même date, et le carré s'écrit **2."`,
      },
      {
        nom: "Les énergies potentielles sont justes",
        code: `_h_att = [m * g * _h_h for _h_h in z]
assert len(Epp) > 0 and all(isinstance(_h_e, (int, float)) for _h_e in Epp), "Epp ne contient pas encore de nombres : remplace les trois points par le calcul de l'énergie potentielle de pesanteur."
assert all(abs(_h_e - _h_b) <= 1e-6 * abs(_h_b) + 1e-12 for _h_e, _h_b in zip(Epp, _h_att)), "Une énergie potentielle est fausse : elle se calcule avec m, g et l'altitude z[i] de la même date."`,
      },
      {
        nom: "Les énergies mécaniques sont justes",
        code: `_h_att = [0.5 * m * v[_h_i]**2 + m * g * z[_h_i] for _h_i in range(len(z))]
assert len(Em) > 0 and all(isinstance(_h_e, (int, float)) for _h_e in Em), "Em ne contient pas encore de nombres : remplace les trois points par le calcul de l'énergie mécanique."
if not all(abs(_h_e - _h_b) <= 1e-6 * abs(_h_b) for _h_e, _h_b in zip(Em, _h_att)):
    _h_somme = len(Ec) == len(Em) and len(Epp) == len(Em) and all(isinstance(_h_p, (int, float)) and isinstance(_h_q, (int, float)) and abs(_h_e - (_h_p + _h_q)) <= 1e-9 * (abs(_h_p) + abs(_h_q)) + 1e-12 for _h_e, _h_p, _h_q in zip(Em, Ec, Epp))
    assert not _h_somme, "Em est bien la somme de Ec et de Epp, mais l'une des deux est fausse : regarde leurs vérifications."
    assert False, "Une énergie mécanique est fausse : c'est la somme de l'énergie cinétique et de l'énergie potentielle à la même date."`,
      },
      {
        nom: "La figure montre les trois énergies",
        code: `_h_f = [_h_g for _h_g in _figures_hub if len(_h_g["courbes"]) >= 3]
assert _h_f, "Il manque la figure des trois énergies : garde les trois plt.plot et le plt.show() de la fin du programme."
assert all(len(_h_c["x"]) == len(t) for _h_c in _h_f[0]["courbes"]), "Chaque courbe doit avoir un point par date : trace chaque énergie en fonction de t."`,
      },
    ],
    indices: [
      "Dans la boucle, v[i] et z[i] sont la vitesse et l'altitude de la balle à la date t[i].",
      "Le carré de la vitesse s'écrit v[i]**2 ; le symbole ^ ne calcule pas une puissance.",
      "L'énergie mécanique s'obtient avec les deux valeurs ajoutées juste avant, Ec[i] et Epp[i].",
    ],
    solution: `import matplotlib.pyplot as plt

m = 0.046    # masse de la balle, en kg
g = 9.81     # intensité de la pesanteur, en m/s2
t = [0.00, 0.15, 0.30, 0.45, 0.60,
     0.75, 0.90, 1.05, 1.20, 1.35]       # en s
z = [10.00, 9.88, 9.55, 9.00, 8.24,
     7.25, 6.05, 4.63, 3.01, 1.17]       # en m
v = [0.00, 1.47, 2.93, 4.40, 5.85,
     7.30, 8.73, 10.14, 11.54, 12.91]    # en m/s

Ec, Epp, Em = [], [], []
for i in range(len(t)):
    Ec.append(0.5 * m * v[i]**2)
    Epp.append(m * g * z[i])
    Em.append(Ec[i] + Epp[i])

print("Em passe de", Em[0], "J à", Em[-1], "J")

plt.plot(t, Ec, label="Ec")
plt.plot(t, Epp, label="Epp")
plt.plot(t, Em, label="Em")
plt.xlabel("t (s)")
plt.ylabel("énergie (J)")
plt.legend()
plt.show()
`,
    explication: [
      "Les trois listes se remplissent dans la même boucle : au tour i, Ec[i], Epp[i] et Em[i] concernent la même date t[i].",
      "En tombant, la balle perd de l'énergie potentielle et gagne de l'énergie cinétique.",
      "Em passe de 4,51 J à 4,36 J : sa variation, environ -0,15 J, est le travail des frottements de l'air, une force non conservative. Sans frottements, Em resterait constante.",
    ],
    etat: "brouillon",
  },
  {
    id: "refroidissement-newton",
    titre: "Le refroidissement d'une tasse",
    theme: "energie",
    fiche: 5,
    niveau: 18,
    minutes: 15,
    genre: "completer",
    enonce: [
      "Un thé à 80 °C refroidit dans une pièce à 20 °C. Avec la loi de Newton et le premier principe, sa température θ (en °C) vérifie l'équation dθ/dt = -(θ - θext) / τ, où θext est la température de la pièce et τ le temps caractéristique.",
      "La méthode d'Euler calcule θ pas à pas : pendant une durée `dt` courte, θ varie d'environ (dθ/dt) × dt. Complète la ligne de la boucle qui ajoute à la liste `theta` la température à la date suivante, avec les paramètres `theta_ext`, `tau` et `dt` du programme.",
      "Le programme compare ensuite ton calcul à la solution exacte θ(t) = θext + (θ0 - θext) × e^(-t/τ) et trace les deux courbes.",
    ],
    depart: `import math
import matplotlib.pyplot as plt

theta0 = 80.0     # température initiale du thé, en °C
theta_ext = 20.0  # température de la pièce, en °C
tau = 720.0       # temps caractéristique, en s
dt = 10.0         # pas de calcul, en s
tmax = 1800.0     # durée étudiée, en s

t = [0.0]
theta = [theta0]
while t[-1] < tmax:
    theta.append(...)    # température à la date suivante
    t.append(t[-1] + dt)

print("après", t[-1], "s :", theta[-1], "°C")

exacte = []
for tk in t:
    ecart = (theta0 - theta_ext) * math.exp(-tk / tau)
    exacte.append(theta_ext + ecart)
print("solution exacte :", exacte[-1], "°C")

plt.plot(t, theta, label="méthode d'Euler")
plt.plot(t, exacte, "--", label="solution exacte")
plt.xlabel("t (s)")
plt.ylabel("température (°C)")
plt.legend()
plt.show()
`,
    tests: [
      {
        nom: "La liste theta a une valeur par date",
        code: `assert len(theta) == len(t), "theta doit avoir autant de valeurs que t, soit " + str(len(t)) + " : ajoute une température à chaque tour de boucle."`,
      },
      {
        nom: "La liste theta suit la méthode d'Euler",
        code: `_h_t = [0.0]
_h_th = [theta0]
while _h_t[-1] < tmax and len(_h_t) <= len(theta) + 1:
    _h_th.append(_h_th[-1] - (_h_th[-1] - theta_ext) / tau * dt)
    _h_t.append(_h_t[-1] + dt)
_h_n = [_h_k for _h_k in range(len(theta)) if not isinstance(theta[_h_k], (int, float))]
assert not _h_n, "theta[" + str(_h_n[0] if _h_n else 0) + "] n'est pas un nombre : remplace les trois points par le calcul de la température suivante."
_h_e = [_h_k for _h_k in range(min(len(theta), len(_h_th))) if abs(theta[_h_k] - _h_th[_h_k]) > 1e-6 * abs(_h_th[_h_k])]
assert not _h_e, "theta[" + str(_h_e[0] if _h_e else 0) + "] ne suit pas la méthode d'Euler : la température suivante est la dernière température, theta[-1], plus sa variation pendant dt."
assert len(theta) == len(_h_th), "theta n'a pas le bon nombre de valeurs : la boucle doit s'arrêter à la date tmax."`,
      },
      {
        nom: "La température diminue vers celle de la pièce",
        code: `assert len(theta) > 1 and all(isinstance(_h_z, (int, float)) for _h_z in theta), "theta ne contient pas encore que des nombres : complète d'abord la ligne de la boucle."
assert all(theta[_h_k + 1] < theta[_h_k] for _h_k in range(len(theta) - 1)), "theta ne diminue pas à chaque pas : le thé, plus chaud que la pièce, doit se refroidir. Vérifie le signe de la variation."
assert all(_h_z > theta_ext for _h_z in theta), "theta passe sous la température de la pièce : la variation calculée à chaque pas est trop grande."`,
      },
      {
        nom: "La température finale est proche de la solution exacte",
        code: `import math as _h_m
assert isinstance(theta[-1], (int, float)), "La dernière valeur de theta n'est pas un nombre : complète d'abord la ligne de la boucle."
_h_x = theta_ext + (theta0 - theta_ext) * _h_m.exp(-t[-1] / tau)
assert abs(theta[-1] - _h_x) <= 0.01 * abs(_h_x), "La dernière température s'écarte de plus de 1 % de la solution exacte : garde la méthode d'Euler, avec un pas dt petit devant tau."`,
      },
    ],
    indices: [
      "Pendant un pas dt, θ varie d'environ (dθ/dt) × dt, la dérivée étant calculée avec la dernière température connue, theta[-1].",
      "La température suivante est la dernière température plus cette variation, qui reste négative tant que le thé est plus chaud que la pièce.",
      "La variation pendant un pas s'écrit -(theta[-1] - theta_ext) / tau * dt.",
    ],
    solution: `import math
import matplotlib.pyplot as plt

theta0 = 80.0     # température initiale du thé, en °C
theta_ext = 20.0  # température de la pièce, en °C
tau = 720.0       # temps caractéristique, en s
dt = 10.0         # pas de calcul, en s
tmax = 1800.0     # durée étudiée, en s

t = [0.0]
theta = [theta0]
while t[-1] < tmax:
    theta.append(theta[-1] - (theta[-1] - theta_ext) / tau * dt)
    t.append(t[-1] + dt)

print("après", t[-1], "s :", theta[-1], "°C")

exacte = []
for tk in t:
    ecart = (theta0 - theta_ext) * math.exp(-tk / tau)
    exacte.append(theta_ext + ecart)
print("solution exacte :", exacte[-1], "°C")

plt.plot(t, theta, label="méthode d'Euler")
plt.plot(t, exacte, "--", label="solution exacte")
plt.xlabel("t (s)")
plt.ylabel("température (°C)")
plt.legend()
plt.show()
`,
    explication: [
      "La méthode d'Euler remplace la dérivée par une variation sur un petit pas : θ(t + dt) ≈ θ(t) + (dθ/dt) × dt.",
      "Après 30 min, le calcul donne 24,8 °C et la solution exacte 24,9 °C : l'écart reste faible, car dt = 10 s est petit devant τ = 720 s.",
      "Plus le pas est petit, plus le calcul est proche de la solution exacte, mais plus la boucle fait de tours.",
      "La température tend vers celle de la pièce : au bout de 5τ, soit une heure, il ne reste que 0,4 °C d'écart.",
    ],
    etat: "brouillon",
  },
];
