// Le registre des jeux de mémoire : leurs noms et leurs familles. Les plateaux sont dans components/memoire/.
// L'ordre est celui de la page : dans chaque famille, du jeu le plus simple à expliquer au plus particulier.
import type { JeuMemoire } from "./types";

export * from "./types";

export const JEUX_MEMOIRE: JeuMemoire[] = [
  // Retenir une suite
  { id: "chiffres", nom: "Suite de chiffres", famille: "suites", icone: "cle", resume: "Retiens des chiffres affichés un par un, puis tape-les dans l'ordre." },
  { id: "envers", nom: "À l'envers", famille: "suites", icone: "ordre", resume: "Retiens une suite de chiffres, puis tape-la du dernier au premier." },
  { id: "couleurs", nom: "Suite de couleurs", famille: "suites", icone: "notion", resume: "Rejoue une suite de touches qui s'allonge à chaque tour." },
  { id: "calcul", nom: "Calcul en chaîne", famille: "suites", icone: "relie", resume: "Garde le total en tête pendant que les opérations s'enchaînent." },
  { id: "tri", nom: "Du plus petit au plus grand", famille: "suites", icone: "medaille", resume: "Retiens des nombres affichés un par un, puis redonne-les rangés." },
  { id: "retour", nom: "Un tour en arrière", famille: "suites", icone: "horloge", resume: "Des symboles défilent\u00a0: dis si chacun est le même qu'un peu plus tôt." },
  // Retenir des places
  { id: "cases", nom: "Cases allumées", famille: "espace", icone: "cible", resume: "Des cases s'allument deux secondes\u00a0: retrouve-les toutes." },
  { id: "chemin", nom: "Le chemin", famille: "espace", icone: "plan", resume: "Des cases s'allument l'une après l'autre\u00a0: refais le chemin dans l'ordre." },
  { id: "places", nom: "Chacun sa place", famille: "espace", icone: "chapitre", resume: "Retiens où chaque objet est posé, puis retrouve sa case." },
  { id: "symboles", nom: "Paires de symboles", famille: "espace", icone: "cartes", resume: "Regarde les cartes, puis retrouve les paires de symboles." },
  // Retenir ce qu'on a vu
  { id: "manquant", nom: "L'objet manquant", famille: "images", icone: "indices", resume: "Des objets reviennent mélangés, un en moins\u00a0: trouve lequel." },
  { id: "change", nom: "Qu'est-ce qui a changé\u00a0?", famille: "images", icone: "oeil", resume: "Une seule forme change sur la planche\u00a0: repère-la." },
  { id: "flash", nom: "Flash", famille: "images", icone: "eclair", resume: "Un code s'affiche une seconde\u00a0: retape-le sans faute." },
  { id: "intrus", nom: "L'intrus", famille: "images", icone: "cible", resume: "Retiens une planche d'objets\u00a0: sur la suivante, un seul est nouveau." },
  { id: "duos", nom: "Formes et couleurs", famille: "images", icone: "drapeau", resume: "Retiens la couleur de chaque forme, puis réponds de mémoire." },
  // Retenir des mots
  { id: "mots", nom: "Liste de mots", famille: "mots", icone: "vraifaux", resume: "Retiens une liste de mots, puis reconnais-les parmi d'autres." },
  { id: "associes", nom: "Mots associés", famille: "mots", icone: "paires", resume: "Retiens des paires de mots sans rapport, puis retrouve le second mot de chacune." },
  { id: "histoire", nom: "L'histoire", famille: "mots", icone: "papier", resume: "Lis une courte histoire, puis réponds à des questions sur ses détails." },
  { id: "file", nom: "Les mots dans l'ordre", famille: "mots", icone: "ordre", resume: "Retiens des mots affichés un par un, puis remets-les dans l'ordre." },
  { id: "prenoms", nom: "Les prénoms", famille: "mots", icone: "indices", resume: "Retiens le prénom de chaque personnage, puis retrouve-le." },
  // Apprendre une méthode
  { id: "paquets", nom: "Par paquets", famille: "methodes", icone: "ampoule", resume: "Retiens un nombre long en le découpant en petits paquets." },
  { id: "palais", nom: "Le palais de mémoire", famille: "methodes", icone: "plan", resume: "Range un objet dans chaque pièce d'une maison, puis retrouve-les de mémoire." },
];

export const jeuMemoire = (id: string): JeuMemoire | null => JEUX_MEMOIRE.find((j) => j.id === id) ?? null;
