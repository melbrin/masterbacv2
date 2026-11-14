// La paillasse « reflux » (décision 0012) : la synthèse d'un ester par chauffage à reflux, du flacon à la balance.
// Trois postes. La préparation : blouse, lunettes et gants, l'alcool prélevé à la pipette jaugée, l'acide mesuré à
// l'éprouvette, la pierre ponce et le catalyseur, le tout dans le ballon. Le montage : support élévateur, chauffe-ballon,
// ballon et réfrigérant tenus par leurs pinces, tuyaux d'eau, robinet, thermostat, puis le temps qui passe.
// La séparation : l'ampoule à décanter, que l'on agite et dégaze, les deux phases, le robinet fermé à la limite, et la
// pesée du produit dans un bécher taré.
// Chaque geste a ses conséquences : sans eau dans le réfrigérant les vapeurs s'échappent, sans pierre ponce le mélange
// est projeté, un ballon non tenu suit le chauffe-ballon quand on le descend, un chauffage trop court laisse la
// transformation en route, un robinet fermé trop tôt laisse de l'eau dans le produit.
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Les volumes sont en millilitres, les masses en grammes, les durées en minutes.
import { nombre } from "@/lib/commun/format";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

export interface ReglagesReflux {
  /** le volume d'alcool à prélever à la pipette jaugée : c'est le réactif limitant */
  Va: number;
  /** le volume d'acide à mesurer à l'éprouvette : il est en excès */
  Vc: number;
  /** la durée du chauffage à reflux demandée */
  duree: number;
  /** la part de l'ester formé que l'on retrouve après le lavage et les transferts */
  recuperation: number;
  /** la masse du bécher sec qui reçoit le produit */
  becher: number;
  /** les noms des espèces, dans une phrase */
  noms: { alcool: string; acide: string; ester: string };
}

export type Protection = "blouse" | "lunettes" | "gants";
export const PROTECTIONS: readonly Protection[] = ["blouse", "lunettes", "gants"];
/** Les pièces du montage : le support élévateur, le chauffe-ballon, la pince du ballon, le réfrigérant, la pince du réfrigérant. */
export type Piece = "support" | "chauffe" | "pinceb" | "refrigerant" | "pincer";
/** Les bouts des tuyaux : le robinet d'eau, l'évier, la tubulure du bas et celle du haut du réfrigérant. */
export const BORNES = ["robinet", "evier", "bas", "haut"] as const;

export interface EtatReflux {
  // ----- la sécurité -----
  porte: Record<Protection, boolean>;
  /** ce qui manquait quand un produit chimique a été manipulé */
  expose: Record<Protection, boolean>;
  // ----- les réactifs -----
  /** où est la pipette jaugée, et ce qu'elle contient */
  pipette: "repos" | "flacon" | "ballon";
  dansPipette: number;
  /** vrai si le liquide est monté jusque dans la propipette */
  aspireTrop: boolean;
  /** l'acide mesuré dans l'éprouvette */
  eprouvette: number;
  /** ce que le ballon a reçu : l'alcool, l'acide, les gouttes de catalyseur, les pincées de pierre ponce */
  alcool: number;
  acide: number;
  gouttes: number;
  ponce: number;
  /** ce qui a coulé à côté du ballon */
  renverse: number;
  // ----- le montage -----
  pieces: Record<Piece, boolean>;
  /** où est le ballon : sur son valet de liège, qui le suit d'un poste à l'autre, ou dans le montage */
  ballon: "valet" | "montage";
  /** la hauteur du support élévateur, de 0 à 3 : à 3, le chauffe-ballon entoure le ballon */
  hauteur: number;
  /** vrai si le ballon, non tenu, a suivi le chauffe-ballon et s'est renversé */
  tombe: boolean;
  /** vrai si le support a été descendu après le chauffage */
  descendu: boolean;
  /** les tuyaux posés : chacun relie deux bouts */
  tuyaux: [string, string][];
  /** l'ouverture du robinet d'eau, de 0 à 3 */
  eau: number;
  // ----- le chauffage -----
  /** le thermostat du chauffe-ballon, de 0 à 6 */
  thermostat: number;
  /** le temps écoulé au chronomètre */
  temps: number;
  /** le temps passé à bouillir, et à chauffer sans bouillir */
  ebullition: number;
  tiede: number;
  /** le temps de réaction qui compte : une minute d'ébullition avec catalyseur vaut 1 */
  efficace: number;
  /** la part du mélange partie en vapeurs */
  pertes: number;
  /** vrai si le mélange a bouilli sans pierre ponce : il a été projeté */
  projections: boolean;
  /** vrai si le mélange a bouilli sans pince pour tenir le ballon, pour tenir le réfrigérant */
  ballonLibre: boolean;
  refrigerantLibre: boolean;
  /** le temps d'ébullition sans réfrigérant, sans eau qui circule, avec l'eau à l'envers, avec un chauffage trop fort */
  sansRefrigerant: number;
  sansEau: number;
  inverse: number;
  fort: number;
  /** le temps de refroidissement depuis la fin du chauffage */
  froid: number;
  // ----- la séparation -----
  /** vrai quand le mélange est dans l'ampoule à décanter */
  ampoule: boolean;
  /** vrai si le ballon a été démonté encore chaud */
  chaud: boolean;
  /** les volumes des deux phases versées dans l'ampoule */
  organique: number;
  aqueux: number;
  bouchon: boolean;
  /** le nombre d'agitations, et la pression qu'elles ont fait monter depuis le dernier dégazage */
  agite: number;
  pression: number;
  /** vrai si le bouchon a sauté ; vrai si l'ampoule a été agitée sans bouchon */
  saute: boolean;
  sansBouchon: boolean;
  /** le temps de repos depuis la dernière agitation */
  repos: number;
  /** vrai si le robinet a été ouvert avant que les phases soient séparées */
  emulsion: boolean;
  /** ce qui est sorti de l'ampoule */
  ecoule: number;
  /** le bécher poubelle est sous l'ampoule ; où est le bécher du produit */
  poubelle: boolean;
  becher: "paillasse" | "sous" | "balance";
  /** ce que le bécher du produit a reçu : de la phase organique, de la phase aqueuse */
  recolteOrg: number;
  recolteAq: number;
  /** la phase organique partie ailleurs que dans le bécher du produit, et ce qui a coulé sur la paillasse */
  perduOrg: number;
  flaque: number;
  // ----- la pesée -----
  /** ce que la balance retranche depuis la dernière tare */
  tare: number;
  /** la masse que l'élève retient pour son produit ; null tant qu'il ne l'a pas notée */
  note: number | null;
}

/** Les masses molaires (g/mol) et les masses volumiques (g/mL) de l'alcool, de l'acide et de l'ester. */
export const M = { alcool: 108, acide: 60, ester: 150 };
export const RHO = { alcool: 1.04, acide: 1.05, ester: 1.06 };
/** La masse volumique de la phase aqueuse : de l'eau salée. */
const RHO_EAU = 1.15;
/** La constante d'équilibre de l'estérification, et son temps caractéristique à l'ébullition, avec le catalyseur. */
const K = 4;
const TAU = 8;
const SANS_CATALYSEUR = 0.05;
/** La hauteur du support élévateur quand le chauffe-ballon entoure le ballon. */
export const HAUT = 3;
export const EPROUVETTE = 25;
/** L'eau salée qui attend dans l'ampoule à décanter. */
const EAU_SALEE = 30;
/** Il faut trois agitations pour laver le produit ; après deux agitations sans dégazer, le bouchon saute. */
export const LAVAGES = 3;
export const PRESSION_MAX = 2;
/** Le temps de repos qui sépare les deux phases, et le temps de refroidissement avant de démonter. */
export const REPOS = 3;
export const REFROIDI = 5;
const centieme = (x: number) => Math.round(x * 100) / 100;
/** Pour les grandeurs qui s'ajoutent par petits morceaux multipliés par un taux : six décimales, et deux morceaux valent leur somme. */
const fin = (x: number) => Math.round(x * 1e6) / 1e6;
const ml = (x: number, d = 1) => `${nombre(x, d)} mL`;
const g2 = (x: number) => `${nombre(x, 2)} g`;
const min = (x: number) => `${nombre(x, 0)} min`;

const RIEN: Record<Protection, boolean> = { blouse: false, lunettes: false, gants: false };
const DEPART: EtatReflux = {
  porte: RIEN, expose: RIEN,
  pipette: "repos", dansPipette: 0, aspireTrop: false, eprouvette: 0, alcool: 0, acide: 0, gouttes: 0, ponce: 0, renverse: 0,
  pieces: { support: false, chauffe: false, pinceb: false, refrigerant: false, pincer: false }, ballon: "valet", hauteur: 0, tombe: false, descendu: false, tuyaux: [], eau: 0,
  thermostat: 0, temps: 0, ebullition: 0, tiede: 0, efficace: 0, pertes: 0, projections: false, ballonLibre: false, refrigerantLibre: false, sansRefrigerant: 0, sansEau: 0, inverse: 0, fort: 0, froid: 0,
  ampoule: false, chaud: false, organique: 0, aqueux: 0, bouchon: false, agite: 0, pression: 0, saute: false, sansBouchon: false, repos: 0, emulsion: false, ecoule: 0,
  poubelle: false, becher: "paillasse", recolteOrg: 0, recolteAq: 0, perduOrg: 0, flaque: 0,
  tare: 0, note: null,
};

// ---------- ce que la paillasse montre ----------

/** Vrai si le ballon peut encore recevoir quelque chose : il est sur son valet, et le mélange n'a pas encore chauffé. */
export const ballonOuvert = (etat: EtatReflux): boolean => !etat.ampoule && etat.ballon === "valet" && etat.ebullition <= 0 && etat.tiede <= 0;
/** Le volume de liquide dans le ballon. */
export const dansBallon = (etat: EtatReflux): number => (etat.ampoule ? 0 : etat.alcool + etat.acide);
/** Vrai si le ballon a chauffé. */
const aChauffe = (etat: EtatReflux): boolean => etat.ebullition > 0 || etat.tiede > 0;
/** Ce que fait le mélange : rien, il tiédit sans bouillir, il bout doucement, il bout trop fort. */
export type Regime = "arret" | "tiede" | "reflux" | "fort";
export function regime(etat: EtatReflux): Regime {
  const chauffe = etat.pieces.support && etat.pieces.chauffe && etat.ballon === "montage" && etat.hauteur === HAUT && dansBallon(etat) > 0;
  if (!chauffe || etat.thermostat <= 0) return "arret";
  return etat.thermostat <= 2 ? "tiede" : etat.thermostat <= 4 ? "reflux" : "fort";
}
/** L'eau dans le réfrigérant : elle entre par le bas et sort par le haut, ou l'inverse, ou elle fuit, ou elle ne circule pas. */
export type Circulation = "bonne" | "inverse" | "fuite" | "aucune";
export function circulation(etat: EtatReflux): Circulation {
  if (!etat.pieces.refrigerant || etat.eau <= 0) return "aucune";
  const relie = (a: string, b: string) => etat.tuyaux.some(([u, v]) => (u === a && v === b) || (u === b && v === a));
  if (relie("robinet", "bas") && relie("haut", "evier")) return "bonne";
  if (relie("robinet", "haut") && relie("bas", "evier")) return "inverse";
  return relie("robinet", "bas") || relie("robinet", "haut") ? "fuite" : "aucune";
}
/** L'avancement à l'équilibre d'une estérification, pour un réactif en excès `r` fois plus abondant que l'autre. */
export function avancementEquilibre(r: number): number {
  const b = K * (1 + r);
  return (b - Math.sqrt(b * b - 4 * K * (K - 1) * r)) / (2 * (K - 1));
}
/** La quantité d'ester dans le ballon, en moles : limitée par l'équilibre, par le temps de chauffage, par ce qui s'est perdu. */
export function esterForme(etat: EtatReflux): number {
  const alcool = (RHO.alcool * etat.alcool) / M.alcool;
  const acide = (RHO.acide * etat.acide) / M.acide;
  const limitant = Math.min(alcool, acide);
  if (limitant <= 0) return 0;
  const perdu = Math.min(0.95, etat.pertes + (etat.projections ? 0.1 : 0) + (etat.tombe ? 0.25 : 0));
  return limitant * avancementEquilibre(Math.max(alcool, acide) / limitant) * (1 - Math.exp(-etat.efficace / TAU)) * (1 - perdu);
}
/** Ce qu'il reste de chaque phase dans l'ampoule : la phase aqueuse, en bas, sort la première. */
export const phases = (etat: EtatReflux): { aqueux: number; organique: number } => ({
  aqueux: centieme(Math.max(0, etat.aqueux - etat.ecoule)),
  organique: centieme(Math.max(0, etat.organique - Math.max(0, etat.ecoule - etat.aqueux))),
});
/** Vrai si les deux phases sont séparées : l'ampoule a reposé depuis la dernière agitation. */
export const decante = (etat: EtatReflux): boolean => etat.agite === 0 || etat.repos >= REPOS;
/** La masse de ce que contient le bécher du produit. Mal lavé, ou recueilli avant la fin de la décantation, il pèse plus lourd. */
export const masseRecoltee = (etat: EtatReflux): number =>
  centieme((RHO.ester * etat.recolteOrg + RHO_EAU * etat.recolteAq) * (etat.agite < LAVAGES ? 1.06 : 1) * (etat.emulsion ? 1.08 : 1));
/** Ce que la balance affiche. */
export const affichage = (r: ReglagesReflux, etat: EtatReflux): number => centieme((etat.becher === "balance" ? r.becher + masseRecoltee(etat) : 0) - etat.tare);
/** La masse de produit d'une manipulation sans défaut : celle du professeur. */
export function masseExacte(r: ReglagesReflux): number {
  const organique = centieme((r.recuperation * esterForme({ ...DEPART, alcool: r.Va, acide: r.Vc, efficace: r.duree }) * M.ester) / RHO.ester);
  return centieme(RHO.ester * organique);
}

// ---------- les gestes ----------

/** Un produit chimique est manipulé : ce qui n'est pas porté à ce moment-là est relevé. */
const manipule = (etat: EtatReflux): EtatReflux =>
  (PROTECTIONS.every((p) => etat.porte[p] || etat.expose[p]) ? etat : { ...etat, expose: { blouse: etat.expose.blouse || !etat.porte.blouse, lunettes: etat.expose.lunettes || !etat.porte.lunettes, gants: etat.expose.gants || !etat.porte.gants } });
const estProtection = (x: unknown): x is Protection => x === "blouse" || x === "lunettes" || x === "gants";
const estPiece = (x: unknown): x is Piece => x === "support" || x === "chauffe" || x === "pinceb" || x === "refrigerant" || x === "pincer";
const estBorne = (x: unknown): x is (typeof BORNES)[number] => x === "robinet" || x === "evier" || x === "bas" || x === "haut";
const entier = (g: GesteBrut, max: number): number | null => { const v = nombreDe(g, "v"); return v !== null && Number.isInteger(v) && v >= 0 && v <= max ? v : null; };

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesReflux, etat: EtatReflux, g: GesteBrut): EtatReflux {
  const v = nombreDe(g, "v");
  const positif = v !== null && v > 0 && v <= 120 ? centieme(v) : null;
  switch (g.g) {
    // ----- la sécurité -----
    case "equiper": {
      const quoi = texteDe(g, "quoi");
      return estProtection(quoi) && typeof g.porte === "boolean" && g.porte !== etat.porte[quoi] ? { ...etat, porte: { ...etat.porte, [quoi]: g.porte } } : etat;
    }
    // ----- l'alcool, à la pipette jaugée -----
    case "pipette": {
      const ou = texteDe(g, "ou");
      return (ou === "repos" || ou === "flacon" || ou === "ballon") && ou !== etat.pipette ? { ...etat, pipette: ou } : etat;
    }
    case "aspirer": {
      if (positif === null || etat.pipette !== "flacon") return etat;
      const plein = r.Va * 1.2;
      return manipule({ ...etat, dansPipette: centieme(Math.min(plein, etat.dansPipette + positif)), aspireTrop: etat.aspireTrop || etat.dansPipette + positif > plein });
    }
    case "vider": {
      if (positif === null || etat.dansPipette <= 0) return etat;
      const sort = Math.min(positif, etat.dansPipette);
      const pipette = manipule({ ...etat, dansPipette: centieme(etat.dansPipette - sort) });
      if (etat.pipette === "flacon") return pipette;
      if (etat.pipette === "ballon" && ballonOuvert(etat)) return { ...pipette, alcool: centieme(etat.alcool + sort) };
      return { ...pipette, renverse: centieme(etat.renverse + sort) };
    }
    // ----- l'acide, à l'éprouvette graduée -----
    case "mesurer": {
      if (positif === null) return etat;
      const place = EPROUVETTE * 1.04 - etat.eprouvette;
      const entre = Math.min(positif, place);
      return manipule({ ...etat, eprouvette: centieme(etat.eprouvette + entre), renverse: centieme(etat.renverse + positif - entre) });
    }
    case "verser": {
      const vers = texteDe(g, "vers");
      if (etat.eprouvette <= 0 || (vers !== "ballon" && vers !== "flacon")) return etat;
      const vide = manipule({ ...etat, eprouvette: 0 });
      if (vers === "flacon") return vide;
      return ballonOuvert(etat) ? { ...vide, acide: centieme(etat.acide + etat.eprouvette) } : { ...vide, renverse: centieme(etat.renverse + etat.eprouvette) };
    }
    // ----- le catalyseur et la pierre ponce -----
    case "goutte": return ballonOuvert(etat) ? manipule({ ...etat, gouttes: Math.min(40, etat.gouttes + 1) }) : etat;
    case "ponce": return ballonOuvert(etat) ? { ...etat, ponce: Math.min(10, etat.ponce + 1) } : etat;
    // ----- le montage -----
    case "placer": {
      const quoi = texteDe(g, "quoi");
      if (!estPiece(quoi) || etat.pieces[quoi]) return etat;
      if ((quoi === "chauffe" && !etat.pieces.support) || (quoi === "refrigerant" && etat.ballon !== "montage")) return etat;
      return { ...etat, pieces: { ...etat.pieces, [quoi]: true } };
    }
    case "retirer": {
      const quoi = texteDe(g, "quoi");
      if (!estPiece(quoi) || !etat.pieces[quoi]) return etat;
      const posee = etat.ballon === "montage" && etat.hauteur === HAUT;
      // on ne retire pas ce qui porte une autre pièce
      if ((quoi === "support" && etat.pieces.chauffe) || (quoi === "chauffe" && posee && !etat.pieces.pinceb) || (quoi === "pinceb" && etat.ballon === "montage" && !posee)) return etat;
      const pieces = { ...etat.pieces, [quoi]: false };
      return quoi === "refrigerant" ? { ...etat, pieces, tuyaux: etat.tuyaux.filter(([a, b]) => a !== "bas" && a !== "haut" && b !== "bas" && b !== "haut") } : { ...etat, pieces };
    }
    case "ballon": {
      const ou = texteDe(g, "ou");
      if ((ou !== "valet" && ou !== "montage") || ou === etat.ballon) return etat;
      // dans le montage, le ballon tient par sa pince, ou repose dans le chauffe-ballon monté ; il n'en sort que si le réfrigérant tient tout seul
      if (ou === "montage") return etat.pieces.pinceb || (etat.pieces.support && etat.pieces.chauffe && etat.hauteur === HAUT) ? { ...etat, ballon: ou } : etat;
      return etat.pieces.refrigerant && !etat.pieces.pincer ? etat : { ...etat, ballon: ou };
    }
    case "monter": {
      const h = entier(g, HAUT);
      if (h === null || h === etat.hauteur || !etat.pieces.support) return etat;
      const lache = h < HAUT && etat.hauteur === HAUT && etat.ballon === "montage" && !etat.pieces.pinceb;
      return { ...etat, hauteur: h, tombe: etat.tombe || (lache && dansBallon(etat) > 0), descendu: etat.descendu || (h < HAUT && aChauffe(etat)) };
    }
    case "tuyau": {
      const a = texteDe(g, "a");
      const b = texteDe(g, "b");
      if (!estBorne(a) || !estBorne(b) || a === b || typeof g.pose !== "boolean") return etat;
      const ici = ([u, w]: [string, string]) => (u === a && w === b) || (u === b && w === a);
      if (!g.pose) return etat.tuyaux.some(ici) ? { ...etat, tuyaux: etat.tuyaux.filter((t) => !ici(t)) } : etat;
      // un bout ne reçoit qu'un tuyau, et les tubulures sont sur le réfrigérant
      const pris = (x: string) => etat.tuyaux.some(([u, w]) => u === x || w === x);
      if (pris(a) || pris(b) || ((a === "bas" || a === "haut" || b === "bas" || b === "haut") && !etat.pieces.refrigerant)) return etat;
      return { ...etat, tuyaux: [...etat.tuyaux, [a, b]] };
    }
    case "eau": { const o = entier(g, 3); return o === null || o === etat.eau ? etat : { ...etat, eau: o }; }
    // ----- le chauffage -----
    case "thermostat": { const t = entier(g, 6); return t === null || t === etat.thermostat ? etat : { ...etat, thermostat: t }; }
    // le temps passe : le mélange réagit s'il chauffe, refroidit sinon ; dans l'ampoule, les phases se séparent
    case "attendre": {
      if (positif === null) return etat;
      const suite = { ...etat, temps: centieme(Math.min(999, etat.temps + positif)), repos: etat.ampoule ? centieme(Math.min(999, etat.repos + positif)) : etat.repos };
      const ce = regime(etat);
      if (ce === "arret") return aChauffe(etat) ? { ...suite, froid: fin(etat.froid + positif * (etat.hauteur < HAUT || etat.ballon !== "montage" ? 1 : 0.5)) } : suite;
      const vitesse = etat.gouttes > 0 ? 1 : SANS_CATALYSEUR;
      if (ce === "tiede") return { ...suite, froid: 0, tiede: centieme(etat.tiede + positif), efficace: fin(etat.efficace + positif * 0.2 * vitesse) };
      const eau = circulation(etat);
      const fuite = !etat.pieces.refrigerant ? 0.05 : eau === "bonne" ? 0 : eau === "inverse" ? 0.008 : 0.02;
      return {
        ...suite, froid: 0, ebullition: centieme(etat.ebullition + positif), efficace: fin(etat.efficace + positif * vitesse), projections: etat.projections || etat.ponce === 0,
        ballonLibre: etat.ballonLibre || !etat.pieces.pinceb, refrigerantLibre: etat.refrigerantLibre || (etat.pieces.refrigerant && !etat.pieces.pincer),
        pertes: fin(etat.pertes + positif * (fuite + (ce === "fort" ? 0.004 : 0))),
        sansRefrigerant: centieme(etat.sansRefrigerant + (etat.pieces.refrigerant ? 0 : positif)),
        sansEau: centieme(etat.sansEau + (etat.pieces.refrigerant && (eau === "aucune" || eau === "fuite") ? positif : 0)),
        inverse: centieme(etat.inverse + (eau === "inverse" ? positif : 0)), fort: centieme(etat.fort + (ce === "fort" ? positif : 0)),
      };
    }
    // ----- la séparation -----
    // le contenu du ballon passe dans l'ampoule à décanter, sur l'eau salée
    case "transvaser": {
      if (etat.ampoule || etat.ballon !== "valet" || etat.bouchon || dansBallon(etat) <= 0) return etat;
      const organique = centieme((r.recuperation * esterForme(etat) * M.ester) / RHO.ester);
      return manipule({ ...etat, ampoule: true, chaud: aChauffe(etat) && etat.froid < REFROIDI, organique, aqueux: centieme(EAU_SALEE + 0.9 * etat.acide), repos: 0 });
    }
    case "bouchon": return typeof g.pose === "boolean" && g.pose !== etat.bouchon ? { ...etat, bouchon: g.pose } : etat;
    case "agiter": {
      if (!etat.ampoule || etat.ecoule > 0) return etat;
      const agite = manipule({ ...etat, agite: etat.agite + 1, repos: 0 });
      // sans bouchon, le mélange gicle ; avec trop de pression, le bouchon saute
      if (!etat.bouchon) return { ...agite, sansBouchon: true, organique: centieme(etat.organique * 0.8), aqueux: centieme(etat.aqueux * 0.8) };
      if (etat.pression >= PRESSION_MAX) return { ...agite, saute: true, bouchon: false, pression: 0, organique: centieme(etat.organique * 0.9) };
      return { ...agite, pression: etat.pression + 1 };
    }
    case "degazer": return etat.ampoule && etat.bouchon && etat.pression > 0 ? { ...etat, pression: 0 } : etat;
    case "becher": {
      const ou = texteDe(g, "ou");
      return (ou === "paillasse" || ou === "sous" || ou === "balance") && ou !== etat.becher ? { ...etat, becher: ou, poubelle: ou === "sous" ? false : etat.poubelle } : etat;
    }
    case "poubelle": return typeof g.sous === "boolean" && g.sous !== etat.poubelle ? { ...etat, poubelle: g.sous, becher: g.sous && etat.becher === "sous" ? "paillasse" : etat.becher } : etat;
    // ce qui sort par le robinet de l'ampoule : rien tant que le bouchon est en place
    case "couler": {
      if (positif === null || !etat.ampoule || etat.bouchon) return etat;
      const reste = phases(etat);
      const sort = Math.min(positif, centieme(reste.aqueux + reste.organique));
      if (sort <= 0) return etat;
      const aqueux = Math.min(sort, reste.aqueux);
      const organique = centieme(sort - aqueux);
      const suite = manipule({ ...etat, ecoule: centieme(etat.ecoule + sort), emulsion: etat.emulsion || (etat.ecoule === 0 && !decante(etat)) });
      if (etat.becher === "sous") return { ...suite, recolteAq: centieme(etat.recolteAq + aqueux), recolteOrg: centieme(etat.recolteOrg + organique) };
      if (etat.poubelle) return { ...suite, perduOrg: centieme(etat.perduOrg + organique) };
      return { ...suite, perduOrg: centieme(etat.perduOrg + organique), flaque: centieme(etat.flaque + sort) };
    }
    // ----- la pesée -----
    case "tarer": { const tare = etat.becher === "balance" ? centieme(r.becher + masseRecoltee(etat)) : 0; return tare === etat.tare ? etat : { ...etat, tare }; }
    case "noter": return v !== null && v >= 0 && v <= 500 ? { ...etat, note: centieme(v) } : etat;
    default: return etat;
  }
}

// ---------- le bilan ----------

const NOMS: Record<Protection, string> = { blouse: "blouse", lunettes: "lunettes", gants: "gants" };
const liste = (mots: string[]): string => (mots.length <= 1 ? mots.join("") : `${mots.slice(0, -1).join(", ")} ni ${mots[mots.length - 1]}`);

/** Le bilan de la manipulation : la masse retenue pour le produit, et les fautes relevées par le professeur. */
function bilan(r: ReglagesReflux, etat: EtatReflux): BilanPaillasse {
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const fait = aChauffe(etat);

  if (!fait) {
    faute("synthese", true, "Le mélange n'a jamais chauffé : la synthèse n'est pas faite.");
  } else {
    // la sécurité
    const oublis = PROTECTIONS.filter((p) => etat.expose[p]).map((p) => NOMS[p]);
    if (oublis.length > 0) faute("securite", etat.expose.lunettes, `Tu as manipulé des produits corrosifs sans ${liste(oublis)} : on s'équipe avant de toucher au premier flacon.`);
    // les réactifs
    const alcool = (RHO.alcool * etat.alcool) / M.alcool;
    const acide = (RHO.acide * etat.acide) / M.acide;
    const ecart = etat.alcool - r.Va;
    if (etat.alcool <= 0) faute("alcool", true, `Il n'y avait pas d'${r.noms.alcool} dans le ballon.`);
    else if (Math.abs(ecart) > 0.1) faute("alcool", Math.abs(ecart) > 0.5, `Tu as introduit ${ml(etat.alcool, 2)} d'${r.noms.alcool} au lieu de ${ml(r.Va)} : le bas du ménisque doit arriver juste sur le trait de jauge de la pipette.`);
    if (etat.aspireTrop) faute("propipette", false, "Tu as aspiré trop haut : le liquide est monté dans la propipette.");
    if (etat.alcool > 0 && acide < alcool) faute("exces", true, `Tu n'as versé que ${ml(etat.acide)} d'${r.noms.acide} : c'est lui qui limite la réaction, alors que l'acide devait être en excès.`);
    else if (Math.abs(etat.acide - r.Vc) > 0.1 * r.Vc) faute("acide", false, `Tu as versé ${ml(etat.acide)} d'${r.noms.acide} au lieu de ${ml(r.Vc, 0)} : lis l'éprouvette à la loupe, en face du bas du ménisque.`);
    if (etat.gouttes === 0) faute("catalyseur", true, "Tu n'as pas ajouté l'acide sulfurique : sans catalyseur, la transformation est beaucoup trop lente.");
    if (etat.projections) faute("ponce", false, "Tu as chauffé sans pierre ponce : l'ébullition a été brutale, et une partie du mélange a été projetée.");
    if (etat.renverse > 0.5) faute("renverse", false, `Tu as renversé ${ml(etat.renverse)} de réactif sur la paillasse.`);
    // le montage
    if (etat.tombe) faute("pince", true, "Le ballon n'était pas tenu par une pince : quand tu as descendu le support élévateur, il a suivi le chauffe-ballon, s'est détaché du réfrigérant et s'est renversé.");
    else if (etat.ballonLibre && etat.refrigerantLibre) faute("pince", false, "Pendant le chauffage, ni le ballon ni le réfrigérant n'étaient tenus par une pince : le montage peut basculer.");
    else if (etat.ballonLibre) faute("pince", false, "Pendant le chauffage, le ballon n'était pas tenu par une pince : il ne reposait que sur le chauffe-ballon.");
    else if (etat.refrigerantLibre) faute("pince", false, "Pendant le chauffage, le réfrigérant n'était pas tenu par une pince : tout son poids reposait sur le col du ballon.");
    // le reflux
    if (etat.sansRefrigerant > 0) faute("refrigerant", true, `Le mélange a bouilli ${min(etat.sansRefrigerant)} sans réfrigérant : les vapeurs sont parties dans la salle, et une partie du mélange avec elles.`);
    if (etat.sansEau > 0) faute("eau", true, `Le mélange a bouilli ${min(etat.sansEau)} sans que l'eau circule dans le réfrigérant : les vapeurs ne se condensent pas, elles s'échappent par le haut. L'eau entre par le bas, sort par le haut vers l'évier, et le robinet est ouvert.`);
    if (etat.inverse > 0) faute("sens", false, `Pendant ${min(etat.inverse)}, l'eau est entrée par le haut du réfrigérant : il se remplit mal et refroidit moins bien. L'eau entre par le bas et sort par le haut.`);
    if (etat.fort > 2) faute("chauffage", false, `Tu as chauffé trop fort pendant ${min(etat.fort)} : les vapeurs montent jusqu'en haut du réfrigérant. Une ébullition douce suffit.`);
    if (etat.ebullition <= 0) faute("court", true, "Le mélange n'a jamais bouilli : monte le thermostat jusqu'à voir les vapeurs se condenser dans le réfrigérant.");
    else if (etat.ebullition < 0.9 * r.duree) faute("court", etat.ebullition < 0.6 * r.duree, `Tu n'as chauffé à reflux que ${min(etat.ebullition)} au lieu de ${min(r.duree)} : la transformation n'est pas allée au bout.`);
    if (etat.chaud) faute("refroidir", false, "Tu as démonté le ballon encore chaud : on descend le support élévateur et on laisse refroidir quelques minutes.");
    else if (!etat.descendu) faute("refroidir", false, "Tu n'as pas descendu le support élévateur à la fin du chauffage : c'est le geste qui écarte tout de suite le chauffe-ballon.");
    // la séparation
    if (!etat.ampoule) {
      faute("separation", true, "Tu n'as pas séparé ton produit : le mélange est resté dans le ballon.");
    } else {
      const reste = phases(etat);
      if (etat.sansBouchon) faute("bouchon", true, "Tu as agité l'ampoule sans son bouchon : une partie du mélange a giclé.");
      if (etat.saute) faute("degazage", false, "Tu as agité plusieurs fois sans dégazer : la pression a fait sauter le bouchon. Après chaque agitation, on retourne l'ampoule et on ouvre le robinet.");
      if (etat.agite < LAVAGES) faute("lavage", false, `${etat.agite === 0 ? "Tu n'as pas agité l'ampoule" : `Tu n'as agité l'ampoule que ${etat.agite} fois`} : il reste de l'acide dans la phase organique, qui pèse plus lourd. Il faut ${LAVAGES} agitations, chacune suivie d'un dégazage.`);
      if (etat.emulsion) faute("repos", false, "Tu as ouvert le robinet avant que les deux phases soient séparées : laisse reposer l'ampoule quelques minutes.");
      if (etat.recolteAq > 0.5) faute("limite", etat.recolteAq > 2, `Tu as recueilli ${ml(etat.recolteAq)} de phase aqueuse avec ton produit : sa masse est surestimée. Ferme le robinet quand la limite entre les deux phases arrive au robinet.`);
      const parti = centieme(etat.perduOrg - (etat.flaque > 0 ? Math.min(etat.flaque, etat.perduOrg) : 0));
      if (parti > 0.5) faute("limite", parti > 2, `Tu as laissé partir ${ml(parti)} de phase organique avec la phase aqueuse : ferme le robinet dès que la limite entre les deux phases y arrive.`);
      if (etat.flaque > 0.3) faute("flaque", false, `Tu as laissé couler ${ml(etat.flaque)} sur la paillasse : il faut un bécher sous l'ampoule avant d'ouvrir le robinet.`);
      if (reste.organique > 0.5 && etat.recolteOrg + etat.recolteAq > 0) faute("oubli", false, `Il reste ${ml(reste.organique)} de produit dans l'ampoule.`);
      // la pesée
      const vraie = masseRecoltee(etat);
      if (etat.recolteOrg + etat.recolteAq <= 0) faute("recolte", true, "Tu n'as rien recueilli dans le bécher du produit.");
      if (etat.note === null) faute("note", true, "Tu n'as pas noté la masse de ton produit.");
      else if (etat.recolteOrg + etat.recolteAq > 0) {
        const erreur = etat.note - vraie;
        if (Math.abs(erreur) > 0.03 && Math.abs(erreur - r.becher) <= 0.03) faute("tare", true, `Tu as noté ${g2(etat.note)} : c'est la masse du bécher avec son contenu. Le bécher vide pèse ${g2(r.becher)} : fais la tare avant de le remplir, ou retranche sa masse.`);
        else if (Math.abs(erreur) > 0.03) faute("lecture", Math.abs(erreur) > 0.3, `Tu as noté ${g2(etat.note)} ; ton produit pèse ${g2(vraie)}. Lis la balance quand le bécher est posé dessus, tare faite.`);
      }
    }
  }
  const exacte = masseExacte(r);
  const lignes = etat.note === null
    ? [`Sans masse notée, on continue avec la valeur du professeur : m = ${g2(exacte)}.`]
    : [`La masse de ton produit : m = ${g2(etat.note)}.`, `Masse obtenue par une manipulation sans défaut : ${g2(exacte)}.`];
  // sans chauffage, la synthèse n'est pas faite
  return { score: fait ? scoreDesFautes(fautes) : 0, fautes, mesures: { m: etat.note ?? exacte }, lignes };
}

export const regles: ReglesPaillasse<ReglagesReflux, EtatReflux> = { depart: () => DEPART, geste, bilan };
