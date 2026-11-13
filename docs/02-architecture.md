# Architecture : comment l'application est construite

Ce document fixe la structure d'ensemble du projet : les choix, ce qu'ils apportent et ce qu'ils coûtent, l'organisation du dépôt, le chemin d'une requête, le modèle de données, les environnements. Il vaut pour toutes les phases. Un écart se décide avec Yane et s'écrit dans `docs/decisions/`.

## 1. Vue d'ensemble

```
Navigateur (téléphone d'abord, installable)
   |  pages et formulaires, jamais d'accès direct à la base
   v
Application Next.js sur Vercel, région Paris
   |- pages et composants serveur ........ lisent par lib/serveur/requetes
   |- actions serveur .................... écrivent par lib/serveur/commandes
   |- routes /api ........................ Stripe, tâches planifiées, figures, santé
   |- lib/moteur ......................... règles du coach, pures
   v
Supabase, région Paris
   |- Auth ............ code par e-mail, sessions
   |- Postgres ........ comptes, travail de l'élève, droits, contenu, journal
   |- Storage ......... figures et copies, compartiments privés

Stripe ........ page de paiement hébergée, puis messages signés vers /api/stripe/webhook
Resend ........ e-mails de l'application et, par SMTP, codes de connexion
Vercel Cron ... rappels, bilans, rapprochement des paiements, purges

contenu/sources (fiche.md) -> export Python -> contenu/export (JSON, figures) -> import -> Postgres et Storage
```

## 2. Les choix, ce qu'ils apportent, ce qu'ils coûtent

### 2.1 Un seul dépôt, un seul déploiement

| | |
| --- | --- |
| Retenu | Le code, le schéma de la base, les sources des fiches, le prototype et la documentation vivent dans `app-masterbac`. Une seule application Next.js, découpée en modules |
| Pour | une seule chose à comprendre, à tester et à déployer ; une correction de fiche et le code qui l'affiche se relisent ensemble ; les sessions de Claude Code ont tout sous la main |
| Contre | tout le contenu payant est dans le dépôt : quiconque y a accès le lit. Le dépôt reste privé et n'a qu'un propriétaire |
| Écarté | un dépôt à part pour le contenu (deux dépôts à synchroniser) ; plusieurs services (rien ne le justifie à cette taille) |
| À revoir si | une autre personne doit travailler sur le code sans voir le contenu : on sort alors `contenu/` dans un dépôt à part |

Le contenu n'est jamais déployé avec l'application : `contenu/`, `reference/` et `docs/` sont exclus du déploiement (`.vercelignore`), aucun fichier de code ne les importe (règle de lint), et rien de payant ne va dans `public/`.

### 2.2 Next.js, dernière version corrigée de la branche 16, sur Vercel

| | |
| --- | --- |
| Retenu | On garde Next.js, React, Tailwind et KaTeX, déjà en place, et on passe de la version 15 à la dernière version corrigée de la branche 16. Fonctions serveur dans la région de Paris (`cdg1`), à côté de la base |
| Pour | le test actuel continue de tourner ; composants et actions serveur gardent les données sur le serveur ; une prévisualisation par branche pour les essais de Yane |
| Contre | une montée de version à faire tout de suite ; le fichier `middleware.ts` devient `proxy.ts` |
| Pourquoi maintenant | Next.js a publié plusieurs séries de correctifs de sécurité en 2026. Celle du 25 août corrige deux failles critiques et demande au moins la version 15.5.24 ou 16.3.3 ; d'autres portaient sur le contournement du proxy. Le fichier de verrouillage du dépôt fixe la version 15.5.12, antérieure à ces correctifs. Au 13 novembre 2026, la dernière version publiée est la 16.4.6. La montée se fait en phase 0, sur 3 800 lignes, avant d'ajouter des comptes |
| Règle | avant la montée, tu lis les avis de sécurité de Next.js et tu vérifies la version courante (`npm view next version`). Ensuite, une mise à jour de sécurité de Next.js se traite dans la semaine |

Le proxy ne sert qu'à poser les en-têtes de sécurité et à rediriger par confort. Il n'est jamais la seule barrière : chaque page, chaque action et chaque route vérifie elle-même la session et le droit.

### 2.3 Tout passe par le serveur ; la base ne fait confiance qu'au serveur

| | |
| --- | --- |
| Retenu | Le navigateur ne parle jamais à Supabase. Il ne reçoit ni clé ni jeton utilisable ailleurs. Les lectures et les écritures passent par le serveur Next.js |
| Pour | le contenu payant et les bonnes réponses des quiz ne quittent le serveur qu'après contrôle ; une seule porte à surveiller, à limiter en débit et à tester |
| Contre | pas de temps réel côté navigateur, et un aller-retour serveur pour chaque action. Aucun besoin actuel ne demande le temps réel |
| Écarté | l'accès direct du navigateur à la base avec des règles d'accès : un élève qui a payé pourrait télécharger tout le contenu en une requête, et les réponses des quiz seraient lisibles |

Deux barrières se superposent :

1. **Le code.** Chaque point d'entrée déclare qui peut l'appeler (section 5).
2. **La base.** Les règles d'accès par ligne (RLS) sont actives sur toutes les tables, sans exception.

Et deux clients de base, pas un de plus :

| Client | Clé | Sert à | Garantie |
| --- | --- | --- | --- |
| `clientUtilisateur()` | clé publiable et session de la personne | toutes les lectures de données personnelles | les règles d'accès s'appliquent : une requête mal filtrée ne renvoie que les lignes de la personne |
| `clientAdmin()` | clé secrète | le contenu, les écritures validées, les webhooks, les tâches planifiées, l'administration | contourne les règles d'accès : n'est importable que depuis quelques dossiers de `lib/serveur/` (règle de lint), et chaque usage passe par une commande déclarée et testée |

Les rôles `anon` et `authenticated` de la base n'ont aucun droit d'écriture, sur aucune table. Les écritures passent par des commandes serveur parce que le serveur calcule ce qu'il écrit : la correction d'un quiz, le plan d'un DS, un droit acheté. Laisser l'élève écrire directement permettrait de falsifier ses résultats ou ses droits.

### 2.4 Comptes : Supabase Auth, un code par e-mail

| | |
| --- | --- |
| Retenu | Adresse e-mail et code à six chiffres, valable 10 minutes. Pas de mot de passe, pas de lien cliquable, pas de connexion par un tiers |
| Pour | rien à retenir ni à voler ; le code se tape dans l'application installée, là où un lien ouvrirait le navigateur ; les analyseurs de messagerie ne consomment pas un code comme ils consomment un lien |
| Contre | un e-mail à chaque nouvel appareil ; la délivrabilité des e-mails devient critique : domaine d'envoi authentifié, suivi des échecs |
| Détails | cookies de session `HttpOnly`, `Secure`, `SameSite=Lax` ; jeton vérifié sur le serveur à chaque requête (`getClaims()`) ; renouvellement avec détection de réutilisation ; trois appareils actifs ; rôle administrateur dans les métadonnées non modifiables du compte, avec double authentification |

### 2.5 Le contenu en base, importé depuis l'export des fiches

| | |
| --- | --- |
| Retenu | `fiche.md` reste la source. L'export produit des fichiers JSON et des figures. Un import vérifié les charge dans Postgres (schéma `contenu`) et dans un compartiment privé |
| Pour | une correction faite une fois arrive partout ; le contenu est servi morceau par morceau, après contrôle du droit ; les formules sont rendues à l'import, pas dans le navigateur |
| Contre | une étape d'import à lancer après chaque correction ; elle est rejouable sans risque et se vérifie |
| Écarté | des fichiers JSON embarqués dans l'application (tout le contenu partirait dans le navigateur) ; un outil d'édition en ligne (deux sources à tenir) |

Le détail est dans `docs/07-contenu.md`.

### 2.6 Le moteur : un module pur, sur le serveur

Voir `docs/08-moteur.md`. Pur pour être testé à fond, sur le serveur pour que ses décisions ne soient pas falsifiables.

### 2.7 Paiement : page hébergée par Stripe, droits ouverts par message signé

| | |
| --- | --- |
| Retenu | Stripe Checkout pour payer, le portail client de Stripe pour la carte et les factures, une table `droits` alimentée uniquement par les messages signés de Stripe |
| Pour | aucune donnée de carte ne passe par nos serveurs ; le retour du navigateur n'ouvre rien, donc ne se falsifie pas ; abonnement, échec de paiement et remboursement sont gérés par Stripe |
| Contre | l'accès s'ouvre quelques secondes après le paiement, le temps que le message arrive : l'écran de retour attend et le dit |
| Détails | signature vérifiée sur le corps brut ; chaque message traité une seule fois ; montant et tarif comparés à ce que le serveur avait préparé ; rapprochement quotidien avec Stripe pour rattraper un message perdu |

### 2.8 Pas de service en plus tant qu'il n'est pas nécessaire

| Besoin | Retenu | Écarté pour l'instant |
| --- | --- | --- |
| Limitation de débit | une table et une fonction dans Postgres | un service de cache externe : un compte et un sous-traitant de plus |
| Tâches planifiées | Vercel Cron, routes protégées par un secret, tâches rejouables | un ordonnanceur externe |
| File d'attente (correction sur photo) | une table d'états dans Postgres, traitée par une tâche planifiée | un service de files |
| Suivi des erreurs | journaux structurés, table d'incidents, e-mail d'alerte à Yane | un service de suivi d'erreurs : à réévaluer après l'ouverture |
| Mesure d'usage | une table d'événements maison, sans donnée personnelle superflue | des outils de suivi tiers dans l'espace connecté |
| Interrupteurs de fonctions | une table `drapeaux`, modifiable depuis l'administration | un service dédié |

Chaque service en plus est un compte à sécuriser, un contrat de sous-traitance pour des données de mineurs et une panne possible.

### 2.9 Application installable, sobre

Un manifeste et un service worker écrit à la main, sans bibliothèque. Il met en cache la coquille et les fichiers statiques, affiche une page hors ligne, et ne met jamais en cache une page connectée, une réponse d'action, un corrigé ou une figure payante. Les notifications sur le téléphone attendront.

## 3. L'organisation du dépôt

```
app/
  (public)/            accueil, test de niveau (pages actuelles conservées), page parents de présentation, offres, textes légaux
  (compte)/            connexion, création de compte, accord parental
  (app)/               aujourdhui, seance, cours, fiche, quiz, ds, carnet, progres, plan, profil, parents, paiement
  (admin)/admin/       administration
  api/                 stripe/webhook, cron/<tache>, figures, sante
components/            composants d'interface, sans accès aux données
lib/
  moteur/              règles du coach (pur)
  commun/              types, schémas de validation, dates de Paris, formatage (pur, utilisable partout)
  serveur/             session, acces, requetes/, commandes/, contenu/, paiement/, emails/, taches/, admin/, supabase/
proxy.ts               en-têtes de sécurité, redirections de confort
supabase/
  migrations/          schéma, règles d'accès, fonctions
  tests/               tests pgTAP des règles d'accès
  graines/             données d'essai inventées
  config.toml          configuration locale, reflet des réglages distants
scripts/               contenu (vérifier, importer), environnement, sonde, import des clients actuels
tests/                 integration/, e2e/, securite/
contenu/
  sources/             fiches (fiche.md, figures, outils Python) : la source de vérité
  export/              data/*.json et figs/ produits par l'export
  pdf/                 PDF des fiches, hors dépôt
reference/             prototype figé, captures, cas de référence du moteur
docs/                  ce dossier
.claude/               règles, agents et compétence pour Claude Code
.github/workflows/     vérifications automatiques
```

Les adresses du test actuel (`/`, `/quiz`, `/results`, `/elite`) ne changent pas.

### Qui peut importer quoi

| Dossier | Peut importer | Ne peut pas importer |
| --- | --- | --- |
| `components/` et tout fichier `"use client"` | `lib/commun/` | `lib/serveur/`, `lib/moteur/` |
| `lib/moteur/` | `lib/commun/` | tout le reste, et aucune bibliothèque d'accès réseau ou base |
| `lib/commun/` | rien du projet | tout le reste |
| `lib/serveur/` | `lib/moteur/`, `lib/commun/` | `components/` |
| `app/` | tout, à travers `lib/serveur/requetes` et les actions | `lib/serveur/supabase/` directement |
| tout le code | | `contenu/`, `reference/`, `docs/` |

Ces règles sont vérifiées par le lint, et tout fichier de `lib/serveur/` commence par `import "server-only"`. Une violation fait échouer `npm run verif`.

## 4. Le chemin d'une requête

**Ouvrir un corrigé.** L'élève touche « Voir le corrigé ». L'action serveur vérifie l'origine de la requête, la session, la forme des données, la limite de débit ; elle calcule le droit (offre active, question 1, exercice du jour, plan de la préparation offerte) ; si le droit existe, elle lit le corrigé avec le client administrateur, journalise l'ouverture et renvoie le HTML déjà nettoyé et rendu. Sinon elle renvoie « réservé » et rien d'autre. Le corrigé n'est jamais dans la page avant ce moment, même pour un élève qui a payé.

**Répondre à un quiz.** Au démarrage, le serveur crée une session de quiz : questions tirées par le moteur, ordre des réponses mélangé, heure de début. Le navigateur reçoit les énoncés et les choix, sans la clé. À chaque réponse, le serveur corrige, enregistre la tentative, met à jour le carnet et renvoie le verdict, la bonne réponse et l'explication. Pour un test de passage, le serveur refuse une réponse arrivée après la fin du temps.

**Acheter.** Le serveur détermine l'élève bénéficiaire (la session, ou le lien d'achat reçu par le parent), choisit le tarif, enregistre l'achat en attente avec la renonciation au délai de rétractation, crée la page de paiement et y redirige. Le message signé de Stripe marque l'achat payé et ouvre le droit dans la même transaction. L'écran de retour interroge le serveur jusqu'à voir le droit.

**Afficher la page parents.** Le serveur vérifie le lien entre le parent et l'élève, calcule le bilan avec le client administrateur, l'enregistre dans `bilans`, puis le lit avec le client du parent. Le parent n'a accès qu'à ce bilan, jamais aux tentatives.

## 5. Les points d'entrée du serveur

Tout point d'entrée se déclare par une fabrique, qui rend le contrôle d'accès impossible à oublier :

| Fabrique | Pour | Ce qu'elle impose |
| --- | --- | --- |
| `action({ nom, acces, entree, limite, executer })` | les actions serveur appelées par l'interface | origine de la requête, session, rôle, validation de l'entrée par un schéma, limite de débit, journal, erreurs sans détail technique |
| `route({ nom, acces, ... })` | les routes `/api` | la même chose, avec des accès particuliers : `stripe` (signature), `cron` (secret), `session` (figures, export des données) |
| `requete(...)` | les lectures appelées par les pages | la session, vérifiée dans la fonction elle-même, jamais dans une mise en page |

Valeurs de `acces` : `public`, `compte`, `eleve`, `parent`, `admin`, `stripe`, `cron`. Un droit particulier (corrigé, préparation de DS) se vérifie dans `executer` par une fonction de `lib/serveur/acces.ts`, qui est le seul endroit où les droits se calculent.

Un registre liste tous les points d'entrée déclarés. Les tests de sécurité le parcourent : un point d'entrée sans test d'accès fait échouer la suite. Un fichier `"use server"` qui exporte autre chose qu'une `action(...)` fait échouer le lint.

## 6. Le modèle de données

Identifiants en `uuid` pour tout ce qui appartient à une personne ; clés stables et lisibles pour le contenu. Dates en `timestamptz` (UTC) ; les jours civils (`date`) sont ceux de Paris. Chaque table porte ses contraintes : valeurs permises, longueurs, bornes. La base refuse une donnée invalide même si le code se trompe.

### Comptes

| Table | Contenu | Lecture par la personne |
| --- | --- | --- |
| `profils` | rôle, prénom, classe, spécialités, note visée, plus ou moins de 15 ans, état du compte, préférences, préparations de DS offertes restantes | la sienne |
| `liens_parent` | élève, parent, adresse invitée, état, empreinte du jeton d'invitation, expiration | l'élève et le parent concernés |
| `accords_parentaux` | élève, date, version du texte, preuve | aucune |
| `sessions_actives` | compte, session, empreinte de l'appareil, dernière activité | les siennes |
| `invitations_beta` | adresse invitée, date d'envoi, date d'utilisation | aucune |

### Contenu (schéma `contenu`, inaccessible aux rôles du navigateur)

| Table | Contenu |
| --- | --- |
| `versions` | chaque import : empreinte, date, auteur |
| `fiches`, `themes` | les 14 fiches, leurs thèmes, L'essentiel, les pièges, Ce qui est tombé |
| `items` | questions de cours et exercices : clé, ordre, niveau, type, points, durée, énoncé et corrigé (source et rendu), archive |
| `etapes` | les questions d'un exercice, avec leur corrigé et leurs points de barème, ligne « Rédaction » comprise |
| `indices` | deux ou trois indices par item, avec leur état |
| `notions`, `notions_fiche`, `items_notions` | la liste commune des notions du programme, celles de chaque fiche, leurs liens aux items |
| `quiz` | questions de quiz : énoncé et choix d'un côté, clé de correction de l'autre, explication, niveau, notion, état |
| `figures` | chaque figure, son emplacement de stockage, les items et la partie (énoncé ou corrigé) où elle sert |
| `validations` | qui a validé quoi : type et identifiant de l'objet, empreinte du texte validé, date, décision |
| `sujets`, `sujets_exercices` | sujets du bac et bacs blancs (phase 5) |

Un élément dont l'état est « brouillon » n'est jamais servi à un élève. Une validation porte sur l'empreinte d'un texte : si le texte change, il redevient brouillon.

### Travail de l'élève

| Table | Contenu | Lecture par l'élève |
| --- | --- | --- |
| `tentatives` | clé de l'item, résultat, score, date, contexte, détail (étapes du barème, réponse au quiz), version du contenu. On ajoute, on ne modifie ni ne supprime | les siennes |
| `carnet` | item, échéance, étape, nature (erreur ou confirmation), date d'entrée | le sien |
| `vu_en_classe`, `passages` | chapitres cochés, tests de passage réussis | les siens |
| `ds`, `ds_seances` | devoir (date, durée, chapitres, note visée, format, note, moyenne de classe, offert ou non), séances et tâches du plan | les siens |
| `seances_du_jour` | une ligne par élève et par jour : à revoir, exercice, étape, raison, faite | les siennes |
| `quiz_sessions` | questions tirées, ordre des choix, début, limite de temps, résultat | les siennes, sans la clé |
| `tests_niveau` | résultat du test gratuit, rattaché au compte après coup | les siens |
| `signalements` | référence, message, état, réponse | les siens |
| `bilans` | le bilan hebdomadaire calculé pour le parent | l'élève et ses parents liés |
| `copies` | copies photographiées ou déposées, état, retour (phase 5) | les siennes |

### Vente

| Table | Contenu | Lecture |
| --- | --- | --- |
| `paiements` | bénéficiaire, offre, montant, état, identifiants Stripe, renonciation (date, version du texte) | le bénéficiaire et le payeur |
| `abonnements` | identifiant Stripe, état, fin de période, résiliation demandée | le bénéficiaire |
| `droits` | compte, type, début, fin, origine (Stripe, import, bêta, administration), référence, retrait | le sien |
| `clients_actuels` | empreinte de l'adresse e-mail, produits achetés, date d'import, compte qui l'a réclamé | aucune |
| `stripe_evenements` | identifiant du message, type, dates de réception et de traitement | aucune |
| `retractations` | achat, date, accusé de réception, traitement | le demandeur |
| `stages`, `inscriptions_stage` | les stages en direct et leurs inscrits | les siennes |

Les adresses des clients actuels ne sont pas gardées en clair : seule une empreinte calculée avec un secret du serveur permet de reconnaître une adresse à la connexion.

### Système

| Table | Contenu |
| --- | --- |
| `limites` | compteurs de limitation de débit, avec une fonction atomique |
| `journal_audit` | qui a fait quoi : actions de l'administration, ouverture et retrait de droits, connexions refusées. On ajoute seulement |
| `taches_journal` | chaque exécution d'une tâche planifiée, une seule par tâche et par période |
| `emails_envoyes`, `desinscriptions` | e-mails envoyés (clé d'unicité par envoi), adresses qui ne veulent plus recevoir |
| `evenements` | mesure d'usage maison |
| `drapeaux` | interrupteurs de fonctions |
| `incidents` | erreurs graves à traiter |

## 7. Les environnements

| Environnement | Application | Base | Paiement | E-mails | Données |
| --- | --- | --- | --- | --- | --- |
| Local | `npm run dev` | Supabase local (Docker) | Stripe en mode test | boîte de réception locale | inventées |
| Vérifications automatiques | compilée dans GitHub Actions | Supabase local | messages signés de test | boîte locale | inventées |
| Recette | prévisualisations Vercel, protégées par connexion | projet Supabase de recette | Stripe en mode test | Resend, vers des adresses de test | inventées |
| Production | app.masterbac.fr | projet Supabase de production, Paris | Stripe réel | Resend | réelles |

Règles :

- Aucune donnée réelle ne quitte la production. La recette et le local n'utilisent que des données inventées.
- Une prévisualisation ne se branche jamais sur la base de production.
- Les tests n'ont besoin d'aucun secret réel.
- Les variables d'environnement sont lues à un seul endroit (`lib/serveur/env.ts`), validées au démarrage. Une variable manquante arrête le démarrage avec son nom, jamais sa valeur. La liste est dans `env.exemple` et `docs/06-comptes-et-secrets.md`.
- Aucune variable sensible ne porte le préfixe `NEXT_PUBLIC_`. Les clés Supabase ne sont pas exposées au navigateur, puisqu'il ne parle pas à Supabase.

### Mettre en production

1. Une migration de base est toujours compatible avec la version du code déjà en ligne : on ajoute d'abord, on retire dans une version suivante.
2. Avant de fusionner une branche qui contient une migration, Yane lance l'action GitHub « Migrer la production », qui applique les migrations en attente.
3. La fusion dans `main` déclenche le déploiement par Vercel.
4. La sonde (`npm run sonde`) contrôle la production après chaque déploiement.

Pas de mise en production le soir, ni la veille d'un DS annoncé par un élève de la bêta. Pendant le gel du 19 décembre au 4 janvier, seules les corrections passent.

## 8. Les tâches planifiées

| Tâche | Rythme | Rôle |
| --- | --- | --- |
| Rappels de séance | toutes les heures | envoyer le rappel des séances de plan de DS dues, à l'heure de Paris choisie |
| Rappel de note | chaque jour | demander la note des DS de la veille |
| Bilan des parents | le dimanche | calculer et envoyer les bilans (après automatisation) |
| Rapprochement Stripe | chaque jour | comparer paiements et abonnements avec Stripe, réparer, alerter |
| Fin des droits | chaque jour | fermer les droits arrivés à terme (bêta, abonnement non renouvelé) |
| Purges | chaque jour | compteurs périmés, invitations expirées, copies au-delà de leur durée de conservation, comptes à supprimer |
| Lien du direct | la veille d'un stage | envoyer le lien aux inscrits |

Chaque route de tâche vérifie le secret transmis par Vercel, s'exécute au plus une fois par période et peut être relancée sans effet double.

## 9. Les conventions de code

- **Langue.** Les mots du métier s'écrivent en français, sans accent dans le code : `fiche`, `seance`, `carnet`, `tentative`, `droit`, `corrige`, `bareme`. Commentaires, messages de validation, documentation et messages de commit en français. Les noms imposés par les outils restent tels quels (`page.tsx`, `route.ts`).
- **TypeScript strict.** Pas de `any`, pas d'assertion de type pour faire taire une erreur. Les types de la base sont générés depuis le schéma.
- **Validation.** Toute donnée qui entre (formulaire, paramètre d'adresse, message Stripe après vérification de signature, fichier importé, variable d'environnement) passe par un schéma.
- **Erreurs.** Une commande renvoie un résultat typé : réussite, ou échec avec un code. L'interface affiche un message en français et un numéro de suivi. Aucun message technique, aucune requête, aucune trace ne sort du serveur.
- **Journaux.** Structurés, sans adresse e-mail, sans code, sans jeton, sans contenu de formulaire. Une personne y figure par son identifiant interne.
- **HTML.** Un seul composant affiche du HTML de contenu, déjà nettoyé à l'import. `dangerouslySetInnerHTML` est interdit partout ailleurs (règle de lint).
- **Dépendances.** On n'en ajoute une que si elle évite un vrai travail. Version exacte, fichier de verrouillage commité, justification dans la demande de fusion.
- **Commits.** Petits, en français, préfixés (`feat:`, `fix:`, `test:`, `docs:`, `chore:`). Une branche par lot, une demande de fusion par lot.

## 10. Tenir un soir de DS

- Budgets : page utile en moins de 2,5 secondes sur un téléphone moyen en 4G ; aucune action à plus d'une seconde côté serveur en usage normal.
- Le contenu est mis en cache sur le serveur par version d'import, après le contrôle du droit. Une réponse personnalisée n'est jamais mise en cache partagé.
- Index sur toutes les colonnes de filtre des tables de travail (`user_id`, dates, clés). Les listes sont paginées.
- Polices, KaTeX et icônes servis par l'application : aucune ressource externe.
- Sauvegarde quotidienne de la base (offre Pro). Une restauration est essayée une fois sur la recette avant l'ouverture, et sa marche à suivre écrite dans `docs/exploitation.md`.
- Une page de maintenance prête, activable par un interrupteur, qui laisse le test gratuit en ligne.
- Une route `/api/sante` qui dit si l'application, la base et le contenu répondent, sans rien révéler d'autre.
