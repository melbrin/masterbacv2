import "server-only";
import type { ExercicePython } from "@/lib/commun/python/types";

// Mécanique : vitesses et accélérations à partir d'un pointage, vecteurs, lois de Kepler.
export const EXERCICES_MECANIQUE: ExercicePython[] = [
  {
    id: "vitesses-pointage",
    titre: "Des positions aux vitesses",
    theme: "mecanique",
    fiche: 1,
    niveau: 10,
    minutes: 10,
    genre: "completer",
    enonce: [
      "Un pointage vidéo donne les dates `t` (en s) et les positions `x` (en m) d'un chariot sur un rail.",
      "Remplace les trois points de la boucle pour que la liste `v` reçoive, à chaque tour, la vitesse entre deux positions successives.",
      "Lance ton programme : il affiche le nombre de vitesses calculées et la dernière d'entre elles.",
    ],
    depart: `t = [0.0, 0.5, 1.0, 1.5, 2.0]        # dates, en s
x = [0.00, 0.40, 0.95, 1.65, 2.50]   # positions, en m

v = []
for i in range(len(x) - 1):
    v.append(...)    # remplace les trois points par le calcul de la vitesse

print(len(v), "vitesses calculées")
print("dernière vitesse :", v[-1], "m/s")
`,
    tests: [
      {
        nom: "La liste v a une valeur de moins que la liste x",
        code: `assert len(v) == len(x) - 1, "v doit contenir " + str(len(x) - 1) + " vitesses : une de moins que de positions. Ne change pas la boucle."`,
      },
      {
        nom: "Chaque vitesse est un nombre",
        code: `assert all(isinstance(_h_v, (int, float)) for _h_v in v), "v contient autre chose que des nombres : remplace les trois points par un calcul."`,
      },
      {
        nom: "Les vitesses sont justes",
        code: `_h_attendu = [(x[_h_i + 1] - x[_h_i]) / (t[_h_i + 1] - t[_h_i]) for _h_i in range(len(x) - 1)]
assert all(abs(_h_a - _h_b) < 1e-9 for _h_a, _h_b in zip(v, _h_attendu)), "Une vitesse est fausse : divise l'écart entre deux positions par l'écart entre les deux dates correspondantes."`,
      },
    ],
    indices: [
      "Entre les dates t[i] et t[i+1], le chariot passe de la position x[i] à la position x[i+1].",
      "Une vitesse moyenne, c'est une distance parcourue divisée par la durée du parcours.",
      "Le calcul s'écrit avec des parenthèses : (x[i+1] - x[i]) / (t[i+1] - t[i]).",
    ],
    solution: `t = [0.0, 0.5, 1.0, 1.5, 2.0]        # dates, en s
x = [0.00, 0.40, 0.95, 1.65, 2.50]   # positions, en m

v = []
for i in range(len(x) - 1):
    v.append((x[i + 1] - x[i]) / (t[i + 1] - t[i]))

print(len(v), "vitesses calculées")
print("dernière vitesse :", v[-1], "m/s")
`,
    explication: [
      "Avec n positions, on calcule n - 1 vitesses : c'est pourquoi la boucle va jusqu'à len(x) - 1.",
      "Sans les parenthèses, Python calculerait x[i+1] - x[i] / t[i+1] - t[i] : la division passe avant la soustraction.",
      "Les vitesses augmentent (0,8 puis 1,1, 1,4 et 1,7 m/s) : le mouvement est accéléré.",
    ],
    etat: "brouillon",
  },
  {
    id: "accelerations-pointage",
    titre: "Des vitesses aux accélérations",
    theme: "mecanique",
    fiche: 1,
    niveau: 14,
    minutes: 10,
    genre: "completer",
    enonce: [
      "Une balle tombe devant une caméra qui prend 25 images par seconde. Le pointage donne les dates `t` (en s) et les positions `x` (en m) de la balle sur un axe vertical orienté vers le bas. Le programme calcule déjà la liste `v` des vitesses.",
      "Complète la deuxième boucle pour que la liste `a` reçoive les accélérations : à chaque tour, l'écart entre deux vitesses successives, divisé par la durée qui les sépare.",
      "Il y a deux groupes de trois points à remplacer : le nombre de tours de la boucle, puis le calcul. Le programme affiche ensuite les accélérations obtenues.",
    ],
    depart: `# chute d'une balle : axe (Ox) vertical, vers le bas
t = [0.00, 0.04, 0.08, 0.12, 0.16, 0.20, 0.24]  # en s
x = [0.0000, 0.0280, 0.0716, 0.1310,
     0.2061, 0.2971, 0.4037]                    # en m

v = []
for i in range(len(x) - 1):
    v.append((x[i + 1] - x[i]) / (t[i + 1] - t[i]))

a = []
for i in range(...):     # combien d'accélérations ?
    a.append(...)

print(len(v), "vitesses et", len(a), "accélérations")
print("accélérations (m/s2) :", a)
`,
    tests: [
      {
        nom: "La liste a compte deux valeurs de moins que x",
        code: `assert len(a) == len(x) - 2, "a contient " + str(len(a)) + " valeur(s) : il faut une accélération de moins que de vitesses, car chacune utilise deux vitesses successives. Vérifie le nombre de tours de la boucle."`,
      },
      {
        nom: "Chaque accélération est un nombre",
        code: `assert all(isinstance(_h_z, (int, float)) for _h_z in a), "a contient autre chose que des nombres : remplace les trois points de a.append par le calcul de l'accélération."`,
      },
      {
        nom: "Les accélérations sont justes",
        code: `_h_v = [(x[_h_i + 1] - x[_h_i]) / (t[_h_i + 1] - t[_h_i]) for _h_i in range(len(x) - 1)]
_h_att = [(_h_v[_h_i + 1] - _h_v[_h_i]) / (t[_h_i + 1] - t[_h_i]) for _h_i in range(len(_h_v) - 1)]
_h_a = list(a)
assert len(_h_a) > 0 and all(isinstance(_h_z, (int, float)) for _h_z in _h_a), "Les accélérations ne sont pas encore calculées : complète d'abord la boucle."
assert all(abs(_h_z - _h_b) <= 1e-6 * abs(_h_b) for _h_z, _h_b in zip(_h_a, _h_att)), "Une accélération est fausse : divise l'écart entre deux vitesses successives par la durée qui les sépare, avec des parenthèses."`,
      },
    ],
    indices: [
      "Chaque accélération se calcule avec deux vitesses successives, comme chaque vitesse avec deux positions successives.",
      "La boucle des vitesses fait len(x) - 1 tours ; celle des accélérations parcourt de la même façon la liste v.",
      "Le calcul de l'accélération s'écrit (v[i + 1] - v[i]) / (t[i + 1] - t[i]) : les parenthèses comptent.",
    ],
    solution: `# chute d'une balle : axe (Ox) vertical, vers le bas
t = [0.00, 0.04, 0.08, 0.12, 0.16, 0.20, 0.24]  # en s
x = [0.0000, 0.0280, 0.0716, 0.1310,
     0.2061, 0.2971, 0.4037]                    # en m

v = []
for i in range(len(x) - 1):
    v.append((x[i + 1] - x[i]) / (t[i + 1] - t[i]))

a = []
for i in range(len(v) - 1):
    a.append((v[i + 1] - v[i]) / (t[i + 1] - t[i]))

print(len(v), "vitesses et", len(a), "accélérations")
print("accélérations (m/s2) :", a)
`,
    explication: [
      "Avec n positions, on obtient n - 1 vitesses, puis n - 2 accélérations : chaque calcul utilise deux valeurs successives de la liste précédente.",
      "Une boucle qui fait un tour de trop demande v[i + 1] au-delà de la fin de la liste : Python s'arrête sur une erreur IndexError.",
      "Les accélérations restent proches de 9,8 m/s² (entre 9,75 et 9,94 m/s²) : a est à peu près constante, le mouvement est uniformément accéléré. C'est la valeur de g : la balle est en chute libre.",
    ],
    etat: "brouillon",
  },
  {
    id: "vecteurs-vitesse",
    titre: "Tracer les vecteurs vitesse",
    theme: "mecanique",
    fiche: 1,
    niveau: 18,
    minutes: 15,
    genre: "completer",
    enonce: [
      "Le pointage d'un ballon de basket lancé vers le panier donne ses coordonnées `x` et `y` (en m) toutes les 0,10 s, la durée `dt`. L'axe des y est vertical et orienté vers le haut.",
      "Complète d'abord la boucle : `vx` et `vy` reçoivent les coordonnées de la vitesse entre deux positions successives.",
      "Remplace ensuite les trois points du tracé par un appel à `plt.quiver(X, Y, U, V)`, qui dessine pour chaque indice i une flèche de composantes U[i] et V[i] partant du point (X[i], Y[i]). Chaque vecteur vitesse part de la position où commence l'intervalle sur lequel il est calculé.",
    ],
    depart: `import matplotlib.pyplot as plt

dt = 0.10    # durée entre deux images, en s
x = [0.00, 0.46, 0.92, 1.39, 1.85,
     2.31, 2.77, 3.23, 3.69, 4.16]    # en m
y = [0.00, 0.54, 0.99, 1.33, 1.58,
     1.73, 1.78, 1.73, 1.59, 1.35]    # en m

vx = []
vy = []
for i in range(len(x) - 1):
    vx.append(...)
    vy.append(...)

plt.plot(x, y, "o", label="positions")
...    # trace ici les vecteurs vitesse
plt.axis("equal")
plt.xlabel("x (m)")
plt.ylabel("y (m)")
plt.legend()
plt.show()
`,
    tests: [
      {
        nom: "Les listes vx et vy comptent une valeur de moins que x",
        code: `assert len(vx) == len(x) - 1 and len(vy) == len(y) - 1, "vx et vy doivent contenir une valeur par intervalle entre deux positions, soit une de moins que x et y. Ne change pas la boucle."`,
      },
      {
        nom: "Les coordonnées de la vitesse sont justes",
        code: `_h_vx = [(x[_h_i + 1] - x[_h_i]) / dt for _h_i in range(len(x) - 1)]
_h_vy = [(y[_h_i + 1] - y[_h_i]) / dt for _h_i in range(len(y) - 1)]
assert len(vx) > 0 and all(isinstance(_h_z, (int, float)) for _h_z in list(vx) + list(vy)), "vx ou vy contient autre chose que des nombres : remplace les trois points de la boucle par des calculs."
assert all(abs(_h_p - _h_q) <= 1e-6 * abs(_h_q) + 1e-9 for _h_p, _h_q in zip(vx, _h_vx)), "Une valeur de vx est fausse : divise l'écart entre deux abscisses successives par la durée dt."
assert all(abs(_h_p - _h_q) <= 1e-6 * abs(_h_q) + 1e-9 for _h_p, _h_q in zip(vy, _h_vy)), "Une valeur de vy est fausse : fais le même calcul qu'avec x, mais avec les ordonnées y."`,
      },
      {
        nom: "Les flèches sont tracées avec les positions",
        code: `_h_figs = [_h_f for _h_f in _figures_hub if _h_f["fleches"]]
assert _h_figs, "La figure ne montre aucune flèche : remplace les trois points du tracé par un appel à plt.quiver, avant plt.show()."
assert _h_figs[0]["courbes"], "Les flèches sont sur une figure à part : appelle plt.quiver avant plt.show(), pour les tracer avec les positions."`,
      },
      {
        nom: "Il y a une flèche par vecteur vitesse",
        code: `_h_figs = [_h_f for _h_f in _figures_hub if _h_f["fleches"]]
assert _h_figs, "Aucune flèche à compter : trace d'abord les vecteurs vitesse avec plt.quiver."
_h_n = sum(len(_h_q["x"]) for _h_q in _h_figs[0]["fleches"])
assert _h_n == len(x) - 1, "La figure montre " + str(_h_n) + " flèche(s) : il en faut une par vitesse calculée, soit une de moins que de positions."`,
      },
      {
        nom: "Chaque flèche part du bon point, dans le sens de la vitesse",
        code: `import math as _h_m
_h_vx = [(x[_h_i + 1] - x[_h_i]) / dt for _h_i in range(len(x) - 1)]
_h_vy = [(y[_h_i + 1] - y[_h_i]) / dt for _h_i in range(len(y) - 1)]
_h_figs = [_h_f for _h_f in _figures_hub if _h_f["fleches"]]
assert _h_figs, "Aucune flèche à vérifier : trace d'abord les vecteurs vitesse avec plt.quiver."
_h_fl = []
for _h_q in _h_figs[0]["fleches"]:
    _h_fl += list(zip(_h_q["x"], _h_q["y"], _h_q["u"], _h_q["v"]))
_h_depart = []
for _h_X, _h_Y, _h_U, _h_V in _h_fl:
    _h_j = [_h_i for _h_i in range(len(x) - 1) if _h_X is not None and _h_Y is not None and abs(_h_X - x[_h_i]) < 1e-6 and abs(_h_Y - y[_h_i]) < 1e-6]
    assert _h_j, "Une flèche ne part pas du bon point : la vitesse calculée entre les positions i et i + 1 se dessine à partir du point (x[i], y[i]), et la dernière position n'a pas de flèche."
    _h_depart.append(_h_j[0])
assert len(set(_h_depart)) == len(x) - 1, "Il manque une flèche : chaque position, sauf la dernière, porte son vecteur vitesse."
for (_h_X, _h_Y, _h_U, _h_V), _h_i in zip(_h_fl, _h_depart):
    assert _h_U is not None and _h_V is not None, "Une flèche a une composante qui n'est pas un nombre fini : vérifie vx et vy."
    _h_c = _h_U * _h_vy[_h_i] - _h_V * _h_vx[_h_i]
    _h_p = _h_U * _h_vx[_h_i] + _h_V * _h_vy[_h_i]
    _h_l = _h_m.hypot(_h_U, _h_V) * _h_m.hypot(_h_vx[_h_i], _h_vy[_h_i])
    assert _h_p > 0 and abs(_h_c) <= 1e-6 * _h_l, "Une flèche n'a pas la direction du vecteur vitesse : celle qui part du point (x[i], y[i]) a pour composantes vx[i] puis vy[i]."
# toutes les flèches à la même échelle : chacune vaut k fois sa vitesse, avec le même k pour toutes
_h_k = [(_h_U * _h_vx[_h_i] + _h_V * _h_vy[_h_i]) / (_h_vx[_h_i] ** 2 + _h_vy[_h_i] ** 2) for (_h_X, _h_Y, _h_U, _h_V), _h_i in zip(_h_fl, _h_depart)]
assert all(abs(_h_x - _h_k[0]) <= 1e-6 * abs(_h_k[0]) for _h_x in _h_k), "Les flèches n'ont pas toutes la même échelle : chacune doit être proportionnelle à sa vitesse, avec le même facteur pour toutes."`,
      },
    ],
    indices: [
      "Chaque coordonnée de la vitesse se calcule comme une vitesse sur un axe : l'écart entre deux positions successives, divisé par dt.",
      "plt.quiver attend quatre listes de même longueur ; or vx et vy ont une valeur de moins que x et y.",
      "x[:-1] est la liste x sans sa dernière valeur : ce sont les points de départ des vecteurs vitesse.",
    ],
    solution: `import matplotlib.pyplot as plt

dt = 0.10    # durée entre deux images, en s
x = [0.00, 0.46, 0.92, 1.39, 1.85,
     2.31, 2.77, 3.23, 3.69, 4.16]    # en m
y = [0.00, 0.54, 0.99, 1.33, 1.58,
     1.73, 1.78, 1.73, 1.59, 1.35]    # en m

vx = []
vy = []
for i in range(len(x) - 1):
    vx.append((x[i + 1] - x[i]) / dt)
    vy.append((y[i + 1] - y[i]) / dt)

plt.plot(x, y, "o", label="positions")
plt.quiver(x[:-1], y[:-1], vx, vy, label="vitesses")
plt.axis("equal")
plt.xlabel("x (m)")
plt.ylabel("y (m)")
plt.legend()
plt.show()
`,
    explication: [
      "vx reste proche de 4,6 m/s : aucune force horizontale n'agit sur le ballon, les frottements de l'air étant négligés.",
      "vy diminue d'environ 1,0 m/s toutes les 0,10 s, soit une accélération verticale d'environ 9,8 m/s² vers le bas : c'est l'effet du poids.",
      "Au sommet de la trajectoire, vy change de signe : le vecteur vitesse y est horizontal, mais pas nul.",
      "x[:-1] et y[:-1] retirent le dernier point : il faut autant de points de départ que de vecteurs.",
    ],
    etat: "brouillon",
  },
  {
    id: "troisieme-loi-kepler",
    titre: "La troisième loi de Kepler",
    theme: "mecanique",
    fiche: 3,
    niveau: 14,
    minutes: 12,
    genre: "ecrire",
    enonce: [
      "Le programme donne les périodes de révolution `T` (converties en secondes) et les demi-grands axes `a` (en m) des orbites des quatre satellites de Jupiter découverts par Galilée : Io, Europe, Ganymède et Callisto.",
      "Écris la fonction `rapport_kepler(T, a)`, qui renvoie le quotient T² / a³. Dans la fonction, `T` et `a` sont deux nombres, la période et le demi-grand axe d'un seul satellite, et non les listes du programme.",
      "Remplis ensuite la liste `rapports` avec le rapport de chacun des quatre satellites, dans l'ordre des listes. Le programme l'affiche : regarde si les quatre rapports sont égaux, comme l'annonce la troisième loi de Kepler.",
    ],
    depart: `# Io, Europe, Ganymède et Callisto
Tj = [1.769, 3.551, 7.155, 16.689]  # périodes, en jours
a = [4.217e8, 6.709e8, 1.070e9, 1.883e9]  # en m

T = []
for i in range(len(Tj)):
    T.append(Tj[i] * 24 * 3600)    # périodes, en s


def rapport_kepler(T, a):
    # renvoie le quotient T² / a³
    ...


print(rapport_kepler(2.0, 1.0))    # 4.0 attendu

rapports = []
...    # un rapport par satellite, dans la liste rapports

print("rapports :", rapports)
`,
    tests: [
      {
        nom: "La fonction renvoie un nombre",
        code: `_h_r = rapport_kepler(2.0, 1.0)
assert _h_r is not None, "Ta fonction ne renvoie rien : termine-la par return suivi du résultat."
assert not isinstance(_h_r, tuple), "Ta fonction renvoie plusieurs valeurs, séparées par une virgule : elle doit renvoyer un seul nombre, le quotient de T² par a³."
assert isinstance(_h_r, (int, float)), "Ta fonction doit renvoyer un nombre, calculé avec ses deux paramètres."`,
      },
      {
        nom: "La fonction donne T² / a³ sur des cas simples",
        code: `for _h_T, _h_a, _h_txt in [(2, 1, "T = 2 et a = 1, il faut 2² / 1³ = 4"), (3, 1, "T = 3 et a = 1, il faut 3² / 1³ = 9"), (1, 2, "T = 1 et a = 2, il faut 1² / 2³ = 0,125"), (4, 2, "T = 4 et a = 2, il faut 4² / 2³ = 2")]:
    _h_r = rapport_kepler(_h_T, _h_a)
    _h_e = _h_T**2 / _h_a**3
    assert isinstance(_h_r, (int, float)), "rapport_kepler(" + str(_h_T) + ", " + str(_h_a) + ") ne renvoie pas un nombre : la fonction doit se terminer par return suivi du quotient."
    assert abs(_h_r - _h_e) <= 1e-9 * _h_e, "Pour " + _h_txt + " : vérifie les puissances, un carré pour T et un cube pour a, puis le signe de la division."`,
      },
      {
        nom: "La liste rapports contient le rapport de chaque satellite",
        code: `_h_T = [_h_j * 24 * 3600 for _h_j in Tj]
_h_att = [_h_T[_h_i]**2 / a[_h_i]**3 for _h_i in range(len(a))]
_h_l = list(rapports)
assert len(_h_l) == len(_h_att), "rapports contient " + str(len(_h_l)) + " valeur(s) : il en faut une par satellite."
assert not any(_h_z is None for _h_z in _h_l), "rapports contient None, la valeur d'une fonction qui ne renvoie rien : termine rapport_kepler par return suivi du résultat."
assert all(isinstance(_h_z, (int, float)) for _h_z in _h_l), "rapports contient autre chose que des nombres : ajoute-lui, pour chaque satellite, la valeur que renvoie rapport_kepler."
assert all(abs(_h_z - _h_b) <= 1e-6 * _h_b for _h_z, _h_b in zip(_h_l, _h_att)), "Un rapport est faux : pour chaque satellite, utilise sa période en secondes (liste T) et son demi-grand axe (liste a), au même indice."`,
      },
    ],
    indices: [
      "Une fonction calcule avec ses paramètres, ici les nombres T et a, puis renvoie le résultat avec return.",
      "En Python, le carré s'écrit **2 et le cube **3 ; le symbole ^ ne calcule pas une puissance.",
      "Pour remplir la liste, une boucle sur les indices i des satellites ajoute à rapports la valeur que renvoie la fonction pour T[i] et a[i].",
    ],
    solution: `# Io, Europe, Ganymède et Callisto
Tj = [1.769, 3.551, 7.155, 16.689]  # périodes, en jours
a = [4.217e8, 6.709e8, 1.070e9, 1.883e9]  # en m

T = []
for i in range(len(Tj)):
    T.append(Tj[i] * 24 * 3600)    # périodes, en s


def rapport_kepler(T, a):
    # renvoie le quotient T² / a³
    return T**2 / a**3


print(rapport_kepler(2.0, 1.0))    # 4.0 attendu

rapports = []
for i in range(len(T)):
    rapports.append(rapport_kepler(T[i], a[i]))

print("rapports :", rapports)
`,
    explication: [
      "Les quatre rapports valent environ 3,12 × 10⁻¹⁶ s²·m⁻³ : T² / a³ est le même pour tous les satellites de Jupiter, comme l'annonce la troisième loi de Kepler.",
      "Comme T² / a³ = 4π² / (G × M), avec G = 6,67 × 10⁻¹¹ N·m²·kg⁻², on en tire la masse de Jupiter, M = 4π² × a³ / (G × T²), soit environ 1,90 × 10²⁷ kg : on pèse ainsi Jupiter sans connaître la masse de ses satellites.",
      "Avec des périodes en jours, chaque rapport serait 86 400² fois trop petit : les calculs se font en unités SI.",
      "Dans la fonction, T et a sont les valeurs reçues à l'appel : rapport_kepler(T[i], a[i]) lui donne celles du satellite i.",
    ],
    etat: "brouillon",
  },
];
