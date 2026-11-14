// « L'histoire » : un court texte fabriqué à partir d'un modèle et de détails tirés avec la graine
// (prénom, couleur, nombre, lieu, objet, jour), puis des questions à choix sur ces détails.
// Les modèles sont écrits pour ce jeu. Ils évitent tout accord avec le prénom (ni « il » ni « elle »)
// et toute élision devant lui (« de Inès ») : n'importe quel prénom de la liste s'y range.
import { PRENOMS } from "./mots";
import { ERREURS_MAX } from "./regles";
import { alea, graineManche, type Alea } from "./tirage";

/** Une partie compte trois histoires, de plus en plus longues, et cinq questions par histoire. */
export const PHRASES_HISTOIRE = [4, 5, 6];
export const QUESTIONS_PAR_HISTOIRE = 5;
export const QUESTIONS_HISTOIRE = PHRASES_HISTOIRE.length * QUESTIONS_PAR_HISTOIRE;

export interface QuestionHistoire {
  question: string;
  /** quatre réponses, dont la bonne */
  choix: string[];
  bonne: string;
}
export interface Histoire { phrases: string[]; questions: QuestionHistoire[] }

/** Un détail d'une histoire, et la question qui le demande. */
interface Detail extends QuestionHistoire {
  /** le rang de la phrase qui donne ce détail : une histoire raccourcie ne le demande pas si la phrase est coupée */
  phrase: number;
}
type Modele = (a: Alea) => { phrases: string[]; details: Detail[] };

const majuscule = (texte: string) => texte.charAt(0).toLocaleUpperCase("fr-FR") + texte.slice(1);

/** Un détail en mots : la première valeur est la bonne, les trois autres sont les mauvaises réponses. */
const mots = (a: Alea, phrase: number, question: string, valeurs: readonly string[]): Detail => {
  const choix = valeurs.slice(0, 4).map(majuscule);
  return { phrase, question, bonne: choix[0], choix: a.melange(choix) };
};
/** Un détail en nombre : les réponses sont rangées de la plus petite à la plus grande. */
const nombre = (phrase: number, question: string, valeurs: readonly number[], unite = ""): Detail => {
  const dit = (n: number) => `${n}${unite}`;
  return { phrase, question, bonne: dit(valeurs[0]), choix: valeurs.slice(0, 4).sort((x, y) => x - y).map(dit) };
};

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
/** Des couleurs au masculin : elles suivent toujours un nom masculin. */
const COULEURS = ["rouge", "bleu", "vert", "jaune", "noir", "blanc", "gris", "orange", "violet", "marron"];
const LIEUX = ["au marché", "à la piscine", "au musée", "à la gare", "au stade", "à la plage", "au cinéma", "à la bibliothèque", "au parc", "à la patinoire"];
const OBJETS = ["un parapluie", "un carnet", "une raquette", "un ballon", "une guitare", "un panier", "une lampe", "un bouquet", "une boîte", "un journal"];
/** Des objets au masculin, pour porter une couleur : « un bonnet bleu ». */
const OBJETS_COLORES = ["un carnet", "un foulard", "un bonnet", "un stylo", "un sac", "un gilet", "un cadre", "un coussin", "un vase", "un réveil"];
/** Des villes qui commencent par une consonne : « vient de Lyon ». */
const VILLES = ["Lyon", "Nantes", "Lille", "Bordeaux", "Toulouse", "Marseille", "Rennes", "Strasbourg", "Nice", "Dijon", "Brest", "Tours"];
const HEURE = "\u00a0h";

const MODELES: Modele[] = [
  // le trajet en bus
  (a) => {
    const [p, q, r, s] = a.tire(PRENOMS, 4);
    const jours = a.tire(JOURS, 4);
    const lieux = a.tire(LIEUX, 4);
    const couleurs = a.tire(COULEURS, 4);
    const objets = a.tire(OBJETS, 4);
    const minutes = a.tire([10, 15, 20, 25, 30, 35, 40, 45], 4);
    const billets = a.tire([2, 3, 4, 5, 6, 8], 4);
    const heures = a.tire([14, 15, 16, 17, 18, 19], 4);
    return {
      phrases: [
        `${majuscule(jours[0])}, ${p} prend le bus pour aller ${lieux[0]}.`,
        `${p} porte un manteau ${couleurs[0]} et tient ${objets[0]}.`,
        `Le trajet dure ${minutes[0]} minutes.`,
        `À l'arrivée, ${q} attend devant l'entrée.`,
        `Ensemble, ${p} et ${q} achètent ${billets[0]} billets.`,
        `Le retour est prévu à ${heures[0]} heures.`,
      ],
      details: [
        mots(a, 0, "Quel jour se passe l'histoire\u00a0?", jours),
        mots(a, 0, "Qui prend le bus\u00a0?", [p, q, r, s]),
        mots(a, 0, "Où va le bus\u00a0?", lieux),
        mots(a, 1, "De quelle couleur est le manteau\u00a0?", couleurs),
        mots(a, 1, "Quel objet est tenu à la main\u00a0?", objets),
        nombre(2, "Combien de minutes dure le trajet\u00a0?", minutes),
        mots(a, 3, "Qui attend devant l'entrée\u00a0?", [q, p, r, s]),
        nombre(4, "Combien de billets sont achetés\u00a0?", billets),
        nombre(5, "À quelle heure est prévu le retour\u00a0?", heures, HEURE),
      ],
    };
  },
  // le colis
  (a) => {
    const [p, q, r, s] = a.tire(PRENOMS, 4);
    const jours = a.tire(JOURS, 4);
    const objets = a.tire(OBJETS_COLORES, 4);
    const couleurs = a.tire(COULEURS, 4);
    const villes = a.tire(VILLES, 4);
    const kilos = a.tire([2, 3, 4, 5, 6, 7, 8, 9], 4);
    const rangements = a.tire(["dans le placard", "sur l'étagère", "sous le lit", "dans le tiroir", "sur le bureau", "dans la malle"], 4);
    return {
      phrases: [
        `${p} reçoit un colis ${jours[0]} matin.`,
        `Dans le colis, il y a ${objets[0]} ${couleurs[0]}.`,
        `Le colis vient de ${villes[0]}.`,
        `${q} a envoyé ce cadeau.`,
        `Le colis pèse ${kilos[0]} kilos.`,
        `${p} range le cadeau ${rangements[0]}.`,
      ],
      details: [
        mots(a, 0, "Qui reçoit le colis\u00a0?", [p, q, r, s]),
        mots(a, 0, "Quel jour arrive le colis\u00a0?", jours),
        mots(a, 1, "Qu'y a-t-il dans le colis\u00a0?", objets),
        mots(a, 1, "De quelle couleur est l'objet du colis\u00a0?", couleurs),
        mots(a, 2, "De quelle ville vient le colis\u00a0?", villes),
        mots(a, 3, "Qui a envoyé le cadeau\u00a0?", [q, p, r, s]),
        nombre(4, "Combien de kilos pèse le colis\u00a0?", kilos),
        mots(a, 5, "Où le cadeau est-il rangé\u00a0?", rangements),
      ],
    };
  },
  // le pique-nique
  (a) => {
    const [p, q, r, s] = a.tire(PRENOMS, 4);
    const jours = a.tire(JOURS, 4);
    const lieux = a.tire(["au bord du lac", "dans la forêt", "près de la rivière", "sur la colline", "au parc", "à la plage"], 4);
    const sandwichs = a.tire([4, 5, 6, 8, 10, 12], 4);
    const couleurs = a.tire(COULEURS, 4);
    const objets = a.tire(["un ballon", "un cerf-volant", "une guitare", "un jeu de cartes", "un appareil photo", "une corde à sauter"], 4);
    const heures = a.tire([13, 14, 15, 16, 17], 4);
    const abris = a.tire(["un grand arbre", "un pont", "un kiosque", "un porche", "une tente", "un préau"], 4);
    const minutes = a.tire([5, 10, 15, 20, 30, 40], 4);
    return {
      phrases: [
        `${majuscule(jours[0])}, ${p} organise un pique-nique ${lieux[0]}.`,
        `${p} apporte ${sandwichs[0]} sandwichs dans un panier ${couleurs[0]}.`,
        `${q} arrive avec ${objets[0]}.`,
        `Vers ${heures[0]} heures, il se met à pleuvoir.`,
        `Tout le monde s'abrite sous ${abris[0]}.`,
        `La pluie s'arrête au bout de ${minutes[0]} minutes.`,
      ],
      details: [
        mots(a, 0, "Quel jour a lieu le pique-nique\u00a0?", jours),
        mots(a, 0, "Qui organise le pique-nique\u00a0?", [p, q, r, s]),
        mots(a, 0, "Où a lieu le pique-nique\u00a0?", lieux),
        nombre(1, "Combien de sandwichs sont apportés\u00a0?", sandwichs),
        mots(a, 1, "De quelle couleur est le panier\u00a0?", couleurs),
        mots(a, 2, "Qui rejoint le pique-nique\u00a0?", [q, p, r, s]),
        mots(a, 2, "Avec quel objet la deuxième personne arrive-t-elle\u00a0?", objets),
        nombre(3, "À quelle heure se met-il à pleuvoir\u00a0?", heures, HEURE),
        mots(a, 4, "Sous quoi tout le monde s'abrite-t-il\u00a0?", abris),
        nombre(5, "Combien de minutes dure la pluie\u00a0?", minutes),
      ],
    };
  },
  // l'objet perdu
  (a) => {
    const [p, q, r, s] = a.tire(PRENOMS, 4);
    const objets = a.tire(OBJETS_COLORES, 4);
    const couleurs = a.tire(COULEURS, 4);
    const lieux = a.tire(LIEUX, 4);
    const jours = a.tire(JOURS, 4);
    const cachettes = a.tire(["sous un banc", "derrière une porte", "dans un casier", "près de l'entrée", "sur une chaise", "au fond d'un couloir"], 4);
    const chocolats = a.tire([3, 4, 5, 6, 8, 10], 4);
    const numeros = a.tire([7, 12, 18, 23, 31, 46, 54], 4);
    const jeux = a.tire(["aux échecs", "au tennis", "aux cartes", "au basket", "au ping-pong", "aux dominos"], 4);
    return {
      phrases: [
        `${p} a perdu ${objets[0]} ${couleurs[0]} ${lieux[0]}.`,
        `C'était ${jours[0]} dernier.`,
        `${q} l'a retrouvé ${cachettes[0]}.`,
        `Pour dire merci, ${p} offre ${chocolats[0]} chocolats à ${q}.`,
        `${q} habite au numéro ${numeros[0]} de la rue.`,
        `Depuis, ${p} et ${q} jouent ensemble ${jeux[0]}.`,
      ],
      details: [
        mots(a, 0, "Qui a perdu un objet\u00a0?", [p, q, r, s]),
        mots(a, 0, "Quel objet a été perdu\u00a0?", objets),
        mots(a, 0, "De quelle couleur est l'objet perdu\u00a0?", couleurs),
        mots(a, 0, "Où l'objet a-t-il été perdu\u00a0?", lieux),
        mots(a, 1, "Quel jour l'objet a-t-il été perdu\u00a0?", jours),
        mots(a, 2, "Qui a retrouvé l'objet\u00a0?", [q, p, r, s]),
        mots(a, 2, "Où l'objet a-t-il été retrouvé\u00a0?", cachettes),
        nombre(3, "Combien de chocolats sont offerts\u00a0?", chocolats),
        nombre(4, "À quel numéro habite la deuxième personne\u00a0?", numeros),
        mots(a, 5, "À quel jeu jouent les deux personnages\u00a0?", jeux),
      ],
    };
  },
  // le gâteau
  (a) => {
    const [p, q, r, s] = a.tire(PRENOMS, 4);
    const parfums = a.tire(["au chocolat", "aux pommes", "au citron", "à la vanille", "aux noisettes", "à la fraise"], 4);
    const oeufs = a.tire([2, 3, 4, 5, 6], 4);
    const grammes = a.tire([100, 150, 200, 250, 300], 4);
    const minutes = a.tire([20, 25, 30, 35, 40, 45], 4);
    const couleurs = a.tire(COULEURS, 4);
    const jours = a.tire(JOURS, 4);
    const lieux = a.tire(["dans le jardin", "au gymnase", "à la maison", "au bord du lac", "dans la cour", "sur la terrasse"], 4);
    const invites = a.tire([6, 8, 10, 12, 15], 4);
    return {
      phrases: [
        `${p} prépare un gâteau ${parfums[0]} pour ${q}.`,
        `La recette demande ${oeufs[0]} œufs et ${grammes[0]} grammes de sucre.`,
        `Le gâteau cuit pendant ${minutes[0]} minutes.`,
        `${p} le pose dans un plat ${couleurs[0]}.`,
        `La fête a lieu ${jours[0]}, ${lieux[0]}.`,
        `Il y a ${invites[0]} invités.`,
      ],
      details: [
        mots(a, 0, "Qui prépare le gâteau\u00a0?", [p, q, r, s]),
        mots(a, 0, "À quoi est le gâteau\u00a0?", parfums),
        mots(a, 0, "Pour qui est le gâteau\u00a0?", [q, p, r, s]),
        nombre(1, "Combien d'œufs demande la recette\u00a0?", oeufs),
        nombre(1, "Combien de grammes de sucre demande la recette\u00a0?", grammes),
        nombre(2, "Combien de minutes cuit le gâteau\u00a0?", minutes),
        mots(a, 3, "De quelle couleur est le plat\u00a0?", couleurs),
        mots(a, 4, "Quel jour a lieu la fête\u00a0?", jours),
        mots(a, 4, "Où a lieu la fête\u00a0?", lieux),
        nombre(5, "Combien y a-t-il d'invités\u00a0?", invites),
      ],
    };
  },
  // le voyage en train
  (a) => {
    const [p, q, r, s] = a.tire(PRENOMS, 4);
    const jours = a.tire(JOURS, 4);
    const couleurs = a.tire(COULEURS, 4);
    const heures = a.tire([6, 7, 8, 9, 10, 11], 4);
    const quais = a.tire([1, 2, 3, 4, 5, 6, 7, 8, 9], 4);
    const places = a.tire([12, 18, 24, 31, 36, 42, 47, 53, 65, 78], 4);
    const lectures = a.tire(["un roman", "un journal", "une bande dessinée", "un magazine", "un conte", "une lettre"], 4);
    const villes = a.tire(VILLES, 4);
    const durees = a.tire([2, 3, 4, 5, 6, 7], 4);
    return {
      phrases: [
        `${p} part en voyage ${jours[0]} avec un sac ${couleurs[0]}.`,
        `Le train part à ${heures[0]} heures du quai numéro ${quais[0]}.`,
        `${p} s'assoit à la place ${places[0]}, près de la fenêtre.`,
        `Pendant le trajet, ${p} lit ${lectures[0]}.`,
        `À ${villes[0]}, ${q} monte dans le train.`,
        `Le voyage dure ${durees[0]} heures.`,
      ],
      details: [
        mots(a, 0, "Qui part en voyage\u00a0?", [p, q, r, s]),
        mots(a, 0, "Quel jour commence le voyage\u00a0?", jours),
        mots(a, 0, "De quelle couleur est le sac\u00a0?", couleurs),
        nombre(1, "À quelle heure part le train\u00a0?", heures, HEURE),
        nombre(1, "De quel quai part le train\u00a0?", quais),
        nombre(2, "Quel est le numéro de la place\u00a0?", places),
        mots(a, 3, "Que lit le personnage pendant le trajet\u00a0?", lectures),
        mots(a, 4, "Dans quelle ville une deuxième personne monte-t-elle\u00a0?", villes),
        mots(a, 4, "Qui monte dans le train en cours de route\u00a0?", [q, p, r, s]),
        nombre(5, "Combien d'heures dure le voyage\u00a0?", durees),
      ],
    };
  },
];

export const MODELES_HISTOIRE = MODELES.length;

/**
 * Une histoire : les `phrases` premières phrases d'un modèle, et cinq questions sur les détails de ces phrases,
 * posées dans l'ordre du texte.
 */
export function histoire(graine: number, modele: number, phrases: number): Histoire {
  const a = alea(graine);
  const complet = MODELES[modele % MODELES.length](a);
  const possibles = complet.details.map((detail, rang) => ({ detail, rang })).filter((d) => d.detail.phrase < phrases);
  const questions = a.tire(possibles, QUESTIONS_PAR_HISTOIRE).sort((x, y) => x.rang - y.rang)
    .map(({ detail }) => ({ question: detail.question, choix: detail.choix, bonne: detail.bonne }));
  return { phrases: complet.phrases.slice(0, phrases), questions };
}

/** Les trois histoires d'une partie : trois modèles différents, de 4, 5 puis 6 phrases. */
export function histoiresDePartie(graine: number): Histoire[] {
  const modeles = alea(graine).tire(MODELES.map((_, i) => i), PHRASES_HISTOIRE.length);
  return PHRASES_HISTOIRE.map((phrases, rang) => histoire(graineManche(graine, rang), modeles[rang], phrases));
}

// ---------- le déroulé d'une partie ----------
// Une histoire à lire, puis ses cinq questions ; puis l'histoire suivante. Chaque mauvaise réponse est une erreur :
// la partie s'arrête à la deuxième, ou après la dernière question de la troisième histoire.
// Le score est la part des bonnes réponses sur les quinze questions.

export interface EtatHistoire {
  /** le rang de l'histoire, à partir de 0 */
  histoire: number;
  phase: "lecture" | "question";
  /** le rang de la question dans l'histoire, à partir de 0 */
  question: number;
  /** la réponse donnée à la question en cours ; null tant que l'élève n'a pas répondu */
  choisie: string | null;
  bonnes: number;
  erreurs: number;
}

/** Chaque action porte l'histoire et la question qu'elle vise : un appui et un minuteur qui tombent ensemble ne comptent qu'une fois. */
export type ActionHistoire =
  | { type: "questions"; histoire: number }
  | { type: "reponse"; histoire: number; question: number; choix: string; juste: boolean }
  | { type: "suite"; histoire: number; question: number };

export const DEPART_HISTOIRE: EtatHistoire = { histoire: 0, phase: "lecture", question: 0, choisie: null, bonnes: 0, erreurs: 0 };

/** Vrai quand la réponse affichée est la dernière de la partie. */
export const histoireFinie = (etat: EtatHistoire): boolean =>
  etat.phase === "question" && etat.choisie !== null
  && (etat.erreurs >= ERREURS_MAX || (etat.histoire === PHRASES_HISTOIRE.length - 1 && etat.question === QUESTIONS_PAR_HISTOIRE - 1));

export function avanceHistoire(etat: EtatHistoire, action: ActionHistoire): EtatHistoire {
  if (action.histoire !== etat.histoire) return etat;
  if (action.type === "questions") return etat.phase === "lecture" ? { ...etat, phase: "question", question: 0, choisie: null } : etat;
  if (etat.phase !== "question" || action.question !== etat.question) return etat;
  if (action.type === "reponse") {
    if (etat.choisie !== null) return etat;
    return action.juste ? { ...etat, choisie: action.choix, bonnes: etat.bonnes + 1 } : { ...etat, choisie: action.choix, erreurs: etat.erreurs + 1 };
  }
  if (etat.choisie === null || histoireFinie(etat)) return etat;
  return etat.question + 1 < QUESTIONS_PAR_HISTOIRE
    ? { ...etat, question: etat.question + 1, choisie: null }
    : { ...etat, histoire: etat.histoire + 1, phase: "lecture", question: 0, choisie: null };
}
