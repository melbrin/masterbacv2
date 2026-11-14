"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { etoilesPour, grandeurs, regles } from "@/lib/commun/simulations";
import { defi as trouveDefi } from "@/lib/serveur/contenu/defis";
import { defiVisible } from "@/lib/serveur/defis";
import { action, Refus } from "@/lib/serveur/fabriques";
import { profilCourant } from "@/lib/serveur/requetes/profil";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

// Un essai d'un défi du labo. Le navigateur anime la simulation, mais c'est le serveur qui juge : il refait le calcul
// avec les mêmes règles, compte les essais et donne les étoiles. Un élève ne peut donc pas se déclarer un défi réussi,
// ni sauter un défi : le défi précédent de la simulation doit être réussi.
export const validerDefi = action({
  nom: "defis.valider",
  acces: "eleve",
  entree: z.object({
    defi: z.string().regex(/^[a-z]{2,20}-[0-9]{1,2}$/),
    valeurs: z.record(z.string().regex(/^[A-Za-z0-9]{1,12}$/), z.number()).refine((v) => Object.keys(v).length <= 6),
  }),
  limite: { max: 300, secondes: 3600 },
  async executer(e, session) {
    const profil = await profilCourant();
    if (!profil || profil.etat !== "actif" || profil.role !== "eleve") throw new Refus("interdit");
    const trouve = trouveDefi(e.defi);
    if (!trouve || !defiVisible(trouve.defi, session!.admin)) throw new Refus("introuvable");
    const lu = grandeurs(trouve.defi, e.valeurs);
    if (!lu.ok) throw new Refus("invalide", "Entre une valeur dans les bornes indiquées.");
    const issue = regles(trouve.simulation.id)!.issue(lu.p);
    const base = clientAdmin();
    const userId = session!.userId;
    // le défi précédent, parmi ceux que cet élève peut voir
    const visibles = trouve.simulation.defis.filter((d) => defiVisible(d, session!.admin));
    const precedent = visibles[visibles.findIndex((d) => d.id === e.defi) - 1]?.id ?? null;
    const { data: lignes, error: lecture } = await base.from("defis").select("defi, essais, etoiles, reussi_le").eq("user_id", userId).in("defi", precedent ? [e.defi, precedent] : [e.defi]);
    if (lecture) throw new Refus("erreur");
    if (precedent && !lignes.some((l) => l.defi === precedent && l.reussi_le)) throw new Refus("interdit", "Réussis d'abord le défi précédent.");
    const ligne = lignes.find((l) => l.defi === e.defi);
    // un défi déjà réussi se rejoue pour le plaisir : ses étoiles et son nombre d'essais ne changent plus
    if (ligne?.reussi_le) return { ...issue, etoiles: ligne.etoiles, essais: ligne.essais, deja: true };
    const essais = Math.min(999, (ligne?.essais ?? 0) + 1);
    const etoiles = issue.reussi ? etoilesPour(essais) : null;
    const maintenant = new Date().toISOString();
    const { error } = await base.from("defis").upsert(
      { user_id: userId, defi: e.defi, essais, etoiles, reussi_le: issue.reussi ? maintenant : null, maj_le: maintenant },
      { onConflict: "user_id,defi" },
    );
    if (error) throw new Refus("erreur");
    revalidatePath("/app", "layout");
    return { ...issue, etoiles, essais, deja: false };
  },
});
