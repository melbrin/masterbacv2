# Chaîne de fabrication d'une fiche MasterBac : Markdown + LaTeX -> Word (équations natives) -> finitions.
# usage : build_fiche.py <fiche.md> <reference.docx> <sortie.docx> [pages.json]   (variable VARIANTE = complet ou cahier)
import sys, re, json, subprocess, os, copy
from lxml import etree
from docx import Document
from docx.shared import Cm, Pt
from docx.oxml.ns import qn
from docx.oxml import OxmlElement, parse_xml

SRC, REF, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
PAGES = json.load(open(sys.argv[4])) if len(sys.argv) > 4 and os.path.exists(sys.argv[4]) else {}
WORK = os.path.dirname(os.path.abspath(OUT))
W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
M_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math'
def m(t): return '{%s}%s' % (M_NS, t)
def w(t): return '{%s}%s' % (W_NS, t)

COULEURS = {'r': 'B23A2E', 'v': '2E6B4F', 'o': 'A47351', 'b': '2F5D8A'}
ANTH, CREME, LIGNE = '2B2C2D', 'FAF6F3', 'E3DDD8'
TEXTW = 9638

# ---------------------------------------------------------------- 1. préparation du Markdown
text = open(SRC, encoding='utf-8').read()
mm = re.match(r'<!--meta (.*?)-->', text)
META = json.loads(mm.group(1))
text = text[mm.end():]

# réglages communs à toutes les fiches : reglages.json, cherché en remontant depuis le dossier de la fiche
def trouve_reglages(depart):
    d = os.path.dirname(os.path.abspath(depart))
    while True:
        f = os.path.join(d, 'reglages.json')
        if os.path.exists(f): return f
        if os.path.dirname(d) == d: return None
        d = os.path.dirname(d)
RG = trouve_reglages(SRC)
RACINE = os.path.dirname(RG) if RG else os.path.dirname(os.path.abspath(SRC))
VARS = {k: v for k, v in (json.load(open(RG, encoding='utf-8')) if RG else {}).items() if not k.startswith('_')}
VARS.update(META)          # la fiche peut remplacer un réglage commun (par exemple "sessions")

# blocs communs : <!--inclure:nom--> est remplacé par le contenu de commun/nom.md
def inclure(mt):
    f = os.path.join(RACINE, 'commun', mt.group(1) + '.md')
    if not os.path.exists(f): sys.exit('bloc commun introuvable : ' + f)
    return open(f, encoding='utf-8').read().rstrip('\n') + '\n'
for _ in range(3):
    text = re.sub(r'<!--inclure:([\w-]+)-->\n?', inclure, text)

VARIANTE = os.environ.get('VARIANTE', 'complet')
# blocs réservés à une version : <!--debut:complet--> ... <!--fin:complet-->
text = re.sub(r'<!--debut:(\w+)-->\n?(.*?)<!--fin:\1-->\n?', lambda mt: mt.group(2) if mt.group(1) == VARIANTE else '', text, flags=re.S)
if VARIANTE == 'cahier':
    text = re.sub(r'::: \{custom-style="Renvoi"\}\n\[CIBLE:\w+\]\{custom-style="BoutonCorrige"\}\n:::\n', '', text)
    text = re.sub(r'(\\ )*\[CIBLE:\w+\]\{custom-style="BoutonCorrige"\}', '', text)

# valeurs calculées : date de mise à jour, nombre de questions et d'exercices
MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
if VARS.get('date_maj', 'auto') == 'auto':
    import datetime
    _d = datetime.date.today(); VARS['date_maj'] = '%s %d' % (MOIS[_d.month - 1], _d.year)
VARS['nb_questions'] = str(len(set(re.findall(r'\{#q(\d+)\}', text))))
VARS['nb_exercices'] = str(len(set(re.findall(r'\{#ex(\d+)\}', text))))
VARS.setdefault('entete', 'Fiche exercice {{numero}}  ·  {{matiere}}, terminale')
VARS.setdefault('document', 'Fiche exercice {{numero}} : {{titre}}')
VARS.setdefault('pied', '{{site}}  ·  {{compte}}')
VARS.setdefault('titre_court', '{{titre}}')     # titre rappelé en haut de chaque page : à donner dans la première ligne si le titre est long
def remplir(s):
    # {{cle}} est remplacé par la valeur du réglage ; une clé inconnue arrête la fabrication
    def val(mt):
        if mt.group(1) not in VARS: sys.exit('réglage inconnu : {{%s}}' % mt.group(1))
        return str(VARS[mt.group(1)])
    for _ in range(3):
        s = re.sub(r'\{\{(\w+)\}\}', val, s)
    return s
text = remplir(text)
META = {k: remplir(VARS[k]) for k in ('entete', 'titre', 'titre_court', 'document', 'pied')}
if VARIANTE == 'cahier':
    META['entete'] += "  ·  Cahier d'énoncés"
# ces textes ne passent pas par pandoc : l'apostrophe droite devient typographique, comme dans le corps de la fiche
META = {k: v.replace("'", "\u2019") for k, v in META.items()}

# largeurs de colonnes imposées : <!--colonnes: 17 11 13 ...--> juste avant un tableau (proportions, une valeur par colonne)
text = re.sub(r'<!--colonnes:\s*([\d\s.,]+?)\s*-->\n*',
              lambda mt: 'COLONNES:' + ' '.join(mt.group(1).replace(',', '.').split()) + '\n\n', text)

# <!--sans-saut--> avant un exercice : l'exercice suit la fin de la question précédente au lieu d'ouvrir une page
# (à réserver au cas où la question précédente déborde de deux ou trois lignes et où l'exercice tient dans la page)
text = re.sub(r'<!--sans-saut-->\n*', 'SANSSAUT:\n\n', text)

# formule seule dans un encadré « À retenir » : passe en équation hors ligne (taille normale des fractions)
text = re.sub(r'(::: \{custom-style="Retenir"\}\n)\$(?!\$)([^\n$]+)\$\n(:::)', r'\1$$\2$$\n\3', text)

def expand_colors(s):
    out, i, pat = [], 0, re.compile(r'\\c([RVOB])\{')
    while True:
        mt = pat.search(s, i)
        if not mt:
            out.append(s[i:]); break
        out.append(s[i:mt.start()])
        depth, j = 1, mt.end()
        while depth:
            depth += {'{': 1, '}': -1}.get(s[j], 0); j += 1
        out.append('\\text{⟦%s⟧}%s\\text{⟦/⟧}' % (mt.group(1).lower(), s[mt.end():j - 1]))
        i = j
    return ''.join(out)
text = expand_colors(text)
# repère d'équation : \lbl{(1)} devient un texte précédé d'espaces insécables, lisible dans tous les logiciels
text = re.sub(r'\\lbl\{([^}]*)\}', lambda mt: '\\text{' + '\u00a0' * 6 + '}(\\text{' + mt.group(1).replace('*', '\u2217') + '})', text)
# espaces larges dans une formule : \quad et \qquad deviennent des espaces insécables, rendus partout de la même façon
text = re.sub(r'\\qquad(?![A-Za-z])', lambda mt: '\\text{' + '\u00a0' * 6 + '}', text)
text = re.sub(r'\\quad(?![A-Za-z])', lambda mt: '\\text{' + '\u00a0' * 3 + '}', text)
# noms des styles : codes courts dans la source, noms lisibles dans Word
NAMES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'styles_map.json'), encoding='utf-8'))
text = re.sub(r'custom-style="([^"]+)"', lambda mt: 'custom-style="%s"' % NAMES.get(mt.group(1), mt.group(1)), text)

# une formule entre parenthèses : les parenthèses entrent dans la formule, pour qu'aucun saut de ligne ne les en sépare
text = re.sub(r'\(\$([^$\n]+)\$\)', r'$(\1)$', text)
# un axe écrit $(Oy)$ : en italique de texte, car LibreOffice sépare les deux lettres dans une formule
text = re.sub(r'\$\(O([xyz])\)\$', r'(*O\1*)', text)

def typo(seg):
    seg = re.sub(r' ([:;?!])', '\u00a0\\1', seg)
    seg = re.sub(r'\bEx\. (\d)', 'Ex.\u00a0\\1', seg)          # « Ex. 2 » ne se coupe pas en fin de ligne
    # un nombre et son unité ne se séparent pas en fin de ligne (« 33 km », « 2 cm », « 10 % »)
    seg = re.sub(r'(?<=\d) (?=(?:km|cm|mm|m|ms|s|min|h|kg|g|mg|N|J|kJ|W|kW|Pa|hPa|K|L|mL|mol|V|A|%|°C)(?![A-Za-zÀ-ÿ0-9]))', '\u00a0', seg)
    return seg.replace('« ', '«\u00a0').replace(' »', '\u00a0»')
lines, raw = [], False
for line in text.split('\n'):
    if line.startswith('```'):
        raw = not raw; lines.append(line); continue
    if raw or line.startswith(':::') or line.startswith('$$') or line.startswith('|---'):
        lines.append(line); continue
    parts = line.split('$')
    for k in range(0, len(parts), 2):
        parts[k] = typo(parts[k])
    lines.append('$'.join(parts))
text = '\n'.join(lines)
assert '—' not in text and '–' not in text, 'tiret long dans la source'
prepared = os.path.join(WORK, '_prepared.md')
open(prepared, 'w', encoding='utf-8').write(text)

stage = os.path.join(WORK, '_stage.docx')
r = subprocess.run(['pandoc', prepared, '-f', 'markdown-implicit_figures', '-t', 'docx',
                    '--reference-doc', REF, '--resource-path', os.path.dirname(os.path.abspath(SRC)),
                    '-o', stage], capture_output=True, text=True)
if r.stderr.strip():
    print('PANDOC:', r.stderr.strip()[:3000])
if r.returncode:
    sys.exit(1)

# ---------------------------------------------------------------- 2. finitions sur le document Word
doc = Document(stage)
body = doc.element.body

def ptext(p):
    return ''.join(t.text or '' for t in p.iter() if t.tag in (w('t'), m('t')))

def pstyle(p):
    ppr = p.find(w('pPr'))
    if ppr is None: return None
    st = ppr.find(w('pStyle'))
    return st.get(w('val')) if st is not None else None

def color_rpr(val):
    return parse_xml('<w:rPr xmlns:w="%s"><w:color w:val="%s"/></w:rPr>' % (W_NS, val))

# 2a. couleurs dans les équations (marqueurs ⟦r⟧ ... ⟦/⟧)
ncol = 0
for om in list(body.iter(m('oMath'))):
    cur, kill = None, []
    for el in list(om.iter()):
        if el.tag == m('r'):
            t = ''.join(x.text or '' for x in el.findall(m('t')))
            mk = re.fullmatch(r'⟦(/|[rvob])⟧', t)
            if mk:
                cur = None if mk.group(1) == '/' else COULEURS[mk.group(1)]
                kill.append(el); continue
            if cur:
                ncol += 1
                old = el.find(w('rPr'))
                if old is not None: el.remove(old)
                mr = el.find(m('rPr'))
                if mr is not None: mr.addnext(color_rpr(cur))
                else: el.insert(0, color_rpr(cur))
        elif cur and el.tag in (m('f'), m('rad')):
            pr = el.find(m('fPr') if el.tag == m('f') else m('radPr'))
            if pr is None:
                pr = OxmlElement('m:fPr' if el.tag == m('f') else 'm:radPr'); el.insert(0, pr)
            ctrl = parse_xml('<m:ctrlPr xmlns:m="%s" xmlns:w="%s"><w:rPr><w:color w:val="%s"/></w:rPr></m:ctrlPr>'
                             % (M_NS, W_NS, cur))
            pr.append(ctrl)
    for el in kill:
        el.getparent().remove(el)
assert '⟦' not in ''.join(t.text or '' for t in body.iter(m('t'))), 'marqueur de couleur restant'

# 2b. virgule décimale : un seul run « 3,2 » pour que Word n'ajoute pas d'espace après la virgule
nvirg = 0
for r_ in list(body.iter(m('r'))):
    t = r_.find(m('t'))
    if t is None or t.text != ',' or r_.getparent() is None: continue
    prev, nxt = r_.getprevious(), r_.getnext()
    if prev is None or nxt is None or prev.tag != m('r'): continue
    if nxt.tag in (m('sSup'), m('sSub'), m('sSubSup')):
        # « 3,0 » suivi d'un exposant (3,0 au carré) : le nombre entier devient la base de l'exposant
        base = nxt.find(m('e'))
        kids = list(base) if base is not None else []
        pt = prev.find(m('t'))
        if len(kids) == 1 and kids[0].tag == m('r') and pt is not None:
            nt = kids[0].find(m('t'))
            if nt is not None and re.fullmatch(r'\d+', pt.text or '') and re.fullmatch(r'\d+', nt.text or ''):
                nt.text = pt.text + ',' + nt.text
                if kids[0].find(m('rPr')) is None:
                    kids[0].insert(0, parse_xml('<m:rPr xmlns:m="%s"><m:nor/></m:rPr>' % M_NS))
                par = r_.getparent(); par.remove(r_); par.remove(prev); nvirg += 1
        continue
    if nxt.tag != m('r'): continue
    pt, nt = prev.find(m('t')), nxt.find(m('t'))
    if pt is None or nt is None: continue
    if re.fullmatch(r'\d+', pt.text or '') and re.fullmatch(r'\d+', nt.text or ''):
        pt.text = pt.text + ',' + nt.text
        if prev.find(m('rPr')) is None:
            prev.insert(0, parse_xml('<m:rPr xmlns:m="%s"><m:nor/></m:rPr>' % M_NS))
        par = r_.getparent(); par.remove(r_); par.remove(nxt); nvirg += 1

for t in body.iter(m('t')):
    if t.text and (t.text != t.text.strip() or t.text.strip() == ''):
        t.set('{http://www.w3.org/XML/1998/namespace}space', 'preserve')

# 2c. un texte d'annonce (« Soit : ») reste avec l'équation qui le suit
paras = [p for p in body.iter(w('p'))]
for i, p in enumerate(paras[:-1]):
    nxt = p.getnext()
    if nxt is None or nxt.tag != w('p') or nxt.find(m('oMathPara')) is None: continue
    if p.find(m('oMathPara')) is not None: continue
    txt = ptext(p).strip()
    if len(txt) <= 140:
        ppr = p.find(w('pPr'))
        if ppr is None:
            ppr = OxmlElement('w:pPr'); p.insert(0, ppr)
        if ppr.find(w('keepNext')) is None:
            kn = OxmlElement('w:keepNext')
            st = ppr.find(w('pStyle'))
            if st is not None: st.addnext(kn)
            else: ppr.insert(0, kn)

# 2c bis. mise en page des énoncés et des corrigés
def flag(p, tag):
    ppr = p.find(w('pPr'))
    if ppr is None:
        ppr = OxmlElement('w:pPr'); p.insert(0, ppr)
    if ppr.find(w(tag)) is None:
        ppr.append(OxmlElement('w:' + tag))
def voisin(p, sens):
    q = p.getprevious() if sens < 0 else p.getnext()
    while q is not None and q.tag != w('p'):
        q = q.getprevious() if sens < 0 else q.getnext()
    return q
# un saut de page seul dans son paragraphe devient un « saut de page avant » du paragraphe suivant :
# sinon, quand la page précédente est pleine, ce paragraphe vide passe seul sur une page blanche
for p in list(body.iter(w('p'))):
    runs = p.findall(w('r'))
    autres = [c for c in p if c.tag not in (w('pPr'), w('r'))]
    if len(runs) == 1 and not autres and [c.tag for c in runs[0] if c.tag != w('rPr')] == [w('br')] \
            and runs[0].find(w('br')).get(w('type')) == 'page':
        n = p.getnext()
        while n is not None and n.tag in (w('bookmarkStart'), w('bookmarkEnd')):
            n = n.getnext()
        if n is not None and n.tag == w('p'):
            flag(n, 'pageBreakBefore'); p.getparent().remove(p)
sans_saut = set()
for p in list(body.iter(w('p'))):
    if ptext(p).strip() == 'SANSSAUT:':
        n = voisin(p, +1)
        while n is not None and not (pstyle(n) in ('Heading2', 'Heading3') and ptext(n).startswith('Exercice')):
            n = voisin(n, +1)
        if n is not None: sans_saut.add(n)
        p.getparent().remove(p)
for p in list(body.iter(w('p'))):
    st = pstyle(p)
    if st in ('Heading2', 'Heading3') and ptext(p).startswith('Exercice') and p in sans_saut:
        pass
    elif st in ('Heading2', 'Heading3') and ptext(p).startswith('Exercice'):
        # chaque exercice ouvre une page ; la rubrique « Exercices » reste avec le premier
        q = voisin(p, -1)
        flag(q if (q is not None and pstyle(q) == 'Rubrique') else p, 'pageBreakBefore')
    elif st == 'Heading4':
        n = voisin(p, +1)
        if n is not None and pstyle(n) == 'Renvoi':
            flag(n, 'keepNext')
    elif st in ('Remarque', 'Methode', 'Piege', 'Redaction', 'Retenir'):
        # un encadré de plusieurs paragraphes (texte puis formule) reste d'un seul tenant sur la page
        n = p.getnext()
        if n is not None and n.tag == w('p') and pstyle(n) == st:
            flag(p, 'keepNext')
    elif st == 'Enonce' and re.match(r'^Partie [A-Z]\b', ptext(p).strip()) and len(ptext(p)) <= 90:
        # un titre de partie (« Partie B. … ») ne reste jamais seul en bas de page : il suit sa première question
        flag(p, 'keepNext')
    elif st == 'Meta':
        # question sans texte d'énoncé : la ligne d'information ne doit pas entraîner la suite sur la page suivante
        n = voisin(p, +1)
        if n is None or pstyle(n) in ('Heading1', 'Heading2', 'Heading3', 'Heading4', 'Rubrique', 'Surtitre'):
            ppr = p.find(w('pPr'))
            for old in ppr.findall(w('keepNext')): ppr.remove(old)
            kn = OxmlElement('w:keepNext'); kn.set(w('val'), '0')
            ppr.find(w('pStyle')).addnext(kn)

# 2d. tableaux
LARGEURS = {4: [2100, 2650, 3150, 1738], 2: None}
tables = list(body.iter(w('tbl')))
for ti, tbl in enumerate(tables):
    rows = tbl.findall(w('tr'))
    ncols = len(rows[0].findall(w('tc')))
    head = ptext(rows[0])
    swatch = 'Code' in head
    impose = None
    prec = tbl.getprevious()
    if prec is not None and prec.tag == w('p') and ptext(prec).strip().startswith('COLONNES:'):
        vals = [float(x) for x in ptext(prec).strip()[9:].split()]
        if len(vals) != ncols:
            sys.exit('colonnes : %d largeurs données pour un tableau de %d colonnes' % (len(vals), ncols))
        impose = [int(TEXTW * v / sum(vals)) for v in vals]
        impose[-1] += TEXTW - sum(impose)
        prec.getparent().remove(prec)
    if impose: widths = impose
    elif swatch: widths = [520, 1750, 1250, 6118]
    elif 'Relation' in head: widths = [2050, 3350, 4238]
    elif 'Session' in head: widths = LARGEURS[4]
    elif 'Objectif' in head: widths = [1500, 3500, 4638]
    elif 'Notion' in head: widths = [4500, 5138]
    elif 'Style' in head: widths = [2900, 6738]
    else: widths = [TEXTW // ncols] * ncols
    total = sum(widths)
    serre = 'Session' in head            # tableau « Ce qui est tombé » : marges et texte resserrés
    marge = 20 if serre else 70
    old = tbl.find(w('tblPr'))
    if old is not None: tbl.remove(old)
    tblpr = parse_xml(
        '<w:tblPr xmlns:w="%s"><w:tblW w:w="%d" w:type="dxa"/><w:tblBorders>'
        '<w:top w:val="single" w:sz="4" w:space="0" w:color="%s"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="%s"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="%s"/></w:tblBorders>'
        '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="%d" w:type="dxa"/><w:left w:w="100" w:type="dxa"/>'
        '<w:bottom w:w="%d" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>'
        % (W_NS, total, LIGNE, LIGNE, LIGNE, marge, marge))
    tbl.insert(0, tblpr)
    grid = tbl.find(w('tblGrid'))
    if grid is not None: tbl.remove(grid)
    grid = parse_xml('<w:tblGrid xmlns:w="%s">%s</w:tblGrid>'
                     % (W_NS, ''.join('<w:gridCol w:w="%d"/>' % x for x in widths)))
    tblpr.addnext(grid)
    for ri, tr in enumerate(rows):
        trpr = tr.find(w('trPr'))
        if trpr is None:
            trpr = OxmlElement('w:trPr'); tr.insert(0, trpr)
        if trpr.find(w('cantSplit')) is None:
            trpr.insert(0, OxmlElement('w:cantSplit'))
        if ri == 0 and trpr.find(w('tblHeader')) is None:
            trpr.append(OxmlElement('w:tblHeader'))
        for ci, tc in enumerate(tr.findall(w('tc'))):
            old = tc.find(w('tcPr'))
            if old is not None: tc.remove(old)
            fill = ANTH if ri == 0 else (CREME if ri % 2 == 0 else None)
            if swatch and ri > 0:
                hx = re.search(r'#([0-9A-Fa-f]{6})', ptext(tr))
                fill = hx.group(1).upper() if (ci == 0 and hx) else None
            x = '<w:tcPr xmlns:w="%s"><w:tcW w:w="%d" w:type="dxa"/>' % (W_NS, widths[ci])
            if fill: x += '<w:shd w:val="clear" w:color="auto" w:fill="%s"/>' % fill
            x += '<w:vAlign w:val="center"/></w:tcPr>'
            tc.insert(0, parse_xml(x))
            for p in tc.findall(w('p')):
                ppr = p.find(w('pPr'))
                if ppr is None:
                    ppr = OxmlElement('w:pPr'); p.insert(0, ppr)
                # l'alignement de colonne écrit dans la source (|:-:| centré, |--:| à droite) est gardé
                jc = ppr.find(w('jc'))
                aligne = jc.get(w('val')) if jc is not None else None
                for ch in list(ppr): ppr.remove(ch)
                st = OxmlElement('w:pStyle'); st.set(w('val'), 'TableauTete' if ri == 0 else ('TableauSerre' if serre else 'Tableau'))
                ppr.append(st)
                if aligne in ('center', 'right', 'end'):
                    j = OxmlElement('w:jc'); j.set(w('val'), aligne); ppr.append(j)
            if ri == 0:
                for mr_ in tc.iter(m('r')):
                    for old in mr_.findall(w('rPr')): mr_.remove(old)
                    mp = mr_.find(m('rPr'))
                    if mp is not None: mp.addnext(color_rpr('FFFFFF'))
                    else: mr_.insert(0, color_rpr('FFFFFF'))
    # un paragraphe vide après le tableau évite qu'il colle au texte suivant
    # (sauf si la suite ouvre une nouvelle page : ce paragraphe passerait seul sur une page blanche)
    nx = tbl.getnext()
    while nx is not None and nx.tag in (w('bookmarkStart'), w('bookmarkEnd')):
        nx = nx.getnext()
    nppr = nx.find(w('pPr')) if (nx is not None and nx.tag == w('p')) else None
    if nppr is not None and nppr.find(w('pageBreakBefore')) is not None:
        continue
    sp = parse_xml('<w:p xmlns:w="%s"><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/>'
                   '</w:pPr></w:p>' % W_NS)
    tbl.addnext(sp)

# 2e. titres, ancres et sommaire (champ TOC Word avec entrées déjà remplies)
def titre_segments(p):
    # Texte d'un titre pour le sommaire, formules comprises : liste de (texte, position),
    # la position valant '' (ligne), 'sub' (indice) ou 'sup' (exposant). x(t) garde ses parenthèses.
    segs = []
    def add(t, pos=''):
        if not t: return
        if segs and segs[-1][1] == pos: segs[-1] = (segs[-1][0] + t, pos)
        else: segs.append((t, pos))
    def om(e, pos=''):
        tag = etree.QName(e).localname
        if tag == 't': add(e.text or '', pos)
        elif tag in ('sSub', 'sSup', 'sSubSup'):
            for c in e:
                l = etree.QName(c).localname
                if l == 'e': om(c, pos)
                elif l in ('sub', 'sup'): om(c, pos or l)
        elif tag == 'd':
            beg, end = '(', ')'
            pr = e.find(m('dPr'))
            if pr is not None:
                bc, ec = pr.find(m('begChr')), pr.find(m('endChr'))
                if bc is not None: beg = bc.get(m('val'), '')
                if ec is not None: end = ec.get(m('val'), '')
            add(beg, pos)
            for k, c in enumerate(e.findall(m('e'))):
                if k: add(' ; ', pos)
                om(c, pos)
            add(end, pos)
        elif tag == 'f':
            om(e.find(m('num')), pos); add('/', pos); om(e.find(m('den')), pos)
        elif tag.endswith('Pr') or tag in ('degHide', 'deg'):
            return
        else:
            for c in e: om(c, pos)
    for c in p:
        if c.tag in (w('r'), w('hyperlink')):
            for t in c.iter(w('t')): add(t.text or '')
        elif c.tag in (m('oMath'), m('oMathPara')):
            om(c)
    out = []
    for t, pos in segs:
        if not pos: t = re.sub(r'\s*=\s*', ' = ', t)
        t = re.sub(r'\s+', ' ', t)
        if t: out.append((t, pos))
    if out: out[0] = (out[0][0].lstrip(), out[0][1]); out[-1] = (out[-1][0].rstrip(), out[-1][1])
    return out

NIV = {'Heading1': 1, 'Heading2': 2, 'Heading3': 3, 'Heading4': 4}
heads, ancres = [], {}
bid = 9000
for p in list(body.iter(w('p'))):
    st = pstyle(p)
    if st not in NIV: continue
    prev = p.getprevious()
    hid = prev.get(w('name')) if (prev is not None and prev.tag == w('bookmarkStart')) else None
    if hid is None:
        # pandoc 3.2 et suivants : l'ancre du titre est dans le paragraphe, et son nom commence par « _ »
        dedans = p.find(w('bookmarkStart'))
        if dedans is not None and dedans.get(w('name')):
            hid = dedans.get(w('name'))[1:] if dedans.get(w('name')).startswith('_') else dedans.get(w('name'))
    bid += 1
    name = 'mb_' + re.sub(r'[^A-Za-z0-9_]', '_', hid) if hid else '_Toc%d' % bid
    bs = OxmlElement('w:bookmarkStart'); bs.set(w('id'), str(bid)); bs.set(w('name'), name)
    be = OxmlElement('w:bookmarkEnd'); be.set(w('id'), str(bid))
    ppr = p.find(w('pPr')); ppr.addnext(bs); p.append(be)
    if hid: ancres[hid] = name
    heads.append((NIV[st], name, re.sub(r'\s+', ' ', ptext(p)).strip(), titre_segments(p)))

def esc(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
def fld(kind, rpr=''): return '<w:r>%s<w:fldChar w:fldCharType="%s"/></w:r>' % (rpr, kind)
toc_heads = [h for h in heads if h[0] <= 3]
toc_xml = []
VERT_ALIGN = {'sub': '<w:rPr><w:vertAlign w:val="subscript"/></w:rPr>', 'sup': '<w:rPr><w:vertAlign w:val="superscript"/></w:rPr>', '': ''}
for i, (lvl, name, title, segs) in enumerate(toc_heads):
    x = '<w:p xmlns:w="%s"><w:pPr><w:pStyle w:val="TOC%d"/></w:pPr>' % (W_NS, lvl)
    if i == 0:
        x += fld('begin') + '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r>' + fld('separate')
    x += '<w:hyperlink w:anchor="%s" w:history="1">' % name
    x += ''.join('<w:r>%s<w:t xml:space="preserve">%s</w:t></w:r>' % (VERT_ALIGN[pos], esc(t)) for t, pos in segs) + '<w:r><w:tab/></w:r>'
    x += fld('begin') + '<w:r><w:instrText xml:space="preserve"> PAGEREF %s \\h </w:instrText></w:r>' % name + fld('separate')
    x += '<w:r><w:t>%s</w:t></w:r>' % PAGES.get(name, '0') + fld('end') + '</w:hyperlink>'
    if i == len(toc_heads) - 1:
        x += fld('end')
    x += '</w:p>'
    toc_xml.append(parse_xml(x))
holder = [p for p in body.iter(w('p')) if ptext(p).strip() == 'SOMMAIREICI']
assert len(holder) == 1, 'emplacement du sommaire introuvable'
for el in reversed(toc_xml):
    holder[0].addnext(el)
body.remove(holder[0])
for st in doc.styles.element.findall(w('style')):
    nm = st.find(w('name'))
    if nm is not None and nm.get(w('val')) == 'SommairePlaceholder':
        doc.styles.element.remove(st)

# 2e bis. boutons de renvoi : « Voir le corrigé » et « Retour à l'énoncé », cliquables, avec le numéro de page
# espaces fines insécables (U+202F) : le bouton ne se coupe pas en fin de ligne, et LibreOffice peint son fond d'un seul tenant
# (avec l'espace insécable ordinaire, chaque espace est peinte à part et des liserés clairs apparaissent dans le bouton)
LIBELLE = {'BoutonCorrige': 'Voir\u202fle\u202fcorrigé,\u202fpage', 'BoutonEnonce': 'Retour\u202fà\u202fl\u2019énoncé,\u202fpage'}
nbout = 0
for r_ in list(body.iter(w('r'))):
    rpr = r_.find(w('rPr'))
    rs = rpr.find(w('rStyle')) if rpr is not None else None
    if rs is None or rs.get(w('val')) not in LIBELLE: continue
    txt = ''.join(x.text or '' for x in r_.findall(w('t')))
    if not txt.startswith('CIBLE:'): continue
    cible = txt[6:].strip()
    assert cible in ancres, 'cible de renvoi inconnue : ' + cible
    name, sty = ancres[cible], rs.get(w('val'))
    rp_ = '<w:rPr><w:rStyle w:val="%s"/></w:rPr>' % sty
    x = '<w:hyperlink xmlns:w="%s" w:anchor="%s" w:history="1">' % (W_NS, name)
    # le numéro de page est écrit en clair (calculé par les passes de fabrication) : un champ serait peint à part, avec un liseré
    x += '<w:r>%s<w:t xml:space="preserve">\u202f%s\u202f%s\u202f</w:t></w:r></w:hyperlink>' % (rp_, esc(LIBELLE[sty]), PAGES.get(name, '0'))
    r_.addprevious(parse_xml(x)); r_.getparent().remove(r_); nbout += 1

# 2e ter. l'air au-dessus d'un bandeau de titre. LibreOffice peint le fond d'un titre jusque sur son espace « avant » :
# le bandeau d'un corrigé touchait l'encadré qui le précède. Cet espace passe dans un paragraphe vide, sans fond, placé
# juste avant le titre, et le titre n'a plus d'espace avant. Entre deux paragraphes, LibreOffice ne garde que le plus grand
# des deux espaces (après le premier, avant le second) : le paragraphe vide mesure donc l'espace avant du titre, moins
# l'espace après du paragraphe qui précède. La hauteur totale ne change pas, la pagination non plus.
# Rien n'est ajouté devant un titre qui ouvre une page.
AVANT_TITRE = {'Heading2': 360, 'Heading3': 360, 'Heading4': 400}
STYLES_XML = {st.get(w('styleId')): st for st in doc.styles.element.findall(w('style'))}
def espace_apres(par):
    """L'espace après un paragraphe, en vingtièmes de point : le sien, sinon celui de son style (et de ses parents)."""
    ppr_ = par.find(w('pPr'))
    sp0 = ppr_.find(w('spacing')) if ppr_ is not None else None
    if sp0 is not None and sp0.get(w('after')) is not None: return int(sp0.get(w('after')))
    st_ = ppr_.find(w('pStyle')).get(w('val')) if (ppr_ is not None and ppr_.find(w('pStyle')) is not None) else 'Normal'
    vus = set()
    while st_ and st_ not in vus:
        vus.add(st_)
        el = STYLES_XML.get(st_)
        if el is None: break
        sp1 = el.find(w('pPr') + '/' + w('spacing'))
        if sp1 is not None and sp1.get(w('after')) is not None: return int(sp1.get(w('after')))
        bo = el.find(w('basedOn'))
        st_ = bo.get(w('val')) if bo is not None else None
    return 120   # espace après par défaut de la charte (pPrDefault)
nair = 0
for p in list(body.iter(w('p'))):
    st = pstyle(p)
    if st not in AVANT_TITRE: continue
    ppr = p.find(w('pPr'))
    if ppr.find(w('pageBreakBefore')) is not None: continue
    prev = p.getprevious()
    while prev is not None and prev.tag in (w('bookmarkStart'), w('bookmarkEnd')):
        prev = prev.getprevious()
    if prev is None or prev.tag != w('p'): continue
    if any(br.get(w('type')) == 'page' for br in prev.iter(w('br'))): continue
    hauteur = AVANT_TITRE[st] - espace_apres(prev)
    sp_ = ppr.find(w('spacing'))
    if sp_ is None:
        sp_ = OxmlElement('w:spacing'); ppr.append(sp_)
    sp_.set(w('before'), '0')
    if hauteur > 20:
        p.addprevious(parse_xml('<w:p xmlns:w="%s"><w:pPr><w:spacing w:before="0" w:after="0" w:line="%d" w:lineRule="exact"/>'
                                '</w:pPr></w:p>' % (W_NS, hauteur)))
    nair += 1

# 2f. page, en-tête et pied de page
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
sec.left_margin = sec.right_margin = Cm(2.0)
sec.top_margin, sec.bottom_margin = Cm(2.2), Cm(2.0)
sec.header_distance, sec.footer_distance = Cm(1.0), Cm(0.9)
sec.different_first_page_header_footer = True
sec.first_page_header.is_linked_to_previous = False
sec.first_page_footer.is_linked_to_previous = False
for part in (sec.first_page_header, sec.first_page_footer):
    for p_ in part.paragraphs:
        ppr_ = p_._p.find(w('pPr'))
        if ppr_ is not None: p_._p.remove(ppr_)
# les mentions légales vont dans le pied de la couverture : elles restent en bas quelle que soit la police
ftr = sec.first_page_footer._element
mentions = [p_ for p_ in body.iter(w('p')) if pstyle(p_) in ('MentionsTete', 'Mentions')]
if mentions:
    for p_ in list(ftr.findall(w('p'))): ftr.remove(p_)
    for p_ in mentions: ftr.append(p_)

def run(text, style=None, extra=''):
    x = '<w:r xmlns:w="%s">' % W_NS
    if style or extra:
        x += '<w:rPr>' + ('<w:rStyle w:val="%s"/>' % style if style else '') + extra + '</w:rPr>'
    return parse_xml(x + '<w:t xml:space="preserve">%s</w:t></w:r>' % esc(text))
TAB = '<w:r xmlns:w="%s"><w:tab/></w:r>' % W_NS

hp = sec.header.paragraphs[0]
he = hp._p
he.append(run('MasterBac', 'Marque'))
he.append(run('   ' + META['entete']))
he.append(parse_xml(TAB)); he.append(run(META['titre_court']))
fp = sec.footer.paragraphs[0]
fe = fp._p
fe.append(run(META['pied']))
fe.append(parse_xml(TAB)); fe.append(run('Page '))
for kind in ('begin', None, 'separate', 'num', 'end'):
    if kind is None:
        fe.append(parse_xml('<w:r xmlns:w="%s"><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>' % W_NS))
    elif kind == 'num':
        fe.append(run('1'))
    else:
        fe.append(parse_xml('<w:r xmlns:w="%s"><w:fldChar w:fldCharType="%s"/></w:r>' % (W_NS, kind)))

# 2g. propriétés du fichier
cp = doc.core_properties
cp.title = META['document']
cp.author = 'MasterBac'; cp.last_modified_by = 'MasterBac'
cp.subject = 'Physique-Chimie, terminale spécialité'; cp.language = 'fr-FR'
cp.keywords = 'MasterBac, fiches d\'exercices de l\'élite, BAC 2027'
cp.comments = ''

doc.save(OUT)

# ---------------------------------------------------------------- 3. mise en conformité stricte avec le schéma Word
import zipfile, shutil
from lxml import etree
SETTINGS_ORDER = """writeProtection view zoom removePersonalInformation removeDateAndTime doNotDisplayPageBoundaries
displayBackgroundShape printPostScriptOverText printFractionalCharacterWidth printFormsData embedTrueTypeFonts
embedSystemFonts saveSubsetFonts saveFormsData mirrorMargins alignBordersAndEdges bordersDoNotSurroundHeader
bordersDoNotSurroundFooter gutterAtTop hideSpellingErrors hideGrammaticalErrors activeWritingStyle proofState formsDesign
attachedTemplate linkStyles stylePaneFormatFilter stylePaneSortMethod documentType mailMerge revisionView trackRevisions
doNotTrackMoves doNotTrackFormatting documentProtection autoFormatOverride styleLockTheme styleLockQFSet defaultTabStop
autoHyphenation consecutiveHyphenLimit hyphenationZone doNotHyphenateCaps showEnvelope summaryLength clickAndTypeStyle
defaultTableStyle evenAndOddHeaders bookFoldRevPrinting bookFoldPrinting bookFoldPrintingSheets
drawingGridHorizontalSpacing drawingGridVerticalSpacing displayHorizontalDrawingGridEvery displayVerticalDrawingGridEvery
doNotUseMarginsForDrawingGridOrigin drawingGridHorizontalOrigin drawingGridVerticalOrigin doNotShadeFormData
noPunctuationKerning characterSpacingControl printTwoOnOne strictFirstAndLastChars noLineBreaksAfter noLineBreaksBefore
savePreviewPicture doNotValidateAgainstSchema saveInvalidXml ignoreMixedContent alwaysShowPlaceholderText
doNotDemarcateInvalidXml saveXmlDataOnly useXSLTWhenSaving saveThroughXslt showXMLTags alwaysMergeEmptyNamespace
updateFields hdrShapeDefaults footnotePr endnotePr compat docVars rsids mathPr attachedSchema themeFontLang
clrSchemeMapping doNotIncludeSubdocsInStats doNotAutoCompressPictures forceUpgrade captions readModeInkLockDown
smartTagType schemaLibrary shapeDefaults doNotEmbedSmartTags decimalSymbol listSeparator""".split()
KEEP = set(NAMES) | {'Normal', 'BodyText', 'FirstParagraph', 'Compact', 'Heading1', 'Heading2', 'Heading3', 'Heading4',
                     'Header', 'Footer', 'TOC1', 'TOC2', 'TOC3', 'Hyperlink', 'Figure'}

def local(e): return etree.QName(e).localname
PPR_ORDER = """pStyle keepNext keepLines pageBreakBefore framePr widowControl numPr suppressLineNumbers pBdr shd tabs
suppressAutoHyphens kinsoku wordWrap overflowPunct topLinePunct autoSpaceDE autoSpaceDN bidi adjustRightInd snapToGrid
spacing ind contextualSpacing mirrorIndents suppressOverlap jc textDirection textAlignment textboxTightWrap outlineLvl
divId cnfStyle rPr sectPr pPrChange""".split()
TCPR_ORDER = "cnfStyle tcW gridSpan hMerge vMerge tcBorders shd noWrap tcMar textDirection tcFitText vAlign hideMark".split()
def reorder(root, tag, order):
    for el in root.iter(w(tag)):
        kids = list(el)
        if all(local(k) in order for k in kids):
            srt = sorted(kids, key=lambda e: order.index(local(e)))
            if srt != kids:
                for k in kids: el.remove(k)
                for k in srt: el.append(k)

# Délimiteurs des formules. pandoc 3.14 écrit les parenthèses, les crochets et les barres d'une formule en simples
# caractères ; le pandoc des PDF d'origine en faisait des délimiteurs de Word (m:d), qui grandissent avec leur contenu.
# LibreOffice 24.2 ne sait pas lire un délimiteur fermant qui porte un indice : « [A]éq » sort en « ¿ ». Chaque paire
# ouvrante-fermante d'un même niveau redevient donc un délimiteur, et l'indice ou l'exposant posé sur le fermant passe
# sur la paire entière, comme dans les fichiers d'origine. Une barre seule ou un délimiteur sans partenaire ne bouge pas.
DELIM_PAIRES = {'(': ')', '[': ']', '|': '|'}
DELIM_FERMANTS = {')', ']', '|'}
DELIM_CONTENEURS = {m(t) for t in ('oMath', 'e', 'num', 'den', 'sub', 'sup', 'deg', 'lim', 'fName')}
DELIM_HORS = (m('ctrlPr'), m('argPr'), m('rPr'))

def delim_signe(el):
    """Le délimiteur porté seul par un run de formule, sinon None."""
    if el.tag != m('r'): return None
    ts = el.findall(m('t'))
    if len(ts) != 1: return None
    t = ts[0].text or ''
    return t if (t in DELIM_PAIRES or t in DELIM_FERMANTS) else None

def delim_porte(el):
    """Indice ou exposant posé sur un délimiteur fermant seul : (délimiteur, son run), sinon (None, None)."""
    if el.tag not in (m('sSub'), m('sSup'), m('sSubSup')): return None, None
    e = el.find(m('e'))
    if e is None: return None, None
    kids = [k for k in e if k.tag not in DELIM_HORS]
    if len(kids) != 1: return None, None
    s = delim_signe(kids[0])
    return (s, kids[0]) if s in DELIM_FERMANTS else (None, None)

def delim_groupe(ouvrant, fermant, contenu, run_ouvrant):
    # mêmes propriétés que dans les fichiers d'origine : séparateur vide, délimiteurs qui grandissent avec le contenu
    d = etree.Element(m('d'))
    pr = etree.SubElement(d, m('dPr'))
    etree.SubElement(pr, m('begChr')).set(m('val'), ouvrant)
    etree.SubElement(pr, m('sepChr')).set(m('val'), '')
    etree.SubElement(pr, m('endChr')).set(m('val'), fermant)
    etree.SubElement(pr, m('grow'))
    wrpr = run_ouvrant.find(w('rPr'))      # couleur ou police du délimiteur ouvrant
    if wrpr is not None:
        etree.SubElement(pr, m('ctrlPr')).append(copy.deepcopy(wrpr))
    e = etree.SubElement(d, m('e'))
    for c in contenu: e.append(c)
    return d

def regroupe_delimiteurs(conteneur):
    enfants = list(conteneur)
    objets = [c for c in enfants if c.tag not in DELIM_HORS]
    if not any(delim_signe(c) or delim_porte(c)[0] for c in objets): return 0
    debut = next(i for i, c in enumerate(enfants) if c.tag not in DELIM_HORS)
    for c in objets: conteneur.remove(c)
    pile = [[None, None, []]]              # [délimiteur ouvrant, son run, contenu] ; le fond de pile est le conteneur
    faits = 0
    def aplatit(niveau):                   # les ouvrants restés sans partenaire redeviennent de simples caractères
        while len(pile) - 1 > niveau:
            o, ro, cont = pile.pop()
            pile[-1][2].extend([ro] + cont)
    def cherche(f):
        for i in range(len(pile) - 1, 0, -1):
            if DELIM_PAIRES[pile[i][0]] == f: return i
        return None
    for c in objets:
        s = delim_signe(c)
        sp, rp = delim_porte(c)
        if s == '|':
            if len(pile) > 1 and pile[-1][0] == '|':
                o, ro, cont = pile.pop(); pile[-1][2].append(delim_groupe(o, s, cont, ro)); faits += 1
            else:
                pile.append([s, c, []])
        elif s in ('(', '['):
            pile.append([s, c, []])
        elif s in (')', ']'):
            i = cherche(s)
            if i is None: pile[-1][2].append(c); continue
            aplatit(i)
            o, ro, cont = pile.pop(); pile[-1][2].append(delim_groupe(o, s, cont, ro)); faits += 1
        elif sp:
            if sp == '|': i = len(pile) - 1 if (len(pile) > 1 and pile[-1][0] == '|') else None
            else: i = cherche(sp)
            if i is None: pile[-1][2].append(c); continue
            aplatit(i)
            o, ro, cont = pile.pop()
            c.find(m('e')).replace(rp, delim_groupe(o, sp, cont, ro)); faits += 1
            pile[-1][2].append(c)
        else:
            pile[-1][2].append(c)
    aplatit(0)
    for k, c in enumerate(pile[0][2]): conteneur.insert(debut + k, c)
    return faits

def fix_document(root):
    for c in [el for el in root.iter() if el.tag in DELIM_CONTENEURS]:
        regroupe_delimiteurs(c)
    for dpr in root.iter(m('dPr')):
        order = ['begChr', 'sepChr', 'endChr', 'grow', 'shp', 'ctrlPr']
        kids = sorted(list(dpr), key=lambda e: order.index(local(e)))
        for k in kids: dpr.remove(k)
        for k in kids: dpr.append(k)
    for mcpr in root.iter(m('mcPr')):
        # systèmes d'équations (accolade) : le schéma veut le nombre de colonnes avant l'alignement
        cnt = mcpr.find(m('count'))
        if cnt is not None and mcpr.index(cnt) != 0:
            mcpr.remove(cnt); mcpr.insert(0, cnt)
    # LibreOffice cale à gauche le numérateur ou le dénominateur d'une fraction qui contient, à son premier niveau, du texte
    # « normal » (m:nor) : un nombre à virgule (« 25,0 »), un \text{d} de dérivée. Ce contenu est mis dans un groupe sans
    # délimiteurs (m:d aux caractères vides) : LibreOffice le centre, Word n'affiche rien de plus, et le texte reste droit.
    for f in root.iter(m('f')):
        for part in (f.find(m('num')), f.find(m('den'))):
            if part is None: continue
            enfants = [c for c in part if c.tag not in (m('ctrlPr'), m('argPr'))]
            texte_normal = [c for c in enfants if c.tag == m('r') and c.find(m('rPr')) is not None and c.find(m('rPr')).find(m('nor')) is not None]
            if not texte_normal: continue
            groupe = etree.SubElement(part, m('d'))
            dpr = etree.SubElement(groupe, m('dPr'))
            etree.SubElement(dpr, m('begChr')).set(m('val'), '')
            etree.SubElement(dpr, m('endChr')).set(m('val'), '')
            e = etree.SubElement(groupe, m('e'))
            enfants[0].addprevious(groupe)
            for c in enfants: e.append(c)
    for rpr in root.iter(m('rPr')):
        if rpr.find(m('nor')) is not None:
            for sty in rpr.findall(m('sty')): rpr.remove(sty)
    for pg in root.iter(w('pgMar')):
        if pg.get(w('gutter')) is None: pg.set(w('gutter'), '0')
    prescrits(root)

# Notation des noyaux, écrite ${}^{A}_{Z}\text{X}$ dans la source : pandoc produit un indice-exposant
# sur une base vide, que LibreOffice affiche comme une case. On le remplace par un préexposant (m:sPre)
# portant sur le symbole qui suit.
VIDES_PRE = ('', ' ', '​', ' ', ' ', ' ', ' ')
def prescrits(root):
    for ss in list(root.iter(m('sSubSup'))):
        e = ss.find(m('e'))
        if e is None: continue
        if ''.join(t.text or '' for t in e.iter(m('t'))) not in VIDES_PRE: continue
        nxt = ss.getnext()
        if nxt is None or local(nxt) != 'r': continue
        pre = etree.Element(m('sPre'))
        pre.append(ss.find(m('sub'))); pre.append(ss.find(m('sup')))
        base = etree.SubElement(pre, m('e'))
        parent = ss.getparent(); i = parent.index(ss)
        parent.remove(nxt); base.append(nxt)
        parent.remove(ss); parent.insert(i, pre)

def used_styles(parts):
    used = set()
    for root in parts:
        for el in root.iter(w('pStyle'), w('rStyle'), w('tblStyle')):
            used.add(el.get(w('val')))
    return used

tmp = OUT + '.tmp'
shutil.move(OUT, tmp)
zin = zipfile.ZipFile(tmp)
trees = {n: etree.fromstring(zin.read(n)) for n in zin.namelist()
         if n.startswith('word/') and n.endswith('.xml') and '/theme/' not in n}
fix_document(trees['word/document.xml'])
for t_ in trees.values():
    reorder(t_, 'pPr', PPR_ORDER); reorder(t_, 'tcPr', TCPR_ORDER)
# styles : on ne garde que ceux de la charte et ceux réellement utilisés
st = trees['word/styles.xml']
content = [t for n, t in trees.items() if re.match(r'word/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml', n)]
keep = used_styles(content) | KEEP
byid = {x.get(w('styleId')): x for x in st.findall(w('style'))}
changed = True
while changed:
    changed = False
    for sid in list(keep):
        x = byid.get(sid)
        if x is None: continue
        for tag in ('basedOn', 'next', 'link'):
            e = x.find(w(tag))
            if e is not None and e.get(w('val')) not in keep:
                keep.add(e.get(w('val'))); changed = True
removed = 0
for sid, x in byid.items():
    if sid in keep or x.get(w('default')) in ('1', 'true'): continue
    st.remove(x); removed += 1
for rpr in st.iter(w('rPr')):
    rpr.text = None
    for c in rpr: c.tail = None
# réglages : ordre du schéma, séparateurs français, police des équations
se = trees['word/settings.xml']
kids = sorted(list(se), key=lambda e: SETTINGS_ORDER.index(local(e)) if local(e) in SETTINGS_ORDER else 999)
for k in kids: se.remove(k)
for k in kids: se.append(k)
if se.find(w('compat')) is None:
    se.append(etree.fromstring('<w:compat xmlns:w="%s"><w:compatSetting w:name="compatibilityMode" '
                               'w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>' % W_NS))
if se.find(w('updateFields')) is None:
    uf = etree.SubElement(se, w('updateFields')); uf.set(w('val'), 'true')
tf = se.find(w('themeFontLang'))
if tf is not None: tf.set(w('val'), 'fr-FR')
kids = sorted(list(se), key=lambda e: SETTINGS_ORDER.index(local(e)) if local(e) in SETTINGS_ORDER else 999)
for k in kids: se.remove(k)
for k in kids: se.append(k)
for tag, val in (('decimalSymbol', ','), ('listSeparator', ';')):
    e = se.find(w(tag))
    if e is not None: e.set(w('val'), val)
if 'word/numbering.xml' in trees:
    for ns in trees['word/numbering.xml'].iter(w('nsid')):
        ns.set(w('val'), ns.get(w('val')).upper().rjust(8, '0')[-8:])
zout = zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED)
for item in zin.infolist():
    if item.filename.endswith('/'): continue
    data = zin.read(item.filename)
    if item.filename in trees:
        data = etree.tostring(trees[item.filename], xml_declaration=True, encoding='UTF-8', standalone=True)
    zout.writestr(item, data)
zout.close(); zin.close(); os.remove(tmp)
print('styles inutilisés retirés :', removed)
json.dump([dict(niveau=l, ancre=n, titre=t) for l, n, t, _ in heads],
          open(os.path.join(WORK, '_titres.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok (%s) : %d titres dont %d au sommaire, %d boutons, %d runs colorés, %d virgules décimales, %d tableaux'
      % (VARIANTE, len(heads), len(toc_heads), nbout, ncol, nvirg, len(tables)))
