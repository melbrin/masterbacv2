import "server-only";
import type { ExercicePython } from "@/lib/commun/python/types";

// Mesures et incertitudes : moyenne et écart-type, histogramme d'une série, incertitude composée par la méthode de Monte-Carlo.
export const EXERCICES_MESURE: ExercicePython[] = [
  {
    id: "moyenne-ecart-type",
    titre: "Moyenne et écart-type sans numpy",
    theme: "mesure",
    fiche: 14,
    niveau: 14,
    minutes: 12,
    genre: "ecrire",
    enonce: [
      "Écris deux fonctions, sans numpy ni le module statistics : `moyenne(liste)` renvoie la moyenne m des valeurs de `liste`, et `ecart_type(liste)` renvoie leur écart-type expérimental s.",
      "Pour n valeurs x1, x2, ..., xn de moyenne m, l'écart-type expérimental vaut s = √(S / (n - 1)), où S est la somme des carrés des écarts à la moyenne : (x1 - m)² + (x2 - m)² + ... + (xn - m)². On divise par n - 1, et non par n.",
      "Complète ensuite la ligne de `u`, l'incertitude-type de la moyenne : u = s / √n. Les lignes du bas essaient le tout sur la liste `t` des durées de chute d'une bille, chronométrées par dix élèves.",
    ],
    depart: `import math


def moyenne(liste):
    # renvoie la moyenne des valeurs de liste
    ...


def ecart_type(liste):
    # renvoie l'écart-type expérimental (n - 1)
    ...


# durées de chute d'une bille, chronométrées, en s
t = [1.01, 0.98, 1.03, 0.99, 1.02,
     1.00, 0.97, 1.04, 1.01, 0.99]
n = len(t)
tm = moyenne(t)        # durée moyenne
s = ecart_type(t)      # écart-type expérimental
u = ...                # incertitude-type de la moyenne

print("moyenne :", tm, "s")
print("écart-type :", s, "s")
print("incertitude-type :", u, "s")
`,
    tests: [
      {
        nom: "La fonction moyenne est juste",
        code: `import statistics as _h_st
_h_r = moyenne([2, 4])
assert _h_r is not None, "Ta fonction moyenne ne renvoie rien : termine-la par return suivi du résultat."
assert abs(_h_r - 3) < 1e-9, "moyenne([2, 4]) doit valoir 3 : divise la somme des valeurs par leur nombre."
for _h_l in ([5.0], [1, 2, 3, 4], [9.79, 9.83, 9.81], t):
    _h_m = _h_st.mean(_h_l)
    assert abs(moyenne(_h_l) - _h_m) <= 1e-9 * max(1.0, abs(_h_m)), "moyenne donne un résultat faux pour une liste de " + str(len(_h_l)) + " valeurs : elle doit marcher quel que soit le nombre de valeurs."`,
      },
      {
        nom: "La fonction ecart_type divise par n - 1",
        code: `import math as _h_ma
import statistics as _h_st
_h_r = ecart_type([2, 4, 6])
assert _h_r is not None, "Ta fonction ecart_type ne renvoie rien : termine-la par return suivi du résultat."
assert abs(_h_r - _h_ma.sqrt(8 / 3)) > 1e-9, "ecart_type divise par n : l'écart-type expérimental divise la somme des carrés des écarts par n - 1."
assert abs(_h_r - 4) > 1e-9, "ecart_type renvoie le carré de l'écart-type : il manque la racine carrée, math.sqrt."
if abs(_h_r - 2) > 1e-9 and len(t) > 1:
    # le nombre de valeurs du programme (n = len(t)) à la place de celui de la liste reçue
    _h_N = len(t)
    _h_faux = [8 / (_h_N - 1), 8 / _h_N, _h_ma.sqrt(8 / (_h_N - 1)), _h_ma.sqrt(8 / _h_N)]
    assert all(abs(_h_r - _h_x) > 1e-9 for _h_x in _h_faux), "ecart_type se sert du n du programme (" + str(_h_N) + " valeurs) : dans la fonction, le nombre de valeurs est celui de la liste reçue, len(liste)."
assert abs(_h_r - 2) < 1e-9, "ecart_type([2, 4, 6]) doit valoir 2 : vérifie les carrés des écarts à la moyenne, la division par n - 1 et la racine carrée."
for _h_l in ([1, 3], [9.79, 9.83, 9.81, 9.77], t):
    _h_s = _h_st.stdev(_h_l)
    assert abs(ecart_type(_h_l) - _h_s) <= 1e-9 * _h_s, "ecart_type donne un résultat faux pour une liste de " + str(len(_h_l)) + " valeurs : vérifie que chaque écart à la moyenne est élevé au carré, et que n vaut len(liste)."`,
      },
      {
        nom: "Des valeurs toutes égales ont un écart-type nul",
        code: `_h_r = ecart_type([9.81, 9.81, 9.81, 9.81])
assert _h_r is not None, "Ta fonction ecart_type ne renvoie rien : termine-la par return suivi du résultat."
assert abs(_h_r) < 1e-9, "Pour des valeurs toutes égales, ecart_type doit renvoyer 0 : tous les écarts à la moyenne sont nuls."`,
      },
      {
        nom: "L'incertitude-type u de la moyenne est juste",
        code: `import math as _h_ma
import statistics as _h_st
_h_u = _h_st.stdev(t) / _h_ma.sqrt(len(t))
assert u is not Ellipsis and u is not None, "Remplace les trois points de la ligne de u par le calcul de l'incertitude-type."
if s is not None and abs(float(u) - float(s) / _h_ma.sqrt(len(t))) <= 1e-9 * abs(float(s)) + 1e-15:
    assert abs(float(u) - _h_u) <= 1e-9 * _h_u, "u est bien calculé à partir de s, mais s est faux : corrige d'abord la fonction ecart_type."
assert abs(float(u) - _h_u) <= 1e-9 * _h_u, "u n'a pas la bonne valeur : relis la formule de l'énoncé ; la racine carrée s'écrit math.sqrt."`,
      },
      {
        nom: "Les deux fonctions calculent sans numpy ni statistics",
        code: `# on juge d'où viennent les objets que les fonctions utilisent, pas leur nom : une fonction de l'élève
# appelée variance est acceptée (et son code est lu à son tour), average importé de numpy ne l'est pas
import dis as _h_dis
import types as _h_ty
_h_de = {"numpy": "de numpy", "statistics": "du module statistics"}
def _h_origine(_h_o):
    # « numpy » ou « statistics » pour un module ou une fonction qui en vient, sinon None
    if isinstance(_h_o, _h_ty.ModuleType):
        _h_m = _h_o.__name__
    elif callable(_h_o):
        _h_m = str(getattr(_h_o, "__module__", "") or "")
    else:
        return None
    _h_m = _h_m.split(".")[0]
    return _h_m if _h_m in _h_de else None
def _h_fautif(_h_f, _h_nom, _h_vus):
    # ce qui vient de numpy ou de statistics dans la fonction, ou dans les fonctions qu'elle appelle
    _h_vus.add(id(_h_f))
    _h_codes = [_h_f.__code__]
    while _h_codes:
        _h_c = _h_codes.pop()
        _h_codes += [_h_k for _h_k in _h_c.co_consts if isinstance(_h_k, _h_ty.CodeType)]
        for _h_i in _h_dis.get_instructions(_h_c):
            if _h_i.opname == "IMPORT_NAME" and str(_h_i.argval).split(".")[0] in _h_de:
                return _h_nom, None, str(_h_i.argval).split(".")[0]
            if _h_i.opname in ("LOAD_GLOBAL", "LOAD_NAME") and _h_i.argval in _h_f.__globals__:
                _h_o = _h_f.__globals__[_h_i.argval]
                if _h_origine(_h_o):
                    return _h_nom, _h_i.argval, _h_origine(_h_o)
                if getattr(_h_o, "__module__", None) == "__main__" and hasattr(_h_o, "__code__") and id(_h_o) not in _h_vus:
                    _h_r = _h_fautif(_h_o, _h_i.argval, _h_vus)
                    if _h_r:
                        return _h_r
    return None
assert all(getattr(_h_f, "__module__", None) == "__main__" and hasattr(_h_f, "__code__") for _h_f in (moyenne, ecart_type)), "moyenne et ecart_type doivent être tes propres fonctions, écrites avec def."
_h_vus = set()
_h_r = _h_fautif(moyenne, "moyenne", _h_vus) or _h_fautif(ecart_type, "ecart_type", _h_vus)
if _h_r:
    if _h_r[1] is None:
        _h_quoi = "importe " + _h_r[2]
    elif _h_r[1] == _h_r[2]:
        _h_quoi = "se sert " + _h_de[_h_r[2]]
    else:
        _h_quoi = "se sert de « " + _h_r[1] + " », qui vient " + _h_de[_h_r[2]]
    assert False, "Ta fonction " + _h_r[0] + " " + _h_quoi + " : fais le calcul toi-même, sans numpy ni le module statistics. Une boucle, ou sum et len, suffisent, et math.sqrt donne la racine carrée."`,
      },
    ],
    indices: [
      "Une fonction calcule avec son paramètre liste, puis renvoie le résultat avec return : elle n'affiche rien. len(liste) donne le nombre de valeurs de la liste.",
      "Pour l'écart-type, calcule d'abord la moyenne m avec ta fonction moyenne, puis ajoute à une somme, dans une boucle, chaque carré (x - m)**2.",
      "Divise cette somme par len(liste) - 1, puis prends la racine carrée avec math.sqrt. L'incertitude-type u se calcule ensuite avec s et n.",
    ],
    solution: `import math


def moyenne(liste):
    somme = 0
    for x in liste:
        somme = somme + x
    return somme / len(liste)


def ecart_type(liste):
    m = moyenne(liste)
    somme = 0
    for x in liste:
        somme = somme + (x - m)**2
    return math.sqrt(somme / (len(liste) - 1))


# durées de chute d'une bille, chronométrées, en s
t = [1.01, 0.98, 1.03, 0.99, 1.02,
     1.00, 0.97, 1.04, 1.01, 0.99]
n = len(t)
tm = moyenne(t)        # durée moyenne
s = ecart_type(t)      # écart-type expérimental
u = s / math.sqrt(n)   # incertitude-type de la moyenne

print("moyenne :", tm, "s")
print("écart-type :", s, "s")
print("incertitude-type :", u, "s")
`,
    explication: [
      "Une fonction peut en appeler une autre : ecart_type se sert de moyenne, ce qui évite d'écrire deux fois le même calcul.",
      "Avec n - 1 au dénominateur, s est l'écart-type expérimental : celui que la calculatrice note s ou σn-1, et que donne np.std(liste, ddof=1).",
      "Ici, la durée moyenne vaut 1,004 s, l'écart-type 0,022 s et l'incertitude-type u = 0,022 / √10 = 0,007 s : on écrit t = 1,004 s avec u(t) = 0,007 s.",
    ],
    etat: "brouillon",
  },
  {
    id: "histogramme-mesures",
    titre: "L'histogramme d'une série de mesures",
    theme: "mesure",
    fiche: 14,
    niveau: 10,
    minutes: 8,
    genre: "completer",
    enonce: [
      "Vingt binômes ont mesuré la célérité v du son dans l'air de la salle, à 20 °C. La liste `mesures` contient leurs résultats, en m/s.",
      "Remplace d'abord les trois points de la ligne `plt.hist` pour tracer l'histogramme de ces mesures en 6 classes : le paramètre `bins` donne le nombre de classes. Chaque barre compte les mesures de sa classe.",
      "Remplace ensuite les deux lignes de trois points par une légende pour chaque axe, avec `plt.xlabel` et `plt.ylabel` : la grandeur et son unité en abscisse, ce que compte une barre en ordonnée. Le programme se termine par `plt.show()`, qui affiche le graphique.",
    ],
    depart: `import matplotlib.pyplot as plt

# célérité du son mesurée par vingt binômes, en m/s
mesures = [342, 345, 339, 344, 347, 341, 343,
           346, 340, 344, 338, 343, 345, 342,
           336, 341, 344, 342, 343, 343]

plt.hist(mesures, bins=...)    # nombre de classes
...    # légende de l'axe des abscisses
...    # légende de l'axe des ordonnées
plt.show()
`,
    tests: [
      {
        nom: "La figure est affichée avec plt.show()",
        code: `_h_f = [_h_x for _h_x in _figures_hub if _h_x["barres"]]
assert _h_f, "Aucun histogramme n'est tracé : appelle plt.hist avec la liste des mesures."
assert _h_f[0]["montree"], "Ton programme ne demande pas d'afficher la figure : termine-le par plt.show(), avec ses parenthèses."`,
      },
      {
        nom: "Un histogramme est tracé",
        code: `_h_f = [_h_x for _h_x in _figures_hub if _h_x["barres"]]
assert _h_f, "Aucun histogramme n'est tracé : appelle plt.hist avec la liste des mesures."`,
      },
      {
        nom: "Les barres comptent les vingt mesures",
        code: `_h_f = [_h_x for _h_x in _figures_hub if _h_x["barres"]]
assert _h_f, "Aucun histogramme n'est tracé : appelle plt.hist avec la liste des mesures."
_h_total = sum(_h_b["h"] for _h_b in _h_f[0]["barres"])
assert abs(_h_total - len(mesures)) < 1e-9, "Les barres doivent compter les " + str(len(mesures)) + " mesures en tout : trace une seule fois l'histogramme de la liste mesures entière, sans l'option density."`,
      },
      {
        nom: "L'histogramme a 6 classes",
        code: `_h_f = [_h_x for _h_x in _figures_hub if _h_x["barres"]]
assert _h_f, "Aucun histogramme n'est tracé : appelle plt.hist avec la liste des mesures."
assert len(_h_f[0]["barres"]) == 6, "L'histogramme doit avoir 6 classes, donc 6 barres : c'est le rôle du paramètre bins."`,
      },
      {
        nom: "La légende de l'abscisse donne la grandeur et son unité",
        code: `import re as _h_re
import matplotlib.pyplot as _h_plt
assert callable(getattr(_h_plt, "xlabel", None)), "plt.xlabel est une fonction : on l'appelle avec des parenthèses et le texte entre guillemets, sans signe =."
_h_f = [_h_x for _h_x in _figures_hub if _h_x["barres"]]
assert _h_f, "Aucun histogramme n'est tracé : appelle plt.hist avec la liste des mesures."
_h_s = (_h_f[0]["xlabel"] or "").strip()
assert _h_s, "L'axe des abscisses n'a pas de légende : écris la grandeur et son unité avec plt.xlabel, avant plt.show()."
# l'unité de la célérité, quelle que soit sa graphie : m/s, m.s-1, m·s⁻¹, m s^-1, mètres par seconde...
_h_n = _h_s.lower()
for _h_a, _h_b in (("⁻", "-"), ("−", "-"), ("¹", "1"), ("**", ""), ("^", "")):
    _h_n = _h_n.replace(_h_a, _h_b)
_h_u = _h_re.search(r"(?<![^\\W\\d_])m\\s*/\\s*s(?![²2])|(?<![^\\W\\d_])m\\s*[.·⋅*×\\s]?\\s*s\\s*[({]?\\s*-\\s*1|m[eè]tres?\\s*(/|par)\\s*s", _h_n)
assert _h_u, "La légende de l'abscisse doit dire la grandeur mesurée et son unité ; celle de l'ordonnée, ce que compte une barre."
assert _h_re.search(r"[^\\W\\d_]", _h_n[:_h_u.start()] + _h_n[_h_u.end():]), "La légende de l'abscisse donne l'unité : écris aussi le nom ou le symbole de la grandeur mesurée."`,
      },
      {
        nom: "La légende de l'ordonnée dit ce que compte une barre",
        code: `import importlib as _h_il
import re as _h_re
import matplotlib.pyplot as _h_plt
_h_ok = callable(getattr(_h_plt, "ylabel", None))
if not (_h_ok and callable(getattr(_h_plt, "xlabel", None))):
    # plt.xlabel = "..." a remplacé la fonction par un texte : on rend au petit pyplot ses fonctions, pour que le
    # programme corrigé marche à l'exécution suivante (Python reste chargé d'une exécution à l'autre)
    _h_il.reload(_h_plt)
assert _h_ok, "plt.ylabel est une fonction : on l'appelle avec des parenthèses et le texte entre guillemets, sans signe =."
_h_f = [_h_x for _h_x in _figures_hub if _h_x["barres"]]
assert _h_f, "Aucun histogramme n'est tracé : appelle plt.hist avec la liste des mesures."
_h_s = (_h_f[0]["ylabel"] or "").strip()
assert _h_s, "L'axe des ordonnées n'a pas de légende : écris ce que compte une barre avec plt.ylabel, avant plt.show()."
_h_n = _h_s.lower()
for _h_a, _h_b in (("⁻", "-"), ("−", "-"), ("¹", "1"), ("**", ""), ("^", "")):
    _h_n = _h_n.replace(_h_a, _h_b)
_h_u = _h_re.search(r"(?<![^\\W\\d_])m\\s*/\\s*s(?![²2])|(?<![^\\W\\d_])m\\s*[.·⋅*×\\s]?\\s*s\\s*[({]?\\s*-\\s*1|m[eè]tres?\\s*(/|par)\\s*s", _h_n)
assert not _h_u, "L'unité de la célérité n'a pas sa place en ordonnée : la légende de l'ordonnée dit ce que compte une barre, la grandeur et son unité vont en abscisse."`,
      },
    ],
    indices: [
      "Le nombre de classes se donne au paramètre bins de plt.hist : remplace les trois points par ce nombre.",
      "plt.xlabel et plt.ylabel reçoivent chacune un texte entre guillemets, par exemple la grandeur suivie de son unité entre parenthèses.",
      "plt.xlabel et plt.ylabel s'appellent comme plt.hist, avec des parenthèses : le texte se place entre elles, sans signe =. Les légendes se donnent avant plt.show().",
    ],
    solution: `import matplotlib.pyplot as plt

# célérité du son mesurée par vingt binômes, en m/s
mesures = [342, 345, 339, 344, 347, 341, 343,
           346, 340, 344, 338, 343, 345, 342,
           336, 341, 344, 342, 343, 343]

plt.hist(mesures, bins=6)      # nombre de classes
plt.xlabel("v (m/s)")
plt.ylabel("nombre de mesures")
plt.show()
`,
    explication: [
      "plt.hist range chaque mesure dans une classe et trace une barre par classe : la hauteur d'une barre est le nombre de mesures de la classe, et les six hauteurs font 20 en tout.",
      "La largeur de l'histogramme montre la dispersion des mesures : plus elles sont dispersées, plus il est large et plus l'écart-type est grand. Ici, les mesures vont de 336 à 347 m/s, avec une moyenne de 342,4 m/s et un écart-type de 2,7 m/s.",
      "Une mesure isolée ne dit rien de cette dispersion : c'est pour cela qu'on répète une mesure quand on évalue son incertitude-type par une méthode de type A.",
    ],
    etat: "brouillon",
  },
  {
    id: "monte-carlo-pendule",
    titre: "Simuler une incertitude composée",
    theme: "mesure",
    fiche: 14,
    niveau: 18,
    minutes: 15,
    genre: "completer",
    enonce: [
      "Pour mesurer g avec un pendule simple, un groupe a trouvé une longueur `L` = 0,800 m, d'incertitude-type u(L) = 0,003 m (variable `uL`), et une période `T` = 1,795 s, d'incertitude-type u(T) = 0,010 s (variable `uT`). On en déduit g = 4π²L / T².",
      "La méthode de Monte-Carlo simule de nombreuses mesures possibles. À chaque tirage, une longueur et une période sont tirées au hasard selon des lois normales centrées sur L et T, d'écarts-types u(L) et u(T) : `random.gauss(a, b)` tire un nombre selon une loi normale de moyenne a et d'écart-type b.",
      "Remplace les trois points de la boucle : `Lt` et `Tt` reçoivent la longueur et la période tirées, `g` la valeur de g calculée avec ces deux valeurs. π s'écrit `np.pi`.",
      "Le programme affiche ensuite la moyenne des `N` valeurs de g et leur écart-type, qui est l'incertitude-type u(g).",
    ],
    depart: `import random
import numpy as np

L, uL = 0.800, 0.003    # longueur et u(L), en m
T, uT = 1.795, 0.010    # période et u(T), en s
N = 20000               # nombre de tirages

Lt = []    # longueurs tirées, en m
Tt = []    # périodes tirées, en s
g = []     # valeurs de g, en m/s2
for i in range(N):
    Lt.append(...)
    Tt.append(...)
    g.append(...)

print("g moyen :", round(np.mean(g), 3), "m/s2")
print("u(g) :", round(np.std(g, ddof=1), 3), "m/s2")
`,
    tests: [
      {
        nom: "La liste g contient N valeurs, avec N d'au moins 10 000",
        code: `assert N >= 10000, "Avec moins de 10 000 tirages, la moyenne et l'écart-type changent trop d'une exécution à l'autre : garde N = 20000."
assert len(g) == N, "g doit contenir une valeur par tirage, N en tout : ajoute une valeur à chaque tour de boucle."`,
      },
      {
        nom: "Les longueurs et les périodes suivent les bonnes lois normales",
        code: `def _h_stats(_h_x):
    _h_v = [float(_h_y) for _h_y in _h_x]
    _h_m = sum(_h_v) / len(_h_v)
    return _h_m, (sum((_h_y - _h_m)**2 for _h_y in _h_v) / (len(_h_v) - 1)) ** 0.5
assert len(Lt) == N and len(Tt) == N, "Lt et Tt doivent recevoir une valeur par tirage, N chacune."
_h_m, _h_s = _h_stats(Lt)
assert abs(_h_m - L) <= 0.1 * uL and abs(_h_s - uL) <= 0.1 * uL, "Les longueurs tirées ne suivent pas la bonne loi : leur moyenne doit être L et leur écart-type u(L)."
_h_m, _h_s = _h_stats(Tt)
assert abs(_h_m - T) <= 0.1 * uT and abs(_h_s - uT) <= 0.1 * uT, "Les périodes tirées ne suivent pas la bonne loi : leur moyenne doit être T et leur écart-type u(T)."`,
      },
      {
        nom: "Chaque valeur de g est calculée avec la longueur et la période de son tirage",
        code: `import math as _h_ma
assert len(g) == len(Lt) == len(Tt), "g, Lt et Tt doivent avoir autant de valeurs : une par tirage."
_h_ok = all(abs(float(_h_g) - 4 * _h_ma.pi**2 * float(_h_l) / float(_h_t)**2) <= 1e-6 * abs(float(_h_g)) for _h_g, _h_l, _h_t in zip(g, Lt, Tt))
assert _h_ok, "Une valeur de g est fausse : calcule 4π²L / T² avec la longueur et la période qui viennent d'être tirées, et np.pi pour π."`,
      },
      {
        nom: "La moyenne des valeurs de g est proche de 4π²L / T², à 0,5 % près",
        code: `import math as _h_ma
_h_g0 = 4 * _h_ma.pi**2 * L / T**2
_h_v = [float(_h_x) for _h_x in g]
_h_m = sum(_h_v) / len(_h_v)
assert abs(_h_m - _h_g0) <= 0.005 * _h_g0, "La moyenne des valeurs de g s'écarte de plus de 0,5 % de 4π²L / T² : vérifie les tirages et le calcul de g."`,
      },
      {
        nom: "L'écart-type des valeurs de g est proche de l'incertitude-type composée, à 10 % près",
        code: `import math as _h_ma
_h_g0 = 4 * _h_ma.pi**2 * L / T**2
_h_u = _h_g0 * _h_ma.sqrt((uL / L)**2 + (2 * uT / T)**2)
_h_v = [float(_h_x) for _h_x in g]
_h_m = sum(_h_v) / len(_h_v)
_h_s = _h_ma.sqrt(sum((_h_x - _h_m)**2 for _h_x in _h_v) / (len(_h_v) - 1))
assert abs(_h_s - _h_u) <= 0.1 * _h_u, "L'écart-type des valeurs de g s'écarte de plus de 10 % de l'incertitude-type composée : à chaque tirage, L et T doivent varier tous les deux."`,
      },
    ],
    indices: [
      "À chaque tour de boucle, on tire une longueur autour de L, avec l'écart-type uL, puis une période autour de T, avec l'écart-type uT.",
      "random.gauss reçoit deux nombres : la moyenne, puis l'écart-type. Le carré d'une période s'écrit avec **2.",
      "La valeur de g d'un tirage se calcule avec Lt[i] et Tt[i], les deux valeurs qui viennent d'être ajoutées aux listes.",
    ],
    solution: `import random
import numpy as np

L, uL = 0.800, 0.003    # longueur et u(L), en m
T, uT = 1.795, 0.010    # période et u(T), en s
N = 20000               # nombre de tirages

Lt = []    # longueurs tirées, en m
Tt = []    # périodes tirées, en s
g = []     # valeurs de g, en m/s2
for i in range(N):
    Lt.append(random.gauss(L, uL))
    Tt.append(random.gauss(T, uT))
    g.append(4 * np.pi**2 * Lt[i] / Tt[i]**2)

print("g moyen :", round(np.mean(g), 3), "m/s2")
print("u(g) :", round(np.std(g, ddof=1), 3), "m/s2")
`,
    explication: [
      "Chaque tirage est un résultat de mesure possible pour L et T : l'écart-type des N valeurs de g donne l'incertitude-type composée, sans formule.",
      "On trouve g ≈ 9,80 m/s² et u(g) ≈ 0,12 m/s², comme avec la relation u(g) / g = √((u(L) / L)² + (2u(T) / T)²).",
      "Le terme de la période, 1,1 %, l'emporte sur celui de la longueur, 0,4 % : c'est la mesure de T qu'il faut améliorer d'abord.",
      "Les tirages changent à chaque exécution : avec 20 000 tirages, la moyenne et l'écart-type ne bougent qu'au millième près.",
    ],
    etat: "brouillon",
  },
];
