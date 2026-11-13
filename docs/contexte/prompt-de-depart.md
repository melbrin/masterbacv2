# Construire l'application MasterBac

Tu vas construire l'application MasterBac dans ce dépôt, `app-masterbac`, de la mise en place jusqu'aux fonctions du printemps. Je suis Yane, fondateur de MasterBac, professeur de maths et de physique-chimie. Je crée les comptes techniques, je garde les clés et je tranche. Tu écris tout le reste : le code, les tests, les migrations, les scripts, la documentation, et les marches à suivre dont j'ai besoin.

Deux exigences passent avant tout le reste : l'application doit être très bien testée et très sûre. Elle garde des données d'élèves mineurs, elle vend un contenu qui est tout mon actif, elle encaisse des paiements. Quand le temps manque, on livre moins de fonctions, jamais des fonctions moins sûres.

## 1. Ce qu'on construit

MasterBac ne vend plus des fiches en PDF : il vend la prochaine note. L'application dit à l'élève de terminale quoi travailler ce soir, le corrige sur ce qu'il a écrit et le tient jusqu'au bac, les 16 et 17 juin 2027. Physique-chimie d'abord, maths ensuite.

Six usages pour l'élève, un seul stock d'exercices :

1. la séance du jour, en 25 minutes ;
2. le mode DS : il donne la date et le chapitre, le plan de révision sort tout seul ;
3. les cours et les quiz des 14 fiches ;
4. les niveaux 10, 14 et 18, par chapitre ;
5. les sujets du bac et la correction ;
6. le suivi pour les parents, qui sont ceux qui paient.

S'y ajoutent le plan de l'année, les offres (gratuit, mensuel à 9,99 €, Pass Bac 2027 à 79 €, Pack à 149 €, stage à 29 €) et une administration pour moi.

Les dates :

| Date | Ouverture |
| --- | --- |
| 7 décembre 2026 | bêta fermée, une vingtaine de clients actuels. Version stabilisée le 11 : c'est la première version que j'attends |
| 19 décembre 2026 | ouverture au public, paiement compris. Cette date ne bouge pas |
| 15 janvier 2027 | coach complet : séance du jour, niveaux, plan de l'année, bac blanc |
| de février à avril 2027 | sujets du bac, correction sur photo en test, bilan automatique des parents, maths |

## 2. D'où on part

- **Ce dépôt** contient le test de niveau gratuit, en ligne sur app.masterbac.fr : Next.js 15, React 19, Tailwind, KaTeX, environ 3 800 lignes, 326 questions. Ni compte, ni base, ni paiement. On le fait grandir, on ne repart pas de zéro, et ses adresses actuelles ne changent pas.
- **Les 14 fiches de physique-chimie** sont à jour et contrôlées : 281 questions de cours, 62 exercices, 188 figures. Leur source est un fichier texte par fiche, d'où sortent le Word, les PDF et les données de l'application.
- **Un prototype**, que j'ai validé le 13 novembre 2026, montre les écrans, les textes et les règles du coach. C'est ta référence pour l'interface, et le code d'origine du moteur de préparation.
- **Des cas de référence** donnent, pour des entrées fixées, les résultats exacts que le moteur doit produire.

## 3. Le kit

Tout est dans le dossier `kit-claude-code/`, à la racine du dépôt. Son sous-dossier `depot/` se copie à la racine par le script d'installation. Après l'installation, tu trouveras :

| Chemin | Contenu |
| --- | --- |
| `CLAUDE.md` | les règles du projet, chargées à chaque session |
| `docs/SUIVI.md` | où en est le projet : sa mémoire d'une session à l'autre |
| `docs/01-cahier-des-charges.md` | ce que l'application doit faire, écran par écran |
| `docs/02-architecture.md` | la structure retenue, ses raisons, le modèle de données, les environnements |
| `docs/03-securite.md` | ce qu'on protège, 28 cas d'abus avec leur parade et leur test, les règles sur les données des mineurs |
| `docs/04-tests-et-qualite.md` | les commandes, les niveaux de test, les seuils, la définition de « fini » |
| `docs/05-plan-de-livraison.md` | les phases, les lots, les dates, l'ordre de coupe |
| `docs/06-comptes-et-secrets.md` | ce que j'ouvre et règle moi-même, la liste des variables d'environnement |
| `docs/07-contenu.md` | des fiches à l'application : export, import, contenu à écrire, règles de rédaction |
| `docs/08-moteur.md` | les règles du coach, les cas de référence, les évolutions décidées |
| `docs/contexte/` | la stratégie, le plan d'implémentation, l'analyse du prototype, ce prompt |
| `docs/decisions/` | les choix faits, un fichier par décision |
| `reference/` | le prototype figé, 52 captures d'écran, les cas de référence du moteur |
| `contenu/sources/` | les 14 fiches (texte et figures) et leurs outils Python |
| `contenu/export/` | les données exportées des fiches : JSON et figures |
| `contenu/pdf/` | les 28 PDF des fiches, hors dépôt git |
| `.claude/` | permissions, règles par dossier, deux agents de relecture, la commande `/verifier-phase` |
| `env.exemple` | le nom de chaque variable d'environnement, sans aucune valeur |

En cas de désaccord entre les sources : le cahier des charges l'emporte sur le prototype, le prototype sur l'existant. Le kit a été écrit le 13 novembre 2026. Si un point te paraît faux, dépassé ou contradictoire, dis-le-moi au lieu de le suivre.

## 4. Qui fait quoi

| Moi | Toi |
| --- | --- |
| je tranche les questions de produit | tu poses les questions groupées, avec une réponse par défaut |
| j'ouvre les comptes : Supabase, Stripe, Resend, Vercel, Cloudflare | tu me donnes la marche à suivre, pas à pas, au bon moment |
| je pose les clés dans Vercel, GitHub et mon fichier `.env.local` | tu ne vois jamais une clé, et tu ne m'en demandes jamais |
| je relis le contenu préparé pour les élèves | tu le prépares en brouillon, par lots de trente minutes de relecture |
| j'essaie chaque livraison sur mon téléphone, puis je fusionne | tu livres sur une branche, avec une fiche de recette de dix minutes |
| je lance les migrations de production | tu prépares tout, et tu ne touches à aucun environnement distant sans mon oui |

Je dispose d'une douzaine d'heures par semaine pour tout le projet, et je débute en gestion de projet. Demande-moi peu, au bon moment, en mots simples.

## 5. L'architecture retenue

Le détail et les raisons sont dans `docs/02-architecture.md`. L'essentiel :

- un seul dépôt, une seule application Next.js découpée en modules, sur Vercel, fonctions à Paris ;
- Next.js monté sur la dernière version corrigée de la branche 16, dès la phase 0 ;
- le navigateur ne parle jamais à la base : tout passe par le serveur, et les règles d'accès par ligne restent actives sur toutes les tables ;
- Supabase à Paris pour la base, les comptes et le stockage ; connexion par adresse e-mail et code à usage unique, sans mot de passe ;
- le contenu des fiches importé en base depuis leur export, servi morceau par morceau après contrôle du droit, jamais embarqué dans l'application ;
- le moteur de préparation en module pur, sur le serveur, sans IA, d'abord identique au prototype ;
- le paiement par la page hébergée de Stripe ; un droit ne s'ouvre que par un message signé de Stripe ;
- pas de service en plus tant qu'il n'est pas nécessaire : limitation de débit, tâches planifiées et file d'attente dans Postgres et Vercel.

Cette architecture est une proposition (décision 0001). En phase 0, dis-moi si tu vois une raison sérieuse de t'en écarter, puis on s'y tient.

## 6. Le niveau de sécurité

Lis `docs/03-securite.md` en entier avant d'écrire la première ligne. Ce que j'attends :

- refus par défaut partout : une table sans règle d'accès est inaccessible, un point d'entrée du serveur sans accès déclaré ne compile pas ;
- le serveur ne croit rien de ce que le navigateur envoie : ni un prix, ni un score, ni un identifiant ;
- aucun secret dans le dépôt, les journaux, la documentation ou la conversation ;
- chaque fonction livrée avec les tests de ses cas d'abus ;
- la référence OWASP ASVS 5.0 au niveau 2, tenue à jour dans un tableau ;
- une relecture de sécurité par un agent qui n'a pas écrit le code, avant chaque demande de fusion sensible et avant chaque ouverture ;
- le moins de données possible sur les élèves, hébergées à Paris, sans outil de suivi tiers ;
- tu ne désactives jamais un contrôle ou un test pour avancer. Si un contrôle te gêne, tu me dis pourquoi.

## 7. Le niveau de test

Lis `docs/04-tests-et-qualite.md`. Ce que j'attends :

- des tests à chaque niveau : unitaires, règles d'accès de la base, intégration contre une base locale, parcours dans un navigateur sur téléphone et sur ordinateur, sécurité, contenu ;
- le moteur reproduit tous les cas de référence, avec des tests de propriété et une couverture d'au moins 95 % ;
- le paiement testé avec des messages signés : doublon, signature fausse, désordre, remboursement, résiliation ;
- une seule commande, `npm run tout`, qui lance tout ce que lancent les vérifications automatiques ;
- aucun test qui dépend de l'heure réelle, du réseau ou d'une donnée réelle ;
- tu ne dis « fini » que selon la définition de `docs/04-tests-et-qualite.md`, section 5.

## 8. L'ordre du travail

Les phases, leurs lots et leur critère de fin sont dans `docs/05-plan-de-livraison.md`.

| Phase | Dates | Fini quand |
| --- | --- | --- |
| 0. Mise en place | du 13 au 15 novembre | tout est vert, et le test actuel marche comme avant |
| 1. Socle | du 16 au 29 novembre | un élève test se connecte et lit une fiche entière sur son téléphone |
| 2. Mode DS et bêta | du 30 novembre au 13 décembre | dix élèves ont préparé un vrai DS avec l'application |
| 3. Caisse et ouverture | du 14 au 19 décembre | un parent achète le Pass depuis le lien envoyé par son enfant |
| Gel | du 19 décembre au 4 janvier | corrections seulement |
| 4. Coach complet | du 5 au 15 janvier | un élève inscrit le 15 janvier reçoit sa séance du lendemain sans intervention |
| 5. Sujets, correction, maths | de février à avril | l'écart entre la correction sur photo et celle d'un professeur est mesuré sur 30 copies |
| 6. Sprint et bilan | de mai à juillet | les notes estimées sont comparées aux notes du bac |

Tu réalises tout, phase après phase. Tu ne commences pas une phase avant que la précédente soit vérifiée par `/verifier-phase` et que je l'aie essayée.

## 9. La méthode

1. **Un lot à la fois.** Avant de coder, présente-moi ton plan pour le lot : ce que l'élève pourra faire, les fichiers touchés, les tests prévus, les risques. J'approuve, puis tu codes.
2. **Une branche et une demande de fusion par lot.** Tu ne pousses jamais sur `main`. C'est moi qui fusionne.
3. **Les tests avec le code.** Pour une règle du moteur, un droit ou une règle d'accès, le test s'écrit d'abord.
4. **Avant chaque demande de fusion** : `npm run tout`, relecture par les agents `relecteur-securite` et `relecteur-conformite`, fiche de recette.
5. **À la fin de chaque session** : mets à jour `docs/SUIVI.md`. Les sessions suivantes repartent de ce fichier.
6. **Quand tu m'attends** (un compte, une clé, une relecture) : écris-le dans `docs/SUIVI.md` avec la marche à suivre, et avance sur ce qui ne dépend pas de moi.
7. **Quand un choix engage la suite** : une décision dans `docs/decisions/`.
8. **Pour un outil qui change vite** (Next.js, Supabase, Stripe, Claude Code) : vérifie la documentation officielle de la version installée avant d'écrire.
9. **Si le temps manque** : préviens-moi tôt, et applique l'ordre de coupe de `docs/05-plan-de-livraison.md`, section 4.

## 10. Ce que tu fais maintenant

1. Vérifie que tu es à la racine du dépôt `app-masterbac`, sur une branche à jour de `main`, sans modification en attente (`git status`). Sinon, arrête-toi et dis-le-moi.
2. Crée la branche `lot/0.1-installation-du-kit`.
3. Lance `node kit-claude-code/installe.mjs --simulation`, montre-moi ce qu'il annonce, puis lance `node kit-claude-code/installe.mjs`. Le script ne remplace aucun fichier existant et s'arrête au moindre conflit. Regarde ensuite `git status` : si des fichiers personnels d'un ancien dossier `.claude/` apparaissent, ne les ajoute pas et dis-le-moi. Enregistre l'installation dans un commit.
4. Lis `CLAUDE.md`, `docs/SUIVI.md`, puis les documents `docs/01` à `docs/08`, dans l'ordre, et `docs/contexte/analyse-du-13-novembre.md`.
5. Parcours la référence : `reference/LISEZMOI.md`, le code du moteur (`reference/prototype/site/js/moteur.js`, `etat.js`, `util.js`), deux ou trois écrans, quelques captures.
6. Lis tout le code existant et écris `docs/audit-de-l-existant.md` : ce qui marche, ce qui est fragile, ce qui doit changer, et dans quel lot.
7. Vérifie sur les sources officielles ce qui a pu changer depuis le 13 novembre 2026 : la version courante de Next.js et ses avis de sécurité, les clés et la bibliothèque serveur de Supabase, Stripe, les réglages de Claude Code du dossier `.claude/`. Note les écarts avec le kit.
8. Présente-moi, en français simple :
   - ce que tu as compris du projet, en dix lignes ;
   - tes questions, groupées, avec une réponse par défaut pour chacune ;
   - le plan détaillé de la phase 0 ;
   - ce que je dois faire cette semaine, pas à pas.
9. Attends mon accord. Puis déroule la phase 0, lot par lot.

## 11. Comment me parler

- En français, en me tutoyant, en peu de mots. Des listes courtes pour les synthèses. Pas de tiret long.
- Dis-moi ce qui est fait, ce qui ne l'est pas et ce qui est simulé. Pas de « fini » pour ce qui n'est pas testé.
- Quand je dois faire quelque chose, donne-moi les étapes une par une, avec ce que je dois voir à chaque étape.
- Quand tu n'es pas sûr, dis-le, et propose comment le vérifier.
