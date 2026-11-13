# Cahier des charges : ce que l'application doit faire

Ce document décrit le comportement attendu de l'application, écran par écran et règle par règle. Il se lit avec trois autres pièces :

- le prototype du 13 novembre 2026 (`reference/prototype/`, captures dans `reference/captures/`), qui montre les écrans, les textes et l'enchaînement ;
- `docs/08-moteur.md`, qui donne les règles de calcul du coach ;
- `docs/contexte/strategie.md` et `docs/contexte/plan-d-implementation.md`, qui expliquent pourquoi.

En cas de désaccord entre les sources : ce cahier des charges l'emporte sur le prototype, le prototype l'emporte sur le test en ligne actuel. Si un point reste ambigu, tu poses la question à Yane au lieu de trancher seul, sauf s'il figure dans la section 7 avec une valeur par défaut.

## 1. La promesse et ceux qui s'en servent

**La promesse.** MasterBac ne vend plus des pages, il vend la prochaine note. L'application dit à l'élève quoi travailler ce soir, le corrige sur ce qu'il a écrit et le tient jusqu'au bac.

**Les trois échéances de l'élève.** Le prochain DS (toutes les deux à trois semaines), le dossier Parcoursup (les bulletins des deux premiers trimestres), le bac (épreuves de spécialité les 16 et 17 juin 2027). Chaque écran doit servir au moins l'une des trois.

**Les utilisateurs.**

| Qui | Ce qu'il vient faire | Ton employé |
| --- | --- | --- |
| L'élève de terminale, spécialité physique-chimie (maths ensuite, premières plus tard) | préparer un DS, faire sa séance du jour, se corriger, voir où il en est | « tu » |
| Le parent | suivre le travail de son enfant sans voir ses réponses, payer | « vous » |
| Yane, administrateur | relire le contenu, traiter les signalements, suivre la bêta et les ventes, aider un client | interface sobre, en français |
| Le correcteur (à partir du printemps) | corriger les bacs blancs du Pack | interface sobre |

**Les principes qui guident chaque écran.**

1. Le papier d'abord. L'élève rédige sur feuille, comme le jour de l'épreuve. Le téléphone donne l'énoncé, le chronomètre et la correction.
2. Jamais la réponse d'emblée. Deux indices avant le corrigé, et le corrigé s'appuie uniquement sur nos fiches.
3. Une séance tient en 25 minutes : 5 minutes de questions à revoir, 15 minutes d'un exercice, 5 minutes de correction.
4. Des chiffres honnêtes. Une note estimée ne s'affiche que si elle repose sur des données suffisantes, toujours avec sa fourchette. Un niveau « viser 18 » n'est proposé sur un chapitre que si ce chapitre a du contenu de ce niveau.
5. Le téléphone d'abord. Chaque écran se conçoit en 390 points de large, puis s'élargit pour l'ordinateur.
6. Rien n'est téléchargeable d'un bloc. Le contenu payant reste sur le serveur et n'est envoyé qu'à un compte qui y a droit.

## 2. Les offres et ce qu'elles ouvrent

### Les offres

| Offre | Prix | Paiement | Contenu |
| --- | --- | --- | --- |
| Gratuit | 0 € | aucun | le test de niveau, une préparation de DS offerte, l'exercice du jour |
| Mensuel | 9,99 € par mois | abonnement, résiliable en ligne | l'application complète, sans les stages en direct |
| Pass Bac 2027 | 79 €, une fois | paiement unique | l'application jusqu'aux résultats du bac, les trois stages en direct (Noël, printemps, sprint final) |
| Pass, tarif clients actuels | 59 €, une fois | paiement unique | le Pass, pour une adresse e-mail reconnue parmi les clients de la boutique |
| Stage à l'unité | 29 € | paiement unique | un stage en direct ; déduit du Pass si l'élève prend le Pass dans les 7 jours |
| Pack BAC | 149 €, une fois | paiement unique, au printemps | le Pass, le cahier imprimé, deux bacs blancs corrigés par un professeur |

Le Pack n'est pas achetable avant le printemps : il est présenté avec sa date, sans bouton d'achat. Le prix n'est jamais lu dans ce que le navigateur envoie : le serveur choisit le tarif à partir de l'offre demandée et du compte.

### Ce que chaque situation ouvre

| Capacité | Sans compte | Gratuit | Mensuel | Pass ou Pack | Bêta (jusqu'au 19 décembre) |
| --- | --- | --- | --- | --- | --- |
| Test de niveau, résultat, envoi du résultat à un parent | oui | oui | oui | oui | oui |
| Lire les énoncés, L'essentiel, Ce qui est tombé, les notions | non | oui | oui | oui | oui |
| Indices | non | oui | oui | oui | oui |
| Quiz du chapitre, corrigé tout de suite | non | oui | oui | oui | oui |
| Carnet d'erreurs | non | oui | oui | oui | oui |
| Corrigé de la question 1 de chaque fiche | non | oui | oui | oui | oui |
| Exercice du jour, avec son corrigé | non | oui | oui | oui | oui |
| Une préparation de DS, corrigés de son plan compris | non | une seule | sans limite | sans limite | sans limite |
| Tous les corrigés | non | non | oui | oui | oui |
| Séance du jour complète, niveaux et tests de passage, plan de l'année, bac blanc, sujets du bac | non | non | oui | oui | oui |
| Stages en direct | non | à l'unité | à l'unité | inclus | à l'unité |

Règles complémentaires :

- **Bêta.** Une vingtaine de clients actuels, invités par leur adresse e-mail, ont tout du 7 au 19 décembre. Ensuite ils repassent en gratuit, avec le tarif clients actuels.
- **Clients actuels.** Leurs achats de la boutique sont importés une fois. En se connectant avec la même adresse, ils retrouvent leurs fiches : les corrigés des fiches correspondant à ce qu'ils ont acheté sont ouverts. Les fonctions de coach (mode DS sans limite, niveaux, plan de l'année) demandent le Pass, au tarif de 59 €.
- **Le parent paie.** L'élève envoie un lien d'achat à son parent. Le droit acheté s'attache au compte de l'élève désigné par ce lien, jamais à une valeur saisie dans le formulaire.
- **Fin des droits.** Un remboursement, un litige perdu ou la fin d'un abonnement retire le droit correspondant. Un abonnement résilié reste actif jusqu'à la fin de la période payée.

## 3. Les écrans et leurs règles

Les noms d'écran reprennent ceux du prototype. Les lots de `docs/05-plan-de-livraison.md` disent quand chaque écran est livré.

### 3.1 L'entrée sans compte

- **Accueil et test de niveau.** Le test actuel reste en ligne et sans compte jusqu'au résultat : diagnostic de 40 questions en 30 minutes, modes chapitre, express et bac blanc, maths et physique-chimie. Ses adresses actuelles ne changent pas.
- **Résultat.** Score, point de départ conseillé (viser 10, 14 ou 18), résultat par domaine. Deux boutons : « Garder mon score : créer mon compte » et « Envoyer à mes parents ».
- **Envoyer à mes parents.** L'élève saisit l'adresse d'un parent. Le parent reçoit un e-mail au texte fixe (aucun texte libre de l'élève) : le score, ce qu'il faut travailler, la présentation de l'application et un lien vers la page parents.
- **Corrections à faire sur l'existant.** Le compte à rebours vise le 16 juin 2027. La page « élite » perd son code écrit en clair dans le programme envoyé au navigateur : son accès passe par le compte.

### 3.2 Le compte

- **Connexion.** Une adresse e-mail, un code à six chiffres reçu par e-mail, pas de mot de passe. Le même écran sert à l'inscription et à la connexion, et son message ne dit jamais si une adresse a déjà un compte.
- **Profil minimal.** Prénom, classe (terminale ou première), spécialités, note visée (10, 14 ou 18). Aucun nom de famille, aucune date de naissance, aucun établissement.
- **Avant 15 ans.** À l'inscription, l'élève indique s'il a 15 ans ou plus. S'il a moins de 15 ans, l'adresse d'un parent est demandée, le parent reçoit une demande d'accord, et le compte reste limité au test de niveau tant que l'accord n'est pas donné. La preuve de l'accord est conservée.
- **Rattachement du test.** Le résultat du test fait sans compte se rattache au compte créé juste après, sur le même appareil.
- **Appareils.** Trois appareils actifs au plus par compte. Une connexion sur un quatrième ferme la plus ancienne. L'élève voit ses appareils et peut les déconnecter. Une connexion sur un nouvel appareil déclenche un e-mail d'information.
- **Mes données.** Depuis le profil : télécharger ses données, supprimer son compte, régler les rappels par e-mail, choisir le thème (automatique, clair, sombre).

### 3.3 Aujourd'hui

L'écran d'accueil de l'élève connecté.

- Deux comptes à rebours : le prochain DS et le bac.
- La séance du jour, avec sa raison : « elle prépare ton DS », « elle suit ta classe », ou « premier chapitre de l'année » si aucun chapitre n'est coché.
- La préparation du DS en cours : séances faites sur séances prévues, prochaine séance.
- Les DS passés dont la note manque, avec le champ pour la saisir.
- La régularité de la semaine : séances faites sur séances prévues selon la note visée (3 pour viser 10, 4 pour viser 14, 5 pour viser 18).
- En offre gratuite, un rappel de ce qui est inclus et un lien vers les offres.

### 3.4 La séance du jour

Trois étapes, dans cet ordre : les questions à revoir (5 minutes), un exercice à son niveau sur papier (15 minutes), la correction (5 minutes). La séance se reprend là où elle s'est arrêtée. Une séance sautée ne casse rien : celle du lendemain se recalcule. En offre gratuite, la séance se réduit à l'exercice du jour et à sa correction.

### 3.5 Les cours

- **Liste.** Les 14 fiches de physique-chimie rangées par domaine du programme. Sur chaque fiche : l'état d'avancement et la case « vu en classe ». Cocher un chapitre l'ajoute à ce que la séance du jour peut proposer.
- **Une fiche.** Six onglets : L'essentiel (une page), Questions, Exercices, Quiz, Ce qui est tombé (les sujets du bac qui portent sur le chapitre, avec les questions de la fiche qui y préparent), Notions.
- **Une question ou un exercice.** L'énoncé, avec le contexte commun quand plusieurs questions le partagent ; le niveau, le type, les points et la durée pour un exercice, la mention « tombé au BAC » ; puis, dans l'ordre : indice 1, indice 2 (débloqué après le premier), corrigé.
- **Se corriger sur une question de cours.** Après le corrigé, l'élève compare avec sa feuille et choisit : réussi, en partie, raté.
- **Se corriger sur un exercice.** Le corrigé se déroule question par question. Pour chacune, l'élève choisit : trouvé, en partie, pas trouvé. La question suivante apparaît ensuite. Une dernière ligne, « Rédaction », porte sur la phrase de conclusion, les unités et le vocabulaire. Le total s'affiche sur le barème de l'exercice ; l'élève peut changer une réponse avant de valider sa note.
- **Signaler une erreur.** Sur chaque question, chaque exercice et chaque question de quiz. Le message arrive dans l'administration avec la référence exacte.

### 3.6 Les quiz

- **Types de questions.** QCM, vrai ou faux, texte à trous, association, mise en ordre (et lecture graphique dans le test actuel).
- **Correction.** Elle se fait sur le serveur. Le navigateur ne reçoit jamais la bonne réponse avant que l'élève ait répondu. Après chaque réponse : juste ou faux, la bonne réponse, et une explication.
- **Quiz du chapitre.** Dix questions au plus, sans chronomètre, les questions ratées et jamais faites en premier.
- **Quiz d'une séance de DS.** Tiré une fois à la création du plan, pour que le titre de la séance annonce le vrai nombre de questions.
- **Test de passage.** Cinq questions du niveau visé, 15 minutes, réussi à 70 % de bonnes réponses.
- **Révision du carnet.** Les questions de quiz arrivées à échéance.
- **Vrai ou faux à justifier.** Comme au bac : l'élève tranche, écrit sa justification sur sa feuille, puis la compare à la nôtre.
- **Texte à trous.** La comparaison ignore la casse, les accents, les espaces et les signes « · », « . », « * » et « × », et accepte les réponses équivalentes listées avec la question.

### 3.7 Le mode DS

« Tu as DS jeudi ? Donne-moi le chapitre. »

- **Créer.** La date du devoir, sa durée (1 h, 2 h ou 4 h), la note visée, les chapitres. Le format se choisit seul selon le temps restant et s'affiche avant la validation.

| Format | Quand | Contenu |
| --- | --- | --- |
| Express | la veille ou le jour même | 20 minutes : l'essentiel du chapitre, un quiz de 10 questions au plus, les pièges |
| Trois jours | de 2 à 6 jours avant | 3 séances de 30 minutes : test, exercices ciblés sur les points faibles, un exercice type |
| Une semaine | 7 jours avant ou plus | 5 séances, un DS blanc chronométré au format du devoir, puis l'essentiel la veille |

- **Le plan.** Des séances datées, chacune avec ses tâches. Le plan est construit une fois et gardé tel quel. L'élève coche une séance faite.
- **Le DS blanc.** Les conditions du devoir : chronomètre, énoncés seuls, pas de corrigé pendant l'épreuve. La correction se fait ensuite partie par partie, au barème.
- **Après le devoir.** L'élève saisit sa note sur 20 et, s'il la connaît, la moyenne de la classe. La note recale la note estimée. Un e-mail le lui rappelle le lendemain du devoir.
- **Offre gratuite.** Une préparation offerte par compte. Tous les corrigés des questions et exercices de son plan sont ouverts jusqu'au lendemain du devoir.
- **Rappels.** Un e-mail la veille au soir ou le jour de chaque séance d'un plan, réglable et désactivable dans le profil.

### 3.8 Le carnet d'erreurs

Chaque question ratée ou réussie en partie revient 2 jours plus tard, puis 7 jours, puis 21 jours après chaque réussite ; un nouvel échec la ramène au début. L'écran liste ce qui est à revoir aujourd'hui et ce qui arrive ensuite.

### 3.9 Les progrès

- La note estimée en physique-chimie et sa fourchette, quand elle est affichable (voir `docs/08-moteur.md`). Sinon : ce qu'il manque pour l'afficher.
- Par chapitre vu en classe : le niveau atteint (10, 14 ou 18), ce qu'il faut pour le suivant, et le test de passage quand il est disponible.
- Par notion : à voir, en cours, acquis, solide.
- La courbe des notes de DS saisies.
- Le bilan du mois : ce qui a été fait, ce qui a progressé, ce qu'il faut viser le mois suivant.

### 3.10 Le plan de l'année

- Trois parcours : viser 10, viser 14, viser 18.
- Cinq périodes : premier trimestre (jusqu'au 18 décembre 2026), vacances de Noël (19 décembre au 3 janvier), janvier à mars, vacances de printemps (avril), mai et juin (jusqu'au 17 juin 2027). Chaque période a un but et ce qu'elle contient.
- Le plan suit ce que l'élève coche comme vu en classe. Une séance sautée ne casse rien.

### 3.11 Les parents

- **Le lien.** L'élève donne l'adresse d'un parent. Le parent reçoit une invitation, crée son propre accès (e-mail et code) et voit la page de suivi de son enfant. L'élève peut retirer le lien.
- **La page de suivi.** Séances faites sur séances prévues, temps de travail, note estimée quand elle est affichable, prochain devoir et avancement de sa préparation, chapitres vus et niveau atteint, notes de DS saisies, un conseil pour aider cette semaine. Le parent ne voit jamais les réponses de son enfant ni le détail de ses erreurs.
- **Le bilan de la semaine.** Le même contenu, par e-mail, le dimanche. Jusqu'à son automatisation, Yane le déclenche depuis l'administration.
- **Payer.** Depuis la page de suivi ou le lien d'achat envoyé par l'enfant.

### 3.12 Les offres, le paiement, les stages

- **Offres.** Les cartes du prototype, avec l'offre actuelle du compte.
- **Paiement.** Avant la redirection vers la page de paiement de Stripe : l'adresse du payeur, et une case non cochée par défaut, « Je demande l'accès immédiat au contenu numérique et je renonce à mon droit de rétractation de 14 jours pour ce contenu ». Sans cette case, pas de paiement. La date, le texte exact et sa version sont conservés avec l'achat.
- **Après le paiement.** L'accès s'ouvre quand le serveur a reçu la confirmation de Stripe, pas au retour du navigateur. Un e-mail confirme l'accès, rappelle la renonciation et donne les conditions de vente.
- **Résilier le mensuel.** Depuis le profil, en trois écrans au plus, avec un e-mail de confirmation.
- **Se rétracter.** Une page accessible depuis le pied de page et le profil : l'achat concerné, la confirmation, un accusé de réception par e-mail. La demande arrive dans l'administration.
- **Stages.** Inscription, e-mail de confirmation, lien du direct envoyé la veille. Le stage acheté à l'unité est déduit du Pass acheté dans les 7 jours.
- **Textes légaux.** Conditions de vente, mentions légales, politique de confidentialité. Tu en écris une première version marquée « à faire relire par un juriste » ; Yane les fait valider avant l'ouverture.

### 3.13 Les sujets du bac, le bac blanc, la correction

- **Bac blanc.** En janvier, en avril et fin mai : un sujet complet chronométré au format de l'épreuve (3 h 30 en physique-chimie), composé d'exercices des fiches, corrigé au barème.
- **Sujets 2025 et 2026.** Chronométrés, par exercice ou en entier, corrigés avec nos corrigés. Les énoncés officiels ne sont mis en ligne qu'après validation de Yane (voir `docs/07-contenu.md`).
- **Correction sur photo.** En test à partir de février, pour les élèves de la bêta d'abord : l'élève photographie sa copie, reçoit un retour sur notre barème, présenté comme indicatif. La fonction est derrière un interrupteur, avec un plafond de coût et une durée de conservation courte.
- **Correction par un professeur.** Pour le Pack : l'élève dépose sa copie de bac blanc, un correcteur la note au barème et la commente, l'élève reçoit le retour. Deux copies par Pack.

### 3.14 L'administration

Réservée au rôle administrateur, avec une double authentification.

- Signalements d'erreur : liste, référence, état, réponse.
- Contenu : relecture des brouillons (indices, explications de quiz, barèmes, nouvelles questions) tels que l'élève les verra, avec « valider » ou « renvoyer avec un commentaire » ; historique des imports.
- Élèves : recherche par adresse, droits, actions d'assistance (ouvrir ou retirer un droit avec un motif), suppression d'un compte.
- Bêta : invitations, et le tableau qui mesure le critère de fin (combien d'élèves ont préparé un vrai DS).
- Ventes : paiements, abonnements, demandes de rétractation.
- Parents : envoi des bilans de la semaine.
- Preuves : notes de DS avant et après, séances par semaine, abonnés encore là au bout de deux mois.
- Réglages : interrupteurs de fonctions, état des tâches planifiées, e-mails en échec.

Chaque action de l'administration est journalisée.

### 3.15 Les e-mails

| E-mail | Destinataire | Déclencheur |
| --- | --- | --- |
| Code de connexion | élève, parent | demande de connexion |
| Nouvelle connexion sur un nouvel appareil | élève, parent | connexion réussie sur un appareil inconnu |
| Demande d'accord parental | parent | inscription d'un élève de moins de 15 ans |
| Invitation à suivre son enfant | parent | l'élève donne l'adresse du parent |
| Résultat du test | parent | « Envoyer à mes parents » |
| Lien d'achat | parent | l'élève demande à son parent de payer |
| Accès ouvert | payeur et élève | paiement confirmé |
| Rappel de séance de DS | élève | la veille au soir ou le jour d'une séance d'un plan |
| Rappel de note | élève | le lendemain d'un DS sans note |
| Bilan de la semaine | parent | le dimanche |
| Stage : confirmation, lien du direct | inscrit | inscription, veille du stage |
| Résiliation, rétractation : accusé de réception | payeur | demande |
| Invitation à la bêta | élève | envoi par Yane |

Les rappels et le bilan portent un lien de désinscription en un clic. Aucun e-mail ne contient de texte libre saisi par un utilisateur.

## 4. Les cinq ajustements du 13 novembre

Ils viennent de l'analyse du prototype (`docs/contexte/analyse-du-13-novembre.md`). Ils sont intégrés dans ce cahier des charges. Pour en retirer un, Yane supprime sa ligne ici et te le dit ; tu ouvres alors une décision dans `docs/decisions/`.

| N° | Ajustement | Pourquoi | Où il s'applique |
| --- | --- | --- | --- |
| 1 | Dans la préparation de DS offerte, les corrigés du plan sont ouverts | sur le plan testé, 4 corrigés sur 5 étaient verrouillés : l'essai gratuit ne montrait pas ce que l'application apporte | sections 2 et 3.7 |
| 2 | La moyenne de la classe est demandée avec chaque note de DS, sans être obligatoire | une note seule ne dit pas si le devoir était difficile ; la moyenne rend la preuve des progrès plus solide | section 3.7 |
| 3 | Une question réussie du premier coup revient une fois, une semaine plus tard | sans cela, une réussite n'est jamais revue, alors que l'état « solide » demande deux réussites à une semaine d'écart | `docs/08-moteur.md` |
| 4 | Un niveau se valide par un quiz corrigé par le serveur ; le barème a une ligne « Rédaction » ; la note estimée ne s'affiche qu'une fois recalée sur une note de DS | trois réponses que l'élève juge lui-même réussies suffisaient pour le niveau 10 ; le bac 2027 donne au moins 2 points à la langue | sections 3.5 et 3.9, `docs/08-moteur.md` |
| 5 | Un e-mail rappelle chaque séance d'un plan de DS | l'élève ne reviendra pas seul sur l'application trois soirs de suite | section 3.7 |

## 5. Les règles de rédaction de l'interface

- On écrit « cours », jamais « leçon ».
- On n'écrit jamais « découvrez », « découvre » ni « prochainement ». Une fonction à venir se présente avec sa date.
- L'application tutoie l'élève. Les pages et e-mails destinés au parent le vouvoient. Le texte des fiches (énoncés, corrigés) s'adresse à l'élève avec « vous » et ne se réécrit pas.
- Pas de tiret long. Pas d'émoji dans l'interface.
- Les nombres s'écrivent à la française : virgule décimale, espace insécable avant l'unité et avant « : ; ? ! ».
- Les durées : « 30 min », « 2 h », « 1 h 30 ». Les dates : « jeudi 19 novembre », « demain », « hier ».
- Un bouton dit ce qu'il fait : « Construire mon plan », « Voir le corrigé », « Valider ma note ».
- Un message d'erreur dit ce qui s'est passé et quoi faire, sans terme technique.
- Les noms de niveaux : « viser 10 », « viser 14 », « viser 18 ».

## 6. Ce que nous ne construisons pas

Classement entre élèves, Grand oral, Parcoursup, import des cours de l'élève, application native pour iPhone ou Android, offre pour les lycées, export PDF des fiches, connexion par Google ou Apple, mot de passe, publicité, revente ou partage de données.

Restent au programme sans date, derrière un interrupteur éteint : le code de groupe pour une classe, la garantie mesurée (remboursement si la note estimée ne monte pas après trente jours à trois séances par semaine), les vidéos de cours, les notifications sur le téléphone.

## 7. Points à confirmer par Yane

En attendant sa réponse, la valeur par défaut s'applique. Chaque réponse devient une décision dans `docs/decisions/`.

| Point | Valeur par défaut |
| --- | --- |
| Ce que l'offre gratuite ouvre en dehors des trois éléments de la stratégie | la lecture des énoncés, les indices, les quiz du chapitre et le carnet d'erreurs, comme dans le prototype |
| Ce que retrouve un client actuel | les corrigés des fiches qu'il a achetées ; le reste demande le Pass à 59 € |
| Nombre d'appareils actifs par compte | 3 |
| Heure des rappels de séance | 18 h, heure de Paris, la veille pour une séance du matin, le jour même sinon |
| Durée d'ouverture des corrigés de la préparation offerte | jusqu'au lendemain du devoir |
| Mesure d'audience des pages publiques | l'outil sans cookie déjà en place, retiré des pages où l'élève est connecté ; à faire confirmer par le juriste |
| Les « cartes méthode » de la stratégie | pas d'onglet à part : les encadrés « Méthode » restent dans les corrigés et servent de second indice |
| Achat du Pack | par Stripe, avec l'adresse de livraison, au printemps |
| Régime de TVA et mentions des reçus | à demander au comptable avant l'ouverture du paiement |
