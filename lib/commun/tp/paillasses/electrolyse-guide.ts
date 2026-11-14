// Le guide de la paillasse Électrolyse : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : la saisie ouverte.
// Ici aussi, ce que la vue décide seule : poser un objet, dire ce que fait le circuit, la vitesse du temps.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/electrolyse-guide.test.ts).
import { nombre } from "@/lib/commun/format";
import type { GesteBrut } from "../types";
import { chronometre, electrodeDe, intensite, maintenant, montage, regles, type EtatElectrolyse, type PeseeNotee, type ReglagesElectrolyse } from "./electrolyse";

/** Ce que la vue retient en plus de l'état des règles : la saisie d'une mesure, d'abord le choix de l'appareil, puis la lecture. */
export interface VueElectrolyse { saisie: "choix" | "masse" | "intensite" | "duree" | null }

// ---------- les noms, la liste des gestes, le temps ----------

const NOMS: Record<string, string> = { "g+": "la borne + du générateur", "g-": "la borne − du générateur", k1: "l'interrupteur", k2: "l'interrupteur", a: "la borne A de l'ampèremètre", com: "la borne COM de l'ampèremètre" };
/** Le nom d'une borne dans une phrase : « la borne + du générateur », « la plaque 1 ». */
export const nomBorne = (r: ReglagesElectrolyse, id: string): string => NOMS[id] ?? `la ${electrodeDe(r, id)?.nom ?? "plaque"}`;

/**
 * Ajoute un geste à la liste que la vue envoie au serveur. Deux attentes à la suite se regroupent : la liste reste
 * courte, et rejouée elle donne le même état, puisque deux attentes valent exactement leur somme.
 */
export function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  const a = dernier?.v, b = g.v;
  const continu = dernier !== undefined && g.g === "attendre" && dernier.g === "attendre" && typeof a === "number" && typeof b === "number" && a + b <= 3600;
  return continu ? [...gestes.slice(0, -1), { g: "attendre", v: Math.round((a + b) * 100) / 100 }] : [...gestes, g];
}

/**
 * La vitesse du temps du laboratoire. Il ne passe que si quelque chose en dépend : le courant, ou le chronomètre. Il
 * passe alors au rythme du vrai ; pendant l'avance rapide, cent vingt fois plus vite, puis quinze fois seulement à
 * l'approche de la durée demandée : l'élève a le temps de lâcher.
 */
export function vitesse(r: ReglagesElectrolyse, etat: EtatElectrolyse, rapide: boolean): number {
  if (intensite(r, etat) <= 0 && !etat.chrono.marche) return 0;
  if (!rapide) return 1;
  const reste = r.duree - maintenant(r, etat).duree;
  return reste > 90 || reste < -30 ? 120 : 15;
}

/** Ce que le circuit fait, après un geste qui l'a changé : la fin de la phrase qui le raconte. */
export function effet(r: ReglagesElectrolyse, suite: EtatElectrolyse): string {
  const m = montage(r, suite);
  if (m.etat === "court-circuit") return " Le générateur se met en sécurité : ses deux bornes sont reliées sans passer par la solution.";
  if (m.etat === "derivation") return " Le courant a deux chemins : l'ampèremètre reste à zéro.";
  if (m.etat === "serie" && suite.tension > 0) return " Le courant passe.";
  if (m.etat === "serie") return " La boucle est fermée : il reste à monter la tension du générateur.";
  return "";
}

// ---------- poser un objet ----------

/**
 * Poser un objet sur une cible : le geste que ça donne aux règles, et ce qui vient de se passer, en une phrase. Les
 * objets sont « plaque-<plaque> », « pissette » et « seche » ; les cibles, « cuve-<plaque> », « support-<plaque> » et
 * « balance ». Un geste impossible ne donne rien aux règles : la phrase dit pourquoi.
 */
export function pose(r: ReglagesElectrolyse, etat: EtatElectrolyse, objet: string, cible: string): { gestes: GesteBrut[]; message: string } {
  const essaie = (g: GesteBrut, oui: (suite: EtatElectrolyse) => string, non: string) => { const suite = regles.geste(r, etat, g); return suite !== etat ? { gestes: [g], message: oui(suite) } : { gestes: [], message: non }; };
  if (objet === "pissette" || objet === "seche") {
    const e = electrodeDe(r, cible.replace(/^support-/, ""));
    if (!e) return { gestes: [], message: "" };
    if (etat.plaques[e.id]?.ou !== "support") return { gestes: [], message: `La ${e.nom} n'est pas au support : c'est là qu'elle se rince et se sèche.` };
    if (objet === "pissette") return essaie({ g: "rincer", p: e.id }, () => `Tu rinces la ${e.nom} à l'eau distillée.`, `La ${e.nom} vient d'être rincée.`);
    return essaie({ g: "secher", p: e.id }, () => `Tu sèches la ${e.nom}.${etat.plaques[e.id]?.mouille === "solution" ? " La solution laisse des cristaux bleus sur le cuivre." : ""}`, `La ${e.nom} est déjà sèche.`);
  }
  const e = electrodeDe(r, objet.replace(/^plaque-/, ""));
  if (!objet.startsWith("plaque-") || !e) return { gestes: [], message: "" };
  const ou = cible.startsWith("cuve") ? "cuve" : cible.startsWith("support") ? "support" : "balance";
  return essaie({ g: "plaque", p: e.id, ou },
    (suite) => (ou === "cuve" ? `La ${e.nom} trempe dans la solution de sulfate de cuivre.` : ou === "support" ? `La ${e.nom} est au support${suite.plaques[e.id]?.mouille === "sec" ? "" : " : elle est mouillée"}.` : `La ${e.nom} est sur le plateau de la balance.`),
    etat.fils.some((f) => f.includes(e.id)) ? `Un fil est pincé sur la ${e.nom} : ôte-le d'abord.` : etat.plaques[e.id]?.ou === ou ? `La ${e.nom} y est déjà.` : "Il y a déjà une plaque sur la balance.");
}

// ---------- le prochain geste ----------

export type ToucheElectrolyse = "interrupteur" | "chrono" | "zero" | "tare";
export type BoutonElectrolyse = "noter" | "masse" | "intensite" | "duree" | "annuler" | "recommencer" | "fini";
export type Lecture = "masse" | "intensite" | "duree";

/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasDuGuide = { cle: string; texte: string; etape: number } & (
  /** prendre un objet et le poser, par leurs noms dans la vue */
  | { geste: "glisser"; objet: string; cible: string }
  /** tirer un fil d'une borne à une autre */
  | { geste: "fil"; de: string; vers: string }
  /** retirer un fil : le toucher, puis toucher la croix qui apparaît en son milieu */
  | { geste: "retirer"; a: string; b: string }
  /** toucher une commande de la scène : l'interrupteur, une touche du chronomètre ou de la balance */
  | { geste: "toucher"; touche: ToucheElectrolyse }
  /** tourner la molette du générateur jusqu'à la tension `vers`, en volts */
  | { geste: "tourner"; vers: number }
  /** garder le doigt sur « Avance rapide » */
  | { geste: "maintenir"; poussoir: "avance" }
  /** regarder un appareil */
  | { geste: "montrer"; quoi: "balance" | "amperemetre" | "chronometre" }
  /** une touche sous la scène ; `quoi` : la lecture que « Noter une mesure » fera choisir ensuite */
  | { geste: "bouton"; bouton: BoutonElectrolyse; quoi?: Lecture }
);

/** Le montage du protocole : générateur, interrupteur, ampèremètre, cuve, la première plaque du côté de la borne −. */
export const serie = (r: ReglagesElectrolyse): [string, string][] => [["g+", "k1"], ["k2", "a"], ["com", r.electrodes[1].id], [r.electrodes[0].id, "g-"]];
/** La tension qui donne l'intensité demandée, au dixième de volt. */
export const tensionVoulue = (r: ReglagesElectrolyse): number => Math.round(r.intensite * r.resistance * 10) / 10;

const memeFil = (f: [string, string], g: [string, string]) => (f[0] === g[0] && f[1] === g[1]) || (f[0] === g[1] && f[1] === g[0]);
/** L'électrolyse a assez duré à deux secondes de la durée demandée : le temps de porter la main à l'interrupteur. */
const PRESQUE = 2;
/** L'intensité est réglée à 6 % de celle du sujet, qui la veut « voisine » : le professeur compte une faute à 10 %. */
const REGLEE = 0.06;
/** Un chronomètre parti plus de dix secondes avant le courant repart de zéro. */
const AVANCE_DU_CHRONO = 10;
const CHOIX: Record<Lecture, string> = { masse: "« La masse »", intensite: "« L'intensité »", duree: "« La durée »" };

/** Le premier geste qui manque, saisie fermée. */
function suite(r: ReglagesElectrolyse, etat: EtatElectrolyse): PasDuGuide {
  const [p1, p2] = r.electrodes;
  const p = maintenant(r, etat);
  const n = etat.notes;
  /** l'électrolyse a commencé ; elle a assez duré ; elle est finie quand le courant ne passe plus */
  const commencee = p.quantite > 0;
  const assez = p.duree >= r.duree - PRESQUE;
  const terminee = assez && intensite(r, etat) <= 0;
  const plaque = etat.plaques[p1.id];

  const glisser = (cle: string, etape: number, texte: string, objet: string, cible: string): PasDuGuide => ({ cle, etape, texte, geste: "glisser", objet, cible });
  const toucher = (cle: string, etape: number, texte: string, touche: ToucheElectrolyse): PasDuGuide => ({ cle, etape, texte, geste: "toucher", touche });
  const noter = (quoi: Lecture, etape: number, texte: string): PasDuGuide => ({ cle: `noter-${quoi}`, etape, texte: `${texte} Touche « Noter une mesure ».`, geste: "bouton", bouton: "noter", quoi });
  const recommencer = (etape: number, texte: string): PasDuGuide => ({ cle: "recommencer", etape, texte: `${texte} Touche « Tout recommencer ».`, geste: "bouton", bouton: "recommencer" });
  const retirer = (etape: number, f: [string, string], texte: string): PasDuGuide => ({ cle: `retirer-${f[0]}-${f[1]}`, etape, texte: `${texte} Touche-le, puis touche la croix qui apparaît : il se retire.`, geste: "retirer", a: f[0], b: f[1] });
  const regler = (texte: string): PasDuGuide => ({ cle: "regler", etape: 2, texte, geste: "tourner", vers: tensionVoulue(r) });

  /** Une pesée de la plaque 1, propre et sèche, sur une balance à zéro. */
  const peseeJuste = (note: PeseeNotee | undefined): boolean => note !== undefined && note.plaque === p1.id && note.film === 0 && Math.abs(note.affiche - note.nue) <= 0.0015;
  /** Amener la plaque 1, propre et sèche, sur une balance vide et à zéro ; null quand elle y est. */
  const peser = (etape: number): PasDuGuide | null => {
    const fil = etat.fils.find((f) => f.includes(p1.id));
    if (plaque?.ou === "cuve") {
      if (fil) return retirer(etape, fil, `Ôte le fil pincé sur la ${p1.nom}.`);
      return glisser("sortir", etape, `Sors la ${p1.nom} de la cuve : porte-la au support.`, `plaque-${p1.id}`, `support-${p1.id}`);
    }
    const propre = plaque?.mouille === "sec" && !plaque.residu;
    if (plaque?.ou === "balance") {
      if (propre && etat.tare === 0) return null;
      return glisser("reposer", etape, propre ? `La balance n'est pas à zéro. Repose la ${p1.nom} au support.` : `La ${p1.nom} n'est pas propre et sèche. Repose-la au support.`, `plaque-${p1.id}`, `support-${p1.id}`);
    }
    if (plaque?.mouille === "eau") return glisser("secher", etape, `Sèche la ${p1.nom} : porte le sèche-cheveux sur elle.`, "seche", `support-${p1.id}`);
    if (!propre) return glisser("rincer", etape, `Rince la ${p1.nom} : porte la pissette d'eau distillée sur elle.`, "pissette", `support-${p1.id}`);
    // propre et sèche, la plaque va sur la balance : c'est l'étape de la pesée
    const pesee = etape === 4 ? 5 : etape;
    if (etat.plaques[p2.id]?.ou === "balance") return glisser("liberer", pesee, `La balance est prise. Repose la ${p2.nom} au support.`, `plaque-${p2.id}`, `support-${p2.id}`);
    if (etat.tare !== 0) return toucher("tare", pesee, "Touche « Tare » : la balance doit afficher zéro, plateau vide.", "tare");
    return glisser("peser", pesee, `Pose la ${p1.nom}, propre et sèche, sur le plateau de la balance.`, `plaque-${p1.id}`, "balance");
  };

  // ----- la pesée de départ -----
  if (!peseeJuste(n.avant)) {
    if (commencee) return recommencer(terminee ? 3 : 2, `Le courant a déjà passé, et la ${p1.nom} n'a pas été pesée propre et sèche avant : sa masse de départ est perdue.`);
    return peser(0) ?? noter("masse", 0, `La ${p1.nom} est sur la balance.`);
  }

  if (!terminee) {
    // ----- le courant a passé dans le mauvais sens, ou sans que l'ampèremètre le lise : la faute est faite -----
    if (p.charge < 0) return recommencer(2, `La ${p1.nom} était reliée à la borne + du générateur : elle a perdu du cuivre au lieu d'en gagner.`);
    if (p.envers > 0) return recommencer(2, "L'ampèremètre était branché à l'envers pendant que le courant passait.");
    // ----- le montage, interrupteur ouvert : est-il le bon, à l'interrupteur près ? -----
    const ferme = montage(r, { ...etat, ferme: true });
    if (!(ferme.etat === "serie" && ferme.cathode === p1.id && ferme.amperemetre === 1 && ferme.interrupteur)) {
      if (etat.ferme) return toucher("ouvrir", 1, "Ouvre l'interrupteur : le circuit se monte interrupteur ouvert.", "interrupteur");
      const seche = r.electrodes.find((e) => etat.plaques[e.id]?.ou !== "cuve");
      if (seche) return glisser(`plonger-${seche.id}`, 1, `Plonge la ${seche.nom} dans la cuve de sulfate de cuivre.`, `plaque-${seche.id}`, `cuve-${seche.id}`);
      const voulus = serie(r);
      const enTrop = etat.fils.find((f) => !voulus.some((g) => memeFil(f, g)));
      if (enTrop) return retirer(1, enTrop, `Le fil entre ${nomBorne(r, enTrop[0])} et ${nomBorne(r, enTrop[1])} n'est pas à sa place.`);
      const manque = voulus.find((g) => !etat.fils.some((f) => memeFil(f, g))) ?? voulus[0];
      const texte = manque[0] === "g+" ? "Tire un fil de la borne + du générateur jusqu'à l'interrupteur : pose le doigt sur la borne, et glisse jusqu'à l'autre."
        : manque[0] === "k2" ? "Tire un fil de l'autre borne de l'interrupteur jusqu'à la borne A de l'ampèremètre."
        : manque[0] === "com" ? `Tire un fil de la borne COM de l'ampèremètre jusqu'à la ${p2.nom}.`
        : `Tire un fil de la ${p1.nom} jusqu'à la borne − du générateur : c'est sur elle que le cuivre se déposera.`;
      return { cle: `fil-${manque[0]}-${manque[1]}`, etape: 1, texte, geste: "fil", de: manque[0], vers: manque[1] };
    }
    // ----- lancer : l'interrupteur, le chronomètre, la molette -----
    const etape = n.intensite === undefined ? 2 : 3;
    if (!etat.ferme) return toucher("fermer", etape, commencee ? "L'électrolyse n'a pas assez duré. Referme l'interrupteur." : "Ferme l'interrupteur : touche-le.", "interrupteur");
    if (!commencee && chronometre(etat) > AVANCE_DU_CHRONO) return toucher("zero", 2, "Le chronomètre a tourné sans courant. Remets-le à zéro : touche « Zéro ».", "zero");
    if (!etat.chrono.marche) return toucher("chrono", etape, "Lance le chronomètre : touche « Départ ».", "chrono");
    if (Math.abs(intensite(r, etat) - r.intensite) > REGLEE * r.intensite) return regler(`Tourne la molette du générateur, sans attendre : l'ampèremètre doit afficher environ ${nombre(r.intensite, 2)} A.`);
    if (n.intensite === undefined || Math.abs(n.intensite.affiche - r.intensite) > 0.1 * r.intensite) return noter("intensite", 2, "L'intensité est réglée : ne touche plus à la molette.");
    // ----- laisser passer le temps -----
    if (!assez) return { cle: "avancer", etape: 3, texte: `Garde le doigt sur « Avance rapide » : le temps du laboratoire file, et le cuivre se dépose. Lâche quand le chronomètre arrive à ${nombre(r.duree, 0)} s.`, geste: "maintenir", poussoir: "avance" };
    return toucher("couper", 3, "Le temps est écoulé. Ouvre l'interrupteur : touche-le.", "interrupteur");
  }

  // ----- l'électrolyse est finie : le chronomètre, la durée -----
  if (n.intensite === undefined) return recommencer(3, "L'électrolyse est finie, mais l'intensité n'a pas été notée pendant que le courant passait.");
  if (etat.chrono.marche) return toucher("arreter", 3, "Arrête le chronomètre : touche « Arrêt ».", "chrono");
  if (n.duree === undefined || n.duree.affiche !== chronometre(etat)) return noter("duree", 3, "Le chronomètre est arrêté.");
  // ----- rincer, sécher, peser de nouveau -----
  if (peseeJuste(n.apres)) return { cle: "fini", etape: 5, texte: "Tout est fait. Touche « J'ai fini » pour appeler le professeur.", geste: "bouton", bouton: "fini" };
  return peser(plaque?.ou === "balance" ? 5 : 4) ?? noter("masse", 5, `La ${p1.nom} est sur la balance, rincée et séchée.`);
}

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève. `etat` est la paillasse telle
 * qu'elle est à cet instant : le temps écoulé y est inscrit.
 */
export function prochain(r: ReglagesElectrolyse, etat: EtatElectrolyse, v: VueElectrolyse): PasDuGuide {
  const commencee = maintenant(r, etat).quantite > 0;
  // ----- lire : la saisie est ouverte -----
  if (v.saisie === "masse") return { cle: "lire-masse", etape: commencee ? 5 : 0, texte: "Lis la masse sur l'écran de la balance. Écris-la avec ses trois chiffres après la virgule, puis touche « Noter ».", geste: "montrer", quoi: "balance" };
  if (v.saisie === "intensite") return { cle: "lire-intensite", etape: 2, texte: "Lis l'intensité sur l'écran de l'ampèremètre. Écris-la, puis touche « Noter ».", geste: "montrer", quoi: "amperemetre" };
  if (v.saisie === "duree") return { cle: "lire-duree", etape: 3, texte: "Lis la durée sur l'écran du chronomètre. Écris-la, puis touche « Noter ».", geste: "montrer", quoi: "chronometre" };
  const pas = suite(r, etat);
  if (v.saisie !== "choix") return pas;
  // ----- le choix de l'appareil est ouvert : la lecture attendue, ou rien -----
  if (pas.geste === "bouton" && pas.bouton === "noter" && pas.quoi) return { cle: `choisir-${pas.quoi}`, etape: pas.etape, texte: `Touche ${CHOIX[pas.quoi]}.`, geste: "bouton", bouton: pas.quoi };
  return { cle: "annuler", etape: pas.etape, texte: "Il n'y a rien à noter pour l'instant. Touche « Annuler ».", geste: "bouton", bouton: "annuler" };
}
