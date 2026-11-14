import "server-only";
import { nombre } from "@/lib/commun/format";
import type { DemiPile, ReglagesPile } from "@/lib/commun/tp/paillasses/pile";
import { variante, type Mesures, type Tp } from "./types";

const volts = (x: number) => `${nombre(x, 3)} V`;

// ---------- Trois métaux, trois piles : tension à vide, borne positive, classement ----------
/** Le troisième métal de la paillasse : la graine de l'essai en choisit un. L'argent, moins réducteur que le cuivre, change le classement. */
const TROISIEMES: DemiPile[] = [
  { id: "fe", metal: "le fer", symbole: "Fe", solution: "sulfate de fer", potentiel: -0.441, teinte: 2 },
  { id: "ag", metal: "l'argent", symbole: "Ag", solution: "nitrate d'argent", potentiel: 0.795, teinte: 0 },
  { id: "ni", metal: "le nickel", symbole: "Ni", solution: "sulfate de nickel", potentiel: -0.253, teinte: 3 },
  { id: "sn", metal: "l'étain", symbole: "Sn", solution: "chlorure d'étain", potentiel: -0.138, teinte: 0 },
];
/** Le potentiel de la lame de cuivre, qui change un peu d'une solution à l'autre : la tension de la pile zinc-cuivre en dépend. */
const CUIVRES = [0.337, 0.331, 0.343];

const reglages = (graine: number): ReglagesPile => {
  const m = variante(graine, TROISIEMES);
  return {
    demiPiles: [
      { id: "zn", metal: "le zinc", symbole: "Zn", solution: "sulfate de zinc", potentiel: -0.762, teinte: 0 },
      { id: "cu", metal: "le cuivre", symbole: "Cu", solution: "sulfate de cuivre", potentiel: variante(graine, CUIVRES), teinte: 1 },
      m,
    ],
    piles: [["zn", "cu"], [m.id, "cu"], ["zn", m.id]],
  };
};

/** Le nom d'un métal sans son article : « zinc », « argent ». */
const nu = (metal: string) => metal.replace(/^(le |l')/, "");
/** Les potentiels du zinc et du troisième métal par rapport au cuivre, d'après les tensions et les bornes positives notées par l'élève. */
const zinc = (m: Mesures) => (m.P1 === 1 ? -m.U1 : m.U1);
const troisieme = (m: Mesures) => (m.P2 === 1 ? -m.U2 : m.U2);
/** La tension que l'on attend pour la pile du zinc et du troisième métal. */
const prevue = (m: Mesures) => Math.abs(troisieme(m) - zinc(m));
const ecart = (m: Mesures) => (100 * Math.abs(m.U3 - prevue(m))) / Math.max(prevue(m), 0.001);
/** Les six ordres possibles des trois métaux, du plus réducteur au moins réducteur. */
const ORDRES = [["zn", "m", "cu"], ["zn", "cu", "m"], ["m", "zn", "cu"], ["m", "cu", "zn"], ["cu", "zn", "m"], ["cu", "m", "zn"]];
/** L'ordre que donnent les mesures : le métal le plus réducteur est celui dont la lame est au potentiel le plus bas. */
const classement = (m: Mesures) => {
  const ordre = [{ id: "zn", e: zinc(m) }, { id: "m", e: troisieme(m) }, { id: "cu", e: 0 }].sort((a, b) => a.e - b.e).map((x) => x.id).join();
  return Math.max(0, ORDRES.findIndex((o) => o.join() === ordre));
};
const plusGrande = (m: Mesures) => [m.U1, m.U2, m.U3].indexOf(Math.max(m.U1, m.U2, m.U3));

const pile: Tp = {
  id: "pile", titre: "Trois métaux, trois piles", matiere: "chimie", famille: "Pile", fiche: 12, minutes: 25, etat: "brouillon",
  accroche: "Deux lames, deux solutions, un pont salin : c'est une pile. Construis-en trois, lis leur tension au multimètre, et classe les métaux.",
  etapes: (graine) => {
    const r = reglages(graine);
    const m = r.demiPiles[2];
    const metal = nu(m.metal);
    const noms = [`zinc-cuivre`, `${metal}-cuivre`, `zinc-${metal}`];
    const nom = (id: string) => (id === "m" ? m.metal : id === "zn" ? "le zinc" : "le cuivre");
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          `Pour une exposition de sciences, le club du lycée veut fabriquer la pile qui donne la plus grande tension. La réserve contient trois métaux : du zinc, du cuivre et ${m.metal.replace(/^le /, "du ").replace(/^l'/, "de l'")}.`,
          "En associant deux métaux, chacun plongé dans une solution de ses ions, on obtient une pile. Trois métaux donnent trois piles.",
          "Tu vas construire ces trois piles, mesurer leur tension à vide, trouver leur borne positive, puis classer les trois métaux du plus réducteur au moins réducteur.",
        ],
        documents: [
          { titre: "Une pile", lignes: ["Une demi-pile est une lame de métal plongée dans une solution qui contient ses ions.", "Une pile associe deux demi-piles. Un pont salin relie les deux solutions : il laisse passer des ions et ferme le circuit.", "À la borne négative, le métal s'oxyde : il cède des électrons au circuit.", "Des deux métaux d'une pile, le plus réducteur est celui de la borne négative."] },
          { titre: "Le multimètre en voltmètre", lignes: ["Le sélecteur se tourne sur un calibre du voltmètre en courant continu : le plus petit qui dépasse la tension à mesurer.", "Un fil part de la borne COM, l'autre de la borne V.", "Tension affichée positive : la lame reliée à la borne V est la borne positive. Tension négative : c'est la lame reliée à la borne COM.", "Un ampèremètre ne se branche jamais aux bornes d'une pile : rien ne limiterait le courant."] },
          { titre: "Le matériel", lignes: [`Trois lames : zinc, cuivre, ${metal}`, `Trois solutions à 0,10 mol/L : sulfate de zinc, sulfate de cuivre, ${m.solution}`, "Un pont salin, un multimètre, des fils"] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "À quoi sert le pont salin ?",
        options: ["Il laisse passer des ions entre les deux solutions, ce qui ferme le circuit", "Il fait passer les électrons d'une lame à l'autre", "Il mélange les deux solutions pour qu'elles réagissent", "Il mesure la tension de la pile"], bonne: 0,
        explication: "Les électrons passent par les fils, hors des solutions. Dans les solutions, ce sont des ions qui se déplacent : le pont salin leur ouvre le passage d'un bécher à l'autre. Sans lui, le circuit est ouvert.",
      },
      {
        genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour construire une pile et mesurer sa tension.",
        objets: [
          { id: "lames", nom: "Deux lames de métaux différents", utile: true, pourquoi: "Chaque lame est l'électrode d'une demi-pile." },
          { id: "solutions", nom: "Deux béchers, chacun avec la solution des ions d'un des métaux", utile: true, pourquoi: "Chaque lame trempe dans une solution qui contient ses propres ions." },
          { id: "pont", nom: "Pont salin", utile: true, pourquoi: "Il relie les deux solutions et ferme le circuit." },
          { id: "multimetre", nom: "Multimètre et deux fils", utile: true, pourquoi: "En voltmètre, il mesure la tension à vide entre les deux lames." },
          { id: "generateur", nom: "Générateur de tension", utile: false, pourquoi: "La pile fournit elle-même sa tension : on ne lui impose rien." },
          { id: "burette", nom: "Burette graduée", utile: false, pourquoi: "Aucune solution n'est versée goutte à goutte." },
          { id: "eau", nom: "Un bécher d'eau distillée pour y plonger les deux lames", utile: false, pourquoi: "Dans l'eau pure, il n'y a ni ions du métal ni deux demi-piles séparées." },
          { id: "thermometre", nom: "Thermomètre", utile: false, pourquoi: "On ne mesure pas de température ici." },
        ],
      },
      {
        genre: "choix", competence: "ANA", question: "La tension attendue est voisine de 1 V. Comment régler le multimètre ?",
        options: ["Voltmètre en courant continu, calibre 2 V", "Voltmètre en courant continu, calibre 200 mV", "Voltmètre en courant alternatif, calibre 200 V", "Ampèremètre, calibre mA"], bonne: 0,
        explication: "La tension d'une pile est continue. Le calibre 2 V est le plus petit qui dépasse 1 V : il donne le plus de chiffres. Le calibre 200 mV afficherait un dépassement, et un ampèremètre aux bornes d'une pile la met en court-circuit.",
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
        etapes: [
          "Plonger chaque lame dans la solution de son métal.",
          "Poser le pont salin entre les deux béchers de la pile.",
          "Tourner le sélecteur du multimètre sur le voltmètre en courant continu, calibre 2 V.",
          "Relier la borne COM à une lame et la borne V à l'autre.",
          "Lire la tension et son signe, puis en déduire la borne positive.",
        ],
        // régler le multimètre avant de préparer la pile convient aussi
        autres: [[2, 0, 1, 3, 4], [0, 2, 1, 3, 4]],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: `Construis les trois piles et mesure leur tension : la pile ${noms[0]}, la pile ${noms[1]}, puis la pile ${noms[2]}. Tout se fait à la main : tu plonges les lames, tu poses le pont salin, tu tournes le sélecteur du multimètre, tu tires les fils. Pour chaque pile, note la tension lue et la lame qui est la borne positive.`,
        protocole: [
          "Plonger chaque lame dans la solution de son métal.",
          "Poser le pont salin entre le bécher de sulfate de zinc et celui de sulfate de cuivre.",
          "Tourner le sélecteur du multimètre sur le voltmètre en courant continu, calibre 2 V.",
          "Tirer un fil de la borne COM jusqu'à une lame, et un fil de la borne V jusqu'à l'autre.",
          "Lire la tension et son signe sur l'afficheur. Noter la tension, puis la lame qui est la borne positive.",
          `Recommencer pour la pile ${noms[1]}, puis pour la pile ${noms[2]} : déplacer le pont salin et les fils.`,
        ],
        paillasse: { genre: "pile", reglages: r },
      },
      {
        genre: "choix", competence: "VAL", question: "D'après tes mesures, classe les trois métaux du plus réducteur au moins réducteur.",
        options: ORDRES.map((o) => o.map((id) => nu(nom(id))).join(", ").replace(/^./, (l) => l.toUpperCase())), bonne: classement,
        explication: (x) => `Dans une pile, le métal le plus réducteur est celui de la borne négative. Tes mesures placent ${nom(x.P1 === 1 ? "zn" : "cu")} à la borne négative de la pile ${noms[0]}, et ${nom(x.P2 === 1 ? "m" : "cu")} à celle de la pile ${noms[1]}. Avec les tensions ${volts(x.U1)} et ${volts(x.U2)}, l'ordre est : ${ORDRES[classement(x)].map((id) => nu(nom(id))).join(", ")}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: `Avec les tensions des piles ${noms[0]} et ${noms[1]}, prévois la tension de la pile ${noms[2]}.`, unite: "V", decimales: 3, absolu: 0.003,
        aide: "Place les trois lames sur un axe, selon leur borne dans chaque pile. La tension entre deux lames est l'écart qui les sépare sur cet axe : les deux tensions s'ajoutent si le cuivre est entre les deux autres métaux, elles se retranchent sinon.",
        attendu: prevue,
        detail: (x) => (Math.sign(zinc(x)) === Math.sign(troisieme(x))
          ? `Le zinc et ${m.metal} sont du même côté du cuivre : la tension est la différence des deux, ${volts(Math.max(x.U1, x.U2))} − ${volts(Math.min(x.U1, x.U2))} = ${volts(prevue(x))}.`
          : `Le cuivre est entre le zinc et ${m.metal} : la tension est la somme des deux, ${volts(x.U1)} + ${volts(x.U2)} = ${volts(prevue(x))}.`),
      },
      {
        genre: "valeur", competence: "VAL", question: `Calcule l'écart relatif entre cette prévision et la tension que tu as mesurée pour la pile ${noms[2]}, en pourcentage.`, unite: "%", decimales: 1, absolu: 0.3,
        aide: "Écart relatif : la différence entre les deux valeurs, divisée par la valeur prévue.",
        attendu: ecart,
        detail: (x) => `Écart = |${nombre(x.U3, 3)} − ${nombre(prevue(x), 3)}| / ${nombre(prevue(x), 3)} = ${nombre(ecart(x), 1)} %.`,
      },
      {
        genre: "choix", competence: "VAL", question: "Quelle pile le club doit-il choisir pour avoir la plus grande tension ?",
        options: noms.map((n) => `La pile ${n}`), bonne: plusGrande,
        explication: (x) => `Tes trois tensions : ${volts(x.U1)} pour la pile ${noms[0]}, ${volts(x.U2)} pour la pile ${noms[1]}, ${volts(x.U3)} pour la pile ${noms[2]}. La plus grande est celle de la pile ${noms[plusGrande(x)]} : elle associe les deux métaux les plus éloignés dans le classement.`,
      },
    ];
  },
};

export default pile;
