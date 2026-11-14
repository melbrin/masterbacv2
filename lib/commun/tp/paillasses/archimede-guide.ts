// Le guide de la paillasse Archimède : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : la saisie ouverte.
// Ici aussi, poser un objet : ce que ce geste donne aux règles, et la phrase qui dit ce qui s'est passé.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/archimede-guide.test.ts).
import type { GesteBrut } from "../types";
import { COURSE, degage, liquideDe, regles, situation, solideDe, toutImmerge, type EtatArchimede, type Liquide, type ReglagesArchimede, type Releve } from "./archimede";

/** Ce que la vue retient en plus de l'état des règles : la lecture en cours de saisie. */
export interface VueArchimede { saisie: "poids" | "volume" | null }

// ---------- poser un objet ----------

/**
 * Poser un objet sur une cible : le geste que ça donne aux règles, et ce qui vient de se passer, en une phrase. Les
 * objets sont « sol-<solide> », « ep-<liquide> » et « papier » ; les cibles, « crochet », « dessous », « pendu »,
 * « etagere-<solide> » et « repos-<liquide> ». Un geste impossible ne donne rien aux règles : la phrase dit pourquoi.
 */
export function pose(r: ReglagesArchimede, etat: EtatArchimede, objet: string, cible: string): { gestes: GesteBrut[]; message: string } {
  const pendu = solideDe(r, etat.accroche);
  const quiPend = pendu ? `Le ${pendu.nom}` : "Le crochet";
  const essaie = (g: GesteBrut, oui: string, non: string) => (regles.geste(r, etat, g) !== etat ? { gestes: [g], message: oui } : { gestes: [], message: non });
  const [genre, id] = objet.split("-");
  if (genre === "sol") {
    const s = solideDe(r, id);
    if (!s) return { gestes: [], message: "" };
    if (cible !== "crochet") return essaie({ g: "decrocher" }, `Le ${s.nom} est reposé sur l'étagère.`, `Le ${s.nom} est dans l'éprouvette : remonte d'abord la potence.`);
    if (pendu) return { gestes: [], message: `Le crochet porte déjà le ${pendu.nom} : décroche-le d'abord.` };
    return essaie({ g: "accrocher", s: s.id }, `Le ${s.nom} est accroché au dynamomètre.`, "Le crochet est descendu dans l'éprouvette : remonte d'abord la potence.");
  }
  if (genre === "ep") {
    const l = liquideDe(r, id);
    if (!l) return { gestes: [], message: "" };
    if (cible !== "dessous") return essaie({ g: "ranger" }, `L'éprouvette marquée « ${l.etiquette} » est revenue à sa place.`, `${quiPend} est dans l'éprouvette : remonte d'abord la potence.`);
    if (etat.dessous !== null) return { gestes: [], message: "Il y a déjà une éprouvette sous le dynamomètre : range-la d'abord." };
    return essaie({ g: "poser", l: l.id }, `L'éprouvette marquée « ${l.etiquette} » est sous le dynamomètre.`, `${quiPend} pend trop bas : remonte la potence avant de glisser l'éprouvette dessous.`);
  }
  if (objet === "papier") {
    const s = cible === "pendu" ? pendu : solideDe(r, cible.split("-")[1] ?? null);
    if (!s) return { gestes: [], message: "" };
    if (!etat.humide[s.id]) return { gestes: [], message: `Le ${s.nom} est déjà sec.` };
    return essaie({ g: "essuyer", s: s.id }, `Tu essuies le ${s.nom} : il est sec.`, `Le ${s.nom} est dans le liquide : sors-le avant de l'essuyer.`);
  }
  return { gestes: [], message: "" };
}

// ---------- le prochain geste ----------

/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasDuGuide = { cle: string; texte: string; etape: number } & (
  /** prendre un objet et le poser, par leurs noms dans la vue */
  | { geste: "glisser"; objet: string; cible: string }
  /** faire glisser la potence le long de sa tige, jusqu'à la descente `vers`, en centimètres depuis le haut */
  | { geste: "potence"; vers: number }
  /** regarder une loupe */
  | { geste: "montrer"; quoi: "dynamometre" | "eprouvette" }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: "poids" | "volume" | "fini" }
);

/**
 * La descente de la potence qui met le solide accroché entièrement sous la surface, loin du fond : le milieu de la plage
 * où il est tout immergé sans rien toucher. Null si le liquide ne le permet pas.
 */
export function descenteCible(r: ReglagesArchimede, etat: EtatArchimede): number | null {
  let debut: number | null = null, fin = COURSE;
  for (let pas = 0; pas <= COURSE * 20; pas++) {
    const sit = situation(r, { ...etat, descente: pas / 20 });
    if (debut === null && toutImmerge(sit) && !sit.fond) debut = pas / 20;
    if (debut !== null && sit.fond) { fin = (pas - 1) / 20; break; }
  }
  return debut === null ? null : Math.round(((debut + fin) / 2) * 20) / 20;
}

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève. Une mesure prise dans de
 * mauvaises conditions (cylindre mouillé, posé sur le fond, à moitié immergé) est à refaire : le guide y ramène.
 */
export function prochain(r: ReglagesArchimede, etat: EtatArchimede, v: VueArchimede): PasDuGuide {
  const ref = liquideDe(r, r.reference), x = liquideDe(r, r.inconnu), s = solideDe(r, r.demande);
  const fini: PasDuGuide = { cle: "fini", etape: 5, texte: "Tout est fait. Touche « J'ai fini » pour appeler le professeur.", geste: "bouton", bouton: "fini" };
  if (!ref || !x || !s) return fini;
  const sit = situation(r, etat);

  // ----- lire : la saisie est ouverte -----
  if (v.saisie === "poids") return { cle: "lire-poids", etape: sit.immerge > 0 ? (etat.dessous === x.id ? 5 : 3) : 0, texte: "Lis dans la loupe la graduation en face de l'index. Écris-la avec les chiffres, puis touche « Noter ».", geste: "montrer", quoi: "dynamometre" };
  if (v.saisie === "volume") return { cle: "lire-volume", etape: sit.immerge > 0 ? 3 : 1, texte: "Lis dans la loupe la graduation en face du bas du ménisque. Écris-la avec les chiffres, puis touche « Noter ».", geste: "montrer", quoi: "eprouvette" };

  const glisser = (cle: string, etape: number, texte: string, objet: string, cible: string): PasDuGuide => ({ cle, etape, texte, geste: "glisser", objet, cible });
  const bouton = (cle: string, etape: number, texte: string, quel: "poids" | "volume"): PasDuGuide => ({ cle, etape, texte, geste: "bouton", bouton: quel });
  const remonter = (etape: number, texte: string): PasDuGuide => ({ cle: "remonter", etape, texte, geste: "potence", vers: 0 });

  /** Une mesure faite avec le bon cylindre, dans les bonnes conditions. */
  const bonne = (note: Releve | undefined, dansLeLiquide: boolean): boolean =>
    note !== undefined && note.solide === s.id && !note.fond && (dansLeLiquide ? note.immerge >= 0.999 && !note.mele : note.gouttes < 0.002);
  const n = etat.notes;
  const mouille = etat.humide[s.id];

  /** Le bon cylindre au crochet ; null quand il y est. */
  const accrocher = (etape: number): PasDuGuide | null => {
    if (etat.accroche === s.id) return null;
    // au-dessus d'une éprouvette, le crochet doit être assez haut pour le cylindre qu'on retire comme pour celui qu'on accroche
    if (etat.dessous !== null && (!degage(r, etat) || !degage(r, { ...etat, accroche: s.id }))) return remonter(etape, "Remonte la potence : glisse-la vers le haut, jusqu'en haut de sa tige.");
    if (etat.accroche !== null) return glisser("decrocher", etape, `Ce n'est pas le cylindre du sujet. Repose le ${solideDe(r, etat.accroche)?.nom ?? "cylindre"} sur l'étagère.`, `sol-${etat.accroche}`, `etagere-${etat.accroche}`);
    return glisser("accrocher", etape, `Prends le ${s.nom} sur l'étagère et accroche-le au dynamomètre.`, `sol-${s.id}`, "crochet");
  };
  /** L'éprouvette d'un liquide sous le dynamomètre ; null quand elle y est. */
  const placer = (l: Liquide, etape: number): PasDuGuide | null => {
    if (etat.dessous === l.id) return null;
    if (!degage(r, etat)) return remonter(etape, "Remonte la potence jusqu'en haut : rien ne doit pendre plus bas que le bord de l'éprouvette.");
    if (etat.dessous !== null) return glisser(`ranger-${etat.dessous}`, etape, `Remets l'éprouvette marquée « ${liquideDe(r, etat.dessous)?.etiquette ?? ""} » à sa place sur la paillasse.`, `ep-${etat.dessous}`, `repos-${etat.dessous}`);
    return glisser(`poser-${l.id}`, etape, `Glisse l'éprouvette marquée « ${l.etiquette} » sous le dynamomètre.`, `ep-${l.id}`, "dessous");
  };
  /** Le cylindre entièrement dans un liquide, propre, sans toucher le fond ; null quand il y est. `avant` : l'étape du protocole où l'on change de liquide. */
  const immerger = (l: Liquide, etape: number, avant: number): PasDuGuide | null => {
    const a = accrocher(avant);
    if (a) return a;
    // un cylindre mouillé d'un autre liquide s'essuie avant d'entrer dans celui-ci
    const sale = mouille !== undefined && (mouille.liquide !== l.id || mouille.melange);
    if (etat.dessous !== l.id || sale) {
      if (sit.immerge > 0 || !degage(r, etat)) return remonter(avant, "Remonte la potence jusqu'en haut : le cylindre doit sortir du liquide.");
      if (sale) return glisser("essuyer", avant, "Le cylindre est encore mouillé. Essuie-le : porte le papier absorbant sur lui.", "papier", "pendu");
      const p = placer(l, etat.dessous === null ? etape : avant);
      if (p) return p;
    }
    if (toutImmerge(sit) && !sit.fond) return null;
    const cible = descenteCible(r, etat);
    if (cible === null) return null;
    return sit.fond
      ? { cle: `decoller-${l.id}`, etape, texte: "Le cylindre touche le fond de l'éprouvette. Remonte un peu la potence.", geste: "potence", vers: cible }
      : { cle: `immerger-${l.id}`, etape, texte: "Descends la potence : glisse-la vers le bas, le long de sa tige. Le cylindre doit être entièrement sous la surface, sans toucher le fond.", geste: "potence", vers: cible };
  };

  // ----- le poids dans l'air -----
  if (!bonne(n.air, false)) {
    const a = accrocher(0);
    if (a) return a;
    if (sit.immerge > 0 || sit.fond) return remonter(0, "Remonte la potence jusqu'en haut : le cylindre se pèse dans l'air, sans rien toucher.");
    if (mouille) return glisser("essuyer", 0, "Le cylindre est mouillé : il pèserait ses gouttes. Essuie-le : porte le papier absorbant sur lui.", "papier", "pendu");
    return bouton("noter-poids-air", 0, "Le cylindre pend dans l'air. Touche « Noter le poids ».", "poids");
  }
  // ----- le volume d'eau, sans le cylindre -----
  if (n[`${ref.id}:avant`] === undefined) {
    const p = placer(ref, 1);
    if (p) return p;
    if (sit.immerge > 0) return remonter(1, "Remonte la potence : le cylindre doit sortir du liquide pour lire le volume de départ.");
    return bouton("noter-volume-avant", 1, "Touche « Noter le volume » : c'est le volume du liquide, sans le cylindre.", "volume");
  }
  // ----- dans le liquide connu : le poids apparent, puis le volume avec le cylindre -----
  const apres = n[`${ref.id}:apres`];
  const poidsFait = bonne(n[`${ref.id}:poids`], true), volumeFait = apres !== undefined && apres.solide === s.id && apres.immerge >= 0.999;
  if (!poidsFait || !volumeFait) {
    const i = immerger(ref, 2, 2);
    if (i) return i;
    if (!poidsFait) return bouton(`noter-poids-${ref.id}`, 3, "Le cylindre est sous la surface, sans toucher le fond. Touche « Noter le poids ».", "poids");
    return bouton("noter-volume-apres", 3, "Touche « Noter le volume » : c'est le volume avec le cylindre.", "volume");
  }
  // ----- dans le liquide inconnu : le poids apparent -----
  if (!bonne(n[`${x.id}:poids`], true)) {
    const i = immerger(x, 5, 4);
    if (i) return i;
    return bouton(`noter-poids-${x.id}`, 5, "Le cylindre est sous la surface, sans toucher le fond. Touche « Noter le poids ».", "poids");
  }
  return fini;
}
