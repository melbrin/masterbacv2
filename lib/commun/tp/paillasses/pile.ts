// La paillasse Pile (décision 0012) : des béchers de solutions, des lames de métal, un pont salin, un multimètre et ses
// fils. L'élève plonge chaque lame dans sa solution, pose le pont salin entre deux béchers, tourne le sélecteur du
// multimètre sur le voltmètre en courant continu et sur le bon calibre, tire un fil de la borne COM et un fil de la
// borne V jusqu'aux lames, lit la tension et son signe, et en déduit la borne positive.
// Chaque geste a ses conséquences : sans pont salin le circuit est ouvert et le voltmètre affiche zéro, un calibre trop
// petit affiche un dépassement, un calibre trop grand perd des chiffres, des fils inversés changent le signe, et le
// multimètre branché en ampèremètre aux bornes de la pile fait sauter son fusible.
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Les tensions et les potentiels sont en volts.
import { nombre, nombreRelatif } from "@/lib/commun/format";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

export interface DemiPile {
  /** quelques lettres minuscules : « zn ». C'est aussi le nom de la borne de sa lame. */
  id: string;
  /** le métal de la lame, dans une phrase : « le zinc » */
  metal: string;
  /** son symbole, écrit sur la lame : « Zn » */
  symbole: string;
  /** ce qui est écrit sur le bécher : « sulfate de zinc » */
  solution: string;
  /** le potentiel de la lame plongée dans sa propre solution */
  potentiel: number;
  /** la teinte de la solution : 0 incolore, 1 bleue, 2 vert pâle, 3 verte */
  teinte: number;
}

export interface ReglagesPile {
  /** les demi-piles, dans l'ordre des béchers sur la paillasse */
  demiPiles: DemiPile[];
  /** les piles à construire et à mesurer : pour chacune, ses deux lames */
  piles: [string, string][];
}

/** Les positions du sélecteur du multimètre, dans l'ordre où on le tourne. */
export const POSITIONS = [
  { nom: "arrêt", genre: "arret", calibre: 0 },
  { nom: "200 V", genre: "continu", calibre: 200 },
  { nom: "20 V", genre: "continu", calibre: 20 },
  { nom: "2 V", genre: "continu", calibre: 2 },
  { nom: "200 mV", genre: "continu", calibre: 0.2 },
  { nom: "V ~", genre: "alternatif", calibre: 200 },
  { nom: "mA", genre: "courant", calibre: 0.2 },
] as const;
/** Les bornes du multimètre : la commune, celle du voltmètre, celle de l'ampèremètre. */
export const BORNES = ["com", "v", "a"] as const;
/** Le nombre de fils de la paillasse. */
export const FILS_MAX = 4;
/** Un afficheur à 2 000 points : au-delà de 1 999, il affiche un dépassement. */
const POINTS = 2000;
/** Une lame plongée dans une solution qui ne contient pas ses ions n'a pas un potentiel net : il est plus bas. */
const SANS_IONS = 0.18;

/** Une tension notée : ce que l'élève a écrit, et l'état du montage à ce moment-là. */
export interface TensionNotee {
  /** la valeur notée, sans son signe */
  v: number;
  /** la lame que l'élève donne pour borne positive */
  plus: string;
  /** la lame reliée à la borne V, puis celle reliée à la borne COM */
  couple: [string, string];
  /** la tension affichée, avec son signe ; null si l'afficheur ne montrait pas une tension */
  affiche: number | null;
  /** la position du sélecteur */
  position: number;
  /** vrai si un pont salin reliait les deux béchers ; vrai si un fil reliait directement les deux lames */
  pont: boolean;
  court: boolean;
  /** vrai si chaque lame trempait dans sa propre solution */
  propres: boolean;
}

export interface EtatPile {
  /** pour chaque lame, le bécher où elle trempe ; absente si elle est sur le plateau */
  lames: Record<string, string>;
  /** les deux béchers que relie le pont salin ; null s'il est rangé */
  pont: [string, string] | null;
  /** la position du sélecteur du multimètre */
  selecteur: number;
  /** les fils posés : chacun relie deux bornes */
  fils: [string, string][];
  /** faux une fois que le fusible de l'ampèremètre a sauté */
  fusible: boolean;
  /** les tensions notées, par pile : « cu-zn » */
  notes: Record<string, TensionNotee>;
}

const millieme = (x: number) => Math.round(x * 1000) / 1000;
const volts = (x: number, d = 3) => `${nombre(x, d)} V`;
const signe = (x: number, d = 3) => `${x > 0 ? "+" : ""}${nombreRelatif(x, d)} V`;
const memeFil = (f: [string, string], a: string, b: string) => (f[0] === a && f[1] === b) || (f[0] === b && f[1] === a);
/** Le nom d'une pile : ses deux lames, dans l'ordre de l'alphabet. */
export const clePile = (a: string, b: string): string => [a, b].sort().join("-");

const DEPART: EtatPile = { lames: {}, pont: null, selecteur: 0, fils: [], fusible: true, notes: {} };

export const demiPileDe = (r: ReglagesPile, id: string | null | undefined): DemiPile | null => r.demiPiles.find((d) => d.id === id) ?? null;
/** Toutes les bornes de la paillasse : celles du multimètre, puis une par lame. */
export const bornes = (r: ReglagesPile): string[] => [...BORNES, ...r.demiPiles.map((d) => d.id)];

/**
 * Le potentiel d'une lame dans le bécher où elle trempe. Dans sa propre solution, c'est celui de sa demi-pile. Dans une
 * autre : un métal plus réducteur que celui de la solution se couvre de ce métal et prend son potentiel ; sinon, sans
 * ses ions autour d'elle, la lame est à un potentiel plus bas que le sien.
 */
export function potentiel(r: ReglagesPile, lame: string, becher: string): number {
  const l = demiPileDe(r, lame), b = demiPileDe(r, becher);
  if (!l || !b) return 0;
  return l.id === b.id ? l.potentiel : l.potentiel < b.potentiel ? b.potentiel : l.potentiel - SANS_IONS;
}
/** La tension à vide de la pile faite de deux lames, chacune dans sa propre solution : celle de la première moins celle de la seconde. */
export const tensionDe = (r: ReglagesPile, a: string, b: string): number => millieme((demiPileDe(r, a)?.potentiel ?? 0) - (demiPileDe(r, b)?.potentiel ?? 0));

/** Les bornes que des fils relient entre elles portent le même nom de nœud. */
function noeuds(r: ReglagesPile, fils: readonly [string, string][]): (borne: string) => string {
  const parent = new Map(bornes(r).map((b) => [b, b]));
  const noeud = (b: string): string => { let x = b; while (parent.get(x) !== x) x = parent.get(x) ?? x; return x; };
  for (const [a, b] of fils) if (parent.has(a) && parent.has(b)) parent.set(noeud(a), noeud(b));
  return noeud;
}
/** Vrai si le pont salin relie ces deux béchers. */
const ponte = (etat: EtatPile, a: string, b: string): boolean => etat.pont !== null && clePile(etat.pont[0], etat.pont[1]) === clePile(a, b);

/** Ce que le multimètre a entre sa borne V et sa borne COM. */
export interface Mesure {
  /** la lame reliée à la borne V, puis celle reliée à la borne COM, quand elles trempent dans deux béchers ; sinon null */
  couple: [string, string] | null;
  /** la tension entre la borne V et la borne COM */
  tension: number;
  pont: boolean;
  /** vrai si un fil relie directement les deux lames : la pile est en court-circuit */
  court: boolean;
}

/** Lit le montage : quelles lames les fils amènent aux bornes V et COM, et la tension qui en résulte. */
export function mesure(r: ReglagesPile, etat: EtatPile): Mesure {
  const noeud = noeuds(r, etat.fils);
  const trempees = (n: string) => r.demiPiles.map((d) => d.id).filter((l) => etat.lames[l] !== undefined && noeud(l) === n);
  const cote = { v: trempees(noeud("v")), com: trempees(noeud("com")) };
  // les deux bornes au même nœud : un fil relie les deux lames, ou les deux bornes
  if (noeud("v") === noeud("com")) {
    const deux = cote.v.find((l) => etat.lames[l] !== etat.lames[cote.v[0]]);
    return deux ? { couple: [cote.v[0], deux], tension: 0, pont: ponte(etat, etat.lames[cote.v[0]], etat.lames[deux]), court: true } : { couple: null, tension: 0, pont: false, court: false };
  }
  const a = cote.v[0], b = cote.com.find((l) => etat.lames[l] !== etat.lames[a]);
  if (a === undefined || b === undefined) return { couple: null, tension: 0, pont: false, court: false };
  const pont = ponte(etat, etat.lames[a], etat.lames[b]);
  // sans pont salin, aucun ion ne passe d'un bécher à l'autre : le circuit est ouvert
  return { couple: [a, b], tension: pont ? Math.round((potentiel(r, a, etat.lames[a]) - potentiel(r, b, etat.lames[b])) * 1e4) / 1e4 : 0, pont, court: false };
}

/** Vrai si la borne de l'ampèremètre et la borne COM sont aux deux bornes d'une pile : rien ne limite le courant. */
function courtCircuit(r: ReglagesPile, etat: EtatPile): boolean {
  const noeud = noeuds(r, etat.fils);
  if (noeud("a") === noeud("com")) return false;
  const ids = r.demiPiles.map((d) => d.id).filter((l) => etat.lames[l] !== undefined);
  return ids.some((a) => noeud(a) === noeud("a") && ids.some((b) => noeud(b) === noeud("com") && etat.lames[a] !== etat.lames[b] && ponte(etat, etat.lames[a], etat.lames[b])));
}

/** Ce que montre l'afficheur du multimètre. */
export interface Affichage {
  eteint: boolean;
  texte: string;
  unite: string;
  /** la tension affichée, en volts, avec son signe ; null si l'afficheur ne montre pas une tension lisible */
  valeur: number | null;
  /** vrai si la tension dépasse le calibre */
  depasse: boolean;
}

export function affichage(r: ReglagesPile, etat: EtatPile): Affichage {
  const position = POSITIONS[etat.selecteur] ?? POSITIONS[0];
  if (position.genre === "arret") return { eteint: true, texte: "", unite: "", valeur: null, depasse: false };
  // en alternatif, la tension constante d'une pile ne donne rien ; en ampèremètre, aucun courant ne passe
  if (position.genre === "alternatif") return { eteint: false, texte: nombre(0, 1), unite: "V", valeur: 0, depasse: false };
  if (position.genre === "courant") return { eteint: false, texte: nombre(0, 1), unite: "mA", valeur: null, depasse: false };
  const { tension } = mesure(r, etat);
  const pas = position.calibre / POINTS;
  const points = Math.round(tension / pas);
  const mV = position.calibre < 1;
  if (Math.abs(points) >= POINTS) return { eteint: false, texte: tension < 0 ? "−1 ." : "1 .", unite: mV ? "mV" : "V", valeur: null, depasse: true };
  const valeur = millieme(points * pas * 10) / 10;
  const decimales = position.calibre === 200 ? 1 : position.calibre === 20 ? 2 : position.calibre === 2 ? 3 : 1;
  return { eteint: false, texte: nombreRelatif(mV ? valeur * 1000 : valeur, decimales), unite: mV ? "mV" : "V", valeur, depasse: false };
}

/** Après un changement du montage : si l'ampèremètre se retrouve aux bornes d'une pile, son fusible saute. */
const protege = (r: ReglagesPile, etat: EtatPile): EtatPile => (etat.fusible && courtCircuit(r, etat) ? { ...etat, fusible: false } : etat);

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesPile, etat: EtatPile, g: GesteBrut): EtatPile {
  switch (g.g) {
    // plonger une lame dans un bécher libre, ou la reposer sur le plateau
    case "lame": {
      const l = demiPileDe(r, texteDe(g, "l")), dans = texteDe(g, "dans");
      if (!l) return etat;
      if (dans === "plateau") return etat.lames[l.id] === undefined ? etat : protege(r, { ...etat, lames: Object.fromEntries(Object.entries(etat.lames).filter(([id]) => id !== l.id)) });
      const b = demiPileDe(r, dans);
      if (!b || etat.lames[l.id] === b.id || Object.values(etat.lames).includes(b.id)) return etat;
      return protege(r, { ...etat, lames: { ...etat.lames, [l.id]: b.id } });
    }
    // poser le pont salin entre deux béchers, ou le ranger
    case "pont": {
      const a = demiPileDe(r, texteDe(g, "a")), b = demiPileDe(r, texteDe(g, "b"));
      if (texteDe(g, "a") === "repos") return etat.pont === null ? etat : { ...etat, pont: null };
      if (!a || !b || a.id === b.id || (etat.pont !== null && ponte(etat, a.id, b.id))) return etat;
      return protege(r, { ...etat, pont: [a.id, b.id] });
    }
    case "selecteur": {
      const v = nombreDe(g, "v");
      return v === null || !Number.isInteger(v) || v < 0 || v >= POSITIONS.length || v === etat.selecteur ? etat : { ...etat, selecteur: v };
    }
    case "relier": {
      const a = texteDe(g, "a"), b = texteDe(g, "b");
      const connues = bornes(r);
      if (a === null || b === null || a === b || !connues.includes(a) || !connues.includes(b) || etat.fils.length >= FILS_MAX || etat.fils.some((f) => memeFil(f, a, b))) return etat;
      return protege(r, { ...etat, fils: [...etat.fils, [a, b]] });
    }
    case "retirer": {
      const a = texteDe(g, "a"), b = texteDe(g, "b");
      return a !== null && b !== null && etat.fils.some((f) => memeFil(f, a, b)) ? { ...etat, fils: etat.fils.filter((f) => !memeFil(f, a, b)) } : etat;
    }
    // noter la tension lue sur l'afficheur, et la lame que l'on juge positive
    case "noter": {
      const v = nombreDe(g, "v"), plus = texteDe(g, "plus");
      const m = mesure(r, etat);
      if (v === null || v < 0 || v > 300 || !m.couple || plus === null || !m.couple.includes(plus)) return etat;
      const note: TensionNotee = {
        v: millieme(v), plus, couple: m.couple, affiche: affichage(r, etat).valeur, position: etat.selecteur, pont: m.pont, court: m.court,
        propres: m.couple.every((l) => etat.lames[l] === l),
      };
      return { ...etat, notes: { ...etat.notes, [clePile(m.couple[0], m.couple[1])]: note } };
    }
    default: return etat;
  }
}

/** Les valeurs d'une manipulation sans défaut : pour chaque pile demandée, sa tension, et 1 si sa seconde lame est la borne positive. */
export function mesuresExactes(r: ReglagesPile): Record<string, number> {
  return Object.fromEntries(r.piles.flatMap(([a, b], i) => [[`U${i + 1}`, Math.abs(tensionDe(r, a, b))], [`P${i + 1}`, tensionDe(r, b, a) > 0 ? 1 : 0]]));
}

/** Le bilan de la manipulation : la tension et la borne positive de chaque pile, et les fautes relevées par le professeur. */
function bilan(r: ReglagesPile, etat: EtatPile): BilanPaillasse {
  const fautes: Faute[] = [];
  /** une même faute, faite à plusieurs piles, n'est dite qu'une fois */
  const faute = (code: string, grave: boolean, texte: string) => { if (!fautes.some((f) => f.code === code)) fautes.push({ code, grave, texte }); };
  const exact = mesuresExactes(r);
  const mesures: Record<string, number> = {};
  const lignes: string[] = [];
  const le = (id: string) => demiPileDe(r, id)?.metal ?? id;
  const notees = r.piles.map(([a, b]) => etat.notes[clePile(a, b)]);
  const rien = notees.every((n) => n === undefined);

  if (rien) faute("mesures", true, "Tu n'as noté aucune tension : la manipulation n'est pas faite.");
  if (!etat.fusible) faute("courtcircuit", true, "Tu as branché la borne de l'ampèremètre et la borne COM aux deux lames d'une pile : rien ne limitait le courant, et le fusible du multimètre a sauté. Pour mesurer une tension, on branche la borne V et la borne COM.");
  r.piles.forEach(([a, b], i) => {
    const n = notees[i];
    const nom = `la pile ${le(a).replace(/^(le |l')/, "")}-${le(b).replace(/^(le |l')/, "")}`;
    const vraie = Math.abs(tensionDe(r, a, b));
    const positive = tensionDe(r, a, b) > 0 ? a : b;
    if (!n) {
      if (!rien) faute("manque", true, `Tu n'as pas noté la tension de ${nom}.`);
      mesures[`U${i + 1}`] = exact[`U${i + 1}`];
      mesures[`P${i + 1}`] = exact[`P${i + 1}`];
      if (!rien) lignes.push(`Sans mesure pour ${nom}, on continue avec les valeurs du professeur : ${volts(vraie)}, borne positive : ${le(positive)}.`);
      return;
    }
    mesures[`U${i + 1}`] = n.v;
    mesures[`P${i + 1}`] = n.plus === b ? 1 : 0;
    lignes.push(`Pour ${nom}, tu as noté ${volts(n.v)}, borne positive : ${le(n.plus)}. Sans défaut : ${volts(vraie)}, borne positive : ${le(positive)}.`);
    const position = POSITIONS[n.position] ?? POSITIONS[0];
    // le montage
    if (!n.propres) faute("lame", true, `Pour ${nom}, une lame ne trempait pas dans sa propre solution : la demi-pile n'est plus celle du métal et de ses ions. Chaque lame va dans la solution de son métal.`);
    if (n.court) faute("fils", true, `Pour ${nom}, un fil reliait directement les deux lames : la pile était en court-circuit, et le voltmètre n'avait plus rien à mesurer.`);
    else if (!n.pont) faute("pont", true, `Pour ${nom}, aucun pont salin ne reliait les deux béchers : le circuit était ouvert, et le voltmètre affichait zéro. Le pont salin laisse passer les ions d'une solution à l'autre.`);
    // le multimètre
    if (position.genre === "arret") faute("multimetre", true, `Pour ${nom}, le multimètre était à l'arrêt : il n'affichait rien.`);
    else if (position.genre === "alternatif") faute("multimetre", true, `Pour ${nom}, le sélecteur était sur le voltmètre alternatif : la tension d'une pile est continue, et l'afficheur restait à zéro. Tourne-le sur les calibres en courant continu.`);
    else if (position.genre === "courant") faute("multimetre", true, `Pour ${nom}, le sélecteur était sur l'ampèremètre : il ne mesure pas une tension. Tourne-le sur les calibres du voltmètre en courant continu.`);
    else if (n.affiche === null) faute("calibre", true, `Pour ${nom}, le calibre ${position.nom} était trop petit : l'afficheur montrait un dépassement, pas une tension. Choisis le plus petit calibre qui dépasse la tension.`);
    else {
      const pas = position.calibre / POINTS;
      if (Math.abs(n.v - Math.abs(n.affiche)) > 0.6 * pas + 1e-9) faute("lecture", Math.abs(n.v - Math.abs(n.affiche)) > 0.05, `Pour ${nom}, tu as noté ${volts(n.v)} ; l'afficheur indiquait ${signe(n.affiche, position.calibre >= 200 ? 1 : position.calibre >= 20 ? 2 : 3)}.`);
      // le bon calibre : le plus petit qui dépasse la tension
      const mieux = POSITIONS.filter((p) => p.genre === "continu" && p.calibre < position.calibre && Math.abs(tensionDe(r, n.couple[0], n.couple[1])) < p.calibre - p.calibre / POINTS).pop();
      if (n.pont && !n.court && n.propres && mieux) {
        faute("calibre", false, `Pour ${nom}, tu as mesuré sur le calibre ${position.nom} : l'afficheur ne donnait que ${nombreRelatif(n.affiche, position.calibre >= 200 ? 1 : 2)} V. Le calibre ${mieux.nom}, le plus petit qui dépasse la tension, donne un chiffre de plus.`);
      }
      // la borne positive : la lame de la borne V si la tension affichée est positive, celle de la borne COM sinon
      if (n.pont && !n.court && n.affiche !== 0) {
        const lue = n.affiche > 0 ? n.couple[0] : n.couple[1];
        if (n.plus !== lue) faute("polarite", true, `Pour ${nom}, tu donnes ${le(n.plus)} pour borne positive. L'afficheur indiquait ${signe(n.affiche, position.calibre >= 200 ? 1 : position.calibre >= 20 ? 2 : 3)}, avec la borne V sur ${le(n.couple[0])} et la borne COM sur ${le(n.couple[1])} : la borne positive est ${le(lue)}. Une tension positive dit que la borne V est du côté positif ; une tension négative, que c'est la borne COM.`);
      }
    }
  });
  // sans aucune mesure, la manipulation n'est pas faite, et le professeur donne ses valeurs
  if (rien) lignes.push(`Sans mesure, on continue avec les valeurs du professeur : ${r.piles.map(([a, b]) => `${volts(Math.abs(tensionDe(r, a, b)))} pour la pile ${le(a).replace(/^(le |l')/, "")}-${le(b).replace(/^(le |l')/, "")}`).join(", ")}.`);
  return { score: rien ? 0 : scoreDesFautes(fautes), fautes, mesures, lignes };
}

export const regles: ReglesPaillasse<ReglagesPile, EtatPile> = { depart: () => DEPART, geste, bilan };
