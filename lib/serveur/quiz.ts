import "server-only";
import { randomInt } from "node:crypto";
import { melange } from "@/lib/moteur";
import type { TypeQuiz } from "@/lib/commun/quiz";
import { quizComplets, type QuizComplet } from "@/lib/serveur/contenu/lecture";
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
  secret: { graine?: number; ds?: string };
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
