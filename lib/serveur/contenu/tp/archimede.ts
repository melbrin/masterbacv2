import "server-only";
import { nombre } from "@/lib/commun/format";
import type { ReglagesArchimede, Solide } from "@/lib/commun/tp/paillasses/archimede";
import { variante, type Mesures, type Tp } from "./types";

const newtons = (x: number) => `${nombre(x, 3)} N`;
const ml = (x: number) => `${nombre(x, 1)} mL`;

// ---------- La poussée d'Archimède, puis un liquide à identifier ----------
const G = 9.81;
/** Les trois cylindres de la paillasse : aluminium, verre, PVC. La graine de l'essai dit lequel étudier. */
const SOLIDES: Solide[] = [
  { id: "a", nom: "cylindre A", hauteur: 7, rho: 2.7 },
  { id: "b", nom: "cylindre B", hauteur: 8, rho: 2.5 },
  { id: "c", nom: "cylindre C", hauteur: 9, rho: 1.4 },
];
/** Les liquides possibles du flacon sans étiquette, avec leur masse volumique en kg/m³ : la graine en choisit un. */
const INCONNUS = [
  { nom: "l'éthanol", option: "L'éthanol", rho: 790 },
  { nom: "l'huile de vaseline", option: "L'huile de vaseline", rho: 880 },
  { nom: "l'eau salée à 20 %", option: "L'eau salée à 20 %", rho: 1150 },
  { nom: "le glycérol", option: "Le glycérol", rho: 1260 },
];
/** Les volumes de liquide dans les deux éprouvettes, en mL. */
const VOLUMES_EAU = [57.5, 60, 55, 62.5, 52.5];
const VOLUMES_X = [54, 51.5, 56.5, 49, 58];

const reglages = (graine: number): ReglagesArchimede => ({
  solides: SOLIDES,
  liquides: [
    { id: "eau", nom: "l'eau", etiquette: "eau", rho: 1, volume: variante(graine, VOLUMES_EAU) },
    { id: "x", nom: "le liquide X", etiquette: "liquide X", rho: variante(graine, INCONNUS).rho / 1000, volume: variante(graine, VOLUMES_X) },
  ],
  demande: variante(graine, SOLIDES).id, reference: "eau", inconnu: "x",
});

/** Le volume du cylindre, en mL : la différence des deux niveaux. */
const volume = (m: Mesures) => m.V1 - m.V0;
const pousseeMesuree = (m: Mesures) => m.P - m.Pe;
/** ρ × V × g dans l'eau, avec V converti en m³. */
const pousseePrevue = (m: Mesures) => 1000 * volume(m) * 1e-6 * G;
const ecart = (m: Mesures) => (100 * Math.abs(pousseeMesuree(m) - pousseePrevue(m))) / pousseePrevue(m);
const pousseeX = (m: Mesures) => m.P - m.Px;
/** La masse volumique du liquide X, en kg/m³. */
const rhoX = (m: Mesures) => pousseeX(m) / (volume(m) * 1e-6 * G);
const plusProche = (m: Mesures) => INCONNUS.reduce((meilleur, l, i) => (Math.abs(l.rho - rhoX(m)) < Math.abs(INCONNUS[meilleur].rho - rhoX(m)) ? i : meilleur), 0);

const archimede: Tp = {
  id: "archimede", titre: "Mesurer une poussée d'Archimède", matiere: "physique", famille: "Fluides", fiche: 4, minutes: 25, etat: "brouillon",
  accroche: "Un cylindre pèse moins lourd dans l'eau. Mesure cette poussée au dynamomètre, puis sers-t'en pour identifier un liquide sans étiquette.",
  etapes: (graine) => {
    const r = reglages(graine);
    const cylindre = variante(graine, SOLIDES).nom;
    const vrai = INCONNUS.indexOf(variante(graine, INCONNUS));
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          "Dans la réserve du laboratoire, un flacon a perdu son étiquette. Il contient un liquide incolore : de l'éthanol, de l'huile de vaseline, de l'eau salée ou du glycérol.",
          "Pour l'identifier sans le sentir ni le goûter, tu vas mesurer sa masse volumique. Un solide plongé dans un liquide reçoit une poussée, et cette poussée dépend du liquide.",
          `Tu vérifies d'abord la relation de la poussée d'Archimède dans l'eau, avec le ${cylindre}. Tu t'en sers ensuite dans le liquide du flacon, appelé liquide X.`,
        ],
        documents: [
          { titre: "La poussée d'Archimède", lignes: ["Un solide immergé dans un fluide reçoit une force verticale, dirigée vers le haut : la poussée d'Archimède.", "Sa valeur : F = ρ × V × g, avec ρ la masse volumique du fluide en kg/m³, V le volume immergé en m³ et g = 9,81 N/kg.", "Accroché à un dynamomètre, le solide immergé semble plus léger : le dynamomètre indique son poids apparent.", "1 mL = 1 cm³ = 10⁻⁶ m³"] },
          { titre: "Le matériel", lignes: ["Un dynamomètre de 1 N, gradué tous les 0,01 N, sur une potence à hauteur réglable", "Trois cylindres à crochet : A en aluminium, B en verre, C en PVC", "Une éprouvette d'eau et une éprouvette de liquide X, de 100 mL, graduées tous les millilitres", "Du papier absorbant"] },
          { titre: "Masses volumiques", lignes: ["Éthanol : 790 kg/m³", "Huile de vaseline : 880 kg/m³", "Eau : 1 000 kg/m³", "Eau salée à 20 % : 1 150 kg/m³", "Glycérol : 1 260 kg/m³"] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "Le cylindre est accroché au dynamomètre, entièrement dans l'eau. Que lit-on sur le dynamomètre ?",
        options: ["Son poids, diminué de la poussée d'Archimède", "Son poids, augmenté de la poussée d'Archimède", "La poussée d'Archimède seule", "Son poids : l'eau ne change rien"], bonne: 0,
        explication: "La poussée est dirigée vers le haut : elle soulage le ressort. Le dynamomètre indique le poids apparent. La poussée est donc la différence entre le poids lu dans l'air et le poids apparent lu dans l'eau.",
      },
      {
        genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour mesurer la poussée et le volume du cylindre.",
        objets: [
          { id: "dynamometre", nom: "Dynamomètre de 1 N, gradué tous les 0,01 N", utile: true, pourquoi: "Il mesure le poids du cylindre dans l'air, puis son poids apparent dans le liquide." },
          { id: "grosdynamometre", nom: "Dynamomètre de 10 N, gradué tous les 0,1 N", utile: false, pourquoi: "La poussée vaut quelques dixièmes de newton : ses graduations sont trop espacées pour la mesurer." },
          { id: "eprouvette", nom: "Éprouvette graduée de 100 mL", utile: true, pourquoi: "Elle contient le liquide, et le niveau qui monte donne le volume du cylindre." },
          { id: "becher", nom: "Bécher de 250 mL", utile: false, pourquoi: "Ses graduations sont indicatives : il ne donne pas un volume au millilitre près." },
          { id: "potence", nom: "Potence à hauteur réglable", utile: true, pourquoi: "Elle porte le dynamomètre et descend le cylindre dans le liquide sans à-coup." },
          { id: "papier", nom: "Papier absorbant", utile: true, pourquoi: "Il essuie le cylindre avant de le plonger dans un autre liquide." },
          { id: "chronometre", nom: "Chronomètre", utile: false, pourquoi: "Rien ne dépend du temps dans cette mesure." },
          { id: "thermometre", nom: "Thermomètre", utile: false, pourquoi: "On ne mesure pas de température ici." },
        ],
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
        etapes: [
          "Accrocher le cylindre au dynamomètre et noter son poids dans l'air.",
          "Placer l'éprouvette d'eau sous le dynamomètre et noter le volume d'eau.",
          "Descendre la potence jusqu'à ce que le cylindre soit entièrement immergé, sans toucher le fond.",
          "Noter le poids apparent et le nouveau volume.",
          "Remonter la potence, essuyer le cylindre, puis recommencer avec l'éprouvette de liquide X.",
        ],
        // lire le volume d'eau avant de peser le cylindre convient aussi
        autres: [[1, 0, 2, 3, 4]],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: `Fais les mesures sur la paillasse avec le ${cylindre}. Tout se fait à la main : tu accroches le cylindre, tu glisses la potence, tu lis le dynamomètre et l'éprouvette à la loupe, et tu notes chaque lecture.`,
        protocole: [
          `Accrocher le ${cylindre} au dynamomètre et noter son poids dans l'air.`,
          "Glisser l'éprouvette d'eau sous le dynamomètre et noter le volume d'eau, en face du bas du ménisque.",
          "Descendre la potence : le cylindre doit être entièrement sous la surface, sans toucher le fond.",
          "Noter le poids apparent lu sur le dynamomètre, puis le volume lu sur l'éprouvette.",
          "Remonter la potence, essuyer le cylindre avec le papier absorbant et ranger l'éprouvette d'eau.",
          "Glisser l'éprouvette de liquide X sous le dynamomètre, immerger le cylindre de la même façon et noter son poids apparent.",
        ],
        paillasse: { genre: "archimede", reglages: r },
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule la poussée d'Archimède que tu as mesurée dans l'eau.", unite: "N", decimales: 3, absolu: 0.006,
        aide: "La poussée soulage le ressort : F = P − P_eau, la différence entre le poids dans l'air et le poids apparent dans l'eau.",
        attendu: pousseeMesuree,
        detail: (m) => `F = P − P_eau = ${newtons(m.P)} − ${newtons(m.Pe)} = ${newtons(pousseeMesuree(m))}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule la poussée que prévoit la relation F = ρ × V × g pour le cylindre dans l'eau.", unite: "N", decimales: 3, relatif: 0.015,
        aide: "Le volume du cylindre est V = V_1 − V_0. Convertis-le en m³ : 1 mL = 10⁻⁶ m³. Pour l'eau, ρ = 1 000 kg/m³, et g = 9,81 N/kg.",
        attendu: pousseePrevue,
        detail: (m) => `V = V_1 − V_0 = ${ml(m.V1)} − ${ml(m.V0)} = ${ml(volume(m))}, soit ${nombre(volume(m), 1)} × 10⁻⁶ m³. F = 1 000 × ${nombre(volume(m), 1)} × 10⁻⁶ × 9,81 = ${newtons(pousseePrevue(m))}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule l'écart relatif entre la poussée mesurée et la poussée prévue, en pourcentage.", unite: "%", decimales: 1, absolu: 0.5,
        aide: "Écart relatif : la différence entre les deux valeurs, divisée par la valeur prévue.",
        attendu: ecart,
        detail: (m) => `Écart = |${nombre(pousseeMesuree(m), 3)} − ${nombre(pousseePrevue(m), 3)}| / ${nombre(pousseePrevue(m), 3)} = ${nombre(ecart(m), 1)} %.`,
      },
      {
        genre: "choix", competence: "VAL", question: "D'après tes mesures, la relation F = ρ × V × g est-elle vérifiée à 5 % près ?",
        options: ["Oui", "Non"], bonne: (m) => (ecart(m) <= 5 ? 0 : 1),
        explication: (m) => (ecart(m) <= 5 ? `Ton écart relatif, ${nombre(ecart(m), 1)} %, est inférieur à 5 % : tes mesures vérifient la relation.` : `Ton écart relatif, ${nombre(ecart(m), 1)} %, dépasse 5 % : avec tes mesures, la relation ne serait pas vérifiée. Avec des lectures soignées, l'écart reste sous 3 % : reprends la manipulation, cylindre entièrement immergé et sans toucher le fond.`),
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule la masse volumique du liquide X.", unite: "kg/m³", decimales: 0, relatif: 0.015,
        aide: "Dans le liquide X, la poussée vaut F_X = P − P_X. Comme F_X = ρ × V × g, la masse volumique du liquide est ρ = F_X / (V × g), avec V en m³.",
        attendu: rhoX,
        detail: (m) => `F_X = P − P_X = ${newtons(m.P)} − ${newtons(m.Px)} = ${newtons(pousseeX(m))}. ρ = F_X / (V × g) = ${nombre(pousseeX(m), 3)} / (${nombre(volume(m), 1)} × 10⁻⁶ × 9,81) = ${nombre(rhoX(m), 0)} kg/m³.`,
      },
      {
        genre: "choix", competence: "VAL", question: "Quel est le liquide X ?",
        options: INCONNUS.map((l) => l.option), bonne: plusProche,
        explication: (m) => `Ta valeur, ${nombre(rhoX(m), 0)} kg/m³, est la plus proche de celle de ${INCONNUS[plusProche(m)].nom} : ${nombre(INCONNUS[plusProche(m)].rho, 0)} kg/m³.${plusProche(m) === vrai ? "" : ` Le flacon contenait en réalité ${INCONNUS[vrai].nom} : tes lectures du dynamomètre sont à reprendre.`}`,
      },
    ];
  },
};

export default archimede;
