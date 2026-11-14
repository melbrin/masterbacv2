import "server-only";
import { nombre } from "@/lib/commun/format";
import { reference, type ReglagesDoppler } from "@/lib/commun/tp/paillasses/doppler";
import { variante, type Mesures, type Tp } from "./types";

const ms = (x: number) => `${nombre(x, 2)} m/s`;
const hz = (x: number) => `${nombre(x, 2)} Hz`;

// ---------- Une vitesse mesurée par effet Doppler, et vérifiée par une mesure directe ----------
/** La vitesse à ne pas dépasser, en m/s, et la célérité du son dans la salle. */
const LIMITE = 2.5;
const CELERITE = 340;
/** Les vitesses possibles du mobile au cran demandé, en m/s : la graine de l'essai en choisit une. Deux d'entre elles dépassent la limite. */
const VITESSES = [1.9, 2.8, 2.2, 3.1];
/** Les fréquences possibles de l'émetteur, en hertz, et les crans possibles du moteur. */
const FREQUENCES = [4000, 3000, 5000];
const CRANS = [3, 4, 2];
const reglages = (graine: number): ReglagesDoppler => ({ fE: variante(graine, FREQUENCES), c: CELERITE, cran: variante(graine, CRANS), v: variante(graine, VITESSES) });

/** La vitesse tirée des deux fréquences, la vitesse tirée de la règle et du chronomètre, et l'écart relatif entre les deux, en pourcentage. */
const parDoppler = (m: Mesures) => (CELERITE * (m.fa - m.fe)) / (m.fa + m.fe);
const directe = (m: Mesures) => (m.x2 - m.x1) / 100 / m.dt;
const ecart = (m: Mesures) => (directe(m) > 0 ? (100 * Math.abs(parDoppler(m) - directe(m))) / directe(m) : 100);

const doppler: Tp = {
  id: "doppler", titre: "Un chariot à contrôler", matiere: "physique", famille: "Effet Doppler", fiche: 6, minutes: 25, etat: "brouillon",
  accroche: "Un chariot automatique roule-t-il trop vite ? Enregistre son avertisseur, lis le spectre, et mesure sa vitesse sans le toucher.",
  etapes: (graine) => {
    const r = reglages(graine);
    const fE = `${nombre(r.fE, 0)} Hz`;
    const ideal = reference(r);
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          `Dans un entrepôt, des chariots automatiques transportent les colis. Pour la sécurité, leur vitesse est limitée à ${nombre(LIMITE, 1)} m/s. Chaque chariot porte un avertisseur, qui émet un son de fréquence ${fE}.`,
          "Un technicien veut contrôler leur vitesse sans les toucher, avec un simple micro : il compte sur l'effet Doppler.",
          `Au laboratoire, tu testes sa méthode sur une maquette. Un mobile motorisé porte le même avertisseur et roule sur un rail, devant un micro. Son moteur doit être réglé sur le cran ${r.cran}.`,
          "Tu dois mesurer la vitesse du mobile par effet Doppler, la comparer à une mesure directe, puis dire si le mobile respecte la limite.",
        ],
        documents: [
          { titre: "Le matériel", lignes: ["Un mobile motorisé sur un rail de 4 m, gradué en centimètres. Son moteur a cinq crans.", `Sur le mobile, un émetteur sonore de fréquence f_E = ${fE}.`, "Un micro au milieu du rail, relié à un enregistreur. Le logiciel affiche le spectre du son enregistré.", "Deux fourches optiques reliées à un chronomètre : il affiche la durée du trajet d'une fourche à l'autre."] },
          { titre: "L'effet Doppler", lignes: ["Quand l'émetteur s'approche du micro à la vitesse v, la fréquence reçue vaut f_1 = f_E × c / (c − v).", "Quand il s'en éloigne, elle vaut f_2 = f_E × c / (c + v).", "En combinant les deux relations : v = c × (f_1 − f_2) / (f_1 + f_2).", `Célérité du son dans la salle : c = ${CELERITE} m/s.`] },
          { titre: "Lire un spectre", lignes: ["Le spectre d'un son montre un pic à chaque fréquence que ce son contient.", "Un mobile à l'arrêt donne un pic à la fréquence f_E. Quand il roule, le pic se déplace : vers les hautes fréquences à l'approche, vers les basses à l'éloignement.", "Ces pics sont très proches les uns des autres : il faut zoomer pour les séparer."] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "Pendant que le mobile s'approche du micro, la fréquence que le micro reçoit est :",
        options: ["plus grande que la fréquence émise", "égale à la fréquence émise", "plus petite que la fréquence émise"], bonne: 0,
        explication: "Quand la source s'approche, les ondes arrivent plus serrées : le micro en reçoit davantage par seconde. Le son reçu est plus aigu que le son émis.",
      },
      {
        genre: "valeur", competence: "ANA", question: "Si le mobile roulait à 2,0 m/s, de combien de hertz la fréquence reçue à l'approche dépasserait-elle la fréquence émise ?", unite: "Hz", decimales: 1, absolu: 0.4,
        aide: "Calcule f_E × c / (c − v) avec v = 2,0 m/s, puis retranche f_E.",
        attendu: () => (r.fE * CELERITE) / (CELERITE - 2) - r.fE,
        detail: () => `${nombre(r.fE, 0)} × ${CELERITE} / (${CELERITE} − 2,0) = ${hz((r.fE * CELERITE) / (CELERITE - 2))}, soit ${nombre((r.fE * CELERITE) / (CELERITE - 2) - r.fE, 1)} Hz de plus que la fréquence émise. C'est très peu devant ${fE} : il faudra zoomer sur le spectre.`,
      },
      {
        genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour mesurer la vitesse du mobile par effet Doppler, puis pour la vérifier.",
        objets: [
          { id: "mobile", nom: "Mobile motorisé portant l'émetteur sonore", utile: true, pourquoi: "C'est lui que l'on étudie : sa vitesse change la fréquence reçue." },
          { id: "sonometre", nom: "Sonomètre", utile: false, pourquoi: "Il mesure un niveau sonore, en décibels, pas une fréquence." },
          { id: "micro", nom: "Micro et enregistreur", utile: true, pourquoi: "Ils captent le son du mobile pendant tout son passage." },
          { id: "spectre", nom: "Logiciel qui affiche le spectre d'un son", utile: true, pourquoi: "Il sépare les fréquences reçues : c'est là que se lit l'effet Doppler." },
          { id: "balance", nom: "Balance", utile: false, pourquoi: "La masse du mobile ne joue pas ici." },
          { id: "fourches", nom: "Deux fourches optiques et un chronomètre", utile: true, pourquoi: "Avec la règle du rail, ils donnent la mesure directe de la vitesse, pour vérifier." },
          { id: "voltmetre", nom: "Voltmètre", utile: false, pourquoi: "On ne mesure aucune tension ici." },
          { id: "thermometre", nom: "Thermomètre", utile: false, pourquoi: "La célérité du son dans la salle est déjà donnée." },
        ],
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
        etapes: [
          "Régler le moteur sur le cran demandé et placer les deux fourches optiques sur le rail.",
          "Lancer l'enregistrement.",
          "Lancer le mobile, et attendre qu'il arrive au bout du rail.",
          "Arrêter l'enregistrement.",
          "Lire sur le spectre la fréquence de l'approche et celle de l'éloignement.",
        ],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: "Fais les mesures sur la paillasse. Tout se fait à la main : tu tournes la molette du moteur, tu glisses les fourches, tu lances l'enregistrement et le mobile, tu lis la règle, le chronomètre et le spectre. Note chaque lecture dans ton carnet.",
        protocole: [
          `Tourner la molette du moteur jusqu'au cran ${r.cran}.`,
          "Glisser les deux fourches optiques : la première au-delà de 50 cm, la seconde au moins un mètre plus loin. Lire leur position sur la règle, à la loupe, et les noter.",
          "Lancer l'enregistrement, puis le mobile. Quand le mobile est au bout du rail, arrêter l'enregistrement.",
          "Lire la durée sur le chronomètre et la noter.",
          "Ouvrir le spectre. Poser le repère sur les pics et zoomer. Placer le repère sur le sommet du pic de l'approche, et noter sa fréquence. Faire de même pour le pic de l'éloignement.",
        ],
        paillasse: { genre: "doppler", reglages: r },
      },
      {
        genre: "valeur", competence: "VAL", question: "Avec tes deux fréquences, calcule la vitesse du mobile par effet Doppler.", unite: "m/s", decimales: 2, relatif: 0.02,
        aide: "v = c × (f_1 − f_2) / (f_1 + f_2), où f_1 est la fréquence à l'approche et f_2 la fréquence à l'éloignement.",
        attendu: parDoppler,
        detail: (m) => `v = ${CELERITE} × (${nombre(m.fa, 2)} − ${nombre(m.fe, 2)}) / (${nombre(m.fa, 2)} + ${nombre(m.fe, 2)}) = ${ms(parDoppler(m))}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule la vitesse du mobile par la mesure directe : la distance entre les fourches, divisée par la durée du chronomètre.", unite: "m/s", decimales: 2, relatif: 0.015,
        aide: "La règle se lit en centimètres : convertis la distance en mètres avant de diviser par la durée.",
        attendu: directe,
        detail: (m) => `Distance : ${nombre(m.x2, 1)} − ${nombre(m.x1, 1)} = ${nombre(m.x2 - m.x1, 1)} cm, soit ${nombre((m.x2 - m.x1) / 100, 3)} m. Vitesse : ${nombre((m.x2 - m.x1) / 100, 3)} m / ${nombre(m.dt, 3)} s = ${ms(directe(m))}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule l'écart relatif entre tes deux vitesses, en pourcentage de la mesure directe.", unite: "%", decimales: 1, absolu: 0.3,
        aide: "Écart relatif : la différence entre les deux vitesses, divisée par la vitesse de la mesure directe.",
        attendu: ecart,
        detail: (m) => `Écart = |${nombre(parDoppler(m), 2)} − ${nombre(directe(m), 2)}| / ${nombre(directe(m), 2)} = ${nombre(ecart(m), 1)} %.`,
      },
      {
        genre: "choix", competence: "VAL", question: "Tes deux mesures de la vitesse s'accordent-elles à 5 % près ?",
        options: ["Oui", "Non"], bonne: (m) => (ecart(m) <= 5 ? 0 : 1),
        explication: (m) => (ecart(m) <= 5
          ? `L'écart relatif, ${nombre(ecart(m), 1)} %, est inférieur à 5 % : la mesure par effet Doppler est confirmée par la mesure directe.`
          : `L'écart relatif, ${nombre(ecart(m), 1)} %, dépasse 5 % : les deux mesures ne s'accordent pas. Une manipulation sans défaut donne moins de 3 % : vérifie le cran du moteur, la place des fourches et ta lecture des pics.`),
      },
      {
        genre: "choix", competence: "VAL", question: `La vitesse des chariots est limitée à ${nombre(LIMITE, 1)} m/s. D'après ta mesure par effet Doppler, le mobile respecte-t-il cette limite ?`,
        options: ["Oui", "Non"], bonne: (m) => (parDoppler(m) <= LIMITE ? 0 : 1),
        explication: (m) => `Ta mesure par effet Doppler donne ${ms(parDoppler(m))} : ${parDoppler(m) <= LIMITE ? "c'est moins que la limite, le mobile la respecte" : "c'est plus que la limite, le mobile roule trop vite"}. Au cran ${r.cran}, une manipulation sans défaut donne ${ms(parDoppler(ideal))} par effet Doppler et ${ms(directe(ideal))} par la mesure directe.`,
      },
    ];
  },
};

export default doppler;
