# Recette : dixième version locale, le hub Python

Date : 18 novembre 2026. Durée : dix minutes. Elle suit ta demande du 18 novembre : « une section Python dédiée dans l'application, avec des exercices et un éditeur Python où les élèves vont pouvoir s'entraîner à écrire du code » (décision 0016).

## Avant de commencer

1. Ouvre Docker Desktop.
2. Dans le Terminal, place-toi dans `Documents/App Masterbac/app-masterbac`, puis lance `npm run db:demarrer`, puis `npm run db:migrer` (une nouvelle table : `python`), puis `npm run dev -- --port 3457`. La première fois, `npm run dev` prépare Python : compte une minute de plus.
3. Ouvre http://localhost:3457 et connecte-toi. Si l'application était déjà ouverte, recharge la page.

## Ce que tu fais

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 1 | Ouvre « S'entraîner » | cinq portes ; celle de Python, au milieu, prend toute la largeur |
| 2 | Touche la porte Python | le sommaire : un bouton « Commencer », l'atelier libre, puis les exercices par thème, chacun avec son genre (compléter, écrire, corriger), sa durée, son objectif et sa fiche |
| 3 | Touche « Commencer », attends « Python est prêt », puis touche « Vérifier » sans rien changer | la liste des vérifications : certaines ne passent pas, chacune dit pourquoi sans donner la réponse |
| 4 | Ajoute une ligne `print(x2)` à la fin, puis « Lancer » | une erreur en rouge : « Ligne … · NameError », expliquée en français ; le numéro de la ligne est marqué dans l'éditeur |
| 5 | Efface cette ligne, complète le programme (les symboles sous l'éditeur aident), puis « Vérifier » | « Exercice réussi », ce qu'il faut retenir, le lien vers l'exercice suivant ; en haut, la marque « Réussi » |
| 6 | Recharge la page | ton programme est toujours là |
| 7 | Ouvre l'atelier libre, touche « Lancer » | la courbe de la chute, dans les couleurs de l'application |
| 8 | Remplace le programme par `while True:` puis, à la ligne, `x = 1`, et « Lancer » | au bout de 10 secondes : « Programme arrêté », puis « Python redémarre », puis « Lancer » répond de nouveau |
| 9 | Ouvre « Progrès », puis la fiche 1, onglet « L'essentiel » | un bloc « En Python » ; une carte « Programme-le en Python » qui mène aux exercices de la fiche |

## Ce que tu dois me dire

Les choix de détail sont dans `docs/decisions/0016-le-hub-python.md`, partie « Mes choix ». Les trois qui comptent le plus :

1. La place : sous « S'entraîner », entre les TP et la mémoire, avec la porte la plus large. Veux-tu le hub ailleurs ?
2. Le hub est ouvert à toutes les offres. Veux-tu réserver une partie des exercices aux offres payantes ?
3. Les exercices sont des brouillons : relis-les, puis dis-moi lesquels passent en « validé ». Sans validation, un élève ne voit pas le hub sur le site en ligne.

Sans réponse de ta part, je garde ces choix.

Une consigne : ne lance jamais dans le hub, avec ton compte d'administrateur, un programme qu'un élève t'a envoyé, même si la cage l'empêche aujourd'hui de nuire. Relis-le plutôt.

## Ce qui a été essayé, et ce qui ne l'a pas été

Essayé le 18 novembre, dans le navigateur de l'atelier, en largeur téléphone puis ordinateur : le sommaire, un exercice de bout en bout (programme complété au clavier, trois vérifications sur trois, réussite enregistrée), l'atelier libre (courbe, erreur expliquée, boucle sans fin arrêtée à 10 secondes puis Python reparti), le brouillon gardé après un rechargement, et la cage : un programme qui cherche à sortir ne trouve aucune fonction réseau, `fetch` vers une page de l'application n'atteint pas le serveur, `eval` est refusé, numpy marche.

Chaque exercice est rejoué avec le vrai Python par `npm run contenu:verifier`.

Pas essayé :

- Un vrai téléphone, avec son clavier : la touche Entrée d'un clavier de téléphone passe par un autre chemin que celle d'un ordinateur.
- Safari et Firefox.
- Une connexion lente : le premier chargement de Python pèse une douzaine de Mo.

Pour relancer l'essai automatique, serveur et base démarrés (compte deux minutes) :

```bash
ESSAI_SESSION=/tmp/session-python.json node scripts/essais/python.mts sorties/python eleve.python@exemple.fr
```

L'adresse doit être neuve : change-la à chaque essai.
