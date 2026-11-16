import "server-only";
import { cookies } from "next/headers";
import * as m from "@/lib/moteur";
import { catalogue, quizComplets } from "@/lib/serveur/contenu/lecture";
import { env } from "@/lib/serveur/env";
import { vueDe, type QuestionVue } from "@/lib/serveur/quiz";
import { clientAdmin, OPTIONS_COOKIE } from "@/lib/serveur/supabase/clients";
import { enregistreTentative } from "@/lib/serveur/travail";

// Le test de la page d'accueil : un visiteur sans compte passe un test de quinze minutes. Ses réponses restent sur le
// serveur ; il ne voit ni correction ni score. Quand il crée son compte, le test lui est rattaché et devient son
// premier test de calibrage. Le lien entre le visiteur et son test est un identifiant tiré au hasard, gardé dans un
// cookie illisible par un script.

export const MINUTES_DU_TEST = 15;
const COOKIE = "mb-test";
const JOURS_DU_COOKIE = 2;

export interface TestAccueil {
  id: string;
  fiches: number[];
  questions: string[];
  graine: number;
  reponses: { id: string; juste: boolean }[];
  debut: string;
  limite: string;
  termine_le: string | null;
  user_id: string | null;
}

/** Vrai quand le test n'attend plus de réponse : tout est répondu, ou le temps est écoulé. */
export const testFini = (t: TestAccueil, maintenant = Date.now()): boolean =>
  t.termine_le !== null || t.reponses.length >= t.questions.length || maintenant > Date.parse(t.limite);

async function identifiant(): Promise<string | null> {
  const valeur = (await cookies()).get(COOKIE)?.value ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(valeur) ? valeur : null;
}

/** Le test du visiteur, d'après son cookie ; null s'il n'en a pas, ou s'il est déjà rattaché à un compte. */
export async function testDuVisiteur(): Promise<TestAccueil | null> {
  const id = await identifiant();
  if (!id) return null;
  const { data, error } = await clientAdmin().from("tests_accueil").select("id, fiches, questions, graine, reponses, debut, limite, termine_le, user_id").eq("id", id).maybeSingle();
  if (error) throw new Error("La base ne répond pas.");
  const t = data as unknown as TestAccueil | null;
  return t && t.user_id === null ? t : null;
}

/** Les chapitres qui ont des questions pour le test, avec leur titre. */
export async function chapitresDuTest(): Promise<{ num: number; titre: string }[]> {
  const cat = await catalogue();
  return cat.fiches.filter((f) => (cat.sommaire.quizParFiche.get(f.num) ?? []).length > 0).map((f) => ({ num: f.num, titre: f.titre_court }));
}

/** Crée le test du visiteur sur les chapitres cochés, et pose son cookie. */
export async function creeTest(fiches: number[]): Promise<boolean> {
  const cat = await catalogue();
  const choisies = [...new Set(fiches)].filter((n) => cat.sommaire.parNum.has(n)).sort((a, b) => a - b);
  const graine = 1 + Math.floor(Math.random() * 2_000_000_000);
  const maintenant = Date.now();
  // un visiteur n'a encore rien travaillé : le tirage part d'un état vide
  const vide = { profil: { objectif: m.REGLAGES_ACTUELS.objectifParDefaut }, vuEnClasse: {}, tentatives: {}, carnet: {}, passages: {}, ds: [], seances: [], seance: null };
  const questions = m.questionsCalibrage({ etat: vide, sommaire: cat.sommaire, maintenant, reglages: m.REGLAGES_ACTUELS }, choisies, graine);
  if (!questions.length) return false;
  const { data, error } = await clientAdmin().from("tests_accueil")
    .insert({ fiches: choisies, questions, graine, limite: new Date(maintenant + MINUTES_DU_TEST * 60_000).toISOString() }).select("id").single();
  if (error || !data) throw new Error("La base ne répond pas.");
  (await cookies()).set(COOKIE, data.id, { ...OPTIONS_COOKIE, secure: env().APP_ENV !== "local", maxAge: JOURS_DU_COOKIE * 86_400 });
  return true;
}

/** La question qui attend une réponse, sans sa clé ; null quand le test est fini. */
export async function questionDuTest(t: TestAccueil): Promise<{ vue: QuestionVue; rang: number; total: number } | null> {
  if (testFini(t)) return null;
  const rang = t.reponses.length;
  const [q] = await quizComplets([t.questions[rang]]);
  return q ? { vue: vueDe(q, t.graine, rang), rang, total: t.questions.length } : null;
}

/** Écrit la réponse à la question attendue, tant que le test n'est rattaché à aucun compte. */
export async function noteReponse(t: TestAccueil, reponse: { id: string; juste: boolean }): Promise<TestAccueil> {
  const reponses = [...t.reponses, reponse];
  const fini = reponses.length >= t.questions.length;
  const { data, error } = await clientAdmin().from("tests_accueil")
    .update({ reponses, ...(fini ? { termine_le: new Date().toISOString() } : {}) })
    .eq("id", t.id).is("user_id", null).select("id");
  if (error) throw new Error("La base ne répond pas.");
  return data?.length ? { ...t, reponses, termine_le: fini ? new Date().toISOString() : null } : t;
}

/**
 * Rattache le test du visiteur au compte qu'il vient d'ouvrir : il devient son premier test de calibrage, ses chapitres
 * deviennent ses chapitres vus en classe, et ses réponses comptent dans ses progrès. Ne fait rien sans test, et ne
 * rattache un test qu'une fois. Rend vrai si un test a été rattaché.
 */
export async function rattacheTest(userId: string, noteVisee: number): Promise<boolean> {
  const t = await testDuVisiteur();
  if (!t || t.reponses.length === 0) return false;
  const base = clientAdmin();
  const maintenant = new Date().toISOString();
  // la prise du test : une seule requête la gagne
  const { data: pris } = await base.from("tests_accueil").update({ user_id: userId, rattache_le: maintenant, termine_le: t.termine_le ?? maintenant })
    .eq("id", t.id).is("user_id", null).select("id");
  if (!pris?.length) return false;
  const bonnes = t.reponses.filter((r) => r.juste).length;
  const session = await base.from("quiz_sessions")
    .insert({ user_id: userId, genre: "calibrage", questions: t.questions, secret: { graine: t.graine, fiches: t.fiches }, reponses: t.reponses, debut: t.debut, termine_le: maintenant, bonnes })
    .select("id").single();
  if (session.error || !session.data) throw new Error("La base ne répond pas.");
  await base.from("vu_en_classe").upsert(t.fiches.map((fiche) => ({ user_id: userId, fiche })), { onConflict: "user_id,fiche", ignoreDuplicates: true });
  for (const r of t.reponses) await enregistreTentative(userId, noteVisee, m.cleQuiz(r.id), r.juste ? "ok" : "ko", null, "calibrage", { session: session.data.id });
  (await cookies()).delete(COOKIE);
  return true;
}
