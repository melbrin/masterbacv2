// Le guide de la paillasse Calorimètre : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : le bécher penché au-dessus
// du vase, la saisie ouverte. Ici aussi, ce que la vue décide seule : poser un objet, la vitesse du temps, le débit du bécher.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/calorimetre-guide.test.ts).
import { nombre } from "@/lib/commun/format";
import type { GesteBrut } from "../types";
import { CONTENANCE, maintenant, regles, type EtatCalorimetre, type ReglagesCalorimetre } from "./calorimetre";

export type ObjetCalorimetre = "vase" | "eau" | "couvercle" | "thermometre" | "pince" | "bloc";
export type CibleCalorimetre = "plateau" | "cavite" | "au-dessus" | "dans-le-vase" | "au-fond" | "calorimetre" | "bain" | "repos-eau" | "repos-couvercle" | "repos-thermometre";
export type PoussoirCalorimetre = "verser" | "agiter" | "tare";
export type BoutonCalorimetre = "masse" | "temperature" | "recommencer" | "fini";

/** Ce que la vue retient en plus de l'état des règles. */
export interface VueCalorimetre {
  /** le bécher d'eau froide est penché au-dessus du vase */
  verse: boolean;
  /** la lecture en cours de saisie */
  saisie: "masse" | "temperature" | null;
}

// ---------- le temps du laboratoire, le bécher ----------

/**
 * La vitesse du temps du laboratoire. Il passe dix fois plus vite que le vrai, pour ne pas attendre devant un thermomètre.
 * Mais quand un geste presse (le bloc est à l'air, ou le calorimètre attend son couvercle), il passe au rythme réel :
 * l'élève a le temps qu'il aurait au laboratoire. Dès qu'il agite, le temps reprend sa course.
 */
export const vitesse = (etat: EtatCalorimetre): number => (etat.agite ? 10 : etat.bloc === "air" || (etat.bloc === "vase" && !etat.couvercle) ? 1 : 10);

/** Le débit du bécher, en grammes par seconde : il ralentit à l'approche de la masse demandée, comme la main qui redresse le bécher. */
export const debitEau = (r: ReglagesCalorimetre, etat: EtatCalorimetre): number => (etat.eau < r.eauDemandee - 40 ? 30 : 8);

const CUMULS: Record<string, number> = { attendre: 3600, verser: CONTENANCE };
/**
 * Ajoute un geste à la liste que la vue envoie au serveur. Deux attentes, ou deux versements, à la suite se regroupent :
 * la liste reste courte, et rejouée elle donne le même état, puisque deux attentes valent exactement leur somme.
 */
export function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  const a = dernier?.v, b = g.v;
  const continu = dernier !== undefined && dernier.g === g.g && typeof a === "number" && typeof b === "number" && CUMULS[g.g] !== undefined && a + b <= CUMULS[g.g];
  return continu ? [...gestes.slice(0, -1), { ...dernier, v: Math.round((a + b) * 100) / 100 }] : [...gestes, g];
}

// ---------- poser un objet ----------

/** Ce que donne un objet posé : les gestes pour les règles, le bécher penché ou non, ce qui vient de se passer, et le geste qui vient après. */
export interface Pose { gestes: GesteBrut[]; verse: boolean; message: string; conseil?: string }

/** Ce qui retient le vase là où il est. */
const retenu = (etat: EtatCalorimetre): string =>
  etat.couvercle ? "Le calorimètre est fermé : enlève d'abord le couvercle." : etat.thermometre ? "Le thermomètre est dans le vase : retire-le d'abord."
    : etat.bloc === "vase" ? "Le bloc est dans le vase : il reste dans le calorimètre." : "L'agitateur remue l'eau : lâche-le d'abord.";

/**
 * Poser un objet sur une cible. `message` dit ce qui vient de se passer, ou pourquoi le geste est impossible ; `conseil`,
 * le geste que l'objet posé permet (la vue l'ajoute quand le guide est coupé : avec le guide, c'est lui qui le dit).
 * Un objet inconnu ne change rien.
 */
export function pose(r: ReglagesCalorimetre, etat: EtatCalorimetre, verse: boolean, objet: string, cible: string): Pose {
  const possible = (g: GesteBrut) => regles.geste(r, etat, g) !== etat;
  const fait = (g: GesteBrut, message: string, penche = verse): Pose => ({ gestes: [g], verse: penche, message });
  const refus = (message: string): Pose => ({ gestes: [], verse, message });
  switch (objet) {
    case "vase": {
      const g: GesteBrut = { g: "vase", ou: cible === "plateau" ? "balance" : "calorimetre" };
      // le bécher penché au-dessus du vase retourne sur l'étagère
      return possible(g) ? fait(g, cible === "plateau" ? "Le vase est sur le plateau de la balance." : "Le vase est de retour dans le calorimètre.", false) : refus(retenu(etat));
    }
    case "eau":
      if (cible === "repos-eau") return { gestes: [], verse: false, message: "Le bécher d'eau froide est reposé sur l'étagère." };
      if (etat.couvercle) return refus("Le calorimètre est fermé : enlève le couvercle pour verser.");
      if (etat.bloc === "vase") return refus("Le bloc est déjà dans le vase : on n'y ajoute plus d'eau.");
      return { gestes: [], verse: true, message: "Le bécher d'eau froide est au-dessus du vase.", conseil: "Garde le doigt sur « Verser »." };
    case "couvercle": {
      if (cible === "repos-couvercle") return possible({ g: "couvercle", pose: false }) ? fait({ g: "couvercle", pose: false }, "Le couvercle est reposé sur l'étagère.") : refus("Le couvercle est déjà sur l'étagère.");
      const g: GesteBrut = { g: "couvercle", pose: true };
      return possible(g) ? fait(g, "Le couvercle ferme le calorimètre.", false) : refus("Le vase n'est pas dans le calorimètre : il n'y a rien à fermer.");
    }
    case "thermometre": {
      if (cible === "repos-thermometre") return possible({ g: "thermometre", dans: false }) ? fait({ g: "thermometre", dans: false }, "Le thermomètre est reposé sur son support.") : refus("Le thermomètre est déjà sur son support.");
      const g: GesteBrut = { g: "thermometre", dans: true };
      if (!possible(g)) return refus("Le vase est sur la balance : le thermomètre se plonge dans le calorimètre.");
      return etat.eau > 0 ? { ...fait(g, "Le thermomètre est dans l'eau : son niveau se met à bouger."), conseil: "Regarde la loupe, et attends qu'il s'arrête." } : fait(g, "Le thermomètre est dans le vase, mais il n'y a pas d'eau.");
    }
    case "pince":
      return possible({ g: "sortir" }) ? { ...fait({ g: "sortir" }, "La pince sort le bloc de l'eau bouillante : à l'air, il refroidit."), conseil: "Porte-le tout de suite dans le calorimètre." }
        : refus("Le bloc n'est plus dans l'eau bouillante : la pince n'a rien à saisir.");
    case "bloc": {
      if (cible === "bain") return possible({ g: "rebain" }) ? fait({ g: "rebain" }, "Le bloc est remis dans l'eau bouillante.") : refus("Le bloc n'est pas dans la pince.");
      const g: GesteBrut = { g: "plonger" };
      if (possible(g)) return { ...fait(g, "Le bloc est dans le vase du calorimètre.", false), conseil: "Pose le couvercle, puis agite." };
      return refus(etat.couvercle ? "Le calorimètre est fermé : le bloc ne peut pas y entrer." : etat.vase !== "calorimetre" ? "Le vase est sur la balance : remets-le dans le calorimètre avant d'y plonger le bloc." : "Le bloc n'est pas dans la pince.");
    }
    default:
      return { gestes: [], verse, message: "" };
  }
}

// ---------- le prochain geste ----------

/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasDuGuide = { cle: string; texte: string; etape: number } & (
  /** prendre un objet et le poser, par leurs noms dans la vue */
  | { geste: "glisser"; objet: ObjetCalorimetre; cible: CibleCalorimetre }
  /** garder le doigt sur un poussoir, ou toucher une touche de la scène */
  | { geste: "maintenir" | "toucher"; poussoir: PoussoirCalorimetre }
  /** regarder un appareil, ou attendre en le regardant */
  | { geste: "montrer"; quoi: "loupe" | "balance" | "bain" }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: BoutonCalorimetre }
);

/** Le niveau du thermomètre ne bouge plus à l'œil : moins d'une demi-graduation de la loupe le sépare de son arrêt. */
const STABLE = 0.04;
/** Le vase a reçu assez d'eau à quelques grammes de la masse demandée : le protocole dit « environ ». */
const PRESQUE = 4;
/** Le bloc qui a perdu plus que cela à l'air retourne dans le bain : le professeur compte une faute à 1 °C. */
const TIEDE = 0.8;

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève. `etat` est la paillasse telle
 * qu'elle est à cet instant : le temps écoulé y est inscrit.
 */
export function prochain(r: ReglagesCalorimetre, etat: EtatCalorimetre, v: VueCalorimetre): PasDuGuide {
  const m = maintenant(r, etat);
  const n = etat.notes;
  const dedans = etat.bloc === "vase";

  const glisser = (cle: string, etape: number, texte: string, objet: ObjetCalorimetre, cible: CibleCalorimetre): PasDuGuide => ({ cle, etape, texte, geste: "glisser", objet, cible });
  const maintenir = (cle: string, etape: number, texte: string, poussoir: PoussoirCalorimetre): PasDuGuide => ({ cle, etape, texte, geste: "maintenir", poussoir });
  const montrer = (cle: string, etape: number, texte: string, quoi: "loupe" | "balance" | "bain"): PasDuGuide => ({ cle, etape, texte, geste: "montrer", quoi });
  const bouton = (cle: string, etape: number, texte: string, quel: BoutonCalorimetre): PasDuGuide => ({ cle, etape, texte, geste: "bouton", bouton: quel });
  const recommencer = (etape: number, texte: string): PasDuGuide => bouton("recommencer", etape, `${texte} Touche « Tout recommencer ».`, "recommencer");

  // ----- lire : la saisie est ouverte -----
  if (v.saisie === "masse") return montrer("lire-masse", 0, "Lis la masse sur l'écran de la balance. Écris-la avec les chiffres, puis touche « Noter ».", "balance");
  if (v.saisie === "temperature") return montrer("lire-temperature", dedans ? 4 : 1, "Lis dans la loupe la graduation en face du haut de la colonne. Écris-la avec les chiffres, puis touche « Noter ».", "loupe");

  /** La balance a été remise à zéro avec le vase vide dessus. */
  const tareJuste = Math.abs(etat.tare - r.masseVase) < 0.05;
  const assez = etat.eau >= r.eauDemandee - PRESQUE;
  /** La masse notée est celle de toute l'eau du vase, lue sur la balance après la tare. */
  const pesee = n.masse !== undefined && n.masse.surBalance && Math.abs(n.masse.affiche - n.masse.eau) <= 0.1 && n.masse.eau === etat.eau;
  /** La température de départ a été lue dans l'eau, thermomètre arrêté. */
  const initiale = n.initiale !== undefined && n.initiale.trempe && Math.abs(n.initiale.lue - n.initiale.eau) <= 0.15;
  const rebain = (etape: number, texte: string): PasDuGuide => glisser("rebain", etape, texte, "bloc", "bain");

  if (!dedans) {
    // ----- la masse d'eau -----
    if (!pesee || !assez) {
      if (etat.bloc === "air") return rebain(0, "Le bloc attendra au chaud : remets-le dans l'eau bouillante.");
      if (etat.eau > 0 && !tareJuste) return recommencer(0, "L'eau a été versée avant la tare : la balance ne peut plus donner sa masse.");
      if (etat.vase !== "balance") {
        if (etat.couvercle) return glisser("ouvrir", 0, "Enlève le couvercle : repose-le sur l'étagère.", "couvercle", "repos-couvercle");
        if (etat.thermometre) return glisser("retirer-thermometre", 0, "Retire le thermomètre : repose-le sur son support.", "thermometre", "repos-thermometre");
        return glisser("peser", 0, "Porte le vase du calorimètre sur le plateau de la balance.", "vase", "plateau");
      }
      if (!tareJuste) return { cle: "tare", etape: 0, texte: "Touche « Tare » : la balance doit afficher zéro avec le vase vide.", geste: "toucher", poussoir: "tare" };
      if (!assez) {
        if (!v.verse) return glisser("becher", 0, "Prends le bécher d'eau froide et porte-le au-dessus du vase.", "eau", "au-dessus");
        return maintenir("verser", 0, `Garde le doigt sur « Verser » : il faut environ ${nombre(r.eauDemandee, 0)} g d'eau. Regarde l'écran de la balance.`, "verser");
      }
      if (v.verse) return glisser("ranger-becher", 0, "C'est assez. Repose le bécher d'eau froide sur l'étagère.", "eau", "repos-eau");
      return bouton("noter-masse", 0, "Touche « Noter la masse ».", "masse");
    }
    // ----- la température de l'eau froide -----
    if (!initiale) {
      if (etat.bloc === "air") return rebain(1, "Le bloc attendra au chaud : remets-le dans l'eau bouillante.");
      if (etat.vase !== "calorimetre") return glisser("replacer", 1, "Remets le vase dans le calorimètre.", "vase", "cavite");
      if (!etat.thermometre) return glisser("thermometre", 1, "Plonge le thermomètre dans l'eau du vase.", "thermometre", "dans-le-vase");
      if (Math.abs(m.lue - m.eau) > STABLE) return montrer("attendre-initiale", 1, "Regarde la loupe : le niveau du thermomètre bouge encore. Attends qu'il s'arrête.", "loupe");
      return bouton("noter-initiale", 1, "Le niveau ne bouge plus. Touche « Noter la température ».", "temperature");
    }
    // ----- le bloc, de l'eau bouillante au calorimètre -----
    if (etat.bloc === "air") {
      if (m.bloc < 100 - TIEDE) return rebain(2, "Le bloc a refroidi à l'air. Remets-le dans l'eau bouillante.");
      if (etat.vase !== "calorimetre") return rebain(2, "Le vase n'est pas dans le calorimètre. Remets d'abord le bloc dans l'eau bouillante.");
      if (etat.couvercle) return glisser("ouvrir", 2, "Enlève vite le couvercle : le bloc doit pouvoir entrer.", "couvercle", "repos-couvercle");
      return glisser("plonger", 2, "Porte tout de suite le bloc dans le vase du calorimètre : à l'air, il refroidit.", "bloc", "au-fond");
    }
    if (etat.vase !== "calorimetre") return glisser("replacer", 2, "Remets le vase dans le calorimètre.", "vase", "cavite");
    if (etat.couvercle) return glisser("ouvrir", 2, "Enlève le couvercle : le bloc doit pouvoir entrer dans le vase.", "couvercle", "repos-couvercle");
    if (!etat.thermometre) return glisser("thermometre", 2, "Replonge le thermomètre dans le vase : il suivra l'échauffement.", "thermometre", "dans-le-vase");
    if (m.bloc < 99.9) return montrer("attendre-bain", 2, "Le bloc se réchauffe dans l'eau bouillante. Attends un instant.", "bain");
    return glisser("sortir", 2, "Saisis le bloc : porte la pince dans l'eau bouillante. Tu plongeras ensuite le bloc dans le calorimètre, sans traîner.", "pince", "bain");
  }

  // ----- le bloc est dans l'eau : fermer, agiter, lire -----
  if (!pesee) return recommencer(3, "Le bloc est dans l'eau, mais la masse d'eau n'a pas été mesurée : il est trop tard pour la peser.");
  if (!initiale) return recommencer(3, "Le bloc est dans l'eau, mais la température de départ n'a pas été mesurée : il est trop tard pour la lire.");
  /** La température finale a été lue calorimètre fermé, eau agitée, thermomètre arrêté. */
  const finale = n.finale !== undefined && n.finale.trempe && n.finale.agite && n.finale.couvercle && Math.abs(n.finale.equilibre - n.finale.lue) <= 0.15;
  if (finale) return bouton("fini", 4, "Tout est fait. Touche « J'ai fini » pour appeler le professeur.", "fini");
  if (!etat.couvercle) return glisser("fermer", 3, "Pose le couvercle sur le calorimètre, sans attendre.", "couvercle", "calorimetre");
  if (!etat.thermometre) return glisser("thermometre", 3, "Replonge le thermomètre dans le vase.", "thermometre", "dans-le-vase");
  const equilibre = etat.agiteApres && m.inegal < 0.02 && Math.abs(m.equilibre - m.lue) <= STABLE;
  if (!equilibre) return maintenir("agiter", 3, "Garde le doigt sur « Agiter » : l'eau se mélange et le thermomètre monte. Continue tant que le niveau bouge dans la loupe.", "agiter");
  return bouton("noter-finale", 4, etat.agite ? "Le niveau ne bouge plus : lâche « Agiter », puis touche « Noter la température »." : "Le niveau ne bouge plus. Touche « Noter la température ».", "temperature");
}
