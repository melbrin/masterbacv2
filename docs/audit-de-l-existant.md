# Audit de l'existant

Date : 13 novembre 2026. Lot 0.1.
Périmètre : la branche `main` du dépôt (commit `e117d37`), soit le test de niveau en ligne sur app.masterbac.fr. Environ 3 800 lignes de code et 326 questions.

Ce qui a été vérifié sur la machine, et pas seulement lu :

| Contrôle | Résultat |
| --- | --- |
| `npm ci --ignore-scripts` | passe |
| `npm run build` (Next.js 15.5.12) | passe : 4 pages, toutes statiques |
| `npx tsc --noEmit` | passe, aucune erreur |
| `npm run lint` | ne tourne pas : aucune configuration ESLint dans le dépôt, la commande pose une question et s'arrête |
| `npm audit --omit=dev` | 6 failles : 1 critique (Next.js), 4 élevées, 1 faible |
| Tests | aucun test dans le dépôt |
| Questions | 165 en maths (5 chapitres), 161 en physique-chimie (6 chapitres) : les compteurs annoncés sont exacts |

Ce qui n'a pas été vérifié : le comportement dans un navigateur (aucun parcours lancé), et l'état réel de la production sur Vercel.

## 1. Ce qui existe

| Adresse | Fichier | Rôle |
| --- | --- | --- |
| `/` | `app/page.tsx` | accueil : matière, mode, chapitre, compte à rebours |
| `/quiz` | `app/quiz/page.tsx` | le test : 4 modes, chronomètres, reprise après rechargement, défi par lien |
| `/results` | `app/results/page.tsx` | résultat : note, détail par chapitre, image à partager, lien de défi, lien vers la boutique |
| `/elite` | `app/elite/page.tsx` | quiz « élite » fermé par un code |

Le reste : six composants de question (`components/questions/`), le tirage des questions (`lib/questionSelector.ts`), le calcul de la note (`lib/scoring.ts`), le lien de défi (`lib/challenge.ts`), et deux fichiers de questions (`data/`).

Tout tourne dans le navigateur. Il n'y a ni serveur, ni base, ni compte, ni paiement, ni route `/api`.

## 2. Ce qui marche et qu'on garde

- Le parcours du test, de l'accueil au résultat, et ses quatre adresses.
- Le tirage reproductible des questions par graine (`lib/seededRandom.ts`, `lib/questionSelector.ts`) : code court, pur, facile à tester.
- Le calcul de la note (`lib/scoring.ts`) : pur, facile à tester.
- Les six types de question et leurs composants.
- TypeScript strict, sans `any` ni contournement.
- Les 326 questions, dont les compteurs sont justes.

## 3. Ce qui est fragile

| N° | Constat | Où | Gravité |
| --- | --- | --- | --- |
| F1 | Next.js 15.5.12 : faille critique et plusieurs failles connues (contournement et empoisonnement de cache du proxy, déni de service des composants serveur, injection avec jetons de CSP). L'application actuelle, toute statique, y est peu exposée, mais tout ce qu'on va ajouter l'est | `package-lock.json` | critique avant d'ajouter des comptes |
| F2 | Le code d'accès de la page élite est écrit en clair dans le programme envoyé au navigateur, et accepté aussi dans l'adresse (`?code=`). Les 230 lignes de questions élite et leurs réponses partent dans le navigateur de tout visiteur | `app/elite/page.tsx`, lignes 9, 64 à 296, 835 | élevée : contenu réservé lisible par tous |
| F3 | Toutes les questions du test et leurs bonnes réponses sont embarquées dans les pages. C'est accepté pour le test gratuit, mais ce modèle ne doit pas servir au contenu payant | `data/*.json`, importés par `app/page.tsx`, `quiz`, `results` | à connaître |
| F4 | Le paramètre `mode` de l'adresse n'est pas validé : `/quiz?mode=nimporte` fait planter la page. Même chose pour un lien de défi fabriqué à la main : ses champs (nom, note, mode) sont crus tels quels | `app/quiz/page.tsx`, lignes 35 à 46 ; `lib/challenge.ts` | moyenne |
| F5 | Le lien de défi contient un nom saisi librement, affiché à celui qui ouvre le lien. React l'échappe, donc pas d'injection de code, mais n'importe quel texte peut être montré sous la marque MasterBac | `lib/challenge.ts`, `app/results/page.tsx` | faible, à borner (longueur, caractères) |
| F6 | Polices chargées chez Google à chaque visite : ressource tierce, adresse IP des élèves transmise, incompatible avec la politique de sécurité du contenu visée | `app/layout.tsx`, lignes 35 à 44 | moyenne |
| F7 | Script du thème écrit en ligne dans la page : il devra porter le jeton de la requête | `app/layout.tsx`, ligne 30 | à adapter |
| F8 | Mesure d'audience Vercel sur toutes les pages. À garder sur les pages publiques seulement, et à faire confirmer par le juriste | `app/layout.tsx` | à cadrer |
| F9 | Aucun en-tête de sécurité, aucun `proxy.ts`, `next.config.ts` vide | racine | moyenne |
| F10 | Aucun test, aucun lint, aucune vérification automatique. Le paquet `eslint-config-next` (15.3.4) n'est pas à la version de Next.js | dépôt | élevée pour la suite |
| F11 | Versions flottantes (`^`) pour `next`, `katex`, `@vercel/analytics`. `@types/katex` est rangé dans les dépendances de production | `package.json` | faible |
| F12 | Le compte à rebours vise le 16 juin 2026 : il affiche « J-0 » depuis juin. Titres et image de partage disent « BAC 2026 » | `lib/utils.ts` ligne 8, `app/layout.tsx`, `app/results/page.tsx` ligne 160 | visible par les élèves |
| F13 | Le compte à rebours utilise l'heure de l'appareil et un calcul en millisecondes, pas le jour civil de Paris | `lib/utils.ts` | faible |
| F14 | Textes hors des règles de rédaction : « Découvre », « Découvrir ma note », tirets longs (18 dans 5 fichiers), émojis dans l'interface | `app/page.tsx`, `app/layout.tsx`, `app/elite/page.tsx`, `lib/scoring.ts` | à corriger |
| F15 | Affirmations à faire valider par toi avant de les garder : « 2 000+ élèves ont déjà testé », « Questions issues des vrais sujets BAC », « Conçu par un ingénieur diplômé du top 3 ». Le cahier des charges demande des chiffres honnêtes, et le contenu ne doit pas reproduire de sujet officiel | `app/page.tsx` | à trancher |
| F16 | Adresse de partage fausse dans les métadonnées (`masterbac.com/test`), et liens vers le produit « 2026 » de la boutique, dans le code et dans chaque chapitre des données | `app/layout.tsx`, `app/results/page.tsx`, `data/*.json` | faible |
| F17 | Code mort : `lib/QuizContext.tsx` n'est importé nulle part. `lib/utils.ts` contient `cn`, jamais utilisé | `lib/` | faible |
| F18 | Deux moteurs de quiz séparés : la page élite (946 lignes) redéfinit ses types, son rendu, ses couleurs et son chronomètre au lieu d'utiliser les composants communs. KaTeX n'est utilisé que là | `app/elite/page.tsx` | dette |
| F19 | Pages longues qui mêlent affichage et logique (`results` : 650 lignes, `quiz` : 401), couleurs écrites en dur, thème propre au test, différent de la charte du prototype | `app/` | dette |
| F20 | Le nom du paquet est `masterbac-simulator`, le dépôt s'appelle `app-masterbac` | `package.json` | cosmétique |
| F21 | Accessibilité non contrôlée : boutons sans état annoncé, tailles de texte de 10 et 11 points, animations sans respect de la préférence « moins d'animations » | pages | à mesurer avec axe |

## 4. Ce qui doit changer, et dans quel lot

| Lot | Changement | Constats |
| --- | --- | --- |
| 0.2 | ESLint configuré (frontières d'import, HTML interdit hors du composant de contenu), Vitest, Playwright, recherche de secrets, vérifications automatiques GitHub, versions exactes, nom du paquet | F10, F11, F20 |
| 0.2 | Premiers tests sur ce qui existe : tirage par graine, calcul de la note, lien de défi ; un parcours Playwright du test, qui servira de preuve que « le test marche comme avant » | F10 |
| 0.3 | Montée de Next.js sur la branche 16, `proxy.ts`, en-têtes et politique de sécurité du contenu, polices servies par l'application, jeton sur le script du thème | F1, F6, F7, F9 |
| 0.3 | Compte à rebours sur le 16 juin 2027 en jour de Paris, titres « BAC 2027 », textes conformes, validation du paramètre `mode` et du lien de défi, suppression du code mort | F4, F5, F12, F13, F14, F16, F17 |
| 0.3 | Mesure d'audience limitée aux pages publiques | F8 |
| 1.5 | Charte et thèmes du prototype ; le test adopte la charte commune | F19, F21 |
| 1.7 | La page élite passe sur le compte : plus de code ni de questions réservées dans le navigateur | F2, F18 |
| 2.1 | Les quiz de l'application sont corrigés sur le serveur. Le test gratuit garde ses questions dans le navigateur, par décision | F3 |
| 3.7 | Accueil mis à jour à l'ouverture publique, avec les affirmations validées | F15 |

Rien, dans cet audit, ne demande de repartir de zéro : le test se conserve, et l'application se construit autour.

## 5. Ce qui n'est pas dans le dépôt

Le 13 novembre, le dossier de travail de l'ordinateur (`masterbac-simulator/`) contenait un travail non enregistré daté du 12 juillet 2026 : 12 fichiers modifiés et 47 fichiers nouveaux (comptes, administration, Supabase, Stripe, tableau de bord, Parcoursup, Grand oral). Ce travail n'a jamais été envoyé sur GitHub et n'est pas en ligne.

Il n'a pas été repris : cet audit porte sur `main`, et le dépôt de travail est une copie neuve (`app-masterbac/`). L'ancien dossier est resté intact à côté. Plusieurs de ses fonctions (Parcoursup, Grand oral) sont hors du périmètre fixé par le cahier des charges, section 6. Son code n'a pas été audité.

## 6. L'ordinateur

| Outil | Attendu par le kit | Trouvé | Conséquence |
| --- | --- | --- | --- |
| Node.js | 22 | 24.21.0 | à trancher : fixer la version du projet (question posée à Yane) |
| Git | présent | présent | |
| Docker Desktop | nécessaire | absent | bloque la base locale : lot 0.4, tests de base et d'intégration |
| GitHub CLI (`gh`) | utile | absent | les demandes de fusion se créent depuis le site de GitHub, ou après installation |
| Python 3 | 3 avec `lxml` et `Pillow` | 3.9.6 | suffit pour lire ; l'export des fiches n'est pas à relancer maintenant |
| pandoc | 3.1 ou plus | absent | seulement pour refaire l'export après une correction de fiche |

## 7. Écarts entre le kit et les sources officielles

Vérifié le 13 novembre 2026 sur le registre npm et la documentation officielle de chaque outil. Le kit est juste dans l'ensemble. Voici ce qui est dépassé ou à préciser.

| N° | Sujet | Ce que dit le kit | Ce qui est vrai aujourd'hui | Conséquence |
| --- | --- | --- | --- | --- |
| E1 | Seuil de sécurité de Next.js | au moins 15.5.24 ou 16.3.3 | quatre séries de correctifs ont suivi (22 septembre, 30 septembre, 14 octobre, 3 novembre). Le minimum est 15.5.29 ou 16.4.5. La dernière version est bien la 16.4.6 | le lot 0.3 vise la 16.4.6 ; `docs/02-architecture.md` et `docs/SUIVI.md` sont à corriger |
| E2 | Politique de sécurité du contenu avec jeton | à poser dans `proxy.ts` | elle impose le rendu à la demande de toutes les pages : plus de page statique ni de cache. Les 4 pages du test sont statiques aujourd'hui | choix à faire au lot 0.3 (question posée à Yane) |
| E3 | `proxy.ts` | remplace `middleware.ts` | exact, et il ne tourne que sous Node.js. Il n'est jamais exécuté avant la version 16 | ne créer `proxy.ts` qu'après la montée de version |
| E4 | Node.js | version 22 | Node 26 est la version stable de longue durée depuis le 28 octobre 2026. Node 24 est maintenu jusqu'en avril 2028, Node 22 jusqu'en avril 2027. L'ordinateur a Node 24 | fixer une version (question posée à Yane) |
| E5 | Versions majeures des outils | non citées | TypeScript 7, ESLint 10, Vitest 5, Zod 4, Stryker 10, Stripe 23 (interface `2026-10-28.endive`), Supabase CLI 3 | lire la documentation de chaque version avant de l'installer ; ne rien écrire de mémoire |
| E6 | Supabase CLI | `supabase test db` | toujours valable ; les options `--linked`, `--db-url` et `--local` sont dépréciées en version 3, remplacées par `--remote` | les règles de `.claude/settings.json` qui citent `--linked` sont à compléter |
| E7 | Clés Supabase | nouvelles clés, anciennes à désactiver | exact. Les anciennes clés seront dépréciées « avant fin 2026 », sans date précise | n'utiliser que les nouvelles clés dès la création des projets |
| E8 | `getClaims()` | vérifie le jeton sur le serveur | exact, mais la vérification n'est locale que si le projet signe ses jetons avec une clé asymétrique. Sinon c'est un appel réseau à chaque requête | réglage à ajouter à la marche à suivre Supabase (section 3.3 de `docs/06`) |
| E9 | E-mails de connexion | limites « relevées à la valeur indiquée » | sans Resend : 2 e-mails par heure, vers les membres de l'équipe seulement. Avec Resend : 30 par heure par défaut. La durée du code est d'une heure par défaut, à régler à 10 minutes | valeurs à régler à la main dans chaque projet |
| E10 | Vercel, offre gratuite | interdite aux projets commerciaux | exact. De plus, une tâche planifiée ne tourne qu'une fois par jour sur l'offre gratuite. Les tâches planifiées migrent vers un nouveau produit, « Schedules » | les rappels toutes les heures demandent l'offre Pro, prévue avant le 4 décembre ; relire la documentation au lot 2.4 |
| E11 | Resend, offre gratuite | 100 e-mails par jour | exact, mais chaque destinataire compte, et les e-mails reçus aussi | marge plus faible que prévu un soir de DS |
| E12 | Claude Code | plugin `security-guidance` activé dans les réglages | exact, mais il doit aussi être installé sur l'ordinateur, et il conseille sans bloquer. La forme `Bash(npm run distant:*)` marche encore ; la forme documentée est `Bash(npm run distant *)` | une commande à lancer par Yane ; réglages à moderniser avec son accord |
| E13 | `docs/SUIVI.md` | `main` a un seul commit | `main` en a 9 | corrigé |

Tout le reste a été confirmé : `next/font` sert les polices depuis l'application, les 11 événements Stripe existent, la vérification de signature se fait sur `await request.text()`, les clés restreintes existent, la région `cdg1` est Paris, l'ASVS 5.0.0 est la version courante et ses 17 chapitres portent les intitulés attendus, les emplacements des agents, règles et compétences de Claude Code sont les bons.

À noter : des pages de documentation de Supabase et de Vercel contiennent un texte adressé aux agents d'IA, qui leur demande d'envoyer un rapport. Il n'a pas été suivi.
