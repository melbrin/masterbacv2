// La paillasse Solutions (décision 0012) : préparer une solution par dilution. Une étagère de verrerie avec ses pièges
// (pipettes jaugées de plusieurs contenances, éprouvette graduée, fioles jaugées, bécher gradué), le flacon de solution
// mère, un bécher pour y prélever, une pissette d'eau distillée, un bouchon. L'élève fait les gestes du laboratoire :
// choisir sa verrerie, verser un peu de solution mère dans le bécher, prélever au trait de jauge, vider dans la fiole,
// ajouter de l'eau, agiter, compléter au trait goutte à goutte, boucher et retourner.
// Chaque geste a ses conséquences : une éprouvette ne délivre pas le volume qu'on y lit, la graduation d'un bécher est
// fausse de quelques millilitres, le trait dépassé dilue trop, une fiole retournée sans bouchon se vide sur la paillasse.
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Les volumes sont en millilitres. Les concentrations sont dans l'unité de la situation (`unite`).
import { nombre } from "@/lib/commun/format";
import { concentrationPreparee } from "@/lib/commun/simulations/dilution";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

export interface ReglagesSolutions {
  /** la concentration de la solution mère, dans son flacon */
  Cmere: number;
  /** la concentration demandée pour la solution fille */
  Cfille: number;
  /** l'unité de ces concentrations, telle qu'elle s'écrit : « mmol/L » */
  unite: string;
  /** le volume de solution fille demandé : c'est la contenance de la fiole jaugée à choisir */
  fiole: number;
  /** ce que l'étagère propose : les contenances des pipettes jaugées, de l'éprouvette graduée, des fioles jaugées et du bécher gradué */
  etagere: { pipettes: number[]; eprouvette: number; fioles: number[]; becher: number };
  /** la couleur de la solution : 0 bleu, 1 violet, 2 orangé (couleurSolution, dans le kit) */
  teinte: number;
  /** ce qui est écrit sur l'étiquette du flacon de solution mère */
  nom: string;
}

/** Une pièce de l'étagère. Son nom tient en une lettre et sa contenance : « p20 », « e25 », « f100 », « b100 ». */
export interface Verrerie { genre: "pipette" | "eprouvette" | "fiole" | "becher"; capacite: number }

export interface EtatSolutions {
  // ----- le prélèvement -----
  /** l'outil de prélèvement sorti de l'étagère (« p20 », « e25 ») ; null s'ils sont tous rangés */
  outil: string | null;
  /** où est cet outil : dans le bécher de solution mère, dans le flacon, ou au-dessus du récipient de la solution fille */
  ou: "becher" | "flacon" | "recipient";
  /** ce que l'outil contient vraiment */
  dansOutil: number;
  /** ce qu'il contenait en arrivant au-dessus du récipient : tant qu'il en contient autant, rien n'a encore coulé */
  arrivee: number;
  /** vrai si le liquide est monté jusque dans la poire à pipeter */
  aspireTrop: boolean;
  /** la solution mère versée dans le bécher de prélèvement */
  becher: number;
  /** vrai si l'élève a prélevé directement dans le flacon de solution mère */
  dansFlacon: boolean;
  // ----- la solution fille -----
  /** le récipient posé sur la paillasse pour la solution fille (« f100 », « b100 ») ; null tant que rien n'est choisi */
  recipient: string | null;
  /** la solution mère arrivée dans le récipient */
  prise: number;
  /** la part de cette prise qui vient d'une éprouvette graduée */
  parEprouvette: number;
  /** le nombre de prélèvements vidés dans le récipient : deux pipettes de 10 mL pour 20 mL, par exemple */
  apports: number;
  /** l'eau distillée ajoutée */
  eau: number;
  /** vrai si le jet de la pissette a servi jusque dans les derniers millimètres sous le trait de jauge */
  auJet: boolean;
  /** vrai si le mélange a été agité avant de compléter, quand le liquide n'avait pas encore atteint le col */
  agite: boolean;
  /** le volume de liquide qui était dans le récipient au dernier brassage complet : ce qui a été ajouté depuis flotte au-dessus */
  melange: number;
  bouche: boolean;
  /** le nombre de retournements depuis le dernier ajout */
  retournements: number;
  /** vrai si la solution a fini sur la paillasse : la fiole a été retournée sans son bouchon */
  perdue: boolean;
  /** ce qui a coulé à côté */
  renverse: number;
  /** le nombre de solutions recommencées */
  essais: number;
}

/** La contenance du bécher de prélèvement. */
export const BECHER = 60;
/** Le volume d'une goutte de la pissette. */
export const GOUTTE = 0.05;
/** Une éprouvette graduée ne délivre que cette part du volume qu'on y lit : graduations approximatives, liquide resté sur les parois. */
export const JUSTESSE_EPROUVETTE = 0.97;
/** Le volume réel en face de la graduation d'un bécher, rapporté à ce qu'elle annonce. */
export const JUSTESSE_BECHER = 1.06;
/** La part du volume d'une fiole jaugée qui tient dans son corps, sous le col. */
export const COL = 0.92;
/** Ce que le col d'une fiole peut encore recevoir au-dessus du trait de jauge, rapporté à sa contenance. */
export const AU_DESSUS = 0.045;
/** Sous le trait de jauge, les derniers 0,5 mL se font goutte à goutte. */
export const DERNIER = 0.5;
/** Le nombre de retournements qui rend la solution homogène. */
export const RETOURNEMENTS = 3;

const centieme = (x: number) => Math.round(x * 100) / 100;
const ml = (x: number) => `${nombre(x, 2)} mL`;
/** Une concentration avec trois chiffres : « 10,0 mmol/L », « 5,00 mmol/L ». */
export const concentrationEcrite = (r: ReglagesSolutions, c: number): string =>
  `${nombre(c, c > 0 ? Math.max(0, Math.min(4, 2 - Math.floor(Math.log10(c)))) : 2)} ${r.unite}`;

const DEPART: EtatSolutions = {
  outil: null, ou: "becher", dansOutil: 0, arrivee: 0, aspireTrop: false, becher: 0, dansFlacon: false,
  recipient: null, prise: 0, parEprouvette: 0, apports: 0, eau: 0, auJet: false, agite: false, melange: 0, bouche: false, retournements: 0, perdue: false,
  renverse: 0, essais: 0,
};

const LETTRES: Record<string, Verrerie["genre"]> = { p: "pipette", e: "eprouvette", f: "fiole", b: "becher" };
/** Le nom d'une pièce de verrerie dans les gestes : « p20 ». */
export const nomDe = (v: Verrerie): string => `${v.genre[0]}${v.capacite}`;
/** La pièce de l'étagère que désigne un nom ; null si l'étagère ne l'a pas. */
export function verrerie(r: ReglagesSolutions, nom: string | null): Verrerie | null {
  if (!nom) return null;
  const genre = LETTRES[nom[0]];
  const capacite = Number(nom.slice(1));
  const e = r.etagere;
  const presente = genre === "pipette" ? e.pipettes.includes(capacite) : genre === "eprouvette" ? e.eprouvette === capacite : genre === "fiole" ? e.fioles.includes(capacite) : genre === "becher" ? e.becher === capacite : false;
  return presente && nom === nomDe({ genre, capacite }) ? { genre, capacite } : null;
}
/** Toutes les pièces de l'étagère, dans l'ordre où elle les range. */
export const pieces = (r: ReglagesSolutions): Verrerie[] => [
  ...r.etagere.pipettes.map((capacite): Verrerie => ({ genre: "pipette", capacite })), { genre: "eprouvette", capacite: r.etagere.eprouvette },
  ...r.etagere.fioles.map((capacite): Verrerie => ({ genre: "fiole", capacite })), { genre: "becher", capacite: r.etagere.becher },
];

/** Le volume réel de liquide quand le niveau est au trait de jauge d'une fiole, ou à la graduation d'un bécher. */
export const trait = (v: Verrerie): number => (v.genre === "becher" ? centieme(v.capacite * JUSTESSE_BECHER) : v.capacite);
/** Ce qu'un récipient peut contenir avant de déborder. */
const ras = (v: Verrerie): number => centieme(v.genre === "becher" ? v.capacite * 1.25 : v.capacite * (1 + AU_DESSUS));
/** Ce qu'un outil de prélèvement peut contenir : une pipette se remplit un peu au-dessus de son trait, puis le liquide entre dans la poire. */
export const plein = (v: Verrerie): number => centieme(v.capacite * (v.genre === "pipette" ? 1.15 : 1.04));
/** Le volume de liquide dans le récipient de la solution fille. */
export const total = (etat: EtatSolutions): number => centieme(etat.prise + etat.eau);
/** Le volume de solution mère à prélever pour un récipient de la contenance donnée. */
export const priseVoulue = (r: ReglagesSolutions, capacite: number): number => (r.Cfille * capacite) / r.Cmere;
/** Ce qu'on lit sur l'outil de prélèvement : le vrai volume pour une pipette, un peu plus pour une éprouvette graduée. */
export const lectureOutil = (r: ReglagesSolutions, etat: EtatSolutions): number =>
  verrerie(r, etat.outil)?.genre === "eprouvette" ? etat.dansOutil / JUSTESSE_EPROUVETTE : etat.dansOutil;
/** Vrai si la solution est la même en haut et en bas du récipient. */
export const homogene = (etat: EtatSolutions): boolean => total(etat) - etat.melange <= 0.05;

/**
 * Ce qu'il y a dans le récipient, du fond vers le haut : jusqu'à la hauteur `limite` (un volume), une solution à la
 * concentration `bas` ; au-dessus, une solution à la concentration `haut`. Tant que rien n'a été brassé, la solution mère
 * reste au fond et l'eau ajoutée flotte dessus. Chaque retournement rapproche les deux couches.
 */
export function couches(r: ReglagesSolutions, etat: EtatSolutions): { limite: number; bas: number; haut: number } {
  const volume = total(etat);
  if (volume <= 0 || etat.prise <= 0) return { limite: volume, bas: 0, haut: 0 };
  const moyenne = (r.Cmere * etat.prise) / volume;
  if (homogene(etat)) return { limite: volume, bas: moyenne, haut: moyenne };
  const limite = Math.min(volume, Math.max(etat.melange, etat.prise));
  const part = Math.min(1, etat.retournements / RETOURNEMENTS);
  const fond = (r.Cmere * etat.prise) / limite;
  return { limite, bas: fond + (moyenne - fond) * part, haut: moyenne * part };
}

/** Le récipient vidé et rincé : tout ce qui décrit la solution fille repart de zéro. */
const vide = (etat: EtatSolutions): EtatSolutions => ({ ...etat, prise: 0, parEprouvette: 0, apports: 0, eau: 0, auJet: false, agite: false, melange: 0, bouche: false, retournements: 0, perdue: false });

/** Verse un liquide dans le récipient de la solution fille. Sur un bouchon, tout coule à côté ; au-delà du bord, le surplus déborde. */
function recoit(r: ReglagesSolutions, etat: EtatSolutions, v: number, quoi: "prise" | "eau"): EtatSolutions {
  const piece = verrerie(r, etat.recipient);
  if (!piece) return etat;
  if (etat.bouche) return { ...etat, renverse: centieme(etat.renverse + v) };
  const entre = Math.max(0, Math.min(v, centieme(ras(piece) - total(etat))));
  const suite = { ...etat, renverse: centieme(etat.renverse + v - entre), retournements: entre > 0 ? 0 : etat.retournements };
  if (quoi === "eau") return { ...suite, eau: centieme(etat.eau + entre) };
  return { ...suite, prise: centieme(etat.prise + entre), parEprouvette: centieme(etat.parEprouvette + (verrerie(r, etat.outil)?.genre === "eprouvette" ? entre : 0)) };
}

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesSolutions, etat: EtatSolutions, g: GesteBrut): EtatSolutions {
  const v = nombreDe(g, "v");
  const positif = v !== null && v > 0 && v <= 300 ? centieme(v) : null;
  switch (g.g) {
    // poser sur la paillasse le récipient de la solution fille ; celui d'avant est vidé et retourne sur l'étagère
    case "recipient": {
      const piece = verrerie(r, texteDe(g, "quoi"));
      if (!piece || (piece.genre !== "fiole" && piece.genre !== "becher") || nomDe(piece) === etat.recipient) return etat;
      return { ...vide(etat), recipient: nomDe(piece), essais: etat.essais + (total(etat) > 0 ? 1 : 0) };
    }
    // prendre un outil de prélèvement, le plonger quelque part, ou le ranger ; un outil rangé ou remplacé est vidé à l'évier
    case "outil": {
      const piece = verrerie(r, texteDe(g, "quoi"));
      const ou = texteDe(g, "ou");
      if (!piece || (piece.genre !== "pipette" && piece.genre !== "eprouvette")) return etat;
      const meme = nomDe(piece) === etat.outil;
      if (ou === "etagere") return meme ? { ...etat, outil: null, ou: "becher", dansOutil: 0 } : etat;
      if ((ou !== "becher" && ou !== "flacon" && ou !== "recipient") || (ou === "recipient" && etat.recipient === null)) return etat;
      const dansOutil = meme ? etat.dansOutil : 0;
      return { ...etat, outil: nomDe(piece), ou, dansOutil, arrivee: ou === "recipient" ? dansOutil : 0 };
    }
    // verser la solution mère du flacon dans le bécher de prélèvement
    case "verser": {
      if (positif === null) return etat;
      const entre = Math.min(positif, centieme(BECHER - etat.becher));
      return { ...etat, becher: centieme(etat.becher + entre), renverse: centieme(etat.renverse + positif - entre) };
    }
    // faire monter le liquide dans l'outil, depuis le bécher ou depuis le flacon
    case "aspirer": {
      const piece = verrerie(r, etat.outil);
      if (!piece || positif === null || etat.ou === "recipient") return etat;
      const dispo = etat.ou === "becher" ? etat.becher : Infinity;
      const voulu = Math.min(positif, dispo);
      const monte = Math.max(0, Math.min(voulu, centieme(plein(piece) - etat.dansOutil)));
      const trop = piece.genre === "pipette" && etat.dansOutil + voulu > plein(piece) + 1e-9;
      if (monte <= 0 && (!trop || etat.aspireTrop)) return etat;
      return {
        ...etat, dansOutil: centieme(etat.dansOutil + monte), aspireTrop: etat.aspireTrop || trop,
        becher: etat.ou === "becher" ? centieme(etat.becher - monte) : etat.becher, dansFlacon: etat.dansFlacon || (etat.ou === "flacon" && monte > 0),
      };
    }
    // laisser redescendre le liquide, ou vider l'outil : le liquide va là où l'outil se trouve
    case "vider": {
      if (positif === null || etat.outil === null || etat.dansOutil <= 0) return etat;
      const sort = Math.min(positif, etat.dansOutil);
      const outil = { ...etat, dansOutil: centieme(etat.dansOutil - sort) };
      if (etat.ou === "flacon") return outil;
      // le premier filet d'un outil arrivé plein compte un prélèvement de plus
      if (etat.ou === "recipient") return recoit(r, etat.dansOutil === etat.arrivee ? { ...outil, apports: etat.apports + 1 } : outil, sort, "prise");
      const entre = Math.min(sort, centieme(BECHER - etat.becher));
      return { ...outil, becher: centieme(etat.becher + entre), renverse: centieme(etat.renverse + sort - entre) };
    }
    // l'eau distillée de la pissette : `jet` dit si elle sortait en jet, ou tombait goutte à goutte
    case "eau": {
      const piece = verrerie(r, etat.recipient);
      if (!piece || positif === null) return etat;
      const suite = recoit(r, etat, positif, "eau");
      const franchi = g.jet === true && piece.genre === "fiole" && total(suite) > total(etat) && total(suite) > piece.capacite - DERNIER + 1e-9;
      return franchi ? { ...suite, auJet: true } : suite;
    }
    // remuer le récipient : dans une fiole, ce qui est déjà monté dans le col ne se mélange pas
    case "agiter": {
      const piece = verrerie(r, etat.recipient);
      const volume = total(etat);
      if (!piece || volume <= 0) return etat;
      const corps = piece.genre === "fiole" ? centieme(piece.capacite * COL) : Infinity;
      const utile = etat.prise > 0 && etat.eau > 0 && volume >= 0.3 * piece.capacite && volume <= corps + 0.5;
      return { ...etat, melange: Math.max(etat.melange, Math.min(volume, corps)), agite: etat.agite || utile };
    }
    case "boucher": {
      const piece = verrerie(r, etat.recipient);
      return piece?.genre === "fiole" && typeof g.mis === "boolean" ? { ...etat, bouche: g.mis } : etat;
    }
    // retourner le récipient : bouché, la solution se mélange ; ouvert, elle se répand sur la paillasse
    case "retourner": {
      const volume = total(etat);
      if (etat.recipient === null || volume <= 0) return etat;
      if (!etat.bouche) return { ...vide(etat), perdue: true, renverse: centieme(etat.renverse + volume) };
      const retournements = Math.min(20, etat.retournements + 1);
      return { ...etat, retournements, melange: retournements >= RETOURNEMENTS ? volume : etat.melange };
    }
    // une nouvelle solution : le récipient est vidé et rincé à l'eau distillée, la verrerie reste en place
    case "recommencer": return etat.recipient === null ? etat : { ...vide(etat), aspireTrop: false, essais: etat.essais + 1 };
    default: return etat;
  }
}

/** Le bilan de la manipulation : les volumes réels de la solution préparée, sa concentration réelle, et les fautes relevées par le professeur. */
function bilan(r: ReglagesSolutions, etat: EtatSolutions): BilanPaillasse {
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const piece = verrerie(r, etat.recipient);
  const exact = { Vm: centieme(priseVoulue(r, r.fiole)), Vf: r.fiole, C: r.Cfille };

  if (!piece || etat.prise <= 0) {
    if (etat.perdue) faute("renverse", true, `Tu as retourné la fiole sans la boucher : toute la solution, ${ml(etat.renverse)}, s'est répandue sur la paillasse. On bouche toujours la fiole avant de la retourner.`);
    else faute("solution", true, "Il n'y a pas de solution mère dans la fiole : la solution n'est pas préparée.");
    return { score: 0, fautes, mesures: exact, lignes: [`Sans solution préparée, on continue avec les valeurs du professeur : V_m = ${ml(exact.Vm)} et V_f = ${ml(exact.Vf)}.`] };
  }

  const volume = total(etat);
  const fiole = piece.genre === "fiole";
  const le = fiole ? "la fiole" : "le bécher";
  // le prélèvement
  if (etat.parEprouvette > 0) faute("preleveur", true, `Tu as prélevé la solution mère à l'éprouvette graduée : tu y lisais ${ml(etat.parEprouvette / JUSTESSE_EPROUVETTE)}, elle n'en a délivré que ${ml(etat.parEprouvette)}. Pour un volume précis, on prend une pipette jaugée.`);
  if (etat.dansFlacon) faute("flacon", false, "Tu as plongé ton outil dans le flacon de solution mère : il peut polluer toute la solution. Verse d'abord un peu de solution mère dans un bécher, et prélève dans ce bécher.");
  if (etat.aspireTrop) faute("propipette", false, "Tu as aspiré trop haut : le liquide est monté dans la poire à pipeter.");
  const voulue = priseVoulue(r, piece.capacite);
  // les écarts se comptent au centième de millilitre : un prélèvement juste à la limite n'est pas une faute
  const ecartPrise = centieme(etat.prise - voulue);
  // une éprouvette explique déjà un écart de quelques pour cent : au-delà, c'est le volume lui-même qui est faux.
  // Chaque prélèvement à la pipette a sa propre tolérance au trait de jauge : deux prélèvements justes ne font pas une faute.
  const fois = Math.max(1, etat.apports);
  const seuils = etat.parEprouvette > 0 ? { grave: 0.08 * voulue, leger: 0.08 * voulue } : { grave: centieme(0.3 + 0.06 * (fois - 1)), leger: centieme(0.06 * fois) };
  if (Math.abs(ecartPrise) > seuils.grave) faute("prise", true, `Tu as versé ${ml(etat.prise)} de solution mère dans ${le} : il en fallait ${ml(voulue)}. Ta solution est trop ${ecartPrise > 0 ? "concentrée" : "diluée"}.`);
  else if (Math.abs(ecartPrise) > seuils.leger) faute("prise", false, `Ton prélèvement fait ${ml(etat.prise)} au lieu de ${ml(voulue)} : le bas du ménisque doit arriver juste sur le trait de jauge.`);
  // le récipient et son trait
  const depasse = centieme(volume - trait(piece));
  if (!fiole) {
    faute("recipient", true, `Tu as préparé ta solution dans un bécher : sa graduation « ${piece.capacite} mL » correspond en réalité à ${ml(trait(piece))}. Une solution de concentration précise se prépare dans une fiole jaugée.`);
    if (Math.abs(depasse) > 5) faute("trait", true, `Le bécher contient ${ml(volume)} : c'est loin de sa graduation « ${piece.capacite} mL ».`);
  } else {
    if (depasse > 0.6) faute("trait", true, `Tu as dépassé le trait de jauge de ${ml(depasse)} : la solution est trop diluée, et on ne peut pas retirer d'eau. Il fallait recommencer la solution.`);
    else if (depasse > 0.15) faute("trait", false, `Le niveau est ${ml(depasse)} au-dessus du trait de jauge : à la fin, ajoute l'eau goutte à goutte, jusqu'à ce que le bas du ménisque arrive sur le trait.`);
    else if (etat.eau <= 0) faute("trait", true, "Tu n'as pas ajouté d'eau distillée : la fiole ne contient que de la solution mère.");
    else if (depasse < -0.6) faute("trait", true, `Tu n'as pas complété jusqu'au trait de jauge : il manque ${ml(-depasse)} d'eau distillée.`);
    else if (depasse < -0.15) faute("trait", false, `Le niveau est ${ml(-depasse)} sous le trait de jauge : complète goutte à goutte, jusqu'à ce que le bas du ménisque arrive sur le trait.`);
    if (etat.auJet && depasse <= 0.15) faute("jet", false, "Tu as complété au jet jusque dans les derniers millimètres : près du trait de jauge, le niveau monte très vite. Dès que le liquide apparaît dans la loupe, passe au goutte à goutte.");
    if (piece.capacite !== r.fiole) faute("volume", false, `On te demandait ${r.fiole} mL de solution : ta fiole en contient ${piece.capacite} mL.`);
  }
  // le mélange
  if (etat.eau > 0 && !etat.agite) faute("agitation", false, `Tu n'as pas agité ${le} avant de compléter : aux deux tiers, on agite pour commencer le mélange tant qu'il reste de la place.`);
  if (!homogene(etat)) {
    const c = couches(r, etat);
    if (etat.retournements === 0) faute("homogene", true, `Tu n'as pas homogénéisé ta solution : au fond, elle est à ${concentrationEcrite(r, c.bas)} ; en haut, c'est de l'eau. ${fiole ? "Bouche la fiole et retourne-la" : "Mélange-la"} au moins ${RETOURNEMENTS} fois.`);
    else faute("homogene", false, `Tu n'as retourné la fiole que ${etat.retournements} fois : la solution est encore à ${concentrationEcrite(r, c.bas)} au fond et à ${concentrationEcrite(r, c.haut)} en haut. Retourne-la au moins ${RETOURNEMENTS} fois.`);
  }
  if (etat.renverse > 0.5) faute("renverse", false, `Tu as renversé ${ml(etat.renverse)} sur la paillasse.`);

  // la concentration réellement obtenue, avec les volumes réels : C_mère × V_m = C × V_f
  const mesures = { Vm: etat.prise, Vf: volume, C: concentrationPreparee({ mode: 0, Cmere: r.Cmere, V: etat.prise, Vfille: volume }) };
  const lignes = [
    "Le professeur a contrôlé ta solution par pesée : voici ses volumes réels.",
    `Volume de solution mère dans ${le} : V_m = ${ml(mesures.Vm)}.`,
    `Volume total de ta solution : V_f = ${ml(mesures.Vf)}.`,
  ];
  return { score: scoreDesFautes(fautes), fautes, mesures, lignes };
}

export const regles: ReglesPaillasse<ReglagesSolutions, EtatSolutions> = { depart: () => DEPART, geste, bilan };
