import "server-only";
import { nombre } from "@/lib/commun/format";
import { celerite, type ReglagesUltrasons } from "@/lib/commun/tp/paillasses/ultrasons";
import { variante, type Mesures, type Tp } from "./types";

const cm = (x: number) => `${nombre(x, 2)} cm`;
const ms = (x: number, d = 1) => `${nombre(x, d)} m/s`;

// ---------- La célérité des ultrasons : la période à l'oscilloscope, la longueur d'onde sur le rail ----------
/** La célérité écrite dans le programme du robot, en m/s, et l'erreur que le club accepte sur une distance, en pourcentage. */
const ROBOT = 340;
const TOLERANCE = 1.5;
/** Les températures possibles de la salle, en °C : la graine de l'essai en choisit une. Deux d'entre elles démentent le réglage du robot. */
const TEMPERATURES = [16, 28, 18, 31];
/** Les fréquences possibles de l'émetteur, en hertz, et les places possibles du récepteur fixe, en millimètres avant le zéro du rail. */
const FREQUENCES = [40000, 39200, 40800];
const FIXES = [-11.5, -8.2, -14.6, -9.7, -12.9];
const reglages = (graine: number): ReglagesUltrasons => ({ f: variante(graine, FREQUENCES), theta: variante(graine, TEMPERATURES), fixe: variante(graine, FIXES) });

/** La distance entre les deux positions notées, en millimètres ; la longueur d'onde, en millimètres ; la célérité, en m/s. */
const distance = (m: Mesures) => Math.abs(m.x1 - m.x0) * 10;
const longueurOnde = (m: Mesures) => distance(m) / m.n;
const vitesse = (m: Mesures) => (longueurOnde(m) * 1000) / m.T;
const ecartAttendu = (m: Mesures, graine: number) => (100 * Math.abs(vitesse(m) - celerite(reglages(graine)))) / celerite(reglages(graine));
/** L'erreur du robot sur une distance, en pourcentage, si la célérité vaut `v` alors qu'il compte avec 340 m/s. */
const erreurRobot = (v: number) => (v > 0 ? (100 * Math.abs(ROBOT - v)) / v : 100);

const ultrasons: Tp = {
  id: "ultrasons", titre: "Un télémètre à régler", matiere: "physique", famille: "Ondes sonores", fiche: 6, minutes: 25, etat: "brouillon",
  accroche: "Le télémètre d'un robot compte sur 340 m/s. Branche l'oscilloscope, mesure la période et la longueur d'onde des ultrasons, et vérifie ce réglage.",
  etapes: (graine) => {
    const r = reglages(graine);
    const attendue = celerite(r);
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          "Le club de robotique du lycée équipe ses robots d'un télémètre à ultrasons. Le robot envoie une salve d'ultrasons, attend son écho, puis calcule la distance de l'obstacle avec la célérité des ultrasons.",
          `Dans le programme du robot, cette célérité est réglée une fois pour toutes sur 340 m/s. Or la célérité du son dans l'air dépend de la température, et aujourd'hui le thermomètre de la salle indique ${r.theta} °C. Le club veut des distances justes à 1,5 % près.`,
          "Tu dois mesurer la célérité des ultrasons dans la salle, la comparer à la valeur attendue à cette température, puis dire si le réglage du robot convient.",
        ],
        documents: [
          { titre: "Le matériel", lignes: ["Un émetteur d'ultrasons, de fréquence voisine de 40 kHz. Il s'alimente sur la sortie GÉN de l'oscilloscope.", "Deux récepteurs d'ultrasons. Le premier reste fixe ; le second glisse le long d'un rail gradué en millimètres.", "Un oscilloscope à deux voies, et des câbles."] },
          { titre: "Lire un oscilloscope", lignes: ["Une durée se lit sur l'écran : nombre de divisions × base de temps.", "Deux signaux sont en phase quand ils passent par zéro, puis par leur maximum, aux mêmes instants : les sommets de leurs courbes sont alignés."] },
          { titre: "Les ondes sonores", lignes: ["Célérité, longueur d'onde et période sont liées : v = λ / T.", "Quand on éloigne le second récepteur d'une longueur d'onde, les deux signaux se retrouvent en phase.", "Dans l'air, à la température θ (en °C), la célérité du son vaut v = 331,5 + 0,607 × θ, en m/s."] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "Pour obtenir la célérité des ultrasons, que dois-tu mesurer ?",
        options: ["La période du signal et la longueur d'onde", "La période du signal et son amplitude", "La température de la salle, et rien d'autre", "La distance entre l'émetteur et le premier récepteur"], bonne: 0,
        explication: "La relation v = λ / T demande la longueur d'onde, mesurée sur le rail, et la période, mesurée à l'oscilloscope. La température ne sert qu'à calculer la valeur attendue.",
      },
      {
        genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour mesurer la célérité des ultrasons.",
        objets: [
          { id: "emetteur", nom: "Émetteur d'ultrasons", utile: true, pourquoi: "Il produit l'onde à étudier." },
          { id: "chronometre", nom: "Chronomètre", utile: false, pourquoi: "Une période dure quelques dizaines de microsecondes : c'est bien trop court pour un chronomètre." },
          { id: "recepteurs", nom: "Deux récepteurs d'ultrasons", utile: true, pourquoi: "Leurs deux signaux se comparent à l'écran : c'est ainsi qu'on repère une longueur d'onde." },
          { id: "oscilloscope", nom: "Oscilloscope à deux voies", utile: true, pourquoi: "Il montre les deux signaux et permet de mesurer la période." },
          { id: "hautparleur", nom: "Haut-parleur", utile: false, pourquoi: "Il émet des sons audibles, pas des ultrasons." },
          { id: "rail", nom: "Rail gradué en millimètres", utile: true, pourquoi: "On y lit de combien le second récepteur s'est déplacé." },
          { id: "sonometre", nom: "Sonomètre", utile: false, pourquoi: "Il mesure un niveau sonore, en décibels : il ne dit rien de la célérité." },
          { id: "thermometre", nom: "Thermomètre", utile: true, pourquoi: "La valeur attendue de la célérité dépend de la température de la salle." },
          { id: "balance", nom: "Balance", utile: false, pourquoi: "On ne pèse rien ici." },
        ],
      },
      {
        genre: "choix", competence: "ANA", question: "Tu repères deux positions du récepteur mobile où les deux signaux sont en phase. Combien de longueurs d'onde vaut-il mieux compter entre les deux ?",
        options: ["Une seule", "Dix", "Une demie"], bonne: 1,
        explication: "L'erreur de lecture sur le rail, environ un demi-millimètre, est la même quelle que soit la distance. Sur dix longueurs d'onde, elle pèse dix fois moins que sur une seule.",
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
        etapes: [
          "Relier l'émetteur à la sortie GÉN, et chaque récepteur à une voie de l'oscilloscope.",
          "Régler la sensibilité des voies et la base de temps pour voir trois ou quatre périodes bien cadrées.",
          "Mesurer la période sur l'écran.",
          "Placer le récepteur mobile là où les deux signaux sont en phase, et lire sa position sur le rail.",
          "Éloigner le récepteur mobile en comptant dix retours en phase, puis lire sa nouvelle position.",
        ],
        // mesurer la période après la longueur d'onde convient aussi
        autres: [[0, 1, 3, 4, 2]],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: "Fais les mesures sur la paillasse. Tout se fait à la main : tu tires les câbles, tu tournes les molettes de l'oscilloscope, tu fais glisser le récepteur, tu lis l'écran et le rail. Note chaque lecture dans ton carnet.",
        protocole: [
          "Tirer un câble de la sortie GÉN à l'émetteur, un autre du récepteur fixe à la voie 1, un troisième du récepteur mobile à la voie 2.",
          "Tourner les molettes de sensibilité jusqu'à ce que chaque signal occupe plusieurs divisions, sans sortir de l'écran.",
          "Tourner la molette de la base de temps jusqu'à voir trois ou quatre périodes.",
          "Mesurer la période : compter les divisions de plusieurs périodes, ou placer les deux curseurs, puis multiplier par la base de temps. La noter dans le carnet, en microsecondes.",
          "Faire glisser le récepteur mobile jusqu'à ce que les deux signaux soient en phase, en finissant avec le réglage fin. Lire sa position sur le rail, à la loupe, et la noter.",
          "Éloigner lentement le récepteur mobile en comptant dix retours en phase. S'arrêter exactement en phase, lire la nouvelle position, puis la noter avec le nombre de longueurs d'onde.",
        ],
        paillasse: { genre: "ultrasons", reglages: r },
      },
      {
        genre: "valeur", competence: "VAL", question: "Avec tes deux positions, calcule la longueur d'onde des ultrasons.", unite: "mm", decimales: 2, relatif: 0.012,
        aide: "Entre tes deux positions, le récepteur a parcouru le nombre de longueurs d'onde que tu as compté. Attention aux unités : le rail se lit en centimètres.",
        attendu: longueurOnde,
        detail: (m) => `λ = (${cm(Math.max(m.x0, m.x1))} − ${cm(Math.min(m.x0, m.x1))}) / ${m.n} = ${nombre(distance(m), 1)} mm / ${m.n} = ${nombre(longueurOnde(m), 2)} mm.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule la célérité des ultrasons dans la salle.", unite: "m/s", decimales: 0, relatif: 0.012,
        aide: "v = λ / T, avec λ en mètres et T en secondes. Un millimètre vaut 10⁻³ m ; une microseconde vaut 10⁻⁶ s.",
        attendu: vitesse,
        detail: (m) => `v = λ / T = ${nombre(longueurOnde(m), 2)} × 10⁻³ m / (${nombre(m.T, 1)} × 10⁻⁶ s) = ${ms(vitesse(m), 0)}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: `Calcule l'écart relatif entre ta célérité et la valeur attendue à ${r.theta} °C, en pourcentage.`, unite: "%", decimales: 1, absolu: 0.3,
        aide: "Calcule d'abord la valeur attendue : v = 331,5 + 0,607 × θ. L'écart relatif est la différence entre les deux valeurs, divisée par la valeur attendue.",
        attendu: (m) => ecartAttendu(m, graine),
        detail: (m) => `Valeur attendue : 331,5 + 0,607 × ${r.theta} = ${ms(attendue)}. Écart = |${nombre(vitesse(m), 1)} − ${nombre(attendue, 1)}| / ${nombre(attendue, 1)} = ${nombre(ecartAttendu(m, graine), 1)} %.`,
      },
      {
        genre: "choix", competence: "VAL", question: "Ta mesure est-elle en accord avec la valeur attendue, à 2 % près ?",
        options: ["Oui", "Non"], bonne: (m) => (ecartAttendu(m, graine) <= 2 ? 0 : 1),
        explication: (m) => (ecartAttendu(m, graine) <= 2
          ? `Ton écart relatif, ${nombre(ecartAttendu(m, graine), 1)} %, est inférieur à 2 % : ta mesure est en accord avec la valeur attendue.`
          : `Ton écart relatif, ${nombre(ecartAttendu(m, graine), 1)} %, dépasse 2 % : ta mesure n'est pas en accord avec la valeur attendue. Une manipulation sans défaut donne moins de 1 % : reprends la lecture de la période et le comptage des longueurs d'onde.`),
      },
      {
        genre: "choix", competence: "VAL", question: "Le robot calcule ses distances avec 340 m/s. D'après ta mesure, ce réglage donne-t-il des distances justes à 1,5 % près dans cette salle ?",
        options: ["Oui, le réglage peut rester à 340 m/s", "Non, il faut corriger le réglage"], bonne: (m) => (erreurRobot(vitesse(m)) <= TOLERANCE ? 0 : 1),
        explication: (m) => {
          const e = erreurRobot(vitesse(m));
          return `Avec ta célérité, ${ms(vitesse(m), 0)}, le robot se trompe de |340 − ${nombre(vitesse(m), 0)}| / ${nombre(vitesse(m), 0)} = ${nombre(e, 1)} % sur chaque distance : ${e <= TOLERANCE ? "c'est moins que 1,5 %, le réglage convient" : "c'est plus que 1,5 %, il faut le corriger"}. À ${r.theta} °C, la valeur attendue est ${ms(attendue)} : l'erreur du robot y est de ${nombre(erreurRobot(attendue), 1)} %.`;
        },
      },
    ];
  },
};

export default ultrasons;
