# Recette : septième version locale, la section Mémoire

Date : 14 novembre 2026. Durée : 30 minutes. Elle ajoute la section Mémoire : vingt-deux jeux pour s'entraîner à retenir, sans lien avec un chapitre. Tout tourne sur ton ordinateur, avec des données inventées.

## Avant de commencer

1. Ouvre Docker Desktop.
2. Dans le Terminal, place-toi dans `Documents/App Masterbac/app-masterbac`, puis lance `npm run db:demarrer`, `npm run db:migrer` (la table `memoire` est arrivée avec la cinquième version), et `npm run dev -- --port 3457`.
3. Ouvre http://localhost:3457. La boîte des e-mails locaux est à http://127.0.0.1:54324.

Fais ces essais sur ton téléphone si tu peux, ou en réduisant la fenêtre.

## Ce que tu essaies

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 1 | « S'entraîner », puis « Mémoire » | la page « Entraîne ta mémoire » : cinq familles, vingt-deux jeux |
| 2 | « Suite de chiffres », « Jouer » | la consigne en deux phrases, « De 3 à 12 chiffres », « 2 vies ». Rien ne défile encore |
| 3 | « Commencer » | trois chiffres s'affichent un par un, puis le pavé numérique s'allume |
| 4 | Tape la suite, puis la touche de validation | « Juste », puis une suite plus longue d'un chiffre |
| 5 | Trompe-toi exprès | la bonne suite, ta réponse avec le chiffre faux barré, une vie en moins, le bouton « Continuer » |
| 6 | Trompe-toi une deuxième fois, « Voir mon score » | « Partie terminée », tes points sur 100, une phrase de bilan, « Rejouer » et le retour aux jeux de mémoire |
| 7 | Reviens à la page « Mémoire » | « Ton record » sur la carte du jeu ; en haut, tes jours d'entraînement et tes parties de la semaine |
| 8 | « Cases allumées » | des cases s'allument deux secondes ; tu les retrouves en les touchant |
| 9 | « L'objet manquant » | des objets dessinés, puis les mêmes mélangés avec un en moins |
| 10 | « Mots associés » | des paires de mots sans rapport, puis le premier mot seul : tu choisis le second |
| 11 | « Le palais de mémoire » | une maison et ses pièces, un objet rangé dans chacune, puis les pièces vides à remplir de mémoire |
| 12 | « Formes et couleurs » | chaque couleur a aussi son motif (plein, rayé, à pois, vide) : le jeu se joue sans distinguer les couleurs |
| 13 | Sur l'ordinateur, « Suite de chiffres » au clavier | les chiffres, la touche Retour arrière et la touche Entrée répondent |
| 14 | Passe en thème sombre dans le profil, rouvre un jeu | le jeu reste lisible |

## Ce que tu dois me dire

- La liste des vingt-deux jeux te convient-elle ? Lesquels enlever, lesquels ajouter ?
- Les règles : deux erreurs arrêtent la partie, le score est la part des niveaux réussis. Trop dur, trop facile ?
- Les jeux sont dans la charte de l'application, sobres. Veux-tu un habillage plus marqué, comme la scène de nuit du labo ?
- Lis la partie « Ce que la section promet, et ce qu'elle ne promet pas » de `docs/decisions/0013-la-section-memoire.md` : es-tu d'accord avec ce que disent les textes ?

## Ce qui n'est pas dans cette version

- La mémoire n'entre pas encore dans le parcours, les progrès ni la séance du jour.
- Il n'y a pas de rappel pour s'entraîner chaque jour : il viendra avec les rappels par e-mail.
- Le score est annoncé par le navigateur : il ne sert qu'au record de l'élève.
