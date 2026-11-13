# Retrouve la page de chaque titre dans le PDF rendu, pour remplir le sommaire et les boutons de renvoi.
import sys, json, re, pymupdf
pdf, titres, out = sys.argv[1], sys.argv[2], sys.argv[3]
heads = json.load(open(titres, encoding='utf-8'))
doc = pymupdf.open(pdf)
found = {}
def norm(s): return re.sub(r'\s+', ' ', s.replace('\u00a0', ' ')).strip()
KEY = r'(Q\.\d+|Exercice \d+)'
for pno, page in enumerate(doc, start=1):
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            txt = norm(''.join(s['text'] for s in l['spans']))
            size = max((s['size'] for s in l['spans']), default=0)
            if size < 11.5 or not txt or pno < 2: continue
            for h in heads:
                if h['ancre'] in found: continue
                t = norm(h['titre'])
                if h['niveau'] == 1:
                    ok = size > 20 and t.startswith(txt[:25])
                elif h['niveau'] in (2, 3):
                    k = re.match(KEY, t)
                    ok = bool(k) and 11.5 <= size < 13 and re.match(re.escape(k.group(1)) + r'(\s|$)', txt) is not None
                else:
                    k = re.match(r'Corrigé ' + KEY, t)
                    ok = bool(k) and 11.5 <= size < 13 and re.match(r'Corrigé ' + re.escape(k.group(1)) + r'(\s|$)', txt) is not None
                if ok: found[h['ancre']] = str(pno)
missing = [h['titre'][:40] for h in heads if h['ancre'] not in found]
json.dump(found, open(out, 'w'))
print(len(found), 'titres placés ; manquants :', missing)
