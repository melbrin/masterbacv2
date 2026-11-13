# Liste les mots d'une fiche absents du dictionnaire français, pour repérer les fautes de frappe (les noms propres et les termes techniques sortent aussi).
# Demande le module pyspellchecker (pip install pyspellchecker).
# usage : orthographe.py <fiche.md> [autres fichiers .md]
import sys, re
from spellchecker import SpellChecker
sp = SpellChecker(language='fr')
vus = {}
for f in sys.argv[1:]:
    t = open(f, encoding='utf-8').read()
    t = re.sub(r'```.*?```', ' ', t, flags=re.S)
    t = re.sub(r'\$\$.*?\$\$', ' ', t, flags=re.S)
    t = re.sub(r'\$[^$\n]*\$', ' ', t)
    t = re.sub(r'<!--.*?-->', ' ', t, flags=re.S)
    t = re.sub(r'\{[^}]*\}', ' ', t)          # attributs
    t = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', t)
    t = re.sub(r'CIBLE:\w+', ' ', t)
    for m in re.finditer(r"[A-Za-zÀ-ÖØ-öø-ÿœŒ]+(?:-[A-Za-zÀ-ÖØ-öø-ÿœŒ]+)*", t.replace('’', "'")):
        w = m.group(0)
        for part in re.split(r"-", w):
            if len(part) < 3: continue
            vus.setdefault(part, 0); vus[part] += 1
inconnus = sp.unknown([w.lower() for w in vus])
for w in sorted(vus, key=str.lower):
    if w.lower() in inconnus:
        print('%4d  %s' % (vus[w], w))
