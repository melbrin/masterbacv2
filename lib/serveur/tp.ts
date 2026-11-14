import "server-only";
import { nombre } from "@/lib/commun/format";
import { melangeGraine } from "@/lib/commun/jeux";
import { PLAFOND_AVEC_GUIDE, guideServi, niveauPour, rejoue, sansMarqueDuGuide, type Bilan, type Competence, type EtapePublique, type ReglesPaillasse, type ReponseEtape, type RetourEtape } from "@/lib/commun/tp/types";
import { TP, type EtapeTp, type Mesures, type Tp } from "@/lib/serveur/contenu/tp";
import { env } from "@/lib/serveur/env";
import { clientUtilisateur } from "@/lib/serveur/supabase/clients";

/** Un TP en brouillon ne se montre qu'en local, ou à l'administrateur (même règle que les défis du labo). Un TP en construction ne se montre pas. */
export const tpVisible = (t: Tp, admin: boolean): boolean => t.pret !== false && (t.etat === "valide" || admin || env().APP_ENV === "local");
export const tpVisibles = (admin: boolean): Tp[] => TP.filter((t) => tpVisible(t, admin));

// ---------- les règles des paillasses ----------

export type Regles = ReglesPaillasse<unknown, unknown>;
/**
 * Les règles de chaque paillasse, chargées à la demande : le serveur rejoue avec elles les gestes de l'élève.
 * Seules les paillasses relues et essayées sont inscrites ici (voir components/tp/paillasses/index.tsx).
 */
const REGLES: Record<string, () => Promise<{ regles: Regles }>> = {
  titrage: () => import("@/lib/commun/tp/paillasses/titrage"),
  reflux: () => import("@/lib/commun/tp/paillasses/reflux"),
  ccm: () => import("@/lib/commun/tp/paillasses/ccm"),
  solutions: () => import("@/lib/commun/tp/paillasses/solutions"),
  spectro: () => import("@/lib/commun/tp/paillasses/spectro"),
  circuit: () => import("@/lib/commun/tp/paillasses/circuit"),
  microcontroleur: () => import("@/lib/commun/tp/paillasses/microcontroleur"),
  optique: () => import("@/lib/commun/tp/paillasses/optique"),
  diffraction: () => import("@/lib/commun/tp/paillasses/diffraction"),
  ultrasons: () => import("@/lib/commun/tp/paillasses/ultrasons"),
  pointage: () => import("@/lib/commun/tp/paillasses/pointage"),
  doppler: () => import("@/lib/commun/tp/paillasses/doppler"),
};
export const GENRES_DE_PAILLASSE = Object.keys(REGLES);
/** Les règles d'une paillasse ; null si ce genre n'existe pas. */
export async function reglesDe(genre: string): Promise<Regles | null> {
  const charge = Object.hasOwn(REGLES, genre) ? REGLES[genre] : null;
  return charge ? (await charge()).regles : null;
}

// ---------- ce que le navigateur reçoit ----------

/** L'ordre dans lequel les étapes d'un protocole sont présentées : mélangé avec la graine de l'essai, jamais dans un bon ordre. */
function presentation(etape: Extract<EtapeTp, { genre: "ordre" }>, graine: number): number[] {
  const rangs = etape.etapes.map((_, i) => i);
  const bons = [rangs, ...(etape.autres ?? [])].map((o) => o.join());
  let ordre = melangeGraine(rangs, graine);
  // si le hasard donne un bon ordre, on décale tout d'un cran
  for (let i = 0; i < rangs.length && bons.includes(ordre.join()); i++) ordre = [...ordre.slice(1), ordre[0]];
  return ordre;
}

/** Une étape sans sa réponse, telle que le navigateur la reçoit. */
export function etapePublique(etape: EtapeTp, graine: number): EtapePublique {
  switch (etape.genre) {
    case "lecture": return { genre: "lecture", titre: etape.titre, paragraphes: etape.paragraphes, documents: etape.documents };
    case "materiel": return { genre: "materiel", competence: etape.competence, consigne: etape.consigne, objets: etape.objets.map((o) => ({ id: o.id, nom: o.nom })) };
    case "ordre": return { genre: "ordre", competence: etape.competence, consigne: etape.consigne, etapes: presentation(etape, graine).map((i) => etape.etapes[i]) };
    case "choix": return { genre: "choix", competence: etape.competence, question: etape.question, options: etape.options };
    case "paillasse": return { genre: "paillasse", competence: etape.competence, consigne: etape.consigne, protocole: etape.protocole, paillasse: etape.paillasse };
    case "valeur": return { genre: "valeur", competence: etape.competence, question: etape.question, unite: etape.unite, aide: etape.aide };
  }
}

// ---------- la vérification d'une étape ----------

/** Vrai si deux ordres ne diffèrent que par deux étapes voisines échangées. */
const voisins = (a: number[], b: number[]): boolean => {
  const ecarts = a.map((x, i) => (x === b[i] ? -1 : i)).filter((i) => i >= 0);
  return ecarts.length === 2 && ecarts[1] === ecarts[0] + 1 && a[ecarts[0]] === b[ecarts[1]] && a[ecarts[1]] === b[ecarts[0]];
};

/**
 * Vérifie la réponse à une étape, comme le professeur à un appel : un score de 0 à 1 et la correction.
 * Renvoie aussi les mesures tirées de la manipulation, pour les étapes d'exploitation. Vide si la réponse n'est pas du genre de l'étape.
 * `trouveRegles` donne les règles d'une paillasse : celles de l'application, ou celles d'un chantier en construction.
 */
export async function verifie(etape: EtapeTp, reponse: ReponseEtape, mesures: Mesures, graine: number, trouveRegles: (genre: string) => Promise<Regles | null> = reglesDe): Promise<{ retour: RetourEtape; mesures?: Mesures } | null> {
  if (etape.genre === "lecture" && reponse.g === "lecture") return { retour: { score: 1, correction: { genre: "lecture" } } };
  if (etape.genre === "materiel" && reponse.g === "materiel") {
    const choisis = new Set(reponse.choisis);
    const erreurs = etape.objets.filter((o) => o.utile !== choisis.has(o.id)).length;
    return { retour: { score: erreurs === 0 ? 1 : erreurs === 1 ? 0.5 : 0, correction: { genre: "materiel", utiles: etape.objets.filter((o) => o.utile).map((o) => o.id), pourquoi: Object.fromEntries(etape.objets.map((o) => [o.id, o.pourquoi])) } } };
  }
  if (etape.genre === "ordre" && reponse.g === "ordre") {
    const montre = presentation(etape, graine);
    const n = etape.etapes.length;
    if (reponse.ordre.length !== n || new Set(reponse.ordre).size !== n || reponse.ordre.some((i) => !Number.isInteger(i) || i < 0 || i >= n)) return null;
    const donne = reponse.ordre.map((place) => montre[place]);
    const bons = [etape.etapes.map((_, i) => i), ...(etape.autres ?? [])];
    const score = bons.some((b) => b.join() === donne.join()) ? 1 : bons.some((b) => voisins(b, donne)) ? 0.5 : 0;
    return { retour: { score, correction: { genre: "ordre", etapes: etape.etapes } } };
  }
  if (etape.genre === "choix" && reponse.g === "choix") {
    const bonne = typeof etape.bonne === "function" ? etape.bonne(mesures) : etape.bonne;
    const explication = typeof etape.explication === "function" ? etape.explication(mesures) : etape.explication;
    return { retour: { score: reponse.choix === bonne ? 1 : 0, correction: { genre: "choix", bonne, explication } } };
  }
  if (etape.genre === "valeur" && reponse.g === "valeur") {
    const attendu = etape.attendu(mesures);
    const marge = Math.max(etape.absolu ?? 0, (etape.relatif ?? 0) * Math.abs(attendu));
    return { retour: { score: Math.abs(reponse.valeur - attendu) <= marge ? 1 : 0, correction: { genre: "valeur", attendu: `${nombre(attendu, etape.decimales)} ${etape.unite}`, detail: etape.detail(mesures) } } };
  }
  if (etape.genre === "paillasse" && reponse.g === "paillasse") {
    // le serveur rejoue les gestes de l'élève avec les règles de la paillasse : le résultat ne se déclare pas
    const regles = await trouveRegles(etape.paillasse.genre);
    if (!regles) return null;
    const r = etape.paillasse.reglages;
    const b = regles.bilan(r, rejoue(regles, r, sansMarqueDuGuide(reponse.gestes)));
    // avec le guide, une main a montré chaque geste : comme à l'épreuve, une manipulation aidée ne vaut pas le niveau A
    const guide = guideServi(reponse.gestes);
    const score = Math.max(0, Math.min(guide ? PLAFOND_AVEC_GUIDE : 1, Number.isFinite(b.score) ? b.score : 0));
    return { retour: { score, correction: { genre: "paillasse", fautes: b.fautes, mesures: b.lignes, ...(guide ? { guide: true } : {}) } }, mesures: b.mesures };
  }
  return null;
}

/** Le bilan d'un TP : pour chaque compétence, le niveau qui correspond à la moyenne des scores de ses étapes. */
export function bilanDuTp(etapes: readonly EtapeTp[], scores: readonly number[]): Bilan {
  const parCompetence = new Map<Competence, number[]>();
  etapes.forEach((e, i) => {
    if (e.genre === "lecture" || scores[i] === undefined) return;
    parCompetence.set(e.competence, [...(parCompetence.get(e.competence) ?? []), scores[i]]);
  });
  return Object.fromEntries([...parCompetence].map(([c, s]) => [c, niveauPour(s.reduce((a, b) => a + b, 0) / s.length)]));
}

// ---------- les essais de l'élève ----------

export interface Essai {
  id: string;
  tp: string;
  graine: number;
  /** ce que le serveur a répondu à chaque étape validée */
  retours: RetourEtape[];
  mesures: Mesures;
  bilan: Bilan | null;
}

/** Un essai de l'élève, lu avec ses propres droits. */
export async function essaiDe(userId: string, id: string): Promise<Essai | null> {
  const base = await clientUtilisateur();
  const { data, error } = await base.from("tp_essais").select("id, tp, graine, etapes, mesures, niveaux").eq("user_id", userId).eq("id", id).maybeSingle();
  if (error) throw new Error("La base ne répond pas.");
  return data ? { id: data.id, tp: data.tp, graine: data.graine, retours: data.etapes as unknown as RetourEtape[], mesures: data.mesures as Mesures, bilan: data.niveaux as Bilan | null } : null;
}

const POINTS: Record<string, number> = { A: 3, B: 2, C: 1, D: 0 };
/** La valeur d'un bilan, pour garder le meilleur : la somme des niveaux. */
const valeur = (b: Bilan): number => Object.values(b).reduce((s, n) => s + (POINTS[n] ?? 0), 0);

/**
 * Pour chaque TP, l'essai laissé en route que la page propose de reprendre : le plus récent où l'élève a validé au moins
 * une étape, sauf s'il a refait ce TP en entier depuis.
 */
export function essaisAReprendre(finis: { tp: string; cree_le: string }[], ouverts: { id: string; tp: string; cree_le: string }[]): Map<string, string> {
  const dernierFini = new Map<string, number>();
  for (const l of finis) dernierFini.set(l.tp, Math.max(dernierFini.get(l.tp) ?? 0, Date.parse(l.cree_le)));
  const reprises = new Map<string, string>();
  for (const l of [...ouverts].sort((a, b) => Date.parse(b.cree_le) - Date.parse(a.cree_le))) {
    if (!reprises.has(l.tp) && Date.parse(l.cree_le) > (dernierFini.get(l.tp) ?? 0)) reprises.set(l.tp, l.id);
  }
  return reprises;
}

/** Le meilleur bilan de l'élève à chaque TP terminé, le nombre de TP terminés, et ses TP laissés en route. Lu avec ses propres droits. */
export async function bilansDesTp(userId: string): Promise<{ meilleurs: Map<string, Bilan>; termines: number; enCours: Map<string, string> }> {
  const base = await clientUtilisateur();
  const [finis, ouverts] = await Promise.all([
    base.from("tp_essais").select("tp, niveaux, cree_le").eq("user_id", userId).not("termine_le", "is", null).limit(500),
    // un essai compte comme commencé dès sa première étape validée
    base.from("tp_essais").select("id, tp, cree_le").eq("user_id", userId).is("termine_le", null).neq("etapes", "[]").order("cree_le", { ascending: false }).limit(50),
  ]);
  if (finis.error || ouverts.error) throw new Error("La base ne répond pas.");
  const meilleurs = new Map<string, Bilan>();
  for (const l of finis.data ?? []) {
    const b = l.niveaux as Bilan;
    const avant = meilleurs.get(l.tp);
    if (!avant || valeur(b) > valeur(avant)) meilleurs.set(l.tp, b);
  }
  return { meilleurs, termines: (finis.data ?? []).length, enCours: essaisAReprendre(finis.data ?? [], ouverts.data ?? []) };
}
