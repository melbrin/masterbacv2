"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { corrige, type Reponse } from "@/lib/commun/quiz";
import * as s from "@/lib/commun/schemas";
import * as m from "@/lib/moteur";
import { droitsDe } from "@/lib/serveur/acces";
import { travailDe } from "@/lib/serveur/etat";
import { action, Refus } from "@/lib/serveur/fabriques";
import { nouvelleGraine, questionCourante, sessionDe, type QuestionVue } from "@/lib/serveur/quiz";
import { profilCourant } from "@/lib/serveur/requetes/profil";
import { clientAdmin } from "@/lib/serveur/supabase/clients";
import { enregistreTentative } from "@/lib/serveur/travail";

const MINUTES_PASSAGE = 15;
const SEUIL_PASSAGE = 0.7;

async function profilActif() {
  const profil = await profilCourant();
  if (!profil || profil.etat !== "actif" || profil.role !== "eleve") throw new Refus("interdit");
  return profil;
}

export const demarrerQuiz = action({
  nom: "quiz.demarrer",
  acces: "eleve",
  entree: z.discriminatedUnion("genre", [
    z.object({ genre: z.literal("chapitre"), fiche: s.numFiche }),
    z.object({ genre: z.literal("passage"), fiche: s.numFiche, niveau: s.noteVisee }),
    z.object({ genre: z.literal("ds"), ds: s.uuid, seance: z.string().regex(/^s\d{1,2}$/) }),
    z.object({ genre: z.literal("carnet") }),
    z.object({ genre: z.literal("seance") }),
  ]),
  limite: { max: 60, secondes: 3600 },
  async executer(e, session) {
    const profil = await profilActif();
    const userId = session!.userId;
    const { ctx, jour, devoirs, catalogue } = await travailDe(userId, profil.note_visee);
    let questions: string[] = [];
    let fiche: number | null = null;
    let niveau: number | null = null;
    let limite: string | null = null;
    let origine: { ds?: string; seance?: string } = {};
    if (e.genre === "chapitre") {
      if (!catalogue.sommaire.parNum.has(e.fiche)) throw new Refus("introuvable");
      fiche = e.fiche;
      questions = m.quizPour(ctx, [e.fiche], 10, profil.note_visee, m.graineDuJour(jour, `q${e.fiche}`));
    } else if (e.genre === "passage") {
      if (!(await droitsDe(userId)).coach) throw new Refus("reserve", "Les tests de passage font partie du Pass.");
      const nv = m.niveauFiche(ctx, e.fiche);
      if (!nv.testDispo || nv.prochain !== e.niveau) throw new Refus("interdit", "Ce test de passage n'est pas encore disponible.");
      fiche = e.fiche;
      niveau = e.niveau;
      questions = m.questionsPassage(ctx, e.fiche, e.niveau);
      limite = new Date(ctx.maintenant + MINUTES_PASSAGE * 60_000).toISOString();
    } else if (e.genre === "ds") {
      const tache = devoirs.find((d) => d.id === e.ds)?.seances.find((x) => x.id === e.seance)?.taches.find((t) => t.type === "quiz");
      if (!tache || tache.type !== "quiz") throw new Refus("introuvable");
      questions = tache.ids;
      origine = { ds: e.ds, seance: e.seance };
    } else if (e.genre === "carnet") {
      questions = m.carnetDuJour(ctx).map((c) => c.k).filter((k) => k.startsWith("quiz:")).map((k) => k.slice(5)).slice(0, 20);
    } else {
      questions = m.seanceDuJour(ctx).revoir.filter((k) => k.startsWith("quiz:")).map((k) => k.slice(5));
    }
    questions = [...new Set(questions)];
    if (!questions.length) throw new Refus("introuvable", "Il n'y a pas de question de quiz à faire ici pour l'instant.");
    const { data, error } = await clientAdmin().from("quiz_sessions")
      .insert({ user_id: userId, genre: e.genre, fiche, niveau, questions, secret: { graine: nouvelleGraine(), ...origine }, limite })
      .select("id").single();
    if (error || !data) throw new Refus("erreur");
    redirect(`/app/quiz/${data.id}`);
  },
});

const reponse = z.discriminatedUnion("type", [
  z.object({ type: z.literal("qcm"), choix: z.number().int().min(0).max(9) }),
  z.object({ type: z.literal("vrai_faux"), valeur: z.boolean() }),
  z.object({ type: z.literal("trou"), texte: z.string().max(120) }),
  z.object({ type: z.literal("association"), droites: z.array(z.string().max(300)).max(12) }),
  z.object({ type: z.literal("ordre"), elements: z.array(z.string().max(300)).max(12) }),
]);

export interface RetourQuiz {
  juste: boolean;
  bonneReponse: string;
  explication: string;
  suivante: QuestionVue | null;
  bilan: { bonnes: number; total: number; passage: "reussi" | "rate" | null } | null;
}

// La correction se fait ici, sur le serveur. Le navigateur n'a reçu que l'énoncé et les choix.
export const repondreQuiz = action({
  nom: "quiz.repondre",
  acces: "eleve",
  entree: z.object({ session: s.uuid, rang: z.number().int().min(0).max(40), reponse }),
  limite: { max: 600, secondes: 3600 },
  async executer(e, session): Promise<RetourQuiz> {
    const profil = await profilActif();
    const userId = session!.userId;
    const sq = await sessionDe(userId, e.session);
    if (!sq) throw new Refus("introuvable");
    const courante = await questionCourante(sq);
    // une réponse ne vaut que pour la question attendue : ni rejeu, ni saut
    if (!courante || courante.rang !== e.rang) throw new Refus("invalide", "Cette question a déjà reçu une réponse.");
    const horsDelai = sq.limite !== null && Date.now() > Date.parse(sq.limite);
    const { q, vue } = courante;
    const verdict = horsDelai
      ? { juste: false, bonneReponse: "" }
      : corrige(q.type, vue.choix, q.type === "qcm" ? { c: vue.choix?.indexOf(q.enonce.choix?.[q.correction.c ?? -1] ?? "") } : q.correction, e.reponse as Reponse);
    await enregistreTentative(userId, profil.note_visee, m.cleQuiz(q.id), verdict.juste ? "ok" : "ko", null, sq.genre === "passage" ? "passage" : "quiz", { session: sq.id });
    const reponses = [...sq.reponses, { id: q.id, juste: verdict.juste }];
    const fini = reponses.length >= sq.questions.length || horsDelai;
    const bonnes = reponses.filter((r) => r.juste).length;
    const base = clientAdmin();
    await base.from("quiz_sessions").update({ reponses, ...(fini ? { termine_le: new Date().toISOString(), bonnes } : {}) }).eq("id", sq.id).eq("user_id", userId);
    let passage: "reussi" | "rate" | null = null;
    if (fini && sq.genre === "passage" && sq.fiche && sq.niveau) {
      passage = bonnes / sq.questions.length >= SEUIL_PASSAGE ? "reussi" : "rate";
      if (passage === "reussi") await base.from("passages").upsert({ user_id: userId, fiche: sq.fiche, niveau: sq.niveau }, { onConflict: "user_id,fiche,niveau", ignoreDuplicates: true });
    }
    revalidatePath("/app", "layout");
    const suite = fini ? null : await questionCourante({ ...sq, reponses });
    return {
      juste: verdict.juste,
      bonneReponse: horsDelai ? "Le temps du test est écoulé." : verdict.bonneReponse,
      explication: horsDelai ? "" : q.explication,
      suivante: suite?.vue ?? null,
      bilan: fini ? { bonnes, total: sq.questions.length, passage } : null,
    };
  },
});
