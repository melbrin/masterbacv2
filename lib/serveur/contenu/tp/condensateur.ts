import "server-only";
import { nombre } from "@/lib/commun/format";
import type { Mesures, Tp } from "./types";

// ---------- TP 3 : la charge d'un condensateur ----------
const POSSIBLES = [220, 330, 470]; // les capacités possibles, en microfarads
const capaciteMesuree = (m: Mesures) => (m.tau / 10000) * 1e6;
const plusProche = (m: Mesures) => POSSIBLES.reduce((meilleur, c, i) => (Math.abs(c - capaciteMesuree(m)) < Math.abs(POSSIBLES[meilleur] - capaciteMesuree(m)) ? i : meilleur), 0);
const ecartCapacite = (m: Mesures) => (100 * Math.abs(capaciteMesuree(m) - POSSIBLES[plusProche(m)])) / POSSIBLES[plusProche(m)];

const condensateur: Tp = {
  id: "condensateur", titre: "Un condensateur sans étiquette", matiere: "physique", famille: "Circuit RC", fiche: 8, minutes: 20, etat: "brouillon",
  accroche: "L'étiquette d'un condensateur est effacée. Branche-le, enregistre sa charge, et retrouve sa capacité.",
  etapes: () => [
    {
      genre: "lecture", titre: "La situation",
      paragraphes: [
        "On a retrouvé un condensateur dont l'étiquette est effacée. Trois valeurs sont possibles : 220 µF, 330 µF ou 470 µF.",
        "Pour l'identifier, tu le charges à travers une résistance connue, et tu enregistres la tension à ses bornes.",
      ],
      documents: [
        { titre: "Le matériel", lignes: ["Un générateur de tension continue : E = 5,0 V", "Une résistance : R = 10 kΩ", "Un interrupteur et des fils", "Un système d'acquisition : une voie de mesure et sa masse"] },
        { titre: "La charge d'un condensateur", lignes: ["La tension aux bornes du condensateur suit u_C(t) = E × (1 − e^(−t/τ)).", "Le temps caractéristique vaut τ = R × C.", "À la date t = τ, la tension vaut 63 % de sa valeur finale."] },
      ],
    },
    {
      genre: "choix", competence: "APP", question: "Quelle grandeur dois-tu enregistrer au cours du temps ?",
      options: ["La tension aux bornes du condensateur", "La tension aux bornes du générateur", "La température de la résistance"], bonne: 0,
      explication: "C'est la tension du condensateur qui monte peu à peu pendant la charge. Sa courbe donne le temps caractéristique.",
    },
    {
      genre: "choix", competence: "ANA", question: "Comment relier le générateur, l'interrupteur, la résistance et le condensateur ?",
      options: ["En série : une seule boucle", "En dérivation : chacun aux bornes du générateur", "Le condensateur seul aux bornes du générateur"], bonne: 0,
      explication: "Le condensateur se charge à travers la résistance : les quatre composants sont dans la même boucle.",
    },
    {
      genre: "choix", competence: "ANA", question: "Où branches-tu la voie de mesure et la masse ?",
      options: ["Aux deux bornes du condensateur", "Aux deux bornes de la résistance", "Aux deux bornes de l'interrupteur"], bonne: 0,
      explication: "Un appareil qui mesure une tension se branche en dérivation, aux bornes du dipôle étudié.",
    },
    {
      genre: "valeur", competence: "ANA", question: "À quelle tension liras-tu le temps caractéristique sur la courbe ?", unite: "V", decimales: 2, absolu: 0.02,
      aide: "À la date t = τ, la tension vaut 63 % de sa valeur finale. La valeur finale est la tension du générateur.",
      attendu: () => 0.63 * 5,
      detail: () => "0,63 × 5,0 V = 3,15 V.",
    },
    {
      genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
      etapes: [
        "Relier en série le générateur, l'interrupteur ouvert, la résistance et le condensateur.",
        "Brancher la voie de mesure et la masse aux bornes du condensateur.",
        "Lancer l'acquisition, puis fermer l'interrupteur.",
        "Attendre que la tension ne varie plus.",
        "Lire sur la courbe la date où la tension vaut 63 % de sa valeur finale.",
      ],
      autres: [[1, 0, 2, 3, 4]],
    },
    {
      genre: "paillasse", competence: "REA",
      consigne: "Pose les fils : touche une borne, puis une autre. Lance l'acquisition, puis place le repère sur la courbe à la bonne tension et note le temps.",
      protocole: [
        "Relier en série le générateur, l'interrupteur ouvert, la résistance et le condensateur.",
        "Brancher la voie de mesure et la masse aux bornes du condensateur.",
        "Lancer l'acquisition, puis fermer l'interrupteur.",
        "Attendre que la tension ne varie plus.",
        "Lire sur la courbe la date où la tension vaut 63 % de sa valeur finale.",
      ],
      paillasse: {
        genre: "circuit",
        reglages: {
          generateur: { plus: "g+", moins: "g-", E: 5 },
          dipoles: [{ id: "K", genre: "interrupteur", bornes: ["k1", "k2"] }, { id: "R", genre: "resistance", bornes: ["r1", "r2"] }, { id: "C", genre: "condensateur", bornes: ["c1", "c2"] }],
          mesure: { voie: "voie", masse: "masse" },
          R: 10000, C: 330e-6, parCm: 0, niveaux: [], lecture: true, duree: 20,
        },
      },
    },
    {
      genre: "valeur", competence: "VAL", question: "Avec ton temps caractéristique, calcule la capacité du condensateur.", unite: "µF", decimales: 0, relatif: 0.02,
      aide: "τ = R × C, avec R en ohms et C en farads. Un microfarad vaut 10⁻⁶ F.",
      attendu: capaciteMesuree,
      detail: (m) => `C = τ / R = ${nombre(m.tau, 2)} s / 10 000 Ω = ${nombre(m.tau / 10000, 6)} F, soit ${nombre(capaciteMesuree(m), 0)} µF.`,
    },
    {
      genre: "choix", competence: "VAL", question: "Quel est ce condensateur ?",
      options: POSSIBLES.map((c) => `${c} µF`), bonne: plusProche,
      explication: (m) => `Ta valeur, ${nombre(capaciteMesuree(m), 0)} µF, est la plus proche de ${POSSIBLES[plusProche(m)]} µF.${plusProche(m) === 1 ? "" : " Le condensateur est en réalité un 330 µF : ta lecture du temps caractéristique est à reprendre."}`,
    },
    {
      genre: "valeur", competence: "VAL", question: "Calcule l'écart relatif entre ta valeur et la capacité que tu as choisie, en pourcentage.", unite: "%", decimales: 1, absolu: 0.5,
      aide: "Écart relatif : la différence entre les deux valeurs, divisée par la valeur de référence.",
      attendu: ecartCapacite,
      detail: (m) => `Écart = |${nombre(capaciteMesuree(m), 0)} − ${POSSIBLES[plusProche(m)]}| / ${POSSIBLES[plusProche(m)]} = ${nombre(ecartCapacite(m), 1)} %.`,
    },
    {
      genre: "choix", competence: "VAL", question: "Le fabricant garantit la capacité à 10 % près. Ta mesure est-elle compatible avec cette valeur ?",
      options: ["Oui", "Non"], bonne: (m) => (ecartCapacite(m) <= 10 ? 0 : 1),
      explication: (m) => (ecartCapacite(m) <= 10 ? `Ton écart, ${nombre(ecartCapacite(m), 1)} %, est inférieur à 10 % : ta mesure est compatible.` : `Ton écart, ${nombre(ecartCapacite(m), 1)} %, dépasse 10 % : ta mesure n'est pas compatible. Reprends la lecture du temps caractéristique.`),
    },
  ],
};

export default condensateur;
