# Fiches MasterBac : source et fabrication

Ce dossier contient tout ce qu'il faut pour refaire les fiches. Les fichiers Word et PDF ne se modifient jamais à la main : on corrige la source, puis on relance la fabrication. Tout ce qui est livré aux élèves sort de là.

## Ce que contient le dossier

| Élément | Rôle |
|---|---|
| `PROMPT_DE_GESTION.md` | Le texte à coller dans une nouvelle conversation avec Claude, avec cette archive, pour corriger une fiche ou en produire une nouvelle. Il porte aussi l'état de chaque fiche. |
| `reglages.json` | Les informations communes à toutes les fiches : site, compte, édition, sessions du BAC couvertes, date de mise à jour. |
| `commun/ouverture.md` | La couverture, les mentions légales, l'avant-propos et le sommaire, identiques pour toutes les fiches. |
| `fiches/<fiche>/fiche.md` | Le texte d'une fiche : énoncés, corrigés, tableaux. Ses figures sont dans `fiches/<fiche>/figs/`. |
| `REPRISE_EDITION_2024.md` | Où trouver chaque thème dans les PDF de l'édition 2024, comment l'extraire, table de correspondance des numéros et corrections faites. |
| `outils/` | La chaîne de fabrication et les contrôles, plus les outils d'appoint décrits plus bas. |
| `sorties/` | Les fichiers produits. Ce dossier est créé à la fabrication et ne se range pas dans le dépôt. |

## Fabriquer une fiche

```
outils/fabrique.sh pc-04-fluides
```

La commande dépose dans `sorties/pc-04-fluides/` :

- la fiche complète, en Word et en PDF ;
- le cahier d'énoncés à imprimer, en Word et en PDF.

Elle se termine par des contrôles automatiques : validité du fichier Word, exactitude de chaque renvoi entre un énoncé et son corrigé, absence de reste de fabrication, typographie. Si un contrôle échoue, la commande l'indique et s'arrête en erreur.

## Où modifier quoi

| Je veux changer | Fichier à modifier |
|---|---|
| Le site, le compte, l'édition, les sessions couvertes | `reglages.json` |
| Les mentions légales, l'avant-propos, la couverture | `commun/ouverture.md` |
| Un énoncé, un corrigé, une valeur, un tableau | `fiches/<fiche>/fiche.md` |
| Le numéro ou le titre d'une fiche, le nom des fichiers produits | première ligne de `fiches/<fiche>/fiche.md` |
| Une couleur, une police, un style de la charte | `outils/make_reference.py` |
| Une figure dessinée | `outils/figures/<fiche>.py`, puis relancer ce script vers `fiches/<fiche>/figs/` |

La date de mise à jour, le nombre de questions et le nombre d'exercices affichés en couverture sont calculés à la fabrication. Pour figer la date, remplacer `"auto"` par un texte dans `reglages.json`.

Un document sans cahier d'énoncés (la charte, par exemple) déclare `"versions": "complet"` dans sa première ligne.

Une fiche peut remplacer un réglage commun en le déclarant dans sa première ligne, par exemple `"sessions": "BAC 2025, 2026 et 2027"` pour une fiche déjà mise à jour.

Si le titre d'une fiche est long, l'en-tête des pages du cahier d'énoncés passe sur deux lignes. On ajoute alors dans la première ligne un titre abrégé, qui ne sert qu'à l'en-tête : `"titre_court": "Chute libre et mouvement d'un projectile"`.

## Conventions d'écriture d'une fiche

- Formules en LaTeX entre `$...$` (dans le texte) ou `$$...$$` (sur une ligne à part). Elles deviennent des équations Word natives.
- Couleurs dans une formule : `\cR{...}` brique, `\cV{...}` vert, `\cO{...}` cuivre, `\cB{...}` bleu.
- Repère d'équation : `\lbl{1}` ou `\lbl{*}` en fin de formule.
- Encadrés : `::: {custom-style="Retenir"}`, `Remarque`, `Methode`, `Piege`, `Redaction`, fermés par `:::`.
- Niveaux : `[\ Objectif 10\ ]{custom-style="Niv10"}`, `Niv14`, `Niv18`.
- Titres : `#` partie ou thème, `##` question de cours ou exercice original, `###` exercice construit d'après un sujet du BAC (il apparaît en cuivre au sommaire), `####` corrigé.
- Ancres : `{#q1}` et `{#ex1}` sur les énoncés, `{#c_q1}` et `{#c_ex1}` sur les corrigés.
- Boutons : `[CIBLE:c_q1]{custom-style="BoutonCorrige"}` sous un énoncé, `[CIBLE:q1]{custom-style="BoutonEnonce"}` en tête de corrigé. Le numéro de page est rempli à la fabrication.
- Contenu réservé à une version : `<!--debut:complet-->` ... `<!--fin:complet-->` pour la fiche, `<!--debut:cahier-->` ... `<!--fin:cahier-->` pour le cahier d'énoncés.
- Largeur des colonnes d'un tableau : elle est choisie d'après les titres de colonnes pour les tableaux habituels, et répartie à parts égales pour les autres. Pour l'imposer, écrire juste avant le tableau `<!--colonnes: 17 11 13 19 14 12 14-->` : une proportion par colonne.
- Chaque exercice ouvre une nouvelle page. Si la dernière question avant un exercice déborde de deux ou trois lignes sur une page presque vide, écrire `<!--sans-saut-->` juste avant la rubrique « Exercices » : l'exercice suit alors ces lignes sur la même page (à vérifier à l'image : l'énoncé de l'exercice doit tenir sur cette page).
- Valeur d'un réglage : `{{site}}`, `{{compte}}`, `{{edition}}`, etc.
- Bloc commun : `<!--inclure:ouverture-->`.
- Le tiret long est interdit : la fabrication s'arrête si elle en trouve un.
- L'essentiel a trois rubriques (relecture de Yane du 18 novembre 2026) : « À connaître par cœur » (tableau Notion | Relation | À retenir : seulement ce que le programme demande de savoir sans qu'on le donne), « À savoir retrouver » (tableau Notion | Relation | Comment la retrouver) et « Fourni par l'énoncé, à savoir exploiter » (un paragraphe). Une notion n'apparaît qu'une fois dans les deux tableaux : l'application s'en sert comme nom unique dans ses jeux et dans les rappels des défis du labo.
- Un tableau d'avancement suit le modèle de la fiche 5, question 5 : colonnes État du système, Avancement, puis les espèces avec la flèche dans une colonne étroite à part ; lignes État initial, En cours, État final ; colonnes centrées (`|:-:|`).
- Une barre au-dessus d'une lettre (une moyenne) s'écrit `\overline{x}`, jamais `\bar{x}` : LibreOffice compose `\bar` comme un accent posé de travers.
- Les couleurs dans les formules apparaissent dans le fichier Word. Le PDF d'aperçu fabriqué ici ne les montre pas (LibreOffice ne les reprend pas). Le texte ne désigne donc jamais un terme par sa couleur.
- Une question de cours sans texte d'énoncé (titre et ligne d'information seulement) est autorisée : la fabrication évite qu'elle entraîne les suivantes sur une autre page.
- Un axe s'écrit `$(Oy)$` : la fabrication le compose en italique de texte, car LibreOffice sépare les deux lettres à l'intérieur d'une formule. Pour la même raison, un nom de point ou de triangle s'écrit `$\text{AMB}$`.
- Un point muni d'un prime s'écrit `$\text{A′}$`, avec le caractère ′ dans le texte de la formule : écrit `A'`, LibreOffice détache le prime de la lettre. Pour une grandeur, on préfère un indice (`h_B`) à un prime. Quand l'usage impose un prime, comme pour une distance focale ou un angle en optique, on écrit `$f\text{′}_1$` et `$\theta\text{′}$` : le prime reste alors collé à la lettre.
- Les formules d'un titre sont reprises au sommaire avec leurs parenthèses, leurs indices et leurs exposants.
- Une valeur absolue s'écrit `\left| ... \right|`. Écrites `\lvert` et `\rvert`, les barres sortent en « ¿ » et « ∨ » dans le PDF d'aperçu.
- Les parenthèses, les crochets et les barres d'une formule deviennent, par paires, des délimiteurs de Word qui grandissent avec leur contenu, comme dans les PDF d'origine : la fabrication regroupe chaque paire ouvrante-fermante d'un même niveau, et l'indice posé sur le fermant (`[\text{A}^-]_\text{éq}`) passe sur la paire entière. pandoc 3.14 les écrit en simples caractères, et LibreOffice 24.2 affiche alors « ¿ » à la place d'un crochet fermant qui porte un indice (constaté le 21 novembre 2026).
- Deux résultats sur une même ligne (`... \qquad ...`) doivent tenir dans la largeur : LibreOffice ne coupe pas une formule trop longue, elle sort de la page. `outils/mise_en_page.py` le signale ; on écrit alors deux formules hors ligne.
- Une charge positive s'écrit en texte dans l'exposant : `\text{H}_3\text{O}^{\text{+}}`, `\text{Ca}^{\text{2+}}`. Écrit `^+` ou `^{2+}`, le signe plus sort en « ¿ » dans le PDF d'aperçu ; `outils/controle.py` arrête désormais la fabrication si ce signe apparaît. Les charges négatives s'écrivent normalement (`^-`, `^{2-}`).
- En chimie, les formules s'écrivent en mode mathématique avec `\text{}` : `$\text{CO}_3^{2-}(\text{aq})$`, `(\ell)` pour l'eau liquide, `\rightleftarrows` pour une transformation non totale, `$\text{p}K_\text{A}$`, `c^\circ`. Les liaisons d'une formule semi-développée sont des traits d'union simples (`\text{HO-CH}_2\text{-CH}_2\text{-NH}_2`). Dans la ligne d'en-tête d'un tableau, une formule s'écrit sans mode mathématique (`H~3~O^+^`, `CaCO~3~`), sinon elle reste sombre sur le fond noir.
- Un noyau s'écrit `${}^{63}_{28}\text{Ni}$` et une particule `${}^{0}_{-1}\text{e}$` : la fabrication place le nombre de masse et le nombre de charge à gauche du symbole, en préexposants de Word ; sans cette conversion, LibreOffice affiche une case vide devant le symbole. Un signe plus isolé (`$+$`) sort lui aussi en « ¿ » : on l'écrit en toutes lettres. Les degrés Celsius s'écrivent `\text{°C}`, et les titres de colonnes d'un tableau ne contiennent pas de formule (`*t* (min)`).
- Un programme Python s'écrit dans un bloc délimité par trois accents graves, sans nom de langage, avec les numéros de ligne tapés en tête de chaque ligne. Il prend le style « Source Code » (Courier New, fond crème, filet cuivre à gauche) et n'est jamais coupé par un saut de page. Un nom de variable cité dans le texte s'écrit entre accents graves simples (style « Verbatim Char »). Pas de code dans un titre : le sommaire ne le reprendrait pas.
- Un titre de partie d'exercice (« Partie B. … », en gras, seul sur sa ligne) reste toujours avec la première question de la partie.
- Un encadré (À retenir, Remarque, Méthode, Piège, Rédaction) n'est jamais coupé par un saut de page.
- La fabrication lie d'elle-même un nombre à son unité (« 33 km ») et « Ex. » à son numéro, pour qu'ils ne se séparent pas en fin de ligne.
- Figure à l'échelle : une figure sur laquelle l'élève mesure à la règle est dessinée à sa taille réelle, enregistrée sans rognage et insérée à cette largeur exacte, par exemple `{width=16cm}`. La largeur utile de la page est de 17 cm. Le script de vérification de la fiche mesure ensuite la figure dans les PDF.

## Outils d'appoint

| Outil | Rôle |
|---|---|
| `outils/verifs/<fiche>.py` | Recalcule à part tous les résultats numériques d'une fiche. À tenir à jour avec la fiche et à relancer après toute modification d'une valeur. |
| `outils/figures/<fiche>.py` | Dessine les figures d'une fiche dans la palette. S'utilise avec le dossier `figs/` de la fiche en argument. |
| `outils/planches.py` | Met des pages d'un PDF côte à côte dans une image, pour relire une mise en page. |
| `outils/mise_en_page.py` | Signale dans les PDF fabriqués un sommaire qui déborde, « L'essentiel » ou « Ce qui est tombé » sur plus d'une page, les pages remplies à moins de 25 % et les lignes qui dépassent la marge droite. À lancer après chaque fabrication : `python3 -I outils/mise_en_page.py sorties/<fiche>/*.pdf`. |
| `outils/docker/` | Le convertisseur des PDF : `Dockerfile` (Ubuntu 24.04, LibreOffice 24.2, une seule Carlito) et `construire.sh`, qui fabrique l'image `masterbac-libreoffice:24.2` une fois pour toutes. |
| `outils/orthographe.py` | Liste les mots d'une fiche absents du dictionnaire français (module `pyspellchecker`). |
| `outils/reprise/nettoie_pdf.py` et `texte_pdf.py` | Sortent un thème d'un ancien PDF sans le filigrane ni les en-têtes au nom d'un élève. Voir `REPRISE_EDITION_2024.md`. |
| `outils/export_app.py` | Exporte les fiches vers les données de l'application : le sommaire, une fiche par fichier JSON (L'essentiel, Ce qui est tombé, questions, exercices, corrigés, notions) et les figures allégées pour le téléphone. La source reste `fiche.md` : on corrige la fiche, puis on relance `python3 -I outils/export_app.py <dossier de sortie>`. |
| `outils/verifie_formules.cjs` | Rend avec KaTeX toutes les formules exportées et signale celles qui ne passent pas : `NODE_PATH=<dossier node_modules avec katex> node outils/verifie_formules.cjs <dossier de sortie>`. Le 13 novembre 2026 : 9 418 formules, 0 erreur. |

## Ce qu'il faut sur la machine

- pandoc 3.1 ou plus récent (essayé jusqu'à la 3.14) ;
- LibreOffice 24.2 avec son module Math (pour le PDF et le calcul des numéros de page), de préférence dans le conteneur de `outils/docker/` ;
- Python 3 avec `python-docx`, `lxml`, `pymupdf`, `matplotlib` et `Pillow` ;
- la police Carlito, équivalent libre de Calibri, pour que la mise en page calculée soit la même que dans Word.

Le convertisseur, depuis le 21 novembre 2026 : les PDF se fabriquent avec LibreOffice 24.2 sous Linux, la version des PDF d'origine, dans un conteneur Docker. Une fois pour toutes : Docker Desktop ouvert, `bash outils/docker/construire.sh`. Ensuite, `outils/fabrique.sh <fiche>` passe de lui-même par le conteneur quand Docker répond et que l'image existe ; sa première ligne dit quel LibreOffice il a pris (`CONVERTISSEUR=local` impose celui de l'ordinateur). Le conteneur n'a qu'une Carlito (1.104, nom « Carlito-Regular ») : les formules sont à leur place, les flèches ⇄ et le ° de c° sont visibles. Trois symboles rares que ni la Carlito ni les polices des formules n'ont (le prime ′, l'astérisque ∗ d'un repère, ≪) viennent de DejaVu ; les PDF d'origine les prenaient dans Inter, TeX Gyre Termes et Noto Serif CJK, absentes de l'image. L'écart ne se voit qu'à la loupe ; ajouter ces polices à l'image changerait la largeur de ces signes, donc il faudrait revoir la mise en page.

Sans Docker, la fabrication prend le LibreOffice de l'ordinateur. Celui de l'ordinateur de travail (LibreOffice 26.2 pour Mac) voit deux Carlito, la sienne (1.103, nom « Carlito ») et celle du dossier des polices (1.104), et choisit au hasard ; avec la 1.103, les formules dans le texte descendent de 2 points (un point qui suit une formule paraît à mi-hauteur). `outils/fabrique.sh` refait alors la conversion jusqu'à obtenir la police de la variable `POLICE_PDF` (« Carlito » par défaut, « Carlito-Regular » avec Docker) ; `outils/police_pdf.py` dit laquelle un PDF embarque. La mise en page des fiches est réglée sur le conteneur : avec un autre LibreOffice, quelques pages peuvent changer. Les fichiers Word ne dépendent pas du convertisseur : Word les affiche avec Calibri, formules bien placées.

Dans une conversation avec Claude, la fabrication repère seule l'outil Word de Claude (compétence docx) et s'en sert pour convertir en PDF et pour valider le fichier Word. Son emplacement peut aussi être donné par la variable `DOCX_SKILL`.

## Fiches présentes

Toutes les fiches : relecture de Yane du 18 novembre et contrôle de cohérence entre les fiches appliqués le 21 novembre 2026, PDF refaits ce jour-là avec LibreOffice 24.2 (Docker). Les nombres de pages ci-dessous sont ceux de ces PDF.

| Dossier | Fiche | État |
|---|---|---|
| `pc-01-mecanique-chute-libre` | Physique-chimie, fiche 1 : Mécanique, chute libre et mouvement d'un projectile (17 questions, 3 exercices, 45 pages, cahier de 13 pages) | Produite le 11 novembre 2026 ; contrôle qualité le 12 novembre 2026 |
| `pc-02-mecanique-energie` | Physique-chimie, fiche 2 : Mécanique, énergie et champ électrique uniforme (17 questions, 3 exercices, 32 pages, cahier de 13 pages) | Produite le 11 novembre 2026 ; session de « Jeu de billes et gravité » corrigée le 12 novembre ; contrôle qualité le 12 novembre 2026 |
| `pc-03-gravitation` | Physique-chimie, fiche 3 : Gravitation, satellites et lois de Kepler (13 questions, 3 exercices, 33 pages, cahier de 11 pages) | Produite le 11 novembre 2026 ; contrôle qualité le 12 novembre 2026 |
| `pc-04-fluides` | Physique-chimie, fiche 4 : Poussée d'Archimède et écoulement de fluides (16 questions, 9 exercices, 50 pages, cahier de 18 pages) | Format validé le 11 novembre 2026 ; thème 3 « chute dans un fluide » ajouté le 12 novembre 2026 ; contrôle qualité le 12 novembre 2026 |
| `pc-05-energie` | Physique-chimie, fiche 5 : Énergie, gaz parfait et transferts thermiques (22 questions, 4 exercices, 44 pages, cahier de 15 pages) | Produite le 11 novembre 2026 ; six sujets de sciences de l'ingénieur retirés du tableau « Ce qui est tombé » le 12 novembre ; contrôle qualité le 12 novembre 2026 |
| `pc-06-ondes` | Physique-chimie, fiche 6 : Ondes, propagation, son, diffraction, interférences et effet Doppler (28 questions, 5 exercices, 43 pages, cahier de 16 pages) | Produite le 12 novembre 2026 ; contrôle qualité le 12 novembre 2026 |
| `pc-07-lumiere` | Physique-chimie, fiche 7 : Lumière, lentilles, lunette astronomique et photons (23 questions, 4 exercices, 38 pages, cahier de 15 pages) | Produite le 12 novembre 2026 ; contrôle qualité le 12 novembre 2026 |
| `pc-08-circuit-rc` | Physique-chimie, fiche 8 : Circuit RC, condensateur, charge et décharge (19 questions, 4 exercices, 35 pages, cahier de 13 pages) | Produite le 12 novembre 2026 ; contrôle qualité le 12 novembre 2026 |
| `pc-09-acides-bases` | Physique-chimie, fiche 9 : Acides et bases, solutions, pH, force des acides et diagrammes (24 questions, 4 exercices, 39 pages, cahier de 14 pages) | Produite le 12 novembre 2026 ; contrôle qualité le 12 novembre 2026 |
| `pc-10-dosages` | Physique-chimie, fiche 10 : Dosages, étalonnage, titrages pH-métrique, conductimétrique et colorimétrique (19 questions, 4 exercices, 31 pages, cahier de 14 pages) | Produite le 12 novembre 2026 ; contrôle qualité le 12 novembre 2026 |
| `pc-11-cinetique-radioactivite` | Physique-chimie, fiche 11 : Cinétique chimique et radioactivité, vitesse, loi d'ordre 1, mécanismes et décroissance radioactive (26 questions, 5 exercices, 43 pages, cahier de 18 pages) | Produite le 12 novembre 2026 ; contrôle qualité le 12 novembre 2026 |
| `pc-12-equilibre-piles-electrolyse` | Physique-chimie, fiche 12 : Équilibre, piles et électrolyse, quotient de réaction, sens d'évolution, oxydoréduction, piles et transformations forcées (19 questions, 5 exercices, 37 pages, cahier de 16 pages) | Produite le 12 novembre 2026 ; contrôle qualité le 12 novembre 2026 |
| `pc-13-synthese-organique` | Physique-chimie, fiche 13 : Synthèse organique, structure et nomenclature, réactions et stratégie de synthèse, protocole, purification, analyse et rendement (20 questions, 5 exercices, 39 pages, cahier de 17 pages) | Produite le 12 novembre 2026 ; contrôle qualité le 12 novembre 2026 |
| `pc-14-methodes` | Physique-chimie, fiche 14 : Méthodes du BAC, incertitudes, Python, équations différentielles et rédaction (19 questions, 4 exercices, 33 pages, cahier de 14 pages) | Produite le 12 novembre 2026 ; contrôle qualité le 12 novembre 2026 |
| `_montages` | Physique-chimie, fiche annexe : Montages de chimie, schémas légendés et gestes (19 questions, 4 exercices, 38 pages, cahier de 15 pages) | Créée le 19 novembre 2026 à la demande de Yane ; n'entre pas dans l'export de l'application |
| `_charte` | Charte et modèle des fiches : couleurs, typographie, structure, styles, pages d'exemple | À jour du format validé |

Les figures de chaque fiche sont dessinées par `outils/figures/<dossier>.py`, sauf trois figures de la fiche 4 reprises de la fiche d'origine (images `fig_cyl_const`, `fig_pitot` et `fig_reservoir`). Dans la fiche 1, trois figures (la chronophotographie de Q.17 et ses deux corrigés) sont à l'échelle 1/2 exacte et s'insèrent à 16 cm de large.

La série est numérotée de 1 à 14 depuis le 11 novembre 2026 (voir `REPRISE_EDITION_2024.md`). Les tableaux « Ce qui est tombé » ne retiennent pas les sujets de l'épreuve de sciences de l'ingénieur. Ces sujets se reconnaissent à leur code (`25-SCIPC…`, `26-SCIPC…`, au lieu de `PYC`) et à leurs exercices A et B de 10 points en 30 minutes : vérifier le code du sujet avant d'ajouter une ligne.
