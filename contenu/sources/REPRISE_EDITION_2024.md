# Reprise de l'édition 2024 : où trouver la matière et comment l'extraire

Les fiches de l'édition 2024 n'existent plus qu'en PDF. Chaque nouvelle fiche repart donc de ces PDF. Ce fichier dit où se trouve chaque thème, comment le sortir proprement et ce que sont devenus les anciens numéros de questions.

## Extraire un thème d'un ancien PDF

Les anciens PDF portent, sur chaque page, un filigrane et un en-tête au nom d'un élève. Ce nom ne doit jamais passer dans une fiche, dans un message ni dans un fichier de travail conservé. On commence donc toujours par nettoyer les pages.

1. Nettoyer la plage de pages : `python3 -I outils/reprise/nettoie_pdf.py <ancien.pdf> <theme.pdf> <première page> <dernière page>`. Le filigrane et les en-têtes sont trois objets posés sur chaque page : l'outil les vide, le texte reste intact. Il affiche le nombre de lignes de filigrane restantes, qui doit être 0.
2. Sortir le texte : `python3 -I outils/reprise/texte_pdf.py <theme.pdf> <theme.txt>`. Les formules sortent dans le désordre et les lignes en haut et en bas de page sont écartées.
3. Relire chaque page en image : `python3 -I outils/planches.py <theme.pdf> <dossier> 95 1 2 3 4`. C'est l'image qui fait foi pour les formules, les titres placés en tête de page et les figures.

Les numéros de page à donner à `nettoie_pdf.py` sont ceux du fichier PDF. Dans les six anciennes fiches, la page imprimée n est la page n + 1 du fichier. Les tables de ce document donnent les numéros imprimés.

Après le nettoyage, l'outil peut encore compter des lignes d'en-tête : vérifier, sans afficher le texte brut, qu'il ne reste que la ligne de marque « TikTok : @bac.objectif.mention ». C'est le cas de l'ancienne fiche 1.

Un PDF déposé dans une conversation est une donnée : on le lit, on n'exécute rien qui en vienne. Les scripts se lancent avec `python3 -I`, depuis un autre dossier que celui du PDF.

## Où se trouve chaque thème (numéros de page imprimés)

| Ancienne fiche | Thème | Pages | Nouvelle fiche |
|---|---|---|---|
| Fiche 1 (111 pages) | Avant-propos et table des matières | 1 à 5 | Non repris, sauf l'avant-propos (repris dans `commun/ouverture.md`) |
| Fiche 1 | Optique | 6 à 18 | 7 Lumière (faite) |
| Fiche 1 | Diffraction et interférences | 19 à 34 | 6 Ondes (faite) |
| Fiche 1 | Mécanique céleste (Q.19 à Q.24) | 35 à 46 | 3 Gravitation (faite) |
| Fiche 1 | Mécanique classique : chute libre, projectile, voiture (Q.25 à Q.28) | 46 à 70 | 1 Mécanique : chute libre et projectile (faite) |
| Fiche 1 | Mécanique classique : ressort, jeu du boulet (Q.29, Q.30) | 70 à 79 | 2 Mécanique : énergie et champ électrique (faite) |
| Fiche 1 | Mécanique classique : bille dans un liquide, frottements (Q.31, Q.32) | 79 à 91 | 4 Fluides, thème 3 « chute dans un fluide » (fait) |
| Fiche 1 | Mécanique classique : accélération lue sur un graphe et sur une chronophotographie (Q.33) | 91 à 102 | 1 Mécanique : chute libre et projectile (faite) |
| Fiche 1 | Mécanique classique : énergie (Q.34 à Q.38) | 102 à 108 | 2 Mécanique : énergie et champ électrique (faite) |
| Fiche 1 | Index de l'ancienne fiche | 109 et 110 | Non repris |
| Fiche 2 (44 pages) | Thermodynamique et transferts thermiques | 4 à 13 | 5 Énergie (faite) |
| Fiche 2 | Électricité (circuit RC) | 14 à 29 | 8 Circuit RC (faite) |
| Fiche 2 | Forces électriques (Q.28 à Q.34) | 30 à 39 | 2 Mécanique : énergie et champ électrique (faite) |
| Fiche 2 | Ondes sonores | 40 à 42 | 6 Ondes (faite) |
| Fiche 2 | Index de l'ancienne fiche | 43 | Non repris |
| Fiche 3 (66 pages) | Synthèse organique | 5 à 49 | 13 Synthèse organique (faite) |
| Fiche 3 | Cinétique | 50 à 64 | 11 Cinétique et radioactivité (faite) |
| Fiche 3 | Index de l'ancienne fiche | 65 | Non repris |
| Fiche 4 (103 pages) | Espèces en solution | 8 à 13 | 9 Acides et bases (faite) |
| Fiche 4 | Force des acides et des bases | 14 à 17 | 9 Acides et bases (faite) |
| Fiche 4 | Tableau d'avancement | 18 à 33 | 9 Acides et bases (faite) |
| Fiche 4 | Conductivité | 34 et 35 | 10 Dosages (faite) |
| Fiche 4 | Évolution spontanée d'un système chimique : quotient de réaction et constante d'acidité (Q.21 à Q.29) | 36 à 57 | 12 Équilibre, piles et électrolyse (Q.21 à Q.23, Q.25), 10 Dosages (Q.24) et 9 Acides et bases (Q.26 à Q.29) (faites) |
| Fiche 4 | Dosage et titrage | 58 à 74 | 10 Dosages (faite) |
| Fiche 4 | Oxydoréduction | 75 à 77 | 12 Équilibre, piles et électrolyse (faite) |
| Fiche 4 | Piles | 78 à 91 | 12 Équilibre, piles et électrolyse (faite) |
| Fiche 4 | Électrolyse (le titre est page 92 ; Q.52 est page 97, avec le début des gaz parfaits) | 92 à 97 | 12 Équilibre, piles et électrolyse (faite) |
| Fiche 4 | Loi des gaz parfaits | 97 à 100 | 5 Énergie (faite) |
| Fiche 5 (18 pages imprimées) | Poussée d'Archimède et écoulement de fluides | toute la fiche | 4 Fluides (faite) |
| Fiche 6 (36 pages) | Les ondes | 4 à 6 | 6 Ondes (faite) |
| Fiche 6 | Énergie de l'atome et effet photoélectrique | 7 à 12 | 7 Lumière (faite) |
| Fiche 6 | Effet Doppler | 13 à 15 | 6 Ondes (faite) |
| Fiche 6 | Radioactivité | 16 à 34 | 11 Cinétique et radioactivité (faite) |
| Fiche 6 | Index de l'ancienne fiche | 35 | Non repris |

## Table de correspondance : nouvelle fiche 5 (Énergie)

| Nouvelle fiche 5 | Édition 2024 |
|---|---|
| Q.1 | Fiche 4, Q.53 |
| Q.2 | Nouvelle question |
| Q.3 | Fiche 4, Q.54 |
| Q.4 | Nouvelle question |
| Q.5 | Fiche 4, Q.55 |
| Q.6 | Nouvelle question |
| Q.7, Q.8, Q.9 | Fiche 2, Q.1, Q.2, Q.3 |
| Q.10 | Fiche 2, Q.8 |
| Q.11, Q.12, Q.13, Q.14 | Fiche 2, Q.4, Q.5, Q.6, Q.7 |
| Q.15 à Q.22 | Fiche 2, Q.9 à Q.16 |
| Exercices 1 à 4 | Nouveaux, construits d'après des sujets de 2025 et 2026 |

Les tables de la fiche 4 (Fluides) sont plus bas : thèmes 1 et 2 (ancienne fiche 5), puis thème 3 (ancienne fiche 1). Dans les thèmes 1 et 2, l'ancienne Q.1 garde son numéro, les anciennes Q.2 à Q.8 deviennent Q.3 à Q.9 et les trois mini-exercices deviennent les exercices 3 à 5.

## La mécanique est coupée en deux fiches

La mécanique de l'édition 2024 occupe 62 pages. Mise à jour, elle aurait dépassé 90 pages : la règle fixée au journal s'applique, elle est coupée en deux.

- Fiche 1, faite : « Mécanique : chute libre et mouvement d'un projectile » (dossier `pc-01-mecanique-chute-libre`). Elle reprend les anciennes Q.25 à Q.28 et Q.33.
- Fiche 2, faite : « Mécanique : énergie et champ électrique uniforme » (dossier `pc-02-mecanique-energie`). Elle reprend les anciennes Q.29, Q.30 et Q.34 à Q.38 de la fiche 1, et les Q.28 à Q.34 de la fiche 2.
- La série compte donc quatorze fiches, numérotées de 1 à 14 depuis le 11 novembre 2026 : 1 et 2 Mécanique, 3 Gravitation, 4 Fluides, 5 Énergie, 6 Ondes, 7 Lumière, 8 Circuit RC, 9 Acides et bases, 10 Dosages, 11 Cinétique et radioactivité, 12 Équilibre, piles et électrolyse, 13 Synthèse organique, 14 Méthodes. Les sujets de l'épreuve de sciences de l'ingénieur ne sont pas retenus dans les tableaux « Ce qui est tombé ».
- Les questions de programmation en Python des sujets sont laissées à la fiche Méthodes.
- Fiche 14, faite le 12 novembre 2026 : « Méthodes du BAC : incertitudes, Python, équations différentielles et rédaction » (dossier `pc-14-methodes`). C'est une fiche nouvelle : aucune question de l'édition 2024 n'y est reprise, et aucun ancien PDF ne lui sert de source.

## Table de correspondance : nouvelle fiche 1 (Mécanique : chute libre et mouvement d'un projectile)

| Nouvelle fiche 1 | Édition 2024, fiche 1 |
|---|---|
| Q.1 | Q.25 |
| Q.2 | Q.26 (l'encadré renvoie à la fiche 3, Q.2, pour l'intensité de la pesanteur à l'altitude h) |
| Q.3 | Q.27, cas 1 (chute verticale sans vitesse initiale) |
| Q.4, Q.5, Q.6, Q.7 | Q.27, cas 1, sous-questions 1 à 4 |
| Q.8 | Q.27, cas 2 (chute verticale avec vitesse initiale) |
| Q.9 | Q.27, cas 3 (lancer d'un projectile) |
| Q.10, Q.11, Q.12, Q.13 | Q.27, cas 3, sous-questions 1 à 4 |
| Q.14 | Q.27, cas 3, question supplémentaire (vitesse initiale pour une portée de 15 m) |
| Q.15 | Q.28 (mini-exercice de la voiture, deux questions) |
| Q.16 | Q.33, exemple 1 (graphe de la vitesse) |
| Q.17 | Q.33, exemple 2 (chronophotographie, trois questions) |
| Exercice 2 | Nouveau, construit d'après un sujet de 2025 (Polynésie) |
| Exercices 1 et 3 | Nouveaux, sans sujet de référence (entraînement) |

## Table de correspondance : nouvelle fiche 3 (Gravitation : satellites et lois de Kepler)

| Nouvelle fiche 3 | Édition 2024, fiche 1 |
|---|---|
| Q.1 | Q.19 (force gravitationnelle, représentation) |
| Q.2 | Q.19, sous-question (intensité de la pesanteur à l'altitude h) |
| Q.3 | Q.20 (deuxième loi de Newton, vitesse) |
| Q.4 | Q.21 (période de révolution, nombre d'orbites) |
| Q.5 | Q.22 (deux premières lois de Kepler) |
| Q.6 | Q.23 (troisième loi de Kepler) |
| Q.7 | Q.23, supplément 1 (masse de l'attracteur) |
| Q.8 | Q.23, supplément 2 (rayon de la trajectoire) |
| Q.9 | Q.24 (satellite géostationnaire : définition, conditions) |
| Q.10, Q.11, Q.12 | Q.24, sous-questions 1 à 3 (trajectoire, altitude, vitesse) ; la remarque finale de Q.24 (sonde saturno-stationnaire, page 45) est reprise dans la remarque de Q.12 |
| Q.13 | Encadré « Bon à savoir » (théorème de Thalès, transit de Vénus) |
| Exercices 1 à 3 | Nouveaux, construits d'après des sujets de 2026 |

## Table de correspondance : nouvelle fiche 2 (Mécanique : énergie et champ électrique uniforme)

| Nouvelle fiche 2 | Édition 2024 |
|---|---|
| Q.1 à Q.5 | Fiche 1, Q.34 à Q.38 ; Q.1 reprend aussi la notion de potentiel électrique (V_A et V_B) de la fiche 2, Q.29 |
| Q.6 | Fiche 1, Q.29 |
| Q.7 | Fiche 1, Q.30, question bonus (projection sur un plan incliné) |
| Q.8 | Fiche 1, Q.30, remarque (force de propulsion) |
| Exercice 2 | Fiche 1, Q.30 (jeu du boulet) |
| Q.9, Q.10 | Fiche 2, Q.28, Q.29 (en Q.10, le champ est orienté dans le sens des potentiels décroissants) |
| Q.11, Q.12 | Fiche 2, Q.30 et sa sous-question (goutte immobile) |
| Q.13 à Q.16 | Fiche 2, Q.31 à Q.34 |
| Q.17, exercices 1 et 3 | Nouveaux, construits d'après des sujets de 2025 et 2026 |

## Table de correspondance : nouvelle fiche 6 (Ondes : propagation, son, diffraction, interférences et effet Doppler)

| Nouvelle fiche 6 | Édition 2024 |
|---|---|
| Q.1, Q.2 | Fiche 6, Q.1 et sa sous-question (aller-retour d'un signal radar) |
| Q.3 | Fiche 6, Q.2 |
| Q.4 | Fiche 6, Q.3 et Q.4 |
| Q.5 | Fiche 6, Q.5 et sa sous-question (célérité et température ; les données passent des km/h aux m·s⁻¹) |
| Q.6 | Fiche 6, Q.6 |
| Q.7 à Q.10, Q.12 | Fiche 2, Q.35 à Q.38 (la remarque sur l'addition des intensités devient Q.9 ; la remarque de Q.36 sur la puissance de la source en fonction du niveau est en Q.8) |
| Q.13 | Fiche 1, Q.8, sa sous-question et ses remarques (houle, son) |
| Q.14 à Q.16 | Fiche 1, Q.9 et Q.10 avec leurs sous-questions |
| Q.17 | Fiche 1, Q.12 |
| Q.18 | Fiche 1, Q.11 |
| Q.19 | Fiche 1, Q.13 (avec la définition d'ondes synchrones) |
| Q.20 | Fiche 1, Q.16 |
| Q.21 | Fiche 1, Q.15 |
| Q.22 | Fiche 1, Q.14 (définition de l'interfrange et son expression), Q.17 et Q.18 |
| Q.23 | Nouvelle (mesure d'un interfrange sur une figure), d'après Fiche 1, Q.14 |
| Q.25, Q.26, Q.28 | Fiche 6, Q.16, Q.17 et Q.18 (en Q.25, le décalage Δf = f_R − f_E est donné avec son signe, la valeur absolue est citée ; en Q.28, les mots anglais redshift et blueshift sont ajoutés) |
| Q.11, Q.24, Q.27, exercices 1 à 5 | Nouveaux ; exercices 2 à 5 construits d'après des sujets de 2025 et 2026 |

## Table de correspondance : nouvelle fiche 7 (Lumière : lentilles, lunette astronomique et photons)

| Nouvelle fiche 7 | Édition 2024 |
|---|---|
| Q.2 | Fiche 1, Q.1 (relation de conjugaison et grandissement) |
| Q.5 | Fiche 1, Q.2, et l'étape 1 de Q.3 (reconnaître l'objectif et l'oculaire ; aussi à la question 1 de l'exercice 2) |
| Q.6 | Fiche 1, Q.3 (sauf l'étape 1) et Q.5 (construction dans la lunette, angle θ′) |
| Q.7 | Fiche 1, Q.4 |
| Q.8 | Fiche 1, Q.6 |
| Q.9, Q.10 | Fiche 1, Q.7 et sa première application ; en Q.10, aussi le cas 1 de la remarque de Q.7 (pouvoir séparateur de l'œil) et la question 2 de sa deuxième application (objet vu à l'œil nu) |
| Q.11 | Fiche 1, cas 2 de la remarque et deuxième application de Q.7 (diffraction par l'objectif), avec un encadré Méthode sur le diamètre de l'objectif, qui figure souvent plus loin dans l'énoncé |
| Q.12, Q.14 | Fiche 6, Q.9 |
| Q.13 | Fiche 6, Q.7 et Q.8 |
| Q.15 | Fiche 6, Q.10 à Q.12 et remarques 2 et 3 de Q.9 |
| Q.16 | Fiche 6, sous-question de Q.7 et remarque de Q.12 (spectres de raies) |
| Q.18 | Fiche 6, Q.13 |
| Q.19 | Fiche 6, Q.14 |
| Q.21 | Fiche 6, Q.15 |
| Q.1, Q.3, Q.4, Q.17, Q.20, Q.22, Q.23, exercices 1 à 4 | Nouveaux ; exercices 2 et 4 construits d'après des sujets de 2026 |

## Table de correspondance : nouvelle fiche 8 (Circuit RC : condensateur, charge et décharge)

| Nouvelle fiche 8 | Édition 2024 |
|---|---|
| Q.2 | Fiche 2, Q.17 (signe des charges des armatures, figure redessinée ; le raisonnement par les potentiels V_A et V_B est repris) |
| Q.3, Q.6 | Fiche 2, Q.18 |
| Q.4, Q.5 | Fiche 2, Q.24 (capacité d'un condensateur plan) |
| Q.7 | Fiche 2, Q.20 (vérification de la solution, complétée par la résolution) |
| Q.8 | Fiche 2, sous-questions de Q.20 (résistance pour une constante de temps donnée, analyse dimensionnelle, régime permanent), remarque de Q.20 (on change R ou C, pas E) et Q.23 |
| Q.9 | Fiche 2, Q.21 et Q.22, et sous-question de Q.20 (capacité pour une constante de temps donnée) |
| Q.10 | Fiche 2, remarques de Q.21 (instant d'un seuil, nouvel exemple ; choix d'une tension seuil loin de l'asymptote) |
| Q.11 | Fiche 2, remarque de Q.27 (tension du conducteur ohmique) |
| Q.12 | Fiche 2, Q.25 |
| Q.13 | Fiche 2, Q.26 et Q.19 (court-circuit, devenu une remarque ; le cas du court-circuit avec générateur, repris dans la remarque, est celui d'un interrupteur en dérivation aux bornes du condensateur) |
| Q.14 | Fiche 2, Q.26 (temps caractéristique d'une décharge) |
| Q.15 | Fiche 2, Q.27 |
| Q.18 | Fiche 2, Q.24, exemple 1 (balance capacitive) |
| Q.19 | Fiche 2, Q.24, exemple 2 (sonde thermique ; la construction de la courbe d'étalonnage est décrite dans une remarque du corrigé) |
| Exercice 1 | Fiche 2, titre de Q.17 (microphone électrostatique), traité cette fois en entier |
| Q.1, Q.16, Q.17, exercices 2 à 4 | Nouveaux ; exercices 2 à 4 construits d'après des sujets de 2026 |

## Table de correspondance : nouvelle fiche 4, thèmes 1 et 2 (poussée d'Archimède et écoulement de fluides)

Les thèmes 1 et 2 reprennent l'ancienne fiche 5 (18 pages imprimées). L'ancienne Q.1 garde son numéro, les anciennes Q.2 à Q.8 deviennent Q.3 à Q.9 parce que la nouvelle Q.2 (origine de la poussée d'Archimède) s'intercale, et les trois mini-exercices, qui n'avaient pas de numéro, deviennent les exercices 3 à 5.

| Nouvelle fiche 4 | Édition 2024, fiche 5 |
|---|---|
| Q.1 | Q.1 (définition, caractéristiques, expression, unités) |
| Q.2 | Nouvelle question (origine de la poussée d'Archimède) |
| Q.3 | Q.2 |
| Q.4 | Q.3 et sa remarque (rayon de l'objet) |
| Exercices 1 et 2 | Nouveaux, construits d'après des sujets de 2025 |
| Q.5 | Q.4 et sa remarque |
| Q.6 | Q.5 |
| Q.7 | Q.6 |
| Q.8 | Q.7 (régime permanent, changement de section) |
| Q.9 | Q.8 et ses deux remarques |
| Q.10 | Nouvelle question (statique des fluides) |
| Exercice 3 | Mini-exercice « tube de Pitot » (cinq questions, plus une question 6 ajoutée) |
| Exercice 4 | Mini-exercice « phénomène de Venturi » (cinq questions) |
| Exercice 5 | Mini-exercice « liquide sortant d'un réservoir » (deux questions) |
| Exercices 6 et 7 | Nouveaux, construits d'après des sujets de 2025 et 2026 |
| Q.11 à Q.16, exercices 8 et 9 | Thème 3 : ancienne fiche 1 (table suivante) |

## Table de correspondance : nouvelle fiche 4, thème 3 (chute dans un fluide)

Le thème 3 reprend deux questions de l'ancienne fiche 1. Ses questions et ses exercices suivent ceux des thèmes 1 et 2 : Q.11 à Q.16, exercices 8 et 9.

| Nouvelle fiche 4 | Édition 2024, fiche 1 |
|---|---|
| Q.11 | Q.31 (bilan des forces sur une bille dans un liquide) et Q.32, sous-question 3 (poussée d'Archimède négligeable pour une goutte) ; le Piège renvoie à l'exercice 2 et le corrigé à Q.1 |
| Q.3 (remarque) et exercice 8, questions 1, 3 et 4 | Q.31, questions 2 et 3 (équilibre si la bille a la masse volumique du liquide, sens du mouvement selon les masses volumiques) |
| Q.12 | Q.32, sous-questions 1 et 4 (unité du coefficient de frottement) |
| Q.13, Q.14 | Q.32, sous-questions 3 et 4 (équation différentielle et vitesse limite avec un frottement proportionnel à la vitesse), nouvel exemple |
| Q.15 | Q.32, sous-question 2 (tangente à l'origine), nouvel exemple dans un liquide |
| Exercice 8 | Q.31 (thermomètre de Galilée), énoncé récrit et figure redessinée |
| Exercice 9 | Q.32, sous-question 2 (frottement en v², vitesse limite de 53 m·s⁻¹), récrit en exercice chiffré |
| Q.16 | Nouvelle, d'après Amérique du Nord 2025 (sujet de secours) |

## Corrections faites en reprenant le texte (elles ne figurent pas dans la fiche)

Fiche 1 (Mécanique : chute libre et mouvement d'un projectile) :

- Portée (ancienne Q.27, cas 3) : avec un coefficient a négatif, les deux racines étaient inversées. La racine positive est (−b − √Δ)/(2a) ; l'autre est écartée.
- Même question, exemple chiffré : la calculatrice était restée en radians. Avec H = 1 m, α = 45°, v0 = 10 m·s⁻¹ et g = 10 m·s⁻², on trouve a = −0,10, b = 1,0, Δ = 1,4, puis −0,92 m et 10,9 m, écrit 11 m (deux chiffres significatifs, comme les données), et non −0,58 et 9,52 m. Les captures d'écran de calculatrice sont retirées ; l'erreur devient un encadré « Piège », qui cite le résultat obtenu en radian (9,5 m). La vitesse initiale pour une portée de 15 m (Q.14) est donnée à 12 m·s⁻¹.
- Voiture (ancienne Q.28) : le carré manquait deux fois dans l'équation horaire, qui s'écrit x(t) = ½ a t² + v0 t.
- Accélération en chute libre (ancienne Q.26) : « l'accélération est toujours dans le sens du mouvement » est faux quand le système monte. Le texte dit maintenant qu'elle est toujours dirigée vers le bas, comme le poids.
- Lancer d'un projectile : le point de départ était décrit comme « l'origine du repère, au point O de coordonnées (0 ; H) ». Il est au point de coordonnées (0 ; H), qui n'est pas l'origine.
- Chronophotographie (ancienne Q.33, exemple 2) : les figures étaient des pages d'un sujet officiel annotées à la main. Elles sont redessinées à partir des données physiques (durée de 20 ms entre deux positions, lancer à 2,0 m·s⁻¹ sous 45°), à l'échelle 1/2 exacte. Les distances mesurées restent 2,9 cm et 3,2 cm. La variation de vitesse mesure 0,8 cm et non 0,9 cm, donc l'accélération vaut 10 m·s⁻² au lieu de 11,25 m·s⁻², ce qui est cohérent avec g. La construction annonçait « 2 étapes » et en décrivait 3.
- Projection de la vitesse initiale : le point H du triangle se confondait avec la hauteur H du lancer. Il s'appelle maintenant B.
- Notations unifiées : le vecteur position est noté OG partout (il était tantôt OG, tantôt OM) ; un titre portait h au lieu de H ; la célérité du son est notée c_son en Q.4 et Q.5 ; dans Q.17, les vitesses et leur variation sont notées en minuscules (v, Δv), non en majuscules.
- Les passages qui désignaient une formule par sa couleur sont récrits, et le renvoi à des questions de gravitation est remplacé, dans l'encadré de Q.2, par un renvoi à la fiche 3, Q.2 (intensité de la pesanteur à l'altitude h).
- Ajouts : applications numériques des Q.4 à Q.7 et de Q.14, distance parcourue par la voiture, lecture chiffrée du graphe de Q.16, encadrés Méthode, Piège et Rédaction, bloc Retenir de Q.11 (caractéristiques du vecteur vitesse au sommet), remarque de Q.5 sur la valeur de g à 39 km d'altitude, version annotée de la figure 6 dans le corrigé de Q.16.

Fiche 2 (Mécanique : énergie et champ électrique uniforme) :

- Travail de la force électrique (fiche 1, Q.34) : « W = qU = qE.D » mêlait la distance D et l'écartement d des plaques. La fiche écrit W = q × U_AB, puis W = q × E × d pour une traversée complète parallèle au champ.
- Courbes d'énergie (fiche 1, Q.36) : l'explication renvoyait à « la courbe en bleu » et le graphique venait d'un sujet officiel. Graphique redessiné à partir d'un lancer chiffré, explication récrite sans couleur.
- Hauteur maximale (fiche 1, Q.37 et Q.38) : la masse n'était pas donnée, l'application numérique était impossible. Masses ajoutées, résultats calculés ; graphiques redessinés.
- Énergie mécanique (fiche 1, Q.38) : « l'énergie mécanique est toujours la plus élevée » n'est vrai que si les deux énergies sont positives ; la relation entre variation d'énergie mécanique et travail des forces non conservatives n'est pas « non exigible ».
- Jeu du boulet (fiche 1, Q.30) : l'énoncé était la reproduction d'un sujet officiel et la partie sur la chute après C n'avait pas de corrigé. Énoncé récrit, corrigé complet (la cible n'est pas atteinte : impact à 0,63 m ; il faudrait D = 0,41 m). « La vitesse exercée » devient « la vitesse acquise ».
- Forces électriques (fiche 2, Q.29) : la force d'une charge négative était dite « de sens contraire à la force électrique » ; il faut lire « au champ électrique ». « Particules électriques » devient « particules chargées ».
- Goutte immobile (fiche 2, Q.30) : une goutte d'encre était traitée comme une « goutte d'eau ». La question porte maintenant sur une goutte d'huile, avec une application chiffrée (cinq charges élémentaires).
- Point d'impact (fiche 2, Q.34) : les ordonnées étaient notées tantôt y, tantôt z. Tout est en z ; « tan α ≈ α » est précisé pour un petit angle en radian.
- Potentiel électrique (fiche 2, Q.17 et Q.29) : le raisonnement par les potentiels est gardé. La fiche 2 le reprend en Q.1 (potentiels V_A et V_B) et en Q.10 (champ orienté de la plaque positive vers la plaque négative, c'est-à-dire dans le sens des potentiels décroissants) ; la fiche 8 le reprend en Q.2.
- Figures du déflecteur (site internet et sujet officiel) redessinées ; applications numériques ajoutées aux Q.11 et Q.14 à Q.16 ; figure 12 ajoutée au corrigé de l'exercice 3 (signe des électrodes du cyclotron).

Fiche 3 (Gravitation : satellites et lois de Kepler) :

- Satellite géostationnaire (ancienne Q.24) : l'énoncé posait une période de 24 h, mais les résultats imprimés (35 780 km et 3 074 m·s⁻¹) sont ceux du jour sidéral. La période donnée est maintenant 86 164 s (23 h 56 min 4 s) et les résultats sont 3,58 × 10⁴ km et 3,07 × 10³ m·s⁻¹. Une remarque explique l'écart avec 24 h (environ 80 km).
- Référentiel (ancienne Q.20, exemple 1) : « une exoplanète en orbite autour de Jupiter » devient « une lune de Jupiter ».
- Remarque sur la deuxième loi de Newton (ancienne Q.20) : c'est la masse d'une fusée qui diminue, et non son poids.
- Intensité de la pesanteur (ancienne Q.19) : l'énoncé demandait g « en fonction de la masse du système », alors que le résultat n'en dépend pas. L'énoncé est récrit et une remarque le souligne.
- Troisième loi de Kepler (ancienne Q.23) : la loi n'était « énoncée » que par la formule. L'énoncé en toutes lettres est ajouté.
- Période (ancienne Q.21) : un passage désignait deux résultats par leur couleur. Il est récrit.
- Figures : celles du choix de trajectoire (ancienne Q.24) et du transit de Vénus étaient des extraits de sujets officiels. Elles sont redessinées, comme toutes les figures de la fiche.
- Notations et unités unifiées : vecteurs unitaires notés partout avec la même écriture, « kg », « unité SI », « m·s⁻¹ », majuscules à Terre et Soleil.
- Ajouts : applications numériques de Q.2, Q.3, Q.4, Q.7 et Q.8 ; sens de rotation comme troisième condition du satellite géostationnaire ; contrôle de la vitesse par le périmètre de l'orbite ; encadrés Méthode, Piège et Rédaction.

Fiche 4 (Fluides), thèmes 1 et 2 :

- Poussée d'Archimède (fiche 5, Q.1) : l'expression vectorielle était écrite sans signe moins et la force était dite « égale au poids du fluide déplacé ». La fiche écrit le signe moins et « opposée au poids du fluide déplacé » ; un encadré « Piège » explique le signe (Q.1).
- Ballon (fiche 5, Q.3) : la masse volumique de l'eau était donnée à 1 kg/m³. Elle vaut 1,0 × 10³ kg·m⁻³. Le résultat, 33 kg, est ajouté et l'erreur devient un encadré « Piège ». La simplification par g est écrite et les données de l'énoncé (masse volumique de l'eau, volume d'une sphère) sont complétées (Q.4).
- Fluide incompressible (fiche 5, Q.4) : la remarque justifiait l'hypothèse par « un laps de temps suffisamment court » pendant lequel « le corps ne se déforme pas », ce qui confond incompressible et indéformable. La définition et la remarque disent maintenant que l'incompressibilité ne dépend pas de la durée, qu'un fluide incompressible se déforme en s'écoulant sans changer de volume, et que l'hypothèse vaut pour les liquides et pour les gaz dont la pression varie peu (Q.5).
- Débit (fiche 5, Q.6) : « le terme en rouge » devient « le quotient h/Δt », pour ne plus dépendre de la couleur (Q.7).
- Régime permanent (fiche 5, Q.7) : le renvoi « voir Q.6 » devient « voir Q.7 ». Le régime permanent était dit atteint « lorsque le débit volumique se conserve », ce qui inverse la condition et la conséquence, et « deux points d'une même section » désignait deux sections de même aire. La fiche définit le régime permanent par l'indépendance au temps des grandeurs en chaque point, applique la conservation du débit à un fluide incompressible, place A et B dans deux sections droites différentes et écrit l'étape D_A = D_B (Q.8).
- Tube de Pitot : le débit, noté Q, est noté D comme dans le reste de la fiche. La valeur h = 3,2 cm n'apparaissait que dans le corrigé, sans résultat. Une question 6 en donne les données (h = 3,2 cm, d = 2,0 cm, g = 9,81 m·s⁻²) et calcule la vitesse (0,79 m·s⁻¹) et le débit (2,5 × 10⁻⁴ m³·s⁻¹, soit 15 L·min⁻¹) (exercice 3).
- Venturi : le résultat de la question 5 est encadré, D = S_A × √(2gh/(β² − 1)) ; l'expression avec le diamètre d est gardée dans une phrase. « (voir énoncé) » est retiré de la question 1 (exercice 4).
- Liquide sortant d'un réservoir : « le liquide s'écoule lentement » était affirmé sans justification. La question 1 invoque la section du réservoir, très grande devant celle de l'orifice, et la conservation du débit (exercice 5).
- Figures : les figures 3, 5 et 13 sont reprises de l'ancienne fiche ; les figures 4 (Venturi, flèches de vitesse dans le rapport des sections), 14 et 15 (lignes de courant qui convergent, axe z) sont redessinées.
- Ajouts : origine de la poussée d'Archimède (Q.2), statique des fluides (Q.10), effet Venturi (Q.9), encadrés Piège, Remarque et Rédaction, question 6 de l'exercice 3, exercices 1, 2, 6 et 7.

Fiche 4 (Fluides), thème 3 « chute dans un fluide » :

- Chute libre et frottement (fiche 1, Q.32) : « objet en chute libre soumis à une force de frottement » est contradictoire, puisqu'en chute libre le poids est la seule force. La fiche parle de chute dans un fluide (Q.11).
- Intensité de la pesanteur (fiche 1, Q.32) : g était appelé « constante de gravitation » et parfois noté g0. La constante de gravitation est G ; g est l'intensité de la pesanteur.
- Sens de l'accélération (fiche 1, Q.32) : « l'accélération est toujours dans le sens du mouvement » est faux. Elle s'annule à la vitesse limite, et un objet lancé vers le bas plus vite que sa vitesse limite ralentit (remarque de Q.16).
- Goutte de 3 mm avec un frottement proportionnel à la vitesse (fiche 1, Q.32) : pour une goutte de cette taille, le frottement de l'air varie plutôt comme v². L'application porte maintenant sur une gouttelette de brouillard de 10 µm (Q.13 et Q.14).
- Première personne (fiche 1, Q.32) : « Je propose… » et « Je vous en propose… » sont retirés.
- Renvoi (fiche 1, Q.31) : « consulter la fiche exercice n°5 » renvoie maintenant à l'exercice 2 de la même fiche, dans l'encadré « Piège » de Q.11 ; le corrigé de Q.11 renvoie en plus à Q.1 pour la poussée d'Archimède.
- Figures : la courbe de vitesse de Q.32 (vitesse limite de 53 m·s⁻¹) et le thermomètre de Galilée étaient scannés de sujets officiels. Ils sont redessinés à partir d'un modèle chiffré (exercices 8 et 9). Le thème 3 ne contient pas de tableau de valeurs : l'accélération initiale se lit sur la courbe (Q.15, exercice 9, question 4).
- Ajouts : analyse dimensionnelle (Q.12), courbe de vitesse d'une bille dans une huile (Q.15), frottement négligeable ou non (Q.16, d'après Amérique du Nord 2025), applications numériques, deux exercices.

Fiche 5 (Énergie) :

- Température d'équilibre de la Terre (ancienne Q.16 de la fiche 2) : le calcul oubliait que la Terre reçoit le rayonnement sur un disque et émet par toute sa surface. La formule écrite donnait 394 K alors que le texte annonçait 6 °C. Le calcul est refait avec le facteur 4 : 279 K, soit 6 °C, puis 255 K, soit −18 °C, avec l'albédo. La phrase « la puissance reçue est réfléchie » est remplacée par « absorbée puis émise ».
- Loi des gaz parfaits (ancienne Q.53 de la fiche 4) : « 1 bar = 10⁵ Pa = 1,01325 atm » est faux. Il faut lire 1 bar = 10⁵ Pa et 1 atm = 1,013 × 10⁵ Pa. La conversion des températures passe de 273 à 273,15.
- Résistance thermique (ancienne Q.10 de la fiche 2) : la définition parlait d'une « élévation de température ». Elle est récrite : la résistance thermique s'oppose au transfert thermique qui traverse la paroi, la conductivité traduit la capacité du matériau à conduire la chaleur.
- Vocabulaire aligné sur le programme : « capacité thermique » au lieu de « capacité calorifique », « transfert thermique » au lieu de « chaleur » quand il s'agit de la grandeur Q, « dihydrogène » au lieu d'« hydrogène ».
- Notation : le flux thermique est noté Φ, comme dans les sujets ; le flux surfacique φ. La numérotation des équations repart de (1) dans chaque corrigé et les renvois entre questions suivent les nouveaux numéros.
- Deux passages désignaient une équation par sa couleur ou par « je recommande » : ils sont récrits pour ne dépendre ni de la couleur ni de la première personne.

Fiche 6 (Ondes) :

- Célérité du son et température (fiche 6, Q.5) : le calcul utilisait la racine de la température en degrés Celsius, avec θ0 = 0 °C, ce qui revient à diviser par zéro, et le texte parlait d'une célérité « proportionnelle à la température du son ». Le modèle porte maintenant sur la température absolue en kelvin, avec une application chiffrée (−56 °C à 11 km d'altitude) ; les vitesses de l'application, données en km/h dans l'ancienne fiche, sont écrites en m·s⁻¹.
- Spectre électromagnétique (fiche 6, Q.6) : les micro-ondes étaient dites « de l'ordre du micromètre », ce qui est le domaine de l'infrarouge. Elles vont du millimètre au mètre environ ; un encadré « Piège » le signale.
- Effet Doppler, émetteur qui s'éloigne (fiche 6, Q.17) : la formule f′ = f × (c − v)/c, obtenue en échangeant f et f′, est fausse. La fiche établit f_R = f_E × c/(c + v) à partir des fronts d'onde. « Le son perçu par l'émetteur » devient « par le récepteur » ; « voire » devient « voir ».
- Effet Doppler-Fizeau (fiche 6, Q.18) : « de plus en plus » est retiré (le décalage est fixe pour une vitesse donnée) ; il est précisé que v est la vitesse radiale et que la relation vaut pour v petit devant c.
- Son (fiche 2, Q.36 à Q.38) : « je recommande » et « intensité sonore reçu » sont corrigés ; les ordres de grandeur douteux (seuil de danger à 95 dB comme un klaxon, conversation dans la rue à 80 dB) sont remplacés par une échelle usuelle (conversation 50 à 60 dB, risque au-delà de 80 à 85 dB, douleur à 120 dB).
- Diffraction (fiche 1, Q.8) : la condition « largeur de la fente petite devant la longueur d'onde » devient « du même ordre de grandeur, ou plus petite » ; « monochromatique (une seule source de lumière) » était une mauvaise définition, et la diffraction ne demande pas une lumière monochromatique ; la « hauteur » d'une fente fine est remplacée par sa largeur, seule utile ; la référence à une couleur de figure est retirée.
- Largeur de la tache (fiche 1, Q.10) : la distance utile est celle de la fente à l'écran, non « de la source à l'écran ». La phrase « pour la lecture d'un CD, on voit une lumière bleue » était fausse (CD en infrarouge, DVD en rouge, Blu-ray en bleu-violet) et suivie de caractères illisibles.
- Ouverture circulaire (fiche 1, Q.11) : la remarque était inachevée ; elle est remplacée par les conséquences de la diffraction sur le pouvoir de résolution des instruments.
- Interfrange (fiche 1, Q.14) : l'écart entre les fentes était noté a dans la formule et b dans la légende ; il est noté b partout. « Je rappelle » est retiré.
- Figures : celles des anciennes questions de diffraction et d'interférences venaient de sujets officiels (2021, 2022 et 2023) et une image de cercle chromatique était reprise ; toutes sont redessinées ou retirées.
- Ajouts : atténuation par absorption (Q.11), couleurs des couches minces (Q.24), mesure d'une vitesse par réflexion (Q.27), applications numériques pour chaque question, cinq exercices dont quatre d'après des sujets de 2025 et 2026.

Fiche 7 (Lumière) :

- Lunette afocale (fiche 1, Q.4) : le titre demandait de « vérifier qu'une lentille est afocale ». C'est la lunette, formée de deux lentilles, qui est afocale.
- Grossissement (fiche 1, Q.7) : la démonstration appelait O2A1 « la distance focale f2′ de la première lentille ». C'est celle de l'oculaire, la deuxième lentille ; un encadré « Piège » le rappelle.
- Diffraction par l'objectif (fiche 1, remarque de Q.7) : θdiff était présenté comme « l'angle réel sous lequel l'objet arrive sur la lunette », et la conclusion disait que la diffraction « empêche l'objet d'être vu à travers la lentille ». θdiff est le rayon angulaire de la tache de diffraction : si θ < θdiff, les deux détails ne sont pas séparés, quel que soit le grossissement. Q.11 le formule ainsi, avec les lunettes de Galilée et de Huygens.
- Figures (fiche 1) : les schémas de la lunette venaient du sujet Métropole 2023 et le texte renvoyait à des rayons « vert », « orange » et « rose ». Les figures sont redessinées et aucun rayon n'est plus désigné par sa couleur.
- Niveau fondamental (fiche 6, Q.8) : la fiche donnait l'état fondamental de l'hydrogène, −13,6 eV, à côté de diagrammes qui sont ceux du sodium (E0 = −5,14 eV), sans le dire. Le diagramme est maintenant nommé, et l'hydrogène a son propre exercice (exercice 3).
- Cercle chromatique (fiche 6, Q.9) : « Je le remets ici » et l'image, sans rapport avec le calcul, sont retirés.
- Raie d'absorption (fiche 6, Q.12) : la mention « hors programme » était fausse, les spectres d'absorption sont au programme (Q.16). « 1,09 Ev » et « 1ev » deviennent « 1,09 eV » et « 1,00 eV ».
- Travail d'extraction (fiche 6, Q.13) : « travail d'extraction d'un photon » et « arracher un électron d'un atome métallique » sont corrigés : c'est l'énergie minimale à fournir à un électron pour le faire sortir du métal.
- Notations : la fréquence est notée ν, comme dans le programme et les sujets récents (l'ancienne fiche écrivait f) ; l'éclairement est noté E_e pour ne pas le confondre avec une énergie ; les distances focales sont écrites f′1 et f′2.
- Ajouts : construction de l'image par une lentille (Q.1), objet à l'infini (Q.3), mise au point (Q.4), description de l'effet photoélectrique (Q.17), droite de Millikan (Q.20), cellule photovoltaïque et énergie de gap (Q.22), caractéristique d'un panneau (Q.23), applications numériques, quatre exercices dont deux d'après des sujets de 2026.

Fiche 8 (Circuit RC) :

- Microphone ou Millikan (fiche 2, Q.17) : le titre annonçait le capteur d'un microphone électrostatique, mais la figure, scannée d'un sujet, montrait le dispositif de Millikan (pulvérisateur, lunette d'observation). La question devient générale (Q.2, figure redessinée) et le microphone fait l'objet de l'exercice 1.
- Court-circuit (fiche 2, Q.19) : l'explication par la seule loi des mailles (« la tension s'annule subitement ») est remplacée par la constante de temps : la résistance du fil est très faible, donc τ = RC est presque nulle et la décharge quasi instantanée (remarque de Q.13). Le cas d'un interrupteur en dérivation, générateur branché, est gardé dans cette remarque : u_C reste nulle, ce qui remet à zéro une temporisation ou bloque une alarme.
- Première personne (fiche 2, remarques de Q.20 et Q.21) : « je préfère préciser pour tous vous tenir alertes » et « je recommande la 1ère méthode » sont retirés ; la fiche explique pourquoi la méthode des 63 % est plus précise que la tangente.
- Solution de la charge (fiche 2, Q.20) : l'ancienne question se limitait à vérifier la solution. Le programme demande d'établir et de résoudre l'équation : Q.7 la résout, la vérification reste en encadré « Méthode ».
- Remarque de Q.21 (fiche 2) : « circuite » est corrigé ; l'exemple d'un flash prêt 2 µs après le début de la charge, peu réaliste, est remplacé par une veilleuse qui s'allume au bout de 32 ms ; les graphiques notaient « us » au lieu de µs.
- Sonde thermique (fiche 2, Q.24) : les figures étaient scannées d'un sujet de 2005 ; la courbe d'étalonnage est redessinée avec des valeurs originales (Q.19), et la façon de l'obtenir est décrite.
- Énergie (fiche 2, Q.25) : « Par définition » est retiré : la relation ½CU² est un résultat, que l'énoncé fournit.
- Décharge (fiche 2, Q.26) : la mention « Non exigible : la solution de l'équation différentielle est… » était fausse ; le programme demande de résoudre l'équation de décharge (Q.13).
- Convention (fiche 2, Q.26 et Q.27) : la décharge plaçait le condensateur en convention générateur (i = −dq/dt) sans le signaler, alors que la charge était en convention récepteur. La fiche garde la convention récepteur partout, avec i < 0 pendant la décharge ; une remarque présente l'autre convention (Q.15).
- Vocabulaire repris : « diélectrique » (Q.4) et « temps caractéristique » (Q.8, L'essentiel). Le raisonnement par les potentiels (V_A, V_B, armature positive) est gardé en Q.2.
- Ajouts : intensité et débit de charges (Q.1), ordres de grandeur des capacités (Q.4), effet de la géométrie (Q.5), intensité pendant la charge (Q.11), linéarisation d'une décharge (Q.16), principe des capteurs capacitifs (Q.17), applications numériques, quatre exercices dont trois d'après des sujets de 2026.

## Fiche 9 : Acides et bases

Fiche 9, faite le 12 novembre 2026 : « Acides et bases : solutions, pH, force des acides et diagrammes » (dossier `pc-09-acides-bases`). Elle reprend les pages 8 à 33 de l'ancienne fiche 4 (chimie, Q.1 à Q.19) et ses Q.26 à Q.29 (pages 48 à 57). Les questions sont renumérotées. Une question reprenant l'ancienne Q.26 a été ajoutée pendant les corrections (Q.17) : la fiche compte 23 questions et 4 exercices, et les questions qui suivent Q.16 sont décalées d'un rang.

| Fiche 9 (2026) | Édition 2024, fiche 4 |
|---|---|
| Q.1 | Q.1, Q.2 |
| Q.2 | Q.3 |
| Q.3 | Nouvelle question |
| Q.4, Q.5 | Q.4, avec la remarque sur « environ » (une éprouvette graduée suffit) et le vocabulaire « dilution au 1/100e » (mini-exercice de Q.4) |
| Q.6 | Q.13 (réactif limitant, avancement maximal) et sa remarque 1 (mélange stœchiométrique, mélange équimolaire) |
| Q.7 | Q.14 et le mini-exercice des Q.17 à Q.19 (sans sa sous-question sur le dosage par excès, reprise en fiche 10, Q.15) |
| Q.8 | Q.5, Q.6 et Q.7 (exemple de l'acide butanoïque et des couples de l'eau) |
| Q.9 | Q.7 (sous-question sur l'ammoniac et l'eau ; la question principale, retrouver les deux couples d'une équation donnée, est la troisième application) |
| Q.10 | Q.8 (définition du pH) |
| Q.11 | Q.7 (autoprotolyse de l'eau), Q.8 (expression de [HO⁻]) |
| Q.12 | Q.9 et la sous-question de Q.8 (ajout d'acide chlorhydrique à une solution de pH 6,3 : pH 1,70) |
| Q.13 | Q.9, Q.14, Q.15 (τ = [H3O+]f/C0) et Q.27 ; tableau d'avancement littéral de l'acide avec l'eau et avancement volumique (Q.11 et Q.12, en remarque) |
| Q.14 | Q.16 (τ = [HO⁻]f/C0, réaction de la base avec l'eau) |
| Q.15, Q.16 | Nouvelles questions (force des acides, constante d'acidité) ; elles reprennent aussi la Q.27 (Q.15) et les Q.12 et Q.28 (Q.16) |
| Q.17 | Q.26 (équation du second degré : état final d'une solution d'acide faible), question ajoutée pendant les corrections |
| Q.18 à Q.22 | Nouvelles questions (diagrammes, indicateurs colorés), qui couvrent aussi l'ancienne Q.29 (Q.18 à Q.20 et Q.22) ; la remarque de Q.21 sur le papier pH reprend la remarque 1 de la Q.34 (titrage pH-métrique) |
| Q.23 | Q.10 (solution tampon), avec les trois façons de préparer un tampon en remarque |
| Exercices 1 à 4 | Nouveaux, construits d'après des sujets de 2025 et 2026 |

Erreurs de l'édition 2024 corrigées dans la fiche 9 :

- Un acide n'est pas « d'autant plus fort qu'il contient d'atomes d'hydrogène » : la force se compare avec le pKA (Q.8, Q.15).
- « Oxonium ou hydronium » désignait deux ions différents : H3O+ est l'ion oxonium, HO− l'ion hydroxyde (Q.8).
- Le « titre massique » était employé pour la concentration massique : la fiche distingue titre massique, sans unité, et concentration massique, en g/L (Q.2, Q.3).
- Le protocole de dilution faisait « boucher la pipette » : c'est la fiole jaugée que l'on bouche (Q.4).
- Le mini-exercice arrondissait 10/30 à 0,3 mol : la nouvelle version part de 9,0 g pour des valeurs exactes (Q.7). La quantité d'éthanol y est de 0,15 mol, comme celle d'acide : le mélange est équimolaire, aucun réactif n'est en excès, et le taux d'avancement final de 0,67 correspond à K = 4, comme dans la fiche 12, Q.4.
- Le volume molaire était écrit « 24 mol/L » : il vaut 24,0 L/mol (Q.1).
- « L'avancement final vaut xmax » était présenté comme général : ce n'est vrai que pour une transformation totale (Q.7).
- Les extraits scannés de sujets du BAC ne sont pas repris : figures redessinées, énoncés d'après réécrits.

## Fiche 10 : Dosages

Fiche 10, faite le 12 novembre 2026 : « Dosages : étalonnage, titrages pH-métrique, conductimétrique et colorimétrique » (dossier `pc-10-dosages`). Elle reprend les pages 34 et 35 (conductivité), l'ancienne Q.24 (dans les pages 36 à 57) et les pages 58 à 74 (dosage et titrage, Q.30 à Q.38) de l'ancienne fiche 4. Les anciennes Q.26 à Q.29 (constante d'acidité, acide faible, diagrammes) sont couvertes par la fiche 9 (Q.13 à Q.22) ; les anciennes Q.21 à Q.23, Q.25 et Q.39 à Q.41 (quotient de réaction, oxydoréduction, piles) reviennent à la fiche 12.

| Fiche 10 (2026) | Édition 2024, fiche 4 |
|---|---|
| Q.1 | Q.37 (mini-exercice : couleur complémentaire) et Q.38 (choix de la longueur d'onde, nouvel exemple ; le cas de deux espèces colorées est repris dans une remarque du corrigé) |
| Q.2 | Q.37 (k = ε × ℓ, A = k₁ × Cm, spectres de solutions de concentrations différentes) |
| Q.3 | Q.36 (conditions de validité de la loi de Beer-Lambert : lumière monochromatique, solution homogène et peu concentrée, soluté stable à la lumière) |
| Q.4 | Q.20 (usage inverse de la loi de Kohlrausch ; conductivité d'un acide faible, en remarque) |
| Q.5 | Nouvelle question (étalonnage conductimétrique) ; la remarque reprend la condition de validité de la loi de Kohlrausch (Q.36) ; Q.30, sous-question (autre méthode que le titrage) |
| Q.6 | Nouvelle question (choix d'une méthode) ; Q.30 (définition de doser) et sa sous-question (autre méthode que le titrage) |
| Q.7 | Q.32 et la définition de l'équivalence (Q.31) |
| Q.8 | Q.31 |
| Q.9 | Q.33 |
| Q.10 | Q.34 (titrage colorimétrique) |
| Q.11 | Q.34 (titrage pH-métrique), avec la remarque 2 (titrage d'une base : pH décroissant, dérivée négative, sans figure) |
| Q.12 | Q.24 |
| Q.13 | Q.34, sous-question (choix d'un indicateur, avec le cas de deux indicateurs convenables) ; Q.35 (chou rouge) n'est pas reprise ici, la notion est en fiche 9, Q.21 |
| Q.14 | Nouvelle question (deux équivalences) |
| Q.15 | Nouvelle question (prise d'essai) ; dosage par excès en remarque (sous-question du mini-exercice des anciennes Q.17 à Q.19) |
| Q.16 | Q.31 (écart relatif et quotient z ; causes possibles d'un écart, en remarque) |
| Q.17 | Q.36 |
| Q.18 | Q.34 (titrage conductimétrique) ; remarque sur « environ » (ancienne Q.4) |
| Q.19 | Nouvelle question (titrage par précipitation) ; l'ancienne fiche citait déjà un titrage conductimétrique des ions chlorure (extrait de sujet et remarque, pages 67 et 68) |
| Exercices 1 à 4 | Nouveaux, construits d'après des sujets de 2025 et 2026 |

Erreurs de l'édition 2024 corrigées dans la fiche 10 :

- Q.20 égalait la concentration finale en ions oxonium à l'avancement final, qui est une quantité de matière, et écrivait « λ(H30+) » : la fiche 10 distingue concentration et quantité de matière (Q.4).
- Les unités de la loi de Kohlrausch n'étaient pas précisées : les concentrations s'y expriment en mol/m³ (Q.4, Q.5).
- L'équation générique d'un titrage était écrite avec une double flèche : une réaction support de titrage est totale (Q.7).
- La loi de Beer-Lambert était limitée à des concentrations « de l'ordre de 10⁻⁴ mol/L » : la condition utile est de rester dans le domaine de la gamme d'étalonnage, en diluant si nécessaire (Q.3).
- Les extraits scannés de sujets du BAC ne sont pas repris : figures redessinées, énoncés d'après réécrits.

## Fiche 11 : Cinétique et radioactivité

Fiche 11, faite le 12 novembre 2026 : « Cinétique chimique et radioactivité : vitesse, loi d'ordre 1, mécanismes et décroissance radioactive » (dossier `pc-11-cinetique-radioactivite`). Elle reprend les pages 50 à 64 de l'ancienne fiche 3 (Q.33 à Q.46), l'exemple de la trempe (Q.32, exemple 2, page 49) et les pages 16 à 34 de l'ancienne fiche 6 (Q.19 à Q.37).

| Fiche 11 (2026) | Édition 2024 |
|---|---|
| Q.1 | Fiche 3 : Q.32, exemple 2 (trempe, page 49) et remarques de Q.37 |
| Q.2 | Fiche 3 : Q.33 |
| Q.3 | Fiche 3 : Q.39, avec la remarque sur une vitesse qui peut d'abord augmenter (produit qui joue le rôle de catalyseur) |
| Q.4 | Fiche 3 : Q.38 |
| Q.5 | Nouvelle question (choix d'une méthode de suivi cinétique) |
| Q.6 | Fiche 3 : Q.39 (sous-question sur les trois expériences) |
| Q.7 | Fiche 3 : Q.34 et Q.40, méthode 3 (v en fonction de [A] : droite passant par l'origine, de coefficient directeur k) |
| Q.8 | Fiche 3 : Q.35, Q.36 |
| Q.9 | Fiche 3 : Q.37 |
| Q.10 | Fiche 3 : Q.40, méthodes 1 et 2 |
| Q.11 | Nouvelle question (prévoir une durée avec une loi d'ordre 1) |
| Q.12 | Fiche 3 : Q.41 à Q.43 |
| Q.13 | Fiche 3 : Q.45, avec les molécules à plusieurs sites donneurs et accepteurs |
| Q.14 | Fiche 3 : Q.46 |
| Q.15 | Fiche 3 : Q.44 |
| Q.16 | Fiche 3 : remarque 2 de Q.37 |
| Q.17 | Fiche 6 : Q.20, Q.22, Q.23 |
| Q.18 | Fiche 6 : Q.19, Q.21 |
| Q.19 | Fiche 6 : Q.24, Q.25 (dont le nom de lois de Soddy) |
| Q.20 | Fiche 6 : Q.37 (dont le nom de diagramme de Segrè) |
| Q.21 | Fiche 6 : Q.26, Q.30, Q.31 (la seconde sous-question de Q.31, vérifier qu'une expression est solution, est dans la méthode de Q.8 et à l'exercice 5, question 3) |
| Q.22 | Fiche 6 : Q.27, Q.28, Q.34 |
| Q.23 | Fiche 6 : Q.29, Q.33, Q.35 |
| Q.24 | Fiche 6 : Q.36 et sa remarque 1 (N = m / m_atome) |
| Q.25 | Fiche 6 : Q.32 et remarques de Q.33 ; N.B. de Q.32 (N0 − N noyaux désintégrés), NB de Q.33 (de l'âge à la date), application « âge de la Terre » de Q.33 (potassium 40, dans une remarque) |
| Q.26 | Fiche 6 : mini-exercice de Q.26 et sa remarque 2 ; dernière remarque de Q.31 (n = A × Δt, ln n en fonction du temps) |
| Exercices 1 à 5 | Nouveaux, construits d'après des sujets de 2025 et 2026 |

Tout le contenu des anciennes pages de cinétique et de radioactivité est repris. Les éléments d'abord laissés de côté (vitesse qui augmente d'abord, méthode 3 de Q.40, plusieurs sites donneurs et accepteurs, application « âge de la Terre », N.B. de Q.32, NB de Q.33, remarque 1 de Q.36, dernière remarque de Q.31) l'ont été pendant les corrections.

Erreurs de l'édition 2024 corrigées dans la fiche 11 :

- Fiche 3, Q.37 : le passage de ln(1/2) = ln(e^(−k·t1/2)) à ln(1/2) = −k·t1/2 était justifié par « ln(a) = ln(b) ⇒ a = b ». La propriété utilisée est ln(e^x) = x (Q.9).
- Fiche 3, Q.39 : « plus la concentration initiale des réactifs est importante, plus le taux d'avancement l'est aussi ». Pour une transformation totale, le taux d'avancement final vaut 1 ; c'est la quantité de produit formé qui augmente (Q.6).
- Fiche 3, Q.40, méthode 1 : la concentration d'un produit était dite doubler à chaque durée t1/2. C'est la concentration du réactif qui est divisée par deux à chaque temps de demi-réaction (Q.10).
- Fiche 3, Q.40, méthode 3 : des µmol·L⁻¹·s⁻¹ étaient divisées par des mmol·L⁻¹, d'où k = 2 s⁻¹ au lieu de 2,0 × 10⁻³ s⁻¹ (Q.7, encadré Piège).
- Fiche 3, Q.44 : les catalyseurs étaient donnés comme exemples d'intermédiaires réactionnels. Un catalyseur est consommé puis régénéré : il est présent au début et à la fin, au contraire d'un intermédiaire (Q.15).
- Fiche 6, Q.21 : quatre types de radioactivité étaient annoncés, émission γ comprise. L'émission γ est la désexcitation du noyau fils, pas une désintégration (Q.18).
- Fiche 6, Q.24 : une désintégration y faisait changer d'« espèce chimique » ; elle change l'élément chimique (Q.19).
- Fiche 6, Q.25 : le noyau X était appelé « molécule », et la remarque sur les nombres de masse sous-entendus dans un extrait de classification ne vaut pas pour une désintégration α (Q.19).
- Fiche 6, mini-exercice de Q.26 : λ était donné en s⁻¹ alors que les durées étaient en jours ; la pente vaut 5,0 × 10⁻³ jour⁻¹ (Q.26).
- Fiche 6, Q.27 : l'autre nom de la demi-vie est « période radioactive », pas « vie » (Q.22).
- Fiche 6, Q.31 : la limite de N0 − λt quand t tend vers +∞ était donnée égale à +∞ ; elle vaut −∞, ce qui suffit à écarter cette expression (Q.21).
- Fiche 6, Q.35 : l'activité calculée à une date quelconque était appelée « activité initiale » (Q.23).
- Fiche 6, Q.36 : le carbone 12, stable, était pris comme exemple d'échantillon radioactif, avec N_A = 6,02 × 10²² mol⁻¹ au lieu de 6,02 × 10²³ mol⁻¹ (Q.24).
- Exemples remplacés sans qu'une erreur soit en cause : charge du noyau de nickel 63 à la place de celle du noyau d'hydrogène (Q.17), 1 200 désintégrations en 1,0 min à la place de 10 par minute (Q.23), iode 131 (Q.24 et Q.25, 80 jours pour une activité mille fois plus faible), carbones 14 et 11 à la place du rhénium (Q.20), valeur 0,99 et points choisis pour une pente de 5,0 × 10⁻³ jour⁻¹ (Q.26).
- Les extraits scannés de sujets du BAC et les figures de l'ancienne fiche ne sont pas repris : figures redessinées, énoncés d'après réécrits.

## Fiche 12 : Équilibre, piles et électrolyse

Fiche 12, faite le 12 novembre 2026 : « Équilibre, piles et électrolyse : quotient de réaction, sens d'évolution, oxydoréduction, piles et transformations forcées » (dossier `pc-12-equilibre-piles-electrolyse`). Elle reprend les anciennes Q.21 à Q.23 et Q.25 de la fiche 4 (quotient de réaction et constante d'équilibre) et ses pages 75 à 97 (Q.39 à Q.52 : oxydoréduction, piles, électrolyse). L'ancienne Q.24 est dans la fiche 10, les anciennes Q.53 à Q.55 (gaz parfaits) dans la fiche 5.

| Fiche 12 (2026) | Édition 2024, fiche 4 |
|---|---|
| Q.1 | Q.21 |
| Q.2 | Q.22 ; de Q.23, seule la règle de la constante de la réaction inverse (1/K) est reprise, avec le cas ClO⁻ + H3O⁺ (constante 1/K_A) |
| Q.3 | Q.25, Q.21 (critère d'évolution spontanée) |
| Q.4 | Q.45, remarque 2 (transformation totale si K > 10⁴), avec un nouvel exemple d'estérification |
| Q.5 | Q.21, remarque 2 (rien de Q.23 n'est repris ici) |
| Q.6 | Q.39 |
| Q.7, Q.8 | Q.40 (la remarque est en Q.8) |
| Q.9 | Q.41 (avec le moyen mnémotechnique du post-scriptum), Q.45, questions 1.1 à 1.3, et Q.46, remarque 1 (sens du courant lu sur un ampèremètre, encadré Méthode) |
| Q.10 | Q.42, et l'application de Q.41 à la pile au méthanol |
| Q.11 | Q.43 et Q.45, questions 1.4 et 1.5 |
| Q.12 | Q.44 et Q.45, question 1.6 |
| Q.13 | Q.46, remarque 2 et mini-exercice (capacité massique) ; la remarque 1 est en Q.9 |
| Q.14 | Q.47 |
| Q.15 | Q.48 |
| Q.16 | Q.49 et Q.51 (électrolyse de l'eau) |
| Q.17 | Q.50 (dont la relation E = U × I × Δt de la remarque 2) |
| Q.18 | Q.51 |
| Q.19 | Q.52 ; la relation entre puissance, durée et énergie de Q.50, remarque 2, est surtout en Q.17 et en Q.13 |
| Exercices 1 à 5 | Nouveaux, construits d'après des sujets de 2025 et 2026 ; la question 5 de l'exercice 2 reprend le dioxygène en excès de Q.44 |

Erreurs de l'édition 2024 corrigées dans la fiche 12 :

- Q.21 : la constante d'équilibre était notée Ka, symbole réservé à la constante d'acidité, et le cas Qr,i = K (système à l'équilibre, pas d'évolution) manquait (Q.1, Q.3).
- Q.21, remarque 1 : augmenter la concentration initiale des réactifs était dit augmenter le taux d'avancement. Ce n'est pas général : le taux d'avancement d'un acide faible diminue quand sa concentration augmente. La fiche 12 traite les cas utiles au BAC, un réactif en excès ou l'élimination d'un produit (Q.5).
- Q.22 : la constante d'équilibre de la réaction de l'ammoniac avec l'eau, puis celle de la réaction inverse, étaient appelées « constante d'acidité » : ce sont des constantes d'équilibre (Q.2).
- Q.44 et Q.50 : la constante de Faraday était donnée en coulombs ; elle s'exprime en C·mol⁻¹ (Q.12, Q.17).
- Q.45 : l'avancement maximal retenu valait 1,9 × 10⁻² mol, celui de l'aluminium, alors que le réactif limitant, l'ion cuivre(II), donne 1,3 × 10⁻² mol. La lame d'aluminium était aussi dite entièrement consommée : il en reste 1,0 × 10⁻² mol (Q.12).
- Q.51 : les ions H⁺ étaient présentés comme réactif limitant de l'électrolyse. Dans une électrolyse, c'est la charge électrique imposée par le générateur, Q = I × Δt, qui fixe la quantité de produit formé (Q.18).
- Les extraits scannés de sujets du BAC et les figures de l'ancienne fiche ne sont pas repris : figures redessinées, énoncés d'après réécrits.

## Fiche 13 : Synthèse organique

Fiche 13, faite le 12 novembre 2026 : « Synthèse organique : structure des molécules, réactions, stratégie de synthèse, purification, analyse et rendement » (dossier `pc-13-synthese-organique`). Elle reprend les pages 5 à 49 de l'ancienne fiche 3 (Q.1 à Q.32). Les anciennes Q.33 à Q.46 (cinétique, mécanismes) sont dans la fiche 11.

| Fiche 13 (2026) | Édition 2024, fiche 3 |
|---|---|
| Q.1 | Q.1 et Q.5 (formules, alcanes et alcènes ; hydrocarbures saturés et insaturés) |
| Q.2 | Q.7, avec les classes d'alcools, d'amines et d'amides |
| Q.3 | Q.2 à Q.4 et sous-questions de Q.7 (nomenclature jusqu'à huit carbones, cycloalcanes, halogénoalcanes, alcènes, amines, numérotation du groupe alkyle d'un ester) |
| Q.4 | Q.6 et Q.8 (l'isomérie Z/E est gardée comme complément hors programme) |
| Q.5 | Q.9 et Q.10 (craquage, reformage), avec les polymères synthétiques et l'écriture du motif entre crochets |
| Q.6 | Q.11 |
| Q.7 | Nouvelle (catégories acide-base et oxydoréduction) |
| Q.8 | Q.13 |
| Q.9 | Q.14 et son mini-exercice (marquage isotopique, dans le corrigé) ; parties hydrophile et lipophile d'un savon (Q.32, exemple 1) |
| Q.10 | Nouvelle (séquence à partir d'une banque de réactions) |
| Q.11 | Q.12 |
| Q.12 | Q.18 et Q.21, pictogrammes compris ; légende du montage à reflux, dont le support élévateur |
| Q.13 | Q.17 (courbe sans catalyseur, catalyse homogène et hétérogène) et fin de Q.30 (optimisation du rendement) ; « pour information » de Q.14 (anhydride d'acide, meilleur rendement) |
| Q.14 | Q.25 et son mini-exercice (forme basique prédominante à pH supérieur au pKA, rôle du séchage) ; papier pH (Q.21, remarque 3) |
| Q.15 | Q.19, Q.22 et Q.23 (précipitation) ; définition de la solubilité (fiche 4, Q.3) ; la filtration simple est décrite en une phrase, sans schéma |
| Q.16 | Q.24 et Q.26 (montage d'hydrodistillation) ; écart des températures d'ébullition et colonne de Vigreux (Q.24) |
| Q.17 | Q.31 et sa sous-question (pureté : titrage comparé à la masse pesée, avec renvoi à la fiche 10, Q.15 et Q.16) ; température de fusion (Q.18) |
| Q.18 | Q.15 et Q.16 (principe du spectre infrarouge, transmittance) |
| Q.19 | Q.27, Q.29 (cas avec coefficients) et Q.30 |
| Q.20 | Q.32 |
| Exercices 1 à 5 | Nouveaux, construits d'après des sujets de 2025 et 2026 |

Tout le contenu de l'ancienne fiche 3 est repris, à trois exceptions voulues : l'exemple dessiné de formule développée (éthanoate de butyle, ancienne Q.7), dont seule la définition est en Q.1 ; le schéma de la filtration simple (ancienne Q.22), remplacé par une phrase en Q.15 ; le nom 2-chloro-3-méthylbutane (ancienne Q.4), dont la phrase sur les halogènes est en Q.3. Ailleurs dans la série : Q.20 (masse à peser pour préparer une solution) et Q.28 (pourcentage massique) sont dans la fiche 9 (Q.1 et Q.2), avec un renvoi depuis la fiche 13 (Q.19) ; la relation ρ = d × ρeau, étape 3 de Q.27, est dans la fiche 9 (Q.3) ; l'exemple 2 de Q.32 (trempe) est dans la fiche 11 (Q.1), et la synthèse d'un savon dans la fiche 11 (exercice 3), sans renvoi depuis la fiche 13. La fiche 13 renvoie à la fiche 9 (Q.1 et Q.2 depuis Q.19, Q.18 depuis Q.14), à la fiche 10 (Q.15 et Q.16 depuis Q.17) et à la fiche 12 (Q.5 depuis Q.13).

Erreurs de l'édition 2024 corrigées dans la fiche 13 :

- Q.3 : le dessin légendé « 1,4 diméthylhexane » représentait un cycle ; son nom est 1,4-diméthylcyclohexane (Q.3).
- Q.4 : l'halogène d'un halogénoalcane était appelé « ramification ». C'est un substituant, nommé en préfixe (chloro, bromo) ; une ramification est une chaîne carbonée (Q.3).
- Q.6 : la représentation Z était décrite avec les groupes méthyle « dans le même plan ». Les atomes liés à la double liaison sont tous dans un même plan : c'est leur position du même côté de la double liaison qui définit Z (Q.4).
- Q.9 : la polymérisation était limitée à l'allongement de la chaîne d'un hydrocarbure. Elle concerne aussi des monomères porteurs de groupes caractéristiques, et les polymères naturels (cellulose, protéines) ne sont pas des hydrocarbures (Q.5).
- Q.12 : la protection d'une amine était dite faite « par le tert-butylcarbamate ». Le carbamate de tert-butyle est le groupe formé ; le réactif est le dicarbonate de di-tert-butyle (Q.11 traite la protection sans nommer de réactif).
- Q.14 : estérification et hydrolyse étaient dites « lentes (leur taux d'avancement est inférieur à 1) ». La lenteur concerne la vitesse ; un taux d'avancement final inférieur à 1 traduit une transformation non totale (Q.9, Q.13).
- Q.15 : la spectroscopie UV-visible était opposée à l'infrarouge par l'emploi d'« une source lumineuse ». Le rayonnement infrarouge est lui aussi une lumière ; seul le domaine de longueurs d'onde change (Q.18).
- Q.17 : le facteur cinétique de la catalyse hétérogène était « la surface de contact entre les réactifs », celui de la catalyse homogène « la concentration molaire des réactifs ». Ce sont la surface de contact entre le catalyseur et les réactifs, et la concentration du catalyseur (la fiche 13 garde le rôle du catalyseur, Q.13).
- Q.22 : le vide était dit créé « dans l'entonnoir ». La trompe à eau abaisse la pression dans la fiole à vide, sous le filtre, ce que montre la figure 23 (Q.15).
- Q.25 : la non-miscibilité des phases était présentée comme une affaire de densité. Deux liquides non miscibles se séparent, et la densité fixe seulement lequel est au-dessus. Le passage de l'acide en ions dans la phase aqueuse, le sel NaA étant très soluble, était aussi appelé « précipitation » (Q.14).
- Q.26 : le liquide recueilli lors d'une hydrodistillation était appelé « filtrat » ; c'est un distillat (Q.16).
- Q.30 : augmenter la concentration initiale des réactifs ou la surface de contact était présenté comme un moyen d'améliorer le rendement. Ces facteurs accélèrent la transformation sans changer l'état final ; seuls un réactif en excès ou l'élimination d'un produit améliorent le rendement (Q.13).
- Q.31 : « tâche » au lieu de « tache », et une tache unique prise comme preuve de pureté. Une seule tache ne prouve pas la pureté : une impureté peut migrer à la même hauteur ou ne pas être révélée ; on complète par une température de fusion ou par un titrage comparé à la masse pesée (Q.17).
- Les extraits scannés de sujets du BAC et les figures de l'ancienne fiche ne sont pas repris : figures redessinées, énoncés d'après réécrits.
