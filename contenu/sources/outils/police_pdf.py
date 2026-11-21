"""Quelle Carlito un PDF embarque-t-il ? usage : python3 outils/police_pdf.py <pdf> [<nom attendu>]

Sur l'ordinateur de travail, deux versions de Carlito (le remplaçant libre de Calibri) sont visibles de LibreOffice :
celle qu'il fournit (1.103, nom « Carlito ») et celle de ~/Library/Fonts (1.104, nom « Carlito-Regular »), qui est
celle des PDF d'origine. LibreOffice choisit l'une ou l'autre d'une conversion à l'autre, et la mise en page en
dépend : la 1.103 garde la pagination des PDF d'origine mais abaisse les formules dans le texte de 2 points ; la 1.104
place bien les formules mais allonge certaines pages. La fabrication refait donc la conversion jusqu'à obtenir la
version demandée (variable POLICE_PDF de outils/fabrique.sh).

Sans nom attendu : affiche le nom trouvé. Avec : sort en erreur si le PDF n'embarque pas exactement cette version.
"""
import sys
import pymupdf as fitz

pdf = sys.argv[1]
attendu = sys.argv[2] if len(sys.argv) > 2 else None
noms = set()
with fitz.open(pdf) as doc:
    for page in doc:
        for police in page.get_fonts():
            base = police[3].split("+", 1)[-1]
            if base in ("Carlito", "Carlito-Regular"):
                noms.add(base)
trouve = " et ".join(sorted(noms)) or "aucune Carlito"
if attendu is None:
    print(trouve)
    sys.exit(0)
sys.exit(0 if noms == {attendu} else 1)
