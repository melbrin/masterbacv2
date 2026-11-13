# Extrait une plage de pages d'un PDF d'origine et en retire le filigrane et les en-têtes personnalisés.
# Ces éléments sont trois objets de formulaire (Fm0, Fm1, Fm2) posés sur chaque page : on vide leur contenu, le texte de la page reste intact.
# usage : nettoie_pdf.py <source.pdf> <sortie.pdf> <première page> <dernière page>   (numéros de page du fichier PDF)
import sys, pymupdf
src, out, a, b = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
doc = pymupdf.open(src)
new = pymupdf.open()
new.insert_pdf(doc, from_page=a - 1, to_page=b - 1)
vides = set()
for page in new:
    for item in page.get_xobjects():
        xref, nom = item[0], item[1]
        if nom in ('Fm0', 'Fm1', 'Fm2') and xref not in vides:
            new.update_stream(xref, b' ')
            vides.add(xref)
new.save(out, garbage=3, deflate=True)
reste = 0
chk = pymupdf.open(out)
for page in chk:
    for blk in page.get_text('dict')['blocks']:
        if blk['type'] != 0: continue
        for l in blk['lines']:
            if (round(l['dir'][0], 2), round(l['dir'][1], 2)) != (1.0, 0.0) or l['bbox'][1] < 40:
                reste += 1
print(out, len(chk), 'pages ;', len(vides), 'objets vidés ; lignes de filigrane ou d\'en-tête restantes :', reste)
