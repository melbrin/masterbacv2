---
paths:
  - "lib/moteur/**"
  - "tests/moteur/**"
---

# Moteur de préparation

Référence : `docs/08-moteur.md`. Le code d'origine est dans `reference/prototype/site/js/` (`moteur.js`, `etat.js`, `util.js`).

- Le moteur est pur : aucune lecture de base, aucun appel réseau, aucun `Date.now()`, aucun `Math.random()`. L'instant présent, l'état de l'élève, le sommaire du contenu et les réglages lui sont passés en arguments.
- Il n'importe que `lib/commun/`.
- Les cas de `reference/moteur-cas-de-reference.json` passent tous, avec `REGLAGES_PROTOTYPE` et les données figées de `reference/prototype/site/data/`. Tu ne modifies ni ce fichier ni ces données.
- Les tirages reprennent `melange` et `graineDuJour` à l'identique, dépassements d'entiers sur 32 bits compris.
- Les jours sont des dates civiles à l'heure de Paris. Aucun calcul de jour ne dépend du fuseau du serveur.
- Les tris sont stables, et l'ordre des entrées fait partie du contrat.
- Changer une règle demande : une décision dans `docs/decisions/`, un réglage dans `REGLAGES_ACTUELS`, de nouveaux cas de test. Les cas de référence ne changent pas.
- Chaque fonction a ses tests de propriété. Couverture des lignes et des branches : 95 % au moins.
- Les seuils (intervalles du carnet, taux de réussite, nombre de questions) vivent dans un seul fichier de réglages, pas dans le code des règles.
