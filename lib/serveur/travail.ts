import "server-only";
import { enregistre, type Resultat } from "@/lib/moteur";
import { travailDe } from "@/lib/serveur/etat";
import { clientAdmin } from "@/lib/serveur/supabase/clients";

type Contexte = "libre" | "seance" | "ds" | "quiz" | "passage" | "carnet" | "test";

/**
 * Enregistre une tentative de l'élève et met son carnet d'erreurs à jour, selon les règles du moteur.
 * C'est le serveur qui écrit : l'élève n'a aucun droit d'écriture sur ces tables.
 */
export async function enregistreTentative(userId: string, objectif: number, cle: string, resultat: Resultat, score: number | null, contexte: Contexte, detail?: object): Promise<void> {
  const { ctx, catalogue } = await travailDe(userId, objectif);
  const suite = enregistre(ctx, cle, resultat, score);
  const base = clientAdmin();
  const derniere = suite.tentatives[cle][suite.tentatives[cle].length - 1];
  const { error } = await base.from("tentatives").insert({
    user_id: userId, cle, resultat, score: derniere.s, contexte, detail: (detail ?? null) as never,
    cree_le: new Date(ctx.maintenant).toISOString(), version_contenu: catalogue.version,
  });
  if (error) throw new Error("tentative refusée par la base");
  const entree = suite.carnet[cle];
  if (!entree) await base.from("carnet").delete().eq("user_id", userId).eq("cle", cle);
  else if (ctx.etat.carnet[cle]) await base.from("carnet").update({ echeance: entree.due, etape: entree.step }).eq("user_id", userId).eq("cle", cle);
  else await base.from("carnet").insert({ user_id: userId, cle, echeance: entree.due, etape: entree.step });
  // l'état lu pour cette requête est périmé : on le met à jour pour les écritures suivantes de la même requête
  ctx.etat.tentatives = suite.tentatives;
  ctx.etat.carnet = suite.carnet;
}
