"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as s from "@/lib/commun/schemas";
import { action, Refus } from "@/lib/serveur/fabriques";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

export const changerProfil = action({
  nom: "profil.changer",
  acces: "eleve",
  entree: z.object({ prenom: s.prenom, noteVisee: s.noteVisee, rappels: z.boolean() }),
  limite: { max: 30, secondes: 3600 },
  async executer(e, session) {
    const { error } = await clientAdmin().from("profils").update({ prenom: e.prenom, note_visee: e.noteVisee, rappels: e.rappels }).eq("user_id", session!.userId);
    if (error) throw new Refus("invalide");
    revalidatePath("/app", "layout");
    return { enregistre: true };
  },
});
