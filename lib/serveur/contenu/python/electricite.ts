import "server-only";
import type { ExercicePython } from "@/lib/commun/python/types";

// Circuit RC : la charge d'un condensateur calculée par la méthode d'Euler, la constante de temps lue sur une charge.
export const EXERCICES_ELECTRICITE: ExercicePython[] = [
  {
    id: "charge-condensateur-euler",
    titre: "La charge d'un condensateur pas à pas",
    theme: "electricite",
    fiche: 8,
    niveau: 18,
    minutes: 15,
    genre: "completer",
    enonce: [
      "Un condensateur de capacité `C` = 220 µF, d'abord déchargé, se charge sous la tension `E` = 5,0 V à travers un conducteur ohmique de résistance `R` = 10 kΩ. D'après la loi des mailles, la tension `uC` à ses bornes vérifie l'équation τ × duC/dt + uC = E, où τ est la constante de temps du circuit.",
      "Le programme calcule `uC` pas à pas par la méthode d'Euler : à chaque tour, il tire de l'équation la dérivée de uC à la date `t[i]`, puis en déduit la tension à la date suivante, `t[i] + dt`, en supposant que la dérivée ne change pas pendant le pas `dt`. Les `N` = 5 000 pas, d'un millième de τ chacun, couvrent une durée de 5τ.",
      "Remplace les trois points : d'abord le calcul de `tau`, en seconde, puis la ligne de la boucle qui ajoute à `uC` la tension à la date suivante. Garde les noms `tau`, `t` et `uC` : le programme affiche ensuite la tension à la date τ et trace uC en fonction de t.",
    ],
    depart: `import matplotlib.pyplot as plt

E = 5.0          # tension du générateur, en V
R = 10e3         # résistance, en ohm
C = 220e-6       # capacité, en F

tau = ...        # constante de temps, en s
dt = tau / 1000  # pas de calcul, petit devant tau
N = 5000         # nombre de pas : 5 tau en tout

t = [0.0]        # dates, en s
uC = [0.0]       # tensions aux bornes de C, en V
for i in range(N):
    uC.append(...)    # tension à la date t[i] + dt
    t.append(t[i] + dt)

k = N // 5       # indice de la date tau
print("uC à la date tau :", uC[k], "V")
plt.plot(t, uC)
plt.xlabel("t (s)")
plt.ylabel("uC (V)")
plt.title("Charge du condensateur")
plt.grid()
plt.show()
`,
    tests: [
      {
        nom: "La variable tau contient la constante de temps du circuit",
        code: `assert isinstance(tau, (int, float)) and abs(tau - R * C) <= 1e-6 * R * C, "tau n'a pas la bonne valeur : revois la relation entre la constante de temps, R et C. Avec R en ohm et C en farad, tau est en seconde."`,
      },
      {
        nom: "La liste uC suit la méthode d'Euler",
        code: `import math as _h_math
_h_t = [float(_h_x) for _h_x in t]
_h_u = [float(_h_x) for _h_x in uC]
assert len(_h_u) == len(_h_t) and len(_h_u) > 1, "uC et t doivent avoir autant de valeurs : à chaque tour, la boucle ajoute une tension et une date."
assert _h_u[0] == 0, "La première tension doit rester 0 : le condensateur est déchargé à la date 0."
# sur un pas, la solution exacte (2,5 µV) et l'Euler implicite (5,0 µV) s'écartent d'un pas d'Euler bien plus que
# les arrondis d'un Euler juste (1e-15 V) : d'où la tolérance de 1e-9 E
_h_exacte = all(abs(_h_u[_h_i] - E * (1 - _h_math.exp(-_h_t[_h_i] / tau))) <= 1e-9 * E for _h_i in range(len(_h_u)))
assert not _h_exacte, "Ta liste uC suit la solution exacte E(1 - e^(-t/τ)) : ici, on demande le calcul pas à pas par la méthode d'Euler, avec la dérivée de uC tirée de l'équation."
assert all(abs(_h_u[_h_i + 1] - _h_u[_h_i] - (E - _h_u[_h_i]) / tau * (_h_t[_h_i + 1] - _h_t[_h_i])) <= 1e-9 * E for _h_i in range(len(_h_u) - 1)), "Une tension de uC ne suit pas la méthode d'Euler : la nouvelle tension, c'est la tension à la date t[i] plus la dérivée de uC à cette date multipliée par dt."`,
      },
      {
        nom: "À la date τ, uC vaut environ 63 % de E",
        code: `_h_tau = R * C
_h_t = [float(_h_x) for _h_x in t]
assert len(uC) == len(_h_t), "uC et t doivent avoir autant de valeurs : à chaque tour, la boucle ajoute une tension et une date."
_h_i = min(range(len(_h_t)), key=lambda _h_k: abs(_h_t[_h_k] - _h_tau))
assert abs(float(uC[_h_i]) - 0.63 * E) <= 0.02 * 0.63 * E, "À la date τ, uC devrait valoir environ 63 % de E : vérifie le calcul de tau et la ligne de la boucle, et garde un pas dt petit devant τ."`,
      },
      {
        nom: "La figure montre uC en fonction de t",
        code: `assert len(_figures_hub) > 0, "Aucune figure n'est tracée : garde les lignes du tracé, jusqu'à plt.show()."
_h_t = [float(_h_x) for _h_x in t]
_h_u = [float(_h_x) for _h_x in uC]
_h_pareil = lambda _h_a, _h_b: len(_h_a) == len(_h_b) and all(_h_p is not None and abs(_h_p - _h_q) <= 1e-9 * (1 + abs(_h_q)) for _h_p, _h_q in zip(_h_a, _h_b))
assert any(_h_pareil(_h_c['x'], _h_t) and _h_pareil(_h_c['y'], _h_u) for _h_f in _figures_hub for _h_c in _h_f['courbes']), "La figure doit montrer uC en fonction de t, avec tous les points calculés : garde la ligne plt.plot(t, uC)."`,
      },
    ],
    indices: [
      "Pour tau, reprends la relation de la fiche 8 entre la constante de temps, la résistance et la capacité : avec R en ohm et C en farad, tau est en seconde.",
      "De l'équation, isole la dérivée : duC/dt = (E - uC) / tau. Pendant le pas dt, la tension varie donc d'environ duC/dt × dt.",
      "La tension à la date suivante, c'est la tension à la date t[i], soit uC[i], plus sa variation pendant dt, calculée elle aussi avec uC[i].",
    ],
    solution: `import matplotlib.pyplot as plt

E = 5.0          # tension du générateur, en V
R = 10e3         # résistance, en ohm
C = 220e-6       # capacité, en F

tau = R * C      # constante de temps, en s
dt = tau / 1000  # pas de calcul, petit devant tau
N = 5000         # nombre de pas : 5 tau en tout

t = [0.0]        # dates, en s
uC = [0.0]       # tensions aux bornes de C, en V
for i in range(N):
    uC.append(uC[i] + (E - uC[i]) / tau * dt)
    t.append(t[i] + dt)

k = N // 5       # indice de la date tau
print("uC à la date tau :", uC[k], "V")
plt.plot(t, uC)
plt.xlabel("t (s)")
plt.ylabel("uC (V)")
plt.title("Charge du condensateur")
plt.grid()
plt.show()
`,
    explication: [
      "La méthode d'Euler remplace la dérivée par une variation sur un petit pas : uC(t + dt) = uC(t) + (E - uC(t)) / τ × dt, ce qui s'écrit uC.append(uC[i] + (E - uC[i]) / tau * dt).",
      "Ici τ = R × C = 2,2 s ; après 1 000 pas, à la date τ, le programme trouve uC = 3,16 V, soit 63 % de E, comme la solution exacte E(1 - e^(-t/τ)).",
      "Plus le pas dt est petit devant τ, plus le calcul est précis : avec dt = τ/10, on trouverait 3,26 V à la date τ. En contrepartie, un pas plus petit demande plus de tours de boucle.",
    ],
    etat: "brouillon",
  },
  {
    id: "constante-de-temps",
    titre: "Lire la constante de temps",
    theme: "electricite",
    fiche: 8,
    niveau: 14,
    minutes: 12,
    genre: "ecrire",
    enonce: [
      "Pendant la charge d'un condensateur sous la tension E, la tension uC à ses bornes atteint 63 % de E à la date t = τ, où τ est la constante de temps du circuit. C'est ainsi qu'on lit τ sur un enregistrement.",
      "Écris la fonction `constante_de_temps(t, uC, E)`. Elle reçoit la liste `t` des dates (en s), la liste `uC` des tensions mesurées à ces dates (en V) et la tension `E` du générateur (en V). Elle renvoie, avec `return`, la première date de la liste `t` à laquelle `uC` atteint ou dépasse 63 % de `E`.",
      "Les lignes du bas fabriquent une charge comme l'enregistrerait une carte d'acquisition : un point par milliseconde, calculé avec la solution uC = E(1 - e^(-t/τ)) pour τ = 47 ms. Ta fonction ne doit se servir que de ses paramètres : elle sera aussi essayée sur d'autres charges.",
    ],
    depart: `import math


def constante_de_temps(t, uC, E):
    # renvoie la première date de la liste t
    # à laquelle uC atteint ou dépasse 63 % de E
    ...


# une charge simulée, avec un point par milliseconde
E = 5.0          # tension du générateur, en V
tau = 0.047      # constante de temps, en s
t, uC = [], []   # dates (en s) et tensions (en V)
for i in range(250):
    t.append(0.001 * i)
    uC.append(E * (1 - math.exp(-t[i] / tau)))

lecture = constante_de_temps(t, uC, E)
print("constante de temps lue :", lecture, "s")
`,
    tests: [
      {
        nom: "La fonction renvoie une date",
        code: `_h_r = constante_de_temps([0.0, 1.0, 2.0], [0.0, 4.0, 4.5], 5.0)
_h_msg = "Ta fonction renvoie None : il manque return, ou la condition de ton if n'est jamais vraie. Une tension mesurée n'est presque jamais exactement égale au seuil."
if _h_r is None:
    # une fonction qui trouve la date quand la première tension dépasse déjà le seuil, mais pas sinon, s'arrête au premier tour
    try:
        _h_p = constante_de_temps([0.0, 1.0], [4.0, 4.5], 5.0)
    except Exception:
        _h_p = None
    if isinstance(_h_p, (int, float)) and _h_p == 0.0:
        _h_msg = "Ta fonction renvoie None dès que la première tension est sous le seuil : elle s'arrête au premier tour de boucle. Un return arrête la fonction : il ne doit venir qu'avec la date trouvée."
assert _h_r is not None, _h_msg
assert isinstance(_h_r, (int, float)), "Ta fonction doit renvoyer une date, c'est-à-dire un nombre de la liste t."`,
      },
      {
        nom: "Sur un exemple simple, la date renvoyée est la bonne",
        code: `_h_r = constante_de_temps([0.0, 2.0, 4.0, 6.0, 8.0, 10.0], [0.0, 4.0, 6.0, 8.0, 9.0, 9.5], 10.0)
assert isinstance(_h_r, (int, float)) and abs(_h_r - 6.0) < 1e-9, "Avec E = 10 V, le seuil vaut 6,3 V. Si uC passe de 6 V à 8 V entre les dates 4 s et 6 s, ta fonction doit renvoyer 6 : la première date où uC atteint le seuil, et non son indice."`,
      },
      {
        nom: "Sur d'autres charges, la date tombe à un pas près de τ",
        code: `import math as _h_math
for _h_nom, _h_E, _h_tau, _h_dt in [("E = 12 V et τ = 0,30 s", 12.0, 0.30, 0.01), ("E = 9,0 V et τ = 4,7 ms", 9.0, 4.7e-3, 1.0e-4), ("E = 4,5 V et τ = 23,5 s", 4.5, 23.5, 0.5)]:
    _h_t = [_h_k * _h_dt for _h_k in range(300)]
    _h_u = [_h_E * (1 - _h_math.exp(-_h_x / _h_tau)) for _h_x in _h_t]
    _h_r = constante_de_temps(_h_t, _h_u, _h_E)
    assert _h_r is not None, "Pour une charge avec " + _h_nom + ", ta fonction renvoie None et non une date : elle doit renvoyer, avec return, la première date où uC atteint ou dépasse 63 % de E."
    assert isinstance(_h_r, (int, float)) and abs(_h_r - _h_tau) <= 1.001 * _h_dt, "Pour une charge avec " + _h_nom + ", ta fonction ne renvoie pas une date proche de τ : elle doit se servir de ses paramètres t, uC et E, sans valeur écrite à l'avance."`,
      },
      {
        nom: "Si la tension dépasse déjà le seuil, la première date est renvoyée",
        code: `_h_r = constante_de_temps([2.0, 2.5, 3.0], [7.0, 8.0, 9.0], 10.0)
assert isinstance(_h_r, (int, float)) and abs(_h_r - 2.0) < 1e-9, "Si la première tension de la liste atteint déjà 63 % de E, ta fonction doit renvoyer la première date de t."`,
      },
    ],
    indices: [
      "Parcours les indices de la liste avec for i in range(len(t)), et compare à chaque tour la tension uC[i] au seuil de 63 % de E.",
      "Dès que la tension atteint le seuil, renvoie la date qui lui correspond : return arrête aussitôt la fonction, la boucle ne va pas plus loin.",
      "Le seuil vaut 0.63 * E, calculé avec le paramètre E et non avec 5.0 ; la date à renvoyer est t[i], pas l'indice i.",
    ],
    solution: `import math


def constante_de_temps(t, uC, E):
    for i in range(len(t)):
        if uC[i] >= 0.63 * E:
            return t[i]


# une charge simulée, avec un point par milliseconde
E = 5.0          # tension du générateur, en V
tau = 0.047      # constante de temps, en s
t, uC = [], []   # dates (en s) et tensions (en V)
for i in range(250):
    t.append(0.001 * i)
    uC.append(E * (1 - math.exp(-t[i] / tau)))

lecture = constante_de_temps(t, uC, E)
print("constante de temps lue :", lecture, "s")
`,
    explication: [
      "return arrête la fonction dès la première date trouvée. Si uC n'atteint jamais 63 % de E, la boucle va jusqu'au bout et la fonction renvoie None.",
      "Sur la charge simulée, la fonction renvoie 0,047 s, soit τ = 47 ms : c'est la méthode des 63 % de la fiche 8, appliquée à une liste de mesures.",
      "La date lue n'est précise qu'à un pas d'acquisition près, ici 1 ms : des mesures plus serrées donnent une lecture plus fine.",
    ],
    etat: "brouillon",
  },
];
