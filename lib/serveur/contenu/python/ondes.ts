import "server-only";
import type { ExercicePython } from "@/lib/commun/python/types";

// Ondes et signaux : la superposition de deux signaux sinusoïdaux (interférences), le niveau d'intensité sonore.
export const EXERCICES_ONDES: ExercicePython[] = [
  {
    id: "superposition-ondes",
    titre: "Superposer deux ondes",
    theme: "ondes",
    fiche: 6,
    niveau: 14,
    minutes: 12,
    genre: "completer",
    enonce: [
      "Deux haut-parleurs, branchés sur le même générateur, émettent des sons de même fréquence `f` = 500 Hz. Au point où se trouve un microphone, chaque onde seule donnerait un signal sinusoïdal : s1 = A1 cos(2π f t) pour la première, s2 = A2 cos(2π f t + φ) pour la seconde, où φ est le déphasage de s2 sur s1, en radian. Le second haut-parleur est plus loin du microphone, son signal est plus faible : `A1` = 0,50 V et `A2` = 0,40 V.",
      "Le programme remplit, sur deux périodes, la liste `t` des dates (en s) et les listes `s1` et `s2` (en V). Remplace les trois points de la boucle pour que la liste `s` reçoive le signal capté quand les deux ondes arrivent ensemble : les deux perturbations s'ajoutent.",
      "Remplace ensuite les trois points de la ligne de `phi` par le déphasage qui donne des interférences destructives : le signal somme a alors la plus petite amplitude possible. Garde les noms `phi`, `s1`, `s2` et `s`, ainsi que les valeurs de `A1` et `A2`. Quand l'exercice est réussi, essaie `phi = 0` : que devient l'amplitude de `s` ?",
    ],
    depart: `import math
import matplotlib.pyplot as plt

f = 500.0      # fréquence des deux signaux, en Hz
A1 = 0.50      # amplitude du premier signal, en V
A2 = 0.40      # amplitude du second signal, en V
phi = ...      # déphasage de s2 sur s1, en rad

T = 1 / f      # période, en s
t, s1, s2, s = [], [], [], []
for i in range(201):           # deux périodes
    t.append(i * 2 * T / 200)
    s1.append(A1 * math.cos(2 * math.pi * f * t[i]))
    s2.append(A2 * math.cos(2 * math.pi * f * t[i] + phi))
    s.append(...)              # signal somme

plt.plot(t, s1, label="s1")
plt.plot(t, s2, label="s2")
plt.plot(t, s, label="s1 + s2")
plt.xlabel("t (s)")
plt.ylabel("signal (V)")
plt.legend()
plt.show()
`,
    tests: [
      {
        nom: "La liste s est la somme de s1 et s2",
        code: `assert abs(A1 - 0.50) < 1e-9 and abs(A2 - 0.40) < 1e-9, "Garde les amplitudes de l'énoncé, A1 = 0,50 V et A2 = 0,40 V : seuls les trois points sont à remplacer."
assert len(s) == len(t), "La liste s doit contenir une valeur par date : ajoute le signal somme à chaque tour de boucle."
assert all(isinstance(_h_x, (int, float)) for _h_x in s), "s contient autre chose que des nombres : remplace les trois points par un calcul."
assert all(abs(float(s[_h_i]) - float(s1[_h_i]) - float(s2[_h_i])) <= 1e-9 for _h_i in range(len(t))), "Une valeur de s n'est pas la somme des deux signaux à la même date."`,
      },
      {
        nom: "Avec ce déphasage, l'amplitude du signal somme est la plus petite possible",
        code: `import math as _h_math
assert isinstance(phi, (int, float)), "phi doit contenir un nombre : le déphasage de s2 sur s1, en radian."
assert abs(phi - 180) > 1e-6, "math.cos travaille en radian : écris le déphasage en radian, pas en degré."
_h_w = 2 * _h_math.pi * f
# en opposition de phase, A1 cos(wt) + A2 cos(wt + phi) vaut (A1 - A2) cos(wt) à chaque date
_h_ecart = max(abs(A1 * _h_math.cos(_h_w * _h_x) + A2 * _h_math.cos(_h_w * _h_x + phi) - (A1 - A2) * _h_math.cos(_h_w * _h_x)) for _h_x in t)
_h_msg = "Avec ce déphasage, le signal somme n'a pas la plus petite amplitude possible : il faut que s2 soit en opposition de phase avec s1."
if _h_ecart < 0.01 * A2:
    _h_msg = "L'amplitude est presque la plus petite possible, mais pas tout à fait : écris le déphasage avec sa valeur exacte, sans l'arrondir."
assert _h_ecart <= 1e-9, _h_msg`,
      },
      {
        nom: "La figure montre les trois signaux",
        code: `assert len(_figures_hub) > 0, "Aucune figure n'est tracée : garde les lignes du tracé, jusqu'à plt.show()."
assert len([_h_c for _h_c in _figures_hub[0]['courbes'] if len(_h_c['x']) == len(t)]) >= 3, "La figure doit montrer trois courbes en fonction de t : s1, s2 et le signal somme s."`,
      },
    ],
    indices: [
      "À chaque date t[i], le signal capté vaut s1 à cette date plus s2 à la même date.",
      "Des interférences sont destructives quand les deux signaux sont en opposition de phase : quand s1 passe par un maximum, s2 passe par un minimum, et leurs amplitudes se retranchent.",
      "Deux signaux en opposition de phase sont décalés d'une demi-période, c'est-à-dire de la moitié de 2π radians. Le module math connaît le nombre π.",
    ],
    solution: `import math
import matplotlib.pyplot as plt

f = 500.0      # fréquence des deux signaux, en Hz
A1 = 0.50      # amplitude du premier signal, en V
A2 = 0.40      # amplitude du second signal, en V
phi = math.pi  # déphasage de s2 sur s1, en rad

T = 1 / f      # période, en s
t, s1, s2, s = [], [], [], []
for i in range(201):           # deux périodes
    t.append(i * 2 * T / 200)
    s1.append(A1 * math.cos(2 * math.pi * f * t[i]))
    s2.append(A2 * math.cos(2 * math.pi * f * t[i] + phi))
    s.append(s1[i] + s2[i])

plt.plot(t, s1, label="s1")
plt.plot(t, s2, label="s2")
plt.plot(t, s, label="s1 + s2")
plt.xlabel("t (s)")
plt.ylabel("signal (V)")
plt.legend()
plt.show()
`,
    explication: [
      "La ligne s.append(s1[i] + s2[i]) traduit la superposition : en un point, la perturbation résultante est la somme des perturbations.",
      "Pour phi = π, les signaux sont en opposition de phase, comme pour une différence de marche δ = (k + 1/2)λ : les interférences sont destructives et l'amplitude du signal somme est la plus petite possible, A1 - A2 = 0,10 V.",
      "Pour phi = 0, ils sont en phase : les interférences sont constructives et l'amplitude est la plus grande possible, A1 + A2 = 0,90 V.",
      "L'annulation totale demanderait deux amplitudes égales ; et math.cos travaille en radian : un déphasage de 180° s'écrit math.pi.",
    ],
    etat: "brouillon",
  },
  {
    id: "niveau-sonore",
    titre: "Le niveau d'intensité sonore",
    theme: "ondes",
    fiche: 6,
    niveau: 10,
    minutes: 8,
    genre: "ecrire",
    enonce: [
      "Le niveau d'intensité sonore L d'un son, en décibel (dB), se calcule à partir de son intensité sonore I, en W·m⁻² : L = 10 log(I / I0), où log est le logarithme décimal et I0 = 1,0 × 10⁻¹² W·m⁻² l'intensité sonore de référence, rangée dans la variable `I0`.",
      "Écris la fonction `niveau_sonore(I)` qui renvoie ce niveau, en dB. Le module `math`, importé en haut du programme, fournit le logarithme décimal.",
      "La fonction renvoie la valeur calculée avec `return`, sans l'arrondir : elle n'affiche rien. Les lignes du bas l'essaient sur une conversation et sur un concert.",
    ],
    depart: `import math

I0 = 1.0e-12    # intensité sonore de référence, en W/m2


def niveau_sonore(I):
    # renvoie le niveau d'intensité sonore, en dB,
    # d'un son d'intensité sonore I, en W/m2
    ...


print(niveau_sonore(1.0e-6), "dB")    # une conversation
print(niveau_sonore(3.0e-2), "dB")    # un concert
`,
    tests: [
      {
        nom: "La fonction renvoie un nombre",
        code: `_h_r = niveau_sonore(1.0e-6)
assert _h_r is not None, "Ta fonction ne renvoie rien : termine-la par return suivi du niveau calculé."
assert isinstance(_h_r, (int, float)), "Ta fonction doit renvoyer un nombre : le niveau, en dB."`,
      },
      {
        nom: "L'intensité de référence I0 donne 0 dB",
        code: `_h_r = niveau_sonore(1.0e-12)
assert isinstance(_h_r, (int, float)) and abs(_h_r) < 1e-6, "Pour I = I0, le niveau doit valoir 0 dB : le logarithme porte sur le quotient de I par I0."`,
      },
      {
        nom: "Une intensité de 1,0 × 10⁻¹¹ W·m⁻² donne 10 dB",
        code: `import math as _h_math
_h_r = niveau_sonore(1.0e-11)
_h_msg = "Pour I = 1,0 × 10⁻¹¹ W·m⁻², dix fois I0, le niveau doit valoir 10 dB : vérifie le logarithme et le facteur 10."
if isinstance(_h_r, (int, float)) and abs(_h_r - 10 * _h_math.log(10)) < 1e-6:
    _h_msg = "Ta fonction trouve 23 dB au lieu de 10 dB : math.log calcule le logarithme népérien, le niveau sonore utilise le logarithme décimal."
if isinstance(_h_r, (int, float)) and abs(_h_r + 10) < 1e-6:
    _h_msg = "Ta fonction trouve un niveau négatif : le logarithme porte sur I / I0, et non sur I0 / I."
assert isinstance(_h_r, (int, float)) and abs(_h_r - 10) < 1e-6, _h_msg`,
      },
      {
        nom: "Une intensité de 1 W·m⁻² donne 120 dB",
        code: `_h_r = niveau_sonore(1.0)
assert isinstance(_h_r, (int, float)) and abs(_h_r - 120) < 1e-6, "Pour I = 1 W·m⁻², le niveau doit valoir 120 dB : prends le logarithme décimal du quotient I / I0, puis multiplie par 10."`,
      },
      {
        nom: "Doubler l'intensité ajoute environ 3 dB",
        code: `import math as _h_math
_h_ok = True
for _h_I in (3.0e-5, 1.0e-9):
    _h_a = niveau_sonore(_h_I)
    _h_b = niveau_sonore(2 * _h_I)
    _h_ok = _h_ok and isinstance(_h_a, (int, float)) and isinstance(_h_b, (int, float)) and abs(_h_b - _h_a - 10 * _h_math.log10(2)) < 1e-6
_h_msg = "Quand l'intensité double, le niveau doit augmenter d'environ 3 dB : vérifie que ta fonction prend le logarithme décimal du quotient I / I0."
if not _h_ok:
    # une fonction qui arrondit renvoie, pour des niveaux qui ne tombent pas juste, une valeur à moins de 1 dB du niveau
    # exact, sans lui être égale, et qui n'a pas plus de trois décimales
    _h_arrondi = True
    for _h_I in (3.0e-5, 6.0e-5, 4.7e-3):
        _h_r = niveau_sonore(_h_I)
        _h_x = 10 * _h_math.log10(_h_I / 1.0e-12)
        _h_arrondi = _h_arrondi and isinstance(_h_r, (int, float)) and 1e-6 < abs(_h_r - _h_x) <= 1 and abs(_h_r * 1000 - round(_h_r * 1000)) < 1e-6
    if _h_arrondi:
        _h_msg = "Ta fonction arrondit le niveau : renvoie la valeur calculée, sans l'arrondir ; l'arrondi se fait à l'affichage."
assert _h_ok, _h_msg`,
      },
    ],
    indices: [
      "La fonction calcule le quotient I / I0, en prend le logarithme décimal, multiplie le résultat par 10, puis le renvoie avec return.",
      "En Python, le logarithme décimal s'écrit math.log10(x). Attention : math.log(x) calcule le logarithme népérien, noté ln.",
      "Le calcul tient sur une ligne : 10 fois math.log10 du quotient de I par I0, rangé dans L. La ligne suivante renvoie L.",
    ],
    solution: `import math

I0 = 1.0e-12    # intensité sonore de référence, en W/m2


def niveau_sonore(I):
    L = 10 * math.log10(I / I0)
    return L


print(niveau_sonore(1.0e-6), "dB")    # une conversation
print(niveau_sonore(3.0e-2), "dB")    # un concert
`,
    explication: [
      "math.log10 calcule le logarithme décimal, noté log dans la fiche ; math.log calcule le logarithme népérien : avec lui, on trouverait 23 dB au lieu de 10 dB pour I = 10 × I0.",
      "Chaque fois que l'intensité est multipliée par 10, le niveau augmente de 10 dB : de I0 à 1 W·m⁻², il passe de 0 à 120 dB. Le programme trouve 60 dB pour la conversation et environ 105 dB pour le concert.",
      "Doubler l'intensité n'ajoute que 10 log 2, soit environ 3 dB : deux sources qui produisent chacune 80 dB donnent ensemble 83 dB, et non 160 dB.",
    ],
    etat: "brouillon",
  },
];
