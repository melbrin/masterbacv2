import "server-only";
import { requete } from "@/lib/serveur/fabriques";
import { questionCourante, sessionDe } from "@/lib/serveur/quiz";

/** Une session de quiz de la personne : sa position et la question en cours, sans la clé de correction. */
export const sessionQuiz = requete({ nom: "quiz.session", acces: "eleve" }, async (session, id: string) => {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const s = await sessionDe(session.userId, id);
  if (!s) return null;
  const courante = await questionCourante(s);
  return {
    id: s.id, genre: s.genre, fiche: s.fiche, niveau: s.niveau, total: s.questions.length, limite: s.limite,
    // un test lancé depuis une séance de DS y retourne : ces deux champs ne servent qu'à construire ce lien
    ds: s.secret.ds ?? null, seance: s.secret.seance ?? null,
    terminee: !!s.termine_le, bonnes: s.bonnes, rang: courante?.rang ?? s.reponses.length, vue: courante?.vue ?? null,
  };
});
