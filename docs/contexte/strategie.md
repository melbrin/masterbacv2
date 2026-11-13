# MasterBac 2027 : des fiches de l'élite au coach de l'année

> Copie du document de stratégie du 11 novembre 2026, gardée comme contexte. Depuis, trois choses ont changé : la physique-chimie passe avant les maths ; ses six fiches sont devenues quatorze, à jour des sessions 2025 et 2026 ; le calendrier est celui du plan d'implémentation. En cas d'écart, `docs/01-cahier-des-charges.md` et `docs/05-plan-de-livraison.md` font foi.

2026-11-11 · Yane

## En bref

Nous arrêtons de vendre des pages et nous vendons la prochaine note. Les onze fiches deviennent la base d'exercices de l'application, qui prépare chaque DS, puis le bac blanc, puis le bac.

- **Mise à jour.** 33 sujets de maths et 33 de physique-chimie sont tombés en 2025 et 2026, soit environ 230 exercices. Nous en réécrivons une soixantaine à notre façon et nous ajoutons ce que ces sujets demandent et que les fiches n'ont pas : vrai ou faux à justifier, Python, incertitudes, exercices de synthèse, rédaction.
- **Format.** Une seule base d'exercices, lue par l'application, sans export PDF (décidé le 11 novembre). Le cahier imprimé reste un produit à tester au printemps.
- **Système.** Six usages pour l'élève : la séance du jour, le mode DS, les cours et quiz, les niveaux 10, 14 et 18, les sujets du bac, le suivi parents.
- **Vente.** Un Pass Bac 2027 à 79 € au centre, un mensuel à 9,99 €, un Pack BAC à 149 €, et trois stages en direct inclus dans le Pass.
- **Calendrier.** La physique-chimie d'abord (ordre revu le 11 novembre) : fiches mises à jour au format Word, puis prototype de l'application. Les dates sont à recaler ; la cible d'ouverture reste le 15 janvier.
- **À trancher.** Six décisions, listées à la fin.

## Nous vendons la prochaine note, pas 800 pages

Le contenu n'est plus rare. Les sujets du bac et leurs corrigés sont gratuits chez l'[APMEP](https://www.apmep.fr/Annales-Terminale-Generale) en maths et chez [Labolycée](https://www.labolycee.org/) en physique-chimie. Un livre de plus de 400 exercices corrigés coûte [14,95 €](https://www.editions-hatier.fr/node/29839), et Kartable couvre toutes les matières pour [9,99 € par mois](https://www.kartable.fr/premium).

Ce qui reste rare pour un élève de terminale : savoir quoi travailler ce soir, être corrigé sur ce qu'il a écrit, et tenir huit mois. C'est le travail d'un professeur particulier. C'est ce que l'application doit faire avec nos exercices.

L'élève vit avec trois échéances, et le PDF n'en sert qu'une.

| Échéance | Quand | Ce qui se joue |
| --- | --- | --- |
| Le prochain DS | toutes les deux à trois semaines en général | la note du bulletin, et l'angoisse du moment |
| Le dossier | vœux Parcoursup du 18 janvier au 11 mars 2027, confirmation le 1er avril | les bulletins des deux premiers trimestres partent dans le dossier |
| Le bac | maths et physique-chimie les 16 et 17 juin 2027 | coefficient 16 chacune, soit 32 % de la note finale à elles deux |

Les fiches ne répondent aujourd'hui qu'à la troisième échéance, et le compte vit au même rythme : 10 000 vues par mois hors saison, plus de 300 000 en période d'examens (chiffres du plan 2027). Le mode DS donne une raison d'acheter dès novembre.

## Les onze fiches : un stock solide, arrêté à 2024, sous deux marques

Les fiches pèsent 807 pages, 114 exercices de maths et 222 questions de physique-chimie. Le fond est bon. Il s'arrête à la session 2024 et sa forme change d'une fiche à l'autre.

|  | Maths | Physique-chimie |
| --- | --- | --- |
| Fiches et pages | 5 fiches, 428 pages | 6 fiches, 379 pages |
| Contenu | 114 exercices corrigés | 222 questions numérotées, avec sous-questions et mini-exercices |
| Organisation | 3 niveaux : 30 Basiques, 44 Classiques, 40 Hors-d'œuvre | environ 25 thèmes, difficulté croissante, quelques exercices type bac |
| Origine | sessions 2021 à 2023, une dizaine d'exercices de 2024 | analyse des sujets de 2004 à 2024 |
| Fichier source | LaTeX | Word |
| Signature | masterbac.fr, 2024-2025 | Objectif Bac, août 2024 |

**Ce qui est déjà prêt pour l'application**

- Beaucoup d'exercices de maths annoncent déjà leurs « notions et compétences » et leurs « techniques avancées » : ce sont les étiquettes de la future base, à généraliser.
- Chaque fiche de physique-chimie se termine par un index des notions, qui servira au même usage.
- Les trois niveaux existent, et le test en ligne les note déjà : Basique 1 point, Classique 2, Expert 3.
- Les maths sont en LaTeX, donc convertibles presque telles quelles.

**Ce qui manque ou qui gêne**

- La fiche de géométrie est titrée « à jour du bac 2024 » sans aucun exercice référencé 2024, alors que la géométrie figure dans les 14 sujets de 2026.
- Les six fiches de physique-chimie portent encore la marque Objectif Bac.
- La fiche de géométrie regroupe ses corrigés en fin de niveau. Les quatre autres les placent après chaque exercice.
- « Hors-d'œuvre » nomme le niveau le plus dur alors que le mot désigne une entrée, et le test en ligne dit « Expert ». Il faut un seul nom.
- En physique-chimie, le z-score n'apparaît que dans la fiche 4 et Python que dans la fiche 1.
- Chaque PDF est marqué au nom de l'acheteur. C'est une protection, mais nous ne savons rien de ce que l'élève en fait.
- Le test en ligne n'a pas de compte : l'élève repart sans laisser d'adresse. À vérifier aussi : la page affichait encore « J-13 avant le BAC » lors de la lecture.

## Le bac 2027 change peu de choses, sauf une : il faut rédiger

Le programme de terminale est le même qu'en 2024. La nouveauté de la session 2027 : deux points de maîtrise de la langue dans chaque épreuve, maths et physique-chimie comprises.

| Point | Ce qui s'applique à la session 2027 | Source |
| --- | --- | --- |
| Dates | Philosophie le 14 juin, maths et physique-chimie les 16 et 17 juin au matin, épreuve pratique de physique-chimie du 1er au 4 juin, résultats le 6 juillet | [L'Étudiant](https://www.letudiant.fr/bac/date-du-bac.html) |
| Coefficients | Spécialités 16 chacune. Grand oral 8 au lieu de 10. Épreuve anticipée de maths, coefficient 2, déjà passée en juin 2026 par nos terminales | [digiSchool](https://www.digischool.fr/articles/lycee/bac-2027-ce-qui-change/) |
| Langue | Au moins 2 points sur 20 dans chaque épreuve. Les sujets doivent faire écrire davantage et limiter les QCM | [Bulletin officiel du 17 septembre 2026](https://www.education.gouv.fr/bo/2026/Special4/MENE2623195N) |
| Épreuve de maths | 4 heures, quatre exercices indépendants notés de 4 à 8 points. Les notions de première peuvent être mobilisées | [note de service](https://www.education.gouv.fr/bo/2026/Hebdo4/MENE2622642N), [SchoolMouv](https://www.schoolmouv.fr/baccalaureat/maths) |
| Épreuve de physique-chimie | Écrit de 3 h 30 en trois exercices, 80 % de la note. Épreuve pratique d'une heure, 20 %. La liste des notions exclues de l'écrit n'est pas reprise | [digiSchool](https://www.digischool.fr/articles/lycee/bac/specialite-physique-chimie/) |
| Programmes | Inchangés en terminale en 2026-2027. Le nouveau programme de maths s'applique en terminale à la rentrée 2027 | [Éduscol](https://eduscol.education.gouv.fr/5817/programmes-et-ressources-en-mathematiques-voie-gt) |

**Ce que cela change pour nous**

- Nos corrigés doivent montrer la rédaction qui rapporte les 2 points : une phrase de conclusion par question, le vocabulaire exact, un raisonnement écrit. Une application faite seulement de QCM passerait à côté de l'épreuve.
- En physique-chimie, mieux vaut ne faire aucune impasse : la liste des notions exclues a disparu du texte.
- La session 2027 est la dernière sur le programme de maths de 2019. Nous rangeons chaque exercice par notion du programme, pour basculer en juillet sans tout réécrire.

## La mise à jour 2025 et 2026 : trier 230 exercices, pas les empiler

Les deux sessions ont donné 33 sujets de maths (19 en 2025, 14 en 2026, [APMEP](https://www.apmep.fr/Annales-Terminale-Generale)) et 33 de physique-chimie (18 et 15, [Labolycée](https://www.labolycee.org/centres/tableau)). Cela fait environ 130 exercices de maths et 100 de physique-chimie. Nous ne pouvons pas tout réécrire : il faut choisir.

**La règle, en trois temps**

1. Dépouiller : une ligne par exercice (session, centre, thème, notions, points). C'est commencé pour huit sujets de maths de 2026 et une dizaine de physique-chimie. Il reste le gros de la session 2025.
2. Choisir : cinq ou six exercices par fiche, réécrits sur nos trois niveaux avec notre corrigé (rappel de cours, méthode, rédaction attendue, barème). Soit une soixantaine.
3. Verser le reste dans les « sujets du bac », chronométrés, métropole et centres étrangers d'abord, corrigés au fil des mois.

**Ce qui est tombé en maths en 2026** (14 sujets, [bilan Math93](https://www.math93.com/index.php/annales-du-bac/annales-spe-maths/bac-2026))

| Notion | Sujets sur 14 |
| --- | --- |
| Probabilités conditionnelles | 14 |
| Suites | 14 |
| Fonctions | 14 |
| Géométrie dans l'espace | 14 |
| Python | 13 |
| Variables aléatoires | 12 |
| Équations différentielles | 12 |
| Intégrales | 12 |
| Loi binomiale | 11 |
| Dénombrement | 6 |
| Trigonométrie | 5 |

Deux formats reviennent partout. Cinq des huit sujets de 2026 décrits par [Mathoutils](https://www.mathoutils.fr/annales-de-bac-mathematiques/annales-de-bac-specialite-mathematiques/) contiennent un vrai ou faux à justifier, et six font appel à l'inégalité de Bienaymé-Tchebychev. Le premier sujet de 2025, en Amérique du Nord, avait déjà son vrai ou faux en géométrie et son programme Python ([Sujet de bac](https://www.sujetdebac.fr/annales/spe-mathematiques-2025-amerique-nord-1)).

**Ce qui est tombé en physique-chimie**

- L'exercice principal vaut 9 à 11 points et mélange deux ou trois thèmes : circuit RC et interférences ([métropole 2025, jour 2](https://www.labolycee.org/bac-2025-metropole-jour-2)), circuit RC, fluides et thermique ([métropole 2026, jour 1](https://www.labolycee.org/bac-2026-metropole-jour-1)).
- Les incertitudes et le z-score reviennent d'un sujet à l'autre, en physique comme en chimie.
- Python entre en chimie : titrage en métropole 2025, cinétique en métropole 2026.
- La datation rubidium-strontium est tombée deux fois ([métropole 2025](https://www.labolycee.org/bac-2025-metropole-jour-1), Asie 2026).

**Ce que chaque fiche doit recevoir**

| Fiche | À ajouter en priorité |
| --- | --- |
| Maths 1, suites | Suite liée à une fonction, suite arithmético-géométrique avec seuil, suite et équation différentielle avec algorithme Python |
| Maths 2, géométrie | La priorité : volume d'un tétraèdre, distance d'un point à un plan, projeté orthogonal, angle, coplanarité |
| Maths 3, fonctions | Logarithme avec convexité et théorème des valeurs intermédiaires, lecture graphique, fonction trigonométrique |
| Maths 4, intégrales et équations différentielles | Équation différentielle liée à une suite, intégrale et aire, intégration par parties, méthode des rectangles |
| Maths 5, probabilités | L'exercice type de 2026 : probabilités conditionnelles, loi binomiale et Bienaymé-Tchebychev dans un même énoncé |
| Physique-chimie 1, optique et mécanique | Interférences appliquées, lois de Kepler, chute avec frottement et équation différentielle |
| Physique-chimie 2, thermique et électricité | Circuit RC en exercice principal de 11 points, mêlé à un second thème ; bilans thermiques |
| Physique-chimie 3, synthèse et cinétique | Synthèse, spectroscopie infrarouge, cinétique et titrage dans un même exercice |
| Physique-chimie 4, solutions et électrochimie | Acide-base en exercice de 9 points, titrage conductimétrique avec Python, électrolyse |
| Physique-chimie 5, fluides | Poussée d'Archimède à l'intérieur d'exercices de synthèse |
| Physique-chimie 6, ondes et nucléaire | Datation rubidium-strontium, effet photoélectrique |

**Sept séries nouvelles, qui traversent les chapitres**

- Maths : « Vrai ou faux, à justifier » et « Python au bac ».
- Physique-chimie : « Mesures, incertitudes et z-score », « Python en physique-chimie », « Exercices de synthèse à 9-11 points », « Établir et résoudre une équation différentielle ».
- Les deux matières : « Rédiger pour prendre les 2 points de langue ».

Au passage, nous faisons le ménage : une seule signature MasterBac, le corrigé après chaque exercice partout, les mêmes noms de niveaux.

## Le format : une base d'exercices dans l'application, sans export PDF

Nous retenons l'application nourrie par une base d'exercices. Décision du 11 novembre : pas d'export PDF dans l'application. Les fiches Word restent notre fichier de travail, et le cahier imprimé un produit à part.

| Option | Pour | Contre | Décision |
| --- | --- | --- | --- |
| PDF mis à jour, seul | Rapide, aucun développement, se vend déjà | Vente unique, partage facile, aucune donnée, aucune raison de revenir | Abandonné, y compris en export |
| PDF avec QR codes vers des quiz et des vidéos | Pont rapide vers le numérique, garde le papier | Pas de compte, donc ni plan ni suivi ; deux supports à tenir à jour | Écarté |
| Application nourrie par une base d'exercices | Essai gratuit avant achat, plan personnel, suivi, mise à jour continue, preuve des progrès | Du temps de développement ; écrire des maths sur un téléphone est pénible | Retenue |
| Cahier imprimé avec accès à l'application | Objet à offrir, rassure les parents, seul format admis dans TikTok Shop, qui [interdit les livres numériques](https://seller-fr.tiktok.com/university/essay?knowledge_id=7404160498075424) | Impression, envoi, réédition annuelle, marge plus faible | À tester au printemps |

**La mini-application est la première tranche de l'Académie de l'Élite, pas un produit à côté.** Un seul compte, une seule base. Le mode DS en est la première pièce utilisable.

**La fiche d'identité d'un exercice.** Chaque exercice est écrit une fois, avec :

- sa matière, son chapitre et sa notion du programme ;
- son niveau (10, 14 ou 18) et son type (cours, méthode, application, type bac, vrai ou faux, Python) ;
- sa source (session, centre, jour), sa durée et son barème ;
- son énoncé, deux ou trois indices, et son corrigé pas à pas avec rappel de cours, méthode, rédaction attendue et erreur fréquente ;
- les questions de quiz qui en découlent.

Il sert ensuite au mode DS, au quiz, au bac blanc et au cahier imprimé.

**Le papier d'abord.** L'élève rédige sur feuille, comme le jour de l'épreuve. Le téléphone donne le plan, le chronomètre et la correction.

## Le système complet : six usages pour l'élève, un seul stock d'exercices

L'élève ouvre l'application et trouve six choses. Toutes puisent dans la même base.

Chaque exercice est écrit une fois dans la base. Les six usages et les trois offres y puisent.

### 1. La séance du jour

- Vingt-cinq minutes : 5 minutes de questions à revoir, 15 minutes d'un exercice à son niveau sur papier, 5 minutes de correction au barème.
- Deux comptes à rebours : le prochain DS et le 16 juin.
- Le carnet d'erreurs : chaque question ratée revient deux jours, une semaine, puis trois semaines plus tard.

### 2. Le mode DS

L'élève donne la date du devoir, les chapitres et la note visée. Le plan sort tout seul, en trois formats.

| Format | Quand | Contenu |
| --- | --- | --- |
| Express | la veille | 20 minutes : fiche éclair du chapitre, 10 questions, les pièges classiques |
| Trois jours | à J-3 | 3 séances de 30 minutes : test de 10 questions, exercices ciblés sur ses points faibles, un exercice type |
| Une semaine | à J-7 | 5 séances et un DS blanc chronométré au format du devoir (1 h, 2 h ou 4 h) |

- Après le devoir, il saisit sa note. C'est notre mesure des progrès, et la préparation suivante en tient compte.
- C'est l'usage qui vend de novembre à avril : « Tu as DS jeudi ? Donne-moi le chapitre. »

### 3. Le plan de l'année

- Trois parcours, ceux de juin dernier : viser 10, viser 14, viser 18.
- Cinq périodes : le premier trimestre (suivre la classe, reprendre les notions de première), les vacances de Noël (consolider, préparer le bac blanc), janvier à mars (bac blanc et dossier), les vacances de printemps (premier tour complet du programme), mai et juin (sujets 2025 et 2026, puis les 14 derniers jours).
- L'élève coche ce qui a été vu en classe : le plan suit la progression de son professeur.
- Une séance sautée ne casse rien : le plan se recalcule.

### 4. Les cours et les quiz

- Par chapitre au lancement : l'essentiel en une page, cinq cartes méthode, 40 questions.
- La vidéo de cours arrive ensuite, chapitre par chapitre, en commençant par ceux du deuxième trimestre.
- Les 222 questions de cours de physique-chimie fournissent le premier stock de quiz.
- Le « vrai ou faux, à justifier » reproduit l'exercice du bac : l'élève tranche, puis compare sa justification à la nôtre.

### 5. Les niveaux 10, 14 et 18

- Basique devient « viser 10 », Classique « viser 14 », le niveau le plus dur « viser 18 ». Les niveaux des fiches et les parcours de l'Académie ne font plus qu'un.
- Par notion, quatre états : à voir, en cours, acquis, solide (réussi deux fois à une semaine d'écart).
- Pour monter d'un niveau : 70 % de réussite, puis un test de passage de 15 minutes.
- Quatre évaluations : le test d'entrée gratuit (40 questions, 30 minutes), le test de chapitre, le bilan mensuel, le bac blanc complet en janvier, en avril et fin mai.
- La note estimée s'affiche avec une fourchette. Elle se recale sur les notes de DS saisies, puis sur les notes du bac en juillet.

### 6. Les sujets du bac et la correction

- Tous les sujets 2025 et 2026, chronométrés, par exercice ou en entier.
- Au lancement, l'élève se corrige lui-même : le corrigé se déroule pas à pas et il coche les points obtenus, rédaction comprise.
- À partir de février, en test : photo de la copie et retour sur notre barème. Pour le Pack : correction par un professeur.
- Le tuteur donne deux indices avant le corrigé, jamais la réponse d'emblée, et ne s'appuie que sur nos corrigés.

**Et pour les parents** : un rapport chaque semaine (séances faites, chapitres acquis, prochain DS, note estimée), et un bouton « Envoyer à mes parents » à la fin du test gratuit. C'est le parent qui paie.

**Ce que nous ne construisons pas maintenant** : classement entre élèves, Grand oral, Parcoursup, import des cours de l'élève, application native, offre pour les lycées.

## La commercialisation : quatre façons de vendre, une offre au centre

Nous mettons un Pass Bac 2027 à 79 € au centre de l'offre. Il est proche du prix actuel des fiches, simple pour un parent, et il contient ce qu'aucun livre ne donne : le plan, la correction et les stages en direct.

**Les repères de prix**

| Repère | Prix |
| --- | --- |
| Annales papier, collection Annabac | [7,60 €](https://editions-hatier.fr/livre/annales-du-bac-annabac-2025-hggsp-tle-generale-specialite-9782401105584) |
| Livre de plus de 400 exercices corrigés (Hatier) | [14,95 €](https://www.editions-hatier.fr/node/29839) |
| Kartable, toutes matières | [9,99 € par mois sur l'année scolaire, 14,99 € au mois](https://www.kartable.fr/premium) |
| SchoolMouv | [environ 12 à 30 € par mois selon la durée](https://enseigna.fr/avis-soutien-scolaire-schoolmouv/) |
| Nos fiches, pack maths et physique-chimie | 69,99 € (prix relevé en mars 2026, à confirmer) |
| Stage de vacances en petit groupe, 10 heures | [245 €](https://enseigna.fr/avis-soutien-scolaire-schoolmouv/) |
| Cours particulier | [30 à 60 € l'heure](https://www.histoire-en-ligne.com/kartable/) |

Le contenu seul se paie au prix d'un livre. Ce qui se paie plus cher, c'est d'être suivi et corrigé. Le public est large : 44,8 % des élèves de terminale générale suivent la spécialité maths et 32,9 % la physique-chimie ([DEPP](https://www.education.gouv.fr/les-choix-d-enseignements-de-specialite-et-d-enseignements-optionnels-la-rentree-2025-470033)).

**Quatre façons de vendre**

| Façon de vendre | Pour | Contre |
| --- | --- | --- |
| Abonnement mensuel seul | Prix d'entrée bas, revenu qui revient chaque mois | L'élève s'abonne avant un DS puis repart ; un mineur a rarement un moyen de paiement |
| Pass jusqu'au bac, payé une fois | Simple pour un parent, encaissé d'avance, proche du prix actuel des fiches | Pas de revenu mensuel |
| Passes courts (un stage, un sprint) | Achat d'impulsion, un lancement en direct à chaque fois | Revenu en dents de scie, des lancements à animer |
| Pack avec papier et correction humaine | Marge, argument fort pour les parents | Le temps de correction : à plafonner ou à confier à des correcteurs |

En terminale, tout le monde part en juillet, quel que soit le mode de paiement. Le revenu qui revient vient de la promotion suivante, et des élèves de première qui restent deux ans. Le Pass dit la vérité du produit : un accès jusqu'au bac.

**L'offre que nous retenons**

| Offre | Prix | Contenu |
| --- | --- | --- |
| Gratuit | 0 € | Test de niveau, une préparation de DS offerte, l'exercice du jour |
| Mensuel | 9,99 € | L'application complète, sans les stages |
| Pass Bac 2027 | 79 € | L'application jusqu'aux résultats, les trois stages en direct (Noël, printemps, sprint) |
| Pack BAC | 149 € | Le Pass, le cahier imprimé, deux bacs blancs corrigés par un professeur |
| Stage à l'unité | 29 € | Un stage en direct, déduit du Pass si l'élève le prend dans les 7 jours |

Les prix de 9,99 €, 79 € et 149 €, et le tarif de 59 € pour les clients actuels, reprennent les hypothèses du plan 2027. Le stage à 29 € et son inclusion dans le Pass sont nouveaux : ils donnent une raison de préférer le Pass au mensuel. Les clients actuels retrouvent dans l'application les fiches qu'ils ont achetées.

**Les leviers**

- **Le direct « DS de la semaine ».** Chaque semaine, un chapitre que les classes traitent, corrigé en direct sur TikTok. L'appel : la préparation de DS offerte.
- **Les parents.** Le bouton « Envoyer à mes parents », une page écrite pour eux, le rapport hebdomadaire.
- **La classe.** Un code de groupe : à cinq élèves de la même classe, chacun paie moins.
- **La garantie mesurée.** Trente jours, trois séances par semaine ; si la note estimée ne monte pas, remboursé. L'application sait qui a fait ses séances.
- **La preuve.** Les progrès mesurés dans l'application remplacent ou confirment les chiffres de la page de vente.
- **Les adresses.** Chaque test gratuit demande un e-mail : nous dépendons moins de l'algorithme de TikTok.
- **Le cahier imprimé.** À tester au printemps, dans le Pack puis dans TikTok Shop, côté parents.
- **Les premières.** Leur épreuve anticipée de maths a lieu le 21 juin 2027. C'est la promotion qui peut rester deux ans.

## Le calendrier : huit moments de vente, neuf semaines de construction

Il reste 217 jours avant les épreuves de spécialité. Depuis le 11 novembre, la physique-chimie passe avant les maths : les étapes ci-dessous, construites sur les maths d'abord, sont à redater.

**Les moments de l'année**

| Moment | Dates | Ce que vit l'élève | Ce que nous mettons en avant |
| --- | --- | --- | --- |
| Premier trimestre | jusqu'au 18 décembre | DS, conseil de classe | Test gratuit, préparation de DS offerte |
| Vacances de Noël | 19 décembre au 4 janvier | Révisions, bac blanc en vue | Stage de Noël, mode DS en maths |
| Ouverture | 15 janvier | Rentrée | Pass Bac 2027, tarif clients actuels |
| Parcoursup | vœux du 18 janvier au 11 mars, confirmation le 1er avril | Le dossier se joue sur les DS | Mode DS, rapport parents |
| Vacances d'hiver | 6 février au 8 mars selon la zone | Bacs blancs | Bac blanc complet |
| Vacances de printemps | 3 avril au 3 mai selon la zone | Premier tour du programme | Stage de printemps, cahier imprimé en test |
| Sprint | mi-mai au 17 juin | Épreuve pratique du 1er au 4 juin, écrits les 16 et 17 | Sprint des 14 derniers jours, Pack BAC |
| Après les écrits | 21 juin au 6 juillet | Grand oral, résultats, épreuve anticipée des premières | Bilan des notes, offre première |

Dates : [Parcoursup](https://www.letudiant.fr/etudes/parcoursup/on-connait-le-calendrier-de-parcoursup-2027.html), [vacances scolaires](https://www.service-public.gouv.fr/particuliers/actualites/A18563), [bac](https://www.letudiant.fr/bac/date-du-bac.html).

**Jusqu'au 15 janvier, étape par étape**

1. **Semaine du 11 novembre.** Trancher les six décisions. Écrire la fiche d'identité d'un exercice. Convertir la fiche Suites. Fini quand les 34 exercices de Suites sont dans la base avec leur niveau et leur notion.
2. **Semaine du 18 novembre.** Mode DS sur les suites, 40 questions de quiz, essai avec une vingtaine de clients actuels. Fini quand dix élèves ont préparé un vrai DS avec.
3. **Du 25 novembre au 6 décembre.** Les quatre autres fiches de maths, trente exercices choisis dans 2025 et 2026, les séries « vrai ou faux » et « Python ». Fini quand les cinq fiches de maths ont leurs trois niveaux et leurs quiz.
4. **Semaine du 9 décembre.** Paiement, tarif clients actuels, page parents. Fini quand un parent peut acheter depuis le lien envoyé par son enfant.
5. **19 décembre.** Ouverture du mode DS en maths et du stage de Noël.
6. **Vacances et début janvier.** Physique-chimie, en commençant par les thèmes des exercices principaux : circuit RC, thermique, acide-base et titrages, synthèse et cinétique, mécanique.
7. **15 janvier.** Ouverture complète : plan de l'année, niveaux, bac blanc.

**Ensuite**

- Février à avril : tous les sujets 2025 et 2026, correction sur photo en test, rapport parents, stage de printemps.
- Mai et juin : le sprint.
- Juillet : comparer les notes estimées aux notes du bac, intégrer la session 2027, passer les maths sur le nouveau programme.

**Si le temps manque, nous coupons dans cet ordre** : la physique-chimie glisse à février, le tuteur attend, le plan de l'année devient un plan fixe par objectif.

**Deux preuves à obtenir d'ici juillet** : les notes montent (notes de DS saisies avant et après, puis notes du bac), et les élèves restent (séances par semaine, abonnés mensuels encore là au bout de deux mois). Repère du plan 2027 : 150 abonnés payants en janvier, 1 000 en juin.

## Ce qui peut mal tourner

Le premier risque est le temps : une seule personne pour le code et pour le contenu.

| Risque | Parade |
| --- | --- |
| Le temps | Les maths d'abord, un chapitre pilote, un ordre de coupe écrit à l'avance |
| Une erreur dans un corrigé ou un quiz préparé avec l'IA | Rien n'est publié sans relecture par un professeur ; un bouton « signaler une erreur » sur chaque exercice |
| Le nouveau programme de maths à la rentrée 2027 | Chaque exercice est rangé par notion ; le reclassement se fait en juillet |
| La dépendance à TikTok | Un e-mail à chaque test gratuit, le contact des parents, les clients actuels |
| Des élèves mineurs | Le parent paie ; accord parental avant 15 ans ; données hébergées en Europe |
| Le partage de compte ou de PDF | Un compte par élève ; plus aucun PDF en circulation |
| Les corrigés des autres sites | Les énoncés sont ceux de l'examen ; les corrigés sont les nôtres, jamais repris d'ailleurs. Point à faire valider |
| L'élève qui recopie la réponse | Deux indices avant le corrigé, et le travail se fait sur papier |

## Six décisions à prendre cette semaine

- [ ] **Format.** L'application nourrie par une base d'exercices, sans export PDF. Décidé le 11 novembre.
- [ ] **Niveaux.** Basique, Classique, Élite, reliés aux objectifs 10, 14 et 18, à la place de « Hors-d'œuvre » et de « Expert ». Recommandation : oui.
- [ ] **Périmètre du 19 décembre.** À recaler : la physique-chimie passe maintenant avant les maths.
- [ ] **Offre.** Pass Bac 2027 à 79 €, mensuel à 9,99 €, Pack BAC à 149 €, stages inclus dans le Pass. À valider ou à corriger.
- [ ] **Correction.** L'élève se corrige au barème au lancement, la photo de copie arrive en test en février, un professeur corrige pour le Pack. Recommandation : oui.
- [ ] **Chapitre pilote.** La physique-chimie d'abord (décidé le 11 novembre) : une fiche pilote au nouveau format Word, puis les cinq autres, puis le prototype de l'application.

## Sources

- Calendrier du bac 2027 : [L'Étudiant](https://www.letudiant.fr/bac/date-du-bac.html), [Service-public](https://www.service-public.gouv.fr/particuliers/actualites/A16804)
- Coefficients et nouveautés 2027 : [digiSchool](https://www.digischool.fr/articles/lycee/bac-2027-ce-qui-change/), [Cap Horizon](https://www.cap-horizon.net/blog/bac-2027-ce-qui-change)
- Maîtrise de la langue : [note de service du 11 septembre 2026](https://www.education.gouv.fr/bo/2026/Special4/MENE2623195N), [académie de Normandie](https://mathematiques.ac-normandie.fr/Examens2027)
- Épreuves de spécialité : [maths](https://www.education.gouv.fr/bo/2026/Hebdo4/MENE2622642N), [physique-chimie](https://www.digischool.fr/articles/lycee/bac/specialite-physique-chimie/)
- Programmes de maths : [Éduscol](https://eduscol.education.gouv.fr/5817/programmes-et-ressources-en-mathematiques-voie-gt)
- Sujets de maths : [APMEP, année 2026](https://www.apmep.fr/Annee-2026), [Mathoutils](https://www.mathoutils.fr/annales-de-bac-mathematiques/annales-de-bac-specialite-mathematiques/), [Math93](https://www.math93.com/index.php/annales-du-bac/annales-spe-maths/bac-2026)
- Sujets de physique-chimie : [Labolycée, tableau par centre](https://www.labolycee.org/centres/tableau)
- Parcoursup 2027 : [calendrier officiel](https://www.parcoursup.gouv.fr/sites/default/files/database/documents/2026-10/calendrier-parcoursup-2027-805_0.pdf)
- Choix de spécialités : [DEPP, note 26.06](https://www.education.gouv.fr/les-choix-d-enseignements-de-specialite-et-d-enseignements-optionnels-la-rentree-2025-470033)
- Prix : [Kartable](https://www.kartable.fr/premium), [SchoolMouv vu par Enseigna](https://enseigna.fr/avis-soutien-scolaire-schoolmouv/), [Hatier](https://www.editions-hatier.fr/node/29839)
- TikTok Shop : [produits soumis à restriction dans l'Union européenne](https://seller-fr.tiktok.com/university/essay?knowledge_id=7404160498075424)
- Les onze fiches et le test en ligne : lecture directe des fichiers et de app.masterbac.fr, le 11 novembre 2026
- Prix, objectifs d'abonnés et chiffres d'audience : plan 2027
