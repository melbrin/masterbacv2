"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import * as m from "@/lib/moteur";
import { travailDe } from "@/lib/serveur/etat";
import { action, Refus } from "@/lib/serveur/fabriques";
import { profilCourant } from "@/lib/serveur/requetes/profil";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

async function seanceGardee(userId: string, objectif: number) {
  const { ctx, jour } = await travailDe(userId, objectif);
  // calculée à la première demande du jour, puis gardée telle quelle
  const s = m.seanceDuJour(ctx);
  if (!ctx.etat.seance) {
    const { error } = await clientAdmin().from("seances_du_jour").upsert(
      { user_id: userId, jour, revoir: s.revoir, exercice: s.exercice, raison: s.raison, ds_id: s.dsId },
      { onConflict: "user_id,jour", ignoreDuplicates: true },
    );
    if (error) throw new Refus("erreur");
  }
  return jour;
}

export const commencerSeance = action({
  nom: "seance.commencer",
  acces: "eleve",
  entree: z.object({}),
  limite: { max: 60, secondes: 3600 },
  async executer(_e, session) {
    const profil = await profilCourant();
    if (!profil || profil.etat !== "actif") throw new Refus("interdit");
    await seanceGardee(session!.userId, profil.note_visee);
    revalidatePath("/app", "layout");
    redirect("/app/seance");
  },
});

export const terminerSeance = action({
  nom: "seance.terminer",
  acces: "eleve",
  entree: z.object({}),
  limite: { max: 60, secondes: 3600 },
  async executer(_e, session) {
    const profil = await profilCourant();
    if (!profil || profil.etat !== "actif") throw new Refus("interdit");
    const jour = await seanceGardee(session!.userId, profil.note_visee);
    await clientAdmin().from("seances_du_jour").update({ faite: true, etape: 3 }).eq("user_id", session!.userId).eq("jour", jour);
    revalidatePath("/app", "layout");
    redirect("/app");
  },
});
