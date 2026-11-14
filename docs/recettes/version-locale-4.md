# Recette : quatrième version locale, le labo

Date : 14 novembre 2026. Durée : 20 minutes. Elle ajoute le labo : des défis où l'élève calcule d'abord, puis entre sa valeur dans une simulation. Tout tourne sur ton ordinateur, avec des données inventées.

## Avant de commencer

1. Ouvre Docker Desktop.
2. Dans le Terminal, place-toi dans `Documents/App Masterbac/app-masterbac`, puis lance `npm run db:demarrer`, `npm run db:migrer` (une nouvelle table est arrivée : `defis`), et `npm run dev -- --port 3457`.
3. Ouvre http://localhost:3457. La boîte des e-mails locaux est à http://127.0.0.1:54324.

Prends une feuille et une calculatrice : il faut vraiment calculer. Le compte `theo.essai@exemple.fr` a déjà réussi les quinze défis pendant mes essais ; pour repartir de zéro, connecte-toi avec `nina.essai@exemple.fr` ou une adresse nouvelle.

## Ce que tu essaies

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 1 | En bas, « Jeux » | en tête, « Le labo » : cinq cartes à faire défiler au doigt, chacune avec sa scène en mouvement, ses étoiles et « Jouer » |
| 2 | « Le basketteur », « Jouer » | le défi 1 : la scène de nuit, « Ta mission », les données, puis le champ « Vitesse au décollage » |
| 3 | « Voir les relations du cours » | les lignes « Vitesse » et « Position » du tableau de la fiche 1 |
| 4 | Entre `3`, « Lancer la simulation » | l'écran remonte sur la scène, le joueur saute, puis « Raté. Trop bas : le joueur monte de 0,46 m… » et le bouton « Corriger » |
| 5 | « Lancer » encore, sans changer la valeur | « Tu as déjà essayé cette valeur. » : l'essai n'est pas compté |
| 6 | Calcule la bonne vitesse (v = √(2 × g × h)), entre `3,43`, lance | le joueur attrape le ballon, des confettis, « Défi réussi », deux étoiles (deuxième essai) |
| 7 | « Défi suivant » | le tir à 45° : la flèche de la vitesse porte « v0 = ? » tant que rien n'est saisi, puis ta valeur |
| 8 | Entre la bonne vitesse du premier coup (7,44 m/s) | « Panier ! », le ballon traverse le filet, trois étoiles |
| 9 | Reviens à « Jeux », ouvre « Le largage » | un drone lâche un colis ; une distance fausse donne « Le colis tombe 5,8 m avant la cible. » |
| 10 | « Le circuit RC » | le circuit, les points du courant, la courbe de la tension ; la lampe s'allume à la date visée si la résistance est juste |
| 11 | « Le thé » | la température monte ou descend, le liquide change de couleur ; trop tôt ou trop tard, le défi est raté |
| 12 | « L'effet Doppler » | les fronts d'onde se resserrent devant le véhicule ; la fréquence reçue s'affiche quand le son arrive |
| 13 | Sur la carte d'une simulation, « Les 3 défis » | la liste : un défi réussi porte ses étoiles, le suivant est ouvert, les autres ont un cadenas |
| 14 | Rejoue un défi déjà réussi | « Tu avais déjà réussi ce défi : tes étoiles ne changent pas. » |
| 15 | Sur un ordinateur, élargis la fenêtre | la scène reste à gauche, la mission et la saisie sont à droite |

Les réponses, pour vérifier mes énoncés : 3,43 m/s ; 7,44 m/s ; 7,10 m/s (basketteur) ; 24,2 m ; 19,8 m/s ; 19,6 m (largage) ; 2,00 kΩ ; 19,4 kΩ ; 228 µF (circuit RC) ; 73 s ; 6,7 min ; 18,0 min (thé) ; 85,0 m/s ; 336,5 Hz ; 72,0 km/h (Doppler).

## Ce que tu dois me dire

- Les quinze énoncés sont des brouillons : dis-moi lesquels tu valides, lesquels tu veux changer (texte, valeurs, tolérance). Tant qu'un défi n'est pas validé, il ne se montre qu'en local.
- La règle des étoiles te convient-elle : trois au premier essai, deux jusqu'au troisième, une ensuite ?
- Quelles simulations veux-tu ensuite ? Les fiches permettent : le satellite (fiche 3), le titrage (fiche 10), la décroissance radioactive (fiche 11), la lentille (fiche 7), la poussée d'Archimède (fiche 4), l'énergie mécanique (fiche 2).

## Ce qui n'est pas dans cette version

- Les étoiles du labo n'entrent pas encore dans le parcours ni dans l'écran des progrès.
- Pas de son : l'effet Doppler se voit, il ne s'entend pas.
- Le film de présentation montre toujours la première version.
