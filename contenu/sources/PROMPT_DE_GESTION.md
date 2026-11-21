# Prompt de gestion des fiches MasterBac

Mode d'emploi : ouvrir une nouvelle conversation avec Claude, y déposer l'archive `MasterBac_fiches_source.zip`, coller le texte ci-dessous (à partir de « Contexte »), puis écrire la demande. Pour produire une nouvelle fiche, déposer aussi les PDF de l'édition 2024 qui contiennent ses thèmes (la liste est dans `REPRISE_EDITION_2024.md`) : les fichiers Word d'origine n'existent plus.

Version du 12 novembre 2026 : les fiches 1 à 14 sont faites et contrôlées ; la série ECE reste à faire.

---

## Contexte

Je suis Yane, fondateur de MasterBac (site masterbac.com, compte Masterbac, nom d'utilisateur @bac.objectif.mention). L'archive jointe est la source des fiches d'exercices de physique-chimie de terminale, édition 2026-2027. Tu vas les corriger, les compléter ou en produire de nouvelles, sans jamais rompre avec le format validé.

## 1. Mise en route

1. Décompresse l'archive dans ton espace de travail et lis `LISEZMOI.md` en entier, puis `REPRISE_EDITION_2024.md` si la demande porte sur une nouvelle fiche.
2. Vérifie les outils : pandoc 3.1 ou plus récent, LibreOffice avec son module Math (installe `libreoffice-math` s'il manque : sans lui les équations ne s'affichent pas dans le PDF), Python 3 avec `python-docx`, `lxml`, `pymupdf`, `matplotlib` et `Pillow`, police Carlito.
3. Lance `outils/fabrique.sh pc-04-fluides` sans rien modifier. Les contrôles doivent tous passer. Si ce n'est pas le cas, répare l'environnement avant toute autre chose.

## 2. Règles à ne jamais enfreindre

- Le Word et le PDF sont des sorties. On corrige la source (`fiches/<fiche>/fiche.md`, `commun/ouverture.md`, `reglages.json`), puis on refabrique. Jamais de retouche à la main dans un fichier produit.
- Une valeur modifiée impose de recalculer tout ce qui en dépend : l'énoncé, le corrigé, la page « L'essentiel en une page » et l'index. Chaque résultat numérique est recalculé à part avant d'être écrit.
- Le contenu d'origine d'une fiche est repris en entier. Ce qui est corrigé ou ajouté m'est signalé dans la conversation, jamais dans la fiche : l'élève ne voit ni les ajouts ni les corrections d'une édition à l'autre.
- Un exercice « d'après le BAC » est un énoncé original. On cite le sujet (centre, mois, année, jour, numéro de l'exercice), dans le titre et en tête d'énoncé. On ne recopie jamais le texte d'un sujet officiel.
- Les anciens PDF portent le nom d'un élève en filigrane et en en-tête. Ce nom ne doit apparaître nulle part : on nettoie les pages avec `outils/reprise/nettoie_pdf.py` avant de les lire.
- Le texte d'une fiche ne désigne jamais un terme par sa couleur : les couleurs des formules existent dans le Word, pas dans le PDF d'aperçu.
- Une figure sur laquelle l'élève mesure à la règle est dessinée et insérée à l'échelle exacte, et sa largeur est contrôlée dans les PDF par le script de vérification de la fiche (voir la fiche 1, Q.17).
- Une fiche qui dépasserait 90 pages est coupée en deux. C'est le cas de la mécanique.
- Les tableaux « Ce qui est tombé » ne retiennent que les sujets de la spécialité physique-chimie, jamais ceux de l'épreuve de sciences de l'ingénieur. Avant d'ajouter une ligne, vérifier le code du sujet : `PYC` pour la physique-chimie, `SCIPC` pour les sciences de l'ingénieur (exercices A et B de 10 points en 30 minutes).
- Écriture des fiches : on s'adresse à l'élève avec « vous », on écrit « cours » et jamais « leçon », pas de tiret long, pas d'emoji, unités avec des puissances, virgule décimale, résultat final dans un encadré « À retenir ».
- Sessions du BAC, toujours écrites de la même façon : « Asie 2026, jour 1 » (de même pour les autres centres ; « Antilles-Guyane » sans mois), « Métropole, juin 2026, jour 2 » ou « Métropole, septembre 2025, jour 1 », et pour un sujet de secours « Métropole 2025, jour 2 (sujet de secours) ». En tête d'un exercice construit d'après un sujet : « Sujet du BAC correspondant. <session>, exercice n : « titre exact du sujet » ». Chaque mention « Demandé en… » d'une question doit se retrouver dans le tableau « Ce qui est tombé », et inversement.
- Mise en page : « L'essentiel en une page » et « Ce qui est tombé » tiennent chacun sur une page ; chaque exercice ouvre une page et son énoncé tient si possible sur une page ; aucune page à moins de 20 % sauf la fin d'un corrigé. `outils/mise_en_page.py` le contrôle après chaque fabrication.
- Avec moi : réponses courtes, en français, tutoiement, à puces. Pas de tiret long.

## 3. Quand je demande une modification

1. Repère l'endroit dans la source à partir de ma phrase (fiche, question ou exercice, numéro de la question).
2. Modifie la source, et recalcule ce qui dépend de la valeur changée.
3. Refabrique la fiche : `outils/fabrique.sh <dossier de la fiche>`. Une information commune (site, compte, édition) se change dans `reglages.json` et oblige à refabriquer toutes les fiches.
4. Regarde les pages modifiées dans le PDF avant de me répondre.
5. Rends-moi ce qui est listé au point 5.

## 4. Quand je demande une nouvelle fiche

Chaque fiche suit la même chaîne :

1. Rassembler la matière : questions, corrigés et figures d'origine du bloc (dans les PDF de l'édition 2024 que je dépose, extraits comme l'explique `REPRISE_EDITION_2024.md`), sujets du BAC 2024 à 2026 qui le concernent, capacités du programme.
2. Reprendre l'existant : tout le contenu d'origine est replacé dans la nouvelle fiche et renuméroté ; tenir la table de correspondance entre anciens et nouveaux numéros ; corriger les erreurs repérées et me les lister.
3. Mettre à jour : tableau « Ce qui est tombé aux BAC 2025 et 2026 », exercices originaux construits d'après les sujets récents, compléments là où les sujets récents montrent un manque.
4. Ouvrir la fiche : « L'essentiel en une page » (relations, pièges, parcours par objectif), niveaux Objectif 10, 14 ou 18, barèmes et durées des exercices de type BAC.
5. Reprendre les figures d'origine ou les redessiner dans la palette (script dans `outils/figures/`).
6. Fabriquer et contrôler : recalcul à part de chaque résultat (`outils/verifs/<fiche>.py`), contrôles automatiques, orthographe (`outils/orthographe.py`), mise en page (`outils/mise_en_page.py`), relecture de toutes les pages en image (`outils/planches.py`). Pour une nouvelle fiche, refaire ensuite le contrôle qualité en trois axes, par des agents distincts : exercices conformes aux sujets cités, justesse des corrigés, rédaction.
7. Me livrer la fiche pour relecture.

Structure d'une fiche, dans cet ordre : ouverture commune (couverture, avant-propos, sommaire), « L'essentiel en une page », « Ce qui est tombé », les énoncés thème par thème (questions de cours puis exercices), les corrigés thème par thème, l'index des notions. Les fiches `pc-01-mecanique-chute-libre` à `pc-08-circuit-rc`, `pc-09-acides-bases` (pour l'écriture des formules chimiques) et `pc-14-methodes` (pour les programmes Python) servent de modèles ; `fiches/_charte` montre chaque bloc.

## 5. Ce que tu me rends à chaque fois

- La fiche complète en Word, son aperçu en PDF et le cahier d'énoncés en PDF.
- Le résultat des contrôles automatiques, en une ligne.
- La liste de ce qui a changé, à reporter dans le journal de mise à jour, et pour une nouvelle fiche la table de correspondance et les corrections, ajoutées à `REPRISE_EDITION_2024.md`.
- L'archive `MasterBac_fiches_source.zip` à jour, sans le dossier `sorties/`. C'est elle que je déposerai la prochaine fois. Mets aussi à jour le tableau du point 6 dans ce fichier.

## 6. État des fiches au 12 novembre 2026, après le contrôle qualité

La série compte quatorze fiches, numérotées de 1 à 14 (la mécanique, trop longue, occupe les fiches 1 et 2), plus la série ECE. Les sujets de l'épreuve de sciences de l'ingénieur ne figurent pas dans les tableaux « Ce qui est tombé » : seuls comptent ceux de la spécialité physique-chimie.

| N° | Fiche | Repris de l'édition 2024 | État |
|---|---|---|---|
| 1 | Mécanique : chute libre et mouvement d'un projectile | Fiche 1 (Q.25 à Q.28 et Q.33) | Faite le 11 novembre 2026 (dossier `pc-01-mecanique-chute-libre`) ; contrôle qualité fait le 12 novembre 2026 |
| 2 | Mécanique : énergie et champ électrique uniforme | Fiche 1 (Q.29, Q.30, Q.34 à Q.38), fiche 2 (forces électriques, Q.28 à Q.34) | Faite le 11 novembre 2026 (dossier `pc-02-mecanique-energie`) ; contrôle qualité fait le 12 novembre 2026. Le 12 novembre, « Jeu de billes et gravité » est rattaché au sujet de secours de Métropole 2025 (il était daté de septembre 2025 par erreur) |
| 3 | Gravitation : satellites et lois de Kepler | Fiche 1 (mécanique céleste, Q.19 à Q.24) | Faite le 11 novembre 2026 (dossier `pc-03-gravitation`) ; contrôle qualité fait le 12 novembre 2026 |
| 4 | Fluides : poussée d'Archimède et écoulement | Fiche 5 ; fiche 1 pour la chute dans un fluide | Faite (dossier `pc-04-fluides`), validée pour les thèmes 1 et 2. Thème 3 « chute dans un fluide » (fiche 1, Q.31 et Q.32) ajouté le 12 novembre 2026 ; contrôle qualité fait le 12 novembre 2026 |
| 5 | Énergie : gaz parfait et transferts thermiques | Fiche 2 (thermodynamique), fiche 4 (gaz parfaits) | Faite le 11 novembre 2026 (dossier `pc-05-energie`) ; contrôle qualité fait le 12 novembre 2026. Le 12 novembre, six exercices de sciences de l'ingénieur sont retirés du tableau « Ce qui est tombé » (11 lignes au lieu de 17) et les exercices 2 et 4 renvoient à des sujets de physique-chimie |
| 6 | Ondes : propagation, son, diffraction, interférences et effet Doppler | Fiche 1 (diffraction et interférences), fiche 2 (ondes sonores), fiche 6 (ondes, effet Doppler) | Faite le 12 novembre 2026 (dossier `pc-06-ondes`) ; contrôle qualité fait le 12 novembre 2026 |
| 7 | Lumière : lentilles, lunette astronomique et photons | Fiche 1 (optique), fiche 6 (énergie de l'atome) | Faite le 12 novembre 2026 (dossier `pc-07-lumiere`) ; contrôle qualité fait le 12 novembre 2026 |
| 8 | Circuit RC : condensateur, charge et décharge | Fiche 2 (électricité) | Faite le 12 novembre 2026 (dossier `pc-08-circuit-rc`) ; contrôle qualité fait le 12 novembre 2026 |
| 9 | Acides et bases | Fiche 4 (espèces en solution, force des acides, avancement) | Faite le 12 novembre 2026 (dossier `pc-09-acides-bases`) ; contrôle qualité fait le 12 novembre 2026 |
| 10 | Dosages : titrages, absorbance, conductivité | Fiche 4 (conductivité, dosage et titrage) | Faite le 12 novembre 2026 (dossier `pc-10-dosages`) ; contrôle qualité fait le 12 novembre 2026 |
| 11 | Cinétique chimique et radioactivité | Fiche 3 (cinétique), fiche 6 (radioactivité) | Faite le 12 novembre 2026 (dossier `pc-11-cinetique-radioactivite`) ; contrôle qualité fait le 12 novembre 2026 |
| 12 | Équilibre, piles et électrolyse | Fiche 4 (oxydoréduction, piles, électrolyse) | Faite le 12 novembre 2026 (dossier `pc-12-equilibre-piles-electrolyse`) ; contrôle qualité fait le 12 novembre 2026 |
| 13 | Synthèse organique | Fiche 3 (synthèse organique) | Faite le 12 novembre 2026 (dossier `pc-13-synthese-organique`) ; contrôle qualité fait le 12 novembre 2026 |
| 14 | Méthodes du BAC : incertitudes, Python, équations différentielles, rédaction | Nouvelle fiche | Faite le 12 novembre 2026 (dossier `pc-14-methodes`) ; contrôle qualité fait le 12 novembre 2026 |
| Annexe | Montages de chimie : solutions, appareils de mesure, titrages, synthèse, piles et électrolyse | Nouvelle fiche, demandée par Yane le 18 novembre 2026 | Faite le 19 novembre 2026 (dossier `_montages`, fiche et cahier, non exportée vers l'application) ; la planche récapitulative des schémas attend la réponse de Yane |
| ECE | Série ECE : une fiche de méthode et des fiches par famille de manipulation | Nouvelle série, forme à confirmer | À faire |

Relecture de Yane du 18 novembre 2026 : traitée fiche par fiche le 19 novembre (correction, vérification à l'image, reprise jusqu'à un avis favorable), puis contrôlée entre fiches. L'essentiel a maintenant trois rubriques (« À connaître par cœur », « À savoir retrouver », « Fourni par l'énoncé »), les tableaux d'avancement suivent un même format, et la fiche 9 a une question de plus (Q.7, avancement final et maximal : les questions 7 à 23 deviennent 8 à 24). Le détail par fiche et les questions laissées à Yane sont dans le récapitulatif remis avec les ZIP.

Points encore ouverts, à me redemander s'ils bloquent : coups de pouce avant le corrigé et barème détaillé par question (les fiches 1 à 14 sont faites sans) ; QR codes vers de courtes présentations vidéo ; forme de la série ECE ; outil qui produit les PDF remis aux élèves (les couleurs des formules n'existent que dans le Word, et LibreOffice étire les parenthèses des formules dans les aperçus PDF)  ; exercices « d'après » qui reprennent des valeurs numériques d'un sujet officiel (fiche 8, exercices 2 et 3 ; fiche 13, exercice 4) : énoncés réécrits, valeurs gardées, à confirmer.
