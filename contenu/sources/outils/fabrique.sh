#!/bin/bash
# Fabrique une fiche MasterBac : la fiche complète et son cahier d'énoncés, en Word et en PDF, puis les contrôle.
# usage   : outils/fabrique.sh <dossier de la fiche>
# exemple : outils/fabrique.sh pc-04-fluides
# Les fichiers produits sont déposés dans sorties/<dossier de la fiche>/.
set -e
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
FICHE="${1%/}"
SRC="$RACINE/fiches/$FICHE/fiche.md"
[ -f "$SRC" ] || { echo "fiche introuvable : fiches/$FICHE/fiche.md"; exit 1; }
OUTILS="$RACINE/outils"
TRAVAIL="$RACINE/sorties/.travail/$FICHE"
SORTIES="$RACINE/sorties/$FICHE"
mkdir -p "$TRAVAIL" "$SORTIES"
cd "$TRAVAIL"

# outil Word de Claude (compétence docx) : repéré seul s'il n'est pas indiqué par DOCX_SKILL
if [ -z "$DOCX_SKILL" ]; then
  TROUVE="$(find /mnt/skills "$HOME/.claude/skills" -maxdepth 6 -path '*docx/scripts/office/soffice.py' 2>/dev/null | head -1)"
  [ -n "$TROUVE" ] && export DOCX_SKILL="${TROUVE%/scripts/office/soffice.py}"
fi

convertit() {  # Word -> PDF avec LibreOffice
  if [ -n "$DOCX_SKILL" ] && [ -f "$DOCX_SKILL/scripts/office/soffice.py" ]; then
    python3 "$DOCX_SKILL/scripts/office/soffice.py" --headless --convert-to pdf "$1" >/dev/null 2>&1
  else
    soffice --headless --convert-to pdf "$1" >/dev/null 2>&1
  fi
}
# La police : LibreOffice choisit au hasard entre deux Carlito (voir outils/police_pdf.py). POLICE_PDF dit laquelle
# garder ; la conversion est refaite, huit fois au plus, jusqu'à l'obtenir. Par défaut « Carlito » : c'est avec elle
# que la mise en page des quatorze fiches a été réglée le 18 novembre. Vide : pas de contrôle.
POLICE_PDF="${POLICE_PDF-Carlito}"
vers_pdf() {
  local essai
  for essai in 1 2 3 4 5 6 7 8; do
    convertit "$1"
    [ -z "$POLICE_PDF" ] && return 0
    python3 -I "$OUTILS/police_pdf.py" "${1%.docx}.pdf" "$POLICE_PDF" && return 0
  done
  echo "police : la conversion de $1 n'a pas donné $POLICE_PDF en huit essais ($(python3 -I "$OUTILS/police_pdf.py" "${1%.docx}.pdf"))"
  return 1
}
meta() {       # lit une valeur de la première ligne de la fiche
  python3 -c "import json,re,sys; print(json.loads(re.match(r'<!--meta (.*?)-->', open(sys.argv[1], encoding='utf-8').read()).group(1))[sys.argv[2]])" "$SRC" "$1"
}

# 1. modèle Word de la charte
[ -f ref0.docx ] || pandoc -o ref0.docx --print-default-data-file reference.docx
python3 "$OUTILS/make_reference.py" ref0.docx reference.docx >/dev/null

# 2. les deux versions : fiche complète, puis cahier d'énoncés
VERSIONS="$(meta versions 2>/dev/null || echo 'complet cahier')"   # par défaut : la fiche et son cahier
for V in $VERSIONS; do
  export VARIANTE=$V
  if [ "$V" = complet ]; then NOM="$(meta fichier)"; else NOM="$(meta fichier_cahier)"; fi
  rm -f pages.json
  # premier passage sans numéros de page, puis passages suivants jusqu'à ce que les numéros ne bougent plus
  python3 "$OUTILS/build_fiche.py" "$SRC" reference.docx "$NOM.docx" >/dev/null
  # jusqu'à cinq passes : un numéro de page qui change de largeur peut décaler la mise en page d'une passe à l'autre
  STABLE=non
  for PASSE in 1 2 3 4 5; do
    vers_pdf "$NOM.docx"
    python3 -I "$OUTILS/toc_pages.py" "$NOM.pdf" _titres.json pages_new.json >/dev/null
    if [ -f pages.json ] && cmp -s pages.json pages_new.json; then STABLE=oui; break; fi
    mv pages_new.json pages.json
    python3 "$OUTILS/build_fiche.py" "$SRC" reference.docx "$NOM.docx" pages.json | tail -1
  done
  # sans stabilité, le PDF est refait à partir du dernier Word : les contrôles signalent alors les renvois faux
  [ "$STABLE" = oui ] || vers_pdf "$NOM.docx"
  cp "$NOM.docx" "$NOM.pdf" "$SORTIES/"
done

# 3. contrôles
if [ "$VERSIONS" = complet ]; then
  python3 -I "$OUTILS/controle.py" "$SORTIES/$(meta fichier)"
else
  python3 -I "$OUTILS/controle.py" "$SORTIES/$(meta fichier)" "$SORTIES/$(meta fichier_cahier)"
fi
