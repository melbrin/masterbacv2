# Recette : cinquième version locale, la chimie du labo

Date : 14 novembre 2026. Durée : 25 minutes. Elle ajoute au labo toute la chimie : six simulations de plus, donc quatorze en tout et quarante-deux défis. Tout tourne sur ton ordinateur, avec des données inventées.

## Avant de commencer

1. Ouvre Docker Desktop.
2. Dans le Terminal, place-toi dans `Documents/App Masterbac/app-masterbac`, puis lance `npm run db:demarrer`, `npm run db:migrer` (une nouvelle table est arrivée : `memoire`), et `npm run dev -- --port 3457`.
3. Ouvre http://localhost:3457. La boîte des e-mails locaux est à http://127.0.0.1:54324.

Le compte `theo.essai@exemple.fr` a déjà réussi les quarante-deux défis pendant mes essais. Pour repartir de zéro, connecte-toi avec `nina.essai@exemple.fr`.

## Ce que tu essaies

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 1 | En bas, « Jeux » | « Le labo » en deux rayons : « En physique » (6 simulations) et « En chimie » (8 simulations) |
| 2 | « Préparer une solution », défi 1 : entre `30` | la pipette prélève, la fiole se remplit jusqu'au trait, puis « Ta solution est à 0,150 mol/L au lieu de 0,100 mol/L : elle est trop concentrée. » |
| 3 | Entre `20` | les deux tubes ont la même couleur, « Défi réussi » |
| 4 | « Le pH », défi 1 : entre `10` | la sonde plonge, la solution devient rouge orangé, le pH-mètre affiche 2,00 |
| 5 | « Le titrage », défi 3 | la burette violette se vide, la solution garde la couleur violette à l'équivalence |
| 6 | « Le spectrophotomètre », défi 1 : entre `3,2` | le faisceau sort affaibli de la cuve, le point se pose sur la droite d'étalonnage à A = 0,80 |
| 7 | « La cinétique », défi 1 : entre `30,1` | la solution se décolore, la courbe descend, la réaction s'arrête à 50 % |
| 8 | « La pile et l'électrolyse », défi 1 : entre `0,2` | les électrons vont du zinc au cuivre, la lampe reste allumée 10 h |
| 9 | « La pile et l'électrolyse », défi 3 : entre `31,7` | la clé se couvre de cuivre, le dépôt pèse 0,50 g |
| 10 | « La synthèse », défi 2 : entre `4,79` | le ballon chauffe, puis la balance affiche 5,00 g |

Les réponses de la chimie, pour vérifier mes énoncés : 20,0 mL ; 50 mL ; 2,50 g (solution) ; 10 mmol/L ; 2,51 ; 31,6 (pH) ; 16,0 mL ; 0,100 mol/L ; 10,0 mL (titrage) ; 3,20 mmol/L ; 30,0 mmol/L ; 10,0 mL (spectrophotomètre) ; 30,1 s ; 46,1 min ; 0,461 par minute (cinétique) ; 16,0 jours ; 4 220 ans ; 7,2 h (décroissance) ; 0,20 A ; 0,61 g ; 31,7 min (pile et électrolyse) ; 0,050 mol ; 4,79 g ; 0,050 mol (synthèse).

## Ce que tu dois me dire

- Les dix-huit nouveaux énoncés de chimie sont des brouillons, comme les autres : dis-moi lesquels tu valides ou changes.
- La proposition pour les TP façon ECE est dans `docs/decisions/0012-tp-virtuels-pour-les-ece.md`. Elle se termine par cinq questions, chacune avec ma réponse par défaut. Rien n'est codé tant que tu n'as pas répondu.

## Ce qui n'est pas dans cette version

- En chimie : le quotient de réaction, la nomenclature et les spectres n'ont pas de simulation. Les titrages suivis au pH-mètre et au conductimètre sont prévus dans les TP.
- Les TP façon ECE : seulement la proposition écrite.
- La section Mémoire : les jeux sont en cours de construction. Elle aura sa propre recette.
