// Le guide de la paillasse Solutions : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : le flacon penché au-dessus
// du bécher, la pissette tenue au-dessus de la fiole. Ici aussi, poser un objet : ce que ce geste donne aux règles.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la solution obtenue est sans faute (tests/unitaires/tp/solutions-guide.test.ts).
import type { GesteBrut } from "../types";
import { COL, DERNIER, homogene, priseVoulue, total, verrerie, type EtatSolutions, type ReglagesSolutions, type Verrerie } from "./solutions";

export type CibleSolutions = "plan" | "becher" | "flacon" | "recipient" | "etagere" | "rangement-flacon" | "rangement-pissette" | "rangement-bouchon";
export type PoussoirSolutions = "verser" | "aspirer" | "redescendre" | "vider" | "jet" | "goutte" | "agiter" | "retourner";
export type BoutonSolutions = "recommencer" | "fini";

/** Ce que la vue retient en plus de l'état des règles : le flacon penché au-dessus du bécher, la pissette au-dessus du récipient. */
export interface PosesSolutions { flacon: boolean; pissette: boolean }

const NOMS: Record<Verrerie["genre"], { nom: string; la: string }> = {
  pipette: { nom: "pipette jaugée", la: "La pipette" }, eprouvette: { nom: "éprouvette graduée", la: "L'éprouvette" },
  fiole: { nom: "fiole jaugée", la: "La fiole" }, becher: { nom: "bécher gradué", la: "Le bécher" },
};
/** Une pièce de verrerie dans une phrase : « fiole jaugée de 100 mL ». */
export const nomPiece = (p: Verrerie): string => `${NOMS[p.genre].nom} de ${p.capacite} mL`;

// ---------- le débit des poussoirs ----------

/** Ce que la pipette aspire par seconde : vite d'abord, lentement dans le dernier millilitre et demi sous le trait de jauge. */
export const debitAspire = (piece: Verrerie, dedans: number): number => (piece.genre === "eprouvette" ? 3 : dedans < piece.capacite - 1.5 ? piece.capacite * 0.2 : 0.5);
/** Ce que le jet de la pissette donne par seconde : à plein débit dans le corps de la fiole, doucement dès que le niveau approche du col. */
export const debitJet = (recipient: Verrerie, volume: number): number => (recipient.genre !== "fiole" ? 9 : volume < recipient.capacite * COL - 2 ? 9 : volume < recipient.capacite - 1.2 ? 1 : 0.5);

// ---------- poser un objet ----------

/** Ce que donne un objet posé : les gestes pour les règles, ce que la vue retient ensuite, ce qui vient de se passer, et le geste qui vient après. */
export interface Pose { gestes: GesteBrut[]; poses: PosesSolutions; message: string; conseil?: string }

/**
 * Poser un objet sur une cible. `message` dit ce qui vient de se passer ; `conseil`, le geste que l'objet posé permet
 * (la vue ne l'ajoute que guide coupé : avec le guide, c'est lui qui le dit). Un objet inconnu ne change rien.
 */
export function pose(r: ReglagesSolutions, etat: EtatSolutions, poses: PosesSolutions, objet: string, cible: string): Pose {
  const piece = verrerie(r, objet);
  const recipient = verrerie(r, etat.recipient);
  const laFiole = recipient?.genre === "becher" ? "du bécher gradué" : "de la fiole";
  // l'outil de prélèvement laisse la place au-dessus du récipient : dans le bécher s'il est plein, sur l'étagère sinon
  const ecarte: GesteBrut[] = etat.outil && etat.ou === "recipient" ? [{ g: "outil", quoi: etat.outil, ou: etat.dansOutil > 0 ? "becher" : "etagere" }] : [];
  if (piece && (piece.genre === "fiole" || piece.genre === "becher")) {
    const nom = nomPiece(piece);
    return { gestes: [{ g: "recipient", quoi: objet }], poses: { ...poses, pissette: false }, message: `${nom[0].toUpperCase()}${nom.slice(1)} : ${piece.genre === "fiole" ? "elle" : "il"} est sur la paillasse.${total(etat) > 0 ? " L'autre récipient est vidé et rangé." : ""}` };
  }
  if (piece) {
    const ou = cible === "becher" || cible === "flacon" || cible === "recipient" ? cible : "etagere";
    const la = NOMS[piece.genre].la;
    const suite = { gestes: [{ g: "outil", quoi: objet, ou }], poses: ou === "recipient" ? { ...poses, pissette: false } : poses };
    if (ou === "etagere") return { ...suite, message: `${la} est rangée sur l'étagère.` };
    if (ou === "flacon") return { ...suite, message: `${la} trempe dans le flacon de solution mère.` };
    if (ou === "recipient") return { ...suite, message: `${la} est au-dessus ${laFiole}.`, conseil: "Garde le doigt sur « Vider »." };
    if (etat.becher <= 0) return { ...suite, message: `${la} est dans le bécher, mais il est vide.`, conseil: "Verse d'abord un peu de solution mère." };
    return piece.genre === "pipette"
      ? { ...suite, message: `${la} trempe dans le bécher.`, conseil: "Garde le doigt sur « Aspirer », puis laisse redescendre jusqu'au trait de jauge : regarde la loupe." }
      : { ...suite, message: `${la} est près du bécher.`, conseil: "Garde le doigt sur « Remplir » et regarde ses graduations à la loupe." };
  }
  const rangement = cible.startsWith("rangement");
  switch (objet) {
    case "flacon":
      return rangement ? { gestes: [], poses: { ...poses, flacon: false }, message: "Le flacon de solution mère est reposé." }
        : { gestes: [], poses: { ...poses, flacon: true }, message: "Le flacon est au-dessus du bécher.", conseil: "Garde le doigt sur « Verser »." };
    case "pissette":
      if (rangement) return { gestes: [], poses: { ...poses, pissette: false }, message: "La pissette est reposée." };
      return etat.bouche ? { gestes: ecarte, poses: { ...poses, pissette: true }, message: "La pissette est au-dessus de la fiole, mais la fiole est bouchée.", conseil: "Retire d'abord le bouchon." }
        : { gestes: ecarte, poses: { ...poses, pissette: true }, message: "La pissette est au-dessus du récipient.", conseil: "Garde le doigt sur « Jet » pour aller vite, sur « Goutte » pour finir." };
    case "bouchon":
      return rangement ? { gestes: [{ g: "boucher", mis: false }], poses, message: "Le bouchon est retiré." }
        : { gestes: [{ g: "boucher", mis: true }, ...ecarte], poses: { ...poses, pissette: false }, message: "La fiole est bouchée.", conseil: "Touche « Retourner » pour homogénéiser." };
    default:
      return { gestes: [], poses, message: "" };
  }
}

// ---------- le prochain geste ----------

/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasDuGuide = { cle: string; texte: string; etape: number } & (
  /** `objet` : une pièce de l'étagère par son nom (« f100 », « p20 »), ou le flacon, la pissette, le bouchon */
  | { geste: "glisser"; objet: string; cible: CibleSolutions }
  | { geste: "maintenir" | "toucher"; poussoir: PoussoirSolutions }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: BoutonSolutions }
);

/** Le prélèvement est juste à ce volume près : celui que le professeur accepte sans faute. */
const AU_TRAIT = 0.06;
/** Les volumes se comptent au centième : cette marge garde justes les comparaisons faites exactement à la limite. */
const EPS = 1e-6;
/** La pipette jaugée que le guide fait prendre : celle qui donne le volume voulu en un prélèvement, ou en plusieurs prélèvements entiers. */
export function pipetteDuGuide(r: ReglagesSolutions): number {
  const voulue = priseVoulue(r, r.fiole);
  const entiere = (c: number) => voulue / c >= 1 - 1e-9 && Math.abs(voulue / c - Math.round(voulue / c)) < 1e-9;
  return [...r.etagere.pipettes].sort((a, b) => b - a).find(entiere) ?? Math.max(...r.etagere.pipettes);
}

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève.
 */
export function prochain(r: ReglagesSolutions, etat: EtatSolutions, v: PosesSolutions): PasDuGuide {
  const E = { fiole: 0, mere: 1, prelever: 2, vider: 3, tiers: 4, completer: 5, homogeneiser: 6 };
  const fiole: Verrerie = { genre: "fiole", capacite: r.fiole };
  const pipette: Verrerie = { genre: "pipette", capacite: pipetteDuGuide(r) };
  const nomFiole = `f${fiole.capacite}`, nomPipette = `p${pipette.capacite}`;
  const voulue = priseVoulue(r, r.fiole);
  const volume = total(etat);

  const glisser = (cle: string, etape: number, texte: string, objet: string, cible: CibleSolutions): PasDuGuide => ({ cle, etape, texte, geste: "glisser", objet, cible });
  const maintenir = (cle: string, etape: number, texte: string, poussoir: PoussoirSolutions): PasDuGuide => ({ cle, etape, texte, geste: "maintenir", poussoir });
  const toucher = (cle: string, etape: number, texte: string, poussoir: PoussoirSolutions): PasDuGuide => ({ cle, etape, texte, geste: "toucher", poussoir });
  const refaire = (etape: number, pourquoi: string): PasDuGuide => ({ cle: "refaire", etape, texte: `${pourquoi} Touche « Recommencer la solution ».`, geste: "bouton", bouton: "recommencer" });

  // ----- la fiole jaugée, sur la paillasse -----
  if (etat.recipient !== nomFiole) {
    return etat.recipient === null
      ? glisser("fiole-poser", E.fiole, `Prends sur l'étagère la ${nomPiece(fiole)} et pose-la sur la paillasse.`, nomFiole, "plan")
      : glisser("fiole-changer", E.fiole, `Ce n'est pas le bon récipient. Pose à sa place la ${nomPiece(fiole)}.`, nomFiole, "plan");
  }

  // le prélèvement peut se faire en plusieurs pipettes : chacune a sa tolérance au trait de jauge
  const tolerance = AU_TRAIT * Math.max(1, Math.round(voulue / pipette.capacite)) + EPS;
  /** vrai pendant que la pipette se vide dans la fiole : ce qui a coulé n'est pas encore un prélèvement entier */
  const coule = etat.outil !== null && etat.ou === "recipient" && etat.dansOutil > 0 && etat.arrivee - etat.dansOutil > 0.005;
  const faits = Math.round(etat.prise / pipette.capacite);

  // ----- ce qui ne se rattrape qu'en recommençant la solution -----
  if (etat.parEprouvette > 0) return refaire(E.prelever, "Tu as prélevé à l'éprouvette graduée : elle n'est pas assez précise.");
  if (etat.aspireTrop) return refaire(E.prelever, "Le liquide est monté dans la poire : la pipette est à refaire, plus doucement.");
  if (etat.prise > voulue + tolerance) return refaire(E.vider, "Il y a trop de solution mère dans la fiole.");
  if (!coule && Math.abs(etat.prise - faits * pipette.capacite) > AU_TRAIT * Math.max(1, faits) + EPS) return refaire(E.vider, "Le prélèvement versé dans la fiole n'était pas ajusté au trait de jauge.");
  if (etat.eau > 0 && etat.prise < voulue - tolerance) return refaire(E.vider, "Tu as ajouté l'eau avant d'avoir versé tout le prélèvement.");
  if (volume > fiole.capacite + 0.15 + EPS) return refaire(E.completer, "Le trait de jauge est dépassé : la solution est trop diluée, et on ne peut pas retirer d'eau.");
  if (etat.auJet) return refaire(E.completer, "Tu es arrivé près du trait au jet : c'est trop risqué, la fin se fait goutte à goutte.");
  if (!etat.agite && volume > fiole.capacite * COL + 0.5) return refaire(E.tiers, "Tu as rempli la fiole sans l'agiter aux deux tiers.");

  // tant qu'il reste à verser dans la fiole, elle ne se bouche pas
  if (etat.bouche && volume < fiole.capacite - 0.15 - EPS) return glisser("deboucher", E.completer, "Retire le bouchon : il reste à verser dans la fiole.", "bouchon", "rangement-bouchon");

  // ----- le prélèvement -----
  // une pipette qui a commencé à couler se vide jusqu'au bout, même quand la fiole a déjà reçu presque tout le prélèvement
  if (coule && etat.outil === nomPipette) return maintenir("prise-vider", E.vider, "Garde le doigt sur « Vider » : toute la pipette doit couler dans la fiole.", "vider");
  if (etat.prise < voulue - tolerance) {
    const bonne = etat.outil === nomPipette;
    const dedans = bonne ? etat.dansOutil : 0;
    if (bonne && etat.ou === "recipient" && dedans > 0) {
      // une pipette ajustée au trait se vide en entier ; mal ajustée, elle retourne dans le bécher tant que rien n'a coulé
      if (Math.abs(dedans - pipette.capacite) <= AU_TRAIT + EPS) return maintenir("prise-vider", E.vider, "Garde le doigt sur « Vider » : toute la pipette doit couler dans la fiole.", "vider");
      return glisser("prise-replonger", E.prelever, "Le bas du ménisque n'est pas sur le trait de jauge : replonge la pipette dans le bécher.", nomPipette, "becher");
    }
    // de quoi remplir la pipette, dans le bécher
    if (etat.becher + dedans < pipette.capacite + 4) {
      if (!v.flacon) return glisser("mere-flacon", E.mere, "Prends le flacon de solution mère et penche-le au-dessus du bécher.", "flacon", "becher");
      return maintenir("mere-verser", E.mere, "Garde le doigt sur « Verser » : il faut de quoi remplir la pipette, et un peu plus.", "verser");
    }
    if (v.flacon) return glisser("mere-ranger", E.mere, "C'est assez. Repose le flacon de solution mère.", "flacon", "rangement-flacon");
    if (!bonne || etat.ou !== "becher") return glisser("prise-plonger", E.prelever, `Prends la ${nomPiece(pipette)} et plonge-la dans le bécher.`, nomPipette, "becher");
    const manque = pipette.capacite - dedans;
    if (manque > AU_TRAIT + EPS) return maintenir("prise-aspirer", E.prelever, "Garde le doigt sur « Aspirer » : le liquide doit monter jusqu'au trait de jauge, ou juste au-dessus. Regarde la loupe.", "aspirer");
    if (manque < -AU_TRAIT - EPS) return toucher("prise-ajuster", E.prelever, "Le liquide dépasse le trait. Touche « Vider » par petits coups : le bas du ménisque doit redescendre sur le trait.", "redescendre");
    return glisser("prise-porter", E.vider, "Le bas du ménisque est sur le trait. Porte la pipette au-dessus de la fiole.", nomPipette, "recipient");
  }
  if (etat.outil !== null) return glisser("prise-ranger", E.vider, "Le prélèvement est dans la fiole. Range la pipette sur l'étagère.", etat.outil, "etagere");
  if (v.flacon) return glisser("mere-ranger", E.vider, "Repose le flacon de solution mère.", "flacon", "rangement-flacon");

  // ----- l'eau distillée : aux deux tiers, on agite ; puis jusqu'au trait, goutte à goutte à la fin -----
  const poser = (etape: number): PasDuGuide => glisser("eau-poser", etape, "Pose la pissette d'eau distillée au-dessus de la fiole.", "pissette", "recipient");
  if (!etat.agite) {
    if (volume < 0.6 * fiole.capacite) return v.pissette ? maintenir("eau-tiers", E.tiers, "Garde le doigt sur « Jet » : remplis le corps de la fiole aux deux tiers, pas plus.", "jet") : poser(E.tiers);
    return toucher("agiter", E.tiers, "C'est assez. Touche « Agiter » : le mélange commence tant qu'il reste de la place.", "agiter");
  }
  if (volume < fiole.capacite - 0.1) {
    if (!v.pissette) return poser(E.completer);
    // le liquide entre dans la loupe à un peu plus d'un millilitre du trait : le jet s'arrête là, bien avant le dernier demi-millilitre
    if (volume < fiole.capacite - DERNIER - 0.7) return maintenir("eau-col", E.completer, "Garde le doigt sur « Jet » : le niveau monte dans le col. Lâche dès que le liquide apparaît dans la loupe.", "jet");
    return maintenir("eau-goutte", E.completer, "Le liquide est dans la loupe. Garde le doigt sur « Goutte », et lâche quand le bas du ménisque arrive sur le trait de jauge.", "goutte");
  }
  if (v.pissette) return glisser("eau-ranger", E.completer, "Le bas du ménisque est sur le trait de jauge. Repose la pissette.", "pissette", "rangement-pissette");

  // ----- homogénéiser -----
  if (!etat.bouche) return glisser("boucher", E.homogeneiser, "Bouche la fiole : pose le bouchon sur son col.", "bouchon", "recipient");
  if (!homogene(etat)) return toucher("retourner", E.homogeneiser, "Touche « Retourner » : retourne la fiole trois fois, pour que la solution soit la même en haut et en bas.", "retourner");
  return { cle: "fini", etape: E.homogeneiser, texte: "Ta solution est prête. Touche « J'ai fini » pour appeler le professeur.", geste: "bouton", bouton: "fini" };
}
