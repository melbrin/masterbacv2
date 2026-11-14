"use server";

import { z } from "zod";
import { jeuMemoire } from "@/lib/commun/memoire";
import { action, Refus } from "@/lib/serveur/fabriques";
import { ecritPartieMemoire } from "@/lib/serveur/memoire";
import { profilCourant } from "@/lib/serveur/requetes/profil";

// Une partie d'un jeu de mémoire. Le jeu tourne dans le navigateur, qui annonce lui-même son score : il ne sert
// qu'au record et au suivi de l'élève. Il n'y a ni classement ni récompense, donc rien à gagner à tricher.
export const enregistrerMemoire = action({
  nom: "memoire.enregistrer",
  acces: "eleve",
  entree: z.object({ jeu: z.string().regex(/^[a-z]{2,20}$/), score: z.number().int().min(0).max(100), secondes: z.number().int().min(0).max(3600) }),
  limite: { max: 300, secondes: 3600 },
  async executer(e, session) {
    const profil = await profilCourant();
    if (!profil || profil.etat !== "actif" || profil.role !== "eleve") throw new Refus("interdit");
    if (!jeuMemoire(e.jeu)) throw new Refus("introuvable");
    return ecritPartieMemoire(session!.userId, e);
  },
});
