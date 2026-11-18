import "server-only";
import type { ExercicePython } from "@/lib/commun/python/types";

// Les bases du langage : indices d'une liste, puissance, boucles for et while, fonctions.
export const EXERCICES_BASES: ExercicePython[] = [
  {
    id: "indices-liste",
    titre: "Les indices d'une liste",
    theme: "bases",
    fiche: 14,
    niveau: 10,
    minutes: 8,
    genre: "completer",
    enonce: [
      "Un pointage vidéo a donné six positions d'une bille qui roule sur une table : la liste `x` les contient, en mètres. La fonction `lectures(x)` reçoit une liste de positions et renvoie quatre valeurs, que le programme range dans quatre variables puis affiche.",
      "Remplace les trois points des quatre lignes de la fonction : `n` reçoit le nombre de valeurs de la liste (avec la fonction `len`), `premier` la première position, `troisieme` la troisième et `dernier` la dernière.",
      "Lis chaque position dans la liste avec son indice, sans recopier de nombre : ta fonction doit rester juste pour une liste d'une autre longueur. Le programme l'essaie aussi sur un deuxième pointage, de huit positions, et les vérifications l'essaient sur d'autres listes.",
    ],
    depart: `def lectures(x):
    # x : une liste de positions, en m
    n = ...           # nombre de positions
    premier = ...     # première position
    troisieme = ...   # troisième position
    dernier = ...     # dernière position
    return n, premier, troisieme, dernier


x = [0.15, 0.42, 0.68, 0.95, 1.21, 1.48]   # positions, en m
n, premier, troisieme, dernier = lectures(x)
print("nombre de positions :", n)
print("première position :", premier, "m")
print("troisième position :", troisieme, "m")
print("dernière position :", dernier, "m")

# un deuxième pointage, plus long
x2 = [0.10, 0.35, 0.65, 1.00, 1.40, 1.85, 2.35, 2.90]
print("deuxième pointage :", lectures(x2))
`,
    tests: [
      {
        nom: "Le nombre de positions n est juste pour toute liste",
        code: `_h_vus = 0
for _h_x in ([0.10, 0.35, 0.65, 1.00, 1.40, 1.85, 2.35, 2.90],
             [0.15, 0.42, 0.68, 0.95, 1.21, 1.48], [2.0, 4.0, 6.0, 8.0]):
    try:
        _h_r = lectures(list(_h_x))
    except IndexError:
        continue    # la vérification de dernier le signale
    _h_vus += 1
    assert hasattr(_h_r, "__len__") and len(_h_r) == 4, "lectures doit renvoyer quatre valeurs : garde la dernière ligne de la fonction, return n, premier, troisieme, dernier."
    assert _h_r[0] == len(_h_x), "Pour une liste de " + str(len(_h_x)) + " positions, ta fonction ne donne pas n = " + str(len(_h_x)) + " : n doit compter les valeurs de la liste reçue, quelle qu'elle soit. Relis ce que fait la fonction len."
assert _h_vus > 0, "Ta fonction demande une position qui n'existe pas (IndexError) pour chaque liste essayée : vérifie chaque indice."`,
      },
      {
        nom: "La première position est juste pour toute liste",
        code: `_h_vus = 0
for _h_x in ([0.10, 0.35, 0.65, 1.00, 1.40, 1.85, 2.35, 2.90],
             [0.15, 0.42, 0.68, 0.95, 1.21, 1.48], [2.0, 4.0, 6.0, 8.0]):
    try:
        _h_r = lectures(list(_h_x))
    except IndexError:
        continue    # la vérification de dernier le signale
    _h_vus += 1
    assert hasattr(_h_r, "__len__") and len(_h_r) == 4, "lectures doit renvoyer quatre valeurs : garde la dernière ligne de la fonction, return n, premier, troisieme, dernier."
    _h_txt = "Pour une liste de " + str(len(_h_x)) + " positions, premier"
    assert _h_r[1] != _h_x[1], _h_txt + " contient la deuxième position : en Python, les indices d'une liste ne commencent pas à 1."
    assert _h_r[1] == _h_x[0], _h_txt + " ne contient pas la première position : lis-la dans la liste reçue avec son indice, sans recopier de nombre."
assert _h_vus > 0, "Ta fonction demande une position qui n'existe pas (IndexError) pour chaque liste essayée : vérifie chaque indice."`,
      },
      {
        nom: "La troisième position est juste pour toute liste",
        code: `_h_vus = 0
for _h_x in ([0.10, 0.35, 0.65, 1.00, 1.40, 1.85, 2.35, 2.90],
             [0.15, 0.42, 0.68, 0.95, 1.21, 1.48], [2.0, 4.0, 6.0, 8.0]):
    try:
        _h_r = lectures(list(_h_x))
    except IndexError:
        continue    # la vérification de dernier le signale
    _h_vus += 1
    assert hasattr(_h_r, "__len__") and len(_h_r) == 4, "lectures doit renvoyer quatre valeurs : garde la dernière ligne de la fonction, return n, premier, troisieme, dernier."
    _h_txt = "Pour une liste de " + str(len(_h_x)) + " positions, troisieme"
    assert _h_r[2] != _h_x[3], _h_txt + " contient la quatrième position : en Python, les indices commencent à 0."
    assert _h_r[2] == _h_x[2], _h_txt + " ne contient pas la troisième position : compte les indices à partir de celui de la première, et lis la valeur dans la liste reçue."
assert _h_vus > 0, "Ta fonction demande une position qui n'existe pas (IndexError) pour chaque liste essayée : vérifie chaque indice."`,
      },
      {
        nom: "La dernière position est juste pour toute liste",
        code: `for _h_x in ([0.10, 0.35, 0.65, 1.00, 1.40, 1.85, 2.35, 2.90],
             [0.15, 0.42, 0.68, 0.95, 1.21, 1.48], [2.0, 4.0, 6.0, 8.0]):
    _h_txt = "Pour une liste de " + str(len(_h_x)) + " positions"
    _h_err = False
    try:
        _h_r = lectures(list(_h_x))
    except IndexError:
        _h_err = True
    assert not _h_err, _h_txt + ", ta fonction demande une position qui n'existe pas (IndexError) : l'indice de la dernière position dépend du nombre de valeurs de la liste."
    assert hasattr(_h_r, "__len__") and len(_h_r) == 4, "lectures doit renvoyer quatre valeurs : garde la dernière ligne de la fonction, return n, premier, troisieme, dernier."
    assert _h_r[3] == _h_x[-1], _h_txt + ", dernier ne contient pas la dernière position : ta lecture doit rester juste quelle que soit la longueur de la liste."`,
      },
    ],
    indices: [
      "Un élément d'une liste se lit avec son indice entre crochets, et la fonction len donne le nombre d'éléments de la liste.",
      "En Python, les indices commencent à 0 : la première position a l'indice 0, la deuxième l'indice 1, et ainsi de suite.",
      "Une liste de n éléments a des indices de 0 à n - 1 : l'indice de la dernière position dépend donc de n. Python accepte aussi les indices négatifs, qui comptent à partir de la fin de la liste.",
    ],
    solution: `def lectures(x):
    # x : une liste de positions, en m
    n = len(x)              # nombre de positions
    premier = x[0]          # première position
    troisieme = x[2]        # troisième position
    dernier = x[n - 1]      # dernière position, ou x[-1]
    return n, premier, troisieme, dernier


x = [0.15, 0.42, 0.68, 0.95, 1.21, 1.48]   # positions, en m
n, premier, troisieme, dernier = lectures(x)
print("nombre de positions :", n)
print("première position :", premier, "m")
print("troisième position :", troisieme, "m")
print("dernière position :", dernier, "m")

# un deuxième pointage, plus long
x2 = [0.10, 0.35, 0.65, 1.00, 1.40, 1.85, 2.35, 2.90]
print("deuxième pointage :", lectures(x2))
`,
    explication: [
      "En Python, le premier élément d'une liste a l'indice 0 : x[0] vaut 0,15 m, et la troisième position, x[2], vaut 0,68 m.",
      "Une liste de n éléments a des indices de 0 à n - 1 : ici n vaut 6, et la dernière position, 1,48 m, s'écrit x[n - 1] ou x[-1].",
      "x[5] donne la même valeur, mais pas la dernière position du deuxième pointage, qui en compte huit : x[n - 1] et x[-1] restent justes pour toute liste.",
      "x[n] n'existe pas : le demander arrête le programme sur une IndexError.",
    ],
    etat: "brouillon",
  },
  {
    id: "puissance-python",
    titre: "Un calcul qui s'arrête net",
    theme: "bases",
    fiche: 14,
    niveau: 10,
    minutes: 5,
    genre: "corriger",
    enonce: [
      "Ce programme doit calculer l'énergie cinétique Ec = ½ × m × v² d'un ballon de football de masse `m` = 0,430 kg, frappé à la vitesse `v` = 22,0 m/s.",
      "Lance-le : il s'arrête sur une erreur, à la ligne du calcul de `Ec`. Lis le message de Python, trouve ce qui ne va pas et corrige cette ligne.",
      "Ne change pas les données : le résultat, en joules, reste dans la variable `Ec`.",
    ],
    depart: `m = 0.430    # masse du ballon, en kg
v = 22.0     # vitesse du ballon, en m/s

Ec = 0.5 * m * v^2    # énergie cinétique, en J

print("Ec =", Ec, "J")
`,
    tests: [
      {
        nom: "Les données du ballon n'ont pas changé",
        code: `assert abs(float(m) - 0.430) < 1e-12 and abs(float(v) - 22.0) < 1e-12, "Garde m = 0.430 et v = 22.0 : ce sont les données du ballon. C'est la ligne du calcul de Ec qu'il faut corriger."`,
      },
      {
        nom: "La variable Ec contient un nombre",
        code: `assert isinstance(Ec, (int, float)), "Ec doit contenir un nombre : l'énergie cinétique du ballon, en joules."`,
      },
      {
        nom: "L'énergie cinétique Ec est juste",
        code: `_h_Ec = 0.5 * 0.430 * 22.0**2
_h_double = 0.5 * 0.430 * 22.0 * 2              # v*2 au lieu de v**2
_h_tout = [(0.5 * 0.430 * 22.0)**2, 0.5 * (0.430 * 22.0)**2]    # trop de facteurs au carré
_h_message = "Ec n'a pas la bonne valeur : vérifie comment ta ligne calcule le carré de v."
if abs(Ec - _h_double) <= 1e-6 * abs(_h_double):
    _h_message = "Ec n'a pas la bonne valeur : ta ligne double la vitesse au lieu de l'élever au carré."
elif any(abs(Ec - _h_c) <= 1e-6 * abs(_h_c) for _h_c in _h_tout):
    _h_message = "Ec n'a pas la bonne valeur : dans ½ × m × v², seule la vitesse est élevée au carré."
assert abs(Ec - _h_Ec) <= 1e-6 * abs(_h_Ec), _h_message`,
      },
    ],
    indices: [
      "Lis le message de l'erreur : Python y nomme le symbole qu'il ne sait pas utiliser avec ces nombres.",
      "En Python, le symbole ^ ne calcule pas une puissance.",
      "Une puissance s'écrit avec deux étoiles : 10 au cube s'écrit 10**3.",
    ],
    solution: `m = 0.430    # masse du ballon, en kg
v = 22.0     # vitesse du ballon, en m/s

Ec = 0.5 * m * v**2    # énergie cinétique, en J

print("Ec =", Ec, "J")
`,
    explication: [
      "En Python, la puissance s'écrit ** : v**2 est le carré de v, et 10**3 vaut 1 000.",
      "Le symbole ^ existe, mais il calcule le « ou exclusif » bit à bit de deux entiers : avec un nombre décimal, Python s'arrête sur une TypeError ; avec des entiers, il donne sans prévenir un tout autre nombre (5^2 vaut 7, et non 25).",
      "Le ballon a une énergie cinétique d'environ 104 J.",
    ],
    etat: "brouillon",
  },
  {
    id: "moyenne-boucle",
    titre: "Une boucle qui oublie une mesure",
    theme: "bases",
    fiche: 14,
    niveau: 14,
    minutes: 8,
    genre: "corriger",
    enonce: [
      "Un élève a mesuré huit fois la période `T` d'un pendule, en secondes. Son programme en calcule la moyenne avec une boucle : la variable `somme` accumule les mesures, puis `moyenne` divise cette somme par le nombre de mesures.",
      "Le programme tourne sans erreur, mais la moyenne qu'il affiche n'est pas celle que tu trouves à la calculatrice avec les mêmes huit mesures.",
      "Trouve ce qui ne va pas et corrige le programme. Garde les noms `T`, `somme` et `moyenne`, et ne change pas les mesures.",
    ],
    depart: `# huit mesures de la période T du pendule, en s
T = [1.43, 1.41, 1.44, 1.40, 1.42, 1.43, 1.41, 1.42]

somme = 0
for i in range(1, len(T)):
    somme = somme + T[i]
moyenne = somme / len(T)

print("période moyenne :", moyenne, "s")
`,
    tests: [
      {
        nom: "La somme des huit mesures est juste",
        code: `_h_T0 = [1.43, 1.41, 1.44, 1.40, 1.42, 1.43, 1.41, 1.42]
_h_s = sum(_h_T0)
assert abs(somme - _h_s) <= 1e-9 * abs(_h_s), "somme ne contient pas la somme des huit mesures : vérifie que chaque mesure de T est ajoutée, une fois et une seule."`,
      },
      {
        nom: "La moyenne des huit mesures est juste",
        code: `_h_T0 = [1.43, 1.41, 1.44, 1.40, 1.42, 1.43, 1.41, 1.42]
_h_m = sum(_h_T0) / len(_h_T0)
_h_sept = (sum(_h_T0) - _h_T0[0]) / (len(_h_T0) - 1)
assert abs(moyenne - _h_sept) > 1e-9 * abs(_h_sept), "moyenne est la moyenne des sept dernières mesures seulement : la première doit compter aussi."
assert abs(moyenne - _h_m) <= 1e-9 * abs(_h_m), "moyenne n'est pas la moyenne des huit mesures : elle vaut leur somme divisée par leur nombre."`,
      },
      {
        nom: "La liste T garde ses huit mesures",
        code: `_h_T0 = [1.43, 1.41, 1.44, 1.40, 1.42, 1.43, 1.41, 1.42]
assert hasattr(T, "__len__") and len(T) == 8 and all(abs(float(_h_a) - _h_b) < 1e-12 for _h_a, _h_b in zip(T, _h_T0)), "T doit garder ses huit mesures, sans en changer ni en déplacer aucune : c'est le calcul qu'il faut corriger, pas les données."`,
      },
    ],
    indices: [
      "Une moyenne est toujours comprise entre la plus petite et la plus grande des mesures : est-ce le cas de la valeur affichée ?",
      "Ajoute print(i) dans la boucle pour voir les indices qu'elle parcourt, et compare-les aux indices de la liste T.",
      "range(a, b) donne les entiers de a à b - 1 : quel est l'indice de la première mesure de T ?",
    ],
    solution: `# huit mesures de la période T du pendule, en s
T = [1.43, 1.41, 1.44, 1.40, 1.42, 1.43, 1.41, 1.42]

somme = 0
for i in range(len(T)):
    somme = somme + T[i]
moyenne = somme / len(T)

print("période moyenne :", moyenne, "s")
`,
    explication: [
      "range(1, len(T)) donne les indices de 1 à 7 : la mesure d'indice 0 n'est jamais ajoutée. range(len(T)) parcourt les huit mesures, et sum(T) donne la même somme en une seule ligne.",
      "Le programme faux affichait 1,24 s, moins que la plus petite mesure (1,40 s) : comparer un résultat à ses données suffit souvent à repérer une erreur.",
      "La période moyenne du pendule vaut 1,42 s.",
    ],
    etat: "brouillon",
  },
  {
    id: "conversion-vitesse",
    titre: "Une fonction qui convertit",
    theme: "bases",
    fiche: 14,
    niveau: 10,
    minutes: 6,
    genre: "ecrire",
    enonce: [
      "Écris la fonction `kmh_vers_ms(v)` : elle reçoit une vitesse `v` en km/h et renvoie avec `return` la même vitesse en m/s. Rappel : 1 km = 1 000 m et 1 h = 3 600 s.",
      "La liste `vitesses_kmh` contient cinq vitesses relevées par un radar, en km/h. Remplace les trois points de la boucle pour que `vitesses_ms` reçoive ces vitesses converties en m/s, dans le même ordre, avec ta fonction.",
      "La fonction n'affiche rien : c'est le programme qui affiche ce qu'elle renvoie.",
    ],
    depart: `def kmh_vers_ms(v):
    # v : vitesse en km/h ; renvoie la vitesse en m/s
    ...


print(kmh_vers_ms(36))    # 36 km/h : on attend 10.0

# vitesses relevées par un radar, en km/h
vitesses_kmh = [47, 54, 61, 50, 72]
vitesses_ms = []
for vk in vitesses_kmh:
    ...    # ajoute à vitesses_ms la vitesse vk en m/s
print(vitesses_ms)
`,
    tests: [
      {
        nom: "La fonction renvoie un nombre avec return",
        code: `_h_r = kmh_vers_ms(36)
assert _h_r is not None, "kmh_vers_ms ne renvoie rien : une fonction renvoie sa valeur avec return, print ne fait que l'afficher."
assert isinstance(_h_r, (int, float)), "kmh_vers_ms doit renvoyer un nombre : la vitesse convertie en m/s."`,
      },
      {
        nom: "36 km/h donnent 10 m/s et 0 km/h donnent 0",
        code: `_h_r = kmh_vers_ms(36)
assert isinstance(_h_r, (int, float)), "kmh_vers_ms(36) ne renvoie pas de nombre : termine la fonction par return suivi du résultat."
assert abs(_h_r - 10) < 1e-9, "Pour 36 km/h, la fonction doit renvoyer 10 m/s : faut-il multiplier ou diviser par 3,6 ?"
_h_r = kmh_vers_ms(0)
assert isinstance(_h_r, (int, float)) and abs(_h_r) < 1e-12, "Pour une vitesse nulle, la fonction doit renvoyer 0."`,
      },
      {
        nom: "La conversion est juste pour d'autres vitesses",
        code: `for _h_v in [18, 50, 90, 130, 7.2]:
    _h_r = kmh_vers_ms(_h_v)
    _h_e = _h_v / 3.6
    _h_txt = str(_h_v).replace(".", ",") + " km/h"
    assert isinstance(_h_r, (int, float)), "Pour " + _h_txt + ", la fonction ne renvoie pas un nombre."
    _h_ecart = abs(_h_r - _h_e)
    assert _h_ecart <= 1e-6 * _h_e or _h_ecart > 0.05, "Pour " + _h_txt + ", la valeur renvoyée est arrondie : renvoie le résultat exact, on n'arrondit que pour afficher."
    assert _h_ecart <= 1e-6 * _h_e, "Pour " + _h_txt + ", la fonction ne renvoie pas la bonne vitesse en m/s."`,
      },
      {
        nom: "La liste vitesses_ms contient les vitesses en m/s",
        code: `assert hasattr(vitesses_ms, "__len__"), "vitesses_ms n'est plus une liste à la fin du programme : à chaque tour, la boucle doit ajouter une vitesse à la liste, sans la remplacer."
_h_l = list(vitesses_ms)
assert len(_h_l) == len(vitesses_kmh), "vitesses_ms doit contenir une vitesse par mesure du radar, soit " + str(len(vitesses_kmh)) + " valeurs."
assert all(isinstance(_h_a, (int, float)) for _h_a in _h_l), "vitesses_ms contient autre chose que des nombres : kmh_vers_ms doit renvoyer sa valeur avec return, et c'est cette valeur qu'on ajoute à la liste."
_h_att = [_h_v / 3.6 for _h_v in vitesses_kmh]
assert all(abs(_h_a - _h_b) <= 1e-6 * abs(_h_b) + 1e-12 for _h_a, _h_b in zip(_h_l, _h_att)), "Une valeur de vitesses_ms est fausse : chaque vitesse du radar doit être convertie en m/s, dans le même ordre."`,
      },
    ],
    indices: [
      "À 36 km/h, combien de mètres une voiture parcourt-elle en une seconde ? La réponse donne la règle de conversion.",
      "36 km/h, c'est 36 000 m en 3 600 s, soit 10 m/s : la vitesse en m/s est 3,6 fois plus petite. La fonction renvoie ce résultat avec return.",
      "Dans la boucle, vk prend tour à tour chaque vitesse du radar : convertis-la avec ta fonction, puis ajoute le résultat à vitesses_ms avec append.",
    ],
    solution: `def kmh_vers_ms(v):
    # v : vitesse en km/h ; renvoie la vitesse en m/s
    return v / 3.6


print(kmh_vers_ms(36))    # 36 km/h : on attend 10.0

# vitesses relevées par un radar, en km/h
vitesses_kmh = [47, 54, 61, 50, 72]
vitesses_ms = []
for vk in vitesses_kmh:
    vitesses_ms.append(kmh_vers_ms(vk))
print(vitesses_ms)
`,
    explication: [
      "Une fonction qui renvoie sa valeur avec return sert partout : dans un print, dans un calcul ou dans une boucle qui remplit une liste.",
      "Pour passer des km/h aux m/s, on divise par 3,6 ; pour revenir aux km/h, on multiplie par 3,6.",
      "La voiture flashée à 72 km/h roule à 20 m/s : elle parcourt 20 m chaque seconde.",
    ],
    etat: "brouillon",
  },
  {
    id: "boucle-while-sol",
    titre: "La boucle while : jusqu'au sol",
    theme: "bases",
    fiche: 1,
    niveau: 14,
    minutes: 10,
    genre: "completer",
    enonce: [
      "Une bille est lâchée sans vitesse initiale d'une hauteur `H` = 20 m. En négligeant l'action de l'air, son altitude à la date `t` vaut z = H - ½ × g × t², avec g = 9,81 m/s².",
      "Le programme fait avancer la date `t` par pas de `dt` = 0,01 s et recalcule l'altitude `z` à chaque tour, tant que la bille est au-dessus du sol. La variable `n` compte les tours.",
      "Remplace les trois points : la condition du `while`, le pas dont la date avance, puis le calcul de `z`. À la sortie de la boucle, `t` est la durée de la chute à `dt` près : le programme l'affiche à côté de la durée exacte √(2H/g).",
    ],
    depart: `import math

H = 20.0     # hauteur de départ, en m
g = 9.81     # intensité de la pesanteur, en m/s2
dt = 0.01    # pas de temps, en s

t = 0.0      # date, en s
z = H        # altitude de la bille, en m
n = 0        # nombre de tours de boucle
while ...:          # tant que la bille est au-dessus du sol
    t = t + ...     # la date avance d'un pas
    z = ...         # altitude à la date t
    n = n + 1

t_sol = math.sqrt(2 * H / g)    # durée exacte, en s
print("durée de chute :", round(t, 2), "s")
print("durée exacte :", round(t_sol, 3), "s")
print("nombre de tours :", n)
`,
    tests: [
      {
        nom: "La bille est au sol à la sortie de la boucle",
        code: `assert isinstance(t, (int, float)) and isinstance(z, (int, float)), "t et z doivent contenir des nombres à la fin du programme."
assert z <= 0, "À la sortie de la boucle, l'altitude z doit être négative ou nulle : la boucle doit tourner tant que la bille est au-dessus du sol."`,
      },
      {
        nom: "L'altitude z correspond à la dernière date t",
        code: `_h_z = H - 0.5 * g * t**2
assert abs(z - _h_z) <= 1e-6 * max(1.0, abs(_h_z)), "z ne vaut pas H - ½ × g × t² à la dernière date t : vérifie la ligne qui calcule z, et qu'elle vient après celle qui fait avancer t."`,
      },
      {
        nom: "La date avance d'un pas dt à chaque tour",
        code: `assert isinstance(n, (int, float)), "n doit contenir le nombre de tours de boucle."
assert t > 0, "La boucle n'a fait aucun tour : sa condition doit être vraie au départ, quand la bille est encore en haut."
assert n > 0, "n ne compte pas les tours : garde la ligne n = n + 1 dans la boucle."
assert abs(t - n * dt) <= 1e-6, "Après n tours, t doit valoir n × dt : à chaque tour, la date avance d'un pas dt."`,
      },
      {
        nom: "La durée t est juste à dt près",
        code: `_h_tsol = (2 * H / g) ** 0.5
assert abs(t - _h_tsol) <= dt + 1e-9, "t n'est pas la durée de chute à dt près : la boucle doit s'arrêter au premier pas où la bille atteint le sol."`,
      },
    ],
    indices: [
      "Une boucle while répète son bloc tant que sa condition est vraie. Ici, elle doit continuer tant que la bille n'a pas atteint le sol.",
      "La bille est au-dessus du sol tant que son altitude z est strictement positive. À chaque tour, la date t augmente de dt.",
      "L'altitude se calcule avec la nouvelle date : traduis H - ½ × g × t² en Python, avec * pour chaque produit et ** pour le carré.",
    ],
    solution: `import math

H = 20.0     # hauteur de départ, en m
g = 9.81     # intensité de la pesanteur, en m/s2
dt = 0.01    # pas de temps, en s

t = 0.0      # date, en s
z = H        # altitude de la bille, en m
n = 0        # nombre de tours de boucle
while z > 0:        # tant que la bille est au-dessus du sol
    t = t + dt      # la date avance d'un pas
    z = H - 0.5 * g * t**2    # altitude à la date t
    n = n + 1

t_sol = math.sqrt(2 * H / g)    # durée exacte, en s
print("durée de chute :", round(t, 2), "s")
print("durée exacte :", round(t_sol, 3), "s")
print("nombre de tours :", n)
`,
    explication: [
      "Une boucle while tourne tant que sa condition est vraie : ce qu'elle teste doit changer à chaque tour (ici t, puis z), sinon elle ne s'arrête jamais.",
      "La boucle s'arrête au premier pas où l'altitude z devient négative ou nulle : après 202 tours, t vaut 2,02 s, à moins d'un pas de la durée exacte.",
      "La durée exacte est √(2H/g) = √(2 × 20 / 9,81) = 2,019 s : un pas dt plus petit rapprocherait le résultat, au prix de plus de tours.",
    ],
    etat: "brouillon",
  },
];
