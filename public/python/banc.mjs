// Le banc Python du hub (décision 0016) : ce que Pyodide exécute pour un programme d'élève. Il sert tel quel dans le
// navigateur (public/python/atelier.mjs, un « worker ») et dans Node pour vérifier les exercices
// (tests/contenu/python.test.ts, scripts/python/) : les deux exécutent donc exactement la même chose.
//
// - Une petite partie de matplotlib.pyplot, écrite en Python : les tracés ne sont pas dessinés par Python mais envoyés
//   à la page, qui les dessine dans la charte. La vraie bibliothèque, avec ses dépendances, pèserait des dizaines de Mo.
// - L'exécutant : lance le programme, puis les vérifications de l'exercice, et rend un résultat en JSON, avec des
//   messages d'erreur expliqués en français.

export const PYPLOT = String.raw`
"""Une petite partie de matplotlib.pyplot pour le hub Python de MasterBac : les tracés sont envoyés à la page, qui les dessine."""
import json as _json
import math as _math
import builtins as _builtins

_figures = []
_fig = None
_MAX_FIGURES = 8
_MAX_POINTS = 20000
_COULEURS = {
    'b': 'bleu', 'blue': 'bleu', 'tab:blue': 'bleu', 'r': 'brique', 'red': 'brique', 'tab:red': 'brique',
    'g': 'vert', 'green': 'vert', 'tab:green': 'vert', 'k': 'encre', 'black': 'encre', 'c': 'cyan', 'cyan': 'cyan',
    'm': 'magenta', 'magenta': 'magenta', 'purple': 'magenta', 'tab:purple': 'magenta', 'y': 'sable', 'yellow': 'sable',
    'orange': 'cuivre', 'tab:orange': 'cuivre', 'brown': 'cuivre', 'gray': 'ardoise', 'grey': 'ardoise', 'w': 'blanc',
}
_DISPONIBLES = ('plot, scatter, quiver, arrow, hist, bar, axhline, axvline, xlabel, ylabel, title, grid, legend, '
                'xlim, ylim, axis, text, figure, subplots, subplot, show, savefig, close, clf')


def _nouvelle():
    # montree : le programme a appelé plt.show() pour cette figure ; sans cet appel, un vrai Python ne l'afficherait pas
    return {'courbes': [], 'fleches': [], 'barres': [], 'textes': [], 'lignes': [], 'titre': None, 'xlabel': None,
            'ylabel': None, 'grille': False, 'legende': False, 'xlim': None, 'ylim': None, 'egal': False, 'montree': False}


def _courante():
    global _fig
    if _fig is None:
        _fig = _nouvelle()
    return _fig


def _vide(f):
    return not (f['courbes'] or f['fleches'] or f['barres'] or f['textes'] or f['lignes'])


def _finir():
    global _fig
    if _fig is not None and not _vide(_fig) and len(_figures) < _MAX_FIGURES:
        _figures.append(_fig)
    _fig = None


def _reinitialiser():
    global _fig
    _figures.clear()
    _fig = None


def _exporter():
    _finir()
    return _json.dumps(_figures)


def _valeur(x, nom):
    if hasattr(x, 'item'):
        x = x.item()
    try:
        return float(x)
    except (TypeError, ValueError):
        raise TypeError(nom + ' doivent être des nombres : ' + repr(x) + " n'en est pas un. Vérifie la liste que tu traces.")


def _nombre(x, nom):
    v = _valeur(x, nom)
    if not _math.isfinite(v):
        raise ValueError(nom + ' doit être un nombre fini, pas ' + repr(v) + ' : vérifie le calcul qui le donne.')
    return v


def _nombres(v, nom='Les valeurs'):
    if hasattr(v, 'tolist'):
        v = v.tolist()
    if isinstance(v, (int, float)):
        return [float(v)]
    try:
        liste = list(v)
    except TypeError:
        raise TypeError(nom + ' doivent être une liste de nombres : donne une liste, ou un tableau numpy.')
    if len(liste) > _MAX_POINTS:
        raise ValueError('Trop de points à tracer (' + str(len(liste)) + ') : ' + str(_MAX_POINTS) + ' au plus. Prends un pas plus grand.')
    sortie = []
    for x in liste:
        if isinstance(x, (list, tuple)):
            raise TypeError(nom + ' doivent être une liste de nombres, pas une liste de listes : trace chaque liste à part.')
        v = _valeur(x, nom)
        # une valeur infinie ou « nan » laisse un trou dans le tracé
        sortie.append(v if _math.isfinite(v) else None)
    return sortie


def _finis(v, nom):
    return [x for x in _nombres(v, nom) if x is not None]


def _couleur(c):
    if c is None:
        return None
    return _COULEURS.get(str(c).lower(), None)


def _style(fmt):
    couleur = trait = marqueur = None
    reste = fmt or ''
    for t in ('--', '-.', '-', ':'):
        if t in reste:
            trait = t
            reste = reste.replace(t, '', 1)
            break
    for ch in reste:
        if ch in 'bgrcmykw':
            couleur = ch
        elif ch in 'o.+x*sd^v':
            marqueur = ch
    return couleur, trait, marqueur


def plot(*args, **kw):
    groupes = []
    a = list(args)
    while a:
        if len(a) >= 2 and not isinstance(a[1], str):
            x, y = a[0], a[1]
            a = a[2:]
        else:
            x, y = None, a[0]
            a = a[1:]
        fmt = a.pop(0) if a and isinstance(a[0], str) else ''
        groupes.append((x, y, fmt))
    for x, y, fmt in groupes:
        ys = _nombres(y, 'Les ordonnées')
        xs = [float(i) for i in range(len(ys))] if x is None else _nombres(x, 'Les abscisses')
        if len(xs) != len(ys):
            raise ValueError('plot : les abscisses (' + str(len(xs)) + ' valeurs) et les ordonnées (' + str(len(ys))
                             + " valeurs) n'ont pas la même longueur. Vérifie que les deux listes sont remplies dans la même boucle.")
        couleur, trait, marqueur = _style(fmt)
        couleur = kw.get('color', kw.get('c', couleur))
        trait = kw.get('linestyle', kw.get('ls', trait))
        marqueur = kw.get('marker', marqueur)
        if trait is None:
            trait = '' if marqueur else '-'
        _courante()['courbes'].append({'x': xs, 'y': ys, 'couleur': _couleur(couleur), 'trait': trait or '',
                                       'marqueur': marqueur or '', 'nom': kw.get('label')})
    return []


def scatter(x, y, s=None, c=None, marker='o', label=None, **kw):
    xs, ys = _nombres(x, 'Les abscisses'), _nombres(y, 'Les ordonnées')
    if len(xs) != len(ys):
        raise ValueError("scatter : les abscisses et les ordonnées n'ont pas la même longueur. Vérifie que les deux listes sont remplies ensemble.")
    _courante()['courbes'].append({'x': xs, 'y': ys, 'couleur': _couleur(kw.get('color', c)), 'trait': '',
                                   'marqueur': marker or 'o', 'nom': label})


def quiver(*args, angles=None, scale_units=None, scale=None, color=None, label=None, width=None, **kw):
    if len(args) >= 4:
        X, Y, U, V = args[:4]
    elif len(args) == 2:
        U, V = args
        n = len(_nombres(U, 'Les composantes'))
        X, Y = list(range(n)), [0] * n
    else:
        raise TypeError('quiver attend quatre listes : quiver(x, y, vx, vy).')
    xs, ys, us, vs = (_nombres(X, 'Les abscisses'), _nombres(Y, 'Les ordonnées'),
                      _nombres(U, 'Les composantes'), _nombres(V, 'Les composantes'))
    if not (len(xs) == len(ys) == len(us) == len(vs)):
        raise ValueError("quiver : les quatre listes (x, y, vx, vy) n'ont pas la même longueur. Avec n positions, on a n - 1 vitesses : trace-les depuis x[:-1] et y[:-1].")
    echelle = None
    # avec scale_units='xy', une flèche de composantes (vx, vy) mesure (vx / scale, vy / scale) dans les unités du
    # graphique ; sans, la page choisit elle-même une longueur lisible, comme matplotlib
    if scale is not None and scale_units == 'xy':
        echelle = _nombre(scale, "L'échelle")
        if echelle == 0:
            raise ValueError("quiver : l'échelle ne peut pas valoir 0. Donne-lui une valeur positive, ou retire-la.")
    _courante()['fleches'].append({'x': xs, 'y': ys, 'u': us, 'v': vs, 'echelle': echelle,
                                   'couleur': _couleur(color), 'nom': label})


def arrow(x, y, dx, dy, color=None, **kw):
    _courante()['fleches'].append({'x': [_nombre(x, 'x')], 'y': [_nombre(y, 'y')], 'u': [_nombre(dx, 'dx')],
                                   'v': [_nombre(dy, 'dy')], 'echelle': 1.0, 'couleur': _couleur(color), 'nom': None})


def hist(x, bins=10, range=None, density=False, color=None, label=None, **kw):
    valeurs = _finis(x, 'Les valeurs')
    if not valeurs:
        raise ValueError('hist : la liste des valeurs est vide. Vérifie que ta liste de mesures est remplie avant de tracer.')
    if isinstance(bins, int):
        bas, haut = (min(valeurs), max(valeurs)) if range is None else (_nombre(range[0], 'range'), _nombre(range[1], 'range'))
        if haut == bas:
            haut = bas + 1.0
        bords = [bas + (haut - bas) * i / bins for i in _builtins.range(bins + 1)]
    else:
        bords = _finis(bins, 'Les classes')
    comptes = [0] * (len(bords) - 1)
    for v in valeurs:
        for i in _builtins.range(len(comptes)):
            dernier = i == len(comptes) - 1
            if bords[i] <= v < bords[i + 1] or (dernier and v == bords[i + 1]):
                comptes[i] += 1
                break
    if density:
        total = sum(comptes)
        comptes = [c / (total * (bords[i + 1] - bords[i])) for i, c in enumerate(comptes)]
    f = _courante()
    for i, c in enumerate(comptes):
        f['barres'].append({'x0': bords[i], 'x1': bords[i + 1], 'h': float(c), 'couleur': _couleur(color)})
    if label:
        f['legende_barres'] = label
    return comptes, bords, None


def bar(x, height, width=0.8, color=None, label=None, **kw):
    xs, hs = _nombres(x, 'Les abscisses'), _nombres(height, 'Les hauteurs')
    if len(xs) != len(hs):
        raise ValueError("bar : les abscisses et les hauteurs n'ont pas la même longueur. Donne une hauteur par abscisse.")
    w = _nombre(width, 'La largeur')
    f = _courante()
    for a, h in zip(xs, hs):
        if a is not None and h is not None:
            f['barres'].append({'x0': a - w / 2, 'x1': a + w / 2, 'h': h, 'couleur': _couleur(color)})


def axhline(y=0, color=None, linestyle='-', **kw):
    _courante()['lignes'].append({'sens': 'h', 'valeur': _nombre(y, 'y'), 'couleur': _couleur(color), 'trait': linestyle})


def axvline(x=0, color=None, linestyle='-', **kw):
    _courante()['lignes'].append({'sens': 'v', 'valeur': _nombre(x, 'x'), 'couleur': _couleur(color), 'trait': linestyle})


def xlabel(s, **kw):
    _courante()['xlabel'] = str(s)


def ylabel(s, **kw):
    _courante()['ylabel'] = str(s)


def title(s, **kw):
    _courante()['titre'] = str(s)


def grid(b=True, *a, **kw):
    _courante()['grille'] = bool(b) if b is not None else True


def legend(*a, **kw):
    _courante()['legende'] = True


def _bornes(a, b):
    if b is None and isinstance(a, (list, tuple)) and len(a) == 2:
        a, b = a
    return [_nombre(a, 'La borne'), _nombre(b, 'La borne')]


def xlim(a=None, b=None, **kw):
    if a is not None:
        _courante()['xlim'] = _bornes(a, b)


def ylim(a=None, b=None, **kw):
    if a is not None:
        _courante()['ylim'] = _bornes(a, b)


def axis(arg=None, **kw):
    f = _courante()
    if arg in ('equal', 'scaled', 'square'):
        f['egal'] = True
    elif isinstance(arg, (list, tuple)) and len(arg) == 4:
        f['xlim'] = [_nombre(arg[0], 'La borne'), _nombre(arg[1], 'La borne')]
        f['ylim'] = [_nombre(arg[2], 'La borne'), _nombre(arg[3], 'La borne')]


def text(x, y, s, **kw):
    _courante()['textes'].append({'x': _nombre(x, 'x'), 'y': _nombre(y, 'y'), 'texte': str(s)})


def figure(*a, **kw):
    _finir()


def subplot(*a, **kw):
    if _fig is not None and not _vide(_fig):
        _finir()
    return _Axes()


def show(*a, **kw):
    if _fig is not None:
        _fig['montree'] = True
    _finir()


def savefig(*a, **kw):
    _finir()


def close(*a, **kw):
    global _fig
    _fig = None


def clf(*a, **kw):
    global _fig
    _fig = None


class _Axes:
    """Ce qu'on appelle « ax » dans fig, ax = plt.subplots() : ses méthodes reprennent celles de plt."""
    def plot(self, *a, **k): return plot(*a, **k)
    def scatter(self, *a, **k): return scatter(*a, **k)
    def quiver(self, *a, **k): return quiver(*a, **k)
    def arrow(self, *a, **k): return arrow(*a, **k)
    def hist(self, *a, **k): return hist(*a, **k)
    def bar(self, *a, **k): return bar(*a, **k)
    def axhline(self, *a, **k): return axhline(*a, **k)
    def axvline(self, *a, **k): return axvline(*a, **k)
    def text(self, *a, **k): return text(*a, **k)
    def set_xlabel(self, s, **k): xlabel(s)
    def set_ylabel(self, s, **k): ylabel(s)
    def set_title(self, s, **k): title(s)
    def set_xlim(self, *a, **k): xlim(*a)
    def set_ylim(self, *a, **k): ylim(*a)
    def grid(self, *a, **k): grid(*a)
    def legend(self, *a, **k): legend()
    def axis(self, *a, **k): axis(*a)
    def set_aspect(self, a, **k):
        if a == 'equal':
            axis('equal')


class _Figure:
    def savefig(self, *a, **k): savefig()
    def show(self, *a, **k): show()


def subplots(*a, **kw):
    if _fig is not None and not _vide(_fig):
        _finir()
    return _Figure(), _Axes()


def gca():
    return _Axes()


def __getattr__(nom):
    raise AttributeError('matplotlib.pyplot.' + nom + " n'est pas disponible dans le hub Python. Disponible : " + _DISPONIBLES)
`;

export const EXECUTANT = String.raw`
import sys as _sys, io as _io, json as _json, traceback as _traceback, importlib as _importlib
import matplotlib.pyplot as _plt_hub

_HUB_FICHIER = '<ton programme>'
_HUB_EXPLICATIONS = {
    'NameError': "Python ne connaît pas ce nom : vérifie son orthographe (majuscules comprises), ou crée la variable avant de t'en servir.",
    'ZeroDivisionError': "Division par zéro : à ce moment du programme, le dénominateur vaut 0. Affiche-le avec print juste avant pour voir d'où il vient.",
    'IndexError': "Tu demandes un élément qui n'existe pas : une liste de n éléments a des indices de 0 à n - 1.",
    'TypeError': "Une opération mélange des choses qui ne vont pas ensemble : un nombre et une liste, un texte et un nombre, ou une fonction appelée avec un mauvais nombre de valeurs.",
    'ValueError': "Une valeur ne convient pas à l'opération demandée, par exemple la racine carrée ou le logarithme d'un nombre négatif.",
    'KeyError': "Cette clé n'existe pas dans le dictionnaire : vérifie son orthographe, ou ajoute-la avant de la lire.",
    'AttributeError': "Cet objet n'a pas cette méthode ou cet attribut : vérifie le nom après le point.",
    'ModuleNotFoundError': "Ce module n'est pas disponible ici. Au bac, on se sert de math, random, numpy et matplotlib.pyplot.",
    'ImportError': "Cet import n'est pas possible ici. Au bac, on se sert de math, random, numpy et matplotlib.pyplot.",
    'RecursionError': "Une fonction s'appelle elle-même sans fin : vérifie qu'elle a un cas où elle s'arrête.",
    'OverflowError': "Un nombre devient trop grand pour être calculé : vérifie la formule, ou le nombre de tours de la boucle.",
    'UnboundLocalError': "Une variable est utilisée dans une fonction avant d'y recevoir une valeur.",
    'IndentationError': "Le décalage des lignes n'est pas cohérent : après un « : », les lignes du bloc sont décalées de la même façon (quatre espaces).",
    'TabError': "Le décalage des lignes mélange tabulations et espaces : utilise seulement des espaces.",
    'SyntaxError': "Python ne comprend pas cette ligne : deux-points oublié après for, if, def ou while, parenthèse ou crochet non fermé, guillemet oublié.",
    'EOFError': "Le hub ne permet pas de taper une valeur au clavier pendant l'exécution : donne-la directement dans le programme.",
    'AssertionError': "Une vérification « assert » de ton programme est fausse : relis sa condition, ou les valeurs qu'elle compare.",
}


def _hub_ligne(code, n):
    lignes = code.split('\n')
    return lignes[n - 1].strip() if n and 1 <= n <= len(lignes) else None


def _hub_erreur(e, code):
    nom = type(e).__name__
    ligne = None
    if isinstance(e, SyntaxError) and e.filename == _HUB_FICHIER:
        ligne = e.lineno
    else:
        for cadre in _traceback.extract_tb(e.__traceback__):
            if cadre.filename == _HUB_FICHIER:
                ligne = cadre.lineno
    message = e.msg if isinstance(e, SyntaxError) else str(e)
    return {'type': nom, 'message': message, 'ligne': ligne, 'texte': _hub_ligne(code, ligne),
            'explication': _HUB_EXPLICATIONS.get(nom, "Le programme s'est arrêté sur une erreur : relis la ligne indiquée et celles juste avant.")}


def _hub_executer(code, tests_json, mode):
    global _plt_hub
    # Python reste chargé d'un lancement à l'autre : un programme qui a écrit plt.xlabel = "t" a remplacé la fonction
    # par un texte. Le petit pyplot est donc rechargé à chaque lancement, figures vidées comprises.
    _plt_hub = _importlib.reload(_plt_hub)
    ns = {'__name__': '__main__'}
    res = {'ok': True, 'erreur': None, 'figures': [], 'tests': []}
    try:
        programme = compile(code, _HUB_FICHIER, 'exec')
    except SyntaxError as e:
        res['ok'] = False
        res['erreur'] = _hub_erreur(e, code)
        programme = None
    if programme is not None:
        try:
            exec(programme, ns)
        except SystemExit:
            pass
        except Exception as e:
            res['ok'] = False
            res['erreur'] = _hub_erreur(e, code)
    try:
        res['figures'] = _json.loads(_plt_hub._exporter())
    except Exception:
        res['figures'] = []
    if mode == 'verifier':
        tests = _json.loads(tests_json)
        if not res['ok']:
            res['tests'] = [{'nom': t['nom'], 'ok': False, 'message': "Ton programme s'arrête sur une erreur : corrige-la d'abord."} for t in tests]
        else:
            ns['_figures_hub'] = res['figures']
            ancienne = _sys.stdout
            _sys.stdout = _io.StringIO()
            try:
                for t in tests:
                    try:
                        exec(compile(t['code'], '<vérification>', 'exec'), ns)
                        res['tests'].append({'nom': t['nom'], 'ok': True, 'message': ''})
                    except AssertionError as e:
                        res['tests'].append({'nom': t['nom'], 'ok': False, 'message': str(e) or "Ce n'est pas encore ça."})
                    except Exception as e:
                        nom = type(e).__name__
                        if nom == 'NameError' and getattr(e, 'name', None):
                            message = '« ' + e.name + " » n'existe pas dans ton programme : garde les noms de l'énoncé."
                        else:
                            # le programme tourne, mais ce qu'il calcule ne se laisse pas encore vérifier (une liste
                            # qui contient autre chose que des nombres, une fonction qui ne renvoie rien...)
                            message = ("Cette vérification n'a pas pu aller au bout (" + nom + '). '
                                       "Regarde d'abord les autres vérifications qui ne passent pas.")
                        res['tests'].append({'nom': t['nom'], 'ok': False, 'message': message})
            finally:
                _sys.stdout = ancienne
    return _json.dumps(res)
`;

/**
 * Prépare un Python tout juste chargé : le petit matplotlib et l'exécutant.
 * @param {import("pyodide").PyodideInterface} pyodide
 */
export async function prepare(pyodide) {
  pyodide.FS.mkdirTree("/home/pyodide/_hub/matplotlib");
  pyodide.FS.writeFile("/home/pyodide/_hub/matplotlib/__init__.py", "__version__ = 'hub MasterBac'\n");
  pyodide.FS.writeFile("/home/pyodide/_hub/matplotlib/pyplot.py", PYPLOT);
  pyodide.runPython("import sys\nif '/home/pyodide/_hub' not in sys.path: sys.path.insert(0, '/home/pyodide/_hub')");
  pyodide.runPython(EXECUTANT);
}

/**
 * Les modules que le programme importe, sans planter sur un programme mal écrit.
 * @param {import("pyodide").PyodideInterface} pyodide
 * @param {string} code
 * @returns {string[]}
 */
function importsDe(pyodide, code) {
  try {
    const liste = pyodide.pyimport("pyodide.code").find_imports(code);
    const imports = liste.toJs();
    liste.destroy?.();
    return imports;
  } catch {
    return [];
  }
}

/**
 * Exécute un programme d'élève. `mode` vaut « lancer » (le programme seul) ou « verifier » (le programme, puis les
 * vérifications de l'exercice, dans le même espace de noms). Rend { ok, erreur, figures, tests }.
 * @param {import("pyodide").PyodideInterface} pyodide
 * @param {{ code: string, tests?: { nom: string, code: string }[], mode?: "lancer" | "verifier" }} demande
 */
export async function executer(pyodide, { code, tests = [], mode = "lancer" }) {
  if (importsDe(pyodide, code).includes("numpy")) {
    try {
      await pyodide.loadPackage("numpy", { messageCallback: () => {}, errorCallback: () => {} });
    } catch {
      // le programme dira lui-même que numpy manque
    }
  }
  pyodide.globals.set("_hub_code", code);
  pyodide.globals.set("_hub_tests", JSON.stringify(tests));
  pyodide.globals.set("_hub_mode", mode);
  const json = await pyodide.runPythonAsync("_hub_executer(_hub_code, _hub_tests, _hub_mode)");
  return JSON.parse(json);
}
