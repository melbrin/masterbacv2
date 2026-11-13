# Contrôles automatiques après fabrication d'une fiche.
# usage : controle.py <chemin de la fiche sans extension> [<chemin du cahier sans extension>]
# Vérifie : le fichier Word (schéma), les renvois énoncé <-> corrigé, les restes de fabrication, la typographie.
import sys, os, re, subprocess, zipfile
import pymupdf

fiche = sys.argv[1]
cahier = sys.argv[2] if len(sys.argv) > 2 else None
erreurs = []
lignes = []

def texte_pdf(chemin):
    doc = pymupdf.open(chemin)
    return doc, [p.get_text().replace('\u202f', ' ') for p in doc]   # espaces fines des boutons

# 1. validité du fichier Word (si l'outil de validation est disponible)
skill = os.environ.get('DOCX_SKILL', '')
valideur = os.path.join(skill, 'scripts', 'office', 'validate.py') if skill else ''
for nom in [n for n in (fiche, cahier) if n]:
    with zipfile.ZipFile(nom + '.docx') as z:
        if z.testzip() is not None:
            erreurs.append('archive Word abîmée : ' + os.path.basename(nom))
    if valideur and os.path.exists(valideur):
        r = subprocess.run([sys.executable, valideur, nom + '.docx'], capture_output=True, text=True)
        if 'PASSED' not in (r.stdout + r.stderr):
            erreurs.append('schéma Word non conforme : ' + os.path.basename(nom))
lignes.append('fichiers Word : ' + ('conformes au schéma' if valideur and os.path.exists(valideur) else 'archives lisibles (validation de schéma non disponible ici)'))

# 2. renvois « Voir le corrigé, page N » et « Retour à l'énoncé, page N »
doc, pages = texte_pdf(fiche + '.pdf')
CLE = r'^(Corrigé\s+)?(Q\.\d+|Exercice \d+)\b'
def lignes_page(page):
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            if not l['spans']: continue
            yield ''.join(s['text'] for s in l['spans']).strip().replace(' ', ' ').replace(' ', ' '), max(s['size'] for s in l['spans'])
titres = {}
for i, page in enumerate(doc):
    for txt, taille in lignes_page(page):
        k = re.match(CLE, txt)
        if k and 11.5 <= taille <= 13:
            titres.setdefault(('c' if k.group(1) else 'e', k.group(2)), i + 1)
n = ecarts = 0
courant = None
for i, page in enumerate(doc):
    for txt, taille in lignes_page(page):
        k = re.match(CLE, txt)
        if k and 11.5 <= taille <= 13:
            courant = ('c' if k.group(1) else 'e', k.group(2))
        r = re.search(r"(Voir le corrigé|Retour à l[’']énoncé), page (\d+)", txt)
        if r and courant:
            n += 1
            cible = ('c' if r.group(1).startswith('Voir') else 'e', courant[1])
            if titres.get(cible) != int(r.group(2)):
                ecarts += 1
                erreurs.append('renvoi faux page %d : %s (attendu page %s)' % (i + 1, txt, titres.get(cible)))
lignes.append('renvois énoncé/corrigé : %d vérifiés, %d écart(s)' % (n, ecarts))

# 3. restes de fabrication et typographie, dans les deux documents
pages_c = texte_pdf(cahier + '.pdf')[1] if cahier else []
for nom, pp in [(fiche, pages)] + ([(cahier, pages_c)] if cahier else []):
    tout = '\n'.join(pp)
    for motif, quoi in ((r'\{\{', 'réglage non rempli'), (r'CIBLE:', 'bouton non relié'), (r'SOMMAIREICI', 'sommaire absent'),
                        (r'[—–]', 'tiret long'), (r'⟦', 'marque de couleur visible'),
                        (r'COLONNES:', 'largeurs de colonnes non appliquées'),
                        (r'¿', 'formule mal rendue (signe + en exposant à écrire \\text{+})'),
                        (r'\\(dfrac|frac|text|times|left|right|quad|mathrm)\b', 'formule non convertie')):
        if re.search(motif, tout):
            erreurs.append('%s dans %s' % (quoi, os.path.basename(nom)))
if cahier and re.search(r'Voir le corrigé|Corrigé Q\.\d', '\n'.join(pages_c)):
    erreurs.append('le cahier contient des corrigés ou des renvois vers eux')
lignes.append(('fiche : %d pages ; cahier d\'énoncés : %d pages' % (len(pages), len(pages_c))) if cahier else ('document : %d pages' % len(pages)))

for l in lignes:
    print('  ' + l)
if erreurs:
    print('  À CORRIGER :')
    for e in erreurs:
        print('   - ' + e)
    sys.exit(1)
print('  contrôles : tout est bon')
