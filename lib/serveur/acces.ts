import "server-only";
import { cache } from "react";
import { ajouteJours, jourDeParis } from "@/lib/commun/dates";
import { decoupe, type SeancePlan } from "@/lib/moteur";
import { clientUtilisateur } from "@/lib/serveur/supabase/clients";

// Le seul endroit où les droits se calculent (docs/01-cahier-des-charges.md, section 2).

export type Offre = "gratuit" | "pass" | "mensuel" | "pack" | "beta" | "fiches";
export interface Droits {
  offre: Offre;
  /** tous les corrigés sont ouverts */
  tousLesCorriges: boolean;
  /** les fonctions de coach : mode DS sans limite, séance complète, niveaux, plan de l'année */
  coach: boolean;
}

const RANG: Record<Offre, number> = { gratuit: 0, fiches: 1, beta: 2, mensuel: 3, pass: 4, pack: 5 };

/** Calcul pur des droits à partir des lignes de la table droits. */
export function droitsDepuis(lignes: { offre: string; debut: string; fin: string | null; retire_le: string | null }[], maintenant: number): Droits {
  let offre: Offre = "gratuit";
  for (const l of lignes) {
    if (l.retire_le) continue;
    if (Date.parse(l.debut) > maintenant) continue;
    if (l.fin && Date.parse(l.fin) <= maintenant) continue;
    const o = l.offre as Offre;
    if (o in RANG && RANG[o] > RANG[offre]) offre = o;
  }
  return { offre, tousLesCorriges: offre !== "gratuit", coach: offre === "pass" || offre === "mensuel" || offre === "pack" || offre === "beta" };
}

export const droitsDe = cache(async (userId: string): Promise<Droits> => {
  const base = await clientUtilisateur();
  const { data, error } = await base.from("droits").select("offre, debut, fin, retire_le").eq("user_id", userId);
  if (error) throw new Error("La base ne répond pas.");
  return droitsDepuis(data ?? [], Date.now());
});

/** Les items du plan d'une préparation de DS. */
export function clesDuPlan(seances: SeancePlan[]): string[] {
  return seances.flatMap((s) => s.taches.flatMap((t) => (t.type === "questions" || t.type === "ds-blanc" ? t.refs : t.type === "exercice" ? [t.ref] : [])));
}

/**
 * Calcul pur : ce corrigé est-il ouvert ? Oui avec une offre payante ; sinon pour la question 1 de chaque fiche,
 * pour l'exercice de la séance du jour, et pour les items du plan de la préparation de DS offerte jusqu'au lendemain du devoir.
 */
export function corrigeOuvert(
  cle: string,
  d: { droits: Droits; jour: string; exerciceDuJour: string | null; dsOfferts: { jourDevoir: string; seances: SeancePlan[] }[] },
): boolean {
  const item = decoupe(cle);
  if (!item) return false;
  if (d.droits.tousLesCorriges) return true;
  if (item.k === "q" && item.n === 1) return true;
  if (d.exerciceDuJour === cle) return true;
  return d.dsOfferts.some((ds) => d.jour <= ajouteJours(ds.jourDevoir, 1) && clesDuPlan(ds.seances).includes(cle));
}

export async function peutOuvrirCorrige(userId: string, cle: string): Promise<boolean> {
  const droits = await droitsDe(userId);
  if (droits.tousLesCorriges) return decoupe(cle) !== null;
  const base = await clientUtilisateur();
  const jour = jourDeParis(new Date());
  const [seance, ds] = await Promise.all([
    base.from("seances_du_jour").select("exercice").eq("user_id", userId).eq("jour", jour).maybeSingle(),
    base.from("ds").select("jour_devoir, seances").eq("user_id", userId).eq("offert", true),
  ]);
  return corrigeOuvert(cle, {
    droits, jour, exerciceDuJour: seance.data?.exercice ?? null,
    dsOfferts: (ds.data ?? []).map((x) => ({ jourDevoir: x.jour_devoir, seances: x.seances as unknown as SeancePlan[] })),
  });
}
