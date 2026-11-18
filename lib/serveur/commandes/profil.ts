"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as s from "@/lib/commun/schemas";
import { action, Refus } from "@/lib/serveur/fabriques";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

/**
 * Garde le thème choisi dans le profil, pour qu'il suive l'élève sur ses autres appareils. Le navigateur a déjà posé
 * son cookie et changé la page : cette action ne recharge rien. Sans compte (page d'accueil), elle ne fait rien.
 */
export const choisirTheme = action({
  nom: "profil.theme",
  acces: "public",
  entree: z.object({ theme: z.enum(["auto", "clair", "sombre"]) }),
  limite: { max: 60, secondes: 3600 },
  async executer(e, session) {
    if (!session) return { garde: false };
    const { error } = await clientAdmin().from("profils").update({ theme: e.theme }).eq("user_id", session.userId);
    if (error) throw new Refus("erreur");
    return { garde: true };
  },
});

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
