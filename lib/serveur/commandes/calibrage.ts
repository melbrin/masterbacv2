"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import * as s from "@/lib/commun/schemas";
import * as m from "@/lib/moteur";
import { travailDe } from "@/lib/serveur/etat";
import { action, Refus } from "@/lib/serveur/fabriques";
import { nouvelleGraine } from "@/lib/serveur/quiz";
import { profilCourant } from "@/lib/serveur/requetes/profil";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

// Le test de calibrage (décision 0009). L'élève dit quels chapitres il a vus en classe ; le test tire, pour chacun,
// une question par objectif. C'est une session de quiz comme une autre : le serveur garde les réponses et corrige.
export const demarrerCalibrage = action({
  nom: "calibrage.demarrer",
  acces: "eleve",
  entree: z.object({ fiches: z.array(s.numFiche).min(1).max(14) }),
  limite: { max: 20, secondes: 3600 },
  async executer(e, session) {
    const profil = await profilCourant();
    if (!profil || profil.etat !== "actif" || profil.role !== "eleve") throw new Refus("interdit");
    const userId = session!.userId;
    const { ctx, catalogue } = await travailDe(userId, profil.note_visee);
    const fiches = [...new Set(e.fiches)].filter((n) => catalogue.sommaire.parNum.has(n)).sort((a, b) => a - b);
    if (!fiches.length) throw new Refus("invalide");
    const graine = nouvelleGraine();
    const questions = m.questionsCalibrage(ctx, fiches, graine);
    if (!questions.length) throw new Refus("introuvable", "Ces chapitres n'ont pas encore de question pour le test. Coche un autre chapitre.");
    const base = clientAdmin();
    // les chapitres du test deviennent les chapitres vus en classe : la séance du jour et le parcours porteront dessus
    const ajout = await base.from("vu_en_classe").upsert(fiches.map((fiche) => ({ user_id: userId, fiche })), { onConflict: "user_id,fiche", ignoreDuplicates: true });
    const retrait = await base.from("vu_en_classe").delete().eq("user_id", userId).not("fiche", "in", `(${fiches.join(",")})`);
    if (ajout.error || retrait.error) throw new Refus("erreur");
    const { data, error } = await base.from("quiz_sessions")
      .insert({ user_id: userId, genre: "calibrage", questions, secret: { graine, fiches } })
      .select("id").single();
    if (error || !data) throw new Refus("erreur");
    revalidatePath("/app", "layout");
    redirect(`/app/quiz/${data.id}`);
  },
});
