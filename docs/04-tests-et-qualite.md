# Tests et qualité : comment on sait que ça marche

Yane ne relit pas le code. Ce qui lui garantit que l'application fait ce qu'elle doit, ce sont les tests, les vérifications automatiques et ses essais sur son téléphone. Ce document fixe ce qui est testé, à quel niveau, avec quels seuils, et ce que « fini » veut dire.

## 1. Les commandes

Tu crées ces commandes en phase 0. Leur nom ne change plus : la documentation, les vérifications automatiques et les consignes de Yane s'y réfèrent.

| Commande | Ce qu'elle fait | Durée visée |
| --- | --- | --- |
| `npm run verif` | lint, types, tests unitaires, contrôle rapide du contenu | moins d'une minute |
| `npm run test:db` | tests des règles d'accès de la base, sur la base locale | 1 minute |
| `npm run test:integration` | commandes, requêtes, webhook, tâches planifiées, import, contre la base locale | 3 minutes |
| `npm run test:e2e` | parcours complets dans un navigateur, téléphone et ordinateur | 6 minutes |
| `npm run test:securite` | cas d'abus, en-têtes, matrice des accès, recherche de secrets | 3 minutes |
| `npm run test:mutation` | tests de mutation sur le moteur et les droits | à lancer avant chaque fin de phase |
| `npm run contenu:verifier` | contrôles complets de l'export des fiches | 1 minute |
| `npm run tout` | tout ce que lancent les vérifications automatiques, dans le même ordre | 15 minutes |
| `npm run db:demarrer`, `db:arreter`, `db:reinitialiser`, `db:types` | base locale : démarrer, arrêter, repartir des migrations et des données d'essai, régénérer les types | |
| `npm run env:local` | prépare `.env.local` pour le travail en local, sans afficher de valeur | |
| `npm run env:verifier` | dit quelles variables manquent, par leur nom, sans afficher de valeur | |
| `npm run sonde -- <adresse>` | contrôles de sécurité sans effet sur un environnement déployé | 1 minute |
| `npm run distant:...` | tout ce qui touche la recette ou la production ; demande toujours l'accord de Yane | |

Aucune commande ne touche un environnement distant sans porter le préfixe `distant:`.

## 2. Ce qui est testé, et où

| Niveau | Outil | Ce qu'on y teste |
| --- | --- | --- |
| Unitaire | Vitest | le moteur (cas de référence, propriétés, jours particuliers) ; la correction des cinq types de quiz ; le calcul des droits ; les dates de Paris ; le nettoyage du HTML ; les schémas de validation ; le formatage à la française |
| Base | pgTAP, par `supabase test db` | règles d'accès de chaque table pour chaque rôle ; droits des rôles ; contraintes ; déclencheurs ; fonctions |
| Intégration | Vitest, base locale | chaque commande et chaque requête ; le webhook Stripe avec des messages signés ; le cycle d'un droit ; l'import du contenu rejoué ; les tâches planifiées rejouées ; les e-mails, lus dans la boîte locale |
| Parcours | Playwright | ce que fait un élève, un parent, Yane, du premier écran au résultat |
| Sécurité | Vitest et Playwright | les 28 cas d'abus de `docs/03-securite.md` ; les en-têtes sur toutes les pages ; la matrice des accès générée depuis le registre des points d'entrée |
| Contenu | scripts | forme de l'export ; formules ; figures ; renvois ; mots interdits |
| Accessibilité | axe, dans Playwright | écrans principaux, thèmes clair et sombre |
| Performance | Lighthouse, à chaque fin de phase | écrans principaux, profil téléphone |

### Les seuils

| Périmètre | Lignes | Branches | Mutation |
| --- | --- | --- | --- |
| `lib/moteur/` | 95 % | 95 % | 80 % |
| `lib/serveur/acces.ts` et le calcul des droits | 100 % | 100 % | 90 % |
| `lib/serveur/paiement/` | 90 % | 90 % | |
| `lib/serveur/` (reste) et `lib/commun/` | 85 % | 80 % | |
| Ensemble | 80 % | 75 % | |

Un seuil non atteint fait échouer `npm run tout`. On ne baisse pas un seuil pour passer : on écrit le test, ou on décide avec Yane.

## 3. Les tests qui comptent le plus

### Le moteur

Voir `docs/08-moteur.md`, section 8. Les cas de référence passent tous, à chaque exécution, pour toujours.

### Les règles d'accès de la base

Pour chaque table, un fichier pgTAP joue les sept rôles : visiteur, élève A, élève B, parent lié à A, parent non lié, administrateur, service. Pour chacun : ce qu'il peut lire, ce qu'il ne peut pas lire, et qu'il ne peut rien écrire (sauf le service). Un test de catalogue échoue si une table n'a pas ses règles d'accès actives, si elle n'a pas de fichier de test, ou si un rôle du navigateur a un droit d'écriture.

### Le paiement

Avec des messages signés fabriqués par les tests :

| Cas | Attendu |
| --- | --- |
| paiement réussi | achat payé, droit ouvert, e-mail parti, une seule fois |
| même message reçu deux fois | aucun effet la deuxième fois |
| signature fausse, corps modifié, message trop ancien | refus, entrée au journal, aucun droit |
| message de paiement arrivé avant ou après les autres, dans le désordre | état final correct |
| montant ou tarif différent de l'achat préparé | refus, incident ouvert |
| retour du navigateur sans message | aucun droit |
| remboursement, litige | droit retiré |
| abonnement : renouvellement, échec de paiement, résiliation, fin de période | droit prolongé, suspendu, maintenu jusqu'au terme, retiré |
| stage acheté puis Pass dans les 7 jours | 29 € déduits ; au 8e jour, plus de déduction |
| tarif clients actuels | appliqué une fois à une adresse reconnue, jamais sinon |
| rapprochement | un paiement que la base a manqué est rattrapé |

### Les parcours

Chaque parcours tourne en 390 × 844 (téléphone) et en 1280 × 900 (ordinateur). Les codes de connexion se lisent dans la boîte de réception locale.

1. Test de niveau sans compte, résultat, création du compte, score rattaché.
2. Inscription d'un élève de moins de 15 ans : compte limité, accord du parent, compte ouvert.
3. Lire une fiche entière : L'essentiel, une question avec ses deux indices et son corrigé, un exercice au barème, formules et figures affichées.
4. Quiz du chapitre : les cinq types de questions, l'explication, le bilan, les erreurs dans le carnet.
5. Mode DS : un devoir dans 1 jour, dans 3 jours, dans 8 jours ; le plan ; une séance cochée ; le DS blanc ; la note et la moyenne de classe.
6. Offre gratuite : corrigé verrouillé hors du plan, ouvert dans le plan de la préparation offerte ; deuxième préparation refusée.
7. Carnet d'erreurs : une erreur revient à 2 jours, puis 7, puis 21 (l'horloge du test avance).
8. Lien parent : invitation, accès du parent, page de suivi, aucune réponse de l'élève visible.
9. Achat : un parent paie depuis le lien envoyé par son enfant ; l'accès s'ouvre à réception du message signé.
10. Résiliation du mensuel et demande de rétractation.
11. Signaler une erreur ; la voir et y répondre dans l'administration.
12. Relecture d'un brouillon de contenu dans l'administration : invisible pour l'élève avant, visible après validation.
13. Quatrième appareil : la connexion la plus ancienne est fermée.
14. Séance du jour, niveaux, test de passage, plan de l'année (phase 4).
15. Installation sur l'écran d'accueil et page hors ligne.

### La sécurité

Voir `docs/03-securite.md`. Deux mécanismes ne dépendent de la mémoire de personne :

- **La matrice des accès** est générée depuis le registre des points d'entrée : un nouveau point d'entrée sans cas dans la matrice fait échouer la suite.
- **Les marqueurs.** Dans les données d'essai, chaque corrigé et chaque clé de quiz contient un marqueur unique. Les parcours d'un compte sans droit échouent si un marqueur apparaît dans une réponse du serveur.

### Le contenu

`npm run contenu:verifier` contrôle, sur `contenu/export/` :

- la forme de chaque fichier (schéma) ;
- les compteurs attendus : 14 fiches, 281 questions, 62 exercices, 188 figures, 161 questions de quiz, ou les nouveaux compteurs après une mise à jour déclarée ;
- chaque formule, rendue avec la version de KaTeX de l'application ;
- chaque figure citée existe, chaque figure présente est citée ;
- chaque renvoi (notions, « Ce qui est tombé ») pointe vers un élément existant ;
- chaque clé de quiz est valide ;
- seules les balises et les classes de la liste fermée apparaissent ;
- aucun tiret long, aucun mot interdit.

## 4. Les vérifications automatiques

Dans GitHub Actions, à chaque demande de fusion et à chaque envoi sur `main` : installation propre, `npm run tout`, construction de l'application, recherche de secrets, audit des dépendances, analyse statique de sécurité. Une demande de fusion ne se fusionne pas tant qu'une vérification est rouge.

Chaque nuit : tests de mutation, analyse de l'application en fonctionnement, audit complet des dépendances.

Les vérifications n'utilisent aucun secret réel. Le temps de calcul gratuit d'un dépôt privé est limité : si les vérifications dépassent 15 minutes, tu les allèges avant d'en ajouter.

## 5. Ce que « fini » veut dire

Un lot est fini quand tout ce qui suit est vrai :

1. Le comportement correspond au cahier des charges et, pour les écrans, au prototype.
2. Les tests du lot existent à tous les niveaux utiles, et `npm run tout` est vert, sur ta machine et dans les vérifications automatiques.
3. Chaque nouveau point d'entrée a son accès déclaré et ses cas d'abus testés. `relecteur-securite` n'a plus de constat ouvert de niveau moyen ou plus.
4. `relecteur-conformite` n'a plus de constat ouvert : textes, accessibilité, données personnelles.
5. `docs/SUIVI.md` est à jour ; une décision est écrite si un choix a été fait ; `docs/06-comptes-et-secrets.md` est à jour si une variable ou un réglage s'ajoute.
6. La demande de fusion décrit ce qui change, comment l'essayer en dix minutes sur un téléphone, les risques et le retour en arrière, avec des captures d'écran en 390 points de large.

Une phase est finie quand ses lots sont finis, que `/verifier-phase` ne trouve plus rien, et que son critère « fini quand » est atteint dans la réalité, pas seulement dans les tests.

## 6. La recette par Yane

À la fin de chaque lot visible et de chaque phase, tu écris `docs/recettes/<phase>-<lot>.md` : ce que Yane doit essayer sur son téléphone, étape par étape, avec ce qu'il doit voir. Dix minutes par lot, trente pour une phase. Tu y indiques l'adresse de prévisualisation, les comptes d'essai à utiliser, et ce qui est encore simulé.

Ce que Yane remonte devient soit une correction dans le lot, soit une ligne dans `docs/SUIVI.md`.

## 7. Ce qu'on ne fait pas

- Pas de test qui dépend de l'heure réelle, du réseau ou d'un service distant : l'horloge s'injecte, les services se simulent, sauf la base locale, qui est réelle.
- Pas de test désactivé pour faire passer une suite. Un test instable se répare ou se supprime avec une explication.
- Pas de test qui recopie le code qu'il teste. Un test décrit un comportement attendu.
- Pas de donnée réelle dans les tests : prénoms et adresses inventés, domaines en `exemple.fr`.
