// Le kit des paillasses (décision 0012) : de quoi construire une paillasse où l'élève manipule comme au laboratoire.
//
// Une paillasse se compose de trois fichiers :
//   - ses règles, pures, dans lib/commun/tp/paillasses/ : un état, des gestes, un bilan (ReglesPaillasse, lib/commun/tp/types.ts) ;
//   - sa vue, dans components/tp/paillasses/ : elle dessine l'état, recueille les gestes de l'élève et les garde en liste ;
//   - le contenu des TP qui s'en servent, sur le serveur, dans lib/serveur/contenu/tp/.
// La vue applique chaque geste avec les règles, pour dessiner ; le serveur rejoue la liste des gestes avec les mêmes
// règles, pour juger. La vue ne décide donc jamais d'un résultat.
//
// Les pièces :
//   Etabli, Releve ............ l'écran de la manipulation (plein écran, protocole, appel au professeur) ; la saisie d'une lecture
//   Scene, useDessin .......... le dessin SVG, sa vue qui se rapproche, la conversion du doigt en point du dessin
//   Manipulation, Objet, Cible  prendre un objet et le poser : en le glissant, ou en touchant l'objet puis la cible
//   useGlisse, useMaintien .... glisser un élément ; maintenir un appui (verser, aspirer) avec un pas fixe au clavier
//   Molette, Interrupteur, Touche  les commandes d'un appareil
//   Echelle, Loupe, LoupeNiveau, Afficheur  ce qui se lit : l'élève lit lui-même, rien ne l'écrit à sa place
//   Fils ...................... les bornes d'un montage et les fils que l'élève tire entre elles
//   Burette, Erlenmeyer, Becher, Fiole, Flacon, Eprouvette, PipetteJaugee, Pissette, CompteGouttes, Filet, Goutte
//   son, vibre ................ les petits sons et les vibrations des gestes
//
// Les règles de dessin : une scène fait 360 unités de large ; une zone de toucher fait au moins 44 unités ; les objets
// que l'élève déplace se dessinent en dernier ; les couleurs viennent des variables de la charte (--encre, --cuivre,
// --vert, --brique, --bleu, --sable, --discret), qui prennent leurs versions de nuit dans l'établi.

export * from "./commandes";
export * from "./Etabli";
export * from "./fils";
export * from "./gestes";
export * from "./mesure";
export * from "./scene";
export * from "./son";
export * from "./verrerie";
