import "server-only";
import { nombre } from "@/lib/commun/format";
import type { ReglagesDiffraction } from "@/lib/commun/tp/paillasses/diffraction";
import { variante, type Mesures, type Tp } from "./types";

// ---------- La longueur d'onde d'une diode laser, par les fentes d'Young ----------
/** Les trois diodes laser rouges du fabricant : leur longueur d'onde, en nanomètres. La graine de l'essai choisit celle du laser. */
const DIODES = [660, 635, 685];
/** La distance des fentes à l'écran que donne le protocole, en centimètres. */
const DISTANCE = 150;
/** Ce que vaut, en millimètres, une erreur de lecture sur la graduation de l'écran. */
const LECTURE = 0.5;

const reglages = (graine: number): ReglagesDiffraction => ({
  lambda: variante(graine, DIODES), rail: 200, ecran: 100,
  boite: [
    { id: "y20", genre: "young", a: 30, b: 0.2, nom: "les deux fentes écartées de 0,20 mm", etiquette: ["2 fentes", "0,20 mm"] },
    { id: "f70", genre: "fente", a: 70, b: 0, nom: "la fente simple de 70 µm", etiquette: ["fente", "70 µm"] },
    { id: "y30", genre: "young", a: 30, b: 0.3, nom: "les deux fentes écartées de 0,30 mm", etiquette: ["2 fentes", "0,30 mm"] },
    { id: "fil", genre: "fil", a: 80, b: 0, nom: "le fil de 80 µm", etiquette: ["fil", "80 µm"] },
    { id: "y50", genre: "young", a: 30, b: 0.5, nom: "les deux fentes écartées de 0,50 mm", etiquette: ["2 fentes", "0,50 mm"] },
    { id: "f40", genre: "fente", a: 40, b: 0, nom: "la fente simple de 40 µm", etiquette: ["fente", "40 µm"] },
  ],
  but: { genre: "young", distance: DISTANCE },
});

// ce que l'élève calcule à partir de ses mesures : la distance entre les curseurs et l'écart b en millimètres, D en centimètres
const interfrange = (m: Mesures) => m.x / m.n;
/** λ = i × b / D, en nanomètres : des millimètres fois des millimètres, divisés par des centimètres. */
const longueurOnde = (m: Mesures) => (interfrange(m) * m.b * 1e5) / m.D;
const poidsLecture = (m: Mesures) => (100 * LECTURE) / m.x;
const plusProche = (lambda: number) => DIODES.reduce((meilleure, d, i) => (Math.abs(d - lambda) < Math.abs(DIODES[meilleure] - lambda) ? i : meilleure), 0);
/** Les diodes dans l'ordre où la question les propose : de la plus courte longueur d'onde à la plus longue. */
const PROPOSEES = [...DIODES].sort((a, b) => a - b);

const young: Tp = {
  id: "young", titre: "Une diode laser sans étiquette", matiere: "physique", famille: "Interférences", fiche: 6, minutes: 25, etat: "brouillon",
  accroche: "Trois diodes laser rouges, une seule sans étiquette. Mesure l'interfrange des fentes d'Young, et retrouve sa longueur d'onde.",
  etapes: (graine) => [
    {
      genre: "lecture", titre: "La situation",
      paragraphes: [
        `Un fabricant vend trois diodes laser rouges, de longueurs d'onde ${PROPOSEES.join(" nm, ")} nm. À l'œil, leurs faisceaux ont presque la même couleur.`,
        "Le laser du laboratoire a perdu son étiquette. Tu dois retrouver laquelle des trois diodes il contient.",
        "Pour cela, tu éclaires deux fentes très proches, les fentes d'Young. Sur l'écran apparaissent des franges régulières : leur espacement donne la longueur d'onde.",
      ],
      documents: [
        { titre: "Les interférences de deux fentes", lignes: ["Un laser éclaire deux fentes fines, parallèles, écartées de b. Sur un écran placé à la distance D, on voit des franges brillantes et sombres, régulièrement espacées.", "L'interfrange i est la distance entre les milieux de deux franges brillantes voisines, ou de deux franges sombres voisines.", "Interfrange : i = λ D / b", "Entre la première et la onzième frange sombre, il y a dix interfranges."] },
        { titre: "Le matériel", lignes: ["Le laser à identifier", "Trois diapositives à deux fentes : b = 0,20 mm, 0,30 mm ou 0,50 mm", "Un écran gradué en millimètres, avec deux curseurs", "Un rail gradué en millimètres : son zéro est sous la diapositive."] },
        { titre: "La sécurité", lignes: ["Le faisceau d'un laser ne doit jamais atteindre un œil, même par reflet.", "On fixe le laser sur son support, face à l'écran, avant de l'allumer.", "On l'éteint avant de déplacer quoi que ce soit : le laser, l'écran, une diapositive. Les mains ne passent pas dans le faisceau."] },
      ],
    },
    {
      genre: "choix", competence: "APP", question: "Que dois-tu mesurer sur l'écran pour trouver la longueur d'onde ?",
      options: ["L'interfrange : la distance entre deux franges voisines de même nature", "La hauteur des franges", "La largeur du faisceau du laser", "La luminosité de la frange centrale"], bonne: 0,
      explication: "i = λ D / b : avec l'interfrange, la distance D et l'écart b des fentes, tu calcules λ = i × b / D.",
    },
    {
      genre: "choix", competence: "ANA", question: "Une lecture sur la graduation se fait à un demi-millimètre près. Comment obtenir l'interfrange avec la meilleure précision ?",
      options: ["Mesurer la distance qui sépare le plus de franges possible, puis diviser par le nombre d'interfranges", "Mesurer un seul interfrange, au milieu de la figure", "Mesurer la largeur d'une frange brillante", "Rapprocher l'écran des fentes pour resserrer les franges"], bonne: 0,
      explication: "L'erreur de lecture est la même sur une petite ou une grande distance. Sur dix interfranges, elle se partage en dix : l'interfrange est dix fois mieux connu.",
    },
    {
      genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour mesurer la longueur d'onde du laser.",
      objets: [
        { id: "young", nom: "Diapositive à deux fentes", utile: true, pourquoi: "Ses deux fentes donnent les franges d'interférences dont on mesure l'espacement." },
        { id: "fente", nom: "Diapositive à une seule fente", utile: false, pourquoi: "Une fente seule diffracte la lumière, mais ne donne pas de franges d'interférences." },
        { id: "ecran", nom: "Écran gradué, avec deux curseurs", utile: true, pourquoi: "Les franges s'y forment, et les curseurs repèrent deux franges éloignées." },
        { id: "prisme", nom: "Prisme", utile: false, pourquoi: "Il dévie la lumière, mais ne donne pas sa longueur d'onde sans autre étalonnage." },
        { id: "rail", nom: "Rail gradué", utile: true, pourquoi: "Il donne la distance D entre les fentes et l'écran." },
        { id: "lentille", nom: "Lentille convergente", utile: false, pourquoi: "Les franges s'observent directement sur un écran éloigné : aucune lentille n'est nécessaire." },
        { id: "support", nom: "Support de laser fixé au banc", utile: true, pourquoi: "Le laser doit être fixé face à l'écran avant d'être allumé." },
      ],
    },
    {
      genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
      etapes: [
        "Fixer le laser sur son support, face à l'écran, sans l'allumer.",
        "Glisser une diapositive à deux fentes dans le support.",
        "Placer l'écran loin des fentes, et noter la distance qui les sépare.",
        "Allumer le laser, et poser les deux curseurs au milieu de deux franges sombres éloignées.",
        "Noter la distance entre les curseurs et le nombre d'interfranges qui les séparent.",
      ],
      // le laser, la diapositive et l'écran s'installent dans n'importe quel ordre, tant que le laser est éteint
      autres: [[0, 2, 1, 3, 4], [1, 0, 2, 3, 4], [1, 2, 0, 3, 4], [2, 0, 1, 3, 4], [2, 1, 0, 3, 4]],
    },
    {
      genre: "paillasse", competence: "REA",
      consigne: "Mesure l'interfrange sur l'écran. Tout se fait à la main : tu fixes le laser avant de l'allumer, tu glisses une diapositive à deux fentes dans le support, tu places l'écran, tu poses les deux curseurs sur deux franges sombres éloignées. Le laser s'éteint avant de déplacer quoi que ce soit.",
      protocole: [
        "Fixer le laser sur son support, face à l'écran, sans l'allumer.",
        "Glisser dans le support une diapositive à deux fentes : leur écart b est écrit sur la monture.",
        `Placer l'écran à ${DISTANCE} cm des fentes, ou plus loin : le glisser sur le rail, puis noter la distance lue à la loupe. Ne plus y toucher.`,
        "Allumer le laser. Poser un curseur sur une frange sombre, et l'autre sur une frange sombre éloignée : le plus d'interfranges possible entre les deux.",
        "Noter la mesure : de près, finir de placer chaque curseur au milieu de sa frange sombre, lire la distance entre les deux, puis compter les interfranges qui les séparent.",
        "Éteindre le laser : la manipulation est finie.",
      ],
      paillasse: { genre: "diffraction", reglages: reglages(graine) },
    },
    {
      genre: "valeur", competence: "VAL", question: "Calcule l'interfrange.", unite: "mm", decimales: 2, relatif: 0.01,
      aide: "Divise la distance entre tes deux curseurs par le nombre d'interfranges qui les séparent.",
      attendu: interfrange,
      detail: (m) => `i = ${nombre(m.x, 1)} mm / ${nombre(m.n, 0)} = ${nombre(interfrange(m), 2)} mm.`,
    },
    {
      genre: "valeur", competence: "VAL", question: "Calcule la longueur d'onde du laser.", unite: "nm", decimales: 0, relatif: 0.01,
      aide: "i = λ D / b, donc λ = i × b / D. Mets les trois longueurs en mètres ; un nanomètre vaut 10⁻⁹ m.",
      attendu: longueurOnde,
      detail: (m) => `λ = i × b / D = ${nombre(interfrange(m), 2)} × 10⁻³ m × ${nombre(m.b, 2)} × 10⁻³ m / ${nombre(m.D / 100, 3)} m = ${nombre(longueurOnde(m) / 100, 2)} × 10⁻⁷ m = ${nombre(longueurOnde(m), 0)} nm.`,
    },
    {
      genre: "valeur", competence: "VAL", question: `Une lecture sur la graduation peut être fausse de ${nombre(LECTURE, 1)} mm. Que pèse cette erreur sur ta mesure, en pourcentage ?`, unite: "%", decimales: 1, absolu: 0.15,
      aide: "Divise l'erreur de lecture par la distance que tu as mesurée entre tes deux curseurs.",
      attendu: poidsLecture,
      detail: (m) => `${nombre(LECTURE, 1)} mm / ${nombre(m.x, 1)} mm = ${nombre(poidsLecture(m), 1)} %. Sur un seul interfrange de ${nombre(interfrange(m), 2)} mm, la même erreur pèserait ${nombre((100 * LECTURE) / interfrange(m), 0)} %.`,
    },
    {
      genre: "choix", competence: "VAL", question: "D'après ta mesure, quelle diode le laser contient-il ?",
      options: PROPOSEES.map((d) => `La diode de ${d} nm`), bonne: (m) => PROPOSEES.indexOf(DIODES[plusProche(longueurOnde(m))]),
      explication: (m) => {
        const vraie = variante(graine, DIODES);
        const sienne = DIODES[plusProche(longueurOnde(m))];
        return `Ta longueur d'onde, ${nombre(longueurOnde(m), 0)} nm, est la plus proche de ${sienne} nm.${sienne === vraie ? "" : ` Une manipulation sans défaut donne ${vraie} nm : si la tienne a eu des fautes, refais ta mesure sur plus d'interfranges.`}`;
      },
    },
  ],
};

export default young;
