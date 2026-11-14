import "server-only";
import { nombre, puissanceDeDix } from "@/lib/commun/format";
import { ohms, type ReglagesCircuit } from "@/lib/commun/tp/paillasses/circuit";
import { variante, type Mesures, type Tp } from "./types";

// ---------- La charge d'un condensateur, suivie par une carte d'acquisition ----------
/** Les capacités possibles du condensateur sans étiquette, en microfarads. */
const POSSIBLES = [220, 330, 470];
/** La tolérance annoncée par le fabricant, en pourcentage. */
const TOLERANCE = 20;
/**
 * Les situations possibles : la graine de l'essai en choisit une. Le conducteur ohmique du protocole, la tension du
 * générateur, la capacité cachée, la tension que le condensateur garde en sortant de la boîte, et les trois conducteurs
 * ohmiques de la boîte, dans leur ordre : deux sont des pièges, dix fois trop grand et dix fois trop petit.
 */
const SITUATIONS = [
  { R: 10_000, E: 5, C: 330, reste: 1.8, boite: [1_000, 100_000, 10_000] },
  { R: 6_800, E: 6, C: 470, reste: 2.4, boite: [6_800, 680, 68_000] },
  { R: 15_000, E: 4, C: 220, reste: 1.2, boite: [150_000, 15_000, 1_500] },
  { R: 10_000, E: 6, C: 470, reste: 2.1, boite: [100_000, 1_000, 10_000] },
  { R: 6_800, E: 5, C: 220, reste: 1.5, boite: [680, 68_000, 6_800] },
  { R: 15_000, E: 4, C: 330, reste: 1.6, boite: [15_000, 1_500, 150_000] },
];
const reglages = (graine: number): ReglagesCircuit => {
  const s = variante(graine, SITUATIONS);
  return {
    boite: [
      ...s.boite.map((valeur, i) => ({ id: `r${"abc"[i]}`, genre: "resistance" as const, valeur })),
      { id: "condo", genre: "condensateur", valeur: s.C * 1e-6 },
      { id: "inter", genre: "interrupteur", valeur: 0 },
    ],
    demande: { R: s.R, E: s.E },
    reste: s.reste,
  };
};

const volts = (x: number, d = 1) => `${nombre(x, d)} V`;
const capaciteMesuree = (m: Mesures) => (m.tau / m.R) * 1e6;
const plusProche = (m: Mesures) => POSSIBLES.reduce((meilleur, c, i) => (Math.abs(c - capaciteMesuree(m)) < Math.abs(POSSIBLES[meilleur] - capaciteMesuree(m)) ? i : meilleur), 0);
const ecartCapacite = (m: Mesures) => (100 * Math.abs(capaciteMesuree(m) - POSSIBLES[plusProche(m)])) / POSSIBLES[plusProche(m)];

const condensateur: Tp = {
  id: "condensateur", titre: "Un condensateur sans étiquette", matiere: "physique", famille: "Circuit RC", fiche: 8, minutes: 25, etat: "brouillon",
  accroche: "L'étiquette d'un condensateur est effacée. Monte le circuit, enregistre sa charge, et retrouve sa capacité.",
  etapes: (graine) => {
    const s = variante(graine, SITUATIONS);
    const R = ohms(s.R), E = volts(s.E);
    const boite = [...s.boite].sort((a, b) => a - b).map(ohms);
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          `Au fond d'un tiroir du laboratoire, on a retrouvé un condensateur dont l'étiquette est effacée. D'après la liste du matériel, trois valeurs sont possibles : ${POSSIBLES.map((c) => `${c} µF`).join(", ").replace(/, ([^,]*)$/, " ou $1")}.`,
          "Pour l'identifier, tu le charges à travers un conducteur ohmique de résistance connue, et tu enregistres la tension à ses bornes avec une carte d'acquisition.",
          "Le condensateur a déjà servi : rien ne dit qu'il est déchargé.",
        ],
        documents: [
          { titre: "Le matériel", lignes: [
            "Un générateur de tension continue, réglable de 0 à 12 V",
            `Une boîte de composants : trois conducteurs ohmiques (${boite.join(", ")}), le condensateur, un interrupteur`,
            "Une plaque de montage à trois emplacements, et des fils",
            "Une carte d'acquisition : une voie de mesure et sa masse. Elle lit des tensions de −10 V à 10 V.",
          ] },
          { titre: "Ce que le protocole impose", lignes: [`Conducteur ohmique : R = ${R}`, `Tension du générateur : E = ${E}`, "Une fois lancée, la carte attend : elle commence à enregistrer dès que la tension mesurée bouge."] },
          { titre: "La charge d'un condensateur", lignes: [
            "Dans un circuit en série, la tension aux bornes du condensateur suit u_C(t) = E × (1 − e^(−t/τ)).",
            "Le temps caractéristique vaut τ = R × C.",
            "À la date t = τ, la tension vaut 63 % de sa valeur finale. Après 5 τ, la charge est terminée.",
            "La tangente à l'origine coupe la droite u = E à la date t = τ.",
          ] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "Quelle grandeur dois-tu enregistrer au cours du temps pour trouver la capacité ?",
        options: ["La tension aux bornes du condensateur", "La tension aux bornes du générateur", "La résistance du conducteur ohmique"], bonne: 0,
        explication: "C'est la tension du condensateur qui monte peu à peu pendant la charge. Sa courbe donne le temps caractéristique τ, et τ = R × C donne la capacité.",
      },
      {
        genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour enregistrer la charge du condensateur.",
        objets: [
          { id: "generateur", nom: "Générateur de tension continue", utile: true, pourquoi: "Il charge le condensateur sous une tension constante." },
          { id: "gbf", nom: "Générateur de signaux (GBF)", utile: false, pourquoi: "Sa tension varie sans cesse : ici, la tension du générateur doit rester constante." },
          { id: "resistance", nom: "Conducteur ohmique de résistance connue", utile: true, pourquoi: "Le condensateur se charge à travers lui : τ = R × C." },
          { id: "interrupteur", nom: "Interrupteur", utile: true, pourquoi: "Il ferme le circuit à l'instant choisi : la charge commence là." },
          { id: "amperemetre", nom: "Ampèremètre", utile: false, pourquoi: "On ne mesure pas l'intensité du courant dans ce TP." },
          { id: "carte", nom: "Carte d'acquisition reliée à l'ordinateur", utile: true, pourquoi: "Elle enregistre la tension au cours du temps et trace la courbe." },
          { id: "bobine", nom: "Bobine", utile: false, pourquoi: "Ce n'est pas un dipôle du circuit étudié." },
          { id: "fils", nom: "Fils de connexion", utile: true, pourquoi: "Ils relient les composants entre eux, et la carte au condensateur." },
        ],
      },
      {
        genre: "choix", competence: "ANA", question: "Où branches-tu la voie de mesure de la carte et sa masse ?",
        options: ["Aux deux bornes du conducteur ohmique", "Aux deux bornes du condensateur", "Aux deux bornes de l'interrupteur", "Dans la boucle, entre le conducteur ohmique et le condensateur"], bonne: 1,
        explication: "Un appareil qui mesure une tension se branche en dérivation, aux deux bornes du dipôle étudié : ici, le condensateur.",
      },
      {
        genre: "valeur", competence: "ANA", question: "À quelle tension liras-tu le temps caractéristique sur la courbe ?", unite: "V", decimales: 2, absolu: 0.03,
        aide: "À la date t = τ, la tension vaut 63 % de sa valeur finale. La valeur finale est la tension du générateur.",
        attendu: () => 0.63 * s.E,
        detail: () => `0,63 × ${E} = ${volts(0.63 * s.E, 2)}.`,
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
        etapes: [
          "Poser les composants sur la plaque et les relier en série avec le générateur, interrupteur ouvert.",
          "Brancher la voie de la carte et sa masse aux bornes du condensateur.",
          "Décharger le condensateur en reliant ses deux bornes par un fil, puis retirer ce fil.",
          "Lancer l'acquisition, puis fermer l'interrupteur.",
          "Attendre que la tension ne varie plus.",
          "Lire sur la courbe la date où la tension vaut 63 % de sa valeur finale.",
        ],
        // brancher la carte avant de câbler la boucle, ou décharger avant de brancher la carte, convient aussi
        autres: [[1, 0, 2, 3, 4, 5], [0, 2, 1, 3, 4, 5]],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: "Réalise le montage et l'acquisition sur la paillasse. Tout se fait à la main : tu prends les composants dans la boîte, tu tires les fils d'une borne à l'autre, tu tournes les molettes, tu fermes l'interrupteur. Tu peux recommencer l'acquisition autant de fois qu'il le faut : c'est la dernière qui compte.",
        protocole: [
          `Prendre dans la boîte le conducteur ohmique de ${R}, le condensateur et l'interrupteur, et les poser sur la plaque. La valeur d'un conducteur ohmique est écrite dessus.`,
          `Régler le générateur sur ${E} avec sa molette, en lisant son afficheur.`,
          "Tirer les fils d'une borne à l'autre pour former une seule boucle : générateur, interrupteur ouvert, conducteur ohmique, condensateur.",
          "Brancher la voie de la carte sur la borne du condensateur qui est du côté de la borne + du générateur, et la masse sur son autre borne.",
          "Décharger le condensateur : relier ses deux bornes par un fil, puis retirer ce fil.",
          "Régler la durée avec la molette de la carte, lancer l'acquisition, puis fermer l'interrupteur : la courbe se trace.",
          "Si le palier ne se voit pas, ou si la montée est écrasée au début de l'écran : ouvrir l'interrupteur, décharger le condensateur, et recommencer avec une autre durée.",
          "Ouvrir la courbe, placer le repère là où la tension vaut 63 % de sa valeur finale, et noter ce temps.",
        ],
        paillasse: { genre: "circuit", reglages: reglages(graine) },
      },
      {
        genre: "valeur", competence: "VAL", question: "Avec ton temps caractéristique et la résistance du conducteur ohmique que tu as posé, calcule la capacité du condensateur.", unite: "µF", decimales: 0, relatif: 0.02,
        aide: "τ = R × C, avec R en ohms et C en farads. Un microfarad vaut 10⁻⁶ F.",
        attendu: capaciteMesuree,
        detail: (m) => `C = τ / R = ${nombre(m.tau, 2)} s / ${nombre(m.R, 0)} Ω = ${puissanceDeDix(m.tau / m.R, 3)} F, soit ${nombre(capaciteMesuree(m), 0)} µF.`,
      },
      {
        genre: "choix", competence: "VAL", question: "Quel est ce condensateur ?",
        options: POSSIBLES.map((c) => `${c} µF`), bonne: plusProche,
        explication: (m) => `Ta valeur, ${nombre(capaciteMesuree(m), 0)} µF, est la plus proche de ${POSSIBLES[plusProche(m)]} µF.${POSSIBLES[plusProche(m)] === s.C ? "" : ` Une manipulation sans défaut désigne pourtant le ${s.C} µF : si ta manipulation a eu des fautes, refais-la avec plus de soin.`}`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule l'écart relatif entre ta valeur et la capacité que tu as retenue, en pourcentage.", unite: "%", decimales: 1, absolu: 0.5,
        aide: "Écart relatif : la différence entre les deux valeurs, divisée par la valeur de référence.",
        attendu: ecartCapacite,
        detail: (m) => `Écart = |${nombre(capaciteMesuree(m), 0)} − ${POSSIBLES[plusProche(m)]}| / ${POSSIBLES[plusProche(m)]} = ${nombre(ecartCapacite(m), 1)} %.`,
      },
      {
        genre: "choix", competence: "VAL", question: `Le fabricant garantit la capacité à ${TOLERANCE} % près. Ta mesure est-elle compatible avec la valeur que tu as retenue ?`,
        options: ["Oui", "Non"], bonne: (m) => (ecartCapacite(m) <= TOLERANCE ? 0 : 1),
        explication: (m) => (ecartCapacite(m) <= TOLERANCE
          ? `Ton écart, ${nombre(ecartCapacite(m), 1)} %, est inférieur à ${TOLERANCE} % : ta mesure est compatible avec ${POSSIBLES[plusProche(m)]} µF.`
          : `Ton écart, ${nombre(ecartCapacite(m), 1)} %, dépasse ${TOLERANCE} % : ta mesure n'est compatible avec aucune des trois valeurs. Reprends le montage et la lecture du temps caractéristique.`),
      },
    ];
  },
};

export default condensateur;
