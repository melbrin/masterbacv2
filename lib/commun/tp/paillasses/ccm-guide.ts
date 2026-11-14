// Le guide de la paillasse « ccm » : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : le flacon penché, le crayon
// ou le capillaire posé sur la plaque, la règle et son curseur, la vue rapprochée, la saisie ouverte. Ici aussi, poser
// un objet : ce que ce geste donne aux règles.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/ccm-guide.test.ts).
import type { GesteBrut } from "../types";
import { DEPOT_FIN, HAUTEUR, LIGNE, SOLUTIONS, depotSur, frontActuel, hauteurDepots, taches, type Distance, type EtatCcm, type ReglagesCcm, type Solution } from "./ccm";

export type ObjetCcm = "eluant" | "couvercle" | "plaque" | "cuve" | "crayon" | "stylo" | "capillaire" | `cap-${Solution}`;
export type CibleCcm = "versoir" | "repos-eluant" | "ouverture" | "repos-couvercle" | "cuve" | "feuille" | "bidon" | "plaque" | `fiole-${Solution}` | `repere-${Solution}`;
/** Ce que l'élève touche ou garde appuyé dans la scène : les poussoirs, l'interrupteur de la lampe, les lignes du carnet. */
export type PoussoirCcm = "verser" | "tracer" | "deposer" | "attendre" | "lampe" | `carnet-${Distance}`;
export type BoutonCcm = "nouvelle" | "voir" | "reposer" | "fini";

/** Ce qui est posé : le flacon d'éluant penché sur la cuve, le crayon ou le stylo sur la plaque, un capillaire au-dessus d'un repère ; et la vue rapprochée. */
export interface PosesCcm { verse: boolean; outil: "crayon" | "stylo" | null; capillaire: { de: Solution; ou: Solution } | null; pres: boolean }
/** Ce que la vue retient en plus de l'état des règles. */
export interface VueCcm extends PosesCcm {
  /** la hauteur du curseur de la règle (ou de la pointe du crayon), depuis le bas de la plaque */
  viseur: number;
  /** la hauteur du zéro de la règle */
  zero: number;
  /** la distance en cours de saisie */
  saisie: Distance | null;
}

const estSolution = (x: string): x is Solution => x === "a" || x === "p" || x === "r";
const vingtieme = (x: number) => Math.round(x * 20) / 20;
/** L'éluant est bien versé entre ces deux hauteurs ; le front est assez monté à cette hauteur. */
const ELUANT_ASSEZ = 0.45;
const ELUANT_TROP = 0.7;
export const SORTIE = 5.6;

// ---------- poser un objet ----------

/**
 * Poser un objet sur une cible : les gestes que ça donne aux règles, ce qui est posé ensuite, et ce qui vient de se
 * passer, en une phrase. `conseil` : le geste qui suit ; la vue ne l'ajoute que guide coupé, puisque le guide le dit déjà.
 * Un geste impossible dit pourquoi. Un objet ou une cible inconnus ne changent rien.
 */
export function pose(etat: EtatCcm, poses: PosesCcm, objet: string, cible: string): { gestes: GesteBrut[]; poses: PosesCcm; message: string; conseil?: string } {
  const refus = (message: string) => ({ gestes: [], poses, message });
  switch (objet) {
    case "eluant":
      if (cible !== "versoir") return { gestes: [], poses: { ...poses, verse: false }, message: "Le flacon d'éluant est reposé." };
      if (etat.couvercle) return refus("La cuve est fermée : retire d'abord le couvercle.");
      return { gestes: [], poses: { ...poses, verse: true }, message: "Le flacon d'éluant est au-dessus de la cuve.", conseil: "Garde le doigt sur « Verser », et lis la hauteur à la loupe." };
    case "couvercle":
      if (cible === "ouverture" && poses.verse) return refus("Le flacon d'éluant est encore au-dessus de la cuve : repose-le d'abord.");
      return { gestes: [{ g: "couvercle", pose: cible === "ouverture" }], poses, message: cible === "ouverture" ? "La cuve est fermée." : "Le couvercle est sur la paillasse : la cuve est ouverte." };
    case "plaque":
      if (etat.couvercle) return refus("La cuve est fermée : retire d'abord le couvercle.");
      if (cible !== "cuve") return { gestes: [{ g: "sortir" }], poses, message: "La plaque est sortie de la cuve. Le front de l'éluant se voit encore." };
      return {
        gestes: [{ g: "plonger" }], poses: { verse: false, outil: null, capillaire: null, pres: false },
        message: etat.eluant <= 0 ? "La plaque est dans la cuve, mais il n'y a pas d'éluant." : etat.eluant >= hauteurDepots(etat) ? "La plaque est dans la cuve. La ligne de dépôt trempe dans l'éluant." : "La plaque est dans la cuve : son bas trempe dans l'éluant.",
      };
    case "cuve":
      return { gestes: [{ g: "vider" }], poses, message: "La cuve est vidée dans le bidon de récupération." };
    case "crayon":
    case "stylo":
      return { gestes: [], poses: { ...poses, outil: objet, capillaire: null }, message: `Le ${objet} est sur la plaque.`, conseil: "Glisse sa pointe à la bonne hauteur en lisant la règle à la loupe, puis touche « Tracer »." };
    case "capillaire": {
      const vers = cible.slice(6);
      return estSolution(vers) ? { gestes: [{ g: "capillaire", de: "pot", vers }], poses, message: `Un capillaire neuf trempe dans le flacon ${vers.toUpperCase()}.` } : refus("");
    }
    default: {
      // le capillaire d'un flacon : au-dessus d'un repère de la plaque, de retour dans son flacon, ou dans un autre flacon
      const de = objet.slice(4);
      if (!objet.startsWith("cap-") || !estSolution(de)) return refus("");
      const repere = cible.slice(7), flacon = cible.slice(6);
      if (cible.startsWith("repere-") && estSolution(repere)) {
        return { gestes: [], poses: { ...poses, outil: null, capillaire: { de, ou: repere } }, message: `Le capillaire du flacon ${de.toUpperCase()} est au-dessus du repère ${repere.toUpperCase()}.`, conseil: "Touche « Déposer », très brièvement." };
      }
      if (!cible.startsWith("fiole-") || !estSolution(flacon)) return refus("");
      if (flacon === de) return { gestes: [], poses: { ...poses, capillaire: null }, message: "Le capillaire est revenu dans son flacon." };
      return { gestes: [{ g: "capillaire", de, vers: flacon }], poses: { ...poses, capillaire: null }, message: `Le capillaire du flacon ${de.toUpperCase()} trempe maintenant dans le flacon ${flacon.toUpperCase()}.` };
    }
  }
}

// ---------- le prochain geste ----------

/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasCcm = { cle: string; texte: string; etape: number } & (
  | { geste: "glisser"; objet: ObjetCcm; cible: CibleCcm }
  | { geste: "maintenir" | "toucher"; poussoir: PoussoirCcm }
  /** glisser le curseur de la règle (ou la pointe du crayon), ou la règle elle-même, jusqu'à la hauteur `vers` */
  | { geste: "curseur"; quoi: "viseur" | "regle"; vers: number }
  | { geste: "montrer"; quoi: "loupe" }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: BoutonCcm }
);

/** Ce qui rend une plaque inutilisable : il faut en prendre une neuve. Null si elle peut encore servir. */
function gachee(etat: EtatCcm): string | null {
  if (etat.encre) return "La ligne est tracée au stylo : son encre partirait avec l'éluant.";
  if (etat.ligne !== null && Math.abs(etat.ligne - LIGNE) > 0.15) return "La ligne de dépôt n'est pas à 1 cm du bas de la plaque.";
  for (const ou of SOLUTIONS) {
    if (SOLUTIONS.some((s) => s !== ou && etat.depots[ou][s] > 0)) return `Le repère ${ou.toUpperCase()} a reçu une autre solution que la sienne.`;
    if (depotSur(etat, ou) > DEPOT_FIN) return `Le dépôt ${ou.toUpperCase()} est trop gros : sa tache va s'étaler.`;
  }
  if (etat.bain === null) return null;
  if (etat.dissous) return "Les dépôts ont trempé dans l'éluant : ils s'y sont dissous.";
  if (etat.bain <= 0) return "La plaque est allée dans une cuve sans éluant.";
  if (etat.ligne === null || SOLUTIONS.some((s) => depotSur(etat, s) <= 0)) return "Il manque la ligne de dépôt ou un dépôt sur cette plaque.";
  if (frontActuel(etat) >= HAUTEUR) return "Le front de l'éluant a atteint le haut de la plaque.";
  if (etat.front !== null && etat.front - hauteurDepots(etat) < 3) return "La plaque est sortie trop tôt : les taches sont mal séparées.";
  if (etat.front !== null && etat.marque === null && etat.seche) return "Le front n'a pas été marqué à temps : il a disparu en séchant.";
  return null;
}

/** De près, l'élève ne voit ni la cuve, ni le flacon d'éluant, ni les crayons. */
const LOIN: readonly string[] = ["eluant", "couvercle", "plaque", "cuve", "crayon", "stylo"];

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève.
 */
export function prochain(r: ReglagesCcm, etat: EtatCcm, v: VueCcm): PasCcm {
  const E = { cuve: 0, ligne: 1, depots: 2, plonger: 3, migrer: 4, front: 5, lampe: 6, mesurer: 7 };
  const glisser = (cle: string, etape: number, texte: string, objet: ObjetCcm, cible: CibleCcm): PasCcm => ({ cle, etape, texte, geste: "glisser", objet, cible });
  const maintenir = (cle: string, etape: number, texte: string, poussoir: PoussoirCcm): PasCcm => ({ cle, etape, texte, geste: "maintenir", poussoir });
  const toucher = (cle: string, etape: number, texte: string, poussoir: PoussoirCcm): PasCcm => ({ cle, etape, texte, geste: "toucher", poussoir });
  const curseur = (cle: string, etape: number, texte: string, quoi: "viseur" | "regle", vers: number): PasCcm => ({ cle, etape, texte, geste: "curseur", quoi, vers });
  const bouton = (cle: string, etape: number, texte: string, quel: BoutonCcm): PasCcm => ({ cle, etape, texte, geste: "bouton", bouton: quel });
  const depart = hauteurDepots(etat);

  /** Le premier geste qui manque. */
  const pas = (): PasCcm => {
    if (v.saisie) return { cle: "lire", etape: E.mesurer, texte: "Lis dans la loupe la graduation en face du curseur. Écris-la avec les chiffres, puis touche « Noter ».", geste: "montrer", quoi: "loupe" };
    // ----- une plaque gâchée ne se rattrape pas : on en prend une neuve -----
    const raison = gachee(etat);
    if (raison) return v.outil ? bouton("gachee-reposer", E.ligne, `${raison} Repose d'abord le ${v.outil}.`, "reposer") : bouton("nouvelle", E.ligne, `${raison} Touche « Nouvelle plaque ».`, "nouvelle");

    if (etat.bain === null) {
      // ----- l'éluant, sur un demi-centimètre, puis la cuve fermée -----
      if (etat.eluant > ELUANT_TROP) {
        if (v.verse) return glisser("cuve-reposer", E.cuve, "Il y a trop d'éluant. Repose le flacon.", "eluant", "repos-eluant");
        if (etat.couvercle) return glisser("cuve-rouvrir", E.cuve, "Il y a trop d'éluant : ouvre la cuve.", "couvercle", "repos-couvercle");
        return glisser("cuve-vider", E.cuve, "Il y a trop d'éluant : porte la cuve au bidon de récupération pour la vider.", "cuve", "bidon");
      }
      if (etat.eluant < ELUANT_ASSEZ) {
        if (etat.couvercle) return glisser("cuve-ouvrir", E.cuve, "Ouvre la cuve : pose son couvercle sur la paillasse.", "couvercle", "repos-couvercle");
        if (!v.verse) return glisser("eluant-poser", E.cuve, "Prends le flacon d'éluant et penche-le au-dessus de la cuve.", "eluant", "versoir");
        return maintenir("eluant-verser", E.cuve, "Garde le doigt sur « Verser » : l'éluant doit monter à un demi-centimètre. Regarde la loupe.", "verser");
      }
      if (v.verse) return glisser("eluant-ranger", E.cuve, "C'est assez. Repose le flacon d'éluant.", "eluant", "repos-eluant");
      if (!etat.saturee) return glisser("cuve-fermer", E.cuve, "Ferme la cuve : son air se charge de vapeurs d'éluant.", "couvercle", "ouverture");
      // ----- la ligne de dépôt, au crayon, à 1 cm du bas -----
      if (etat.ligne === null) {
        if (v.outil === "stylo") return bouton("ligne-stylo", E.ligne, "Repose le stylo : la ligne de dépôt se trace au crayon à papier.", "reposer");
        if (v.outil !== "crayon") return glisser("ligne-crayon", E.ligne, "Prends le crayon à papier et pose-le sur la plaque.", "crayon", "plaque");
        if (Math.abs(v.zero) > 0.02) return curseur("ligne-regle", E.ligne, "Glisse la règle : son zéro doit être au bas de la plaque.", "regle", 0);
        if (Math.abs(v.viseur - LIGNE) > 0.02) return curseur("ligne-viser", E.ligne, "Glisse la pointe du crayon à 1 cm du bas de la plaque. Vérifie dans la loupe.", "viseur", LIGNE);
        return toucher("ligne-tracer", E.ligne, "Touche « Tracer » : la ligne de dépôt se dessine.", "tracer");
      }
      if (v.outil) return bouton("ligne-reposer", E.ligne, `Repose le ${v.outil}.`, "reposer");
      // ----- les trois dépôts : un capillaire neuf par flacon, un contact très bref -----
      for (const s of SOLUTIONS) {
        if (etat.depots[s][s] >= 1) continue;
        const S = s.toUpperCase();
        const porte = etat.capillaires[s];
        if (porte === null) return glisser(`depot-${s}-capillaire`, E.depots, `Trempe un capillaire neuf dans le flacon ${S}.`, "capillaire", `fiole-${s}`);
        if (porte.length > 1) return glisser(`depot-${s}-remplacer`, E.depots, `Le capillaire du flacon ${S} a trempé dans un autre flacon : remplace-le par un neuf.`, "capillaire", `fiole-${s}`);
        if (v.capillaire?.de !== s || v.capillaire.ou !== s) return glisser(`depot-${s}-porter`, E.depots, `Porte le capillaire du flacon ${S} au-dessus du repère ${S} de la plaque.`, `cap-${s}`, `repere-${s}`);
        return toucher(`depot-${s}-toucher`, E.depots, "Touche « Déposer », très brièvement : le dépôt doit rester petit.", "deposer");
      }
      if (v.capillaire) return glisser("depot-ranger", E.depots, "Les trois dépôts sont faits. Remets le capillaire dans son flacon.", `cap-${v.capillaire.de}`, `fiole-${v.capillaire.de}`);
      // ----- la plaque dans la cuve -----
      if (etat.couvercle) return glisser("plonger-ouvrir", E.plonger, "Ouvre la cuve.", "couvercle", "repos-couvercle");
      return glisser("plonger", E.plonger, "Glisse la plaque dans la cuve : la ligne de dépôt reste au-dessus de l'éluant.", "plaque", "cuve");
    }

    if (etat.dansCuve) {
      // ----- la migration : cuve fermée, jusqu'à 1 cm du haut -----
      if (frontActuel(etat) < SORTIE) {
        if (!etat.couvercle) return glisser("migrer-fermer", E.plonger, "Referme la cuve.", "couvercle", "ouverture");
        return maintenir("migrer", E.migrer, "Garde le doigt sur « Attendre » : le front de l'éluant monte. Lâche quand il arrive à 1 cm du haut de la plaque.", "attendre");
      }
      if (etat.couvercle) return glisser("sortir-ouvrir", E.migrer, "Le front est assez haut : ouvre la cuve.", "couvercle", "repos-couvercle");
      return glisser("sortir", E.migrer, "Sors la plaque : repose-la sur la feuille, sous la lampe.", "plaque", "feuille");
    }

    // ----- le front, marqué tout de suite -----
    const front = etat.front ?? 0;
    if (etat.marque === null || (Math.abs(etat.marque - front) > 0.15 && !etat.seche)) {
      if (!v.outil) return glisser("front-crayon", E.front, "Marque le front tout de suite : pose le crayon sur la plaque.", "crayon", "plaque");
      if (Math.abs(v.viseur - vingtieme(front)) > 0.02) return curseur("front-viser", E.front, "Glisse la pointe du crayon sur le front de l'éluant : la limite de la zone mouillée.", "viseur", vingtieme(front));
      return toucher("front-tracer", E.front, "Touche « Tracer » pour marquer le front.", "tracer");
    }
    if (v.outil) return bouton("front-reposer", E.front, `Repose le ${v.outil}.`, "reposer");
    // ----- la révélation -----
    if (!etat.uv) return toucher("lampe", E.lampe, "Allume la lampe UV : touche son interrupteur. Les taches vont apparaître.", "lampe");
    // ----- les distances : le zéro de la règle sur la ligne de dépôt, le curseur sur le trait du front puis sur chaque tache -----
    if (v.capillaire) return glisser("mesurer-ranger", E.mesurer, "Remets le capillaire dans son flacon.", `cap-${v.capillaire.de}`, `fiole-${v.capillaire.de}`);
    if (!v.pres) return bouton("mesurer-voir", E.mesurer, "Touche « Voir la plaque de près » pour mesurer.", "voir");
    if (Math.abs(v.zero - depart) > 0.02) return curseur("mesurer-zero", E.mesurer, "Glisse la règle : son zéro doit être sur la ligne de dépôt.", "regle", depart);
    const visibles = taches(r, etat);
    const viser: { quoi: Distance; h: number | undefined; ou: string; nom: string }[] = [
      { quoi: "front", h: etat.marque ?? front, ou: "sur le trait du front", nom: "front" },
      { quoi: "a", h: visibles.a.find((t) => t.espece === "reactif")?.h, ou: "au centre de la tache du dépôt A", nom: "tache A" },
      { quoi: "r", h: visibles.r.find((t) => t.espece === "produit")?.h, ou: "au centre de la tache du dépôt R", nom: "tache R" },
    ];
    for (const { quoi, h, ou, nom } of viser) {
      const note = etat.notes[quoi];
      if (h === undefined || (note !== null && Math.abs(note - (h - depart)) <= 0.12)) continue;
      if (Math.abs(v.viseur - vingtieme(h)) > 0.02) return curseur(`mesurer-${quoi}-viser`, E.mesurer, `Glisse le curseur de la règle ${ou}.`, "viseur", vingtieme(h));
      return toucher(`mesurer-${quoi}-noter`, E.mesurer, `Lis la graduation dans la loupe, puis touche « ${nom} » dans le carnet pour la noter.`, `carnet-${quoi}`);
    }
    return bouton("fini", E.mesurer, "Tout est noté. Touche « J'ai fini » pour appeler le professeur.", "fini");
  };

  const p = pas();
  // de près, la cuve et les crayons sont hors de vue : le guide fait d'abord ranger ce qui est posé, puis reculer
  const loin = p.geste === "glisser" ? LOIN.includes(p.objet) : (p.geste === "maintenir" || p.geste === "toucher") && (p.poussoir === "verser" || p.poussoir === "attendre");
  if (!loin) return p;
  if (v.capillaire) return glisser("ranger-capillaire", p.etape, "Remets d'abord le capillaire dans son flacon.", `cap-${v.capillaire.de}`, `fiole-${v.capillaire.de}`);
  if (v.outil && !(p.geste === "glisser" && p.cible === "plaque")) return bouton("ranger-outil", p.etape, `Repose d'abord le ${v.outil}.`, "reposer");
  if (v.pres && !v.outil) return bouton("voir-tout", p.etape, "Touche « Voir toute la paillasse ».", "voir");
  return p;
}
