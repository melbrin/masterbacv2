# Recette : première version locale

Date : 13 novembre 2026. Durée : 20 minutes. Tout tourne sur ton ordinateur, avec des données inventées.

## Avant de commencer

1. Ouvre Docker Desktop : la baleine doit être dans la barre du haut.
2. Dans le Terminal, place-toi dans `Documents/App Masterbac/app-masterbac`.
3. Lance, une commande après l'autre :
   - `npm run db:demarrer` : tu dois voir une liste d'adresses locales. La première fois, c'est long.
   - `npm run env:local` : tu dois voir « .env.local prêt ».
   - `npm run contenu:importer` : tu dois voir « Contenu importé » ou « Contenu inchangé », avec 14 fiches.
   - `npm run dev -- --port 3457` : laisse cette fenêtre ouverte.
4. Ouvre http://localhost:3457 : le test de niveau s'affiche.

Les e-mails ne partent pas vraiment : ils arrivent dans une boîte locale, à l'adresse http://127.0.0.1:54324.

## Ce que tu essaies

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 1 | En bas du test, « Me connecter à l'application MasterBac ». Saisis une adresse inventée, par exemple `eleve@exemple.fr` | « Si cette adresse peut recevoir un code, il vient de partir » |
| 2 | Ouvre la boîte locale, lis le code à six chiffres, saisis-le | l'écran « Trois questions, et on commence » |
| 3 | Prénom, classe, note visée, « Oui » pour 15 ans | l'écran Aujourd'hui, avec J−215 avant le bac et le bandeau « Offre gratuite » |
| 4 | Cours, puis une fiche | les six onglets, les formules bien affichées, la case « Vu en classe » |
| 5 | Onglet Questions, ouvre la question 1, demande les indices puis le corrigé, note-toi « Raté » | le corrigé s'affiche ; le message dit que la question revient dans 2 jours |
| 6 | Ouvre une autre question de la même fiche et demande son corrigé | « Ce corrigé fait partie du Pass » |
| 7 | Onglet Quiz, lance le quiz | dix questions au plus, corrigées une par une |
| 8 | DS, « Préparer un DS » : une date dans dix jours, un chapitre | un plan en sept séances ; les corrigés de ses questions s'ouvrent |
| 9 | DS, essaie d'en préparer un second | refus : la préparation offerte est utilisée |
| 10 | Carnet d'erreurs | ta question ratée, avec sa date de retour |
| 11 | Aujourd'hui, « Commencer la séance », puis « J'ai fini ma séance » | la séance est cochée, la semaine compte une séance |

## L'administration

1. Dans un second Terminal : `npm run admin:local -- eleve@exemple.fr`. Tu dois voir « Ce compte est administrateur ».
2. Dans l'application : Profil, « Me déconnecter », puis reconnecte-toi.
3. Ouvre http://localhost:3457/admin : la double authentification est demandée. Scanne le code avec une application d'authentification, saisis le code à six chiffres.
4. « Ouvrir un accès » : ton adresse, « Pass Bac 2027 », une référence de commande. Tu dois voir « Accès ouvert sur le compte », et l'accès dans la liste.
5. Retourne dans l'application : le bandeau « Offre gratuite » a disparu, tous les corrigés s'ouvrent.
6. Ouvre un accès pour une adresse qui n'a pas de compte : il apparaît dans « En attente ». Connecte-toi ensuite avec cette adresse : l'accès est là dès la première connexion.
7. « Retirer », avec un motif : l'accès disparaît, et la ligne apparaît dans le journal.

## Ce qui est simulé ou absent

- Les e-mails restent dans la boîte locale. Aucun rappel n'est envoyé.
- Le barème des exercices est provisoire : points à parts égales, plus une ligne « Rédaction ».
- Les indices sont ceux du prototype : les notions en jeu, puis la méthode ou le piège quand la fiche en a un.
- Pas encore là : la page des parents, le plan de l'année, l'accord parental avant 15 ans, la limite de trois appareils, « mes données », le DS blanc avec son chronomètre, le rattachement du résultat du test au compte.
