# Recette : sixième version locale, les TP façon ECE

> Cette recette décrit les premiers TP, où l'on agissait par des boutons. Ils ont été refaits le 14 novembre au soir : suis `version-locale-8.md` à la place.

Date : 14 novembre 2026. Durée : 40 minutes. Elle ajoute les TP virtuels du lot A : quatre TP, deux paillasses. Tout tourne sur ton ordinateur, avec des données inventées.

## Avant de commencer

1. Ouvre Docker Desktop.
2. Dans le Terminal, place-toi dans `Documents/App Masterbac/app-masterbac`, puis lance `npm run db:demarrer`, `npm run db:migrer` (une nouvelle table est arrivée : `tp_essais`), et `npm run dev -- --port 3457`.
3. Ouvre http://localhost:3457. La boîte des e-mails locaux est à http://127.0.0.1:54324.

Fais ces essais sur ton téléphone si tu peux, ou en réduisant la fenêtre : la paillasse est pensée pour un écran étroit.

## Ce que tu essaies

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 1 | « Jeux », puis « Les TP » | quatre TP, deux en chimie, deux en physique |
| 2 | « Un détartrant à contrôler », « Commencer le TP » | la situation et ses documents, puis « Étape 2 sur 10 » |
| 3 | Réponds à la question, choisis le matériel, « Appeler le professeur » | la correction, objet par objet, avec ce que tu avais pris en trop ou oublié |
| 4 | Remets le protocole dans l'ordre avec les flèches | « Juste », ou le bon protocole donné par le professeur |
| 5 | Sur la paillasse, touche « 1 mL » sans rien préparer | « La burette est vide : remplis-la d'abord. » |
| 6 | Prépare tout, puis verse : 9 fois 1 mL, 3 fois 0,2 mL, puis goutte à goutte | la paillasse reste en haut de l'écran ; la solution passe du jaune au bleu à 9,80 mL |
| 7 | « Noter le volume », « J'ai fini » | « Manipulation soignée », ton volume et la valeur exacte |
| 8 | Fais les calculs demandés avec ton volume | les valeurs attendues partent de ta mesure ; à la fin, le bilan par compétence, en A, B, C, D |
| 9 | Refais ce TP en bâclant : ne rince pas, n'ajuste pas le zéro, verse deux fois 5 mL | les fautes relevées une à une, dont « Tu as franchi l'équivalence avec un ajout de 5,00 mL », et un bilan plus bas |
| 10 | « Le degré d'un vinaigre » | la courbe du pH se trace point par point ; le tableau des relevés ; tu lis le volume au milieu du saut (13,1 mL) |
| 11 | « Un condensateur sans étiquette » : touche une borne, puis une autre | un fil se pose ; la liste des fils permet d'en retirer un |
| 12 | « Lancer l'acquisition » avant d'avoir fini le montage | « Le circuit est ouvert », et aucun signal |
| 13 | Finis le montage en série, la voie et la masse aux bornes du condensateur, relance | la courbe monte vers 5 V ; le repère affiche le temps et la tension |
| 14 | Place le repère à 3,15 V, « Noter ce temps » | 3,30 s, puis 330 µF dans l'exploitation |
| 15 | « Une jauge de niveau d'eau » : câble D2, la résistance, le capteur, GND, puis A0 | le microcontrôleur affiche 100 µs cuve vide, 260 µs à 4 cm, 420 µs à 8 cm |
| 16 | Quitte un TP au milieu, puis reviens par « Jeux », « Les TP » | sa carte propose « Reprendre le TP » : le TP reprend à l'étape où tu t'étais arrêté. « Recommencer » repart du début |

## Ce que tu dois me dire

- Les quatre situations sont des brouillons : dis-moi ce que tu valides ou changes (textes, valeurs, questions).
- Le déroulé te convient-il : une seule réponse par étape, la correction tout de suite, le bilan en A, B, C, D ?
- Les fautes relevées et leur poids te semblent-ils justes ? Elles sont listées dans `docs/decisions/0012-tp-virtuels-pour-les-ece.md`.
- Je continue avec le lot B (dilution, dosage par étalonnage, distance focale, lunette, diffraction, cinétique) ?

## Ce qui n'est pas dans cette version

- Les valeurs sont les mêmes à chaque essai d'un même TP.
- Les TP n'entrent pas encore dans le parcours ni dans les progrès.
- Les lots B et C : 14 TP et 6 paillasses.
