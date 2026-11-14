# 0013. La section Mémoire : des jeux pour s'entraîner à retenir

Date : 2026-11-14
État : demandée par Yane le 14 novembre ; la liste des jeux et les règles sont à confirmer

## La demande

« Il faut également une section "Mémoire" avec des dizaines de jeux pour permettre aux élèves de travailler leur mémoire, c'est le nerf de la guerre. Il faut des jeux de mémoire ludiques, pas forcément en lien avec les différentes matières : le but est de les entraîner à mieux retenir. »

## Le principe

- Vingt-deux jeux pour commencer, rangés par façon de retenir : une suite, des places, ce qu'on a vu, des mots, et deux méthodes.
- Les jeux n'ont pas de lien avec un chapitre. Une partie dure une à trois minutes.
- Une partie commence par une consigne en deux phrases. Rien ne défile avant l'appui sur « Commencer ».
- Un jeu monte en niveaux : chaque manche réussie allonge ce qu'il faut retenir. Une manche ratée se rejoue au même niveau, avec un autre tirage. La partie s'arrête à la deuxième erreur, ou quand le niveau le plus haut est réussi.
- Le score va de 0 à 100 : la part des niveaux réussis. La page garde le record de l'élève à chaque jeu et compte ses jours d'entraînement sur les sept derniers.
- Après une erreur, le jeu montre la bonne réponse et attend que l'élève appuie sur « Continuer ».

## Les vingt-deux jeux

| Famille | Jeu | Ce que l'élève fait |
| --- | --- | --- |
| Retenir une suite | Suite de chiffres | retenir des chiffres affichés un par un, puis les taper dans l'ordre |
| | À l'envers | retenir une suite de chiffres, puis la taper du dernier au premier |
| | Suite de couleurs | rejouer une suite de touches qui s'allonge à chaque tour |
| | Calcul en chaîne | garder le total en tête pendant que les opérations s'enchaînent |
| | Du plus petit au plus grand | retenir des nombres affichés un par un, puis les redonner rangés |
| | Un tour en arrière | dire si chaque symbole est le même qu'un peu plus tôt |
| Retenir des places | Cases allumées | retrouver les cases qui se sont allumées deux secondes |
| | Le chemin | refaire dans l'ordre un chemin de cases |
| | Chacun sa place | retrouver la case où chaque objet était posé |
| | Paires de symboles | regarder les cartes, puis retrouver les paires |
| Retenir ce qu'on a vu | L'objet manquant | trouver l'objet qui a disparu de la planche |
| | Qu'est-ce qui a changé ? | repérer la seule forme qui a changé |
| | Flash | retaper un code affiché une seconde |
| | L'intrus | trouver le seul objet nouveau sur la planche suivante |
| | Formes et couleurs | retenir la couleur de chaque forme |
| Retenir des mots | Liste de mots | reconnaître les mots d'une liste parmi d'autres |
| | Mots associés | retrouver le second mot de paires sans rapport |
| | L'histoire | répondre à des questions sur les détails d'une courte histoire |
| | Les mots dans l'ordre | remettre des mots dans l'ordre où ils sont passés |
| | Les prénoms | retrouver le prénom de chaque personnage |
| Apprendre une méthode | Par paquets | retenir un nombre long en le découpant en petits paquets |
| | Le palais de mémoire | ranger un objet dans chaque pièce d'une maison, puis les retrouver |

Les mots, les prénoms, les histoires et les dessins sont écrits pour MasterBac. Rien n'est repris d'un jeu existant.

## Qui juge

- Les jeux tournent dans le navigateur, qui annonce le score à la fin de la partie (commande `memoire.enregistrer`, table `memoire`). Le serveur vérifie la session, le nom du jeu et les bornes du score, puis écrit : l'élève n'a aucun droit d'écriture sur la table.
- Comme pour les jeux de révision qui tournent dans le navigateur, ce score ne sert qu'au record de l'élève. Il n'y a ni classement ni récompense : rien à gagner à tricher.
- Tous les tirages partent de la graine de la partie. La même graine redonne la même partie : les règles se testent sans navigateur (`tests/unitaires/memoire.test.ts`).

## Ce que la section promet, et ce qu'elle ne promet pas

- S'entraîner à ces jeux fait progresser à ces jeux. Les études ne montrent pas que cet entraînement améliore à lui seul les résultats à l'école : c'est la conclusion de la synthèse de Simons et de ses collègues (2016).
- Ce qui aide le plus à retenir un cours, c'est de se tester et d'y revenir à plusieurs jours d'écart (Dunlosky et ses collègues, 2013). L'application le fait déjà : le carnet d'erreurs, la séance du jour, les quiz.
- Les textes de la section ne disent donc pas que la mémoire « augmente ». Ils disent : « Quelques minutes par jour suffisent. Chaque jeu fait travailler une façon de retenir. »
- La famille « Apprendre une méthode » montre des techniques qui servent à retenir une liste ou un nombre. Elle peut grandir (associations, images mentales, se tester) si Yane veut relier la section aux cours.

## Mes choix, à confirmer par Yane

- La section est ouverte à tous les comptes, offre gratuite comprise.
- La mémoire est une des quatre pages de la section « S'entraîner », avec le labo, les TP et les jeux de révision (décision 0014). On y entre aussi par la page d'accueil.
- Deux erreurs arrêtent la partie. Le score est la part des niveaux réussis (ou des bonnes réponses, pour « L'histoire »), de 0 à 100.
- Après une manche réussie, la suivante part seule au bout d'une seconde. « Rejouer » repasse par la consigne.
- Quatre couleurs seulement, chacune avec son motif et son nom : un jeu ne demande jamais de distinguer deux couleurs.
- Les listes de mots, les 48 prénoms, les six modèles d'histoire et les 62 dessins sont des brouillons, à relire.
- La liste des jeux, leurs noms et leurs familles.
- La mémoire n'entre pas encore dans le parcours, les progrès ni la séance du jour.
- La section commence avec vingt-deux jeux. D'autres peuvent suivre sur le même cadre : un jeu demande ses tirages, son plateau et ses tests.

## Ce que ça change

`lib/commun/memoire/` (registre, règles des manches, tirages), `components/memoire/` (cadre commun et un plateau par jeu), `app/(appli)/app/memoire/`, `app/(appli)/memoire.css`, `lib/serveur/memoire.ts`, `lib/serveur/commandes/memoire.ts`, la table `memoire` et son test, `tests/unitaires/memoire.test.ts` (54 tests), `scripts/essais/memoire.mts`.

## Sources

- Simons et coll., « Do "Brain-Training" Programs Work? », Psychological Science in the Public Interest, 2016. Résumé par l'université de l'Illinois : https://news.illinois.edu/review-finds-little-evidence-that-brain-training-games-yield-real-world-benefits/
- Dunlosky et coll., « Improving Students' Learning With Effective Learning Techniques », Psychological Science in the Public Interest, 2013. Résumé par l'Association for Psychological Science : https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html
