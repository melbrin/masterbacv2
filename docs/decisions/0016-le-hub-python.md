# 0016. Le hub Python : écrire et lancer du vrai Python dans l'application

Date : 2026-11-18
État : demandé par Yane le 18 novembre ; la place dans l'application et les règles de détail sont mon choix, à confirmer

## La demande

« Il faut une section Python dédiée dans l'application, avec des exercices et un éditeur Python où les élèves vont pouvoir s'entraîner à écrire du code. Ce sera vraiment une section très importante. Trouve la meilleure manière de la placer dans l'application. C'est ce qu'on va appeler un hub d'entraînement Python. »

Le constat qui va avec : sur les vingt-huit sujets de 2025 et 2026 relus pour la fiche 14, quatorze exercices demandaient de lire, de compléter ou d'expliquer un programme Python. Les fiches entraînent à lire du code sur papier ; rien ne permettait encore d'en écrire et de le lancer.

## Ce qui est fait

### Un vrai Python, sur l'appareil de l'élève

- **Pyodide 314.0.7** (Python 3.14) tourne dans le navigateur, dans un « worker » à part de la page (`public/python/atelier.mjs`). Le serveur ne lance jamais le code d'un élève : rien à isoler, rien à payer, et ça marche même si nos serveurs sont chargés.
- **Servi par l'application**, pas par un site tiers : `scripts/pyodide.mjs` copie Pyodide depuis le paquet npm dans `public/pyodide/<version>/`. `npm run dev`, `npm run build` et `npm run contenu:verifier` le lancent d'abord (npm ignore ici les scripts « pre », à cause de `ignore-scripts` dans `.npmrc`). numpy n'est pas dans le paquet npm : il est téléchargé une fois, à la fabrication, sur le CDN jsDelivr qui publie la distribution de cette version, et gardé seulement si son empreinte SHA-256 est celle du fichier de verrouillage de Pyodide. Une empreinte différente arrête la fabrication ; un téléchargement impossible l'arrête en ligne (Vercel), pas sur l'ordinateur de travail. Le dossier n'est pas dans le dépôt.
- **Le poids** : une douzaine de Mo au premier usage (dont 3 Mo pour numpy, chargé seulement par un programme qui l'importe), puis rien : les fichiers sont rangés par version et gardés un an par le navigateur (`next.config.ts`). La page dit « Python se prépare » pendant le premier chargement.
- **matplotlib** : la vraie bibliothèque pèserait des dizaines de Mo. Le banc (`public/python/banc.mjs`) contient une petite partie de `matplotlib.pyplot`, écrite en Python : `plot`, `scatter`, `quiver`, `arrow`, `hist`, `bar`, les axes, la grille, la légende, `subplots`. Les tracés sont envoyés à la page, qui les dessine dans la charte, à la largeur réelle de l'écran (`components/python/Graphe.tsx`), avec des graduations à la française. Une fonction absente le dit en français, avec la liste de ce qui est disponible.
- **Les erreurs** sont expliquées en français : le type, la ligne (marquée dans l'éditeur), la ligne fautive, puis ce que l'erreur veut dire d'habitude (`NameError`, `IndexError`, `SyntaxError`, `TypeError`...).
- **Une boucle sans fin** est arrêtée au bout de 10 secondes : le worker est remplacé par un neuf, qui recharge Python depuis le cache en deux ou trois secondes. Ce que le programme avait affiché reste à l'écran.
- `input()` ne peut pas attendre une valeur : l'erreur le dit (« donne-la directement dans le programme »).

### La cage

Relecture de sécurité du 18 novembre : avec le module `js` de Pyodide, un programme atteint tout ce que son worker atteint. Sans protection, un programme copié chez un camarade (« voici la solution ») aurait pu, avec la session de celui qui le lance, lire ses pages, appeler les actions de l'application en son nom, et l'envoyer à un autre site ; lancé par l'administrateur, ouvrir des accès. Deux protections, essayées dans le navigateur :

- **Le worker perd le réseau** (`public/python/atelier.mjs`), avant même de charger Python : plus de `XMLHttpRequest`, `WebSocket`, `EventSource`, `WebTransport`, `Worker`, `SharedWorker`, `BroadcastChannel`, `caches`, `indexedDB` ; `fetch` ne lit plus que les fichiers de `/pyodide/<version>/`, en lecture seule et sans cookies.
- **Le fichier du worker a sa propre politique de sécurité du contenu** (`next.config.ts`) : scripts de l'application seulement, pas d'`eval`, aucun autre site, aucun worker. Pyodide et numpy se chargent avec elle.

Essai du 18 novembre : un programme qui cherche ces fonctions n'en trouve aucune, `js.fetch("/app/profil")` n'atteint pas le serveur, `run_js` est refusé, numpy marche.

Ce qui reste possible, et sans conséquence : un programme peut envoyer de faux messages à sa propre page (se déclarer réussi), ou boucler sans fin (il est arrêté).

### Un interrupteur

`HUB_PYTHON=ferme` dans les variables de Vercel, puis un redéploiement : le hub disparaît, pages et actions comprises. Sans la variable, le hub est ouvert.

### L'éditeur

CodeMirror 6 (`components/python/Editeur.tsx`) : numéros de ligne (celui d'une ligne fautive en évidence), couleurs du code dans la charte (clair et sombre), quatre espaces par niveau, décalage automatique après les deux-points, parenthèses qui se ferment seules, retour à la ligne des lignes longues. Au clavier : Tabulation décale la ligne, Échap puis Tabulation sort de l'éditeur, c'est dit aux lecteurs d'écran. Sous l'éditeur, une rangée de touches pour les symboles que le clavier d'un téléphone cache : décaler la ligne, `:`, `( )`, `[ ]`, `=`, `+`, `-`, `*`, `/`, `**`, `<`, `>`, `"`, `,`, `.`, `_`, `#`. Ctrl + Entrée lance le programme. Le programme est gardé sur l'appareil à mesure que l'élève l'écrit, rangé sous son compte : sur un ordinateur partagé, l'élève suivant ne le voit pas, et la déconnexion l'efface. « Recommencer » remet le programme de départ, après confirmation.

### Les exercices

Trois genres, comme au bac : **compléter** un programme (des `...` à remplacer), **écrire** une fonction, **corriger** une erreur d'élève. Chaque exercice a sa fiche, son objectif (10, 14 ou 18), sa durée, son énoncé, son programme de départ, ses vérifications, deux ou trois indices, une solution et ce qu'il faut retenir. Ils sont rangés en sept thèmes : les bases du langage, mécanique, énergie et transferts thermiques, circuit RC, ondes et signaux, chimie, mesures et incertitudes.

- **Vérifier** lance le programme, puis les vérifications de l'exercice dans le même espace de noms. Chaque vérification qui échoue dit ce qui ne va pas, sans donner la réponse.
- **Les indices** s'ouvrent un par un. **La solution** s'ouvre après deux vérifications, ou après la réussite : le serveur le contrôle (action `python.solution`), et elle reste sur le serveur jusque-là.
- **La réussite** s'enregistre (action `python.essai`, table `python`) : le nombre de vérifications lancées, la date de la première réussite, et le programme de cette réussite. Ce programme revient dans l'éditeur quand l'élève rouvre l'exercice sur un appareil qui n'a rien gardé ; il part avec le compte.
- Ce qui part dans la page : l'énoncé, le programme de départ, les vérifications (elles contiennent le calcul attendu) et les indices. C'est accepté tant que le hub est gratuit et sans note ; s'il devient payant, le droit se contrôlera dans la page et dans les deux actions.
- Chaque exercice est rejoué avec le vrai Python par `npm run contenu:verifier` (`tests/contenu/python.test.ts`) : la solution passe toutes les vérifications, le programme de départ n'est pas déjà juste, chaque échec a un message, la rédaction suit les règles. Pour en écrire un : `node --conditions=react-server scripts/python/essai-theme.mts <thème>` et `node --conditions=react-server scripts/python/essai-code.mts <thème> <id> <fichier.py>`.
- **Écrits par des agents, puis relus en adversaire** (18 novembre) : vingt-trois exercices. Pour chacun, le relecteur a essayé d'autres solutions justes et des erreurs d'élève plausibles (385 programmes), puis les vérifications ont été reprises ; je les ai rejouées sur la version finale. Ce qu'une vérification ne peut pas voir : un nombre juste recopié au lieu d'être calculé (« Ec = 104.06 ») passe, comme un nombre de tours de boucle écrit en dur ; et des flèches tracées avec les déplacements plutôt qu'avec les vitesses passent aussi, puisque ce sont les mêmes flèches, à une autre échelle.
- Comme les défis du labo, un exercice écrit par Claude Code est un **brouillon** : il ne se montre qu'en local et à l'administrateur tant que Yane ne l'a pas validé (`etat: "valide"`).

### La place dans l'application

Le hub est l'une des **cinq sous-sections de « S'entraîner »**, la troisième, entre les TP et la mémoire : Labo, TP, Python, Mémoire, Jeux. Pour qu'il compte autant que demandé :

- **sur la page « S'entraîner »**, sa porte prend toute la largeur, au milieu des autres (illustration : un programme et la courbe qu'il trace) ;
- **sur « Aujourd'hui »**, le bloc « S'entraîner » a une entrée Python (exercices réussis) ;
- **dans chaque fiche de cours**, onglet « L'essentiel », une carte « Programme-le en Python » mène aux exercices du chapitre (le sommaire du hub, filtré sur la fiche) ;
- **dans les progrès**, un bloc « En Python », la ligne de chaque chapitre (« Python : 1 réussi sur 2 »), et les chiffres du mois et de la semaine ;
- **le menu** : une entrée « Python » sous « S'entraîner » dans la barre latérale, et dans le sous-menu des cinq pages.

Les pages : `/app/python` (le sommaire, qui se lit comme un programme avec ses numéros de ligne, et le bouton « Commencer » ou « Continuer » vers le premier exercice pas encore réussi), `/app/python/<exercice>`, `/app/python/libre` (l'atelier libre, sans exercice).

## Ce que j'ai écarté

- **Un onglet de plus en bas du téléphone** : la barre n'a que cinq places (décision 0014). Il aurait fallu sortir « DS » ou « Progrès ».
- **Exécuter le code sur le serveur** : il faudrait isoler chaque programme d'élève (un programme peut tout tenter), payer le calcul, et attendre le réseau à chaque essai. Dans le navigateur, enfermé dans la cage, un programme n'atteint ni le réseau ni la session.
- **Python dans une iframe isolée** (origine opaque, sans cookies) : plus solide encore, mais il faut alors servir Pyodide à une autre origine et y recréer un worker. Gardé en réserve si la cage devait céder.
- **Charger Pyodide depuis un site tiers (jsDelivr)** : interdit par nos règles (aucune ressource chargée chez un tiers).
- **La vraie bibliothèque matplotlib** : des dizaines de Mo de plus, des figures en image qui ne suivent ni la charte ni le thème sombre, illisibles sur un téléphone.
- **Juger la réussite sur le serveur** : il faudrait relancer le programme, donc exécuter du code d'élève. Comme pour les jeux de mémoire, c'est le navigateur qui annonce la réussite : elle ne sert qu'au suivi de l'élève, sans note, classement ni récompense ; un élève qui triche ne trompe que lui.

## Mes choix, à confirmer par Yane

- La place : sous « S'entraîner », entre les TP et la mémoire, avec la porte la plus large de la page. Le labo reste en tête.
- Le nom dans le menu : « Python » ; le titre de la page : « Le hub Python ».
- Le hub est ouvert à toutes les offres, comme le reste de « S'entraîner ». Si tu veux en faire un argument de l'offre payante, la règle la plus simple : les exercices d'objectif 10 en gratuit, les autres en payant.
- La solution s'ouvre après deux vérifications.
- Un programme est arrêté au bout de 10 secondes.
- Les exercices ne sont pas encore proposés par le parcours : c'est une suite possible (comme le défi et le TP, décision 0015).

## Ce qui reste

- **Valider les exercices** : ils sont tous en brouillon, donc invisibles pour un élève sur le site en ligne tant que tu ne les as pas relus. La recette 10 dit comment.
- **La politique de sécurité du contenu des pages**, quand elle sera posée (`proxy.ts`, à la mise en ligne), devra écrire `worker-src 'self'`, et ne pas s'appliquer à `/python/*` ni à `/pyodide/*`, qui gardent la leur. À essayer aussi dans Safari sur iPhone.
- **La migration** `20261118120000_hub_python.sql` doit passer sur la base en ligne **avant** le déploiement de ce code : sans la table `python`, les pages « Aujourd'hui », « Progrès », « S'entraîner », le labo et les TP tombent. C'est toi qui la lances (`npx supabase db push --linked`), quand tu le décides.
- **En ligne, tant qu'aucun exercice n'est validé**, le hub n'existe pas pour un élève : ni dans le menu, ni à son adresse, atelier libre compris.
- **La matrice des accès** doit recevoir `python.essai` et `python.solution`, avec les autres commandes récentes.

## Ce que ça change

`public/python/` (banc, worker), `scripts/pyodide.mjs`, `package.json` (pyodide et CodeMirror, versions exactes ; `predev`, `prebuild`, `contenu:verifier`), `.gitignore`, `next.config.ts`, `lib/commun/python/`, `lib/serveur/contenu/python/`, `lib/serveur/python.ts`, `lib/serveur/commandes/python.ts`, `supabase/migrations/20261118120000_hub_python.sql`, `supabase/tests/socle.test.sql`, `components/python/`, `app/(appli)/app/python/`, `app/(appli)/python.css`, `lib/commun/entrainement.ts`, `lib/commun/bilan-entrainement.ts`, `lib/serveur/entrainement.ts`, les pages « S'entraîner », « Aujourd'hui », « Progrès » et fiche, `components/appli/Navigation.tsx`, `components/entrainement/Illustrations.tsx`, `app/(appli)/entrainement.css`, `tests/unitaires/` (python, entrainement, bilan-entrainement), `tests/contenu/python.test.ts`, `scripts/python/`, `scripts/essais/python.mts`.

`app/(appli)/layout.tsx`, `lib/serveur/env.ts` (l'interrupteur), `lib/serveur/supabase/types.ts`, `package-lock.json` (et `style-mod` figé en 4.1.4 : la 4.1.5 a moins d'une semaine), `components/appli/BoutonAction.tsx` et la page du profil (l'effacement à la déconnexion), `eslint.config.mjs`.

Pour revenir en arrière : l'interrupteur coupe tout de suite ; pour retirer le code, annuler les commits du hub. La table peut rester.
