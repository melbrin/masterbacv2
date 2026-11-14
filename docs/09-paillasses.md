# Les TP et leurs paillasses

Ce document dit comment un TP virtuel est construit, et comment écrire une paillasse. Le pourquoi est dans `docs/decisions/0012-tp-virtuels-pour-les-ece.md`.

## 1. Ce que Yane attend

Ses mots, le 14 novembre : « Pour les TP, l'élève ne manipule pas assez comme dans la vraie vie. Avec les outils en place, il fallait pousser l'expérience immersive au maximum. »

Une paillasse est donc un vrai poste de travail, pas une suite de boutons :

- **Tout se fait à la main.** L'élève prend un objet et le pose (en le glissant, ou en le touchant puis en touchant l'endroit). Il verse en maintenant l'appui. Il tourne un robinet ou une molette. Il tire un fil d'une borne à l'autre. Il déplace un curseur, une lentille, un récepteur.
- **Il lit lui-même.** Un appareil à graduations se lit à la loupe ; un appareil à écran affiche ses chiffres. Rien d'autre n'écrit la mesure à sa place : ni le message du bas, ni une étiquette. Il note sa lecture avec le pavé de chiffres.
- **Il est libre de mal faire.** Aucun geste n'est interdit parce qu'il est faux. Verser sans rien dessous renverse. Ne pas rincer dilue. Lire trop tôt donne une valeur fausse. La mesure de l'élève porte la trace de ses gestes, et la suite du TP se calcule avec sa mesure.
- **Le professeur dit ce qui s'est passé.** À la fin, chaque faute est dite simplement, avec ses chiffres et ce qu'il fallait faire.

Yane refuse aussi toute mise en forme « typique des IA » : pas de carte arrondie avec une barre de couleur sur un côté, pas de liste d'icônes dans des carrés. La paillasse est une scène de nuit dessinée au trait, dans la charte (cuivre, crème, bleu nuit).

## 2. Comment un TP est fait

Un TP suit le fil d'un sujet d'ECE : préparer, manipuler, exploiter. C'est une liste d'étapes, validées dans l'ordre, une seule fois chacune.

| Étape | Ce que fait l'élève | Compétence |
| --- | --- | --- |
| `lecture` | lit la situation et ses documents | aucune |
| `choix` | répond à une question | APP, ANA ou VAL |
| `materiel` | choisit le matériel, avec des pièges | ANA |
| `ordre` | remet le protocole dans l'ordre | ANA |
| `paillasse` | manipule | REA |
| `valeur` | calcule une valeur à partir de ses propres mesures | VAL |

- **Le serveur est le professeur.** Le contenu complet, avec les réponses, est dans `lib/serveur/contenu/tp/` : un fichier par TP. Le navigateur ne reçoit que l'énoncé de chaque étape (`etapePublique`, dans `lib/serveur/tp.ts`).
- **La manipulation est rejouée.** La vue garde la liste des gestes de l'élève. À « J'ai fini », la liste part au serveur, qui la rejoue avec les règles de la paillasse et rend les fautes et les mesures. La vue ne décide jamais d'un résultat.
- **Les mesures suivent l'élève.** Le bilan de la paillasse rend des `mesures` (des nombres). Les étapes `valeur` et `choix` qui suivent calculent leur réponse avec elles : un élève qui a mal mesuré mais bien calculé a juste à l'exploitation.
- **La graine change la situation.** `etapes(graine)` reçoit la graine de l'essai. Elle choisit les valeurs cachées (`variante(graine, [...])`) : refaire le TP donne une autre inconnue. La même graine redonne les mêmes étapes, et leur nombre ne change pas.
- **Le bilan.** Chaque étape vaut de 0 à 1. La moyenne par compétence donne A (0,9 et plus), B (0,6), C (0,3) ou D. Une faute légère de manipulation retire un quart, une faute importante la moitié.

## 3. Les trois fichiers d'une paillasse

| Fichier | Rôle |
| --- | --- |
| `lib/commun/tp/paillasses/<genre>.ts` | les règles : des fonctions pures, sans horloge ni hasard |
| `components/tp/paillasses/<Genre>.tsx` | la vue : elle dessine l'état, recueille les gestes |
| `lib/serveur/contenu/tp/<id>.ts` | un TP qui se sert de la paillasse |

Les registres de l'application (`lib/serveur/tp.ts`, `components/tp/paillasses/index.tsx`, `lib/serveur/contenu/tp/index.ts`) n'inscrivent que les paillasses et les TP relus et essayés.

**Une paillasse en construction ne s'inscrit jamais dans ces registres.** Un fichier à moitié écrit qui entre dans l'application casse les pages des élèves : c'est arrivé le 14 novembre, pendant que Yane essayait. Elle se met au point sur un banc de chantier, qui ne charge que les fichiers de sa famille :

- `app/(appli)/app/tp/chantier/<famille>/page.tsx` : le banc, en local seulement (`/app/tp/chantier/<famille>?tp=<id>&graine=3`) ;
- `components/tp/chantier/<Famille>.tsx` : les vues de la famille ;
- `lib/serveur/commandes/chantier/<famille>.ts` : la commande qui juge une manipulation avec les règles de la famille.

Quand un TP est relu, essayé et vert, il passe dans les trois registres de l'application, et son chantier peut être retiré.

### Les règles

Elles exportent `regles`, de type `ReglesPaillasse<Reglages, Etat>` (`lib/commun/tp/types.ts`) :

- `depart(r)` : l'état avant le premier geste.
- `geste(r, etat, g)` : l'état après un geste. Un geste est un `GesteBrut` : `{ g: "verser", v: 0.05 }`. Le nom `g` fait 2 à 20 lettres minuscules ; il porte au plus sept autres valeurs, des nombres entre −1 000 000 et 1 000 000, des textes courts (lettres, chiffres, `+ _ . : -`) ou des booléens. Un geste inconnu, mal formé ou impossible ne change rien : la fonction ne lève jamais d'erreur.
- `bilan(r, etat)` : le score (0 si rien n'a été fait), les fautes (`code`, `grave`, `texte`), les `mesures` pour la suite, et des `lignes` qui disent ces mesures en phrases. Si l'élève n'a rien mesuré, les mesures portent la valeur du professeur : le TP continue.

À respecter :

- Les réglages (`r`) portent les valeurs cachées. Ils partent au navigateur, qui dessine la paillasse : c'est accepté. Le jugement, lui, ne vient que du serveur.
- Un versement continu se découpe en petits morceaux. Deux morceaux à la suite doivent valoir leur somme : la vue les regroupe dans la liste des gestes (`ajoute`, dans `Titrage.tsx`). Arrondis les volumes au centième dans l'état.
- Une faute se dit avec ses chiffres et le bon geste : « Tu as franchi l'équivalence au filet, et tu l'as dépassée de 0,24 mL : près du changement de couleur, ferme le robinet jusqu'au goutte à goutte. »

### La vue

Elle reçoit `PropsPaillasse<Reglages>` : `reglages`, `protocole`, `attente`, `fini(gestes)`. Elle se monte dans un `Etabli` et dessine dans une `Scene`.

- L'état se calcule avec les règles : `setPartie((p) => ({ etat: regles.geste(r, p.etat, g), gestes: ajoute(p.gestes, g) }))`.
- Le corps d'un objet sert à le déplacer (`Objet`, `Cible`). Le geste qu'il permet est un bouton rond à côté (`Poussoir`) : maintenu pour verser, touché pour une goutte.
- Chaque geste a son équivalent au clavier. Les pièces du kit le donnent : flèches sur une molette, Espace maintenue sur un poussoir, et un pas fixe (`pas`) avec la flèche droite. L'essai automatique se sert de ces pas, qui ne dépendent pas du temps.
- Le message du bas dit ce qui vient de se passer, jamais la valeur que l'élève doit lire.
- Les crochets du kit qui convertissent le doigt en point du dessin (`useGlisse`, `Objet`, `Molette`) s'appellent dans un composant placé sous `Scene` (voir `TraceCourbe` dans `Titrage.tsx`).
- Les règles de React de ce dépôt : pas de `setState` directement dans le corps d'un effet, pas de composant défini dans un composant.
- Une scène fait 360 unités de large, en hauteur (portrait). Une zone de toucher fait au moins 44 unités. Les textes font au moins 9 unités. Les objets que l'élève déplace se dessinent en dernier.
- Pendant une lecture, la vue peut se rapprocher de l'appareil : `Scene vue={...}` (voir `VUE_LOUPE`). La scène ne montre que sa vue : ce qui est dessiné en dehors ne se voit pas.
- Chaque objet porte son nom, sur lui ou dessous. Un geste refusé s'explique (`rate` de `Manipulation`). Un appui bref sur un poussoir fait quelque chose (`useVersement`). Un geste continu ralentit près du repère à atteindre.
- Une saisie (`Releve`) ne montre pas de valeur d'exemple dans son champ ; `signe` ajoute la touche « plus ou moins ».
- Les animations qui ne sont que décor passent par le CSS, sous `prefers-reduced-motion: no-preference`. Les styles propres à une paillasse vont dans `components/tp/paillasses/<genre>.css`, importé par la vue, avec des classes qui commencent par `pl-<genre>-`.

## 4. Le kit

`components/tp/kit/index.ts` liste les pièces : `Etabli`, `Releve`, `Scene`, `Manipulation`, `Objet`, `Cible`, `useGlisse`, `useMaintien`, `useVersement`, `Molette`, `Poussoir`, `Interrupteur`, `Touche`, `Echelle`, `Loupe`, `LoupeNiveau`, `Afficheur`, `Fils`, la verrerie, `son`, `vibre`, et le guide (`useGuide`, `Main`, `Indication`). Lis les commentaires de chaque fichier.

Le modèle à suivre est la paillasse Titrage : `lib/commun/tp/paillasses/titrage.ts` et `titrage-guide.ts`, `components/tp/paillasses/Titrage.tsx`, `lib/serveur/contenu/tp/detartrant.ts` et `vinaigre.ts`, `tests/unitaires/tp/titrages.test.ts` et `titrage-guide.test.ts`, `scripts/essais/titrage.mts` et `titrage-guide.mts`.

## 5. Le guide

Les mots de Yane, le 14 novembre au soir, après avoir essayé le titrage : « C'est pas mal, mais c'est pas très compréhensible. Il faudrait donner des indications, avec par exemple une main près de ce qu'il faut faire, ou du moins on doit pouvoir activer le hint. »

Chaque paillasse a donc un guide. Quand il est en marche, une main dessinée montre le prochain geste dans la scène, une phrase le dit en bas de l'écran, et l'étape en cours ressort dans le protocole. L'élève le coupe d'un bouton (« Guide », en haut de l'établi, et un interrupteur sur la carte qui ouvre la paillasse). Il est en marche à la première visite ; le choix est gardé sur l'appareil.

**Ce que ça change à la note.** Une manipulation faite avec le guide est une manipulation aidée : son score est plafonné à 0,75, donc au niveau B (`PLAFOND_AVEC_GUIDE`, `lib/commun/tp/types.ts`). L'élève le sait avant (la carte de la paillasse, la confirmation quand il demande le guide en cours de route), pendant (« J'ai fini ») et après (la correction). « Tout recommencer » efface la marque. La paillasse n'a rien à faire pour ça : l'établi et `SuiviDuGuide` s'en chargent, et le serveur retire la marque avant de rejouer les gestes.

**Ce que la paillasse fournit.** Trois choses, sur le modèle du titrage :

1. *Le prochain geste*, dans `lib/commun/tp/paillasses/<genre>-guide.ts` : une fonction pure `prochain(reglages, etat, vue)` qui rend toujours un pas, le premier geste qui manque dans l'ordre du protocole. Un pas porte une clé (`rincer-verser`), une phrase, le rang de l'étape du protocole, et le geste sous forme de noms (glisser tel objet sur telle cible, garder le doigt sur tel poussoir, tourner telle molette jusqu'à telle valeur, regarder tel appareil, toucher telle touche du bas, attendre). `vue` est ce que la vue retient en plus de l'état des règles (un outil posé, un robinet ouvert). Si la vue a de la logique à elle (poser un objet), elle passe aussi dans ce fichier : le test peut alors la jouer.
2. *La main*, dans la vue : `const guide = useGuide()` ; si `guide.actif`, la vue calcule le pas et en fait une `Indication` (`components/tp/kit/guide.tsx`) en donnant au geste ses points dans le dessin. Elle la passe à `<Etabli indication={...}>` (null quand le guide est coupé) et à `<Main indication={...} />`, placée en dernier dans la scène. Les places des objets, des cibles et des poussoirs s'écrivent une seule fois, dans des tables que le dessin et la main lisent tous les deux. Une touche du bas visée par le guide reçoit la classe `pl-vise` ; « J'ai fini » la reçoit seul quand l'indication porte `appel`.
3. *Les preuves* : un test (`tests/unitaires/tp/<genre>-guide.test.ts`) où un élève de test fait sans réfléchir ce que le guide dit, pour chaque TP et chaque graine, y compris avec un peu de retard : la manipulation obtenue est sans faute et le guide s'arrête sur « J'ai fini ». Et un essai dans le navigateur (`scripts/essais/<genre>-guide.mts`) où un robot suit la main à la souris (`lisGuide`, `faisLeGeste`, `attendsLeGuide` dans `scripts/essais/outils.mts`, avec `ouvre({ guide: true })`) : score 0,75, aucune faute, la correction dit que le guide a servi.

**Les règles du guide.**

- Il dit le geste, jamais la mesure : « Lis dans la loupe la graduation en face du bas du ménisque », pas la valeur. Il peut dire quand s'arrêter (« La couleur a changé pour de bon : ferme le robinet »), comme un professeur à côté de l'élève.
- Une consigne ne clignote pas : si un niveau passe devant un repère pendant un versement, le guide ne change pas d'avis pour un dixième de seconde. Le test « avec retard » le montre.
- La clé ne change que quand le geste à faire change : le robot et la main s'en servent pour savoir qu'on est passé à la suite.
- Rien ne se déplace pendant que ça coule, chauffe ou tourne : le guide fait d'abord fermer, arrêter, couper.
- Une manipulation mal partie se rattrape : le guide fait refaire ce qui peut l'être (vider une burette non rincée, recommencer un titrage dépassé), et continue.
- Les phrases tutoient l'élève, à l'impératif : « Glisse », « Pose », « Garde le doigt sur « Verser » », « Touche « Goutte » », « Tourne », « Regarde ». Pas de tiret long.
- Le guide est coupé dans les essais qui manipulent seuls (`ouvre()` le coupe d'office) : leur score reste 1.

Deux pièces du kit vont avec : `useVersement` (un poussoir qui verse en continu, et un petit morceau au moins pour un appui bref : l'élève ajuste à petits coups) et les rappels `prise` et `rate` de `Manipulation` (dire où va l'objet qu'on vient de prendre, et pourquoi il ne se pose pas là).

## 6. Écrire un TP

- Une situation originale, écrite pour MasterBac. Rien n'est copié d'un sujet officiel ni d'un autre site, et on n'écrit pas « sujet tombé ». `etat: "brouillon"` : Yane valide.
- De 8 à 11 étapes, 20 à 30 minutes. La première est une `lecture` avec deux ou trois documents. Les quatre compétences sont travaillées.
- Trois valeurs cachées au moins, choisies par la graine. Quand le TP finit par une conclusion (« l'étiquette est-elle juste ? »), une des valeurs au moins doit la faire changer.
- L'étape `paillasse` porte un `protocole` : les gestes à faire, dans l'ordre, dits comme un professeur les dicte.
- Les étapes d'exploitation calculent avec les `mesures` de l'élève. Leur correction montre le calcul avec ses nombres.
- Les textes tutoient l'élève, en phrases simples. Pas de tiret long, pas d'émoji. Les nombres s'écrivent avec `nombre()` (`lib/commun/format.ts`) : « 9,80 ».
- `fiche` est le numéro de la fiche de cours liée (1 à 14 ; voir ceux du labo dans `lib/serveur/contenu/defis.ts`).

## 7. Tester

- **Sans navigateur** : un fichier dans `tests/unitaires/tp/`, avec `tests/outils/tp.ts`. Pour un TP en construction, le test importe le fichier du TP et donne ses règles en dernier argument (`{ optique: regles }`), et il appelle `controlesCommuns`. Il joue la manipulation soignée de chaque TP pour chaque graine (`joueJuste`, `GRAINES`) : A partout, aucune faute. Il joue des manipulations fautives et vérifie les codes des fautes. Il vérifie qu'un geste inconnu ne change rien, et que deux morceaux d'un versement valent leur somme. Les règles sont couvertes à peu près en entier.
- **Dans un vrai navigateur** : un script dans `scripts/essais/`, avec `scripts/essais/outils.mts`. Le banc (de chantier pour un TP en construction, `/app/tp/banc/<id>?graine=3` pour un TP inscrit) montre les paillasses d'un TP sans les autres étapes et affiche le jugement du serveur (le score est dans l'attribut `data-score`). Le script glisse, maintient, tourne, lit, note, puis relève le jugement, la largeur de la page et les erreurs de console. Il prend des captures : il faut les regarder et corriger ce qui se chevauche, se coupe ou se lit mal.
- **Le guide** a ses deux preuves (section 5) : le test où un élève suit le guide sans réfléchir, et l'essai où un robot suit la main à la souris. Pour un TP inscrit, un troisième essai joue le TP entier dans son cadre, du sommaire au bilan, comme un bon élève (`scripts/essais/tp-eleve.mts`).
- **Les gestes maladroits** ont leur essai (`scripts/essais/titrage-maladroit.mts`) : un objet lâché au mauvais endroit, un appui très bref, un récipient qui déborde, le guide demandé en cours de route. La paillasse doit toujours dire ce qui se passe, et quoi faire.
- La connexion par code est limitée (cinq par heure et par adresse, dix par poste). Un essai garde sa session dans un fichier hors du dépôt (`ESSAI_SESSION`). Une session ne sert qu'à un essai à la fois.
