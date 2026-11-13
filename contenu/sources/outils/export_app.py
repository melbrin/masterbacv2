# Export des fiches vers les données de l'application MasterBac.
# usage : python3 outils/export_app.py <dossier de sortie> [<dossier de fiche> ...]
#   Sans dossier de fiche : toutes les fiches pc-*.
# Produit dans le dossier de sortie :
#   data/fiches.json          le sommaire des fiches (titres, domaines, compteurs)
#   data/fiche-NN.json        une fiche : L'essentiel, Ce qui est tombé, thèmes, questions, exercices, corrigés, notions
#   data/formules.json        toutes les formules, pour le contrôle KaTeX (outils/verifie_formules.cjs)
#   figs/NN/<figure>.webp     les figures, allégées pour le téléphone
# La source reste fiche.md : on corrige la fiche, puis on relance l'export.
import sys, os, re, json, glob, subprocess
from lxml import html as LH
from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# les quatre thèmes du programme de terminale, plus les méthodes
DOMAINES = [
    ('Mouvement et interactions', [1, 2, 3, 4]),
    ("L'énergie : conversions et transferts", [5]),
    ('Ondes et signaux', [6, 7, 8]),
    ('Constitution et transformations de la matière', [9, 10, 11, 12, 13]),
    ('Méthodes du BAC', [14]),
]
LARGEUR_UTILE_CM = 17.0   # largeur de texte des fiches : sert à garder la taille relative des figures


def domaine(num):
    for nom, nums in DOMAINES:
        if num in nums:
            return nom
    return ''


# ---------- nettoyage de la source ----------

def typo(seg):
    """Mêmes règles que la fabrication : espaces insécables du français, nombres et unités."""
    seg = re.sub(r' ([:;?!])', ' \\1', seg)
    seg = re.sub(r'\bEx\. (\d)', 'Ex. \\1', seg)
    seg = re.sub(r'(?<=\d) (?=(?:km|cm|mm|m|ms|s|min|h|kg|g|mg|N|J|kJ|W|kW|Pa|hPa|K|L|mL|mol|V|A|%|°C)(?![A-Za-zÀ-ÿ0-9]))', ' ', seg)
    return seg.replace('« ', '« ').replace(' »', ' »')


def nettoie(text):
    text = re.sub(r'```\{=openxml\}.*?```\n?', '', text, flags=re.S)
    text = re.sub(r'<!--.*?-->\n?', '', text, flags=re.S)
    # point médian des unités (« m·s ») : KaTeX le refuse dans \text{}, on le sort du texte, sans espace
    text = re.sub(r'\\text\{([^{}]*·[^{}]*)\}', lambda m: '\\text{' + m.group(1).replace('·', '}{\\cdotp}\\text{') + '}', text)
    # formule seule dans un encadré « À retenir » : en équation hors ligne, comme dans la fiche
    text = re.sub(r'(::: \{custom-style="Retenir"\}\n)\$(?!\$)([^\n$]+)\$\n(:::)', r'\1$$\2$$\n\3', text)
    lignes, code = [], False
    for ligne in text.split('\n'):
        if ligne.startswith('```'):
            code = not code
            lignes.append(ligne)
            continue
        if code or ligne.startswith(':::') or ligne.startswith('$$') or ligne.startswith('|---'):
            lignes.append(ligne)
            continue
        parts = ligne.split('$')
        for k in range(0, len(parts), 2):
            parts[k] = typo(parts[k])
        lignes.append('$'.join(parts))
    return '\n'.join(lignes)


DIV = re.compile(r'^::: \{custom-style="(\w+)"\}\n(.*?)\n:::$', re.S | re.M)


def retire_divs(md, *styles):
    return re.sub(r'^::: \{custom-style="(?:%s)"\}\n.*?\n:::\n?' % '|'.join(styles), '', md, flags=re.S | re.M)


def premier_div(md, style):
    m = re.search(r'^::: \{custom-style="%s"\}\n(.*?)\n:::$' % style, md, flags=re.S | re.M)
    return m.group(1) if m else None


def rubriques_en_titres(md):
    md = re.sub(r'^::: \{custom-style="Rubrique"\}\n(.*?)\n:::$', r'### \1', md, flags=re.S | re.M)
    return re.sub(r'^::: \{custom-style="Intertitre"\}\n(.*?)\n:::$', r'### \1', md, flags=re.S | re.M)


def sections(text):
    """Découpe aux titres de niveau 1 : {id: (titre, contenu)} dans l'ordre."""
    out = []
    pos = [(m.start(), m.end(), m.group(1), m.group(2)) for m in re.finditer(r'^# (.+?) \{#([\w-]+)\}$', text, re.M)]
    for k, (a, b, titre, ident) in enumerate(pos):
        fin = pos[k + 1][0] if k + 1 < len(pos) else len(text)
        out.append((ident, titre, text[b:fin].strip('\n')))
    return out


def refs(texte):
    """« Q.17 à Q.19, Ex. 2 » -> [('q', 17), ('q', 18), ('q', 19), ('ex', 2)]"""
    out = []
    for m in re.finditer(r'(Q\.|Ex\.\s?)(\d+)(?:\s*à\s*(?:Q\.|Ex\.\s?)?(\d+))?', texte.replace(' ', ' ')):
        kind = 'q' if m.group(1).startswith('Q') else 'ex'
        a = int(m.group(2))
        b = int(m.group(3)) if m.group(3) else a
        out += [(kind, n) for n in range(a, b + 1)]
    return out


# ---------- conversion en HTML par pandoc, en un seul passage par fiche ----------

class Lot:
    def __init__(self):
        self.morceaux = []

    def ajoute(self, md, inline=False):
        cle = 'k%04d' % len(self.morceaux)
        self.morceaux.append((cle, md, inline))
        return cle

    def convertit(self, fiche_num, figs_ok):
        doc = '\n\n'.join(':::::::: {#%s}\n%s\n::::::::' % (cle, md.strip('\n')) for cle, md, _ in self.morceaux)
        r = subprocess.run(['pandoc', '-f', 'markdown-implicit_figures', '-t', 'html5', '--mathjax', '--wrap=none'],
                           input=doc, capture_output=True, text=True, check=True)
        arbre = LH.fromstring('<div id="racine">' + r.stdout + '</div>')
        res = {}
        for cle, md, inline in self.morceaux:
            el = arbre.get_element_by_id(cle)
            nettoie_html(el, fiche_num, figs_ok)
            h = ''.join(LH.tostring(c, encoding='unicode') for c in el)
            if el.text:
                h = el.text + h
            h = h.strip()
            if inline:
                h = re.sub(r'^<p>(.*)</p>$', r'\1', h, flags=re.S)
            res[cle] = h
        return res


def nettoie_html(el, fiche_num, figs_ok):
    for x in el.iter():
        cs = x.attrib.pop('data-custom-style', None)
        if cs:
            x.set('class', ('cs-' + cs.lower() + ' ' + x.get('class', '')).strip())
        if x.tag == 'img':
            src = x.get('src', '')
            nom = os.path.splitext(os.path.basename(src))[0]
            x.set('src', 'figs/%02d/%s.webp' % (fiche_num, nom))
            figs_ok.add(nom)
            m = re.search(r'width:\s*([\d.]+)cm', x.get('style', ''))
            pct = min(100, round(100 * float(m.group(1)) / LARGEUR_UTILE_CM)) if m else 100
            x.attrib.pop('style', None)
            x.set('class', 'fig')
            x.set('style', '--w:%d%%' % pct)
            x.set('loading', 'lazy')
    # les boutons de renvoi n'ont pas de sens dans l'application
    for x in el.xpath('.//*[contains(@class,"cs-boutoncorrige") or contains(@class,"cs-boutonenonce")]'):
        x.getparent().remove(x)


def texte_brut(md):
    t = re.sub(r'\[([^\]]*)\]\{[^}]*\}', r'\1', md)
    t = t.replace('\\ ', ' ').replace('**', '')
    return re.sub(r'\s+', ' ', t).strip()


# ---------- lecture d'une fiche ----------

RE_Q = re.compile(r'^## \[Q\.(\d+)\]\{custom-style="QNum"\}\\ \\ (.*?) \{#(q\d+)\}$', re.M)
RE_EX = re.compile(r'^#{2,3} \[Exercice (\d+)\]\{custom-style="QNum"\}\\ \\ (.*?)(?: \[\((voir BAC [^)]*)\)\]\{custom-style="VoirBac"\})? \{#(ex\d+)\}$', re.M)
RE_C = re.compile(r'^#### \[Corrigé\]\{custom-style="NumCorrige"\}\\ \\ (Q\.\d+|Exercice \d+) · (.*?) \{#(c_(?:q|ex)\d+)\}$', re.M)


def meta_question(md):
    niveau = int(re.search(r'custom-style="Niv(10|14|18)"', md).group(1))
    t = re.sub(r'\[\\ Objectif \d+\\ \]\{custom-style="Niv\d+"\}', '', md)
    t = re.sub(r'\[CIBLE:\w+\]\{custom-style="BoutonCorrige"\}', '', t)
    type_bac = 'custom-style="TagBac"' in t
    t = re.sub(r'\[Type BAC\]\{custom-style="TagBac"\}', '', t)
    t = t.replace('\\ ', ' ').strip().lstrip('·').strip()
    parts = [p.strip() for p in t.split(' · ') if p.strip()]
    out = {'niveau': niveau, 'type': '', 'notions_md': '', 'demande': '', 'points': None, 'duree': None, 'detail': '', 'type_bac': type_bac}
    for p in parts:
        if p.startswith('Notions :') or p.startswith('Notions :'):
            out['notions_md'] = p.split(':', 1)[1].strip()
        elif p.startswith('Demandé') or p.startswith('Demandée') or 'demandé' in p or 'demandée' in p:
            out['demande'] = p
        elif re.fullmatch(r'\d+(?:,\d+)? points?', p.replace(' ', ' ')):
            out['points'] = float(p.split()[0].replace(',', '.'))
        elif re.fullmatch(r'\d+ min', p.replace(' ', ' ')):
            out['duree'] = int(p.split()[0])
        elif not out['type'] and not type_bac:
            out['type'] = p
        else:
            out['detail'] = (out['detail'] + ' · ' + p).strip(' ·')
    if type_bac:
        out['type'] = 'Type BAC'
    return out


def etapes(md):
    """Découpe un corrigé aux rappels de question (« **1.** … ») : [(titre_md, contenu_md)]."""
    morceaux = re.split(r'^::: \{custom-style="QRappel"\}\n(.*?)\n:::$', md, flags=re.S | re.M)
    intro = morceaux[0].strip('\n')
    out = []
    for k in range(1, len(morceaux), 2):
        out.append((morceaux[k].strip(), morceaux[k + 1].strip('\n')))
    return intro, out


def indice_de(md, style, etiquette):
    corps = premier_div(md, style)
    if not corps:
        return None
    return re.sub(r'^\[%s\.\]\{custom-style="Etiq\w+"\}\s*' % etiquette, '', corps.strip())


def lit_fiche(dossier):
    src = open(os.path.join(dossier, 'fiche.md'), encoding='utf-8').read()
    meta = json.loads(re.match(r'<!--meta (.*?)-->', src).group(1))
    num = int(meta['numero'])
    text = nettoie(src)
    text = retire_divs(text, 'Surtitre')
    lot = Lot()
    fiche = {'num': num, 'id': os.path.basename(dossier), 'titre': meta['titre'], 'titre_court': meta.get('titre_court', meta['titre']),
             'domaine': domaine(num), 'themes': [], 'notions': []}
    corriges = {}
    themes = []
    for ident, titre, corps in sections(text):
        if ident == 'essentiel':
            fiche['essentiel'] = lot.ajoute(rubriques_en_titres(corps))
            pieges = re.search(r'^::: \{custom-style="Rubrique"\}\nLes pièges qui coûtent des points\n:::\n\n(.*?)(?=\n::: |\Z)', corps, re.S | re.M)
            fiche['pieges'] = [lot.ajoute(re.sub(r'^- ', '', li), inline=True) for li in pieges.group(1).strip().split('\n') if li.startswith('- ')] if pieges else []
        elif ident == 'tombe':
            fiche['tombe'] = lot.ajoute(rubriques_en_titres(corps))
            lignes = []
            for li in corps.split('\n'):
                if li.startswith('| ') and not li.startswith('| Session') and not li.startswith('|---'):
                    c = [x.strip() for x in li.strip().strip('|').split(' | ')]
                    if len(c) == 4:
                        lignes.append({'session': c[0], 'exercice': c[1], 'notions': lot.ajoute(c[2], inline=True), 'refs': refs(c[3]), 'refs_txt': c[3]})
            fiche['tombe_lignes'] = lignes
        elif ident.startswith('theme'):
            themes.append((int(ident[5:]), re.sub(r'^Thème \d+\s*:\s*', '', titre), corps))
        elif ident.startswith('c_theme'):
            pos = list(RE_C.finditer(corps))
            for k, m in enumerate(pos):
                fin = pos[k + 1].start() if k + 1 < len(pos) else len(corps)
                corriges[m.group(3)[2:]] = retire_divs(corps[m.end():fin], 'Renvoi').strip('\n')
        elif ident == 'index':
            for li in corps.split('\n'):
                if li.startswith('| ') and not li.startswith('| Notion') and not li.startswith('|---'):
                    c = [x.strip() for x in li.strip().strip('|').split(' | ')]
                    if len(c) == 2:
                        fiche['notions'].append({'id': 'n%d' % (len(fiche['notions']) + 1), 'nom': lot.ajoute(c[0], inline=True),
                                                 'nom_txt': texte_brut(c[0]), 'refs': refs(c[1])})
    for tnum, ttitre, corps in themes:
        corps = retire_divs(corps, 'Rubrique', 'Renvoi')
        pos = sorted([('q', m) for m in RE_Q.finditer(corps)] + [('ex', m) for m in RE_EX.finditer(corps)], key=lambda x: x[1].start())
        theme = {'num': tnum, 'titre': lot.ajoute(ttitre, inline=True), 'titre_txt': texte_brut(ttitre), 'questions': [], 'exercices': []}
        # contexte commun placé avant la première question du thème (« Les questions Q.9 à Q.11 portent sur… »)
        preambule = corps[:pos[0][1].start()].strip('\n') if pos else ''
        if preambule.strip():
            theme['preambule'] = lot.ajoute(preambule)
            theme['preambule_pour'] = [n for k, n in refs(texte_brut(preambule).split('.')[0] + '.' + texte_brut(preambule)[:200]) if k == 'q']
        for k, (kind, m) in enumerate(pos):
            fin = pos[k + 1][1].start() if k + 1 < len(pos) else len(corps)
            bloc = corps[m.end():fin].strip('\n')
            md_meta = premier_div(bloc, 'Meta')
            info = meta_question(md_meta)
            bloc = retire_divs(bloc, 'Meta').strip('\n')
            if kind == 'q':
                ident = m.group(3)
                item = {'id': ident, 'num': int(m.group(1)), 'titre': lot.ajoute(m.group(2), inline=True), 'titre_txt': texte_brut(m.group(2))}
            else:
                ident = m.group(4)
                item = {'id': ident, 'num': int(m.group(1)), 'titre': lot.ajoute(m.group(2), inline=True), 'titre_txt': texte_brut(m.group(2)),
                        'voir_bac': m.group(3) or ''}
                mention = premier_div(bloc, 'MentionBac')
                if mention:
                    item['mention'] = lot.ajoute(re.sub(r'^\[Sujet du BAC correspondant\.\]\{custom-style="EtiqBac"\}\s*', '', mention), inline=True)
                bloc = retire_divs(bloc, 'MentionBac').strip('\n')
            item.update({'niveau': info['niveau'], 'type': info['type'], 'demande': info['demande'], 'points': info['points'],
                         'duree': info['duree'], 'detail': info['detail'],
                         'notions_meta': lot.ajoute(info['notions_md'], inline=True) if info['notions_md'] else ''})
            item['enonce'] = lot.ajoute(bloc)
            c = corriges.get(ident)
            if c is None:
                raise SystemExit('corrigé introuvable : fiche %d, %s' % (num, ident))
            intro, steps = etapes(c)
            item['corrige'] = lot.ajoute(c)
            item['etapes'] = [{'titre': lot.ajoute(t, inline=True), 'html': lot.ajoute(x)} for t, x in steps]
            item['intro'] = lot.ajoute(intro) if steps and intro.strip() else ''
            meth = indice_de(c, 'Methode', 'Méthode')
            piege = indice_de(c, 'Piege', 'Piège')
            item['indice_methode'] = lot.ajoute(meth) if meth else ''
            item['indice_piege'] = lot.ajoute(piege) if piege else ''
            item['notions'] = []
            theme['questions' if kind == 'q' else 'exercices'].append(item)
        fiche['themes'].append(theme)
    # les notions de l'index rattachées à chaque question et exercice
    par_ref = {}
    for t in fiche['themes']:
        for q in t['questions']:
            par_ref[('q', q['num'])] = q
        for e in t['exercices']:
            par_ref[('ex', e['num'])] = e
    for n in fiche['notions']:
        for r in n['refs']:
            if r in par_ref:
                par_ref[r]['notions'].append(n['id'])
    return fiche, lot


def remplace_cles(obj, html):
    if isinstance(obj, dict):
        return {k: remplace_cles(v, html) for k, v in obj.items()}
    if isinstance(obj, list):
        return [remplace_cles(v, html) for v in obj]
    if isinstance(obj, str) and re.fullmatch(r'k\d{4}', obj):
        return html[obj]
    return obj


def formules(html_txt):
    out = []
    for m in re.finditer(r'<span class="math (inline|display)">\\[(\[](.*?)\\[)\]]</span>', html_txt, re.S):
        out.append({'display': m.group(1) == 'display', 'tex': LH.fromstring('<p>' + m.group(2) + '</p>').text_content()})
    return out


def figures(dossier, num, noms, sortie):
    os.makedirs(os.path.join(sortie, 'figs', '%02d' % num), exist_ok=True)
    for nom in sorted(noms):
        src = os.path.join(dossier, 'figs', nom + '.png')
        if not os.path.exists(src):
            raise SystemExit('figure introuvable : %s' % src)
        im = Image.open(src).convert('RGB')
        if im.width > 1100:
            im = im.resize((1100, round(im.height * 1100 / im.width)), Image.LANCZOS)
        im.save(os.path.join(sortie, 'figs', '%02d' % num, nom + '.webp'), 'WEBP', quality=84, method=6)


def main():
    sortie = sys.argv[1]
    dossiers = [os.path.join(RACINE, 'fiches', d) for d in sys.argv[2:]] or sorted(glob.glob(os.path.join(RACINE, 'fiches', 'pc-*')))
    os.makedirs(os.path.join(sortie, 'data'), exist_ok=True)
    sommaire, toutes_formules = [], []
    for d in dossiers:
        fiche, lot = lit_fiche(d)
        noms = set()
        html = lot.convertit(fiche['num'], noms)
        fiche = remplace_cles(fiche, html)
        figures(d, fiche['num'], noms, sortie)
        for h in html.values():
            toutes_formules += [dict(f, fiche=fiche['num']) for f in formules(h)]
        nq = sum(len(t['questions']) for t in fiche['themes'])
        ne = sum(len(t['exercices']) for t in fiche['themes'])
        with open(os.path.join(sortie, 'data', 'fiche-%02d.json' % fiche['num']), 'w', encoding='utf-8') as f:
            json.dump(fiche, f, ensure_ascii=False, separators=(',', ':'))
        sommaire.append({'num': fiche['num'], 'id': fiche['id'], 'titre': fiche['titre'], 'titre_court': fiche['titre_court'],
                         'domaine': fiche['domaine'], 'questions': nq, 'exercices': ne, 'figures': len(noms),
                         'notions': len(fiche['notions']),
                         'themes': [{'num': t['num'], 'titre': t['titre_txt'], 'questions': [q['num'] for q in t['questions']],
                                     'exercices': [e['num'] for e in t['exercices']]} for t in fiche['themes']],
                         # index léger pour le moteur de préparation : il évite de charger toutes les fiches
                         'items': [{'k': 'q', 'n': q['num'], 'theme': t['num'], 'niveau': q['niveau'], 'type': q['type'],
                                    'demande': q['demande'], 'notions': q['notions'], 'titre': q['titre']}
                                   for t in fiche['themes'] for q in t['questions']]
                                  + [{'k': 'ex', 'n': e['num'], 'theme': t['num'], 'niveau': e['niveau'], 'type': e['type'],
                                      'points': e['points'], 'duree': e['duree'], 'voir_bac': e['voir_bac'], 'notions': e['notions'],
                                      'titre': e['titre'], 'etapes': len(e['etapes'])}
                                     for t in fiche['themes'] for e in t['exercices']],
                         'liste_notions': [{'id': n['id'], 'nom': n['nom'], 'refs': n['refs']} for n in fiche['notions']]})
        print('fiche %2d : %2d questions, %d exercices, %2d figures, %2d notions' % (fiche['num'], nq, ne, len(noms), len(fiche['notions'])))
    with open(os.path.join(sortie, 'data', 'fiches.json'), 'w', encoding='utf-8') as f:
        json.dump({'domaines': [{'nom': n, 'fiches': l} for n, l in DOMAINES], 'fiches': sommaire}, f, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(sortie, 'data', 'formules.json'), 'w', encoding='utf-8') as f:
        json.dump(toutes_formules, f, ensure_ascii=False)
    print('%d formules à contrôler (outils/verifie_formules.cjs)' % len(toutes_formules))


if __name__ == '__main__':
    main()
