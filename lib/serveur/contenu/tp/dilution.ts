import "server-only";
import { nombre } from "@/lib/commun/format";
import type { ReglagesSolutions } from "@/lib/commun/tp/paillasses/solutions";
import { variante, type Mesures, type Tp } from "./types";

const ml = (x: number, d = 2) => `${nombre(x, d)} mL`;
/** Une concentration en mmol/L, avec trois chiffres : « 10,0 », « 5,00 », « 12,5 ». */
const mmol = (x: number) => `${nombre(x, x >= 10 ? 1 : 2)} mmol/L`;

// ---------- Une dilution ----------
const MERE = 50; // la concentration de l'eau iodée du flacon, en mmol/L
const TOLERANCE = 1; // l'écart relatif accepté par le laboratoire, en pourcentage
const ETAGERE = { pipettes: [10, 20, 25], eprouvette: 25, fioles: [50, 100], becher: 100 };
/** Les commandes possibles du laboratoire : la concentration demandée, en mmol/L, et le volume de solution, en mL. La graine de l'essai en choisit une. */
const COMMANDES = [{ Cfille: 10, fiole: 100 }, { Cfille: 5, fiole: 100 }, { Cfille: 12.5, fiole: 100 }, { Cfille: 10, fiole: 50 }];
type Commande = (typeof COMMANDES)[number];
const commande = (graine: number): Commande => variante(graine, COMMANDES);
/** Le volume de solution mère à prélever pour une commande. */
const prise = (c: Commande) => (c.Cfille * c.fiole) / MERE;
const reglages = (graine: number): ReglagesSolutions => ({ Cmere: MERE, ...commande(graine), unite: "mmol/L", etagere: ETAGERE, teinte: 2, nom: "Eau iodée" });

// ce que l'élève calcule avec les volumes réels de sa solution
const facteur = (m: Mesures) => m.Vf / m.Vm;
const obtenue = (m: Mesures) => m.C;
const ecart = (c: Commande, m: Mesures) => (100 * Math.abs(obtenue(m) - c.Cfille)) / c.Cfille;

const dilution: Tp = {
  id: "dilution", titre: "Préparer une solution par dilution", matiere: "chimie", famille: "Dilution", fiche: 9, minutes: 20, etat: "brouillon",
  accroche: "Le laboratoire de SVT commande une eau iodée diluée, à une concentration précise. Choisis ta verrerie, prélève, et complète au trait de jauge.",
  etapes: (graine) => {
    const c = commande(graine);
    const Vm = prise(c);
    const autrePipette = ETAGERE.pipettes.find((p) => p !== Vm) ?? 5;
    const autreFiole = ETAGERE.fioles.find((f) => f !== c.fiole) ?? 250;
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          "Pour repérer l'amidon dans une feuille, le laboratoire de SVT utilise de l'eau iodée : une solution orangée de diiode, qui devient bleu foncé au contact de l'amidon.",
          `L'eau iodée du flacon est trop concentrée pour cet usage. Le laboratoire te commande ${nombre(c.fiole, 1)} mL d'une solution diluée, de concentration ${mmol(c.Cfille)}.`,
          "Quand ta solution sera prête, le professeur la contrôlera par pesée : tu sauras quels volumes tu as vraiment mis dans ta fiole.",
        ],
        documents: [
          { titre: "La commande du laboratoire", lignes: [`Solution mère : eau iodée de concentration C_m = ${mmol(MERE)}`, `Solution fille : un volume V_f = ${nombre(c.fiole, 1)} mL, de concentration C_f = ${mmol(c.Cfille)}`, `La concentration obtenue doit être à moins de ${TOLERANCE} % de la concentration demandée.`] },
          { titre: "Diluer une solution", lignes: ["Diluer, c'est ajouter de l'eau à un prélèvement de solution mère, de volume V_m.", "La quantité de matière de diiode prélevée se retrouve en entier dans la solution fille : C_m × V_m = C_f × V_f.", "Le facteur de dilution est F = C_m / C_f = V_f / V_m."] },
          { titre: "La verrerie de l'étagère", lignes: ["Pipettes jaugées de 10, 20 et 25 mL : justes à 0,03 mL près", "Fioles jaugées de 50 et 100 mL : justes à 0,1 mL près", "Éprouvette graduée de 25 mL : juste à 0,5 mL près", "Bécher gradué de 100 mL : juste à 5 mL près"] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "Entre le prélèvement de solution mère et la solution fille, quelle grandeur ne change pas ?",
        options: ["La quantité de matière de diiode", "La concentration en diiode", "Le volume de solution", "La couleur de la solution"], bonne: 0,
        explication: "On n'ajoute que de l'eau distillée : tout le diiode prélevé se retrouve dans la solution fille. Sa concentration, elle, diminue, et la couleur s'éclaircit.",
      },
      {
        genre: "valeur", competence: "ANA", question: "Calcule le volume de solution mère à prélever.", unite: "mL", decimales: 1, absolu: 0.05,
        aide: "La quantité de matière de diiode se conserve : C_m × V_m = C_f × V_f.",
        attendu: () => Vm,
        detail: () => `V_m = C_f × V_f / C_m = ${nombre(c.Cfille, c.Cfille >= 10 ? 1 : 2)} × ${nombre(c.fiole, 1)} / ${nombre(MERE, 1)} = ${ml(Vm, 1)}.`,
      },
      {
        genre: "materiel", competence: "ANA", consigne: "Choisis la verrerie et le matériel pour préparer cette solution.",
        objets: [
          { id: "pipette", nom: `Pipette jaugée de ${Vm} mL`, utile: true, pourquoi: "Elle délivre exactement le volume de solution mère calculé." },
          { id: "eprouvette", nom: "Éprouvette graduée de 25 mL", utile: false, pourquoi: "Elle n'est juste qu'à 0,5 mL près : c'est trop peu précis pour le prélèvement." },
          { id: "fiole", nom: `Fiole jaugée de ${c.fiole} mL`, utile: true, pourquoi: "Son trait de jauge donne le volume de la solution fille." },
          { id: "balance", nom: "Balance", utile: false, pourquoi: "On ne pèse rien : la solution mère est déjà prête." },
          { id: "becher", nom: "Bécher de 50 mL", utile: true, pourquoi: "On y verse un peu de solution mère : on ne plonge jamais la pipette dans le flacon." },
          { id: "pipettebis", nom: `Pipette jaugée de ${autrePipette} mL`, utile: false, pourquoi: `Elle délivre ${autrePipette} mL : ce n'est pas le volume calculé.` },
          { id: "poire", nom: "Poire à pipeter", utile: true, pourquoi: "Elle fait monter le liquide dans la pipette : on n'aspire jamais à la bouche." },
          { id: "erlenmeyer", nom: "Erlenmeyer de 100 mL", utile: false, pourquoi: "Il n'a pas de trait de jauge : il ne donne pas un volume précis." },
          { id: "pissette", nom: "Pissette d'eau distillée", utile: true, pourquoi: "Elle sert à compléter la fiole jusqu'au trait de jauge." },
          { id: "fiolebis", nom: `Fiole jaugée de ${autreFiole} mL`, utile: false, pourquoi: `Le laboratoire commande ${c.fiole} mL de solution, pas ${autreFiole} mL.` },
        ],
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
        etapes: [
          "Verser un peu de solution mère dans un bécher.",
          `Prélever ${ml(Vm, 1)} de solution mère à la pipette jaugée, le bas du ménisque sur le trait de jauge.`,
          `Vider la pipette dans la fiole jaugée de ${c.fiole} mL.`,
          "Ajouter de l'eau distillée jusqu'aux deux tiers de la fiole, puis agiter.",
          "Compléter à l'eau distillée jusqu'au trait de jauge, goutte à goutte à la fin.",
          "Boucher la fiole et la retourner plusieurs fois.",
        ],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: "Prépare la solution sur la paillasse. Tout se fait à la main : tu prends ta verrerie sur l'étagère, tu prélèves, tu complètes en regardant la loupe. Si tu dépasses le trait de jauge, recommence la solution.",
        protocole: [
          `Prendre sur l'étagère la fiole jaugée de ${c.fiole} mL et la poser sur la paillasse.`,
          "Verser un peu de solution mère du flacon dans le bécher : on ne prélève jamais dans le flacon.",
          `Plonger la pipette jaugée de ${Vm} mL dans le bécher. Aspirer au-dessus du trait de jauge, puis laisser redescendre : le bas du ménisque doit arriver juste sur le trait.`,
          "Vider la pipette dans la fiole jaugée.",
          "Ajouter de l'eau distillée à la pissette jusqu'aux deux tiers de la fiole, puis agiter.",
          "Compléter jusqu'au trait de jauge : au jet d'abord, puis goutte à goutte dès que le liquide apparaît dans la loupe.",
          "Boucher la fiole et la retourner au moins trois fois.",
        ],
        paillasse: { genre: "solutions", reglages: reglages(graine) },
      },
      {
        genre: "valeur", competence: "VAL", question: "Avec les volumes contrôlés par le professeur, calcule le facteur de dilution que tu as vraiment obtenu : combien de fois as-tu dilué la solution mère ?", unite: "fois", decimales: 2, relatif: 0.005,
        aide: "Le facteur de dilution est le rapport des volumes : F = V_f / V_m.",
        attendu: facteur,
        detail: (m) => `F = V_f / V_m = ${ml(m.Vf)} / ${ml(m.Vm)} = ${nombre(facteur(m), 2)}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule la concentration de ta solution fille.", unite: "mmol/L", decimales: 2, relatif: 0.004,
        aide: "La quantité de matière de diiode se conserve : C_m × V_m = C × V_f.",
        attendu: obtenue,
        detail: (m) => `C = C_m × V_m / V_f = ${nombre(MERE, 1)} × ${ml(m.Vm)} / ${ml(m.Vf)} = ${nombre(obtenue(m), 2)} mmol/L.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule l'écart relatif entre cette concentration et la concentration demandée, en pourcentage.", unite: "%", decimales: 2, absolu: 0.15,
        aide: "Écart relatif : la différence entre les deux concentrations, divisée par la concentration demandée.",
        attendu: (m) => ecart(c, m),
        detail: (m) => `Écart = |${nombre(obtenue(m), 2)} − ${nombre(c.Cfille, 2)}| / ${nombre(c.Cfille, 2)} = ${nombre(ecart(c, m), 2)} %.`,
      },
      {
        genre: "choix", competence: "VAL", question: `Ta solution respecte-t-elle la tolérance de ${TOLERANCE} % du laboratoire ?`,
        options: ["Oui", "Non"], bonne: (m) => (ecart(c, m) <= TOLERANCE ? 0 : 1),
        explication: (m) => (ecart(c, m) <= TOLERANCE
          ? `L'écart relatif de ta solution, ${nombre(ecart(c, m), 2)} %, est inférieur à ${TOLERANCE} % : elle convient au laboratoire.`
          : `L'écart relatif de ta solution, ${nombre(ecart(c, m), 2)} %, dépasse ${TOLERANCE} % : elle ne convient pas. Avec de la verrerie jaugée et un niveau juste sur le trait, l'écart reste sous 0,3 % : refais la préparation avec plus de soin.`),
      },
    ];
  },
};

export default dilution;
