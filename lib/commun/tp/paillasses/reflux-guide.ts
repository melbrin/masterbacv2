// Le guide de la paillasse « reflux » : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : le poste où se tient
// l'élève, le flacon d'acide penché, le compte-gouttes posé, le robinet de l'ampoule, la saisie ouverte. Ici aussi,
// poser un objet ou monter une pièce : ce que ce geste donne aux règles, et ce qu'il faut dire quand il est refusé.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/reflux-guide.test.ts).
import { nombre } from "@/lib/commun/format";
import type { GesteBrut } from "../types";
import { HAUT, LAVAGES, PROTECTIONS, REFROIDI, affichage, decante, phases, regles, type EtatReflux, type Piece, type Protection, type ReglagesReflux } from "./reflux";

/** L'ouverture du robinet de l'ampoule, de 0 (fermé) à 1 (grand ouvert). Jusqu'à ce seuil, elle coule goutte à goutte ; au-delà, au filet. */
export const AU_FILET = 0.35;
/** Le volume d'une goutte de l'ampoule, le temps entre deux gouttes (en secondes), et le débit du filet (en mL par seconde). */
export const GOUTTE = 0.2;
export const entreGouttes = (ouverture: number): number => 0.9 - ((Math.min(ouverture, AU_FILET) - 0.05) / (AU_FILET - 0.05)) * 0.7;
export const debitFilet = (ouverture: number): number => 0.8 + ((ouverture - AU_FILET) / (1 - AU_FILET)) * 5.2;

export type Poste = 1 | 2 | 3;
export type ObjetReflux = Protection | "acide" | "eprouvette" | "sulfurique" | "ponce" | "pipette" | "support" | "chauffe" | "pince-1" | "pince-2" | "pinceb" | "pincer" | "refrigerant" | "ballon" | "bouchon" | "poubelle" | "becher";
export type CibleReflux = "toi" | "tube" | "flacon-acide" | "alcool" | "col" | "repos-pipette" | "repos-sulfurique"
  | "socle" | "plateau" | "noix-b" | "noix-r" | "place-ballon" | "col-ballon" | "ratelier" | "repos-refrigerant" | "repos-chauffe" | "repos-support" | "valet"
  | "entonnoir" | "repos-bouchon" | "sous" | "repos-poubelle" | "balance" | "repos-becher";
export type PoussoirReflux = "mesurer" | "goutte" | "aspirer" | "redescendre" | "vider" | "attendre" | "agiter" | "degazer" | "tare";
export type MoletteReflux = "thermostat" | "eau" | "support" | "robinet";
export type BorneReflux = "robinet" | "evier" | "bas" | "haut";
export type BoutonReflux = "poste-1" | "poste-2" | "poste-3" | "noter" | "fini";

/** Ce qui est posé au poste de préparation : le flacon d'acide penché sur l'éprouvette, le compte-gouttes au-dessus du ballon. */
export interface PosesReflux { verse: boolean; compte: boolean }
/** Ce que la vue retient en plus de l'état des règles. */
export interface VueReflux extends PosesReflux {
  poste: Poste;
  /** l'ouverture du robinet de l'ampoule, de 0 à 1 */
  robinet: number;
  /** la saisie de la masse est ouverte */
  saisie: boolean;
}

/** Le nombre de gouttes de catalyseur demandé, et la prise d'alcool juste à ce volume près. */
export const GOUTTES = 5;
const AU_TRAIT = 0.06;
/** En dessous de ce volume de phase aqueuse, on finit goutte à goutte. */
const LENT = 5;

// ---------- poser un objet, monter une pièce ----------

/**
 * Poser un objet sur une cible : les gestes que ça donne aux règles, ce qui est posé ensuite, et ce qui vient de se
 * passer, en une phrase. `conseil` : le geste qui suit ; la vue ne l'ajoute que guide coupé, puisque le guide le dit déjà.
 * Un geste refusé dit pourquoi. Un objet ou une cible inconnus ne changent rien.
 */
export function pose(r: ReglagesReflux, etat: EtatReflux, poses: PosesReflux, objet: string, cible: string): { gestes: GesteBrut[]; poses: PosesReflux; message: string; conseil?: string } {
  /** un geste, sa phrase s'il change quelque chose, sa phrase s'il est refusé */
  const tente = (g: GesteBrut, dit: string, refus: string, suite: PosesReflux = poses) => (regles.geste(r, etat, g) !== etat ? { gestes: [g], poses: suite, message: dit } : { gestes: [], poses, message: refus });
  const placer = (quoi: Piece, dit: string, refus: string) => tente({ g: "placer", quoi }, dit, refus);
  const retirer = (quoi: Piece, dit: string, refus: string) => tente({ g: "retirer", quoi }, dit, refus);
  switch (objet) {
    // ----- la préparation -----
    case "blouse": return tente({ g: "equiper", quoi: objet, porte: true }, "Tu portes la blouse, fermée.", "Tu portes déjà la blouse.");
    case "lunettes": return tente({ g: "equiper", quoi: objet, porte: true }, "Tu portes les lunettes de protection.", "Tu portes déjà les lunettes.");
    case "gants": return tente({ g: "equiper", quoi: objet, porte: true }, "Tu portes les gants.", "Tu portes déjà les gants.");
    case "acide":
      return { gestes: [], poses: { ...poses, verse: cible === "tube" }, message: cible === "tube" ? "Le flacon d'acide éthanoïque est au-dessus de l'éprouvette." : "Le flacon d'acide éthanoïque est reposé.", conseil: cible === "tube" ? "Garde le doigt sur « Verser », et lis le niveau à la loupe." : undefined };
    case "eprouvette":
      if (cible === "col") return tente({ g: "verser", vers: "ballon" }, "Tu vides l'éprouvette dans le ballon.", "L'éprouvette est vide.");
      return tente({ g: "verser", vers: "flacon" }, "Tu reverses le contenu de l'éprouvette dans le flacon.", "L'éprouvette est vide.");
    case "sulfurique":
      return { gestes: cible === "col" && etat.pipette === "ballon" ? [{ g: "pipette", ou: "repos" }] : [], poses: { ...poses, compte: cible === "col" }, message: cible === "col" ? "Le compte-gouttes d'acide sulfurique est au-dessus du ballon." : "Le flacon d'acide sulfurique est reposé.", conseil: cible === "col" ? "Touche « Goutte »." : undefined };
    case "ponce": return tente({ g: "ponce" }, "Quelques grains de pierre ponce tombent dans le ballon.", "Le ballon n'attend plus de pierre ponce : il en a assez, ou il a déjà chauffé.");
    case "pipette": {
      const ou = cible === "alcool" ? "flacon" : cible === "col" ? "ballon" : "repos";
      return {
        gestes: [{ g: "pipette", ou }], poses: ou === "ballon" ? { ...poses, compte: false } : poses,
        message: ou === "flacon" ? "La pipette trempe dans l'alcool benzylique." : ou === "ballon" ? "La pipette est au-dessus du ballon." : "La pipette est reposée.",
        conseil: ou === "flacon" ? "Garde le doigt sur « Aspirer », puis ajuste le bas du ménisque sur le trait de jauge : regarde la loupe." : ou === "ballon" ? "Garde le doigt sur « Vider »." : undefined,
      };
    }
    // ----- le montage -----
    case "support":
      return cible === "socle" ? placer("support", "Le support élévateur est au pied de la potence.", "Le support élévateur est déjà en place.") : retirer("support", "Le support élévateur est rangé.", "Le chauffe-ballon est posé dessus : retire-le d'abord.");
    case "chauffe":
      return cible === "plateau" ? placer("chauffe", "Le chauffe-ballon est sur le support élévateur.", "Il faut d'abord le support élévateur : le chauffe-ballon se pose dessus.") : retirer("chauffe", "Le chauffe-ballon est rangé.", "Le ballon repose dans le chauffe-ballon : rien d'autre ne le tient.");
    case "pince-1":
    case "pince-2":
      return cible === "noix-b" ? placer("pinceb", "Une pince est fixée sur la potence, à la hauteur du col du ballon.", "Il y a déjà une pince à cet endroit.") : placer("pincer", "Une pince est fixée sur la potence, à la hauteur du réfrigérant.", "Il y a déjà une pince à cet endroit.");
    case "pinceb":
    case "pincer":
      return retirer(objet, "La pince est rangée.", "Cette pince est seule à tenir le ballon : remonte d'abord le chauffe-ballon.");
    case "refrigerant":
      return cible === "col-ballon" ? placer("refrigerant", "Le réfrigérant à boules est emboîté sur le col du ballon.", "Il faut d'abord le ballon : le réfrigérant s'emboîte sur son col.") : retirer("refrigerant", "Le réfrigérant est rangé, et ses tuyaux sont débranchés.", "Le réfrigérant est déjà rangé.");
    case "ballon":
      if (cible === "place-ballon") return tente({ g: "ballon", ou: "montage" }, etat.pieces.pinceb ? "Le ballon est tenu par sa pince, au-dessus du chauffe-ballon." : "Le ballon repose dans le chauffe-ballon : aucune pince ne le tient.", "Rien ne peut tenir le ballon ici : il lui faut une pince, ou le chauffe-ballon monté jusqu'à lui.");
      if (cible === "valet") return tente({ g: "ballon", ou: "valet" }, "Le ballon est sur son valet.", "Le réfrigérant pèse sur le col du ballon, et aucune pince ne le tient : retire-le d'abord.");
      return tente({ g: "transvaser" }, "Tu verses le contenu du ballon dans l'ampoule à décanter.", etat.bouchon ? "L'ampoule est bouchée : retire le bouchon pour y verser le mélange." : "Le ballon est vide.");
    // ----- la séparation -----
    case "bouchon": return { gestes: [{ g: "bouchon", pose: cible === "entonnoir" }], poses, message: cible === "entonnoir" ? "L'ampoule est bouchée." : "Le bouchon est retiré." };
    case "poubelle": return { gestes: [{ g: "poubelle", sous: cible === "sous" }], poses, message: cible === "sous" ? "Le bécher poubelle est sous l'ampoule." : "Le bécher poubelle est revenu sur la paillasse." };
    case "becher": return { gestes: [{ g: "becher", ou: cible === "sous" ? "sous" : cible === "balance" ? "balance" : "paillasse" }], poses, message: cible === "sous" ? "Le bécher du produit est sous l'ampoule." : cible === "balance" ? "Le bécher est sur la balance." : "Le bécher est rangé sur l'étagère." };
    default: return { gestes: [], poses, message: "" };
  }
}

// ---------- le prochain geste ----------

/** Un pas du guide : la phrase, le geste à montrer, et le poste où il se fait. `etape` : le rang de l'étape du protocole en cours. */
export type PasReflux = { cle: string; texte: string; etape: number; poste: Poste } & (
  | { geste: "glisser"; objet: ObjetReflux; cible: CibleReflux }
  | { geste: "maintenir" | "toucher"; poussoir: PoussoirReflux }
  /** tourner une molette jusqu'à la valeur `vers` : le thermostat (0 à 6), le robinet d'eau (0 à 3), le support (0 à 3), le robinet de l'ampoule (0 à 1) */
  | { geste: "tourner"; molette: MoletteReflux; vers: number }
  /** tirer un tuyau d'un bout à l'autre ; ou toucher un tuyau mal branché, puis sa croix, pour le retirer */
  | { geste: "tirer"; de: BorneReflux; vers: BorneReflux }
  | { geste: "tuyau"; a: string; b: string }
  | { geste: "montrer"; quoi: "balance" | "ampoule" }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: BoutonReflux }
);

const EQUIPER: Record<Protection, string> = { blouse: "Mets la blouse : glisse-la sur toi.", lunettes: "Mets les lunettes de protection.", gants: "Enfile les gants." };
/** Ce que le guide dit pour changer de poste : vers la préparation, vers le montage (depuis la préparation, depuis la séparation), vers la séparation. */
const ALLER = { 1: "Reviens à la préparation : touche « Retour à la préparation ».", avance: "Passe au poste du montage : touche « Aller au montage ».", recule: "Reviens au montage : touche « Retour au montage ».", 3: "Passe au poste de séparation : touche « Aller à la séparation »." };

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève.
 */
export function prochain(r: ReglagesReflux, etat: EtatReflux, v: VueReflux): PasReflux {
  const E = { equiper: 0, alcool: 1, acide: 2, ajouts: 3, montage: 4, refrigerant: 5, eau: 6, chauffer: 7, refroidir: 8, transvaser: 9, laver: 10, aqueuse: 11, peser: 12 };
  const glisser = (cle: string, etape: number, poste: Poste, texte: string, objet: ObjetReflux, cible: CibleReflux): PasReflux => ({ cle, etape, poste, texte, geste: "glisser", objet, cible });
  const maintenir = (cle: string, etape: number, poste: Poste, texte: string, poussoir: PoussoirReflux): PasReflux => ({ cle, etape, poste, texte, geste: "maintenir", poussoir });
  const toucher = (cle: string, etape: number, poste: Poste, texte: string, poussoir: PoussoirReflux): PasReflux => ({ cle, etape, poste, texte, geste: "toucher", poussoir });
  const tourner = (cle: string, etape: number, poste: Poste, texte: string, molette: MoletteReflux, vers: number): PasReflux => ({ cle, etape, poste, texte, geste: "tourner", molette, vers });
  const bouton = (cle: string, etape: number, poste: Poste, texte: string, quel: BoutonReflux): PasReflux => ({ cle, etape, poste, texte, geste: "bouton", bouton: quel });
  const p3 = v.poste === 3 ? 3 : 2;
  const chauffe = etat.ebullition > 0 || etat.tiede > 0;
  const relie = (a: string, b: string) => etat.tuyaux.some(([u, w]) => (u === a && w === b) || (u === b && w === a));

  /** Le premier geste qui manque. */
  const pas = (): PasReflux => {
    if (v.saisie) return { cle: "lire-masse", etape: E.peser, poste: 3, texte: "Lis la masse sur l'afficheur de la balance. Écris-la avec les chiffres, puis touche « Noter ».", geste: "montrer", quoi: "balance" };
    // ----- s'équiper, avant de toucher au premier flacon -----
    for (const p of PROTECTIONS) if (!etat.porte[p]) return glisser(`equiper-${p}`, E.equiper, 1, EQUIPER[p], p, "toi");

    // ----- remplir le ballon, sur son valet : l'alcool, l'acide, la pierre ponce, le catalyseur -----
    const cible = r.Vc - etat.acide;
    const rempli = etat.alcool >= r.Va - AU_TRAIT && etat.acide >= 0.9 * r.Vc && etat.ponce > 0 && etat.gouttes >= GOUTTES;
    if (!etat.ampoule && !chauffe && !rempli) {
      if (etat.ballon !== "valet") {
        if (etat.pieces.refrigerant && !etat.pieces.pincer) return glisser("retour-refrigerant", E.alcool, 2, "Le ballon n'est pas prêt. Retire d'abord le réfrigérant.", "refrigerant", "repos-refrigerant");
        return glisser("retour-ballon", E.alcool, 2, "Le ballon n'est pas prêt : repose-le sur son valet, pour finir de le remplir.", "ballon", "valet");
      }
      if (etat.alcool < r.Va - AU_TRAIT) {
        // ce qu'il manque dans la pipette pour arriver au trait de jauge : négatif si le liquide le dépasse
        const manque = r.Va - etat.alcool - etat.dansPipette;
        const vidage = etat.pipette === "ballon" && etat.dansPipette > 0;
        if (etat.pipette === "flacon") {
          if (manque > AU_TRAIT) return maintenir("alcool-aspirer", E.alcool, 1, "Garde le doigt sur « Aspirer » : le liquide doit monter jusqu'au trait de jauge, ou juste au-dessus. Regarde la loupe.", "aspirer");
          if (manque < -AU_TRAIT) return toucher("alcool-ajuster", E.alcool, 1, "Le liquide dépasse le trait. Touche « Vider » par petits coups : le bas du ménisque doit redescendre sur le trait.", "redescendre");
          return glisser("alcool-porter", E.alcool, 1, "Le bas du ménisque est sur le trait. Porte la pipette au-dessus du ballon.", "pipette", "col");
        }
        if (Math.abs(manque) > AU_TRAIT && !(vidage && etat.alcool > 0)) {
          return glisser("alcool-plonger", E.alcool, 1, etat.dansPipette > 0 ? "Le ménisque n'est pas sur le trait : replonge la pipette dans le bécher d'alcool benzylique." : "Prends la pipette jaugée et plonge-la dans le bécher d'alcool benzylique.", "pipette", "alcool");
        }
        if (etat.pipette === "repos") return glisser("alcool-porter", E.alcool, 1, "Porte la pipette au-dessus du ballon.", "pipette", "col");
        return maintenir("alcool-vider", E.alcool, 1, "Garde le doigt sur « Vider » : toute la prise doit couler dans le ballon.", "vider");
      }
      if (etat.pipette !== "repos") return glisser("alcool-ranger", E.alcool, 1, "Repose la pipette.", "pipette", "repos-pipette");
      if (etat.acide < 0.9 * r.Vc) {
        if (etat.eprouvette > cible + 0.8) {
          if (v.verse) return glisser("acide-reposer", E.acide, 1, "Il y a trop d'acide dans l'éprouvette. Repose le flacon.", "acide", "flacon-acide");
          return glisser("acide-reverser", E.acide, 1, "Il y a trop d'acide dans l'éprouvette : reverse-la dans le flacon, et recommence.", "eprouvette", "flacon-acide");
        }
        if (etat.eprouvette < cible - 0.4) {
          if (!v.verse) return glisser("acide-poser", E.acide, 1, "Prends le flacon d'acide éthanoïque et penche-le au-dessus de l'éprouvette.", "acide", "tube");
          return maintenir("acide-verser", E.acide, 1, `Garde le doigt sur « Verser » : l'acide doit monter jusqu'à la graduation ${nombre(cible, 0)}. Regarde la loupe.`, "mesurer");
        }
        if (v.verse) return glisser("acide-ranger", E.acide, 1, "C'est assez. Repose le flacon d'acide.", "acide", "flacon-acide");
        return glisser("acide-ballon", E.acide, 1, "Vide l'éprouvette dans le ballon : glisse-la sur son col.", "eprouvette", "col");
      }
      if (v.verse) return glisser("acide-ranger", E.acide, 1, "Repose le flacon d'acide.", "acide", "flacon-acide");
      if (etat.ponce === 0) return glisser("ponce", E.ajouts, 1, "Ajoute la pierre ponce : glisse son pot sur le col du ballon.", "ponce", "col");
      if (!v.compte) return glisser("gouttes-poser", E.ajouts, 1, "Pose le compte-gouttes d'acide sulfurique au-dessus du ballon.", "sulfurique", "col");
      return toucher("gouttes", E.ajouts, 1, `Touche « Goutte » : mets ${GOUTTES} gouttes d'acide sulfurique.`, "goutte");
    }
    if (v.compte) return glisser("gouttes-ranger", E.ajouts, 1, "Repose le flacon d'acide sulfurique.", "sulfurique", "repos-sulfurique");

    if (!etat.ampoule && etat.ebullition < r.duree) {
      // ----- le montage, de bas en haut -----
      if (!etat.pieces.support) return glisser("support", E.montage, 2, "Pose le support élévateur au pied de la potence.", "support", "socle");
      if (!etat.pieces.chauffe) return glisser("chauffe", E.montage, 2, "Pose le chauffe-ballon sur le support élévateur.", "chauffe", "plateau");
      if (!etat.pieces.pinceb) return glisser("pince-ballon", E.montage, 2, "Fixe une pince sur la potence, à la hauteur du col du ballon.", "pince-1", "noix-b");
      if (etat.ballon === "valet") return glisser("ballon", E.montage, 2, "Place le ballon dans sa pince, au-dessus du chauffe-ballon.", "ballon", "place-ballon");
      if (etat.hauteur < HAUT) return tourner("monter", E.montage, 2, "Tourne la molette du support élévateur : le chauffe-ballon doit monter jusqu'au ballon.", "support", HAUT);
      if (!etat.pieces.refrigerant) return glisser("refrigerant", E.refrigerant, 2, "Emboîte le réfrigérant à boules sur le col du ballon.", "refrigerant", "col-ballon");
      if (!etat.pieces.pincer) return glisser("pince-refrigerant", E.refrigerant, 2, "Fixe la seconde pince sur la potence, pour tenir le réfrigérant.", "pince-1", "noix-r");
      // ----- l'eau : elle entre par le bas, sort par le haut -----
      const faux = etat.tuyaux.find(([a, b]) => !((a === "robinet" && b === "bas") || (a === "bas" && b === "robinet") || (a === "haut" && b === "evier") || (a === "evier" && b === "haut")));
      if (faux) return { cle: `tuyau-retirer-${faux[0]}-${faux[1]}`, etape: E.eau, poste: 2, texte: "Ce tuyau est mal branché : touche-le, puis touche sa croix rouge pour le retirer.", geste: "tuyau", a: faux[0], b: faux[1] };
      if (!relie("robinet", "bas")) return { cle: "tuyau-arrivee", etape: E.eau, poste: 2, texte: "Tire un tuyau du robinet d'eau jusqu'à la tubulure du bas du réfrigérant : l'eau entre par le bas.", geste: "tirer", de: "robinet", vers: "bas" };
      if (!relie("haut", "evier")) return { cle: "tuyau-sortie", etape: E.eau, poste: 2, texte: "Tire un tuyau de la tubulure du haut jusqu'à l'évier : l'eau ressort par le haut.", geste: "tirer", de: "haut", vers: "evier" };
      if (etat.eau === 0) return tourner("eau-ouvrir", E.eau, 2, "Ouvre le robinet d'eau : tourne sa molette d'un cran.", "eau", 1);
      // ----- le chauffage à reflux -----
      if (etat.thermostat < 3) return tourner("chauffer", E.chauffer, 2, "Tourne le thermostat jusqu'à 4 : le mélange doit bouillir doucement.", "thermostat", 4);
      if (etat.thermostat > 4) return tourner("chauffer-moins", E.chauffer, 2, "Le mélange bout trop fort : ramène le thermostat sur 4.", "thermostat", 4);
      return maintenir("reflux", E.chauffer, 2, `Garde le doigt sur « Attendre » : le mélange chauffe à reflux. Lâche quand il a bouilli ${nombre(r.duree, 0)} min.`, "attendre");
    }

    if (!etat.ampoule) {
      // ----- arrêter, descendre le support, laisser refroidir, porter le ballon à la séparation -----
      if (etat.thermostat > 0) return tourner("couper", E.refroidir, 2, "Le temps est écoulé : coupe le chauffage, thermostat sur 0.", "thermostat", 0);
      if (etat.ballon === "montage") {
        if (etat.hauteur > 0) return tourner("descendre", E.refroidir, 2, "Descends le support élévateur : le chauffe-ballon s'écarte du ballon.", "support", 0);
        if (etat.froid < REFROIDI) return maintenir("refroidir", E.refroidir, 2, "Garde le doigt sur « Attendre » : laisse refroidir le ballon cinq minutes.", "attendre");
        if (etat.eau > 0) return tourner("eau-fermer", E.refroidir, 2, "Ferme le robinet d'eau.", "eau", 0);
        if (etat.pieces.refrigerant && !etat.pieces.pincer) return glisser("demonter-refrigerant", E.transvaser, 2, "Retire le réfrigérant : aucune pince ne le tient.", "refrigerant", "repos-refrigerant");
        return glisser("demonter", E.transvaser, 2, "Sors le ballon du montage : pose-le sur son valet.", "ballon", "valet");
      }
      if (etat.froid < REFROIDI) return maintenir("refroidir", E.refroidir, p3, "Garde le doigt sur « Attendre » : laisse refroidir le ballon cinq minutes.", "attendre");
      if (etat.bouchon) return glisser("ampoule-ouvrir", E.transvaser, 3, "Retire le bouchon de l'ampoule.", "bouchon", "repos-bouchon");
      return glisser("transvaser", E.transvaser, 3, "Verse le contenu du ballon dans l'ampoule à décanter : glisse-le sur son col.", "ballon", "entonnoir");
    }

    // ----- le lavage : boucher, agiter trois fois en dégazant, laisser reposer, déboucher -----
    const reste = phases(etat);
    if (etat.ecoule === 0) {
      if (etat.agite < LAVAGES || etat.pression > 0) {
        if (!etat.bouchon) return glisser("boucher", E.laver, 3, "Bouche l'ampoule.", "bouchon", "entonnoir");
        if (etat.pression > 0) return toucher(`degazer-${etat.agite}`, E.laver, 3, "Touche « Dégazer » : l'ampoule se retourne, son robinet s'ouvre un instant, la pression retombe.", "degazer");
        return toucher(`agiter-${etat.agite}`, E.laver, 3, "Touche « Agiter » : les deux phases se mélangent.", "agiter");
      }
      if (!decante(etat)) return maintenir("reposer", E.laver, 3, "Garde le doigt sur « Attendre » : laisse reposer l'ampoule trois minutes. Les deux phases se séparent.", "attendre");
    }
    if (etat.bouchon) return glisser("deboucher", E.laver, 3, "Retire le bouchon : sans air, rien ne coulerait.", "bouchon", "repos-bouchon");
    // ----- la phase aqueuse, en bas : au filet, puis goutte à goutte jusqu'à la limite -----
    if (reste.aqueux > 0.05) {
      if (!etat.poubelle) return glisser("poubelle", E.aqueuse, 3, "Glisse le bécher poubelle sous l'ampoule.", "poubelle", "sous");
      if (reste.aqueux > LENT) {
        if (v.robinet <= AU_FILET) return tourner("aqueuse-filet", E.aqueuse, 3, "Ouvre le robinet de l'ampoule au filet : la phase aqueuse, en bas, part dans le bécher poubelle.", "robinet", 0.5);
        return { cle: "aqueuse-couler", etape: E.aqueuse, poste: 3, texte: "Laisse couler, et surveille la limite entre les deux phases : elle descend.", geste: "montrer", quoi: "ampoule" };
      }
      if (v.robinet > AU_FILET) return tourner("aqueuse-ralentir", E.aqueuse, 3, "La limite approche du robinet : referme-le presque, pour finir goutte à goutte.", "robinet", 0.3);
      if (v.robinet === 0) return tourner("aqueuse-goutte", E.aqueuse, 3, "Rouvre à peine le robinet : goutte à goutte, jusqu'à la limite entre les deux phases.", "robinet", 0.3);
      return { cle: "aqueuse-guetter", etape: E.aqueuse, poste: 3, texte: "Goutte à goutte. Dès que la limite entre les deux phases arrive au robinet, ferme-le.", geste: "montrer", quoi: "ampoule" };
    }
    // ----- la pesée : la tare, la phase organique dans le bécher, la masse -----
    if (reste.organique > 0.05) {
      if (v.robinet > 0 && etat.becher !== "sous") return tourner("limite", E.aqueuse, 3, "La limite est au robinet : ferme-le.", "robinet", 0);
      if (etat.recolteOrg + etat.recolteAq <= 0 && etat.tare !== r.becher) {
        if (etat.becher !== "balance") return glisser("tare-poser", E.peser, 3, "Pose le bécher sec sur la balance.", "becher", "balance");
        return toucher("tare", E.peser, 3, "Touche « Tare » : la balance revient à zéro.", "tare");
      }
      if (etat.becher !== "sous") return glisser("recueillir-poser", E.peser, 3, "Glisse le bécher taré sous l'ampoule.", "becher", "sous");
      if (v.robinet === 0) return tourner("recueillir", E.peser, 3, "Ouvre le robinet : la phase organique coule dans le bécher.", "robinet", 0.7);
      return { cle: "recueillir-couler", etape: E.peser, poste: 3, texte: "Laisse couler tout ton produit dans le bécher.", geste: "montrer", quoi: "ampoule" };
    }
    if (v.robinet > 0) return tourner("recueillir-fermer", E.peser, 3, "L'ampoule est vide : ferme le robinet.", "robinet", 0);
    if (etat.becher !== "balance") return glisser("peser", E.peser, 3, "Repose le bécher sur la balance.", "becher", "balance");
    if (etat.note === null || Math.abs(etat.note - affichage(r, etat)) > 0.03) return bouton("noter", E.peser, 3, "Touche « Noter la masse ».", "noter");
    return bouton("fini", E.peser, 3, "Tout est fait. Touche « J'ai fini » pour appeler le professeur.", "fini");
  };

  const p = pas();
  const deplace = p.geste === "glisser" || p.geste === "tirer" || p.geste === "tuyau";
  // rien ne se déplace pendant que l'ampoule coule, que le mélange chauffe, ni que l'eau court dans les tuyaux
  if (v.robinet > 0 && (deplace || p.poste !== v.poste)) return tourner("fermer", p.etape, 3, "Ferme d'abord le robinet de l'ampoule.", "robinet", 0);
  if (etat.thermostat > 0 && p.poste === 2 && deplace) return tourner("couper-avant", p.etape, 2, "Coupe d'abord le chauffage : thermostat sur 0.", "thermostat", 0);
  if (etat.eau > 0 && (p.geste === "tirer" || p.geste === "tuyau")) return tourner("eau-avant", p.etape, 2, "Ferme d'abord le robinet d'eau.", "eau", 0);
  // le geste se fait à un autre poste : le guide y conduit, un poste à la fois
  if (p.poste !== v.poste && !v.saisie) {
    const suivant: Poste = v.poste < p.poste ? (v.poste === 1 ? 2 : 3) : v.poste === 3 ? 2 : 1;
    return bouton(`aller-${suivant}`, p.etape, v.poste, suivant === 2 ? (v.poste === 1 ? ALLER.avance : ALLER.recule) : ALLER[suivant], `poste-${suivant}`);
  }
  return p;
}
