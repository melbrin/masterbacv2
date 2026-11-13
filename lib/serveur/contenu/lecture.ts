import "server-only";
import { indexeSommaire, type Genre, type SommaireIndexe } from "@/lib/moteur";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

// Lecture du contenu des fiches. Le schéma « contenu » n'est lisible que par le rôle de service :
// rien ne sort d'ici vers le navigateur sans que l'appelant ait contrôlé le droit.

export interface ItemLeger { k: Genre; n: number; theme: number; niveau: number; type: string; demande: string; notions: string[]; titre: string; points?: number | null; duree?: number | null; voir_bac?: string | null }
export interface FicheLegere {
  num: number; cle: string; titre: string; titre_court: string; domaine: string;
  themes: { num: number; titre: string; preambule: string; questions: number[]; exercices: number[] }[];
  items: ItemLeger[];
  liste_notions: { id: string; nom: string; refs: [Genre, number][] }[];
}
export interface QuizLeger { id: string; fiche: number; niveau: number; type: string }
export interface Catalogue { version: number; fiches: FicheLegere[]; quiz: QuizLeger[]; sommaire: SommaireIndexe }

export interface FicheComplete { num: number; titre: string; titre_court: string; domaine: string; essentiel_html: string; pieges: string[]; tombe_html: string }
export interface ItemComplet {
  cle: string; fiche: number; genre: Genre; numero: number; theme: number; niveau: number; type: string; demande: string; mention: string;
  points: number | null; duree: number | null; titre_html: string; titre_txt: string; enonce_html: string; intro_html: string; corrige_html: string;
  etapes: { titre: string; html: string }[]; indices: { genre: string; html: string }[]; notions: string[]; version: number;
}
export interface QuizComplet {
  id: string; fiche: number; niveau: number; type: "qcm" | "vrai_faux" | "trou" | "association" | "ordre";
  enonce: { q: string; choix?: string[]; gauches?: string[]; droites?: string[]; elements?: string[] };
  correction: { c?: number; reponse?: boolean | string; acceptees?: string[]; paires?: { left: string; right: string }[]; ordre?: string[] };
  explication: string;
}

let memo: { catalogue: Catalogue; lu: number } | null = null;
const DUREE_MEMO_MS = 30_000;

/** Le sommaire du contenu : fiches, items, notions, quiz, sans énoncé ni corrigé. Gardé en mémoire trente secondes. */
export async function catalogue(): Promise<Catalogue> {
  if (memo && Date.now() - memo.lu < DUREE_MEMO_MS) return memo.catalogue;
  const { data, error } = await clientAdmin().rpc("contenu_sommaire");
  if (error || !data) throw new Error("Le contenu des fiches ne répond pas.");
  const brut = data as unknown as { version: number | null; fiches: FicheLegere[]; quiz: QuizLeger[] };
  if (!brut.fiches.length) throw new Error("Aucun contenu importé : lance « npm run contenu:importer ».");
  const c: Catalogue = { version: brut.version ?? 0, fiches: brut.fiches, quiz: brut.quiz, sommaire: indexeSommaire({ fiches: brut.fiches, quiz: brut.quiz }) };
  memo = { catalogue: c, lu: Date.now() };
  return c;
}

export async function ficheComplete(num: number): Promise<FicheComplete | null> {
  const { data, error } = await clientAdmin().rpc("contenu_fiche", { p_num: num });
  if (error) throw new Error("Le contenu des fiches ne répond pas.");
  return (data as unknown as FicheComplete | null) ?? null;
}

export async function itemsComplets(cles: string[]): Promise<ItemComplet[]> {
  if (!cles.length) return [];
  const { data, error } = await clientAdmin().rpc("contenu_items", { p_cles: cles });
  if (error) throw new Error("Le contenu des fiches ne répond pas.");
  return data as unknown as ItemComplet[];
}

export async function quizComplets(ids: string[]): Promise<QuizComplet[]> {
  if (!ids.length) return [];
  const { data, error } = await clientAdmin().rpc("contenu_quiz", { p_ids: ids });
  if (error) throw new Error("Le contenu des fiches ne répond pas.");
  const parId = new Map((data as unknown as QuizComplet[]).map((q) => [q.id, q]));
  // l'ordre demandé est conservé
  return ids.map((id) => parId.get(id)).filter((q): q is QuizComplet => !!q);
}

export async function figure(chemin: string): Promise<{ chemin: string; corrige_seul: boolean; items: string[] } | null> {
  const { data, error } = await clientAdmin().rpc("contenu_figure", { p_chemin: chemin });
  if (error) throw new Error("Le contenu des fiches ne répond pas.");
  return (data as unknown as { chemin: string; corrige_seul: boolean; items: string[] } | null) ?? null;
}

/** Le fichier d'une figure, lu dans le compartiment privé. L'appelant a déjà contrôlé le droit. */
export async function telechargeFigure(chemin: string): Promise<Blob | null> {
  const { data, error } = await clientAdmin().storage.from("figures").download(chemin);
  return error || !data ? null : data;
}
