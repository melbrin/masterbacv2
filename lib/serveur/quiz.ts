import "server-only";
import { randomInt } from "node:crypto";
import { melange } from "@/lib/moteur";
import type { TypeQuiz } from "@/lib/commun/quiz";
import { quizComplets, type QuizComplet } from "@/lib/serveur/contenu/lecture";
import { ecritPartie } from "@/lib/serveur/jeux";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

/** Ce que le navigateur reçoit d'une question : l'énoncé et les choix, jamais la clé. */
export interface QuestionVue {
  type: TypeQuiz;
  niveau: number;
  q: string;
  choix?: string[];
  gauches?: string[];
  droites?: string[];
  elements?: string[];
}
export interface SessionQuiz {
  id: string;
  user_id: string;
  genre: string;
  fiche: number | null;
  niveau: number | null;
  questions: string[];
  secret: { graine?: number; ds?: string; seance?: string; jeu?: "chrono" | "vraifaux" | "ordre"; fiches?: number[] };
  reponses: { id: string; juste: boolean }[];
  debut: string;
  limite: string | null;
  termine_le: string | null;
  bonnes: number | null;
}

export const nouvelleGraine = () => randomInt(1, 2 ** 31 - 1);

/** L'ordre des choix d'une question dans une session : fixé par le serveur, différent d'une session à l'autre. */
export function choixMelanges(q: QuizComplet, graine: number, rang: number): string[] {
  const g = graine + rang * 7919;
  if (q.type === "qcm") return melange(q.enonce.choix ?? [], g);
  if (q.type === "association") return melange(q.enonce.droites ?? [], g);
  if (q.type === "ordre") {
    const m = melange(q.enonce.elements ?? [], g);
    // un tirage qui retombe sur le bon ordre donnerait la réponse : on l'inverse
    return m.every((e, i) => e === q.enonce.elements?.[i]) ? m.slice().reverse() : m;
  }
  return [];
}

export function vueDe(q: QuizComplet, graine: number, rang: number): QuestionVue {
  const base = { type: q.type, niveau: q.niveau, q: q.enonce.q };
  if (q.type === "qcm") return { ...base, choix: choixMelanges(q, graine, rang) };
  if (q.type === "association") return { ...base, gauches: q.enonce.gauches, droites: choixMelanges(q, graine, rang) };
  if (q.type === "ordre") return { ...base, elements: choixMelanges(q, graine, rang) };
  return base;
}

/** Lit une session de quiz en vérifiant qu'elle appartient bien à la personne. */
export async function sessionDe(userId: string, id: string): Promise<SessionQuiz | null> {
  const { data } = await clientAdmin().from("quiz_sessions").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  return (data as unknown as SessionQuiz | null) ?? null;
}

export async function questionCourante(s: SessionQuiz): Promise<{ q: QuizComplet; vue: QuestionVue; rang: number } | null> {
  const rang = s.reponses.length;
  if (s.termine_le || rang >= s.questions.length) return null;
  const [q] = await quizComplets([s.questions[rang]]);
  return q ? { q, vue: vueDe(q, s.secret.graine ?? 1, rang), rang } : null;
}

export interface FinDeJeu { score: number; bonnes: number; total: number; record: number | null; battu: boolean }

/**
 * Termine une partie d'un jeu corrigé par le serveur : la session est marquée, le score compté, la partie écrite.
 * La mise à jour ne passe que si la session n'était pas déjà terminée : une partie ne s'écrit qu'une fois.
 */
export async function cloturePartie(sq: SessionQuiz, reponses: { id: string; juste: boolean }[]): Promise<FinDeJeu> {
  const jeu = sq.secret.jeu ?? "chrono";
  const bonnes = reponses.filter((r) => r.juste).length;
  // contre la montre : dix points par bonne réponse ; les autres jeux : la part de bonnes réponses, sur 100
  const total = jeu === "chrono" ? reponses.length : sq.questions.length;
  const score = jeu === "chrono" ? 10 * bonnes : Math.round((100 * bonnes) / Math.max(1, sq.questions.length));
  const { data } = await clientAdmin().from("quiz_sessions").update({ reponses, termine_le: new Date().toISOString(), bonnes })
    .eq("id", sq.id).eq("user_id", sq.user_id).is("termine_le", null).select("id");
  if (!data?.length) return { score, bonnes, total, record: null, battu: false };
  const secondes = Math.max(0, Math.min(3600, Math.round((Date.now() - Date.parse(sq.debut)) / 1000)));
  const r = await ecritPartie(sq.user_id, { jeu, fiches: sq.secret.fiches?.length ? sq.secret.fiches : [1], score, secondes, verifiee: true });
  return { score, bonnes, total, ...r };
}
