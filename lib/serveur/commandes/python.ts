"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SOLUTION_APRES } from "@/lib/commun/python/types";
import { action, Refus } from "@/lib/serveur/fabriques";
import { exercicePourCompte } from "@/lib/serveur/python";
import { profilCourant } from "@/lib/serveur/requetes/profil";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

// Le hub Python (décision 0016). Le programme de l'élève tourne dans son navigateur, avec les vérifications de
// l'exercice : c'est le navigateur qui annonce si elles passent. La réussite ne sert qu'au suivi de l'élève ; il n'y a
// ni note, ni classement, ni récompense, donc rien à gagner à tricher. Le serveur ne lance jamais de code d'élève.

async function exerciceOuvert(id: string, admin: boolean) {
  const profil = await profilCourant();
  if (!profil || profil.etat !== "actif" || profil.role !== "eleve") throw new Refus("interdit");
  const exercice = exercicePourCompte(id, admin);
  if (!exercice) throw new Refus("introuvable");
  return exercice;
}


const idExercice = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).min(3).max(40);

/** Une vérification lancée : elle compte un essai ; la première réussite est datée et son programme gardé. */
export const essaiPython = action({
  nom: "python.essai",
  acces: "eleve",
  entree: z.object({ exercice: idExercice, reussi: z.boolean(), code: z.string().max(20_000) }),
  limite: { max: 600, secondes: 3600 },
  async executer(e, session) {
    await exerciceOuvert(e.exercice, session!.admin);
    const base = clientAdmin();
    const userId = session!.userId;
    const { data: ligne, error: lecture } = await base.from("python").select("essais, reussi_le").eq("user_id", userId).eq("exercice", e.exercice).maybeSingle();
    if (lecture) throw new Refus("erreur");
    const premiere = e.reussi && !ligne?.reussi_le;
    const maintenant = new Date().toISOString();
    const { error } = await base.from("python").upsert(
      {
        user_id: userId, exercice: e.exercice, essais: Math.min(9999, (ligne?.essais ?? 0) + 1),
        reussi_le: ligne?.reussi_le ?? (e.reussi ? maintenant : null),
        ...(premiere ? { code: e.code } : {}),
        maj_le: maintenant,
      },
      { onConflict: "user_id,exercice" },
    );
    if (error) throw new Refus("erreur");
    // seule une première réussite change les chiffres des autres pages
    if (premiere) revalidatePath("/app", "layout");
    return { premiere, reussi: e.reussi || Boolean(ligne?.reussi_le) };
  },
});

/** La solution et ce qu'il faut retenir, quand l'élève les demande : après deux vérifications, ou après la réussite. */
export const solutionPython = action({
  nom: "python.solution",
  acces: "eleve",
  entree: z.object({ exercice: idExercice }),
  limite: { max: 300, secondes: 3600 },
  async executer(e, session) {
    const exercice = await exerciceOuvert(e.exercice, session!.admin);
    const { data: ligne, error } = await clientAdmin().from("python").select("essais, reussi_le").eq("user_id", session!.userId).eq("exercice", e.exercice).maybeSingle();
    if (error) throw new Refus("erreur");
    if (!ligne?.reussi_le && (ligne?.essais ?? 0) < SOLUTION_APRES) throw new Refus("interdit", "Lance d'abord deux vérifications : la solution s'ouvre ensuite.");
    return { solution: exercice.solution, explication: exercice.explication };
  },
});
