import "server-only";
import { nombre } from "@/lib/commun/format";
import { vergence, type ReglagesOptique } from "@/lib/commun/tp/paillasses/optique";
import { variante, type Mesures, type Tp } from "./types";

const cm = (x: number, d = 1) => `${nombre(x, d)} cm`;

// ---------- Une lentille à contrôler sur le banc d'optique ----------
/** La hauteur de la lettre lumineuse, en cm. */
const OBJET = 2;
/** L'écart toléré par le fabricant entre la vergence réelle et celle de la monture, en pourcentage. */
const TOLERANCE = 5;
/**
 * Les lentilles possibles : la vergence annoncée sur la monture (en dioptries), la distance focale réelle (en cm), et les
 * trois distances entre l'objet et la lentille que le protocole propose. La graine de l'essai en choisit une ; une sur
 * deux dément sa monture.
 */
const LOTS = [
  { C: 8, f: 12.3, distances: [30, 24, 18] },
  { C: 8, f: 13.6, distances: [30, 24, 18] },
  { C: 10, f: 10.2, distances: [25, 20, 15] },
  { C: 10, f: 9.2, distances: [25, 20, 15] },
  { C: 5, f: 20.4, distances: [50, 40, 30] },
  { C: 5, f: 18.6, distances: [50, 40, 30] },
];

const reglages = (graine: number): ReglagesOptique => {
  const lot = variante(graine, LOTS);
  return {
    rail: 120, source: { genre: "lettre", x: 10, taille: OBJET },
    boite: [
      { id: "div", etiquette: -lot.C, f: -100 / lot.C },
      { id: "c3", etiquette: 3, f: 100 / 3 },
      { id: "cible", etiquette: lot.C, f: lot.f },
      { id: "c20", etiquette: 20, f: 5 },
    ],
    supports: [45], recepteur: { genre: "ecran", x: 105 },
    but: { genre: "focale", lentille: "cible", mesures: 3, distances: lot.distances, taille: true },
  };
};

// ce que l'élève calcule à partir de ses lectures sur le rail
const objetLentille = (m: Mesures, k: number) => m[`xl${k}`] - m[`xo${k}`];
const lentilleEcran = (m: Mesures, k: number) => m[`xe${k}`] - m[`xl${k}`];
const focale = (m: Mesures, k: number) => 1 / (1 / objetLentille(m, k) + 1 / lentilleEcran(m, k));
const focaleMoyenne = (m: Mesures) => (focale(m, 1) + focale(m, 2) + focale(m, 3)) / 3;
/** Le grandissement de la mesure où la règle a été posée : ses positions sont dans xot, xlt et xet. */
const grandissement = (m: Mesures) => (m.xet - m.xlt) / (m.xlt - m.xot);
const vergenceMesuree = (m: Mesures) => 100 / focaleMoyenne(m);
const ecart = (m: Mesures, C: number) => (100 * Math.abs(vergenceMesuree(m) - C)) / C;
const calcul = (m: Mesures, k: number) => `OA = ${nombre(m[`xl${k}`], 1)} − ${nombre(m[`xo${k}`], 1)} = ${cm(objetLentille(m, k))} ; OA′ = ${nombre(m[`xe${k}`], 1)} − ${nombre(m[`xl${k}`], 1)} = ${cm(lentilleEcran(m, k))}`;

const focaleTp: Tp = {
  id: "focale", titre: "Une lentille à contrôler", matiere: "physique", famille: "Lentilles", fiche: 7, minutes: 25, etat: "brouillon",
  accroche: "La monture d'une lentille annonce sa vergence. Forme une image nette sur le banc d'optique, lis les positions au millimètre, et vérifie-la.",
  etapes: (graine) => {
    const lot = variante(graine, LOTS);
    const annoncee = vergence(lot.C);
    const [loin, milieu, pres] = lot.distances;
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          `Le club photo du lycée construit un petit projecteur. Il a commandé une lentille convergente : sa monture annonce une vergence de ${annoncee}.`,
          `Avant de la monter, tu dois vérifier cette indication. Le fabricant garantit la vergence à ${TOLERANCE} % près.`,
          "Sur le banc d'optique, tu formes l'image nette d'un objet lumineux pour trois positions de la lentille. La relation de conjugaison donne alors sa distance focale.",
        ],
        documents: [
          { titre: "La lentille", lignes: [`Vergence annoncée sur la monture : C = ${annoncee}, garantie à ${TOLERANCE} % près`, "Vergence et distance focale : C = 1/f′, avec f′ en mètres et C en dioptries (δ)", "Une lentille convergente a les bords minces. Une lentille divergente a les bords épais : elle ne forme pas d'image sur un écran."] },
          { titre: "Le banc d'optique", lignes: ["Un rail gradué en millimètres, de 0 à 120 cm", `Une source et son objet lumineux : la lettre F, haute de ${cm(OBJET)}`, "Un support de lentille et un écran, qui glissent sur le rail", "Chaque pièce porte un repère : la graduation en face de lui donne sa position."] },
          { titre: "La relation de conjugaison", lignes: ["O est le centre de la lentille, A l'objet, A′ son image sur l'écran.", "Avec les distances du banc, toutes positives : 1/f′ = 1/OA + 1/OA′", "OA est la distance de l'objet à la lentille, OA′ la distance de la lentille à l'écran.", "L'image n'est nette que pour une seule position de l'écran.", "Taille de l'image = taille de l'objet × OA′/OA"] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "Que dois-tu déterminer pour contrôler l'indication de la monture ?",
        options: ["La distance focale de la lentille, puis sa vergence", "La hauteur de la lettre F", "La longueur du banc d'optique", "La puissance de la lampe"], bonne: 0,
        explication: `La vergence est l'inverse de la distance focale. Tu mesures f′ sur le banc, tu en déduis C, et tu compares à ${annoncee}.`,
      },
      {
        genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour mesurer la distance focale de la lentille.",
        objets: [
          { id: "banc", nom: "Banc d'optique gradué", utile: true, pourquoi: "Il aligne la source, la lentille et l'écran, et donne leurs positions au millimètre." },
          { id: "laser", nom: "Laser", utile: false, pourquoi: "Son faisceau très fin ne donne pas l'image d'un objet étendu." },
          { id: "source", nom: "Source avec la lettre F lumineuse", utile: true, pourquoi: "C'est l'objet dont la lentille forme l'image. La lettre montre aussi que l'image est renversée." },
          { id: "divergente", nom: "Lentille divergente", utile: false, pourquoi: "Elle ne forme pas d'image sur un écran, et ce n'est pas la lentille à contrôler." },
          { id: "ecran", nom: "Écran", utile: true, pourquoi: "L'image se forme sur lui : on le déplace jusqu'à ce qu'elle soit nette." },
          { id: "prisme", nom: "Prisme", utile: false, pourquoi: "Il dévie et décompose la lumière : il ne forme pas d'image." },
          { id: "regle", nom: "Règle graduée en millimètres", utile: true, pourquoi: "Elle mesure la taille de l'image sur l'écran." },
        ],
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
        etapes: [
          "Allumer la source et poser la lentille sur son support, entre l'objet et l'écran.",
          "Placer la lentille à plus d'une distance focale de l'objet.",
          "Déplacer l'écran jusqu'à obtenir une image nette de la lettre.",
          "Lire sur le rail les positions de l'objet, de la lentille et de l'écran.",
          "Déplacer la lentille et recommencer, pour obtenir trois mesures.",
        ],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: "Fais tes trois mesures sur le banc d'optique. Tout se fait à la main : tu choisis la lentille dans la boîte, tu glisses les supports sur le rail, tu cherches l'image nette, tu lis chaque position à la loupe.",
        protocole: [
          "Éteindre la lumière de la salle et allumer la lampe de la source.",
          `Prendre dans la boîte la lentille de ${annoncee} et la poser sur le support, entre l'objet et l'écran.`,
          `Placer la lentille à ${loin} cm environ de l'objet. Déplacer l'écran jusqu'à ce que l'image de la lettre soit nette : aller et venir autour de la netteté, puis finir au millimètre en glissant dans la loupe.`,
          "Noter les positions de l'objet, de la lentille et de l'écran, lues sur le rail au millimètre.",
          `Recommencer avec la lentille à ${milieu} cm environ de l'objet, puis à ${pres} cm environ.`,
          "À la troisième mesure, sans rien déplacer, poser la règle contre l'image et noter sa taille.",
        ],
        paillasse: { genre: "optique", reglages: reglages(graine) },
      },
      {
        genre: "valeur", competence: "VAL", question: "Avec ta mesure n° 1, calcule la distance focale de la lentille.", unite: "cm", decimales: 1, relatif: 0.01,
        aide: "Calcule d'abord OA, de l'objet à la lentille, et OA′, de la lentille à l'écran, par différence de positions. Puis 1/f′ = 1/OA + 1/OA′.",
        attendu: (m) => focale(m, 1),
        detail: (m) => `${calcul(m, 1)} ; 1/f′ = 1/${nombre(objetLentille(m, 1), 1)} + 1/${nombre(lentilleEcran(m, 1), 1)}, donc f′ = ${cm(focale(m, 1), 2)}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule de la même façon la distance focale pour tes mesures n° 2 et n° 3, puis la moyenne des trois valeurs.", unite: "cm", decimales: 2, relatif: 0.01,
        aide: "Une valeur de f′ par mesure, puis leur somme divisée par trois.",
        attendu: focaleMoyenne,
        detail: (m) => `Mesure n° 2 : f′ = ${cm(focale(m, 2), 2)}. Mesure n° 3 : f′ = ${cm(focale(m, 3), 2)}. Moyenne : (${nombre(focale(m, 1), 2)} + ${nombre(focale(m, 2), 2)} + ${nombre(focale(m, 3), 2)}) / 3 = ${cm(focaleMoyenne(m), 2)}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Pour la mesure où tu as posé la règle contre l'image, calcule le rapport OA′/OA : c'est le grandissement, sans son signe.", unite: "(sans unité)", decimales: 2, relatif: 0.02,
        aide: "OA′ est la distance de la lentille à l'écran, OA la distance de l'objet à la lentille. Tes mesures disent à laquelle la taille de l'image appartient.",
        attendu: grandissement,
        detail: (m) => {
          const regle = m.t / OBJET;
          const accord = Math.abs(regle - grandissement(m)) <= 0.08 * grandissement(m);
          return `OA′/OA = ${nombre(m.xet - m.xlt, 1)} / ${nombre(m.xlt - m.xot, 1)} = ${nombre(grandissement(m), 2)}. Avec ta règle : taille de l'image / taille de l'objet = ${nombre(m.t, 1)} / ${nombre(OBJET, 1)} = ${nombre(regle, 2)}. ${accord ? "Les deux valeurs s'accordent : tes mesures sont cohérentes." : "Les deux valeurs ne s'accordent pas : la mise au point ou la lecture de la règle est à revoir."}`;
        },
      },
      {
        genre: "valeur", competence: "VAL", question: "Déduis de ta distance focale moyenne la vergence de la lentille.", unite: "δ", decimales: 2, relatif: 0.01,
        aide: "C = 1/f′, avec f′ en mètres.",
        attendu: vergenceMesuree,
        detail: (m) => `f′ = ${cm(focaleMoyenne(m), 2)} = ${nombre(focaleMoyenne(m) / 100, 4)} m, donc C = 1 / ${nombre(focaleMoyenne(m) / 100, 4)} = ${nombre(vergenceMesuree(m), 2)} δ.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule l'écart relatif entre ta vergence et celle de la monture, en pourcentage.", unite: "%", decimales: 1, absolu: 0.3,
        aide: "Écart relatif : la différence entre les deux valeurs, divisée par la valeur de la monture.",
        attendu: (m) => ecart(m, lot.C),
        detail: (m) => `Écart = |${nombre(vergenceMesuree(m), 2)} − ${nombre(lot.C, 0)}| / ${nombre(lot.C, 0)} = ${nombre(ecart(m, lot.C), 1)} %.`,
      },
      {
        genre: "choix", competence: "VAL", question: `D'après ta mesure, la vergence annoncée sur la monture est-elle juste à ${TOLERANCE} % près ?`,
        options: ["Oui", "Non"], bonne: (m) => (ecart(m, lot.C) <= TOLERANCE ? 0 : 1),
        explication: (m) => {
          const sansDefaut = (100 * Math.abs(100 / lot.f - lot.C)) / lot.C;
          return ecart(m, lot.C) <= TOLERANCE
            ? `Ton écart relatif, ${nombre(ecart(m, lot.C), 1)} %, est inférieur à ${TOLERANCE} % : la lentille est conforme à sa monture.${sansDefaut > TOLERANCE ? ` Une manipulation sans défaut donne pourtant ${nombre(sansDefaut, 1)} % : si la tienne a eu des fautes, refais tes mesures avec plus de soin.` : ""}`
            : `Ton écart relatif, ${nombre(ecart(m, lot.C), 1)} %, dépasse ${TOLERANCE} % : avec ta mesure, la lentille n'est pas conforme à sa monture.${sansDefaut <= TOLERANCE ? ` Une manipulation sans défaut donne ${nombre(sansDefaut, 1)} % : si la tienne a eu des fautes, refais tes mesures avec plus de soin.` : ""}`;
        },
      },
    ];
  },
};

export default focaleTp;
