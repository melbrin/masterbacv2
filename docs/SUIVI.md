# Suivi du projet

Ce fichier est la mémoire du projet d'une session à l'autre. Il est chargé au début de chaque session. Tu le mets à jour à la fin de chaque session, et tu le gardes court : ce qui est fini depuis longtemps part dans `docs/journal/`.

## Où on en est

- **Cap** : une version complète en local d'abord (décision 0003). La mise en ligne et les comptes distants viennent ensuite. La branche se pousse quand la version locale est finie.
- **Vente** : sur Shopify ; les accès s'ouvrent dans l'administration (décision 0002). Pas de Stripe dans l'application.
- **Branche de travail** : `lot/0.2-outillage`, empilée sur `lot/0.1-installation-du-kit`. Rien n'est poussé sur GitHub.
- **Dossier de travail** : `Documents/App Masterbac/app-masterbac/`. L'ancien dossier `masterbac-simulator/` (juillet 2026) est intact à côté et n'est pas repris.
- **Lancer en local** : voir `docs/recettes/version-locale-1.md`. Port 3457 ; le port 3456 est celui de l'ancien dossier.
- **Version locale** : essayée par Yane le 14 novembre, plusieurs fois. Ses demandes du jour sont dans les décisions 0005 à 0014. Dernières en date (soir du 14 novembre) : des TP où l'on manipule vraiment, plus de TP dont l'optique, une section « S'entraîner » à la place de « Jeux », pas de mise en forme « typique des IA », puis, après son essai du titrage, un guide (une main qui montre le geste) et un essai de bout en bout par moi. Recettes : `docs/recettes/version-locale-3.md` à `version-locale-8.md`. En attente de son essai.

## Fait et vérifié

- Lots 0.1 à 0.3 (partie locale) : kit, audit, Next.js 16.4.5, lint avec frontières d'import, polices locales, en-têtes, compte à rebours 2027.
- Moteur (`lib/moteur/`) : 43 cas de référence, propriétés, cas limites ; couverture 100 % des lignes, 99 % des branches.
- Contenu : nettoyage du HTML, `npm run contenu:verifier`, `npm run contenu:importer` (rejouable, par versions, figures dans un compartiment privé).
- Base locale : règles d'accès sur toutes les tables, schéma `contenu` réservé au serveur, 62 tests pgTAP (`npm run test:db`).
- Serveur : variables validées, session vérifiée par `getClaims()`, fabriques `action` et `requete` avec registre, limite de débit, droits calculés dans `lib/serveur/acces.ts`.
- Écrans, essayés dans le navigateur en largeur téléphone : connexion par code, profil, Aujourd'hui, cours, fiche (six onglets), question et exercice (indices, corrigé après contrôle du droit, autocorrection, barème avec ligne « Rédaction »), quiz corrigé par le serveur, test de passage, carnet, mode DS (création, plan, préparation offerte, note et moyenne de classe), séance du jour, progrès, profil, offres.
- Administration : double authentification, accès ouverts ou préparés pour une adresse, retrait avec motif, signalements, journal.
- Deuxième version locale (14 novembre), essayée dans le navigateur en largeur téléphone avec un compte gratuit puis un Pass : textes réécrits en langue simple ; séance du jour guidée question par question, avec fin automatique, bilan, confettis et séries ; retour animé après l'autocorrection ; mode DS étape par étape, avec l'écran du DS blanc et son minuteur ; année sur « Tombé au BAC » ; questions cumulées par note visée ; écran des progrès avec la courbe des notes, le travail par semaine, la régularité sur quatre semaines, la réussite par objectif et le bilan du mois ; retour au carnet après une question du carnet.
- Défauts trouvés à l'essai et corrigés : la correction de la dernière question d'un quiz disparaissait ; le terminal de développement écrivait l'adresse e-mail et le code de connexion (coupé dans `next.config.ts`).
- Troisième version locale (14 novembre) : test de calibrage à la première connexion et refaisable, parcours recalculé à chaque affichage (paliers, étapes, signaux), dix jeux (sept dans le navigateur, trois corrigés par le serveur), quiz mélangé, simulation du basketteur, plan de DS réparti entre les chapitres, table `parties` (records), menu avec « Jeux » en bas et « Parcours » en haut.
- Essais de la troisième version : calibrage, parcours, quiz mélangé, trois jeux du serveur et plan de DS sur trois chapitres dans le navigateur intégré ; les sept jeux du navigateur et la simulation avec Playwright (`scripts/essais/jeux.mts`), parce que le navigateur intégré met les animations en pause.
- Quatrième et cinquième versions locales (14 novembre), le labo : quarante-deux défis en quatorze simulations, un défi par objectif. En physique : basketteur, largage, satellite, thé, effet Doppler, circuit RC. En chimie : préparer une solution, pH, titrage, spectrophotomètre, cinétique, décroissance radioactive, pile et électrolyse, synthèse. L'élève calcule, entre sa valeur, lance la simulation ; le serveur juge l'essai avec les mêmes règles que le navigateur, compte les essais et donne les étoiles (table `defis`). Les énoncés sont des brouillons, gardés sur le serveur, visibles seulement en local ou par l'administrateur.
- Essais du labo avec Playwright (`scripts/essais/labo.mts`), en largeur téléphone puis sur grand écran et en thème sombre : les quarante-deux défis joués (le premier de chaque simulation avec une valeur fausse puis la bonne), les étoiles, le défi fermé, le défi rejoué, sans défilement horizontal ni erreur de page.
- Sixième version locale (14 novembre, après-midi), les TP façon ECE, lot A (décision 0012) : quatre TP sur deux paillasses à boutons. Yane les a essayés et a demandé une refonte : voir la huitième version.
- Septième version locale (14 novembre), la section Mémoire (décision 0013) : vingt-deux jeux en cinq familles, un cadre commun (consigne, manches, deux vies, score sur 100, record), tirages à partir d'une graine, 54 tests. Essai Playwright des vingt-deux jeux en thème clair et sombre (`scripts/essais/memoire.mts`). Les listes de mots, de prénoms, les histoires et les dessins sont des brouillons.
- Huitième version locale (14 novembre, soir) :
  - La section « Jeux » devient « S'entraîner » (décision 0014) : une page d'accueil à quatre portes, et quatre pages (Labo à `/app/labo`, TP, Mémoire, Jeux) reliées par un sous-menu. Essai Playwright des dix pages, téléphone et ordinateur, clair et sombre (`scripts/essais/sections.mts`).
  - Les TP refaits pour que l'élève manipule (décision 0012, partie « La refonte ») : chaque paillasse est un module (règles pures dans `lib/commun/tp/paillasses/`, vue dans `components/tp/paillasses/`, contenu dans `lib/serveur/contenu/tp/`), monté dans un établi en plein écran avec le kit `components/tp/kit/`. La graine de l'essai choisit les valeurs de la situation. Le guide est `docs/09-paillasses.md`.
  - La paillasse Titrage refaite et ses trois TP (détartrant avec indicateur coloré, vinaigre au pH-mètre, sérum physiologique au conductimètre) : flacon à prendre pour rincer et remplir la burette, robinet à tourner (goutte à goutte, filet), pipette jusqu'au trait de jauge, loupe sur les graduations, lecture notée par l'élève, courbe des relevés avec repère. Essayée dans un vrai navigateur sur le banc d'essai (`scripts/essais/titrage.mts`) : manipulation soignée jugée sans faute par le serveur, pour les trois suivis.
  - Le cadre des TP essayé de bout en bout (`scripts/essais/tp.mts`) : chaque TP du début au bilan, paillasse en plein écran, reprise d'un TP laissé en route.
  - Les documents d'un TP et la page des TP redessinés en feuilles de sujet (filet gras et filet maigre, numéro en capitales espacées) : plus de carte arrondie à barre cuivre.
  - Le guide des paillasses (`docs/09-paillasses.md`, section 5 ; décision 0012, « Le guide ») : une main montre le prochain geste, une phrase le dit, l'étape du protocole ressort ; un bouton le coupe ; une manipulation guidée vaut B au mieux. Fait pour le titrage et ses trois TP.
  - Les trois TP de titrage essayés de bout en bout, à la souris seulement, par un robot qui suit la main, lit la loupe et la courbe comme un élève : du sommaire au bilan (A, A, B, A), en 390 × 844 et en 1219 × 778, sans erreur de page (`scripts/essais/tp-eleve.mts`, `titrage-guide.mts`). Sans guide, le score reste 1 (`titrage.mts`). Les gestes maladroits ont leur essai (`titrage-maladroit.mts`).
  - Ce que cet essai a fait corriger : une lecture juste comptée comme une faute, un robinet trop nerveux, des appuis brefs sans effet, une courbe de conductimétrie peu lisible (elle trace maintenant ses deux droites), des objets sans nom, des libellés qui se chevauchaient. Le détail est dans la décision 0012.
- `npm run tout` : vert le 14 novembre au soir, après la refonte et avant l'arrivée des quinze TP en construction. Lint sans erreur, types, 445 tests avec couverture (moteur et règles du labo : 100 % des lignes), 25 contrôles de contenu, 62 tests de base, compilation. Depuis l'ajout du guide : lint, types et tests des TP relancés sur les fichiers touchés ; `npm run tout` est à relancer quand les paillasses en construction seront relues.

## Film de présentation

- `scripts/presentation/` : `textes.mts` (ce que dit la voix), `voix.mts` (ElevenLabs, clé lue dans `ELEVENLABS_API_KEY`, jamais écrite), `filmer.mts` (parcours filmé en local avec Playwright, puis montage avec ffmpeg).
- Refaire le film sans refaire la voix : `node scripts/presentation/filmer.mts sorties/presentation sorties/presentation/masterbac-presentation.mp4`, serveur et base locale démarrés. Le dossier `sorties/` n'est pas suivi par git.
- Ajouts du 13 novembre : `@playwright/test` 1.65.0 (prévu pour les parcours), ffmpeg installé sur l'ordinateur par Homebrew.
- Depuis le 14 novembre, le parcours de `filmer.mts` ne correspond plus aux écrans (séance et mode DS guidés, nouveaux textes) : il faut l'adapter avant de retourner le film.

## Reste à faire pour la version locale

1. Évolutions du moteur de `docs/08-moteur.md`, section 6 : retour d'une réussite à 7 jours, niveau 10 validé par test, niveau proposé seulement s'il existe.
2. Parents : invitation, page de suivi, bilan. Accord parental avant 15 ans (aujourd'hui le compte reste limité, sans moyen de le débloquer).
3. Plan de l'année. Vrai ou faux à justifier. (Le DS blanc a son écran depuis le 14 novembre : énoncés seuls, minuteur, puis correction partie par partie.)
4. Compte : trois appareils, e-mail de nouvelle connexion, « mes données » (téléchargement, suppression).
5. Test gratuit : rattacher le résultat au compte, « Envoyer à mes parents », page élite sur le compte.
6. Administration : relecture des brouillons de contenu, invitations à la bêta, recherche des signalements traités.
7. Rappels par e-mail et tâches planifiées (testables dans la boîte locale).
8. Application installable : manifeste, service worker, page hors ligne.
9. Tests : intégration des commandes contre la base locale, parcours Playwright, 28 cas d'abus, matrice des accès depuis le registre. Relectures par `relecteur-securite` et `relecteur-conformite`.
10. Format des sources de quiz, d'indices et de barèmes (décision à écrire), puis préparation du contenu en brouillon.
11. Suites des demandes du 14 novembre : finir et intégrer les paillasses en construction (voir « En cours ») ; écrire de nouvelles questions de quiz, en brouillon, pour avoir plusieurs quiz par chapitre (il y en a 5 à 21 par chapitre, aucune pour la fiche 14) ; d'autres simulations de physique pour le labo (lentille et lunette, poussée d'Archimède, énergie mécanique, particule dans un champ électrique) ; faire entrer le labo, les TP, la mémoire et le calibrage dans le parcours, les progrès, la page des parents et le bilan.
12. Relire dans la langue de la décision 0005 les pages du test de niveau et de l'administration.

## En cours (soir du 14 novembre)

L'application propose six TP : les trois titrages, la synthèse organique (« Un parfum de jasmin »), et les deux TP de circuits (« Un condensateur sans étiquette », « Une jauge de niveau d'eau »). Chacun a son guide, et a été essayé avec et sans guide dans un vrai navigateur.

Douze TP et dix paillasses sont encore en construction, chacun dans ses fichiers. Ils ne sont pas inscrits dans l'application : chaque famille a son banc de chantier (`/app/tp/chantier/<famille>`, en local), qui ne charge que ses fichiers. Chacune reçoit son guide (un fichier `<genre>-guide.ts`, un test où l'élève suit le guide, un essai où un robot suit la main). À relire, essayer dans le navigateur, puis inscrire dans les trois registres :

| Famille | Paillasses | TP |
| --- | --- | --- |
| Chimie des solutions | `solutions`, `spectro` | `dilution`, `etalonnage`, `cinetique` |
| Optique | `optique`, `diffraction` | `focale`, `lunette`, `cheveu`, `young` |
| Ondes et mécanique | `ultrasons`, `doppler`, `pointage` | `ultrasons`, `doppler`, `chute` |
| Thermique, électrochimie, fluides | `archimede`, `calorimetre`, `pile`, `electrolyse` | `archimede`, `calorimetrie`, `pile`, `electrolyse` |

Pour inscrire une famille : ses tests, son lint, son essai guidé en 390 et en 720 de large, son essai sans guide, puis les trois registres, `scripts/essais/tp.mts` sur ses TP, et un commit qui ne prend que ses fichiers.

Signalé par ce chantier, pas encore traité dans le kit :

- `LoupeNiveau` : un chiffre loin du centre est rogné par le bord de la loupe ; il manque une option « surface plate » pour une cuve (les circuits dessinent un ménisque d'un millimètre).
- `Fils` : la croix qui retire un fil passe sous les bornes voisines, et la paillasse ne sait pas quel fil est choisi. Les circuits ont leur propre composant (`circuitFils.tsx`) ; la synthèse et les ultrasons se servent de celui du kit.
- La main du guide couvre parfois ce qui est sous son doigt : chaque paillasse décale ses points.

Incident du 14 novembre au soir : un fichier de règles en cours de réécriture, encore inscrit dans les registres, a cassé toutes les pages de TP pendant un essai de Yane. Depuis, rien d'inachevé n'est inscrit (voir `docs/09-paillasses.md`, section 3).

## Remis à la mise en ligne

Politique de sécurité du contenu avec jeton, vérifications automatiques GitHub, recherche de secrets à chaque commit, tableau ASVS, envoi réel des e-mails, test anti-robot, sonde.

## Dette et écarts connus

- Un composant d'interface peut importer les actions de `lib/serveur/commandes/` : c'est la seule exception à la frontière d'import, écrite dans `eslint.config.mjs`.
- `enregistreTentative` écrit la tentative puis le carnet en deux requêtes, pas dans une transaction. À regrouper dans une fonction de base.
- Les lectures du contenu passent par des fonctions SQL réservées au rôle de service, pour ne pas exposer le schéma `contenu`.
- Le plan d'un DS est gardé en JSON dans la table `ds`, pas dans une table `ds_seances`. Les étapes de lecture cochées y sont aussi (champ `lues`), écrites en lecture puis écriture, sans verrou.
- Le droit « fiches » ouvre les corrigés de toutes les fiches, pas seulement de celles achetées.
- Le score d'un jeu qui tourne dans le navigateur est annoncé par le navigateur (`verifiee` à faux dans `parties`). Il ne sert qu'au record personnel.
- Les nouvelles commandes (calibrage, jeux, défis du labo, mémoire, TP) n'ont pas encore leurs cas dans la matrice des accès, qui reste à écrire (point 9).
- `tp.repondre` lit l'essai, puis l'écrit, sans verrou : deux validations envoyées en même temps pour la même étape pourraient s'écrire l'une sur l'autre. Le navigateur bloque le bouton pendant l'envoi. À regrouper dans une fonction de base.
- Les réglages d'une paillasse de TP (dont la valeur à trouver) sont dans le code envoyé au navigateur, qui dessine la paillasse. Le jugement reste au serveur, qui rejoue les gestes.
- La marque « le guide a servi » est posée par le navigateur dans la liste des gestes : un élève qui lit le code peut l'enlever et garder le niveau A. Il n'y a ni classement ni récompense derrière.
- Les vingt-deux plateaux des jeux de mémoire partent ensemble dans la page d'un jeu. À charger à la demande, comme les paillasses.
- La commande `tp.essayerPaillasse` (banc d'essai) ne répond qu'en local ; elle n'a pas de cas dans la matrice des accès.
- Les règles de calcul du labo sont dans le code envoyé au navigateur, puisqu'il anime la simulation : un élève qui lit ce code peut retrouver une réponse. Il n'y a ni classement ni contenu payant derrière.
- Les essais de `scripts/essais/` (`jeux.mts`, `labo.mts`, `tp.mts`, `titrage.mts`, `sections.mts`, `memoire.mts`) jouent avec des comptes locaux inventés (`theo.essai@exemple.fr`, `nina.essai@exemple.fr`, `lea.*@exemple.fr`). `jeux.mts` et `labo.mts` ont reçu leurs nouvelles adresses mais n'ont pas été relancés depuis. Ce sont des essais à la main, à transformer en parcours Playwright (point 9). Celui du labo veut un compte sans ligne dans la table `defis`.
- Les pages du test d'avant le kit gardent 13 avertissements de lint et des émojis. Elles seront réécrites avec la charte commune.
- `npm audit` : 9 failles modérées, toutes dans les outils de développement. TypeScript reste en 5.8.3.

## En attente de Yane

| Quoi | Pourquoi | Marche à suivre | Pour quand |
| --- | --- | --- | --- |
| Essayer la deuxième version locale | vérifier que ses remarques du 14 novembre sont bien traitées | `docs/recettes/version-locale-2.md` | 16 novembre |
| Confirmer les décisions 0004 à 0007 | séries de jours et de semaines, liste des questions ouverte sur la note visée | lire la partie « À confirmer » de chaque décision | 16 novembre |
| Essayer la troisième version locale | calibrage, parcours, dix jeux, simulation, plan de DS par chapitre | `docs/recettes/version-locale-3.md` | 16 novembre |
| Confirmer les décisions 0008 à 0010 | plan de DS par chapitre, règles du calibrage et du parcours, liste des jeux, place des jeux dans le menu, valeurs de la simulation | lire la partie « à confirmer » de chaque décision | 16 novembre |
| Essayer la quatrième et la cinquième version locale, le labo | calculer, entrer sa valeur, lancer la simulation, en physique puis en chimie | `docs/recettes/version-locale-4.md`, puis `version-locale-5.md` | 16 novembre |
| Essayer la section Mémoire | vingt-deux jeux ; listes et histoires en brouillon | `docs/recettes/version-locale-7.md` | 18 novembre |
| Essayer la huitième version : « S'entraîner », les TP où l'on manipule | ses remarques du 14 novembre au soir ; les situations sont des brouillons | `docs/recettes/version-locale-8.md` | 18 novembre |
| Confirmer les décisions 0012 à 0014 | les choix de détail des TP, de la mémoire et de la nouvelle section ; en particulier : avec le guide, « Réaliser » vaut B au mieux | lire la partie « à confirmer » de chaque décision | 18 novembre |
| Valider ou corriger les quarante-deux énoncés du labo, et confirmer la décision 0011 | ce sont des brouillons : ils ne se montrent qu'en local tant qu'ils ne sont pas validés | la partie « Ce que tu dois me dire » de la recette, puis la partie « à confirmer » de la décision | 18 novembre |
| Valider l'architecture de départ | décision 0001 | lire `docs/02-architecture.md`, section 2, et répondre | 15 novembre |
| Confirmer ou retirer les cinq ajustements, et répondre aux points de la section 7 du cahier des charges | ils fixent le périmètre de la bêta | `docs/01-cahier-des-charges.md`, sections 4 et 7 | 15 novembre |
| Ouvrir Resend et ajouter les enregistrements du domaine d'envoi | les e-mails de connexion en dépendent | section 3.4 | tout de suite |
| Ouvrir le projet Supabase de recette | la base des essais | section 3.3 | 16 novembre |
| Vérifier la liste de protection de ses comptes | première menace pour le projet | section 1 | 16 novembre |
| Choisir les élèves de la bêta, avec la date et les chapitres de leur prochain DS | fixe l'ordre de préparation du contenu | une liste de prénoms et d'adresses gardée hors du dépôt ; ne donner à Claude Code que les chapitres et les dates | 22 novembre |

## Décisions récentes

- 0001, architecture de départ : validée par Yane le 13 novembre, sauf le point 7 (paiement), remplacé par la décision 0002.
- 0002, vente sur Shopify, accès ouverts dans l'administration : pas de Stripe dans l'application.
- 0004, pas de doublon dans la partie « à revoir » de la séance : proposée, à confirmer.
- 0008, plan de DS réparti entre les chapitres : choisie par Claude Code à la demande de Yane, à confirmer.
- 0009, test de calibrage et parcours suivi en continu : demandée par Yane, règles de détail à confirmer.
- 0010, dix jeux, quiz mélangé, simulation du basketteur : demandée par Yane, liste des jeux à confirmer.
- 0011, le labo, calculer d'abord puis lancer la simulation : demandée par Yane le 14 novembre ; énoncés en brouillon, règle des étoiles et tolérances à confirmer. Étendue à toute la chimie le même jour.
- 0012, des TP virtuels pour s'entraîner aux ECE : acceptée par Yane le 14 novembre ; refaite le soir même à sa demande pour que l'élève manipule vraiment ; situations en brouillon, choix de détail à confirmer.
- 0013, la section Mémoire : demandée par Yane ; liste des jeux et règles à confirmer.
- 0014, la section « Jeux » devient « S'entraîner » : demandée par Yane ; nom et découpage à confirmer.
- 0005, textes de l'interface en langue simple, année sur « Tombé au BAC », questions cumulées par note visée : demandée par Yane le 14 novembre.
- 0006, séance du jour guidée, fin de séance fêtée, séries de jours et de semaines : demandée par Yane ; les règles des séries sont à confirmer.
- 0007, mode DS étape par étape : demandée par Yane le 14 novembre.
- 0003, version complète en local d'abord ; la mise en ligne et les comptes distants viennent ensuite. Y figure aussi le besoin de faire vivre le contenu (corriger, ajouter exercices et quiz) plus tard.

## Points de vigilance

- Le dépôt ignorait tout le dossier `.claude/` : l'installation du kit a remplacé cette ligne de `.gitignore` pour que les règles soient partagées et que seuls les réglages personnels restent ignorés.
- La page « élite » est fermée par un code écrit en clair dans le programme envoyé au navigateur. Elle reste ainsi jusqu'au lot 1.7.
- Next.js est en 16.4.5, le minimum corrigé au 13 novembre 2026 ; la dernière version est la 16.4.6.
- La politique de sécurité du contenu avec jeton impose le rendu à la demande de toutes les pages. Choix à confirmer par Yane avant le lot 0.3.
- Les écarts entre le kit et les sources officielles sont dans `docs/audit-de-l-existant.md`, section 7. Les relire avant d'installer un outil.
- L'ordinateur a Docker Desktop, ffmpeg et Node 24 ; il n'a pas `gh`.
- En développement, une commande du serveur modifiée n'est parfois rechargée qu'à la modification suivante : en cas de doute pendant un essai, relancer le serveur.
- Une règle `@container` ne s'applique pas à l'élément qui porte `container-type`, seulement à ce qu'il contient : la grille à deux colonnes se met sur un élément intérieur (`.labo-colonnes`, `.simu-panneau`).
- La demande de code de connexion est limitée à cinq par heure et par adresse, et à dix par heure et par poste : des essais lancés à la suite se font refuser. Les scripts d'essai gardent donc la session du compte d'essai dans un fichier hors du dépôt (`scripts/essais/outils.mts`, variable `ESSAI_SESSION` ; `MEMOIRE_SESSION` pour la mémoire). `scripts/essais/session.mts` prépare une session. On ne vide pas la table des limites pour passer.
- Yane refuse les mises en forme « typiques des IA » : carte arrondie à barre de couleur sur un côté, rangées d'icônes dans des carrés. Les formes de la maison : feuille de sujet (filet gras et filet maigre), sommaire de cahier, affiche de nuit avec un vrai dessin.
- Un élément en `position: fixed` placé sous un parent animé ou transformé ne prend pas tout l'écran : l'établi des paillasses se monte donc tout en haut de la page (`createPortal`).
- Quand plusieurs agents travaillent dans le même dossier, chacun reçoit ses fichiers, sa session d'essai et son banc de chantier. Rien d'inachevé ne s'inscrit dans les registres de l'application : avec Turbopack, un module cassé casse toute page qui l'importe, même par un import à la demande.
- En développement, une page restée ouverte pendant une refonte peut garder d'anciens modules en mémoire (l'ancienne paillasse à cases à cocher, vue par Yane le 14 novembre) : toujours recharger la page avant un essai, et le dire dans la recette.
- Un essai à la souris ne prouve rien pour le doigt. Le 14 novembre, sur toutes les paillasses, un objet glissé au doigt était lâché en route (le navigateur reprenait le geste pour faire défiler) ; seul un essai avec des touchers émulés l'a montré (`scripts/essais/titrage-doigt.mts`). Corrigé dans le kit. Tant que Yane n'a pas essayé sur son téléphone, les gestes au doigt ne sont vérifiés qu'en émulation.
- Le guide des paillasses est en marche à la première visite. Les essais de `scripts/essais/` le coupent d'office (`ouvre()`), sinon leur score serait plafonné ; un essai du guide le demande (`ouvre({ guide: true })`).
- En développement, la pastille de Next.js (un « N » en bas à gauche) recouvre un bouton de la paillasse sur téléphone. Elle n'existe pas en ligne. Pour l'enlever pendant un essai : `devIndicators: false` dans `next.config.ts` (le serveur redémarre).
- Une action qui écrit recharge la page en cours (c'est ainsi que Next.js fonctionne). Un écran qui doit garder un retour à l'écran après l'action (verdict, correction) a donc une adresse qui ne dépend pas de l'avancement, ou un composant qui reste monté.
