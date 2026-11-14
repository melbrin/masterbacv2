import "server-only";
import { nombre } from "@/lib/commun/format";
import type { ReglagesElectrolyse } from "@/lib/commun/tp/paillasses/electrolyse";
import { FARADAY } from "@/lib/commun/simulations/pile";
import { variante, type Mesures, type Tp } from "./types";

const grammes = (x: number) => `${nombre(x, 3)} g`;
const amperes = (x: number) => `${nombre(x, 2)} A`;
const secondes = (x: number) => `${nombre(x, 0)} s`;
const coulombs = (x: number) => `${nombre(x, 0)} C`;

// ---------- Un dépôt de cuivre par électrolyse ----------
const M_CUIVRE = 63.5;
/** L'intensité et la durée demandées, la résistance du circuit, la masse de la plaque à peser : la graine de l'essai les choisit. */
const INTENSITES = [0.8, 0.6, 1, 0.5];
const DUREES = [1200, 900, 1500];
const RESISTANCES = [7.5, 6.4, 8.6];
const MASSES = [24.317, 26.052, 23.684, 25.409, 24.871];

const reglages = (graine: number): ReglagesElectrolyse => ({
  electrodes: [{ id: "p1", nom: "plaque 1", masse: variante(graine, MASSES) }, { id: "p2", nom: "plaque 2", masse: 25.126 }],
  resistance: variante(graine, RESISTANCES), intensite: variante(graine, INTENSITES), duree: variante(graine, DUREES),
});

const deposee = (m: Mesures) => m.m2 - m.m1;
const charge = (m: Mesures) => m.I * m.dt;
const prevue = (m: Mesures) => (charge(m) * M_CUIVRE) / (2 * FARADAY);
const ecart = (m: Mesures) => (100 * Math.abs(deposee(m) - prevue(m))) / prevue(m);

const electrolyse: Tp = {
  id: "electrolyse", titre: "Un dépôt de cuivre", matiere: "chimie", famille: "Électrolyse", fiche: 12, minutes: 25, etat: "brouillon",
  accroche: "Un courant, un chronomètre, une balance au milligramme : fais déposer du cuivre sur une plaque, et vérifie que sa masse est bien celle que prévoit la charge qui a circulé.",
  etapes: (graine) => {
    const r = reglages(graine);
    const minutes = r.duree / 60;
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          "Dans un atelier de cuivrage, on recouvre des objets d'une fine couche de cuivre par électrolyse. Pour régler l'épaisseur du dépôt, l'atelier compte sur une relation : la masse déposée dépend de l'intensité du courant et de la durée.",
          "Tu vas vérifier cette relation avec deux plaques de cuivre, plongées dans une solution de sulfate de cuivre.",
          `Le sujet demande un courant voisin de ${amperes(r.intensite)}, pendant ${minutes} minutes environ. Tu pèses la plaque 1 avant et après : c'est elle qui doit recevoir le dépôt.`,
        ],
        documents: [
          { titre: "L'électrolyse du sulfate de cuivre", lignes: ["Le générateur impose le sens du courant. Les électrons arrivent à la plaque reliée à sa borne − : la cathode.", "À la cathode, les ions cuivre de la solution se déposent : Cu²⁺ + 2 e⁻ → Cu", "À l'anode, reliée à la borne +, le cuivre de la plaque passe en solution : Cu → Cu²⁺ + 2 e⁻", "La charge qui a circulé vaut Q = I × Δt, avec I en ampères et Δt en secondes."] },
          { titre: "La masse déposée", lignes: ["Quantité d'électrons qui a circulé : Q / F, avec F = 96 500 C/mol", "Il faut deux électrons pour déposer un atome de cuivre : la quantité de cuivre déposée est Q / (2 × F).", "Masse molaire du cuivre : M = 63,5 g/mol", "Masse déposée : m = I × Δt × M / (2 × F)"] },
          { titre: "Le matériel", lignes: ["Un générateur de tension réglable, un interrupteur, un ampèremètre, des fils", "Une cuve de sulfate de cuivre et deux plaques de cuivre, numérotées 1 et 2", "Une balance au milligramme, un chronomètre", "Une pissette d'eau distillée et un sèche-cheveux"] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "Sur quelle plaque le cuivre se dépose-t-il ?",
        options: ["Sur la cathode, la plaque reliée à la borne − du générateur", "Sur l'anode, la plaque reliée à la borne + du générateur", "Sur les deux plaques", "Sur aucune : il reste dans la solution"], bonne: 0,
        explication: "Les électrons arrivent par la borne − du générateur. À la plaque qui lui est reliée, les ions cuivre gagnent deux électrons et se déposent : c'est la cathode. L'autre plaque, l'anode, perd du cuivre.",
      },
      {
        genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour faire le dépôt et le mesurer.",
        objets: [
          { id: "generateur", nom: "Générateur de tension réglable", utile: true, pourquoi: "Il impose le courant : l'électrolyse ne se fait pas toute seule." },
          { id: "amperemetre", nom: "Ampèremètre", utile: true, pourquoi: "Il donne l'intensité du courant, dont dépend la charge qui circule." },
          { id: "voltmetre", nom: "Voltmètre", utile: false, pourquoi: "La relation à vérifier ne fait intervenir aucune tension." },
          { id: "chronometre", nom: "Chronomètre", utile: true, pourquoi: "Il donne la durée pendant laquelle le courant a passé." },
          { id: "balance", nom: "Balance au milligramme", utile: true, pourquoi: "Le dépôt pèse quelques dixièmes de gramme : il faut une balance fine." },
          { id: "grossebalance", nom: "Balance au gramme près", utile: false, pourquoi: "Le dépôt pèse moins d'un gramme : elle ne le verrait pas." },
          { id: "pissette", nom: "Pissette d'eau distillée et sèche-cheveux", utile: true, pourquoi: "La plaque se rince et se sèche avant la pesée finale : mouillée, elle pèse aussi son liquide." },
          { id: "burette", nom: "Burette graduée", utile: false, pourquoi: "Aucune solution n'est versée goutte à goutte." },
        ],
      },
      {
        genre: "choix", competence: "ANA", question: "Comment brancher l'ampèremètre ?",
        options: ["En série avec la cuve : le même courant les traverse", "En dérivation, aux deux plaques de la cuve", "Directement aux deux bornes du générateur"], bonne: 0,
        explication: "Un ampèremètre mesure le courant qui le traverse : il se place dans la boucle, à la suite du générateur, de l'interrupteur et de la cuve. Aux bornes de la cuve ou du générateur, il ferait un court-circuit.",
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
        etapes: [
          "Peser la plaque 1, propre et sèche.",
          "Monter le circuit en série, interrupteur ouvert, la plaque 1 du côté de la borne − du générateur.",
          "Fermer l'interrupteur, lancer le chronomètre et régler l'intensité.",
          "À la fin de la durée voulue, ouvrir l'interrupteur et arrêter le chronomètre.",
          "Rincer la plaque 1 à l'eau distillée, la sécher, puis la peser.",
        ],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: `Fais le dépôt sur la paillasse, avec un courant voisin de ${amperes(r.intensite)} pendant ${minutes} minutes environ. Tout se fait à la main : tu portes les plaques, tu tires les fils, tu tournes la molette du générateur, tu lis l'ampèremètre, le chronomètre et la balance. Le temps de l'électrolyse se passe en avance rapide.`,
        protocole: [
          "Poser la plaque 1, propre et sèche, sur la balance, et noter sa masse.",
          "Plonger les deux plaques dans la cuve. Monter le circuit en série, interrupteur ouvert : générateur, interrupteur, ampèremètre, cuve. La plaque 1 est du côté de la borne − du générateur.",
          `Fermer l'interrupteur et lancer le chronomètre. Tourner la molette du générateur jusqu'à lire environ ${amperes(r.intensite)} sur l'ampèremètre, puis noter l'intensité lue.`,
          `Maintenir « Avance rapide » pour laisser passer le temps. Vers ${minutes} minutes, soit ${secondes(r.duree)}, ouvrir l'interrupteur et arrêter le chronomètre. Noter la durée.`,
          "Ôter le fil de la plaque 1, la porter sur le support, la rincer à l'eau distillée, puis la sécher.",
          "Peser de nouveau la plaque 1 et noter sa masse.",
        ],
        paillasse: { genre: "electrolyse", reglages: r },
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule la masse de cuivre déposée sur la plaque 1.", unite: "g", decimales: 3, absolu: 0.0015,
        aide: "C'est la différence entre les deux pesées : m = m_2 − m_1.",
        attendu: deposee,
        detail: (m) => `m = m_2 − m_1 = ${grammes(m.m2)} − ${grammes(m.m1)} = ${grammes(deposee(m))}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule la charge qui a circulé pendant l'électrolyse.", unite: "C", decimales: 0, relatif: 0.01,
        aide: "Q = I × Δt, avec I en ampères et Δt en secondes.",
        attendu: charge,
        detail: (m) => `Q = I × Δt = ${nombre(m.I, 2)} × ${nombre(m.dt, 0)} = ${coulombs(charge(m))}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule la masse de cuivre que prévoit la relation m = I × Δt × M / (2 × F).", unite: "g", decimales: 3, relatif: 0.015,
        aide: "m = Q × M / (2 × F), avec M = 63,5 g/mol et F = 96 500 C/mol.",
        attendu: prevue,
        detail: (m) => `m = Q × M / (2 × F) = ${nombre(charge(m), 0)} × 63,5 / (2 × 96 500) = ${grammes(prevue(m))}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule l'écart relatif entre la masse déposée et la masse prévue, en pourcentage.", unite: "%", decimales: 1, absolu: 0.5,
        aide: "Écart relatif : la différence entre les deux masses, divisée par la masse prévue.",
        attendu: ecart,
        detail: (m) => `Écart = |${nombre(deposee(m), 3)} − ${nombre(prevue(m), 3)}| / ${nombre(prevue(m), 3)} = ${nombre(ecart(m), 1)} %.`,
      },
      {
        genre: "choix", competence: "VAL", question: "D'après tes mesures, la relation est-elle vérifiée à 5 % près ?",
        options: ["Oui", "Non"], bonne: (m) => (ecart(m) <= 5 ? 0 : 1),
        explication: (m) => (ecart(m) <= 5 ? `Ton écart relatif, ${nombre(ecart(m), 1)} %, est inférieur à 5 % : la masse déposée est bien celle que prévoit la charge qui a circulé.` : `Ton écart relatif, ${nombre(ecart(m), 1)} %, dépasse 5 % : avec tes mesures, la relation ne serait pas vérifiée. Une manipulation soignée donne moins de 2 % : vérifie que la plaque était sèche à chaque pesée, que l'intensité n'a pas changé et que le chronomètre a tourné tout le temps du courant.`),
      },
    ];
  },
};

export default electrolyse;
