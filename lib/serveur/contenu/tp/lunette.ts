import "server-only";
import { nombre } from "@/lib/commun/format";
import { vergence, type ReglagesOptique } from "@/lib/commun/tp/paillasses/optique";
import { variante, type Mesures, type Tp } from "./types";

const cm = (x: number, d = 1) => `${nombre(x, d)} cm`;

// ---------- Une lunette afocale sur le banc d'optique ----------
/** L'œil fictif : la distance focale de sa lentille, en cm. Son écran est dans son plan focal. */
const OEIL = 12.5;
/** L'angle sous lequel l'objet lointain du banc est vu, en radians : sans lunette, son image mesure 1,5 cm sur l'écran de l'œil fictif. */
const ANGLE = 0.12;
/** L'angle qui sépare les deux feux à l'œil nu, et le pouvoir séparateur de l'œil, en dix-millièmes de radian. */
const FEUX = 1;
const SEPARATEUR = 3;
/**
 * Les lentilles possibles : la vergence de l'objectif et celle de l'oculaire, en dioptries. La graine de l'essai en
 * choisit une paire ; deux paires séparent les deux feux, deux ne les séparent pas.
 */
const LOTS = [{ C1: 2, C2: 10 }, { C1: 4, C2: 10 }, { C1: 2, C2: 8 }, { C1: 4, C2: 8 }];

const reglages = (graine: number): ReglagesOptique => {
  const lot = variante(graine, LOTS);
  return {
    rail: 120, source: { genre: "lointain", x: 12, angle: ANGLE },
    boite: [
      { id: `c${lot.C2}`, etiquette: lot.C2, f: 100 / lot.C2 },
      { id: `d${lot.C2}`, etiquette: -lot.C2, f: -100 / lot.C2 },
      { id: `c${lot.C1}`, etiquette: lot.C1, f: 100 / lot.C1 },
    ],
    supports: [20, 46], recepteur: { genre: "oeil", x: 104, f: OEIL },
    but: { genre: "lunette", objectif: `c${lot.C1}`, oculaire: `c${lot.C2}` },
  };
};

// ce que l'élève calcule à partir de ses mesures : les positions des deux lentilles, les deux tailles d'image
const distance = (m: Mesures) => m.x2 - m.x1;
const grossissement = (m: Mesures) => m.y1 / m.y0;
const ecart = (m: Mesures, attendu: number) => (100 * Math.abs(grossissement(m) - attendu)) / attendu;
const angleVu = (m: Mesures) => grossissement(m) * FEUX;

const lunette: Tp = {
  id: "lunette", titre: "Une lunette sur le banc d'optique", matiere: "physique", famille: "Lunette astronomique", fiche: 7, minutes: 25, etat: "brouillon",
  accroche: "Deux lentilles, un rail, un œil fictif. Règle ta lunette jusqu'à l'image nette, mesure son grossissement, et dis si elle sépare deux feux lointains.",
  etapes: (graine) => {
    const lot = variante(graine, LOTS);
    const [f1, f2] = [100 / lot.C1, 100 / lot.C2];
    const [objectif, oculaire] = [vergence(lot.C1), vergence(lot.C2)];
    const attendu = f1 / f2;
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          "Depuis la terrasse du lycée, le club d'astronomie veut observer les deux feux rouges d'un pylône lointain. À l'œil nu, on ne voit qu'un seul point.",
          `Avec deux lentilles convergentes du laboratoire, de ${objectif} et de ${oculaire}, tu construis une lunette astronomique sur le banc d'optique.`,
          "Tu la règles pour qu'elle soit afocale, tu mesures son grossissement, puis tu dis si elle sépare les deux feux.",
        ],
        documents: [
          { titre: "La lunette astronomique", lignes: ["Deux lentilles convergentes sur le même axe : l'objectif, du côté de l'objet, et l'oculaire, du côté de l'œil.", "L'objectif est la lentille de plus grande distance focale.", "La lunette est afocale quand le foyer image de l'objectif est confondu avec le foyer objet de l'oculaire : O₁O₂ = f′₁ + f′₂. Un œil au repos voit alors l'image nette.", "Grossissement : G = θ′/θ = f′₁/f′₂"] },
          { titre: "Le banc d'optique", lignes: ["Un objet lointain : une lettre F placée au foyer d'une lentille. Sa lumière arrive sur le banc comme celle d'un objet très éloigné.", `Un œil fictif : une lentille et un écran placé dans son plan focal, à ${cm(OEIL)}. Comme un œil au repos, il ne forme une image nette que d'un objet très éloigné.`, "Sur l'écran de l'œil fictif, la taille de l'image est proportionnelle à l'angle sous lequel l'objet est vu.", `Dans la boîte : deux lentilles convergentes, de ${objectif} et de ${oculaire}, et une lentille divergente.`] },
          { titre: "Les deux feux du pylône", lignes: [`À l'œil nu, les deux feux sont séparés par un angle θ = ${nombre(FEUX, 1)} × 10⁻⁴ rad.`, `Pouvoir séparateur de l'œil : ε = ${nombre(SEPARATEUR, 1)} × 10⁻⁴ rad. L'œil distingue deux points s'il les voit sous un angle supérieur à ε.`, "À travers la lunette, l'angle devient θ′ = G × θ."] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "À quelle condition un œil distingue-t-il les deux feux ?",
        options: ["S'il les voit sous un angle supérieur à son pouvoir séparateur", "S'il les voit sous un angle inférieur à son pouvoir séparateur", "Si les deux feux sont assez lumineux", "Si le pylône est plus haut que la terrasse"], bonne: 0,
        explication: `L'œil sépare deux points vus sous un angle supérieur à ε = ${nombre(SEPARATEUR, 1)} × 10⁻⁴ rad. À l'œil nu, l'angle ne vaut que ${nombre(FEUX, 1)} × 10⁻⁴ rad : la lunette doit le grossir.`,
      },
      {
        genre: "choix", competence: "ANA", question: "Laquelle des deux lentilles convergentes places-tu du côté de l'objet, comme objectif ?",
        options: [`La lentille de ${objectif} : elle a la plus grande distance focale`, `La lentille de ${oculaire} : elle a la plus grande vergence`, "L'une ou l'autre : le grossissement est le même"], bonne: 0,
        explication: `L'objectif est la lentille de plus grande distance focale : ${cm(f1)} pour celle de ${objectif}, contre ${cm(f2)} pour celle de ${oculaire}. Montée à l'envers, la lunette rapetisse.`,
      },
      {
        genre: "valeur", competence: "ANA", question: "Quelle distance faut-il entre l'objectif et l'oculaire pour que la lunette soit afocale ?", unite: "cm", decimales: 1, absolu: 0.05,
        aide: "f′ = 1/C, en mètres quand C est en dioptries. Puis O₁O₂ = f′₁ + f′₂.",
        attendu: () => f1 + f2,
        detail: () => `f′₁ = 1/${lot.C1} m = ${cm(f1)} ; f′₂ = 1/${lot.C2} m = ${cm(f2)} ; O₁O₂ = ${nombre(f1, 1)} + ${nombre(f2, 1)} = ${cm(f1 + f2)}.`,
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
        etapes: [
          "Sans lunette, mesurer la taille de l'image sur l'écran de l'œil fictif.",
          "Poser l'objectif du côté de l'objet, et l'oculaire du côté de l'œil fictif.",
          "Déplacer l'oculaire jusqu'à ce que l'image soit nette sur l'écran.",
          "Lire sur le rail les positions des deux lentilles.",
          "Mesurer la taille de l'image formée à travers la lunette.",
        ],
        // mesurer la nouvelle image avant de lire les positions convient aussi
        autres: [[0, 1, 2, 4, 3]],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: "Construis ta lunette sur le banc d'optique. Tout se fait à la main : tu choisis les lentilles dans la boîte, tu les poses sur les supports, tu les glisses sur le rail jusqu'à l'image nette, tu lis leurs positions à la loupe, tu mesures les images à la règle.",
        protocole: [
          "Éteindre la lumière de la salle et allumer la lampe de la source.",
          "Sans lentille sur les supports, poser la règle contre l'image et noter sa taille : c'est l'image sans lunette.",
          `Poser l'objectif, de ${objectif}, sur le premier support, du côté de l'objet. Poser l'oculaire, de ${oculaire}, sur le second.`,
          "Glisser l'oculaire jusqu'à ce que l'image soit nette sur l'écran de l'œil fictif : aller et venir autour de la netteté, puis finir au millimètre en glissant dans la loupe.",
          "Noter les positions des deux lentilles, lues sur le rail au millimètre.",
          "Poser la règle contre la nouvelle image et noter sa taille.",
        ],
        paillasse: { genre: "optique", reglages: reglages(graine) },
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule la distance entre tes deux lentilles.", unite: "cm", decimales: 1, absolu: 0.05,
        aide: "C'est la différence entre les deux positions lues sur le rail.",
        attendu: distance,
        detail: (m) => `O₁O₂ = ${nombre(m.x2, 1)} − ${nombre(m.x1, 1)} = ${cm(distance(m))}. Une lunette afocale demande f′₁ + f′₂ = ${cm(f1 + f2)} : ${Math.abs(distance(m) - f1 - f2) <= 1 ? "ton réglage s'accorde avec cette valeur." : "ton réglage s'en écarte, l'image n'était pas tout à fait nette."}`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule le grossissement de ta lunette à partir de tes deux tailles d'image.", unite: "(sans unité)", decimales: 2, relatif: 0.02,
        aide: "Sur l'écran de l'œil fictif, la taille de l'image est proportionnelle à l'angle. Le grossissement G = θ′/θ est donc le rapport des deux tailles.",
        attendu: grossissement,
        detail: (m) => `G = taille avec la lunette / taille sans la lunette = ${nombre(m.y1, 1)} / ${nombre(m.y0, 1)} = ${nombre(grossissement(m), 2)}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule l'écart relatif, en pourcentage, entre ce grossissement et la valeur f′₁/f′₂.", unite: "%", decimales: 1, absolu: 0.4,
        aide: `f′₁/f′₂ se calcule avec les distances focales des deux lentilles : ${cm(f1)} et ${cm(f2)}.`,
        attendu: (m) => ecart(m, attendu),
        detail: (m) => `f′₁/f′₂ = ${nombre(f1, 1)} / ${nombre(f2, 1)} = ${nombre(attendu, 2)}. Écart = |${nombre(grossissement(m), 2)} − ${nombre(attendu, 2)}| / ${nombre(attendu, 2)} = ${nombre(ecart(m, attendu), 1)} %.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Sous quel angle les deux feux sont-ils vus à travers ta lunette ? Réponds en dix-millièmes de radian.", unite: "× 10⁻⁴ rad", decimales: 1, relatif: 0.02,
        aide: "θ′ = G × θ, avec le grossissement que tu as mesuré.",
        attendu: angleVu,
        detail: (m) => `θ′ = G × θ = ${nombre(grossissement(m), 2)} × ${nombre(FEUX, 1)} × 10⁻⁴ rad = ${nombre(angleVu(m), 1)} × 10⁻⁴ rad.`,
      },
      {
        genre: "choix", competence: "VAL", question: "D'après ta mesure, ta lunette permet-elle de distinguer les deux feux ?",
        options: ["Oui", "Non"], bonne: (m) => (angleVu(m) > SEPARATEUR ? 0 : 1),
        explication: (m) => {
          const sien = angleVu(m) > SEPARATEUR;
          const vrai = attendu * FEUX > SEPARATEUR;
          return `À travers ta lunette, l'angle vaut ${nombre(angleVu(m), 1)} × 10⁻⁴ rad : il est ${sien ? "supérieur" : "inférieur"} au pouvoir séparateur de l'œil, ${nombre(SEPARATEUR, 1)} × 10⁻⁴ rad. ${sien ? "Les deux feux se distinguent." : "Les deux feux restent confondus : il faudrait un objectif de plus grande distance focale, ou un oculaire de plus petite."}${sien === vrai ? "" : ` Une manipulation sans défaut donne ${nombre(attendu * FEUX, 1)} × 10⁻⁴ rad : si la tienne a eu des fautes, refais tes mesures avec plus de soin.`}`;
        },
      },
    ];
  },
};

export default lunette;
