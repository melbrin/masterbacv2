---
paths:
  - "contenu/**"
  - "scripts/contenu/**"
---

# Contenu des fiches

Référence : `docs/07-contenu.md` et `contenu/sources/LISEZMOI.md`.

- `fiche.md` est la seule source d'une fiche. On ne modifie jamais à la main `contenu/export/`, un Word ou un PDF : on corrige la source et on relance la fabrication.
- Les données d'entrée des scripts Python se lisent avec `python3 -I`.
- Un contenu préparé pour l'application (indice, explication, barème, question de quiz) naît à l'état « brouillon » et n'est servi à un élève qu'après validation de Yane.
- Tu t'appuies uniquement sur la fiche. Tout résultat chiffré est recalculé par un script avant de partir en relecture.
- Tu ne copies rien d'un autre site, d'un livre ou d'une autre application. Tu ne reproduis jamais le texte ni l'image d'un sujet officiel : un exercice « d'après » un sujet est un énoncé original qui cite la session, le jour et le numéro d'exercice.
- Le texte d'une fiche vouvoie l'élève. Indices, explications et barèmes s'écrivent à l'infinitif ou à la forme impersonnelle.
- Typographie française, pas de tiret long, « cours » et jamais « leçon ».
- Les formules suivent les conventions de `contenu/sources/LISEZMOI.md` et doivent passer dans KaTeX.
- L'import conserve l'ordre de l'export, archive au lieu de supprimer, nettoie le HTML selon la liste fermée et se rejoue sans effet.
- Les anciens PDF de l'édition 2024 portent le nom de leur acheteur en filigrane : on ne les lit qu'avec les outils de `contenu/sources/outils/reprise/`, et ce nom ne doit apparaître dans aucun fichier du dépôt.
